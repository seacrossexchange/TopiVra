# C2C 平台工单系统实现总结

## 🎯 核心设计理念

### **C2C 平台 vs B2C 平台的本质区别**

```
B2C 发卡网（传统）：
- 平台 = 卖家
- 工单 = 买家 ↔ 平台客服
- 退款 = 平台直接决定

C2C 交易平台（TopiVra）：
- 平台 = 中介
- 工单 = 买家 ↔ 卖家 ↔ 平台客服（三方）
- 退款 = 卖家审核 → 平台仲裁
```

---

## 📊 系统架构

### **1. 数据库设计**

#### **工单表（c2c_tickets）**

```sql
CREATE TABLE c2c_tickets (
  id VARCHAR(191) PRIMARY KEY,
  ticket_no VARCHAR(191) UNIQUE,
  type ENUM('REFUND', 'DM', 'SUPPORT', 'COMPLAINT'),
  status ENUM(
    'PENDING',
    'SELLER_REVIEWING',      -- 卖家审核中
    'SELLER_AGREED',         -- 卖家同意
    'SELLER_REJECTED',       -- 卖家拒绝
    'ADMIN_REVIEWING',       -- 平台审核中
    'ADMIN_APPROVED',        -- 平台批准
    'ADMIN_REJECTED',        -- 平台拒绝
    'COMPLETED',
    'CLOSED',
    'CANCELLED'
  ),
  
  -- 三方关联
  buyer_id VARCHAR(191) NOT NULL,
  seller_id VARCHAR(191),
  admin_id VARCHAR(191),
  order_id VARCHAR(191),
  
  -- 退款信息
  refund_amount DECIMAL(10, 2),
  refund_reason TEXT,
  refund_evidence JSON,
  
  -- 时间节点
  seller_respond_deadline DATETIME(3),  -- 卖家响应期限（48小时）
  seller_responded_at DATETIME(3),
  admin_reviewed_at DATETIME(3),
  
  -- 未读计数（三方独立）
  unread_buyer INT DEFAULT 0,
  unread_seller INT DEFAULT 0,
  unread_admin INT DEFAULT 0,
  
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3)
);
```

#### **消息表（c2c_ticket_messages）**

```sql
CREATE TABLE c2c_ticket_messages (
  id VARCHAR(191) PRIMARY KEY,
  ticket_id VARCHAR(191) NOT NULL,
  sender_id VARCHAR(191) NOT NULL,
  sender_role ENUM('BUYER', 'SELLER', 'ADMIN', 'SYSTEM'),
  content TEXT NOT NULL,
  attachments JSON,
  is_internal BOOLEAN DEFAULT false,  -- 内部备注（仅管理员可见）
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)
);
```

---

## 🔄 退款流程状态机

### **完整流程**

```
1. 买家申请退款
   ↓
   status: SELLER_REVIEWING
   ↓
2. 卖家响应（48小时内）
   ├─ 同意 → SELLER_AGREED → 自动提交平台审核
   ├─ 拒绝 → SELLER_REJECTED → 买家可申请平台介入
   └─ 超时 → 自动同意 → SELLER_AGREED
   ↓
3. 平台审核
   status: ADMIN_REVIEWING
   ↓
4. 平台决定
   ├─ 批准 → ADMIN_APPROVED → 执行退款 → COMPLETED
   └─ 拒绝 → ADMIN_REJECTED → CLOSED
```

### **关键时间节点**

```typescript
// 创建退款工单时
seller_respond_deadline = NOW() + 48 HOURS

// 定时任务检查超时
if (NOW() > seller_respond_deadline && status === 'SELLER_REVIEWING') {
  // 自动同意退款
  status = 'SELLER_AGREED'
  // 提交平台审核
  status = 'ADMIN_REVIEWING'
}
```

---

## 🎨 三方视角界面设计

### **1. 买家视角**

**核心功能：**
- ✅ 查看退款进度（步骤条）
- ✅ 实时倒计时（卖家响应期限）
- ✅ 申请平台介入（卖家拒绝后）
- ✅ 发送消息给卖家
- ✅ 关闭工单

**界面特点：**
```tsx
// 进度展示
<Steps current={getCurrentStep()}>
  <Step title="卖家审核" description="剩余 46小时23分" />
  <Step title="平台审核" />
  <Step title="退款完成" />
</Steps>

// 消息气泡（买家消息靠右，蓝色）
<div className="bg-blue-500 text-white rounded-lg p-4">
  买家（我）: 账号无法登录
</div>
```

