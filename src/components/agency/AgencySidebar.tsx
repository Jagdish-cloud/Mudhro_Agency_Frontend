import { BarChart3, Bell, BriefcaseBusiness, CircleDollarSign, ClipboardList, LayoutDashboard, LogOut, MessageSquare, Store, Users, X } from "lucide-react";
import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { NavLink, useMatch, useNavigate, useResolvedPath } from "react-router-dom";

import { getCurrentOrganizationId, getStoredOrganizationInfo, signOutAgency } from "@/lib/agencyAuth";
import { cn } from "@/lib/utils";
import { getMonthlyReportApi } from "@/services/agency/invoicesService";
import { fetchUnreadSummary } from "@/services/internalChatApi";

export type AgencySidebarItem = {
  label: string;
  to: string;
  icon: ComponentType<{ className?: string }>;
  badgeCount?: number;
};

type AgencySidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

export const agencyNavItems: AgencySidebarItem[] = [
  { label: "Dashboard", to: "/agency", icon: LayoutDashboard },
  { label: "Clients", to: "/agency/clients", icon: Users },
  { label: "Vendors", to: "/agency/vendors", icon: Store },
  { label: "Projects", to: "/agency/projects", icon: BriefcaseBusiness },
  { label: "Expenses", to: "/agency/expenses", icon: CircleDollarSign },
  { label: "Invoices", to: "/agency/invoices", icon: ClipboardList },
  { label: "Reports", to: "/agency/reports", icon: BarChart3 },
  { label: "Members", to: "/agency/members", icon: Users },
  { label: "Chat", to: "/agency/chat", icon: MessageSquare },
];

function SidebarLink({ item, collapsed, onNavigate }: { item: AgencySidebarItem; collapsed: boolean; onNavigate?: () => void }) {
  const resolved = useResolvedPath(item.to);
  const exactMatch = useMatch({ path: resolved.pathname, end: true });
  const partialMatch = useMatch({ path: resolved.pathname, end: false });
  const shouldBeActive = item.to === "/agency" ? Boolean(exactMatch) : Boolean(partialMatch);

  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all",
        collapsed ? "justify-center" : "",
        shouldBeActive ? "bg-primary text-primary-foreground shadow-[0_0_20px_hsla(222,47%,18%,0.28)]" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {!collapsed ? <span className="truncate">{item.label}</span> : null}
      {item.badgeCount ? (
        <span className={cn("ml-auto rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground", collapsed ? "absolute -right-1 -top-1 ml-0 px-1.5" : "")}>
          {item.badgeCount}
        </span>
      ) : null}
    </NavLink>
  );
}

export function AgencySidebar({ collapsed, mobileOpen, onCloseMobile }: AgencySidebarProps) {
  const navigate = useNavigate();
  const orgName = getStoredOrganizationInfo()?.name ?? "Organization";
  const orgId = getCurrentOrganizationId();
  const [overdueCount, setOverdueCount] = useState(0);

  const unreadQ = useQuery({
    queryKey: ["internal-chat", "unread", orgId],
    queryFn: () => fetchUnreadSummary(orgId!),
    enabled: Boolean(orgId),
    refetchInterval: 45_000,
  });
  const chatUnread = unreadQ.data?.totalUnreadMessages ?? 0;

  useEffect(() => {
    if (!orgId) return;
    getMonthlyReportApi(orgId)
      .then((r) => setOverdueCount(r.overdueCount))
      .catch(() => setOverdueCount(0));
  }, [orgId]);

  const navItems = agencyNavItems.map((item) => {
    if (item.to === "/agency/invoices" && overdueCount > 0) return { ...item, badgeCount: overdueCount };
    if (item.to === "/agency/chat" && chatUnread > 0) return { ...item, badgeCount: chatUnread };
    return item;
  });

  const handleSignOut = () => {
    signOutAgency();
    onCloseMobile();
    navigate("/sign-in", { replace: true });
  };

  return (
    <>
      {mobileOpen ? <button className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onCloseMobile} aria-label="Close menu" /> : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-card transition-all lg:static lg:z-auto",
          "before:absolute before:inset-y-0 before:right-0 before:w-[3px] before:bg-gradient-to-b before:from-sky-400 before:to-indigo-500",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          collapsed ? "w-20" : "w-72",
        )}
      >
        <div className="flex h-17.5 items-center justify-between border-b border-border px-4">
          <div className={cn("min-w-0", collapsed && "hidden")}>
            <p className="text-sm text-muted-foreground">Organization</p>
            <p className="truncate text-base font-semibold">{orgName}</p>
          </div>
          <button className="rounded-md p-2 text-muted-foreground hover:bg-secondary lg:hidden" onClick={onCloseMobile} aria-label="Close sidebar">
            <X className="h-4 w-4" />
          </button>
          {collapsed ? (
            <div className="mx-auto hidden h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground lg:flex">
              <Bell className="h-4 w-4" />
            </div>
          ) : null}
        </div>
        <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
          {navItems.map((item) => (
            <SidebarLink key={item.to} item={item} collapsed={collapsed} onNavigate={onCloseMobile} />
          ))}
          <button
            type="button"
            onClick={handleSignOut}
            title={collapsed ? "Sign out" : undefined}
            className={cn(
              "group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-all hover:bg-secondary hover:text-foreground",
              collapsed ? "justify-center" : "",
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed ? <span className="truncate">Sign out</span> : null}
          </button>
        </nav>
      </aside>
    </>
  );
}
