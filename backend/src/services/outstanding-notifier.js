import { buildMessage } from "./notification-providers.js";

const INDIA_OFFSET_MINUTES = 330;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 3;
const TEST_WINDOW_MS = 60 * 60 * 1000;
const TEST_LIMIT_PER_HOUR = 5;

function asDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid date");
  }

  return parsed;
}

function getIndiaDateParts(value) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(asDate(value));
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
    hour: Number(parts.find((part) => part.type === "hour")?.value),
    minute: Number(parts.find((part) => part.type === "minute")?.value),
  };
}

function startOfIndiaDayUtc(value) {
  const { year, month, day } = getIndiaDateParts(value);
  return new Date(Date.UTC(year, month - 1, day, 0, -INDIA_OFFSET_MINUTES, 0, 0));
}

function endOfIndiaDayUtc(value) {
  return new Date(startOfIndiaDayUtc(value).getTime() + MS_PER_DAY);
}

function differenceInIndiaDays(later, earlier) {
  const laterStart = startOfIndiaDayUtc(later);
  const earlierStart = startOfIndiaDayUtc(earlier);
  return Math.floor((laterStart.getTime() - earlierStart.getTime()) / MS_PER_DAY);
}

function invoiceBalance(invoice) {
  return Math.max(0, Number(invoice.amount ?? 0) - Number(invoice.paidAmount ?? 0));
}

function channelsForSalesPerson(notifyChannel) {
  switch (notifyChannel) {
    case "sms":
      return ["sms"];
    case "whatsapp":
      return ["whatsapp"];
    case "both":
      return ["sms", "whatsapp"];
    default:
      return [];
  }
}

function uniqueClientIds(invoices) {
  return [...new Set(invoices.map((invoice) => invoice.clientId))];
}

function groupTopClients(invoices) {
  const totals = new Map();
  for (const invoice of invoices) {
    totals.set(invoice.client.name, (totals.get(invoice.client.name) ?? 0) + invoiceBalance(invoice));
  }

  return [...totals.entries()]
    .map(([clientName, amount]) => ({ clientName, amount }))
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 3);
}

function maskPhone(phone) {
  if (!phone) {
    return null;
  }

  const digits = String(phone);
  if (digits.length <= 4) {
    return "*".repeat(digits.length);
  }

  return `${digits.slice(0, 3)}${"*".repeat(Math.max(0, digits.length - 5))}${digits.slice(-2)}`;
}

