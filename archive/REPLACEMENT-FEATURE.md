# C2C 平台换货功能设计

## 🎯 换货场景分析

### **为什么需要换货？**

在 C2C 发卡平台上，常见的换货场景：

1. **账号质量问题**
   - 买家：账号无法登录
   - 卖家：可能是账号信息错误，愿意提供新账号

2. **账号不符合描述**
   - 买家：账号属性与描述不符
   - 卖家：愿意更换符合要求的账号

3. **协商解决**
   - 买家申请退款
   - 卖家不想退款，提出换货
   - 买家同意换货

---

## 🔄 换货流程设计

### **完整流程**

```
1. 买家申请退款
   ↓
   status: SELLER_REVIEWING
   ↓
2. 卖家响应
   ├─ 同意退款 → SELLER_AGREED → 平台审核
   ├─ 拒绝退款 → SELLER_REJECTED → 买家可申请平台介入
   └─ 提供换货 → SELLER_OFFERED_REPLACEMENT ← 新增
       ↓
3. 买家响应换货
   ├─ 接受换货 → BUYER_ACCEPTED_REPLACEMENT
   │   ↓
   │   卖家发货新账号 → REPLACEMENT_DELIVERED
   │   ↓
   │   买家确认 → COMPLETED
   │
   └─ 拒绝换货 → BUYER_REJECTED_REPLACEMENT
       ↓
       回到 SELLER_REVIEWING（卖家重新选择）
       或
       买家申请平台介入 → ADMIN_REVIEWING
```

---

## 📊 数据库更新

### **更新工单表状态枚举**

```sql
ALTER TABLE c2c_tickets 
MODIFY COLUMN status ENUM(
  'PENDING',
  'SELLER_REVIEWING',
  'SELLER_AGREED',
  'SELLER_REJECTED',
  'SELLER_OFFERED_REPLACEMENT',      -- 卖家提供换货
  'BUYER_ACCEPTED_REPLACEMENT',      -- 买家接受换货
  'BUYER_REJECTED_REPLACEMENT',      -- 买家拒绝换货
  'REPLACEMENT_DELIVERED',           -- 换货已发货
  'ADMIN_REVIEWING',
  'ADMIN_APPROVED',
  'ADMIN_REJECTED',
  'COMPLETED',
  'CLOSED',
  'CANCELLED'
) NOT NULL DEFAULT 'PENDING';

-- 添加换货相关字段
ALTER TABLE c2c_tickets
ADD COLUMN replacement_reason TEXT COMMENT '换货说明',
ADD COLUMN replacement_delivery_info TEXT COMMENT '换货商品信息',
ADD COLUMN replacement_delivered_at DATETIME(3) COMMENT '换货发货时间';
```

---

## 🔧 后端实现

### **1. 卖家提供换货**

```typescript
async sellerRespond(ticketNo: string, sellerId: string, dto: SellerRespondDto) {
  const ticket = await this.getTicket(ticketNo);
  
  if (ticket.seller_id !== sellerId) {
    throw new ForbiddenException('无权操作');
  }
  
  if (ticket.status !== 'SELLER_REVIEWING') {
    throw new BadRequestException('当前状态无法响应');
  }
  
  let newStatus: string;
  let message: string;
  
  switch (dto.action) {
    case 'AGREE':
      newStatus = 'SELLER_AGREED';
      message = '卖家已同意退款，等待平台审核';
      // 自动提交平台审核
      await this.submitToAdminReview(ticket.id);
      break;
      
    case 'REJECT':
      newStatus = 'SELLER_REJECTED';
      message = `卖家已拒绝退款${dto.rejectReason ? `，原因：${dto.rejectReason}` : ''}`;
      break;
      
    case 'OFFER_REPLACEMENT':
      newStatus = 'SELLER_OFFERED_REPLACEMENT';
      message = `卖家提供换货方案：${dto.replacementReason || '更换新账号'}`;
      // 保存换货说明
      await this.prisma.$executeRaw`
        UPDATE c2c_tickets 
        SET replacement_reason = ${dto.replacementReason}
        WHERE id = ${ticket.id}
      `;
      break;
  }
  
  await this.prisma.$executeRaw`
    UPDATE c2c_tickets 
    SET status = ${newStatus},
        seller_responded_at = NOW(),
        unread_buyer = unread_buyer + 1,
        updated_at = NOW()
    WHERE id = ${ticket.id}
  `;
  
  await this.createSystemMessage(ticketNo, message);
  
  // 通知买家
  await this.notificationService.notifyUser(ticket.buyer_id, {
    type: 'TICKET_RESPONSE',
    title: dto.action === 'OFFER_REPLACEMENT' ? '卖家提供换货方案' : '卖家已响应',
    content: message,
  });
  
  return { success: true, message };
}
```

