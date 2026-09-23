import type { SavedBuildStatus } from "@/app/types/inventory";

const variants: Record<SavedBuildStatus, string> = {
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  draft: "bg-muted text-muted-foreground border-border",
  archived: "bg-slate-100 text-slate-600 border-slate-200",
};

const labels: Record<SavedBuildStatus, string> = {
  completed: "Completed",
  draft: "Draft",
  archived: "Archived",
};

export default function BuildStatusBadge({ status }: { status: SavedBuildStatus }) {
  return (
    <span
      className={`inline-flex h-5 shrink-0 items-center rounded-md border px-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] ${variants[status]}`}
    >
      {labels[status]}
    </span>
  );
}
