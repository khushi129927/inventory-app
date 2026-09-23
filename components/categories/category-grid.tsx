"use client";

import { useRouter } from "next/navigation";
import type { Category } from "@/app/types/inventory";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Icon from "@/components/Icon";

interface CategoryGridProps {
  categories: Category[];
  onEdit?: (category: Category) => void;
  onDelete?: (category: Category) => void;
}

export default function CategoryGrid({
  categories,
  onEdit,
  onDelete,
}: CategoryGridProps) {
  const router = useRouter();

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card py-14 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Icon name="Tags" className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">
          No categories yet
        </p>
        <p className="text-xs text-muted-foreground/70">
          Create your first category to start organizing products.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {categories.map((cat) => (
        <div
          key={cat.id}
          className="group relative overflow-hidden rounded-[8px] border border-border bg-card text-left transition-colors hover:bg-muted/20"
        >
          <button
            type="button"
            aria-label={`View ${cat.name} products`}
            onClick={() => router.push(`/products?categoryId=${encodeURIComponent(cat.id)}`)}
            className="absolute inset-0 rounded-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(79,209,192,0.35)] focus-visible:ring-offset-2"
          />
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
            style={{ backgroundColor: "rgba(155,215,236,0.6)" }}
          />

          <div className="pointer-events-none relative z-10 flex flex-col gap-4 px-5 pt-6 pb-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[4px] border border-border"
                  style={{
                    backgroundColor: "#F4F8FA",
                  }}
                >
                  <Icon
                    name="FolderOpen"
                    className="h-5 w-5"
                    style={{ color: "#56707F" }}
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold tracking-tight text-foreground">
                    {cat.name}
                  </h3>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    {cat.productCount} product{cat.productCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>

            {(onEdit || onDelete) && (
              <div className="pointer-events-auto relative z-20 flex items-center justify-end gap-2 border-t border-border/70 pt-3">
              {onEdit && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-7 w-7"
                      onClick={() => {
                        onEdit(cat);
                      }}
                    >
                      <Icon name="Pencil" className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit category</TooltipContent>
                </Tooltip>
              )}
              {onDelete && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        onDelete(cat);
                      }}
                    >
                      <Icon name="Trash2" className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete category</TooltipContent>
                </Tooltip>
              )}
            </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
