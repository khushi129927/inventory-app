import test from "node:test";
import assert from "node:assert/strict";
import { createInventoryService } from "../src/services/inventory.js";

test("createOrderRequest persists a pending status for new order requests", async () => {
  let capturedArgs;
  const prisma = {
    orderRequest: {
      create: async (args) => {
        capturedArgs = args;

        return {
          id: "order-1",
          customerName: args.data.customerName,
          customerEmail: args.data.customerEmail,
          status: args.data.status,
          createdAt: new Date("2026-09-21T00:00:00.000Z"),
          updatedAt: new Date("2026-09-21T00:00:00.000Z"),
          items: args.include?.items
            ? args.data.items.create.map((item, index) => ({ id: `item-${index + 1}`, ...item }))
            : undefined,
        };
      },
    },
  };

  const service = createInventoryService(prisma);
  const order = await service.createOrderRequest({
    customerName: "PC Builder",
    customerEmail: "builder@inventory-app.local",
    items: [{ productId: "prod-1", productName: "Ryzen 7 7800X3D", quantity: 1 }],
  });

  assert.equal(capturedArgs.data.status, "pending", "expected createOrderRequest to set a default pending status");
  assert.equal(order.status, "pending");
});

test("createOrderRequest returns the created order with items included for frontend consumption", async () => {
  const prisma = {
    product: {
      findMany: async ({ where }) => where.id.in.map((id) => ({ id })),
    },
    orderRequest: {
      create: async (args) => ({
        id: "order-1",
        customerName: args.data.customerName,
        customerEmail: args.data.customerEmail,
        status: args.data.status,
        createdAt: new Date("2026-09-21T00:00:00.000Z"),
        updatedAt: new Date("2026-09-21T00:00:00.000Z"),
        items: args.include?.items
          ? args.data.items.create.map((item, index) => ({ id: `item-${index + 1}`, ...item }))
          : undefined,
      }),
    },
  };

  const service = createInventoryService(prisma);
  const order = await service.createOrderRequest({
    customerName: "PC Builder",
    customerEmail: "builder@inventory-app.local",
    items: [
      { productId: "prod-1", productName: "Ryzen 7 7800X3D", quantity: 1 },
      { productId: "prod-2", productName: "RTX 4070 Super", quantity: 1 },
    ],
  });

  assert.equal(order.id, "order-1");
  assert.equal(order.status, "pending");
  assert.equal(order.items?.length, 2, "expected created order response to include nested items");
  assert.equal(order.items?.[0].productName, "Ryzen 7 7800X3D");
});

test("createOrderRequest rejects stale builder selections when a product no longer exists", async () => {
  const prisma = {
    product: {
      findMany: async () => [{ id: "prod-1" }],
    },
    orderRequest: {
      create: async () => {
        throw new Error("orderRequest.create should not be called when products are missing");
      },
    },
  };

  const service = createInventoryService(prisma);

  await assert.rejects(
    () =>
      service.createOrderRequest({
        customerName: "PC Builder",
        customerEmail: "builder@inventory-app.local",
        items: [
          { productId: "prod-1", productName: "Ryzen 7 7800X3D", quantity: 1 },
          { productId: "missing-prod", productName: "Missing GPU", quantity: 1 },
        ],
      }),
    /One or more selected products are no longer available/
  );
});
