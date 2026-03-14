# 🌍 TopiVra 国际化指南

## 概述

TopiVra 支持 5 种语言，提供完整的国际化解决方案，包括前端 UI、后端 API、邮件模板和数据库内容。

---

## 支持的语言

| 语言 | 代码 | 区域 | RTL |
|------|------|------|-----|
| 简体中文 | zh-CN | 中国 | ❌ |
| English | en | 全球 | ❌ |
| Bahasa Indonesia | id | 印度尼西亚 | ❌ |
| Português | pt-BR | 巴西 | ❌ |
| Español | es-MX | 墨西哥 | ❌ |

---

## 前端国际化

### 基础使用

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('common.welcome')}</h1>
      <p>{t('products.total', { count: 10 })}</p>
    </div>
  );
}
```

### 切换语言

```tsx
import { useTranslation } from 'react-i18next';

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  
  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };
  
  return (
    <select onChange={(e) => changeLanguage(e.target.value)}>
      <option value="zh-CN">简体中文</option>
      <option value="en">English</option>
      <option value="id">Bahasa Indonesia</option>
      <option value="pt-BR">Português</option>
      <option value="es-MX">Español</option>
    </select>
  );
}
```

### 国际化路由

```tsx
import { useI18nNavigate } from '@/hooks/useI18nNavigate';

function MyComponent() {
  const navigate = useI18nNavigate();
  
  // 自动添加语言前缀
  navigate('/products'); // → /zh-CN/products
}
```

### 翻译文件位置

```
client/src/i18n/locales/
├── zh-CN.json    # 简体中文
├── en.json       # 英语
├── id.json       # 印尼语
├── pt-BR.json    # 葡萄牙语
└── es-MX.json    # 西班牙语
```

---

## 后端国际化

### API 响应国际化

```typescript
// 自动根据 Accept-Language 返回翻译
@Get()
async getProducts(@I18nLang() lang: string) {
  return {
    message: await this.i18n.t('products.list.success', { lang }),
    data: products
  };
}
```

### 错误消息国际化

```typescript
throw new BadRequestException(
  await this.i18n.t('errors.product.notFound', { lang })
);
```

### 翻译文件位置

```
server/src/i18n/
├── zh-CN/
│   ├── errors.json    # 错误消息
│   └── email.json     # 邮件模板
├── en/
├── id/
├── pt-BR/
└── es-MX/
```

---

## 数据库多语言

### 翻译表结构

```sql
-- 商品翻译
CREATE TABLE product_translations (
  id INT PRIMARY KEY,
  product_id INT,
  language VARCHAR(10),
  title VARCHAR(255),
  description TEXT,
  UNIQUE(product_id, language)
);

-- 分类翻译
CREATE TABLE category_translations (
  id INT PRIMARY KEY,
  category_id INT,
  language VARCHAR(10),
  name VARCHAR(100),
  description TEXT,
  UNIQUE(category_id, language)
);
```

### 使用示例

```typescript
// 获取翻译内容
const product = await prisma.product.findUnique({
  where: { id: productId },
  include: {
    translations: {
      where: { language: lang }
    }
  }
});

// 返回翻译后的标题
const title = product.translations[0]?.title || product.title;
```

---

## 邮件国际化

### 发送多语言邮件

```typescript
import { EmailI18nService } from '@/common/services/email-i18n.service';

// 发送欢迎邮件
await emailService.sendEmail({
  to: user.email,
  template: 'welcome',
  lang: user.language,
  data: {
    username: user.username,
    ctaUrl: 'https://topivra.com/verify'
  }
});
```

### 邮件模板

```json
{
  "email": {
    "welcome": {
      "subject": "欢迎加入 TopiVra",
      "greeting": "你好，{{username}}！",
      "body": "感谢注册 TopiVra...",
      "cta": "验证邮箱",
      "footer": "如有问题，请联系客服"
    }
  }
}
```

---

## 货币和日期格式化

### 货币格式化

```typescript
import { formatCurrency } from '@/utils/currencyFormatter';

