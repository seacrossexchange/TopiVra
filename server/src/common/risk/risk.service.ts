import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { ConfigService } from '@nestjs/config';

export interface RiskAssessment {
  score: number; // 0-100, higher is riskier
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: RiskFactor[];
  recommendation: 'ALLOW' | 'REVIEW' | 'BLOCK';
}

export interface RiskFactor {
  name: string;
  weight: number;
  description: string;
  value: number;
}

export interface UserBehaviorData {
  userId: string;
  ipAddress?: string;
  deviceId?: string;
  userAgent?: string;
}

@Injectable()
export class RiskService {
  private readonly logger = new Logger(RiskService.name);

  // 风控阈值配置
  private readonly thresholds = {
    low: 30,
    medium: 60,
    high: 80,
  };

  // 风险因素权重
  private readonly weights = {
    newUser: 15,
    highOrderFrequency: 20,
    largeAmount: 15,
    suspiciousIp: 25,
    multipleFailedPayments: 20,
    refundedOrders: 15,
    disputedOrders: 20,
    lowCreditScore: 25,
    unusualDevice: 10,
    velocityBreach: 30,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 评估订单风险
   */
  async assessOrderRisk(userId: string, orderAmount: number, data?: UserBehaviorData): Promise<RiskAssessment> {
    const factors: RiskFactor[] = [];
    let totalScore = 0;

    // 1. 检查用户是否是新用户
    const newUserFactor = await this.checkNewUser(userId);
    if (newUserFactor) {
      factors.push(newUserFactor);
      totalScore += newUserFactor.weight;
    }

    // 2. 检查订单频率
    const frequencyFactor = await this.checkOrderFrequency(userId);
    if (frequencyFactor) {
      factors.push(frequencyFactor);
      totalScore += frequencyFactor.weight;
    }

    // 3. 检查大额订单
    const largeAmountFactor = this.checkLargeAmount(orderAmount);
    if (largeAmountFactor) {
      factors.push(largeAmountFactor);
      totalScore += largeAmountFactor.weight;
    }

    // 4. 检查可疑IP
    if (data?.ipAddress) {
      const ipFactor = await this.checkSuspiciousIp(data.ipAddress);
      if (ipFactor) {
        factors.push(ipFactor);
        totalScore += ipFactor.weight;
      }
    }

    // 5. 检查退款/纠纷历史
    const historyFactor = await this.checkUserHistory(userId);
    if (historyFactor) {
      factors.push(historyFactor);
      totalScore += historyFactor.weight;
    }

    // 6. 检查卖家信用分（如果是卖家）
    const creditFactor = await this.checkSellerCredit(userId);
    if (creditFactor) {
      factors.push(creditFactor);
      totalScore += creditFactor.weight;
    }

    // 限制最大分数
    totalScore = Math.min(totalScore, 100);

    // 确定风险等级和建议
    const level = this.determineRiskLevel(totalScore);
    const recommendation = this.determineRecommendation(totalScore);

    // 记录风险评估
    await this.logRiskAssessment(userId, 'ORDER', totalScore, factors, data);

    return {
      score: totalScore,
      level,
      factors,
      recommendation,
    };
  }

  /**
   * 评估提现风险
   */
  async assessWithdrawalRisk(userId: string, amount: number): Promise<RiskAssessment> {
    const factors: RiskFactor[] = [];
    let totalScore = 0;

    // 1. 检查卖家信用分
    const creditFactor = await this.checkSellerCredit(userId);
    if (creditFactor) {
      factors.push(creditFactor);
      totalScore += creditFactor.weight;
    }

    // 2. 检查是否有未完成的纠纷
    const disputesFactor = await this.checkPendingDisputes(userId);
    if (disputesFactor) {
      factors.push(disputesFactor);
      totalScore += disputesFactor.weight;
    }

    // 3. 检查提现频率
    const withdrawalFrequencyFactor = await this.checkWithdrawalFrequency(userId);
    if (withdrawalFrequencyFactor) {
      factors.push(withdrawalFrequencyFactor);
      totalScore += withdrawalFrequencyFactor.weight;
    }

    // 4. 检查大额提现
    const largeWithdrawalFactor = this.checkLargeWithdrawal(amount);
    if (largeWithdrawalFactor) {
      factors.push(largeWithdrawalFactor);
      totalScore += largeWithdrawalFactor.weight;
    }

    totalScore = Math.min(totalScore, 100);

    const level = this.determineRiskLevel(totalScore);
    const recommendation = this.determineRecommendation(totalScore);

    await this.logRiskAssessment(userId, 'WITHDRAWAL', totalScore, factors);

    return {
      score: totalScore,
      level,
      factors,
      recommendation,
    };
  }

  /**
   * 检查新用户
   */
  private async checkNewUser(userId: string): Promise<RiskFactor | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });

    if (!user) return null;

    const daysSinceCreation = Math.floor(
      (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceCreation < 7) {
      return {
        name: 'NEW_USER',
        weight: this.weights.newUser,
        description: `新用户（注册${daysSinceCreation}天）`,
        value: daysSinceCreation,
      };
    }

    return null;
  }

  /**
   * 检查订单频率
   */
  private async checkOrderFrequency(userId: string): Promise<RiskFactor | null> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentOrders = await this.prisma.order.count({
      where: {
        buyerId: userId,
        createdAt: { gte: oneDayAgo },
      },
    });

    if (recentOrders >= 10) {
      return {
        name: 'HIGH_ORDER_FREQUENCY',
        weight: this.weights.highOrderFrequency,
        description: `24小时内下单${recentOrders}次`,
        value: recentOrders,
      };
    }

    return null;
  }

  /**
   * 检查大额订单
   */
  private checkLargeAmount(amount: number): RiskFactor | null {
    const largeThreshold = this.configService.get<number>('RISK_LARGE_AMOUNT_THRESHOLD', 1000);

    if (amount >= largeThreshold) {
      return {
        name: 'LARGE_AMOUNT',
        weight: this.weights.largeAmount,
        description: `大额订单：$${amount}`,
        value: amount,
      };
    }

    return null;
  }

  /**
   * 检查可疑IP
   */
  private async checkSuspiciousIp(ipAddress: string): Promise<RiskFactor | null> {
    // 检查IP是否在黑名单中
    const blacklisted = await this.prisma.blacklistedIp.findUnique({
      where: { ip: ipAddress },
    });

    if (blacklisted) {
      return {
        name: 'SUSPICIOUS_IP',
        weight: this.weights.suspiciousIp,
        description: `IP在黑名单中：${ipAddress}`,
        value: 1,
      };
    }

    // 检查同一IP的失败交易次数
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const failedAttempts = await this.prisma.payment.count({
      where: {
        status: 'FAILED',
        paidAt: { gte: oneHourAgo },
      },
    });

    if (failedAttempts >= 5) {
      return {
        name: 'MULTIPLE_FAILED_PAYMENTS',
        weight: this.weights.multipleFailedPayments,
        description: `同一IP 1小时内失败支付${failedAttempts}次`,
        value: failedAttempts,
      };
    }

    return null;
  }

  /**
   * 检查用户历史（退款/纠纷）
   */
  private async checkUserHistory(userId: string): Promise<RiskFactor | null> {
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [refunds, disputes] = await Promise.all([
      this.prisma.refundRequest.count({
        where: {
          userId,
          createdAt: { gte: last30Days },
        },
      }),
      this.prisma.refundRequest.count({
        where: {
          userId,
          status: 'DISPUTED',
          createdAt: { gte: last30Days },
        },
      }),
    ]);

    if (refunds >= 3) {
      return {
        name: 'HIGH_REFUNDS',
        weight: this.weights.refundedOrders,
        description: `30天内${refunds}次退款`,
        value: refunds,
      };
    }

    if (disputes >= 1) {
      return {
        name: 'HAS_DISPUTES',
        weight: this.weights.disputedOrders,
        description: `30天内${disputes}次纠纷`,
        value: disputes,
      };
    }

    return null;
  }

  /**
   * 检查卖家信用分
   */
  private async checkSellerCredit(userId: string): Promise<RiskFactor | null> {
    const credit = await this.prisma.sellerCredit.findUnique({
      where: { sellerId: userId },
    });

    if (!credit) return null;

    if (credit.creditScore < 60) {
      return {
        name: 'LOW_CREDIT_SCORE',
        weight: this.weights.lowCreditScore,
        description: `低信用分：${credit.creditScore}`,
        value: credit.creditScore,
      };
    }

    return null;
  }

  /**
   * 检查未完成的纠纷
   */
  private async checkPendingDisputes(userId: string): Promise<RiskFactor | null> {
    const pendingDisputes = await this.prisma.refundRequest.count({
      where: {
        sellerId: userId,
        status: 'DISPUTED',
      },
    });

    if (pendingDisputes >= 1) {
      return {
        name: 'PENDING_DISPUTES',
        weight: 30,
        description: `有${pendingDisputes}个未解决的纠纷`,
        value: pendingDisputes,
      };
    }

    return null;
  }

  /**
   * 检查提现频率
   */
  private async checkWithdrawalFrequency(userId: string): Promise<RiskFactor | null> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentWithdrawals = await this.prisma.withdrawal.count({
      where: {
        sellerId: userId,
        createdAt: { gte: oneDayAgo },
      },
    });

    if (recentWithdrawals >= 3) {
      return {
        name: 'HIGH_WITHDRAWAL_FREQUENCY',
        weight: 20,
        description: `24小时内${recentWithdrawals}次提现请求`,
        value: recentWithdrawals,
      };
    }

    return null;
  }

  /**
   * 检查大额提现
   */
  private checkLargeWithdrawal(amount: number): RiskFactor | null {
    const threshold = this.configService.get<number>('RISK_LARGE_WITHDRAWAL_THRESHOLD', 5000);

    if (amount >= threshold) {
      return {
        name: 'LARGE_WITHDRAWAL',
        weight: 15,
        description: `大额提现：$${amount}`,
        value: amount,
      };
    }

    return null;
  }

  /**
   * 确定风险等级
   */
  private determineRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= this.thresholds.high) return 'CRITICAL';
    if (score >= this.thresholds.medium) return 'HIGH';
    if (score >= this.thresholds.low) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * 获取风险等级（用于数据库存储）
   */
  private getRiskLevel(score: number): string {
    return this.determineRiskLevel(score);
  }

  /**
   * 确定处理建议
   */
  private determineRecommendation(score: number): 'ALLOW' | 'REVIEW' | 'BLOCK' {
    if (score >= this.thresholds.high) return 'BLOCK';
    if (score >= this.thresholds.medium) return 'REVIEW';
    return 'ALLOW';
  }

  /**
   * 记录风险评估日志
   */
  private async logRiskAssessment(
    userId: string,
    type: string,
    score: number,
    factors: RiskFactor[],
    data?: UserBehaviorData,
  ) {
    try {
      await this.prisma.riskAssessment.create({
        data: {
          userId,
          type,
          score,
          level: this.getRiskLevel(score),
          factors: factors as any,
          ipAddress: data?.ipAddress || '',
          deviceId: data?.deviceId || '',
        },
      });
    } catch (error) {
      this.logger.error('Failed to log risk assessment', error);
    }
  }

  /**
   * 添加IP到黑名单
   */
  async blacklistIp(ip: string, reason: string, expiryHours: number = 24) {
    return this.prisma.blacklistedIp.create({
      data: {
        ip,
        reason,
        expiresAt: new Date(Date.now() + expiryHours * 60 * 60 * 1000),
      },
    });
  }

  /**
   * 移除IP黑名单
   */
  async removeFromBlacklist(ip: string) {
    return this.prisma.blacklistedIp.delete({
      where: { ip },
    });
  }

  /**
   * 获取用户风险评估历史
   */
  async getUserRiskHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.riskAssessment.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.riskAssessment.count({
        where: { userId },
      }),
    ]);

    return { items, total, page, limit };
  }
}