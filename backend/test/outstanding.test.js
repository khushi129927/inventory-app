import test from "node:test";
import assert from "node:assert/strict";
import { createOutstandingService } from "../src/services/outstanding.js";

function createPrismaHarness() {
  const state = {
    salesPeople: [],
    clients: [],
    invoices: [],
  };

  const clone = (value) => structuredClone(value);

  const prisma = {
    $transaction: async (callback) => callback(prisma),
    salesPerson: {
      findUnique: async ({ where }) => {
        if (where.id) return clone(state.salesPeople.find((item) => item.id === where.id) ?? null);
        if (where.name) return clone(state.salesPeople.find((item) => item.name === where.name) ?? null);
        return null;
      },
      create: async ({ data }) => {
        const record = {
          id: data.id ?? `sp-${state.salesPeople.length + 1}`,
          name: data.name,
          phone: data.phone ?? null,
          notifyChannel: data.notifyChannel ?? "whatsapp",
          active: data.active ?? true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        state.salesPeople.push(record);
        return clone(record);
      },
      update: async ({ where, data }) => {
        const index = state.salesPeople.findIndex((item) => item.id === where.id);
        state.salesPeople[index] = {
          ...state.salesPeople[index],
          ...data,
          updatedAt: new Date(),
        };
        return clone(state.salesPeople[index]);
      },
      findMany: async () => clone([...state.salesPeople].sort((a, b) => a.name.localeCompare(b.name))),
    },
    client: {
      findUnique: async ({ where, include }) => {
        const client = where.id
          ? state.clients.find((item) => item.id === where.id)
          : state.clients.find((item) => item.name === where.name);
        if (!client) return null;
        if (!include) return clone(client);
        return clone({
          ...client,
          salesPerson: client.salesPersonId ? state.salesPeople.find((item) => item.id === client.salesPersonId) ?? null : null,
          outstandingInvoices: state.invoices
            .filter((item) => item.clientId === client.id)
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)),
        });
      },
      create: async ({ data }) => {
        const record = {
          id: data.id ?? `client-${state.clients.length + 1}`,
          name: data.name,
          salesPersonId: data.salesPersonId ?? null,
          creditDays: data.creditDays ?? 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        state.clients.push(record);
        return clone(record);
      },
      update: async ({ where, data }) => {
        const index = state.clients.findIndex((item) => item.id === where.id);
        state.clients[index] = {
          ...state.clients[index],
          ...data,
          updatedAt: new Date(),
        };
        return clone(state.clients[index]);
      },
      findMany: async ({ include } = {}) => clone(
        state.clients.map((client) => ({
          ...client,
          ...(include?.salesPerson
            ? { salesPerson: client.salesPersonId ? state.salesPeople.find((item) => item.id === client.salesPersonId) ?? null : null }
            : {}),
          ...(include?.outstandingInvoices
            ? { outstandingInvoices: state.invoices.filter((item) => item.clientId === client.id) }
            : {}),
        }))
      ),
    },
    outstandingInvoice: {
      findUnique: async ({ where }) => {
        if (where.id) {
          return clone(state.invoices.find((item) => item.id === where.id) ?? null);
        }
        if (where.clientId_invoiceNo) {
          const { clientId, invoiceNo } = where.clientId_invoiceNo;
          return clone(state.invoices.find((item) => item.clientId === clientId && item.invoiceNo === invoiceNo) ?? null);
        }
        return null;
      },
      findMany: async (args = {}) => {
        let invoices = [...state.invoices];
        if (args.where?.clientId) {
          invoices = invoices.filter((item) => item.clientId === args.where.clientId);
        }
        if (args.include?.client) {
          return clone(invoices.map((invoice) => ({
            ...invoice,
            client: state.clients.find((item) => item.id === invoice.clientId) ?? null,
          })));
        }
        return clone(invoices);
      },
      create: async ({ data }) => {
        const record = {
          id: data.id ?? `inv-${state.invoices.length + 1}`,
          clientId: data.clientId,
          invoiceNo: data.invoiceNo,
          invoiceDate: data.invoiceDate,
          amount: data.amount,
          paidAmount: data.paidAmount ?? 0,
          creditDays: data.creditDays ?? 0,
          dueDate: data.dueDate,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        state.invoices.push(record);
        return clone(record);
      },
      update: async ({ where, data }) => {
        const index = state.invoices.findIndex((item) => item.id === where.id);
        state.invoices[index] = {
          ...state.invoices[index],
          ...data,
          updatedAt: new Date(),
        };
        return clone(state.invoices[index]);
      },
    },
  };

  return { prisma, state };
}

test("outstanding import creates salespeople, clients, invoices, and computes due dates", async () => {
  const { prisma, state } = createPrismaHarness();
  const service = createOutstandingService(prisma, {
    now: () => new Date("2026-10-05T10:00:00.000Z"),
  });

  const result = await service.importRows([
    {
      "Client Name": "Acme Stores",
      Salesperson: "Ravi",
      "Salesperson Phone": "9876543210",
      "Invoice No": "INV-001",
      "Invoice Date": "2026-10-01T12:15:00.000Z",
      Amount: 1000,
      "Paid Amount": 200,
      "Credit Days": 10,
    },
  ]);

  assert.deepEqual(result, { created: 1, updated: 0, errors: [] });
  assert.equal(state.salesPeople.length, 1);
  assert.equal(state.salesPeople[0].phone, "+919876543210");
  assert.equal(state.clients[0].creditDays, 10);
  assert.equal(state.invoices[0].creditDays, 10);
  assert.equal(new Date(state.invoices[0].dueDate).toISOString(), "2026-10-10T18:30:00.000Z");
});

test("outstanding import reports bad rows and keeps valid rows", async () => {
  const { prisma, state } = createPrismaHarness();
  const service = createOutstandingService(prisma);

  const result = await service.importRows([
    {
      "Client Name": "Valid Client",
      Salesperson: "Neha",
      "Salesperson Phone": "+919999999999",
      "Invoice No": "INV-100",
      "Invoice Date": "2026-10-01T00:00:00.000Z",
      Amount: 500,
      "Paid Amount": 100,
    },
    {
      "Client Name": "",
      Salesperson: "Broken",
      "Salesperson Phone": "123",
      "Invoice No": "INV-101",
      "Invoice Date": "2026-10-01T00:00:00.000Z",
      Amount: 100,
    },
  ]);

  assert.equal(result.created, 1);
  assert.equal(result.updated, 0);
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].row, 2);
  assert.equal(state.invoices.length, 1);
});

