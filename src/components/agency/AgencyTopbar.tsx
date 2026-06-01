import { Building2, Menu, UserRound } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getStoredAdminInfo, getStoredOrganizationInfo } from "@/lib/agencyAuth";

type AgencyTopbarProps = {
  onOpenMobileMenu: () => void;
  onToggleCollapse: () => void;
};

export function AgencyTopbar({ onOpenMobileMenu, onToggleCollapse }: AgencyTopbarProps) {
  const orgName = getStoredOrganizationInfo()?.name ?? "Organization";
  const admin = getStoredAdminInfo();
  const adminName = admin?.name ?? admin?.email ?? "Account";
  const isAdmin = admin?.role === 1 || admin?.role === "admin" || admin?.role === "super_admin";

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="flex min-h-16 items-center justify-between gap-2 px-4 py-2 lg:px-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="lg:hidden" onClick={onOpenMobileMenu} aria-label="Open sidebar menu">
            <Menu className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="hidden lg:inline-flex" onClick={onToggleCollapse} aria-label="Toggle sidebar">
            <Menu className="h-4 w-4" />
          </Button>
          <Link
            to="/agency/organization"
            className="hidden items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 transition-colors hover:bg-secondary sm:flex"
          >
            <Building2 className="h-4 w-4 text-primary" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Active Organization</p>
              <p className="truncate text-sm font-medium">{orgName}</p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {/* <Button asChild size="sm" variant="outline">
            <Link to="/agency/clients">
              <Plus className="h-4 w-4" />
              New Client
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="hidden sm:inline-flex">
            <Link to="/agency/projects">
              <Plus className="h-4 w-4" />
              New Project
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/agency/invoices">
              <Plus className="h-4 w-4" />
              New Invoice
            </Link>
          </Button> */}
          <Link
            to="/agency/profile"
            className="hidden items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 transition-colors hover:bg-secondary md:flex"
            aria-label="Open profile"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserRound className="h-4 w-4" />
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-medium">{adminName}</span>
              {isAdmin ? (
                <Badge variant="admin">Admin</Badge>
              ) : (
                <Badge variant="member">Member</Badge>
              )}
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
