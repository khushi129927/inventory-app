import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import ProductTable from "@/components/products/product-table";
import type { Product } from "@/app/types/inventory";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const products: Product[] = [
  {
    id: "product-1",
    name: "RTX 4070",
    sku: "GPU-4070",
    categoryId: "cat-1",
    categoryName: "Graphics Cards",
    quantity: 12,
    previousQuantity: 9,
    yesterdayQuantity: 9,
    hasYesterdaySnapshot: true,
    yesterdaySnapshotDate: "2026-09-20T00:00:00.000Z",
    price: 599.99,
    mrp: 599.99,
    status: "in-stock",
    minStock: 3,
    createdAt: "2026-09-20T00:00:00.000Z",
    updatedAt: "2026-09-21T00:00:00.000Z",
    paidAmount: 0,
  },
  {
    id: "product-2",
    name: "RTX 4060",
    sku: "GPU-4060",
    categoryId: "cat-1",
    categoryName: "Graphics Cards",
    quantity: 7,
    previousQuantity: 5,
    yesterdayQuantity: 0,
    hasYesterdaySnapshot: false,
    yesterdaySnapshotDate: null,
    price: 499.99,
    mrp: 499.99,
    status: "in-stock",
    minStock: 2,
    createdAt: "2026-09-20T00:00:00.000Z",
    updatedAt: "2026-09-21T00:00:00.000Z",
    paidAmount: 0,
  },
];

const currentStockMarkup = renderToStaticMarkup(
  <ProductTable
    products={products}
    page={1}
    pageSize={10}
    onPageChange={() => undefined}
    role="admin"
  />
);

const managerMarkup = renderToStaticMarkup(
  <ProductTable
    products={products}
    page={1}
    pageSize={10}
    onPageChange={() => undefined}
    role="manager"
  />
);

assert(/Current Stock/.test(currentStockMarkup), "Expected default table view to show the current stock column");
assert(!/Previous Stock/.test(currentStockMarkup), "Expected default table view to hide the previous stock column");
assert(/12/.test(currentStockMarkup), "Expected default table view to render the current stock quantity");
assert(!/9/.test(currentStockMarkup), "Expected default table view to hide the previous day stock quantity");
assert(/Months in Inventory/.test(currentStockMarkup), "Expected admin product table to show a months-in-inventory column");
assert(/Interest Charge/.test(currentStockMarkup), "Expected admin product table to show a per-product interest-charge column");
assert(/GST Charge/.test(currentStockMarkup), "Expected admin product table to show a per-product GST-charge column");
assert(/Total Cost/.test(currentStockMarkup), "Expected admin product table to show a total-cost column");
assert(/Months in Inventory/.test(managerMarkup), "Expected manager product table to show a months-in-inventory column");
assert(/Interest Charge/.test(managerMarkup), "Expected manager product table to show a per-product interest-charge column");
assert(/GST Charge/.test(managerMarkup), "Expected manager product table to show a per-product GST-charge column");
assert(/Total Cost/.test(managerMarkup), "Expected manager product table to show a total-cost column");

const previousStockMarkup = renderToStaticMarkup(
  <ProductTable
    products={products}
    page={1}
    pageSize={10}
    onPageChange={() => undefined}
    role="admin"
    stockView="previous"
  />
);

assert(/Previous Stock/.test(previousStockMarkup), "Expected previous stock view to show the previous stock column");
assert(!/Current Stock/.test(previousStockMarkup), "Expected previous stock view to hide the current stock column");
assert(/9/.test(previousStockMarkup), "Expected previous stock view to render the previous day stock quantity");
assert(!/>12</.test(previousStockMarkup), "Expected previous stock view to hide the current stock quantity");
assert(/RTX 4070/.test(previousStockMarkup), "Expected previous stock view to keep products that have yesterday snapshots");
assert(!/RTX 4060/.test(previousStockMarkup), "Expected previous stock view to exclude products with no yesterday snapshot");
assert(!/No file uploaded yesterday/.test(previousStockMarkup), "Expected previous stock view to hide products with no yesterday snapshot instead of rendering placeholders");
assert(/Months in Inventory/.test(currentStockMarkup), "Expected product table to show a months-in-inventory column");
assert(/Interest Charge/.test(currentStockMarkup), "Expected product table to show a per-product interest-charge column");
assert(/GST Charge/.test(currentStockMarkup), "Expected product table to show a per-product GST-charge column");
assert(/Total Cost/.test(currentStockMarkup), "Expected product table to show a total-cost column");
