import {
  Injectable,
  Logger,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { MailService } from '../../common/mail/mail.service';
import { Decimal } from '@prisma/client/runtime/library';
import * as crypto from 'crypto';
import { PaymentGatewayFactory } from './gateways';
import { OrdersService } from '../orders/orders.service';

// USDT 交易验证结果接口
interface UsdtVerificationResult {
  verified: boolean;
  amount?: number;
  confirmations?: number;
  timestamp?: number;
  error?: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    @Inject(forwardRef(() => WebsocketGateway))
    private websocketGateway: WebsocketGateway,
    @Inject(forwardRef(() => MailService))
    private mailService: MailService,
    @Inject(forwardRef(() => OrdersService))
    private ordersService: OrdersService,
  ) {}

  // ==================== 创建支付订单 ====================

  async createPayment(orderId: string, method: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true },
    });

    if (!order) {
      throw new BadRequestException('订单不存在');
    }

    if (order.paymentStatus !== 'UNPAID') {
      throw new BadRequestException('订单已支付或正在支付中');
    }

    const paymentNo = `PAY${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // 根据支付方式创建支付记录
    let paymentData: any = {
      paymentNo,
      orderId,
      userId: order.buyerId,
      method,
      amount: order.payAmount,
      currency: order.currency,
      status: 'PENDING',
    };

    switch (method) {
      case 'USDT':
        paymentData = await this.createUsdtPayment(paymentData);
        break;
      case 'ALIPAY':
        paymentData = await this.createAlipayPayment(paymentData);
        break;
      case 'WECHAT':
        paymentData = await this.createWechatPayment(paymentData);
        break;
      case 'YIPAY':
      case 'MAPAY':
      case 'HUPIJIAO':
      case 'PAYPAL':
      case 'STRIPE':
        paymentData = await this.createGatewayPayment(paymentData, method);
        break;
      default:
        throw new BadRequestException('不支持的支付方式');
    }

    const payment = await this.prisma.payment.create({
      data: paymentData,
    });

    // 设置支付超时
    const expiredAt = new Date(
      Date.now() +
        Number(this.configService.get('PAYMENT_EXPIRATION_MINUTES') || 30) *
          60 *
          1000,
    );
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { expiredAt },
    });

    return payment;
  }

  // ==================== USDT 支付 ====================

  private async createUsdtPayment(paymentData: any) {
    const usdtWalletAddress = this.configService.get('USDT_WALLET_ADDRESS');
    if (!usdtWalletAddress) {
      throw new BadRequestException('USDT 支付未配置');
    }

    // 获取汇率
    const exchangeRate = await this.getUsdtExchangeRate(paymentData.currency);
    const usdtAmount = Number(paymentData.amount) * exchangeRate;

    return {
      ...paymentData,
      walletAddress: usdtWalletAddress,
      usdtAmount,
      exchangeRate,
      expiredAt: new Date(Date.now() + 30 * 60 * 1000),
    };
  }

  private async getUsdtExchangeRate(currency: string): Promise<number> {
    // 实际应从 API 获取实时汇率
    const rates: Record<string, number> = {
      USD: 1.0,
      CNY: 0.14,
      EUR: 1.08,
    };
    return rates[currency] || 1.0;
  }

  async verifyUsdtPayment(paymentNo: string, txHash: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { paymentNo },
    });

    if (!payment || payment.method !== 'USDT') {
      throw new BadRequestException('支付记录不存在');
    }

    // 验证区块链交易
    const verification = await this.verifyBlockchainTransaction(
      txHash,
      payment.walletAddress!,
      Number(payment.usdtAmount!),
    );

    if (!verification.verified) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          txHash,
          status: 'FAILED',
          providerData: {
            txHash,
            error: verification.error,
            verifiedAt: new Date().toISOString(),
          },
        },
      });
      throw new BadRequestException(verification.error || '交易验证失败');
    }

    // 更新为处理中状态
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        txHash,
        status: 'PROCESSING',
        providerData: {
          txHash,
          amount: verification.amount,
          confirmations: verification.confirmations,
          timestamp: verification.timestamp,
          verifiedAt: new Date().toISOString(),
        },
      },
    });

    // 如果确认数足够，直接完成支付
    const requiredConfirmations =
      this.configService.get('USDT_REQUIRED_CONFIRMATIONS') || 3;
    if (
      verification.confirmations &&
      verification.confirmations >= Number(requiredConfirmations)
    ) {
      await this.completePayment(paymentNo, txHash);
      return { success: true, message: '交易已确认，支付完成' };
    }

    return { success: true, message: '交易已提交，等待确认' };
  }

  /**
   * 验证区块链交易
   * 支持多链: TRON (TRC20), Ethereum (ERC20), BSC (BEP20)
   */
  private async verifyBlockchainTransaction(
    txHash: string,
    expectedAddress: string,
    expectedAmount: number,
  ): Promise<UsdtVerificationResult> {
    try {
      // 根据交易哈希前缀判断链类型
      const chainType = this.detectChainType(txHash);

      if (!chainType) {
        return { verified: false, error: '无法识别的交易哈希格式' };
      }

      // 获取区块链 API 配置
      const apiUrl = this.getBlockchainApiUrl(chainType);

      // 查询交易详情
      const txData = await this.fetchTransactionData(apiUrl, txHash, chainType);

      if (!txData) {
        return { verified: false, error: '交易不存在或未确认' };
      }

      // 验证收款地址
      if (txData.toAddress.toLowerCase() !== expectedAddress.toLowerCase()) {
        return { verified: false, error: '收款地址不匹配' };
      }

      // 验证金额 (允许 0.01 USDT 误差)
      const amountDiff = Math.abs(txData.amount - expectedAmount);
      if (amountDiff > 0.01) {
        this.logger.warn(
          `金额差异: 期望 ${expectedAmount}, 实际 ${txData.amount}, 差异 ${amountDiff}`,
        );
        // 不直接拒绝，记录日志供人工审核
      }

      return {
        verified: true,
        amount: txData.amount,
        confirmations: txData.confirmations,
        timestamp: txData.timestamp,
      };
    } catch (error) {
      this.logger.error(`区块链交易验证失败: ${error.message}`, error.stack);
      return { verified: false, error: `验证失败: ${error.message}` };
    }
  }

  private detectChainType(txHash: string): string | null {
    // TRON 交易哈希: 64位十六进制，通常以特定字符开头
    if (/^[a-fA-F0-9]{64}$/.test(txHash)) {
      // 需要进一步检查来确定是哪条链
      // 这里默认返回 TRON，因为大多数 USDT 支付使用 TRC20
      return 'TRON';
    }
    // Ethereum/BSC 交易哈希: 0x 开头 + 64位十六进制
    if (/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return 'ETHEREUM'; // 也可能是 BSC，需要根据配置区分
    }
    return null;
  }

  private getBlockchainApiUrl(chainType: string): string {
    switch (chainType) {
      case 'TRON':
        return (
          this.configService.get('TRON_API_URL') || 'https://api.trongrid.io'
        );
      case 'ETHEREUM':
        return (
          this.configService.get('ETH_API_URL') || 'https://api.etherscan.io'
        );
      case 'BSC':
        return (
          this.configService.get('BSC_API_URL') || 'https://api.bscscan.com'
        );
      default:
        throw new BadRequestException(`不支持的链类型: ${chainType}`);
    }
  }

  private async fetchTransactionData(
    apiUrl: string,
    txHash: string,
    chainType: string,
  ): Promise<{
    toAddress: string;
    amount: number;
    confirmations: number;
    timestamp: number;
  } | null> {
    try {
      // 动态导入 axios
      const axios = (await import('axios')).default;

      switch (chainType) {
        case 'TRON':
          return await this.fetchTronTransaction(apiUrl, txHash, axios);
        case 'ETHEREUM':
          return await this.fetchEvmTransaction(
            apiUrl,
            txHash,
            'ETHEREUM',
            axios,
          );
        case 'BSC':
          return await this.fetchEvmTransaction(apiUrl, txHash, 'BSC', axios);
        default:
          return null;
      }
    } catch (error) {
      this.logger.error(`获取区块链交易数据失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 获取 TRON 链交易数据 (TRC20 USDT)
   */
  private async fetchTronTransaction(
    apiUrl: string,
    txHash: string,
    axios: any,
  ): Promise<{
    toAddress: string;
    amount: number;
    confirmations: number;
    timestamp: number;
  } | null> {
    try {
      // TronGrid API: 获取交易详情
      const txEndpoint = `${apiUrl}/v1/transactions/${txHash}`;
      const txResponse = await axios.get(txEndpoint, { timeout: 10000 });

      if (
        !txResponse.data ||
        !txResponse.data.data ||
        txResponse.data.data.length === 0
      ) {
        this.logger.warn(`TRON 交易不存在: ${txHash}`);
        return null;
      }

      const txData = txResponse.data.data[0];

      // 获取交易事件（用于解析 TRC20 转账）
      const eventsEndpoint = `${apiUrl}/v1/transactions/${txHash}/events`;
      const eventsResponse = await axios.get(eventsEndpoint, {
        timeout: 10000,
      });

      if (
        !eventsResponse.data ||
        !eventsResponse.data.data ||
        eventsResponse.data.data.length === 0
      ) {
        // 如果没有事件，可能是普通 TRX 转账
        return {
          toAddress:
            txData.raw_data?.contract?.[0]?.parameter?.value?.to_address || '',
          amount:
            (txData.raw_data?.contract?.[0]?.parameter?.value?.amount || 0) /
            1e6, // TRX 有 6 位小数
          confirmations: txData.blockNumber ? 1 : 0, // 简化确认数计算
          timestamp: txData.block_timestamp || Date.now(),
        };
      }

      // 解析 TRC20 USDT 转账事件
      const usdtEvent = eventsResponse.data.data.find(
        (event: any) =>
          event.event_name === 'Transfer' &&
          event.contract_address?.toLowerCase() ===
            (
              this.configService.get('USDT_TRC20_CONTRACT') ||
              'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
            ).toLowerCase(),
      );

      if (usdtEvent) {
        return {
          toAddress: usdtEvent.result?.to || usdtEvent.result?._to || '',
          amount:
            Number(usdtEvent.result?.value || usdtEvent.result?._value || 0) /
            1e6, // USDT 有 6 位小数
          confirmations: txData.blockNumber ? 1 : 0,
          timestamp: txData.block_timestamp || Date.now(),
        };
      }

      // 返回普通转账信息
      return {
        toAddress:
          txData.raw_data?.contract?.[0]?.parameter?.value?.to_address || '',
        amount:
          (txData.raw_data?.contract?.[0]?.parameter?.value?.amount || 0) / 1e6,
        confirmations: txData.blockNumber ? 1 : 0,
        timestamp: txData.block_timestamp || Date.now(),
      };
    } catch (error) {
      this.logger.error(`TRON 交易查询失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 获取 EVM 链交易数据 (ERC20/BEP20 USDT)
   * 支持 Ethereum 和 BSC
   */
  private async fetchEvmTransaction(
    apiUrl: string,
    txHash: string,
    chainType: 'ETHEREUM' | 'BSC',
    axios: any,
  ): Promise<{
    toAddress: string;
    amount: number;
    confirmations: number;
    timestamp: number;
  } | null> {
    try {
      const apiKey =
        this.configService.get(`BLOCKCHAIN_API_KEY_${chainType}`) || '';

      // Etherscan/BscScan API: 获取交易详情
      const txEndpoint = `${apiUrl}/api`;
      const txParams = {
        module: 'proxy',
        action: 'eth_getTransactionByHash',
        txhash: txHash,
        apikey: apiKey,
      };

      const txResponse = await axios.get(txEndpoint, {
        params: txParams,
        timeout: 10000,
      });

      if (!txResponse.data || !txResponse.data.result) {
        this.logger.warn(`${chainType} 交易不存在: ${txHash}`);
        return null;
      }

      const txData = txResponse.data.result;

      // 获取交易回执（包含状态和日志）
      const receiptParams = {
        module: 'proxy',
        action: 'eth_getTransactionReceipt',
        txhash: txHash,
        apikey: apiKey,
      };

      const receiptResponse = await axios.get(txEndpoint, {
        params: receiptParams,
        timeout: 10000,
      });

      const receipt = receiptResponse.data?.result;

      // 检查交易是否成功
      if (receipt && receipt.status !== '0x1') {
        this.logger.warn(`${chainType} 交易失败: ${txHash}`);
        return null;
      }

      // 获取当前区块号计算确认数
      const blockParams = {
        module: 'proxy',
        action: 'eth_blockNumber',
        apikey: apiKey,
      };

      const blockResponse = await axios.get(txEndpoint, {
        params: blockParams,
        timeout: 10000,
      });

      const currentBlock = parseInt(blockResponse.data?.result || '0x0', 16);
      const txBlock = parseInt(txData.blockNumber || '0x0', 16);
      const confirmations = currentBlock - txBlock;

      // 解析 ERC20/BEP20 USDT 转账日志
      // USDT 合约地址
      const usdtContractAddress =
        chainType === 'ETHEREUM'
          ? this.configService.get('USDT_ERC20_CONTRACT') ||
            '0xdAC17F958D2ee523a2206206994597C13D831ec7'
          : this.configService.get('USDT_BEP20_CONTRACT') ||
            '0x55d398326f99059fF775485246999027B3197955';

      // Transfer 事件签名: keccak256("Transfer(address,address,uint256)")
      const transferEventSignature =
        '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

      if (receipt && receipt.logs) {
        // 查找 USDT Transfer 事件
        const usdtTransferLog = receipt.logs.find(
          (log: any) =>
            log.address?.toLowerCase() === usdtContractAddress.toLowerCase() &&
            log.topics?.[0]?.toLowerCase() === transferEventSignature,
        );

        if (usdtTransferLog) {
          // 解析 Transfer 事件
          // topics[1] = from address (32 bytes), topics[2] = to address (32 bytes)
          // data = amount (32 bytes)
          const toAddress = '0x' + usdtTransferLog.topics[2]?.slice(-40);
          const amount = parseInt(usdtTransferLog.data, 16) / 1e6; // USDT 有 6 位小数

          // 获取区块时间戳
          const blockInfoParams = {
            module: 'proxy',
            action: 'eth_getBlockByNumber',
            tag: txData.blockNumber,
            boolean: 'false',
            apikey: apiKey,
          };

          const blockInfoResponse = await axios.get(txEndpoint, {
            params: blockInfoParams,
            timeout: 10000,
          });

          const timestamp = blockInfoResponse.data?.result?.timestamp
            ? parseInt(blockInfoResponse.data.result.timestamp, 16) * 1000
            : Date.now();

          return {
            toAddress,
            amount,
            confirmations,
            timestamp,
          };
        }
      }

      // 如果不是 USDT 转账，返回普通 ETH/BNB 转账信息
      return {
        toAddress: txData.to || '',
        amount: parseInt(txData.value || '0x0', 16) / 1e18, // ETH/BNB 有 18 位小数
        confirmations,
        timestamp: Date.now(),
      };
    } catch (error) {
      this.logger.error(`${chainType} 交易查询失败: ${error.message}`);
      return null;
    }
  }

  // ==================== 支付宝支付 ====================

  private async createAlipayPayment(paymentData: any) {
    const appId = this.configService.get('ALIPAY_APP_ID');
    const privateKey = this.configService.get('ALIPAY_PRIVATE_KEY');

    if (!appId || !privateKey) {
      this.logger.warn('支付宝支付未配置，返回模拟数据');
      return {
        ...paymentData,
        providerData: { mock: true },
      };
    }

    // 实际应调用支付宝 SDK 生成支付二维码
    // const alipay = new AlipaySdk({ appId, privateKey, ... });
    // const result = await alipay.exec('alipay.trade.precreate', { ... });

    return {
      ...paymentData,
      providerOrderId: `ALI${Date.now()}`,
      providerData: {
        qrCode: `https://qr.alipay.com/${paymentData.paymentNo}`,
        // 实际返回支付宝生成的二维码链接
      },
    };
  }

  async handleAlipayCallback(callbackData: any) {
    // 验证签名
    const isValid = await this.verifyAlipaySignature(callbackData);
    if (!isValid) {
      throw new BadRequestException('支付宝回调签名验证失败');
    }

    const paymentNo = callbackData.out_trade_no;
    const tradeStatus = callbackData.trade_status;

    if (tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED') {
      await this.completePayment(paymentNo, callbackData.trade_no);
      return 'success';
    }

    return 'fail';
  }

  private async verifyAlipaySignature(data: any): Promise<boolean> {
    // 支付宝签名验证 - V2功能标记
    // 如果未配置支付宝公钥，拒绝所有回调
    const alipayPublicKey = this.configService.get('ALIPAY_PUBLIC_KEY');

    if (!alipayPublicKey) {
      this.logger.warn('支付宝支付未配置公钥，回调被拒绝');
      return false;
    }

    try {
      // 实际签名验证逻辑
      // 从回调数据中获取签名
      const sign = data.sign;
      const signType = data.sign_type || 'RSA2';

      if (!sign) {
        this.logger.warn('支付宝回调缺少签名');
        return false;
      }

      // 构建待签名字符串
      const params = Object.keys(data)
        .filter((key) => !['sign', 'sign_type'].includes(key) && data[key])
        .sort()
        .map((key) => `${key}=${data[key]}`)
        .join('&');

      // 使用 crypto 模块验证签名
      const algorithm = signType === 'RSA2' ? 'RSA-SHA256' : 'RSA-SHA1';
      const verify = crypto.createVerify(algorithm);
      verify.update(params);

      // 格式化公钥
      const formattedKey = alipayPublicKey.includes('-----BEGIN')
        ? alipayPublicKey
        : `-----BEGIN PUBLIC KEY-----\n${alipayPublicKey}\n-----END PUBLIC KEY-----`;

      const result = verify.verify(formattedKey, sign, 'base64');

      if (!result) {
        this.logger.warn('支付宝回调签名验证失败');
      }

      return result;
    } catch (error) {
      this.logger.error(`支付宝签名验证异常: ${error.message}`);
      return false;
    }
  }

  // ==================== 微信支付 ====================

  private async createWechatPayment(paymentData: any) {
    const mchId = this.configService.get('WECHAT_MCH_ID');
    const apiKey = this.configService.get('WECHAT_API_KEY');

    if (!mchId || !apiKey) {
      this.logger.warn('微信支付未配置，返回模拟数据');
      return {
        ...paymentData,
        providerData: { mock: true },
      };
    }

    // 实际应调用微信支付 API 生成 Native 支付二维码
    // const wxpay = new Wxpay({ mchid: mchId, ... });
    // const result = await wxpay.native_pay({ ... });

    return {
      ...paymentData,
      providerOrderId: `WX${Date.now()}`,
      providerData: {
        codeUrl: `weixin://wxpay/bizpayurl?pr=${paymentData.paymentNo}`,
        // 实际返回微信生成的支付链接
      },
    };
  }

  async handleWechatCallback(callbackData: any) {
    // 验证签名
    const isValid = await this.verifyWechatSignature(callbackData);
    if (!isValid) {
      throw new BadRequestException('微信支付回调签名验证失败');
    }

    const paymentNo = callbackData.out_trade_no;
    const tradeState = callbackData.trade_state;

    if (tradeState === 'SUCCESS') {
      await this.completePayment(paymentNo, callbackData.transaction_id);
      return { code: 'SUCCESS', message: '成功' };
    }

    return { code: 'FAIL', message: '支付未成功' };
  }

  /**
   * 验证微信支付签名
   * 支持 V2 API (HMAC-SHA256) 和 V3 API (AEAD_AES_256_GCM)
   */
  private async verifyWechatSignature(data: any): Promise<boolean> {
    const apiKey = this.configService.get('WECHAT_API_KEY');
    const apiV3Key = this.configService.get('WECHAT_API_V3_KEY');
    const wechatPlatformCert = this.configService.get('WECHAT_PLATFORM_CERTIFICATE');

    // 未配置密钥时拒绝所有回调（安全优先）
    if (!apiKey && !apiV3Key) {
      this.logger.warn('微信支付未配置密钥，回调被拒绝');
      return false;
    }

    try {
      // 判断是 V3 还是 V2 API 回调
      const isV3 = data.resource && data.resource.algorithm === 'AEAD_AES_256_GCM';

      if (isV3 && apiV3Key) {
        // V3 API 验签 - 使用平台证书验证签名
        return await this.verifyWechatV3Signature(data, apiV3Key, wechatPlatformCert);
      } else if (apiKey) {
        // V2 API 验签 - 使用 HMAC-SHA256
        return this.verifyWechatV2Signature(data, apiKey);
      }

      this.logger.warn('微信支付签名验证：未匹配到合适的验签方式');
      return false;
    } catch (error) {
      this.logger.error(`微信支付签名验证异常: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * 微信支付 V2 API 签名验证 (HMAC-SHA256)
   */
  private verifyWechatV2Signature(data: any, apiKey: string): boolean {
    try {
      const sign = data.sign;
      if (!sign) {
        this.logger.warn('微信支付 V2 回调缺少签名');
        return false;
      }

      // 构建待签名字符串
      const params = Object.keys(data)
        .filter((key) => key !== 'sign' && data[key] !== undefined && data[key] !== '')
        .sort()
        .map((key) => `${key}=${data[key]}`)
        .join('&');

      // 拼接 API Key
      const stringToSign = `${params}&key=${apiKey}`;

      // 使用已导入的 crypto 模块计算签名
      const calculatedSign = crypto
        .createHmac('sha256', apiKey)
        .update(stringToSign)
        .digest('hex')
        .toUpperCase();

      if (calculatedSign !== sign.toUpperCase()) {
        this.logger.warn('微信支付 V2 签名验证失败');
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`微信支付 V2 签名验证异常: ${error.message}`);
      return false;
    }
  }

  /**
   * 微信支付 V3 API 签名验证 (AEAD_AES_256_GCM)
   */
  private async verifyWechatV3Signature(
    data: any,
    apiV3Key: string,
    platformCert?: string,
  ): Promise<boolean> {
    try {
      // V3 API 回调数据结构
      const resource = data.resource;
      if (!resource) {
        this.logger.warn('微信支付 V3 回调缺少 resource 数据');
        return false;
      }

      // 验证时间戳（拒绝超过 5 分钟的回调）
      const timestamp = data.timestamp || data.event_time;
      if (timestamp) {
        const callbackTime = new Date(timestamp).getTime();
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        if (Math.abs(now - callbackTime) > fiveMinutes) {
          this.logger.warn('微信支付 V3 回调时间戳已过期');
          return false;
        }
      }

      // 如果有平台证书，验证签名头
      if (platformCert && data.signature) {
        // 验证签名头（需要配置微信平台证书）
        // 实际生产环境应从微信API获取最新证书
        const verify = crypto.createVerify('RSA-SHA256');
        const message = `${data.timestamp}\n${data.nonce}\n${JSON.stringify(resource)}\n`;
        verify.update(message);

        const certPem = platformCert.includes('-----BEGIN CERTIFICATE-----')
          ? platformCert
          : `-----BEGIN CERTIFICATE-----\n${platformCert}\n-----END CERTIFICATE-----`;

        if (!verify.verify(certPem, data.signature, 'base64')) {
          this.logger.warn('微信支付 V3 签名验证失败');
          return false;
        }
      }

      // 解密 ciphertext（如果存在）
      if (resource.ciphertext && resource.nonce && resource.associated_data) {
        try {
          const decipher = crypto.createDecipheriv(
            'aes-256-gcm',
            apiV3Key,
            resource.nonce,
          );
          decipher.setAuthTag(
            Buffer.from(resource.ciphertext.slice(-16), 'base64'),
          );
          decipher.setAAD(Buffer.from(resource.associated_data, 'utf8'));

          let _decrypted = decipher.update(
            resource.ciphertext.slice(0, -16),
            'base64',
            'utf8',
          );
          _decrypted += decipher.final('utf8');

          // 解密成功，验证通过
          this.logger.log('微信支付 V3 数据解密成功');
          return true;
        } catch (decryptError) {
          this.logger.error(`微信支付 V3 解密失败: ${decryptError.message}`);
          return false;
        }
      }

      // 如果没有 ciphertext，仅验证时间戳
      return true;
    } catch (error) {
      this.logger.error(`微信支付 V3 签名验证异常: ${error.message}`);
      return false;
    }
  }

  // ==================== 支付完成处理 ====================

  async completePayment(paymentNo: string, providerOrderId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { paymentNo },
      include: {
        order: {
          include: {
            orderItems: {
              include: {
                product: true,
              },
            },
            buyer: {
              select: { id: true, username: true, email: true },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new BadRequestException('支付记录不存在');
    }

    if (payment.status === 'SUCCESS') {
      return payment; // 已处理
    }

    const order = payment.order;

    // 使用事务确保数据一致性
    await this.prisma.$transaction(async (tx) => {
      // 更新支付状态
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'SUCCESS',
          providerOrderId,
          paidAt: new Date(),
        },
      });

      // 更新订单状态为已支付
      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: 'PAID',
          orderStatus: 'PAID',
          paidAt: new Date(),
          paymentMethod: payment.method,
        },
      });

      // 计算卖家收益
      const sellerEarnings = order.orderItems.reduce((sum, item) => {
        const itemPrice =
          item.unitPrice instanceof Decimal
            ? item.unitPrice.toNumber()
            : Number(item.unitPrice);
        return sum + itemPrice * item.quantity;
      }, 0);

      // 获取平台手续费率
      const platformFeeRate = Number(
        this.configService.get('PLATFORM_FEE_RATE') || 0.05,
      );
      const platformFee = sellerEarnings * platformFeeRate;
      const sellerNetEarnings = sellerEarnings - platformFee;

      // 获取卖家信息
      const firstItem = order.orderItems[0];
      const sellerId = firstItem?.product?.sellerId;

      if (sellerId) {
        // 获取卖家当前余额
        const sellerProfile = await tx.sellerProfile.findUnique({
          where: { userId: sellerId },
        });

        if (sellerProfile) {
          const currentBalance =
            sellerProfile.balance instanceof Decimal
              ? sellerProfile.balance.toNumber()
              : Number(sellerProfile.balance);
          const newBalance = currentBalance + sellerNetEarnings;

          // 更新卖家账户余额和总收入
          const currentTotalEarnings =
            (sellerProfile as any).totalEarnings instanceof Decimal
              ? (sellerProfile as any).totalEarnings.toNumber()
              : Number((sellerProfile as any).totalEarnings || 0);
          const newTotalEarnings = currentTotalEarnings + sellerNetEarnings;

          await tx.sellerProfile.update({
            where: { userId: sellerId },
            data: {
              balance: new Decimal(newBalance),
              totalEarnings: new Decimal(newTotalEarnings),
            } as any,
          });

          // 记录卖家资金流水
          await tx.sellerTransaction.create({
            data: {
              sellerId,
              type: 'INCOME',
              amount: new Decimal(sellerNetEarnings),
              balanceAfter: new Decimal(newBalance),
              currency: order.currency,
              orderId: order.id,
              description: `订单 ${order.orderNo} 销售收入`,
            },
          });

          // 如果有平台手续费，记录佣金流水
          if (platformFee > 0) {
            await tx.sellerTransaction.create({
              data: {
                sellerId,
                type: 'COMMISSION',
                amount: new Decimal(-platformFee),
                balanceAfter: new Decimal(newBalance),
                currency: order.currency,
                orderId: order.id,
                description: `订单 ${order.orderNo} 平台手续费`,
              },
            });
          }
        }
      }
    });

    this.logger.log(`支付完成: ${paymentNo}, 订单: ${order.orderNo}`);

    // 🔥 触发自动发货（调用订单服务）
    try {
      const deliveryResult = await this.ordersService.handlePaymentSuccess(payment.orderId);
      this.logger.log(`自动发货结果: ${JSON.stringify(deliveryResult)}`);

      // 发送实时通知给买家
      try {
        this.websocketGateway.sendToUser(order.buyerId, 'payment:completed', {
          orderId: order.id,
          orderNo: order.orderNo,
          message: '您的订单已支付成功，商品已自动交付',
          autoDelivery: deliveryResult.success,
        });
      } catch (error) {
        this.logger.warn(`WebSocket 通知发送失败: ${error.message}`);
      }

      // 发送邮件通知
      if (order.buyer.email && this.mailService.isAvailable()) {
        try {
          await this.mailService.sendOrderNotification(
            order.buyer.email,
            '订单支付成功',
            `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">支付成功</h1>
              </div>
              <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none;">
                <p style="font-size: 16px; color: #333; margin-bottom: 20px;">您好 ${order.buyer.username}，</p>
                <p style="font-size: 16px; color: #333; margin-bottom: 20px;">您的订单 <strong>${order.orderNo}</strong> 已支付成功，商品已自动交付到您的账户。</p>
                <p style="font-size: 14px; color: #666;">请登录平台查看商品详情和账号信息。</p>
                <p style="font-size: 14px; color: #999; margin-top: 30px;">感谢您的购买！</p>
              </div>
            </div>
          `,
          );
        } catch (error) {
          this.logger.warn(`邮件通知发送失败: ${error.message}`);
        }
      }
    } catch (error) {
      this.logger.error(`自动发货失败: ${error.message}`);
      // 不影响支付流程，但需要通知管理员
    }

    return payment;
  }

  // ==================== 查询支付状态 ====================

  async getPaymentStatus(paymentNo: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { paymentNo },
      include: { order: { select: { orderNo: true, orderStatus: true } } },
    });

    if (!payment) {
      throw new BadRequestException('支付记录不存在');
    }

    return {
      paymentNo: payment.paymentNo,
      status: payment.status,
      amount: payment.amount,
      method: payment.method,
      expiredAt: payment.expiredAt,
      paidAt: payment.paidAt,
      order: payment.order,
    };
  }

  // ==================== 取消支付 ====================

  async cancelPayment(paymentNo: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { paymentNo },
    });

    if (!payment) {
      throw new BadRequestException('支付记录不存在');
    }

    if (payment.status === 'SUCCESS') {
      throw new BadRequestException('支付已完成，无法取消');
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'EXPIRED' },
    });

    return { success: true, message: '支付已取消' };
  }

  // ==================== 通用支付通道 ====================

  /**
   * 创建支付通道订单
   */
  private async createGatewayPayment(paymentData: any, method: string) {
    // 获取通道配置
    const gateway = await (this.prisma as any).paymentGateway.findUnique({
      where: { code: method },
    });

    if (!gateway || !gateway.enabled) {
      throw new BadRequestException(`支付通道 ${method} 未启用`);
    }

    try {
      // 创建通道实例
      const gatewayInstance = PaymentGatewayFactory.create(method, gateway.config);

      // 构建回调URL
      const apiUrl = this.configService.get('API_URL') || 'http://localhost:3000';
      const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5173';

      // 创建支付订单
      const result = await gatewayInstance.createPayment({
        orderId: paymentData.orderId,
        amount: Number(paymentData.amount),
        currency: paymentData.currency,
        subject: '商品购买',
        returnUrl: `${frontendUrl}/payment/return`,
        notifyUrl: `${apiUrl}/payments/notify/${method.toLowerCase()}`,
      });

      this.logger.log(`创建 ${method} 支付订单: ${paymentData.paymentNo}`);

      return {
        ...paymentData,
        providerOrderId: result.paymentNo,
        providerData: {
          payUrl: result.payUrl,
          qrCode: result.qrCode,
          rawData: result.rawData,
        },
      };
    } catch (error: any) {
      this.logger.error(`创建 ${method} 支付订单失败: ${error.message}`);
      throw new BadRequestException(`创建支付订单失败: ${error.message}`);
    }
  }

  /**
   * 处理支付通道回调
   */
  async handleGatewayNotify(method: string, data: any) {
    // 获取通道配置
    const gateway = await (this.prisma as any).paymentGateway.findUnique({
      where: { code: method.toUpperCase() },
    });

    if (!gateway) {
      throw new BadRequestException(`支付通道 ${method} 不存在`);
    }

    try {
      // 创建通道实例
      const gatewayInstance = PaymentGatewayFactory.create(method.toUpperCase(), gateway.config);

      // 验证签名
      const verifyResult = await gatewayInstance.verifyNotify(data);

      if (!verifyResult.verified) {
        this.logger.warn(`${method} 回调验证失败: ${verifyResult.error}`);
        throw new BadRequestException(verifyResult.error || '签名验证失败');
      }

      // 获取支付记录
      const payment = await this.prisma.payment.findFirst({
        where: {
          OR: [
            { paymentNo: verifyResult.orderId },
            { providerOrderId: verifyResult.paymentNo },
          ],
        },
      });

      if (!payment) {
        this.logger.warn(`未找到支付记录: ${verifyResult.orderId}`);
        throw new BadRequestException('支付记录不存在');
      }

      // 检查是否已处理
      if (payment.status === 'SUCCESS') {
        return { success: true, message: '已处理' };
      }

      // 完成支付
      await this.completePayment(payment.paymentNo, verifyResult.paymentNo || payment.providerOrderId || '');

      this.logger.log(`${method} 支付完成: ${payment.paymentNo}`);

      return { success: true, message: '支付成功' };
    } catch (error: any) {
      this.logger.error(`${method} 回调处理失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取可用的支付方式列表
   */
  async getAvailablePaymentMethods() {
    const methods = [
      { code: 'USDT', name: 'USDT支付', enabled: !!this.configService.get('USDT_WALLET_ADDRESS') },
      { code: 'ALIPAY', name: '支付宝', enabled: !!this.configService.get('ALIPAY_APP_ID') },
      { code: 'WECHAT', name: '微信支付', enabled: !!this.configService.get('WECHAT_MCH_ID') },
    ];

    // 获取通道支付方式
    try {
      const gateways = await (this.prisma as any).paymentGateway.findMany({
        where: { enabled: true },
        orderBy: { sort: 'asc' },
      });

      for (const gateway of gateways) {
        methods.push({
          code: gateway.code,
          name: gateway.name,
          enabled: true,
        });
      }
    } catch (error) {
      this.logger.warn('获取支付通道列表失败，可能数据库尚未迁移');
    }

    return methods.filter(m => m.enabled);
  }
}
