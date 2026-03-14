import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useNotificationStore } from './notificationStore';
import apiClient from '@/services/apiClient';

vi.mock('@/services/apiClient');

describe('useNotificationStore', () => {
  beforeEach(() => {
    useNotificationStore.setState({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      hasMore: true,
      currentPage: 1,
      error: null,
      isOpen: false,
    });
    vi.clearAllMocks();
  });

  it('初始状态正确', () => {
    const state = useNotificationStore.getState();
    expect(state.notifications).toEqual([]);
    expect(state.unreadCount).toBe(0);
    expect(state.isOpen).toBe(false);
    expect(state.hasMore).toBe(true);
  });

  it('fetchNotifications 首页加载成功', async () => {
    const mockNotifications = [
      { id: 'n1', type: 'order_status', title: '订单更新', content: 'Order shipped', status: 'unread', priority: 'high', createdAt: new Date().toISOString() },
      { id: 'n2', type: 'ticket_reply', title: '工单回复', content: 'Reply message', status: 'read', priority: 'medium', createdAt: new Date().toISOString() },
    ];

    vi.mocked(apiClient.get).mockResolvedValue({
      data: { items: mockNotifications, unreadCount: 1, total: 100 },
    } as any);

    await useNotificationStore.getState().fetchNotifications(1, 20);

    const state = useNotificationStore.getState();
    expect(state.notifications).toEqual(mockNotifications);
    expect(state.unreadCount).toBe(1);
    expect(state.hasMore).toBe(true); // 2 < 100
    expect(state.currentPage).toBe(1);
  });

  it('fetchNotifications 加载更多时追加数据', async () => {
    const existingNotif = { id: 'n1', type: 'order_status', title: 'Old', content: 'Old', status: 'read', priority: 'medium', createdAt: new Date().toISOString() };
    useNotificationStore.setState({ notifications: [existingNotif], currentPage: 1 });

    const newNotifs = [
      { id: 'n2', type: 'ticket_reply', title: 'New', content: 'New', status: 'unread', priority: 'high', createdAt: new Date().toISOString() },
    ];

    vi.mocked(apiClient.get).mockResolvedValue({
      data: { items: newNotifs, unreadCount: 1, total: 100 },
    } as any);

    await useNotificationStore.getState().fetchNotifications(2, 20);

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(2);
    expect(state.currentPage).toBe(2);
  });

  it('loadMoreNotifications 防止重复加载', async () => {
    useNotificationStore.setState({ isLoading: true, hasMore: true });

    vi.mocked(apiClient.get).mockResolvedValue({
      data: { items: [], unreadCount: 0, total: 0 },
    } as any);

    await useNotificationStore.getState().loadMoreNotifications();

    // 由于 isLoading 为 true，不应调用 API
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('loadMoreNotifications 当 hasMore 为 false 时不加载', async () => {
    useNotificationStore.setState({ hasMore: false });

    vi.mocked(apiClient.get).mockResolvedValue({
      data: { items: [], unreadCount: 0, total: 0 },
    } as any);

    await useNotificationStore.getState().loadMoreNotifications();

    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('markAsRead 更新单条通知', async () => {
    useNotificationStore.setState({
      notifications: [
        { id: 'n1', type: 'order_status', title: 'Test', content: 'Test', status: 'unread', priority: 'medium', createdAt: new Date().toISOString() },
      ],
      unreadCount: 1,
    });

    vi.mocked(apiClient.patch).mockResolvedValue({} as any);

    await useNotificationStore.getState().markAsRead('n1');

    const state = useNotificationStore.getState();
    expect(state.notifications[0].status).toBe('read');
    expect(state.unreadCount).toBe(0);
  });

  it('markAllAsRead 标记所有为已读', async () => {
    useNotificationStore.setState({
      notifications: [
        { id: 'n1', type: 'order_status', title: 'Test1', content: 'Test1', status: 'unread', priority: 'medium', createdAt: new Date().toISOString() },
        { id: 'n2', type: 'ticket_reply', title: 'Test2', content: 'Test2', status: 'unread', priority: 'medium', createdAt: new Date().toISOString() },
      ],
      unreadCount: 2,
    });

    vi.mocked(apiClient.patch).mockResolvedValue({} as any);

    await useNotificationStore.getState().markAllAsRead();

    const state = useNotificationStore.getState();
    expect(state.notifications.every(n => n.status === 'read')).toBe(true);
    expect(state.unreadCount).toBe(0);
  });

  it('deleteNotification 删除通知', async () => {
    useNotificationStore.setState({
      notifications: [
        { id: 'n1', type: 'order_status', title: 'Test', content: 'Test', status: 'unread', priority: 'medium', createdAt: new Date().toISOString() },
        { id: 'n2', type: 'ticket_reply', title: 'Test2', content: 'Test2', status: 'read', priority: 'medium', createdAt: new Date().toISOString() },
      ],
      unreadCount: 1,
    });

    vi.mocked(apiClient.delete).mockResolvedValue({} as any);

    await useNotificationStore.getState().deleteNotification('n1');

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(1);
    expect(state.notifications[0].id).toBe('n2');
    expect(state.unreadCount).toBe(0); // 删除的是未读，所以减1
  });

  it('addNotification 添加新通知到顶部', () => {
    useNotificationStore.setState({
      notifications: [
        { id: 'n1', type: 'order_status', title: 'Old', content: 'Old', status: 'read', priority: 'medium', createdAt: new Date().toISOString() },
      ],
      unreadCount: 0,
    });

    const newNotif = { id: 'n2', type: 'ticket_reply', title: 'New', content: 'New', status: 'unread', priority: 'high', createdAt: new Date().toISOString() };

    useNotificationStore.getState().addNotification(newNotif);

    const state = useNotificationStore.getState();
    expect(state.notifications[0]).toEqual(newNotif);
    expect(state.unreadCount).toBe(1);
  });

  it('togglePanel 切换面板状态', () => {
    useNotificationStore.setState({ isOpen: false });
    useNotificationStore.getState().togglePanel();
    expect(useNotificationStore.getState().isOpen).toBe(true);

    useNotificationStore.getState().togglePanel();
    expect(useNotificationStore.getState().isOpen).toBe(false);
  });

  it('clearAll 清空所有通知', () => {
    useNotificationStore.setState({
      notifications: [{ id: 'n1', type: 'order_status', title: 'Test', content: 'Test', status: 'unread', priority: 'medium', createdAt: new Date().toISOString() }],
      unreadCount: 1,
      isOpen: true,
    });

    useNotificationStore.getState().clearAll();

    const state = useNotificationStore.getState();
    expect(state.notifications).toEqual([]);
    expect(state.unreadCount).toBe(0);
    expect(state.isOpen).toBe(false);
  });
});












