import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BellOutlined, CheckOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import { useNotificationStore } from '../../store/notificationStore';
import { useAuthStore } from '../../store/authStore';
import type { Notification } from '../../types/notification';
import './NotificationBell.css';

dayjs.extend(relativeTime);

// 通知类型图标映射
const notificationIcons: Record<string, string> = {
  order_status: '📦',
  new_order: '🛒',
  refund_request: '💰',
  refund_processed: '✅',
  ticket_reply: '💬',
  system: '🔔',
  withdrawal: '💳',
  product_sold: '🎉',
  price_drop: '📉',
};

// 通知优先级颜色
const priorityColors: Record<string, string> = {
  low: 'var(--color-success)',
  medium: 'var(--color-warning)',
  high: 'var(--color-error)',
};

export default function NotificationBell() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  
  const {
    notifications,
    unreadCount,
    isLoading,
    isOpen,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    togglePanel,
    closePanel,
    initWebSocket,
    disconnectWebSocket,
  } = useNotificationStore();

  const { accessToken, isAuthenticated } = useAuthStore();

  // 初始化 WebSocket 连接
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      initWebSocket(accessToken);
      fetchNotifications();
    }
    
    return () => {
      disconnectWebSocket();
    };
  }, [isAuthenticated, accessToken]);

  // 点击外部关闭面板
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        bellRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        !bellRef.current.contains(event.target as Node)
      ) {
        closePanel();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // 格式化时间
  const formatTime = (dateStr: string) => {
    dayjs.locale(i18n.language === 'zh-CN' ? 'zh-cn' : 'en');
    return dayjs(dateStr).fromNow();
  };

  // 点击通知项
  const handleNotificationClick = (notification: Notification) => {
    if (notification.status === 'unread') {
      markAsRead(notification.id);
    }
    
    // 根据通知类型跳转
    if (notification.data) {
      const data = notification.data as Record<string, unknown>;
      if ('orderNo' in data) {
        navigate(`/user/orders/${data.orderNo}`);
      } else if ('ticketNo' in data) {
        navigate(`/user/tickets/${data.ticketNo}`);
      }
    }
    
    closePanel();
  };

  // 删除通知
  const handleDelete = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    deleteNotification(notificationId);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="notification-bell-container">
      {/* 铃铛按钮 */}
      <button
        ref={bellRef}
        className="notification-bell-btn"
        onClick={togglePanel}
        aria-label={t('notifications.title', '通知')}
      >
        <BellOutlined className="notification-bell-icon" />
        {unreadCount > 0 && (
          <motion.span
            className="notification-badge"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* 下拉面板 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            className="notification-panel"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {/* 头部 */}
            <div className="notification-panel-header">
              <h3>{t('notifications.title', '通知')}</h3>
              <div className="notification-panel-actions">
                {unreadCount > 0 && (
                  <button
                    className="notification-action-btn"
                    onClick={markAllAsRead}
                    title={t('notifications.markAllRead', '全部已读')}
                  >
                    <CheckOutlined />
                  </button>
                )}
                <button
                  className="notification-action-btn"
                  onClick={() => fetchNotifications()}
                  title={t('notifications.refresh', '刷新')}
                >
                  <ReloadOutlined spin={isLoading} />
                </button>
              </div>
            </div>

            {/* 通知列表 */}
            <div className="notification-list">
              {isLoading && notifications.length === 0 ? (
                <div className="notification-loading">
                  <ReloadOutlined spin />
                  <span>{t('notifications.loading', '加载中...')}</span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="notification-empty">
                  <BellOutlined className="notification-empty-icon" />
                  <p>{t('notifications.empty', '暂无通知')}</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`notification-item ${
                      notification.status === 'unread' ? 'unread' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="notification-item-icon">
                      {notificationIcons[notification.type] || '🔔'}
                    </div>
                    <div className="notification-item-content">
                      <div className="notification-item-header">
                        <span className="notification-item-title">
                          {notification.title}
                        </span>
                        <span
                          className="notification-item-priority"
                          style={{ backgroundColor: priorityColors[notification.priority] }}
                        />
                      </div>
                      <p className="notification-item-text">{notification.content}</p>
                      <span className="notification-item-time">
                        {formatTime(notification.createdAt)}
                      </span>
                    </div>
                    <button
                      className="notification-item-delete"
                      onClick={(e) => handleDelete(e, notification.id)}
                      title={t('notifications.delete', '删除')}
                    >
                      <DeleteOutlined />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* 底部 */}
            {notifications.length > 0 && (
              <div className="notification-panel-footer">
                <button onClick={() => { closePanel(); navigate('/user/notifications'); }}>
                  {t('notifications.viewAll', '查看全部')}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}