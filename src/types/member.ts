import type { UserRoleCode } from "@/types/auth";

export type OrgMemberStatus = "active" | "inactive";

export type OrgMember = {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  number: string;
  designation: string;
  role: UserRoleCode;
  status: OrgMemberStatus;
  createdAt: string;
  updatedAt: string;
};

export type OrgMemberListResult = {
  items: OrgMember[];
  total: number;
  page: number;
  limit: number;
};

export type CreateMemberPayload = {
  name: string;
  email: string;
  number: string;
  designation: string;
  password: string;
};

export type UpdateMemberPayload = {
  name?: string;
  number?: string;
  designation?: string;
  status?: OrgMemberStatus;
  role?: UserRoleCode;
};

export type MembersFilter = {
  role?: UserRoleCode;
  status?: OrgMemberStatus;
  search?: string;
  page?: number;
  limit?: number;
};
