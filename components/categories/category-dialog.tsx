"use client";

import * as React from "react";
import { toast } from "sonner";
import type { Category } from "@/app/types/inventory";
import { useCategories, useCreateCategory, useUpdateCategory } from "@/hooks/use-categories";
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

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
}

const generateId = () =>
  Math.random().toString(36).substring(2, 15) +
  Math.random().toString(36).substring(2, 15);

const nowIso = () => new Date().toISOString();

const colorPresets = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ef4444", // red
  "#06b6d4", // cyan
  "#f97316", // orange
  "#ec4899", // pink
  "#84cc16", // lime
  "#6366f1", // indigo
  "#14b8a6", // teal
  "#a855f7", // purple
];

export default function CategoryDialog({ open, onOpenChange, category }: CategoryDialogProps) {
  const { data: categories = [] } = useCategories();
  const { mutateAsync: createCat, isPending: creating } = useCreateCategory();
  const { mutateAsync: updateCat, isPending: updating } = useUpdateCategory();

  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState(colorPresets[0]);
  const [monthlyRate, setMonthlyRate] = React.useState("0");
  const [gstPercent, setGstPercent] = React.useState("0");
  const [error, setError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      if (category) {
        setName(category.name);
        setColor(category.color ?? colorPresets[0]);
        setMonthlyRate(String(category.monthlyRate ?? 0));
        setGstPercent(String(category.gstPercent ?? 0));
      } else {
        setName("");
        setColor(colorPresets[0]);
        setMonthlyRate("0");
        setGstPercent("0");
      }
      setError("");
      setSubmitting(false);
    }
  }, [open, category]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Category name is required");
      return;
    }

    const duplicate = categories.some(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase() && c.id !== category?.id
    );
    if (duplicate) {
      setError("A category with this name already exists");
      return;
    }

    const parsedMonthlyRate = Number(monthlyRate);
    const parsedGstPercent = Number(gstPercent);

    if (Number.isNaN(parsedMonthlyRate) || parsedMonthlyRate < 0) {
      setError("Monthly rate must be 0 or greater");
      return;
    }

    if (Number.isNaN(parsedGstPercent) || parsedGstPercent < 0) {
      setError("GST percentage must be 0 or greater");
      return;
    }

    setSubmitting(true);
    try {
      if (category) {
        await updateCat({
          id: category.id,
          data: { name: trimmed, color, monthlyRate: parsedMonthlyRate, gstPercent: parsedGstPercent },
        });
      } else {
        await createCat({
          name: trimmed,
          description: "",
          color,
          monthlyRate: parsedMonthlyRate,
          gstPercent: parsedGstPercent,
        });
      }
      onOpenChange(false);
    } catch (error: any) {
      setError(error.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{category ? "Edit Category" : "Create Category"}</DialogTitle>
          <DialogDescription>
            {category
              ? "Update the category name and color."
              : "Add a new category to organize products."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="cat-name">Category Name</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError("");
              }}
              placeholder="e.g. Electronics"
              aria-invalid={!!error}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="cat-monthly-rate">Monthly Rate</Label>
              <Input
                id="cat-monthly-rate"
                type="number"
                min={0}
                step={0.01}
                value={monthlyRate}
                onChange={(e) => {
                  setMonthlyRate(e.target.value);
                  if (error) setError("");
                }}
                placeholder="e.g. 300"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cat-gst-percent">GST %</Label>
              <Input
                id="cat-gst-percent"
                type="number"
                min={0}
                step={0.01}
                value={gstPercent}
                onChange={(e) => {
                  setGstPercent(e.target.value);
                  if (error) setError("");
                }}
                placeholder="e.g. 18"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Color</Label>
            <div className="grid grid-cols-6 gap-2">
              {colorPresets.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="flex h-8 w-full items-center justify-center rounded-lg border-2 transition-all"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? "#000" : "transparent",
                    boxShadow: color === c ? "0 0 0 2px #fff, 0 0 0 4px " + c : "none",
                  }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3 rounded-lg border border-border p-3">
            <div
              className="h-8 w-8 shrink-0 rounded-lg"
              style={{ backgroundColor: color }}
            />
            <div>
              <p className="text-sm font-medium">{name || "Category preview"}</p>
              <p className="text-xs text-muted-foreground">
                {category ? category.productCount : 0} products · ₹{monthlyRate || "0"}/month + {gstPercent || "0"}% GST
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={submitting}>
            {submitting ? "Saving..." : category ? "Save Changes" : "Create Category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}