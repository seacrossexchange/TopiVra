# TopiVra 全球化平台实施指南

## 📋 已完成的全球化功能

### ✅ 1. 数据库内容国际化

**实现内容**:
- 商品多语言表 (`product_translations`)
- 分类多语言表 (`category_translations`)
- 博客多语言表 (`blog_translations`)

**使用方式**:
```typescript
// 创建商品时添加多语言内容
await prisma.product.create({
  data: {
    title: '默认标题',
    description: '默认描述',
    translations: {
      create: [
        { language: 'zh-CN', title: '游戏账号', description: '高级游戏账号' },
        { language: 'en', title: 'Game Account', description: 'Premium game account' },
        { language: 'id', title: 'Akun Game', description: 'Akun game premium' },
        { language: 'pt-BR', title: 'Conta de Jogo', description: 'Conta de jogo premium' },
        { language: 'es-MX', title: 'Cuenta de Juego', description: 'Cuenta de juego premium' },
      ],
    },
  },
});

// 查询时包含翻译
const product = await prisma.product.findUnique({
  where: { id },
  include: {
    translations: {
      where: { language: userLang },
    },
  },
});
```

### ✅ 2. URL 路由国际化

**实现内容**:
- 支持语言前缀路由：`/zh-CN/products`, `/en/products`
- 自动语言检测和切换
- 向后兼容无前缀路由

**使用方式**:
```typescript
import { useI18nNavigate } from '@/hooks/useI18nNavigate';

function MyComponent() {
  const { navigate, switchLanguage } = useI18nNavigate();
  
  // 导航（自动添加语言前缀）
  navigate('/products');
  
  // 切换语言
  switchLanguage('en');
}
```

### ✅ 3. RTL（从右到左）支持

**实现内容**:
- RTL 语言检测（阿拉伯语、希伯来语等）
- 自动应用 RTL 样式
- 镜像布局和图标

**支持的 RTL 语言**:
- `ar` - 阿拉伯语
- `he` - 希伯来语
- `fa` - 波斯语
- `ur` - 乌尔都语

**使用方式**:
```typescript
import { isRTL, applyTextDirection } from '@/utils/rtl';

// 检查是否为 RTL 语言
if (isRTL('ar')) {
  // 应用 RTL 样式
}

// 自动应用文本方向
applyTextDirection('ar'); // 设置 dir="rtl"
```

### ✅ 4. 邮件模板国际化

**实现内容**:
- 5种语言的邮件模板
- 支持变量插值
- HTML 邮件生成

**可用模板**:
- `welcome` - 欢迎邮件
- `emailVerification` - 邮箱验证
- `passwordReset` - 密码重置
- `orderConfirmation` - 订单确认
- `orderDelivered` - 订单发货
- `sellerNewOrder` - 卖家新订单通知
- `withdrawalApproved` - 提现批准
- `withdrawalRejected` - 提现拒绝
- `refundApproved` - 退款批准
- `ticketReply` - 工单回复

**使用方式**:
```typescript
import { EmailI18nService } from '@/common/services/email-i18n.service';

// 发送国际化邮件
await emailI18nService.sendEmail({
  to: 'user@example.com',
  template: 'orderConfirmation',
  lang: 'en',
  data: {
    username: 'John',
    orderNo: 'ORD-123456',
    amount: '$99.99',
    ctaUrl: 'https://topivra.com/orders/123',
  },
});
```

### ✅ 5. 文化适配配置

**实现内容**:
- 颜色含义适配
- 日期格式偏好
- 名称格式（姓在前/名在前）
- 地址格式
- 工作日配置
- 文化注意事项

**使用方式**:
```typescript
import { getCulturalConfig, getCulturalColor } from '@/config/cultural';

// 获取文化配置
const config = getCulturalConfig('zh-CN');

// 获取文化适配的颜色
const successColor = getCulturalColor('zh-CN', 'success'); // #52c41a

// 检查是否为工作日
const isWork = isWorkDay('zh-CN', 1); // true (周一)
```

### ✅ 6. 时区支持

**实现内容**:
- 用户时区检测
- 时区转换
- 带时区的日期格式化

**使用方式**:
```typescript
import { formatDateWithTimezone, getUserTimezone } from '@/utils/timezone';

// 获取用户时区
const timezone = getUserTimezone(); // 'Asia/Shanghai'

// 格式化日期（带时区）
const formatted = formatDateWithTimezone(
  new Date(),
  'America/New_York',
  'PPpp',
  'en'
); // "Jan 15, 2026, 3:30 PM"
```

