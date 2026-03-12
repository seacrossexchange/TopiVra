import { test, expect } from '@playwright/test';

// We'll use a unique email for each test run to avoid conflicts
const uniqueId = Date.now();
const testEmail = `testuser_${uniqueId}@example.com`;
const testPassword = 'password123';
const testUsername = `testuser_${uniqueId}`;

test.describe('Authentication Flow E2E', () => {
  test('should allow a user to register and then login', async ({ page, request: apiRequest }) => {
    // 1. Navigate to the registration page (assuming /register)
    await page.goto('/register');

    // 2. Fill out the registration form
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="username"]', testUsername);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword); // Assuming a confirm password field

    // 3. Submit the form
    await page.click('button[type="submit"]');

    // 4. Expect a successful registration (e.g., redirect to login or dashboard, or a success message)
    // For this example, let's assume it redirects to /login after successful registration
    await page.waitForURL('/login');
    await expect(page.url()).toContain('/login');
    // Optionally, check for a success message if present
    // await expect(page.locator('.success-message')).toHaveText('Registration successful!');

    // 5. Navigate to the login page (or already there)
    await page.goto('/login');

    // 6. Fill out the login form
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);

    // 7. Submit the login form
    await page.click('button[type="submit"]');

    // 8. Expect a successful login (e.g., redirect to dashboard or home page)
    await page.waitForURL('/'); // Assuming root is the dashboard after login
    await expect(page.url()).toBe('http://localhost:5173/'); // Verify full URL
    // Optionally, check for user-specific content on the dashboard
    // await expect(page.locator('.user-greeting')).toHaveText(`Welcome, ${testUsername}!`);
  });

  test('should display an error for invalid login credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'nonexistent@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Expect an error message to be visible
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toHaveText('Invalid credentials'); // Adjust text as per your app
    await expect(page.url()).toContain('/login'); // Should stay on login page or show error
  });

  // Cleanup: After all tests in this describe block, delete the created user
  test.afterAll(async ({ request: apiRequest }) => {
    // Assuming a way to delete users via API or direct DB access for cleanup
    // This is a simplified example and might need actual admin API or direct DB interaction
    console.log(`Cleaning up user: ${testEmail}`);
    // In a real scenario, you'd make an authenticated API call to delete the user
    // Example (pseudo-code):
    // const adminToken = await getAdminToken(apiRequest);
    // await apiRequest.delete(`/api/admin/users/${testEmail}`, {
    //   headers: { Authorization: `Bearer ${adminToken}` }
    // });
  });
});