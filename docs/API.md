# TopiVra API 文档

**版本**: v1.0.0  
**基础 URL**: `http://localhost:3001/api/v1`  
**认证方式**: JWT Bearer Token

---

## 📋 目录

- [认证接口](#认证接口)
- [用户接口](#用户接口)
- [商品接口](#商品接口)
- [订单接口](#订单接口)
- [购物车接口](#购物车接口)
- [支付接口](#支付接口)
- [卖家接口](#卖家接口)
- [管理员接口](#管理员接口)

---

## 🔐 认证接口

### 用户注册
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "username",
  "password": "Password123!"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "username"
    },
    "message": "注册成功，请查收验证邮件"
  }
}
```

### 用户登录
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "username",
      "roles": ["USER"]
    }
  }
}
```

### 刷新令牌
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 获取当前用户
```http
GET /auth/me
Authorization: Bearer {accessToken}
```

---

## 👤 用户接口

### 更新个人资料
```http
PATCH /auth/profile
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "username": "newusername",
  "avatar": "https://example.com/avatar.jpg"
}
```

### 修改密码
```http
POST /auth/change-password
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "oldPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

---

## 🛍️ 商品接口

### 获取商品列表
```http
GET /products?page=1&limit=20&category=steam&sort=price&order=asc
```

**查询参数**:
- `page`: 页码 (默认: 1)
- `limit`: 每页数量 (默认: 20)
- `category`: 分类 slug
- `platform`: 平台筛选
- `minPrice`: 最低价格
- `maxPrice`: 最高价格
- `sort`: 排序字段 (price, createdAt, sales)
- `order`: 排序方向 (asc, desc)

**响应**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "title": "Steam 账号",
        "description": "描述",
        "price": 99.99,
        "originalPrice": 199.99,
        "stock": 100,
        "images": ["url1", "url2"],
        "category": {
          "id": "uuid",
          "name": "Steam",
          "slug": "steam"
        },
        "seller": {
          "id": "uuid",
          "storeName": "店铺名称",
          "rating": 4.8
        }
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

### 获取商品详情
```http
GET /products/{id}
```

### 搜索商品
```http
GET /search?q=steam&page=1&limit=20
```

---

## 🛒 购物车接口

### 获取购物车
```http
GET /cart
Authorization: Bearer {accessToken}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "product": {
          "id": "uuid",
          "title": "商品名称",
          "price": 99.99,
          "image": "url"
        },
        "quantity": 1
      }
    ],
    "total": 99.99
  }
}
```

### 添加到购物车
```http
POST /cart
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "productId": "uuid",
  "quantity": 1
}
```

### 更新购物车商品
```http
PUT /cart/{id}
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "quantity": 2
}
```

### 删除购物车商品
```http
DELETE /cart/{id}
Authorization: Bearer {accessToken}
```

---

## 📦 订单接口

### 创建订单
```http
POST /orders
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "items": [
    {
      "productId": "uuid",
      "quantity": 1
    }
  ],
  "paymentMethod": "alipay"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "uuid",
      "orderNo": "ORD20260312001",
      "totalAmount": 99.99,
      "status": "PENDING_PAYMENT",
      "items": [...]
    },
    "payment": {
      "paymentNo": "PAY20260312001",
      "paymentUrl": "https://payment.example.com/..."
    }
  }
}
```

### 获取我的订单
```http
GET /orders/my?page=1&limit=20&status=PENDING_PAYMENT
Authorization: Bearer {accessToken}
```

### 获取订单详情
```http
GET /orders/{id}
Authorization: Bearer {accessToken}
```

### 取消订单
```http
PUT /orders/{id}/cancel
Authorization: Bearer {accessToken}
```

### 确认收货
```http
PUT /orders/{id}/confirm
Authorization: Bearer {accessToken}
```

---

## 💳 支付接口

### 创建支付
```http
POST /payments/create
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "orderNo": "ORD20260312001",
  "paymentMethod": "alipay"
}
```

### 查询支付状态
```http
GET /payments/{paymentNo}/status
Authorization: Bearer {accessToken}
```

### 取消支付
```http
POST /payments/{paymentNo}/cancel
Authorization: Bearer {accessToken}
```

---

## 🏪 卖家接口

### 申请成为卖家
```http
POST /sellers/apply
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "storeName": "我的店铺",
  "description": "店铺描述",
  "contactPhone": "13800138000"
}
```

### 获取卖家信息
```http
GET /sellers/profile
Authorization: Bearer {accessToken}
```

### 上架商品
```http
POST /products
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "title": "商品标题",
  "description": "商品描述",
  "price": 99.99,
  "stock": 100,
  "categoryId": "uuid",
  "images": ["url1", "url2"]
}
```

### 获取卖家订单
```http
GET /orders/seller/list?page=1&limit=20
Authorization: Bearer {accessToken}
```

### 发货
```http
PUT /orders/item/{orderItemId}/deliver
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "deliveryInfo": "账号信息"
}
```

---

## 👨‍💼 管理员接口

### 获取仪表板统计
```http
GET /admin/dashboard/stats
Authorization: Bearer {accessToken}
```

### 获取用户列表
```http
GET /admin/users?page=1&limit=20&search=keyword
Authorization: Bearer {accessToken}
```

### 更新用户状态
```http
PATCH /admin/users/{id}/status
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "status": "ACTIVE"
}
```

### 审核商品
```http
PATCH /admin/products/{id}/audit
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "status": "APPROVED",
  "reason": "审核通过"
}
```

### 审核卖家
```http
PATCH /admin/sellers/{id}/audit
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "status": "APPROVED",
  "reason": "审核通过"
}
```

---

## 📝 通用响应格式

### 成功响应
```json
{
  "success": true,
  "data": {
    // 响应数据
  }
}
```

### 错误响应
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误信息",
    "details": {}
  }
}
```

### 分页响应
```json
{
  "success": true,
  "data": {
    "items": [],
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

---

## 🔑 认证说明

所有需要认证的接口都需要在请求头中携带 JWT Token:

```http
Authorization: Bearer {accessToken}
```

Token 有效期为 7 天，过期后需要使用 refreshToken 刷新。

---

## ⚠️ 错误代码

| 错误码 | 说明 |
|--------|------|
| 400 | 请求参数错误 |
| 401 | 未认证或令牌无效 |
| 403 | 无权限访问 |
| 404 | 资源不存在 |
| 409 | 资源冲突 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |

---

## 📚 更多文档

- **Swagger UI**: http://localhost:3001/api/docs
- **部署文档**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **开发文档**: [DEVELOPMENT.md](./DEVELOPMENT.md)

---

**最后更新**: 2026-03-12  
**API 版本**: v1.0.0










