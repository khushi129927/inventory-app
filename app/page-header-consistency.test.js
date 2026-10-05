const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function readAppFile(...segments) {
  return fs.readFileSync(path.join(process.cwd(), "app", ...segments), "utf8");
}

const pages = [
  { name: "Dashboard", file: readAppFile("page.tsx") },
  { name: "Stock", file: readAppFile("products", "page.tsx") },
  { name: "Movements", file: readAppFile("movements", "page.tsx") },
  { name: "Orders", file: readAppFile("orders", "page.tsx") },
  { name: "Categories", file: readAppFile("categories", "page.tsx") },
  { name: "Users", file: readAppFile("users", "page.tsx") },
  { name: "Settings", file: readAppFile("settings", "page.tsx") },
  { name: "Outstanding", file: readAppFile("outstanding", "page.tsx") },
  { name: "Product Catalog", file: readAppFile("offerings", "page.tsx") },
];

for (const page of pages) {
  assert(
    page.file.includes('className="page-header"'),
    `Expected ${page.name} page to use the shared page-header wrapper`
  );

  assert(
    !page.file.includes("<h1 className="),
    `Expected ${page.name} page title to rely on shared page-header styling without an h1 className`
  );
}

console.log("Verified shared page-header structure across key app pages");
