import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { act } from '@testing-library/react';

// ─── Mock 外部依赖 ─────────────────────────────────────────────
vi.mock('@/services/messages', () => ({
  messagesService: {
    getConversations: vi.fn(),
    getMessages: vi.fn(),
    sendMessage: vi.fn(),
    markAsRead: vi.fn(),
    getUnreadCount: vi.fn(),
  },
}));

vi.mock('@/services/websocket', () => ({
  default: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  },
}));

import { useMessageStore } from '../messageStore';
import { messagesService } from '@/services/messages';

// ─── 测试数据 ──────────────────────────────────────────────────
const makeUser = (id: string) => ({
  id,
  username: `user_${id}`,
  email: `${id}@example.com`,
  avatar: null,
});

const makeConversation = (otherUserId: string, unreadCount = 0) => ({
  otherUser: makeUser(otherUserId),
  lastMessage: '上次的消息',
  lastMessageAt: new Date().toISOString(),
  unreadCount,
});

const makeMessage = (id: string, senderId = 'me', receiverId = 'other') => ({
  id,
  senderId,
  receiverId,
  content: `消息内容 ${id}`,
  isRead: false,
  readAt: null,
  createdAt: new Date().toISOString(),
});

// ─── 重置 store ────────────────────────────────────────────────
const resetStore = () =>
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

