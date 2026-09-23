"use client";

import * as React from "react";
import { toast } from "sonner";
import type { MovementType, Product } from "@/app/types/inventory";
import { useProducts, useUpdateProduct } from "@/hooks/use-products";
import { useRecordMovement } from "@/hooks/use-movements";
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
import { Textarea } from "@/components/ui/textarea";
import Icon from "@/components/Icon";

interface RecordMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormData {
  type: MovementType | "";
  productId: string;
  quantity: string;
  date: string;
  notes: string;
  location: string;
  reference: string;
}

interface FormErrors {
  type?: string;
  productId?: string;
  quantity?: string;
}

function deriveStatus(quantity: number, minStock: number): Product["status"] {
  if (quantity === 0) return "out-of-stock";
  if (quantity <= minStock) return "low-stock";
  return "in-stock";
}

function todayInputValue() {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

const emptyForm: FormData = {
  type: "",
  productId: "",
  quantity: "",
  date: todayInputValue(),
  notes: "",
  location: "",
  reference: "",
};

export default function RecordMovementDialog({ open, onOpenChange }: RecordMovementDialogProps) {
  const { data: products = [] } = useProducts();
  const { mutateAsync: updateProduct } = useUpdateProduct();
  const { mutateAsync: recordMovement, isPending: submitting } = useRecordMovement();

  const [form, setForm] = React.useState<FormData>(emptyForm);
  const [errors, setErrors] = React.useState<FormErrors>({});

  const selectedProduct = React.useMemo(
    () => products.find((p) => p.id === form.productId) || null,
    [products, form.productId]
  );

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

    if (!form.type) {
      next.type = "Movement type is required";
    }

    if (!form.productId) {
      next.productId = "Product is required";
    }

    const qty = Number(form.quantity);
    if (Number.isNaN(qty) || form.quantity.trim() === "" || !/^\d+(\.?\d+)?$/.test(form.quantity)) {
      next.quantity = "Quantity must be a positive number";
    } else if (qty <= 0) {
      next.quantity = "Quantity must be greater than 0";
    } else if (
      (form.type === "out" || form.type === "transfer") &&
      selectedProduct &&
      qty > selectedProduct.quantity
    ) {
      next.quantity = `Only ${selectedProduct.quantity} units available`;
    }

    if (Object.keys(next).length > 0) return next;
    return null;
  };

  const handleSubmit = async () => {
    const validation = validate();
    if (validation) {
      setErrors(validation);
      return;
    }

    if (!selectedProduct) return;

    const type = form.type as MovementType;
    const qty = Number(form.quantity);
    const prevQty = selectedProduct.quantity;

    let newQty: number;
    let movementQty: number;

    if (type === "in") {
      newQty = prevQty + qty;
      movementQty = qty;
    } else if (type === "out" || type === "transfer") {
      newQty = prevQty - qty;
      movementQty = qty;
    } else {
      newQty = qty;
      movementQty = newQty - prevQty;
    }

    const newStatus = deriveStatus(newQty, selectedProduct.minStock);
    const dateString = form.date ? new Date(form.date).toISOString() : new Date().toISOString();

    try {
      await updateProduct({
        id: selectedProduct.id,
        data: {
          quantity: newQty,
          status: newStatus,
        },
      });

      await recordMovement({
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        productSku: selectedProduct.sku,
        type,
        quantity: movementQty,
        previousQuantity: prevQty,
        newQuantity: newQty,
        reason: form.notes.trim() || "No notes provided",
        location: form.location.trim() || undefined,
        reference: form.reference.trim() || undefined,
        user: "Admin",
        createdAt: dateString,
      });

      toast.success("Movement recorded successfully");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to record movement");
    }
  };

  const handleTypeChange = (value: string | null) => {
    handleChange("type", value || "");
  };

  const handleProductChange = (value: string | null) => {
    handleChange("productId", value || "");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Stock Movement</DialogTitle>
          <DialogDescription>
            Log an inbound, outbound, transfer, or adjustment event.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="movement-type">Movement Type</Label>
            <Select value={form.type || undefined} onValueChange={handleTypeChange}>
              <SelectTrigger id="movement-type" className="w-full" aria-invalid={!!errors.type}>
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in">
                  <div className="flex items-center gap-2">
                    <Icon name="ArrowDownToLine" className="h-4 w-4 text-emerald-600" />
                    Stock In
                  </div>
                </SelectItem>
                <SelectItem value="out">
                  <div className="flex items-center gap-2">
                    <Icon name="ArrowUpFromLine" className="h-4 w-4 text-blue-600" />
                    Stock Out
                  </div>
                </SelectItem>
                <SelectItem value="transfer">
                  <div className="flex items-center gap-2">
                    <Icon name="ArrowLeftRight" className="h-4 w-4 text-primary" />
                    Transfer
                  </div>
                </SelectItem>
                <SelectItem value="adjustment">
                  <div className="flex items-center gap-2">
                    <Icon name="SlidersHorizontal" className="h-4 w-4 text-amber-600" />
                    Adjustment
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {errors.type && <p className="text-xs text-destructive">{errors.type}</p>}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="product">Product</Label>
            <Select value={form.productId || undefined} onValueChange={handleProductChange}>
              <SelectTrigger id="product" className="w-full" aria-invalid={!!errors.productId}>
                <SelectValue placeholder="Select product..." />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center justify-between gap-3">
                      <span>{p.name}</span>
                      <span className="text-xs text-muted-foreground">({p.sku})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.productId && <p className="text-xs text-destructive">{errors.productId}</p>}
            {selectedProduct && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon name="Package" className="h-3.5 w-3.5" />
                Current stock: <span className="font-medium text-foreground">{selectedProduct.quantity}</span> units
                {form.type === "adjustment" && (
                  <span className="text-muted-foreground/70">
                    {" "}— enter the <span className="font-medium text-foreground">target</span> quantity
                  </span>
                )}
              </p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="movement-quantity">
              {form.type === "adjustment" ? "New Quantity" : "Quantity"}
            </Label>
            <Input
              id="movement-quantity"
              type="number"
              min={form.type === "adjustment" ? 0 : 1}
              step={1}
              value={form.quantity}
              onChange={(e) => handleChange("quantity", e.target.value)}
              placeholder={form.type === "adjustment" ? "Enter new quantity..." : "Enter amount..."}
              aria-invalid={!!errors.quantity}
            />
            {errors.quantity && <p className="text-xs text-destructive">{errors.quantity}</p>}
            {(form.type === "out" || form.type === "transfer") && selectedProduct && (
              <p className="text-xs text-muted-foreground">
                Available: {selectedProduct.quantity} units
              </p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="movement-date">Date</Label>
            <Input
              id="movement-date"
              type="date"
              value={form.date}
              onChange={(e) => handleChange("date", e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="movement-notes">Notes</Label>
            <Textarea
              id="movement-notes"
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Reason or additional details..."
              rows={3}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="movement-location">Location</Label>
            <Input
              id="movement-location"
              type="text"
              value={form.location}
              onChange={(e) => handleChange("location", e.target.value)}
              placeholder="e.g. A-01 to B-03"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="movement-reference">Reference</Label>
            <Input
              id="movement-reference"
              type="text"
              value={form.reference}
              onChange={(e) => handleChange("reference", e.target.value)}
              placeholder="e.g. TX-191"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Recording..." : "Record Movement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
