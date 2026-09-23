"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth-store";
import { getTotalInterestCost } from "@/lib/cost-utils";
import { apiGetProducts, apiGetCategories } from "@/lib/api";
import { useTheme } from "./providers";
import { Button } from "@/components/ui/button";
import MetricCards from "@/components/dashboard/metric-cards";
import LowStockTable from "@/components/dashboard/low-stock-table";
import ActivityFeed from "@/components/dashboard/activity-feed";
import Icon from "@/components/Icon";

export default function DashboardPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();

  const {
    data: productsData,
    isLoading: productsLoading,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ["products"],
    queryFn: () => apiGetProducts().then((res) => res.products),
  });

  const {
    data: categoriesData,
    isLoading: categoriesLoading,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiGetCategories().then((res) => res.categories),
  });

  const products = productsData || [];
  const categories = categoriesData || [];

  const totalProducts = products.length;
  const lowStockCount = products.filter(
    (p) =>
      p.quantity <= p.minStock ||
      p.status === "low-stock" ||
      p.status === "out-of-stock"
  ).length;
  const inventoryValue = products.reduce((sum, p) => sum + p.quantity * p.price, 0);
  const activeCategories = categories.length;
  const totalInterestCost = getTotalInterestCost(products);

  const isExecutive = currentUser?.role === "executive";
  const isLoading = productsLoading || categoriesLoading;
  const isDarkTheme = theme === "dark";

  async function handleRefreshDashboard() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["products"] }),
      queryClient.invalidateQueries({ queryKey: ["categories"] }),
      refetchProducts(),
      refetchCategories(),
    ]);
  }

  return (
    <div className="page-content px-8 py-8">
      <div className="page-header-row flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="page-title text-[32px] font-bold tracking-[-0.03em] text-foreground">Dashboard</h1>
          <p className="page-subtitle mt-2 max-w-[600px] text-sm text-muted-foreground">
            Overview of your inventory at a glance.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start">
          <Button
            type="button"
            variant="outline"
            className="theme-toggle inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-border bg-transparent text-foreground hover:bg-muted"
            onClick={toggleTheme}
            aria-label={`Toggle theme to ${isDarkTheme ? "light" : "dark"} mode`}
          >
            <Icon name={isDarkTheme ? "Sun" : "Moon"} className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-border bg-transparent text-foreground hover:bg-muted"
            aria-label="Refresh dashboard"
            onClick={handleRefreshDashboard}
          >
            <Icon name="RefreshCw" className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <MetricCards
        totalProducts={totalProducts}
        lowStockCount={lowStockCount}
        inventoryValue={inventoryValue}
        activeCategories={activeCategories}
        totalInterestCost={totalInterestCost}
        role={currentUser?.role}
        loading={isLoading}
      />

      {!isExecutive && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <div>
            <LowStockTable products={products} loading={isLoading} />
          </div>
          <div>
            <ActivityFeed activities={[]} loading={isLoading} />
          </div>
        </div>
      )}
    </div>
  );
}
