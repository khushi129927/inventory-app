"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Product, ProductMargin, UserRole } from "@/app/types/inventory";
import RolePricingControl from "@/components/pc-builder/role-pricing-control";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { apiCreateOrder } from "@/lib/api";
import { copyToClipboard, cn } from "@/lib/utils";
import SaveBuildDialog from "@/components/pc-builder/save-build-dialog";
import Icon from "@/components/Icon";

interface BuildSummaryPanelProps {
  categories: string[];
  selectedProducts: Partial<Record<string, Product>>;
  buildMargin?: ProductMargin;
  onBuildMarginChange?: (margin: ProductMargin) => void;
  onNewBuild: () => void;
  role?: UserRole;
}

interface BuildLineItem {
  category: string;
  product: Product;
  basePrice: number;
  finalPrice: number;
}

function normalizeMargin(margin?: ProductMargin): ProductMargin {
  return {
    type: margin?.type ?? "flat",
    value: Number.isFinite(margin?.value) ? margin!.value : 0,
  };
}

function getMarginAmount(price: number, margin?: ProductMargin) {
  const safeMargin = normalizeMargin(margin);
  const computed =
    safeMargin.type === "percent"
      ? price * (safeMargin.value / 100)
      : safeMargin.value;

  return Number.isFinite(computed) ? computed : 0;
}

function getFinalPrice(price: number, margin?: ProductMargin) {
  const computed = price + getMarginAmount(price, margin);
  return Number.isFinite(computed) ? Math.max(0, computed) : price;
}