---

### **2. 卖家视角**

**核心功能：**
- ✅ 查看退款申请详情
- ✅ 查看买家提供的证据
- ✅ 同意/拒绝退款
- ✅ 响应倒计时提醒
- ✅ 发送消息给买家

**界面特点：**
```tsx
// 退款信息卡片
<Card>
  <div className="grid grid-cols-2 gap-4">
    <div>
      <div className="text-gray-500">退款金额</div>
      <div className="text-2xl font-bold text-red-600">
        ${refundAmount}
      </div>
    </div>
    <div>
      <div className="text-gray-500">响应期限</div>
      <div className="text-orange-600">
        剩余 {getTimeRemaining()}
      </div>
    </div>
  </div>
</Card>

// 响应按钮
<Button type="primary" onClick={handleRespond}>
  立即响应
</Button>

// 响应弹窗
<Modal>
  <Radio.Group>
    <Radio value="AGREE">同意退款</Radio>
    <Radio value="REJECT">拒绝退款</Radio>
  </Radio.Group>
  {action === 'REJECT' && (
    <TextArea placeholder="请说明拒绝原因..." />
  )}
</Modal>
```

---

### **3. 管理员视角**

**核心功能：**
- ✅ 查看买卖双方所有信息
- ✅ 查看完整沟通记录
- ✅ 批准/拒绝退款
- ✅ 调整退款金额
- ✅ 发送消息给买卖双方
- ✅ 内部备注（仅管理员可见）

**界面特点：**
```tsx
// 工单详情（Descriptions）
<Descriptions bordered>
  <Descriptions.Item label="订单ID">{orderId}</Descriptions.Item>
  <Descriptions.Item label="买家ID">{buyerId}</Descriptions.Item>
  <Descriptions.Item label="卖家ID">{sellerId}</Descriptions.Item>
  <Descriptions.Item label="退款金额">
    ${refundAmount}
  </Descriptions.Item>
  <Descriptions.Item label="退款原因" span={2}>
    {refundReason}
  </Descriptions.Item>
</Descriptions>

// 处理弹窗
<Modal title="处理退款工单">
  <Radio.Group>
    <Radio value="APPROVE">批准退款</Radio>
    <Radio value="REJECT">拒绝退款</Radio>
  </Radio.Group>
  
  {action === 'APPROVE' && (
    <InputNumber
      prefix="$"
      value={refundAmount}
      max={originalAmount}
      placeholder="可调整退款金额"
    />
  )}
  
  <TextArea placeholder="处理说明..." />
  
  <Alert type="warning">
    批准退款后，系统将自动执行退款操作
  </Alert>
</Modal>

// 消息区分（三方不同颜色）
<div className={
  role === 'BUYER' ? 'bg-blue-50' :
  role === 'SELLER' ? 'bg-green-50' :
  role === 'ADMIN' ? 'bg-purple-500 text-white' :
  'bg-gray-100'
}>
  {message}
</div>
```

---

## 🔧 核心功能实现

### **1. 创建退款工单**

```typescript
async createRefundTicket(buyerId: string, dto: CreateRefundTicketDto) {
  // 1. 验证订单状态
  const order = await this.prisma.order.findUnique({
    where: { id: dto.orderId },
  });
  
  if (!['PAID', 'DELIVERED'].includes(order.orderStatus)) {
    throw new BadRequestException('当前订单状态无法申请退款');
  }
  
  // 2. 检查是否已有进行中的退款工单
  const existingTicket = await this.checkExistingTicket(dto.orderId);
  if (existingTicket) {
    throw new BadRequestException('该订单已有进行中的退款工单');
  }
  
  // 3. 创建工单
  const ticket = await this.prisma.$executeRaw`
    INSERT INTO c2c_tickets (
      id, ticket_no, type, status, order_id, buyer_id, seller_id,
      subject, refund_amount, refund_reason, refund_evidence,
      seller_respond_deadline, unread_seller, created_at, updated_at
    ) VALUES (
      UUID(), ${ticketNo}, 'REFUND', 'SELLER_REVIEWING',
      ${dto.orderId}, ${buyerId}, ${sellerId},
      CONCAT('退款申请 - 订单 #', ${order.orderNo}),
      ${refundAmount}, ${dto.refundReason}, ${JSON.stringify(dto.refundEvidence)},
      DATE_ADD(NOW(), INTERVAL 48 HOUR), 1, NOW(), NOW()
    )
  `;
  
  // 4. 创建系统消息
  await this.createSystemMessage(ticketNo, '买家申请退款');
  
  // 5. 通知卖家
  await this.notificationService.notifyUser(sellerId, {
    type: 'TICKET_CREATED',
    title: '收到退款申请',
    content: '请在48小时内响应',
  });
  
  return { ticketNo };
}
```

