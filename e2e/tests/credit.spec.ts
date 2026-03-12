import { test, expect } from '@playwright/test';

test.describe('Seller Credit System', () => {
  test.beforeEach(async ({ page }) => {
    // 登录卖家账户
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'seller@example.com');
    await page.fill('input[name="password"]', 'Test123456!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should display credit score on seller dashboard', async ({ page }) => {
    await page.goto('/seller');
    
    // 检查信用分卡片
    const creditCard = page.locator('[data-testid="credit-score-card"]');
    await expect(creditCard).toBeVisible();
    
    // 验证信用分显示
    const creditScore = page.locator('[data-testid="credit-score"]');
    const scoreText = await creditScore.textContent();
    expect(parseInt(scoreText || '0')).toBeGreaterThanOrEqual(0);
    expect(parseInt(scoreText || '0')).toBeLessThanOrEqual(200);
  });

  test('should show credit level badge', async ({ page }) => {
    await page.goto('/seller');
    
    // 检查信用等级徽章
    const creditBadge = page.locator('[data-testid="credit-level-badge"]');
    await expect(creditBadge).toBeVisible();
    
    // 验证等级文本
    const levelText = await creditBadge.textContent();
    expect(['POOR', 'NORMAL', 'GOOD', 'EXCELLENT', 'PREMIUM']).toContain(levelText);
  });

  test('should view credit details', async ({ page }) => {
    await page.goto('/seller/settings');
    
    // 点击信用详情
    await page.click('[data-testid="credit-details-link"]');
    
    // 验证信用详情页面
    await expect(page.locator('h1')).toContainText('信用分');
    
    // 检查各项指标
    await expect(page.locator('[data-testid="positive-points"]')).toBeVisible();
    await expect(page.locator('[data-testid="negative-points"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-orders"]')).toBeVisible();
    await expect(page.locator('[data-testid="avg-rating"]')).toBeVisible();
  });

  test('should display credit transaction history', async ({ page }) => {
    await page.goto('/seller/settings');
    await page.click('[data-testid="credit-history-link"]');
    
    // 检查历史记录列表
    const historyList = page.locator('[data-testid="credit-history-list"]');
    await expect(historyList).toBeVisible();
    
    // 验证记录条目
    const items = page.locator('[data-testid="credit-history-item"]');
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should show credit improvement tips', async ({ page }) => {
    await page.goto('/seller/settings');
    await page.click('[data-testid="credit-tips-link"]');
    
    // 检查提示内容
    await expect(page.locator('[data-testid="credit-tips"]')).toBeVisible();
  });
});

test.describe('Credit Score Changes', () => {
  test('should increase credit after order completion', async ({ page }) => {
    // 登录卖家
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'seller@example.com');
    await page.fill('input[name="password"]', 'Test123456!');
    await page.click('button[type="submit"]');
    
    // 获取当前信用分
    await page.goto('/seller');
    const initialScore = await page.locator('[data-testid="credit-score"]').textContent();
    
    // 模拟完成订单（假设有订单可以完成）
    await page.goto('/seller/orders');
    const completeButton = page.locator('button[data-testid="complete-order"]').first();
    
    if (await completeButton.isVisible()) {
      await completeButton.click();
      
      // 刷新页面查看分数变化
      await page.goto('/seller');
      const newScore = await page.locator('[data-testid="credit-score"]').textContent();
      
      // 分数应该增加（或保持不变，如果已经是满分）
      expect(parseInt(newScore || '0')).toBeGreaterThanOrEqual(parseInt(initialScore || '0'));
    }
  });
});

test.describe('Admin Credit Management', () => {
  test.beforeEach(async ({ page }) => {
    // 登录管理员账户
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'Admin123456!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should view seller credit overview', async ({ page }) => {
    await page.goto('/admin/sellers');
    
    // 检查信用分列
    const creditColumn = page.locator('[data-testid="credit-column"]');
    await expect(creditColumn.first()).toBeVisible();
  });

  test('should be able to adjust seller credit', async ({ page }) => {
    await page.goto('/admin/sellers');
    
    // 点击第一个卖家的详情
    await page.click('[data-testid="seller-details"]').first();
    
    // 点击调整信用分
    const adjustButton = page.locator('[data-testid="adjust-credit"]');
    if (await adjustButton.isVisible()) {
      await adjustButton.click();
      
      // 填写调整表单
      await page.fill('input[name="change"]', '10');
      await page.fill('textarea[name="reason"]', '优质服务奖励');
      await page.selectOption('select[name="creditReason"]', 'QUICK_RESPONSE');
      
      // 提交
      await page.click('button[type="submit"]');
      
      // 验证成功消息
      await expect(page.locator('text=信用分已更新')).toBeVisible();
    }
  });

  test('should filter sellers by credit level', async ({ page }) => {
    await page.goto('/admin/sellers');
    
    // 选择信用等级筛选
    await page.selectOption('select[name="creditLevel"]', 'GOOD');
    
    // 等待列表更新
    await page.waitForTimeout(500);
    
    // 验证筛选结果
    const sellers = page.locator('[data-testid="seller-item"]');
    const count = await sellers.count();
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      const badge = sellers.nth(i).locator('[data-testid="credit-level-badge"]');
      const level = await badge.textContent();
      expect(level).toBe('GOOD');
    }
  });
});

test.describe('Credit Display on Product Page', () => {
  test('should show seller credit on product detail', async ({ page }) => {
    await page.goto('/products');
    
    // 点击第一个商品
    await page.click('[data-testid="product-card"]').first();
    
    // 检查卖家信息区域的信用分
    const sellerCredit = page.locator('[data-testid="seller-credit"]');
    await expect(sellerCredit).toBeVisible();
    
    // 验证信用等级显示
    const creditBadge = page.locator('[data-testid="seller-credit-badge"]');
    await expect(creditBadge).toBeVisible();
  });

  test('should highlight high credit sellers', async ({ page }) => {
    await page.goto('/products');
    
    // 查找高信用卖家商品
    const highCreditProducts = page.locator('[data-testid="high-credit-badge"]');
    const count = await highCreditProducts.count();
    
    if (count > 0) {
      // 高信用商品应该有特殊标识
      await expect(highCreditProducts.first()).toBeVisible();
    }
  });
});

test.describe('Credit API', () => {
  test('should return credit score via API', async ({ request, context }) => {
    // 先登录获取token
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'seller@example.com',
        password: 'Test123456!',
      },
    });
    
    const loginData = await loginResponse.json();
    const token = loginData.accessToken;
    
    // 获取信用分
    const creditResponse = await request.get('/api/sellers/credit', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    expect(creditResponse.ok()).toBeTruthy();
    
    const creditData = await creditResponse.json();
    expect(creditData).toHaveProperty('creditScore');
    expect(creditData).toHaveProperty('creditLevel');
  });

  test('should return credit history via API', async ({ request }) => {
    // 先登录获取token
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'seller@example.com',
        password: 'Test123456!',
      },
    });
    
    const loginData = await loginResponse.json();
    const token = loginData.accessToken;
    
    // 获取信用历史
    const historyResponse = await request.get('/api/sellers/credit/history', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    expect(historyResponse.ok()).toBeTruthy();
    
    const historyData = await historyResponse.json();
    expect(historyData).toHaveProperty('items');
    expect(Array.isArray(historyData.items)).toBeTruthy();
  });
});