function formatPrice(value: number) {
  return `₹${value.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

function serializeBuild(
  items: BuildLineItem[],
  subtotal: number,
  marginAmount: number,
  grandTotal: number,
  buildMargin?: ProductMargin
) {
  const safeMargin = normalizeMargin(buildMargin);
  const formattedMargin =
    safeMargin.type === "percent"
      ? `${safeMargin.value}% (${formatPrice(marginAmount)})`
      : formatPrice(marginAmount);

  const lines = [
    "PC Build Summary",
    "",
    ...items.map(
      (item, index) =>
        `${index + 1}. ${item.category}: ${item.product.name} - ${formatPrice(item.basePrice)}`
    ),
    "",
    `Subtotal: ${formatPrice(subtotal)}`,
    `Margin: ${formattedMargin}`,
    `Grand Total: ${formatPrice(grandTotal)}`,
  ];

  return lines.join("\n");
}

export default function BuildSummaryPanel({
  categories,
  selectedProducts,
  buildMargin,
  onBuildMarginChange,
  onNewBuild,
  role,
}: BuildSummaryPanelProps) {
  const router = useRouter();
  const [copying, setCopying] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = React.useState(false);
  const canManagePricing = role === "admin" || role === "manager";
  const safeBuildMargin = normalizeMargin(buildMargin);

  const items = React.useMemo<BuildLineItem[]>(() => {
    return categories
      .map((category) => {
        const product = selectedProducts[category];

        if (!product) {
          return null;
        }

        return {
          category,
          product,
          basePrice: product.price,
          finalPrice: product.price,
        };
      })
      .filter((item): item is BuildLineItem => item !== null);
  }, [categories, selectedProducts]);

  const subtotal = React.useMemo(
    () => items.reduce((sum, item) => sum + item.basePrice, 0),
    [items]
  );

  const marginAmount = React.useMemo(
    () => getMarginAmount(subtotal, safeBuildMargin),
    [safeBuildMargin, subtotal]
  );

  const grandTotal = React.useMemo(
    () => getFinalPrice(subtotal, safeBuildMargin),
    [safeBuildMargin, subtotal]
  );

  const serializedBuild = React.useMemo(
    () => serializeBuild(items, subtotal, marginAmount, grandTotal, safeBuildMargin),
    [grandTotal, items, marginAmount, safeBuildMargin, subtotal]
  );

  const handleCopyText = async () => {
    try {
      setCopying(true);
      await copyToClipboard(serializedBuild);
    } finally {
      setCopying(false);
    }
  };

  const handleSaveToCart = () => {
    try {
      setSaving(true);
      localStorage.setItem("pc-build-cart", serializedBuild);
    } finally {
      setSaving(false);
    }
  };

  const handleOrderNow = async () => {
    if (items.length === 0) {
      toast.error("Select at least one component before placing an order");
      return;
    }

    try {
      setSaving(true);
      await apiCreateOrder({
        customerName: role === "admin" || role === "manager" ? "PC Builder" : "Executive Builder",
        customerEmail: "builder@inventory-app.local",
        items: items.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: 1,
        })),
      });
      toast.success("Build submitted for order approval");
      router.push("/orders");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create order request";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-surface-raised border border-border rounded-sm p-5 lg:sticky lg:top-6 lg:self-start shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold tracking-tight">Build Summary</h3>
        <div className="flex gap-1">
          {categories.map((_, i) => {
            const isCompleted = selectedProducts[categories[i]];
            const isCurrent = i === categories.length - 1; // This is a simplification, real current step comes from workspace
            return (
              <div
                key={i}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-colors",
                  isCompleted ? "bg-success opacity-100" : "bg-muted-foreground opacity-50"
                )}
              />
            );
          })}
        </div>
      </div>

      <div className="space-y-1">
        {items.length === 0 ? (
          <div className="flex min-h-32 items-center justify-center rounded-sm border border-dashed border-border bg-muted/20 px-4 text-center text-xs text-muted-foreground">
            Your chosen parts will appear here with the running total.
          </div>
        ) : (
          <div className="flex flex-col">
            {items.map((item) => (
              <div
                key={item.category}
                className="flex justify-between items-start py-2 border-b border-border last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-0.5">
                    {item.category}
                  </p>
                  <p className="text-[12px] font-semibold text-foreground leading-tight">
                    {item.product.name}
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground">
                    {item.product.sku}
                  </p>
                </div>
                <div className="flex flex-col items-end shrink-0 ml-2 text-right">
                  <span className="text-[9px] font-mono uppercase text-muted-foreground">QTY</span>
                  <span className="text-[12px] font-bold text-primary tabular-nums">1</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 space-y-1 font-mono text-[12px] text-muted-foreground">
        <div className="flex justify-between">
          <span>Components</span>
          <span>{items.length} Units</span>
        </div>
        <div className="flex justify-between">
          <span>Unique SKUs</span>
          <span>{items.length}</span>
        </div>
        <div className="flex justify-between">
          <span>Consumables</span>
          <span>3 Items</span>
        </div>
        <div className="flex justify-between">
          <span>Rush Build</span>
          <span>No</span>
        </div>
      </div>

      <div className="bg-background border border-border rounded-sm p-3 mt-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[12px] text-muted-foreground font-medium">Without GST Price</span>
          <span className="text-2xl font-bold text-primary tabular-nums tracking-tighter">
            {formatPrice(subtotal)}
          </span>
        </div>

        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Add Margin</span>
          <div className="flex gap-1">
            <button
              onClick={() => onBuildMarginChange && onBuildMarginChange({ type: "percent", value: safeBuildMargin.value })}
              className={cn(
                "w-7 h-6 rounded flex items-center justify-center text-[11px] font-bold font-mono transition-colors",
                safeBuildMargin.type === "percent" ? "bg-primary text-white" : "bg-transparent border border-border-strong text-muted-foreground"
              )}
            >
              %
            </button>
            <button
              onClick={() => onBuildMarginChange && onBuildMarginChange({ type: "flat", value: safeBuildMargin.value })}
              className={cn(
                "w-7 h-6 rounded flex items-center justify-center text-[11px] font-bold font-mono transition-colors",
                safeBuildMargin.type === "flat" ? "bg-primary text-white" : "bg-transparent border border-border-strong text-muted-foreground"
              )}
            >
              ₹
            </button>
          </div>
        </div>

        <input
          type="text"
          value={safeBuildMargin.value}
          onChange={(e) => onBuildMarginChange && onBuildMarginChange({
            ...safeBuildMargin,
            value: parseFloat(e.target.value) || 0
          })}
          placeholder={safeBuildMargin.type === "percent" ? "%" : "₹"}
          className="w-full h-8 px-2 text-[13px] bg-surface border border-border-strong rounded mb-2"
        />

        <div className="flex justify-between items-center mb-2 text-sm">
          <span className="text-muted-foreground text-[12px]">GST @ 18%</span>
          <span className="font-medium tabular-nums text-foreground">
            {formatPrice(subtotal * 0.18)}
          </span>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-border">
          <span className="text-sm font-semibold text-foreground">Total (With GST)</span>
          <span className="text-lg font-bold tabular-nums text-foreground">
            {formatPrice(grandTotal)}
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyText}
            className="w-full h-8 text-[12px] font-semibold"
          >
            {copying ? "Copying..." : "Copy Text"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSaveToCart}
            className="w-full h-8 text-[12px] font-semibold"
          >
            {saving ? "Saving..." : "Copy Image"}
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setSaveDialogOpen(true)}
          disabled={items.length === 0}
          className="w-full h-8 text-[12px] font-semibold bg-white text-foreground border-border hover:bg-white/90"
        >
          Save to Cart
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleOrderNow}
          className="w-full h-8 text-[12px] font-semibold bg-white text-foreground border-border hover:bg-white/90"
        >
          Order Now
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onNewBuild}
          className="w-full h-8 text-[12px] font-semibold bg-white text-foreground border-border hover:bg-white/90"
        >
          New Build
        </Button>
      </div>

      <SaveBuildDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        items={items.map((item) => ({
          category: item.category,
          productId: item.product.id,
          productName: item.product.name,
          price: item.finalPrice,
        }))}
        subtotal={subtotal}
        margin={safeBuildMargin}
        marginAmount={marginAmount}
        grandTotal={grandTotal}
        defaultName={
          items[0] ? `${items[0].product.name.split(" ").slice(0, 2).join(" ")} Build` : "New Build"
        }
      />
    </div>
  );
}
