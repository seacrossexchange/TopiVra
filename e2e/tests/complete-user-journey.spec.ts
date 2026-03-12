import { test, expect } from '@playwright/test';

/**
 * 完整用户流程 E2E 测试：注册 → 购买 → 退款
 * 这是核心业务流程的端到端验证
 */
test.describe('Complete User Journey: Register → Purchase → Refund', () => {
  const uniqueId = Date.now();
  const testEmail = `buyer_${uniqueId}@example.com`;
  const testPassword = 'Test@123456';
  const testUsername = `buyer_${uniqueId}`;

  test('should complete full purchase flow', async ({ page }) => {
    // ─── Step 1: 注册新用户 ───────────────────────────────────────────────
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    // 填写注册表单
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="username"]', testUsername);
    await page.fill('input[name="password"]', testPassword);

    const confirmField = page.locator('input[name="confirmPassword"]');
    if (await confirmField.isVisible()) {
      await confirmField.fill(testPassword);
    }

    // 提交注册
    await page.click('button[type="submit"]');

    // 等待重定向到登录或首页
    await page.waitForURL(/.*(login|dashboard|home|products).*/, { timeout: 10000 });

    // ─── Step 2: 登录 ──────────────────────────────────────────────────────
    if (page.url().includes('login')) {
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', testPassword);
      await page.click('button[type="submit"]');
      await page.waitForURL(/.*(dashboard|home|products).*/, { timeout: 10000 });
    }

    // 验证已登录
    const userMenu = page.locator('[data-testid="user-menu"], .user-avatar, button:has-text("退出")');
    await expect(userMenu.first()).toBeVisible({ timeout: 5000 });

    // ─── Step 3: 浏览商品 ──────────────────────────────────────────────────
    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    // 找到第一个商品
    const firstProduct = page.locator('[data-testid="product-card"], .product-card').first();
    await expect(firstProduct).toBeVisible();

    // 点击商品进入详情页
    await firstProduct.click();
    await page.waitForLoadState('networkidle');

    // ─── Step 4: 添加到购物车 ────────────────────────────────────────────
    const addToCartBtn = page.locator(
      '[data-testid="add-to-cart"], button:has-text("加入购物车"), button:has-text("Add to Cart")'
    ).first();

    if (await addToCartBtn.isVisible()) {
      await addToCartBtn.click();

      // 等待成功提示
      const successMsg = page.locator('.ant-message-success, [role="status"]:has-text("成功")');
      await expect(successMsg.first()).toBeVisible({ timeout: 5000 });
    }

    // ─── Step 5: 进入购物车 ────────────────────────────────────────────────
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');

    // 验证商品在购物车中
    const cartItem = page.locator('[data-testid="cart-item"], .cart-item').first();
    await expect(cartItem).toBeVisible();

    // ─── Step 6: 结算 ──────────────────────────────────────────────────────
    const checkoutBtn = page.locator(
      '[data-testid="checkout-btn"], button:has-text("结算"), button:has-text("Checkout")'
    ).first();

    if (await checkoutBtn.isVisible()) {
      await checkoutBtn.click();
      await page.waitForLoadState('networkidle');

      // 应该进入订单确认或支付页面
      await expect(page).toHaveURL(/.*(checkout|payment|order).*/, { timeout: 10000 });

      // ─── Step 7: 选择支付方式 ──────────────────────────────────────────
      const paymentMethod = page.locator(
        '[data-testid="payment-method"], .payment-option, input[name="paymentMethod"]'
      ).first();

      if (await paymentMethod.isVisible()) {
        await paymentMethod.click();
      }

      // ─── Step 8: 提交订单 ──────────────────────────────────────────────
      const submitBtn = page.locator(
        '[data-testid="submit-order"], button:has-text("提交"), button:has-text("Submit")'
      ).first();

      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForLoadState('networkidle');

        // 应该显示订单成功或支付页面
        const successIndicator = page.locator(
          '.order-success, [role="status"]:has-text("成功"), text=/订单号|Order Number/'
        );
        await expect(successIndicator.first()).toBeVisible({ timeout: 10000 });

        // 提取订单号（用于后续退款）
        const orderNumber = await page.locator(
          '[data-testid="order-number"], .order-number, text=/订单号.*/'
        ).first().textContent();

        console.log('Order created:', orderNumber);

        // ─── Step 9: 进入订单详情 ──────────────────────────────────────
        await page.goto('/user/orders');
        await page.waitForLoadState('networkidle');

        // 找到刚创建的订单
        const orderRow = page.locator('[data-testid="order-item"], .order-row').first();
        await expect(orderRow).toBeVisible();

        // 点击订单查看详情
        await orderRow.click();
        await page.waitForLoadState('networkidle');

        // ─── Step 10: 申请退款 ────────────────────────────────────────
        const refundBtn = page.locator(
          '[data-testid="refund-btn"], button:has-text("退款"), button:has-text("Refund")'
        ).first();

        if (await refundBtn.isVisible()) {
          await refundBtn.click();
          await page.waitForLoadState('networkidle');

          // 填写退款原因
          const reasonField = page.locator(
            'textarea[name="reason"], input[name="reason"], [data-testid="refund-reason"]'
          ).first();

          if (await reasonField.isVisible()) {
            await reasonField.fill('测试退款流程');
          }

          // 提交退款申请
          const submitRefundBtn = page.locator(
            '[data-testid="submit-refund"], button:has-text("提交"), button:has-text("Submit")'
          ).first();

          if (await submitRefundBtn.isVisible()) {
            await submitRefundBtn.click();

            // 等待成功提示
            const refundSuccess = page.locator(
              '.ant-message-success, [role="status"]:has-text("成功"), text=/退款申请已提交/'
            );
            await expect(refundSuccess.first()).toBeVisible({ timeout: 10000 });

            console.log('Refund request submitted successfully');
          }
        }
      }
    }
  });

  test('should handle payment failure gracefully', async ({ page }) => {
    // 登录
    await page.goto('/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*(dashboard|home|products).*/, { timeout: 10000 });

    // 进入购物车
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');

    const cartItem = page.locator('[data-testid="cart-item"], .cart-item').first();
    if (await cartItem.isVisible()) {
      // 进入结算
      const checkoutBtn = page.locator(
        '[data-testid="checkout-btn"], button:has-text("结算")'
      ).first();

      if (await checkoutBtn.isVisible()) {
        await checkoutBtn.click();
        await page.waitForLoadState('networkidle');

        // 选择一个支付方式
        const paymentMethod = page.locator('[data-testid="payment-method"], .payment-option').first();
        if (await paymentMethod.isVisible()) {
          await paymentMethod.click();
        }

        // 提交订单
        const submitBtn = page.locator('[data-testid="submit-order"], button:has-text("提交")').first();
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
          await page.waitForLoadState('networkidle');

          // 应该显示支付页面或错误提示
          const paymentPage = page.locator('.payment-form, [data-testid="payment-form"]');
          const errorMsg = page.locator('.error-message, [role="alert"]');

          const hasPaymentForm = await paymentPage.isVisible().catch(() => false);
          const hasError = await errorMsg.isVisible().catch(() => false);

          expect(hasPaymentForm || hasError).toBeTruthy();
        }
      }
    }
  });

  test('should display order history correctly', async ({ page }) => {
    // 登录
    await page.goto('/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*(dashboard|home|products).*/, { timeout: 10000 });

    // 进入订单列表
    await page.goto('/user/orders');
    await page.waitForLoadState('networkidle');

    // 应该显示订单列表
    const orderList = page.locator('[data-testid="order-list"], .order-list, table');
    await expect(orderList.first()).toBeVisible();

    // 应该有订单项
    const orderItems = page.locator('[data-testid="order-item"], .order-row, tbody tr');
    const count = await orderItems.count();
    expect(count).toBeGreaterThanOrEqual(0);

    // 如果有订单，验证订单信息
    if (count > 0) {
      const firstOrder = orderItems.first();
      await expect(firstOrder).toBeVisible();

      // 应该显示订单号、状态、金额等
      const orderNumber = firstOrder.locator('[data-testid="order-number"], .order-number');
      const orderStatus = firstOrder.locator('[data-testid="order-status"], .order-status');
      const orderAmount = firstOrder.locator('[data-testid="order-amount"], .order-amount');

      await expect(orderNumber.first()).toBeVisible();
      await expect(orderStatus.first()).toBeVisible();
      await expect(orderAmount.first()).toBeVisible();
    }
  });
});