---

### **2. 买家响应换货**

```typescript
async buyerRespondReplacement(
  ticketNo: string,
  buyerId: string,
  dto: BuyerRespondReplacementDto,
) {
  const ticket = await this.getTicket(ticketNo);
  
  if (ticket.buyer_id !== buyerId) {
    throw new ForbiddenException('无权操作');
  }
  
  if (ticket.status !== 'SELLER_OFFERED_REPLACEMENT') {
    throw new BadRequestException('当前状态无法响应');
  }
  
  let newStatus: string;
  let message: string;
  
  if (dto.action === 'ACCEPT') {
    newStatus = 'BUYER_ACCEPTED_REPLACEMENT';
    message = '买家已接受换货，等待卖家发货新账号';
  } else {
    newStatus = 'BUYER_REJECTED_REPLACEMENT';
    message = `买家已拒绝换货${dto.reason ? `，原因：${dto.reason}` : ''}`;
  }
  
  await this.prisma.$executeRaw`
    UPDATE c2c_tickets 
    SET status = ${newStatus},
        unread_seller = unread_seller + 1,
        updated_at = NOW()
    WHERE id = ${ticket.id}
  `;
  
  await this.createSystemMessage(ticketNo, message);
  
  // 通知卖家
  await this.notificationService.notifyUser(ticket.seller_id, {
    type: 'TICKET_RESPONSE',
    title: dto.action === 'ACCEPT' ? '买家已接受换货' : '买家已拒绝换货',
    content: message,
  });
  
  return { success: true, message };
}
```

---

### **3. 卖家发货换货商品**

```typescript
async deliverReplacement(
  ticketNo: string,
  sellerId: string,
  dto: DeliverReplacementDto,
) {
  const ticket = await this.getTicket(ticketNo);
  
  if (ticket.seller_id !== sellerId) {
    throw new ForbiddenException('无权操作');
  }
  
  if (ticket.status !== 'BUYER_ACCEPTED_REPLACEMENT') {
    throw new BadRequestException('当前状态无法发货');
  }
  
  await this.prisma.$executeRaw`
    UPDATE c2c_tickets 
    SET status = 'REPLACEMENT_DELIVERED',
        replacement_delivery_info = ${dto.deliveryInfo},
        replacement_delivered_at = NOW(),
        unread_buyer = unread_buyer + 1,
        updated_at = NOW()
    WHERE id = ${ticket.id}
  `;
  
  const message = `卖家已发货新账号${dto.note ? `，备注：${dto.note}` : ''}`;
  await this.createSystemMessage(ticketNo, message);
  
  // 通知买家
  await this.notificationService.notifyUser(ticket.buyer_id, {
    type: 'TICKET_REPLACEMENT_DELIVERED',
    title: '换货商品已发货',
    content: '请查收新账号信息',
  });
  
  return { success: true, message };
}
```

---

### **4. 买家确认换货**

```typescript
async confirmReplacement(ticketNo: string, buyerId: string) {
  const ticket = await this.getTicket(ticketNo);
  
  if (ticket.buyer_id !== buyerId) {
    throw new ForbiddenException('无权操作');
  }
  
  if (ticket.status !== 'REPLACEMENT_DELIVERED') {
    throw new BadRequestException('当前状态无法确认');
  }
  
  await this.prisma.$executeRaw`
    UPDATE c2c_tickets 
    SET status = 'COMPLETED',
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = ${ticket.id}
  `;
  
  await this.createSystemMessage(ticketNo, '买家已确认收货，换货完成');
  
  // 通知卖家
  await this.notificationService.notifyUser(ticket.seller_id, {
    type: 'TICKET_COMPLETED',
    title: '换货已完成',
    content: '买家已确认收货',
  });
  
  return { success: true, message: '换货已完成' };
}
```

---

## 🎨 前端界面设计

### **1. 卖家响应界面（增加换货选项）**

