"use client";

import * as React from "react";
import { format } from "date-fns";
import type { SavedBuild } from "@/app/types/inventory";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/cost-utils";
import { Button } from "@/components/ui/button";
import Icon from "@/components/Icon";
import BuildStatusBadge from "@/components/build-history/build-status-badge";

interface BuildListProps {
  builds: SavedBuild[];
  selectedId?: string;
  onSelect: (build: SavedBuild) => void;
  onDuplicate: (build: SavedBuild) => void;
  onDelete?: (build: SavedBuild) => void;
}

export default function BuildList({
  builds,
  selectedId,
  onSelect,
  onDuplicate,
  onDelete,
}: BuildListProps) {
  return (
    <div className="flex flex-col gap-3">
      {builds.map((build) => {
        const isSelected = build.id === selectedId;
        const specs = build.items.map((item) => item.category).join(" / ");

        return (
          <div
            key={build.id}
            className={cn(
              "relative w-full rounded-sm border px-4 py-4 transition-colors",
              isSelected
                ? "border-[rgba(155,215,236,0.35)] bg-[rgba(155,215,236,0.08)]"
                : "border-border bg-card hover:bg-muted/40"
            )}
          >
            {isSelected && (
              <span className="absolute inset-y-0 left-0 w-[3px] rounded-l-sm bg-[#9BD7EC]" />
            )}
            <button
              type="button"
              onClick={() => onSelect(build)}
              className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <p className="text-sm font-bold tracking-tight text-foreground">
                      {build.name}
                    </p>
                    <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-muted-foreground">
                      {format(new Date(build.createdAt), "MMM d, yyyy")}
                    </span>
                  </div>
                  <p className="mt-1.5 truncate font-mono text-xs text-muted-foreground">
                    {specs || "No components selected"}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="font-mono text-lg font-semibold tracking-tight text-foreground">
                    {formatCurrency(build.grandTotal)}
                  </span>
                  <BuildStatusBadge status={build.status} />
                </div>
              </div>
            </button>

            <div className="mt-3 flex items-center justify-end gap-2">
              {onDelete && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(build)}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                >
                  <Icon name="Trash2" className="mr-1 h-3.5 w-3.5" />
                  Delete
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onDuplicate(build)}
                className="h-7 px-2 text-xs"
              >
                <Icon name="Copy" className="mr-1 h-3.5 w-3.5" />
                Duplicate
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
