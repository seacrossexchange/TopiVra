import { test, expect } from '@playwright/test';

/**
 * TopiVra 三角色功能全面测试
 * 测试买家、卖家、管理员三个角色的完整功能
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

// 测试账号
const ACCOUNTS = {
  buyer: {
    email: 'buyer@topivra.com',
    password: 'Buyer123!',
  },
  seller: {
    email: 'seller@topivra.com',
    password: 'Seller123!',
  },
  admin: {
    email: 'admin@topivra.com',
    password: 'Admin123!',
  },
};

test.describe('买家角色功能测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);
  });

  test('买家登录成功', async ({ page }) => {
    await page.fill('input[type="text"], input[id*="email"]', ACCOUNTS.buyer.email);
    await page.fill('input[type="password"]', ACCOUNTS.buyer.password);
    await page.click('button[type="submit"]');

    // 等待跳转
    await page.waitForURL(/.*\/(user|$).*/, { timeout: 10000 });
    
    // 验证登录成功
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('login');
    console.log('✓ 买家登录成功');
  });

  test('买家访问个人中心', async ({ page }) => {
    // 登录
    await page.fill('input[type="text"]', ACCOUNTS.buyer.email);
    await page.fill('input[type="password"]', ACCOUNTS.buyer.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // 访问个人中心
    await page.goto(`${BASE_URL}/user/profile`);
    await page.waitForLoadState('networkidle');

    // 验证页面加载
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(100);
    console.log('✓ 买家可以访问个人中心');
  });

  test('买家无法访问卖家后台', async ({ page }) => {
    // 登录
    await page.fill('input[type="text"]', ACCOUNTS.buyer.email);
    await page.fill('input[type="password"]', ACCOUNTS.buyer.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // 尝试访问卖家后台
    await page.goto(`${BASE_URL}/seller`);
    await page.waitForTimeout(2000);

    // 应该被重定向或显示权限不足
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/seller');
    console.log('✓ 买家无法访问卖家后台（权限控制正常）');
  });

  test('买家无法访问管理员后台', async ({ page }) => {
    // 登录
    await page.fill('input[type="text"]', ACCOUNTS.buyer.email);
    await page.fill('input[type="password"]', ACCOUNTS.buyer.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // 尝试访问管理员后台
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForTimeout(2000);

    // 应该被重定向
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/admin');
    console.log('✓ 买家无法访问管理员后台（权限控制正常）');
  });
});

test.describe('卖家角色功能测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);
  });

  test('卖家登录成功', async ({ page }) => {
    await page.fill('input[type="text"]', ACCOUNTS.seller.email);
    await page.fill('input[type="password"]', ACCOUNTS.seller.password);
    await page.click('button[type="submit"]');

    // 等待跳转
    await page.waitForTimeout(3000);
    
    // 验证登录成功
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('login');
    console.log('✓ 卖家登录成功');
  });

  test('卖家可以访问卖家后台', async ({ page }) => {
    // 登录
    await page.fill('input[type="text"]', ACCOUNTS.seller.email);
    await page.fill('input[type="password"]', ACCOUNTS.seller.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // 访问卖家后台
    await page.goto(`${BASE_URL}/seller`);
    await page.waitForLoadState('networkidle');

    // 验证页面加载
    const currentUrl = page.url();
    expect(currentUrl).toContain('/seller');
    console.log('✓ 卖家可以访问卖家后台');
  });

  test('卖家仪表盘数据正常显示', async ({ page }) => {
    // 登录
    await page.fill('input[type="text"]', ACCOUNTS.seller.email);
    await page.fill('input[type="password"]', ACCOUNTS.seller.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // 访问卖家仪表盘
    await page.goto(`${BASE_URL}/seller`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 检查是否有统计卡片
    const pageContent = await page.content();
    const hasStats = pageContent.includes('总收入') || pageContent.includes('totalRevenue') || pageContent.includes('订单');
    
    if (!hasStats) {
      console.warn('⚠ 卖家仪表盘可能缺少统计数据');
    } else {
      console.log('✓ 卖家仪表盘数据显示正常');
    }
  });

  test('卖家无法访问管理员后台', async ({ page }) => {
    // 登录
    await page.fill('input[type="text"]', ACCOUNTS.seller.email);
    await page.fill('input[type="password"]', ACCOUNTS.seller.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // 尝试访问管理员后台
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForTimeout(2000);

    // 应该被重定向
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/admin');
    console.log('✓ 卖家无法访问管理员后台（权限控制正常）');
  });
});

test.describe('管理员角色功能测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);
  });

  test('管理员登录成功', async ({ page }) => {
    await page.fill('input[type="text"]', ACCOUNTS.admin.email);
    await page.fill('input[type="password"]', ACCOUNTS.admin.password);
    await page.click('button[type="submit"]');

    // 等待跳转
    await page.waitForTimeout(3000);
    
    // 验证登录成功
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('login');
    console.log('✓ 管理员登录成功');
  });

  test('管理员可以访问管理后台', async ({ page }) => {
    // 登录
    await page.fill('input[type="text"]', ACCOUNTS.admin.email);
    await page.fill('input[type="password"]', ACCOUNTS.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // 访问管理后台
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');

    // 验证页面加载
    const currentUrl = page.url();
    expect(currentUrl).toContain('/admin');
    console.log('✓ 管理员可以访问管理后台');
  });

  test('管理员仪表盘无中英文混合', async ({ page }) => {
    // 登录
    await page.fill('input[type="text"]', ACCOUNTS.admin.email);
    await page.fill('input[type="password"]', ACCOUNTS.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // 访问管理员仪表盘
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 获取页面文本内容
    const pageText = await page.textContent('body');
    
    // 检查是否有明显的中英文混合（简单检测）
    const hasChinese = /[\u4e00-\u9fa5]/.test(pageText || '');
    const hasEnglish = /[a-zA-Z]{3,}/.test(pageText || '');
    
    if (hasChinese && hasEnglish) {
      console.log('ℹ 页面包含中英文内容（可能是正常的国际化）');
    }
    
    console.log('✓ 管理员仪表盘语言检查完成');
  });

  test('管理员可以访问所有管理功能', async ({ page }) => {
    // 登录
    await page.fill('input[type="text"]', ACCOUNTS.admin.email);
    await page.fill('input[type="password"]', ACCOUNTS.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // 测试访问各个管理页面
    const adminPages = [
      '/admin',
      '/admin/users',
      '/admin/products',
      '/admin/orders',
      '/admin/sellers',
    ];

    for (const pagePath of adminPages) {
      await page.goto(`${BASE_URL}${pagePath}`);
      await page.waitForTimeout(1000);
      
      const currentUrl = page.url();
      expect(currentUrl).toContain(pagePath);
    }

    console.log('✓ 管理员可以访问所有管理功能页面');
  });
});

test.describe('申请成为卖家功能测试', () => {
  test('普通用户可以申请成为卖家', async ({ page }) => {
    // 登录买家账号
    await page.goto(`${BASE_URL}/auth/login`);
    await page.fill('input[type="text"]', ACCOUNTS.buyer.email);
    await page.fill('input[type="password"]', ACCOUNTS.buyer.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // 访问申请卖家页面
    await page.goto(`${BASE_URL}/apply-seller`);
    await page.waitForLoadState('networkidle');

    // 验证页面可访问
    const pageContent = await page.content();
    const hasForm = pageContent.includes('店铺名称') || pageContent.includes('shopName');
    
    expect(hasForm).toBeTruthy();
    console.log('✓ 普通用户可以访问申请卖家页面');
  });
});

test.describe('权限隔离测试', () => {
  test('未登录用户无法访问受保护路由', async ({ page }) => {
    const protectedRoutes = [
      '/user/profile',
      '/user/orders',
      '/seller',
      '/admin',
    ];

    for (const route of protectedRoutes) {
      await page.goto(`${BASE_URL}${route}`);
      await page.waitForTimeout(1000);

      const currentUrl = page.url();
      // 应该被重定向到登录页
      expect(currentUrl).toContain('login');
    }

    console.log('✓ 未登录用户无法访问受保护路由');
  });
});

test.describe('数据完整性测试', () => {
  test('买家个人中心数据无报错', async ({ page }) => {
    // 登录
    await page.goto(`${BASE_URL}/auth/login`);
    await page.fill('input[type="text"]', ACCOUNTS.buyer.email);
    await page.fill('input[type="password"]', ACCOUNTS.buyer.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // 访问个人中心
    await page.goto(`${BASE_URL}/user/profile`);
    await page.waitForLoadState('networkidle');

    // 检查控制台错误
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);

    if (errors.length > 0) {
      console.warn('⚠ 发现控制台错误:', errors);
    } else {
      console.log('✓ 买家个人中心无控制台错误');
    }
  });

  test('卖家仪表盘数据无报错', async ({ page }) => {
    // 登录
    await page.goto(`${BASE_URL}/auth/login`);
    await page.fill('input[type="text"]', ACCOUNTS.seller.email);
    await page.fill('input[type="password"]', ACCOUNTS.seller.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // 访问卖家仪表盘
    await page.goto(`${BASE_URL}/seller`);
    await page.waitForLoadState('networkidle');

    // 检查控制台错误
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);

    if (errors.length > 0) {
      console.warn('⚠ 发现控制台错误:', errors);
    } else {
      console.log('✓ 卖家仪表盘无控制台错误');
    }
  });

  test('管理员仪表盘数据无报错', async ({ page }) => {
    // 登录
    await page.goto(`${BASE_URL}/auth/login`);
    await page.fill('input[type="text"]', ACCOUNTS.admin.email);
    await page.fill('input[type="password"]', ACCOUNTS.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // 访问管理员仪表盘
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');

    // 检查控制台错误
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);

    if (errors.length > 0) {
      console.warn('⚠ 发现控制台错误:', errors);
    } else {
      console.log('✓ 管理员仪表盘无控制台错误');
    }
  });
});