export function createOutstandingNotifier({ prisma, provider, linkService, now = () => new Date() }) {
  async function createDailyLog({ salesPersonId, channel, scheduledFor, status, messageText, linkId = null, error = null, providerMessageId = null, attempts = 0 }) {
    try {
      return await prisma.notificationLog.create({
        data: {
          salesPersonId,
          channel,
          kind: "due_today",
          scheduledFor,
          status,
          providerMessageId,
          error,
          messageText,
          linkId,
          attempts,
        },
      });
    } catch (creationError) {
      if (creationError?.code === "P2002") {
        return null;
      }
      throw creationError;
    }
  }

  async function sendWithRetries({ logId, to, channel, text, linkId }) {
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const result = await provider.send({ to, channel, text });
        await prisma.notificationLog.update({
          where: { id: logId },
          data: {
            status: result.status ?? "sent",
            providerMessageId: result.providerMessageId,
            attempts: attempt,
            error: null,
            linkId,
          },
        });
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Notification provider failed");
        await prisma.notificationLog.update({
          where: { id: logId },
          data: {
            status: attempt >= MAX_ATTEMPTS ? "failed" : "retrying",
            error: lastError.message,
            attempts: attempt,
            linkId,
          },
        });
      }
    }

    if (lastError) {
      console.error("Outstanding notification failed", lastError);
    }
  }

  return {
    async runDueToday() {
      const current = now();
      const dayStart = startOfIndiaDayUtc(current);
      const dayEnd = endOfIndiaDayUtc(current);

      const salesPeople = await prisma.salesPerson.findMany({
        where: {
          active: true,
          notifyChannel: {
            not: "none",
          },
        },
        include: {
          clients: {
            include: {
              outstandingInvoices: true,
            },
          },
        },
      });

      for (const salesPerson of salesPeople) {
        const dueInvoices = salesPerson.clients
          .flatMap((client) =>
            client.outstandingInvoices
              .filter((invoice) => {
                const balance = invoiceBalance(invoice);
                const dueDate = asDate(invoice.dueDate);
                return balance > 0 && dueDate >= dayStart && dueDate < dayEnd;
              })
              .map((invoice) => ({ ...invoice, client }))
          );

        if (dueInvoices.length === 0) {
          continue;
        }

        const channels = channelsForSalesPerson(salesPerson.notifyChannel);
        const clientIds = uniqueClientIds(dueInvoices);
        const totalAmount = dueInvoices.reduce((sum, invoice) => sum + invoiceBalance(invoice), 0);
        const topClients = groupTopClients(dueInvoices);

        for (const channel of channels) {
          if (!salesPerson.phone) {
            await createDailyLog({
              salesPersonId: salesPerson.id,
              channel,
              scheduledFor: dayStart,
              status: "skipped",
              messageText: "Skipped notification because salesperson phone is missing",
              error: "Salesperson phone is missing",
              attempts: 0,
            });
            continue;
          }

          const link = await linkService.createLink({
            salesPersonId: salesPerson.id,
            clientIds,
            ttlDays: 7,
          });
          const messageText = buildMessage({
            clientCount: clientIds.length,
            totalAmount,
            topClients,
            link: link.url,
          });
          const notificationLog = await createDailyLog({
            salesPersonId: salesPerson.id,
            channel,
            scheduledFor: dayStart,
            status: "queued",
            messageText,
            linkId: link.linkId,
            attempts: 0,
          });

          if (!notificationLog) {
            continue;
          }

          await sendWithRetries({
            logId: notificationLog.id,
            to: salesPerson.phone,
            channel,
            text: messageText,
            linkId: link.linkId,
          });
        }
      }
    },

    async sendTest(salesPersonId) {
      const current = now();
      const salesPerson = await prisma.salesPerson.findUnique({
        where: { id: salesPersonId },
        include: {
          clients: {
            include: {
              outstandingInvoices: true,
            },
          },
        },
      });

      if (!salesPerson) {
        throw new Error("Salesperson not found");
      }

      const channels = channelsForSalesPerson(salesPerson.notifyChannel);
      if (channels.length === 0) {
        throw new Error("Salesperson notifications are disabled");
      }
      if (!salesPerson.phone) {
        throw new Error("Salesperson phone is missing");
      }

      const recentLogs = await prisma.notificationLog.findMany({
        where: {
          salesPersonId,
          kind: "manual_test",
          scheduledFor: {
            gte: new Date(current.getTime() - TEST_WINDOW_MS),
          },
        },
      });
      if (recentLogs.length >= TEST_LIMIT_PER_HOUR) {
        throw new Error("Manual test limit reached for this salesperson in the last hour");
      }

      const openInvoices = salesPerson.clients.flatMap((client) =>
        client.outstandingInvoices
          .filter((invoice) => invoiceBalance(invoice) > 0)
          .map((invoice) => ({ ...invoice, client }))
      );
      const clientIds = uniqueClientIds(openInvoices);
      const totalAmount = openInvoices.reduce((sum, invoice) => sum + invoiceBalance(invoice), 0);
      const topClients = groupTopClients(openInvoices);

      const link = clientIds.length > 0
        ? await linkService.createLink({ salesPersonId: salesPerson.id, clientIds, ttlDays: 7 })
        : null;
      const messageText = clientIds.length > 0
        ? buildMessage({ clientCount: clientIds.length, totalAmount, topClients, link: link.url, isTest: true })
        : buildMessage({ clientCount: 0, totalAmount: 0, topClients: [], link: "", isTest: true });

      const results = [];
      for (const channel of channels) {
        const scheduledFor = new Date(current.getTime() + results.length);
        const log = await prisma.notificationLog.create({
          data: {
            salesPersonId: salesPerson.id,
            channel,
            kind: "manual_test",
            scheduledFor,
            status: "queued",
            providerMessageId: null,
            error: null,
            messageText,
            linkId: link?.linkId ?? null,
            attempts: 0,
          },
        });

        await sendWithRetries({
          logId: log.id,
          to: salesPerson.phone,
          channel,
          text: messageText,
          linkId: link?.linkId ?? null,
        });
        results.push(log);
      }

      return { sent: results.length };
    },

    async listNotifications({ salesPersonId, status, page = 1, pageSize = 20, includePhone = false }) {
      const where = {
        ...(salesPersonId ? { salesPersonId } : {}),
        ...(status ? { status } : {}),
      };

      const notifications = await prisma.notificationLog.findMany({
        where,
        include: {
          salesPerson: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: Math.max(0, (page - 1) * pageSize),
        take: pageSize,
      });
      const total = await prisma.notificationLog.count({ where });

      return {
        notifications: notifications.map((notification) => ({
          ...notification,
          salesPerson: notification.salesPerson
            ? {
                id: notification.salesPerson.id,
                name: notification.salesPerson.name,
                phone: includePhone ? notification.salesPerson.phone : maskPhone(notification.salesPerson.phone),
              }
            : null,
        })),
        pagination: {
          page,
          pageSize,
          total,
        },
      };
    },
  };
}
