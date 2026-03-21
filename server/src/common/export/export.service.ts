import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 导出用户列表
   */
  async exportUsers(filters?: any) {
    const users = await this.prisma.user.findMany({
      where: filters,
      include: {
        sellerProfile: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('用户列表');

    // 设置列
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 36 },
      { header: '用户名', key: 'username', width: 20 },
      { header: '邮箱', key: 'email', width: 30 },
      { header: '手机', key: 'phone', width: 15 },
      { header: '角色', key: 'role', width: 15 },
      { header: '是否卖家', key: 'isSeller', width: 10 },
      { header: '余额', key: 'balance', width: 15 },
      { header: '会员等级', key: 'membershipLevel', width: 12 },
      { header: '注册时间', key: 'createdAt', width: 20 },
      { header: '最后登录', key: 'lastLoginAt', width: 20 },
    ];

    // 添加数据
    users.forEach((user) => {
      worksheet.addRow({
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone || '',
        role: user.isSeller ? '卖家' : '买家',
        isSeller: user.isSeller ? '是' : '否',
        balance: Number(user.balance || 0).toFixed(2),
        membershipLevel: user.membershipLevel || 0,
        createdAt: user.createdAt?.toISOString() || '',
        lastLoginAt: user.lastLoginAt?.toISOString() || '',
      });
    });

    // 样式设置
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    return workbook;
  }

  /**
   * 导出订单列表
   */
  async exportOrders(filters?: any) {
    const orders = await this.prisma.order.findMany({
      where: filters,
      include: {
        buyer: { select: { username: true, email: true } },
        orderItems: {
          include: {
            product: { select: { title: true, platform: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('订单列表');

    worksheet.columns = [
      { header: '订单号', key: 'orderNo', width: 20 },
      { header: '买家', key: 'buyer', width: 20 },
      { header: '商品', key: 'product', width: 40 },
      { header: '平台', key: 'platform', width: 15 },
      { header: '数量', key: 'quantity', width: 10 },
      { header: '金额', key: 'amount', width: 15 },
      { header: '支付方式', key: 'paymentMethod', width: 15 },
      { header: '订单状态', key: 'orderStatus', width: 15 },
      { header: '支付状态', key: 'paymentStatus', width: 15 },
      { header: '创建时间', key: 'createdAt', width: 20 },
      { header: '支付时间', key: 'paidAt', width: 20 },
    ];

    orders.forEach((order) => {
      const item = order.orderItems[0];
      worksheet.addRow({
        orderNo: order.orderNo,
        buyer: order.buyer.username,
        product: item?.product?.title || '',
        platform: item?.product?.platform || '',
        quantity: item?.quantity || 0,
        amount: Number(order.payAmount).toFixed(2),
        paymentMethod: order.paymentMethod || '',
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt?.toISOString() || '',
        paidAt: order.paidAt?.toISOString() || '',
      });
    });

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    return workbook;
  }

  /**
   * 导出商品列表
   */
  async exportProducts(filters?: any) {
    const products = await this.prisma.product.findMany({
      where: filters,
      include: {
        seller: { select: { username: true } },
        category: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('商品列表');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 36 },
      { header: '商品标题', key: 'title', width: 40 },
      { header: '平台', key: 'platform', width: 15 },
      { header: '分类', key: 'category', width: 15 },
      { header: '卖家', key: 'seller', width: 20 },
      { header: '价格', key: 'price', width: 12 },
      { header: '库存', key: 'stock', width: 10 },
      { header: '已售', key: 'soldCount', width: 10 },
      { header: '状态', key: 'status', width: 15 },
      { header: '创建时间', key: 'createdAt', width: 20 },
      { header: '审核时间', key: 'auditedAt', width: 20 },
    ];

    products.forEach((product) => {
      worksheet.addRow({
        id: product.id,
        title: product.title,
        platform: product.platform,
        category: product.category?.name || '',
        seller: product.seller?.username || '',
        price: Number(product.price).toFixed(2),
        stock: product.stock,
        soldCount: product.soldCount || 0,
        status: product.status,
        createdAt: product.createdAt?.toISOString() || '',
        auditedAt: product.auditedAt?.toISOString() || '',
      });
    });

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    return workbook;
  }

  /**
   * 导出工单列表
   */
  async exportTickets(filters?: any) {
    const tickets = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        t.*,
        b.username as buyer_username,
        s.username as seller_username
      FROM c2c_tickets t
      LEFT JOIN users b ON t.buyer_id = b.id
      LEFT JOIN users s ON t.seller_id = s.id
      ORDER BY t.created_at DESC
    `);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('工单列表');

    worksheet.columns = [
      { header: '工单号', key: 'ticketNo', width: 20 },
      { header: '类型', key: 'type', width: 12 },
      { header: '主题', key: 'subject', width: 40 },
      { header: '买家', key: 'buyer', width: 20 },
      { header: '卖家', key: 'seller', width: 20 },
      { header: '状态', key: 'status', width: 20 },
      { header: '退款金额', key: 'refundAmount', width: 15 },
      { header: '创建时间', key: 'createdAt', width: 20 },
      { header: '完成时间', key: 'completedAt', width: 20 },
    ];

    tickets.forEach((ticket) => {
      worksheet.addRow({
        ticketNo: ticket.ticket_no,
        type: ticket.type,
        subject: ticket.subject,
        buyer: ticket.buyer_username || '',
        seller: ticket.seller_username || '',
        status: ticket.status,
        refundAmount: ticket.refund_amount
          ? Number(ticket.refund_amount).toFixed(2)
          : '',
        createdAt: ticket.created_at || '',
        completedAt: ticket.completed_at || '',
      });
    });

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    return workbook;
  }

  /**
   * 导出财务报表
   */
  async exportFinancialReport(startDate?: Date, endDate?: Date) {
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const orders = await this.prisma.order.findMany({
      where: {
        ...where,
        paymentStatus: 'PAID',
      },
      include: {
        buyer: { select: { username: true } },
        orderItems: {
          include: {
            seller: { select: { username: true } },
            product: { select: { title: true } },
          },
        },
      },
      orderBy: { paidAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('财务报表');

    worksheet.columns = [
      { header: '订单号', key: 'orderNo', width: 20 },
      { header: '买家', key: 'buyer', width: 20 },
      { header: '卖家', key: 'seller', width: 20 },
      { header: '商品', key: 'product', width: 40 },
      { header: '订单金额', key: 'amount', width: 15 },
      { header: '平台佣金', key: 'commission', width: 15 },
      { header: '卖家收入', key: 'sellerIncome', width: 15 },
      { header: '支付方式', key: 'paymentMethod', width: 15 },
      { header: '支付时间', key: 'paidAt', width: 20 },
      { header: '订单状态', key: 'status', width: 15 },
    ];

    let totalAmount = 0;
    let totalCommission = 0;

    orders.forEach((order) => {
      const item = order.orderItems[0];
      const amount = Number(order.payAmount);
      const commission = amount * 0.05; // 假设5%佣金
      const sellerIncome = amount - commission;

      totalAmount += amount;
      totalCommission += commission;

      worksheet.addRow({
        orderNo: order.orderNo,
        buyer: order.buyer.username,
        seller: item?.seller?.username || '',
        product: item?.product?.title || '',
        amount: amount.toFixed(2),
        commission: commission.toFixed(2),
        sellerIncome: sellerIncome.toFixed(2),
        paymentMethod: order.paymentMethod || '',
        paidAt: order.paidAt?.toISOString() || '',
        status: order.orderStatus,
      });
    });

    // 添加汇总行
    worksheet.addRow({});
    worksheet.addRow({
      orderNo: '汇总',
      amount: totalAmount.toFixed(2),
      commission: totalCommission.toFixed(2),
      sellerIncome: (totalAmount - totalCommission).toFixed(2),
    });

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    const summaryRow = worksheet.lastRow;
    if (summaryRow) {
      summaryRow.font = { bold: true };
      summaryRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFEB3B' },
      };
    }

    return workbook;
  }
}
