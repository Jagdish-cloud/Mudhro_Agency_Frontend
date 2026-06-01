import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ExpensePreview } from "@/components/agency/expenses/ExpensePreview";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMutationFeedback } from "@/context/mutation-feedback-context";
import { getStoredOrganizationInfo } from "@/lib/agencyAuth";
import { ApiError, triggerBlobDownload } from "@/lib/apiClient";
import {
  computeExpenseAmounts,
  roundMoney,
  toExclusiveUnitPrice,
  toInclusiveUnitPrice,
} from "@/lib/expenseAmounts";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { createExpenseServiceApi, listExpenseServicesApi } from "@/services/agency/expenseServicesService";
import {
  createExpenseApi,
  createExpenseLineItemApi,
  deleteExpenseLineItemApi,
  downloadExpenseAttachmentBlob,
  getExpenseApi,
  listExpenseLineItemsApi,
  updateExpenseApi,
  uploadExpenseAttachmentApi,
  uploadExpensePdfApi,
} from "@/services/agency/expensesService";
import { listAgencyProjectsApi } from "@/services/agency/projectsService";
import { listVendorItemsApi } from "@/services/agency/vendorItemsService";
import { createAgencyVendorApi, listAgencyVendorsApi } from "@/services/agency/vendorsService";
import type { AgencyExpense, AgencyExpenseService } from "@/types/agency";
import type { AgencyVendorDto, AgencyVendorItemDto } from "@/types/agencyInvoicing";
import type { ProjectListItemDto } from "@/types/agency/project";
import { ChevronDown } from "lucide-react";

type LineRow = { key: string; serviceId: string; quantity: number; rateExclusive: number };

function newKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** `<input type="date">` and expense APIs expect YYYY-MM-DD; normalizes ISO strings (e.g. ...T00:00:00.000Z). */
function toDateInputValue(value: string | null | undefined): string {
  if (value == null || String(value).trim() === "") return "";
  const m = String(value).trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return m?.[1] ?? "";
}

class ExpenseHandledAbort extends Error {
  override name = "ExpenseHandledAbort";
}

type ExpenseModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  editingExpenseId: string | null;
  preselectedProjectId?: string | null;
  onSaved?: () => void;
};

