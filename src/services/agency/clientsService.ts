import { apiClient } from "@/lib/apiClient";
import type {
  AgencyClientDto,
  AgencyClientStatus,
  CreateClientInput,
  ListClientsResult,
} from "@/types/agencyInvoicing";

import { mockClients, mockInvoices, mockProjects } from "./mockData";

function basePath(orgId: string): string {
  return `/api/organizations/${encodeURIComponent(orgId)}/clients`;
}

export type ListClientsFilters = {
  search?: string;
  status?: AgencyClientStatus;
  tag?: string;
  page?: number;
  limit?: number;
};

export function listAgencyClientsApi(
  orgId: string,
  filters: ListClientsFilters = {},
): Promise<ListClientsResult> {
  return apiClient.get<ListClientsResult>(basePath(orgId), {
    query: {
      search: filters.search,
      status: filters.status,
      tag: filters.tag,
      page: filters.page,
      limit: filters.limit,
    },
  });
}

export function getAgencyClientApi(
  orgId: string,
  clientId: string,
): Promise<AgencyClientDto> {
  return apiClient.get<AgencyClientDto>(
    `${basePath(orgId)}/${encodeURIComponent(clientId)}`,
  );
}

export function createAgencyClientApi(
  orgId: string,
  input: CreateClientInput,
): Promise<AgencyClientDto> {
  return apiClient.post<AgencyClientDto>(basePath(orgId), input);
}

export function updateAgencyClientApi(
  orgId: string,
  clientId: string,
  input: Partial<CreateClientInput>,
): Promise<AgencyClientDto> {
  return apiClient.patch<AgencyClientDto>(
    `${basePath(orgId)}/${encodeURIComponent(clientId)}`,
    input,
  );
}

export function deleteAgencyClientApi(
  orgId: string,
  clientId: string,
): Promise<{ id: string }> {
  return apiClient.delete<{ id: string }>(
    `${basePath(orgId)}/${encodeURIComponent(clientId)}`,
  );
}

// Legacy mock-backed helpers used by pages that have not yet been migrated
// to the DTO shape. Kept to avoid regressing existing UX while the module
// rolls out across the app.

export async function listAgencyClients(search = "") {
  const term = search.trim().toLowerCase();
  return mockClients.filter((client) =>
    term ? client.name.toLowerCase().includes(term) : true,
  );
}

export async function getAgencyClientDetails(clientId: string) {
  const client = mockClients.find((entry) => entry.id === clientId);
  if (!client) throw new Error("Client not found.");
  return {
    client,
    projects: mockProjects.filter((project) => project.clientId === clientId),
    invoices: mockInvoices.filter((invoice) => invoice.clientId === clientId),
    expenses: [],
    reminders: mockInvoices.flatMap((invoice) => invoice.reminders),
  };
}
