const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const dashboardPath = path.join(process.cwd(), "app", "page.tsx");
const metricsPath = path.join(process.cwd(), "components", "dashboard", "metric-cards.tsx");
const activityPath = path.join(process.cwd(), "components", "dashboard", "activity-feed.tsx");
const lowStockPath = path.join(process.cwd(), "components", "dashboard", "low-stock-table.tsx");

const dashboard = fs.readFileSync(dashboardPath, "utf8");
const metrics = fs.readFileSync(metricsPath, "utf8");
const activity = fs.readFileSync(activityPath, "utf8");
const lowStock = fs.readFileSync(lowStockPath, "utf8");

assert(
  dashboard.includes('className="page-header-row flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"') &&
    dashboard.includes('className="page-header"') &&
    dashboard.includes('<h1>Dashboard</h1>'),
  "Expected dashboard page header to match the provided StockForge layout and typography"
);

assert(
  dashboard.includes('className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-border bg-transparent text-foreground hover:bg-muted"') &&
    dashboard.includes('aria-label="Refresh dashboard"'),
  "Expected dashboard refresh control to match the provided StockForge icon-button layout"
);

assert(
  metrics.includes('? "grid grid-cols-2 gap-4"') &&
    metrics.includes(': "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5"') &&
    metrics.includes('rounded-[8px] border border-border bg-card p-5') &&
    metrics.includes('font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]') &&
    metrics.includes('text-[24px] font-bold leading-none tracking-[-0.02em] text-foreground'),
  "Expected dashboard metric cards to match the provided StockForge grid, card radius, and typography"
);

assert(
  dashboard.includes('className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]"'),
  "Expected dashboard lower content to use the provided two-column StockForge layout"
);

assert(
  lowStock.includes('rounded-[8px] border border-border bg-card') &&
    lowStock.includes('className="max-h-[380px] overflow-auto"') &&
    lowStock.includes('font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]') &&
    lowStock.includes('font-mono text-[11px] text-muted-foreground') &&
    lowStock.includes('bg-[#FEF2F2] text-[#DC2626]'),
  "Expected low stock panel to match the provided StockForge panel, scroll area, and badge styling"
);

assert(
  activity.includes('rounded-[8px] border border-border bg-card') &&
    activity.includes('border-b border-border px-5 py-4 text-sm font-semibold text-foreground') &&
    activity.includes('No recent activity') &&
    activity.includes('Activity will appear here as you manage inventory.') &&
    activity.includes('h-10 w-10 items-center justify-center rounded-full') &&
    activity.includes('bg-muted'),
  "Expected recent activity panel to match the provided StockForge empty-state card styling"
);

console.log("Verified dashboard layout contract against the provided StockForge reference");
