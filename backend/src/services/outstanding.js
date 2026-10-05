const INDIA_OFFSET_MINUTES = 330;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

function toNumber(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeIndianPhone(value) {
  const raw = normalizeText(value);
  if (!raw) {
    return null;
  }

  const compact = raw.replace(/[\s()-]/g, "");

  if (/^\+91\d{10}$/.test(compact)) {
    return compact;
  }

  if (/^91\d{10}$/.test(compact)) {
    return `+${compact}`;
  }

  if (/^0\d{10}$/.test(compact)) {
    return `+91${compact.slice(1)}`;
  }

  if (/^\d{10}$/.test(compact)) {
    return `+91${compact}`;
  }

  if (E164_PATTERN.test(compact)) {
    return compact;
  }

  throw new Error("Phone number must be a valid E.164 number");
}

function validateNotifyChannel(value) {
  if (["sms", "whatsapp", "both", "none"].includes(value)) {
    return value;
  }
  throw new Error("notifyChannel must be one of sms, whatsapp, both, or none");
}

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

  const parts = formatter.formatToParts(value instanceof Date ? value : new Date(value));
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

function startOfIndiaDayUtc(value) {
  const { year, month, day } = getIndiaDateParts(asDate(value));
  return new Date(Date.UTC(year, month - 1, day, 0, -INDIA_OFFSET_MINUTES, 0, 0));
}

function addIndiaDays(dayStartUtc, days) {
  return new Date(dayStartUtc.getTime() + days * MS_PER_DAY);
}

function differenceInIndiaDays(later, earlier) {
  const laterStart = startOfIndiaDayUtc(later);
  const earlierStart = startOfIndiaDayUtc(earlier);
  return Math.floor((laterStart.getTime() - earlierStart.getTime()) / MS_PER_DAY);
}

function computeDueDate(invoiceDate, creditDays) {
  return addIndiaDays(startOfIndiaDayUtc(invoiceDate), creditDays);
}

function invoiceBalance(invoice) {
  return Math.max(0, toNumber(invoice.amount) - toNumber(invoice.paidAmount));
}

function mapInvoice(invoice, todayStart) {
  const balance = invoiceBalance(invoice);
  const dueDate = asDate(invoice.dueDate);
  const daysOverdue = balance > 0 && dueDate < todayStart ? differenceInIndiaDays(todayStart, dueDate) : 0;

  return {
    invoiceNo: invoice.invoiceNo,
    invoiceDate: invoice.invoiceDate,
    amount: toNumber(invoice.amount),
    paidAmount: toNumber(invoice.paidAmount),
    balance,
    creditDays: toNumber(invoice.creditDays),
    dueDate,
    daysOverdue,
  };
}

function buildClientRow(client, todayStart, filters = {}) {
  const invoices = Array.isArray(client.outstandingInvoices) ? client.outstandingInvoices : [];
  const openInvoices = invoices
    .map((invoice) => ({ ...invoice, balance: invoiceBalance(invoice) }))
    .filter((invoice) => invoice.balance > 0);

  if (openInvoices.length === 0) {
    return null;
  }

  const overdueInvoices = openInvoices.filter((invoice) => asDate(invoice.dueDate) < todayStart);
  const overdueBalance = overdueInvoices.reduce((sum, invoice) => sum + invoice.balance, 0);
  const totalBalance = openInvoices.reduce((sum, invoice) => sum + invoice.balance, 0);
  const sortedByDue = [...openInvoices].sort((a, b) => asDate(a.dueDate) - asDate(b.dueDate));
  const nextDueDate = sortedByDue[0] ? asDate(sortedByDue[0].dueDate) : null;
  const oldestOverdueDays = overdueInvoices.length
    ? Math.max(...overdueInvoices.map((invoice) => differenceInIndiaDays(todayStart, invoice.dueDate)))
    : 0;
  const dueIn7Days =
    overdueBalance === 0 &&
    nextDueDate &&
    differenceInIndiaDays(nextDueDate, todayStart) >= 0 &&
    differenceInIndiaDays(nextDueDate, todayStart) <= 7;

  const status = overdueBalance > 0 ? "overdue" : dueIn7Days ? "due_soon" : "not_due";

  if (filters.salesPersonId && client.salesPersonId !== filters.salesPersonId) {
    return null;
  }

  if (filters.status && filters.status !== status) {
    return null;
  }

  if (filters.search) {
    const needle = filters.search.toLowerCase();
    const matchesClient = client.name.toLowerCase().includes(needle);
    const matchesSales = client.salesPerson?.name?.toLowerCase().includes(needle);
    if (!matchesClient && !matchesSales) {
      return null;
    }
  }

  return {
    clientId: client.id,
    clientName: client.name,
    salesPerson: client.salesPerson
      ? {
          id: client.salesPerson.id,
          name: client.salesPerson.name,
          phone: client.salesPerson.phone ?? null,
        }
      : null,
    creditDays: toNumber(client.creditDays),
    totalBalance,
    overdueBalance,
    nextDueDate,
    oldestOverdueDays,
    invoiceCount: openInvoices.length,
    status,
  };
}

export function createOutstandingService(prisma, options = {}) {
  const now = options.now ?? (() => new Date());

  return {
    async summary() {
      const todayStart = startOfIndiaDayUtc(now());
      const invoices = await prisma.outstandingInvoice.findMany({
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      const openInvoices = invoices.filter((invoice) => invoiceBalance(invoice) > 0);
      const totalOutstanding = openInvoices.reduce((sum, invoice) => sum + invoiceBalance(invoice), 0);
      const overdueAmount = openInvoices
        .filter((invoice) => asDate(invoice.dueDate) < todayStart)
        .reduce((sum, invoice) => sum + invoiceBalance(invoice), 0);
      const dueIn7Days = openInvoices
        .filter((invoice) => {
          const dueDate = asDate(invoice.dueDate);
          const daysUntilDue = differenceInIndiaDays(dueDate, todayStart);
          return dueDate >= todayStart && daysUntilDue >= 0 && daysUntilDue <= 7;
        })
        .reduce((sum, invoice) => sum + invoiceBalance(invoice), 0);
      const clientsWithDues = new Set(openInvoices.map((invoice) => invoice.clientId)).size;

      return {
        totalOutstanding,
        overdueAmount,
        dueIn7Days,
        clientsWithDues,
      };
    },

    async listClients({ salesPersonId, search, status } = {}) {
      const todayStart = startOfIndiaDayUtc(now());
      const clients = await prisma.client.findMany({
        include: {
          salesPerson: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          outstandingInvoices: true,
        },
      });

      const rows = clients
        .map((client) => buildClientRow(client, todayStart, { salesPersonId, search, status }))
        .filter(Boolean);

      const statusOrder = { overdue: 0, due_soon: 1, not_due: 2 };
      rows.sort((left, right) => {
        const byStatus = statusOrder[left.status] - statusOrder[right.status];
        if (byStatus !== 0) {
          return byStatus;
        }
        return right.totalBalance - left.totalBalance;
      });

      return rows.map(({ status: _status, ...row }) => row);
    },

    async getClient(id) {
      const todayStart = startOfIndiaDayUtc(now());
      const client = await prisma.client.findUnique({
        where: { id },
        include: {
          salesPerson: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          outstandingInvoices: {
            orderBy: [{ dueDate: "asc" }, { invoiceDate: "asc" }],
          },
        },
      });

      if (!client) {
        return null;
      }

      return {
        id: client.id,
        name: client.name,
        creditDays: toNumber(client.creditDays),
        salesPerson: client.salesPerson
          ? {
              id: client.salesPerson.id,
              name: client.salesPerson.name,
              phone: client.salesPerson.phone ?? null,
            }
          : null,
        invoices: client.outstandingInvoices.map((invoice) => mapInvoice(invoice, todayStart)),
      };
    },

    async importRows(rows) {
      const results = {
        created: 0,
        updated: 0,
        errors: [],
      };

      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        try {
          const clientName = normalizeText(row["Client Name"]);
          const salesPersonName = normalizeText(row.Salesperson);
          const phone = normalizeIndianPhone(row["Salesperson Phone"]);
          const invoiceNo = normalizeText(row["Invoice No"]);
          const amount = toNumber(row.Amount, Number.NaN);
          const paidAmount = row["Paid Amount"] === undefined || row["Paid Amount"] === null || row["Paid Amount"] === ""
            ? 0
            : toNumber(row["Paid Amount"], Number.NaN);
          const invoiceDate = asDate(row["Invoice Date"]);
          const rowCreditDaysProvided = !(row["Credit Days"] === undefined || row["Credit Days"] === null || row["Credit Days"] === "");
          const parsedCreditDays = rowCreditDaysProvided ? Math.max(0, Math.trunc(toNumber(row["Credit Days"], Number.NaN))) : null;

          if (!clientName) {
            throw new Error("Client Name is required");
          }
          if (!salesPersonName) {
            throw new Error("Salesperson is required");
          }
          if (!invoiceNo) {
            throw new Error("Invoice No is required");
          }
          if (!Number.isFinite(amount) || amount < 0) {
            throw new Error("Amount must be a valid non-negative number");
          }
          if (!Number.isFinite(paidAmount) || paidAmount < 0) {
            throw new Error("Paid Amount must be a valid non-negative number");
          }
          if (paidAmount > amount) {
            throw new Error("Paid Amount cannot be greater than Amount");
          }
          if (rowCreditDaysProvided && !Number.isFinite(parsedCreditDays)) {
            throw new Error("Credit Days must be a valid non-negative integer");
          }

          await prisma.$transaction(async (tx) => {
            const existingSalesPerson = await tx.salesPerson.findUnique({
              where: { name: salesPersonName },
            });

            const salesPerson = existingSalesPerson
              ? await tx.salesPerson.update({
                  where: { id: existingSalesPerson.id },
                  data: phone ? { phone } : {},
                })
              : await tx.salesPerson.create({
                  data: {
                    name: salesPersonName,
                    ...(phone ? { phone } : {}),
                  },
                });

            const existingClient = await tx.client.findUnique({
              where: { name: clientName },
            });

            const clientCreditDays = rowCreditDaysProvided
              ? parsedCreditDays
              : existingClient?.creditDays ?? 0;

            const client = existingClient
              ? await tx.client.update({
                  where: { id: existingClient.id },
                  data: {
                    salesPersonId: salesPerson.id,
                    ...(rowCreditDaysProvided ? { creditDays: clientCreditDays } : {}),
                  },
                })
              : await tx.client.create({
                  data: {
                    name: clientName,
                    salesPersonId: salesPerson.id,
                    creditDays: clientCreditDays,
                  },
                });

            const invoiceCreditDays = rowCreditDaysProvided ? parsedCreditDays : clientCreditDays;
            const dueDate = computeDueDate(invoiceDate, invoiceCreditDays);
            const existingInvoice = await tx.outstandingInvoice.findUnique({
              where: {
                clientId_invoiceNo: {
                  clientId: client.id,
                  invoiceNo,
                },
              },
            });

            if (existingInvoice) {
              await tx.outstandingInvoice.update({
                where: { id: existingInvoice.id },
                data: {
                  invoiceDate,
                  amount,
                  paidAmount,
                  creditDays: invoiceCreditDays,
                  dueDate,
                },
              });
              results.updated += 1;
            } else {
              await tx.outstandingInvoice.create({
                data: {
                  clientId: client.id,
                  invoiceNo,
                  invoiceDate,
                  amount,
                  paidAmount,
                  creditDays: invoiceCreditDays,
                  dueDate,
                },
              });
              results.created += 1;
            }
          });
        } catch (error) {
          results.errors.push({
            row: index + 1,
            message: error instanceof Error ? error.message : "Unknown import error",
          });
        }
      }

      return results;
    },

    async updateClient(id, { creditDays, salesPersonId, applyToOpenInvoices }) {
      const normalizedCreditDays = creditDays === undefined ? undefined : Math.max(0, Math.trunc(toNumber(creditDays, Number.NaN)));
      if (creditDays !== undefined && !Number.isFinite(normalizedCreditDays)) {
        throw new Error("creditDays must be a valid non-negative integer");
      }

      return prisma.$transaction(async (tx) => {
        const client = await tx.client.update({
          where: { id },
          data: {
            ...(normalizedCreditDays !== undefined ? { creditDays: normalizedCreditDays } : {}),
            ...(salesPersonId !== undefined ? { salesPersonId } : {}),
          },
        });

        if (applyToOpenInvoices && normalizedCreditDays !== undefined) {
          const openInvoices = await tx.outstandingInvoice.findMany({
            where: {
              clientId: id,
            },
          });

          for (const invoice of openInvoices) {
            if (invoiceBalance(invoice) <= 0) {
              continue;
            }

            await tx.outstandingInvoice.update({
              where: { id: invoice.id },
              data: {
                creditDays: normalizedCreditDays,
                dueDate: computeDueDate(invoice.invoiceDate, normalizedCreditDays),
              },
            });
          }
        }

        return tx.client.findUnique({
          where: { id: client.id },
          include: {
            salesPerson: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        });
      });
    },

    async listSalesPeople() {
      return prisma.salesPerson.findMany({
        orderBy: { name: "asc" },
      });
    },

    async updateSalesPerson(id, { phone, notifyChannel, active }) {
      const data = {};

      if (phone !== undefined) {
        data.phone = phone === null || normalizeText(phone) === "" ? null : normalizeIndianPhone(phone);
      }

      if (notifyChannel !== undefined) {
        data.notifyChannel = validateNotifyChannel(notifyChannel);
      }

      if (active !== undefined) {
        data.active = Boolean(active);
      }

      return prisma.salesPerson.update({
        where: { id },
        data,
      });
    },
  };
}
