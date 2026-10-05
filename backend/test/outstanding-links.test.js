import test from "node:test";
import assert from "node:assert/strict";
import { createOutstandingLinkService } from "../src/services/outstanding-links.js";

function createHarness() {
  const state = {
    links: [],
    salesPeople: [
      { id: "sp-1", name: "Ravi Kumar" },
      { id: "sp-2", name: "Neha Sharma" },
    ],
    clients: [
      {
        id: "client-1",
        name: "Acme Stores",
        salesPersonId: "sp-1",
        creditDays: 30,
        salesPerson: { name: "Ravi Kumar", phone: "+919876543210" },
        outstandingInvoices: [
          { invoiceNo: "INV-001", amount: 1000, paidAmount: 100, dueDate: new Date("2026-10-03T18:30:00.000Z") },
          { invoiceNo: "INV-002", amount: 500, paidAmount: 500, dueDate: new Date("2026-10-04T18:30:00.000Z") },
        ],
      },
      {
        id: "client-2",
        name: "Bravo Traders",
        salesPersonId: "sp-1",
        creditDays: 15,
        salesPerson: { name: "Ravi Kumar", phone: "+919876543210" },
        outstandingInvoices: [
          { invoiceNo: "INV-003", amount: 700, paidAmount: 200, dueDate: new Date("2026-10-10T18:30:00.000Z") },
        ],
      },
      {
        id: "client-3",
        name: "City Mart",
        salesPersonId: "sp-2",
        creditDays: 10,
        salesPerson: { name: "Neha Sharma", phone: "+919999999999" },
        outstandingInvoices: [
          { invoiceNo: "INV-004", amount: 900, paidAmount: 0, dueDate: new Date("2026-10-05T18:30:00.000Z") },
        ],
      },
    ],
  };

  const prisma = {
    outstandingLink: {
      create: async ({ data }) => {
        const record = {
          id: `link-${state.links.length + 1}`,
          tokenHash: data.tokenHash,
          salesPersonId: data.salesPersonId,
          clientIds: data.clientIds,
          expiresAt: data.expiresAt,
          revokedAt: null,
          createdAt: new Date(),
          lastViewedAt: null,
          viewCount: 0,
        };
        state.links.push(record);
        return structuredClone(record);
      },
      findUnique: async ({ where }) => {
        if (where.tokenHash) {
          return structuredClone(state.links.find((item) => item.tokenHash === where.tokenHash) ?? null);
        }
        return structuredClone(state.links.find((item) => item.id === where.id) ?? null);
      },
      update: async ({ where, data }) => {
        const index = state.links.findIndex((item) => item.id === where.id);
        state.links[index] = { ...state.links[index], ...data };
        return structuredClone(state.links[index]);
      },
      updateMany: async ({ where, data }) => {
        let count = 0;
        state.links = state.links.map((link) => {
          const matches =
            link.salesPersonId === where.salesPersonId &&
            link.revokedAt === where.revokedAt &&
            new Date(link.expiresAt) > new Date(where.expiresAt.gt);
          if (!matches) {
            return link;
          }
          count += 1;
          return { ...link, ...data };
        });
        return { count };
      },
    },
    client: {
      findMany: async ({ where }) => structuredClone(
        state.clients.filter((client) => where.id.in.includes(client.id))
      ),
    },
  };

  return { prisma, state };
}

test("createLink stores only a token hash and two calls return different tokens", async () => {
  const { prisma, state } = createHarness();
  const service = createOutstandingLinkService(prisma, {
    publicAppUrl: "https://inventory.example.com",
    now: () => new Date("2026-10-05T10:00:00.000Z"),
  });

  const first = await service.createLink({ salesPersonId: "sp-1", clientIds: ["client-1"] });
  const second = await service.createLink({ salesPersonId: "sp-1", clientIds: ["client-1"] });

  assert.equal(state.links.length, 2);
  assert.notEqual(first.url, second.url);
  assert.match(first.url, /^https:\/\/inventory\.example\.com\/o\/[A-Za-z0-9_-]{43}$/);
  assert.notEqual(state.links[0].tokenHash, first.url.split("/").pop());
  assert.notEqual(state.links[1].tokenHash, second.url.split("/").pop());
});

