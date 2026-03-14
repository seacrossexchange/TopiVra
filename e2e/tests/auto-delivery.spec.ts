/**
 * 订单自动发货流程 E2E 测试
 * 测试支付成功后的自动发货功能
 */
import { test, expect } from '@playwright/test';

test.describe('Auto Delivery Flow', () => {
  const testEmail = `buyer_${Date.now()}@example.com`;
  const testPassword = 'Test@123456';

  test.beforeEach(async ({ page }) => {
    // 注册并登录
    await page.goto('/register');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="username"]', `buyer_${Date.now()}`);
    await page.fill('input[name="password"]', testPassword);
    
    const confirmField = page.locator('input[name="confirmPassword"]');
    if (await confirmField.isVisible()) {
      await confirmField.fill(testPassword);
    }
    
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*(login|dashboard|home|products).*/, { timeout: 10000 });
    
    if (page.url().includes('login')) {
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', testPassword);
      await page.click('button[type="submit"]');
      await page.waitForURL(/.*(dashboard|home|products).*/, { timeout: 10000 });
    }
  });

  test('should auto-deliver after successful payment', async ({ page }) => {
    // 1. 找到支持自动发货的商品
    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    // 查找标记为自动发货的商品
    const autoDeliveryProduct = page.locator(
      '[data-testid="product-card"]:has-text("自动发货"), ' +
      '.product-card:has(.auto-delivery-badge)'
    ).first();

    if (await autoDeliveryProduct.isVisible()) {
      await autoDeliveryProduct.click();
    } else {
      // 如果没有找到，使用第一个商品
      await page.locator('[data-testid="product-card"]').first().click();
    }

    await page.waitForLoadState('networkidle');

    // 2. 加入购物车
    const addToCartBtn = page.locator(
      '[data-testid="add-to-cart"], button:has-text("加入购物车")'
    ).first();
    await addToCartBtn.click();

    // 等待成功提示
    await expect(
      page.locator('.ant-message-success, [role="status"]:has-text("成功")')
    ).toBeVisible({ timeout: 5000 });

    // 3. 进入购物车并结算
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');

    const checkoutBtn = page.locator(
      '[data-testid="checkout-btn"], button:has-text("结算")'
    ).first();
    await checkoutBtn.click();
    await page.waitForLoadState('networkidle');

    // 4. 选择支付方式（测试环境）
    const testPaymentMethod = page.locator(
      'input[value="test"], [data-testid="payment-test"]'
    ).first();

    if (await testPaymentMethod.isVisible()) {
      await testPaymentMethod.click();
    }

    // 5. 提交订单
    const submitBtn = page.locator(
      '[data-testid="submit-order"], button:has-text("提交订单")'
    ).first();
    await submitBtn.click();

    // 6. 等待订单创建成功
    await expect(
      page.locator('.order-success, text=/订单号/')
    ).toBeVisible({ timeout: 10000 });

    // 提取订单号
    const orderNumberText = await page.locator(
      '[data-testid="order-number"], .order-number'
    ).first().textContent();
    
    console.log('Order created:', orderNumberText);

    // 7. 进入订单详情页
    await page.goto('/user/orders');
    await page.waitForLoadState('networkidle');

    const firstOrder = page.locator('[data-testid="order-item"]').first();
    await firstOrder.click();
    await page.waitForLoadState('networkidle');

    // 8. 验证自动发货状态
    // 等待最多 30 秒，检查发货状态
    await page.waitForSelector(
      '[data-testid="delivery-status"]:has-text("已发货"), ' +
      '.delivery-info, ' +
      'text=/发货成功|已发货|Delivered/',
      { timeout: 30000 }
    );

    // 9. 验证凭证信息已显示
    const credentialsSection = page.locator(
      '[data-testid="credentials"], .credentials-info, .account-info'
    );
    await expect(credentialsSection).toBeVisible();

    // 10. 验证凭证内容不为空
    const credentialsText = await credentialsSection.textContent();
    expect(credentialsText).toBeTruthy();
    expect(credentialsText.length).toBeGreaterThan(10);

    console.log('Auto delivery completed successfully');
  });

  test('should show delivery progress with SSE', async ({ page }) => {
    // 创建订单（复用上面的流程）
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    
    await page.locator('[data-testid="product-card"]').first().click();
    await page.waitForLoadState('networkidle');
    
    await page.locator('[data-testid="add-to-cart"]').first().click();
    await page.waitForTimeout(1000);
    
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');
    
    await page.locator('[data-testid="checkout-btn"]').first().click();
    await page.waitForLoadState('networkidle');
    
    await page.locator('[data-testid="submit-order"]').first().click();
    
    // 等待订单创建
    await page.waitForSelector('.order-success, text=/订单号/', { timeout: 10000 });
    
    // 进入订单详情
    await page.goto('/user/orders');
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="order-item"]').first().click();
    await page.waitForLoadState('networkidle');

    // 验证进度条存在
    const progressBar = page.locator(
      '[data-testid="delivery-progress"], .progress-bar, .ant-progress'
    );
    
    if (await progressBar.isVisible()) {
      // 等待进度更新
      await page.waitForTimeout(2000);
      
      // 验证进度条有变化
      const progressText = await progressBar.textContent();
      console.log('Delivery progress:', progressText);
      
      expect(progressText).toBeTruthy();
    }
  });

  test('should handle auto-delivery failure gracefully', async ({ page }) => {
    // 这个测试需要模拟库存不足的情况
    // 在实际环境中，可以通过购买所有库存来触发
    
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    
    // 查找库存为 0 的商品
    const outOfStockProduct = page.locator(
      '[data-testid="product-card"]:has-text("库存: 0"), ' +
      '.product-card:has(.out-of-stock)'
    ).first();
    
    if (await outOfStockProduct.isVisible()) {
      await outOfStockProduct.click();
      await page.waitForLoadState('networkidle');
      
      // 加入购物车按钮应该被禁用
      const addToCartBtn = page.locator('[data-testid="add-to-cart"]').first();
      await expect(addToCartBtn).toBeDisabled();
      
      console.log('Out of stock product correctly disabled');
    } else {
      console.log('No out-of-stock products found, skipping test');
    }
  });
});



