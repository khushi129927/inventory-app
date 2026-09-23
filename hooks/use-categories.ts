import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api";
import type { Category } from "@/app/types/inventory";

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => apiRequest<{ categories: Category[] }>("/categories").then(res => res.categories),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Category>) => apiRequest<Category>("/categories", { method: "POST", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Category created successfully");
    },
    onError: (error: any) => toast.error(error.message),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Category> }) =>
      apiRequest<Category>(`/categories/${id}`, { method: "PATCH", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Category updated successfully");
    },
    onError: (error: any) => toast.error(error.message),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<void>(`/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Category deleted successfully");
    },
    onError: (error: any) => toast.error(error.message),
  });
}
