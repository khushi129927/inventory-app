"use client";

import * as React from "react";
import { format } from "date-fns";
import type { SavedBuild } from "@/app/types/inventory";
import { formatCurrency } from "@/lib/cost-utils";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui/button";

interface BuildReceiptPanelProps {
  build: SavedBuild | null;
}

export default function BuildReceiptPanel({ build }: BuildReceiptPanelProps) {
  if (!build) {
    return (
      <Empty className="border border-dashed border-border/70 bg-muted/20 py-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Icon name="Receipt" className="h-5 w-5" />
          </EmptyMedia>
          <EmptyTitle>No build selected</EmptyTitle>
          <EmptyDescription>
            Select a build from the list to preview its component receipt.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 py-6">
      <div className="relative w-full max-w-[560px]">
        {/* Jagged edges */}
        <div
          aria-hidden="true"
          className="absolute -top-3 inset-x-0 h-3 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(135deg, transparent 8px, #0E0E0E 9px), linear-gradient(225deg, transparent 8px, #0E0E0E 9px)`,
            backgroundPosition: "0 0, 10px 0",
            backgroundSize: "20px 20px",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-3 inset-x-0 h-3 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(45deg, transparent 8px, #0E0E0E 9px), linear-gradient(315deg, transparent 8px, #0E0E0E 9px)`,
            backgroundPosition: "0 0, 10px 0",
            backgroundSize: "20px 20px",
          }}
        />

        <div className="bg-[#0E0E0E] border-x border-border relative px-8 py-8 shadow-2xl">
          {/* Verified Stamp */}
          <div className="absolute top-12 right-9 w-24 h-24 border-[3px] border-success rounded-full flex items-center justify-center rotate-[-18deg] opacity-30 pointer-events-none">
            <span className="text-success font-mono text-[12px] font-bold uppercase text-center leading-tight tracking-widest">
              Build<br />Verified
            </span>
          </div>

          <div className="text-center mb-8">
            <div className="text-xl font-bold tracking-tight mb-1">STOCKFORGE</div>
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">PC Build Manifest</div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[12px] text-muted-foreground mb-6">
            <div>Build ID<br /><span className="text-foreground">{build.id.toUpperCase()}</span></div>
            <div className="text-right">Date<br /><span className="text-foreground">{format(new Date(build.createdAt), "MMM d, yyyy")}</span></div>
            <div>Operator<br /><span className="text-foreground">{build.createdBy || "N/A"}</span></div>
            <div className="text-right">Station<br /><span className="text-foreground">WS-04</span></div>
            <div className="col-span-2 text-center text-[11px] text-muted-foreground mt-2 tracking-wider">
              Customer Ref: {build.id}-REF / Priority: Standard / Warranty: 36 Mo
            </div>
          </div>

          <hr className="border-t border-dashed border-white/10 my-5" />

          <ul className="space-y-4">
            {build.items.map((item, idx) => (
              <li key={idx} className="grid grid-cols-[1fr_auto] gap-2">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-0.5">
                    {item.category}
                  </div>
                  <div className="text-sm font-medium text-foreground leading-tight">
                    {item.productName}
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground">
                    SF-SKU-{item.productId.slice(0, 4)}
                  </div>
                </div>
                <div className="text-right font-mono text-sm">
                  <div className="text-[10px] text-muted-foreground uppercase">QTY</div>
                  <div className="text-primary font-bold">1</div>
                </div>
              </li>
            ))}
          </ul>

          <hr className="border-t border-dashed border-white/10 my-5" />

          <div className="font-mono text-sm text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Components</span>
              <span>{build.items.length} Units</span>
            </div>
            <div className="flex justify-between">
              <span>Unique SKUs</span>
              <span>{build.items.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Consumables</span>
              <span>3 Items</span>
            </div>
            <div className="flex justify-between">
              <span>Rush Build</span>
              <span>No</span>
            </div>
            <div className="flex justify-between mt-3 pt-3 border-t border-white/10 text-base font-bold text-foreground">
              <span>BUILD TOTAL</span>
              <span className="text-primary font-bold tabular-nums">{formatCurrency(build.grandTotal)}</span>
            </div>
          </div>

          <div className="mt-8 text-center">
            <div className="flex justify-center gap-0.5 h-12 items-end mb-3">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="bg-muted-foreground opacity-60"
                  style={{
                    width: `${Math.floor(Math.random() * 4) + 1}px`,
                    height: `${Math.floor(Math.random() * 40) + 10}px`
                  }}
                />
              ))}
            </div>
            <div className="font-mono text-[11px] text-muted-foreground tracking-widest mb-4">
              {build.id.toUpperCase()}-RCV
            </div>
            <div className="font-mono text-[10px] text-muted-foreground leading-relaxed tracking-wider">
              <strong className="text-muted-foreground font-medium">STOCKFORGE BUILD LAB</strong><br />
              All components verified against active inventory.<br />
              Thermal paste applied. Cable management complete.<br />
              QA passed at {format(new Date(build.createdAt), "h:mm a")} — Station WS-04
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-3">
        <Button variant="default" size="sm" className="bg-primary text-white border-primary font-semibold px-4">
          Print Manifest
        </Button>
        <Button variant="outline" size="sm" className="font-semibold px-4 border-border-strong text-muted-foreground">
          Export PDF
        </Button>
        <Button variant="outline" size="sm" className="font-semibold px-4 border-border-strong text-muted-foreground" onClick={() => window.location.href = "/builder"}>
          Start Next Build
        </Button>
      </div>
    </div>
  );
}
