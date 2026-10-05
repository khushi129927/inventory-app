"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Icon from "@/components/Icon";
import { parseOutstandingExcel, createOutstandingSampleWorkbook, type ParsedOutstandingRow } from "@/lib/outstanding-excel";
import { useImportOutstanding } from "@/hooks/use-outstanding";
import { formatCurrency } from "@/lib/utils";
import type { OutstandingImportResult } from "@/app/types/inventory";
import { toast } from "sonner";

interface UploadOutstandingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function UploadOutstandingDialog({ open, onOpenChange }: UploadOutstandingDialogProps) {
  const [rows, setRows] = React.useState<ParsedOutstandingRow[]>([]);
  const [fileName, setFileName] = React.useState("");
  const [result, setResult] = React.useState<OutstandingImportResult | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const importMutation = useImportOutstanding();

  React.useEffect(() => {
    if (!open) {
      setRows([]);
      setFileName("");
      setResult(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [open]);

  const validRows = React.useMemo(() => rows.filter((row) => row.errors.length === 0), [rows]);
  const invalidRows = React.useMemo(() => rows.filter((row) => row.errors.length > 0), [rows]);

  const readFile = React.useCallback(async (file: File) => {
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls") && !file.name.endsWith(".csv")) {
      toast.error("Please upload a valid Excel file (.xlsx, .xls, .csv)");
      return;
    }

    setFileName(file.name);
    const buffer = await file.arrayBuffer();
    const parsedRows = await parseOutstandingExcel(buffer);
    setRows(parsedRows);
    setResult(null);
  }, []);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    await readFile(file);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }
    await readFile(file);
  };

  const handleImport = async () => {
    if (validRows.length === 0) {
      return;
    }

    const importResult = await importMutation.mutateAsync(
      validRows.map((row) => ({
        "Client Name": row.values["Client Name"],
        Salesperson: row.values.Salesperson,
        "Salesperson Phone": row.values["Salesperson Phone"] ?? "",
        "Invoice No": row.values["Invoice No"],
        "Invoice Date": row.values["Invoice Date"],
        Amount: row.values.Amount,
        "Paid Amount": row.values["Paid Amount"],
        "Credit Days": row.values["Credit Days"],
      }))
    );

    setResult(importResult);
  };

  const handleDownloadSample = async () => {
    const blob = await createOutstandingSampleWorkbook();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "outstanding-sample.xlsx";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] w-[88vw] max-w-[1320px] flex-col overflow-hidden p-0 sm:h-[94vh] sm:max-w-[1320px]">
        <div className="border-b bg-background px-6 py-4">
          <DialogHeader>
            <DialogTitle>Upload Outstanding</DialogTitle>
            <DialogDescription>
              Upload an Excel or CSV file with the columns Client Name, Salesperson, Salesperson Phone,
              Invoice No, Invoice Date, Amount, Paid Amount, and Credit Days.
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
              <Button variant="outline" type="button" onClick={handleDownloadSample}>
                <Icon name="Download" className="mr-1.5 h-4 w-4" />
                Download sample file
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importMutation.isPending}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={validRows.length === 0 || importMutation.isPending}>
                {importMutation.isPending ? (
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
              onDragOver={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
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
                <Icon name="Upload" className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">{fileName || "Click or drag Outstanding file here"}</p>
              <p className="text-xs text-muted-foreground">Supports .xlsx, .xls, .csv formats</p>
            </div>

            {rows.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {invalidRows.length > 0 && (
                  <Alert variant="destructive" className="flex-1">
                    <AlertTitle className="flex items-center gap-2 text-sm">
                      <Icon name="AlertCircle" className="h-4 w-4" />
                      {invalidRows.length} row{invalidRows.length > 1 ? "s have" : " has"} errors
                    </AlertTitle>
                    <AlertDescription className="text-xs">Only valid rows will be sent to the backend.</AlertDescription>
                  </Alert>
                )}
                {validRows.length > 0 && (
                  <Alert className="flex-1 border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400">
                    <AlertTitle className="flex items-center gap-2 text-sm">
                      <Icon name="CheckCircle" className="h-4 w-4" />
                      {validRows.length} valid row{validRows.length > 1 ? "s" : ""} ready to import
                    </AlertTitle>
                    <AlertDescription className="text-xs text-emerald-700 dark:text-emerald-400/90">
                      Upload to create or update outstanding invoices.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {result && (
              <Alert className="border-primary/30 bg-primary/5">
                <AlertTitle className="flex items-center gap-2 text-sm">
                  <Icon name="FileCheck2" className="h-4 w-4" />
                  Import complete
                </AlertTitle>
                <AlertDescription className="space-y-2 text-xs">
                  <p>Created: {result.created} · Updated: {result.updated} · Errors: {result.errors.length}</p>
                  {result.errors.length > 0 && (
                    <ul className="space-y-1">
                      {result.errors.map((error) => (
                        <li key={`${error.row}-${error.message}`}>Row {error.row}: {error.message}</li>
                      ))}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {rows.length > 0 && (
              <div className="max-h-[52vh] overflow-auto rounded-lg border border-border">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-8 text-center">#</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Salesperson</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Credit Days</TableHead>
                      <TableHead className="w-[260px]">Errors</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, index) => {
                      const isValid = row.errors.length === 0;
                      return (
                        <TableRow key={`${row.values["Invoice No"] ?? "row"}-${index}`} className={!isValid ? "bg-red-50 dark:bg-red-950/20" : undefined}>
                          <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
                          <TableCell className="font-medium">{row.values["Client Name"] || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{row.values.Salesperson || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{row.values["Invoice No"] || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{row.values["Invoice Date"] || "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {typeof row.values.Amount === "number" ? formatCurrency(row.values.Amount, "INR - Indian Rupee", 0) : "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {typeof row.values["Paid Amount"] === "number" ? formatCurrency(row.values["Paid Amount"], "INR - Indian Rupee", 0) : "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{row.values["Credit Days"] ?? "—"}</TableCell>
                          <TableCell>
                            {isValid ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                <Icon name="CheckCircle" className="h-3.5 w-3.5" />
                                Valid
                              </span>
                            ) : (
                              <div className="space-y-1 text-red-600 dark:text-red-400">
                                {row.errors.map((error) => (
                                  <div key={error} className="flex items-start gap-1">
                                    <Icon name="XCircle" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                    <span>{error}</span>
                                  </div>
                                ))}
                              </div>
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
