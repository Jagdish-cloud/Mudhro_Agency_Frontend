import { apiClient } from "@/lib/apiClient";
import type {
  AgencyVendorItemDto,
  CreateVendorItemInput,
  UpdateVendorItemInput,
} from "@/types/agencyInvoicing";

function basePath(orgId: string, vendorId: string): string {
  return `/api/organizations/${encodeURIComponent(orgId)}/vendors/${encodeURIComponent(vendorId)}/items`;
}

export function listVendorItemsApi(
  orgId: string,
  vendorId: string,
  search?: string,
): Promise<{ items: AgencyVendorItemDto[] }> {
  return apiClient.get<{ items: AgencyVendorItemDto[] }>(basePath(orgId, vendorId), {
    query: search ? { search } : undefined,
  });
}

export function getVendorItemApi(
  orgId: string,
  vendorId: string,
  itemId: string,
): Promise<AgencyVendorItemDto> {
  return apiClient.get<AgencyVendorItemDto>(
    `${basePath(orgId, vendorId)}/${encodeURIComponent(itemId)}`,
  );
}

export function createVendorItemApi(
  orgId: string,
  vendorId: string,
  input: CreateVendorItemInput,
): Promise<AgencyVendorItemDto> {
  return apiClient.post<AgencyVendorItemDto>(basePath(orgId, vendorId), input);
}

export function updateVendorItemApi(
  orgId: string,
  vendorId: string,
  itemId: string,
  input: UpdateVendorItemInput,
): Promise<AgencyVendorItemDto> {
  return apiClient.patch<AgencyVendorItemDto>(
    `${basePath(orgId, vendorId)}/${encodeURIComponent(itemId)}`,
    input,
  );
}

export function deleteVendorItemApi(
  orgId: string,
  vendorId: string,
  itemId: string,
): Promise<{ id: string }> {
  return apiClient.delete<{ id: string }>(
    `${basePath(orgId, vendorId)}/${encodeURIComponent(itemId)}`,
  );
}
