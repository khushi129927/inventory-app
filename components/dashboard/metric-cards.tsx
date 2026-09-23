"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { UserRole } from "@/app/types/inventory";
import { useInventoryStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";

interface MetricCardsProps {
  totalProducts: number;
  lowStockCount: number;
  inventoryValue: number;
  activeCategories: number;
  totalInterestCost?: number;
  role?: UserRole;
  loading?: boolean;
}

interface MetricItem {
  label: string;
  value: number;
  format: (value: number) => string;
}

export default function MetricCards({
  totalProducts,
  lowStockCount,
  inventoryValue,
  activeCategories,
  totalInterestCost = 0,
  role,
  loading = false,
}: MetricCardsProps) {
  const isExecutive = role === "executive";
  const organizationCurrency = useInventoryStore((state) => state.organization.currency);

  const metrics: MetricItem[] = isExecutive
    ? [
        {
          label: "Total Products",
          value: totalProducts,
          format: (value: number) => value.toLocaleString(),
        },
        {
          label: "Categories",
          value: activeCategories,
          format: (value: number) => value.toLocaleString(),
        },
      ]
    : [
        {
          label: "Total Products",
          value: totalProducts,
          format: (value: number) => value.toLocaleString(),
        },
        {
          label: "Low Stock",
          value: lowStockCount,
          format: (value: number) => value.toLocaleString(),
        },
        {
          label: "Inventory Value",
          value: inventoryValue,
          format: (value: number) => formatCurrency(value, organizationCurrency, 0),
        },
        {
          label: "Categories",
          value: activeCategories,
          format: (value: number) => value.toLocaleString(),
        },
        {
          label: "Total Interest Cost",
          value: totalInterestCost,
          format: (value: number) => formatCurrency(value, organizationCurrency, 2),
        },
      ];

  return (
    <div
      className={
        isExecutive
          ? "grid grid-cols-2 gap-4"
          : "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5"
      }
    >
      {metrics.map((metric) => (
        <div key={metric.label} className="rounded-[8px] border border-border bg-card p-5">
          <div className="space-y-2.5">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
              {metric.label}
            </p>
            {loading ? (
              <Skeleton className="h-8 w-28 rounded-[6px] bg-muted" />
            ) : (
              <p className="text-[24px] font-bold leading-none tracking-[-0.02em] text-foreground">
                {metric.format(metric.value)}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
