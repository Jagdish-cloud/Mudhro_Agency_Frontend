import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ExpenseModal } from "@/components/agency/expenses/ExpenseModal";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMutationFeedback } from "@/context/mutation-feedback-context";
import { getCurrentOrganizationId } from "@/lib/agencyAuth";
import { formatCurrency } from "@/lib/currency";
import { encodeId } from "@/lib/idCodec";
import { ApiError, triggerBlobDownload } from "@/lib/apiClient";
import {
  deleteExpenseApi,
  downloadExpensePdfBlob,
  listExpensesApi,
  trackExpenseVisitApi,
} from "@/services/agency/expensesService";
import { listAgencyProjectsApi } from "@/services/agency/projectsService";
import { listAgencyVendorsApi } from "@/services/agency/vendorsService";
import type { AgencyExpense } from "@/types/agency";
import type { AgencyVendorDto } from "@/types/agencyInvoicing";
import type { ProjectListItemDto } from "@/types/agency/project";
import { Download, Pencil, Plus, Trash2 } from "lucide-react";

const CURRENCY = "INR";

export function ExpensesPage() {
  const orgId = getCurrentOrganizationId();
  const { run } = useMutationFeedback();

  const [expenses, setExpenses] = useState<AgencyExpense[]>([]);
  const [vendors, setVendors] = useState<AgencyVendorDto[]>([]);
  const [projects, setProjects] = useState<ProjectListItemDto[]>([]);
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const [e, v, p] = await Promise.all([
        listExpensesApi(orgId),
        listAgencyVendorsApi(orgId, { page: 1, limit: 500 }),
        listAgencyProjectsApi(orgId),
      ]);
      setExpenses(e);
      setVendors(v.items);
      setProjects(p);
    } catch {
      toast.error("Could not load expenses.");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!orgId) return;
    void trackExpenseVisitApi(orgId).catch(() => {});
  }, [orgId]);

  const vendorsById = useMemo(() => new Map(vendors.map((v) => [v.id, v])), [vendors]);
  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const filtered = useMemo(() => {
    const parseLocal = (iso: string) => {
      const [y, m, d] = iso.split("-").map(Number);
      return new Date(y, (m || 1) - 1, d || 1);
    };
    return expenses.filter((ex) => {
      const d = parseLocal(ex.billDate);
      if (d < monthStart || d > monthEnd) return false;
      if (projectFilter === "all") return true;
      if (projectFilter === "none") return ex.projectId == null;
      return ex.projectId === projectFilter;
    });
  }, [expenses, monthStart, monthEnd, projectFilter]);

  const totalRecorded = useMemo(() => filtered.reduce((s, x) => s + x.totalAmount, 0), [filtered]);
  const uniqueVendors = vendorsById.size;
  const billsCount = filtered.length;

  const openCreate = () => {
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (id: string) => {
    setEditingId(id);
    setModalOpen(true);
  };

  const handleDownloadPdf = async (ex: AgencyExpense) => {
    if (!orgId) return;
    setPdfLoadingId(ex.id);
    try {
      const blob = await downloadExpensePdfBlob(orgId, ex.id);
      if (blob.size < 16) {
        toast.error("Invalid PDF.", {
          action: {
            label: "Edit expense",
            onClick: () => openEdit(ex.id),
          },
        });
        return;
      }
      const name = `${ex.billNumber || `BILL-${ex.id.slice(0, 8)}`}.pdf`;
      triggerBlobDownload(blob, name);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        toast.error("No PDF yet.", {
          action: {
            label: "Edit expense",
            onClick: () => openEdit(ex.id),
          },
        });
        return;
      }
      toast.error("Could not download PDF.");
    } finally {
      setPdfLoadingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!orgId || !deleteId) return;
    setDeleteBusy(true);
    try {
      await run(() => deleteExpenseApi(orgId, deleteId), {
        successMessage: "Expense deleted.",
      });
      setDeleteId(null);
      void reload();
    } catch {
      toast.error("Could not delete expense.");
    } finally {
      setDeleteBusy(false);
    }
  };

  if (!orgId) {
    return <p className="text-sm text-muted-foreground">Sign in to view expenses.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Record expense
        </Button>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expenses this month</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold tabular-nums">{filtered.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total recorded</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold tabular-nums">
            {formatCurrency(totalRecorded, CURRENCY)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unique vendors</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold tabular-nums">{uniqueVendors}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recorded bills</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold tabular-nums">{billsCount}</CardContent>
        </Card>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">Filter by project</p>
        <Select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="w-full sm:w-64"
        >
          <option value="all">All projects</option>
          <option value="none">No project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill #</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Bill date</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((ex) => (
                  <TableRow key={ex.id}>
                    <TableCell className="font-medium">{ex.billNumber || encodeId(ex.id)}</TableCell>
                    <TableCell>
                      {ex.projectId ? (projectsById.get(ex.projectId)?.name ?? "—") : "—"}
                    </TableCell>
                    <TableCell>{vendorsById.get(ex.vendorId)?.name ?? "—"}</TableCell>
                    <TableCell>{ex.billDate}</TableCell>
                    <TableCell>{ex.dueDate}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(ex.totalAmount, CURRENCY)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="PDF"
                          disabled={pdfLoadingId === ex.id}
                          onClick={() => void handleDownloadPdf(ex)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(ex.id)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Delete" onClick={() => setDeleteId(ex.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3 md:hidden">
            {filtered.map((ex) => (
              <Card key={ex.id}>
                <CardContent className="space-y-2 pt-4 text-sm">
                  <div className="flex justify-between font-medium">
                    <span>{ex.billNumber || encodeId(ex.id)}</span>
                    <span className="tabular-nums">{formatCurrency(ex.totalAmount, CURRENCY)}</span>
                  </div>
                  <p className="text-muted-foreground">
                    {vendorsById.get(ex.vendorId)?.name ?? "—"} · Bill {ex.billDate} · Due {ex.dueDate}
                  </p>
                  <p className="text-muted-foreground">
                    Project: {ex.projectId ? (projectsById.get(ex.projectId)?.name ?? "—") : "None"}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pdfLoadingId === ex.id}
                      onClick={() => void handleDownloadPdf(ex)}
                    >
                      PDF
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(ex.id)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setDeleteId(ex.id)}>
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <ExpenseModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        orgId={orgId}
        editingExpenseId={editingId}
        onSaved={() => void reload()}
      />

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the expense and attempts to delete associated files in storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deleteBusy}
              onClick={() => void confirmDelete()}
            >
              {deleteBusy ? "Deleting…" : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
