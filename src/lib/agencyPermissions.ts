import type { AgencyRole } from "@/types/agency";

export type AgencyModuleKey =
  | "dashboard"
  | "clients"
  | "vendors"
  | "projects"
  | "expenses"
  | "invoices"
  | "members"
  | "chat";

export type AgencyActionKey = "view" | "create" | "edit" | "delete" | "manage";

type ModulePermissions = Record<AgencyActionKey, boolean>;
type RolePermissionMap = Record<AgencyModuleKey, ModulePermissions>;

const fullAccess: ModulePermissions = {
  view: true,
  create: true,
  edit: true,
  delete: true,
  manage: true,
};

const viewAndOperate: ModulePermissions = {
  view: true,
  create: true,
  edit: true,
  delete: false,
  manage: false,
};

const readOnly: ModulePermissions = {
  view: true,
  create: false,
  edit: false,
  delete: false,
  manage: false,
};

const rolePermissionMatrix: Record<AgencyRole, RolePermissionMap> = {
  super_admin: {
    dashboard: fullAccess,
    clients: fullAccess,
    vendors: fullAccess,
    projects: fullAccess,
    expenses: fullAccess,
    invoices: fullAccess,
    members: fullAccess,
    chat: fullAccess,
  },
  admin: {
    dashboard: fullAccess,
    clients: fullAccess,
    vendors: fullAccess,
    projects: fullAccess,
    expenses: fullAccess,
    invoices: fullAccess,
    members: {
      ...viewAndOperate,
      delete: false,
      manage: true,
    },
    chat: fullAccess,
  },
  manager: {
    dashboard: viewAndOperate,
    clients: viewAndOperate,
    vendors: viewAndOperate,
    projects: viewAndOperate,
    expenses: viewAndOperate,
    invoices: viewAndOperate,
    members: readOnly,
    chat: viewAndOperate,
  },
  member: {
    dashboard: readOnly,
    // Members can view + create + edit clients, invoices, and expenses,
    // but cannot delete or perform admin-only operations (send, record
    // payment, rotate portal token, manage attachments/reminders, etc.).
    clients: viewAndOperate,
    vendors: viewAndOperate,
    projects: readOnly,
    expenses: viewAndOperate,
    invoices: viewAndOperate,
    members: readOnly,
    chat: {
      ...readOnly,
      create: true,
      edit: true,
    },
  },
};

export function getRolePermissionMap(role: AgencyRole): RolePermissionMap {
  return rolePermissionMatrix[role];
}

export function canAccessModule(role: AgencyRole, moduleKey: AgencyModuleKey): boolean {
  return rolePermissionMatrix[role][moduleKey].view;
}

export function canPerformAction(role: AgencyRole, moduleKey: AgencyModuleKey, action: AgencyActionKey): boolean {
  return rolePermissionMatrix[role][moduleKey][action];
}
