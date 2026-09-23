const fs = require("fs");
const path = require("path");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const builderPagePath = path.join(process.cwd(), "app", "builder", "page.tsx");
const builderWorkspacePath = path.join(process.cwd(), "components", "pc-builder", "builder-workspace.tsx");
const categoryStepPath = path.join(process.cwd(), "components", "pc-builder", "category-step.tsx");

const builderPageSource = fs.readFileSync(builderPagePath, "utf8");
const builderWorkspaceSource = fs.readFileSync(builderWorkspacePath, "utf8");
const categoryStepSource = fs.readFileSync(categoryStepPath, "utf8");

assert(
  builderPageSource.includes('const { data: products = [] } = useProducts();'),
  'Expected builder page to load products through useProducts before stock filtering is applied'
);

assert(
  builderWorkspaceSource.includes('const inStockProducts = React.useMemo('),
  'Expected builder workspace to derive a stock-filtered product list for the PC builder'
);

assert(
  builderWorkspaceSource.includes('products.filter(') &&
    builderWorkspaceSource.includes('product.status === "in-stock" || product.status === "low-stock"'),
  'Expected builder workspace to keep only products that are currently available in stock for builder selection'
);

assert(
  builderWorkspaceSource.includes('products={inStockProducts}'),
  'Expected builder workspace to pass only stock-available products into each builder category step'
);

assert(
  !categoryStepSource.includes('value: "in-stock-only"'),
  'Expected PC builder to show stock-available products by default instead of relying on a manual in-stock-only toggle'
);

console.log('Verified PC builder defaults to stock-available products only');
