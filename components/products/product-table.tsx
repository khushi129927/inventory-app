"use client";

import * as React from "react";
import { format } from "date-fns";
import type { Category, Product, UserRole } from "@/app/types/inventory";
import { useInventoryStore } from "@/lib/store";
import {
  formatCurrency,
  getInterestCharge,
  getGstPercentForCategory,
  getOutstandingCost,
  getTotalCost,
} from "@/lib/cost-utils";
import { formatCurrency as formatCurrencyValue } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Icon from "@/components/Icon";

type StockView = "current" | "previous";

interface ProductTableProps {
  products: Product[];
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  role?: UserRole;
  stockView?: StockView;
}

function StatusBadge({ status }: { status: Product["status"] }) {
  switch (status) {
    case "in-stock":
      return (
        <Badge
          variant="outline"
          className="border-emerald-400/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
        >
          In Stock
        </Badge>
      );
    case "low-stock":
      return (
        <Badge
          variant="outline"
          className="border-amber-400/40 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
        >
          Low Stock
        </Badge>
      );
    case "out-of-stock":
      return (
        <Badge
          variant="outline"
          className="border-red-400/40 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
        >
          Out of Stock
        </Badge>
      );
    case "discontinued":
      return <Badge variant="secondary">Discontinued</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function DeltaBadge({
  previousQuantity,
  quantity,
}: {
  previousQuantity: number;
  quantity: number;
}) {
  if (previousQuantity === quantity) return null;
  const diff = quantity - previousQuantity;
  if (diff > 0) {
    return (
      <Badge
        variant="secondary"
        className="ml-1 border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px] font-semibold"
      >
        +{diff}
      </Badge>
    );
  }
  return (
    <Badge
      variant="secondary"
      className="ml-1 border-red-200 bg-red-50 text-red-700 text-[10px] font-semibold"
    >
      {diff}
    </Badge>
  );
}

function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "…";
}

export default function ProductTable({
  products,
  onEdit,
  onDelete,
  page,
  pageSize,
  onPageChange,
  role,
  stockView = "current",
}: ProductTableProps) {
  const categories = useInventoryStore((state) => state.categories) as Category[];
  const showActions = Boolean(onEdit || onDelete);
  const isExecutive = role === "executive";
  const canSeeBranches = isExecutive;
  const isPreviousStockView = stockView === "previous";
  const showPreviousStock = !canSeeBranches && isPreviousStockView;
  const visibleProducts = isPreviousStockView
    ? products.filter((product) => product.hasYesterdaySnapshot)
    : products;

  const total = visibleProducts.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;
  const visible = visibleProducts.slice(start, end);

  const goPrev = () => onPageChange(Math.max(1, safePage - 1));
  const goNext = () => onPageChange(Math.min(totalPages, safePage + 1));

  const colSpan = (canSeeBranches ? 8 : 13) + (showActions ? 1 : 0);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[220px]">Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              {canSeeBranches && <TableHead>Branches</TableHead>}
              {!canSeeBranches && (
                <TableHead className="text-right">
                  {showPreviousStock ? "Previous Stock" : "Current Stock"}
                </TableHead>
              )}
              {!canSeeBranches && <TableHead>Available Branches</TableHead>}
              <TableHead>Status</TableHead>
              <TableHead className="w-[240px]">Description</TableHead>
              {!canSeeBranches && (
                <TableHead className="text-right">Min Stock</TableHead>
              )}
              {!canSeeBranches && (
                <TableHead className="text-right">Months in Inventory</TableHead>
              )}
              {!canSeeBranches && <TableHead className="text-right">MRP</TableHead>}
              {!canSeeBranches && (
                <TableHead className="text-right">Interest Charge</TableHead>
              )}
              {!canSeeBranches && (
                <TableHead className="text-right">GST Charge</TableHead>
              )}
              {!canSeeBranches && (
                <TableHead className="text-right">Total Cost</TableHead>
              )}
              <TableHead>Created At</TableHead>
              <TableHead>Updated At</TableHead>
              {showActions && (
                <TableHead className="text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colSpan}
                  className="py-10 text-center text-muted-foreground"
                >
                  No products match your filters.
                </TableCell>
              </TableRow>
            ) : (
              visible.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">
                    {product.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {product.sku}
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">
                      {product.categoryName}
                    </span>
                  </TableCell>
                  {canSeeBranches && (
                    <TableCell className="text-muted-foreground">
                      {product.availableBranches?.length
                        ? product.availableBranches.join(", ")
                        : "—"}
                    </TableCell>
                  )}
                  {!canSeeBranches && (
                    <TableCell className="text-right tabular-nums">
                      {showPreviousStock ? (
                        <span>{product.yesterdayQuantity ?? 0}</span>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <span>{product.quantity}</span>
                          <DeltaBadge
                            previousQuantity={product.previousQuantity}
                            quantity={product.quantity}
                          />
                        </div>
                      )}
                    </TableCell>
                  )}
                  {!canSeeBranches && (
                    <TableCell className="text-muted-foreground">
                      {product.availableBranches?.length
                        ? product.availableBranches.join(", ")
                        : "—"}
                    </TableCell>
                  )}
                  <TableCell>
                    <StatusBadge status={product.status} />
                  </TableCell>
                  <TableCell className="max-w-[240px] text-muted-foreground">
                    {product.description
                      ? truncateText(product.description, 35)
                      : "—"}
                  </TableCell>
                  {!canSeeBranches && (
                    <TableCell className="text-right tabular-nums">
                      {product.minStock}
                    </TableCell>
                  )}
                  {!canSeeBranches && (
                    <TableCell className="text-right tabular-nums">
                      {product.monthsInInventory ?? 0}
                    </TableCell>
                  )}
                  {!canSeeBranches && (
                    <TableCell className="text-right tabular-nums">
                      {formatCurrencyValue(((product as Product & { mrp?: number }).mrp ?? 0), "INR - Indian Rupee", 2)}
                    </TableCell>
                  )}
                  {!canSeeBranches && (
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(getInterestCharge(product, categories))}
                    </TableCell>
                  )}
                  {!canSeeBranches && (
                    <TableCell className="text-right tabular-nums">
                      {formatCurrencyValue(
                        (((product as Product & { mrp?: number }).mrp ?? 0) +
                          getInterestCharge(product, categories)) *
                          (getGstPercentForCategory(product, categories) / 100),
                        "INR - Indian Rupee",
                        2
                      )}
                    </TableCell>
                  )}
                  {!canSeeBranches && (
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(getTotalCost(product, categories))}
                    </TableCell>
                  )}
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {format(new Date(product.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {format(new Date(product.updatedAt), "MMM d, yyyy")}
                  </TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {onEdit && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => onEdit(product)}
                              >
                                <Icon name="Pencil" className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit product</TooltipContent>
                          </Tooltip>
                        )}
                        {onDelete && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => onDelete(product)}
                              >
                                <Icon name="Trash2" className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete product</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-sm">
          <span className="text-muted-foreground">
            Showing {start + 1}-{Math.min(end, total)} of {total}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={goPrev}
              disabled={safePage <= 1}
              aria-label="Previous page"
            >
              <Icon name="ChevronLeft" className="h-4 w-4" />
            </Button>
            <span className="px-2 text-muted-foreground">
              {safePage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={goNext}
              disabled={safePage >= totalPages}
              aria-label="Next page"
            >
              <Icon name="ChevronRight" className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
