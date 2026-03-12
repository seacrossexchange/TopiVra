import { test, expect } from '@playwright/test';

/**
 * TokBazzar 登录功能测试
 * 测试账号：
 * - 管理员: admin@topter.com / Admin123!
 * - 卖家:   seller@topter.com / Seller123!
 * - 买家:   buyer@topter.com / Buyer123!
 */

test.describe('TokBazzar 登录测试', () => {
  
  test.beforeEach(async ({ page }) => {
    // 访问登录页面 - 正确路径为 /auth/login
    await page.goto('/auth/login');
    // 等待页面加载完成
    await page.waitForLoadState('networkidle');
  });

  test('1. 验证登录页面正确显示', async ({ page }) => {
    console.log('测试：验证登录页面元素');
    
    // 检查页面标题
    await expect(page.locator('.login-title')).toContainText('TokBazzar');
    
    // 检查登录表单元素 - Ant Design Form
    const emailInput = page.locator('input[type="text"], input[id*="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"], button.ant-btn-primary').first();
    
    // 验证元素存在
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await expect(passwordInput).toBeVisible({ timeout: 10000 });
    await expect(submitButton).toBeVisible({ timeout: 10000 });
    
    console.log('✓ 登录页面元素验证通过');
  });

  test('2. 测试无效凭据登录失败', async ({ page }) => {
    console.log('测试：无效凭据登录');
    
    // 使用Ant Design的选择器
    const emailInput = page.locator('input[type="text"], input[id*="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"], button.ant-btn-primary').first();
    
    // 填写无效凭据
    await emailInput.fill('invalid@test.com');
    await passwordInput.fill('wrongpassword');
    await submitButton.click();
    
    // 等待错误提示 - Ant Design message
    const errorMessage = page.locator('.ant-message-error, .ant-alert-error, [role="alert"]');
    
    // 应该显示错误消息或停留在登录页
    await page.waitForTimeout(2000);
    
    // 验证仍在登录页面或显示错误
    const currentUrl = page.url();
    expect(currentUrl).toContain('login');
    
    console.log('✓ 无效凭据测试通过');
  });

  test('3. 测试买家账号登录', async ({ page }) => {
    console.log('测试：买家账号登录 buyer@topter.com');
    
    const emailInput = page.locator('input[type="text"], input[id*="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"], button.ant-btn-primary').first();
    
    // 填写买家账号
    await emailInput.fill('buyer@topter.com');
    await passwordInput.fill('Buyer123!');
    await submitButton.click();
    
    // 等待登录成功跳转
    await page.waitForURL(/.*(user|\/).*/, { timeout: 15000 });
    
    // 验证登录成功
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('login');
    
    console.log('✓ 买家登录成功，当前URL:', currentUrl);
  });

  test('4. 测试卖家账号登录', async ({ page }) => {
    console.log('测试：卖家账号登录 seller@topter.com');
    
    const emailInput = page.locator('input[type="text"], input[id*="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"], button.ant-btn-primary').first();
    
    // 填写卖家账号
    await emailInput.fill('seller@topter.com');
    await passwordInput.fill('Seller123!');
    await submitButton.click();
    
    // 等待登录成功跳转
    await page.waitForURL(/.*(seller).*/, { timeout: 15000 });
    
    // 验证登录成功
    const currentUrl = page.url();
    expect(currentUrl).toContain('seller');
    
    console.log('✓ 卖家登录成功，当前URL:', currentUrl);
  });

  test('5. 测试管理员账号登录', async ({ page }) => {
    console.log('测试：管理员账号登录 admin@topter.com');
    
    const emailInput = page.locator('input[type="text"], input[id*="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"], button.ant-btn-primary').first();
    
    // 填写管理员账号
    await emailInput.fill('admin@topter.com');
    await passwordInput.fill('Admin123!');
    await submitButton.click();
    
    // 等待登录成功跳转
    await page.waitForURL(/.*(admin).*/, { timeout: 15000 });
    
    // 验证登录成功
    const currentUrl = page.url();
    expect(currentUrl).toContain('admin');
    
    console.log('✓ 管理员登录成功，当前URL:', currentUrl);
  });
});

test.describe('页面功能检查', () => {
  
  test('6. 检查首页可访问性', async ({ page }) => {
    console.log('测试：首页访问');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 检查页面加载
    const bodyContent = await page.locator('body').innerHTML();
    expect(bodyContent.length).toBeGreaterThan(100);
    
    console.log('✓ 首页可访问');
  });

  test('7. 检查API代理健康状态', async ({ page }) => {
    console.log('测试：API代理健康检查');
    
    // 通过前端代理访问API
    const response = await page.request.get('/api/v1/health/live');
    expect(response.status()).toBe(200);
    
    console.log('✓ API代理服务正常');
  });

  test('8. 检查商品API数据', async ({ page }) => {
    console.log('测试：商品API数据检查');
    
    // 通过前端代理访问商品API
    const response = await page.request.get('/api/v1/products');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toBeDefined();
    
    console.log('✓ 商品API可访问');
  });

  test('9. 检查商品列表页面', async ({ page }) => {
    console.log('测试：商品列表页面');
    
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    
    // 验证页面加载
    const currentUrl = page.url();
    expect(currentUrl).toContain('products');
    
    console.log('✓ 商品列表页面可访问');
  });

  test('10. 检查注册页面', async ({ page }) => {
    console.log('测试：注册页面');
    
    await page.goto('/auth/register');
    await page.waitForLoadState('networkidle');
    
    // 检查注册表单存在
    const pageContent = await page.locator('body').innerHTML();
    expect(pageContent.length).toBeGreaterThan(100);
    
    console.log('✓ 注册页面可访问');
  });
});

test.describe('受保护路由测试', () => {
  
  test('11. 未登录访问用户中心应跳转登录', async ({ page }) => {
    console.log('测试：受保护路由 - 用户中心');
    
    await page.goto('/user/profile');
    await page.waitForTimeout(2000);
    
    // 应该重定向到登录页或显示登录提示
    const currentUrl = page.url();
    const isLoginPage = currentUrl.includes('login');
    const isAuthPage = currentUrl.includes('auth');
    
    expect(isLoginPage || isAuthPage || !currentUrl.includes('user')).toBeTruthy();
    
    console.log('✓ 受保护路由验证通过，当前URL:', currentUrl);
  });

  test('12. 未登录访问卖家中心应跳转登录', async ({ page }) => {
    console.log('测试：受保护路由 - 卖家中心');
    
    await page.goto('/seller/dashboard');
    await page.waitForTimeout(2000);
    
    // 应该重定向到登录页
    const currentUrl = page.url();
    const isLoginPage = currentUrl.includes('login');
    const isAuthPage = currentUrl.includes('auth');
    
    expect(isLoginPage || isAuthPage || !currentUrl.includes('seller')).toBeTruthy();
    
    console.log('✓ 卖家路由保护验证通过，当前URL:', currentUrl);
  });
});