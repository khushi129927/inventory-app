"use client";

import * as React from "react";
import type { Metadata } from "next";
import { useParams } from "next/navigation";
import Icon from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { usePublicOutstanding } from "@/hooks/use-outstanding";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function invoiceDueLabel(daysOverdue: number) {
  if (daysOverdue > 0) {
    return `${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue`;
  }

  if (daysOverdue < 0) {
    const daysUntilDue = Math.abs(daysOverdue);
    return `Due in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}`;
  }

  return "Due today";
}

export default function PublicOutstandingPage() {
  const params = useParams<{ token: string }>();
  const token = typeof params?.token === "string" ? params.token : "";
  const outstandingQuery = usePublicOutstanding(token);

  const clients = React.useMemo(() => {
    return [...(outstandingQuery.data?.clients ?? [])].sort((left, right) => {
      if (left.overdueBalance > 0 && right.overdueBalance <= 0) {
        return -1;
      }
      if (left.overdueBalance <= 0 && right.overdueBalance > 0) {
        return 1;
      }
      return right.totalBalance - left.totalBalance;
    });
  }, [outstandingQuery.data]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-6 sm:px-6 sm:py-8">
        {outstandingQuery.isLoading ? (
          <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
            Loading outstanding details...
          </div>
        ) : outstandingQuery.isError ? (
          outstandingQuery.error instanceof Error && outstandingQuery.error.message.includes("404") ? (
            <Empty className="my-auto border py-20">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Icon name="Link2Off" className="h-4 w-4" />
                </EmptyMedia>
                <EmptyTitle>This link is not valid or has expired.</EmptyTitle>
                <EmptyDescription>Please ask for a new message.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Empty className="my-auto border py-20">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Icon name="TriangleAlert" className="h-4 w-4" />
                </EmptyMedia>
                <EmptyTitle>Could not load this outstanding link</EmptyTitle>
                <EmptyDescription>
                  {outstandingQuery.error instanceof Error
                    ? outstandingQuery.error.message
                    : "Please check your connection and try again."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )
        ) : outstandingQuery.data ? (
          <div className="space-y-4 sm:space-y-5">
            <div className="rounded-[8px] border border-border bg-card px-5 py-5 shadow-sm">
              <div className="page-header">
                <h1>StockForge</h1>
                <p>Outstanding as of {formatDate(outstandingQuery.data.asOf)}</p>
              </div>
              <div className="mt-5 rounded-[6px] border border-border bg-background px-4 py-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">Grand total</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                  {formatCurrency(outstandingQuery.data.grandTotal, "INR - Indian Rupee", 0)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Shared for {outstandingQuery.data.salesPersonFirstName}.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {clients.map((client) => (
                <Card key={client.clientName} className="rounded-[8px] border border-border bg-card py-0 shadow-sm">
                  <CardHeader className="px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <CardTitle className="text-base text-foreground">{client.clientName}</CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">Credit period: {client.creditDays} days</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-base font-semibold text-foreground">
                          {formatCurrency(client.totalBalance, "INR - Indian Rupee", 0)}
                        </p>
                        <p className={client.overdueBalance > 0 ? "text-sm text-red-600 dark:text-red-400" : "text-sm text-muted-foreground"}>
                          Overdue: {formatCurrency(client.overdueBalance, "INR - Indian Rupee", 0)}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 border-t px-4 py-4 sm:px-5">
                    {client.invoices.map((invoice) => {
                      const isOverdue = invoice.daysOverdue > 0;
                      const isDueToday = invoice.daysOverdue === 0;
                      return (
                        <div key={invoice.invoiceNo} className="rounded-[6px] border border-border bg-background px-3 py-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="font-medium text-foreground">{invoice.invoiceNo}</p>
                              <p className="mt-1 text-sm text-muted-foreground">Due {formatDate(invoice.dueDate)}</p>
                            </div>
                            <div className="flex flex-col items-start gap-2 sm:items-end">
                              <p className="font-semibold text-foreground">
                                {formatCurrency(invoice.balance, "INR - Indian Rupee", 0)}
                              </p>
                              <Badge variant={isOverdue ? "destructive" : isDueToday ? "secondary" : "outline"}>
                                {invoiceDueLabel(invoice.daysOverdue)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
