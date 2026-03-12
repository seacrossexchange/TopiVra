import { test, expect } from '@playwright/test';

test.describe('Seller Dashboard Access', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/seller/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*login.*/, { timeout: 5000 });
  });

  test('should deny access for non-seller users', async ({ page }) => {
    // This test assumes a regular user is logged in
    // In real scenario, you'd need to authenticate as regular user first
    await page.goto('/seller/dashboard');
    
    // Should either redirect to login or show access denied
    const currentUrl = page.url();
    const accessDenied = page.locator('text=/权限不足|access denied|forbidden/i');
    
    const isLoginPage = currentUrl.includes('login');
    const isAccessDenied = await accessDenied.isVisible().catch(() => false);
    
    expect(isLoginPage || isAccessDenied).toBeTruthy();
  });
});

test.describe('Seller Products Management', () => {
  // These tests require seller authentication
  test.skip('should display seller products list', async ({ page }) => {
    // Login as seller first
    // Then navigate to products
    await page.goto('/seller/products');
    await page.waitForLoadState('networkidle');
    
    // Check for products or empty state
    const productsList = page.locator('[data-testid="seller-products"], .products-list');
    const emptyState = page.locator('[data-testid="no-products"], .empty-state');
    
    expect(await productsList.isVisible() || await emptyState.isVisible()).toBeTruthy();
  });

  test.skip('should navigate to add product page', async ({ page }) => {
    await page.goto('/seller/products');
    
    const addProductBtn = page.locator('a[href*="product-add"], button:has-text("添加商品"), button:has-text("Add Product")').first();
    
    if (await addProductBtn.isVisible()) {
      await addProductBtn.click();
      await expect(page).toHaveURL(/.*product-add|product\/new.*/);
    }
  });
});

test.describe('Seller Orders Management', () => {
  test.skip('should display seller orders', async ({ page }) => {
    await page.goto('/seller/orders');
    await page.waitForLoadState('networkidle');
    
    // Check for orders list or empty state
    const ordersList = page.locator('[data-testid="seller-orders"], .orders-list');
    const emptyState = page.locator('[data-testid="no-orders"], .empty-state');
    
    expect(await ordersList.isVisible() || await emptyState.isVisible()).toBeTruthy();
  });

  test.skip('should allow order status update', async ({ page }) => {
    await page.goto('/seller/orders');
    await page.waitForLoadState('networkidle');
    
    const firstOrder = page.locator('[data-testid="order-item"], .order-item').first();
    
    if (await firstOrder.isVisible()) {
      // Find status update button
      const statusBtn = firstOrder.locator('button:has-text("发货"), button:has-text("Ship"), .status-action').first();
      
      if (await statusBtn.isVisible()) {
        await statusBtn.click();
        
        // Wait for confirmation or status change
        await page.waitForTimeout(500);
      }
    }
  });
});

test.describe('Seller Finance', () => {
  test.skip('should display finance dashboard', async ({ page }) => {
    await page.goto('/seller/finance');
    await page.waitForLoadState('networkidle');
    
    // Check for balance and transaction elements
    const balanceDisplay = page.locator('[data-testid="balance"], .balance, .wallet-balance');
    const transactionsList = page.locator('[data-testid="transactions"], .transactions-list');
    
    // At least balance should be visible
    await expect(balanceDisplay.first()).toBeVisible();
  });

  test.skip('should display withdrawal option', async ({ page }) => {
    await page.goto('/seller/finance');
    await page.waitForLoadState('networkidle');
    
    const withdrawBtn = page.locator('button:has-text("提现"), button:has-text("Withdraw"), .withdraw-btn').first();
    
    if (await withdrawBtn.isVisible()) {
      await withdrawBtn.click();
      
      // Should show withdrawal form or modal
      const withdrawalForm = page.locator('[data-testid="withdrawal-form"], .withdrawal-modal, .withdrawal-form');
      await expect(withdrawalForm).toBeVisible({ timeout: 3000 });
    }
  });
});

test.describe('Seller Settings', () => {
  test.skip('should display seller settings', async ({ page }) => {
    await page.goto('/seller/settings');
    await page.waitForLoadState('networkidle');
    
    // Check for settings form elements
    const storeNameInput = page.locator('input[name="storeName"], [data-testid="store-name"]');
    const saveBtn = page.locator('button:has-text("保存"), button:has-text("Save")');
    
    expect(await storeNameInput.isVisible() || await saveBtn.isVisible()).toBeTruthy();
  });
});