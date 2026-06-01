import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { isAgencyAuthenticated } from "@/lib/agencyAuth";

type RequireAgencyAuthProps = {
  children?: ReactNode;
};

export function RequireAgencyAuth({ children }: RequireAgencyAuthProps) {
  const location = useLocation();

  if (!isAgencyAuthenticated()) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  }

  if (children) return <>{children}</>;
  return <Outlet />;
}
