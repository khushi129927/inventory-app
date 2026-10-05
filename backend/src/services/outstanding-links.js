import crypto from "node:crypto";

const INDIA_OFFSET_MINUTES = 330;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

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
  });

  const parts = formatter.formatToParts(asDate(value));
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

function startOfIndiaDayUtc(value) {
  const { year, month, day } = getIndiaDateParts(value);
  return new Date(Date.UTC(year, month - 1, day, 0, -INDIA_OFFSET_MINUTES, 0, 0));
}

function differenceInIndiaDays(later, earlier) {
  const laterStart = startOfIndiaDayUtc(later);
  const earlierStart = startOfIndiaDayUtc(earlier);
  return Math.floor((laterStart.getTime() - earlierStart.getTime()) / MS_PER_DAY);
}

function invoiceBalance(invoice) {
  return Math.max(0, Number(invoice.amount ?? 0) - Number(invoice.paidAmount ?? 0));
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function resolvePublicAppUrl(publicAppUrl) {
  const configured = typeof publicAppUrl === "string" ? publicAppUrl.trim() : "";
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }

  throw new Error("PUBLIC_APP_URL is required and must be reachable from salespeople's phones");
}

function firstName(name) {
  return String(name ?? "").trim().split(/\s+/).filter(Boolean)[0] ?? "";
}

export function createOutstandingLinkService(prisma, options = {}) {
  const now = options.now ?? (() => new Date());
  const getPublicAppUrl = () => resolvePublicAppUrl(options.publicAppUrl ?? process.env.PUBLIC_APP_URL);

  return {
    async createLink({ salesPersonId, clientIds, ttlDays = 7 }) {
      const token = crypto.randomBytes(32).toString("base64url");
      const tokenHash = hashToken(token);
      const current = now();
      const expiresAt = new Date(current.getTime() + Math.max(1, ttlDays) * MS_PER_DAY);
      const baseUrl = getPublicAppUrl();

      const record = await prisma.outstandingLink.create({
        data: {
          tokenHash,
          salesPersonId,
          clientIds,
          expiresAt,
        },
      });

      return {
        url: `${baseUrl}/o/${token}`,
        linkId: record.id,
        expiresAt,
      };
    },

    async resolveLink(token) {
      const tokenHash = hashToken(token);
      const current = now();
      const link = await prisma.outstandingLink.findUnique({
        where: { tokenHash },
      });

      if (!link) {
        return null;
      }

      if (link.revokedAt || asDate(link.expiresAt) <= current) {
        return null;
      }

      const updated = await prisma.outstandingLink.update({
        where: { id: link.id },
        data: {
          lastViewedAt: current,
          viewCount: (link.viewCount ?? 0) + 1,
        },
      });

      return updated;
    },

    async getPublicView(token) {
      const link = await this.resolveLink(token);
      if (!link) {
        return null;
      }

      const todayStart = startOfIndiaDayUtc(now());
      const asOfDate = todayStart.toISOString().slice(0, 10);
      const clients = await prisma.client.findMany({
        where: {
          id: {
            in: link.clientIds,
          },
        },
        include: {
          salesPerson: {
            select: {
              name: true,
            },
          },
          outstandingInvoices: true,
        },
      });

      const visibleClients = clients
        .map((client) => {
          const openInvoices = client.outstandingInvoices
            .map((invoice) => {
              const balance = invoiceBalance(invoice);
              const dueDate = asDate(invoice.dueDate);
              return {
                invoiceNo: invoice.invoiceNo,
                balance,
                dueDate,
                daysOverdue: balance > 0 && dueDate < todayStart ? differenceInIndiaDays(todayStart, dueDate) : 0,
              };
            })
            .filter((invoice) => invoice.balance > 0)
            .sort((left, right) => left.dueDate - right.dueDate);

          if (openInvoices.length === 0) {
            return null;
          }

          const totalBalance = openInvoices.reduce((sum, invoice) => sum + invoice.balance, 0);
          const overdueBalance = openInvoices
            .filter((invoice) => invoice.daysOverdue > 0)
            .reduce((sum, invoice) => sum + invoice.balance, 0);

          return {
            clientName: client.name,
            creditDays: client.creditDays,
            totalBalance,
            overdueBalance,
            invoices: openInvoices,
          };
        })
        .filter(Boolean);

      return {
        salespersonFirstName: firstName(clients[0]?.salesPerson?.name ?? ""),
        asOf: asOfDate,
        grandTotalOutstanding: visibleClients.reduce((sum, client) => sum + client.totalBalance, 0),
        clients: visibleClients,
      };
    },

    async revokeLinks(salesPersonId) {
      const current = now();
      const result = await prisma.outstandingLink.updateMany({
        where: {
          salesPersonId,
          revokedAt: null,
          expiresAt: {
            gt: current,
          },
        },
        data: {
          revokedAt: current,
        },
      });

      return { revoked: result.count ?? 0 };
    },
  };
}
