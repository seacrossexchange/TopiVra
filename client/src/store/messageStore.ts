import { create } from 'zustand';
import type { Message, Conversation, SendMessageDto } from '@/services/messages';
import { messagesService } from '@/services/messages';
import wsService from '@/services/websocket';

interface MessageState {
  // 状态
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  unreadCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;

  // 操作
  fetchConversations: () => Promise<void>;
  fetchMessages: (userId: string, reset?: boolean) => Promise<void>;
  sendMessage: (data: SendMessageDto) => Promise<Message>;
  markAsRead: (messageIds: string[]) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  setCurrentConversation: (conversation: Conversation | null) => void;
  addRealtimeMessage: (message: Message) => void;
  clearMessages: () => void;
  reset: () => void;
}

const initialState = {
  conversations: [],
  currentConversation: null,
  messages: [],
  unreadCount: 0,
  isLoading: false,
  isLoadingMore: false,
  hasMore: true,
  error: null,
};

export const useMessageStore = create<MessageState>((set, get) => ({
  ...initialState,

  fetchConversations: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await messagesService.getConversations({ limit: 50 });
      // 空结果处理：正常情况，无会话时返回空数组
      const items = result.items ?? [];
      set({
        conversations: items,
        isLoading: false,
        unreadCount: items.reduce((sum, conv) => sum + (conv.unreadCount ?? 0), 0),
        error: null,
      });
    } catch (error: unknown) {
      const errorMsg =
        error instanceof Error ? error.message : '获取会话列表失败';
      set({
        error: errorMsg,
        isLoading: false,
        // 网络错误时保留已有会话数据，不清空
      });
    }
  },

  fetchMessages: async (userId: string, reset = true) => {
    const { messages, isLoadingMore } = get();

    if (reset) {
      set({ isLoading: true, messages: [], hasMore: true, error: null });
    } else {
      // 防止并发加载：正在加载中或已无更多数据时直接返回
      if (isLoadingMore || !get().hasMore) return;
      set({ isLoadingMore: true, error: null });
    }

    try {
      const limit = 20;
      const page = reset ? 1 : Math.floor(messages.length / limit) + 1;

      const newMessages = await messagesService.getMessages({
        userId,
        limit,
        page,
      });

      // 空结果处理：无论是首次还是加载更多，空数组均表示已无更多数据
      const hasMore = newMessages.length === limit;

      set(state => ({
        messages: reset ? newMessages : [...newMessages, ...state.messages],
        isLoading: false,
        isLoadingMore: false,
        hasMore,
        error: null,
      }));
    } catch (error: unknown) {
      const errorMsg =
        error instanceof Error ? error.message : '获取消息列表失败';
      set({
        error: errorMsg,
        isLoading: false,
        isLoadingMore: false,
        // 加载失败时不改变 hasMore，允许用户重试
      });
    }
  },

  sendMessage: async (data: SendMessageDto) => {
    const message = await messagesService.sendMessage(data);
    
    // 添加到消息列表
    set(state => ({
      messages: [...state.messages, message],
    }));

    // 更新会话列表中的最后消息
    set(state => ({
      conversations: state.conversations.map(conv => 
        conv.otherUser.id === data.receiverId
          ? { ...conv, lastMessage: data.content, lastMessageAt: new Date().toISOString() }
          : conv
      ),
    }));

    return message;
  },

  markAsRead: async (messageIds: string[]) => {
    if (messageIds.length === 0) return;
    
    await messagesService.markAsRead({ messageIds });
    
    // 更新本地消息状态
    set(state => ({
      messages: state.messages.map(msg => 
        messageIds.includes(msg.id) ? { ...msg, isRead: true, readAt: new Date().toISOString() } : msg
      ),
    }));

    // 更新未读数
    get().fetchUnreadCount();
  },

  fetchUnreadCount: async () => {
    try {
      const result = await messagesService.getUnreadCount();
      set({ unreadCount: result.count });
    } catch (error) {
      console.error('获取未读消息数失败:', error);
    }
  },

  setCurrentConversation: (conversation) => {
    set({ currentConversation: conversation, messages: [] });
  },

  addRealtimeMessage: (message) => {
    const { currentConversation, messages } = get();
    
    // 如果是当前会话的消息，添加到列表
    if (currentConversation && 
        (message.senderId === currentConversation.otherUser.id || 
         message.receiverId === currentConversation.otherUser.id)) {
      set({ messages: [...messages, message] });
    }

    // 更新会话列表
    set(state => {
      const otherUserId = message.senderId === state.currentConversation?.otherUser.id 
        ? message.senderId 
        : message.receiverId;
      
      const existingConvIndex = state.conversations.findIndex(
        conv => conv.otherUser.id === otherUserId
      );

      const newConversations = [...state.conversations];
      
      if (existingConvIndex >= 0) {
        // 更新现有会话
        newConversations[existingConvIndex] = {
          ...newConversations[existingConvIndex],
          lastMessage: message.content,
          lastMessageAt: message.createdAt,
          unreadCount: newConversations[existingConvIndex].unreadCount + 
                       (message.senderId === otherUserId ? 1 : 0),
        };
        // 移到列表顶部
        const conv = newConversations.splice(existingConvIndex, 1)[0];
        newConversations.unshift(conv);
      }

      // 更新总未读数
      const unreadDelta = message.senderId !== state.currentConversation?.otherUser.id ? 1 : 0;

      return {
        conversations: newConversations,
        unreadCount: state.unreadCount + unreadDelta,
      };
    });
  },

  clearMessages: () => {
    set({ messages: [], currentConversation: null });
  },

  reset: () => {
    set(initialState);
  },
}));

// 初始化 WebSocket 监听
export const initMessageWebSocket = () => {
  // 监听新消息
  wsService.on('message:new' as any, (message: Message) => {
    useMessageStore.getState().addRealtimeMessage(message);
  });

  // 监听消息已读
  wsService.on('message:read' as any, (data: { messageIds: string[] }) => {
    const state = useMessageStore.getState();
    state.markAsRead(data.messageIds);
  });
};

export default useMessageStore;