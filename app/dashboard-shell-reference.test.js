const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const shellPath = path.join(process.cwd(), "components", "layout", "shell.tsx");
const dashboardPath = path.join(process.cwd(), "app", "page.tsx");

const shell = fs.readFileSync(shellPath, "utf8");
const dashboard = fs.readFileSync(dashboardPath, "utf8");

assert(
  shell.includes('bg-[var(--sidebar)]') &&
    shell.includes('px-6 pt-4 pb-4') &&
    shell.includes('Inventory Command Center') &&
    shell.includes('font-mono text-[10px] font-medium uppercase tracking-[0.12em]') &&
    shell.includes('px-6 py-2.5') &&
    shell.includes('border-l-[3px]') &&
    shell.includes('bg-[var(--sidebar-accent)]') &&
    shell.includes('text-[rgba(232,236,242,0.55)]'),
  "Expected authenticated shell sidebar to match the token-driven StockForge dashboard structure"
);

assert(
  shell.includes('h-14 border-b border-border bg-card px-8') &&
    shell.includes('font-mono text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground') &&
    shell.includes('rounded-full bg-[var(--sidebar)]') &&
    shell.includes('hover:bg-[rgba(255,255,255,0.05)]') &&
    shell.includes('Logout'),
  "Expected authenticated shell topbar to match the provided StockForge dashboard structure"
);

assert(
  dashboard.includes('page-content px-8 py-8') &&
    dashboard.includes('page-header-row flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between') &&
    dashboard.includes('aria-label="Refresh dashboard"'),
  "Expected dashboard content region to remain aligned with the provided StockForge page layout"
);

console.log("Verified authenticated dashboard shell contract against the provided StockForge reference");
