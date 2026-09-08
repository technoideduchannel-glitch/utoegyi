export interface UserPayload {
  id: number;
  email: string;
  name: string;
  role: "admin" | "shop";
  shopId?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ProductWithInventory {
  id: number;
  name: string;
  sku: string;
  unitPrice: number;
  costPrice: number;
  description?: string | null;
  lowStockThreshold: number;
  isActive: boolean;
  quantity: number;
  isLowStock: boolean;
}

export interface TransferWithDetails {
  id: number;
  productId: number;
  product: { name: string; sku: string };
  fromShopId: number | null;
  fromShop?: { name: string } | null;
  toShopId: number;
  toShop: { name: string };
  quantity: number;
  status: string;
  createdBy: number;
  acceptedBy?: number | null;
  createdAt: string;
  acceptedAt?: string | null;
}

export interface DailySaleWithDetails {
  id: number;
  shopId: number;
  shop: { name: string };
  productId: number;
  product: { name: string; sku: string };
  date: string;
  soldQuantity: number;
  unitPrice: number;
  totalRevenue: number;
  createdBy: number;
  createdAt: string;
}

export interface DamageLossWithDetails {
  id: number;
  shopId: number;
  shop: { name: string };
  productId: number;
  product: { name: string; sku: string };
  quantity: number;
  reason: string;
  reportedBy: number;
  createdAt: string;
}

export interface SalesSummary {
  date: string;
  totalRevenue: number;
  totalSold: number;
}

export interface BranchSalesSummary {
  shopName: string;
  totalRevenue: number;
  totalSold: number;
}

export interface ChartData {
  name: string;
  revenue: number;
  sold: number;
}
