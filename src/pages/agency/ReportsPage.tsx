import { ChevronDown, Download, FileSpreadsheet } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ApiError, triggerBlobDownload } from "@/lib/apiClient";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { encodeId } from "@/lib/idCodec";
import { listAgencyClientsApi } from "@/services/agency/clientsService";
import { listExpensesApi } from "@/services/agency/expensesService";
import { listAgencyInvoicesApi } from "@/services/agency/invoicesService";
import {
  downloadClientReportPdfApi,
  downloadOverallReportPdfApi,
  downloadPaymentPendingReportPdfApi,
  getClientReportApi,
  getOverallReportApi,
  getPaymentPendingReportApi,
} from "@/services/agency/reportsService";
import type { AgencyClientDto, AgencyInvoiceDto } from "@/types/agencyInvoicing";
import type { AgencyExpenseWithVendor } from "@/types/agency";
import type { ClientReportDto, OverallReportDto, PaymentPendingReportDto, ReportPeriodQuery } from "@/types/agencyReports";

function ReportCapNotice({
  invoicesLen,
  expensesLen,
}: {
  invoicesLen: number;
  expensesLen: number;
}) {
  if (invoicesLen < 500 && expensesLen < 500) return null;
  return (
    <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
      Lists are capped at 500 rows each. Narrow the period if something is missing.
    </p>
  );
}

