const fs = require("fs");
const path = require("path");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const filePath = path.join(process.cwd(), "components", "categories", "category-grid.tsx");
const source = fs.readFileSync(filePath, "utf8");

assert(source.includes('import { useRouter } from "next/navigation";'), 'Expected CategoryGrid to use Next router');
assert(source.includes('const router = useRouter();'), 'Expected CategoryGrid to initialize the router');
assert(source.includes('router.push(`/products?categoryId=${encodeURIComponent(cat.id)}`)'), 'Expected CategoryGrid to navigate to the filtered stock page');
assert(source.includes('rounded-[8px] border border-border bg-card'), 'Expected category cards to use the exported StockForge card radius and border styling');
assert(source.includes('focus-visible:ring-[rgba(79,209,192,0.35)]'), 'Expected category cards to use the exported StockForge bright-accent focus treatment');
assert(source.includes('rounded-[4px] border border-border'), 'Expected category thumbnails to use the exported StockForge thumbnail radius and border styling');
assert(source.includes('backgroundColor: "#F4F8FA"'), 'Expected category icon tile to use the exported StockForge page background');
assert(source.includes('style={{ color: "#56707F" }}'), 'Expected category folder icon to use the exported StockForge muted text color');
assert(source.includes('absolute inset-0 rounded-[8px]'), 'Expected category navigation to use a full-card overlay button');
assert(source.includes('pointer-events-none relative z-10 flex flex-col gap-4 px-5 pt-6 pb-5'), 'Expected card content to allow overlay clicks to pass through');
assert(source.includes('pointer-events-auto relative z-20 flex items-center justify-end gap-2'), 'Expected admin action buttons to remain clickable above the overlay');

console.log('Verified themed full-card category navigation structure in components/categories/category-grid.tsx');
