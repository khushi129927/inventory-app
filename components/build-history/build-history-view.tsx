"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { SavedBuild, UserRole } from "@/app/types/inventory";
import { useInventoryStore } from "@/lib/store";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
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
import BuildList from "@/components/build-history/build-list";
import BuildReceiptPanel from "@/components/build-history/build-receipt-panel";

interface BuildHistoryViewProps {
  role?: UserRole;
}

export default function BuildHistoryView({ role }: BuildHistoryViewProps) {
  const router = useRouter();
  const savedBuilds = useInventoryStore((s) => s.savedBuilds);
  const deleteSavedBuild = useInventoryStore((s) => s.deleteSavedBuild);

  const [selectedId, setSelectedId] = React.useState<string | undefined>(savedBuilds[0]?.id);
  const [deleteTarget, setDeleteTarget] = React.useState<SavedBuild | null>(null);

  React.useEffect(() => {
    if (!selectedId && savedBuilds.length > 0) {
      setSelectedId(savedBuilds[0].id);
    }
  }, [savedBuilds, selectedId]);

  const selectedBuild = React.useMemo(
    () => savedBuilds.find((build) => build.id === selectedId) ?? null,
    [savedBuilds, selectedId]
  );

  const canManage = role === "admin" || role === "manager";

  const handleDuplicate = (build: SavedBuild) => {
    router.push(`/builder?load=${build.id}`);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteSavedBuild(deleteTarget.id);
    toast.success(`"${deleteTarget.name}" removed from build history`);
    if (selectedId === deleteTarget.id) {
      setSelectedId(undefined);
    }
    setDeleteTarget(null);
  };

  if (savedBuilds.length === 0) {
    return (
      <Empty className="border border-dashed border-border/70 bg-muted/20 py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Icon name="History" className="h-5 w-5" />
          </EmptyMedia>
          <EmptyTitle>No saved builds yet</EmptyTitle>
          <EmptyDescription>
            Configurations you save from the PC Builder will show up here.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="text-xs text-muted-foreground">
          Head to PC Builder and use &quot;Save Build&quot; to create your first entry.
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <BuildList
          builds={savedBuilds}
          selectedId={selectedId}
          onSelect={(build) => setSelectedId(build.id)}
          onDuplicate={handleDuplicate}
          onDelete={canManage ? (build) => setDeleteTarget(build) : undefined}
        />

        <div className="lg:sticky lg:top-6">
          <BuildReceiptPanel build={selectedBuild} />
        </div>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10">
              <Icon name="Trash2" className="text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete Build</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? (
                <>
                  Are you sure you want to remove{" "}
                  <span className="font-medium text-foreground">{deleteTarget.name}</span> from
                  build history? This action cannot be undone.
                </>
              ) : (
                "Are you sure you want to remove this build?"
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleConfirmDelete}>
              Delete Build
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
