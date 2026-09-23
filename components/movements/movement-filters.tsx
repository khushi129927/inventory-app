"use client";

import * as React from "react";
import type { MovementType } from "@/app/types/inventory";

export interface MovementFilterState {
  type: MovementType | null;
}

interface MovementFiltersProps {
  filters: MovementFilterState;
  onChange: (filters: MovementFilterState) => void;
}

const movementChips: Array<{ label: string; value: MovementType | null }> = [
  { label: "All", value: null },
  { label: "Inbound", value: "in" },
  { label: "Outbound", value: "out" },
  { label: "Transfer", value: "transfer" },
  { label: "Adjustment", value: "adjustment" },
];

export default function MovementFilters({ filters, onChange }: MovementFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {movementChips.map((chip) => {
        const isActive = filters.type === chip.value;

        return (
          <button
            key={chip.label}
            type="button"
            onClick={() =>
              onChange({
                ...filters,
                type: chip.value,
              })
            }
            className={[
              "rounded-[4px] border px-4 py-2 text-[13px] font-semibold transition-colors",
              isActive
                ? "border-primary/40 bg-accent/10 text-primary"
                : "border-[var(--border-strong)] bg-transparent text-muted-foreground hover:text-foreground",
            ].join(" ")}
            aria-pressed={isActive}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
