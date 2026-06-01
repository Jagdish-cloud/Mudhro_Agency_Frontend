import { Plus, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { AgencyPermissionGate } from "@/components/agency/AgencyPermissionGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCurrentOrganizationId } from "@/lib/agencyAuth";
import { ApiError } from "@/lib/apiClient";
import { formatCurrency } from "@/lib/currency";
import { listAgencyClientsApi } from "@/services/agency/clientsService";
import { listAgencyInvoicesApi } from "@/services/agency/invoicesService";
import type {
  AgencyClientDto,
  AgencyInvoiceDto,
  AgencyInvoiceStatus,
} from "@/types/agencyInvoicing";

const STATUS_VARIANT: Record<string, "default" | "outline" | "active" | "inactive" | "secondary"> = {
  draft: "outline",
  sent: "secondary",
  viewed: "default",
  paid: "active",
  partial: "secondary",
  overdue: "inactive",
  cancelled: "outline",
};

export function InvoicesPage() {
  const orgId = getCurrentOrganizationId();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<AgencyInvoiceDto[]>([]);
  const [clients, setClients] = useState<AgencyClientDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | AgencyInvoiceStatus>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [overdueOnly, setOverdueOnly] = useState(false);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const result = await listAgencyInvoicesApi(orgId, {
        search: search || undefined,
        status: status === "all" ? undefined : status,
        clientId: clientFilter === "all" ? undefined : clientFilter,
        overdue: overdueOnly ? true : undefined,
        page: 1,
        limit: 100,
      });
      setInvoices(result.items);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Failed to load invoices.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [orgId, search, status, clientFilter, overdueOnly]);

  useEffect(() => {
    if (!orgId) return;
    void listAgencyClientsApi(orgId, { limit: 200 }).then((res) => setClients(res.items));
  }, [orgId]);

  useEffect(() => {
    const handle = setTimeout(() => void load(), 250);
    return () => clearTimeout(handle);
  }, [load]);

  if (!orgId) {
    return (
      <Card>
        <CardHeader><CardTitle>Invoices</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">Sign in to an organization to manage invoices.</CardContent>
      </Card>
    );
  }

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? id.slice(0, 8);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground">{invoices.length} loaded</p>
        </div>
        <AgencyPermissionGate moduleKey="invoices" action="create">
          <Button onClick={() => navigate("/agency/invoices/new")}>
            <Plus className="mr-1 h-4 w-4" /> New invoice
          </Button>
        </AgencyPermissionGate>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative sm:w-64">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search number, notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as "all" | AgencyInvoiceStatus)}
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="viewed">Viewed</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </Select>
            <Select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
              <option value="all">All clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={overdueOnly}
                onChange={(e) => setOverdueOnly(e.target.checked)}
              />
              Overdue only
            </label>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created by</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Pending</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                    No invoices match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <Link to={`/agency/invoices/${inv.id}`} className="font-medium hover:underline">
                        {inv.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{clientName(inv.clientId)}</TableCell>
                    <TableCell className="text-sm">{inv.issueDate}</TableCell>
                    <TableCell className="text-sm">{inv.dueDate}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[inv.status] ?? "outline"}>{inv.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>{inv.createdByName}</div>
                      <div className="text-muted-foreground">{inv.createdByEmail}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(inv.grandTotal, inv.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(inv.amountPending, inv.currency)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
