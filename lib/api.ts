import type {
  Category,
  NotificationLogList,
  NotificationStatus,
  OrderRequest,
  OrderRequestItem,
  OutstandingClientDetail,
  OutstandingClientRow,
  OutstandingImportResult,
  OutstandingSummary,
  Product,
  PublicOutstandingPayload,
  SalesPerson,
  User,
} from "@/app/types/inventory";

export interface LoginResponse {
  token: string;
  user: Pick<User, "id" | "name" | "username" | "role">;
}

export interface ApiOrderRequestInput {
  customerName: string;
  customerEmail: string;
  items: OrderRequestItem[];
}

const DEFAULT_API_BASE_URL = "/api"; // Using Next.js proxy
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function readCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function ensureCsrfToken(): Promise<string | null> {
  const existingToken = readCookie("csrf-token");
  if (existingToken) {
    return existingToken;
  }

  await fetch(`${DEFAULT_API_BASE_URL}/auth/session`, {
    method: "GET",
    credentials: "include",
  });

  return readCookie("csrf-token");
}

async function readResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return response.json();
  return response.text();
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: HeadersInit;
    credentials?: RequestCredentials;
    skipCsrf?: boolean;
  } = {}
): Promise<T> {
  const { method = "GET", body, headers, credentials = "include", skipCsrf = false } = options;
  const normalizedMethod = method.toUpperCase();
  const requestHeaders = new Headers(headers);

  if (body !== undefined && !requestHeaders.has("content-type")) {
    requestHeaders.set("content-type", "application/json");
  }

  if (!skipCsrf && MUTATING_METHODS.has(normalizedMethod) && !requestHeaders.has("x-csrf-token")) {
    const csrfToken = await ensureCsrfToken();
    if (csrfToken) {
      requestHeaders.set("x-csrf-token", csrfToken);
    }
  }

  const response = await fetch(`${DEFAULT_API_BASE_URL}${path}`, {
    method: normalizedMethod,
    credentials,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await readResponseBody(response);
    const message =
      typeof errorBody === "object" && errorBody !== null && "message" in errorBody
        ? String((errorBody as { message?: unknown }).message ?? `Request failed with status ${response.status}`)
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  return (await readResponseBody(response)) as T;
}

export async function apiLogin(username: string, password: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: { username, password },
  });
}

export async function apiGetSession(): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/auth/session");
}

export async function apiGetProducts(
  filters?: Record<string, string | null | undefined> | { search: string; categoryId: string | null; status: string | null }
): Promise<{ products: Product[] }> {
  const normalizedFilters = filters
    ? new URLSearchParams(
        Object.entries(filters).flatMap(([key, value]) =>
          value === null || value === undefined || value === "" ? [] : [[key, value]]
        )
      )
    : undefined;
  const query = normalizedFilters && normalizedFilters.size > 0 ? `?${normalizedFilters.toString()}` : "";
  return apiRequest<{ products: Product[] }>(`/products${query}`);
}

export async function apiCreateProduct(data: Partial<Product>): Promise<Product> {
  return apiRequest<Product>("/products", { method: "POST", body: data });
}

export async function apiUpdateProduct(id: string, data: Partial<Product>): Promise<Product> {
  return apiRequest<Product>(`/products/${id}`, { method: "PATCH", body: data });
}

export async function apiDeleteProduct(id: string): Promise<void> {
  return apiRequest<void>(`/products/${id}`, { method: "DELETE" });
}

export async function apiGetMovements(filters?: any): Promise<{ movements: any[] }> {
  const query = filters ? `?${new URLSearchParams(filters)}` : "";
  return apiRequest<{ movements: any[] }>(`/movements${query}`);
}

export async function apiBulkImportProducts(rows: any[]): Promise<any> {
  return apiRequest<any>("/products/import", {
    method: "POST",
    body: { rows },
  });
}

export async function apiGetCategories(): Promise<{ categories: Category[] }> {
  return apiRequest<{ categories: Category[] }>("/categories");
}

export async function apiUpdateCategoriesGst(gstPercent: number): Promise<{ categories: Category[] }> {
  return apiRequest<{ categories: Category[] }>("/categories/gst", {
    method: "PATCH",
    body: { gstPercent },
  });
}

export async function apiGetBranches(): Promise<{ branches: any[] }> {
  return apiRequest<{ branches: any[] }>("/branches");
}

