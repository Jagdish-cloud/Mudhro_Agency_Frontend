import { apiClient } from "@/lib/apiClient";
import type { OrgMember } from "@/types/member";

export type UpdateSelfProfilePayload = {
  name?: string;
  number?: string;
  designation?: string;
};

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export function getMyProfile(): Promise<OrgMember> {
  return apiClient.get<OrgMember>("/api/auth/me");
}

export function updateMyProfile(payload: UpdateSelfProfilePayload): Promise<OrgMember> {
  return apiClient.patch<OrgMember>("/api/auth/me", payload);
}

export function changeMyPassword(payload: ChangePasswordPayload): Promise<unknown> {
  return apiClient.patch<unknown>("/api/auth/me/password", payload);
}
