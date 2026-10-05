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

test("inventory service persists editable stock fields, logs quantity changes once, and records a stock snapshot on update", async () => {
  const operations = [];
  const prisma = {
    $transaction: async (callback) =>
      callback({
        product: {
          findUnique: async ({ where }) => ({
            id: where.id,
            name: "Original Mouse",
            sku: "MOUSE-1",
            quantity: 12,
            minStock: 4,
          }),
          update: async ({ where, data }) => {
            operations.push({ type: "update", where, data });
            return { id: where.id, ...data, categoryId: "cat-1" };
          },
        },
        stockMovement: {
          create: async ({ data }) => {
            operations.push({ type: "movement", data });
            return { id: "movement-1", ...data };
          },
        },
        productStockSnapshot: {
          upsert: async ({ where, update, create }) => {
            operations.push({ type: "snapshot", where, update, create });
            return { id: "snapshot-1", ...create, ...update };
          },
        },
      }),
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
  assert.equal(operations[0].data.status, "in_stock");
  assert.equal(operations[0].data.previousQuantity, 12);
  assert.equal(operations[1].type, "movement");
  assert.equal(operations[1].data.type, "adjustment");
  assert.equal(operations[1].data.quantity, 3);
  assert.equal(operations[1].data.reason, "Edited on Stock page");
  assert.equal(operations[2].type, "snapshot");
  assert.equal(operations[2].update.quantity, 15);
  assert.equal(updated.name, "Updated Mouse");
});

test("inventory service lists movements ordered by newest first and ignores type=null", async () => {
  const prisma = {
    stockMovement: {
      findMany: async (args) => args,
    },
  };
  const service = createInventoryService(prisma);

  const allMovements = await service.listMovements({ type: "null" });
  const filteredMovements = await service.listMovements({ type: "transfer", limit: "25" });

  assert.equal(allMovements.where, undefined);
  assert.deepEqual(allMovements.orderBy, { createdAt: "desc" });
  assert.equal(allMovements.take, 500);
  assert.deepEqual(filteredMovements.where, { type: "transfer" });
  assert.equal(filteredMovements.take, 25);
});

test("inventory service records stock-in exactly once", async () => {
  const operations = [];
  const prisma = {
    $transaction: async (callback) =>
      callback({
        $queryRaw: async () => [
          {
            id: "product-1",
            name: "RTX 4070",
            sku: "GPU-4070",
            quantity: 5,
            minStock: 2,
          },
        ],
        product: {
          update: async ({ data }) => {
            operations.push({ type: "update", data });
            return data;
          },
        },
        stockMovement: {
          create: async ({ data }) => {
            operations.push({ type: "movement", data });
            return { id: "movement-1", ...data };
          },
        },
        activityItem: {
          create: async ({ data }) => {
            operations.push({ type: "activity", data });
            return { id: "activity-1", ...data };
          },
        },
      }),
  };
  const service = createInventoryService(prisma, {
    now: () => new Date("2026-09-23T08:00:00.000Z"),
  });

  const result = await service.recordMovement({
    productId: "product-1",
    type: "in",
    quantity: 10,
    reason: "Goods received",
    userId: "Manager",
  });

  assert.equal(operations[0].data.quantity, 15);
  assert.equal(operations[1].data.previousQuantity, 5);
  assert.equal(operations[1].data.newQuantity, 15);
  assert.equal(operations[1].data.quantity, 10);
  assert.equal(result.newQuantity, 15);
  assert.equal(operations[2].data.type, "stock_in");
});

test("inventory service records stock-out and rejects negative stock", async () => {
  const operations = [];
  const prisma = {
    $transaction: async (callback) =>
      callback({
        $queryRaw: async () => [
          {
            id: "product-1",
            name: "RTX 4070",
            sku: "GPU-4070",
            quantity: 5,
            minStock: 2,
          },
        ],
        product: {
          update: async ({ data }) => {
            operations.push({ type: "update", data });
            return data;
          },
        },
        stockMovement: {
          create: async ({ data }) => {
            operations.push({ type: "movement", data });
            return { id: "movement-1", ...data };
          },
        },
        activityItem: {
          create: async ({ data }) => {
            operations.push({ type: "activity", data });
            return { id: "activity-1", ...data };
          },
        },
      }),
  };
  const service = createInventoryService(prisma);

  const result = await service.recordMovement({
    productId: "product-1",
    type: "out",
    quantity: 3,
    reason: "Shipment",
    userId: "Manager",
  });

  assert.equal(operations[0].data.quantity, 2);
  assert.equal(operations[1].data.quantity, 3);
  assert.equal(result.newQuantity, 2);

  await assert.rejects(
    () =>
      service.recordMovement({
        productId: "product-1",
        type: "out",
        quantity: 6,
        reason: "Shipment",
        userId: "Manager",
      }),
    /Insufficient stock/
  );
});

test("inventory service records adjustment as set-to-counted and stores signed delta", async () => {
  const operations = [];
  const prisma = {
    $transaction: async (callback) =>
      callback({
        $queryRaw: async () => [
          {
            id: "product-1",
            name: "RTX 4070",
            sku: "GPU-4070",
            quantity: 12,
            minStock: 2,
          },
        ],
        product: {
          update: async ({ data }) => {
            operations.push({ type: "update", data });
            return data;
          },
        },
        stockMovement: {
          create: async ({ data }) => {
            operations.push({ type: "movement", data });
            return { id: "movement-1", ...data };
          },
        },
        activityItem: {
          create: async ({ data }) => {
            operations.push({ type: "activity", data });
            return { id: "activity-1", ...data };
          },
        },
      }),
  };
  const service = createInventoryService(prisma);

  const result = await service.recordMovement({
    productId: "product-1",
    type: "adjustment",
    quantity: 20,
    reason: "Cycle count",
    userId: "Manager",
  });

  assert.equal(operations[0].data.quantity, 20);
  assert.equal(operations[1].data.quantity, 8);
  assert.equal(operations[1].data.previousQuantity, 12);
  assert.equal(operations[1].data.newQuantity, 20);
  assert.equal(result.quantity, 8);
  assert.equal(operations[2].data.type, "stock_adjusted");
  assert.match(operations[2].data.message, /from 12 to 20 \(\+8\)/);

  await assert.rejects(
    () =>
      service.recordMovement({
        productId: "product-1",
        type: "adjustment",
        quantity: 12,
        reason: "Cycle count",
        userId: "Manager",
      }),
    /No change/
  );
});

test("inventory service records transfer without changing stock", async () => {
  const operations = [];
  const prisma = {
    $transaction: async (callback) =>
      callback({
        $queryRaw: async () => [
          {
            id: "product-1",
            name: "RTX 4070",
            sku: "GPU-4070",
            quantity: 20,
            minStock: 2,
          },
        ],
        product: {
          update: async ({ data }) => {
            operations.push({ type: "update", data });
            return data;
          },
        },
        stockMovement: {
          create: async ({ data }) => {
            operations.push({ type: "movement", data });
            return { id: "movement-1", ...data };
          },
        },
        activityItem: {
          create: async ({ data }) => {
            operations.push({ type: "activity", data });
            return { id: "activity-1", ...data };
          },
        },
      }),
  };
  const service = createInventoryService(prisma);

  const result = await service.recordMovement({
    productId: "product-1",
    type: "transfer",
    quantity: 2,
    reason: "Branch transfer",
    location: "Surat HQ -> Branch 2",
    userId: "Manager",
  });

  assert.equal(operations.find((entry) => entry.type === "update"), undefined);
  assert.equal(operations[0].data.type, "transfer");
  assert.equal(operations[0].data.previousQuantity, 20);
  assert.equal(operations[0].data.newQuantity, 20);
  assert.equal(result.newQuantity, 20);
  assert.equal(operations[1].data.type, "stock_transferred");
});
