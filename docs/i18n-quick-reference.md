# 国际化快速参考

## 🌍 支持的语言
- 🇨🇳 中文 (zh-CN)
- 🇺🇸 英文 (en)
- 🇮🇩 印尼语 (id)
- 🇧🇷 葡萄牙语 (pt-BR)
- 🇲🇽 西班牙语 (es-MX)

## 📝 前端使用

### 基础翻译
```typescript
import { useI18n } from '@/hooks/useI18n';

const { t } = useI18n();
t('common.hello')  // 获取翻译
```

### 日期格式化
```typescript
const { formatDateTime, formatRelativeTime } = useI18n();

formatDateTime(order.createdAt)        // 2026年3月14日 18:30
formatRelativeTime(message.createdAt)  // 3分钟前
```

### 货币格式化
```typescript
const { formatCurrency } = useI18n();

formatCurrency(100)  // ¥100.00 (根据当前语言)
```

### SEO 配置
```typescript
import { SEO } from '@/components/SEO';

<SEO title="页面标题" description="页面描述" />
```

## 🔧 后端使用

### Controller
```typescript
import { I18n, I18nContext } from 'nestjs-i18n';

async login(@I18n() i18n: I18nContext) {
  throw new NotFoundException(
    await i18n.t('errors.USER_NOT_FOUND')
  );
}
```

### Service
```typescript
import { I18nService } from 'nestjs-i18n';

constructor(private readonly i18n: I18nService) {}

async method(lang: string) {
  await this.i18n.t('errors.INVALID_CREDENTIALS', { lang })
}
```

## 🧪 测试命令

```bash
# 检查翻译完整性
node scripts/check-i18n-completeness.js

# 运行验收测试
node scripts/test-i18n.js
```

## 📂 文件位置

- 前端翻译: `client/src/i18n/locales/*.json`
- 后端翻译: `server/src/i18n/*/errors.json`
- 工具函数: `client/src/utils/*Formatter.ts`
- SEO 组件: `client/src/components/SEO.tsx`
- 统一 Hook: `client/src/hooks/useI18n.ts`

## ✅ 验收状态

所有测试通过 ✅ 100%