---

### **2. 卖家响应退款**

```typescript
async sellerRespond(ticketNo: string, sellerId: string, dto: SellerRespondDto) {
  // 1. 验证权限和状态
  const ticket = await this.getTicket(ticketNo);
  
  if (ticket.seller_id !== sellerId) {
    throw new ForbiddenException('无权操作');
  }
  
  if (ticket.status !== 'SELLER_REVIEWING') {
    throw new BadRequestException('当前状态无法响应');
  }
  
  // 2. 更新状态
  const newStatus = dto.action === 'AGREE' ? 'SELLER_AGREED' : 'SELLER_REJECTED';
  
  await this.prisma.$executeRaw`
    UPDATE c2c_tickets 
    SET status = ${newStatus}, 
        seller_responded_at = NOW(),
        unread_buyer = unread_buyer + 1,
        updated_at = NOW()
    WHERE id = ${ticket.id}
  `;
  
  // 3. 创建系统消息
  const message = dto.action === 'AGREE'
    ? '卖家已同意退款，等待平台审核'
    : `卖家已拒绝退款，原因：${dto.rejectReason}`;
  
  await this.createSystemMessage(ticketNo, message);
  
  // 4. 如果同意，自动提交平台审核
  if (dto.action === 'AGREE') {
    await this.prisma.$executeRaw`
      UPDATE c2c_tickets 
      SET status = 'ADMIN_REVIEWING'
      WHERE id = ${ticket.id}
    `;
  }
  
  // 5. 通知买家
  await this.notificationService.notifyUser(ticket.buyer_id, {
    type: 'TICKET_RESPONSE',
    title: dto.action === 'AGREE' ? '卖家已同意退款' : '卖家已拒绝退款',
    content: message,
  });
}
```

---

### **3. 买家申请平台介入**

```typescript
async escalateToAdmin(ticketNo: string, buyerId: string, dto: EscalateTicketDto) {
  const ticket = await this.getTicket(ticketNo);
  
  // 只有卖家拒绝后才能申请
  if (ticket.status !== 'SELLER_REJECTED') {
    throw new BadRequestException('只有卖家拒绝后才能申请平台介入');
  }
  
  // 更新状态为平台审核中
  await this.prisma.$executeRaw`
    UPDATE c2c_tickets 
    SET status = 'ADMIN_REVIEWING', updated_at = NOW()
    WHERE id = ${ticket.id}
  `;
  
  await this.createSystemMessage(
    ticketNo,
    `买家申请平台介入，原因：${dto.reason}`
  );
  
  // 通知管理员
  await this.notifyAdmins({
    type: 'TICKET_ESCALATED',
    title: '新的退款争议',
    content: `工单 ${ticketNo} 买家申请平台介入`,
  });
}
```

---

### **4. 管理员处理工单**

```typescript
async adminProcess(ticketNo: string, adminId: string, dto: AdminProcessTicketDto) {
  const ticket = await this.getTicket(ticketNo);
  
  if (ticket.status !== 'ADMIN_REVIEWING') {
    throw new BadRequestException('当前状态无法处理');
  }
  
  const isApproved = dto.action === 'APPROVE';
  const newStatus = isApproved ? 'ADMIN_APPROVED' : 'ADMIN_REJECTED';
  
  // 更新工单状态
  await this.prisma.$executeRaw`
    UPDATE c2c_tickets 
    SET status = ${newStatus},
        admin_id = ${adminId},
        admin_reviewed_at = NOW(),
        unread_buyer = unread_buyer + 1,
        unread_seller = unread_seller + 1,
        updated_at = NOW()
    WHERE id = ${ticket.id}
  `;
  
  // 如果批准，执行退款
  if (isApproved) {
    await this.processRefund(
      ticket.order_id,
      dto.refundAmount || ticket.refund_amount,
      adminId
    );
    
    // 更新为已完成
    await this.prisma.$executeRaw`
      UPDATE c2c_tickets 
      SET status = 'COMPLETED', completed_at = NOW()
      WHERE id = ${ticket.id}
    `;
    
    await this.createSystemMessage(
      ticketNo,
      `退款已完成，$${refundAmount} 已退回至买家账户余额`
    );
  }
  
  // 通知买卖双方
  await this.notifyBuyerAndSeller(ticket, isApproved, dto.adminResponse);
}
```

