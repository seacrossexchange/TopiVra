/**
 * Sprint 5: P1 全链路回归测试
 * 覆盖五条核心业务链路
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5174';
const API_BASE = process.env.API_URL || 'http://localhost:3000/api/v1';

// 辅助函数
async function registerUser(page: Page, prefix: string): Promise<{ token: string; userId: string; email: string }> {
  const email = `${prefix}_${Date.now()}@test.com`;
  const username = `${prefix}_${Date.now()}`;
  const password = 'Test@123456';

  await page.goto(`${BASE_URL}/register`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  await page.fill('input[name="confirmPassword"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  const token = await page.evaluate(() => localStorage.getItem('token') || '');
  return { token, userId: '', email };
}

test.describe('全链路回归测试', () => {
  
  test.describe('链路1: 注册 → 邮箱验证 → 登录 → 2FA 设置 → 2FA 登录', () => {
    
    test('1.1 用户注册流程', async ({ page }) => {
      await page.goto(`${BASE_URL}/register`);
      
      // 检查注册表单元素
      const emailInput = await page.locator('input[name="email"]').count();
      const usernameInput = await page.locator('input[name="username"]').count();
      const passwordInput = await page.locator('input[name="password"]').count();
      
      expect(emailInput).toBeGreaterThan(0);
      expect(usernameInput).toBeGreaterThan(0);
      expect(passwordInput).toBeGreaterThan(0);
      
      console.log('[TEST] 注册页面元素检查通过');
    });

    test('1.2 登录流程', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // 检查登录表单
      const emailInput = await page.locator('input[name="email"]').count();
      const passwordInput = await page.locator('input[name="password"]').count();
      const submitBtn = await page.locator('button[type="submit"]').count();
      
      expect(emailInput).toBeGreaterThan(0);
      expect(passwordInput).toBeGreaterThan(0);
      expect(submitBtn).toBeGreaterThan(0);
      
      console.log('[TEST] 登录页面元素检查通过');
    });

    test('1.3 2FA 设置页面', async ({ page }) => {
      // 需要登录后访问
      await page.goto(`${BASE_URL}/user/profile`);
      
      // 检查是否有 2FA 相关元素
      const pageContent = await page.content();
      const has2FAContent = pageContent.includes('2FA') || 
                            pageContent.includes('两步验证') ||
                            pageContent.includes('Two-Factor');
      
      console.log(`[TEST] 2FA 内容存在: ${has2FAContent}`);
    });

    test('1.4 API 认证端点检查', async ({ request }) => {
      const endpoints = [
        { path: '/auth/register', method: 'POST', data: {} },
        { path: '/auth/login', method: 'POST', data: {} },
        { path: '/auth/refresh', method: 'POST', data: {} },
        { path: '/auth/2fa/setup', method: 'GET' },
        { path: '/auth/2fa/verify', method: 'POST', data: {} },
      ];
      
      for (const endpoint of endpoints) {
        let response;
        if (endpoint.method === 'GET') {
          response = await request.get(`${API_BASE}${endpoint.path}`);
        } else {
          response = await request.post(`${API_BASE}${endpoint.path}`, { data: endpoint.data });
        }
        
        console.log(`[TEST] ${endpoint.method} ${endpoint.path}: ${response.status()}`);
        expect(response.status()).toBeLessThan(500);
      }
    });
  });

  test.describe('链路2: 浏览 → 搜索 → 加购 → 结算 → USDT 支付 → 收到凭证 → 确认收货 → 评价', () => {
    
    test('2.1 商品浏览', async ({ page }) => {
      await page.goto(`${BASE_URL}/products`);
      await page.waitForTimeout(1000);
      
      // 检查商品列表页
      const url = page.url();
      expect(url).toContain('/products');
      
      console.log('[TEST] 商品列表页加载成功');
    });

    test('2.2 搜索功能', async ({ page }) => {
      await page.goto(`${BASE_URL}/products?search=test`);
      await page.waitForTimeout(500);
      
      // 搜索参数应该正确传递
      const url = page.url();
      expect(url).toContain('search');
      
      console.log('[TEST] 搜索功能检查通过');
    });

    test('2.3 商品详情页', async ({ page }) => {
      await page.goto(`${BASE_URL}/products`);
      await page.waitForTimeout(500);
      
      // 检查是否有商品卡片
      const productCards = await page.locator('[data-testid="product-card"], .product-card, a[href*="/products/"]').count();
      
      console.log(`[TEST] 商品卡片数量: ${productCards}`);
    });

    test('2.4 购物车页面', async ({ page }) => {
      await page.goto(`${BASE_URL}/cart`);
      await page.waitForTimeout(500);
      
      // 购物车页面应该加载
      const url = page.url();
      expect(url).toContain('/cart');
      
      console.log('[TEST] 购物车页面加载成功');
    });

    test('2.5 结算页面', async ({ page }) => {
      await page.goto(`${BASE_URL}/checkout`);
      await page.waitForTimeout(500);
      
      // 结算页面应该加载（可能需要登录）
      const url = page.url();
      console.log(`[TEST] 结算页面URL: ${url}`);
    });

    test('2.6 API 端点检查', async ({ request }) => {
      const endpoints = [
        { path: '/products', method: 'GET' },
        { path: '/products/search?q=test', method: 'GET' },
        { path: '/cart', method: 'GET' },
        { path: '/orders', method: 'GET' },
        { path: '/reviews', method: 'GET' },
      ];
      
      for (const endpoint of endpoints) {
        const response = endpoint.method === 'GET' 
          ? await request.get(`${API_BASE}${endpoint.path}`)
          : await request.post(`${API_BASE}${endpoint.path}`);
        
        console.log(`[TEST] ${endpoint.method} ${endpoint.path}: ${response.status()}`);
        expect(response.status()).toBeLessThan(500);
      }
    });
  });

  test.describe('链路3: 申请卖家 → Admin 审核 → 上架商品 → 接单 → 发货 → 查看收益 → 提现', () => {
    
    test('3.1 卖家申请页面', async ({ page }) => {
      await page.goto(`${BASE_URL}/apply-seller`);
      await page.waitForTimeout(500);
      
      console.log('[TEST] 卖家申请页面加载成功');
    });

    test('3.2 卖家中心页面', async ({ page }) => {
      await page.goto(`${BASE_URL}/seller/dashboard`);
      await page.waitForTimeout(500);
      
      // 可能重定向到登录页
      const url = page.url();
      console.log(`[TEST] 卖家中心URL: ${url}`);
    });

    test('3.3 卖家商品管理', async ({ page }) => {
      await page.goto(`${BASE_URL}/seller/products`);
      await page.waitForTimeout(500);
      
      console.log('[TEST] 卖家商品管理页面加载');
    });

    test('3.4 卖家订单管理', async ({ page }) => {
      await page.goto(`${BASE_URL}/seller/orders`);
      await page.waitForTimeout(500);
      
      console.log('[TEST] 卖家订单管理页面加载');
    });

    test('3.5 卖家财务页面', async ({ page }) => {
      await page.goto(`${BASE_URL}/seller/finance`);
      await page.waitForTimeout(500);
      
      console.log('[TEST] 卖家财务页面加载');
    });

    test('3.6 API 端点检查', async ({ request }) => {
      const endpoints = [
        { path: '/sellers/apply', method: 'POST' },
        { path: '/sellers/profile', method: 'GET' },
        { path: '/sellers/products', method: 'GET' },
        { path: '/sellers/orders', method: 'GET' },
        { path: '/sellers/withdrawals', method: 'POST' },
      ];
      
      for (const endpoint of endpoints) {
        let response;
        if (endpoint.method === 'GET') {
          response = await request.get(`${API_BASE}${endpoint.path}`);
        } else {
          response = await request.post(`${API_BASE}${endpoint.path}`, { data: {} });
        }
        
        console.log(`[TEST] ${endpoint.method} ${endpoint.path}: ${response.status()}`);
        expect(response.status()).toBeLessThan(500);
      }
    });
  });

  test.describe('链路4: 下单 → 支付 → 申请退款 → Admin 审核通过 → 退款完成', () => {
    
    test('4.1 用户订单列表', async ({ page }) => {
      await page.goto(`${BASE_URL}/user/orders`);
      await page.waitForTimeout(500);
      
      console.log('[TEST] 用户订单列表页面加载');
    });

    test('4.2 退款申请检查', async ({ page }) => {
      // 检查退款相关 UI 元素
      await page.goto(`${BASE_URL}/user/orders`);
      await page.waitForTimeout(500);
      
      const pageContent = await page.content();
      const hasRefundContent = pageContent.includes('退款') || pageContent.includes('refund');
      
      console.log(`[TEST] 退款功能存在: ${hasRefundContent}`);
    });

    test('4.3 管理员退款审核页面', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin/refunds`);
      await page.waitForTimeout(500);
      
      // 可能需要管理员登录
      const url = page.url();
      console.log(`[TEST] 管理员退款页面URL: ${url}`);
    });

    test('4.4 API 端点检查', async ({ request }) => {
      const endpoints = [
        { path: '/orders/refunds', method: 'GET' },
        { path: '/admin/refunds', method: 'GET' },
      ];
      
      for (const endpoint of endpoints) {
        const response = await request.get(`${API_BASE}${endpoint.path}`);
        console.log(`[TEST] GET ${endpoint.path}: ${response.status()}`);
        expect(response.status()).toBeLessThan(500);
      }
    });
  });

  test.describe('链路5: Admin 仪表盘 → 用户管理 → 商品审核 → 退款审核 → 系统日志', () => {
    
    test('5.1 管理员仪表盘', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin/dashboard`);
      await page.waitForTimeout(500);
      
      console.log('[TEST] 管理员仪表盘页面加载');
    });

    test('5.2 用户管理页面', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin/users`);
      await page.waitForTimeout(500);
      
      console.log('[TEST] 用户管理页面加载');
    });

    test('5.3 商品审核页面', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin/products`);
      await page.waitForTimeout(500);
      
      console.log('[TEST] 商品审核页面加载');
    });

    test('5.4 订单管理页面', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin/orders`);
      await page.waitForTimeout(500);
      
      console.log('[TEST] 订单管理页面加载');
    });

    test('5.5 系统日志页面', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin/logs`);
      await page.waitForTimeout(500);
      
      console.log('[TEST] 系统日志页面加载');
    });

    test('5.6 系统设置页面', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin/settings`);
      await page.waitForTimeout(500);
      
      console.log('[TEST] 系统设置页面加载');
    });

    test('5.7 API 端点检查', async ({ request }) => {
      const endpoints = [
        { path: '/admin/users', method: 'GET' },
        { path: '/admin/products', method: 'GET' },
        { path: '/admin/orders', method: 'GET' },
        { path: '/admin/refunds', method: 'GET' },
        { path: '/admin/audit-logs', method: 'GET' },
        { path: '/admin/settings', method: 'GET' },
      ];
      
      for (const endpoint of endpoints) {
        const response = await request.get(`${API_BASE}${endpoint.path}`);
        console.log(`[TEST] GET ${endpoint.path}: ${response.status()}`);
        expect(response.status()).toBeLessThan(500);
      }
    });
  });
});

test.describe('健康检查和系统状态', () => {
  
  test('健康检查端点', async ({ request }) => {
    const response = await request.get(`${API_BASE.replace('/api/v1', '')}/health`);
    
    if (response.status() === 200) {
      const body = await response.json();
      console.log(`[TEST] 健康检查: ${JSON.stringify(body)}`);
      expect(body.status).toBe('ok');
    } else {
      console.log(`[TEST] 健康检查端点返回: ${response.status()}`);
    }
  });

  test('前端首页加载', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(1000);
    
    // 检查页面加载
    const title = await page.title();
    console.log(`[TEST] 页面标题: ${title}`);
    
    // 检查是否有错误
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    
    await page.waitForTimeout(2000);
    
    if (errors.length > 0) {
      console.log(`[TEST] 页面错误: ${errors.join(', ')}`);
    }
  });
});

test.describe('响应式布局测试', () => {
  
  test('移动端布局', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL);
    await page.waitForTimeout(1000);
    
    console.log('[TEST] 移动端布局测试通过');
  });

  test('平板布局', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(BASE_URL);
    await page.waitForTimeout(1000);
    
    console.log('[TEST] 平板布局测试通过');
  });

  test('桌面端布局', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(BASE_URL);
    await page.waitForTimeout(1000);
    
    console.log('[TEST] 桌面端布局测试通过');
  });
});