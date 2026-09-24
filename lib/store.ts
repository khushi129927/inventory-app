import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ActivityItem,
  Category,
  OrganizationProfile,
  Product,
  SavedBuild,
  User,
  UserRole,
  StockMovement,
} from "@/app/types/inventory";

type ActivityInput = Omit<ActivityItem, "id" | "createdAt"> & Partial<Pick<ActivityItem, "id" | "createdAt">>;

export interface GstConfig {
  mode: "percentage" | "amount";
  value: number;
}

interface InventoryUIState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  organization: OrganizationProfile;
  updateOrganization: (updates: Partial<OrganizationProfile>) => void;
  gstConfig: GstConfig;
  updateGstConfig: (updates: Partial<GstConfig>) => void;
  builderVersion: number;
}

interface InventoryStoreState extends InventoryUIState {
  currentUser: User | null;
  products: Product[];
  categories: Category[];
  movements: StockMovement[];
  activities: ActivityItem[];
  savedBuilds: SavedBuild[];
  saveBuild: (build: SavedBuild) => void;
  deleteSavedBuild: (id: string) => void;
  addProduct: (product: Product) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addActivity: (activity: ActivityInput) => void;
  resetWorkspaceData: () => void;
}

const DEFAULT_ORGANIZATION: OrganizationProfile = {
  name: "StockForge Industries",
  currency: "USD - United States Dollar",
  warehouseLocation: "Portland, OR - Building C",
  inviteEmail: "",
  inviteRole: "manager",
  ownershipTransferTargetUserId: "",
};

const DEFAULT_USER: User = {
  id: "demo-admin",
  name: "Alex Morgan",
  username: "admin",
  password: "admin",
  role: "admin",
};

const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "cat-cpu",
    name: "CPU",
    description: "Processors and compute units",
    productCount: 1,
    color: "#3b82f6",
    monthlyRate: 500,
    gstPercent: 18,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "cat-gpu",
    name: "GPU",
    description: "Graphics cards and accelerators",
    productCount: 1,
    color: "#8b5cf6",
    monthlyRate: 500,
    gstPercent: 18,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "cat-storage",
    name: "SSD",
    description: "Solid-state drives and storage devices",
    productCount: 1,
    color: "#10b981",
    monthlyRate: 500,
    gstPercent: 18,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "prod-cpu-1",
    name: "Ryzen 7 7800X3D",
    sku: "CPU-7800X3D",
    categoryId: "cat-cpu",
    categoryName: "CPU",
    quantity: 12,
    price: 399.99,
    mrp: 399.99,
    status: "in-stock",
    description: "High-performance gaming processor",
    availableBranches: ["Main Warehouse", "Downtown"],
    minStock: 3,
    previousQuantity: 12,
    shipping: 12,
    installation: 20,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    paidAmount: 0,
  },
  {
    id: "prod-gpu-1",
    name: "RTX 4070 Super",
    sku: "GPU-4070S",
    categoryId: "cat-gpu",
    categoryName: "GPU",
    quantity: 8,
    price: 599.99,
    mrp: 599.99,
    status: "in-stock",
    description: "High-end graphics card",
    availableBranches: ["Main Warehouse"],
    minStock: 2,
    previousQuantity: 8,
    shipping: 15,
    installation: 25,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    paidAmount: 0,
  },
  {
    id: "prod-ssd-1",
    name: "Samsung 990 Pro 2TB",
    sku: "SSD-990PRO-2TB",
    categoryId: "cat-storage",
    categoryName: "SSD",
    quantity: 20,
    price: 189.99,
    mrp: 189.99,
    status: "in-stock",
    description: "NVMe Gen4 solid-state drive",
    availableBranches: ["Main Warehouse", "Airport Branch"],
    minStock: 5,
    previousQuantity: 20,
    shipping: 5,
    installation: 10,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    paidAmount: 0,
  },
];

const DEFAULT_MOVEMENTS: StockMovement[] = [];
const DEFAULT_ACTIVITIES: ActivityItem[] = [];
const DEFAULT_SAVED_BUILDS: SavedBuild[] = [];

function cloneProducts() {
  return DEFAULT_PRODUCTS.map((product) => ({ ...product, availableBranches: [...(product.availableBranches ?? [])] }));
}

