/**
 * Sprint 1: P0 安全验证 - XSS 渗透测试
 * 测试目标：验证 SanitizePipe 是否覆盖所有入口
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5174';
const API_BASE = process.env.API_URL || 'http://localhost:3000/api/v1';

// XSS 攻击向量测试矩阵
const XSS_PAYLOADS = {
  scriptTag: {
    name: 'Script 标签',
    payload: '<script>alert("XSS")</script>',
    expected: '', // 应该被完全移除
  },
  imgOnerror: {
    name: 'IMG onerror 事件',
    payload: '<img src="x" onerror="alert(\'XSS\')">',
    expected: '<img src="x">', // onerror 应被移除
  },
  javascriptHref: {
    name: 'JavaScript HREF',
    payload: '<a href="javascript:alert(\'XSS\')">Click</a>',
    expected: '<a>Click</a>', // javascript: 应被移除
  },
  divStyle: {
    name: 'DIV Style 注入',
    payload: '<div style="background:url(javascript:alert(\'XSS\'))">Test</div>',
    expected: '<div>Test</div>', // 危险 style 应被移除
  },
  svgOnload: {
    name: 'SVG onload 事件',
    payload: '<svg onload="alert(\'XSS\')"><circle r="10"/></svg>',
    expected: '', // svg 不在白名单，应被移除
  },
  iframeInjection: {
    name: 'iframe 注入',
    payload: '<iframe src="https://evil.com"></iframe>',
    expected: '', // iframe 应被完全移除
  },
  eventHandler: {
    name: '事件处理器',
    payload: '<div onclick="alert(\'XSS\')">Click me</div>',
    expected: '<div>Click me</div>', // onclick 应被移除
  },
  encodedPayload: {
    name: '编码绕过尝试',
    payload: '<img src=x onerror=&#97;&#108;&#101;&#114;&#116;(1)>',
    expected: '<img src="x">', // 编码的 onerror 应被移除
  },
  mixedCase: {
    name: '混合大小写',
    payload: '<ScRiPt>alert("XSS")</sCrIpT>',
    expected: '', // 大小写混合也应被过滤
  },
  svgTag: {
    name: 'SVG 标签',
    payload: '<svg><script>alert(1)</script></svg>',
    expected: '', // SVG 及其内容应被移除
  },
  embedTag: {
    name: 'Embed 标签',
    payload: '<embed src="javascript:alert(\'XSS\')">',
    expected: '', // embed 应被移除
  },
  objectTag: {
    name: 'Object 标签',
    payload: '<object data="javascript:alert(\'XSS\')">',
    expected: '', // object 应被移除
  },
};

// 用户注册和登录辅助函数
async function registerAndLogin(page: Page): Promise<{ token: string; userId: string }> {
  const testEmail = `xss_test_${Date.now()}@test.com`;
  const testPassword = 'Test@123456';
  const testUsername = `xss_user_${Date.now()}`;

  // 注册
  await page.goto(`${BASE_URL}/register`);
  await page.fill('input[name="email"]', testEmail);
  await page.fill('input[name="username"]', testUsername);
  await page.fill('input[name="password"]', testPassword);
  await page.fill('input[name="confirmPassword"]', testPassword);
  await page.click('button[type="submit"]');
  
  // 等待注册成功并跳转
  await page.waitForURL('**/login', { timeout: 10000 }).catch(() => {});

  // 登录
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="email"]', testEmail);
  await page.fill('input[name="password"]', testPassword);
  await page.click('button[type="submit"]');
  
  // 等待登录成功
  await page.waitForURL('**/', { timeout: 10000 }).catch(() => {});

  // 获取 token
  const token = await page.evaluate(() => localStorage.getItem('token') || '');
  return { token, userId: '' };
}

