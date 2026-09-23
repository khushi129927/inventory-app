export type ProductStatus = "in-stock" | "low-stock" | "out-of-stock" | "discontinued";
export type MovementType = "in" | "out" | "adjustment" | "transfer";
export type ActivityType =
  | "product-added"
  | "product-updated"
  | "stock-in"
  | "stock-out"
  | "stock-adjusted"
  | "category-added"
  | "category-updated"
  | "low-stock-alert"
  | "order-requested"
  | "order-approved"
  | "order-rejected";
export type UserRole = "admin" | "manager" | "executive";
export type OrderRequestStatus = "pending" | "approved" | "rejected";

export interface ProductMargin {
  type: "flat" | "percent";
  value: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  serialNumber?: string;
  modelNumber?: string;
  categoryId: string;
  categoryName: string;
  quantity: number;
  price: number;
  status: ProductStatus;
  image?: string;
  description?: string;
  availableBranches?: string[];
  minStock: number;
  previousQuantity: number;
  yesterdayQuantity?: number;
  hasYesterdaySnapshot?: boolean;
  yesterdaySnapshotDate?: string | null;
  shipping?: number;
  installation?: number;
  createdAt: string;
  updatedAt: string;
  paidAmount: number;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  productCount: number;
  color?: string;
  monthlyRate: number;
  gstPercent: number;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  type: MovementType;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  location?: string;
  reference?: string;
  user?: string;
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  type: ActivityType;
  message: string;
  productId?: string;
  productName?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  password: string;
  role: UserRole;
}

export interface OrderRequestItem {
  productId: string;
  productName: string;
  quantity: number;
}

export interface OrderRequest {
  id: string;
  customerName: string;
  customerEmail: string;
  items: OrderRequestItem[];
  status: OrderRequestStatus;
  createdAt: string;
  updatedAt: string;
}

export type SavedBuildStatus = "completed" | "draft" | "archived";

export interface SavedBuildItem {
  category: string;
  productId: string;
  productName: string;
  price: number;
}

export interface SavedBuild {
  id: string;
  name: string;
  status: SavedBuildStatus;
  items: SavedBuildItem[];
  subtotal: number;
  margin: ProductMargin;
  marginAmount: number;
  grandTotal: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationProfile {
  name: string;
  currency: string;
  warehouseLocation: string;
  inviteEmail: string;
  inviteRole: UserRole;
  ownershipTransferTargetUserId: string;
}
