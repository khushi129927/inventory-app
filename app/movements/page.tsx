"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import MovementFilters from "@/components/movements/movement-filters";
import type { MovementFilterState } from "@/components/movements/movement-filters";
import MovementTable from "@/components/movements/movement-table";
import RecordMovementDialog from "@/components/movements/record-movement-dialog";
import Icon from "@/components/Icon";
import { apiGetMovements } from "@/lib/api";

interface StatCardItem {
  label: string;
  value: string;
  delta: string;
  deltaClassName: string;
}

function formatRelativeTime(value: string | null | undefined) {
  if (!value) {
    return "No movements yet";
  }

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return "No movements yet";
  }

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function escapeCsvValue(value: string | number) {
  const stringValue = String(value ?? "");
  return `"${stringValue.replaceAll('"', '""')}"`;
}

export default function MovementsPage() {
  const currentUser = useAuthStore((s) => s.currentUser);

  const [filters, setFilters] = React.useState<MovementFilterState>({
    type: null,
  });
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const movementQueryFilters = React.useMemo(
    () => (filters.type ? { type: filters.type } : {}),
    [filters.type]
  );

  const {
    data: movements = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["movements", movementQueryFilters],
    queryFn: () => apiGetMovements(movementQueryFilters).then(res => res.movements),
    refetchOnWindowFocus: true,
    refetchInterval: 60000,
  });

  const filtered = React.useMemo(() => {
    const result = [...movements];
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return result;
  }, [movements]);

  const stats = React.useMemo<StatCardItem[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysMovements = movements.filter((movement) => {
      const movementDate = new Date(movement.createdAt);
      movementDate.setHours(0, 0, 0, 0);
      return movementDate.getTime() === today.getTime();
    }).length;

    const netChange = movements.reduce(
      (sum, movement) => sum + (movement.newQuantity - movement.previousQuantity),
      0
    );

    const transfersLogged = movements.filter((movement) => movement.type === "transfer").length;
    const lastMovement = movements[0] ?? null;

    return [
      {
        label: "Today's Movements",
        value: `${todaysMovements}`,
        delta:
          todaysMovements > 0
            ? `${todaysMovements} recorded in the last 24h`
            : "No new movement activity today",
        deltaClassName: todaysMovements > 0 ? "text-emerald-400" : "text-[var(--text-muted)]",
      },
      {
        label: "Net Change",
        value: `${netChange > 0 ? "+" : ""}${netChange}`,
        delta:
          netChange > 0
            ? "Inventory expanded across active zones"
            : netChange < 0
              ? "Outbound volume exceeded inbound receipts"
              : "Balanced stock flow across all zones",
        deltaClassName:
          netChange > 0
            ? "text-emerald-400"
            : netChange < 0
              ? "text-red-400"
              : "text-[var(--text-muted)]",
      },
      {
        label: "Transfers Logged",
        value: `${transfersLogged}`,
        delta: "Logged only, stock unchanged",
        deltaClassName: transfersLogged > 0 ? "text-primary" : "text-[var(--text-muted)]",
      },
      {
        label: "Last Movement",
        value: formatRelativeTime(lastMovement?.createdAt),
        delta: lastMovement ? lastMovement.reason : "No movements yet",
        deltaClassName: lastMovement ? "text-primary" : "text-[var(--text-muted)]",
      },
    ];
  }, [movements]);

  const handleExportCsv = React.useCallback(() => {
    const headers = [
      "Timestamp",
      "SKU",
      "Product",
      "Type",
      "Quantity",
      "Location",
      "Reference",
      "Operator",
      "Reason",
      "Previous Quantity",
      "New Quantity",
    ];

    const rows = filtered.map((movement) => [
      movement.createdAt,
      movement.productSku,
      movement.productName,
      movement.type,
      movement.quantity,
      movement.location ?? "",
      movement.reference ?? "",
      movement.user ?? "",
      movement.reason,
      movement.previousQuantity,
      movement.newQuantity,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "movement-log.csv";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, [filtered]);

  const isAdmin = currentUser?.role === "admin";
  const isExecutive = currentUser?.role === "executive";

  return (
    <div className="page-content">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="page-header">
          <h1>Stock Movements</h1>
          <p>
            Track inbound receipts, outbound shipments, transfers, and adjustments
            across all warehouse zones in real time.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setDialogOpen(true)} size="sm">
            <Icon name="Plus" className="mr-1.5 h-4 w-4" />
            Record Movement
          </Button>
        )}
      </div>

      {isExecutive ? (
        <Empty className="border py-24">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Icon name="Lock" className="h-4 w-4" />
            </EmptyMedia>
            <EmptyTitle>Insufficient permissions</EmptyTitle>
            <EmptyDescription>
              You do not have access to view stock movements.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-4">
          {isLoading ? (
            <div className="py-24 text-center">Loading movements...</div>
          ) : isError ? (
            <Empty className="border py-24">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Icon name="TriangleAlert" className="h-4 w-4" />
                </EmptyMedia>
                <EmptyTitle>Failed to load movements</EmptyTitle>
                <EmptyDescription>
                  {error instanceof Error ? error.message : "Unable to load stock movements."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="relative overflow-hidden rounded-[2px] border border-border bg-card px-6 pt-6 pb-5"
                  >
                    <div className="absolute inset-x-0 top-0 h-[2px] bg-primary/60" />
                    <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      {stat.label}
                    </p>
                    <p className="mt-4 text-[32px] font-bold tracking-tight text-foreground">
                      {stat.value}
                    </p>
                    <p className={["mt-3 font-mono text-[12px]", stat.deltaClassName].join(" ")}>
                      {stat.delta}
                    </p>
                  </div>
                ))}
              </div>

              <MovementFilters filters={filters} onChange={setFilters} />

              <Card className="rounded-[2px] border border-border bg-card py-0 ring-0">
                <CardHeader className="px-6 py-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold tracking-tight text-foreground">
                        Movement Log
                      </CardTitle>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleExportCsv}
                      className="rounded-[4px]"
                    >
                      <Icon name="Download" className="mr-1.5 h-4 w-4" />
                      Export CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-0 pt-0 pb-0">
                  <MovementTable movements={filtered} />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      <RecordMovementDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
