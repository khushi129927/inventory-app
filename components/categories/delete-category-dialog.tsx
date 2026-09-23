"use client";

import * as React from "react";
import { toast } from "sonner";
import type { Category } from "@/app/types/inventory";
import { useProducts, useUpdateProduct } from "@/hooks/use-products";
import { useDeleteCategory } from "@/hooks/use-categories";
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
import Icon from "@/components/Icon";

interface DeleteCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
}

const generateId = () =>
  Math.random().toString(36).substring(2, 15) +
  Math.random().toString(36).substring(2, 15);

const nowIso = () => new Date().toISOString();

export default function DeleteCategoryDialog({
  open,
  onOpenChange,
  category,
}: DeleteCategoryDialogProps) {
  const { data: products = [] } = useProducts();
  const { mutateAsync: deleteCategory } = useDeleteCategory();
  const { mutateAsync: updateProduct } = useUpdateProduct();

  const [deleting, setDeleting] = React.useState(false);

  const linkedProducts = React.useMemo(
    () => (category ? products.filter((p) => p.categoryId === category.id) : []),
    [category, products]
  );

  React.useEffect(() => {
    if (open) setDeleting(false);
  }, [open]);

  const handleConfirm = async () => {
    if (!category) return;
    setDeleting(true);

    try {
      // Reassign all linked products to uncategorized
      if (linkedProducts.length > 0) {
        await Promise.all(
          linkedProducts.map((p) =>
            updateProduct({
              id: p.id,
              data: {
                categoryId: "",
                categoryName: "Uncategorized",
              },
            })
          )
        );
      }

      await deleteCategory(category.id);
      toast.success("Category deleted successfully");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete category");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10">
            <Icon name="Trash2" className="text-destructive" />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete Category</AlertDialogTitle>
          <AlertDialogDescription>
            {category ? (
              <>
                Are you sure you want to delete{" "}
                <span className="font-medium text-foreground">{category.name}</span>?
                This action cannot be undone.
              </>
            ) : (
              "Are you sure you want to delete this category?"
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {linkedProducts.length > 0 && category && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
            <div className="flex items-start gap-2">
              <Icon name="AlertTriangle" className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                  {linkedProducts.length} product{linkedProducts.length > 1 ? "s" : ""} belong to this category
                </p>
                <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
                  Deleting will reassign{" "}
                  {linkedProducts.map((p) => p.name).join(", ")} to{" "}
                  <span className="font-medium">Uncategorized</span>.
                </p>
              </div>
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete Category"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}