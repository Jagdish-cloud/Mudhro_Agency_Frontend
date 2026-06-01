import { apiClient, apiDownloadBlob, apiUploadFile } from "@/lib/apiClient";
import type {
  AgencyAttachmentDto,
  AgencyInvoiceDto,
  AgencyInvoiceStatus,
  AgencyPaymentDto,
  AgencyReminderDto,
  CreateInvoiceInput,
  ListInvoicesResult,
  MonthlyReport,
  PatchAgencyInvoiceInput,
  RecordPaymentInput,
  SendInvoiceInput,
} from "@/types/agencyInvoicing";

import { mockInvoices, mockNotifications } from "./mockData";

function basePath(orgId: string): string {
  return `/api/organizations/${encodeURIComponent(orgId)}/invoices`;
}

export type ListInvoicesFilters = {
  search?: string;
  clientId?: string;
  status?: AgencyInvoiceStatus;
  from?: string;
  to?: string;
  currency?: string;
  createdBy?: string;
  overdue?: boolean;
  page?: number;
  limit?: number;
};

export function listAgencyInvoicesApi(
  orgId: string,
  filters: ListInvoicesFilters = {},
): Promise<ListInvoicesResult> {
  return apiClient.get<ListInvoicesResult>(basePath(orgId), {
    query: {
      search: filters.search,
      clientId: filters.clientId,
      status: filters.status,
      from: filters.from,
      to: filters.to,
      currency: filters.currency,
      createdBy: filters.createdBy,
      overdue: filters.overdue === undefined ? undefined : String(filters.overdue),
      page: filters.page,
      limit: filters.limit,
    },
  });
}

export function getAgencyInvoiceApi(
  orgId: string,
  invoiceId: string,
): Promise<AgencyInvoiceDto> {
  return apiClient.get<AgencyInvoiceDto>(
    `${basePath(orgId)}/${encodeURIComponent(invoiceId)}`,
  );
}

export function createAgencyInvoiceApi(
  orgId: string,
  input: CreateInvoiceInput,
): Promise<AgencyInvoiceDto> {
  return apiClient.post<AgencyInvoiceDto>(basePath(orgId), input);
}

export function updateAgencyInvoiceApi(
  orgId: string,
  invoiceId: string,
  input: PatchAgencyInvoiceInput,
): Promise<AgencyInvoiceDto> {
  return apiClient.patch<AgencyInvoiceDto>(
    `${basePath(orgId)}/${encodeURIComponent(invoiceId)}`,
    input,
  );
}

export function deleteAgencyInvoiceApi(
  orgId: string,
  invoiceId: string,
): Promise<{ id: string }> {
  return apiClient.delete<{ id: string }>(
    `${basePath(orgId)}/${encodeURIComponent(invoiceId)}`,
  );
}

export function sendAgencyInvoiceApi(
  orgId: string,
  invoiceId: string,
  input: SendInvoiceInput = {},
): Promise<{ delivered: boolean; mode: "smtp" | "stub"; messageId?: string; portalUrl?: string }> {
  return apiClient.post(
    `${basePath(orgId)}/${encodeURIComponent(invoiceId)}/send`,
    input,
  );
}

export function downloadAgencyInvoicePdfApi(
  orgId: string,
  invoiceId: string,
): Promise<Blob> {
  return apiDownloadBlob(
    `${basePath(orgId)}/${encodeURIComponent(invoiceId)}/pdf`,
  );
}

export function rotatePortalTokenApi(
  orgId: string,
  invoiceId: string,
): Promise<{ portalToken: string }> {
  return apiClient.post(
    `${basePath(orgId)}/${encodeURIComponent(invoiceId)}/portal-token/rotate`,
  );
}

export function recordInvoicePaymentApi(
  orgId: string,
  invoiceId: string,
  input: RecordPaymentInput,
): Promise<AgencyPaymentDto> {
  return apiClient.post<AgencyPaymentDto>(
    `${basePath(orgId)}/${encodeURIComponent(invoiceId)}/payments`,
    input,
  );
}

export function listInvoicePaymentsApi(
  orgId: string,
  invoiceId: string,
): Promise<AgencyPaymentDto[]> {
  return apiClient.get<AgencyPaymentDto[]>(
    `${basePath(orgId)}/${encodeURIComponent(invoiceId)}/payments`,
  );
}

export function listInvoiceRemindersApi(
  orgId: string,
  invoiceId: string,
): Promise<AgencyReminderDto[]> {
  return apiClient.get<AgencyReminderDto[]>(
    `${basePath(orgId)}/${encodeURIComponent(invoiceId)}/reminders`,
  );
}

export function createInvoiceReminderApi(
  orgId: string,
  invoiceId: string,
  input: {
    type?: "before_due" | "on_due" | "overdue" | "custom";
    scheduledFor: string;
    channel?: "email" | "in_app";
    offsetDays?: number;
  },
): Promise<AgencyReminderDto> {
  return apiClient.post<AgencyReminderDto>(
    `${basePath(orgId)}/${encodeURIComponent(invoiceId)}/reminders`,
    input,
  );
}

export function cancelInvoiceReminderApi(
  orgId: string,
  invoiceId: string,
  reminderId: string,
): Promise<{ id: string }> {
  return apiClient.delete<{ id: string }>(
    `${basePath(orgId)}/${encodeURIComponent(invoiceId)}/reminders/${encodeURIComponent(
      reminderId,
    )}`,
  );
}

export function listInvoiceAttachmentsApi(
  orgId: string,
  invoiceId: string,
): Promise<AgencyAttachmentDto[]> {
  return apiClient.get<AgencyAttachmentDto[]>(
    `${basePath(orgId)}/${encodeURIComponent(invoiceId)}/attachments`,
  );
}

export function uploadInvoiceAttachmentApi(
  orgId: string,
  invoiceId: string,
  file: File,
): Promise<AgencyAttachmentDto> {
  return apiUploadFile<AgencyAttachmentDto>(
    `${basePath(orgId)}/${encodeURIComponent(invoiceId)}/attachments`,
    file,
  );
}

export function downloadInvoiceAttachmentApi(
  orgId: string,
  invoiceId: string,
  attachmentId: string,
): Promise<Blob> {
  return apiDownloadBlob(
    `${basePath(orgId)}/${encodeURIComponent(invoiceId)}/attachments/${encodeURIComponent(
      attachmentId,
    )}/download`,
  );
}

export function deleteInvoiceAttachmentApi(
  orgId: string,
  invoiceId: string,
  attachmentId: string,
): Promise<{ id: string }> {
  return apiClient.delete<{ id: string }>(
    `${basePath(orgId)}/${encodeURIComponent(invoiceId)}/attachments/${encodeURIComponent(
      attachmentId,
    )}`,
  );
}

export function getMonthlyReportApi(orgId: string, month?: string): Promise<MonthlyReport> {
  return apiClient.get<MonthlyReport>(
    `/api/organizations/${encodeURIComponent(orgId)}/reports/monthly`,
    { query: { month } },
  );
}

// Legacy mock-backed helpers retained for pages that consume the legacy
// AgencyInvoice shape (dashboard, etc.). Pages that need live data should
// use the `*Api` functions above.

export async function listAgencyInvoices() {
  return mockInvoices;
}

export async function getInvoiceReminderNotifications() {
  return mockNotifications;
}
