"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { ProductMargin, SavedBuild, SavedBuildItem } from "@/app/types/inventory";
import { useInventoryStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Icon from "@/components/Icon";

interface SaveBuildDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: SavedBuildItem[];
  subtotal: number;
  margin: ProductMargin;
  marginAmount: number;
  grandTotal: number;
  defaultName: string;
}

const generateId = () =>
  Math.random().toString(36).substring(2, 15) +
  Math.random().toString(36).substring(2, 15);

export default function SaveBuildDialog({
  open,
  onOpenChange,
  items,
  subtotal,
  margin,
  marginAmount,
  grandTotal,
  defaultName,
}: SaveBuildDialogProps) {
  const router = useRouter();
  const currentUser = useInventoryStore((s) => s.currentUser);
  const saveBuild = useInventoryStore((s) => s.saveBuild);

  const [name, setName] = React.useState(defaultName);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName(defaultName);
      setSaving(false);
    }
  }, [open, defaultName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);

    const now = new Date().toISOString();
    const build: SavedBuild = {
      id: generateId(),
      name: name.trim(),
      status: "completed",
      items,
      subtotal,
      margin,
      marginAmount,
      grandTotal,
      createdBy: currentUser?.name,
      createdAt: now,
      updatedAt: now,
    };

    await new Promise((resolve) => setTimeout(resolve, 250));

    saveBuild(build);
    toast.success(`"${build.name}" saved to build history`, {
      action: {
        label: "View",
        onClick: () => router.push("/builder/history"),
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Save Build</DialogTitle>
            <DialogDescription>
              Give this configuration a name to find it later in Build History.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-1.5">
            <Label htmlFor="build-name">Build Name</Label>
            <Input
              id="build-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Gaming Tower v1"
              autoFocus
            />
          </div>

          <DialogFooter className="mt-6 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? (
                <>
                  <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Build"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
