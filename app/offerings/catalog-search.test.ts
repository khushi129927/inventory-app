import type { Product } from "@/app/types/inventory";

const catalogSearchFieldsCheck = {
  name: "Wireless Mouse MX",
  sku: "WMX-2024",
  serialNumber: "WMX-2024",
  modelNumber: "MX-2024",
  categoryName: "Electronics",
  description: "Ergonomic wireless mouse with precision tracking.",
  availableBranches: ["Downtown"],
} satisfies Pick<
  Product,
  | "name"
  | "sku"
  | "serialNumber"
  | "modelNumber"
  | "categoryName"
  | "description"
  | "availableBranches"
>;

export default catalogSearchFieldsCheck;
