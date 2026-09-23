"use client";

import * as React from "react";
import type { Product, ProductMargin, UserRole } from "@/app/types/inventory";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface RolePricingControlProps {
  product?: Product;
  baseValue?: number;
  margin?: ProductMargin;
  onMarginChange?: (margin: ProductMargin) => void;
  role?: UserRole;
  compact?: boolean;
}

function formatPrice(value: number) {
  return `₹${value.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

function normalizeMargin(margin?: ProductMargin): ProductMargin {
  return {
    type: margin?.type ?? "flat",
    value: Number.isFinite(margin?.value) ? margin!.value : 0,
  };
}

function getFinalPrice(price: number, margin?: ProductMargin) {
  const safeMargin = normalizeMargin(margin);
  const computed =
    safeMargin.type === "percent"
      ? price + price * (safeMargin.value / 100)
      : price + safeMargin.value;

  return Number.isFinite(computed) ? Math.max(0, computed) : price;
}

export default function RolePricingControl({
  product,
  baseValue,
  margin,
  onMarginChange,
  role,
  compact = false,
}: RolePricingControlProps) {
  const safeMargin = normalizeMargin(margin);
  const basePrice = baseValue ?? product?.price ?? 0;
  const finalPrice = getFinalPrice(basePrice, safeMargin);
  const canManagePricing = role === "admin" || role === "manager";
  const marginAriaLabel = product
    ? `Set ${safeMargin.type} margin for ${product.name}`
    : `Set ${safeMargin.type} margin`;

  const handleTypeChange = (value: string | null) => {
    if (!value || !onMarginChange) {
      return;
    }

    onMarginChange({
      type: value as ProductMargin["type"],
      value: safeMargin.value,
    });
  };

  const handleValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!onMarginChange) {
      return;
    }

    const rawValue = event.target.value;
    const nextValue = rawValue === "" ? 0 : Number(rawValue);

    onMarginChange({
      type: safeMargin.type,
      value: Number.isFinite(nextValue) ? nextValue : 0,
    });
  };

  if (!canManagePricing) {
    return (
      <div className="flex min-w-[112px] flex-col items-end gap-1 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-right">
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Final Price
        </span>
        <span className="text-base font-semibold tabular-nums text-foreground">
          {formatPrice(finalPrice)}
        </span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2 rounded-md border border-border bg-muted/20 p-2.5">
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Base
          </span>
          <span className="font-semibold tabular-nums text-foreground">
            {formatPrice(basePrice)}
          </span>
        </div>

        <div className="grid grid-cols-[minmax(0,88px)_minmax(0,1fr)] gap-2">
          <Select value={safeMargin.type} onValueChange={handleTypeChange}>
            <SelectTrigger className="h-8 w-full bg-background px-2 text-xs tabular-nums">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="flat">Flat</SelectItem>
              <SelectItem value="percent">Percent</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative">
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              step={safeMargin.type === "percent" ? "0.1" : "1"}
              value={safeMargin.value}
              onChange={handleValueChange}
              className="h-8 bg-background pr-7 text-xs tabular-nums"
              aria-label={marginAriaLabel}
            />
            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[11px] font-medium text-muted-foreground">
              {safeMargin.type === "percent" ? "%" : "₹"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Final
          </span>
          <span className="font-semibold tabular-nums text-foreground">
            {formatPrice(finalPrice)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3 rounded-xl border border-border/70 bg-muted/20 p-3 sm:min-w-[300px]">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-lg border border-border/60 bg-background/90 px-3 py-2">
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Base Price
          </span>
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {formatPrice(basePrice)}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Margin Type
          </span>
          <Select value={safeMargin.type} onValueChange={handleTypeChange}>
            <SelectTrigger className="w-full bg-background tabular-nums">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="flat">Flat</SelectItem>
              <SelectItem value="percent">Percent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Margin Value
          </span>
          <div className="relative">
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              step={safeMargin.type === "percent" ? "0.1" : "1"}
              value={safeMargin.value}
              onChange={handleValueChange}
              className="bg-background pr-8 tabular-nums"
              aria-label={marginAriaLabel}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-muted-foreground">
              {safeMargin.type === "percent" ? "%" : "₹"}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Final Price
          </span>
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {formatPrice(finalPrice)}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Badge
          variant="outline"
          className={cn(
            "border-border/70 bg-background/80 text-muted-foreground",
            safeMargin.value > 0 && "border-primary/30 bg-primary/5 text-primary"
          )}
        >
          {safeMargin.type === "percent"
            ? `${safeMargin.value}% margin`
            : `${formatPrice(safeMargin.value)} margin`}
        </Badge>
        <span className="text-[11px] text-muted-foreground">
          Visible selling price updates instantly.
        </span>
      </div>
    </div>
  );
}
