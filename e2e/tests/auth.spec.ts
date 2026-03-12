import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  const uniqueId = Date.now();
  const testEmail = `testuser_${uniqueId}@example.com`;
  const testPassword = 'Test@123456';
  const testUsername = `testuser_${uniqueId}`;

  test('should display login page correctly', async ({ page }) => {
    await page.goto('/login');
    
    // Check login form elements exist
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Check for register link
    await expect(page.locator('a[href*="register"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('.error-message, [role="alert"], .toast-error')).toBeVisible({ timeout: 5000 });
    
    // Should stay on login page
    await expect(page).toHaveURL(/.*login.*/);
  });

  test('should register a new user successfully', async ({ page }) => {
    await page.goto('/register');
    
    // Fill registration form
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="username"]', testUsername);
    await page.fill('input[name="password"]', testPassword);
    
    // Check if confirm password field exists
    const confirmField = page.locator('input[name="confirmPassword"]');
    if (await confirmField.isVisible()) {
      await confirmField.fill(testPassword);
    }
    
    await page.click('button[type="submit"]');
    
    // Should redirect to login or show success message
    await page.waitForURL(/.*(login|dashboard|home).*/, { timeout: 10000 });
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    
    // Should redirect to home/dashboard after successful login
    await page.waitForURL(/.*(\/|dashboard|home).*/, { timeout: 10000 });
    
    // Check if user is logged in (look for user menu or logout button)
    const userIndicator = page.locator('[data-testid="user-menu"], .user-avatar, button:has-text("退出"), button:has-text("Logout")');
    await expect(userIndicator.first()).toBeVisible({ timeout: 5000 });
  });

  test('should validate registration form', async ({ page }) => {
    await page.goto('/register');
    
    // Try submitting empty form
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    const errorMessages = page.locator('.error, .invalid-feedback, [role="alert"]');
    await expect(errorMessages.first()).toBeVisible({ timeout: 3000 });
    
    // Try invalid email
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', '123');
    await page.click('button[type="submit"]');
    
    // Should still show errors
    await expect(errorMessages.first()).toBeVisible();
  });
});

test.describe('Protected Routes', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    // Try accessing protected routes
    const protectedRoutes = [
      '/user/profile',
      '/user/orders',
      '/seller/dashboard',
      '/admin/dashboard',
    ];
    
    for (const route of protectedRoutes) {
      await page.goto(route);
      // Should redirect to login
      await expect(page).toHaveURL(/.*login.*/, { timeout: 5000 });
    }
  });
});