import { test, expect } from '@playwright/test';

/**
 * 完整用户旅程测试
 * 测试从注册到购买的完整流程
 */

test.describe('完整用户旅程', () => {
  const timestamp = Date.now();
  const testUser = {
    email: `test${timestamp}@example.com`,
    username: `testuser${timestamp}`,
    password: 'Test123456!',
  };

  test('用户注册 → 登录 → 浏览商品 → 加入购物车 → 创建订单', async ({ page }) => {
    // 1. 访问首页
    await page.goto('http://localhost:5174');
    await expect(page).toHaveTitle(/TopiVra/);

    // 2. 点击注册按钮
    await page.click('text=注册');
    await expect(page).toHaveURL(/.*register/);

    // 3. 填写注册表单
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="username"]', testUser.username);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);

    // 4. 提交注册
    await page.click('button[type="submit"]');

    // 5. 等待注册成功提示
    await expect(page.locator('text=注册成功')).toBeVisible({ timeout: 10000 });

    // 6. 跳转到登录页面
    await page.click('text=登录');
    await expect(page).toHaveURL(/.*login/);

    // 7. 填写登录表单
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);

    // 8. 提交登录
    await page.click('button[type="submit"]');

    // 9. 等待登录成功，跳转到首页
    await expect(page).toHaveURL('http://localhost:5174/', { timeout: 10000 });
    await expect(page.locator(`text=${testUser.username}`)).toBeVisible();

    // 10. 浏览商品列表
    await page.click('text=商品');
    await expect(page).toHaveURL(/.*products/);

    // 11. 等待商品加载
    await page.waitForSelector('.product-card', { timeout: 10000 });

    // 12. 点击第一个商品
    const firstProduct = page.locator('.product-card').first();
    await firstProduct.click();

    // 13. 等待商品详情页加载
    await expect(page).toHaveURL(/.*products\/[a-z0-9-]+/);
    await page.waitForSelector('.product-detail', { timeout: 10000 });

    // 14. 点击加入购物车
    await page.click('button:has-text("加入购物车")');

    // 15. 等待加入购物车成功提示
    await expect(page.locator('text=已加入购物车')).toBeVisible({ timeout: 5000 });

    // 16. 前往购物车
    await page.click('text=购物车');
    await expect(page).toHaveURL(/.*cart/);

    // 17. 验证购物车中有商品
    await expect(page.locator('.cart-item')).toHaveCount(1);

    // 18. 点击结算
    await page.click('button:has-text("结算")');

    // 19. 等待跳转到订单确认页
    await expect(page).toHaveURL(/.*checkout/);

    // 20. 填写收货信息（如果需要）
    const addressInput = page.locator('input[name="address"]');
    if (await addressInput.isVisible()) {
      await addressInput.fill('测试地址 123 号');
    }

    // 21. 选择支付方式
    await page.click('text=支付宝');

    // 22. 创建订单
    await page.click('button:has-text("创建订单")');

    // 23. 等待订单创建成功
    await expect(page.locator('text=订单创建成功')).toBeVisible({ timeout: 10000 });

    // 24. 验证跳转到订单详情页
    await expect(page).toHaveURL(/.*orders\/[a-z0-9-]+/);

    // 25. 验证订单状态
    await expect(page.locator('text=待支付')).toBeVisible();

    // 26. 前往我的订单
    await page.click('text=我的订单');
    await expect(page).toHaveURL(/.*orders/);

    // 27. 验证订单列表中有刚创建的订单
    await expect(page.locator('.order-item')).toHaveCount(1);

    // 28. 登出
    await page.click('text=退出登录');
    await expect(page).toHaveURL('http://localhost:5174/');
  });

  test('卖家注册 → 申请成为卖家 → 上架商品', async ({ page }) => {
    // 1. 访问首页
    await page.goto('http://localhost:5174');

    // 2. 注册新用户
    await page.click('text=注册');
    await page.fill('input[name="email"]', `seller${timestamp}@example.com`);
    await page.fill('input[name="username"]', `seller${timestamp}`);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    await page.click('button[type="submit"]');

    // 3. 登录
    await page.click('text=登录');
    await page.fill('input[name="email"]', `seller${timestamp}@example.com`);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');

    // 4. 等待登录成功
    await expect(page).toHaveURL('http://localhost:5174/', { timeout: 10000 });

    // 5. 申请成为卖家
    await page.click('text=成为卖家');
    await expect(page).toHaveURL(/.*seller\/apply/);

    // 6. 填写卖家申请表单
    await page.fill('input[name="storeName"]', `测试店铺${timestamp}`);
    await page.fill('textarea[name="description"]', '这是一个测试店铺');
    await page.fill('input[name="contactPhone"]', '13800138000');

    // 7. 提交申请
    await page.click('button[type="submit"]');

    // 8. 等待申请成功
    await expect(page.locator('text=申请已提交')).toBeVisible({ timeout: 10000 });

    // 注意：实际环境中需要管理员审核，这里假设自动通过
    // 9. 前往卖家中心
    await page.click('text=卖家中心');
    await expect(page).toHaveURL(/.*seller/);

    // 10. 点击上架商品
    await page.click('text=上架商品');
    await expect(page).toHaveURL(/.*seller\/products\/new/);

    // 11. 填写商品信息
    await page.fill('input[name="title"]', `测试商品${timestamp}`);
    await page.fill('textarea[name="description"]', '这是一个测试商品');
    await page.fill('input[name="price"]', '99.99');
    await page.fill('input[name="stock"]', '100');

    // 12. 选择分类
    await page.click('select[name="categoryId"]');
    await page.selectOption('select[name="categoryId"]', { index: 1 });

    // 13. 提交商品
    await page.click('button[type="submit"]');

    // 14. 等待商品创建成功
    await expect(page.locator('text=商品创建成功')).toBeVisible({ timeout: 10000 });

    // 15. 验证跳转到商品列表
    await expect(page).toHaveURL(/.*seller\/products/);

    // 16. 验证商品列表中有刚创建的商品
    await expect(page.locator(`text=测试商品${timestamp}`)).toBeVisible();
  });

  test('管理员登录 → 审核商品 → 管理用户', async ({ page }) => {
    // 1. 访问首页
    await page.goto('http://localhost:5174');

    // 2. 登录管理员账号
    await page.click('text=登录');
    await page.fill('input[name="email"]', 'admin@topivra.com');
    await page.fill('input[name="password"]', 'Admin123!');
    await page.click('button[type="submit"]');

    // 3. 等待登录成功
    await expect(page).toHaveURL('http://localhost:5174/', { timeout: 10000 });

    // 4. 前往管理后台
    await page.click('text=管理后台');
    await expect(page).toHaveURL(/.*admin/);

    // 5. 查看仪表板
    await expect(page.locator('text=仪表板')).toBeVisible();
    await expect(page.locator('.stat-card')).toHaveCount(4); // 假设有4个统计卡片

    // 6. 前往商品管理
    await page.click('text=商品管理');
    await expect(page).toHaveURL(/.*admin\/products/);

    // 7. 查看待审核商品
    await page.click('text=待审核');
    await page.waitForSelector('.product-list', { timeout: 10000 });

    // 8. 如果有待审核商品，审核第一个
    const pendingProducts = page.locator('.product-item');
    const count = await pendingProducts.count();
    
    if (count > 0) {
      await pendingProducts.first().click();
      await page.click('button:has-text("通过")');
      await expect(page.locator('text=审核成功')).toBeVisible({ timeout: 5000 });
    }

    // 9. 前往用户管理
    await page.click('text=用户管理');
    await expect(page).toHaveURL(/.*admin\/users/);

    // 10. 搜索用户
    await page.fill('input[placeholder*="搜索"]', testUser.email);
    await page.press('input[placeholder*="搜索"]', 'Enter');

    // 11. 等待搜索结果
    await page.waitForSelector('.user-list', { timeout: 10000 });

    // 12. 验证找到用户
    await expect(page.locator(`text=${testUser.email}`)).toBeVisible();
  });

  test('搜索功能测试', async ({ page }) => {
    // 1. 访问首页
    await page.goto('http://localhost:5174');

    // 2. 在搜索框输入关键词
    await page.fill('input[placeholder*="搜索"]', 'Steam');

    // 3. 点击搜索按钮或按回车
    await page.press('input[placeholder*="搜索"]', 'Enter');

    // 4. 等待搜索结果页面加载
    await expect(page).toHaveURL(/.*search/);
    await page.waitForSelector('.search-results', { timeout: 10000 });

    // 5. 验证搜索结果
    const results = page.locator('.product-card');
    const count = await results.count();
    expect(count).toBeGreaterThan(0);

    // 6. 验证搜索结果包含关键词
    const firstResult = results.first();
    const text = await firstResult.textContent();
    expect(text?.toLowerCase()).toContain('steam');

    // 7. 测试筛选功能
    await page.click('text=价格排序');
    await page.click('text=从低到高');

    // 8. 等待结果重新加载
    await page.waitForTimeout(1000);

    // 9. 验证价格排序
    const prices = await page.locator('.product-price').allTextContents();
    const priceNumbers = prices.map(p => parseFloat(p.replace(/[^0-9.]/g, '')));
    
    for (let i = 1; i < priceNumbers.length; i++) {
      expect(priceNumbers[i]).toBeGreaterThanOrEqual(priceNumbers[i - 1]);
    }
  });

  test('收藏功能测试', async ({ page }) => {
    // 1. 登录
    await page.goto('http://localhost:5174');
    await page.click('text=登录');
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('http://localhost:5174/', { timeout: 10000 });

    // 2. 浏览商品
    await page.click('text=商品');
    await page.waitForSelector('.product-card', { timeout: 10000 });

    // 3. 收藏第一个商品
    const firstProduct = page.locator('.product-card').first();
    await firstProduct.hover();
    await firstProduct.locator('button[aria-label="收藏"]').click();

    // 4. 等待收藏成功提示
    await expect(page.locator('text=已收藏')).toBeVisible({ timeout: 5000 });

    // 5. 前往我的收藏
    await page.click('text=我的收藏');
    await expect(page).toHaveURL(/.*favorites/);

    // 6. 验证收藏列表中有商品
    await expect(page.locator('.product-card')).toHaveCount(1);

    // 7. 取消收藏
    await page.locator('button[aria-label="取消收藏"]').first().click();

    // 8. 等待取消收藏成功
    await expect(page.locator('text=已取消收藏')).toBeVisible({ timeout: 5000 });

    // 9. 验证收藏列表为空
    await expect(page.locator('.empty-state')).toBeVisible();
  });
});










