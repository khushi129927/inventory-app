"use client";

import * as React from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { NotificationStatus, NotifyChannel, SalesPerson } from "@/app/types/inventory";
import Icon from "@/components/Icon";
import { formatCurrency } from "@/lib/utils";
import {
  useOutstandingClient,
  useOutstandingClients,
  useOutstandingNotifications,
  useOutstandingSummary,
  useRevokeOutstandingLinks,
  useSalesPeople,
  useSendOutstandingTestMessage,
  useUpdateOutstandingClient,
  useUpdateSalesPerson,
} from "@/hooks/use-outstanding";
import UploadOutstandingDialog from "@/components/outstanding/upload-outstanding-dialog";

const statusChips = [
  { label: "All", value: null },
  { label: "Overdue", value: "overdue" },
  { label: "Due soon", value: "due_soon" },
  { label: "Not yet due", value: "not_due" },
] as const;

const notificationStatusOptions: Array<{ label: string; value: NotificationStatus | "all" }> = [
  { label: "All statuses", value: "all" },
  { label: "Sent", value: "sent" },
  { label: "Failed", value: "failed" },
  { label: "Skipped", value: "skipped" },
  { label: "Dry run", value: "dry_run" },
  { label: "Queued", value: "queued" },
  { label: "Retrying", value: "retrying" },
];

const notifyChannelOptions: Array<{ label: string; value: NotifyChannel }> = [
  { label: "SMS", value: "sms" },
  { label: "WhatsApp", value: "whatsapp" },
  { label: "Both", value: "both" },
  { label: "None", value: "none" },
];

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

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDueState(nextDueDate: string | null, overdueBalance: number, oldestOverdueDays: number) {
  if (!nextDueDate) {
    return { text: "—", helper: "", overdue: false };
  }

  if (overdueBalance > 0) {
    return {
      text: formatDate(nextDueDate),
      helper: `${oldestOverdueDays} day${oldestOverdueDays === 1 ? "" : "s"} overdue`,
      overdue: true,
    };
  }

  return {
    text: formatDate(nextDueDate),
    helper: "Upcoming due date",
    overdue: false,
  };
}

function getNotificationBadgeVariant(status: NotificationStatus): "default" | "destructive" | "secondary" | "outline" {
  if (status === "failed") {
    return "destructive";
  }

  if (status === "sent") {
    return "default";
  }

  if (status === "dry_run") {
    return "secondary";
  }

  return "outline";
}

function normalizeIndianPhone(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return { valid: true, normalized: null, message: "" };
  }

  const compact = trimmed.replace(/[\s()-]/g, "");

  if (/^\+?[1-9]\d{7,14}$/.test(compact)) {
    const normalized = compact.startsWith("+") ? compact : `+${compact}`;
    return { valid: true, normalized, message: "" };
  }

  if (/^91\d{10}$/.test(compact)) {
    return { valid: true, normalized: `+${compact}`, message: "" };
  }

  if (/^\d{10}$/.test(compact)) {
    return { valid: true, normalized: `+91${compact}`, message: "" };
  }

  return {
    valid: false,
    normalized: null,
    message: "Enter a valid phone number in E.164 format, or use a 10-digit Indian mobile number.",
  };
}

function extractLatestLink(messageText: string) {
  const match = messageText.match(/https?:\/\/\S+/);
  return match ? match[0] : null;
}

