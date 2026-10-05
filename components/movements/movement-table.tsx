"use client";

import * as React from "react";
import type { MovementType, StockMovement } from "@/app/types/inventory";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import Icon from "@/components/Icon";

interface MovementTableProps {
  movements: StockMovement[];
}

function getTypeBadgeClasses(type: MovementType) {
  switch (type) {
    case "in":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
    case "out":
      return "border-red-500/20 bg-red-500/10 text-red-400";
    case "transfer":
      return "border-primary/20 bg-primary/10 text-primary";
    case "adjustment":
      return "border-border bg-muted/40 text-muted-foreground";
    default:
      return "border-border bg-muted/40 text-muted-foreground";
  }
}

function getTypeLabel(type: MovementType) {
  switch (type) {
    case "in":
      return "Inbound";
    case "out":
      return "Outbound";
    case "transfer":
      return "Transfer";
    case "adjustment":
      return "Adjustment";
    default:
      return type;
  }
}

function getQuantityText(movement: StockMovement) {
  if (movement.type === "in") {
    return `+${movement.quantity}`;
  }

  if (movement.type === "out") {
    return `-${movement.quantity}`;
  }

  if (movement.type === "adjustment") {
    return `${movement.quantity > 0 ? "+" : ""}${movement.quantity}`;
  }

  return `${movement.quantity}`;
}

function getQuantityClasses(type: MovementType) {
  switch (type) {
    case "in":
      return "text-emerald-400";
    case "out":
      return "text-red-400";
    case "transfer":
      return "text-primary";
    case "adjustment":
      return "text-muted-foreground";
    default:
      return "text-muted-foreground";
  }
}

export default function MovementTable({ movements }: MovementTableProps) {
  if (movements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Icon name="History" className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">No movements found</p>
        <p className="text-xs text-muted-foreground/70">
          Try adjusting your filters or record a new movement.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
            <TableRow className="border-b border-border">
              <TableHead className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Date
              </TableHead>
              <TableHead className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                SKU / Product
              </TableHead>
              <TableHead className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Type
              </TableHead>
              <TableHead className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Change
              </TableHead>
              <TableHead className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Stock
              </TableHead>
              <TableHead className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Reason
              </TableHead>
              <TableHead className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Location
              </TableHead>
              <TableHead className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Reference
              </TableHead>
              <TableHead className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                User
              </TableHead>
            </TableRow>

        </TableHeader>
        <TableBody>
          {movements.map((movement) => (
            <TableRow key={movement.id} className="border-b border-border/70 last:border-b-0">
              <TableCell className="px-4 py-4 text-muted-foreground">
                <div className="whitespace-nowrap text-sm text-foreground">
                  {format(new Date(movement.createdAt), "MMM d, yyyy")}
                </div>
                <div className="mt-1 whitespace-nowrap text-[11px] text-[var(--text-muted)]">
                  {format(new Date(movement.createdAt), "h:mm a")}
                </div>
              </TableCell>
              <TableCell className="px-4 py-4 text-muted-foreground">
                <div className="text-sm font-semibold text-foreground">{movement.productName}</div>
                <div className="mt-1 font-mono text-[11px] text-[var(--text-muted)]">{movement.productSku}</div>
              </TableCell>
              <TableCell className="px-4 py-4 text-muted-foreground">
                <span
                  className={[
                    "inline-flex rounded-[4px] border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em]",
                    getTypeBadgeClasses(movement.type),
                  ].join(" ")}
                >
                  {getTypeLabel(movement.type)}
                </span>
              </TableCell>
              <TableCell className="px-4 py-4 text-muted-foreground">
                <span
                  className={[
                    "font-mono text-sm font-semibold tabular-nums",
                    getQuantityClasses(movement.type),
                  ].join(" ")}
                >
                  {getQuantityText(movement)}
                </span>
              </TableCell>
              <TableCell className="px-4 py-4 text-muted-foreground">
                <span
                  className={[
                    "font-mono text-sm font-semibold tabular-nums",
                    getQuantityClasses(movement.type),
                  ].join(" ")}
                >
                  {movement.previousQuantity} -&gt; {movement.newQuantity}
                </span>
              </TableCell>
              <TableCell className="px-4 py-4 text-muted-foreground">
                <span className="text-sm text-foreground">{movement.reason}</span>
              </TableCell>
              <TableCell className="px-4 py-4 text-muted-foreground">
                <span className="text-sm text-muted-foreground">{movement.location ?? ""}</span>
              </TableCell>
              <TableCell className="px-4 py-4 text-muted-foreground">
                <span className="font-mono text-[13px] text-muted-foreground">{movement.reference ?? ""}</span>
              </TableCell>
              <TableCell className="px-4 py-4 text-muted-foreground">
                <span className="text-sm text-muted-foreground">{movement.user ?? ""}</span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