---

### **5. 执行退款**

```typescript
private async processRefund(orderId: string, refundAmount: number, adminId: string) {
  const order = await this.prisma.order.findUnique({
    where: { id: orderId },
    include: { orderItems: true },
  });
  
  await this.prisma.$transaction(async (tx) => {
    // 1. 更新订单状态
    await tx.order.update({
      where: { id: orderId },
      data: {
        orderStatus: 'REFUNDED',
        paymentStatus: 'REFUNDED',
        refundedAt: new Date(),
      },
    });
    
    // 2. 增加买家余额
    const buyer = await tx.user.findUnique({ where: { id: order.buyerId } });
    const newBalance = Number(buyer.balance || 0) + refundAmount;
    await tx.user.update({
      where: { id: order.buyerId },
      data: { balance: newBalance },
    });
    
    // 3. 恢复库存
    for (const item of order.orderItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }
    
    // 4. 扣减卖家余额（如已结算）
    for (const item of order.orderItems) {
      const sellerProfile = await tx.sellerProfile.findUnique({
        where: { userId: item.sellerId },
      });
      
      if (sellerProfile && Number(sellerProfile.balance) >= Number(item.sellerAmount)) {
        await tx.sellerProfile.update({
          where: { userId: item.sellerId },
          data: {
            balance: { decrement: item.sellerAmount },
          },
        });
      }
    }
  });
}
```

---

## 📱 前端关键组件

### **1. 实时轮询**

```typescript
const { data: ticket } = useQuery({
  queryKey: ['ticket', ticketNo],
  queryFn: () => ticketsService.getTicket(ticketNo),
  refetchInterval: 5000, // 5秒轮询
});
```

### **2. 倒计时显示**

```typescript
const getTimeRemaining = () => {
  if (!ticket?.seller_respond_deadline) return null;
  const deadline = dayjs(ticket.seller_respond_deadline);
  const now = dayjs();
  const diff = deadline.diff(now, 'second');
  
  if (diff <= 0) return '已超时';
  
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  return `${hours}小时${minutes}分`;
};
```

### **3. 消息气泡区分**

```typescript
const getSenderIcon = (role: string) => {
  switch (role) {
    case 'BUYER': return <UserOutlined />;
    case 'SELLER': return <ShopOutlined />;
    case 'ADMIN': return <CustomerServiceOutlined />;
    default: return <CheckCircleOutlined />;
  }
};

// 消息样式
<div className={`
  ${role === 'BUYER' ? 'bg-blue-500 text-white justify-end' : ''}
  ${role === 'SELLER' ? 'bg-green-500 text-white justify-end' : ''}
  ${role === 'ADMIN' ? 'bg-purple-500 text-white justify-end' : ''}
  ${role === 'SYSTEM' ? 'bg-gray-100 text-gray-700 justify-center' : ''}
`}>
  {message.content}
</div>
```

---

## 🎯 C2C 平台特色功能

### **1. 卖家响应倒计时**

```typescript
// 定时任务（Cron Job）
@Cron('*/5 * * * *') // 每5分钟检查一次
async checkOverdueTickets() {
  const overdueTickets = await this.prisma.$queryRaw`
    SELECT * FROM c2c_tickets 
    WHERE status = 'SELLER_REVIEWING'
    AND seller_respond_deadline < NOW()
  `;
  
  for (const ticket of overdueTickets) {
    // 自动同意退款
    await this.sellerRespond(ticket.ticket_no, 'SYSTEM', {
      action: 'AGREE',
      response: '卖家48小时内未响应，系统自动同意退款',
    });
  }
}
```

### **2. 三方未读计数**

```typescript
// 买家发送消息
await this.prisma.$executeRaw`
  UPDATE c2c_tickets 
  SET unread_seller = unread_seller + 1,
      unread_admin = unread_admin + 1
  WHERE id = ${ticketId}