function SalespeopleDialog({
  open,
  onOpenChange,
  salesPeopleQuery,
  canEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salesPeopleQuery: ReturnType<typeof useSalesPeople>;
  canEdit: boolean;
}) {
  const updateSalesPersonMutation = useUpdateSalesPerson();
  const salesPeople = salesPeopleQuery.data ?? [];
  const [drafts, setDrafts] = React.useState<Record<string, { phone: string; notifyChannel: NotifyChannel; active: boolean }>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!open || salesPeople.length === 0) {
      return;
    }

    setDrafts(
      Object.fromEntries(
        salesPeople.map((person) => [
          person.id,
          {
            phone: person.phone ?? "",
            notifyChannel: person.notifyChannel,
            active: person.active,
          },
        ])
      )
    );
    setErrors({});
  }, [open, salesPeople]);

  const updateDraft = (id: string, patch: Partial<{ phone: string; notifyChannel: NotifyChannel; active: boolean }>) => {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...(current[id] ?? { phone: "", notifyChannel: "none", active: true }),
        ...patch,
      },
    }));
  };

  const handleSave = async (person: SalesPerson) => {
    const draft = drafts[person.id];
    if (!draft) {
      return;
    }

    const phoneResult = normalizeIndianPhone(draft.phone);
    if (!phoneResult.valid) {
      setErrors((current) => ({ ...current, [person.id]: phoneResult.message }));
      return;
    }

    setErrors((current) => ({ ...current, [person.id]: "" }));
    await updateSalesPersonMutation.mutateAsync({
      id: person.id,
      data: {
        phone: phoneResult.normalized,
        notifyChannel: draft.notifyChannel,
        active: draft.active,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] w-[92vw] max-w-4xl flex-col overflow-hidden p-0">
        <div className="border-b px-6 py-5">
          <DialogHeader>
            <DialogTitle>Salespeople</DialogTitle>
            <DialogDescription>
              Manage phone numbers, notification channels, and active status for outstanding reminders.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {salesPeopleQuery.isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-[8px] border border-border bg-card p-4">
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_190px_120px_auto]">
                    <div className="h-16 animate-pulse rounded-[6px] bg-muted" />
                    <div className="h-16 animate-pulse rounded-[6px] bg-muted" />
                    <div className="h-10 animate-pulse rounded-[6px] bg-muted" />
                    <div className="h-10 animate-pulse rounded-[6px] bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : salesPeopleQuery.isError ? (
            <Empty className="border py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Icon name="TriangleAlert" className="h-4 w-4" />
                </EmptyMedia>
                <EmptyTitle>Failed to load salespeople</EmptyTitle>
                <EmptyDescription>
                  {salesPeopleQuery.error instanceof Error ? salesPeopleQuery.error.message : "Unable to load salespeople."}
                </EmptyDescription>
              </EmptyHeader>
              <div className="mt-4 flex justify-center">
                <Button type="button" variant="outline" onClick={() => salesPeopleQuery.refetch()}>
                  Retry
                </Button>
              </div>
            </Empty>
          ) : salesPeople.length === 0 ? (
            <Empty className="border py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Icon name="Users" className="h-4 w-4" />
                </EmptyMedia>
                <EmptyTitle>No salespeople yet.</EmptyTitle>
                <EmptyDescription>Upload an Outstanding file to add them.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="space-y-4">
              {salesPeople.map((person) => {
                const draft = drafts[person.id] ?? {
                  phone: person.phone ?? "",
                  notifyChannel: person.notifyChannel,
                  active: person.active,
                };

                return (
                  <div key={person.id} className="rounded-[8px] border border-border bg-card p-4">
                    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1.1fr)_190px_120px_auto] lg:items-end">
                      <div className="space-y-2">
                        <Label htmlFor={`salesperson-phone-${person.id}`}>{person.name}</Label>
                        <Input
                          id={`salesperson-phone-${person.id}`}
                          value={draft.phone}
                          onChange={(event) => updateDraft(person.id, { phone: event.target.value })}
                          disabled={!canEdit || updateSalesPersonMutation.isPending}
                          placeholder="+919876543210"
                        />
                        {errors[person.id] ? (
                          <p className="text-xs text-red-600 dark:text-red-400">{errors[person.id]}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">10-digit Indian numbers are converted to +91 automatically.</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Notify channel</Label>
                        <Select
                          value={draft.notifyChannel}
                          onValueChange={(value) => updateDraft(person.id, { notifyChannel: value as NotifyChannel })}
                          disabled={!canEdit || updateSalesPersonMutation.isPending}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select channel" />
                          </SelectTrigger>
                          <SelectContent>
                            {notifyChannelOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between rounded-[6px] border border-border px-3 py-2 lg:h-10">
                        <Label htmlFor={`salesperson-active-${person.id}`}>Active</Label>
                        <Switch
                          id={`salesperson-active-${person.id}`}
                          checked={draft.active}
                          onCheckedChange={(checked) => updateDraft(person.id, { active: checked })}
                          disabled={!canEdit || updateSalesPersonMutation.isPending}
                        />
                      </div>
                      <Button type="button" onClick={() => handleSave(person)} disabled={!canEdit || updateSalesPersonMutation.isPending}>
                        {updateSalesPersonMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}

export default function OutstandingPage() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const canAccess = currentUser?.role === "admin" || currentUser?.role === "manager";
  const isAdmin = currentUser?.role === "admin";
  const [activeTab, setActiveTab] = React.useState<"clients" | "notifications">("clients");
  const [search, setSearch] = React.useState("");
  const [salesPersonId, setSalesPersonId] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<"overdue" | "due_soon" | "not_due" | null>(null);
  const [selectedClientId, setSelectedClientId] = React.useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [salespeopleOpen, setSalespeopleOpen] = React.useState(false);
  const [sendTestOpen, setSendTestOpen] = React.useState(false);
  const [revokeTarget, setRevokeTarget] = React.useState<SalesPerson | null>(null);
  const [creditDays, setCreditDays] = React.useState("");
  const [selectedSalesPersonId, setSelectedSalesPersonId] = React.useState<string>("unassigned");
  const [applyToOpenInvoices, setApplyToOpenInvoices] = React.useState(false);
  const [notificationSalesPersonId, setNotificationSalesPersonId] = React.useState<string>("all");
  const [notificationStatus, setNotificationStatus] = React.useState<NotificationStatus | "all">("all");
  const [notificationsPage, setNotificationsPage] = React.useState(1);
  const [testSalesPersonId, setTestSalesPersonId] = React.useState<string>("none");

  const summaryQuery = useOutstandingSummary();
  const salesPeopleQuery = useSalesPeople();
  const clientsQuery = useOutstandingClients({ search, salesPersonId, status });
  const clientDetailQuery = useOutstandingClient(selectedClientId);
  const notificationsQuery = useOutstandingNotifications({
    salesPersonId: notificationSalesPersonId === "all" ? null : notificationSalesPersonId,
    status: notificationStatus === "all" ? null : notificationStatus,
    page: notificationsPage,
    pageSize: 10,
  });
  const updateClientMutation = useUpdateOutstandingClient();
  const sendTestMutation = useSendOutstandingTestMessage();
  const revokeLinksMutation = useRevokeOutstandingLinks();

  React.useEffect(() => {
    if (clientDetailQuery.data) {
      setCreditDays(String(clientDetailQuery.data.creditDays));
      setSelectedSalesPersonId(clientDetailQuery.data.salesPerson?.id ?? "unassigned");
      setApplyToOpenInvoices(false);
    }
  }, [clientDetailQuery.data]);

  React.useEffect(() => {
    setNotificationsPage(1);
  }, [notificationSalesPersonId, notificationStatus]);

  const summaryCards = [
    {
      label: "Total Outstanding",
      value: formatCurrency(summaryQuery.data?.totalOutstanding ?? 0, "INR - Indian Rupee", 0),
      delta: "Current open balance across all clients",
      deltaClassName: "text-[var(--text-muted)]",
    },
    {
      label: "Overdue",
      value: formatCurrency(summaryQuery.data?.overdueAmount ?? 0, "INR - Indian Rupee", 0),
      delta: "Balance already past the due date",
      deltaClassName: "text-red-400",
    },
    {
      label: "Due in 7 Days",
      value: formatCurrency(summaryQuery.data?.dueIn7Days ?? 0, "INR - Indian Rupee", 0),
      delta: "Upcoming dues in the next week",
      deltaClassName: "text-amber-400",
    },
    {
      label: "Clients with Dues",
      value: String(summaryQuery.data?.clientsWithDues ?? 0),
      delta: "Clients currently carrying balance",
      deltaClassName: "text-primary",
    },
  ];

  const notificationTotalPages = Math.max(1, Math.ceil((notificationsQuery.data?.total ?? 0) / (notificationsQuery.data?.pageSize ?? 10)));
  const latestStatuses = notificationsQuery.data?.notifications.slice(0, 5).map((item) => item.status) ?? [];
  const showDryRunBanner =
    notificationsQuery.data?.provider === "log" ||
    (latestStatuses.length > 0 && latestStatuses.every((statusItem) => statusItem === "dry_run"));

  const saveChanges = async () => {
    if (!selectedClientId) {
      return;
    }

    await updateClientMutation.mutateAsync({
      id: selectedClientId,
      data: {
        creditDays: Number(creditDays),
        salesPersonId: selectedSalesPersonId === "unassigned" ? null : selectedSalesPersonId,
        applyToOpenInvoices,
      },
    });
  };

  const handleSendTest = async () => {
    if (testSalesPersonId === "none") {
      toast.error("Select a salesperson first");
      return;
    }

    const result = await sendTestMutation.mutateAsync(testSalesPersonId);
    toast.success(`Test message created with status ${result.notification.status}`);
    setSendTestOpen(false);
  };

  const handleRevokeLinks = async () => {
    if (!revokeTarget) {
      return;
    }

    await revokeLinksMutation.mutateAsync(revokeTarget.id);
    setRevokeTarget(null);
  };

  if (!canAccess) {
    return (
      <div className="page-content">
        <Empty className="border py-24">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Icon name="Lock" className="h-4 w-4" />
            </EmptyMedia>
            <EmptyTitle>Insufficient permissions</EmptyTitle>
            <EmptyDescription>
              You do not have access to view outstanding balances.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="page-header">
          <h1>Outstanding</h1>
          <p>Track what each client owes, notification activity, and salesperson reminder settings.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setSalespeopleOpen(true)}>
            <Icon name="Users" className="mr-1.5 h-4 w-4" />
            Salespeople
          </Button>
          <Button onClick={() => setUploadOpen(true)} size="sm">
            <Icon name="Upload" className="mr-1.5 h-4 w-4" />
            Upload Outstanding
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        <div role="tablist" className="flex flex-wrap items-center gap-2">
          {[
            { key: "clients", label: "Clients" },
            { key: "notifications", label: "Notifications" },
          ].map((tab) => {
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTab(tab.key as "clients" | "notifications")}
                onKeyDown={(event) => {
                  if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                    event.preventDefault();
                    setActiveTab((current) => (current === "clients" ? "notifications" : "clients"));
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

        {activeTab === "clients" ? (
          <div className="space-y-4">
            {summaryQuery.isLoading ? (
              <div className="py-24 text-center">Loading outstanding summary...</div>
            ) : summaryQuery.isError ? (
              <Empty className="border py-24">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Icon name="TriangleAlert" className="h-4 w-4" />
                  </EmptyMedia>
                  <EmptyTitle>Failed to load outstanding summary</EmptyTitle>
                  <EmptyDescription>
                    {summaryQuery.error instanceof Error ? summaryQuery.error.message : "Unable to load outstanding summary."}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {summaryCards.map((stat) => (
                  <div key={stat.label} className="relative overflow-hidden rounded-[2px] border border-border bg-card px-6 pt-6 pb-5">
                    <div className="absolute inset-x-0 top-0 h-[2px] bg-primary/60" />
                    <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">{stat.label}</p>
                    <p className="mt-4 text-[32px] font-bold tracking-tight text-foreground">{stat.value}</p>
                    <p className={["mt-3 font-mono text-[12px]", stat.deltaClassName].join(" ")}>{stat.delta}</p>
                  </div>
                ))}
              </div>
            )}

            <Card className="rounded-[2px] border border-border bg-card py-0 ring-0">
              <CardHeader className="px-6 py-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="grid flex-1 gap-3 md:grid-cols-[minmax(0,1.4fr)_220px]">
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search client or salesperson"
                      className="rounded-[4px]"
                    />
                    <Select value={salesPersonId ?? "all"} onValueChange={(value) => setSalesPersonId(value === "all" ? null : value)}>
                      <SelectTrigger className="rounded-[4px]">
                        <SelectValue placeholder="All salespeople" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All salespeople</SelectItem>
                        {(salesPeopleQuery.data ?? []).map((person) => (
                          <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {statusChips.map((chip) => {
                      const isActive = status === chip.value;
                      return (
                        <button
                          key={chip.label}
                          type="button"
                          onClick={() => setStatus(chip.value)}
                          className={[
                            "rounded-[4px] border px-4 py-2 text-[13px] font-semibold transition-colors",
                            isActive
                              ? "border-primary/40 bg-accent/10 text-primary"
                              : "border-[var(--border-strong)] bg-transparent text-muted-foreground hover:text-foreground",
                          ].join(" ")}
                          aria-pressed={isActive}
                        >
                          {chip.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-0 pt-0 pb-0">
                {salesPeopleQuery.isError ? (
                  <Empty className="border-0 py-16">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Icon name="TriangleAlert" className="h-4 w-4" />
                      </EmptyMedia>
                      <EmptyTitle>Failed to load salespeople</EmptyTitle>
                      <EmptyDescription>
                        {salesPeopleQuery.error instanceof Error ? salesPeopleQuery.error.message : "Unable to load salespeople."}
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : clientsQuery.isLoading ? (
                  <div className="py-24 text-center">Loading outstanding clients...</div>
                ) : clientsQuery.isError ? (
                  <Empty className="border-0 py-24">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Icon name="TriangleAlert" className="h-4 w-4" />
                      </EmptyMedia>
                      <EmptyTitle>Failed to load outstanding clients</EmptyTitle>
                      <EmptyDescription>
                        {clientsQuery.error instanceof Error ? clientsQuery.error.message : "Unable to load outstanding clients."}
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (clientsQuery.data ?? []).length === 0 ? (
                  <Empty className="border-0 py-24">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Icon name="Wallet" className="h-4 w-4" />
                      </EmptyMedia>
                      <EmptyTitle>No outstanding balances.</EmptyTitle>
                      <EmptyDescription>
                        Upload an Outstanding file to get started.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Salesperson</TableHead>
                        <TableHead>Credit period</TableHead>
                        <TableHead className="text-right">Total Outstanding</TableHead>
                        <TableHead className="text-right">Overdue</TableHead>
                        <TableHead>Next due date</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(clientsQuery.data ?? []).map((client) => {
                        const dueState = getDueState(client.nextDueDate, client.overdueBalance, client.oldestOverdueDays);
                        return (
                          <TableRow key={client.clientId} className={client.overdueBalance > 0 ? "border-l-2 border-l-red-400/60 bg-red-50/40 dark:bg-red-950/10" : undefined}>
                            <TableCell>
                              <div>
                                <div className="font-medium text-foreground">{client.clientName}</div>
                                <div className="text-xs text-muted-foreground">{client.invoiceCount} open invoice{client.invoiceCount === 1 ? "" : "s"}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium text-foreground">{client.salesPerson?.name ?? "Unassigned"}</div>
                                <div className="text-xs text-muted-foreground">{client.salesPerson?.phone ?? "No phone"}</div>
                              </div>
                            </TableCell>
                            <TableCell>{client.creditDays} days</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(client.totalBalance, "INR - Indian Rupee", 0)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(client.overdueBalance, "INR - Indian Rupee", 0)}</TableCell>
                            <TableCell>
                              <div className={dueState.overdue ? "text-red-600 dark:text-red-400" : "text-foreground"}>{dueState.text}</div>
                              {dueState.helper ? <div className={dueState.overdue ? "text-xs text-red-600 dark:text-red-400" : "text-xs text-muted-foreground"}>{dueState.helper}</div> : null}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedClientId(client.clientId)}>
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <section className="space-y-4">
            {showDryRunBanner ? (
              <div className="rounded-[6px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                Notifications are in dry-run mode, nothing is being sent.
              </div>
            ) : null}

            <Card className="rounded-[2px] border border-border bg-card py-0 ring-0">
              <CardHeader className="px-6 py-5">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="grid gap-3 md:grid-cols-[220px_220px]">
                    <Select value={notificationSalesPersonId} onValueChange={setNotificationSalesPersonId}>
                      <SelectTrigger className="rounded-[4px]">
                        <SelectValue placeholder="All salespeople" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All salespeople</SelectItem>
                        {(salesPeopleQuery.data ?? []).map((person) => (
                          <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={notificationStatus} onValueChange={(value) => setNotificationStatus(value as NotificationStatus | "all")}>
                      <SelectTrigger className="rounded-[4px]">
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        {notificationStatusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {isAdmin ? (
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setSendTestOpen(true)}>
                        <Icon name="Send" className="mr-1.5 h-4 w-4" />
                        Send test message
                      </Button>
                    </div>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-4 px-0 pt-0 pb-5">
                {notificationsQuery.isLoading ? (
                  <div className="py-24 text-center">Loading notifications...</div>
                ) : notificationsQuery.isError ? (
                  <Empty className="border-0 py-24">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Icon name="TriangleAlert" className="h-4 w-4" />
                      </EmptyMedia>
                      <EmptyTitle>Failed to load notifications</EmptyTitle>
                      <EmptyDescription>
                        {notificationsQuery.error instanceof Error ? notificationsQuery.error.message : "Unable to load notification history."}
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (notificationsQuery.data?.notifications.length ?? 0) === 0 ? (
                  <Empty className="border-0 py-24">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Icon name="BellOff" className="h-4 w-4" />
                      </EmptyMedia>
                      <EmptyTitle>No notification logs yet.</EmptyTitle>
                      <EmptyDescription>
                        Send a test message or run the daily job to populate notification history.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Salesperson</TableHead>
                          <TableHead>Channel</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Message</TableHead>
                          <TableHead>Error</TableHead>
                          {isAdmin ? <TableHead className="text-right">Actions</TableHead> : null}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {notificationsQuery.data?.notifications.map((notification) => {
                          const link = extractLatestLink(notification.messageText);
                          const person = (salesPeopleQuery.data ?? []).find((item) => item.id === notification.salesPersonId);

                          return (
                            <TableRow key={notification.id}>
                              <TableCell>{formatDateTime(notification.createdAt)}</TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium text-foreground">{notification.salesPersonName}</div>
                                  <div className="text-xs text-muted-foreground">{notification.kind === "manual_test" ? "Manual test" : "Due today"}</div>
                                </div>
                              </TableCell>
                              <TableCell className="uppercase">{notification.channel}</TableCell>
                              <TableCell>
                                <Badge variant={getNotificationBadgeVariant(notification.status)}>{notification.status}</Badge>
                              </TableCell>
                              <TableCell className="max-w-[360px] whitespace-pre-wrap text-sm text-muted-foreground">{notification.messageText}</TableCell>
                              <TableCell className="max-w-[220px] whitespace-pre-wrap text-sm text-red-600 dark:text-red-400">{notification.errorMessage ?? "—"}</TableCell>
                              {isAdmin ? (
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    {link ? (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={async () => {
                                          try {
                                            await navigator.clipboard.writeText(link);
                                            toast.success("Link copied to clipboard");
                                          } catch {
                                            toast.error("Failed to copy link");
                                          }
                                        }}
                                      >
                                        Copy link
                                      </Button>
                                    ) : null}
                                    {person ? (
                                      <Button type="button" variant="outline" size="sm" onClick={() => setRevokeTarget(person)}>
                                        Revoke links
                                      </Button>
                                    ) : null}
                                  </div>
                                </TableCell>
                              ) : null}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>

                    <div className="px-6">
                      <Pagination className="justify-end">
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              href="#"
                              onClick={(event) => {
                                event.preventDefault();
                                if (notificationsPage > 1) {
                                  setNotificationsPage((current) => current - 1);
                                }
                              }}
                            />
                          </PaginationItem>
                          <PaginationItem>
                            <span className="px-3 text-sm text-muted-foreground">
                              Page {notificationsPage} of {notificationTotalPages}
                            </span>
                          </PaginationItem>
                          <PaginationItem>
                            <PaginationNext
                              href="#"
                              onClick={(event) => {
                                event.preventDefault();
                                if (notificationsPage < notificationTotalPages) {
                                  setNotificationsPage((current) => current + 1);
                                }
                              }}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </section>
        )}
      </div>

      <Sheet open={Boolean(selectedClientId)} onOpenChange={(open) => !open && setSelectedClientId(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader className="border-b px-6 py-5">
            <SheetTitle>{clientDetailQuery.data?.name ?? "Client details"}</SheetTitle>
            <SheetDescription>
              Review open invoices and update the salesperson or credit period for this client.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 px-6 py-5">
            {clientDetailQuery.isLoading ? (
              <div className="py-16 text-center">Loading client details...</div>
            ) : clientDetailQuery.isError ? (
              <Empty className="border py-16">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Icon name="TriangleAlert" className="h-4 w-4" />
                  </EmptyMedia>
                  <EmptyTitle>Failed to load client details</EmptyTitle>
                  <EmptyDescription>
                    {clientDetailQuery.error instanceof Error ? clientDetailQuery.error.message : "Unable to load client details."}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : clientDetailQuery.data ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="credit-days">Credit days</Label>
                    <Input id="credit-days" type="number" min="0" value={creditDays} onChange={(event) => setCreditDays(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Salesperson</Label>
                    <Select value={selectedSalesPersonId} onValueChange={setSelectedSalesPersonId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select salesperson" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {(salesPeopleQuery.data ?? []).map((person) => (
                          <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-[6px] border border-border p-3">
                  <Checkbox id="apply-to-open-invoices" checked={applyToOpenInvoices} onCheckedChange={(checked) => setApplyToOpenInvoices(Boolean(checked))} />
                  <Label htmlFor="apply-to-open-invoices">Apply to open invoices too?</Label>
                </div>

                <div className="overflow-hidden rounded-[6px] border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead>Due date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientDetailQuery.data.invoices.map((invoice) => (
                        <TableRow key={invoice.invoiceNo}>
                          <TableCell>
                            <div className="font-medium text-foreground">{invoice.invoiceNo}</div>
                            <div className="text-xs text-muted-foreground">{invoice.creditDays} days credit</div>
                          </TableCell>
                          <TableCell>{formatDate(invoice.invoiceDate)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(invoice.amount, "INR - Indian Rupee", 0)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(invoice.paidAmount, "INR - Indian Rupee", 0)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(invoice.balance, "INR - Indian Rupee", 0)}</TableCell>
                          <TableCell>
                            <div className={invoice.daysOverdue > 0 ? "text-red-600 dark:text-red-400" : "text-foreground"}>{formatDate(invoice.dueDate)}</div>
                            {invoice.daysOverdue > 0 ? (
                              <div className="mt-1 flex items-center gap-2">
                                <Badge variant="destructive">Overdue</Badge>
                                <span className="text-xs text-red-600 dark:text-red-400">{invoice.daysOverdue} days overdue</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Not overdue</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : null}
          </div>

          <SheetFooter className="border-t px-6 py-4">
            <div className="flex w-full justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSelectedClientId(null)}>
                Close
              </Button>
              <Button type="button" onClick={saveChanges} disabled={!clientDetailQuery.data || updateClientMutation.isPending}>
                {updateClientMutation.isPending ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={sendTestOpen} onOpenChange={setSendTestOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send test message</DialogTitle>
            <DialogDescription>Select a salesperson to create a manual test notification.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Salesperson</Label>
            <Select value={testSalesPersonId} onValueChange={setTestSalesPersonId}>
              <SelectTrigger>
                <SelectValue placeholder="Select salesperson" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select salesperson</SelectItem>
                {(salesPeopleQuery.data ?? []).map((person) => (
                  <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSendTestOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleSendTest} disabled={sendTestMutation.isPending}>
              {sendTestMutation.isPending ? "Sending..." : "Send test message"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(revokeTarget)} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10">
              <Icon name="Link2Off" className="h-5 w-5 text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>Revoke outstanding links</AlertDialogTitle>
            <AlertDialogDescription>
              {revokeTarget ? `Revoke all active outstanding links for ${revokeTarget.name}? Existing links will stop working immediately.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokeLinksMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleRevokeLinks} disabled={revokeLinksMutation.isPending}>
              {revokeLinksMutation.isPending ? "Revoking..." : "Revoke links"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SalespeopleDialog
        open={salespeopleOpen}
        onOpenChange={setSalespeopleOpen}
        salesPeopleQuery={salesPeopleQuery}
        canEdit={Boolean(canAccess)}
      />

      <UploadOutstandingDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
}
