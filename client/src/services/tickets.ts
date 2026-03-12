import apiClient from './apiClient';

export interface Ticket {
  id: string;
  ticketNo: string;
  userId: string;
  type: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'CLOSED';
  subject: string;
  content: string;
  assignedTo?: string;
  slaLevel?: string;
  slaDeadline?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    username: string;
    email?: string;
    avatar?: string;
  };
  assignee?: {
    id: string;
    username: string;
    avatar?: string;
  };
  messages?: TicketMessage[];
  _count?: {
    messages: number;
  };
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  content: string;
  isInternal: boolean;
  attachments?: any;
  createdAt: string;
  sender?: {
    id: string;
    username: string;
    avatar?: string;
  };
}

export interface CreateTicketDto {
  type: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  subject: string;
  content: string;
}

export interface ReplyTicketDto {
  content: string;
  isInternal?: boolean;
  attachments?: any;
}

export interface QueryTicketDto {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  type?: string;
}

export interface TicketListResponse {
  items: Ticket[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 创建工单
export const createTicket = async (data: CreateTicketDto): Promise<Ticket> => {
  const response = await apiClient.post('/tickets', data);
  return response.data;
};

// 获取用户的工单列表
export const getUserTickets = async (params?: QueryTicketDto): Promise<TicketListResponse> => {
  const response = await apiClient.get('/tickets/my', { params });
  return response.data;
};

// 获取所有工单（管理员）
export const getAllTickets = async (params?: QueryTicketDto): Promise<TicketListResponse> => {
  const response = await apiClient.get('/tickets', { params });
  return response.data;
};

// 获取工单详情
export const getTicketDetail = async (id: string): Promise<Ticket> => {
  const response = await apiClient.get(`/tickets/${id}`);
  return response.data;
};

// 回复工单
export const replyTicket = async (id: string, data: ReplyTicketDto): Promise<TicketMessage> => {
  const response = await apiClient.post(`/tickets/${id}/reply`, data);
  return response.data;
};

// 更新工单状态
export const updateTicket = async (
  id: string,
  data: { status?: string; priority?: string; assigneeId?: string }
): Promise<Ticket> => {
  const response = await apiClient.patch(`/tickets/${id}`, data);
  return response.data;
};

// 关闭工单
export const closeTicket = async (id: string): Promise<Ticket> => {
  const response = await apiClient.post(`/tickets/${id}/close`);
  return response.data;
};

// 指派工单（管理员）
export const assignTicket = async (id: string, assigneeId: string): Promise<Ticket> => {
  const response = await apiClient.post(`/tickets/${id}/assign`, { assigneeId });
  return response.data;
};

// 获取工单统计
export const getTicketStats = async (): Promise<any> => {
  const response = await apiClient.get('/tickets/stats');
  return response.data;
};