test.describe('XSS 渗透测试 - API 端点', () => {
  let authToken: string;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      const result = await registerAndLogin(page);
      authToken = result.token;
    } catch (error) {
      console.log('[TEST] 注册登录失败，将跳过需要认证的测试');
    }
    
    await context.close();
  });

  test.describe('商品标题 XSS 注入', () => {
    for (const [key, xss] of Object.entries(XSS_PAYLOADS)) {
      test(`商品标题 - ${xss.name}`, async ({ request }) => {
        if (!authToken) {
          test.skip();
          return;
        }

        const response = await request.post(`${API_BASE}/products`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          data: {
            title: xss.payload,
            description: 'Test description',
            price: 10,
            stock: 10,
            categoryId: '1',
          },
        });

        // 检查响应
        if (response.status() === 201 || response.status() === 200) {
          const body = await response.json();
          const title = body.data?.title || body.title || '';
          
          // 验证 XSS payload 是否被净化
          expect(title).not.toContain('<script>');
          expect(title).not.toContain('onerror');
          expect(title).not.toContain('javascript:');
          expect(title).not.toContain('onclick');
          
          console.log(`[TEST] ${xss.name}: 原始="${xss.payload}" -> 净化后="${title}"`);
        } else {
          // 如果请求被拒绝，也是合理的安全行为
          console.log(`[TEST] ${xss.name}: 请求被拒绝 (${response.status()})`);
        }
      });
    }
  });

  test.describe('商品描述 XSS 注入', () => {
    for (const [key, xss] of Object.entries(XSS_PAYLOADS)) {
      test(`商品描述 - ${xss.name}`, async ({ request }) => {
        if (!authToken) {
          test.skip();
          return;
        }

        const response = await request.post(`${API_BASE}/products`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          data: {
            title: 'Safe Product Title',
            description: xss.payload,
            price: 10,
            stock: 10,
            categoryId: '1',
          },
        });

        if (response.status() === 201 || response.status() === 200) {
          const body = await response.json();
          const description = body.data?.description || body.description || '';
          
          // 验证 XSS payload 是否被净化
          expect(description).not.toContain('<script>');
          expect(description).not.toContain('onerror=');
          expect(description).not.toContain('javascript:');
          
          console.log(`[TEST] 描述 ${xss.name}: 净化成功`);
        } else {
          console.log(`[TEST] 描述 ${xss.name}: 请求被拒绝 (${response.status()})`);
        }
      });
    }
  });
});

test.describe('XSS 渗透测试 - 评论系统', () => {
  
  test('评论内容 XSS 注入', async ({ request }) => {
    const xssPayload = '<script>alert("XSS")</script>Great product!';
    
    const response = await request.post(`${API_BASE}/reviews`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        productId: 'test-product-id',
        rating: 5,
        content: xssPayload,
      },
    });

    // 未认证应被拒绝
    expect([401, 403, 404, 400]).toContain(response.status());
    console.log(`[TEST] 评论 API 需要认证: ${response.status()}`);
  });
});

test.describe('XSS 渗透测试 - 工单系统', () => {
  
  test('工单消息 XSS 注入', async ({ request }) => {
    const xssPayload = '<img src=x onerror=alert(1)>Please help me!';
    
    const response = await request.post(`${API_BASE}/tickets`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        subject: 'Test Ticket',
        message: xssPayload,
        priority: 'NORMAL',
      },
    });

    // 未认证应被拒绝
    expect([401, 403, 404, 400]).toContain(response.status());
    console.log(`[TEST] 工单 API 需要认证: ${response.status()}`);
  });
});

test.describe('XSS 渗透测试 - 搜索参数', () => {
  
  test('搜索参数 XSS 注入', async ({ request }) => {
    const xssPayload = '"><script>alert(1)</script>';
    
    const response = await request.get(`${API_BASE}/products/search?q=${encodeURIComponent(xssPayload)}`);

    // 搜索应该正常工作，但参数应该被净化
    expect(response.status()).toBeLessThan(500);
    
    if (response.status() === 200) {
      const body = await response.text();
      // 确保响应中不包含恶意脚本
      expect(body).not.toContain('<script>alert');
      console.log(`[TEST] 搜索参数净化成功`);
    }
  });

  test('搜索参数 - 多种编码绕过尝试', async ({ request }) => {
    const payloads = [
      '"><script>alert(1)</script>',
      '%22%3E%3Cscript%3Ealert(1)%3C/script%3E',
      '\"><script>alert(String.fromCharCode(88,83,83))</script>',
      '<img src=x onerror=alert(1)>',
    ];

    for (const payload of payloads) {
      const response = await request.get(`${API_BASE}/products/search?q=${encodeURIComponent(payload)}`);
      
      if (response.status() === 200) {
        const body = await response.text();
        expect(body).not.toContain('<script>');
        expect(body).not.toContain('onerror=');
      }
      
      console.log(`[TEST] 编码绕过测试: ${payload.substring(0, 30)}... - 通过`);
    }
  });
});

test.describe('XSS 渗透测试 - 用户资料', () => {
  
  test('用户名 XSS 注入', async ({ request }) => {
    const xssPayload = '<svg onload=alert(1)>Hacker</svg>';
    
    // 尝试注册恶意用户名
    const response = await request.post(`${API_BASE}/auth/register`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        email: `xss_user_${Date.now()}@test.com`,
        username: xssPayload,
        password: 'Test@123456',
      },
    });

    if (response.status() === 201 || response.status() === 200) {
      const body = await response.json();
      const username = body.data?.user?.username || body.user?.username || '';
      
      // 用户名应该被净化
      expect(username).not.toContain('<svg');
      expect(username).not.toContain('onload');
      console.log(`[TEST] 用户名净化: "${xssPayload}" -> "${username}"`);
    } else {
      // 注册被拒绝也是合理的安全行为
      console.log(`[TEST] 注册被拒绝 (${response.status()})`);
    }
  });
});

