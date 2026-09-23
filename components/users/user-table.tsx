"use client";

import * as React from "react";
import type { User } from "@/app/types/inventory";
import { useDeleteUser, useUsers } from "@/hooks/use-users";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import EditUserDialog from "@/components/users/edit-user-dialog";
import Icon from "@/components/Icon";

function RoleBadge({ role }: { role: User["role"] }) {
  switch (role) {
    case "admin":
      return <Badge>Admin</Badge>;
    case "manager":
      return <Badge variant="secondary">Manager</Badge>;
    case "executive":
      return <Badge variant="outline">Executive</Badge>;
    default:
      return <Badge variant="outline">{role}</Badge>;
  }
}

export default function UserTable() {
  const { data: users = [], isLoading } = useUsers();
  const deleteUser = useDeleteUser();
  const [editingUser, setEditingUser] = React.useState<User | null>(null);
  const [deletingUser, setDeletingUser] = React.useState<User | null>(null);

  const handleDeleteUser = async () => {
    if (!deletingUser) {
      return;
    }

    await deleteUser.mutateAsync(deletingUser.id);
    setDeletingUser(null);
  };

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Icon name="Users" className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">No users found</p>
          <p className="text-xs text-muted-foreground">There are no users in the system yet.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[40px]" />
              <TableHead>Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const isAdminUser = user.role === "admin";

              return (
                <TableRow key={user.id} className="transition-colors hover:bg-muted/40">
                  <TableCell>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon name="User" className="h-4 w-4" />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.username}</TableCell>
                  <TableCell>
                    <RoleBadge role={user.role} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setEditingUser(user)}>
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeletingUser(user)}
                        disabled={deleteUser.isPending || isAdminUser}
                        title={isAdminUser ? "Admin users cannot be deleted" : undefined}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <EditUserDialog open={Boolean(editingUser)} user={editingUser} onOpenChange={(open) => {
        if (!open) {
          setEditingUser(null);
        }
      }} />

      <AlertDialog open={Boolean(deletingUser)} onOpenChange={(open) => {
        if (!open) {
          setDeletingUser(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingUser?.role === "admin"
                ? "Admin users cannot be deleted."
                : deletingUser
                  ? `Delete ${deletingUser.name} (${deletingUser.username})? This action cannot be undone.`
                  : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteUser.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={deleteUser.isPending || deletingUser?.role === "admin"}>
              {deleteUser.isPending ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