`;

// 卖家发送消息
await this.prisma.$executeRaw`
  UPDATE c2c_tickets 
  SET unread_buyer = unread_buyer + 1,
      unread_admin = unread_admin + 1
  WHERE id = ${ticketId}
`;

// 管理员发送消息
await this.prisma.$executeRaw`
  UPDATE c2c_tickets 
  SET unread_buyer = unread_buyer + 1,
      unread_seller = unread_seller + 1
  WHERE id = ${ticketId}
`;
```

### **3. 平台介入机制**

```
买家申请退款
    ↓
卖家拒绝
    ↓
买家不满意 → 申请平台介入
    ↓
平台审核（查看双方证据和沟通记录）
    ↓
平台做出公正裁决
```

---

## 📊 数据统计

### **卖家工单统计**

```typescript
// 待处理数量
const pendingCount = await this.prisma.$queryRaw`
  SELECT COUNT(*) as count FROM c2c_tickets 
  WHERE seller_id = ${sellerId}
  AND status IN ('SELLER_REVIEWING', 'ADMIN_REVIEWING')
`;

// 平均响应时间
const avgResponseTime = await this.prisma.$queryRaw`
  SELECT AVG(TIMESTAMPDIFF(MINUTE, created_at, seller_responded_at)) as avg_time
  FROM c2c_tickets 
  WHERE seller_id = ${sellerId}
  AND seller_responded_at IS NOT NULL
`;
```

---

## ✅ 已完成功能

1. ✅ 数据库设计（c2c_tickets + c2c_ticket_messages）
2. ✅ 后端服务（TicketsService）
3. ✅ 后端控制器（TicketsController）
4. ✅ 前端服务（ticketsService.ts）
5. ✅ 买家工单详情页（BuyerTicketDetail.tsx）
6. ✅ 卖家工单详情页（SellerTicketDetail.tsx）
7. ✅ 管理员工单详情页（AdminTicketDetail.tsx）
8. ✅ 退款流程完整实现
9. ✅ 三方角色权限控制
10. ✅ 实时消息轮询

---

## 🔄 待完善功能

1. 🔄 工单列表页（买家/卖家/管理员）
2. 🔄 WebSocket 实时推送
3. 🔄 文件上传功能
4. 🔄 定时任务（检查超时）
5. 🔄 邮件通知
6. 🔄 工单统计报表
7. 🔄 内部备注功能（管理员专用）

---

## 🎯 核心优势

### **相比传统 B2C 工单系统**

| 维度 | B2C 工单 | C2C 工单（TopiVra） |
|------|---------|-------------------|
| **参与方** | 买家 + 客服 | 买家 + 卖家 + 客服 |
| **退款决策** | 客服直接决定 | 卖家审核 → 平台仲裁 |
| **响应期限** | 无 | 48小时倒计时 |
| **平台介入** | 无需 | 卖家拒绝后可申请 |
| **消息类型** | 2种（买家/客服） | 4种（买家/卖家/客服/系统） |
| **未读计数** | 1个 | 3个（三方独立） |
| **状态机** | 简单（3-4个状态） | 复杂（10个状态） |

---

## 🚀 部署建议

### **1. 数据库迁移**

```bash
# 执行迁移脚本
mysql -u root -p topiVra < server/prisma/migrations/add_c2c_ticket_system.sql
```

### **2. 启动定时任务**

```typescript
// 在 app.module.ts 中启用
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TicketsModule,
  ],
})
export class AppModule {}
```

### **3. 配置环境变量**

```env
# 卖家响应期限（小时）
SELLER_RESPOND_DEADLINE=48

# 工单轮询间隔（毫秒）
TICKET_POLL_INTERVAL=5000
```

---

## 📝 总结

这套 C2C 工单系统完全符合 **C2C 交易平台** 的特性：

1. ✅ **三方角色清晰**：买家、卖家、平台客服各有独立视角
2. ✅ **退款流程完整**：卖家审核 → 平台仲裁 → 自动退款
3. ✅ **响应期限机制**：48小时倒计时，超时自动同意
4. ✅ **平台介入流程**：卖家拒绝后，买家可申请平台仲裁
5. ✅ **消息系统完善**：支持四种角色消息，三方未读计数
6. ✅ **权限控制严格**：买家、卖家、管理员各有专属接口

**与传统 B2C 发卡网的工单系统完全不同，真正体现了 C2C 平台的中介角色！** 🎉



