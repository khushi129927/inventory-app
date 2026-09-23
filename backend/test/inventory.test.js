import test from "node:test";
import assert from "node:assert/strict";
import { createInventoryService } from "../src/services/inventory.js";

test("inventory service queries products, categories, and branches", async () => {
  const queries = [];
  const database = {
    async query(text) {
      queries.push(text);
      if (text.includes("from products")) {
        return { rows: [{ id: "prod-1" }] };
      }
      if (text.includes("from categories")) {
        return { rows: [{ id: "cat-1" }] };
      }
      if (text.includes("from branches")) {
        return { rows: [{ id: "branch-1" }] };
      }
      return { rows: [] };
    },
  };

  const service = createInventoryService(database);

  assert.deepEqual(await service.listProducts(), [{ id: "prod-1", yesterdayQuantity: 0, hasYesterdaySnapshot: false, yesterdaySnapshotDate: null }]);
  assert.deepEqual(await service.listCategories(), [{ id: "cat-1" }]);
  assert.deepEqual(await service.listBranches(), [{ id: "branch-1" }]);
  assert.equal(queries.length, 3);
});

test("inventory service imports rows from the Excel upload dialog", async () => {
  const operations = [];
  const prisma = {
    product: {
      findMany: async () => [],
      findUnique: async ({ where }) => ({ id: "product-1", sku: where.sku, updatedAt: new Date() }),
      upsert: async ({ where, create, update }) => {
        operations.push({ type: "upsert", where, create, update });
        return { id: "product-1", sku: where.sku, updatedAt: new Date() };
      },
    },
    branch: {
      findMany: async () => [],
    },
    category: {
      findUnique: async ({ where }) => {
        operations.push({ type: "findCategory", where });
        return null;
      },
      create: async ({ data }) => {
        operations.push({ type: "createCategory", data });
        return { id: "category-1", ...data };
      },
    },
  };

  const service = createInventoryService(prisma);
  const result = await service.importProducts([
    {
      name: "Lenovo ThinkPad T14 Gen 5",
      sku: "LAP-LEN-T14G5",
      category: "Laptops",
      quantity: 10,
      price: 89999,
      minStock: 2,
      monthlyInterest: 0,
      description: "Business laptop",
      image: "",
      availableBranches: ["Head Office", "Branch 4"],
    },
  ]);

  assert.deepEqual(result, { created: 0, updated: 1, errors: [] });
  assert.equal(operations[0].type, "findCategory");
  assert.equal(operations[1].type, "createCategory");
  assert.equal(operations[2].type, "upsert");
  assert.equal(operations[2].create.categoryId, "category-1");
});

test("inventory service import stores previous quantity before replacing stock for an existing sku", async () => {
  const operations = [];
  const prisma = {
    product: {
      findMany: async () => [],
      findUnique: async ({ where }) => {
        if (where?.sku === "LAP-LEN-T14G5") {
          return {
            id: "product-1",
            sku: "LAP-LEN-T14G5",
            quantity: 6,
            updatedAt: new Date("2026-09-20T00:00:00.000Z"),
          };
        }
        return null;
      },
      upsert: async ({ where, create, update }) => {
        operations.push({ type: "upsert", where, create, update });
        return { id: "product-1", sku: where.sku, updatedAt: new Date() };
      },
    },
    branch: {
      findMany: async () => [],
    },
    category: {
      findUnique: async () => ({ id: "category-1", name: "Laptops" }),
      create: async ({ data }) => data,
    },
  };

  const service = createInventoryService(prisma);
  await service.importProducts([
    {
      name: "Lenovo ThinkPad T14 Gen 5",
      sku: "LAP-LEN-T14G5",
      category: "Laptops",
      quantity: 14,
      price: 89999,
      minStock: 2,
      monthlyInterest: 0,
      description: "Business laptop",
      image: "",
      availableBranches: ["Head Office"],
    },
  ]);

  assert.equal(operations[0].type, "upsert");
  assert.equal(operations[0].update.quantity, 14);
  assert.equal(operations[0].update.previousQuantity, 6);
  assert.equal(operations[0].create.previousQuantity, 14);
});

test("inventory service exposes yesterday upload quantities and marks products with no yesterday upload", async () => {
  const yesterdaySnapshot = new Date("2026-09-20T09:15:00.000Z");
  const prisma = {
    product: {
      findMany: async () => [
        {
          id: "product-1",
          name: "RTX 4070",
          sku: "GPU-4070",
          quantity: 12,
          previousQuantity: 9,
          price: 599.99,
          status: "in-stock",
          minStock: 3,
          monthlyInterest: 0,
          paidAmount: 0,
          createdAt: new Date("2026-09-18T00:00:00.000Z"),
          updatedAt: new Date("2026-09-21T00:00:00.000Z"),
          category: { name: "Graphics Cards" },
          branches: [],
          stockSnapshots: [
            {
              snapshotDate: yesterdaySnapshot,
              quantity: 9,
            },
          ],
        },
        {
          id: "product-2",
          name: "RTX 4060",
          sku: "GPU-4060",
          quantity: 7,
          previousQuantity: 7,
          price: 399.99,
          status: "in-stock",
          minStock: 2,
          monthlyInterest: 0,
          paidAmount: 0,
          createdAt: new Date("2026-09-18T00:00:00.000Z"),
          updatedAt: new Date("2026-09-21T00:00:00.000Z"),
          category: { name: "Graphics Cards" },
          branches: [],
          stockSnapshots: [],
        },
      ],
    },
  };

  const service = createInventoryService(prisma, {
    now: () => new Date("2026-09-21T10:00:00.000Z"),
  });

  const products = await service.listProducts();

  assert.equal(products[0].yesterdayQuantity, 9);
  assert.equal(products[0].hasYesterdaySnapshot, true);
  assert.equal(products[0].yesterdaySnapshotDate, yesterdaySnapshot.toISOString());
  assert.equal(products[1].yesterdayQuantity, 0);
  assert.equal(products[1].hasYesterdaySnapshot, false);
  assert.equal(products[1].yesterdaySnapshotDate, null);
});

test("inventory service persists editable stock fields and records a stock snapshot on update", async () => {
  const operations = [];
  const prisma = {
    product: {
      update: async ({ where, data }) => {
        operations.push({ type: "update", where, data });
        return { id: where.id, ...data, categoryId: "cat-1" };
      },
    },
    productStockSnapshot: {
      upsert: async ({ where, update, create }) => {
        operations.push({ type: "snapshot", where, update, create });
        return { id: "snapshot-1", ...create, ...update };
      },
    },
  };

  const service = createInventoryService(prisma, {
    now: () => new Date("2026-09-23T08:00:00.000Z"),
  });

  const updated = await service.updateProduct("product-1", {
    name: "Updated Mouse",
    sku: "MOUSE-1",
    quantity: "15",
    price: "2499.5",
    minStock: "4",
    monthlyInterest: "1.5",
    previousQuantity: "12",
    paidAmount: "1000",
    shipping: "50",
    installation: "25",
    status: "low-stock",
  });

  assert.equal(operations[0].type, "update");
  assert.equal(operations[0].data.quantity, 15);
  assert.equal(operations[0].data.price, 2499.5);
  assert.equal(operations[0].data.status, "low_stock");
  assert.equal(operations[1].type, "snapshot");
  assert.equal(operations[1].update.quantity, 15);
  assert.equal(updated.name, "Updated Mouse");
});
