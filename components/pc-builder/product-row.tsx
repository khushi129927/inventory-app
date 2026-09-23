"use client";

import type { Product } from "@/app/types/inventory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProductRowProps {
  product: Product;
  isSelected: boolean;
  onSelect: (product: Product) => void;
}

function getStatusLabel(status: Product["status"]) {
  switch (status) {
    case "in-stock":
      return "In Stock";
    case "low-stock":
      return "Low Stock";
    case "out-of-stock":
      return "Out of Stock";
    case "discontinued":
      return "Discontinued";
    default:
      return status;
  }
}

function getStatusClasses(status: Product["status"]) {
  switch (status) {
    case "in-stock":
      return "border-emerald-400/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400";
    case "low-stock":
      return "border-amber-400/40 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400";
    case "out-of-stock":
      return "border-red-400/40 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400";
    case "discontinued":
      return "border-slate-400/40 bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ProductRow({
  product,
  isSelected,
  onSelect,
}: ProductRowProps) {
  const isUnavailable = product.status === "out-of-stock" || product.status === "discontinued";

  const handleSelect = () => {
    if (isUnavailable) {
      return;
    }

    onSelect(product);
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between py-3 border-b border-border bg-background transition-colors last:border-b-0",
        isSelected && "bg-primary/10 border-l-3 border-l-primary px-4 -mx-4 rounded-sm",
        isUnavailable && "opacity-70"
      )}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <h3
          className={cn(
            "text-[14px] font-semibold text-foreground",
            isUnavailable && "text-muted-foreground"
          )}
        >
          {product.name}
        </h3>
        <p
          className={cn(
            "text-[11px] leading-normal text-muted-foreground",
            isUnavailable && "text-muted-foreground/80"
          )}
        >
          {product.description || "No specifications available."}
        </p>
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
        {isUnavailable ? (
          <div className="px-2 py-1 border border-border rounded text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {getStatusLabel(product.status)}
          </div>
        ) : (
          <>
            <p className="text-[15px] font-bold text-foreground tabular-nums">
              {formatCurrency(product.price)}
            </p>
            <p className="text-[10px] font-mono text-muted-foreground">
              + {formatCurrency(product.price * 0.18)} GST
            </p>
            <button
              type="button"
              onClick={handleSelect}
              className={cn(
                "mt-2 px-3 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition-colors",
                isSelected
                  ? "bg-primary text-white border border-primary"
                  : "bg-transparent text-primary border border-primary hover:bg-primary/10"
              )}
            >
              {isSelected ? (
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  Selected
                </span>
              ) : (
                "SELECT"
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
