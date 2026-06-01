import type { AgencyRole } from "@/types/agency";
import {
  ADMIN_INFO_STORAGE_KEY,
  ADMIN_ORG_STORAGE_KEY,
  ADMIN_TOKEN_STORAGE_KEY,
  type UserRoleCode,
} from "@/types/auth";

type StoredAdminInfo = {
  id?: string;
  email?: string;
  name?: string;
  role?: UserRoleCode | AgencyRole;
};

type StoredOrgInfo = {
  id?: string;
  name?: string;
};

export function getAgencyToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
}

export function getStoredAdminInfo(): StoredAdminInfo | null {
  const raw = localStorage.getItem(ADMIN_INFO_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAdminInfo;
  } catch {
    return null;
  }
}

export function getStoredOrganizationInfo(): StoredOrgInfo | null {
  const raw = localStorage.getItem(ADMIN_ORG_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredOrgInfo;
  } catch {
    return null;
  }
}

export function getCurrentOrganizationId(): string | null {
  return getStoredOrganizationInfo()?.id ?? null;
}

export function getCurrentRoleCode(): UserRoleCode {
  const role = getStoredAdminInfo()?.role;
  if (role === 1 || role === 2) return role;
  if (typeof role === "string") {
    if (role === "admin" || role === "super_admin") return 1;
    return 2;
  }
  return 2;
}

export function getCurrentAgencyRole(): AgencyRole {
  const code = getCurrentRoleCode();
  return code === 1 ? "admin" : "member";
}

export function isCurrentUserAdmin(): boolean {
  return getCurrentRoleCode() === 1;
}

export function isAgencyAuthenticated(): boolean {
  const token = getAgencyToken();
  return typeof token === "string" && token.length > 0;
}

export function signOutAgency(): void {
  localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
  localStorage.removeItem(ADMIN_INFO_STORAGE_KEY);
  localStorage.removeItem(ADMIN_ORG_STORAGE_KEY);
}
