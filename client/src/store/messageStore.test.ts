import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMessageStore } from './messageStore';
import * as messagesService from '@/services/messages';

vi.mock('@/services/messages');

describe('useMessageStore', () => {
  beforeEach(() => {
    useMessageStore.setState({
      conversations: [],
      currentConversation: null,
      messages: [],
      unreadCount: 0,
      isLoading: false,
      isLoadingMore: false,
      hasMore: true,
      error: null,
    });
    vi.clearAllMocks();
  });

  it('初始状态正确', () => {
    const state = useMessageStore.getState();
    expect(state.conversations).toEqual([]);
    expect(state.messages).toEqual([]);
    expect(state.unreadCount).toBe(0);
    expect(state.hasMore).toBe(true);
  });

  it('fetchConversations 成功加载会话列表', async () => {
    const mockConversations = [
      { id: 'c1', otherUser: { id: 'u1', username: 'user1' }, unreadCount: 2, lastMessage: 'Hi' },
      { id: 'c2', otherUser: { id: 'u2', username: 'user2' }, unreadCount: 0, lastMessage: 'Hello' },
    ];

    vi.mocked(messagesService.messagesService.getConversations).mockResolvedValue({
      items: mockConversations,
    } as any);

    await useMessageStore.getState().fetchConversations();

    const state = useMessageStore.getState();
    expect(state.conversations).toEqual(mockConversations);
    expect(state.unreadCount).toBe(2); // 2 + 0
    expect(state.isLoading).toBe(false);
  });

  it('fetchConversations 失败时保留现有数据', async () => {
    const existingConv = { id: 'c1', otherUser: { id: 'u1', username: 'user1' }, unreadCount: 1 };
    useMessageStore.setState({ conversations: [existingConv] });

    vi.mocked(messagesService.messagesService.getConversations).mockRejectedValue(
      new Error('Network error')
    );

    await useMessageStore.getState().fetchConversations();

    const state = useMessageStore.getState();
    expect(state.conversations).toEqual([existingConv]); // 保留原数据
    expect(state.error).toBeTruthy();
  });

  it('fetchMessages 首次加载成功', async () => {
    const mockMessages = [
      { id: 'm1', content: 'Hello', senderId: 'u1', receiverId: 'u2', isRead: false },
      { id: 'm2', content: 'Hi', senderId: 'u2', receiverId: 'u1', isRead: true },
    ];

    vi.mocked(messagesService.messagesService.getMessages).mockResolvedValue(mockMessages as any);

    await useMessageStore.getState().fetchMessages('u1', true);

    const state = useMessageStore.getState();
    expect(state.messages).toEqual(mockMessages);
    expect(state.hasMore).toBe(false); // 返回数 < limit(20)
    expect(state.isLoading).toBe(false);
  });

  it('fetchMessages 加载更多时追加数据', async () => {
    const existingMessages = [
      { id: 'm1', content: 'Old', senderId: 'u1', receiverId: 'u2', isRead: true },
    ];
    useMessageStore.setState({ messages: existingMessages, hasMore: true });

    const newMessages = [
      { id: 'm2', content: 'New', senderId: 'u2', receiverId: 'u1', isRead: false },
    ];

    vi.mocked(messagesService.messagesService.getMessages).mockResolvedValue(newMessages as any);

    await useMessageStore.getState().fetchMessages('u1', false);

    const state = useMessageStore.getState();
    expect(state.messages).toHaveLength(2);
    expect(state.messages[0].id).toBe('m2'); // 新消息在前
    expect(state.messages[1].id).toBe('m1');
  });

  it('fetchMessages 防止并发加载', async () => {
    useMessageStore.setState({ isLoadingMore: true, hasMore: true });

    vi.mocked(messagesService.messagesService.getMessages).mockResolvedValue([] as any);

    await useMessageStore.getState().fetchMessages('u1', false);

    // 由于 isLoadingMore 为 true，不应调用 API
    expect(messagesService.messagesService.getMessages).not.toHaveBeenCalled();
  });

  it('markAsRead 更新消息状态', async () => {
    useMessageStore.setState({
      messages: [
        { id: 'm1', content: 'Test', senderId: 'u1', receiverId: 'u2', isRead: false },
      ],
      unreadCount: 1,
    });

    vi.mocked(messagesService.messagesService.markAsRead).mockResolvedValue({} as any);
    vi.mocked(messagesService.messagesService.getUnreadCount).mockResolvedValue({
      count: 0,
    } as any);

    await useMessageStore.getState().markAsRead('m1');

    const state = useMessageStore.getState();
    expect(state.messages[0].isRead).toBe(true);
    expect(state.unreadCount).toBe(0);
  });

  it('sendMessage 添加到列表并更新会话', async () => {
    const mockMessage = {
      id: 'm1',
      content: 'Hello',
      senderId: 'u1',
      receiverId: 'u2',
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    vi.mocked(messagesService.messagesService.sendMessage).mockResolvedValue(mockMessage as any);

    const result = await useMessageStore.getState().sendMessage({
      receiverId: 'u2',
      content: 'Hello',
    });

    const state = useMessageStore.getState();
    expect(result).toEqual(mockMessage);
    expect(state.messages).toContainEqual(mockMessage);
  });

  it('setCurrentConversation 清空消息列表', () => {
    useMessageStore.setState({
      messages: [{ id: 'm1', content: 'Old', senderId: 'u1', receiverId: 'u2', isRead: true }],
    });

    const conv = { id: 'c1', otherUser: { id: 'u2', username: 'user2' }, unreadCount: 0 };
    useMessageStore.getState().setCurrentConversation(conv);

    const state = useMessageStore.getState();
    expect(state.currentConversation).toEqual(conv);
    expect(state.messages).toEqual([]);
  });

  it('clearMessages 清空所有消息', () => {
    useMessageStore.setState({
      messages: [{ id: 'm1', content: 'Test', senderId: 'u1', receiverId: 'u2', isRead: false }],
      currentConversation: { id: 'c1', otherUser: { id: 'u2', username: 'user2' }, unreadCount: 1 },
    });

    useMessageStore.getState().clearMessages();

    const state = useMessageStore.getState();
    expect(state.messages).toEqual([]);
    expect(state.currentConversation).toBeNull();
  });
});

