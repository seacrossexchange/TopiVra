# E2E 测试完整指南

**更新日期**：2026-03-12

---

## 一、E2E 测试环境要求

### 1.1 系统要求

| 项目 | 要求 |
|------|------|
| Node.js | >= 18.0 |
| npm | >= 9.0 |
| Playwright | 最新版本 |
| 浏览器 | Chromium、Firefox、WebKit |

### 1.2 依赖安装

```bash
# 进入 E2E 目录
cd e2e

# 安装依赖
npm install

# 安装浏览器驱动
npx playwright install
```

---

## 二、开发环境 E2E 测试

### 2.1 启动开发环境

```bash
# 1. 执行启动脚本
scripts/deploy/START-DEV-WINDOWS.bat

# 2. 等待服务启动（2-3 分钟）
# 观察输出，确保看到：
# [PASS] Backend setup complete
# [PASS] Frontend setup complete
# Startup Complete!

# 3. 验证服务可访问
# 前端：http://localhost:5174
# 后端：http://localhost:3001
# API 文档：http://localhost:3001/api/v1/docs
```

### 2.2 运行 E2E 测试

```bash
# 进入 E2E 目录
cd e2e

# 运行所有测试
npx playwright test

# 运行特定测试文件
npx playwright test auth.spec.ts

# 运行特定测试
npx playwright test -g "should login successfully"

# 调试模式运行
npx playwright test --debug

# 查看测试报告
npx playwright show-report
```

### 2.3 测试配置

**Playwright 配置**：`e2e/playwright.config.ts`

```typescript
// 基础 URL（开发环境）
baseURL: process.env.BASE_URL || 'http://localhost:5174'

// 浏览器
projects: [
  { name: 'chromium' },
  { name: 'firefox' },
  { name: 'webkit' }
]

// 失败时收集证据
screenshot: 'only-on-failure'
video: 'on-first-retry'
trace: 'on-first-retry'
```

### 2.4 测试账号

| 角色 | 邮箱 | 密码 | 用途 |
|------|------|------|------|
| 管理员 | admin@topivra.com | Admin123! | 管理员功能测试 |
| 卖家 | seller@topivra.com | Seller123! | 卖家功能测试 |
| 买家 | buyer@topivra.com | Buyer123! | 买家功能测试 |

### 2.5 测试文件列表

```
e2e/tests/
├── auth.spec.ts              # 认证测试
├── cart.spec.ts              # 购物车测试
├── products.spec.ts          # 商品测试
├── orders.spec.ts            # 订单测试
├── seller.spec.ts            # 卖家功能测试
├── messages.spec.ts          # 消息测试
├── notifications.spec.ts     # 通知测试
├── refund.spec.ts            # 退款测试
├── complete-user-journey.spec.ts  # 完整用户流程
└── full-regression.spec.ts   # 完整回归测试
```

---

## 三、生产环境 E2E 测试

### 3.1 部署生产环境

```bash
# 1. 生成密钥（本地 Windows）
powershell -ExecutionPolicy Bypass -File gen-keys.ps1 -Domain yourdomain.com

# 2. 上传配置
scp server/.env user@server:/opt/topivra/.env

# 3. 部署
bash scripts/deploy/deploy-production.sh

# 4. 验证部署
bash scripts/deploy/health-check.sh

# 5. 等待服务启动（1-2 分钟）
```

### 3.2 运行 E2E 测试

```bash
# 进入 E2E 目录
cd e2e

# 运行所有测试（指定生产环境 URL）
BASE_URL=https://yourdomain.com npx playwright test

# 运行特定测试
BASE_URL=https://yourdomain.com npx playwright test auth.spec.ts

# 调试模式
BASE_URL=https://yourdomain.com npx playwright test --debug

# 查看报告
npx playwright show-report
```

### 3.3 生产环境特殊配置

```bash
# 如果使用自签名证书，需要禁用 SSL 验证
BASE_URL=https://yourdomain.com \
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=0 \
npx playwright test --ignore-https-errors
```

---

## 四、测试场景

### 4.1 认证测试（auth.spec.ts）

```typescript
// 测试场景
✓ 用户注册
✓ 用户登录
✓ 用户登出
✓ Token 刷新
✓ 密码重置
✓ 2FA 认证
```

### 4.2 商品测试（products.spec.ts）

```typescript
// 测试场景
✓ 浏览商品列表
✓ 搜索商品
✓ 筛选商品
✓ 查看商品详情
✓ 收藏商品
✓ 评价商品
```

### 4.3 购物车测试（cart.spec.ts）

