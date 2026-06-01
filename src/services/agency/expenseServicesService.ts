import { apiClient } from "@/lib/apiClient";
import type { AgencyExpenseService } from "@/types/agency";

function base(orgId: string): string {
  return `/api/organizations/${encodeURIComponent(orgId)}/expense-services`;
}

export function listExpenseServicesApi(orgId: string): Promise<AgencyExpenseService[]> {
  return apiClient.get<AgencyExpenseService[]>(base(orgId));
}

export function createExpenseServiceApi(
  orgId: string,
  body: { name: string; description?: string; defaultRate?: number },
): Promise<AgencyExpenseService> {
  return apiClient.post<AgencyExpenseService>(base(orgId), body);
}

export function getExpenseServiceApi(orgId: string, serviceId: string): Promise<AgencyExpenseService> {
  return apiClient.get<AgencyExpenseService>(`${base(orgId)}/${encodeURIComponent(serviceId)}`);
}

export function updateExpenseServiceApi(
  orgId: string,
  serviceId: string,
  body: { name?: string; description?: string | null; defaultRate?: number },
): Promise<AgencyExpenseService> {
  return apiClient.put<AgencyExpenseService>(`${base(orgId)}/${encodeURIComponent(serviceId)}`, body);
}

export function deleteExpenseServiceApi(orgId: string, serviceId: string): Promise<{ id: string }> {
  return apiClient.delete<{ id: string }>(`${base(orgId)}/${encodeURIComponent(serviceId)}`);
}
