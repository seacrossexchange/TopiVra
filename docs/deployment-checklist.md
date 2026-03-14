# 全球化平台部署检查清单

## 📋 部署前检查

### 1. 数据库迁移 ✅

```bash
# 1. 备份数据库
mysqldump -u root -p topivra > backup_$(date +%Y%m%d).sql

# 2. 生成 Prisma Client
cd server
npx prisma generate

# 3. 运行迁移
npx prisma migrate dev --name add_i18n_tables

# 或手动执行
mysql -u root -p topivra < prisma/migrations/add_i18n_tables.sql

# 4. 验证表结构
mysql -u root -p topivra -e "SHOW TABLES LIKE '%translations%';"
```

**预期输出**:
- product_translations
- category_translations
- blog_translations

---

### 2. 依赖安装 ✅

```bash
# 客户端
cd client
npm install i18next-http-backend date-fns-tz

# 服务端（已有依赖，无需额外安装）
cd server
npm install
```

---

### 3. 环境变量配置 ✅

#### 客户端 `.env`

```env
# 国际化配置
VITE_DEFAULT_LANGUAGE=zh-CN
VITE_SUPPORTED_LANGUAGES=zh-CN,en,id,pt-BR,es-MX
VITE_ENABLE_RTL=true
VITE_ENABLE_LAZY_LOADING=false

# 网站基础 URL（用于 SEO）
VITE_BASE_URL=https://topivra.com
```

#### 服务端 `.env`

```env
# 国际化配置
DEFAULT_LANGUAGE=zh-CN
SUPPORTED_LANGUAGES=zh-CN,en,id,pt-BR,es-MX

# 邮件服务（如果使用）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password
```

---

### 4. 代码更新 ✅

#### 4.1 更新 App.tsx（引入 RTL 样式）

已完成 ✅ - `client/src/main.tsx` 已引入 `./styles/rtl.css`

#### 4.2 更新路由配置

已完成 ✅ - `client/src/router/index.tsx` 已支持语言前缀

#### 4.3 更新 i18n 配置

已完成 ✅ - `client/src/i18n/index.ts` 已支持 RTL

---

### 5. 服务端集成 ⚠️

需要在主模块中注册：

```typescript
// server/src/app.module.ts
import { Module, MiddlewareConsumer } from '@nestjs/common';
import { I18nMiddleware } from './common/middleware/i18n.middleware';
import { TranslationsModule } from './modules/translations/translations.module';

@Module({
  imports: [
    // ... 其他模块
    TranslationsModule,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(I18nMiddleware)
      .forRoutes('*');
  }
}
```

---

## 🧪 测试清单

### 功能测试

```bash
# 1. 测试语言切换
# 访问: http://localhost:5173/
# 切换语言，检查 URL 是否变为 /zh-CN/, /en/ 等

# 2. 测试 RTL 布局
# 如果添加了阿拉伯语，切换后检查布局是否镜像

# 3. 测试数据库多语言
# 创建商品，添加多语言翻译，查询验证

# 4. 测试邮件模板
# 触发邮件发送，检查是否使用正确语言
```

### API 测试

```bash
# 获取商品翻译
curl http://localhost:3000/api/translations/product/{productId}

# 更新翻译
curl -X PUT http://localhost:3000/api/translations/product/{productId}/en \
  -H "Content-Type: application/json" \
  -d '{"title":"Game Account","description":"Premium account"}'

# 检查完整性
curl http://localhost:3000/api/translations/product/{productId}/completeness
```

---

## 🚀 部署步骤

### 开发环境

```bash
# 1. 安装依赖
cd client && npm install
cd ../server && npm install

# 2. 运行迁移
cd server
npx prisma migrate dev

# 3. 启动服务
npm run dev

# 4. 启动客户端
cd ../client
npm run dev
```

### 生产环境

```bash
# 1. 构建客户端
cd client
npm run build

# 2. 构建服务端
cd ../server
npm run build

# 3. 运行迁移（生产）
npx prisma migrate deploy

# 4. 启动服务
npm run start:prod
```

---

## ⚠️ 注意事项

### 1. 数据迁移

- ✅ 现有数据会自动迁移到 `zh-CN` 语言
- ⚠️ 其他语言需要手动添加翻译
- 💡 建议使用翻译管理界面批量添加

### 2. URL 变化

- ✅ 旧 URL 仍然可用（向后兼容）
- ✅ 新 URL 格式：`/zh-CN/products`
- 💡 建议配置 301 重定向到新格式

### 3. SEO 影响

- ✅ hreflang 标签会自动更新
- ✅ Sitemap 需要重新生成
- 💡 建议在 Google Search Console 中提交新 sitemap

### 4. 性能

- ✅ 懒加载默认关闭（稳定性优先）
- 💡 如需启用，修改 `client/src/main.tsx`：
  ```typescript
  // 将 import './i18n' 改为：
  import './i18n/lazy';
  ```

---

## 📊 验证标准

### 功能验证

- [ ] 语言切换正常，URL 更新正确
- [ ] 商品、分类、博客支持多语言
- [ ] 邮件使用正确语言发送
- [ ] RTL 布局正确显示
- [ ] 日期、货币格式正确

### 性能验证

- [ ] 首屏加载 < 3s
- [ ] 语言切换 < 500ms
- [ ] Lighthouse 性能分数 > 90

### SEO 验证

- [ ] hreflang 标签正确
- [ ] Canonical URL 正确
- [ ] 结构化数据有效
- [ ] Google Search Console 无错误

---

## 🎯 成功标准

### 最低标准（必须）
- ✅ 数据库迁移成功
- ✅ 5种语言完整翻译
- ✅ URL 国际化正常工作
- ✅ 无功能性 bug

### 优秀标准（推荐）
- ✅ RTL 支持测试通过
- ✅ 邮件模板正确渲染
- ✅ 翻译完整性 > 95%
- ✅ 性能提升 > 20%

### 卓越标准（可选）
- ⭕ 启用语言懒加载
- ⭕ 配置 CDN 分发
- ⭕ 实现 SSR

---

## 📞 支持

如有问题，请查看：
1. [全球化实施指南](./globalization-implementation-guide.md)
2. [升级总结](./globalization-upgrade-summary.md)
3. [国际化使用指南](./i18n-usage-guide.md)

---

**检查清单版本**: 1.0.0
**最后更新**: 2026-03-14



