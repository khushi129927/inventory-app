"use client";

import * as React from "react";
import { format } from "date-fns";
import type { OrderRequest, OrderRequestStatus } from "@/app/types/inventory";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import Icon from "@/components/Icon";

function StatusBadge({ status }: { status: OrderRequestStatus }) {
  const variants: Record<OrderRequestStatus, string> = {
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
    rejected: "bg-red-100 text-red-700 border-red-200",
  };

  return (
    <span
      className={`inline-flex h-5 items-center rounded-md border px-2.5 text-xs font-medium ${variants[status]}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

interface OrderTableProps {
  orders: OrderRequest[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

function formatProducts(items: OrderRequest["items"]) {
  return items.map((i) => `${i.productName} (x${i.quantity})`).join(", ");
}

export default function OrderTable({ orders, onApprove, onReject }: OrderTableProps) {
  const sortedOrders = React.useMemo(
    () =>
      [...orders].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [orders]
  );

  if (sortedOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 py-20">
        <Icon
          name="ClipboardList"
          className="mb-4 h-12 w-12 text-muted-foreground/60"
        />
        <p className="text-lg font-medium text-foreground">No order requests</p>
        <p className="mt-1 text-sm text-muted-foreground">
          New requests will appear here when customers submit them.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[8px] border border-border bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Date</TableHead>
              <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Customer Name</TableHead>
              <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Email</TableHead>
              <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Products</TableHead>
              <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Status</TableHead>
              <TableHead className="text-right font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="text-muted-foreground">
                  {format(new Date(order.createdAt), "MMM d, yyyy HH:mm")}
                </TableCell>
                <TableCell className="font-medium">{order.customerName}</TableCell>
                <TableCell className="text-muted-foreground">
                  {order.customerEmail}
                </TableCell>
                <TableCell className="max-w-xs truncate text-sm">
                  {formatProducts(order.items)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={order.status} />
                </TableCell>
                <TableCell className="text-right">
                  {order.status === "pending" ? (
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onApprove(order.id)}
                        className="h-8 rounded-[6px] bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700"
                      >
                        <Icon name="Check" className="mr-1 h-3.5 w-3.5" />
                        Approve
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onReject(order.id)}
                        className="h-8 rounded-[6px] bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
                      >
                        <Icon name="X" className="mr-1 h-3.5 w-3.5" />
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
