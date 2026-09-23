"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Icon from "@/components/Icon";
import type { Category, ProductStatus } from "@/app/types/inventory";

export interface FilterState {
  search: string;
  categoryId: string | null;
  status: ProductStatus | null;
}

interface ProductFiltersProps {
  categories: Category[];
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

export default function ProductFilters({ categories, filters, onChange }: ProductFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Icon
          name="Search"
          className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="text"
          placeholder="Search by name or SKU..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="h-8 pl-8 text-sm"
        />
      </div>

      <div className="flex gap-3">
        <Select
          value={filters.categoryId ?? "all"}
          onValueChange={(value: string | null) =>
            onChange({ ...filters, categoryId: value === "all" ? null : value })
          }
        >
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status ?? "all"}
          onValueChange={(value: string | null) =>
            onChange({
              ...filters,
              status:
                value === "all"
                  ? null
                  : (value as ProductStatus),
            })
          }
        >
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="in-stock">In Stock</SelectItem>
            <SelectItem value="low-stock">Low Stock</SelectItem>
            <SelectItem value="out-of-stock">Out of Stock</SelectItem>
            <SelectItem value="discontinued">Discontinued</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
