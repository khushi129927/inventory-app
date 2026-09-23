import test from "node:test";
import assert from "node:assert/strict";
import { createInventoryService } from "../src/services/inventory.js";

test("inventory service maps branch ids to names", async () => {
  const database = {
    async query(text) {
      if (text.includes("from products")) {
        return {
          rows: [
            {
              id: "prod-1",
              name: "Wireless Mouse MX",
              sku: "WMX-2024",
              serialNumber: "WMX-2024",
              modelNumber: "MX-2024",
              categoryId: "cat-electronics",
              categoryName: "Electronics",
              quantity: 120,
              price: 49.99,
              status: "in-stock",
              image: null,
              description: "Ergonomic wireless mouse",
              minStock: 20,
              monthlyInterest: 5,
              previousQuantity: 120,
              shipping: null,
              installation: null,
              createdAt: "2026-09-17T00:00:00.000Z",
              updatedAt: "2026-09-17T00:00:00.000Z",
              branches: ["Downtown", "Airport"],
            },
          ],
        };
      }
      return { rows: [] };
    },
  };

  const service = createInventoryService(database);
  const products = await service.listProducts();

  assert.deepEqual(products[0].branches, ["Downtown", "Airport"]);
});
