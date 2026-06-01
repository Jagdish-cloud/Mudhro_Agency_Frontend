import { apiClient } from "@/lib/apiClient";
import { getCurrentOrganizationId } from "@/lib/agencyAuth";
import type { AgencyClient, AgencyProject, ProjectStatus } from "@/types/agency";
import type { AgencyClientDto } from "@/types/agencyInvoicing";

import { listAgencyClientsApi } from "./clientsService";
import type {
  AgencyProjectStatus,
  CreateProjectInput,
  ProjectDto,
  ProjectListItemDto,
  UpdateProjectInput,
} from "@/types/agency/project";

function base(orgId: string): string {
  return `/api/organizations/${encodeURIComponent(orgId)}/projects`;
}

export type ListProjectsFilters = {
  status?: AgencyProjectStatus;
  search?: string;
};

export function listAgencyProjectsApi(
  orgId: string,
  filters: ListProjectsFilters = {},
): Promise<ProjectListItemDto[]> {
  return apiClient.get<ProjectListItemDto[]>(base(orgId), {
    query: {
      status: filters.status,
      search: filters.search,
    },
  });
}

export function createAgencyProjectApi(
  orgId: string,
  input: CreateProjectInput,
): Promise<ProjectDto> {
  return apiClient.post<ProjectDto>(base(orgId), input);
}

export function getAgencyProjectApi(orgId: string, projectId: string): Promise<ProjectDto> {
  return apiClient.get<ProjectDto>(`${base(orgId)}/${encodeURIComponent(projectId)}`);
}

export function updateAgencyProjectApi(
  orgId: string,
  projectId: string,
  input: UpdateProjectInput,
): Promise<ProjectDto> {
  return apiClient.patch<ProjectDto>(`${base(orgId)}/${encodeURIComponent(projectId)}`, input);
}

export function deleteAgencyProjectApi(
  orgId: string,
  projectId: string,
): Promise<{ id: string }> {
  return apiClient.delete<{ id: string }>(`${base(orgId)}/${encodeURIComponent(projectId)}`);
}

export function listProjectClientsApi(
  orgId: string,
  projectId: string,
): Promise<AgencyClientDto[]> {
  return apiClient.get<AgencyClientDto[]>(
    `${base(orgId)}/${encodeURIComponent(projectId)}/clients`,
  );
}

export function replaceProjectClientsApi(
  orgId: string,
  projectId: string,
  clientIds: string[],
): Promise<AgencyClientDto[]> {
  return apiClient.post<AgencyClientDto[]>(
    `${base(orgId)}/${encodeURIComponent(projectId)}/clients`,
    { clientIds },
  );
}

export function removeProjectClientApi(
  orgId: string,
  projectId: string,
  clientId: string,
): Promise<{ projectId: string; clientId: string }> {
  return apiClient.delete<{ projectId: string; clientId: string }>(
    `${base(orgId)}/${encodeURIComponent(projectId)}/clients/${encodeURIComponent(clientId)}`,
  );
}

function mapProjectStatus(status: AgencyProjectStatus): ProjectStatus {
  switch (status) {
    case "on-hold":
      return "on_hold";
    case "active":
    case "completed":
    case "cancelled":
      return status;
    default:
      return "active";
  }
}

function dtoToAgencyClient(d: AgencyClientDto): AgencyClient {
  return {
    id: d.id,
    organizationId: d.organizationId,
    name: d.name,
    contactName: d.contactName ?? "",
    email: d.email ?? "",
    phone: d.phone ?? "",
    status: d.status,
    billingAddress: d.billingAddress ?? "",
    gstNumber: d.gstNumber,
    notes: d.notes ?? undefined,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

/** @deprecated Prefer `listAgencyProjectsApi` — kept for dashboard/expenses until migrated. */
export async function listAgencyProjects(): Promise<AgencyProject[]> {
  const orgId = getCurrentOrganizationId();
  if (!orgId) return [];
  try {
    const rows = await listAgencyProjectsApi(orgId);
    return rows.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      clientId: "",
      name: r.name,
      startDate: r.startDate ?? "",
      endDate: r.endDate ?? undefined,
      budget: r.budget ?? 0,
      status: mapProjectStatus(r.status),
      agreement: undefined,
      billedAmount: 0,
      receivedAmount: 0,
      pendingAmount: 0,
      expensesAmount: 0,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  } catch {
    return [];
  }
}

/** @deprecated Prefer `listAgencyClientsApi` — kept for legacy pages. */
export async function listClientOptions(): Promise<AgencyClient[]> {
  const orgId = getCurrentOrganizationId();
  if (!orgId) return [];
  try {
    const res = await listAgencyClientsApi(orgId, { page: 1, limit: 500 });
    return res.items.map(dtoToAgencyClient);
  } catch {
    return [];
  }
}
