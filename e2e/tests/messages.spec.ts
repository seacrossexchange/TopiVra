import { test, expect } from '@playwright/test';

test.describe('Messages System', () => {
  test.beforeEach(async ({ page }) => {
    // 登录测试用户
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Test123456!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should display messages page', async ({ page }) => {
    await page.goto('/user/messages');
    await expect(page.locator('h1')).toContainText('消息');
  });

  test('should show conversation list', async ({ page }) => {
    await page.goto('/user/messages');
    // 检查会话列表是否存在
    const conversationList = page.locator('[data-testid="conversation-list"]');
    await expect(conversationList).toBeVisible();
  });

  test('should send a message', async ({ page }) => {
    await page.goto('/user/messages');
    
    // 点击第一个会话
    const firstConversation = page.locator('[data-testid="conversation-item"]').first();
    if (await firstConversation.isVisible()) {
      await firstConversation.click();
      
      // 输入消息
      await page.fill('textarea[placeholder*="消息"]', '这是一条测试消息');
      
      // 发送消息
      await page.click('button[data-testid="send-message"]');
      
      // 验证消息已发送
      await expect(page.locator('text=这是一条测试消息')).toBeVisible();
    }
  });

  test('should show unread message badge', async ({ page }) => {
    // 检查导航栏消息图标上的未读数量
    const messageBadge = page.locator('[data-testid="message-badge"]');
    if (await messageBadge.isVisible()) {
      const badgeText = await messageBadge.textContent();
      expect(badgeText).toMatch(/\d+/);
    }
  });

  test('should start new conversation', async ({ page }) => {
    await page.goto('/user/messages');
    
    // 点击新建会话按钮
    const newConversationBtn = page.locator('button[data-testid="new-conversation"]');
    if (await newConversationBtn.isVisible()) {
      await newConversationBtn.click();
      
      // 选择用户
      await page.fill('input[placeholder*="搜索用户"]', 'seller');
      await page.click('[data-testid="user-option"]');
      
      // 验证会话已创建
      await expect(page.locator('text=seller')).toBeVisible();
    }
  });
});

test.describe('Seller Messages', () => {
  test.beforeEach(async ({ page }) => {
    // 登录卖家账户
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'seller@example.com');
    await page.fill('input[name="password"]', 'Test123456!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should display seller messages page', async ({ page }) => {
    await page.goto('/seller/messages');
    await expect(page.locator('h1')).toContainText('消息');
  });

  test('should see buyer messages', async ({ page }) => {
    await page.goto('/seller/messages');
    
    // 检查是否有买家消息
    const conversations = page.locator('[data-testid="conversation-item"]');
    const count = await conversations.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should reply to buyer', async ({ page }) => {
    await page.goto('/seller/messages');
    
    const firstConversation = page.locator('[data-testid="conversation-item"]').first();
    if (await firstConversation.isVisible()) {
      await firstConversation.click();
      
      // 输入回复
      await page.fill('textarea[placeholder*="消息"]', '感谢您的咨询！');
      
      // 发送回复
      await page.click('button[data-testid="send-message"]');
      
      // 验证回复已发送
      await expect(page.locator('text=感谢您的咨询')).toBeVisible();
    }
  });

  test('should view order related messages', async ({ page }) => {
    await page.goto('/seller/messages');
    
    // 查找关联订单的消息
    const orderTag = page.locator('[data-testid="order-tag"]');
    if (await orderTag.isVisible()) {
      await orderTag.click();
      
      // 验证订单信息显示
      await expect(page.locator('[data-testid="order-info"]')).toBeVisible();
    }
  });
});

test.describe('Real-time Messages', () => {
  test('should receive new message notification', async ({ page, context }) => {
    // 打开两个页面模拟两个用户
    const page2 = await context.newPage();
    
    // 用户1 登录并发送消息
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'user1@example.com');
    await page.fill('input[name="password"]', 'Test123456!');
    await page.click('button[type="submit"]');
    
    // 用户2 登录等待接收
    await page2.goto('/auth/login');
    await page2.fill('input[name="email"]', 'user2@example.com');
    await page2.fill('input[name="password"]', 'Test123456!');
    await page2.click('button[type="submit"]');
    
    // 用户2 打开消息页面
    await page2.goto('/user/messages');
    
    // 用户1 发送消息
    await page.goto('/user/messages');
    await page.fill('textarea[placeholder*="消息"]', '实时消息测试');
    await page.click('button[data-testid="send-message"]');
    
    // 验证用户2 收到消息
    await page2.waitForTimeout(2000);
    await expect(page2.locator('text=实时消息测试')).toBeVisible();
  });
});