test("outstanding import re-import updates existing invoice instead of duplicating", async () => {
  const { prisma, state } = createPrismaHarness();
  const service = createOutstandingService(prisma);

  await service.importRows([
    {
      "Client Name": "Beta Pvt Ltd",
      Salesperson: "Asha",
      "Salesperson Phone": "9876500000",
      "Invoice No": "INV-200",
      "Invoice Date": "2026-10-01T00:00:00.000Z",
      Amount: 900,
      "Paid Amount": 100,
      "Credit Days": 5,
    },
  ]);

  const result = await service.importRows([
    {
      "Client Name": "Beta Pvt Ltd",
      Salesperson: "Asha",
      "Salesperson Phone": "9876500001",
      "Invoice No": "INV-200",
      "Invoice Date": "2026-10-02T00:00:00.000Z",
      Amount: 1000,
      "Paid Amount": 250,
      "Credit Days": 7,
    },
  ]);

  assert.deepEqual(result, { created: 0, updated: 1, errors: [] });
  assert.equal(state.invoices.length, 1);
  assert.equal(state.salesPeople[0].phone, "+919876500001");
  assert.equal(state.invoices[0].amount, 1000);
  assert.equal(state.invoices[0].paidAmount, 250);
  assert.equal(state.invoices[0].creditDays, 7);
});