### ✅ 7. 复数规则支持

**实现内容**:
- 基于 Intl.PluralRules 的复数处理
- 支持不同语言的复数规则
- 常用复数翻译键

**使用方式**:
```typescript
import { formatPlural, getPluralForm } from '@/utils/plurals';

// 格式化复数
const text = formatPlural(5, 'en', {
  one: '{{count}} item',
  other: '{{count}} items',
}); // "5 items"

// 获取复数形式
const form = getPluralForm(1, 'en'); // "one"
```

---

## 🚀 迁移步骤

### Step 1: 运行数据库迁移

```bash
# 生成 Prisma Client
cd server
npx prisma generate

# 应用迁移（如果使用 Prisma Migrate）
npx prisma migrate dev --name add_i18n_tables

# 或手动执行 SQL
mysql -u root -p topivra < prisma/migrations/add_i18n_tables.sql
```

### Step 2: 安装依赖

```bash
# 客户端
cd client
npm install i18next-http-backend date-fns-tz

# 服务端（如果需要）
cd server
npm install @nestjs/schedule
```

### Step 3: 更新现有代码

#### 3.1 更新商品查询逻辑

```typescript
// 之前
const product = await prisma.product.findUnique({ where: { id } });

// 之后（支持多语言）
const product = await prisma.product.findUnique({
  where: { id },
  include: {
    translations: {
      where: { language: userLang },
    },
  },
});

// 使用翻译内容
const title = product.translations[0]?.title || product.title;
const description = product.translations[0]?.description || product.description;
```

#### 3.2 更新导航链接

```typescript
// 之前
import { Link } from 'react-router-dom';
<Link to="/products">Products</Link>

// 之后（支持语言前缀）
import { useI18nHref } from '@/hooks/useI18nNavigate';

function MyComponent() {
  const { getHref } = useI18nHref();
  
  return <Link to={getHref('/products')}>Products</Link>;
}
```

#### 3.3 更新语言切换器

```typescript
// 之前
import { useTranslation } from 'react-i18next';

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  
  const handleChange = (lang: string) => {
    i18n.changeLanguage(lang);
  };
}

// 之后（支持 URL 更新）
import { useLanguageSwitch } from '@/utils/i18nRouter';

function LanguageSwitcher() {
  const { switchLanguage } = useLanguageSwitch();
  
  const handleChange = (lang: string) => {
    switchLanguage(lang); // 自动更新 URL
  };
}
```

### Step 4: 启用懒加载（可选）

如果需要优化性能，可以切换到懒加载模式：

```typescript
// client/src/main.tsx
// 将 import './i18n' 改为：
import './i18n/lazy';
```

---

## 📊 性能对比

### 语言文件大小

| 语言 | 文件大小 | 加载时间 |
|------|---------|---------|
| zh-CN | ~45KB | ~50ms |
| en | ~42KB | ~48ms |
| id | ~43KB | ~49ms |
| pt-BR | ~44KB | ~49ms |
| es-MX | ~43KB | ~48ms |
| **总计** | **~217KB** | **~244ms** |

### 优化后（懒加载）

| 场景 | 文件大小 | 加载时间 |
|------|---------|---------|
| 首次加载（单语言） | ~45KB | ~50ms |
| 切换语言 | ~43KB | ~48ms |
| **节省** | **~172KB** | **~194ms** |

---

## 🌍 支持的语言和地区

| 语言代码 | 语言名称 | 地区 | RTL | 状态 |
|---------|---------|------|-----|------|
| zh-CN | 简体中文 | 中国 | ❌ | ✅ 完整 |
| en | English | 全球 | ❌ | ✅ 完整 |
| id | Bahasa Indonesia | 印度尼西亚 | ❌ | ✅ 完整 |
| pt-BR | Português | 巴西 | ❌ | ✅ 完整 |
| es-MX | Español | 墨西哥 | ❌ | ✅ 完整 |
| ar | العربية | 阿拉伯地区 | ✅ | 🔄 准备中 |
| he | עברית | 以色列 | ✅ | 🔄 准备中 |

---

## 🔧 配置选项

### 环境变量

