"use client";

import * as React from "react";
import { toast } from "sonner";

import type { User } from "@/app/types/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/auth-store";
import { useInventoryStore } from "@/lib/store";
import { useUsers } from "@/hooks/use-users";

function getRoleLabel(role: User["role"]): string {
  switch (role) {
    case "admin":
      return "Owner";
    case "manager":
      return "Manager";
    case "executive":
      return "Viewer";
    default:
      return role;
  }
}

function getRoleClassName(role: User["role"]): string {
  switch (role) {
    case "admin":
      return "bg-amber-500/12 text-amber-600 dark:text-amber-500";
    case "manager":
      return "bg-slate-400/10 text-slate-400";
    case "executive":
      return "bg-zinc-500/10 text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getUserStatus(user: User, currentUsername?: string): { label: string; dotClassName: string } {
  if (currentUsername && user.username === currentUsername) {
    return {
      label: "Active",
      dotClassName: "bg-emerald-500 shadow-[0_0_0_2px_rgba(34,197,94,0.18)]",
    };
  }

  return {
    label: "Active",
    dotClassName: "bg-emerald-500 shadow-[0_0_0_2px_rgba(34,197,94,0.18)]",
  };
}

export default function OrganizationSettingsPage() {
  const authUser = useAuthStore((state) => state.currentUser);
  const organization = useInventoryStore((state) => state.organization);
  const updateOrganization = useInventoryStore((state) => state.updateOrganization);
  const resetWorkspaceData = useInventoryStore((state) => state.resetWorkspaceData);
  const { data: users = [] } = useUsers();

  const [organizationName, setOrganizationName] = React.useState(organization.name);
  const [currency, setCurrency] = React.useState(organization.currency);
  const [warehouseLocation, setWarehouseLocation] = React.useState(organization.warehouseLocation);
  const [ownershipTransferTargetUserId, setOwnershipTransferTargetUserId] = React.useState(
    organization.ownershipTransferTargetUserId
  );
  const currencyOptions = [
    "INR - Indian Rupee",
    "USD - United States Dollar",
    "EUR - Euro",
    "GBP - British Pound",
    "AED - UAE Dirham",
  ];

  React.useEffect(() => {
    setOrganizationName(organization.name);
    setCurrency(organization.currency);
    setWarehouseLocation(organization.warehouseLocation);
    setOwnershipTransferTargetUserId(organization.ownershipTransferTargetUserId);
  }, [organization]);

  const isDirty =
    organizationName !== organization.name ||
    currency !== organization.currency ||
    warehouseLocation !== organization.warehouseLocation ||
    ownershipTransferTargetUserId !== organization.ownershipTransferTargetUserId;

  const handleResetForm = () => {
    setOrganizationName(organization.name);
    setCurrency(organization.currency);
    setWarehouseLocation(organization.warehouseLocation);
    setOwnershipTransferTargetUserId(organization.ownershipTransferTargetUserId);
  };

  const handleSave = () => {
    updateOrganization({
      name: organizationName,
      currency,
      warehouseLocation,
      ownershipTransferTargetUserId,
    });
    toast.success("Workspace profile updated");
  };

  const handleOwnershipTransfer = () => {
    if (!ownershipTransferTargetUserId) {
      toast.error("Select a team member before transferring ownership.");
      return;
    }

    const targetUser = users.find((user) => user.id === ownershipTransferTargetUserId);
    updateOrganization({ ownershipTransferTargetUserId });
    toast.success(
      targetUser
        ? `Ownership transfer initiated for ${targetUser.name}.`
        : "Ownership transfer initiated."
    );
  };

  const handleWorkspaceReset = () => {
    resetWorkspaceData();
    toast.success("Workspace data reset to defaults");
  };

  const transferableUsers = users.filter((user) => user.id !== authUser?.id);

  return (
    <>
      <div className="relative overflow-hidden rounded-[2px] border border-border bg-background text-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.04)_1px,transparent_0)] [background-size:24px_24px] opacity-60" />

        <div className="relative min-h-[780px]">
          <main>
              <header className="flex min-h-16 flex-col justify-center gap-3 border-b border-border px-6 py-4 md:flex-row md:items-center md:justify-between md:px-8">
<div className="font-mono text-[13px] tracking-[0.02em] text-[#6b6b6b]">
                Settings / <span className="text-[#8a8a8a]">Organization</span>
              </div>
              <div className="flex items-center gap-4 self-start md:self-auto">
                <div className="font-mono text-xs uppercase tracking-[0.04em] text-[#6b6b6b]">
                  {authUser?.name ?? "Elena Voss"}
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-white/12 bg-[#1a1a1a] font-mono text-xs text-[#8a8a8a]">
                  {(authUser?.name ?? "EV")
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
              </div>
            </header>

            <div className="flex flex-col gap-8 px-6 py-8 md:px-8 md:py-10">
              <div>
                <h1 className="mb-2 text-3xl font-bold tracking-[-0.03em] text-foreground md:text-4xl">
                  Organization Settings
                </h1>
                <p className="max-w-[560px] text-[15px] leading-[1.55] text-[#8a8a8a]">
                  Manage your team, workspace preferences, and organization profile. Changes apply immediately across all StockForge modules.
                </p>
              </div>

              <div className="grid items-start gap-8 xl:grid-cols-2">
                <div className="flex flex-col gap-8">
                  <section className="rounded-[2px] border border-border bg-card">
                    <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-5">
                      <div className="text-base font-semibold tracking-[-0.01em] text-foreground">

                        Workspace Profile
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleResetForm}
                        disabled={!isDirty}
                        className="h-auto rounded-[4px] border-border bg-transparent px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                      >
                        Reset
                      </Button>
                    </div>

                    <div className="px-6 py-6">
                      <label className="mb-2 block font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6b6b6b]">
                        Organization Name
                      </label>
                      <Input
                        value={organizationName}
                        onChange={(event) => setOrganizationName(event.target.value)}
                        className="mb-5 rounded-[4px] border-border bg-background text-foreground"
                      />

                      <label className="mb-2 block font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6b6b6b]">
                        Default Currency
                      </label>
                      <select
                        value={currency}
                        onChange={(event) => setCurrency(event.target.value)}
                        className="mb-5 flex h-10 w-full rounded-[4px] border border-border bg-background px-3 text-sm text-foreground outline-none"
                      >
                        {currencyOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>

                      <label className="mb-2 block font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6b6b6b]">
                        Warehouse Location
                      </label>
                      <Input
                        value={warehouseLocation}
                        onChange={(event) => setWarehouseLocation(event.target.value)}
                        className="rounded-[4px] border-border bg-background text-foreground"
                      />

                      <div className="mt-5 flex justify-end">
                        <Button
                          type="button"
                          onClick={handleSave}
                          disabled={!isDirty}
                          className="h-auto rounded-[4px] border border-[#2f476a] bg-[#2f476a] px-4 py-2 text-[13px] font-semibold text-[var(--primary-foreground)] hover:bg-[#253955] disabled:opacity-50"
                        >
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="flex flex-col gap-8">
                  <section className="flex items-center justify-between gap-4 rounded-[2px] border border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.08)] px-6 py-6 max-md:flex-col max-md:items-start">
                    <div>
                      <h3 className="mb-1 text-base font-bold tracking-[-0.01em] text-[#dc2626]">
                        Transfer Ownership
                      </h3>
                      <p className="max-w-md text-sm leading-[1.45] text-[#8a8a8a]">
                        Initiate a secure transfer of workspace ownership to another active member.
                      </p>
                      <select
                        value={ownershipTransferTargetUserId}
                        onChange={(event) => setOwnershipTransferTargetUserId(event.target.value)}
                        className="mt-4 flex h-10 min-w-[280px] rounded-[4px] border border-[#dc2626]/30 bg-background px-3 text-sm text-foreground outline-none"
                      >
                        <option value="">Select member</option>
                        {transferableUsers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name} ({getRoleLabel(user.role)})
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleOwnershipTransfer}
                      className="h-auto rounded-[4px] border-[#dc2626] bg-transparent px-4 py-2 text-[13px] font-semibold text-[#dc2626] hover:bg-[#dc2626]/10"
                    >
                      Begin Transfer
                    </Button>
                  </section>

                  <section className="flex items-center justify-between gap-4 rounded-[2px] border border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.08)] px-6 py-6 max-md:flex-col max-md:items-start">
                    <div>
                      <h3 className="mb-1 text-base font-bold tracking-[-0.01em] text-[#dc2626]">
                        Reset Workspace Data
                      </h3>
                      <p className="max-w-md text-sm leading-[1.45] text-[#8a8a8a]">
                        Restore products, categories, movements, and orders to their original demo state. This cannot be undone.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleWorkspaceReset}
                      className="h-auto rounded-[4px] border-[#dc2626] bg-transparent px-4 py-2 text-[13px] font-semibold text-[#dc2626] hover:bg-[#dc2626]/10"
                    >
                      Reset Data
                    </Button>
                  </section>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

    </>
  );
}
