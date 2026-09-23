"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useProducts } from "@/hooks/use-products";
import { useCategories } from "@/hooks/use-categories";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiCreateOrder } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Icon from "@/components/Icon";

const now = () => new Date().toISOString();

const generateId = () =>
  Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

interface OrderLine {
  productId: string;
  quantity: string;
}

export default function OfferingsPage() {
  const queryClient = useQueryClient();
  const { data: products = [] } = useProducts();
  const { data: categories = [] } = useCategories();

  const [searchTerm, setSearchTerm] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [customerName, setCustomerName] = React.useState("");
  const [customerEmail, setCustomerEmail] = React.useState("");
  const [lines, setLines] = React.useState<OrderLine[]>([{ productId: "", quantity: "" }]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const createOrderMutation = useMutation({
    mutationFn: apiCreateOrder,
    onSuccess: () => {
      toast.success("Request submitted for manager approval");
      setCustomerName("");
      setCustomerEmail("");
      setLines([{ productId: "", quantity: "" }]);
      setErrors({});
    },
    onError: (error: any) => toast.error(error.message),
  });

  const updateLine = (index: number, field: keyof OrderLine, value: string) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, [field]: value } : line)));
  };

  const addLine = () => {
    setLines((prev) => [...prev, { productId: "", quantity: "" }]);
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredProducts = React.useMemo(() => {
    return products.filter((product) => {
      const matchesCategory =
        categoryFilter === "all" || product.categoryId === categoryFilter;

      if (!matchesCategory) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchableValues = [
        product.name,
        product.sku,
        product.serialNumber,
        product.modelNumber,
        product.categoryName,
        product.description,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());

      return searchableValues.some((value) => value.includes(normalizedSearch));
    });
  }, [categoryFilter, normalizedSearch, products]);

  const totals = React.useMemo(() => {
    let subtotal = 0;
    let shippingTotal = 0;
    let installationTotal = 0;

    lines.forEach((line) => {
      if (!line.productId.trim() || !line.quantity.trim()) {
        return;
      }

      const quantity = parseInt(line.quantity, 10);
      if (Number.isNaN(quantity) || quantity < 1) {
        return;
      }

      const product = products.find((item) => item.id === line.productId);
      if (!product) {
        return;
      }

      subtotal += product.price * quantity;
      shippingTotal += (product.shipping ?? 0) * quantity;
      installationTotal += (product.installation ?? 0) * quantity;
    });

    const grandTotal = subtotal + shippingTotal + installationTotal;
    return { subtotal, shippingTotal, installationTotal, grandTotal };
  }, [lines, products]);

  const hasExtraCharges = totals.shippingTotal > 0 || totals.installationTotal > 0;

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};

    if (!customerName.trim()) {
      nextErrors.customerName = "Customer name is required";
    }

    if (!customerEmail.trim()) {
      nextErrors.customerEmail = "Email is required";
    } else if (!/^.+@.+\..+$/.test(customerEmail.trim())) {
      nextErrors.customerEmail = "Please enter a valid email";
    }

    let validLineCount = 0;

    lines.forEach((line, index) => {
      const isEmptyLine = !line.productId.trim() && !line.quantity.trim();
      if (isEmptyLine) {
        return;
      }

      if (!line.productId.trim()) {
        nextErrors[`line${index}-productId`] = "Please select a product";
      }

      if (!line.quantity.trim()) {
        nextErrors[`line${index}-quantity`] = "Quantity is required";
      } else {
        const quantity = parseInt(line.quantity, 10);
        if (Number.isNaN(quantity) || quantity < 1) {
          nextErrors[`line${index}-quantity`] = "Quantity must be a positive integer";
        }
      }

      if (line.productId.trim() && line.quantity.trim()) {
        const quantity = parseInt(line.quantity, 10);
        if (!Number.isNaN(quantity) && quantity >= 1) {
          validLineCount += 1;
        }
      }
    });

    if (validLineCount === 0) {
      nextErrors.lines = "Please add at least one product with a valid quantity";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    const items = lines
      .filter((line) => line.productId.trim() && line.quantity.trim())
      .map((line) => {
        const product = products.find((item) => item.id === line.productId);
        return {
          productId: line.productId,
          productName: product?.name ?? "",
          quantity: parseInt(line.quantity, 10),
        };
      })
      .filter((item) => item.quantity >= 1);

    if (items.length === 0) {
      return;
    }

    createOrderMutation.mutate({
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      items,
    });
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Product Catalog</h1>
        <p>Browse available inventory and send a request for the items you need.</p>
      </div>

      <div className="rounded-[2px] border border-border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Icon
              name="Search"
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name, serial no, model no, SKU, or category"
              className="h-10 pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[2px] border border-dashed border-border bg-card/60 py-20 text-center">
          <Icon name="PackageOpen" className="mb-4 h-12 w-12 text-muted-foreground/60" />
          <p className="text-lg font-medium text-foreground">No products available</p>
          <p className="mt-1 text-sm text-muted-foreground">Check back later for new arrivals.</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[2px] border border-dashed border-border bg-card/60 py-20 text-center">
          <Icon name="Search" className="mb-4 h-12 w-12 text-muted-foreground/60" />
          <p className="text-lg font-medium text-foreground">No matching products</p>
          <p className="mt-1 text-sm text-muted-foreground">Try a different name, serial number, model number, or category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="overflow-hidden bg-card transition-colors hover:border-[var(--border-strong)]">
              {product.image && (
                <div className="relative aspect-video w-full overflow-hidden border-b border-border bg-black/20">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-full w-full object-cover opacity-90"
                    loading="lazy"
                  />
                </div>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-foreground">{product.name}</CardTitle>
                <CardDescription className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  {product.categoryName}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <p className="line-clamp-3 text-sm text-muted-foreground">
                  {product.description || "No description available."}
                </p>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    Available Branches
                  </p>
                  <p className="text-sm text-foreground">
                    {product.availableBranches?.length
                      ? product.availableBranches.join(", ")
                      : "—"}
                  </p>
                </div>
                <p className="text-lg font-semibold tracking-tight text-foreground">
                  ${product.price.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-[2px] border border-border bg-card p-6">
          <div className="mb-6 flex items-center gap-2">
            <Icon name="ClipboardList" className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Order Request</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="customerName" className="text-foreground">
                Customer Name
              </Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Enter your full name"
                aria-invalid={!!errors.customerName}
                className="border-input bg-background text-foreground placeholder:text-muted-foreground"
              />
              {errors.customerName && <p className="text-xs text-destructive">{errors.customerName}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="customerEmail" className="text-foreground">
                Customer Email
              </Label>
              <Input
                id="customerEmail"
                type="email"
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
                placeholder="Enter your email address"
                aria-invalid={!!errors.customerEmail}
                className="border-input bg-background text-foreground placeholder:text-muted-foreground"
              />
              {errors.customerEmail && <p className="text-xs text-destructive">{errors.customerEmail}</p>}
            </div>

            <div className="space-y-3">
              <Label className="text-foreground">Products</Label>

              {lines.map((line, index) => {
                const selectedOtherIds = new Set(
                  lines
                    .filter((_, currentIndex) => currentIndex !== index)
                    .map((item) => item.productId)
                    .filter(Boolean)
                );

                return (
                  <div
                    key={index}
                    className={`space-y-3 ${index > 0 ? "border-t border-border pt-3" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-1.5">
                        <Select
                          value={line.productId}
                          onValueChange={(value: string | null) => {
                            updateLine(index, "productId", value ?? "");
                          }}
                        >
                          <SelectTrigger
                            id={`product-${index}`}
                            className="w-full border-input bg-background text-foreground"
                            aria-invalid={!!errors[`line${index}-productId`]}
                          >
                            <SelectValue placeholder="Select a product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products
                              .filter(
                                (product) =>
                                  !selectedOtherIds.has(product.id) || product.id === line.productId
                              )
                              .map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        {errors[`line${index}-productId`] && (
                          <p className="text-xs text-destructive">{errors[`line${index}-productId`]}</p>
                        )}
                      </div>

                      <div className="w-28 space-y-1.5">
                        <Input
                          id={`quantity-${index}`}
                          type="number"
                          min={1}
                          step={1}
                          value={line.quantity}
                          onChange={(event) => updateLine(index, "quantity", event.target.value)}
                          placeholder="Qty"
                          aria-invalid={!!errors[`line${index}-quantity`]}
                          className="border-input bg-background text-foreground placeholder:text-muted-foreground"
                        />
                        {errors[`line${index}-quantity`] && (
                          <p className="text-xs text-destructive">{errors[`line${index}-quantity`]}</p>
                        )}
                      </div>

                      {lines.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="mt-0.5 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeLine(index)}
                          aria-label="Remove product line"
                        >
                          <Icon name="X" className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}

              {errors.lines && <p className="text-xs text-destructive">{errors.lines}</p>}

              <Button type="button" variant="outline" className="w-full border-dashed" onClick={addLine}>
                <Icon name="Plus" className="mr-2 h-4 w-4" />
                Add Another Product
              </Button>
            </div>

            <div className="space-y-1 border-t border-border pt-4">
              {hasExtraCharges && (
                <div className="space-y-0.5 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${totals.subtotal.toFixed(2)}</span>
                  </div>
                  {totals.shippingTotal > 0 && (
                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span>${totals.shippingTotal.toFixed(2)}</span>
                    </div>
                  )}
                  {totals.installationTotal > 0 && (
                    <div className="flex justify-between">
                      <span>Installation</span>
                      <span>${totals.installationTotal.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-foreground">
                <span>Total</span>
                <span>${totals.grandTotal.toFixed(2)}</span>
              </div>

              <Button type="submit" className="w-full">
                Submit Request
              </Button>
            </div>
          </form>
        </div>

        <footer className="mt-8 border-t border-border/60 pt-6 text-center">
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <Link href="/offerings/terms" className="transition-colors hover:text-foreground/80">
              Terms and Conditions
            </Link>
            <span className="text-muted-foreground/40">|</span>
            <Link href="/offerings/privacy" className="transition-colors hover:text-foreground/80">
              Privacy Policy
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
