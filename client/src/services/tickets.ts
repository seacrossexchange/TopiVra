import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface Ticket {
  id: string;
  ticket_no: string;
  type: 'REFUND' | 'DM' | 'SUPPORT' | 'COMPLAINT';
  status: string;
  order_id?: string;
  buyer_id: string;
  seller_id?: string;
  admin_id?: string;
  subject: string;
  refund_amount?: number;
  refund_reason?: string;
  refund_evidence?: string[];
  seller_respond_deadline?: string;
  seller_responded_at?: string;
  admin_reviewed_at?: string;
  completed_at?: string;
  closed_at?: string;
  unread_buyer: number;
  unread_seller: number;
  unread_admin: number;
  created_at: string;
  updated_at: string;
  messages?: TicketMessage[];
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_role: 'BUYER' | 'SELLER' | 'ADMIN' | 'SYSTEM';
  content: string;
  attachments?: string[];
  is_internal: boolean;
  created_at: string;
}

export interface CreateRefundTicketDto {
  orderId: string;
  refundReason: string;
  refundEvidence?: string[];
  refundAmount?: number;
}

export interface CreateDMTicketDto {
  sellerId: string;
  subject: string;
  content: string;
  orderId?: string;
}

export interface SendMessageDto {
  content: string;
  attachments?: string[];
  isInternal?: boolean;
}

export interface SellerRespondDto {
  action: 'AGREE' | 'REJECT';
  response?: string;
  rejectReason?: string;
}

export interface EscalateTicketDto {
  reason: string;
}

export interface AdminProcessTicketDto {
  action: 'APPROVE' | 'REJECT';
  adminResponse?: string;
  refundAmount?: number;
}

export interface TicketQueryDto {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

class TicketsService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  // 买家接口
  async createRefundTicket(data: CreateRefundTicketDto) {
    const response = await axios.post(`${API_BASE_URL}/tickets/refund`, data, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async createDMTicket(data: CreateDMTicketDto) {
    const response = await axios.post(`${API_BASE_URL}/tickets/dm`, data, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async getBuyerTickets(params: TicketQueryDto) {
    const response = await axios.get(`${API_BASE_URL}/tickets/buyer`, {
      params,
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async getBuyerStats() {
    const response = await axios.get(`${API_BASE_URL}/tickets/buyer/stats`, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async escalateTicket(ticketNo: string, data: EscalateTicketDto) {
    const response = await axios.put(
      `${API_BASE_URL}/tickets/${ticketNo}/escalate`,
      data,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  // 卖家接口
  async getSellerTickets(params: TicketQueryDto) {
    const response = await axios.get(`${API_BASE_URL}/tickets/seller`, {
      params,
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async getSellerStats() {
    const response = await axios.get(`${API_BASE_URL}/tickets/seller/stats`, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async sellerRespond(ticketNo: string, data: SellerRespondDto) {
    const response = await axios.put(
      `${API_BASE_URL}/tickets/${ticketNo}/seller-respond`,
      data,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  // 管理员接口
  async getAdminTickets(params: TicketQueryDto) {
    const response = await axios.get(`${API_BASE_URL}/tickets/admin`, {
      params,
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async getAdminStats() {
    const response = await axios.get(`${API_BASE_URL}/tickets/admin/stats`, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async adminProcess(ticketNo: string, data: AdminProcessTicketDto) {
    const response = await axios.put(
      `${API_BASE_URL}/tickets/${ticketNo}/admin-process`,
      data,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  // 通用接口
  async getTicket(ticketNo: string) {
    const response = await axios.get(`${API_BASE_URL}/tickets/${ticketNo}`, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async sendMessage(ticketNo: string, data: SendMessageDto) {
    const response = await axios.post(
      `${API_BASE_URL}/tickets/${ticketNo}/messages`,
      data,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async closeTicket(ticketNo: string) {
    const response = await axios.put(
      `${API_BASE_URL}/tickets/${ticketNo}/close`,
      {},
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }
}

export const ticketsService = new TicketsService();
