# 🔧 退款逻辑修复

## 🚨 发现的问题

### **原代码问题（第 717 行）**

```typescript
// ❌ 只创建了支付记录，没有实际给买家加余额
await tx.payment.create({
  data: {
    paymentNo: `REF-${Date.now()}-...`,
    orderId: refund.orderId,
    userId: refund.userId,
    method: 'REFUND',
    amount: Number(refund.refundAmount),
    status: 'SUCCESS',
  },
});
```

**问题分析：**
1. ❌ 只创建了 Payment 记录
2. ❌ 没有更新买家的 `user.balance`
3. ❌ 前端提示"退款至账户余额"，但后端没实现
4. ❌ 买家看不到余额增加

---

## ✅ 修复方案

### **C2C 平台退款流程**

```
买家申请退款
    ↓
卖家同意/拒绝
    ↓
管理员审核（如有争议）
    ↓
退款通过
    ↓
1. 更新订单状态为 REFUNDED
2. 恢复商品库存
3. 扣减卖家余额（如已结算）
4. ✅ 增加买家余额 ← 之前缺失
5. 创建退款支付记录
6. 通知买卖双方
```

### **修复后的代码**

```typescript
// ✅ 退款到买家账户余额
const buyer = await tx.user.findUnique({
  where: { id: refund.userId },
});

if (!buyer) {
  throw new NotFoundException('买家不存在');
}

const newBalance = Number(buyer.balance || 0) + Number(refund.refundAmount);

await tx.user.update({
  where: { id: refund.userId },
  data: {
    balance: newBalance,
  },
});

// 创建退款支付记录
await tx.payment.create({
  data: {
    paymentNo: `REF-${Date.now()}-...`,
    orderId: refund.orderId,
    userId: refund.userId,
    method: 'REFUND',
    amount: Number(refund.refundAmount),
    currency: refund.order.currency || 'USD',
    status: 'SUCCESS',
    paidAt: new Date(),
  },
});

// 可选：记录买家余额变动流水
// await tx.userTransaction.create({
//   data: {
//     userId: refund.userId,
//     type: 'REFUND',
//     amount: Number(refund.refundAmount),
//     balanceAfter: newBalance,
//     orderId: refund.orderId,
//     description: `订单退款 - ${refund.order.orderNo}`,
//   },
// });
```

### **优化通知消息**

```typescript
// ✅ 明确告知退款金额和去向
await this.notificationService.notifyUser(refund.userId, {
  type: 'REFUND_RESULT' as any,
  title: '退款处理完成',
  content: isApproved 
    ? `您的退款申请已通过，$${Number(refund.refundAmount).toFixed(2)} 已退回至账户余额` 
    : '您的退款申请已被拒绝',
  orderId: refund.orderId,
});
```

---

## 📊 完整退款流程

### **1. 买家申请退款**

```typescript
async createRefundRequest(buyerId: string, dto: CreateRefundRequestDto) {
  // 验证订单状态（PAID 或 DELIVERED）
  // 检查是否已有进行中的退款
  // 创建退款申请（状态：PENDING）
  // 通知卖家
}
```

### **2. 卖家响应**

```typescript
async sellerRespondRefund(refundId: string, sellerId: string, dto: SellerRespondRefundDto) {
  if (dto.agreed) {
    // 状态：SELLER_AGREED → 等待管理员处理
  } else {
    // 状态：SELLER_REJECTED → 买家可申请平台介入
  }
}
```

### **3. 买家申请平台介入（可选）**

```typescript
async escalateRefund(refundId: string, buyerId: string, reason: string) {
  // 只有卖家拒绝后才能申请
  // 状态：DISPUTED → 等待管理员仲裁
}
```

### **4. 管理员处理退款**

```typescript
async processRefund(refundId: string, adminId: string, dto: AdminProcessRefundDto) {
  if (dto.action === 'APPROVE') {
    // 1. 更新订单状态为 REFUNDED
    // 2. 恢复库存
    // 3. 扣减卖家余额（如已结算）
    // 4. ✅ 增加买家余额
    // 5. 创建退款支付记录
    // 6. 通知买卖双方
  } else {
    // 拒绝退款
  }
}
```

---

## 🎯 C2C 平台退款特点

### **与 B2C 的区别**

| 维度 | B2C 发卡网 | C2C 交易平台（TopiVra） |
|------|-----------|----------------------|
| **退款决策** | 平台决定 | 需卖家同意 + 平台仲裁 |
| **退款来源** | 平台账户 | 平台垫付（后续向卖家追回） |
| **退款去向** | 原支付方式 | 账户余额（方便再次购买） |
| **卖家影响** | 无 | 扣减卖家余额 |
| **处理时间** | 即时 | 24-48 小时（需协调） |

### **退款资金流**

```
买家支付 $100
    ↓
平台收款 $100
    ↓
卖家结算 $90（扣 10% 佣金）
    ↓
买家申请退款
    ↓
卖家同意
    ↓
管理员审核通过
    ↓
1. 买家余额 +$100 ✅
2. 卖家余额 -$90 ✅
3. 平台实际损失 $10（佣金）
```

