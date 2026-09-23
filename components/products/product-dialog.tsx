"use client";

import * as React from "react";
import { toast } from "sonner";
import type { Product } from "@/app/types/inventory";
import { useInventoryStore } from "@/lib/store";
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
import { getInterestCharge, getInterestRateInputForCategory } from "@/lib/cost-utils";

function getMonthsInInventory(product: Product): number {
  const created = new Date(product.createdAt).getTime();
  if (Number.isNaN(created)) return 0;
  const now = Date.now();
  return Math.max(0, Math.floor((now - created) / (1000 * 60 * 60 * 24 * 30)));
}

function buildProductPayload(form: FormData, product: Product | null, categoryName: string, monthsInInventory: number): Partial<Product> {
  const previousQuantity = product ? Number(product.previousQuantity ?? product.quantity) : Number(form.quantity);
  const availableBranches = form.availableBranches
    .split(",")
    .map((branch) => branch.trim())
    .filter(Boolean);
  const quantity = Number(form.quantity);
  const price = Number(form.price);
  const minStock = Number(form.minStock);
  const shipping = Number(form.shipping);
  const installation = Number(form.installation);
  const paidAmount = Number(form.paidAmount);
  const status = deriveStatus(quantity, minStock);

  return {
    name: form.name.trim(),
    sku: form.sku.trim(),
    categoryId: form.categoryId,
    categoryName,
    availableBranches,
    quantity,
    price,
    minStock,
    monthsInInventory,
    shipping,
    installation,
    paidAmount,
    status,
    previousQuantity,
    updatedAt: nowIso(),
  };
}

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onSubmit?: (data: Partial<Product>) => Promise<void>;
}

interface FormData {
  name: string;
  sku: string;
  categoryId: string;
  availableBranches: string;
  quantity: string;
  mrp: string;
  price: string;
  minStock: string;
  monthsInInventory: string;
  monthlyInterest: string;
  shipping: string;
  installation: string;
  paidAmount: string;
}

interface FormErrors {
  name?: string;
  sku?: string;
  categoryId?: string;
  availableBranches?: string;
  quantity?: string;
  price?: string;
  minStock?: string;
  monthsInInventory?: string;
  shipping?: string;
  installation?: string;
  paidAmount?: string;
}

const generateId = () =>
  Math.random().toString(36).substring(2, 15) +
  Math.random().toString(36).substring(2, 15);

const nowIso = () => new Date().toISOString();

const emptyForm: FormData = {
  name: "",
  sku: "",
  categoryId: "",
  availableBranches: "",
  quantity: "",
  mrp: "0",
  price: "",
  minStock: "",
  monthsInInventory: "0",
  monthlyInterest: "2500",
  shipping: "0",
  installation: "0",
  paidAmount: "0",
};

function deriveStatus(quantity: number, minStock: number): Product["status"] {
  if (quantity === 0) return "out-of-stock";
  if (quantity <= minStock) return "low-stock";
  return "in-stock";
}

function getRateLabel(editable: boolean) {
  return editable ? "Monthly Interest Rate (Server only)" : "Monthly Interest Rate (fixed by category)";
}

