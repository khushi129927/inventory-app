"use client";

import * as React from "react";
import { toast } from "sonner";
import { useInventoryStore } from "@/lib/store";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Icon from "@/components/Icon";

export default function DangerZoneCard() {
  const resetWorkspaceData = useInventoryStore((s) => s.resetWorkspaceData);
  const [open, setOpen] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);

  const handleConfirm = async () => {
    setResetting(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    resetWorkspaceData();
    toast.success("Workspace data has been reset to defaults");
    setResetting(false);
    setOpen(false);
  };

  return (
    <>
      <div className="flex items-center justify-between gap-4 rounded-xl border border-destructive/20 bg-destructive/5 p-6">
        <div>
          <h3 className="text-base font-bold text-destructive">Reset Workspace Data</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Restore products, categories, movements, and orders to their original demo
            state. This cannot be undone.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="shrink-0 rounded-lg border border-destructive px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          Reset Data
        </button>
      </div>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10">
              <Icon name="AlertTriangle" className="text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>Reset Workspace Data</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently replace your current products, categories, movements,
              and orders with the original demo data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleConfirm} disabled={resetting}>
              {resetting ? "Resetting..." : "Reset Data"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
