import { apiClient } from "@/lib/apiClient";
import type {
  AgencyClientItemDto,
  CreateClientItemInput,
  SaveInvoiceRowToCatalogInput,
  UpdateClientItemInput,
} from "@/types/agencyInvoicing";

function basePath(orgId: string, clientId: string): string {
  return `/api/organizations/${encodeURIComponent(orgId)}/clients/${encodeURIComponent(clientId)}/items`;
}

export function listClientItemsApi(
  orgId: string,
  clientId: string,
  search?: string,
): Promise<{ items: AgencyClientItemDto[] }> {
  return apiClient.get<{ items: AgencyClientItemDto[] }>(basePath(orgId, clientId), {
    query: { search },
  });
}

export function getClientItemApi(
  orgId: string,
  clientId: string,
  itemId: string,
): Promise<AgencyClientItemDto> {
  return apiClient.get<AgencyClientItemDto>(
    `${basePath(orgId, clientId)}/${encodeURIComponent(itemId)}`,
  );
}

export function createClientItemApi(
  orgId: string,
  clientId: string,
  input: CreateClientItemInput,
): Promise<AgencyClientItemDto> {
  return apiClient.post<AgencyClientItemDto>(basePath(orgId, clientId), input);
}

export function updateClientItemApi(
  orgId: string,
  clientId: string,
  itemId: string,
  input: UpdateClientItemInput,
): Promise<AgencyClientItemDto> {
  return apiClient.patch<AgencyClientItemDto>(
    `${basePath(orgId, clientId)}/${encodeURIComponent(itemId)}`,
    input,
  );
}

export function deleteClientItemApi(
  orgId: string,
  clientId: string,
  itemId: string,
): Promise<{ id: string }> {
  return apiClient.delete<{ id: string }>(
    `${basePath(orgId, clientId)}/${encodeURIComponent(itemId)}`,
  );
}

export function saveInvoiceRowToCatalogApi(
  orgId: string,
  clientId: string,
  input: SaveInvoiceRowToCatalogInput,
): Promise<AgencyClientItemDto> {
  return apiClient.post<AgencyClientItemDto>(
    `${basePath(orgId, clientId)}/save-from-row`,
    input,
  );
}
