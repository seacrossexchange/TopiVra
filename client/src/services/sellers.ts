import apiClient from './apiClient';

// ==================== Types ====================

export interface ApplySellerDto {
  shopName: string;
  description?: string;
  contactInfo?: string;
}

export interface UpdateSellerProfileDto {
  shopName?: string;
  description?: string;
  contactInfo?: string;
}

export interface RequestWithdrawalDto {
  amount: number;
  paymentMethod: string;
  paymentAddress: string;
}

export interface TransactionFilters {
  page?: number;
  limit?: number;
  type?: string;
  startDate?: string;
  endDate?: string;
}

export interface SellerProfile {
  id: number;
  userId: number;
  shopName: string;
  description?: string;
  contactInfo?: string;
  level: string;
  status: string;
  totalSales: number;
  rating: number;
  productCount: number;
  createdAt: string;
}

export interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  availableBalance: number;
  frozenBalance: number;
}

export interface ProductsStats {
  activeProducts: number;
  pendingProducts: number;
  rejectedProducts: number;
  totalStock: number;
}

export interface Withdrawal {
  id: number;
  withdrawalNo: string;
  amount: number;
  paymentMethod: string;
  paymentAddress: string;
  status: string;
  createdAt: string;
  processedAt?: string;
}

export interface Transaction {
  id: number;
  transactionNo: string;
  type: string;
  amount: number;
  balance: number;
  description: string;
  createdAt: string;
}

export interface SellerOrder {
  id: number;
  orderNo: string;
  buyerId: number;
  buyerName: string;
  productId: number;
  productTitle: string;
  amount: number;
  status: string;
  createdAt: string;
}

// ==================== API Functions ====================

/**
 * Apply to become a seller
 */
export async function applySeller(data: ApplySellerDto): Promise<SellerProfile> {
  const response = await apiClient.post('/sellers/apply', data);
  return response.data;
}

/**
 * Get seller profile
 */
export async function getSellerProfile(): Promise<SellerProfile> {
  const response = await apiClient.get('/sellers/profile');
  return response.data;
}

/**
 * Update seller profile
 */
export async function updateSellerProfile(data: UpdateSellerProfileDto): Promise<SellerProfile> {
  const response = await apiClient.put('/sellers/profile', data);
  return response.data;
}

/**
 * Get seller dashboard stats
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await apiClient.get('/sellers/dashboard/stats');
  return response.data;
}

/**
 * Get seller products stats
 */
export async function getProductsStats(): Promise<ProductsStats> {
  const response = await apiClient.get('/sellers/dashboard/products-stats');
  return response.data;
}

/**
 * Request a withdrawal
 */
export async function requestWithdrawal(data: RequestWithdrawalDto): Promise<Withdrawal> {
  const response = await apiClient.post('/sellers/withdrawals', data);
  return response.data;
}

/**
 * Get withdrawals list
 */
export async function getWithdrawals(
  page: number = 1,
  limit: number = 10
): Promise<{ data: Withdrawal[]; total: number; page: number; limit: number }> {
  const response = await apiClient.get('/sellers/withdrawals', {
    params: { page, limit },
  });
  return response.data;
}

/**
 * Get withdrawal detail
 */
export async function getWithdrawalDetail(withdrawalNo: string): Promise<Withdrawal> {
  const response = await apiClient.get(`/sellers/withdrawals/${withdrawalNo}`);
  return response.data;
}

/**
 * Get transactions list
 */
export async function getTransactions(
  filters: TransactionFilters = {}
): Promise<{ data: Transaction[]; total: number; page: number; limit: number }> {
  const response = await apiClient.get('/sellers/transactions', {
    params: filters,
  });
  return response.data;
}

/**
 * Get seller orders
 */
export async function getSellerOrders(
  page: number = 1,
  limit: number = 10,
  status?: string
): Promise<{ data: SellerOrder[]; total: number; page: number; limit: number }> {
  const response = await apiClient.get('/sellers/orders', {
    params: { page, limit, status },
  });
  return response.data;
}

// ==================== Promotion Types ====================

export interface PromotionData {
  label?: string;
  type: 'PERCENTAGE' | 'FIXED' | 'FLASH_SALE';
  discountValue: number;
  startDate: string;
  endDate: string;
  flashSaleEndTime?: string;
  quantity?: number;
}

export interface PromotionResponse {
  productId: number;
  promotion: {
    id: number;
    type: string;
    discountValue: number;
    startDate: string;
    endDate: string;
    isActive: boolean;
  } | null;
}

// ==================== Promotion API ====================

/**
 * Set promotion for a product
 */
export async function setPromotion(
  productId: string | number,
  data: PromotionData
): Promise<PromotionResponse> {
  const response = await apiClient.patch(`/sellers/products/${productId}/promotion`, data);
  return response.data;
}

/**
 * Remove promotion from a product
 */
export async function removePromotion(productId: string | number): Promise<void> {
  await apiClient.delete(`/sellers/products/${productId}/promotion`);
}

/**
 * Get promotion details for a product
 */
export async function getPromotion(productId: string | number): Promise<PromotionResponse> {
  const response = await apiClient.get(`/sellers/products/${productId}/promotion`);
  return response.data;
}

// ==================== Public Seller Info ====================

export interface PublicSellerInfo {
  id: number;
  shopName: string;
  description?: string;
  level: 'NORMAL' | 'VERIFIED' | 'PREMIUM';
  rating: number;
  totalSales: number;
  positiveRate: number;
  avgDeliveryTime: number; // in hours
  memberSince: string;
  avatar?: string;
  productCount: number;
}

/**
 * Get public seller information by seller ID
 */
export async function getPublicSellerInfo(sellerId: number | string): Promise<PublicSellerInfo> {
  const response = await apiClient.get(`/sellers/${sellerId}/public`);
  return response.data;
}

// ==================== Export Default ====================

export default {
  applySeller,
  getSellerProfile,
  updateSellerProfile,
  getDashboardStats,
  getProductsStats,
  requestWithdrawal,
  getWithdrawals,
  getWithdrawalDetail,
  getTransactions,
  getSellerOrders,
  getPublicSellerInfo,
  // Promotion APIs
  setPromotion,
  removePromotion,
  getPromotion,
};
