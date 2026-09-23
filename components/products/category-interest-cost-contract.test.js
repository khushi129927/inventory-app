const fs = require("fs");
const path = require("path");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const dialogPath = path.join(process.cwd(), "components", "products", "product-dialog.tsx");
const tablePath = path.join(process.cwd(), "components", "products", "product-table.tsx");
const costUtilsPath = path.join(process.cwd(), "lib", "cost-utils.ts");
const typesPath = path.join(process.cwd(), "app", "types", "inventory.ts");

const dialogSource = fs.readFileSync(dialogPath, "utf8");
const tableSource = fs.readFileSync(tablePath, "utf8");
const costUtilsSource = fs.readFileSync(costUtilsPath, "utf8");
const typesSource = fs.readFileSync(typesPath, "utf8");

assert(
  !typesSource.includes("monthlyInterest: number;"),
  "Expected product interest charges to stop being stored as a per-product monthlyInterest field"
);

assert(
  !dialogSource.includes('htmlFor="monthlyInterest"') && !dialogSource.includes('handleChange("monthlyInterest"'),
  "Expected product dialog to stop exposing a per-product monthly interest editor"
);

assert(
  tableSource.includes("Months in Inventory") &&
    tableSource.includes("Interest Charge") &&
    tableSource.includes("GST Charge") &&
    tableSource.includes("Total Cost"),
  "Expected product table to show months in inventory, interest charge, GST charge, and total cost columns"
);

assert(
  costUtilsSource.includes("getMonthsInInventory") &&
    costUtilsSource.includes("getInterestCharge") &&
    costUtilsSource.includes("getTotalCost"),
  "Expected shared cost utilities to expose months-in-inventory, interest-charge, and total-cost helpers"
);

assert(
  costUtilsSource.includes("Laptop") ||
    costUtilsSource.includes("Desktop") ||
    costUtilsSource.includes("Workstation") ||
    costUtilsSource.includes("Server") ||
    costUtilsSource.includes("Accessory"),
  "Expected category-based monthly interest rates to be defined in shared cost utilities"
);

console.log("Verified category-based interest-cost contract for products");