test("summary excludes fully paid invoices and computes overdue and due-soon totals", async () => {
  const { prisma, state } = createPrismaHarness();
  state.salesPeople.push({ id: "sp-1", name: "Ravi", phone: null, notifyChannel: "whatsapp", active: true, createdAt: new Date(), updatedAt: new Date() });
  state.clients.push(
    { id: "client-1", name: "Acme", salesPersonId: "sp-1", creditDays: 5, createdAt: new Date(), updatedAt: new Date() },
    { id: "client-2", name: "Bravo", salesPersonId: "sp-1", creditDays: 5, createdAt: new Date(), updatedAt: new Date() }
  );
  state.invoices.push(
    { id: "inv-1", clientId: "client-1", invoiceNo: "A", invoiceDate: new Date("2026-10-01T00:00:00.000Z"), amount: 1000, paidAmount: 200, creditDays: 0, dueDate: new Date("2026-10-03T18:30:00.000Z") },
    { id: "inv-2", clientId: "client-1", invoiceNo: "B", invoiceDate: new Date("2026-10-01T00:00:00.000Z"), amount: 500, paidAmount: 500, creditDays: 0, dueDate: new Date("2026-10-07T18:30:00.000Z") },
    { id: "inv-3", clientId: "client-2", invoiceNo: "C", invoiceDate: new Date("2026-10-01T00:00:00.000Z"), amount: 700, paidAmount: 100, creditDays: 0, dueDate: new Date("2026-10-10T18:30:00.000Z") }
  );

  const service = createOutstandingService(prisma, {
    now: () => new Date("2026-10-05T06:00:00.000Z"),
  });

  const summary = await service.summary();
  const clients = await service.listClients({});

  assert.deepEqual(summary, {
    totalOutstanding: 1400,
    overdueAmount: 800,
    dueIn7Days: 600,
    clientsWithDues: 2,
  });
  assert.equal(clients.length, 2);
  assert.equal(clients[0].clientName, "Acme");
  assert.equal(clients[0].overdueBalance, 800);
  assert.equal(clients[1].clientName, "Bravo");
});

test("updateClient applyToOpenInvoices recomputes due dates only for unpaid invoices", async () => {
  const { prisma, state } = createPrismaHarness();
  state.salesPeople.push({ id: "sp-1", name: "Ravi", phone: null, notifyChannel: "whatsapp", active: true, createdAt: new Date(), updatedAt: new Date() });
  state.clients.push({ id: "client-1", name: "Acme", salesPersonId: "sp-1", creditDays: 5, createdAt: new Date(), updatedAt: new Date() });
  state.invoices.push(
    { id: "inv-1", clientId: "client-1", invoiceNo: "A", invoiceDate: new Date("2026-10-01T00:00:00.000Z"), amount: 1000, paidAmount: 200, creditDays: 5, dueDate: new Date("2026-10-05T18:30:00.000Z") },
    { id: "inv-2", clientId: "client-1", invoiceNo: "B", invoiceDate: new Date("2026-10-01T00:00:00.000Z"), amount: 400, paidAmount: 400, creditDays: 5, dueDate: new Date("2026-10-05T18:30:00.000Z") }
  );

  const service = createOutstandingService(prisma);
  const updated = await service.updateClient("client-1", {
    creditDays: 15,
    applyToOpenInvoices: true,
  });

  assert.equal(updated.creditDays, 15);
  assert.equal(state.invoices[0].creditDays, 15);
  assert.equal(new Date(state.invoices[0].dueDate).toISOString(), "2026-10-15T18:30:00.000Z");
  assert.equal(state.invoices[1].creditDays, 5);
});

test("Asia/Kolkata day boundary uses the India calendar day when computing due dates", async () => {
  const { prisma, state } = createPrismaHarness();
  const service = createOutstandingService(prisma);

  await service.importRows([
    {
      "Client Name": "Boundary Client",
      Salesperson: "Ravi",
      "Salesperson Phone": "9876543210",
      "Invoice No": "INV-BOUNDARY",
      "Invoice Date": "2026-10-01T20:00:00.000Z",
      Amount: 100,
      "Paid Amount": 0,
      "Credit Days": 0,
    },
  ]);

  assert.equal(state.invoices.length, 1);
  assert.equal(new Date(state.invoices[0].dueDate).toISOString(), "2026-10-01T18:30:00.000Z");
});
