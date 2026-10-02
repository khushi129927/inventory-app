const fs = require("fs");
const path = require("path");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const globalsPath = path.join(process.cwd(), "app", "globals.css");
const globals = fs.readFileSync(globalsPath, "utf8");

assert(globals.includes("--background: #1a1d29;"), "Expected dark theme page background to match the Comfortable Dark reference");
assert(globals.includes("--card: #232636;"), "Expected dark theme card surfaces to match the Comfortable Dark reference");
assert(globals.includes("--popover: #232636;"), "Expected dark theme popovers to use the Comfortable Dark card surface");
assert(globals.includes("--foreground: #dde3eb;"), "Expected dark theme foreground to soften the Comfortable Dark text color slightly for reduced eye strain");
assert(globals.includes("--primary: #dde3eb;"), "Expected dark theme primary action to soften the Comfortable Dark light button color slightly for reduced eye strain");
assert(globals.includes("--primary-foreground: #0e1118;"), "Expected dark theme primary foreground to use the Comfortable Dark button text color");
assert(globals.includes("--secondary: #232636;"), "Expected dark theme secondary surfaces to use the Comfortable Dark card background");
assert(globals.includes("--muted: #2e3347;"), "Expected dark theme muted surfaces to use the Comfortable Dark input background");
assert(globals.includes("--muted-foreground: #909bb8;"), "Expected dark theme muted text to use the Comfortable Dark muted copy color");
assert(globals.includes("--accent: #2dd4bf;"), "Expected dark theme accent to use the Comfortable Dark teal accent");
assert(globals.includes("--accent-foreground: #0e1118;"), "Expected dark theme accent foreground to use the Comfortable Dark inverse button text color");
assert(globals.includes("--destructive: #fca5a5;"), "Expected dark theme destructive text to use the Comfortable Dark danger text color");
assert(globals.includes("--border: rgba(255,255,255,0.1);"), "Expected dark theme borders to use the Comfortable Dark translucent border");
assert(globals.includes("--input: #2e3347;"), "Expected dark theme input surfaces to use the Comfortable Dark input background");
assert(globals.includes("--ring: #5ff3e0;"), "Expected dark theme ring color to use the Comfortable Dark bright accent");
assert(globals.includes("--sidebar: #151820;"), "Expected dark theme sidebar background to match the Comfortable Dark reference");
assert(globals.includes("--sidebar-foreground: #dde3eb;"), "Expected dark theme sidebar text to soften the Comfortable Dark inverse text color slightly for reduced eye strain");
assert(globals.includes("--sidebar-primary: #2dd4bf;"), "Expected dark theme sidebar active indicator to use the Comfortable Dark teal accent");
assert(globals.includes("--sidebar-accent: rgba(45,212,191,0.08);"), "Expected dark theme sidebar active surface to use the Comfortable Dark accent tint");
assert(globals.includes("--sidebar-border: rgba(255,255,255,0.1);"), "Expected dark theme sidebar separators to use the Comfortable Dark translucent border");
assert(globals.includes("--sidebar-ring: #5ff3e0;"), "Expected dark theme sidebar ring to use the Comfortable Dark bright accent");
assert(globals.includes("--text-muted: #909bb8;"), "Expected dark theme text-muted token to use the Comfortable Dark muted copy color");
assert(globals.includes("--border-strong: rgba(144,155,184,0.3);"), "Expected dark theme strong border token to support the Comfortable Dark scrollbar thumb");
assert(globals.includes(":root[data-theme=\"light\"]"), "Expected a light theme token block to exist");
assert(globals.includes("--background: #f4f8fa;"), "Expected light theme page background to match the StockForge reference pages");
assert(globals.includes("--card: #ffffff;"), "Expected light theme card surfaces to match the StockForge reference pages");
assert(globals.includes("--popover: #ffffff;"), "Expected light theme popovers to use the StockForge card surface");
assert(globals.includes("--primary: #0b2a4a;"), "Expected light theme primary action color to match the StockForge sidebar navy");
assert(globals.includes("--foreground: #0b2a4a;"), "Expected light theme foreground text to match the StockForge navy");
assert(globals.includes("--muted-foreground: #56707f;"), "Expected light theme muted text to match the StockForge secondary copy color");
assert(globals.includes("--accent: #0b7a6d;"), "Expected light theme accent to match the StockForge teal accent");
assert(globals.includes("--border: #d9e5e8;"), "Expected light theme borders to match the StockForge border color");
assert(globals.includes("--sidebar: #0b2a4a;"), "Expected light theme sidebar background to match the StockForge navy");
assert(globals.includes("--sidebar-foreground: #e6f0f6;"), "Expected light theme sidebar text to match the StockForge inverse text color");
assert(globals.includes("--sidebar-primary: #4fd1c0;"), "Expected light theme sidebar active indicator to match the StockForge bright accent");
assert(globals.includes("--sidebar-accent: rgba(255,255,255,0.06);"), "Expected light theme sidebar active surface to match the StockForge translucent overlay");
assert(globals.includes("--sidebar-border: rgba(255,255,255,0.1);"), "Expected light theme sidebar separators to match the StockForge translucent border");
assert(globals.includes("--text-muted: #56707f;"), "Expected light theme text-muted token to match the StockForge muted text color");
assert(globals.includes("--border-strong: rgba(11,42,74,0.2);"), "Expected light theme strong border token to support the StockForge scrollbar thumb");
assert(!globals.includes("#20314a"), "Expected no derived navy colors outside the provided palette");
assert(!globals.includes("#1a263a"), "Expected no derived muted dark colors outside the provided palette");
assert(!globals.includes("#c5d6e3"), "Expected no derived light text colors outside the provided palette");
assert(!globals.includes("#d9eef6"), "Expected no derived light backgrounds outside the provided palette");
assert(!globals.includes("#eef8fc"), "Expected no derived muted backgrounds outside the provided palette");
assert(!globals.includes("#6dbed9"), "Expected no derived chart colors outside the provided palette");
assert(!globals.includes("#7fc5df"), "Expected no derived chart colors outside the provided palette");
assert(!globals.includes("#5eaeca"), "Expected no derived chart colors outside the provided palette");
assert(!globals.includes("#385575"), "Expected no derived text-muted colors outside the provided palette");

