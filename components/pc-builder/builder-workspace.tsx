"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { Product, ProductMargin, UserRole } from "@/app/types/inventory";
import BuildSummaryPanel from "@/components/pc-builder/build-summary-panel";
import CategoryStep from "@/components/pc-builder/category-step";
import { Accordion } from "@/components/ui/accordion";
import { useInventoryStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useSavedBuilds } from "@/hooks/use-builds";

interface BuilderWorkspaceProps {
  products: Product[];
  role?: UserRole;
}

type SelectedSlots = Record<string, string>;

const preferredCategoryOrder = [
  "CPU",
  "Motherboard",
  "RAM",
  "SSD",
  "GPU",
  "Cooler",
  "Cabinet",
  "SMPS",
  "UPS",
  "Monitor",
  "Other",
];

function getProductMap(products: Product[]) {
  return products.reduce<Record<string, Product>>((acc, product) => {
    acc[product.id] = product;
    return acc;
  }, {});
}

function normalizePcBuilderCategory(categoryName: string) {
  return categoryName.trim().toUpperCase();
}

export default function BuilderWorkspace({
  products,
  role,
}: BuilderWorkspaceProps) {
  const inStockProducts = React.useMemo(
    () =>
      products.filter(
        (product) => product.status === "in-stock" || product.status === "low-stock"
      ),
    [products]
  );
  const categories = React.useMemo(() => {
    const stockedCategoryNames = new Set(
      inStockProducts.map((product) => normalizePcBuilderCategory(product.categoryName))
    );
    const preferredStockedCategories = preferredCategoryOrder.filter((category) =>
      stockedCategoryNames.has(normalizePcBuilderCategory(category))
    );

    return preferredStockedCategories;
  }, [inStockProducts]);
  const productMap = React.useMemo(() => getProductMap(inStockProducts), [inStockProducts]);
  const [selectedSlots, setSelectedSlots] = React.useState<SelectedSlots>({});
  const [buildMargin, setBuildMargin] = React.useState<ProductMargin>({
    type: "flat",
    value: 0,
  });
  const [openStep, setOpenStep] = React.useState<string | undefined>(undefined);

  const canManagePricing = role === "admin" || role === "manager";

  const router = useRouter();
  const searchParams = useSearchParams();
  const savedBuilds = useInventoryStore((s) => s.savedBuilds);
  const loadBuildId = searchParams.get("load");
  const loadedBuildIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!loadBuildId || loadBuildId === loadedBuildIdRef.current) {
      return;
    }

    const build = savedBuilds.find((b) => b.id === loadBuildId);
    if (!build) {
      return;
    }

    const nextSlots: SelectedSlots = {};
    build.items.forEach((item) => {
      if (productMap[item.productId]) {
        nextSlots[item.category] = item.productId;
      }
    });

    setSelectedSlots(nextSlots);
    setBuildMargin(build.margin);
    loadedBuildIdRef.current = loadBuildId;
    toast.success(`Loaded "${build.name}" into the builder`);
    router.replace("/builder");
  }, [loadBuildId, savedBuilds, productMap, router]);

  React.useEffect(() => {
    if (!openStep && categories.length > 0) {
      setOpenStep(categories[0]);
    }
  }, [categories, openStep]);

  const selectedProducts = React.useMemo(() => {
    return categories.reduce<Partial<Record<string, Product>>>((acc, category) => {
      const selectedId = selectedSlots[category];
      if (selectedId && productMap[selectedId]) {
        acc[category] = productMap[selectedId];
      }
      return acc;
    }, {});
  }, [categories, productMap, selectedSlots]);

  const handleSelectProduct = (categoryName: string, product: Product) => {
    setSelectedSlots((prev) => ({
      ...prev,
      [categoryName]: product.id,
    }));

    const currentIndex = categories.indexOf(categoryName);
    const nextCategory = categories[currentIndex + 1];
    if (nextCategory) {
      setOpenStep(nextCategory);
    }
  };

  const handleSkipCategory = (categoryName: string) => {
    setSelectedSlots((prev) => {
      const next = { ...prev };
      delete next[categoryName];
      return next;
    });

    const currentIndex = categories.indexOf(categoryName);
    const nextCategory = categories[currentIndex + 1];
    if (nextCategory) {
      setOpenStep(nextCategory);
    }
  };

  const handleBuildMarginChange = (margin: ProductMargin) => {
    if (!canManagePricing) {
      return;
    }

    setBuildMargin({
      type: margin.type,
      value: Number.isFinite(margin.value) ? margin.value : 0,
    });
  };

  const handleNewBuild = () => {
    setSelectedSlots({});
    setBuildMargin({
      type: "flat",
      value: 0,
    });
    setOpenStep(categories[0]);
  };

  return (
    <div className="bg-background">
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 text-center">
        <div className="flex items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-3">
          <div className="h-px w-6 bg-primary/50"></div>
          PC Creation Studio
          <div className="h-px w-6 bg-primary/50"></div>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl mb-3">
          Design Your <span className="text-primary">Dream PC.</span>
        </h1>
        <p className="mx-auto max-w-[560px] text-sm text-muted-foreground mb-6 leading-relaxed">
          Choose your components step by step. Only compatible parts are shown at each stage — no guesswork, no wasted money, no bad purchases.
        </p>
        <div className="flex justify-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 border border-border-strong rounded text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <svg className="w-3.5 h-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Compatibility-Checked
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 border border-border-strong rounded text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <svg className="w-3.5 h-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            Step-by-Step
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 border border-border-strong rounded text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <svg className="w-3.5 h-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 010 7h5a3.5 3.5 0 010 7H6"/></svg>
            Live Price Total
          </div>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:grid lg:grid-cols-[1fr_326px] lg:gap-6 lg:px-8 lg:py-8">
        <div className="space-y-4">
          <Accordion
            type="single"
            collapsible
            value={openStep}
            onValueChange={(value) => setOpenStep(value || undefined)}
            className="gap-4"
          >
            {categories.map((category, index) => (
              <CategoryStep
                key={category}
                value={category}
                stepNumber={index + 1}
                categoryName={category}
                products={inStockProducts}
                selectedProductId={selectedSlots[category]}
                onSelect={(product) => handleSelectProduct(category, product)}
                onSkip={() => handleSkipCategory(category)}
              />
            ))}
          </Accordion>
        </div>

        <div className="lg:pl-2">
          <BuildSummaryPanel
            categories={categories}
            selectedProducts={selectedProducts}
            buildMargin={canManagePricing ? buildMargin : undefined}
            onBuildMarginChange={canManagePricing ? handleBuildMarginChange : undefined}
            onNewBuild={handleNewBuild}
            role={role}
          />
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8 lg:pb-10">
        <div
          className={cn(
            "rounded-md border border-border bg-card px-4 py-4 text-sm text-muted-foreground"
          )}
        >
          <p className="font-medium text-foreground">Inventory Sync Notice</p>
          <p className="mt-1 leading-6">
            Products shown in this builder are sourced from your uploaded inventory
            data, so pricing, stock visibility, and component availability stay in
            sync with the current catalog.
          </p>
        </div>
      </section>
    </div>
  );
}
