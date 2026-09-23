"use client";

import * as React from "react";
import { useAuthStore } from "@/lib/auth-store";
import BuildHistoryView from "@/components/build-history/build-history-view";

export default function BuildHistoryPage() {
  const { currentUser } = useAuthStore();

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Build History</h1>
        <p>Saved and completed PC builds. Select a build to preview its component receipt and cost breakdown.</p>
      </div>
      <BuildHistoryView role={currentUser?.role} />
    </div>
  );
}
