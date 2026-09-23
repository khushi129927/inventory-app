const fs = require("fs");
const path = require("path");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const builderWorkspacePath = path.join(process.cwd(), "components", "pc-builder", "builder-workspace.tsx");
const categoryStepPath = path.join(process.cwd(), "components", "pc-builder", "category-step.tsx");

const builderWorkspaceSource = fs.readFileSync(builderWorkspacePath, "utf8");
const categoryStepSource = fs.readFileSync(categoryStepPath, "utf8");

const supportedCategories = [
  "CPU",
  "Motherboard",
  "RAM",
  "SSD",
  "GPU",
  "Cooler",
  "Cabinet",
  "SMPS",
  "UPS",
  "Monitor",
  "Other",
];

assert(
  builderWorkspaceSource.includes("const categories = React.useMemo(") &&
    builderWorkspaceSource.includes("new Set(") &&
    builderWorkspaceSource.includes("normalizePcBuilderCategory(product.categoryName)"),
  "Expected builder workspace to derive visible PC builder categories from stocked inventory while normalizing product category names"
);

assert(
  builderWorkspaceSource.includes("preferredCategoryOrder.filter((category) =>") &&
    builderWorkspaceSource.includes("stockedCategoryNames.has(normalizePcBuilderCategory(category))"),
  "Expected builder workspace to keep only preferred builder categories that actually have stocked inventory products after normalization"
);

assert(
  !builderWorkspaceSource.includes("const uncategorizedStockedCategories =") &&
    !builderWorkspaceSource.includes("!preferredCategoryOrder.includes(category)"),
  "Expected builder workspace to restrict visible builder categories to only the supported PC builder category list"
);

assert(
  builderWorkspaceSource.includes("return preferredStockedCategories;") ||
    builderWorkspaceSource.includes("return preferredCategoryOrder.filter((category) => stockedCategoryNames.has(category));"),
  "Expected builder workspace to return only stocked categories from the supported PC builder list"
);

assert(
  builderWorkspaceSource.includes("trim()") &&
    (builderWorkspaceSource.includes("toUpperCase()") || builderWorkspaceSource.includes("toLowerCase()")),
  "Expected builder workspace to normalize stocked product category names so allowed PC builder categories still render even when product category casing or whitespace differs"
);

for (const category of supportedCategories) {
  assert(
    builderWorkspaceSource.includes(`\"${category}\"`),
    `Expected builder workspace preferred order to keep the supported PC builder category ${category}`
  );
}

assert(
  categoryStepSource.includes("product.categoryName === categoryName"),
  "Expected each PC builder step to continue filtering products to the matching category"
);

console.log("Verified PC builder limits visible categories to stocked inventory categories, normalizes supported category names, and filters products within each category");
