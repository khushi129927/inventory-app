import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  apiGetOutstandingClient,
  apiGetOutstandingClients,
  apiGetOutstandingNotifications,
  apiGetOutstandingSummary,
  apiGetPublicOutstanding,
  apiGetSalesPeople,
  apiImportOutstanding,
  apiRevokeOutstandingLinks,
  apiSendOutstandingTestMessage,
  apiUpdateOutstandingClient,
  apiUpdateSalesPerson,
} from "@/lib/api";

export function useOutstandingSummary() {
  return useQuery({
    queryKey: ["outstanding", "summary"],
    queryFn: apiGetOutstandingSummary,
  });
}

export function useOutstandingClients(filters: {
  salesPersonId?: string | null;
  search?: string | null;
  status?: "overdue" | "due_soon" | "not_due" | null;
}) {
  return useQuery({
    queryKey: ["outstanding", "clients", filters],
    queryFn: () => apiGetOutstandingClients(filters).then((res) => res.clients),
  });
}

export function useOutstandingClient(id: string | null) {
  return useQuery({
    queryKey: ["outstanding", "client", id],
    queryFn: () => apiGetOutstandingClient(id as string).then((res) => res.client),
    enabled: Boolean(id),
  });
}

export function useSalesPeople() {
  return useQuery({
    queryKey: ["salesPeople"],
    queryFn: () => apiGetSalesPeople().then((res) => res.salesPeople),
  });
}

export function useImportOutstanding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiImportOutstanding,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["outstanding"] });
      queryClient.invalidateQueries({ queryKey: ["salesPeople"] });
      const summary = `Imported ${result.created} new invoice(s), updated ${result.updated} invoice(s).`;
      if (result.errors.length > 0) {
        toast.error(`${summary} ${result.errors.length} row(s) failed.`, {
          description: result.errors
            .slice(0, 3)
            .map((item) => `Row ${item.row}: ${item.message}`)
            .join(", ") + (result.errors.length > 3 ? "..." : ""),
        });
        return;
      }
      toast.success(summary);
    },
    onError: (error: any) => toast.error(error.message),
  });
}

export function useUpdateOutstandingClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { creditDays?: number; salesPersonId?: string | null; applyToOpenInvoices?: boolean } }) =>
      apiUpdateOutstandingClient(id, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["outstanding"] });
      queryClient.invalidateQueries({ queryKey: ["outstanding", "client", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["salesPeople"] });
      toast.success("Client outstanding settings updated");
    },
    onError: (error: any) => toast.error(error.message),
  });
}

export function useOutstandingNotifications(filters: {
  salesPersonId?: string | null;
  status?: "queued" | "retrying" | "failed" | "sent" | "dry_run" | "skipped" | null;
  page: number;
  pageSize: number;
}) {
  return useQuery({
    queryKey: ["outstanding", "notifications", filters],
    queryFn: () => apiGetOutstandingNotifications(filters),
  });
}

function getTestMessageSuccessText(result: { sent?: number } | null | undefined) {
  const sent = Number(result?.sent ?? 0);

  if (sent >= 2) {
    return "Dry run: test messages logged for whatsapp and sms, nothing was sent";
  }

  if (sent === 1) {
    return "Dry run: message logged, nothing was sent";
  }

  return "Test message request completed";
}

function getTestMessageErrorText(error: unknown) {
  const fallback = "Failed to send test message";
  const message = error instanceof Error ? error.message : fallback;

  if (/Manual test limit reached/i.test(message)) {
    return "You can send up to 5 test messages per salesperson per hour. Please try again later.";
  }

  if (/notifications are disabled/i.test(message)) {
    return "Skipped: notifications are disabled for this salesperson.";
  }

  if (/phone is missing/i.test(message)) {
    return "Skipped: salesperson phone number is missing.";
  }

  if (/failed/i.test(message) || /error/i.test(message)) {
    return message;
  }

  return message || fallback;
}

export function useSendOutstandingTestMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (salesPersonId: string) => apiSendOutstandingTestMessage(salesPersonId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["outstanding", "notifications"] });
      toast.success(getTestMessageSuccessText(result));
    },
    onError: (error: unknown) => {
      const message = getTestMessageErrorText(error);
      if (/^Skipped:/.test(message) || /Failed/i.test(message) || /try again later/i.test(message)) {
        toast.error(message);
        return;
      }
      toast.error(message);
    },
  });
}

export function useRevokeOutstandingLinks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (salesPersonId: string) => apiRevokeOutstandingLinks(salesPersonId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["outstanding", "notifications"] });
      toast.success(`Revoked ${result.revoked} outstanding link${result.revoked === 1 ? "" : "s"}`);
    },
    onError: (error: any) => toast.error(error.message),
  });
}

export function useUpdateSalesPerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { phone?: string | null; notifyChannel?: "sms" | "whatsapp" | "both" | "none"; active?: boolean } }) =>
      apiUpdateSalesPerson(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salesPeople"] });
      queryClient.invalidateQueries({ queryKey: ["outstanding"] });
      toast.success("Salesperson settings updated");
    },
    onError: (error: any) => toast.error(error.message),
  });
}

export function usePublicOutstanding(token: string) {
  return useQuery({
    queryKey: ["public", "outstanding", token],
    queryFn: () => apiGetPublicOutstanding(token),
    enabled: Boolean(token),
    retry: false,
  });
}