```tsx
<Modal title="响应退款申请">
  <Radio.Group value={respondAction} onChange={(e) => setRespondAction(e.target.value)}>
    <Space direction="vertical">
      <Radio value="AGREE">
        <span className="text-green-600">✅ 同意退款</span>
      </Radio>
      <Radio value="OFFER_REPLACEMENT">
        <span className="text-blue-600">🔄 提供换货</span>
      </Radio>
      <Radio value="REJECT">
        <span className="text-red-600">❌ 拒绝退款</span>
      </Radio>
    </Space>
  </Radio.Group>

  {respondAction === 'OFFER_REPLACEMENT' && (
    <div className="mt-4">
      <div className="mb-2 font-medium">换货说明：</div>
      <TextArea
        rows={3}
        placeholder="例如：为您更换一个新的账号，保证可以正常登录"
        value={replacementReason}
        onChange={(e) => setReplacementReason(e.target.value)}
      />
      <Alert
        type="info"
        message="提示"
        description="提供换货后，买家可选择接受或拒绝。如买家接受，您需要发货新账号"
        className="mt-2"
      />
    </div>
  )}

  {respondAction === 'REJECT' && (
    <div className="mt-4">
      <div className="mb-2 font-medium">拒绝原因：</div>
      <TextArea
        rows={3}
        placeholder="请说明拒绝退款的原因..."
        value={rejectReason}
        onChange={(e) => setRejectReason(e.target.value)}
      />
    </div>
  )}
</Modal>
```

---

### **2. 买家响应换货界面**

```tsx
{ticket.status === 'SELLER_OFFERED_REPLACEMENT' && (
  <Alert
    type="info"
    message="卖家提供换货方案"
    description={
      <div>
        <p className="mb-2">{ticket.replacement_reason}</p>
        <Space>
          <Button
            type="primary"
            onClick={() => handleRespondReplacement('ACCEPT')}
          >
            接受换货
          </Button>
          <Button
            danger
            onClick={() => setShowRejectReplacementModal(true)}
          >
            拒绝换货
          </Button>
        </Space>
      </div>
    }
    showIcon
  />
)}

{/* 拒绝换货弹窗 */}
<Modal
  title="拒绝换货"
  open={showRejectReplacementModal}
  onCancel={() => setShowRejectReplacementModal(false)}
  onOk={handleRejectReplacement}
>
  <TextArea
    rows={3}
    placeholder="请说明拒绝换货的原因（可选）..."
    value={rejectReplacementReason}
    onChange={(e) => setRejectReplacementReason(e.target.value)}
  />
  <Alert
    type="warning"
    message="拒绝换货后，您可以继续与卖家协商，或申请平台介入"
    className="mt-2"
  />
</Modal>
```

---

### **3. 卖家发货换货商品界面**

```tsx
{ticket.status === 'BUYER_ACCEPTED_REPLACEMENT' && (
  <Alert
    type="success"
    message="买家已接受换货"
    description={
      <div>
        <p className="mb-2">请尽快发货新账号</p>
        <Button
          type="primary"
          onClick={() => setShowDeliverReplacementModal(true)}
        >
          发货新账号
        </Button>
      </div>
    }
    showIcon
  />
)}

{/* 发货换货商品弹窗 */}
<Modal
  title="发货新账号"
  open={showDeliverReplacementModal}
  onCancel={() => setShowDeliverReplacementModal(false)}
  onOk={handleDeliverReplacement}
  width={600}
>
  <div className="space-y-4">
    <div>
      <div className="mb-2 font-medium">新账号信息：</div>
      <TextArea
        rows={6}
        placeholder="请输入新账号的登录信息..."
        value={replacementDeliveryInfo}
        onChange={(e) => setReplacementDeliveryInfo(e.target.value)}
      />
    </div>
    <div>
      <div className="mb-2 font-medium">备注（可选）：</div>
      <Input
        placeholder="例如：已测试可正常登录"
        value={replacementNote}
        onChange={(e) => setReplacementNote(e.target.value)}
      />
    </div>
    <Alert
      type="info"
      message="发货后，买家确认收货即完成换货"
    />
  </div>
</Modal>
```

---

### **4. 买家查看换货商品界面**

```tsx
{ticket.status === 'REPLACEMENT_DELIVERED' && (
  <Card title="换货商品信息" className="mb-6">
    <Alert
      type="success"
      message="卖家已发货新账号"
      description="请查收并测试新账号"
      className="mb-4"
      showIcon
    />
    
    <div className="p-4 bg-gray-50 rounded-lg mb-4">
      <div className="mb-2 font-medium">新账号信息：</div>
      <pre className="whitespace-pre-wrap bg-white p-3 rounded border">
        {ticket.replacement_delivery_info}
      </pre>
      <Button
        type="text"
        icon={<CopyOutlined />}
        onClick={() => copyToClipboard(ticket.replacement_delivery_info)}
      >
        复制
      </Button>
    </div>
    
    <Space>
      <Button
        type="primary"
        onClick={() => handleConfirmReplacement()}
      >
        确认收货
      </Button>
      <Button
        danger
        onClick={() => setShowReportProblemModal(true)}
      >
        新账号仍有问题
      </Button>
    </Space>
  </Card>
)}
```

---

## 📊 状态流转图

