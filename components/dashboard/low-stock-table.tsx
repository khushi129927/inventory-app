"use client";

import type { Product } from "@/app/types/inventory";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Icon from "@/components/Icon";

interface LowStockTableProps {
  products: Product[];
  loading?: boolean;
}

function getStatusBadge(status: Product["status"]) {
  if (status === "out-of-stock") {
    return <Badge className="border-0 bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FEF2F2]">Out of Stock</Badge>;
  }

  if (status === "low-stock") {
    return (
      <Badge
        variant="outline"
        className="border-0 bg-[#E0F5F2] text-[#0B7A6D] hover:bg-[#E0F5F2]"
      >
        Low Stock
      </Badge>
    );
  }

  return <Badge className="border-0 bg-[#F0FDF4] text-[#16A34A] hover:bg-[#F0FDF4]">In Stock</Badge>;
}

export default function LowStockTable({ products, loading = false }: LowStockTableProps) {
  const alerts = products.filter(
    (product) =>
      product.quantity <= product.minStock ||
      product.status === "low-stock" ||
      product.status === "out-of-stock"
  );

  return (
    <Card className="rounded-[8px] border border-border bg-card py-0">
      <CardHeader className="border-b border-border px-5 py-4">
        <CardTitle className="text-sm font-semibold text-foreground">Low Stock Alerts</CardTitle>
      </CardHeader>
      <CardContent className="px-0 py-0">
        {loading ? (
          <div className="space-y-2 px-5 py-5">
            <Skeleton className="h-8 w-full rounded-[6px] bg-muted" />
            <Skeleton className="h-8 w-full rounded-[6px] bg-muted" />
            <Skeleton className="h-8 w-full rounded-[6px] bg-muted" />
            <Skeleton className="h-8 w-full rounded-[6px] bg-muted" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-5 py-12 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Icon name="CheckCircle2" className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No low stock alerts</p>
            <p className="text-[13px] text-muted-foreground">
              All products are above their minimum threshold.
            </p>
          </div>
        ) : (
          <div className="max-h-[380px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-5 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Product</TableHead>
                  <TableHead className="px-5 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">SKU</TableHead>
                  <TableHead className="px-5 py-3 text-right font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Qty</TableHead>
                  <TableHead className="px-5 py-3 text-right font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Min</TableHead>
                  <TableHead className="px-5 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="px-5 py-3 font-medium text-foreground">{product.name}</TableCell>
                    <TableCell className="px-5 py-3 font-mono text-[11px] text-muted-foreground">
                      {product.sku}
                    </TableCell>
                    <TableCell className="px-5 py-3 text-right text-foreground">{product.quantity}</TableCell>
                    <TableCell className="px-5 py-3 text-right text-muted-foreground">{product.minStock}</TableCell>
                    <TableCell className="px-5 py-3">{getStatusBadge(product.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
