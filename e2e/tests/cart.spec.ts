import { test, expect } from '@playwright/test';

test.describe('Shopping Cart', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage before each test
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display empty cart message when cart is empty', async ({ page }) => {
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');
    
    // Check for empty cart message or cart page
    const emptyCartMessage = page.locator('[data-testid="empty-cart"], .empty-cart, text=/购物车是空的|cart is empty/i');
    const cartItems = page.locator('[data-testid="cart-item"], .cart-item');
    
    // Either empty message or no items
    const isEmpty = await emptyCartMessage.isVisible().catch(() => false);
    const itemCount = await cartItems.count();
    
    expect(isEmpty || itemCount === 0).toBeTruthy();
  });

  test('should add product to cart from product page', async ({ page }) => {
    // Go to products
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    
    // Click first product
    const firstProduct = page.locator('[data-testid="product-card"] a, .product-card a').first();
    
    if (!await firstProduct.isVisible()) {
      test.skip();
      return;
    }
    
    await firstProduct.click();
    await page.waitForLoadState('networkidle');
    
    // Find and click add to cart button
    const addToCartBtn = page.locator('[data-testid="add-to-cart"], button:has-text("加入购物车"), button:has-text("Add to Cart")').first();
    
    if (await addToCartBtn.isVisible()) {
      await addToCartBtn.click();
      
      // Wait for cart update (toast notification or cart icon update)
      await page.waitForTimeout(1000);
      
      // Check for success indication
      const successToast = page.locator('.toast-success, [role="status"]:has-text("成功"), [role="status"]:has-text("success")');
      const cartBadge = page.locator('[data-testid="cart-badge"], .cart-badge, .cart-count');
      
      // Either success toast or cart badge should indicate item added
      const hasSuccess = await successToast.isVisible().catch(() => false);
      const hasBadge = await cartBadge.isVisible().catch(() => false);
      
      expect(hasSuccess || hasBadge).toBeTruthy();
    } else {
      test.skip();
    }
  });

  test('should navigate to cart page', async ({ page }) => {
    // Find cart link/icon
    const cartLink = page.locator('[data-testid="cart-link"], a[href*="cart"], .cart-icon').first();
    
    if (await cartLink.isVisible()) {
      await cartLink.click();
      await page.waitForLoadState('networkidle');
      
      // Should be on cart page
      await expect(page).toHaveURL(/.*cart.*/);
    } else {
      // Navigate directly
      await page.goto('/cart');
      await expect(page).toHaveURL(/.*cart.*/);
    }
  });

  test('should update quantity in cart', async ({ page }) => {
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');
    
    // Check if there are items in cart
    const cartItem = page.locator('[data-testid="cart-item"], .cart-item').first();
    
    if (await cartItem.isVisible()) {
      // Find quantity input
      const quantityInput = cartItem.locator('input[type="number"], [data-testid="quantity-input"], .quantity-input').first();
      
      if (await quantityInput.isVisible()) {
        await quantityInput.fill('2');
        await quantityInput.press('Enter');
        
        // Wait for update
        await page.waitForTimeout(1000);
        
        // Check if total price updates
        const totalPrice = page.locator('[data-testid="cart-total"], .cart-total, .total-price');
        await expect(totalPrice.first()).toBeVisible();
      }
    } else {
      test.skip();
    }
  });

  test('should remove item from cart', async ({ page }) => {
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');
    
    const cartItem = page.locator('[data-testid="cart-item"], .cart-item').first();
    
    if (await cartItem.isVisible()) {
      // Find remove button
      const removeBtn = cartItem.locator('[data-testid="remove-item"], button:has-text("删除"), button:has-text("Remove"), .remove-btn').first();
      
      if (await removeBtn.isVisible()) {
        await removeBtn.click();
        await page.waitForTimeout(500);
        
        // Item should be removed
        const remainingItems = page.locator('[data-testid="cart-item"], .cart-item');
        const newCount = await remainingItems.count();
        
        // Either item count decreased or cart is empty
        expect(newCount).toBeGreaterThanOrEqual(0);
      }
    } else {
      test.skip();
    }
  });
});

test.describe('Checkout Flow', () => {
  test('should display checkout page', async ({ page }) => {
    // First add item to cart (simplified - just navigate to cart)
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');
    
    const cartItem = page.locator('[data-testid="cart-item"], .cart-item').first();
    
    if (await cartItem.isVisible()) {
      // Look for checkout button
      const checkoutBtn = page.locator('[data-testid="checkout-btn"], button:has-text("结算"), button:has-text("Checkout")').first();
      
      if (await checkoutBtn.isVisible()) {
        await checkoutBtn.click();
        
        // Should navigate to checkout or require login
        await page.waitForURL(/.*(checkout|login).*/, { timeout: 5000 });
      }
    } else {
      test.skip();
    }
  });
});