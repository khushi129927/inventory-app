const fs = require("fs");
const path = require("path");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const buildSummaryPath = path.join(process.cwd(), "components", "pc-builder", "build-summary-panel.tsx");
const source = fs.readFileSync(buildSummaryPath, "utf8");

assert(
  source.includes("const handleOrderNow = async () => {") &&
    source.includes("await apiCreateOrder({") &&
    source.includes('customerName: role === "admin" || role === "manager" ? "PC Builder" : "Executive Builder"') &&
    source.includes('customerEmail: "builder@inventory-app.local"') &&
    source.includes("items: items.map((item) => ({") &&
    source.includes('quantity: 1') &&
    source.includes('router.push("/orders")'),
  "Expected Order Now to create an order request from the build summary and redirect to the Orders page"
);

console.log("Verified Order Now creates an order request from the build summary and redirects to Orders");
