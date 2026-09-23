"use client";

import * as React from "react";
import BuilderWorkspace from "@/components/pc-builder/builder-workspace";
import { useProducts } from "@/hooks/use-products";
import { useAuthStore } from "@/lib/auth-store";

export default function BuilderPage() {
  const { data: products = [] } = useProducts();
  const { currentUser } = useAuthStore();

  const role = currentUser?.role;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="page-content">
        <React.Suspense fallback={null}>
          <BuilderWorkspace products={products} role={role} />
        </React.Suspense>
      </div>
    </div>
  );
}