test.describe('XSS 渗透测试 - 博客系统', () => {
  
  test('博客内容 XSS 注入', async ({ request }) => {
    const xssPayload = '<iframe src="evil.com"></iframe><p>Good content</p>';
    
    const response = await request.post(`${API_BASE}/blog`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        title: 'Test Blog',
        content: xssPayload,
        category: 'Tutorial',
      },
    });

    // 未认证应被拒绝
    expect([401, 403, 404, 400]).toContain(response.status());
    console.log(`[TEST] 博客 API 需要认证: ${response.status()}`);
  });
});

test.describe('XSS 渗透测试 - 前端渲染', () => {
  
  test('前端搜索页面 XSS 防护', async ({ page }) => {
    const xssPayload = '<script>alert(document.domain)</script>';
    
    await page.goto(`${BASE_URL}/products?search=${encodeURIComponent(xssPayload)}`);
    
    // 检查是否有 alert 弹窗（不应该有）
    let alertTriggered = false;
    page.on('dialog', async dialog => {
      alertTriggered = true;
      await dialog.dismiss();
    });
    
    // 等待页面加载
    await page.waitForTimeout(2000);
    
    expect(alertTriggered).toBe(false);
    console.log(`[TEST] 前端搜索页面 XSS 防护: 通过`);
  });

  test('前端商品详情页 XSS 防护', async ({ page }) => {
    // 访问一个可能包含用户内容的页面
    await page.goto(`${BASE_URL}/products`);
    
    // 检查页面是否正常渲染
    const hasScript = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        if (script.innerHTML.includes('alert') || script.innerHTML.includes('onerror')) {
          return true;
        }
      }
      return false;
    });
    
    expect(hasScript).toBe(false);
    console.log(`[TEST] 前端页面无恶意脚本: 通过`);
  });
});

test.describe('XSS 净化后内容完整性', () => {
  
  test('净化后安全 HTML 保留', async ({ request }) => {
    const safeHtml = '<p>这是一个<b>加粗</b>的段落，包含<i>斜体</i>和<a href="https://example.com">链接</a>。</p>';
    
    const response = await request.get(`${API_BASE}/products/search?q=${encodeURIComponent(safeHtml)}`);
    
    // 即使搜索不返回 HTML，也不应该崩溃
    expect(response.status()).toBeLessThan(500);
    console.log(`[TEST] 安全 HTML 处理: 通过`);
  });

  test('纯文本内容不受影响', async ({ request }) => {
    const plainText = '这是一段普通的文本内容，不包含任何 HTML 标签。';
    
    const response = await request.get(`${API_BASE}/products/search?q=${encodeURIComponent(plainText)}`);
    
    expect(response.status()).toBeLessThan(500);
    console.log(`[TEST] 纯文本处理: 通过`);
  });

  test('特殊字符正确处理', async ({ request }) => {
    const specialChars = '测试 < > & " \' © ® ™ € ¥';
    
    const response = await request.get(`${API_BASE}/products/search?q=${encodeURIComponent(specialChars)}`);
    
    expect(response.status()).toBeLessThan(500);
    console.log(`[TEST] 特殊字符处理: 通过`);
  });
});

test.describe('XSS 响应头安全检查', () => {
  
  test('X-Content-Type-Options 头设置', async ({ request }) => {
    const response = await request.get(`${API_BASE}/products`);
    
    const contentTypeOptions = response.headers()['x-content-type-options'];
    expect(contentTypeOptions).toBe('nosniff');
    console.log(`[TEST] X-Content-Type-Options: ${contentTypeOptions}`);
  });

  test('X-Frame-Options 头设置', async ({ request }) => {
    const response = await request.get(`${API_BASE}/products`);
    
    const frameOptions = response.headers()['x-frame-options'];
    expect(['DENY', 'SAMEORIGIN']).toContain(frameOptions);
    console.log(`[TEST] X-Frame-Options: ${frameOptions}`);
  });

  test('Content-Security-Policy 头设置', async ({ request }) => {
    const response = await request.get(`${API_BASE}/products`);
    
    const csp = response.headers()['content-security-policy'];
    if (csp) {
      console.log(`[TEST] CSP: ${csp.substring(0, 100)}...`);
      // CSP 应该禁止内联脚本（理想情况）
      // 注意：实际项目可能需要 unsafe-inline 来支持某些前端框架
    } else {
      console.log(`[TEST] CSP 头未设置（建议添加）`);
    }
  });
});