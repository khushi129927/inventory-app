import test from "node:test";
import assert from "node:assert/strict";
import { createOutstandingNotifier } from "../src/services/outstanding-notifier.js";

function createHarness() {
  const state = {
    salesPeople: [
      { id: "sp-sms", name: "Ravi Kumar", phone: "+919876543210", notifyChannel: "sms", active: true },
      { id: "sp-wa", name: "Neha Sharma", phone: "+919876543211", notifyChannel: "whatsapp", active: true },
      { id: "sp-both", name: "Asha Gupta", phone: "+919876543212", notifyChannel: "both", active: true },
      { id: "sp-none", name: "No Notify", phone: "+919876543213", notifyChannel: "none", active: true },
      { id: "sp-missing", name: "No Phone", phone: null, notifyChannel: "sms", active: true },
      { id: "sp-inactive", name: "Inactive", phone: "+919876543214", notifyChannel: "sms", active: false },
    ],
    clients: [
      { id: "client-1", name: "Acme", salesPersonId: "sp-sms", creditDays: 30 },
      { id: "client-2", name: "Bravo", salesPersonId: "sp-sms", creditDays: 30 },
      { id: "client-3", name: "City", salesPersonId: "sp-wa", creditDays: 30 },
      { id: "client-4", name: "Delta", salesPersonId: "sp-both", creditDays: 30 },
      { id: "client-5", name: "Echo", salesPersonId: "sp-missing", creditDays: 30 },
    ],
    invoices: [
      { id: "inv-1", clientId: "client-1", amount: 1000, paidAmount: 0, dueDate: new Date("2026-10-04T18:30:00.000Z") },
      { id: "inv-2", clientId: "client-2", amount: 500, paidAmount: 100, dueDate: new Date("2026-10-04T18:30:00.000Z") },
      { id: "inv-3", clientId: "client-3", amount: 700, paidAmount: 0, dueDate: new Date("2026-10-04T18:30:00.000Z") },
      { id: "inv-4", clientId: "client-4", amount: 900, paidAmount: 0, dueDate: new Date("2026-10-04T18:30:00.000Z") },
      { id: "inv-5", clientId: "client-5", amount: 300, paidAmount: 0, dueDate: new Date("2026-10-04T18:30:00.000Z") },
      { id: "inv-6", clientId: "client-1", amount: 200, paidAmount: 200, dueDate: new Date("2026-10-04T18:30:00.000Z") },
      { id: "inv-7", clientId: "client-1", amount: 600, paidAmount: 0, dueDate: new Date("2026-10-06T18:30:00.000Z") },
    ],
    logs: [],
  };

  const prisma = {
    salesPerson: {
      findMany: async ({ where, include }) => state.salesPeople
        .filter((salesPerson) => salesPerson.active === where.active && salesPerson.notifyChannel !== where.notifyChannel.not)
        .map((salesPerson) => ({
          ...salesPerson,
          ...(include?.clients
            ? {
                clients: state.clients
                  .filter((client) => client.salesPersonId === salesPerson.id)
                  .map((client) => ({
                    ...client,
                    outstandingInvoices: state.invoices.filter((invoice) => invoice.clientId === client.id),
                  })),
              }
            : {}),
        })),
      findUnique: async ({ where, include }) => {
        const salesPerson = state.salesPeople.find((item) => item.id === where.id);
        if (!salesPerson) return null;
        return {
          ...salesPerson,
          ...(include?.clients
            ? {
                clients: state.clients
                  .filter((client) => client.salesPersonId === salesPerson.id)
                  .map((client) => ({
                    ...client,
                    outstandingInvoices: state.invoices.filter((invoice) => invoice.clientId === client.id),
                  })),
              }
            : {}),
        };
      },
    },
    notificationLog: {
      create: async ({ data }) => {
        if (data.kind === "due_today") {
          const duplicate = state.logs.find((log) =>
            log.salesPersonId === data.salesPersonId &&
            log.channel === data.channel &&
            log.kind === data.kind &&
            new Date(log.scheduledFor).getTime() === new Date(data.scheduledFor).getTime()
          );
          if (duplicate) {
            const error = new Error("Unique constraint failed");
            error.code = "P2002";
            throw error;
          }
        }
        const record = {
          id: `log-${state.logs.length + 1}`,
          createdAt: new Date(),
          ...data,
        };
        state.logs.push(record);
        return structuredClone(record);
      },
      update: async ({ where, data }) => {
        const index = state.logs.findIndex((item) => item.id === where.id);
        state.logs[index] = { ...state.logs[index], ...data };
        return structuredClone(state.logs[index]);
      },
      findMany: async ({ where } = {}) => state.logs.filter((log) => {
        if (where?.salesPersonId && log.salesPersonId !== where.salesPersonId) return false;
        if (where?.kind && log.kind !== where.kind) return false;
        if (where?.scheduledFor?.gte && new Date(log.scheduledFor) < new Date(where.scheduledFor.gte)) return false;
        return true;
      }).map((log) => structuredClone(log)),
      count: async ({ where } = {}) => state.logs.filter((log) => {
        if (where?.salesPersonId && log.salesPersonId !== where.salesPersonId) return false;
        if (where?.status && log.status !== where.status) return false;
        return true;
      }).length,
    },
  };

  const linkCalls = [];
  const linkService = {
    createLink: async ({ salesPersonId, clientIds }) => {
      const linkId = `link-${linkCalls.length + 1}`;
      const url = `https://inventory.example.com/o/token-${linkCalls.length + 1}`;
      linkCalls.push({ salesPersonId, clientIds, linkId, url });
      return { linkId, url, expiresAt: new Date("2026-10-11T10:00:00.000Z") };
    },
  };

  return { state, prisma, linkService, linkCalls };
}

