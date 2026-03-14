import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Notification,
  NotificationType,
  NotificationListResponse
} from '../types/notification';
import { wsService } from '../services/websocket';
import apiClient from '../services/apiClient';

const LOCAL_CACHE_LIMIT = 50; // localStorage 只缓存最近 50 条

interface NotificationState {
  // 状态
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  hasMore: boolean;       // 是否还有更多历史通知可加载
  currentPage: number;    // 当前已加载到的页码
  error: string | null;
  isOpen: boolean;

  // 操作
  fetchNotifications: (page?: number, limit?: number) => Promise<void>;
  loadMoreNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  clearAll: () => void;

  // UI 操作
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;

  // WebSocket 事件处理
  addNotification: (notification: Notification) => void;

  // 初始化 WebSocket 连接
  initWebSocket: (token: string) => Promise<void>;
  disconnectWebSocket: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      // 初始状态
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      hasMore: true,
      currentPage: 1,
      error: null,
      isOpen: false,

      // 获取通知列表（首页或指定页）
      fetchNotifications: async (page = 1, limit = 20) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.get<NotificationListResponse>(
            '/notifications',
            { params: { page, limit } }
          );

          const { items, unreadCount, total } = response.data;
          const totalLoaded = page === 1 ? items.length : get().notifications.length + items.length;

          if (page === 1) {
            set({
              notifications: items,
              unreadCount,
              isLoading: false,
              hasMore: totalLoaded < total,
              currentPage: 1,
            });
          } else {
            set((state) => ({
              notifications: [...state.notifications, ...items],
              isLoading: false,
              hasMore: totalLoaded < total,
              currentPage: page,
            }));
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : '获取通知失败';
          set({ error: msg, isLoading: false });
        }
      },

      // 加载更多历史通知（分页追加）
      loadMoreNotifications: async () => {
        const { isLoading, hasMore, currentPage } = get();
        if (isLoading || !hasMore) return;
        await get().fetchNotifications(currentPage + 1);
      },

      // 标记单条通知为已读
      markAsRead: async (notificationId: string) => {
        try {
          await apiClient.patch(`/notifications/${notificationId}/read`);

          set((state) => ({
            notifications: state.notifications.map((n) =>
              n.id === notificationId
                ? { ...n, status: 'read' as const, readAt: new Date().toISOString() }
                : n
            ),
            unreadCount: Math.max(0, state.unreadCount - 1),
          }));
        } catch (error) {
          // 标记失败静默处理，不影响用户体验
          if (import.meta.env.DEV) {
            console.error('标记已读失败:', error);
          }
        }
      },

      // 标记所有通知为已读
      markAllAsRead: async () => {
        try {
          await apiClient.patch('/notifications/read-all');

          set((state) => ({
            notifications: state.notifications.map((n) => ({
              ...n,
              status: 'read' as const,
              readAt: new Date().toISOString(),
            })),
            unreadCount: 0,
          }));
        } catch (error) {
          // 标记失败静默处理，不影响用户体验
          if (import.meta.env.DEV) {
            console.error('标记全部已读失败:', error);
          }
        }
      },

      // 删除通知
      deleteNotification: async (notificationId: string) => {
        try {
          await apiClient.delete(`/notifications/${notificationId}`);

          set((state) => {
            const notification = state.notifications.find((n) => n.id === notificationId);
            const wasUnread = notification?.status === 'unread';
            return {
              notifications: state.notifications.filter((n) => n.id !== notificationId),
              unreadCount: wasUnread
                ? Math.max(0, state.unreadCount - 1)
                : state.unreadCount,
            };
          });
        } catch (error) {
          // 删除失败静默处理，不影响用户体验
          if (import.meta.env.DEV) {
            console.error('删除通知失败:', error);
          }
        }
      },

      // 清空所有通知
      clearAll: () => {
        set({ notifications: [], unreadCount: 0, isOpen: false, hasMore: false, currentPage: 1 });
      },

      // UI 操作
      togglePanel: () => set((state) => ({ isOpen: !state.isOpen })),
      openPanel: () => set({ isOpen: true }),
      closePanel: () => set({ isOpen: false }),

      // 添加新通知（来自 WebSocket），实时插入到顶部
      addNotification: (notification: Notification) => {
        set((state) => ({
          notifications: [notification, ...state.notifications],
          unreadCount: state.unreadCount + 1,
        }));
      },

      // 初始化 WebSocket 连接并监听通知事件
      initWebSocket: async (token: string) => {
        const connected = await wsService.connect(token);

        if (connected) {
          wsService.on('notification:new', (data) => {
            get().addNotification({
              id: data.id,
              type: data.type as NotificationType,
              title: data.title,
              content: data.content,
              priority: data.priority || 'medium',
              status: 'unread',
              data: data.data,
              createdAt: data.createdAt,
            });
          });

          wsService.on('order:status_changed', (data) => {
            get().addNotification({
              id: `order-${data.orderNo}-${Date.now()}`,
              type: 'order_status' as NotificationType,
              title: '订单状态更新',
              content: `订单 ${data.orderNo} 状态已变更为 ${data.status}`,
              priority: 'high',
              status: 'unread',
              data: { orderNo: data.orderNo, status: data.status },
              createdAt: data.timestamp,
            });
          });

          wsService.on('ticket:reply', (data) => {
            get().addNotification({
              id: `ticket-${data.ticketNo}-${Date.now()}`,
              type: 'ticket_reply' as NotificationType,
              title: '工单有新回复',
              content: data.message,
              priority: 'medium',
              status: 'unread',
              data: { ticketNo: data.ticketNo },
              createdAt: data.timestamp,
            });
          });
        }
      },

      // 断开 WebSocket 连接
      disconnectWebSocket: () => {
        wsService.disconnect();
      },
    }),
    {
      name: 'notification-storage',
      partialize: (state) => ({
        // localStorage 只缓存最近 N 条，避免存储膨胀
        notifications: state.notifications.slice(0, LOCAL_CACHE_LIMIT),
        unreadCount: state.unreadCount,
      }),
    }
  )
);

export default useNotificationStore;
