import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const CURRENCY_CODE_BY_LABEL: Record<string, string> = {
  "USD - United States Dollar": "USD",
  "INR - Indian Rupee": "INR",
  "EUR - Euro": "EUR",
  "GBP - British Pound": "GBP",
  "AED - UAE Dirham": "AED",
};

export function getCurrencyCode(currency: string): string {
  if (!currency) {
    return "USD";
  }

  if (CURRENCY_CODE_BY_LABEL[currency]) {
    return CURRENCY_CODE_BY_LABEL[currency];
  }

  const [prefix] = currency.split(" - ");
  return prefix?.trim() || "USD";
}

export function formatCurrency(value: number, currency: string, maximumFractionDigits = 0): string {
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: getCurrencyCode(currency),
    maximumFractionDigits,
  });
}

export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      const success = document.execCommand("copy");
      document.body.removeChild(textArea);
      if (!success) {
        throw new Error("Copy failed");
      }
    } catch {
      document.body.removeChild(textArea);
      throw new Error("Copy failed");
    }
  }
}
