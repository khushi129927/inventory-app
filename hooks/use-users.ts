import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api";
import type { User } from "@/app/types/inventory";

export function extractCreatedUser(response: User | { user: User }): User {
  if ("user" in response) {
    return response.user;
  }

  return response;
}

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => apiRequest<{ users: User[] }>("/users").then((res) => res.users),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<User>) => {
      const response = await apiRequest<User | { user: User }>("/users", { method: "POST", body: data });
      return extractCreatedUser(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User created successfully");
    },
    onError: (error: any) => toast.error(error.message),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) =>
      apiRequest<User>(`/users/${id}`, { method: "PATCH", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User updated successfully");
    },
    onError: (error: any) => toast.error(error.message),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<void>(`/users/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User deleted successfully");
    },
    onError: (error: any) => toast.error(error.message),
  });
}

if (typeof window === "undefined") {
  const assert = require("node:assert/strict");

  assert.deepEqual(
    extractCreatedUser({
      user: {
        id: "user-1",
        name: "New Manager",
        username: "new-manager",
        password: "",
        role: "manager",
      },
    }),
    {
      id: "user-1",
      name: "New Manager",
      username: "new-manager",
      password: "",
      role: "manager",
    },
    "Expected create-user responses wrapped in a user object to be normalized before frontend invite flows consume them"
  );
}
