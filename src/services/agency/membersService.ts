import { apiClient } from "@/lib/apiClient";
import type {
  CreateMemberPayload,
  MembersFilter,
  OrgMember,
  OrgMemberListResult,
  UpdateMemberPayload,
} from "@/types/member";

function basePath(orgId: string): string {
  return `/api/organizations/${encodeURIComponent(orgId)}`;
}

export function createAdmin(orgId: string, payload: CreateMemberPayload): Promise<OrgMember> {
  return apiClient.post<OrgMember>(`${basePath(orgId)}/admins`, payload);
}

export function createMember(orgId: string, payload: CreateMemberPayload): Promise<OrgMember> {
  return apiClient.post<OrgMember>(`${basePath(orgId)}/members`, payload);
}

export function getMembers(
  orgId: string,
  filters: MembersFilter = {},
): Promise<OrgMemberListResult> {
  return apiClient.get<OrgMemberListResult>(`${basePath(orgId)}/members`, {
    query: {
      role: filters.role,
      status: filters.status,
      search: filters.search,
      page: filters.page,
      limit: filters.limit,
    },
  });
}

export function updateMember(
  orgId: string,
  id: string,
  payload: UpdateMemberPayload,
): Promise<OrgMember> {
  return apiClient.patch<OrgMember>(
    `${basePath(orgId)}/members/${encodeURIComponent(id)}`,
    payload,
  );
}

export function deleteMember(orgId: string, id: string): Promise<{ id: string }> {
  return apiClient.delete<{ id: string }>(
    `${basePath(orgId)}/members/${encodeURIComponent(id)}`,
  );
}