export default function ProductDialog({ open, onOpenChange, product, onSubmit }: ProductDialogProps) {
  const categories = useInventoryStore((s) => s.categories);
  const products = useInventoryStore((s) => s.products);
  const addProduct = useInventoryStore((s) => s.addProduct);
  const updateProduct = useInventoryStore((s) => s.updateProduct);
  const addActivity = useInventoryStore((s) => s.addActivity);

  const [form, setForm] = React.useState<FormData>(emptyForm);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [submitting, setSubmitting] = React.useState(false);
  const selectedCategory = categories.find((c) => c.id === form.categoryId) ?? null;
  const rateInfo = getInterestRateInputForCategory(
    {
      categoryId: form.categoryId,
      categoryName: selectedCategory?.name ?? "",
      monthlyInterest: Number(form.monthlyInterest || 0),
      createdAt: product?.createdAt ?? nowIso(),
    } as Product,
    categories
  );
  const fixedRate = rateInfo.rate;
  const isServerCategory = rateInfo.isEditable;
  const displayedInterestTotal = getInterestCharge(
    {
      ...((product ?? {}) as Product),
      categoryId: form.categoryId,
      categoryName: selectedCategory?.name ?? product?.categoryName ?? "",
      createdAt: product?.createdAt ?? nowIso(),
      monthlyInterest: fixedRate,
    },
    categories
  );

  React.useEffect(() => {
    if (open) {
      if (product) {
        const interestRate = getInterestRateInputForCategory(product, categories).rate;
        setForm({
          name: product.name,
          sku: product.sku,
          categoryId: product.categoryId,
          availableBranches: product.availableBranches?.join(", ") ?? "",
          quantity: String(product.quantity),
          mrp: String((product as Product & { mrp?: number }).mrp ?? product.price ?? 0),
          price: String(product.price),
          minStock: String(product.minStock),
          monthsInInventory: String(getMonthsInInventory(product)),
          monthlyInterest: String(interestRate),
          shipping: String(product.shipping ?? 0),
          installation: String(product.installation ?? 0),
          paidAmount: String(product.paidAmount ?? 0),
        });
      } else {
        setForm(emptyForm);
      }
      setErrors({});
      setSubmitting(false);
    }
  }, [open, product, categories]);

  React.useEffect(() => {
    if (!open) return;
    const nextRate = getInterestRateInputForCategory(
      {
        categoryId: form.categoryId,
        categoryName: selectedCategory?.name ?? "",
        monthlyInterest: Number(form.monthlyInterest || 0),
        createdAt: product?.createdAt ?? nowIso(),
      } as Product,
      categories
    ).rate;

    if (!isServerCategory && String(nextRate) !== form.monthlyInterest) {
      setForm((prev) => ({ ...prev, monthlyInterest: String(nextRate) }));
    }
  }, [open, form.categoryId, categories, isServerCategory]);

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): FormErrors | null => {
    const next: FormErrors = {};

    if (!form.name.trim()) {
      next.name = "Product name is required";
    }

    if (!form.sku.trim()) {
      next.sku = "SKU is required";
    } else {
      const skuExists = products.some(
        (p) => p.sku.toLowerCase() === form.sku.toLowerCase() && p.id !== product?.id
      );
      if (skuExists) {
        next.sku = "SKU must be unique";
      }
    }

    if (!form.categoryId) {
      next.categoryId = "Category is required";
    }

    if (form.availableBranches.trim().length === 0) {
      next.availableBranches = "At least one branch is required";
    }

    const quantity = Number(form.quantity);
    if (Number.isNaN(quantity) || !/\d+/.test(form.quantity)) {
      next.quantity = "Quantity must be a valid number";
    } else if (quantity < 0) {
      next.quantity = "Quantity must be 0 or greater";
    }

    const mrp = Number(form.mrp);
    if (Number.isNaN(mrp) || form.mrp.trim() === "") {
      next.mrp = "MRP is required";
    } else if (mrp < 0) {
      next.mrp = "MRP must be 0 or greater";
    }

    const price = Number(form.price);
    if (Number.isNaN(price) || form.price.trim() === "") {
      next.price = "Unit price is required";
    } else if (price <= 0) {
      next.price = "Price must be greater than 0";
    }

    const minStock = Number(form.minStock);
    if (Number.isNaN(minStock) || !/\d+/.test(form.minStock)) {
      next.minStock = "Minimum stock must be a valid number";
    } else if (minStock < 0) {
      next.minStock = "Minimum stock must be 0 or greater";
    }

    const shipping = Number(form.shipping);
    if (Number.isNaN(shipping) || form.shipping.trim() === "") {
      next.shipping = "Shipping cost is required";
    } else if (shipping < 0) {
      next.shipping = "Shipping must be 0 or greater";
    }

    const installation = Number(form.installation);
    if (Number.isNaN(installation) || form.installation.trim() === "") {
      next.installation = "Installation cost is required";
    } else if (installation < 0) {
      next.installation = "Installation must be 0 or greater";
    }

    const paidAmount = Number(form.paidAmount);
    if (Number.isNaN(paidAmount) || form.paidAmount.trim() === "") {
      next.paidAmount = "Paid amount is required";
    } else if (paidAmount < 0) {
      next.paidAmount = "Paid amount must be 0 or greater";
    }

    if (Object.keys(next).length > 0) return next;
    return null;
  };

  const handleSave = async () => {
    const validationErrors = validate();
    if (validationErrors) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);

    const monthsInInventory = Number(form.monthsInInventory);

    try {
      const category = categories.find((c) => c.id === form.categoryId);
      if (onSubmit) {
        const payload = buildProductPayload(form, product ?? null, category?.name ?? product?.categoryName ?? "", monthsInInventory);

        await onSubmit(payload);
        console.log(`[${new Date().toISOString()}] product-dialog save success`, { productId: product?.id, payload });
      } else if (product) {
        const updates = {
          ...buildProductPayload(form, product, category?.name ?? product.categoryName, monthsInInventory),
          status: deriveStatus(Number(form.quantity), Number(form.minStock)),
          mrp: Number(form.mrp),
          price: Number(form.price),
          quantity: Number(form.quantity),
          minStock: Number(form.minStock),
          paidAmount: Number(form.paidAmount),
          shipping: Number(form.shipping),
          installation: Number(form.installation),
        } satisfies Partial<Product>;
        updateProduct(product.id, updates);
        addActivity({
          id: generateId(),
          type: "product-updated",
          message: `Product '${form.name.trim()}' updated`,
          productId: product.id,
          productName: form.name.trim(),
          createdAt: nowIso(),
        });
        console.log(`[${new Date().toISOString()}] product-dialog local save success`, { productId: product.id, updates });
      } else {
        const newProduct: Product = {
          id: `prod-${generateId()}`,
          ...(buildProductPayload(form, null, category?.name ?? "", monthsInInventory) as Product),
          mrp: Number(form.mrp),
          previousQuantity: Number(form.quantity),
          image: `https://picsum.photos/400/300?random=${Date.now()}`,
          description: "",
          createdAt: nowIso(),
        };
        addProduct(newProduct);
        addActivity({
          id: generateId(),
          type: "product-added",
          message: `New product '${newProduct.name}' added to inventory`,
          productId: newProduct.id,
          productName: newProduct.name,
          createdAt: nowIso(),
        });
        console.log(`[${new Date().toISOString()}] product-dialog create success`, { newProduct });
      }
      onOpenChange(false);
      toast.success(product ? "Product updated successfully" : "Product created successfully");
    } catch (error) {
      console.error(`[${new Date().toISOString()}] product-dialog save failed`, error);
      toast.error(error instanceof Error ? error.message : "Failed to save product changes");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCategoryChange = (value: string | null) => {
    if (value) {
      handleChange("categoryId", value);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{product ? "Edit Product" : "Create Product"}</DialogTitle>
          <DialogDescription>
            {product
              ? "Update the product details below."
              : "Fill in the details to add a new product."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="name">Product Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="e.g. Wireless Mouse MX"
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="sku">SKU</Label>
            <Input
              id="sku"
              value={form.sku}
              onChange={(e) => handleChange("sku", e.target.value)}
              placeholder="e.g. WMX-2024"
              aria-invalid={!!errors.sku}
            />
            {errors.sku && (
              <p className="text-xs text-destructive">{errors.sku}</p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="category">Category</Label>
            <Select
              value={form.categoryId || undefined}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger id="category" className="w-full" aria-invalid={!!errors.categoryId}>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoryId && (
              <p className="text-xs text-destructive">{errors.categoryId}</p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="availableBranches">Available Branches</Label>
            <Input
              id="availableBranches"
              value={form.availableBranches}
              onChange={(e) => handleChange("availableBranches", e.target.value)}
              placeholder="e.g. Downtown, Airport"
              aria-invalid={!!errors.availableBranches}
            />
            {errors.availableBranches && (
              <p className="text-xs text-destructive">{errors.availableBranches}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min={0}
                value={form.quantity}
                onChange={(e) => handleChange("quantity", e.target.value)}
                placeholder="0"
                aria-invalid={!!errors.quantity}
              />
              {errors.quantity && (
                <p className="text-xs text-destructive">{errors.quantity}</p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                type="number"
                min={0.01}
                step={0.01}
                value={form.price}
                onChange={(e) => handleChange("price", e.target.value)}
                placeholder="0.00"
                aria-invalid={!!errors.price}
              />
              {errors.price && (
                <p className="text-xs text-destructive">{errors.price}</p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="mrp">MRP ($)</Label>
              <Input
                id="mrp"
                type="number"
                min={0}
                step={0.01}
                value={form.mrp}
                onChange={(e) => handleChange("mrp", e.target.value)}
                placeholder="0.00"
                aria-invalid={!!errors.mrp}
              />
              {errors.mrp && (
                <p className="text-xs text-destructive">{errors.mrp}</p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="minStock">Min Stock</Label>
              <Input
                id="minStock"
                type="number"
                min={0}
                value={form.minStock}
                onChange={(e) => handleChange("minStock", e.target.value)}
                placeholder="0"
                aria-invalid={!!errors.minStock}
              />
              {errors.minStock && (
                <p className="text-xs text-destructive">{errors.minStock}</p>
              )}
            </div>

            {product && (
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="monthsInInventory">Months in Inventory</Label>
                <Input
                  id="monthsInInventory"
                  type="number"
                  min={0}
                  step={1}
                  value={form.monthsInInventory ?? "0"}
                  onChange={(e) => handleChange("monthsInInventory", e.target.value)}
                  placeholder="0"
                  aria-invalid={!!errors.monthsInInventory}
                />
                {errors.monthsInInventory && (
                  <p className="text-xs text-destructive">{errors.monthsInInventory}</p>
                )}
              </div>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="shipping">Shipping ($)</Label>
              <Input
                id="shipping"
                type="number"
                min={0}
                step={0.01}
                value={form.shipping}
                onChange={(e) => handleChange("shipping", e.target.value)}
                placeholder="0"
                aria-invalid={!!errors.shipping}
              />
              {errors.shipping && (
                <p className="text-xs text-destructive">{errors.shipping}</p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="installation">Install ($)</Label>
              <Input
                id="installation"
                type="number"
                min={0}
                step={0.01}
                value={form.installation}
                onChange={(e) => handleChange("installation", e.target.value)}
                placeholder="0"
                aria-invalid={!!errors.installation}
              />
              {errors.installation && (
                <p className="text-xs text-destructive">{errors.installation}</p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="paidAmount">Paid Amount ($)</Label>
              <Input
                id="paidAmount"
                type="number"
                min={0}
                step={0.01}
                value={form.paidAmount}
                onChange={(e) => handleChange("paidAmount", e.target.value)}
                placeholder="0"
                aria-invalid={!!errors.paidAmount}
              />
              {errors.paidAmount && (
                <p className="text-xs text-destructive">{errors.paidAmount}</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={submitting}>
            {submitting ? "Saving..." : product ? "Save Changes" : "Create Product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
