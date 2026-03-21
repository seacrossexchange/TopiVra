import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../modules/auth/guards/roles.guard';
import { Roles } from '../../modules/auth/decorators/roles.decorator';
import { ExportService } from './export.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('数据导出')
@Controller('export')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('users')
  @ApiOperation({ summary: '导出用户列表' })
  async exportUsers(@Res() res: Response) {
    try {
      const workbook = await this.exportService.exportUsers();
      const buffer = await workbook.xlsx.writeBuffer();

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=users_${Date.now()}.xlsx`,
      );

      res.send(buffer);
    } catch (error: any) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: '导出失败',
        error: error?.message || 'Unknown error',
      });
    }
  }

  @Get('orders')
  @ApiOperation({ summary: '导出订单列表' })
  async exportOrders(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Res() res?: Response,
  ) {
    try {
      const filters: any = {};
      if (startDate || endDate) {
        filters.createdAt = {};
        if (startDate) filters.createdAt.gte = new Date(startDate);
        if (endDate) filters.createdAt.lte = new Date(endDate);
      }

      const workbook = await this.exportService.exportOrders(filters);
      const buffer = await workbook.xlsx.writeBuffer();

      if (res) {
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );
        res.setHeader(
          'Content-Disposition',
          `attachment; filename=orders_${Date.now()}.xlsx`,
        );

        res.send(buffer);
      }
    } catch (error: any) {
      if (res) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          message: '导出失败',
          error: error?.message || 'Unknown error',
        });
      }
    }
  }

  @Get('products')
  @ApiOperation({ summary: '导出商品列表' })
  async exportProducts(
    @Query('status') status?: string,
    @Res() res?: Response,
  ) {
    try {
      const filters: any = {};
      if (status) filters.status = status;

      const workbook = await this.exportService.exportProducts(filters);
      const buffer = await workbook.xlsx.writeBuffer();

      if (res) {
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );
        res.setHeader(
          'Content-Disposition',
          `attachment; filename=products_${Date.now()}.xlsx`,
        );

        res.send(buffer);
      }
    } catch (error: any) {
      if (res) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          message: '导出失败',
          error: error?.message || 'Unknown error',
        });
      }
    }
  }

  @Get('tickets')
  @ApiOperation({ summary: '导出工单列表' })
  async exportTickets(@Res() res?: Response) {
    try {
      const workbook = await this.exportService.exportTickets();
      const buffer = await workbook.xlsx.writeBuffer();

      if (res) {
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );
        res.setHeader(
          'Content-Disposition',
          `attachment; filename=tickets_${Date.now()}.xlsx`,
        );

        res.send(buffer);
      }
    } catch (error: any) {
      if (res) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          message: '导出失败',
          error: error?.message || 'Unknown error',
        });
      }
    }
  }

  @Get('financial-report')
  @ApiOperation({ summary: '导出财务报表' })
  async exportFinancialReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Res() res?: Response,
  ) {
    try {
      const workbook = await this.exportService.exportFinancialReport(
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
      );
      const buffer = await workbook.xlsx.writeBuffer();

      if (res) {
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );
        res.setHeader(
          'Content-Disposition',
          `attachment; filename=financial_report_${Date.now()}.xlsx`,
        );

        res.send(buffer);
      }
    } catch (error: any) {
      if (res) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          message: '导出失败',
          error: error?.message || 'Unknown error',
        });
      }
    }
  }
}
