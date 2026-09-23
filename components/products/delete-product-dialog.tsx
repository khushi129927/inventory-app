"use client";

import * as React from "react";
import { toast } from "sonner";
import type { Product } from "@/app/types/inventory";
import { useInventoryStore } from "@/lib/store";
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

interface DeleteProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onConfirm?: () => Promise<void>;
}

const generateId = () =>
  Math.random().toString(36).substring(2, 15) +
  Math.random().toString(36).substring(2, 15);

const nowIso = () => new Date().toISOString();

export default function DeleteProductDialog({
  open,
  onOpenChange,
  product,
  onConfirm,
}: DeleteProductDialogProps) {
  const movements = useInventoryStore((s) => s.movements);
  const deleteProduct = useInventoryStore((s) => s.deleteProduct);
  const addActivity = useInventoryStore((s) => s.addActivity);
  const [deleting, setDeleting] = React.useState(false);

  const referenced = product
    ? movements.some((m) => m.productId === product.id)
    : false;

  React.useEffect(() => {
    if (open) setDeleting(false);
  }, [open]);

  const handleConfirm = async () => {
    if (!product) return;
    setDeleting(true);

    try {
      if (onConfirm) {
        await onConfirm();
      } else {
        deleteProduct(product.id);
        addActivity({
          id: generateId(),
          type: "stock-adjusted",
          message: `Product '${product.name}' was deleted`,
          productId: product.id,
          productName: product.name,
          createdAt: nowIso(),
        });
      }
      toast.success("Product deleted successfully");
      onOpenChange(false);
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
          <AlertDialogTitle>Delete Product</AlertDialogTitle>
          <AlertDialogDescription>
            {product ? (
              <>
                Are you sure you want to delete{" "}
                <span className="font-medium text-foreground">{product.name}</span>?
                This action cannot be undone.
              </>
            ) : (
              "Are you sure you want to delete this product?"
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {referenced && product && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
            <div className="flex items-start gap-2">
              <Icon name="AlertTriangle" className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                This product has associated stock movements in the log. Deleting it will not
                remove the historical records, but the product will no longer appear in the
                product list.
              </p>
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
            {deleting ? "Deleting..." : "Delete Product"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
