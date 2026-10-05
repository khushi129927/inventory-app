import ExcelJS from "exceljs";

export interface ParsedOutstandingRow {
  values: {
    "Client Name"?: string;
    Salesperson?: string;
    "Salesperson Phone"?: string;
    "Invoice No"?: string;
    "Invoice Date"?: string;
    Amount?: number;
    "Paid Amount"?: number;
    "Credit Days"?: number;
  };
  errors: string[];
}

const REQUIRED_HEADERS = [
  "Client Name",
  "Salesperson",
  "Salesperson Phone",
  "Invoice No",
  "Invoice Date",
  "Amount",
  "Paid Amount",
  "Credit Days",
] as const;

function normalizeHeader(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeCellDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  const text = String(value ?? "").trim();
  if (!text) {
    return "";
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? text : parsed.toISOString();
}

export async function parseOutstandingExcel(buffer: ArrayBuffer): Promise<ParsedOutstandingRow[]> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    const csvText = new TextDecoder().decode(buffer);
    workbook.csv.read(Buffer.from(csvText));
  }

  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) {
    return [];
  }

  const rows: unknown[][] = [];
  worksheet.eachRow({ includeEmpty: true }, (row) => {
    const values = row.values as unknown[];
    const normalized = new Array(worksheet.columnCount).fill("");
    values.forEach((value, index) => {
      if (index > 0) {
        normalized[index - 1] = value;
      }
    });
    rows.push(normalized);
  });

  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((value) => normalizeHeader(value));
  const columnIndex = (header: string) => headers.indexOf(normalizeHeader(header));

  return rows.slice(1).map((row) => {
    const clientName = String(row[columnIndex("Client Name")] ?? "").trim();
    const salesperson = String(row[columnIndex("Salesperson")] ?? "").trim();
    const salespersonPhone = String(row[columnIndex("Salesperson Phone")] ?? "").trim();
    const invoiceNo = String(row[columnIndex("Invoice No")] ?? "").trim();
    const invoiceDate = normalizeCellDate(row[columnIndex("Invoice Date")]);
    const amountRaw = row[columnIndex("Amount")];
    const paidAmountRaw = row[columnIndex("Paid Amount")];
    const creditDaysRaw = row[columnIndex("Credit Days")];
    const amount = amountRaw === "" || amountRaw === undefined ? undefined : Number(amountRaw);
    const paidAmount = paidAmountRaw === "" || paidAmountRaw === undefined ? undefined : Number(paidAmountRaw);
    const creditDays = creditDaysRaw === "" || creditDaysRaw === undefined ? undefined : Number(creditDaysRaw);

    const errors: string[] = [];
    if (!clientName) errors.push("Client Name is required");
    if (!salesperson) errors.push("Salesperson is required");
    if (!invoiceNo) errors.push("Invoice No is required");
    if (!invoiceDate || Number.isNaN(new Date(invoiceDate).getTime())) errors.push("Invoice Date must be a valid date");
    if (amount === undefined || Number.isNaN(amount) || amount < 0) errors.push("Amount must be a valid non-negative number");
    if (paidAmount !== undefined && (Number.isNaN(paidAmount) || paidAmount < 0)) errors.push("Paid Amount must be a valid non-negative number");
    if (creditDays !== undefined && (Number.isNaN(creditDays) || creditDays < 0 || !Number.isInteger(creditDays))) {
      errors.push("Credit Days must be a valid non-negative integer");
    }

    return {
      values: {
        "Client Name": clientName || undefined,
        Salesperson: salesperson || undefined,
        "Salesperson Phone": salespersonPhone || undefined,
        "Invoice No": invoiceNo || undefined,
        "Invoice Date": invoiceDate || undefined,
        Amount: amount,
        "Paid Amount": paidAmount,
        "Credit Days": creditDays,
      },
      errors,
    };
  });
}

export async function createOutstandingSampleWorkbook(): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Outstanding");

  worksheet.addRow([...REQUIRED_HEADERS]);
  worksheet.addRow(["Acme Stores", "Ravi", "+919876543210", "INV-001", "2026-10-01", 10000, 2500, 15]);
  worksheet.addRow(["Bravo Traders", "Neha", "9876543210", "INV-002", "2026-10-03", 5500, 0, 7]);
  worksheet.addRow(["City Mart", "Asha", "", "INV-003", "2026-10-05", 3200, 3200, ""]);

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
