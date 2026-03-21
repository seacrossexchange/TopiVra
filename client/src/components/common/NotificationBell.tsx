import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BellOutlined, CheckOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/id';
import 'dayjs/locale/pt-br';
import 'dayjs/locale/es';
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

// 通知优先级样式

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
  const hasNotifications = notifications.length > 0;
  const showInitialLoading = isLoading && !hasNotifications;
  const showEmptyState = !isLoading && !hasNotifications;

  // 初始化 WebSocket 连接
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      initWebSocket(accessToken);
      fetchNotifications();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [isAuthenticated, accessToken, initWebSocket, fetchNotifications, disconnectWebSocket]);

  // 点击外部关闭面板
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;

      if (
        panelRef.current &&
        bellRef.current &&
        !panelRef.current.contains(target) &&
        !bellRef.current.contains(target)
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
  }, [isOpen, closePanel]);

  // 格式化时间 - 支持 i18n 语言代码到 dayjs locale 的映射
  const formatTime = (dateStr: string) => {
    // i18n 语言代码到 dayjs locale 的映射
    const localeMap: Record<string, string> = {
      'zh-CN': 'zh-cn',
      'en': 'en',
      'id': 'id',
      'pt-BR': 'pt-br',
      'es-MX': 'es',
    };
    const dayjsLocale = localeMap[i18n.language] || 'en';
    dayjs.locale(dayjsLocale);
    return dayjs(dateStr).fromNow();
  };

  // 点击通知项
  const handleNotificationClick = (notification: Notification) => {
    if (notification.status === 'unread') {
      markAsRead(notification.id);
    }

    const data = notification.data;
    if (data) {
      if ('orderNo' in data) {
        navigate(`/user/orders/${data.orderNo}`);
      } else if ('ticketNo' in data) {
        navigate(`/buyer/tickets/${data.ticketNo}`);
      }
    }

    closePanel();
  };

  const handleDelete = (event: React.MouseEvent<HTMLButtonElement>, notificationId: string) => {
    event.stopPropagation();
    deleteNotification(notificationId);
  };

  const getPriorityClassName = (priority: Notification['priority']) => {
    if (priority === 'low') return 'notification-item-priority-low';
    if (priority === 'medium') return 'notification-item-priority-medium';
    return 'notification-item-priority-high';
  };

  const renderNotificationList = () => {
    if (showInitialLoading) {
      return (
        <div className="notification-loading">
          <ReloadOutlined spin />
          <span>{t('notifications.loading', '加载中...')}</span>
        </div>
      );
    }

    if (showEmptyState) {
      return (
        <div className="notification-empty">
          <BellOutlined className="notification-empty-icon" />
          <p>{t('notifications.empty', '暂无通知')}</p>
        </div>
      );
    }

    return notifications.map((notification) => (
      <div
        key={notification.id}
        className={`notification-item ${notification.status === 'unread' ? 'unread' : ''}`}
      >
        <div
          className="notification-item-main"
          onClick={() => handleNotificationClick(notification)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              handleNotificationClick(notification);
            }
          }}
          role="button"
          tabIndex={0}
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
                className={`notification-item-priority ${getPriorityClassName(notification.priority)}`}
              />
            </div>
            <p className="notification-item-text">{notification.content}</p>
            <span className="notification-item-time">
              {formatTime(notification.createdAt)}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="notification-item-delete"
          onClick={(e) => handleDelete(e, notification.id)}
          title={t('notifications.delete', '删除')}
        >
          <DeleteOutlined />
        </button>
      </div>
    ));
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="notification-bell-container">
      {/* 铃铛按钮 */}
      <button
        type="button"
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
                    type="button"
                    className="notification-action-btn"
                    onClick={markAllAsRead}
                    title={t('notifications.markAllRead', '全部已读')}
                  >
                    <CheckOutlined />
                  </button>
                )}
                <button
                  type="button"
                  className="notification-action-btn"
                  onClick={() => fetchNotifications()}
                  title={t('notifications.refresh', '刷新')}
                >
                  <ReloadOutlined spin={isLoading} />
                </button>
              </div>
            </div>

            {/* 通知列表 */}
            <div className="notification-list">{renderNotificationList()}</div>

            {/* 底部 */}
            {notifications.length > 0 && (
              <div className="notification-panel-footer">
                <button type="button" onClick={() => { closePanel(); navigate('/buyer/tickets'); }}>
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