test("getPublicView returns only covered clients, open invoices, and public-safe fields", async () => {
  const { prisma, state } = createHarness();
  const service = createOutstandingLinkService(prisma, {
    publicAppUrl: "https://inventory.example.com",
    now: () => new Date("2026-10-05T06:00:00.000Z"),
  });

  const created = await service.createLink({ salesPersonId: "sp-1", clientIds: ["client-1", "client-2"] });
  const token = created.url.split("/").pop();
  const view = await service.getPublicView(token);

  assert.equal(view.salespersonFirstName, "Ravi");
  assert.equal(view.asOf, "2026-10-04");
  assert.equal(view.clients.length, 2);
  assert.equal(view.clients[0].clientName, "Acme Stores");
  assert.equal(view.clients[0].invoices.length, 1);
  assert.equal(view.clients[0].invoices[0].invoiceNo, "INV-001");
  assert.equal(view.clients[0].invoices[0].balance, 900);
  assert.equal(view.clients.some((client) => client.clientName === "City Mart"), false);
  assert.equal(JSON.stringify(view).includes("phone"), false);
  assert.equal(JSON.stringify(view).includes("client-1"), false);
  assert.equal(JSON.stringify(view).includes("salesPersonId"), false);
  assert.equal(JSON.stringify(view).includes("INV-002"), false);
});

test("resolveLink updates viewCount and lastViewedAt", async () => {
  const { prisma, state } = createHarness();
  let currentTime = new Date("2026-10-05T10:00:00.000Z");
  const service = createOutstandingLinkService(prisma, {
    publicAppUrl: "https://inventory.example.com",
    now: () => currentTime,
  });

  const created = await service.createLink({ salesPersonId: "sp-1", clientIds: ["client-1"] });
  const token = created.url.split("/").pop();
  currentTime = new Date("2026-10-05T12:00:00.000Z");

  const resolved = await service.resolveLink(token);

  assert.equal(resolved.viewCount, 1);
  assert.equal(new Date(resolved.lastViewedAt).toISOString(), "2026-10-05T12:00:00.000Z");
  assert.equal(state.links[0].viewCount, 1);
});

test("unknown, expired, and revoked links all resolve to null", async () => {
  const { prisma, state } = createHarness();
  let currentTime = new Date("2026-10-05T10:00:00.000Z");
  const service = createOutstandingLinkService(prisma, {
    publicAppUrl: "https://inventory.example.com",
    now: () => currentTime,
  });

  const created = await service.createLink({ salesPersonId: "sp-1", clientIds: ["client-1"], ttlDays: 1 });
  const token = created.url.split("/").pop();

  assert.equal(await service.getPublicView("A".repeat(43)), null);

  currentTime = new Date("2026-10-07T10:00:00.000Z");
  assert.equal(await service.getPublicView(token), null);

  currentTime = new Date("2026-10-05T10:00:00.000Z");
  state.links[0].revokedAt = currentTime;
  assert.equal(await service.getPublicView(token), null);
});

test("revokeLinks revokes active links for one salesperson only", async () => {
  const { prisma, state } = createHarness();
  const current = new Date("2026-10-05T10:00:00.000Z");
  const service = createOutstandingLinkService(prisma, {
    publicAppUrl: "https://inventory.example.com",
    now: () => current,
  });

  await service.createLink({ salesPersonId: "sp-1", clientIds: ["client-1"] });
  await service.createLink({ salesPersonId: "sp-2", clientIds: ["client-3"] });

  const result = await service.revokeLinks("sp-1");

  assert.equal(result.revoked, 1);
  assert.equal(state.links[0].revokedAt?.toISOString(), current.toISOString());
  assert.equal(state.links[1].revokedAt, null);
});

test("createLink throws clearly when PUBLIC_APP_URL is missing in production", async () => {
  const { prisma } = createHarness();
  const originalNodeEnv = process.env.NODE_ENV;
  const originalPublicAppUrl = process.env.PUBLIC_APP_URL;
  process.env.NODE_ENV = "production";
  delete process.env.PUBLIC_APP_URL;

  try {
    const service = createOutstandingLinkService(prisma, {
      now: () => new Date("2026-10-05T10:00:00.000Z"),
    });

    await assert.rejects(
      () => service.createLink({ salesPersonId: "sp-1", clientIds: ["client-1"] }),
      /PUBLIC_APP_URL is required/
    );
  } finally {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalPublicAppUrl === undefined) {
      delete process.env.PUBLIC_APP_URL;
    } else {
      process.env.PUBLIC_APP_URL = originalPublicAppUrl;
    }
  }
});
