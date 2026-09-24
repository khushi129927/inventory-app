import { differenceInCalendarMonths } from "date-fns";
import type { Category, Product } from "@/app/types/inventory";

export const DEFAULT_CATEGORY_MONTHLY_RATES: Record<string, number> = {
  Laptop: 300,
  Desktop: 500,
  Workstation: 750,
  Accessory: 500,
  Server: 2500,
};

function normalizeCategoryName(categoryName: string): string {
  return categoryName.trim().toLowerCase();
}

function inferCategoryMonthlyRate(categoryName: string): number {
  const normalizedCategory = normalizeCategoryName(categoryName);

  if (normalizedCategory.includes("laptop")) return DEFAULT_CATEGORY_MONTHLY_RATES.Laptop;
  if (normalizedCategory.includes("desktop")) return DEFAULT_CATEGORY_MONTHLY_RATES.Desktop;
  if (normalizedCategory.includes("workstation")) return DEFAULT_CATEGORY_MONTHLY_RATES.Workstation;
  if (normalizedCategory.includes("server")) return DEFAULT_CATEGORY_MONTHLY_RATES.Server;
  if (
    normalizedCategory.includes("ram") ||
    normalizedCategory.includes("ssd") ||
    normalizedCategory.includes("accessor")
  ) {
    return DEFAULT_CATEGORY_MONTHLY_RATES.Accessory;
  }

  return 0;
}

export function getMonthlyRateForCategory(product: Product, categories: Category[] = []): number {
  const matchedCategory = categories.find((category) => category.id === product.categoryId);

  if (matchedCategory && Number.isFinite(matchedCategory.monthlyRate)) {
    return matchedCategory.monthlyRate;
  }

  return inferCategoryMonthlyRate(product.categoryName);
}

export function getGstPercentForCategory(product: Product, categories: Category[] = []): number {
  const matchedCategory = categories.find((category) => category.id === product.categoryId);

  if (matchedCategory && Number.isFinite(matchedCategory.gstPercent)) {
    return matchedCategory.gstPercent;
  }

  return 0;
}

export function getMonthsInInventory(product: Product): number {
  const now = new Date();
  const created = new Date(product.createdAt);
  return Math.max(0, differenceInCalendarMonths(now, created));
}

export function getInterestCharge(product: Product, categories: Category[] = []): number {
  const monthlyRate = getMonthlyRateForCategory(product, categories);
  const monthsInInventory = product.monthsInInventory ?? 0;
  return monthlyRate * monthsInInventory;
}

export function getInterestRateInputForCategory(product: Product, categories: Category[] = []): {
  rate: number;
  isEditable: boolean;
} {
  const categoryName = categories.find((category) => category.id === product.categoryId)?.name ?? product.categoryName;
  const normalized = categoryName.trim().toLowerCase();
  const productWithInterest = product as Product & { monthlyInterest?: number };

  if (normalized.includes("server")) {
    const monthlyInterest = productWithInterest.monthlyInterest ?? DEFAULT_CATEGORY_MONTHLY_RATES.Server;
    return {
      rate: Number.isFinite(monthlyInterest) ? monthlyInterest : DEFAULT_CATEGORY_MONTHLY_RATES.Server,
      isEditable: true,
    };
  }

  return { rate: getMonthlyRateForCategory(product, categories), isEditable: false };
}

export function getTotalCost(product: Product, categories: Category[] = []): number {
  const mrp = Number((product as Product & { mrp?: number }).mrp ?? 0);
  const gstPercent = getGstPercentForCategory(product, categories);
  return (mrp + getInterestCharge(product, categories)) * (1 + gstPercent / 100);
}

export function getOutstandingCost(product: Product, categories: Category[] = []): number {
  return getTotalCost(product, categories) - (product.paidAmount || 0);
}

export function getTotalInterestCost(products: Product[], categories: Category[] = []): number {
  return products.reduce((total, product) => total + getInterestCharge(product, categories), 0);
}

export function formatCurrency(value: number): string {
  return `₹${value.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}
