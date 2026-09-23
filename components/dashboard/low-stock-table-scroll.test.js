const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const lowStockTablePath = path.join(process.cwd(), "components", "dashboard", "low-stock-table.tsx");
const lowStockTable = fs.readFileSync(lowStockTablePath, "utf8");

assert(
  lowStockTable.includes("Low Stock Alerts"),
  "Expected the dashboard to keep the low-stock alerts section"
);

assert(
  lowStockTable.includes("max-h-") || lowStockTable.includes("h-["),
  "Expected the low-stock alerts table to define a bounded height"
);

assert(
  lowStockTable.includes("overflow-y-auto") || lowStockTable.includes("overflow-auto"),
  "Expected the low-stock alerts table to scroll vertically when many rows are present"
);

assert(
  lowStockTable.includes('rounded-[8px] border border-border bg-card') &&
    lowStockTable.includes('font-mono text-[10px] font-semibold uppercase tracking-[0.08em]') &&
    lowStockTable.includes('bg-[#FEF2F2] text-[#DC2626]') &&
    lowStockTable.includes('bg-[#F0FDF4] text-[#16A34A]'),
  "Expected the dashboard low-stock table to match the exported StockForge panel and badge styling"
);

console.log("Verified low-stock alerts use a bounded scrollable container");