```typescript
// 测试场景
✓ 添加商品到购物车
✓ 修改购物车数量
✓ 删除购物车商品
✓ 清空购物车
✓ 计算购物车总价
```

### 4.4 订单测试（orders.spec.ts）

```typescript
// 测试场景
✓ 创建订单
✓ 查看订单列表
✓ 查看订单详情
✓ 取消订单
✓ 确认收货
✓ 申请退款
```

### 4.5 完整用户流程（complete-user-journey.spec.ts）

```typescript
// 测试场景
✓ 注册 → 登录 → 浏览商品 → 加入购物车 → 下单 → 支付 → 确认收货
```

---

## 五、测试报告

### 5.1 生成报告

```bash
# 运行测试后自动生成报告
npx playwright test

# 查看 HTML 报告
npx playwright show-report

# 报告位置
playwright-report/index.html
```

### 5.2 报告内容

- ✅ 通过的测试
- ❌ 失败的测试
- ⏭️ 跳过的测试
- 📸 失败时的截图
- 🎥 失败时的视频
- 📝 失败时的追踪

### 5.3 CI/CD 集成

```bash
# GitHub Actions 示例
- name: Run E2E tests
  run: |
    cd e2e
    npm install
    npx playwright install
    BASE_URL=${{ secrets.PRODUCTION_URL }} npx playwright test
    
- name: Upload report
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: e2e/playwright-report/
```

---

## 六、调试技巧

### 6.1 调试模式

```bash
# 启用调试模式
npx playwright test --debug

# 在调试器中逐步执行
# - 点击 "Step over" 执行下一行
# - 点击 "Step into" 进入函数
# - 点击 "Step out" 退出函数
# - 点击 "Continue" 继续执行
```

### 6.2 查看浏览器

```bash
# 显示浏览器窗口（不是无头模式）
npx playwright test --headed

# 只在特定浏览器上运行
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### 6.3 查看网络请求

```typescript
// 在测试中添加
page.on('request', request => console.log('>>', request.method(), request.url()));
page.on('response', response => console.log('<<', response.status(), response.url()));
```

### 6.4 截图和视频

```typescript
// 手动截图
await page.screenshot({ path: 'screenshot.png' });

// 手动录制视频
const context = await browser.newContext({ recordVideo: { dir: 'videos' } });
```

---

## 七、常见问题

### 7.1 测试超时

**问题**：`Timeout 30000ms exceeded`

**解决**：
```typescript
// 增加超时时间
test.setTimeout(60000);

// 或在配置中设置
timeout: 60000
```

### 7.2 元素未找到

**问题**：`locator.click: Target page, context or browser has been closed`

**解决**：
```typescript
// 等待元素出现
await page.waitForSelector('button');

// 或使用 locator
await page.locator('button').click();
```

### 7.3 网络错误

**问题**：`net::ERR_CONNECTION_REFUSED`

**解决**：
```bash
# 确保服务已启动
# 开发环境：http://localhost:5174
# 生产环境：https://yourdomain.com

# 检查网络连接
curl http://localhost:5174
```

### 7.4 认证失败

**问题**：`Login failed`

**解决**：
```typescript
// 检查测试账号是否存在
// 检查密码是否正确
// 检查数据库是否已初始化

// 手动验证
// 1. 访问应用
// 2. 使用测试账号登录
// 3. 确认登录成功
```

---

## 八、最佳实践

### 8.1 测试编写

- ✅ 使用有意义的测试名称
- ✅ 一个测试只测试一个功能
- ✅ 使用 Page Object Model 模式
- ✅ 避免硬编码等待时间
- ✅ 使用 locator 而不是 selector

### 8.2 测试执行

- ✅ 定期运行完整测试套件
- ✅ 在 CI/CD 中自动运行
- ✅ 保存失败时的证据（截图、视频）
- ✅ 定期更新测试用例
- ✅ 监控测试覆盖率

### 8.3 测试维护

- ✅ 使用版本控制管理测试代码
- ✅ 定期审查测试结果
- ✅ 修复失败的测试
- ✅ 添加新功能时添加新测试
- ✅ 删除过时的测试

---

## 九、快速命令参考

```bash
# 安装依赖
cd e2e && npm install && npx playwright install

# 开发环境测试
npx playwright test

# 生产环境测试
BASE_URL=https://yourdomain.com npx playwright test

# 调试模式
npx playwright test --debug

# 显示浏览器
npx playwright test --headed

# 特定浏览器
npx playwright test --project=chromium

# 特定测试文件
npx playwright test auth.spec.ts

# 特定测试
npx playwright test -g "should login"

# 查看报告
npx playwright show-report

# 清理报告
rm -rf playwright-report
```

---

**最后更新**：2026-03-12

