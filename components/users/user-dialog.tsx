"use client";

import * as React from "react";
import { toast } from "sonner";
import type { User, UserRole } from "@/app/types/inventory";
import { useUsers, useCreateUser } from "@/hooks/use-users";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Icon from "@/components/Icon";

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormData {
  name: string;
  username: string;
  password: string;
  role: UserRole | "";
}

interface FormErrors {
  name?: string;
  username?: string;
  password?: string;
  role?: string;
}

const emptyForm: FormData = {
  name: "",
  username: "",
  password: "",
  role: "",
};

export default function UserDialog({ open, onOpenChange }: UserDialogProps) {
  const { data: users = [] } = useUsers();
  const { mutateAsync: createUser, isPending: submitting } = useCreateUser();

  const [form, setForm] = React.useState<FormData>(emptyForm);
  const [errors, setErrors] = React.useState<FormErrors>({});

  React.useEffect(() => {
    if (open) {
      setForm(emptyForm);
      setErrors({});
    }
  }, [open]);

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field as keyof FormErrors];
        return next;
      });
    }
  };

  const validate = (): FormErrors | null => {
    const next: FormErrors = {};

    if (!form.name.trim()) {
      next.name = "Full name is required";
    }

    if (!form.username.trim()) {
      next.username = "Username is required";
    } else if (users.some((u) => u.username === form.username.trim())) {
      next.username = "Username already exists";
    }

    if (!form.password.trim()) {
      next.password = "Password is required";
    }

    if (!form.role) {
      next.role = "Role is required";
    }

    return Object.keys(next).length > 0 ? next : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validate();
    if (validationErrors) {
      setErrors(validationErrors);
      return;
    }

    try {
      await createUser({
        name: form.name.trim(),
        username: form.username.trim(),
        password: form.password.trim(),
        role: form.role as UserRole,
      });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to create user");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>
              Add a new user with login credentials.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="user-name">Full Name</Label>
              <Input
                id="user-name"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Enter full name"
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && (
                <span className="text-xs text-red-500">{errors.name}</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="user-username">Username</Label>
              <Input
                id="user-username"
                value={form.username}
                onChange={(e) => handleChange("username", e.target.value)}
                placeholder="Enter username"
                className={errors.username ? "border-red-500" : ""}
              />
              {errors.username && (
                <span className="text-xs text-red-500">{errors.username}</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="user-password">Password</Label>
              <Input
                id="user-password"
                type="password"
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
                placeholder="Enter password"
                className={errors.password ? "border-red-500" : ""}
              />
              {errors.password && (
                <span className="text-xs text-red-500">{errors.password}</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="user-role">Role</Label>
              <Select
                value={form.role}
                onValueChange={(value: string | null) => {
                  if (value) handleChange("role", value);
                }}
              >
                <SelectTrigger
                  id="user-role"
                  className={errors.role ? "border-red-500" : ""}
                >
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="executive">Executive</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <span className="text-xs text-red-500">{errors.role}</span>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create User"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
