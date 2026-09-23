"use client";

import * as React from "react";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Icon from "@/components/Icon";
import UserTable from "@/components/users/user-table";
import UserDialog from "@/components/users/user-dialog";
import { useCreateUser } from "@/hooks/use-users";
import type { UserRole } from "@/app/types/inventory";

const DEFAULT_ROLE: UserRole = "manager";

export default function UsersPage() {
  const { currentUser } = useAuthStore();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const createUser = useCreateUser();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState<UserRole>(DEFAULT_ROLE);

  const handleCreateUser = async () => {
    const normalizedUsername = username.trim();
    const normalizedPassword = password.trim();

    if (!normalizedUsername || !normalizedPassword) {
      return;
    }

    const displayName = normalizedUsername
      .split(/[._-]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ") || normalizedUsername;

    await createUser.mutateAsync({
      name: displayName,
      username: normalizedUsername,
      password: normalizedPassword,
      role,
    });

    setUsername("");
    setPassword("");
    setRole(DEFAULT_ROLE);
  };

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
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="page-header">
          <h1>Users</h1>
          <p>Manage user accounts, create team members, and control access roles.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Icon name="Plus" className="mr-2 h-4 w-4" />
          Create User
        </Button>
      </div>

      <section className="rounded-[2px] border border-border bg-card px-6 py-6">
        <div className="mb-5">
          <h2 className="text-base font-semibold tracking-[-0.01em] text-foreground">Team Members</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create users from the Users page so account setup stays centralized and duplicate protection is enforced consistently.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto] md:items-end">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Username</label>
            <Input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter username"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Role</label>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as UserRole)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none"
            >
              <option value="manager">Manager</option>
              <option value="executive">Viewer</option>
              <option value="admin">Owner</option>
            </select>
          </div>
          <div className="flex md:justify-end">
            <Button type="button" onClick={handleCreateUser} disabled={createUser.isPending}>
              {createUser.isPending ? "Creating..." : "Create User"}
            </Button>
          </div>
        </div>
      </section>

      <UserTable />
      <UserDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
