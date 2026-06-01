import { apiClient } from "@/lib/apiClient";
import { encodeId } from "@/lib/idCodec";
import type { AgencyExpense, AgencyExpenseLineItem, AgencyExpenseWithVendor } from "@/types/agency";

function root(orgId: string): string {
  return `/api/organizations/${encodeURIComponent(orgId)}`;
}

export function trackExpenseVisitApi(orgId: string): Promise<void> {
  return apiClient.post<void>(`${root(orgId)}/track-expense-visit`, {});
}

export type ListExpensesFilters = {
  from?: string;
  to?: string;
  clientId?: string;
};

export function listExpensesApi(
  orgId: string,
  filters?: ListExpensesFilters,
): Promise<AgencyExpenseWithVendor[]> {
  return apiClient.get<AgencyExpenseWithVendor[]>(`${root(orgId)}/expenses`, {
    query: filters,
  });
}

export function listExpensesByProjectApi(
  orgId: string,
  projectId: string,
): Promise<AgencyExpenseWithVendor[]> {
  return apiClient.get<AgencyExpenseWithVendor[]>(
    `${root(orgId)}/expenses/project/${encodeURIComponent(encodeId(projectId))}`,
  );
}

export type CreateExpenseBody = {
  vendorId: string;
  projectId?: string | null;
  billDate: string;
  dueDate: string;
  billNumber?: string;
  taxPercentage?: number;
  totalAmount?: number;
  additionalNotes?: string;
  items?: Array<{ serviceId: string; quantity: number; unitPrice: number }>;
};

export function createExpenseApi(orgId: string, body: CreateExpenseBody): Promise<AgencyExpense> {
  return apiClient.post<AgencyExpense>(`${root(orgId)}/expenses`, body);
}

export function getExpenseApi(orgId: string, expenseId: string): Promise<AgencyExpense> {
  return apiClient.get<AgencyExpense>(
    `${root(orgId)}/expenses/${encodeURIComponent(encodeId(expenseId))}`,
  );
}

export type UpdateExpenseBody = {
  vendorId?: string;
  projectId?: string | null;
  billDate?: string;
  dueDate?: string;
  billNumber?: string | null;
  taxPercentage?: number;
  totalAmount?: number;
  additionalNotes?: string | null;
  /** Clears receipt on server (blob + DB). Ignored unless `true`. */
  removeAttachment?: boolean;
};

export function updateExpenseApi(
  orgId: string,
  expenseId: string,
  body: UpdateExpenseBody,
): Promise<AgencyExpense> {
  return apiClient.put<AgencyExpense>(
    `${root(orgId)}/expenses/${encodeURIComponent(encodeId(expenseId))}`,
    body,
  );
}

export function deleteExpenseApi(orgId: string, expenseId: string): Promise<{ id: string }> {
  return apiClient.delete<{ id: string }>(
    `${root(orgId)}/expenses/${encodeURIComponent(encodeId(expenseId))}`,
  );
}

export function listExpenseLineItemsApi(
  orgId: string,
  expenseId: string,
): Promise<AgencyExpenseLineItem[]> {
  return apiClient.get<AgencyExpenseLineItem[]>(
    `${root(orgId)}/expenses/${encodeURIComponent(encodeId(expenseId))}/items`,
  );
}

export function createExpenseLineItemApi(
  orgId: string,
  expenseId: string,
  body: { serviceId: string; quantity: number; unitPrice: number },
): Promise<AgencyExpenseLineItem> {
  return apiClient.post<AgencyExpenseLineItem>(
    `${root(orgId)}/expenses/${encodeURIComponent(encodeId(expenseId))}/items`,
    body,
  );
}

export function deleteExpenseLineItemApi(orgId: string, itemId: string): Promise<{ id: string }> {
  return apiClient.delete<{ id: string }>(
    `${root(orgId)}/expense-items/${encodeURIComponent(encodeId(itemId))}`,
  );
}

export function uploadExpenseAttachmentApi(
  orgId: string,
  expenseId: string,
  file: File,
): Promise<AgencyExpense> {
  return apiClient.uploadFile<AgencyExpense>(
    `${root(orgId)}/expenses/${encodeURIComponent(encodeId(expenseId))}/attachment`,
    file,
    { fieldName: "attachment" },
  );
}

export function uploadExpensePdfApi(
  orgId: string,
  expenseId: string,
  pdfBlob: Blob,
  filename: string,
): Promise<AgencyExpense> {
  return apiClient.uploadFile<AgencyExpense>(
    `${root(orgId)}/expenses/${encodeURIComponent(encodeId(expenseId))}/pdf`,
    pdfBlob,
    { fieldName: "expensePdf", filename },
  );
}

export function downloadExpensePdfBlob(orgId: string, expenseId: string): Promise<Blob> {
  return apiClient.downloadBlob(`${root(orgId)}/expenses/${encodeURIComponent(encodeId(expenseId))}/pdf`);
}

export function downloadExpenseAttachmentBlob(orgId: string, expenseId: string): Promise<Blob> {
  return apiClient.downloadBlob(
    `${root(orgId)}/expenses/${encodeURIComponent(encodeId(expenseId))}/attachment`,
  );
}
