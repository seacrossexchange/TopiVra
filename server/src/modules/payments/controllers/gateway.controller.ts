/**
 * 支付通道管理控制器
 */
import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PrismaService } from '../../../prisma/prisma.service';
import { UpdateGatewayConfigDto } from '../dto/gateway-config.dto';
import { PaymentGatewayFactory, GATEWAY_INFO } from '../gateways';

@ApiTags('支付通道管理')
@ApiBearerAuth()
@Controller('payment-gateways')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentGatewayController {
  private readonly logger = new Logger(PaymentGatewayController.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 获取所有支付通道
   */
  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: '获取所有支付通道' })
  @ApiResponse({ status: 200, description: '返回支付通道列表' })
  async getGateways() {
    const gateways = await this.prisma.paymentGateway.findMany({
      orderBy: { sort: 'asc' },
    });

    // 附加通道信息
    return gateways.map((gateway) => ({
      ...gateway,
      info: GATEWAY_INFO[gateway.code] || null,
    }));
  }

  /**
   * 获取单个支付通道
   */
  @Get(':code')
  @Roles('ADMIN')
  @ApiOperation({ summary: '获取单个支付通道' })
  @ApiResponse({ status: 200, description: '返回支付通道详情' })
  @ApiResponse({ status: 404, description: '支付通道不存在' })
  async getGateway(@Param('code') code: string) {
    const gateway = await this.prisma.paymentGateway.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!gateway) {
      return {
        success: false,
        message: '支付通道不存在',
      };
    }

    return {
      ...gateway,
      info: GATEWAY_INFO[gateway.code] || null,
    };
  }

  /**
   * 更新支付通道配置
   */
  @Put(':code')
  @Roles('ADMIN')
  @ApiOperation({ summary: '更新支付通道配置' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updateGateway(
    @Param('code') code: string,
    @Body() dto: UpdateGatewayConfigDto,
  ) {
    const upperCode = code.toUpperCase();

    // 检查通道是否存在
    const existing = await this.prisma.paymentGateway.findUnique({
      where: { code: upperCode },
    });

    if (!existing) {
      // 如果不存在，创建新的通道配置
      const info = GATEWAY_INFO[upperCode];
      if (!info) {
        return {
          success: false,
          message: `不支持的支付通道: ${code}`,
        };
      }

      return this.prisma.paymentGateway.create({
        data: {
          code: upperCode,
          name: info.name,
          enabled: dto.enabled ?? false,
          config: dto.config ?? PaymentGatewayFactory.getDefaultConfig(upperCode),
          sort: dto.sort ?? 0,
        },
      });
    }

    // 更新现有配置
    const updateData: any = {};
    if (dto.enabled !== undefined) updateData.enabled = dto.enabled;
    if (dto.config !== undefined) updateData.config = dto.config;
    if (dto.sort !== undefined) updateData.sort = dto.sort;

    return this.prisma.paymentGateway.update({
      where: { code: upperCode },
      data: updateData,
    });
  }

  /**
   * 测试支付通道连接
   */
  @Post(':code/test')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '测试支付通道连接' })
  @ApiResponse({ status: 200, description: '测试结果' })
  async testGateway(
    @Param('code') code: string,
    @Body() body: { amount?: number },
  ) {
    const upperCode = code.toUpperCase();

    const gateway = await this.prisma.paymentGateway.findUnique({
      where: { code: upperCode },
    });

    if (!gateway) {
      return {
        success: false,
        message: '支付通道不存在',
      };
    }

    try {
      // 创建通道实例
      const gatewayInstance = PaymentGatewayFactory.create(
        upperCode,
        gateway.config as any,
      );

      // 测试创建支付
      const testResult = await gatewayInstance.createPayment({
        orderId: `TEST_${Date.now()}`,
        amount: body.amount || 0.01,
        currency: 'USD',
        subject: '测试订单',
        returnUrl: 'https://example.com/return',
        notifyUrl: 'https://example.com/notify',
      });

      this.logger.log(`测试支付通道 ${upperCode}: 成功`);

      return {
        success: true,
        message: '测试成功',
        data: {
          paymentNo: testResult.paymentNo,
          payUrl: testResult.payUrl,
          qrCode: testResult.qrCode,
        },
      };
    } catch (error: any) {
      this.logger.error(`测试支付通道 ${upperCode} 失败: ${error.message}`);

      return {
        success: false,
        message: `测试失败: ${error.message}`,
      };
    }
  }

  /**
   * 获取通道配置字段定义
   */
  @Get('info/:code')
  @Roles('ADMIN')
  @ApiOperation({ summary: '获取通道配置字段定义' })
  async getGatewayInfo(@Param('code') code: string) {
    const info = PaymentGatewayFactory.getGatewayInfo(code);

    if (!info) {
      return {
        success: false,
        message: '不支持的支付通道',
      };
    }

    return {
      success: true,
      data: info,
    };
  }

  /**
   * 获取所有支持的通道类型
   */
  @Get('types/all')
  @Roles('ADMIN')
  @ApiOperation({ summary: '获取所有支持的通道类型' })
  async getSupportedGateways() {
    return {
      success: true,
      data: PaymentGatewayFactory.getAllGatewayInfo(),
    };
  }

  /**
   * 初始化默认通道配置
   */
  @Post('init')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '初始化默认通道配置' })
  async initGateways() {
    const results = [];

    for (const [code, info] of Object.entries(GATEWAY_INFO)) {
      const existing = await this.prisma.paymentGateway.findUnique({
        where: { code },
      });

      if (!existing) {
        const created = await this.prisma.paymentGateway.create({
          data: {
            code,
            name: info.name,
            enabled: false,
            config: PaymentGatewayFactory.getDefaultConfig(code),
            sort: Object.keys(GATEWAY_INFO).indexOf(code) + 1,
          },
        });
        results.push(created);
      }
    }

    return {
      success: true,
      message: `已初始化 ${results.length} 个通道`,
      data: results,
    };
  }
}