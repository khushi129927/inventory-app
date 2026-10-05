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
  mrp: number;
  status: ProductStatus;
  image?: string;
  description?: string;
  availableBranches?: string[];
  minStock: number;
  previousQuantity: number;
  monthsInInventory?: number;
  monthlyInterest?: number;
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

export type OutstandingStatus = "overdue" | "due_soon" | "not_due";
export type NotifyChannel = "sms" | "whatsapp" | "both" | "none";

export interface SalesPerson {
  id: string;
  name: string;
  phone: string | null;
  notifyChannel: NotifyChannel;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OutstandingSummary {
  totalOutstanding: number;
  overdueAmount: number;
  dueIn7Days: number;
  clientsWithDues: number;
}

export interface OutstandingClientRow {
  clientId: string;
  clientName: string;
  salesPerson: Pick<SalesPerson, "id" | "name" | "phone"> | null;
  creditDays: number;
  totalBalance: number;
  overdueBalance: number;
  nextDueDate: string | null;
  oldestOverdueDays: number;
  invoiceCount: number;
}

export interface OutstandingInvoiceDetail {
  invoiceNo: string;
  invoiceDate: string;
  amount: number;
  paidAmount: number;
  balance: number;
  creditDays: number;
  dueDate: string;
  daysOverdue: number;
}

export interface OutstandingClientDetail {
  id: string;
  name: string;
  creditDays: number;
  salesPerson: Pick<SalesPerson, "id" | "name" | "phone"> | null;
  invoices: OutstandingInvoiceDetail[];
}

export interface OutstandingImportResult {
  created: number;
  updated: number;
  errors: Array<{ row: number; message: string }>;
}

export type NotificationStatus = "queued" | "retrying" | "failed" | "sent" | "dry_run" | "skipped";

export interface PublicOutstandingInvoice {
  invoiceNo: string;
  balance: number;
  dueDate: string;
  daysOverdue: number;
}

export interface PublicOutstandingClient {
  clientName: string;
  creditDays: number;
  totalBalance: number;
  overdueBalance: number;
  invoices: PublicOutstandingInvoice[];
}

export interface PublicOutstandingPayload {
  salesPersonFirstName: string;
  asOf: string;
  grandTotal: number;
  clients: PublicOutstandingClient[];
}

export interface NotificationLogRow {
  id: string;
  createdAt: string;
  scheduledFor: string;
  salesPersonId: string;
  salesPersonName: string;
  phone: string | null;
  channel: "sms" | "whatsapp";
  kind: "due_today" | "manual_test";
  status: NotificationStatus;
  messageText: string;
  errorMessage: string | null;
  providerMessageId: string | null;
}

export interface NotificationLogList {
  notifications: NotificationLogRow[];
  page: number;
  pageSize: number;
  total: number;
  provider: string | null;
}

export interface OrganizationProfile {
  name: string;
  currency: string;
  warehouseLocation: string;
  inviteEmail: string;
  inviteRole: UserRole;
  ownershipTransferTargetUserId: string;
}
