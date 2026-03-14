# 🚀 全球化平台部署说明

## 快速开始

### 一键部署（推荐）

```bash
cd server
node scripts/deploy-globalization.js
```

这个脚本会自动完成：
1. ✅ 安装依赖
2. ✅ 生成 Prisma Client
3. ✅ 运行数据库迁移
4. ✅ 验证迁移结果
5. ✅ 运行功能测试

---

## 手动部署

如果自动部署失败，请按以下步骤手动执行：

### 步骤 1: 备份数据库

```bash
# MySQL
mysqldump -u root -p topivra > backup_$(date +%Y%m%d).sql

# 或使用 Prisma
npx prisma db pull
```

### 步骤 2: 安装依赖

```bash
# 服务端
cd server
npm install

# 客户端
cd ../client
npm install i18next-http-backend date-fns-tz
```

### 步骤 3: 生成 Prisma Client

```bash
cd server
npx prisma generate
```

### 步骤 4: 运行数据库迁移

```bash
# 开发环境
npx prisma migrate dev --name add_i18n_tables

# 生产环境
npx prisma migrate deploy
```

### 步骤 5: 验证迁移

```bash
npm run i18n:verify
```

### 步骤 6: 检查翻译完整性

```bash
npm run i18n:check
```

### 步骤 7: 运行测试

```bash
npm run i18n:test
```

---

## 验证清单

### ✅ 数据库

- [ ] `product_translations` 表已创建
- [ ] `category_translations` 表已创建
- [ ] `blog_translations` 表已创建
- [ ] 索引已正确创建
- [ ] 现有数据已迁移到 zh-CN

### ✅ 服务端

- [ ] TranslationsModule 已注册
- [ ] I18nMiddleware 已应用
- [ ] 邮件模板文件存在（5种语言）
- [ ] API 端点可访问

### ✅ 客户端

- [ ] RTL 样式已引入
- [ ] 路由支持语言前缀
- [ ] i18n 配置已更新
- [ ] 新工具函数可用

---

## 测试方法

### 1. 测试 URL 国际化

```bash
# 访问不同语言的 URL
http://localhost:5173/zh-CN/products
http://localhost:5173/en/products
http://localhost:5173/id/products
http://localhost:5173/pt-BR/products
http://localhost:5173/es-MX/products
```

### 2. 测试语言切换

1. 打开首页
2. 点击语言切换器
3. 检查 URL 是否更新
4. 检查页面内容是否翻译

### 3. 测试 RTL 支持

1. 切换到阿拉伯语（如果已添加）
2. 检查布局是否从右到左
3. 检查图标是否镜像

### 4. 测试数据库多语言

```bash
# 使用 Prisma Studio
npx prisma studio

# 查看 product_translations 表
# 添加测试数据
```

### 5. 测试 API

```bash
# 测试语言检测
curl -H "Accept-Language: en" http://localhost:3000/api/health

# 测试翻译 API（需要认证）
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/translations/product/PRODUCT_ID
```

---

## 常见问题

### Q1: 迁移失败怎么办？

**A**: 手动执行 SQL 文件：

```bash
mysql -u root -p topivra < server/prisma/migrations/add_i18n_tables.sql
```

### Q2: Prisma Client 报错？

**A**: 重新生成：

```bash
cd server
rm -rf node_modules/.prisma
npx prisma generate
```

### Q3: 翻译不显示？

**A**: 检查以下几点：
1. 数据库中是否有对应语言的翻译
2. API 是否正确返回 translations
3. 前端是否正确处理翻译数据

### Q4: URL 语言前缀不工作？

**A**: 检查：
1. 路由配置是否正确
2. LanguageWrapper 是否正常工作
3. 浏览器控制台是否有错误

### Q5: RTL 样式不生效？

**A**: 确认：
1. `rtl.css` 已在 `main.tsx` 中引入
2. `dir` 属性已设置到 `<html>` 标签
3. 浏览器支持 RTL

---

## 回滚方案

如果部署出现问题，可以回滚：

### 1. 回滚数据库

```bash
# 恢复备份
mysql -u root -p topivra < backup_YYYYMMDD.sql

# 或删除新表
DROP TABLE IF EXISTS product_translations;
DROP TABLE IF EXISTS category_translations;
DROP TABLE IF EXISTS blog_translations;
```

### 2. 回滚代码

```bash
git checkout HEAD~1 -- server/prisma/schema.prisma
git checkout HEAD~1 -- client/src/router/index.tsx
git checkout HEAD~1 -- server/src/app.module.ts
```

### 3. 重新生成 Prisma Client

```bash
cd server
npx prisma generate
```

---

## 性能监控

### 关键指标

- **首屏加载时间**: 目标 < 2s
- **语言切换时间**: 目标 < 500ms
- **API 响应时间**: 目标 < 200ms
- **翻译查询时间**: 目标 < 50ms

### 监控命令

```bash
# 检查数据库查询性能
npx prisma studio

# 查看慢查询
mysql -u root -p -e "SHOW FULL PROCESSLIST;"

# 前端性能分析
# 使用 Chrome DevTools -> Performance
```

---

## 支持和文档

- 📖 [全球化实施指南](./globalization-implementation-guide.md)
- 📊 [升级总结](./globalization-upgrade-summary.md)
- ✅ [部署检查清单](./deployment-checklist.md)
- 📈 [成熟度评估](./i18n-maturity-assessment.md)

---

**部署版本**: 2.0.0
**最后更新**: 2026-03-14
**状态**: ✅ 就绪