const shellPath = path.join(process.cwd(), "components", "layout", "shell.tsx");
const shell = fs.readFileSync(shellPath, "utf8");
assert(
  shell.includes("border-l-[var(--sidebar-primary)]"),
  "Expected active sidebar item border to use the StockForge bright sidebar accent"
);
assert(
  shell.includes("bg-[var(--sidebar-accent)]"),
  "Expected active sidebar item background to use the StockForge translucent sidebar accent"
);
assert(
  shell.includes("text-[var(--sidebar-foreground)]"),
  "Expected active sidebar item text/icon color to use the StockForge inverse sidebar text color"
);
assert(shell.includes("bg-[#9BD7EC]"), "Expected notification badges to use the provided light blue");
assert(shell.includes("text-[rgba(232,236,242,0.55)]"), "Expected inactive sidebar items to use the Comfortable Dark inverse-muted text opacity");
assert(shell.includes("hover:bg-[rgba(255,255,255,0.05)]"), "Expected inactive sidebar items to use the Comfortable Dark hover surface");
assert(shell.includes("bg-[rgba(255,255,255,0.04)]"), "Expected sidebar utility cards to use the Comfortable Dark elevated translucent fill");
assert(shell.includes("rounded-full bg-[#2A2E3F]"), "Expected sidebar user badge to use the Comfortable Dark mini-avatar background");
assert(shell.includes("text-[#2DD4BF]"), "Expected sidebar user badge text to use the Comfortable Dark teal accent");

const metricsPath = path.join(process.cwd(), "components", "dashboard", "metric-cards.tsx");
const metrics = fs.readFileSync(metricsPath, "utf8");
assert(metrics.includes("rounded-[8px] border border-border bg-card p-5"), "Expected dashboard metric cards to use the exported StockForge card styling");
assert(metrics.includes("font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]"), "Expected dashboard metric labels to use the exported StockForge mono typography");
assert(metrics.includes("text-[24px] font-bold leading-none tracking-[-0.02em] text-foreground"), "Expected dashboard metric values to use the exported StockForge value typography");

const lowStockPath = path.join(process.cwd(), "components", "dashboard", "low-stock-table.tsx");
const lowStock = fs.readFileSync(lowStockPath, "utf8");
assert(lowStock.includes("border-0 bg-[#E0F5F2] text-[#0B7A6D] hover:bg-[#E0F5F2]"), "Expected low stock badge to use the exported StockForge chip styling");

const settingsPath = path.join(process.cwd(), "components", "settings", "organization-settings-page.tsx");
const settings = fs.readFileSync(settingsPath, "utf8");
assert(settings.includes("border-[#2f476a] bg-[#2f476a]"), "Expected settings action buttons to use the provided slate blue");
assert(settings.includes("hover:bg-[#253955]"), "Expected settings action buttons hover state to use the provided slate blue variant");

const categoriesPath = path.join(process.cwd(), "components", "categories", "category-grid.tsx");
const categories = fs.readFileSync(categoriesPath, "utf8");
assert(categories.includes("focus-visible:ring-[rgba(79,209,192,0.35)]"), "Expected category card focus ring to use the exported StockForge bright accent");
assert(categories.includes('backgroundColor: "#F4F8FA"'), "Expected category icon tile to use the exported StockForge page background");
assert(categories.includes('style={{ color: "#56707F" }}'), "Expected category icon color to use the exported StockForge muted text color");

console.log("Verified provided image palette theme tokens and key component usages");
