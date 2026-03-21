# TopiVra 项目实际执行计划

> 基于2026/3/19对话记录分析，识别未实现功能并生成执行计划

## 一、对话记录分析摘要

### 1.1 已完成的工作

#### 三角色后台结构收敛
- ✅ 买家后台统一化：`/user/tickets` 重定向到 `/buyer/tickets`
- ✅ 卖家后台经营化：新增 `/seller/sales` 销售分析入口
- ✅ 管理后台中台化：Dashboard 改为分域结构

#### 工程稳定性
- ✅ 前端 build 通过
- ✅ 前端 test 通过（216个测试）
- ✅ 路由错误边界补强

#### UI/UX 修复
- ✅ 全局主题系统打通（Ant Design + CSS变量统一）
- ✅ 首次点击空白问题修复（Home.tsx SEO冲突）
- ✅ 登录链路认证竞态修复

---

## 二、未实现功能清单（按优先级）

### P0 - 核心功能缺失

| 序号 | 功能模块 | 问题描述 | 涉及文件 | 状态 |
|------|----------|----------|----------|------|
| 1 | 博客审核系统 | 卖家可投稿、管理员审核的完整流程 | blog.service.ts, admin/Blogs.tsx | ✅ 已完成 |
| 2 | 博客阅读权限 | 会员/打赏解锁阅读权限 | BlogDetail.tsx, AccessGate组件 | ✅ 已完成 |
| 3 | 广告位逻辑 | 投放链路基础可用，需完善定向投放 | admin/Products.tsx, Home.tsx | 🟡 部分完成 |
| 4 | 卖家商品上架 | 分类/国家/软件交付表单完整 | seller/Products.tsx | ✅ 已完成 |
| 5 | 反引流系统 | 敏感词检测、OCR审图、风险分机制 | content-filter.service.ts, ocr.service.ts | 🟡 部分完成 |

### P1 - 体验专业化

