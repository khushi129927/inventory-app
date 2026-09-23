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

async function runExcelParserAssertions() {
  const buffer = await buildWorkbookBuffer([
    ["Name", "SKU", "Category", "Quantity", "Price", "Min Stock", "Image"],
    ["Test Product", "SKU-001", "CPU", 5, 1000, 1, "inventory-photo.png"],
  ]);

  const rows = await parseProductExcel(buffer);

  if (rows.length !== 1) {
    throw new Error(`Expected 1 parsed row, received ${rows.length}`);
  }

  if (rows[0].image !== "") {
    throw new Error(`Expected non-URL image to normalize to an empty string, received ${String(rows[0].image)}`);
  }

  if (JSON.stringify(rows[0].errors) !== JSON.stringify([])) {
    throw new Error(`Expected no validation errors, received ${JSON.stringify(rows[0].errors)}`);
  }
}

void runExcelParserAssertions();
