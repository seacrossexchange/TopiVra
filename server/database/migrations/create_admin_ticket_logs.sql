-- ============================================
-- 管理员工单操作日志表
-- ============================================
-- 用途：记录管理员对工单的所有操作，用于审计和追责
-- 创建时间：2024-01-01
-- ============================================

CREATE TABLE IF NOT EXISTS c2c_admin_ticket_logs (
  id VARCHAR(36) PRIMARY KEY COMMENT '日志ID',
  ticket_id VARCHAR(36) NOT NULL COMMENT '工单ID',
  admin_id VARCHAR(36) NOT NULL COMMENT '管理员ID',
  action VARCHAR(50) NOT NULL COMMENT '操作类型：VIEW/APPROVE/REJECT/CLOSE/MESSAGE/ADD_NOTE/SET_TAGS/SET_PRIORITY/ASSIGN',
  details JSON COMMENT '操作详情（JSON格式）',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  
  INDEX idx_ticket (ticket_id) COMMENT '工单索引',
  INDEX idx_admin (admin_id) COMMENT '管理员索引',
  INDEX idx_action (action) COMMENT '操作类型索引',
  INDEX idx_created (created_at) COMMENT '时间索引',
  
  FOREIGN KEY (ticket_id) REFERENCES c2c_tickets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理员工单操作日志表';

-- ============================================
-- 操作类型说明
-- ============================================
-- VIEW: 查看工单详情
-- APPROVE: 批准退款
-- REJECT: 拒绝退款
-- CLOSE: 关闭工单
-- MESSAGE: 发送消息
-- ADD_NOTE: 添加内部备注
-- SET_TAGS: 设置工单标签
-- SET_PRIORITY: 设置优先级
-- ASSIGN: 转派工单
-- REFUND_COMPLETED: 退款完成

-- ============================================
-- details 字段示例
-- ============================================
-- VIEW: {"ticketNo": "TKT123", "timestamp": "2024-01-01T10:00:00Z"}
-- APPROVE: {"action": "APPROVE", "response": "同意退款", "refundAmount": 99.99, "previousStatus": "ADMIN_REVIEWING", "newStatus": "ADMIN_APPROVED"}
-- REJECT: {"action": "REJECT", "response": "证据不足", "previousStatus": "ADMIN_REVIEWING", "newStatus": "ADMIN_REJECTED"}
-- CLOSE: {"previousStatus": "COMPLETED", "closedBy": "ADMIN"}
-- MESSAGE: {"content": "请提供更多证据", "isInternal": true}
-- ADD_NOTE: {"note": "此工单需要特别关注"}
-- SET_TAGS: {"tags": ["urgent", "fraud"]}
-- SET_PRIORITY: {"priority": "HIGH"}
-- ASSIGN: {"toAdmin": "admin-uuid-2"}
-- REFUND_COMPLETED: {"refundAmount": 99.99, "orderId": "order-uuid"}

-- ============================================
-- 查询示例
-- ============================================

-- 1. 查询某个工单的所有管理员操作记录
-- SELECT * FROM c2c_admin_ticket_logs 
-- WHERE ticket_id = 'ticket-uuid' 
-- ORDER BY created_at DESC;

-- 2. 查询某个管理员的所有操作记录
-- SELECT * FROM c2c_admin_ticket_logs 
-- WHERE admin_id = 'admin-uuid' 
-- ORDER BY created_at DESC;

-- 3. 查询某个时间段内的所有审核操作
-- SELECT * FROM c2c_admin_ticket_logs 
-- WHERE action IN ('APPROVE', 'REJECT') 
-- AND created_at BETWEEN '2024-01-01' AND '2024-01-31'
-- ORDER BY created_at DESC;

-- 4. 统计每个管理员的操作次数
-- SELECT admin_id, action, COUNT(*) as count
-- FROM c2c_admin_ticket_logs
-- GROUP BY admin_id, action
-- ORDER BY admin_id, count DESC;

-- 5. 查询最近24小时的管理员活动
-- SELECT l.*, t.ticket_no, t.subject
-- FROM c2c_admin_ticket_logs l
-- JOIN c2c_tickets t ON l.ticket_id = t.id
-- WHERE l.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
-- ORDER BY l.created_at DESC;

-- ============================================
-- 数据保留策略
-- ============================================
-- 建议保留所有日志至少1年，用于审计和合规
-- 可以定期归档超过1年的日志到历史表

-- 创建历史表（可选）
-- CREATE TABLE c2c_admin_ticket_logs_archive LIKE c2c_admin_ticket_logs;

-- 归档脚本（可选，每月执行一次）
-- INSERT INTO c2c_admin_ticket_logs_archive
-- SELECT * FROM c2c_admin_ticket_logs
-- WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR);

-- DELETE FROM c2c_admin_ticket_logs
-- WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR);