**关键点：**
- ✅ 买家全额退款（$100）
- ✅ 卖家扣除已结算金额（$90）
- ✅ 平台承担佣金损失（$10）

---

## 🔍 需要检查的数据库字段

### **User 表**

```prisma
model User {
  id       String  @id @default(cuid())
  balance  Decimal @default(0) @db.Decimal(10, 2)  // ✅ 买家余额
  // ...
}
```

### **SellerProfile 表**

```prisma
model SellerProfile {
  userId      String  @id
  balance     Decimal @default(0) @db.Decimal(10, 2)  // ✅ 卖家余额
  totalSales  Decimal @default(0) @db.Decimal(10, 2)
  // ...
}
```

### **Payment 表**

```prisma
model Payment {
  id         String   @id @default(cuid())
  paymentNo  String   @unique
  orderId    String
  userId     String
  method     String   // 'REFUND' 表示退款
  amount     Decimal  @db.Decimal(10, 2)
  status     String   // 'SUCCESS'
  paidAt     DateTime?
  // ...
}
```

### **RefundRequest 表**

```prisma
model RefundRequest {
  id              String   @id @default(cuid())
  refundNo        String   @unique
  orderId         String
  userId          String   // 买家ID
  sellerId        String   // 卖家ID
  refundAmount    Decimal  @db.Decimal(10, 2)
  status          String   // PENDING, SELLER_AGREED, SELLER_REJECTED, DISPUTED, COMPLETED, REJECTED
  // ...
}
```

---

## 📝 后续优化建议

### **1. 增加买家余额变动流水表**

```prisma
model UserTransaction {
  id            String   @id @default(cuid())
  userId        String
  type          String   // REFUND, RECHARGE, WITHDRAW, PAYMENT
  amount        Decimal  @db.Decimal(10, 2)
  balanceAfter  Decimal  @db.Decimal(10, 2)
  orderId       String?
  description   String
  createdAt     DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id])
  
  @@index([userId, createdAt])
}
```

**用途：**
- 记录买家所有余额变动
- 方便对账和查询
- 提供余额明细页面

### **2. 退款状态机优化**

```typescript
enum RefundStatus {
  PENDING           // 待卖家响应
  SELLER_AGREED     // 卖家同意，待管理员处理
  SELLER_REJECTED   // 卖家拒绝，买家可申请介入
  DISPUTED          // 买家申请平台介入
  COMPLETED         // 退款完成
  REJECTED          // 管理员拒绝
  CANCELLED         // 买家撤销
}
```

**流程：**
```
PENDING → SELLER_AGREED → COMPLETED
   ↓
SELLER_REJECTED → DISPUTED → COMPLETED/REJECTED
   ↓
CANCELLED
```

### **3. 自动退款规则**

```typescript
// 卖家 48 小时未响应，自动同意
if (refund.status === 'PENDING' && 
    Date.now() - refund.createdAt > 48 * 3600 * 1000) {
  await this.sellerRespondRefund(refund.id, refund.sellerId, {
    agreed: true,
    sellerResponse: '超时未响应，系统自动同意',
  });
}
```

### **4. 退款原因分析**

```typescript
// 统计退款原因，优化商品质量
const refundReasons = await this.prisma.refundRequest.groupBy({
  by: ['reason'],
  _count: true,
  orderBy: { _count: { reason: 'desc' } },
});

// 高频退款原因：
// - ACCOUNT_ABNORMAL（账号异常）
// - PRODUCT_NOT_MATCH（商品不符）
// - NOT_DELIVERED（未收到）
```

---

## ✅ 修复总结

### **已修复**

1. ✅ 退款时增加买家余额
2. ✅ 优化退款通知消息（显示金额）
3. ✅ 完善退款流程注释

### **待完善**

1. 🔄 增加 UserTransaction 表记录余额流水
2. 🔄 前端显示余额变动明细
3. 🔄 卖家 48 小时未响应自动同意
4. 🔄 退款原因统计分析
5. 🔄 退款完成后发送邮件通知

### **测试清单**

- [ ] 买家申请退款
- [ ] 卖家同意退款
- [ ] 管理员审核通过
- [ ] 检查买家余额是否增加
- [ ] 检查卖家余额是否扣减
- [ ] 检查库存是否恢复
- [ ] 检查订单状态是否更新为 REFUNDED
- [ ] 检查通知消息是否正确

---

## 🎯 核心改进

**修复前：**
```typescript
// ❌ 只创建支付记录，买家余额不变
await tx.payment.create({ ... });
```

**修复后：**
```typescript
// ✅ 1. 增加买家余额
const newBalance = Number(buyer.balance || 0) + Number(refund.refundAmount);
await tx.user.update({
  where: { id: refund.userId },
  data: { balance: newBalance },
});

// ✅ 2. 创建退款支付记录
await tx.payment.create({ ... });

// ✅ 3. 通知买家（显示金额）
await this.notificationService.notifyUser(refund.userId, {
  content: `$${refund.refundAmount} 已退回至账户余额`,
});
```

**现在退款流程完整了！** 🎉



