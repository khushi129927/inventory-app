import ExcelJS from "exceljs";

export const PC_BUILDER_CATEGORIES = [
  "CPU",
  "Motherboard",
  "RAM",
  "SSD",
  "GPU",
  "Cooler",
  "Cabinet",
  "SMPS",
  "UPS",
  "Monitor",
  "Other",
] as const;

const PC_BUILDER_CATEGORY_ERROR = `Category must be one of: ${PC_BUILDER_CATEGORIES.join(", ")}`;

function normalizeImportImage(value: unknown): string | undefined {
  const trimmed = String(value ?? "").trim();

  if (!trimmed) {
    return undefined;
  }

  try {
    new URL(trimmed);
    return trimmed;
  } catch {
    return "";
  }
}

export interface ParsedProductRow {
  name?: string;
  sku?: string;
  category?: string;
  availableBranches?: string[];
  quantity?: number;
  mrp?: number;
  minStock?: number;
  monthlyInterest: number;
  description?: string;
  image?: string;
  errors: string[];
}

export async function parseProductExcel(buffer: ArrayBuffer): Promise<ParsedProductRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.getWorksheet(1);

  if (!worksheet) return [];

  const raw: any[][] = [];
  worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const values = row.values as any[];
    // ExcelJS rows are 1-indexed, and values array might have a hole at index 0
    // We normalize by ensuring we have a consistent array length
    const rowData = new Array(worksheet.columnCount).fill("");
    values.forEach((val, idx) => {
      if (idx > 0) rowData[idx - 1] = val;
    });
    raw.push(rowData);
  });

  if (raw.length < 2) return [];

  const headers = (raw[0] as string[]).map((h) =>
    String(h).toLowerCase().trim().replace(/\s+/g, " ")
  );

  const colIndex = (name: string) => headers.indexOf(name);

  const nameIdx = colIndex("name");
  const skuIdx = colIndex("sku");
  const categoryIdx = colIndex("category");
  const quantityIdx = colIndex("quantity");
    const priceIdx = colIndex("price");
    const mrpIdx = colIndex("mrp");
  const minStockIdx = colIndex("min stock");
  const monthlyInterestIdx = colIndex("monthly interest");
  const descriptionIdx = colIndex("description");
  const imageIdx = colIndex("image");
  const availableBranchesIdx = colIndex("available branches");

  const seenSkus = new Set<string>();
  const duplicateSkus = new Set<string>();

  for (let i = 1; i < raw.length; i++) {
    const row = raw[i];
    const sku = skuIdx >= 0 ? String(row[skuIdx] ?? "").trim() : "";
    if (sku) {
      if (seenSkus.has(sku)) {
        duplicateSkus.add(sku);
      }
      seenSkus.add(sku);
    }
  }

  const results: ParsedProductRow[] = [];

  for (let i = 1; i < raw.length; i++) {
    const row = raw[i];
    const errors: string[] = [];

    const name = nameIdx >= 0 ? String(row[nameIdx] ?? "").trim() : "";
    const sku = skuIdx >= 0 ? String(row[skuIdx] ?? "").trim() : "";
    const category =
      categoryIdx >= 0 ? String(row[categoryIdx] ?? "").trim() : "";
    const quantityRaw = quantityIdx >= 0 ? row[quantityIdx] : undefined;
    const priceRaw = priceIdx >= 0 ? row[priceIdx] : undefined;
    const mrpRaw = mrpIdx >= 0 ? row[mrpIdx] : undefined;
    const minStockRaw = minStockIdx >= 0 ? row[minStockIdx] : undefined;
    const monthlyInterestRaw = monthlyInterestIdx >= 0 ? row[monthlyInterestIdx] : undefined;
    const description =
      descriptionIdx >= 0
        ? String(row[descriptionIdx] ?? "").trim() || undefined
        : undefined;
    const image = imageIdx >= 0 ? normalizeImportImage(row[imageIdx]) : undefined;
    const availableBranches =
      availableBranchesIdx >= 0
        ? String(row[availableBranchesIdx] ?? "")
            .split(",")
            .map((branch) => branch.trim())
            .filter(Boolean)
        : undefined;

    if (!name) errors.push("Name is required");
    if (!sku) errors.push("SKU is required");
    if (!category) {
      errors.push("Category is required");
    } else if (!PC_BUILDER_CATEGORIES.includes(category as (typeof PC_BUILDER_CATEGORIES)[number])) {
      errors.push(PC_BUILDER_CATEGORY_ERROR);
    }

    if (sku && duplicateSkus.has(sku)) {
      errors.push("Duplicate SKU in sheet");
    }

    let quantity: number | undefined;
    if (quantityRaw !== undefined && quantityRaw !== "") {
      quantity = Number(quantityRaw);
      if (isNaN(quantity)) {
        errors.push("Quantity must be a valid number");
        quantity = undefined;
      } else if (!Number.isInteger(quantity)) {
        errors.push("Quantity must be an integer");
      } else if (quantity < 0) {
        errors.push("Quantity cannot be negative");
      }
    } else {
      errors.push("Quantity is required");
    }

    let mrp: number | undefined;
    const effectivePriceRaw = mrpRaw !== undefined && mrpRaw !== "" ? mrpRaw : priceRaw;
    if (effectivePriceRaw !== undefined && effectivePriceRaw !== "") {
      mrp = Number(effectivePriceRaw);
      if (isNaN(mrp)) {
        errors.push("MRP must be a valid number");
        mrp = undefined;
      } else if (mrp < 0) {
        errors.push("MRP cannot be negative");
      }
    } else {
      errors.push("MRP is required");
    }

    let minStock: number | undefined;
    if (minStockRaw !== undefined && minStockRaw !== "") {
      minStock = Number(minStockRaw);
      if (isNaN(minStock)) {
        errors.push("Min Stock must be a valid number");
        minStock = undefined;
      } else if (!Number.isInteger(minStock)) {
        errors.push("Min Stock must be an integer");
      } else if (minStock < 0) {
        errors.push("Min Stock cannot be negative");
      }
    } else {
      errors.push("Min Stock is required");
    }

    let monthlyInterest = 0;
    if (monthlyInterestRaw !== undefined && monthlyInterestRaw !== "") {
      monthlyInterest = Number(monthlyInterestRaw);
      if (isNaN(monthlyInterest)) {
        errors.push("Monthly Interest must be a valid number");
        monthlyInterest = 0;
      } else if (monthlyInterest < 0) {
        errors.push("Monthly Interest cannot be negative");
      }
    }

    results.push({
      name: name || undefined,
      sku: sku || undefined,
      category: category || undefined,
      availableBranches,
      quantity,
      mrp,
      minStock,
      monthlyInterest,
      description,
      image,
      errors,
    });
  }

  return results;
}
