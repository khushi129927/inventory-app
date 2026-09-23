"use client";

import * as React from "react";
import type { Product } from "@/app/types/inventory";
import ProductRow from "@/components/pc-builder/product-row";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface CategoryStepProps {
  value: string;
  stepNumber: number;
  categoryName: string;
  products: Product[];
  selectedProductId?: string;
  onSelect: (product: Product) => void;
  onSkip?: () => void;
}

type SortMode = "default" | "low-to-high" | "high-to-low";

const filterOptions: Array<{ label: string; value: SortMode }> = [
  { label: "Default", value: "default" },
  { label: "Low to High", value: "low-to-high" },
  { label: "High to Low", value: "high-to-low" },
];

const sortDropdownItems: Array<{ label: string; value: SortMode }> = filterOptions;

export default function CategoryStep({
  value,
  stepNumber,
  categoryName,
  products,
  selectedProductId,
  onSelect,
  onSkip,
}: CategoryStepProps) {
  const [searchText, setSearchText] = React.useState("");
  const [sortMode, setSortMode] = React.useState<SortMode>("default");

  const normalizedSearch = searchText.trim().toLowerCase();

  const filteredProducts = React.useMemo(() => {
    const matchesCategory = products.filter(
      (product) => product.categoryName === categoryName
    );

    const searched = matchesCategory.filter((product) => {
      if (!normalizedSearch) {
        return true;
      }

      const haystack = `${product.name} ${product.description ?? ""} ${product.sku}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });

    if (sortMode === "low-to-high") {
      return [...searched].sort((a, b) => a.price - b.price);
    }

    if (sortMode === "high-to-low") {
      return [...searched].sort((a, b) => b.price - a.price);
    }

    return searched;
  }, [categoryName, normalizedSearch, products, sortMode]);

  const selectedProduct = filteredProducts.find(
    (product) => product.id === selectedProductId
  );

  return (
    <AccordionItem
      value={value}
      className={cn(
        "rounded-md border border-border bg-card transition-colors",
        selectedProduct && "border-primary/40"
      )}
    >
      <AccordionTrigger className="items-center gap-3 py-3 px-4 hover:no-underline">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
            selectedProduct ? "bg-success text-white" : "bg-primary text-white"
          )}>
            {selectedProduct ? (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
            ) : (
              stepNumber
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground leading-none">
              {categoryName}
            </h3>
            <p className="text-[12px] text-muted-foreground mt-1">
              {products.filter(p => p.categoryName === categoryName).length} compatible parts available
            </p>
          </div>
        </div>
      </AccordionTrigger>

      <AccordionContent className="px-4 pb-4">
        <div className="space-y-3 rounded-sm border-t border-border bg-background pt-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-2">
                <Input
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder={`Search ${categoryName}...`}
                  className="h-9 bg-background border-border-strong"
                />
                <span className="text-[12px] text-muted-foreground whitespace-nowrap">
                  {filteredProducts.length} results
                </span>
                <div className="flex items-center rounded border border-border-strong bg-background px-3 py-1.5">
                  <button
                    type="button"
                    onClick={onSkip}
                    className="text-[12px] font-medium text-primary whitespace-nowrap hover:underline"
                  >
                    Skip
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Sort
                  </span>
                  <Select value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)}>
                    <SelectTrigger className="h-8 min-w-[150px] border-border-strong bg-background text-xs">
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortDropdownItems.map(({ label, value }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <div className="max-h-[560px] overflow-y-auto">
            {filteredProducts.length > 0 ? (
              <div className="flex flex-col">
                {filteredProducts.map((product) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    isSelected={selectedProductId === product.id}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            ) : (
              <div className="flex min-h-36 items-center justify-center rounded-md border border-dashed border-border bg-muted/20 px-4 text-center text-sm text-muted-foreground">
                No products found for this search and filter combination.
              </div>
            )}
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