// 根据语言自动格式化
formatCurrency(1234.56, 'zh-CN'); // ¥1,234.56
formatCurrency(1234.56, 'en');    // $1,234.56
formatCurrency(1234.56, 'id');    // Rp 1.234,56
formatCurrency(1234.56, 'pt-BR'); // R$ 1.234,56
formatCurrency(1234.56, 'es-MX'); // $1,234.56 MXN
```

### 日期格式化

```typescript
import { formatDate } from '@/utils/dateFormatter';

// 根据语言自动格式化
formatDate(new Date(), 'zh-CN'); // 2026年3月14日
formatDate(new Date(), 'en');    // March 14, 2026
formatDate(new Date(), 'id');    // 14 Maret 2026
```

---

## 添加新语言

### 1. 前端翻译文件

创建 `client/src/i18n/locales/新语言.json`

```json
{
  "common": {
    "welcome": "欢迎",
    "login": "登录"
  }
}
```

### 2. 后端翻译文件

创建 `server/src/i18n/新语言/errors.json` 和 `email.json`

### 3. 更新配置

```typescript
// client/src/i18n/index.ts
const resources = {
  'zh-CN': zhCN,
  'en': en,
  '新语言代码': newLang, // 添加这里
};

// server/src/app.module.ts
I18nModule.forRoot({
  fallbackLanguage: 'zh-CN',
  loaderOptions: {
    path: path.join(__dirname, '/i18n/'),
    watch: true,
  },
  resolvers: [
    { use: QueryResolver, options: ['lang'] },
    AcceptLanguageResolver,
  ],
}),
```

### 4. 数据库迁移

```sql
-- 为现有内容添加新语言翻译
INSERT INTO product_translations (product_id, language, title, description)
SELECT id, '新语言代码', title, description FROM products;
```

---

## 最佳实践

### 1. 翻译键命名规范

```
模块.功能.具体内容

✅ 好的命名:
- products.list.title
- auth.login.button
- errors.validation.required

❌ 不好的命名:
- title
- button1
- error
```

### 2. 使用插值变量

```json
{
  "products.total": "共 {{count}} 件商品",
  "order.created": "订单创建于 {{date}}"
}
```

### 3. 复数处理

```json
{
  "products.count": "{{count}} 件商品",
  "products.count_plural": "{{count}} 件商品"
}
```

### 4. 避免硬编码文本

```tsx
// ❌ 错误
<Button>登录</Button>

// ✅ 正确
<Button>{t('auth.login.button')}</Button>
```

---

## 检查翻译完整性

```bash
# 运行检查脚本
node scripts/check-i18n-completeness.js

# 输出示例
✅ zh-CN: 100% (500/500)
✅ en: 100% (500/500)
⚠️  id: 98% (490/500) - 缺少 10 个翻译
⚠️  pt-BR: 95% (475/500) - 缺少 25 个翻译
⚠️  es-MX: 97% (485/500) - 缺少 15 个翻译
```

---

## 常见问题

### Q: 如何检测用户语言？

A: 系统按以下优先级检测：
1. URL 路径前缀 (`/zh-CN/products`)
2. localStorage 保存的语言偏好
3. 浏览器 Accept-Language 头
4. 默认语言 (zh-CN)

### Q: 如何处理缺失的翻译？

A: 系统会自动回退到默认语言（zh-CN）的翻译。

### Q: 如何添加 RTL 语言（如阿拉伯语）？

A: 
1. 在 `client/src/utils/rtl.ts` 添加语言代码
2. 确保 CSS 使用逻辑属性（`margin-inline-start` 而非 `margin-left`）
3. 测试 RTL 布局

---

## 性能优化

### 懒加载翻译文件

```typescript
// 仅加载当前语言的翻译
import(`./locales/${lang}.json`).then(module => {
  i18n.addResourceBundle(lang, 'translation', module.default);
});
```

### 缓存翻译结果

```typescript
// Redis 缓存数据库翻译
const cacheKey = `translation:${lang}:product:${productId}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);
```

---

## 相关工具

- **i18next** - 前端国际化框架
- **nestjs-i18n** - 后端国际化框架
- **dayjs** - 日期格式化
- **Intl API** - 浏览器原生国际化 API

---

**最后更新**: 2026-03-14

