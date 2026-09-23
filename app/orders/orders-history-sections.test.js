const fs = require("fs");
const path = require("path");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const ordersPagePath = path.join(process.cwd(), "app", "orders", "page.tsx");
const orderTablePath = path.join(process.cwd(), "components", "orders", "order-table.tsx");
const ordersPage = fs.readFileSync(ordersPagePath, "utf8");
const orderTable = fs.readFileSync(orderTablePath, "utf8");

assert(
  ordersPage.includes('const pendingOrders = orders.filter((order) => order.status === "pending")') &&
    ordersPage.includes('const historyOrders = orders.filter((order) => order.status === "approved" || order.status === "rejected")') &&
    ordersPage.includes('Pending Approval') &&
    ordersPage.includes('Order History'),
  "Expected Orders page to split pending requests from approved/rejected order history"
);

assert(
  orderTable.includes('order.status === "pending" ? ('),
  "Expected OrderTable to keep approval actions only for pending orders"
);

assert(
  ordersPage.includes('Review, approve, and manage incoming customer order requests.') &&
    orderTable.includes('rounded-[8px] border border-border bg-card') &&
    orderTable.includes('font-mono text-[10px] font-semibold uppercase tracking-[0.08em]') &&
    orderTable.includes('bg-emerald-50 text-emerald-600') &&
    orderTable.includes('bg-red-50 text-red-600'),
  "Expected Orders page and table to match the exported StockForge light-theme panel, table header, and action button styling"
);

console.log("Verified Orders page separates pending approvals from order history");
