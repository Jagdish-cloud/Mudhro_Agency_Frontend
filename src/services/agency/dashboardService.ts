import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import type { AgencyDashboardFilters } from "@/types/agency";

import { mockActivities, mockDashboardMetrics, mockInvoices, mockNotifications } from "./mockData";

export async function getAgencyDashboardData(_filters: AgencyDashboardFilters) {
  const base = getApiBaseUrl();
  if (!base) {
    // TODO: replace with real backend dashboard endpoint.
    return {
      metrics: mockDashboardMetrics,
      reminders: mockNotifications,
      upcomingDueInvoices: mockInvoices,
      recentActivities: mockActivities,
    };
  }

  const res = await fetch(`${base}/api/agency/dashboard`, { method: "GET" });
  if (!res.ok) throw new Error("Unable to load dashboard data.");
  return res.json() as Promise<{
    metrics: typeof mockDashboardMetrics;
    reminders: typeof mockNotifications;
    upcomingDueInvoices: typeof mockInvoices;
    recentActivities: typeof mockActivities;
  }>;
}
