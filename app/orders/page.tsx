"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/auth-store";
import Icon from "@/components/Icon";
import OrderTable from "@/components/orders/order-table";
import { apiGetOrders, apiUpdateOrder } from "@/lib/api";

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.currentUser);
  const [activeTab, setActiveTab] = React.useState<"pending" | "history">("pending");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => apiGetOrders().then(res => res.orders),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "approved" | "rejected" }) =>
      apiUpdateOrder(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      const label = variables.status === "approved" ? "approved" : "rejected";
      toast.success(`Order ${label} successfully`);
    },
    onError: (error: any) => toast.error(error.message),
  });

  const canAccess = currentUser?.role === "admin" || currentUser?.role === "manager";

  const handleApprove = (id: string) => {
    updateMutation.mutate({ id, status: "approved" });
  };

  const handleReject = (id: string) => {
    updateMutation.mutate({ id, status: "rejected" });
  };

  if (!canAccess) {
    return (
      <div className="page-content">
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Icon name="Lock" className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              You do not have permission to view this page. Only administrators and managers can
              manage order requests.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const pendingOrders = orders.filter((order) => order.status === "pending");
  const historyOrders = orders.filter((order) => order.status === "approved" || order.status === "rejected");

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Order Requests</h1>
        <p>Review, approve, and manage incoming customer order requests.</p>
      </div>
      {isLoading ? (
        <div className="py-24 text-center">Loading orders...</div>
      ) : (
        <div className="space-y-8">
          <div role="tablist" className="flex flex-wrap items-center gap-2">
            {[
              { key: "pending", label: `Pending Approval (${pendingOrders.length})` },
              { key: "history", label: `Order History (${historyOrders.length})` },
            ].map((tab) => {
              const isActive = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setActiveTab(tab.key as "pending" | "history")}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                      event.preventDefault();
                      setActiveTab((current) => (current === "pending" ? "history" : "pending"));
                    }
                  }}
                  className={[
                    "rounded-[4px] border px-4 py-2 text-[13px] font-semibold transition-colors",
                    isActive
                      ? "border-primary/40 bg-accent/10 text-primary"
                      : "border-[var(--border-strong)] bg-transparent text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === "pending" ? (
            <section className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Pending Approval</h2>
                <p className="text-sm text-muted-foreground">New order requests waiting for approval or rejection.</p>
              </div>
              <OrderTable orders={pendingOrders} onApprove={handleApprove} onReject={handleReject} />
            </section>
          ) : (
            <section className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Order History</h2>
                <p className="text-sm text-muted-foreground">Previously approved or rejected requests remain visible here.</p>
              </div>
              <OrderTable orders={historyOrders} onApprove={handleApprove} onReject={handleReject} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}
