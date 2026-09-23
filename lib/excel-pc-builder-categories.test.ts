import ExcelJS from "exceljs";

import { parseProductExcel } from "@/lib/excel-parser";

async function buildWorkbookBuffer(rows: Array<Array<string | number>>): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Products");

  for (const row of rows) {
    worksheet.addRow(row);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

async function runPcBuilderCategoryAssertions() {
  const validBuffer = await buildWorkbookBuffer([
    ["Name", "SKU", "Category", "Quantity", "Price", "Min Stock"],
    ["Gaming CPU", "CPU-001", "CPU", 4, 25000, 1],
    ["Gaming GPU", "GPU-001", "GPU", 2, 55000, 1],
    ["Power Backup", "UPS-001", "UPS", 3, 7000, 1],
  ]);

  const validRows = await parseProductExcel(validBuffer);

  if (validRows.some((row) => row.errors.length > 0)) {
    throw new Error(`Expected PC builder categories to be accepted without validation errors, received ${JSON.stringify(validRows)}`);
  }

  const invalidBuffer = await buildWorkbookBuffer([
    ["Name", "SKU", "Category", "Quantity", "Price", "Min Stock"],
    ["Unknown Part", "PART-001", "Laptops", 1, 1000, 1],
  ]);

  const invalidRows = await parseProductExcel(invalidBuffer);

  if (!invalidRows[0]?.errors.includes("Category must be one of: CPU, Motherboard, RAM, SSD, GPU, Cooler, Cabinet, SMPS, UPS, Monitor, Other")) {
    throw new Error(`Expected unsupported categories to be rejected for PC builder import, received ${JSON.stringify(invalidRows[0]?.errors ?? [])}`);
  }
}

void runPcBuilderCategoryAssertions();
