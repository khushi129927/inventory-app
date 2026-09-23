import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  apiGetProducts,
  apiCreateProduct,
  apiUpdateProduct,
  apiDeleteProduct
} from "@/lib/api";
import type { Product } from "@/app/types/inventory";

export function useProducts(filters?: any) {
  return useQuery({
    queryKey: ["products", filters],
    queryFn: () => apiGetProducts(filters).then(res => res.products),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: apiCreateProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product created successfully");
    },
    onError: (error: any) => toast.error(error.message),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) => apiUpdateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product updated successfully");
    },
    onError: (error: any) => toast.error(error.message),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: apiDeleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product deleted successfully");
    },
    onError: (error: any) => toast.error(error.message),
  });
}
