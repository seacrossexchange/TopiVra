import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// 加载环境变量
config({ path: resolve(__dirname, '../.env') });

// 创建 PrismaClient 实例
const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

async function main() {
  console.log('开始初始化测试数据...');

  // 创建密码哈希
  const adminPasswordHash = await bcrypt.hash('Admin123!', 10);
  const sellerPasswordHash = await bcrypt.hash('Seller123!', 10);
  const buyerPasswordHash = await bcrypt.hash('Buyer123!', 10);

  // 1. 创建管理员账号
  const admin = await prisma.user.upsert({
    where: { email: 'admin@topivra.com' },
    update: {},
    create: {
      email: 'admin@topivra.com',
      username: 'admin',
      passwordHash: adminPasswordHash,
      status: 'ACTIVE',
      emailVerified: true,
      isSeller: false,
    },
  });
  console.log('✅ 管理员账号创建成功:', admin.email);

  // 2. 创建卖家账号
  const seller = await prisma.user.upsert({
    where: { email: 'seller@topivra.com' },
    update: {},
    create: {
      email: 'seller@topivra.com',
      username: 'seller',
      passwordHash: sellerPasswordHash,
      status: 'ACTIVE',
      emailVerified: true,
      isSeller: true,
    },
  });
  console.log('✅ 卖家用户账号创建成功:', seller.email);

  // 2.1 创建卖家店铺信息
  const sellerProfile = await prisma.sellerProfile.upsert({
    where: { userId: seller.id },
    update: {},
    create: {
      userId: seller.id,
      shopName: '测试店铺',
      shopDescription: '这是一个测试卖家店铺',
      level: 'VERIFIED',
      applicationStatus: 'APPROVED',
      balance: 1000.0,
      totalSales: 5000.0,
      productCount: 10,
      orderCount: 50,
      rating: 4.8,
      ratingCount: 45,
    },
  });
  console.log('✅ 卖家店铺创建成功:', sellerProfile.shopName);

  // 3. 创建买家账号
  const buyer = await prisma.user.upsert({
    where: { email: 'buyer@topivra.com' },
    update: {},
    create: {
      email: 'buyer@topivra.com',
      username: 'buyer',
      passwordHash: buyerPasswordHash,
      status: 'ACTIVE',
      emailVerified: true,
      isSeller: false,
    },
  });
  console.log('✅ 买家账号创建成功:', buyer.email);

  // 4. 创建测试分类
  const categories = [
    {
      name: 'Facebook账号',
      slug: 'facebook',
      icon: '📘',
      color: '#1877F2',
      description: 'Facebook各类账号',
    },
    {
      name: 'Instagram账号',
      slug: 'instagram',
      icon: '📷',
      color: '#E4405F',
      description: 'Instagram账号',
    },
    {
      name: 'Telegram账号',
      slug: 'telegram',
      icon: '✈️',
      color: '#0088cc',
      description: 'Telegram账号',
    },
    {
      name: 'Twitter账号',
      slug: 'twitter',
      icon: '🐦',
      color: '#1DA1F2',
      description: 'Twitter/X账号',
    },
    {
      name: 'Google Voice',
      slug: 'google-voice',
      icon: '📞',
      color: '#4285F4',
      description: 'Google Voice号码',
    },
    {
      name: 'Gmail账号',
      slug: 'gmail',
      icon: '📧',
      color: '#EA4335',
      description: 'Gmail邮箱账号',
    },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: {
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        color: cat.color,
        description: cat.description,
        isActive: true,
        sortOrder: 0,
      },
    });
  }
  console.log('✅ 分类数据创建成功');

  // 5. 创建测试商品
  const facebookCategory = await prisma.category.findUnique({
    where: { slug: 'facebook' },
  });
  const telegramCategory = await prisma.category.findUnique({
    where: { slug: 'telegram' },
  });
  const gmailCategory = await prisma.category.findUnique({
    where: { slug: 'gmail' },
  });

  if (facebookCategory) {
    await prisma.product.upsert({
      where: { id: 'test-product-fb-1' },
      update: {},
      create: {
        id: 'test-product-fb-1',
        sellerId: seller.id,
        categoryId: facebookCategory.id,
        title: 'Facebook老号 - 2019年注册 - 带好友',
        description: 'Facebook老号，2019年注册，带好友，可正常使用',
        platform: 'Facebook',
        accountType: '老号',
        region: '美国',
        price: 15.99,
        originalPrice: 19.99,
        currency: 'USD',
        stock: 50,
        status: 'ON_SALE',
        credentials: {
          email: 'test@example.com',
          password: 'testpass123',
          note: '测试凭证数据',
        },
        attributes: {
          registerYear: 2019,
          hasFriends: true,
          verified: true,
        },
        images: ['https://via.placeholder.com/300'],
        thumbnailUrl: 'https://via.placeholder.com/150',
        tags: ['老号', '美国', '带好友'],
      },
    });
  }

  if (telegramCategory) {
    await prisma.product.upsert({
      where: { id: 'test-product-tg-1' },
      update: {},
      create: {
        id: 'test-product-tg-1',
        sellerId: seller.id,
        categoryId: telegramCategory.id,
        title: 'Telegram账号 - 虚拟号码注册 - 可换绑',
        description: 'Telegram账号，虚拟号码注册，支持换绑手机号',
        platform: 'Telegram',
        accountType: '虚拟号',
        region: '全球',
        price: 2.99,
        currency: 'USD',
        stock: 200,
        status: 'ON_SALE',
        credentials: {
          phone: '+1234567890',
          note: '测试凭证数据',
        },
        attributes: {
          virtualNumber: true,
          canChangeNumber: true,
        },
        images: ['https://via.placeholder.com/300'],
        thumbnailUrl: 'https://via.placeholder.com/150',
        tags: ['虚拟号', '可换绑'],
      },
    });
  }

  if (gmailCategory) {
    await prisma.product.upsert({
      where: { id: 'test-product-gmail-1' },
      update: {},
      create: {
        id: 'test-product-gmail-1',
        sellerId: seller.id,
        categoryId: gmailCategory.id,
        title: 'Gmail邮箱 - 2023年注册 - 已验证手机',
        description: 'Gmail邮箱账号，2023年注册，已验证手机号',
        platform: 'Gmail',
        accountType: '邮箱',
        region: '美国',
        price: 3.49,
        currency: 'USD',
        stock: 100,
        status: 'ON_SALE',
        credentials: {
          email: 'test123@gmail.com',
          password: 'testpass123',
          recoveryEmail: 'recovery@example.com',
        },
        attributes: {
          registerYear: 2023,
          phoneVerified: true,
          storage: '15GB',
        },
        images: ['https://via.placeholder.com/300'],
        thumbnailUrl: 'https://via.placeholder.com/150',
        tags: ['邮箱', '已验证'],
      },
    });
  }
  console.log('✅ 商品数据创建成功');

  // 6. 创建测试订单
  const testProduct = await prisma.product.findFirst({
    where: { sellerId: seller.id },
  });

  if (testProduct) {
    // 创建已完成订单
    const completedOrder = await prisma.order.upsert({
      where: { id: 'test-order-completed-1' },
      update: {},
      create: {
        id: 'test-order-completed-1',
        orderNo: 'ORD20240100001',
        buyerId: buyer.id,
        totalAmount: 15.99,
        payAmount: 15.99,
        commission: 1.6,
        currency: 'USD',
        paymentMethod: 'USDT',
        paymentStatus: 'PAID',
        orderStatus: 'COMPLETED',
        paidAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        autoCancelAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        autoConfirmAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.orderItem.upsert({
      where: { id: 'test-order-item-completed-1' },
      update: {},
      create: {
        id: 'test-order-item-completed-1',
        orderId: completedOrder.id,
        productId: testProduct.id,
        sellerId: seller.id,
        productTitle: testProduct.title,
        productSnapshot: {},
        quantity: 1,
        unitPrice: 15.99,
        subtotal: 15.99,
        sellerAmount: 14.39,
        commissionAmount: 1.6,
        commissionRate: 10.0,
        deliveredCredentials: (testProduct as any).credentials,
        deliveredAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        deliveryConfirmed: true,
        confirmedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        settled: true,
        settledAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      },
    });

    // 创建待支付订单
    const pendingOrder = await prisma.order.upsert({
      where: { id: 'test-order-pending-1' },
      update: {},
      create: {
        id: 'test-order-pending-1',
        orderNo: 'ORD20240100002',
        buyerId: buyer.id,
        totalAmount: 2.99,
        payAmount: 2.99,
        commission: 0.3,
        currency: 'USD',
        paymentStatus: 'UNPAID',
        orderStatus: 'PENDING_PAYMENT',
        autoCancelAt: new Date(Date.now() + 30 * 60 * 1000),
        autoConfirmAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const telegramProduct = await prisma.product.findUnique({
      where: { id: 'test-product-tg-1' },
    });

    if (telegramProduct) {
      await prisma.orderItem.upsert({
        where: { id: 'test-order-item-pending-1' },
        update: {},
        create: {
          id: 'test-order-item-pending-1',
          orderId: pendingOrder.id,
          productId: telegramProduct.id,
          sellerId: seller.id,
          productTitle: telegramProduct.title,
          productSnapshot: {},
          quantity: 1,
          unitPrice: 2.99,
          subtotal: 2.99,
          sellerAmount: 2.69,
          commissionAmount: 0.3,
          commissionRate: 10.0,
        },
      });
    }

    console.log('✅ 订单数据创建成功');
  }

  // 7. 创建系统配置
  await prisma.systemConfig.upsert({
    where: { key: 'platform.commissionRate' },
    update: {},
    create: {
      key: 'platform.commissionRate',
      value: { rate: 10 },
      description: '平台佣金比例(%)',
    },
  });

  await prisma.systemConfig.upsert({
    where: { key: 'platform.usdtWallet' },
    update: {},
    create: {
      key: 'platform.usdtWallet',
      value: { address: 'TYourTRC20WalletAddressHere' },
      description: 'USDT收款钱包地址',
    },
  });

  await prisma.systemConfig.upsert({
    where: { key: 'order.autoCancelMinutes' },
    update: {},
    create: {
      key: 'order.autoCancelMinutes',
      value: { minutes: 30 },
      description: '订单自动取消时间(分钟)',
    },
  });

  await prisma.systemConfig.upsert({
    where: { key: 'order.autoConfirmDays' },
    update: {},
    create: {
      key: 'order.autoConfirmDays',
      value: { days: 7 },
      description: '订单自动确认时间(天)',
    },
  });
  console.log('✅ 系统配置创建成功');

  // 8. 创建测试工单
  await prisma.ticket.upsert({
    where: { id: 'test-ticket-1' },
    update: {},
    create: {
      id: 'test-ticket-1',
      ticketNo: 'TK20240100001',
      userId: buyer.id,
      type: 'ORDER_ISSUE',
      subject: '测试工单 - 订单问题',
      content: '这是一个测试工单，用于验证工单系统功能。',
      priority: 'MEDIUM',
      status: 'OPEN',
    },
  });
  console.log('✅ 工单数据创建成功');

  // 9. 创建测试通知
  await prisma.notification.upsert({
    where: { id: 'test-notification-1' },
    update: {},
    create: {
      id: 'test-notification-1',
      userId: buyer.id,
      type: 'SYSTEM',
      title: '欢迎注册 Topter',
      content: '感谢您注册 Topter 平台，祝您购物愉快！',
      isRead: false,
    },
  });
  console.log('✅ 通知数据创建成功');

  // 10. 创建卖家资金流水
  await prisma.sellerTransaction.upsert({
    where: { id: 'test-transaction-1' },
    update: {},
    create: {
      id: 'test-transaction-1',
      sellerId: seller.id,
      type: 'INCOME',
      amount: 14.39,
      balanceAfter: 1014.39,
      currency: 'USD',
      description: '测试订单收入',
    },
  });
  console.log('✅ 资金流水创建成功');

  // 11. 创建博客分类
  const blogCategory = await prisma.category.upsert({
    where: { slug: 'platform-news' },
    update: {},
    create: {
      name: '平台动态',
      slug: 'platform-news',
      icon: '📰',
      color: '#FF6B6B',
      description: '平台最新动态和公告',
      isActive: true,
      sortOrder: 0,
    },
  });
  console.log('✅ 博客分类创建成功');

  // 12. 创建测试博客文章
  const blog1 = await prisma.blog.upsert({
    where: { id: 'test-blog-1' },
    update: {},
    create: {
      id: 'test-blog-1',
      authorId: admin.id,
      categoryId: blogCategory.id,
      title: '欢迎来到 TopiVra 数字账号交易平台',
      slug: 'welcome-to-topivra',
      excerpt: 'TopiVra 是一个安全、可靠的数字账号交易平台，为买家和卖家提供优质的交易体验。',
      content: `# 欢迎来到 TopiVra

TopiVra 是一个专业的数字账号交易平台，致力于为全球用户提供安全、便捷的数字资产交易服务。

## 我们的优势

### 1. 安全保障
- 平台担保交易，资金安全有保障
- 严格的卖家审核机制
- 完善的售后服务体系

### 2. 丰富的商品
- Facebook、Instagram、Telegram 等主流平台账号
- Gmail、Google Voice 等邮箱和号码
- 持续更新的商品库存

### 3. 便捷支付
- 支持 USDT、PayPal、Stripe 等多种支付方式
- 快速到账，即时交付

## 如何开始

1. 注册账号
2. 浏览商品
3. 选择心仪的账号
4. 安全支付
5. 获取账号信息

欢迎体验 TopiVra！`,
      coverImage: 'https://via.placeholder.com/800x400',
      status: 'PUBLISHED',
      contentType: 'MARKDOWN',
      viewCount: 156,
      likeCount: 23,
      commentCount: 5,
      readingTime: 3,
      publishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
  });

  const blog2 = await prisma.blog.upsert({
    where: { id: 'test-blog-2' },
    update: {},
    create: {
      id: 'test-blog-2',
      authorId: admin.id,
      categoryId: blogCategory.id,
      title: '如何安全购买数字账号？新手指南',
      slug: 'how-to-buy-digital-accounts-safely',
      excerpt: '本文将为您详细介绍如何在 TopiVra 平台上安全地购买数字账号，避免常见的陷阱。',
      content: `# 如何安全购买数字账号？

购买数字账号需要谨慎，本指南将帮助您避免常见问题。

## 购买前的准备

### 1. 了解账号类型
不同平台的账号有不同的特点：
- **老号**：注册时间长，信誉度高
- **新号**：价格便宜，适合批量使用
- **实名号**：已完成实名认证

### 2. 选择可靠的卖家
- 查看卖家评分和评价
- 选择认证卖家
- 避免价格过低的商品

## 购买流程

1. **浏览商品**：仔细阅读商品描述
2. **咨询卖家**：有疑问及时沟通
3. **下单支付**：使用平台担保交易
4. **验收账号**：收到账号后立即验证
5. **确认收货**：确认无误后完成交易

## 注意事项

⚠️ **重要提示**：
- 收到账号后立即修改密码
- 绑定自己的邮箱和手机号
- 保存好账号信息
- 如有问题及时联系客服

## 售后保障

TopiVra 提供完善的售后服务：
- 7天内账号问题可申请退款
- 平台客服全天候在线
- 争议处理公平公正

祝您购物愉快！`,
      coverImage: 'https://via.placeholder.com/800x400',
      status: 'PUBLISHED',
      contentType: 'MARKDOWN',
      viewCount: 342,
      likeCount: 67,
      commentCount: 12,
      readingTime: 5,
      publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  });

  const blog3 = await prisma.blog.upsert({
    where: { id: 'test-blog-3' },
    update: {},
    create: {
      id: 'test-blog-3',
      authorId: seller.id,
      categoryId: blogCategory.id,
      title: '卖家必读：如何提高商品销量？',
      slug: 'seller-guide-increase-sales',
      excerpt: '作为卖家，如何在 TopiVra 平台上提高商品销量？本文分享实用技巧。',
      content: `# 卖家必读：如何提高商品销量？

作为 TopiVra 平台的卖家，以下技巧可以帮助您提高销量。

## 1. 优化商品信息

### 标题优化
- 包含关键词：平台名称、账号类型、特点
- 简洁明了，突出卖点
- 示例："Facebook老号 - 2019年注册 - 带好友"

### 描述详细
- 账号注册时间
- 账号状态（是否实名、是否有好友等）
- 使用建议和注意事项

### 图片清晰
- 使用高质量截图
- 展示账号关键信息
- 保护隐私信息

## 2. 合理定价

- 参考市场价格
- 考虑账号质量
- 适当促销活动

## 3. 提供优质服务

### 快速响应
- 及时回复买家咨询
- 解答疑问要专业

### 快速发货
- 收到订单后尽快交付
- 提供详细的使用说明

### 售后保障
- 承诺账号质量
- 出现问题积极解决

## 4. 积累好评

- 提供优质商品
- 良好的服务态度
- 鼓励买家评价

## 5. 持续优化

- 关注销售数据
- 分析买家反馈
- 不断改进商品和服务

祝您生意兴隆！`,
      coverImage: 'https://via.placeholder.com/800x400',
      status: 'PUBLISHED',
      contentType: 'MARKDOWN',
      viewCount: 198,
      likeCount: 34,
      commentCount: 8,
      readingTime: 4,
      publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('✅ 博客文章创建成功');

  // 13. 创建博客标签
  const tags = [
    { name: '新手指南', slug: 'beginner-guide', color: '#4CAF50' },
    { name: '平台公告', slug: 'announcement', color: '#2196F3' },
    { name: '安全提示', slug: 'security-tips', color: '#FF9800' },
    { name: '卖家技巧', slug: 'seller-tips', color: '#9C27B0' },
  ];

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: {},
      create: {
        name: tag.name,
        slug: tag.slug,
        color: tag.color,
        postCount: 0,
      },
    });
  }
  console.log('✅ 博客标签创建成功');

  // 14. 关联博客和标签
  const beginnerTag = await prisma.tag.findUnique({ where: { slug: 'beginner-guide' } });
  const securityTag = await prisma.tag.findUnique({ where: { slug: 'security-tips' } });
  const sellerTag = await prisma.tag.findUnique({ where: { slug: 'seller-tips' } });

  if (beginnerTag) {
    await prisma.blogTag.upsert({
      where: { id: 'blog-tag-1' },
      update: {},
      create: {
        id: 'blog-tag-1',
        blogId: blog2.id,
        tagId: beginnerTag.id,
      },
    });
  }

  if (securityTag) {
    await prisma.blogTag.upsert({
      where: { id: 'blog-tag-2' },
      update: {},
      create: {
        id: 'blog-tag-2',
        blogId: blog2.id,
        tagId: securityTag.id,
      },
    });
  }

  if (sellerTag) {
    await prisma.blogTag.upsert({
      where: { id: 'blog-tag-3' },
      update: {},
      create: {
        id: 'blog-tag-3',
        blogId: blog3.id,
        tagId: sellerTag.id,
      },
    });
  }
  console.log('✅ 博客标签关联成功');

  // 15. 创建用户角色
  await prisma.userRole.upsert({
    where: { id: 'role-admin-1' },
    update: {},
    create: {
      id: 'role-admin-1',
      userId: admin.id,
      role: 'ADMIN',
    },
  });

  await prisma.userRole.upsert({
    where: { id: 'role-seller-1' },
    update: {},
    create: {
      id: 'role-seller-1',
      userId: seller.id,
      role: 'SELLER',
    },
  });

  await prisma.userRole.upsert({
    where: { id: 'role-buyer-1' },
    update: {},
    create: {
      id: 'role-buyer-1',
      userId: buyer.id,
      role: 'USER',
    },
  });
  console.log('✅ 用户角色创建成功');

  console.log('\n========================================');
  console.log('🎉 测试数据初始化完成!');
  console.log('========================================');
  console.log('\n📋 测试账号信息:');
  console.log('----------------------------------------');
  console.log('管理员账号:');
  console.log('  邮箱: admin@topivra.com');
  console.log('  密码: Admin123!');
  console.log('----------------------------------------');
  console.log('卖家账号:');
  console.log('  邮箱: seller@topivra.com');
  console.log('  密码: Seller123!');
  console.log('----------------------------------------');
  console.log('买家账号:');
  console.log('  邮箱: buyer@topivra.com');
  console.log('  密码: Buyer123!');
  console.log('========================================');
  console.log('\n📊 数据统计:');
  console.log('  - 用户: 3 个（管理员、卖家、买家）');
  console.log('  - 分类: 7 个');
  console.log('  - 商品: 3 个');
  console.log('  - 订单: 2 个');
  console.log('  - 博客: 3 篇');
  console.log('  - 标签: 4 个');
  console.log('========================================\n');
}

main()
  .catch((e) => {
    console.error('❌ 初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
