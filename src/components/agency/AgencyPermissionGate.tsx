import type { ReactNode } from "react";

import { getCurrentAgencyRole } from "@/lib/agencyAuth";
import { canPerformAction, type AgencyActionKey, type AgencyModuleKey } from "@/lib/agencyPermissions";

type AgencyPermissionGateProps = {
  moduleKey: AgencyModuleKey;
  action?: AgencyActionKey;
  fallback?: ReactNode;
  children: ReactNode;
};

export function AgencyPermissionGate({ moduleKey, action = "view", fallback = null, children }: AgencyPermissionGateProps) {
  const role = getCurrentAgencyRole();
  const allowed = canPerformAction(role, moduleKey, action);

  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
