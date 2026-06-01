import { useEffect, useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAgencyDashboardData } from "@/services/agency/dashboardService";
import { listAgencyClients } from "@/services/agency/clientsService";
import { mockMembers } from "@/services/agency/mockData";
import { listAgencyProjects } from "@/services/agency/projectsService";
import type { AgencyActivity, AgencyClient, AgencyDashboardFilters, AgencyDashboardMetrics, AgencyMember, AgencyNotification, AgencyProject } from "@/types/agency";

const defaultFilters: AgencyDashboardFilters = {
  dateRange: "30d",
  clientId: "all",
  projectId: "all",
  memberId: "all",
};

export function AgencyDashboard() {
  const [metrics, setMetrics] = useState<AgencyDashboardMetrics | null>(null);
  const [reminders, setReminders] = useState<AgencyNotification[]>([]);
  const [activities, setActivities] = useState<AgencyActivity[]>([]);
  const [clients, setClients] = useState<AgencyClient[]>([]);
  const [projects, setProjects] = useState<AgencyProject[]>([]);
  const [members, setMembers] = useState<AgencyMember[]>([]);
  const [filters, setFilters] = useState<AgencyDashboardFilters>(defaultFilters);

  useEffect(() => {
    const load = async () => {
      const [dashboard, c, p] = await Promise.all([
        getAgencyDashboardData(filters),
        listAgencyClients(),
        listAgencyProjects(),
      ]);
      setMetrics(dashboard.metrics);
      setReminders(dashboard.reminders);
      setActivities(dashboard.recentActivities);
      setClients(c);
      setProjects(p);
      // Members dropdown uses mocked roster until the dashboard endpoint is wired up.
      setMembers(mockMembers);
    };
    void load();
  }, [filters]);

  const kpis = useMemo(
    () => [
      { label: "Total Receivables", value: metrics?.totalReceivables ?? 0 },
      { label: "Pending Invoices", value: metrics?.pendingInvoicesCount ?? 0 },
      { label: "This Month Revenue", value: metrics?.monthRevenue ?? 0 },
      { label: "This Month Expenses", value: metrics?.monthExpenses ?? 0 },
    ],
    [metrics],
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{kpi.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">₹{kpi.value.toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={filters.dateRange} onChange={(event) => setFilters((prev) => ({ ...prev, dateRange: event.target.value as AgencyDashboardFilters["dateRange"] }))}>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={filters.clientId} onChange={(event) => setFilters((prev) => ({ ...prev, clientId: event.target.value as AgencyDashboardFilters["clientId"] }))}>
            <option value="all">All Clients</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={filters.projectId} onChange={(event) => setFilters((prev) => ({ ...prev, projectId: event.target.value as AgencyDashboardFilters["projectId"] }))}>
            <option value="all">All Projects</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={filters.memberId} onChange={(event) => setFilters((prev) => ({ ...prev, memberId: event.target.value as AgencyDashboardFilters["memberId"] }))}>
            <option value="all">All Members</option>
            {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
          </select>
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_1fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Reminder Panel</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {reminders.map((reminder) => (
              <div key={reminder.id} className="rounded-lg border border-border px-3 py-2">
                <p className="font-medium">{reminder.title}</p>
                <p className="text-sm text-muted-foreground">{reminder.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                <p className="font-medium">{activity.message}</p>
                <p className="text-muted-foreground">{activity.actorName} • {new Date(activity.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Input readOnly value="New Client" />
            <Input readOnly value="New Project" />
            <Input readOnly value="New Invoice" />
            <p className="text-xs text-muted-foreground">TODO: connect quick actions to modal/drawer workflows.</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
