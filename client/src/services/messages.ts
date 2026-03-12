import apiClient from './apiClient';

// 消息类型
export type MessageType = 'TEXT' | 'IMAGE' | 'FILE';

// 消息接口
export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  conversationId: string;
  content: string;
  messageType: MessageType;
  attachments?: string[];
  orderId?: string;
  productId?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  sender: {
    id: string;
    username: string;
    avatar?: string;
  };
}

// 会话接口
export interface Conversation {
  id: string;
  otherUser: {
    id: string;
    username: string;
    avatar?: string;
  };
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  createdAt: string;
}

// 发送消息DTO
export interface SendMessageDto {
  receiverId: string;
  content: string;
  messageType?: MessageType;
  attachments?: string[];
  orderId?: string;
  productId?: string;
}

// 消息查询参数
export interface MessageQueryParams {
  userId?: string;
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

// 会话查询参数
export interface ConversationQueryParams {
  page?: number;
  limit?: number;
}

// 标记已读DTO
export interface MarkAsReadDto {
  messageIds: string[];
}

// API响应类型
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  timestamp: string;
}

// 消息服务
export const messagesService = {
  /**
   * 发送消息
   */
  async sendMessage(data: SendMessageDto): Promise<Message> {
    const response = await apiClient.post<ApiResponse<Message>>('/messages', data);
    return response.data.data;
  },

  /**
   * 获取会话列表
   */
  async getConversations(params?: ConversationQueryParams): Promise<{
    items: Conversation[];
    total: number;
    page: number;
    limit: number;
  }> {
    const response = await apiClient.get<ApiResponse<{
      items: Conversation[];
      total: number;
      page: number;
      limit: number;
    }>>('/messages/conversations', { params });
    return response.data.data;
  },

  /**
   * 获取与某用户的消息列表
   */
  async getMessages(params: MessageQueryParams): Promise<Message[]> {
    const response = await apiClient.get<ApiResponse<Message[]>>('/messages', { params });
    return response.data.data;
  },

  /**
   * 标记消息为已读
   */
  async markAsRead(data: MarkAsReadDto): Promise<{ updated: number }> {
    const response = await apiClient.patch<ApiResponse<{ updated: number }>>('/messages/read', data);
    return response.data.data;
  },

  /**
   * 获取未读消息数
   */
  async getUnreadCount(): Promise<{ count: number }> {
    const response = await apiClient.get<ApiResponse<{ count: number }>>('/messages/unread-count');
    return response.data.data;
  },

  /**
   * 删除消息
   */
  async deleteMessage(messageId: string): Promise<{ success: boolean }> {
    const response = await apiClient.delete<ApiResponse<{ success: boolean }>>(`/messages/${messageId}`);
    return response.data.data;
  },
};

export default messagesService;