test("runDueToday sends one grouped message per salesperson per channel and never twice for the same day", async () => {
  const { state, prisma, linkService, linkCalls } = createHarness();
  const sends = [];
  const notifier = createOutstandingNotifier({
    prisma,
    provider: {
      mode: "log",
      send: async (payload) => {
        sends.push(payload);
        return { providerMessageId: `msg-${sends.length}`, status: "dry_run" };
      },
    },
    linkService,
    now: () => new Date("2026-10-05T06:00:00.000Z"),
  });

  await notifier.runDueToday();
  await notifier.runDueToday();

  assert.equal(sends.length, 4);
  assert.equal(linkCalls.length, 8);
  assert.equal(new Set(linkCalls.map((call) => call.url)).size, 8);
  assert.deepEqual(sends.map((item) => item.channel).sort(), ["sms", "sms", "whatsapp", "whatsapp"]);
  assert.equal(state.logs.filter((log) => log.kind === "due_today").length, 5);
});

test("runDueToday sends nothing when no invoices are due today", async () => {
  const { state, prisma, linkService } = createHarness();
  state.invoices = state.invoices.map((invoice) => ({ ...invoice, dueDate: new Date("2026-10-06T18:30:00.000Z") }));
  const sends = [];
  const notifier = createOutstandingNotifier({
    prisma,
    provider: {
      mode: "log",
      send: async (payload) => {
        sends.push(payload);
        return { providerMessageId: `msg-${sends.length}`, status: "dry_run" };
      },
    },
    linkService,
    now: () => new Date("2026-10-05T06:00:00.000Z"),
  });

  await notifier.runDueToday();

  assert.equal(sends.length, 0);
  assert.equal(state.logs.length, 0);
});

test("runDueToday skips salespeople without a phone and logs the skip", async () => {
  const { state, prisma, linkService } = createHarness();
  const notifier = createOutstandingNotifier({
    prisma,
    provider: {
      mode: "log",
      send: async () => ({ providerMessageId: "msg", status: "dry_run" }),
    },
    linkService,
    now: () => new Date("2026-10-05T06:00:00.000Z"),
  });

  await notifier.runDueToday();

  const skipped = state.logs.find((log) => log.salesPersonId === "sp-missing");
  assert.equal(skipped.status, "skipped");
  assert.match(skipped.error, /phone is missing/);
});

test("runDueToday retries provider failures, marks failed, and does not throw", async () => {
  const { state, prisma, linkService } = createHarness();
  const notifier = createOutstandingNotifier({
    prisma,
    provider: {
      mode: "twilio",
      send: async ({ to }) => {
        if (to === "+919876543210") {
          throw new Error("provider down");
        }
        return { providerMessageId: "msg-ok", status: "sent" };
      },
    },
    linkService,
    now: () => new Date("2026-10-05T06:00:00.000Z"),
  });

  await notifier.runDueToday();

  const failedLog = state.logs.find((log) => log.salesPersonId === "sp-sms" && log.channel === "sms");
  assert.equal(failedLog.status, "failed");
  assert.equal(failedLog.attempts, 3);
  assert.match(failedLog.error, /provider down/);
});

test("sendTest uses current open balances and rate-limits to five per hour", async () => {
  const { state, prisma, linkService } = createHarness();
  const sends = [];
  const notifier = createOutstandingNotifier({
    prisma,
    provider: {
      mode: "log",
      send: async (payload) => {
        sends.push(payload);
        return { providerMessageId: `msg-${sends.length}`, status: "dry_run" };
      },
    },
    linkService,
    now: () => new Date("2026-10-05T06:00:00.000Z"),
  });

  for (let index = 0; index < 5; index += 1) {
    await notifier.sendTest("sp-sms");
  }

  await assert.rejects(() => notifier.sendTest("sp-sms"), /Manual test limit reached/);
  assert.equal(sends.length, 5);
  assert.equal(state.logs.filter((log) => log.kind === "manual_test").length, 5);
});

test("listNotifications masks phone numbers for managers and shows full phone numbers for admins", async () => {
  const { state, prisma, linkService } = createHarness();
  state.logs.push({
    id: "log-1",
    salesPersonId: "sp-sms",
    channel: "sms",
    kind: "due_today",
    scheduledFor: new Date("2026-10-04T18:30:00.000Z"),
    status: "dry_run",
    providerMessageId: "msg-1",
    error: null,
    messageText: "Hello",
    linkId: "link-1",
    attempts: 1,
    createdAt: new Date("2026-10-05T06:00:00.000Z"),
  });
  prisma.notificationLog.findMany = async () => [{
    ...state.logs[0],
    salesPerson: { id: "sp-sms", name: "Ravi Kumar", phone: "+919876543210" },
  }];

  const notifier = createOutstandingNotifier({
    prisma,
    provider: { mode: "log", send: async () => ({ providerMessageId: "msg", status: "dry_run" }) },
    linkService,
    now: () => new Date("2026-10-05T06:00:00.000Z"),
  });

  const managerView = await notifier.listNotifications({ includePhone: false });
  const adminView = await notifier.listNotifications({ includePhone: true });

  assert.equal(managerView.notifications[0].salesPerson.phone, "+91********10");
  assert.equal(adminView.notifications[0].salesPerson.phone, "+919876543210");
});