```
买家申请退款 (SELLER_REVIEWING)
    ↓
卖家响应
    ├─ 同意退款 (SELLER_AGREED) → 平台审核 → 退款完成
    ├─ 拒绝退款 (SELLER_REJECTED) → 买家可申请平台介入
    └─ 提供换货 (SELLER_OFFERED_REPLACEMENT)
        ↓
    买家响应
        ├─ 接受换货 (BUYER_ACCEPTED_REPLACEMENT)
        │   ↓
        │   卖家发货 (REPLACEMENT_DELIVERED)
        │   ↓
        │   买家确认 (COMPLETED)
        │
        └─ 拒绝换货 (BUYER_REJECTED_REPLACEMENT)
            ↓
            回到协商 或 申请平台介入
```

---

## 🎯 换货 vs 退款对比

| 维度 | 退款 | 换货 |
|------|------|------|
| **卖家成本** | 损失商品 + 退款 | 只损失一个账号 |
| **买家满意度** | 拿回钱，但没商品 | 得到新商品 |
| **平台收益** | 损失佣金 | 保留佣金 |
| **处理时间** | 需平台审核 | 买卖双方协商 |
| **适用场景** | 商品严重不符 | 账号质量问题 |

---

## 💡 换货的优势

### **对卖家**
- ✅ 避免退款损失
- ✅ 保持信誉（解决问题而非拒绝）
- ✅ 维护客户关系

### **对买家**
- ✅ 快速解决问题（无需等平台审核）
- ✅ 得到可用的商品
- ✅ 节省时间

### **对平台**
- ✅ 减少退款纠纷
- ✅ 保留交易佣金
- ✅ 提高用户满意度
- ✅ 减少客服工作量

---

## 🔒 风控机制

### **1. 防止滥用换货**

```typescript
// 限制换货次数
const replacementCount = await this.prisma.$queryRaw`
  SELECT COUNT(*) as count FROM c2c_tickets 
  WHERE order_id = ${orderId}
  AND status IN ('REPLACEMENT_DELIVERED', 'COMPLETED')
`;

if (replacementCount >= 2) {
  throw new BadRequestException('该订单换货次数已达上限（2次）');
}
```

### **2. 换货时间限制**

```typescript
// 换货必须在订单完成后7天内
const order = await this.prisma.order.findUnique({
  where: { id: orderId },
});

const daysSinceDelivery = dayjs().diff(dayjs(order.deliveredAt), 'day');
if (daysSinceDelivery > 7) {
  throw new BadRequestException('订单已超过换货期限（7天）');
}
```

### **3. 换货记录追踪**

```typescript
// 记录每次换货的账号信息（哈希）
await this.prisma.$executeRaw`
  INSERT INTO replacement_history (
    ticket_id, order_id, old_account_hash, new_account_hash, created_at
  ) VALUES (
    ${ticketId}, ${orderId}, ${oldHash}, ${newHash}, NOW()
  )
`;
```

---

## 📈 数据统计

### **换货率统计**

```typescript
// 卖家换货率
const replacementRate = await this.prisma.$queryRaw`
  SELECT 
    seller_id,
    COUNT(*) as total_tickets,
    SUM(CASE WHEN status LIKE '%REPLACEMENT%' THEN 1 ELSE 0 END) as replacement_count,
    (SUM(CASE WHEN status LIKE '%REPLACEMENT%' THEN 1 ELSE 0 END) / COUNT(*) * 100) as replacement_rate
  FROM c2c_tickets 
  WHERE type = 'REFUND'
  GROUP BY seller_id
`;
```

### **换货成功率**

```typescript
// 换货成功率（买家接受率）
const replacementSuccessRate = await this.prisma.$queryRaw`
  SELECT 
    COUNT(CASE WHEN status = 'BUYER_ACCEPTED_REPLACEMENT' THEN 1 END) as accepted,
    COUNT(CASE WHEN status = 'BUYER_REJECTED_REPLACEMENT' THEN 1 END) as rejected,
    (COUNT(CASE WHEN status = 'BUYER_ACCEPTED_REPLACEMENT' THEN 1 END) / 
     COUNT(*) * 100) as success_rate
  FROM c2c_tickets 
  WHERE status IN ('BUYER_ACCEPTED_REPLACEMENT', 'BUYER_REJECTED_REPLACEMENT')
`;
```

---

## ✅ 总结

换货功能是 C2C 平台的重要补充：

1. **三方共赢**
   - 卖家：避免退款损失
   - 买家：快速解决问题
   - 平台：减少纠纷，保留佣金

2. **灵活协商**
   - 买卖双方自主协商
   - 平台不强制介入
   - 保留申请平台介入的权利

3. **风控完善**
   - 限制换货次数
   - 时间限制
   - 记录追踪

**换货功能让 C2C 平台更加灵活和人性化！** 🎉



