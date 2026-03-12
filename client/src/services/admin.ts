import apiClient from './apiClient';

// Types
export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  role: 'USER' | 'SELLER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  createdAt: string;
}

export interface Product {
  id: string;
  title: string;
  image: string;
  platform: string;
  seller: string;
  price: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ON_SALE';
  submittedAt: string;
}

export interface Order {
  id: string;
  orderNo: string;
  buyer: string;
  seller: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'COMPLETED' | 'REFUNDED' | 'DISPUTED';
  createdAt: string;
}

export interface Seller {
  id: string;
  shopName: string;
  username: string;
  avatar?: string;
  level: 'NORMAL' | 'VERIFIED' | 'PREMIUM';
  productCount: number;
  totalSales: number;
  rating: number;
  status: 'ACTIVE' | 'SUSPENDED';
}

export interface Transaction {
  id: string;
  type: 'ORDER' | 'WITHDRAWAL' | 'REFUND' | 'COMMISSION';
  amount: number;
  balance: number;
  user: string;
  orderNo?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalSellers: number;
  totalOrders: number;
  totalRevenue: number;
  pendingProducts: number;
  pendingSellers: number;
  openTickets: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminQueryParams {
  search?: string;
  status?: string;
  platform?: string;
  level?: string;
  type?: string;
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
}

// Dashboard
export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await apiClient.get('/admin/dashboard/stats');
  return response.data;
}

// Users
export async function getUsers(params: AdminQueryParams = {}): Promise<PaginatedResponse<User>> {
  const response = await apiClient.get('/admin/users', { params });
  return response.data;
}

export async function updateUserStatus(id: string, status: 'ACTIVE' | 'SUSPENDED' | 'BANNED'): Promise<User> {
  const response = await apiClient.patch(`/admin/users/${id}/status`, { status });
  return response.data;
}

export async function deleteUser(id: string): Promise<void> {
  await apiClient.delete(`/admin/users/${id}`);
}

// Products
export async function getProducts(params: AdminQueryParams = {}): Promise<PaginatedResponse<Product>> {
  const response = await apiClient.get('/admin/products', { params });
  return response.data;
}

export async function auditProduct(id: string, approved: boolean, reason?: string): Promise<Product> {
  const response = await apiClient.patch(`/admin/products/${id}/audit`, { approved, reason });
  return response.data;
}

// Orders
export async function getOrders(params: AdminQueryParams = {}): Promise<PaginatedResponse<Order>> {
  const response = await apiClient.get('/admin/orders', { params });
  return response.data;
}

export async function refundOrder(id: string): Promise<Order> {
  const response = await apiClient.patch(`/admin/orders/${id}/refund`);
  return response.data;
}

export async function forceCompleteOrder(id: string): Promise<Order> {
  const response = await apiClient.patch(`/admin/orders/${id}/complete`);
  return response.data;
}

// Sellers
export async function getSellers(params: AdminQueryParams = {}): Promise<PaginatedResponse<Seller>> {
  const response = await apiClient.get('/admin/sellers', { params });
  return response.data;
}

export async function auditSeller(id: string, approved: boolean, reason?: string): Promise<Seller> {
  const response = await apiClient.patch(`/admin/sellers/${id}/audit`, { approved, reason });
  return response.data;
}

export async function updateSellerLevel(id: string, level: 'NORMAL' | 'VERIFIED' | 'PREMIUM'): Promise<Seller> {
  const response = await apiClient.patch(`/admin/sellers/${id}/level`, { level });
  return response.data;
}

export async function toggleSellerStatus(id: string): Promise<Seller> {
  const response = await apiClient.patch(`/admin/sellers/${id}/status`);
  return response.data;
}

// Tickets
export interface Ticket {
  id: string;
  subject: string;
  user: string;
  status: 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: string;
}

export async function getTickets(params: AdminQueryParams = {}): Promise<PaginatedResponse<Ticket>> {
  const response = await apiClient.get('/admin/tickets', { params });
  return response.data;
}

// Logs
export interface LogEntry {
  id: string;
  action: string;
  user: string;
  ip: string;
  details: string;
  createdAt: string;
}

export async function getLogs(params: AdminQueryParams = {}): Promise<PaginatedResponse<LogEntry>> {
  const response = await apiClient.get('/admin/logs', { params });
  return response.data;
}

// Finance - 需要后端添加相关接口
export async function getTransactions(params: AdminQueryParams = {}): Promise<PaginatedResponse<Transaction>> {
  const response = await apiClient.get('/admin/finance/transactions', { params });
  return response.data;
}

// Categories
export interface Category {
  id: string;
  parentId?: string;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string;
  parent?: Category;
  children?: Category[];
}

export interface CreateCategoryPayload {
  parentId?: string;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export async function getCategories(includeInactive = true): Promise<Category[]> {
  const response = await apiClient.get('/categories', { params: { includeInactive } });
  return response.data;
}

export async function getCategoryTree(): Promise<Category[]> {
  const response = await apiClient.get('/categories/tree');
  return response.data;
}

export async function createCategory(data: CreateCategoryPayload): Promise<Category> {
  const response = await apiClient.post('/categories', data);
  return response.data;
}

export async function updateCategory(id: string, data: Partial<CreateCategoryPayload>): Promise<Category> {
  const response = await apiClient.put(`/categories/${id}`, data);
  return response.data;
}

export async function deleteCategory(id: string): Promise<void> {
  await apiClient.delete(`/categories/${id}`);
}

export async function toggleCategoryActive(id: string): Promise<Category> {
  const response = await apiClient.put(`/categories/${id}/toggle-active`);
  return response.data;
}

export async function updateCategorySort(id: string, sortOrder: number): Promise<Category> {
  const response = await apiClient.put(`/categories/${id}/sort`, { sortOrder });
  return response.data;
}

// ==================== 广告位管理 ====================

export interface AdSlot {
  platform: string;
  label: string;
  price: string;
  tag: string;
  enabled: boolean;
}

export async function getAdSlots(): Promise<AdSlot[]> {
  const response = await apiClient.get('/admin/config/ad-slots');
  return response.data;
}

export async function updateAdSlots(slots: AdSlot[]): Promise<AdSlot[]> {
  const response = await apiClient.put('/admin/config/ad-slots', { slots });
  return response.data;
}

export async function getFinanceStats(): Promise<{
  totalRevenue: number;
  totalCommission: number;
  totalWithdrawals: number;
  totalOrders: number;
}> {
  const response = await apiClient.get('/admin/finance/stats');
  return response.data;
}