export function ExpenseModal({
  open,
  onOpenChange,
  orgId,
  editingExpenseId,
  preselectedProjectId = null,
  onSaved,
}: ExpenseModalProps) {
  const orgName = getStoredOrganizationInfo()?.name ?? "Organization";
  const { run } = useMutationFeedback();

  const [vendors, setVendors] = useState<AgencyVendorDto[]>([]);
  const [vendorCatalog, setVendorCatalog] = useState<AgencyVendorItemDto[]>([]);
  const [projects, setProjects] = useState<ProjectListItemDto[]>([]);
  const [services, setServices] = useState<AgencyExpenseService[]>([]);

  const [vendorId, setVendorId] = useState("");
  const [projectId, setProjectId] = useState<string>("none");
  const [billNumber, setBillNumber] = useState("");
  const [billDate, setBillDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [taxPct, setTaxPct] = useState(0);
  const [inclusiveMode, setInclusiveMode] = useState(false);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineRow[]>([]);
  const [attachment, setAttachment] = useState<File | null>(null);
  /** Stored blob filename from server (edit mode); native file input cannot show this. */
  const [existingAttachmentFileName, setExistingAttachmentFileName] = useState<string | null>(null);
  /** Edit mode: server receipt will be deleted on save (unless user picks a new file first). */
  const [attachmentRemovalPending, setAttachmentRemovalPending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refsLoading, setRefsLoading] = useState(false);
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [vendorSubmitting, setVendorSubmitting] = useState(false);
  const [serviceSubmitting, setServiceSubmitting] = useState(false);

  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [newVendorName, setNewVendorName] = useState("");
  const [newVendorEmail, setNewVendorEmail] = useState("");
  const [catalogPick, setCatalogPick] = useState("");

  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [serviceDialogRowKey, setServiceDialogRowKey] = useState<string | null>(null);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceRate, setNewServiceRate] = useState("0");

  const loadRefs = useCallback(async () => {
    const [v, p, s] = await Promise.all([
      listAgencyVendorsApi(orgId, { page: 1, limit: 500 }),
      listAgencyProjectsApi(orgId),
      listExpenseServicesApi(orgId),
    ]);
    setVendors(v.items);
    setProjects(p);
    setServices(s);
  }, [orgId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setRefsLoading(true);
    void loadRefs()
      .catch(() => {
        if (!cancelled) toast.error("Could not load reference data.");
      })
      .finally(() => {
        if (!cancelled) setRefsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, loadRefs]);

  useEffect(() => {
    if (!open) return;

    const today = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const due = new Date(today);
    due.setDate(due.getDate() + 14);

    if (!editingExpenseId) {
      setExpenseLoading(false);
      setVendorId("");
      setProjectId(preselectedProjectId ? preselectedProjectId : "none");
      setBillNumber(`BILL-${String(Date.now()).slice(-4)}`);
      setBillDate(iso(today));
      setDueDate(iso(due));
      setTaxPct(0);
      setInclusiveMode(false);
      setNotes("");
      setLines([{ key: newKey(), serviceId: "", quantity: 1, rateExclusive: 0 }]);
      setAttachment(null);
      setExistingAttachmentFileName(null);
      setShowPreview(false);
      return;
    }

    let cancelled = false;
    setExpenseLoading(true);
    void (async () => {
      try {
        const [exp, items] = await Promise.all([
          getExpenseApi(orgId, editingExpenseId),
          listExpenseLineItemsApi(orgId, editingExpenseId),
        ]);
        if (cancelled) return;
        setVendorId(exp.vendorId);
        setProjectId(exp.projectId ?? "none");
        setBillNumber(exp.billNumber ?? "");
        setBillDate(toDateInputValue(exp.billDate));
        setDueDate(toDateInputValue(exp.dueDate));
        setTaxPct(exp.taxPercentage);
        setNotes(exp.additionalNotes ?? "");
        setInclusiveMode(false);
        setLines(
          items.length
            ? items.map((it) => ({
                key: newKey(),
                serviceId: it.serviceId,
                quantity: it.quantity,
                rateExclusive: it.unitPrice,
              }))
            : [{ key: newKey(), serviceId: "", quantity: 1, rateExclusive: 0 }],
        );
        setAttachment(null);
        setAttachmentRemovalPending(false);
        setExistingAttachmentFileName(exp.attachmentFileName ?? null);
      } catch {
        if (!cancelled) toast.error("Could not load expense.");
      } finally {
        if (!cancelled) setExpenseLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, editingExpenseId, orgId, preselectedProjectId]);

  const vendorsById = useMemo(() => new Map(vendors.map((c) => [c.id, c])), [vendors]);
  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  useEffect(() => {
    if (!open || !vendorId) {
      setVendorCatalog([]);
      setCatalogPick("");
      return;
    }
    let cancelled = false;
    void listVendorItemsApi(orgId, vendorId)
      .then((r) => {
        if (!cancelled) setVendorCatalog(r.items);
      })
      .catch(() => {
        if (!cancelled) setVendorCatalog([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, orgId, vendorId]);

  useEffect(() => {
    setCatalogPick("");
  }, [vendorId]);
  const servicesById = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);

  const linePayload = useMemo(() => {
    return lines
      .filter((l) => l.serviceId)
      .map((l) => ({
        serviceId: l.serviceId,
        quantity: l.quantity,
        unitPrice: roundMoney(l.rateExclusive),
      }));
  }, [lines]);

  const amounts = useMemo(() => {
    return computeExpenseAmounts({
      items: linePayload.map((x) => ({ quantity: x.quantity, unitPrice: x.unitPrice })),
      taxPercentage: taxPct,
      totalAmount: undefined,
    });
  }, [linePayload, taxPct]);

  const taxAmount = roundMoney(amounts.totalAmount - amounts.subTotalAmount);

  const formBlocked = refsLoading || expenseLoading;

  const previewLines = useMemo(() => {
    return lines
      .filter((l) => l.serviceId)
      .map((l) => {
        const name = servicesById.get(l.serviceId)?.name ?? "—";
        const qty = l.quantity;
        const ex = l.rateExclusive;
        const lineTotal = roundMoney(qty * ex);
        return { serviceName: name, quantity: qty, unitPrice: ex, lineTotal };
      });
  }, [lines, servicesById]);

  const vendorName = vendorsById.get(vendorId)?.name ?? "—";
  const projectName =
    projectId !== "none" ? (projectsById.get(projectId)?.name ?? undefined) : undefined;

  const displayRate = (row: LineRow) =>
    inclusiveMode ? toInclusiveUnitPrice(row.rateExclusive, taxPct, true) : row.rateExclusive;

  const setRowRateFromDisplay = (key: string, display: number) => {
    setLines((prev) =>
      prev.map((r) =>
        r.key === key
          ? {
              ...r,
              rateExclusive: inclusiveMode ? toExclusiveUnitPrice(display, taxPct, true) : roundMoney(display),
            }
          : r,
      ),
    );
  };

  const addLine = () => {
    setLines((prev) => [...prev, { key: newKey(), serviceId: "", quantity: 1, rateExclusive: 0 }]);
  };

  async function handleDownloadExistingReceipt() {
    if (!orgId || !editingExpenseId || !existingAttachmentFileName) return;
    try {
      const blob = await downloadExpenseAttachmentBlob(orgId, editingExpenseId);
      triggerBlobDownload(blob, existingAttachmentFileName);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not download receipt.");
    }
  }

  const removeLine = (key: string) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)));
  };

  const runSave = async () => {
    if (!vendorId) {
      toast.error("Vendor is required.");
      return;
    }
    const validLines = lines.filter((l) => l.serviceId && l.quantity > 0);
    if (validLines.length === 0) {
      toast.error("Add at least one line with a service and positive quantity.");
      return;
    }

    setLoading(true);
    const shouldRemoveSavedReceipt = Boolean(editingExpenseId && attachmentRemovalPending);
    const billDateOut = toDateInputValue(billDate);
    const dueDateOut = toDateInputValue(dueDate);
    try {
      await run(
        async () => {
          const itemsForCreate = validLines.map((l) => ({
            serviceId: l.serviceId,
            quantity: l.quantity,
            unitPrice: roundMoney(l.rateExclusive),
          }));

          let expense: AgencyExpense;

          if (!editingExpenseId) {
            expense = await createExpenseApi(orgId, {
              vendorId,
              projectId: projectId === "none" ? undefined : projectId,
              billDate: billDateOut,
              dueDate: dueDateOut,
              billNumber: billNumber.trim() || undefined,
              taxPercentage: taxPct,
              additionalNotes: notes.trim() || undefined,
              items: itemsForCreate,
            });
            await Promise.all(
              itemsForCreate.map((it) => createExpenseLineItemApi(orgId, expense.id, it)),
            );
          } else {
            const existingItems = await listExpenseLineItemsApi(orgId, editingExpenseId);
            const totals = computeExpenseAmounts({
              items: itemsForCreate,
              taxPercentage: taxPct,
              totalAmount: undefined,
            });
            await Promise.all(existingItems.map((it) => deleteExpenseLineItemApi(orgId, it.id)));
            await updateExpenseApi(orgId, editingExpenseId, {
              vendorId,
              projectId: projectId === "none" ? null : projectId,
              billDate: billDateOut,
              dueDate: dueDateOut,
              billNumber: billNumber.trim() || null,
              taxPercentage: taxPct,
              totalAmount: totals.totalAmount,
              additionalNotes: notes.trim() || null,
              ...(shouldRemoveSavedReceipt ? { removeAttachment: true as const } : {}),
            });
            await Promise.all(
              itemsForCreate.map((it) => createExpenseLineItemApi(orgId, editingExpenseId, it)),
            );
            expense = await getExpenseApi(orgId, editingExpenseId);
          }

          if (attachment) {
            await uploadExpenseAttachmentApi(orgId, expense.id, attachment);
          }

          const el = document.getElementById("expense-preview-print");
          if (!el) {
            toast.error("Could not prepare the bill preview for PDF. Please try again.");
            onSaved?.();
            throw new ExpenseHandledAbort();
          }

          try {
            const [{ default: html2canvas }, { default: JsPDF }] = await Promise.all([
              import("html2canvas"),
              import("jspdf"),
            ]);
            const canvas = await html2canvas(el, {
              scale: 2,
              useCORS: true,
              backgroundColor: "#ffffff",
            });
            const imgData = canvas.toDataURL("image/png");
            const pdf = new JsPDF({ unit: "pt", format: "a4" });
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
            const imgW = canvas.width * ratio;
            const imgH = canvas.height * ratio;
            pdf.addImage(imgData, "PNG", (pageW - imgW) / 2, 24, imgW, imgH);
            const fname = `${expense.billNumber || `BILL-${expense.id.slice(0, 8)}`}.pdf`;
            const blob = pdf.output("blob");
            await uploadExpensePdfApi(orgId, expense.id, blob, fname);
          } catch (pdfErr) {
            toast.error(
              pdfErr instanceof Error
                ? `Expense saved, but PDF upload failed: ${pdfErr.message}`
                : "Expense saved, but PDF upload failed.",
            );
            onSaved?.();
            throw new ExpenseHandledAbort();
          }
        },
        {
          successMessage: editingExpenseId ? "Expense updated." : "Expense recorded.",
        },
      );
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      if (e instanceof ExpenseHandledAbort) {
        //
      } else {
        toast.error(e instanceof Error ? e.message : "Could not save expense.");
      }
    } finally {
      setAttachment(null);
      setAttachmentRemovalPending(false);
      setLoading(false);
    }
  };

  const createVendorQuick = async () => {
    const name = newVendorName.trim();
    if (name.length < 2) {
      toast.error("Vendor name is required.");
      return;
    }
    setVendorSubmitting(true);
    try {
      const v = await run(
        () =>
          createAgencyVendorApi(orgId, {
            name,
            email: newVendorEmail.trim() || undefined,
            status: "active",
          }),
        { successMessage: "Vendor added." },
      );
      setVendors((prev) => [v, ...prev]);
      setVendorId(v.id);
      setVendorDialogOpen(false);
      setNewVendorName("");
      setNewVendorEmail("");
    } catch {
      toast.error("Could not create vendor.");
    } finally {
      setVendorSubmitting(false);
    }
  };

  const createServiceQuick = async () => {
    const name = newServiceName.trim();
    if (name.length < 2) {
      toast.error("Service name is required.");
      return;
    }
    setServiceSubmitting(true);
    try {
      const rate = Number(newServiceRate) || 0;
      const s = await run(() => createExpenseServiceApi(orgId, { name, defaultRate: rate }), {
        successMessage: "Service added.",
      });
      setServices((prev) => [...prev, s].sort((a, b) => a.name.localeCompare(b.name)));
      if (serviceDialogRowKey) {
        setLines((prev) =>
          prev.map((r) => (r.key === serviceDialogRowKey ? { ...r, serviceId: s.id } : r)),
        );
      }
      setServiceDialogOpen(false);
      setServiceDialogRowKey(null);
      setNewServiceName("");
      setNewServiceRate("0");
    } catch {
      toast.error("Could not create service.");
    } finally {
      setServiceSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[92vh] w-[min(48rem,calc(100vw-2rem))] max-w-3xl min-w-0 flex-col gap-0 overflow-y-auto overflow-x-hidden p-6">
          <DialogHeader className="shrink-0">
            <DialogTitle>{editingExpenseId ? "Edit expense" : "Record expense"}</DialogTitle>
          </DialogHeader>

          <div className="relative min-w-0 flex-1 space-y-4">
            {formBlocked ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/70">
                <span className="text-sm text-muted-foreground">Loading…</span>
              </div>
            ) : null}

            <div
              className={cn("grid min-w-0 gap-4 sm:grid-cols-2", formBlocked && "pointer-events-none opacity-50")}
            >
            <div className="flex min-w-0 flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-end sm:gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <Label>Vendor</Label>
                <Select
                  value={vendorId}
                  onChange={(e) => setVendorId(e.target.value)}
                  disabled={formBlocked}
                  className="w-full min-w-0"
                >
                  <option value="">Select vendor</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full shrink-0 sm:w-auto"
                disabled={formBlocked}
                onClick={() => setVendorDialogOpen(true)}
              >
                New vendor
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Project</Label>
              <Select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                disabled={formBlocked}
                className="w-full min-w-0"
              >
                <option value="none">No project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Bill number</Label>
              <Input
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                maxLength={20}
                disabled={formBlocked}
              />
            </div>

            <div className="space-y-2">
              <Label>Bill date</Label>
              <Input
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                disabled={formBlocked}
              />
            </div>

            <div className="space-y-2">
              <Label>Due date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={formBlocked}
              />
            </div>

            <div className="space-y-2">
              <Label>Tax %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={taxPct}
                onChange={(e) => setTaxPct(Number(e.target.value) || 0)}
                disabled={formBlocked}
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <Checkbox
                id="inclusive"
                checked={inclusiveMode}
                disabled={formBlocked}
                onCheckedChange={(v) => setInclusiveMode(Boolean(v))}
              />
              <Label htmlFor="inclusive" className="font-normal">
                Inclusive GST (rates include tax)
              </Label>
            </div>
            </div>

          <div className={cn("space-y-2", formBlocked && "pointer-events-none opacity-50")}>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <Label>Line items</Label>
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:justify-end">
                <Select
                  value={catalogPick}
                  onChange={(e) => {
                    const id = e.target.value;
                    if (!id) return;
                    const cat = vendorCatalog.find((x) => x.id === id);
                    if (cat) {
                      setLines((prev) => [
                        ...prev,
                        {
                          key: newKey(),
                          serviceId: cat.serviceId,
                          quantity: cat.defaultQuantity,
                          rateExclusive: cat.defaultRate,
                        },
                      ]);
                    }
                    setCatalogPick("");
                  }}
                  disabled={formBlocked || !vendorId || vendorCatalog.length === 0}
                  className="w-full min-w-0 sm:max-w-xs"
                >
                  <option value="">
                    {vendorCatalog.length === 0
                      ? "No catalog items for this vendor"
                      : "Add from vendor catalog…"}
                  </option>
                  {vendorCatalog.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.itemName} ({cat.serviceName})
                    </option>
                  ))}
                </Select>
                <Button type="button" variant="outline" size="sm" disabled={formBlocked} onClick={addLine}>
                  Add line
                </Button>
              </div>
            </div>
            <div className="min-w-0 space-y-3 rounded-lg border border-border p-3">
              {lines.map((row) => (
                <div
                  key={row.key}
                  className="flex min-w-0 flex-col gap-2 md:grid md:grid-cols-[minmax(0,1fr)_5.25rem_6.5rem_auto] md:items-end md:gap-2"
                >
                  <div className="min-w-0">
                    <Select
                      value={row.serviceId}
                      disabled={formBlocked}
                      onChange={(e) => {
                        const v = e.target.value;
                        setLines((prev) =>
                          prev.map((r) =>
                            r.key === row.key
                              ? {
                                  ...r,
                                  serviceId: v,
                                  rateExclusive: (() => {
                                    const def = servicesById.get(v)?.defaultRate;
                                    return def !== undefined ? Number(def) : r.rateExclusive;
                                  })(),
                                }
                              : r,
                          ),
                        );
                      }}
                      className="w-full min-w-0"
                    >
                      <option value="">Service</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={row.quantity}
                    disabled={formBlocked}
                    className="w-full md:min-w-0"
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((r) =>
                          r.key === row.key ? { ...r, quantity: Math.max(0.01, Number(e.target.value) || 0) } : r,
                        ),
                      )
                    }
                  />
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={displayRate(row)}
                    disabled={formBlocked}
                    className="w-full md:min-w-0"
                    onChange={(e) => setRowRateFromDisplay(row.key, Number(e.target.value) || 0)}
                  />
                  <div className="flex min-w-0 flex-wrap gap-1 md:justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="min-w-0 shrink"
                      disabled={formBlocked}
                      onClick={() => {
                        setServiceDialogRowKey(row.key);
                        setServiceDialogOpen(true);
                      }}
                    >
                      Custom
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-destructive"
                      disabled={formBlocked}
                      onClick={() => removeLine(row.key)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-secondary/50 px-3 py-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal (excl.)</span>
              <span className="tabular-nums">{formatCurrency(amounts.subTotalAmount, "INR")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span className="tabular-nums">{formatCurrency(taxAmount, "INR")}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(amounts.totalAmount, "INR")} </span>
            </div>
          </div>

          <div className={cn("space-y-2", formBlocked && "pointer-events-none opacity-50")}>
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              disabled={formBlocked}
            />
          </div>

          <div className={cn("space-y-2", formBlocked && "pointer-events-none opacity-50")}>
            <Label>Receipt attachment</Label>
            <p className="text-xs text-muted-foreground">
              Download the current receipt, choose a file below to replace it, or use Remove to delete it without
              uploading another.
            </p>
            {attachmentRemovalPending && existingAttachmentFileName ? (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
                <span className="text-muted-foreground">
                  Receipt{" "}
                  <span className="font-medium text-foreground">{existingAttachmentFileName}</span> will be
                  removed when you save.
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={formBlocked}
                  onClick={() => setAttachmentRemovalPending(false)}
                >
                  Undo
                </Button>
              </div>
            ) : null}
            {existingAttachmentFileName && !attachmentRemovalPending ? (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Saved on server:</span>
                <span className="min-w-0 flex-1 truncate font-medium" title={existingAttachmentFileName}>
                  {existingAttachmentFileName}
                </span>
                {editingExpenseId ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={formBlocked}
                      onClick={() => void handleDownloadExistingReceipt()}
                    >
                      Download
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={formBlocked}
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setAttachment(null);
                        setAttachmentRemovalPending(true);
                      }}
                    >
                      Remove
                    </Button>
                  </>
                ) : null}
              </div>
            ) : null}
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,image/*,application/pdf"
              disabled={formBlocked}
              key={attachment ? attachment.name : "no-file"}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setAttachment(f);
                if (f) setAttachmentRemovalPending(false);
              }}
            />
            {attachment ? (
              <p className="text-xs text-muted-foreground">
                New file selected: <span className="font-medium text-foreground">{attachment.name}</span>
                {existingAttachmentFileName && !attachmentRemovalPending
                  ? " — replaces the saved receipt when you save."
                  : null}
              </p>
            ) : null}
          </div>

          {/* Always mounted off-screen so PDF generation works when Preview is collapsed */}
          <div
            className="pointer-events-none fixed top-0 -left-[10000px] z-0 w-[min(794px,100vw)]"
            aria-hidden
          >
            <ExpensePreview
              organizationName={orgName}
              vendorName={vendorName}
              projectName={projectName}
              billNumber={billNumber || "—"}
              billDate={billDate}
              dueDate={dueDate}
              lines={previewLines}
              taxPercentage={taxPct}
              subTotalAmount={amounts.subTotalAmount}
              taxAmount={taxAmount}
              totalAmount={amounts.totalAmount}
              additionalNotes={notes.trim() || null}
            />
          </div>

          <Collapsible
            open={showPreview}
            onOpenChange={setShowPreview}
            className={cn(formBlocked && "pointer-events-none opacity-50")}
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-sm font-medium">
              <span>Preview</span>
              <ChevronDown className="h-4 w-4 transition-transform [[data-state=open]_&]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <ExpensePreview
                id="expense-preview-onscreen"
                organizationName={orgName}
                vendorName={vendorName}
                projectName={projectName}
                billNumber={billNumber || "—"}
                billDate={billDate}
                dueDate={dueDate}
                lines={previewLines}
                taxPercentage={taxPct}
                subTotalAmount={amounts.subTotalAmount}
                taxAmount={taxAmount}
                totalAmount={amounts.totalAmount}
                additionalNotes={notes.trim() || null}
              />
            </CollapsibleContent>
          </Collapsible>
          </div>

          <DialogFooter className="mt-4 shrink-0 gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={loading || formBlocked} onClick={() => void runSave()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={vendorDialogOpen} onOpenChange={setVendorDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New vendor</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={newVendorName} onChange={(e) => setNewVendorName(e.target.value)} />
            <Label>Email (optional)</Label>
            <Input value={newVendorEmail} onChange={(e) => setNewVendorEmail(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" disabled={vendorSubmitting} onClick={() => void createVendorQuick()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Custom service</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={newServiceName} onChange={(e) => setNewServiceName(e.target.value)} />
            <Label>Default rate (optional)</Label>
            <Input value={newServiceRate} onChange={(e) => setNewServiceRate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" disabled={serviceSubmitting} onClick={() => void createServiceQuick()}>
              Add service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
