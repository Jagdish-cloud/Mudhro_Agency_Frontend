import { apiClient } from "@/lib/apiClient";
import type {
  AgencyClientStatus,
  AgencyVendorDto,
  CreateVendorInput,
  ListVendorsResult,
} from "@/types/agencyInvoicing";

function basePath(orgId: string): string {
  return `/api/organizations/${encodeURIComponent(orgId)}/vendors`;
}

export type ListVendorsFilters = {
  search?: string;
  status?: AgencyClientStatus;
  tag?: string;
  page?: number;
  limit?: number;
};

export function listAgencyVendorsApi(
  orgId: string,
  filters: ListVendorsFilters = {},
): Promise<ListVendorsResult> {
  return apiClient.get<ListVendorsResult>(basePath(orgId), {
    query: {
      search: filters.search,
      status: filters.status,
      tag: filters.tag,
      page: filters.page,
      limit: filters.limit,
    },
  });
}

export function getAgencyVendorApi(orgId: string, vendorId: string): Promise<AgencyVendorDto> {
  return apiClient.get<AgencyVendorDto>(`${basePath(orgId)}/${encodeURIComponent(vendorId)}`);
}

export function createAgencyVendorApi(
  orgId: string,
  input: CreateVendorInput,
): Promise<AgencyVendorDto> {
  return apiClient.post<AgencyVendorDto>(basePath(orgId), input);
}

export function updateAgencyVendorApi(
  orgId: string,
  vendorId: string,
  input: Partial<CreateVendorInput>,
): Promise<AgencyVendorDto> {
  return apiClient.patch<AgencyVendorDto>(
    `${basePath(orgId)}/${encodeURIComponent(vendorId)}`,
    input,
  );
}

export function deleteAgencyVendorApi(orgId: string, vendorId: string): Promise<{ id: string }> {
  return apiClient.delete<{ id: string }>(`${basePath(orgId)}/${encodeURIComponent(vendorId)}`);
}
