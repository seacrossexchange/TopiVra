-- ============================================================
-- TopiVra 数据库性能优化索引
-- 执行时间: 2026-03-14
-- 说明: 为高频查询添加索引，提升查询性能
-- ============================================================

-- ==================== 订单相关索引 ====================

-- 订单状态查询优化（管理后台、卖家中心高频查询）
CREATE INDEX IF NOT EXISTS idx_orders_status 
ON orders(order_status, payment_status);

-- 订单时间范围查询优化
CREATE INDEX IF NOT EXISTS idx_orders_created_at 
ON orders(created_at DESC);

-- 买家订单查询优化
CREATE INDEX IF NOT EXISTS idx_orders_buyer 
ON orders(buyer_id, created_at DESC);

-- 订单号查询优化（已有 unique 约束，无需额外索引）
-- order_no 已有唯一索引

-- ==================== 商品相关索引 ====================

-- 商品分类查询优化（首页、分类页高频查询）
CREATE INDEX IF NOT EXISTS idx_products_category_status 
ON products(category_id, status, created_at DESC);

-- 商品搜索优化（全文搜索）
CREATE FULLTEXT INDEX IF NOT EXISTS idx_products_search 
ON products(title, description);

-- 卖家商品查询优化
CREATE INDEX IF NOT EXISTS idx_products_seller 
ON products(seller_id, status, created_at DESC);

-- 商品状态查询优化
CREATE INDEX IF NOT EXISTS idx_products_status 
ON products(status, created_at DESC);

-- ==================== 库存相关索引 ====================

-- 库存可用性查询优化（自动发货高频查询）
CREATE INDEX IF NOT EXISTS idx_inventory_product_status 
ON product_inventory(product_id, status, is_valid);

-- 库存 FIFO 查询优化（按创建时间排序）
CREATE INDEX IF NOT EXISTS idx_inventory_fifo 
ON product_inventory(product_id, status, created_at ASC);

-- 订单库存关联查询
CREATE INDEX IF NOT EXISTS idx_inventory_order 
ON product_inventory(order_id, order_item_id);

-- ==================== 支付相关索引 ====================

-- 支付订单查询优化
CREATE INDEX IF NOT EXISTS idx_payments_order 
ON payments(order_id, status);

-- 支付流水号查询优化（已有 unique 约束，无需额外索引）
-- payment_no 已有唯一索引

-- 支付时间查询优化
CREATE INDEX IF NOT EXISTS idx_payments_created_at 
ON payments(created_at DESC);

-- ==================== 用户相关索引 ====================

-- 用户状态查询优化
CREATE INDEX IF NOT EXISTS idx_users_status 
ON users(status, created_at DESC);

-- 用户邮箱查询优化（已有 unique 约束，无需额外索引）
-- email 已有唯一索引

-- ==================== 卖家相关索引 ====================

-- 卖家状态查询优化
CREATE INDEX IF NOT EXISTS idx_seller_profiles_status 
ON seller_profiles(status, created_at DESC);

-- 卖家用户关联查询（已有 unique 约束，无需额外索引）
-- user_id 已有唯一索引

-- ==================== 工单相关索引 ====================

-- 工单状态查询优化
CREATE INDEX IF NOT EXISTS idx_tickets_status 
ON tickets(status, priority, created_at DESC);

-- 用户工单查询优化
CREATE INDEX IF NOT EXISTS idx_tickets_user 
ON tickets(user_id, status, created_at DESC);

-- 分配工单查询优化
CREATE INDEX IF NOT EXISTS idx_tickets_assigned 
ON tickets(assigned_to, status, created_at DESC);

-- ==================== 通知相关索引 ====================

-- 用户通知查询优化
CREATE INDEX IF NOT EXISTS idx_notifications_user_status 
ON notifications(user_id, status, created_at DESC);

-- ==================== 评价相关索引 ====================

-- 商品评价查询优化
CREATE INDEX IF NOT EXISTS idx_reviews_product 
ON reviews(product_id, status, created_at DESC);

-- 用户评价查询优化
CREATE INDEX IF NOT EXISTS idx_reviews_user 
ON reviews(user_id, created_at DESC);

-- ==================== 审计日志索引 ====================

-- 操作员审计日志查询优化
CREATE INDEX IF NOT EXISTS idx_audit_logs_operator 
ON audit_logs(operator_id, created_at DESC);

-- 模块和操作查询优化
CREATE INDEX IF NOT EXISTS idx_audit_logs_module_action 
ON audit_logs(module, action, created_at DESC);

-- 目标查询优化
CREATE INDEX IF NOT EXISTS idx_audit_logs_target 
ON audit_logs(target_type, target_id, created_at DESC);

-- ==================== 消息相关索引 ====================

-- 消息会话查询优化
CREATE INDEX IF NOT EXISTS idx_messages_conversation 
ON messages(sender_id, receiver_id, created_at DESC);

-- 未读消息查询优化
CREATE INDEX IF NOT EXISTS idx_messages_unread 
ON messages(receiver_id, is_read, created_at DESC);

-- ==================== 退款相关索引 ====================

-- 退款状态查询优化
CREATE INDEX IF NOT EXISTS idx_refund_requests_status 
ON refund_requests(status, created_at DESC);

-- 订单退款查询优化
CREATE INDEX IF NOT EXISTS idx_refund_requests_order 
ON refund_requests(order_id, status);

-- ==================== 提现相关索引 ====================

-- 提现状态查询优化
CREATE INDEX IF NOT EXISTS idx_withdrawals_status 
ON withdrawals(status, created_at DESC);

-- 卖家提现查询优化
CREATE INDEX IF NOT EXISTS idx_withdrawals_seller 
ON withdrawals(seller_id, status, created_at DESC);

-- ============================================================
-- 索引创建完成
-- 建议在低峰期执行，避免影响业务
-- 执行后可使用 EXPLAIN 验证查询计划是否使用了索引
-- ============================================================