export async function apiRecordMovement(data: any): Promise<any> {
  return apiRequest<any>("/movements", { method: "POST", body: data });
}

export async function apiCreateOrder(data: ApiOrderRequestInput): Promise<OrderRequest> {
  return apiRequest<OrderRequest>("/order-requests", { method: "POST", body: data });
}

export async function apiGetOrders(): Promise<{ orders: any[] }> {
  return apiRequest<{ orders: any[] }>("/order-requests");
}

export async function apiUpdateOrder(id: string, status: "approved" | "rejected"): Promise<OrderRequest> {
  return apiRequest<OrderRequest>(`/order-requests/${id}`, {
    method: "PATCH",
    body: { status }
  });
}

export async function apiGetOutstandingSummary(): Promise<OutstandingSummary> {
  return apiRequest<OutstandingSummary>("/outstanding/summary");
}

export async function apiGetOutstandingClients(filters?: {
  salesPersonId?: string | null;
  search?: string | null;
  status?: "overdue" | "due_soon" | "not_due" | null;
}): Promise<{ clients: OutstandingClientRow[] }> {
  const normalizedFilters = filters
    ? new URLSearchParams(
        Object.entries(filters).flatMap(([key, value]) =>
          value === null || value === undefined || value === "" ? [] : [[key, value]]
        )
      )
    : undefined;
  const query = normalizedFilters && normalizedFilters.size > 0 ? `?${normalizedFilters.toString()}` : "";
  return apiRequest<{ clients: OutstandingClientRow[] }>(`/outstanding/clients${query}`);
}

export async function apiGetOutstandingClient(id: string): Promise<{ client: OutstandingClientDetail }> {
  return apiRequest<{ client: OutstandingClientDetail }>(`/outstanding/clients/${id}`);
}

export async function apiImportOutstanding(rows: Record<string, unknown>[]): Promise<OutstandingImportResult> {
  return apiRequest<OutstandingImportResult>("/outstanding/import", {
    method: "POST",
    body: { rows },
  });
}

export async function apiUpdateOutstandingClient(
  id: string,
  data: { creditDays?: number; salesPersonId?: string | null; applyToOpenInvoices?: boolean }
): Promise<{ client: OutstandingClientDetail }> {
  return apiRequest<{ client: OutstandingClientDetail }>(`/clients/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export async function apiGetSalesPeople(): Promise<{ salesPeople: SalesPerson[] }> {
  return apiRequest<{ salesPeople: SalesPerson[] }>("/salespeople");
}

export async function apiUpdateSalesPerson(
  id: string,
  data: { phone?: string | null; notifyChannel?: "sms" | "whatsapp" | "both" | "none"; active?: boolean }
): Promise<{ salesPerson: SalesPerson }> {
  return apiRequest<{ salesPerson: SalesPerson }>(`/salespeople/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export async function apiGetOutstandingNotifications(filters?: {
  salesPersonId?: string | null;
  status?: NotificationStatus | null;
  page?: number;
  pageSize?: number;
}): Promise<NotificationLogList> {
  const normalizedFilters = filters
    ? new URLSearchParams(
        Object.entries(filters).flatMap(([key, value]) =>
          value === null || value === undefined || value === "" ? [] : [[key, String(value)]]
        )
      )
    : undefined;
  const query = normalizedFilters && normalizedFilters.size > 0 ? `?${normalizedFilters.toString()}` : "";
  return apiRequest<NotificationLogList>(`/outstanding/notifications${query}`);
}

export async function apiSendOutstandingTestMessage(salesPersonId: string): Promise<{ sent: number }> {
  return apiRequest<{ sent: number }>("/outstanding/notify/test", {
    method: "POST",
    body: { salesPersonId },
  });
}

export async function apiRevokeOutstandingLinks(salesPersonId: string): Promise<{ revoked: number }> {
  return apiRequest<{ revoked: number }>(`/outstanding/salespeople/${salesPersonId}/revoke-links`, {
    method: "POST",
  });
}

export async function apiGetPublicOutstanding(token: string): Promise<PublicOutstandingPayload> {
  return apiRequest<PublicOutstandingPayload>(`/public/outstanding/${encodeURIComponent(token)}`, {
    credentials: "omit",
    skipCsrf: true,
  });
}