function ReportInvoicesTable({
  invoices,
  resolveClientName,
}: {
  invoices: AgencyInvoiceDto[];
  resolveClientName: (clientId: string) => string;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold tracking-tight">Invoices in period</h3>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Issue date</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Grand total</TableHead>
                <TableHead className="text-right">Pending</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No invoices match this period.
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <Link className="font-medium hover:underline" to={`/agency/invoices/${inv.id}`}>
                        {inv.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{resolveClientName(inv.clientId)}</TableCell>
                    <TableCell>{inv.issueDate}</TableCell>
                    <TableCell>{inv.dueDate}</TableCell>
                    <TableCell className="capitalize">{inv.status}</TableCell>
                    <TableCell className="text-right">{formatCurrency(inv.grandTotal, inv.currency)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(inv.amountPending, inv.currency)}</TableCell>
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

function ReportExpensesTable({
  expenses,
  hintCurrency,
}: {
  expenses: AgencyExpenseWithVendor[];
  hintCurrency: string;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold tracking-tight">Expenses in period</h3>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Bill date</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No expenses match this period (and attribution rules).
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((ex) => (
                  <TableRow key={ex.id}>
                    <TableCell className="font-medium">{ex.billNumber || encodeId(ex.id)}</TableCell>
                    <TableCell>{ex.vendorName ?? "—"}</TableCell>
                    <TableCell>{ex.billDate}</TableCell>
                    <TableCell>{ex.dueDate}</TableCell>
                    <TableCell className="text-right">{formatCurrency(ex.totalAmount, hintCurrency)}</TableCell>
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

type TabId = "overall" | "client" | "pending";
type PeriodMode = "custom" | "month" | "year";
type PendingSortKey = "dueDate" | "invoiceNumber" | "clientName" | "amountPending";

function defaultMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function buildPeriodQuery(
  mode: PeriodMode,
  month: string,
  year: number,
  from: string,
  to: string,
): ReportPeriodQuery {
  if (mode === "month") return { month };
  if (mode === "year") {
    const y = Number(year);
    return { year: Number.isFinite(y) ? y : new Date().getFullYear() };
  }
  const q: ReportPeriodQuery = {};
  if (from.trim()) q.from = from.trim();
  if (to.trim()) q.to = to.trim();
  return q;
}

function KpiCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        {subtitle ? <div className="text-xs text-muted-foreground">{subtitle}</div> : null}
      </CardContent>
    </Card>
  );
}

export function ReportsPage() {
  const orgId = getCurrentOrganizationId();
  const [tab, setTab] = useState<TabId>("overall");
  const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [filterPendingByDue, setFilterPendingByDue] = useState(false);

  const [clients, setClients] = useState<AgencyClientDto[]>([]);
  const [clientId, setClientId] = useState<string>("");

  const [overall, setOverall] = useState<OverallReportDto | null>(null);
  const [byClient, setByClient] = useState<ClientReportDto | null>(null);
  const [pending, setPending] = useState<PaymentPendingReportDto | null>(null);

  const [reportInvoices, setReportInvoices] = useState<AgencyInvoiceDto[]>([]);
  const [reportExpenses, setReportExpenses] = useState<AgencyExpenseWithVendor[]>([]);

  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const [pendingSort, setPendingSort] = useState<{ key: PendingSortKey; dir: "asc" | "desc" }>({
    key: "dueDate",
    dir: "asc",
  });

  const aggregatePeriod = useMemo(
    () => buildPeriodQuery(periodMode, month, year, from, to),
    [periodMode, month, year, from, to],
  );

  const pendingQuery = useMemo((): ReportPeriodQuery => {
    if (!filterPendingByDue) return {};
    return aggregatePeriod;
  }, [filterPendingByDue, aggregatePeriod]);

  const clientNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of clients) {
      m[c.id] = c.name;
    }
    return m;
  }, [clients]);

  useEffect(() => {
    if (!orgId) return;
    listAgencyClientsApi(orgId, { limit: 500, page: 1 })
      .then((res) => setClients(res.items))
      .catch(() => toast.error("Could not load clients."));
  }, [orgId]);

  const loadOverall = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setReportInvoices([]);
    setReportExpenses([]);
    try {
      const data = await getOverallReportApi(orgId, aggregatePeriod);
      setOverall(data);
      const [invRes, expenseRows] = await Promise.all([
        listAgencyInvoicesApi(orgId, {
          from: data.period.fromInclusive,
          to: data.period.toInclusive,
          page: 1,
          limit: 500,
        }),
        listExpensesApi(orgId, {
          from: data.period.fromInclusive,
          to: data.period.toInclusive,
        }),
      ]);
      setReportInvoices(invRes.items);
      setReportExpenses(expenseRows);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load report.");
    } finally {
      setLoading(false);
    }
  }, [orgId, aggregatePeriod]);

  const loadClientReport = useCallback(async () => {
    if (!orgId || !clientId) return;
    setLoading(true);
    setReportInvoices([]);
    setReportExpenses([]);
    try {
      const data = await getClientReportApi(orgId, clientId, aggregatePeriod);
      setByClient(data);
      const [invRes, expenseRows] = await Promise.all([
        listAgencyInvoicesApi(orgId, {
          from: data.period.fromInclusive,
          to: data.period.toInclusive,
          clientId,
          page: 1,
          limit: 500,
        }),
        listExpensesApi(orgId, {
          from: data.period.fromInclusive,
          to: data.period.toInclusive,
          clientId,
        }),
      ]);
      setReportInvoices(invRes.items);
      setReportExpenses(expenseRows);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load client report.");
    } finally {
      setLoading(false);
    }
  }, [orgId, clientId, aggregatePeriod]);

  const loadPending = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const data = await getPaymentPendingReportApi(orgId, pendingQuery);
      setPending(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load pending invoices.");
    } finally {
      setLoading(false);
    }
  }, [orgId, pendingQuery]);

  useEffect(() => {
    if (!orgId) return;
    if (tab === "overall") void loadOverall();
  }, [orgId, tab, loadOverall]);

  useEffect(() => {
    if (!orgId || tab !== "client") return;
    if (!clientId) {
      setByClient(null);
      setReportInvoices([]);
      setReportExpenses([]);
      return;
    }
    void loadClientReport();
  }, [orgId, tab, clientId, loadClientReport]);

  useEffect(() => {
    if (!orgId || tab !== "pending") return;
    void loadPending();
  }, [orgId, tab, loadPending]);

  const sortedPendingItems = useMemo(() => {
    if (!pending?.items.length) return [];
    const copy = [...pending.items];
    const mult = pendingSort.dir === "asc" ? 1 : -1;
    copy.sort((a, b) => {
      switch (pendingSort.key) {
        case "invoiceNumber":
          return mult * a.invoiceNumber.localeCompare(b.invoiceNumber);
        case "clientName":
          return mult * a.clientName.localeCompare(b.clientName);
        case "amountPending":
          return mult * (a.amountPending - b.amountPending);
        case "dueDate":
        default:
          return mult * a.dueDate.localeCompare(b.dueDate);
      }
    });
    return copy;
  }, [pending?.items, pendingSort]);

  function togglePendingSort(key: PendingSortKey): void {
    setPendingSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );
  }

  async function handlePdf(kind: "overall" | "client" | "pending"): Promise<void> {
    if (!orgId) return;
    if (kind === "client" && !clientId) {
      toast.error("Choose a client first.");
      return;
    }
    setPdfLoading(true);
    try {
      if (kind === "overall") {
        const blob = await downloadOverallReportPdfApi(orgId, aggregatePeriod);
        triggerBlobDownload(blob, `overall-report-${overall?.period.label ?? "export"}.pdf`);
      } else if (kind === "client") {
        const blob = await downloadClientReportPdfApi(orgId, clientId, aggregatePeriod);
        triggerBlobDownload(blob, `client-report-${clientId}.pdf`);
      } else {
        const blob = await downloadPaymentPendingReportPdfApi(orgId, pendingQuery);
        triggerBlobDownload(blob, `payment-pending-${pending?.period?.label ?? "all"}.pdf`);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "PDF download failed.");
    } finally {
      setPdfLoading(false);
    }
  }

  if (!orgId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reports</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Sign in to an organization to view reports.
        </CardContent>
      </Card>
    );
  }

  const TabBtn = ({
    id,
    label,
  }: {
    id: TabId;
    label: string;
  }) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={cn(
        "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
        tab === id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary",
      )}
    >
      {label}
    </button>
  );

  const PeriodControls = ({ showPendingDueHint }: { showPendingDueHint?: boolean }) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Period</CardTitle>
        <p className="text-xs text-muted-foreground">
          {showPendingDueHint
            ? "Payment pending uses invoice due dates when filtering is enabled."
            : "Invoices use issue date; expenses use bill date."}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {(["month", "year", "custom"] as PeriodMode[]).map((m) => (
            <Button key={m} type="button" variant={periodMode === m ? "default" : "outline"} size="sm" onClick={() => setPeriodMode(m)}>
              {m === "custom" ? "Custom range" : m === "month" ? "Month" : "Year"}
            </Button>
          ))}
        </div>
        {periodMode === "month" ? (
          <div className="max-w-xs">
            <Label htmlFor="report-month">Calendar month</Label>
            <Input id="report-month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
        ) : null}
        {periodMode === "year" ? (
          <div className="max-w-xs">
            <Label htmlFor="report-year">Year</Label>
            <Input
              id="report-year"
              type="number"
              min={2000}
              max={2100}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </div>
        ) : null}
        {periodMode === "custom" ? (
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="report-from">From</Label>
              <Input id="report-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="report-to">To</Label>
              <Input id="report-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">
              Leave both empty (overall / client) to default to the current month.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );

  const PendingHeader = ({
    label,
    sortKey,
  }: {
    label: string;
    sortKey: PendingSortKey;
  }) => (
    <button
      type="button"
      className="inline-flex items-center gap-1 font-medium hover:text-foreground"
      onClick={() => togglePendingSort(sortKey)}
    >
      {label}
      <ChevronDown
        className={cn(
          "h-3.5 w-3.5 opacity-40 transition-transform",
          pendingSort.key === sortKey && pendingSort.dir === "desc" ? "rotate-180" : "",
        )}
      />
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Overall performance, per-client rollups, and payment pending — with PDF export.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-card p-1">
        <TabBtn id="overall" label="Overall" />
        <TabBtn id="client" label="By client" />
        <TabBtn id="pending" label="Payment pending" />
      </div>

      {tab === "pending" ? (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 pt-6">
            <Checkbox
              id="due-filter"
              checked={filterPendingByDue}
              onCheckedChange={(v) => setFilterPendingByDue(v === true)}
            />
            <Label htmlFor="due-filter" className="cursor-pointer text-sm font-normal leading-none">
              Filter by due date period (unchecked = all outstanding invoices)
            </Label>
          </CardContent>
        </Card>
      ) : null}

      {tab === "pending" && filterPendingByDue ? <PeriodControls showPendingDueHint /> : null}
      {tab !== "pending" ? <PeriodControls /> : null}

      {tab === "client" ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Client</CardTitle>
          </CardHeader>
          <CardContent className="max-w-md">
            <Label htmlFor="report-client">Client</Label>
            <Select
              id="report-client"
              className="mt-1"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">Select a client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <p className="mt-2 text-xs text-muted-foreground">
              Expenses include bills on projects linked to this client.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={loading || pdfLoading || (tab === "client" && !clientId)}
          onClick={() => handlePdf(tab)}
        >
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={loading}
          onClick={() => {
            if (tab === "overall") void loadOverall();
            if (tab === "client") void loadClientReport();
            if (tab === "pending") void loadPending();
          }}
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {tab === "overall" ? (
        loading || !overall ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">Loading…</CardContent>
          </Card>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Period: <span className="font-medium text-foreground">{overall.period.label}</span> ({overall.period.fromInclusive}{" "}
              → {overall.period.toInclusive})
            </p>
            <div className="grid gap-4 md:grid-cols-4">
              <KpiCard title="Invoiced" value={formatCurrency(overall.invoices.invoicedAmount, overall.invoices.currency)} subtitle={`${overall.invoices.invoiceCount} invoices`} />
              <KpiCard title="Received" value={formatCurrency(overall.invoices.receivedAmount, overall.invoices.currency)} subtitle={`${overall.invoices.paidCount} paid`} />
              <KpiCard title="Pending" value={formatCurrency(overall.invoices.pendingAmount, overall.invoices.currency)} />
              <KpiCard title="Overdue (issued in period)" value={formatCurrency(overall.invoices.overdueAmount, overall.invoices.currency)} subtitle={`${overall.invoices.overdueCount} invoices`} />
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Net (invoiced − expenses)</CardTitle>
              </CardHeader>
              <CardContent className="text-lg font-semibold">
                {formatCurrency(overall.netInvoicedMinusExpenses, overall.invoices.currency)}
              </CardContent>
            </Card>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Expenses</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    {overall.expenses.expenseCount} bills ·{" "}
                    <span className="font-medium">{formatCurrency(overall.expenses.expenseTotalAmount, overall.invoices.currency)}</span>
                  </p>
                  {overall.expenses.topVendors.length === 0 ? (
                    <p className="text-muted-foreground">No expenses in period.</p>
                  ) : (
                    <ul className="space-y-2">
                      {overall.expenses.topVendors.map((v) => (
                        <li key={v.vendorId} className="flex justify-between rounded-lg border border-border px-3 py-2">
                          <span>{v.vendorName}</span>
                          <span>{formatCurrency(v.totalAmount, overall.invoices.currency)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top clients</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {overall.invoices.topClients.length === 0 ? (
                    <p className="text-muted-foreground">No invoices in period.</p>
                  ) : (
                    overall.invoices.topClients.map((c) => (
                      <div key={c.clientId} className="flex justify-between rounded-lg border border-border px-3 py-2">
                        <span className="font-medium">{c.clientName}</span>
                        <span>{formatCurrency(c.invoicedAmount, overall.invoices.currency)}</span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Invoice status breakdown</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {overall.invoices.statusBreakdown.map((s) => (
                  <span key={s.status} className="rounded-full border border-border px-3 py-1 text-xs capitalize">
                    {s.status}: {s.count} · {formatCurrency(s.amount, overall.invoices.currency)}
                  </span>
                ))}
              </CardContent>
            </Card>

            <div className="mt-8 space-y-8 border-t border-border pt-8">
              <ReportCapNotice invoicesLen={reportInvoices.length} expensesLen={reportExpenses.length} />
              <ReportInvoicesTable invoices={reportInvoices} resolveClientName={(id) => clientNameById[id] ?? "—"} />
              <ReportExpensesTable expenses={reportExpenses} hintCurrency={overall.invoices.currency} />
            </div>
          </>
        )
      ) : null}

      {tab === "client" ? (
        !clientId ? (
          <p className="text-sm text-muted-foreground">Select a client to load the report.</p>
        ) : loading || !byClient ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">Loading…</CardContent>
          </Card>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              {byClient.clientName} · Period: {byClient.period.label} ({byClient.period.fromInclusive} → {byClient.period.toInclusive})
            </p>
            <div className="grid gap-4 md:grid-cols-4">
              <KpiCard title="Invoiced" value={formatCurrency(byClient.invoices.invoicedAmount, byClient.invoices.currency)} subtitle={`${byClient.invoices.invoiceCount} invoices`} />
              <KpiCard title="Received" value={formatCurrency(byClient.invoices.receivedAmount, byClient.invoices.currency)} />
              <KpiCard title="Attributed expenses" value={formatCurrency(byClient.expenses.expenseTotalAmount, byClient.invoices.currency)} subtitle={`${byClient.expenses.expenseCount} bills`} />
              <KpiCard title="Net" value={formatCurrency(byClient.netInvoicedMinusExpenses, byClient.invoices.currency)} />
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Expense vendors (top)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {byClient.expenses.topVendors.length === 0 ? (
                  <p className="text-muted-foreground">No attributed expenses in period.</p>
                ) : (
                  byClient.expenses.topVendors.map((v) => (
                    <div key={v.vendorId} className="flex justify-between rounded-lg border border-border px-3 py-2">
                      <span>{v.vendorName}</span>
                      <span>{formatCurrency(v.totalAmount, byClient.invoices.currency)}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <div className="mt-8 space-y-8 border-t border-border pt-8">
              <ReportCapNotice invoicesLen={reportInvoices.length} expensesLen={reportExpenses.length} />
              <ReportInvoicesTable invoices={reportInvoices} resolveClientName={(id) => clientNameById[id] ?? "—"} />
              <ReportExpensesTable expenses={reportExpenses} hintCurrency={byClient.invoices.currency} />
            </div>
          </>
        )
      ) : null}

      {tab === "pending" ? (
        loading || !pending ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">Loading…</CardContent>
          </Card>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              {pending.period
                ? `Due dates ${pending.period.fromInclusive} → ${pending.period.toInclusive}`
                : "All outstanding invoices (no due-date filter)"}{" "}
              · {pending.invoiceCount} invoices · Total pending{" "}
              <span className="font-medium text-foreground">{formatCurrency(pending.totalPendingAmount, pending.items[0]?.currency ?? "INR")}</span>
            </p>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <PendingHeader label="Invoice" sortKey="invoiceNumber" />
                      </TableHead>
                      <TableHead>
                        <PendingHeader label="Client" sortKey="clientName" />
                      </TableHead>
                      <TableHead>
                        <PendingHeader label="Due" sortKey="dueDate" />
                      </TableHead>
                      <TableHead className="text-right">
                        <PendingHeader label="Pending" sortKey="amountPending" />
                      </TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedPendingItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No outstanding invoices match this filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedPendingItems.map((row) => (
                        <TableRow key={row.invoiceId}>
                          <TableCell>
                            <Link className="font-medium hover:underline" to={`/agency/invoices/${row.invoiceId}`}>
                              {row.invoiceNumber}
                            </Link>
                          </TableCell>
                          <TableCell>{row.clientName}</TableCell>
                          <TableCell>{row.dueDate}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.amountPending, row.currency)}</TableCell>
                          <TableCell className="capitalize">{row.status}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )
      ) : null}
    </div>
  );
}
