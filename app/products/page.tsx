"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/auth-store";
import type { Product } from "@/app/types/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import ProductDialog from "@/components/products/product-dialog";
import DeleteProductDialog from "@/components/products/delete-product-dialog";
import ExcelUploadDialog from "@/components/products/excel-upload-dialog";
import ProductFilters from "@/components/products/product-filters";
import type { FilterState } from "@/components/products/product-filters";
import ProductTable from "@/components/products/product-table";
import Icon from "@/components/Icon";
import {
  apiGetProducts,
  apiGetCategories,
  apiCreateProduct,
  apiUpdateProduct,
  apiDeleteProduct
} from "@/lib/api";
import { useInventoryStore } from "@/lib/store";

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.currentUser);
  const gstConfig = useInventoryStore.getState().gstConfig;
  const updateGstConfig = useInventoryStore.getState().updateGstConfig;
  const updateStoreProduct = useInventoryStore((s) => s.updateProduct);
  const searchParams = useSearchParams();
  const initialCategoryId = searchParams.get("categoryId");

  const [filters, setFilters] = React.useState<FilterState>({
    search: "",
    categoryId: initialCategoryId,
    status: null,
  });

  const [page, setPage] = React.useState(1);
  const pageSize = 10;
  const [stockView, setStockView] = React.useState<"current" | "previous">("current");

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletingProduct, setDeletingProduct] = React.useState<Product | null>(null);
  const [excelDialogOpen, setExcelDialogOpen] = React.useState(false);
  const [gstValue, setGstValue] = React.useState(String(gstConfig.value));

  React.useEffect(() => {
    const categoryId = searchParams.get("categoryId");
    setFilters((currentFilters) => {
      if (currentFilters.categoryId === categoryId) {
        return currentFilters;
      }

      return {
        ...currentFilters,
        categoryId,
      };
    });
    setPage(1);
  }, [searchParams]);

  React.useEffect(() => {
    setGstValue(String(gstConfig.value));
  }, [gstConfig.value]);

  // Data fetching
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["products", filters],
    queryFn: () => apiGetProducts(filters).then(res => res.products),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiGetCategories().then(res => res.categories),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: apiCreateProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product created successfully");
      setDialogOpen(false);
    },
    onError: (error: any) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) => apiUpdateProduct(id, data),
    onSuccess: (updatedProduct, variables) => {
      updateStoreProduct(variables.id, updatedProduct);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Product updated successfully");
      setDialogOpen(false);
    },
    onError: (error: any) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: apiDeleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product deleted successfully");
      setDeleteOpen(false);
    },
    onError: (error: any) => toast.error(error.message),
  });

  const handleCreate = () => {
    setEditingProduct(null);
    setDialogOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setDialogOpen(true);
  };

  const handleDelete = (product: Product) => {
    setDeletingProduct(product);
    setDeleteOpen(true);
  };

  const handleGstSave = () => {
    const parsedValue = Number(gstValue);
    if (Number.isNaN(parsedValue) || parsedValue < 0) {
      toast.error("GST value must be 0 or greater");
      return;
    }

    updateGstConfig({ mode: gstConfig.mode, value: parsedValue });
    toast.success("GST settings updated");
  };

  if (!currentUser) {
    return (
      <div className="page-content">
        <Empty className="border py-24">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Icon name="Lock" className="h-4 w-4" />
            </EmptyMedia>
            <EmptyTitle>Not authenticated</EmptyTitle>
            <EmptyDescription>Please log in to view products.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const isAdmin = currentUser.role === "admin";
  const isManager = currentUser.role === "manager";
  const canManage = isAdmin || isManager;
  const canUpload = canManage;

  return (
    <div className="page-content">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="page-header">
          <h1>Stock</h1>
          <p>View products, track current stock, compare it with the previous upload, and keep inventory in sync.</p>
        </div>
        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            {canUpload && (
              <Button onClick={() => setExcelDialogOpen(true)} size="sm" variant="outline">
                <Icon name="Upload" className="mr-1.5 h-4 w-4" />
                Upload Excel
              </Button>
            )}
            {isAdmin && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5">
                  <span className="text-xs font-medium text-muted-foreground">GST</span>
                  <Select
                    value={gstConfig.mode}
                    onValueChange={(value: "percentage" | "amount") =>
                      updateGstConfig({ mode: value, value: gstConfig.value })
                    }
                  >
                    <SelectTrigger className="h-8 w-[120px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="amount">Amount</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={gstValue}
                    onChange={(e) => setGstValue(e.target.value)}
                    className="h-8 w-[110px]"
                  />
                  <Button size="sm" variant="outline" onClick={handleGstSave}>
                    Save GST
                  </Button>
                </div>
                <Button onClick={handleCreate} size="sm" variant="default">
                  <Icon name="Plus" className="mr-1.5 h-4 w-4" />
                  Add Product
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <ProductFilters categories={categories} filters={filters} onChange={setFilters} />
          <div className="flex items-center gap-2 self-start lg:self-auto">
            <span className="text-sm text-muted-foreground">Stock view</span>
            <Select value={stockView} onValueChange={(value: "current" | "previous") => setStockView(value)}>
              <SelectTrigger className="h-8 w-[180px] text-sm">
                <SelectValue placeholder="Select stock view" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Current day stock</SelectItem>
                <SelectItem value="previous">Previous day stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {productsLoading ? (
          <div className="py-24 text-center">Loading products...</div>
        ) : (
          <ProductTable
            products={products}
            onEdit={isAdmin ? handleEdit : undefined}
            onDelete={isAdmin ? handleDelete : undefined}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            role={currentUser.role}
            stockView={stockView}
          />
        )}
      </div>

      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editingProduct}
        onSubmit={async (data) => {
          if (editingProduct) {
            await updateMutation.mutateAsync({ id: editingProduct.id, data });
          } else {
            await createMutation.mutateAsync(data);
          }
        }}
        />
      <DeleteProductDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        product={deletingProduct}
        onConfirm={async () => {
          if (deletingProduct) {
            await deleteMutation.mutateAsync(deletingProduct.id);
          }
        }}
      />
      <ExcelUploadDialog open={excelDialogOpen} onOpenChange={setExcelDialogOpen} />
    </div>
  );
}