| 序号 | 功能模块 | 问题描述 | 涉及文件 | 状态 |
|------|----------|----------|----------|------|
| 6 | 三角色头像入口 | 头像下拉应直接显示可进入的后台 | Header.tsx | 🔴 未完成 |
| 7 | 管理后台功能真实性 | 部分功能只有样式无业务逻辑 | admin/*.tsx | 🔴 需审计 |
| 8 | i18n技术字符清理 | 前端显示技术key/编码异常 | i18n/locales/*.json | 🟡 部分完成 |
| 9 | 会员体系联动 | 会员等级与博客权限联动缺失 | User模型, Blog模型 | 🔴 未完成 |

### P2 - 运营完善

| 序号 | 功能模块 | 问题描述 | 涉及文件 | 状态 |
|------|----------|----------|----------|------|
| 10 | 打赏系统 | 博客打赏解锁基础功能未实现 | BlogUnlock, Payment | 🔴 未完成 |
| 11 | 卖家信用分 | 信用分计算与展示不完整 | SellerCredit模型 | 🟡 部分完成 |
| 12 | 消息系统风控 | 聊天内容敏感词过滤不完整 | Message, content-filter | 🟡 部分完成 |

---

## 三、执行计划

### 阶段1：博客内容系统完善 (P0)

#### 1.1 博客审核流程
```
任务目标：实现卖家投稿 → 管理员审核 → 发布/驳回的完整流程

已具备条件：
- BlogStatus枚举：DRAFT, PENDING_REVIEW, PUBLISHED, REJECTED, ARCHIVED
- 审核字段：reviewedBy, reviewedAt, rejectReason, reviewNotes
- AuthorType枚举：SELLER, ADMIN

需要实现：
1. 卖家投稿API（status: DRAFT → PENDING_REVIEW）
2. 管理员审核API（PENDING_REVIEW → PUBLISHED/REJECTED）
3. 前端审核界面（审核通过/驳回+原因）
4. 卖家查看审核状态

涉及文件：
- server/src/modules/blog/blog.service.ts
- server/src/modules/blog/blog.controller.ts
- client/src/pages/admin/Blogs.tsx
- client/src/pages/seller/Blog.tsx
```

#### 1.2 博客阅读权限
```
任务目标：实现会员/打赏解锁阅读全文

已具备条件：
- BlogAccessType枚举：PUBLIC, LOGIN_REQUIRED, MEMBER_ONLY, PAID_UNLOCK, MEMBER_OR_PAID
- BlogUnlock模型（记录解锁）
- UnlockType枚举：PAID, MEMBER, ADMIN

需要实现：
1. 前端BlogDetail根据accessType显示预览/全文
2. 会员等级校验API
3. 打赏解锁API（创建BlogUnlock记录）
4. 解锁状态持久化

涉及文件：
- client/src/pages/blog/BlogDetail.tsx
- server/src/modules/blog/blog.service.ts
- server/src/modules/membership/membership.service.ts
```

### 阶段2：广告位系统完善 (P0)

```
任务目标：让广告位功能真实可运营

已具备条件：
- AdSlot模型（广告位）
- Advertisement模型（广告）
- AdStatus枚举：DRAFT, PENDING, APPROVED, REJECTED, RUNNING, PAUSED, ENDED

需要实现：
1. 广告位管理界面（创建/编辑广告位）
2. 广告创建流程（选择广告位→上传素材→设置链接→配置定向）
3. 广告审核流程
4. 前台广告展示逻辑
5. 点击统计

涉及文件：
- client/src/pages/admin/AdSlots.tsx（需创建）
- client/src/pages/admin/Advertisements.tsx（需创建）
- server/src/modules/ads/ads.service.ts（需创建）
```

### 阶段3：卖家商品上架专业化 (P0)

```
任务目标：实现专业的商品上架表单

已具备条件：
- ProductType枚举：ACCOUNT, SOFTWARE, DIGITAL, KEY
- DeliveryType枚举：AUTO_DELIVER, MANUAL, FILE_DOWNLOAD, LINK_DELIVERY, KEY_DELIVERY
- CountryMode枚举：NONE, SINGLE, MULTI
- 软件商品字段：fileUrl, fileName, fileSize, version, systemReq, activationKeys

需要实现：
1. 分类选择器（一级/二级分类）
2. 商品类型切换（账号/软件/数字资源/激活码）
3. 国家属性配置（根据商品类型显示/隐藏）
4. 软件商品专属字段表单
5. 文件上传（软件/资源）
6. 激活码批量导入

涉及文件：
- client/src/pages/seller/Products.tsx
- client/src/components/seller/ProductForm.tsx（需重构）
- server/src/modules/products/products.service.ts
```

### 阶段4：反引流系统完善 (P0-P1)

```
任务目标：系统性防止站外引流

已具备条件：
- SensitiveWord模型（敏感词库）
- ContentFilterLog模型（过滤日志）
- ImageAuditLog模型（图片审核）
- UserViolation模型（违规记录）
- content-filter.service.ts（内容过滤服务）
- ocr.service.ts（OCR服务）

需要实现：
1. 敏感词管理界面
2. 实时内容检测（商品/博客/消息/工单）
3. 图片OCR审核流程
4. 风险分计算与自动处罚
5. 举报处理中心

涉及文件：
- server/src/common/risk/content-filter.service.ts
- server/src/common/risk/ocr.service.ts
- client/src/pages/admin/SensitiveWords.tsx
- client/src/pages/admin/Violations.tsx
```

### 阶段5：三角色入口专业化 (P1)

```
任务目标：头像下拉直接显示可进入的后台

需要实现：
1. 检测用户角色权限
2. 头像下拉显示角色入口列表
3. 点击直接进入对应后台
4. 标识当前所在角色

涉及文件：
- client/src/components/layout/Header.tsx
- client/src/components/user/UserDropdown.tsx（需重构）
```

### 阶段6：会员体系联动 (P1)

```
任务目标：会员等级与博客权限联动

已具备条件：
- User.membershipLevel字段
- MembershipTier模型
- BlogAccessType.MEMBER_ONLY

需要实现：
1. 会员等级自动升级（消费额达标）
2. 博客权限校验（会员等级 >= 要求等级）
3. 会员权益展示

涉及文件：
- server/src/modules/membership/membership.service.ts
- client/src/pages/user/Membership.tsx
```

### 阶段7：打赏系统 (P2)

```
任务目标：博客打赏解锁功能

已具备条件：
- BlogUnlock模型
- UnlockType.PAID

需要实现：
1. 打赏金额设置
2. 支付流程
3. 解锁记录

涉及文件：
- server/src/modules/blog/blog.service.ts
- server/src/modules/payments/payments.service.ts
```

---

## 四、技术债务清理

### 4.1 i18n问题
- 清理前端技术key硬编码
- 统一五语种翻译key命名
- 修复编码异常字符

### 4.2 API响应处理
- 统一response.data.data读取方式
- 清理旧的解包逻辑

### 4.3 SEO系统
- 全站统一使用useSeo
- 移除重复的Helmet组件

---

## 五、验收标准

### 5.1 博客系统
- [ ] 卖家能投稿博客
- [ ] 管理员能审核/驳回
- [ ] 博客能设置阅读权限
- [ ] 会员能解锁会员内容
- [ ] 打赏能解锁付费内容

### 5.2 广告系统
- [ ] 管理员能创建广告位
- [ ] 广告能投放到指定位置
- [ ] 前台能展示广告
- [ ] 点击能正确跳转

### 5.3 商品上架
- [ ] 必须选择分类
- [ ] 能设置国家属性
- [ ] 软件商品能上传文件
- [ ] 激活码能批量导入

### 5.4 反引流
- [ ] 敏感词能实时检测
- [ ] 图片OCR能识别联系方式
- [ ] 违规能自动记录/处罚

---

## 六、执行顺序建议

```
Week 1: P0核心功能
├── Day 1-2: 博客审核流程
├── Day 3-4: 广告位系统
└── Day 5: 商品上架表单

Week 2: P0-P1功能完善
├── Day 1-2: 博客阅读权限
├── Day 3: 反引流系统
├── Day 4: 三角色入口
└── Day 5: 会员体系联动

Week 3: 收尾与验收
├── Day 1-2: 打赏系统
├── Day 3: i18n清理
├── Day 4: 测试回归
└── Day 5: 最终验收
```

---

## 七、风险提示

1. **Prisma版本问题**：当前使用Prisma 7.x，schema配置方式已变更，需要调整
2. **数据库迁移**：新增字段需要执行migration
3. **前后端联调**：部分功能涉及支付，需要完整联调
4. **测试覆盖**：新功能需要补充单元测试和E2E测试

---

*文档生成时间：2026/3/21*
*基于对话记录分析*