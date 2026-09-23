"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { parseProductExcel, type ParsedProductRow } from "@/lib/excel-parser";
import type { Product, ProductStatus, Category } from "@/app/types/inventory";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Icon from "@/components/Icon";
import { apiBulkImportProducts } from "@/lib/api";

interface ExcelUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function deriveStatus(quantity: number, minStock: number): ProductStatus {
  if (quantity === 0) return "out-of-stock";
  if (quantity <= minStock) return "low-stock";
  return "in-stock";
}

export default function ExcelUploadDialog({
  open,
  onOpenChange,
}: ExcelUploadDialogProps) {
  const queryClient = useQueryClient();
  const [rows, setRows] = React.useState<ParsedProductRow[]>([]);
  const [fileName, setFileName] = React.useState<string>("");
  const [importing, setImporting] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setRows([]);
      setFileName("");
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [open]);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const buffer = await file.arrayBuffer();
    const parsed = await parseProductExcel(buffer);
    setRows(parsed);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (
      !file.name.endsWith(".xlsx") &&
      !file.name.endsWith(".xls") &&
      !file.name.endsWith(".csv")
    ) {
      toast.error("Please upload a valid Excel file (.xlsx, .xls, .csv)");
      return;
    }

    setFileName(file.name);
    const buffer = await file.arrayBuffer();
    const parsed = await parseProductExcel(buffer);
    setRows(parsed);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const validRows = React.useMemo(
    () => rows.filter((r) => r.errors.length === 0),
    [rows]
  );
  const invalidRows = React.useMemo(
    () => rows.filter((r) => r.errors.length > 0),
    [rows]
  );

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);

    try {
      // Convert ParsedProductRow to the format expected by the API
      const rowsToImport = validRows.map(row => ({
        name: row.name!,
        sku: row.sku!,
        category: row.category!,
        quantity: row.quantity!,
        price: row.price!,
        minStock: row.minStock!,
        monthlyInterest: row.monthlyInterest,
        description: row.description || "",
        image: row.image || "",
        availableBranches: row.availableBranches || [],
      }));

      const results = await apiBulkImportProducts(rowsToImport);

      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });

      toast.success(`Imported ${results.updated} product(s)`);
      onOpenChange(false);
    } catch (err: any) {
      console.error("Import error:", err);
      toast.error(err.message || "Failed to import products");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] w-[88vw] max-w-[1320px] flex-col overflow-hidden p-0 sm:h-[94vh] sm:max-w-[1320px]">
        <div className="border-b bg-background px-6 py-4">
          <DialogHeader>
            <DialogTitle>Bulk Import Products</DialogTitle>
            <DialogDescription>
              Upload an Excel file to import products. Required columns: Name,
              SKU, Category, Quantity, Price, Min Stock. Supported Category
              values for the PC builder are: CPU, Motherboard, RAM, SSD, GPU,
              Cooler, Cabinet, SMPS, UPS, Monitor, Other.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="sticky top-0 z-10 border-b bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {rows.length > 0
                ? `${validRows.length} valid row${validRows.length === 1 ? "" : "s"} ready · ${invalidRows.length} invalid`
                : "Upload a file to preview rows before importing."}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={importing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={validRows.length === 0 || importing}
              >
                {importing ? (
                  <>
                    <Icon name="Loader2" className="mr-1.5 h-4 w-4 animate-spin" />
                    Importing…
                  </>
                ) : (
                  <>
                    <Icon name="Import" className="mr-1.5 h-4 w-4" />
                    Import {validRows.length > 0 && `(${validRows.length})`}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 px-6 py-10 transition-colors hover:bg-muted/50"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Icon
                name="Upload"
                className="h-5 w-5 text-muted-foreground"
              />
            </div>
            <p className="text-sm font-medium text-foreground">
              {fileName || "Click or drag Excel file here"}
            </p>
            <p className="text-xs text-muted-foreground">
              Supports .xlsx, .xls formats
            </p>
          </div>

          {rows.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {invalidRows.length > 0 && (
                <Alert variant="destructive" className="flex-1">
                  <AlertTitle className="flex items-center gap-2 text-sm">
                    <Icon name="AlertCircle" className="h-4 w-4" />
                    {invalidRows.length} row
                    {invalidRows.length > 1 ? "s have" : " has"} errors
                  </AlertTitle>
                  <AlertDescription className="text-xs">
                    Please fix the highlighted rows before importing.
                  </AlertDescription>
                </Alert>
              )}
              {validRows.length > 0 && (
                <Alert className="flex-1 border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400">
                  <AlertTitle className="flex items-center gap-2 text-sm">
                    <Icon name="CheckCircle" className="h-4 w-4" />
                    {validRows.length} valid row
                    {validRows.length > 1 ? "s" : ""} ready to import
                  </AlertTitle>
                  <AlertDescription className="text-xs text-emerald-700 dark:text-emerald-400/90">
                    Click Import to add these products to inventory.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {rows.length > 0 && (
            <div className="max-h-[52vh] overflow-auto rounded-lg border border-border">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-8 text-center">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Min</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[260px]">Errors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, idx) => {
                    const isValid = row.errors.length === 0;
                    return (
                      <TableRow
                        key={idx}
                        className={
                          !isValid
                            ? "bg-red-50 dark:bg-red-950/20"
                            : undefined
                        }
                      >
                        <TableCell className="text-center text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          {row.name || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.sku || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.category || "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.quantity ?? "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.price !== undefined
                            ? `$${row.price.toFixed(2)}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.minStock ?? "—"}
                        </TableCell>
                        <TableCell>
                          {isValid ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                              <Icon name="CheckCircle" className="h-3.5 w-3.5" />
                              Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                              <Icon name="XCircle" className="h-3.5 w-3.5" />
                              Invalid
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {row.errors.length > 0 ? (
                            <ul className="list-inside list-disc space-y-0.5 text-red-600 dark:text-red-400">
                              {row.errors.map((err, i) => (
                                <li key={i}>{err}</li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