function cloneCategories() {
  return DEFAULT_CATEGORIES.map((category) => ({ ...category }));
}

function cloneMovements() {
  return DEFAULT_MOVEMENTS.map((movement) => ({ ...movement }));
}

function cloneActivities() {
  return DEFAULT_ACTIVITIES.map((activity) => ({ ...activity }));
}

function cloneSavedBuilds() {
  return DEFAULT_SAVED_BUILDS.map((build) => ({
    ...build,
    items: build.items.map((item) => ({ ...item })),
    margin: { ...build.margin },
  }));
}

function buildInitialState(): Omit<InventoryStoreState, "setSidebarOpen" | "updateOrganization" | "updateGstConfig" | "saveBuild" | "deleteSavedBuild" | "addProduct" | "updateProduct" | "deleteProduct" | "addActivity" | "resetWorkspaceData"> {
  return {
    sidebarOpen: true,
    organization: { ...DEFAULT_ORGANIZATION },
    gstConfig: { mode: "percentage", value: 18 },
    builderVersion: 2,
    currentUser: { ...DEFAULT_USER },
    products: cloneProducts(),
    categories: cloneCategories(),
    movements: cloneMovements(),
    activities: cloneActivities(),
    savedBuilds: cloneSavedBuilds(),
  };
}

function recalculateCategoryCounts(products: Product[], categories: Category[]) {
  return categories.map((category) => ({
    ...category,
    productCount: products.filter((product) => product.categoryId === category.id).length,
  }));
}

export const useInventoryStore = create<InventoryStoreState>()(
  persist(
    (set) => ({
      ...buildInitialState(),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      updateOrganization: (updates) =>
        set((state) => ({
          organization: { ...state.organization, ...updates },
        })),
      updateGstConfig: (updates) =>
        set((state) => ({
          gstConfig: { ...state.gstConfig, ...updates },
        })),
      saveBuild: (build) =>
        set((state) => ({
          savedBuilds: [build, ...state.savedBuilds.filter((item) => item.id !== build.id)],
        })),
      deleteSavedBuild: (id) =>
        set((state) => ({
          savedBuilds: state.savedBuilds.filter((build) => build.id !== id),
        })),
      addProduct: (product) =>
        set((state) => {
          const products = [product, ...state.products];
          return {
            products,
            categories: recalculateCategoryCounts(products, state.categories),
          };
        }),
      updateProduct: (id, updates) =>
        set((state) => {
          const products = state.products.map((product) =>
            product.id === id ? { ...product, ...updates } : product
          );
          return {
            products,
            categories: recalculateCategoryCounts(products, state.categories),
          };
        }),
      deleteProduct: (id) =>
        set((state) => {
          const products = state.products.filter((product) => product.id !== id);
          return {
            products,
            categories: recalculateCategoryCounts(products, state.categories),
          };
        }),
      addActivity: (activity) =>
        set((state) => ({
          activities: [
            {
              ...activity,
              id: activity.id ?? `activity-${Date.now()}`,
              createdAt: activity.createdAt ?? new Date().toISOString(),
            },
            ...state.activities,
          ],
        })),
      resetWorkspaceData: () =>
        set(() => ({
          ...buildInitialState(),
          setSidebarOpen: useInventoryStore.getState().setSidebarOpen,
          updateOrganization: useInventoryStore.getState().updateOrganization,
          updateGstConfig: useInventoryStore.getState().updateGstConfig,
          saveBuild: useInventoryStore.getState().saveBuild,
          deleteSavedBuild: useInventoryStore.getState().deleteSavedBuild,
          addProduct: useInventoryStore.getState().addProduct,
          updateProduct: useInventoryStore.getState().updateProduct,
          deleteProduct: useInventoryStore.getState().deleteProduct,
          addActivity: useInventoryStore.getState().addActivity,
          resetWorkspaceData: useInventoryStore.getState().resetWorkspaceData,
        })),
    }),
    {
      name: "inventory-store",
      partialize: (state) => ({
        organization: state.organization,
        gstConfig: state.gstConfig,
        products: state.products,
        categories: state.categories,
        movements: state.movements,
        activities: state.activities,
        savedBuilds: state.savedBuilds,
        builderVersion: state.builderVersion,
      }),
    }
  )
);

export const useInventoryUIStore = useInventoryStore;