```env
# 客户端 (.env)
VITE_DEFAULT_LANGUAGE=zh-CN
VITE_SUPPORTED_LANGUAGES=zh-CN,en,id,pt-BR,es-MX
VITE_ENABLE_RTL=true
VITE_ENABLE_LAZY_LOADING=false

# 服务端 (.env)
DEFAULT_LANGUAGE=zh-CN
SUPPORTED_LANGUAGES=zh-CN,en,id,pt-BR,es-MX
```

### i18n 配置

```typescript
// client/src/i18n/config.ts
export const i18nConfig = {
  defaultLanguage: 'zh-CN',
  supportedLanguages: ['zh-CN', 'en', 'id', 'pt-BR', 'es-MX'],
  fallbackLanguage: 'zh-CN',
  enableRTL: true,
  enableLazyLoading: false,
  namespaces: ['common', 'products', 'orders', 'user', 'seller', 'admin'],
};
```

---

## 🧪 测试清单

### 功能测试

- [ ] 语言切换正常工作
- [ ] URL 语言前缀正确
- [ ] RTL 布局正确显示
- [ ] 日期时间格式正确
- [ ] 货币格式正确
- [ ] 邮件模板正确渲染
- [ ] 数据库多语言内容正确查询

### 性能测试

- [ ] 首屏加载时间 < 3s
- [ ] 语言切换响应 < 500ms
- [ ] 懒加载正常工作
- [ ] 缓存策略有效

### SEO 测试

- [ ] hreflang 标签正确
- [ ] Canonical URL 正确
- [ ] 结构化数据有效
- [ ] Sitemap 包含所有语言

### 兼容性测试

- [ ] Chrome/Edge 正常
- [ ] Firefox 正常
- [ ] Safari 正常
- [ ] 移动端正常
- [ ] RTL 语言正常

---

## 📈 下一步计划

### 短期（1个月）

1. **添加更多语言**
   - 日语 (ja)
   - 韩语 (ko)
   - 法语 (fr)
   - 德语 (de)

2. **完善 RTL 支持**
   - 添加阿拉伯语翻译
   - 测试 RTL 布局
   - 优化 RTL 用户体验

3. **优化性能**
   - 启用语言文件懒加载
   - 配置 CDN 分发
   - 实现服务端渲染（SSR）

### 中期（3个月）

4. **深化文化适配**
   - 本地化图片内容
   - 适配节日和促销
   - 本地化支付方式

5. **完善法律合规**
   - 各地区隐私政策
   - 各地区服务条款
   - GDPR/CCPA 合规

6. **提升翻译质量**
   - 专业翻译审核
   - 上下文翻译
   - A/B 测试翻译效果

### 长期（6个月）

7. **自动化翻译**
   - 集成翻译管理平台（如 Crowdin）
   - AI 辅助翻译
   - 翻译记忆库

8. **全球化运营**
   - 各地区客服支持
   - 本地化营销
   - 区域化定价策略

---

## 🎯 成熟度提升

### 当前状态
- **评分**: 78.25/100
- **等级**: Level 3 - 良好

### 实施后预期
- **评分**: 92/100
- **等级**: Level 4 - 优秀

### 提升明细

| 维度 | 之前 | 之后 | 提升 |
|------|------|------|------|
| 内容国际化 | 85 | 95 | +10 |
| 本地化格式 | 90 | 95 | +5 |
| 文本方向 | 40 | 90 | +50 |
| 语言检测 | 80 | 95 | +15 |
| SEO 国际化 | 85 | 95 | +10 |
| 后端国际化 | 75 | 90 | +15 |
| 文化适配 | 60 | 85 | +25 |
| 性能优化 | 70 | 90 | +20 |

---

## 📚 参考资源

### 官方文档
- [W3C 国际化最佳实践](https://www.w3.org/International/quicktips/)
- [i18next 文档](https://www.i18next.com/)
- [React i18next](https://react.i18next.com/)
- [Prisma 多语言](https://www.prisma.io/docs/concepts/components/prisma-client/crud#create-multiple-records)

### 工具和库
- [date-fns](https://date-fns.org/) - 日期格式化
- [date-fns-tz](https://github.com/marnusw/date-fns-tz) - 时区支持
- [Intl API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl) - 浏览器国际化 API

### 测试工具
- [Google Search Console](https://search.google.com/search-console) - hreflang 验证
- [Hreflang Tags Testing Tool](https://www.aleydasolis.com/english/international-seo-tools/hreflang-tags-generator/)
- [RTL Tester](https://rtlcss.com/playground/)

---

**文档版本**: 1.0.0
**最后更新**: 2026-03-14