// ──────────────────────────────────────────────────────────────
describe('useMessageStore', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ── 初始状态 ────────────────────────────────────────────────
  describe('初始状态', () => {
    it('应具备正确的初始值', () => {
      const state = useMessageStore.getState();
      expect(state.conversations).toEqual([]);
      expect(state.messages).toEqual([]);
      expect(state.unreadCount).toBe(0);
      expect(state.isLoading).toBe(false);
      expect(state.hasMore).toBe(true);
      expect(state.error).toBeNull();
    });
  });

  // ── fetchConversations ──────────────────────────────────────
  describe('fetchConversations', () => {
    it('成功获取会话列表 → 应更新 conversations 并汇总 unreadCount', async () => {
      const convs = [
        makeConversation('user-a', 3),
        makeConversation('user-b', 2),
      ];
      vi.mocked(messagesService.getConversations).mockResolvedValueOnce({
        items: convs,
        total: 2,
      } as any);

      await act(async () => {
        await useMessageStore.getState().fetchConversations();
      });

      const state = useMessageStore.getState();
      expect(state.conversations).toHaveLength(2);
      expect(state.unreadCount).toBe(5); // 3 + 2
      expect(state.isLoading).toBe(false);
    });

    it('API 失败 → 应设置 error', async () => {
      vi.mocked(messagesService.getConversations).mockRejectedValueOnce(
        new Error('Network Error'),
      );

      await act(async () => {
        await useMessageStore.getState().fetchConversations();
      });

      expect(useMessageStore.getState().error).toBeTruthy();
      expect(useMessageStore.getState().isLoading).toBe(false);
    });

    it('返回空列表 → unreadCount 应为 0', async () => {
      vi.mocked(messagesService.getConversations).mockResolvedValueOnce({
        items: [],
        total: 0,
      } as any);

      await act(async () => {
        await useMessageStore.getState().fetchConversations();
      });

      expect(useMessageStore.getState().unreadCount).toBe(0);
    });
  });

  // ── fetchMessages ───────────────────────────────────────────
  describe('fetchMessages', () => {
    it('reset=true → 应清空旧消息并加载新消息', async () => {
      const msgs = [makeMessage('m1'), makeMessage('m2')];
      vi.mocked(messagesService.getMessages).mockResolvedValueOnce(msgs as any);

      await act(async () => {
        await useMessageStore.getState().fetchMessages('user-a', true);
      });

      expect(useMessageStore.getState().messages).toHaveLength(2);
      expect(useMessageStore.getState().isLoading).toBe(false);
    });

    it('reset=false → 应追加消息（加载更多）', async () => {
      useMessageStore.setState({
        messages: [makeMessage('m0')] as any,
        hasMore: true,
        isLoadingMore: false,
      });
      const moreMsgs = [makeMessage('m1'), makeMessage('m2')];
      vi.mocked(messagesService.getMessages).mockResolvedValueOnce(moreMsgs as any);

      await act(async () => {
        await useMessageStore.getState().fetchMessages('user-a', false);
      });

      expect(useMessageStore.getState().messages).toHaveLength(3);
    });

    it('返回消息数少于 limit → hasMore 应为 false', async () => {
      vi.mocked(messagesService.getMessages).mockResolvedValueOnce([
        makeMessage('m1'),
      ] as any); // 1 条 < limit(20)

      await act(async () => {
        await useMessageStore.getState().fetchMessages('user-a', true);
      });

      expect(useMessageStore.getState().hasMore).toBe(false);
    });

    it('isLoadingMore=true 时 → 不应重复发起请求', async () => {
      useMessageStore.setState({ isLoadingMore: true, hasMore: true });

      await act(async () => {
        await useMessageStore.getState().fetchMessages('user-a', false);
      });

      expect(messagesService.getMessages).not.toHaveBeenCalled();
    });

    it('hasMore=false 时 → 不应继续加载', async () => {
      useMessageStore.setState({ hasMore: false, isLoadingMore: false });

      await act(async () => {
        await useMessageStore.getState().fetchMessages('user-a', false);
      });

      expect(messagesService.getMessages).not.toHaveBeenCalled();
    });

    it('API 失败 → 应设置 error 并清除 loading 状态', async () => {
      vi.mocked(messagesService.getMessages).mockRejectedValueOnce(
        new Error('Failed'),
      );

      await act(async () => {
        await useMessageStore.getState().fetchMessages('user-a', true);
      });

      expect(useMessageStore.getState().error).toBeTruthy();
      expect(useMessageStore.getState().isLoading).toBe(false);
      expect(useMessageStore.getState().isLoadingMore).toBe(false);
    });
  });

  // ── sendMessage ─────────────────────────────────────────────
  describe('sendMessage', () => {
    it('发送成功 → 应将消息追加到列表末尾', async () => {
      const sent = makeMessage('new-msg', 'me', 'user-a');
      vi.mocked(messagesService.sendMessage).mockResolvedValueOnce(sent as any);

      let result: any;
      await act(async () => {
        result = await useMessageStore.getState().sendMessage({
          receiverId: 'user-a',
          content: '消息内容 new-msg',
        } as any);
      });

      expect(result.id).toBe('new-msg');
      expect(useMessageStore.getState().messages).toHaveLength(1);
      expect(useMessageStore.getState().messages[0].id).toBe('new-msg');
    });

    it('发送成功 → 应更新对应会话的 lastMessage', async () => {
      useMessageStore.setState({
        conversations: [makeConversation('user-a')] as any,
      });
      const sent = makeMessage('msg1', 'me', 'user-a');
      vi.mocked(messagesService.sendMessage).mockResolvedValueOnce(sent as any);

      await act(async () => {
        await useMessageStore.getState().sendMessage({
          receiverId: 'user-a',
          content: '消息内容 msg1',
        } as any);
      });

      const conv = useMessageStore.getState().conversations[0];
      expect(conv.lastMessage).toBe('消息内容 msg1');
    });

    it('发送失败 → 应向上抛出错误', async () => {
      vi.mocked(messagesService.sendMessage).mockRejectedValueOnce(
        new Error('Send failed'),
      );

      await expect(
        act(async () => {
          await useMessageStore.getState().sendMessage({
            receiverId: 'user-a',
            content: 'test',
          } as any);
        }),
      ).rejects.toThrow();
    });
  });

  // ── markAsRead ──────────────────────────────────────────────
  describe('markAsRead', () => {
    it('空数组 → 不应发起 API 请求', async () => {
      await act(async () => {
        await useMessageStore.getState().markAsRead([]);
      });

      expect(messagesService.markAsRead).not.toHaveBeenCalled();
    });

    it('成功标记 → 应将指定消息 isRead 更新为 true', async () => {
      useMessageStore.setState({
        messages: [
          makeMessage('m1'),
          makeMessage('m2'),
        ] as any,
      });
      vi.mocked(messagesService.markAsRead).mockResolvedValueOnce(undefined as any);
      vi.mocked(messagesService.getUnreadCount).mockResolvedValueOnce({ count: 0 } as any);

      await act(async () => {
        await useMessageStore.getState().markAsRead(['m1']);
      });

      const msgs = useMessageStore.getState().messages;
      expect(msgs.find((m) => m.id === 'm1')?.isRead).toBe(true);
      expect(msgs.find((m) => m.id === 'm2')?.isRead).toBe(false);
    });
  });

  // ── addRealtimeMessage ──────────────────────────────────────
  describe('addRealtimeMessage（WebSocket 实时消息）', () => {
    it('当前会话的消息 → 应追加到 messages 列表', () => {
      useMessageStore.setState({
        currentConversation: makeConversation('user-a') as any,
        messages: [],
        conversations: [makeConversation('user-a', 0)] as any,
        unreadCount: 0,
      });

      act(() => {
        useMessageStore
          .getState()
          .addRealtimeMessage(makeMessage('rt1', 'user-a', 'me') as any);
      });

      expect(useMessageStore.getState().messages).toHaveLength(1);
    });

    it('非当前会话消息 → 不追加 messages，但应更新会话列表', () => {
      useMessageStore.setState({
        currentConversation: makeConversation('user-b') as any,
        messages: [],
        conversations: [makeConversation('user-a', 0)] as any,
        unreadCount: 0,
      });

      act(() => {
        useMessageStore
          .getState()
          .addRealtimeMessage(makeMessage('rt2', 'user-a', 'me') as any);
      });

      // messages 不应增加
      expect(useMessageStore.getState().messages).toHaveLength(0);
    });
  });

  // ── clearMessages / reset ───────────────────────────────────
  describe('clearMessages & reset', () => {
    it('clearMessages → 应清空 messages 和 currentConversation', () => {
      useMessageStore.setState({
        messages: [makeMessage('m1')] as any,
        currentConversation: makeConversation('user-a') as any,
      });

      act(() => useMessageStore.getState().clearMessages());

      expect(useMessageStore.getState().messages).toEqual([]);
      expect(useMessageStore.getState().currentConversation).toBeNull();
    });

    it('reset → 应将所有状态恢复为初始值', () => {
      useMessageStore.setState({
        conversations: [makeConversation('user-a')] as any,
        unreadCount: 5,
        error: '某个错误',
        hasMore: false,
      });

      act(() => useMessageStore.getState().reset());

      const state = useMessageStore.getState();
      expect(state.conversations).toEqual([]);
      expect(state.unreadCount).toBe(0);
      expect(state.error).toBeNull();
      expect(state.hasMore).toBe(true);
    });
  });

  // ── setCurrentConversation ──────────────────────────────────
  describe('setCurrentConversation', () => {
    it('设置会话 → 应更新 currentConversation 并清空 messages', () => {
      useMessageStore.setState({
        messages: [makeMessage('m1')] as any,
      });
      const conv = makeConversation('user-a');

      act(() => useMessageStore.getState().setCurrentConversation(conv as any));

      expect(useMessageStore.getState().currentConversation).toEqual(conv);
      expect(useMessageStore.getState().messages).toEqual([]);
    });

    it('传入 null → 应清除当前会话', () => {
      useMessageStore.setState({
        currentConversation: makeConversation('user-a') as any,
      });

      act(() => useMessageStore.getState().setCurrentConversation(null));

      expect(useMessageStore.getState().currentConversation).toBeNull();
    });
  });
});

























