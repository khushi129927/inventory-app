"use client";

import { useAuthStore } from "@/lib/auth-store";
import Icon from "@/components/Icon";
import OrganizationSettingsPage from "@/components/settings/organization-settings-page";

export default function SettingsPage() {
  const { currentUser } = useAuthStore();

  if (!currentUser || currentUser.role !== "admin") {
    return (
      <div className="page-content">
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Icon name="Lock" className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Insufficient permissions</h2>
            <p className="text-sm text-muted-foreground">You do not have access to this page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Organization Settings</h1>
        <p>Manage your team, workspace preferences, and organization profile. Changes apply immediately across all StockForge modules.</p>
      </div>
      <OrganizationSettingsPage />
    </div>
  );
}
