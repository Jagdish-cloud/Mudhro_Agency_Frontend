import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Bookmark,
  Download,
  Loader2,
  Plus,
  Send,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm, useWatch, type Resolver } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { AgencyPermissionGate } from "@/components/agency/AgencyPermissionGate";
import { ClientFormDialog } from "@/components/agency/clients/ClientFormDialog";
import { InvoicePreviewCard } from "@/components/agency/invoices/InvoicePreviewCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMutationFeedback } from "@/context/mutation-feedback-context";
import { getCurrentOrganizationId } from "@/lib/agencyAuth";
import { ApiError, triggerBlobDownload } from "@/lib/apiClient";
import { formatCurrency, SUPPORTED_CURRENCIES } from "@/lib/currency";
import { INVOICE_REMINDER_PRESETS } from "@/lib/invoiceReminderPresets";
import { computeInvoiceTotals, stateCodeFromGst } from "@/lib/invoiceTax";
import {
  agencyInvoiceSchema,
  type AgencyInvoiceFormValues,
} from "@/schemas/agencyInvoiceSchema";
import {
  listClientItemsApi,
  saveInvoiceRowToCatalogApi,
} from "@/services/agency/clientItemsService";
import { listAgencyClientsApi } from "@/services/agency/clientsService";
import {
  createAgencyInvoiceApi,
  downloadAgencyInvoicePdfApi,
  getAgencyInvoiceApi,
  sendAgencyInvoiceApi,
  updateAgencyInvoiceApi,
} from "@/services/agency/invoicesService";
import { listAgencyProjectsApi, listProjectClientsApi } from "@/services/agency/projectsService";
import { getOrganization } from "@/services/agency/organizationService";
import type { ProjectListItemDto } from "@/types/agency/project";
import type {
  AgencyClientDto,
  AgencyClientItemDto,
  CreateInvoiceInput,
  PatchAgencyInvoiceInput,
} from "@/types/agencyInvoicing";
import type { OrganizationProfile } from "@/types/organization";

const emptyItem = {
  itemName: "",
  description: "",
  hsnCode: "",
  qty: 1,
  rate: 0,
  discountPercent: 0,
  taxPercent: 18,
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function InvoiceBuilderPage() {
  const orgId = getCurrentOrganizationId();
  const { run } = useMutationFeedback();
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const isEdit = Boolean(invoiceId);
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectListItemDto[]>([]);
  const [clients, setClients] = useState<AgencyClientDto[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [catalog, setCatalog] = useState<AgencyClientItemDto[]>([]);
  const [org, setOrg] = useState<OrganizationProfile | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState<"none" | "save" | "send">("none");
  const [downloading, setDownloading] = useState(false);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  /** Bump to remount per-row catalog `<select>` so `value=""` resets after each pick. */
  const [catalogSelectKeyByFieldId, setCatalogSelectKeyByFieldId] = useState<
    Record<string, number>
  >({});

  const form = useForm<AgencyInvoiceFormValues>({
    resolver: zodResolver(agencyInvoiceSchema) as unknown as Resolver<AgencyInvoiceFormValues>,
    defaultValues: {
      clientId: "",
      projectId: "",
      invoiceNumber: "",
      issueDate: todayStr(),
      dueDate: addDays(todayStr(), 15),
      currency: "INR",
      status: "draft",
      paymentTerms: "Full payment",
      notes: "",
      placeOfSupply: "",
      items: [emptyItem],
      installments: [],
      discountTotal: 0,
      amountsInclusiveOfTax: false,
      remindersEnabled: true,
      reminderOffsets: [0],
      paymentTermsMode: "full",
    },
  });

  const itemsArr = useFieldArray({ control: form.control, name: "items" });
  const installmentsArr = useFieldArray({ control: form.control, name: "installments" });
  const watchedProjectId = useWatch({ control: form.control, name: "projectId" });

  useEffect(() => {
    if (!orgId) return;
    void listAgencyProjectsApi(orgId)
      .then(setProjects)
      .catch(() => setProjects([]));
    void getOrganization(orgId)
      .then(setOrg)
      .catch(() => setOrg(null));
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;
    const pid = (watchedProjectId ?? "").trim();
    let alive = true;
    setClientsLoading(true);
    void (async () => {
      try {
        const items = pid
          ? await listProjectClientsApi(orgId, pid)
          : (await listAgencyClientsApi(orgId, { limit: 200, status: "active" })).items;
        if (!alive) return;
        if ((form.getValues("projectId") ?? "").trim() !== pid) return;
        setClients(items);
      } catch {
        if (!alive) return;
        if ((form.getValues("projectId") ?? "").trim() !== pid) return;
        setClients([]);
      } finally {
        if (!alive) return;
        if ((form.getValues("projectId") ?? "").trim() === pid) setClientsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [orgId, watchedProjectId, form]);

  useEffect(() => {
    if (clientsLoading) return;
    const cid = form.getValues("clientId");
    if (!cid) return;
    const pid = (watchedProjectId ?? "").trim();
    if (pid) {
      if (clients.length === 0 || !clients.some((c) => c.id === cid)) {
        form.setValue("clientId", "", { shouldValidate: true });
      }
    } else if (clients.length > 0 && !clients.some((c) => c.id === cid)) {
      form.setValue("clientId", "", { shouldValidate: true });
    }
  }, [clients, clientsLoading, watchedProjectId, form]);

  useEffect(() => {
    if (!orgId || !isEdit || !invoiceId) return;
    setLoading(true);
    void getAgencyInvoiceApi(orgId, invoiceId)
      .then((inv) => {
        form.reset({
          clientId: inv.clientId,
          projectId: inv.projectId ?? "",
          invoiceNumber: inv.invoiceNumber,
          issueDate: inv.issueDate,
          dueDate: inv.dueDate,
          currency: inv.currency,
          status: inv.status,
          paymentTerms: inv.paymentTerms ?? "",
          notes: inv.notes ?? "",
          placeOfSupply: inv.placeOfSupply ?? "",
          items: inv.items.map((it) => ({
            itemName: it.itemName,
            description: it.description ?? "",
            hsnCode: it.hsnCode,
            qty: it.qty,
            rate: it.rate,
            discountPercent: it.discountPercent,
            taxPercent: it.taxPercent,
          })),
          installments: inv.installments.map((i) => ({
            sequence: i.sequence,
            dueDate: i.dueDate,
            amount: i.amount,
          })),
          discountTotal: inv.discountTotal,
          amountsInclusiveOfTax: inv.amountsInclusiveOfTax,
          remindersEnabled: inv.remindersEnabled,
          reminderOffsets:
            inv.reminderOffsets ??
            [...new Set(inv.reminders.map((r) => r.offsetDays))].sort((a, b) => a - b) ??
            [0],
          paymentTermsMode: inv.installments.length > 0 ? "advance_balance" : "full",
        });
      })
      .catch((err: unknown) => {
        toast.error(err instanceof ApiError ? err.message : "Failed to load invoice.");
      })
      .finally(() => setLoading(false));
  }, [orgId, invoiceId, isEdit, form]);

  const watched = form.watch();
  /** Nested `items.*` updates do not reliably re-render `form.watch()`; totals/preview must subscribe here. */
  const liveItems = useWatch({ control: form.control, name: "items" });
  const selectedClient = useMemo(
    () => clients.find((c) => c.id === watched.clientId) ?? null,
    [clients, watched.clientId],
  );

  useEffect(() => {
    if (!orgId || !watched.clientId) {
      setCatalog([]);
      return;
    }
    let cancelled = false;
    void listClientItemsApi(orgId, watched.clientId)
      .then((res) => {
        if (!cancelled) setCatalog(res.items);
      })
      .catch(() => {
        if (!cancelled) setCatalog([]);
      });
    return () => {
      cancelled = true;
    };
  }, [orgId, watched.clientId]);

  function bumpCatalogSelect(fieldId: string) {
    setCatalogSelectKeyByFieldId((prev) => ({
      ...prev,
      [fieldId]: (prev[fieldId] ?? 0) + 1,
    }));
  }

  function applyCatalogToRow(idx: number, catalogItemId: string) {
    if (!catalogItemId) return;
    const item = catalog.find((c) => c.id === catalogItemId);
    if (!item) {
      toast.error("Catalog item not found. Wait for the list to load or pick again.");
      return;
    }
    const payload = {
      itemName: item.itemName,
      description: item.description ?? "",
      hsnCode: item.hsnCode,
      qty: 1,
      rate: item.defaultRate,
      discountPercent: item.defaultDiscountPercent,
      taxPercent: item.defaultTaxPercent,
    };
    itemsArr.update(idx, payload);
  }

  async function handleSaveRowToCatalog(idx: number) {
    if (!orgId) return;
    const clientId = form.getValues("clientId");
    if (!clientId) {
      toast.error("Pick a client first.");
      return;
    }
    const row = form.getValues(`items.${idx}` as const);
    if (!row?.itemName?.trim() || !row.hsnCode?.trim()) {
      toast.error("Item name and HSN are required to save to catalog.");
      return;
    }
    try {
      const saved = await run(
        () =>
          saveInvoiceRowToCatalogApi(orgId, clientId, {
            itemName: row.itemName,
            description: row.description || undefined,
            hsnCode: row.hsnCode,
            rate: row.rate,
            taxPercent: row.taxPercent,
            discountPercent: row.discountPercent,
          }),
        { successMessage: "Saved to client's catalog." },
      );
      setCatalog((prev) => {
        const existingIdx = prev.findIndex((c) => c.id === saved.id);
        if (existingIdx === -1) return [saved, ...prev];
        const next = [...prev];
        next[existingIdx] = saved;
        return next;
      });
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not save to catalog.",
      );
    }
  }

  const previewFormValues = useMemo(
    () => ({
      ...watched,
      items: liveItems ?? watched.items ?? [],
    }),
    [watched, liveItems],
  );

  const totals = useMemo(() => {
    const items = liveItems ?? watched.items ?? [];
    return computeInvoiceTotals(
      items.map((it) => ({
        qty: it.qty,
        rate: it.rate,
        taxPercent: it.taxPercent,
        discountPercent: it.discountPercent,
      })),
      {
        sellerStateCode: org?.gstNumber ? stateCodeFromGst(org.gstNumber) : null,
        buyerStateCode:
          selectedClient?.stateCode ??
          stateCodeFromGst(selectedClient?.gstNumber ?? null),
        discountTotal: watched.discountTotal ?? 0,
        amountsInclusiveOfTax: watched.amountsInclusiveOfTax,
      },
    );
  }, [
    liveItems,
    watched.items,
    watched.discountTotal,
    watched.amountsInclusiveOfTax,
    selectedClient,
    org,
  ]);

  function applyPaymentTermsMode(mode: "full" | "advance_balance") {
    form.setValue("paymentTermsMode", mode, { shouldDirty: true });
    if (mode === "full") {
      installmentsArr.replace([]);
      form.setValue("paymentTerms", "Full payment", { shouldDirty: true });
    } else {
      const issue = form.getValues("issueDate") || todayStr();
      const due = form.getValues("dueDate") || addDays(issue, 15);
      const half = round2(totals.grandTotal / 2);
      installmentsArr.replace([
        { sequence: 1, dueDate: issue, amount: half },
        { sequence: 2, dueDate: due, amount: round2(totals.grandTotal - half) },
      ]);
      form.setValue("paymentTerms", "Advance + balance", { shouldDirty: true });
    }
  }

  function handleClientCreated(saved: AgencyClientDto) {
    setClients((prev) => {
      const without = prev.filter((c) => c.id !== saved.id);
      return [saved, ...without];
    });
    form.setValue("clientId", saved.id, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setClientDialogOpen(false);
  }

  function buildPayload(values: AgencyInvoiceFormValues): CreateInvoiceInput | PatchAgencyInvoiceInput {
    const trimmedProject = (values.projectId ?? "").trim();
    const base = {
      clientId: values.clientId,
      invoiceNumber: values.invoiceNumber || undefined,
      issueDate: values.issueDate,
      dueDate: values.dueDate,
      currency: values.currency,
      status: values.status,
      paymentTerms: values.paymentTerms || undefined,
      notes: values.notes || undefined,
      placeOfSupply: values.placeOfSupply || undefined,
      items: values.items.map((it) => ({
        itemName: it.itemName,
        description: it.description || undefined,
        hsnCode: it.hsnCode,
        qty: it.qty,
        rate: it.rate,
        discountPercent: it.discountPercent,
        taxPercent: it.taxPercent,
      })),
      installments:
        values.installments && values.installments.length > 0
          ? values.installments.map((i) => ({
              sequence: i.sequence,
              dueDate: i.dueDate,
              amount: i.amount,
            }))
          : undefined,
      discountTotal: values.discountTotal,
      amountsInclusiveOfTax: values.amountsInclusiveOfTax,
      remindersEnabled: values.remindersEnabled,
      reminderOffsets: values.remindersEnabled ? values.reminderOffsets : undefined,
    };
    if (isEdit) {
      return {
        ...base,
        projectId: trimmedProject !== "" ? trimmedProject : null,
      };
    }
    return {
      ...base,
      ...(trimmedProject !== "" ? { projectId: trimmedProject } : {}),
    };
  }

  async function persistInvoice(values: AgencyInvoiceFormValues) {
    if (!orgId) throw new Error("Organization not resolved.");
    const payload = buildPayload(values);
    return isEdit && invoiceId
      ? await updateAgencyInvoiceApi(orgId, invoiceId, payload)
      : await createAgencyInvoiceApi(orgId, payload as CreateInvoiceInput);
  }

  async function onSave(values: AgencyInvoiceFormValues) {
    setSaving("save");
    try {
      const saved = await run(() => persistInvoice(values), {
        successMessage: isEdit ? "Invoice updated." : "Invoice created.",
      });
      navigate(`/agency/invoices/${saved.id}`);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Could not save invoice.";
      toast.error(message);
      form.setError("root", { type: "server", message });
    } finally {
      setSaving("none");
    }
  }

  async function onSaveAndSend() {
    if (!orgId) return;
    const valid = await form.trigger();
    if (!valid) {
      toast.error("Resolve form errors before sending.");
      return;
    }
    setSaving("send");
    try {
      const values = form.getValues();
      const saved = await persistInvoice(values);
      try {
        await run(() => sendAgencyInvoiceApi(orgId, saved.id, {}), {
          successMessage: "Invoice saved and sent.",
        });
      } catch (sendError) {
        const message =
          sendError instanceof ApiError ? sendError.message : "Saved, but email failed.";
        toast.error(message);
      }
      navigate(`/agency/invoices/${saved.id}`);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Could not save invoice.";
      toast.error(message);
      form.setError("root", { type: "server", message });
    } finally {
      setSaving("none");
    }
  }

  async function onDownloadPdf() {
    if (!orgId || !invoiceId) return;
    setDownloading(true);
    try {
      const blob = await downloadAgencyInvoicePdfApi(orgId, invoiceId);
      const filename = `${form.getValues("invoiceNumber") || "invoice"}.pdf`;
      triggerBlobDownload(blob, filename);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not download PDF.",
      );
    } finally {
      setDownloading(false);
    }
  }

  if (!orgId) return <div>Sign in required.</div>;
  if (loading) return <div className="text-sm text-muted-foreground">Loading invoice...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/agency/invoices">
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isEdit ? "Edit invoice" : "New invoice"}
          </h1>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSave)} className="space-y-4" noValidate>
          {form.formState.errors.root?.message ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {form.formState.errors.root.message}
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            {/* LEFT: form fields */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Header</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="projectId"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Project</FormLabel>
                        <FormControl>
                          <Select {...field} className="w-full">
                            <option value="">No project</option>
                            {projects.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Client</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Select {...field} className="flex-1" disabled={clientsLoading}>
                              <option value="">Select client...</option>
                              {clients.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </Select>
                          </FormControl>
                          <AgencyPermissionGate moduleKey="clients" action="create">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setClientDialogOpen(true)}
                            >
                              <UserPlus className="mr-1 h-4 w-4" />
                              Add new client
                            </Button>
                          </AgencyPermissionGate>
                        </div>
                        {(watchedProjectId ?? "").trim() !== "" &&
                        !clientsLoading &&
                        clients.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            No clients linked to this project—assign clients on the project page.
                          </p>
                        ) : null}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="issueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Issue date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency</FormLabel>
                        <FormControl>
                          <Select {...field}>
                            {SUPPORTED_CURRENCIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="invoiceNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Leave blank to auto-generate" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="amountsInclusiveOfTax"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 md:col-span-2">
                        <FormControl>
                          <Checkbox
                            id="amountsInclusiveOfTax"
                            checked={field.value}
                            onCheckedChange={(value) => field.onChange(Boolean(value))}
                          />
                        </FormControl>
                        <Label
                          htmlFor="amountsInclusiveOfTax"
                          className="cursor-pointer text-sm font-normal"
                        >
                          Amounts entered are inclusive of GST
                        </Label>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle>Line items</CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => itemsArr.append(emptyItem)}
                    >
                      <Plus className="mr-1 h-4 w-4" /> Add item
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {itemsArr.fields.map((field, idx) => (
                    <div
                      key={field.id}
                      className="space-y-3 rounded-lg border border-border p-3"
                    >
                      {watched.clientId ? (
                        <div className="w-full sm:max-w-xs">
                          <label
                            className="mb-1.5 block text-xs font-medium text-foreground"
                            htmlFor={`catalog-${field.id}`}
                          >
                            Fill from catalog
                          </label>
                          <Select
                            id={`catalog-${field.id}`}
                            key={`catalog-${field.id}-${catalogSelectKeyByFieldId[field.id] ?? 0}`}
                            value=""
                            disabled={catalog.length === 0}
                            title={
                              catalog.length === 0
                                ? "No saved catalog items for this client yet."
                                : "Replace this line with a saved catalog item"
                            }
                            onChange={(event) => {
                              const id = event.target.value;
                              if (id) applyCatalogToRow(idx, id);
                              bumpCatalogSelect(field.id);
                            }}
                            className="h-9 w-full"
                            aria-label="Add from catalog"
                          >
                            <option value="" disabled>
                              {catalog.length === 0 ? "No saved items" : "Add from catalog..."}
                            </option>
                            {catalog.map((row) => (
                              <option key={row.id} value={row.id}>
                                {row.itemName} ({row.hsnCode})
                              </option>
                            ))}
                          </Select>
                        </div>
                      ) : null}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name={`items.${idx}.itemName` as const}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>Item</FormLabel>
                              <FormControl>
                                <Input placeholder="Service / item" {...f} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${idx}.hsnCode` as const}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>HSN/SAC</FormLabel>
                              <FormControl>
                                <Input placeholder="998314" {...f} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <FormField
                          control={form.control}
                          name={`items.${idx}.qty` as const}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>Qty</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" {...f} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${idx}.rate` as const}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>Rate</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" {...f} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${idx}.discountPercent` as const}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>Disc %</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" {...f} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${idx}.taxPercent` as const}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>Tax %</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" {...f} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name={`items.${idx}.description` as const}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea rows={2} placeholder="Optional line description" {...f} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
                        <span className="text-xs text-muted-foreground">
                          Line total:{" "}
                          <span className="font-medium text-foreground">
                            {formatCurrency(totals.items[idx]?.lineTotal ?? 0, watched.currency)}
                          </span>
                        </span>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            disabled={!watched.clientId}
                            title={
                              watched.clientId
                                ? "Save this row to the client's catalog"
                                : "Pick a client first"
                            }
                            aria-label="Save row to catalog"
                            onClick={() => void handleSaveRowToCatalog(idx)}
                          >
                            <Bookmark className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            disabled={itemsArr.fields.length === 1}
                            onClick={() => itemsArr.remove(idx)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment terms</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
                    <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2">
                      <input
                        type="radio"
                        name="paymentTermsMode"
                        value="full"
                        checked={watched.paymentTermsMode === "full"}
                        onChange={() => applyPaymentTermsMode("full")}
                      />
                      <span>Full payment</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2">
                      <input
                        type="radio"
                        name="paymentTermsMode"
                        value="advance_balance"
                        checked={watched.paymentTermsMode === "advance_balance"}
                        onChange={() => applyPaymentTermsMode("advance_balance")}
                      />
                      <span>Advance + balance</span>
                    </label>
                  </div>

                  {watched.paymentTermsMode === "advance_balance" ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Two installments are seeded. Adjust amounts/dates as needed; sum must equal{" "}
                        {formatCurrency(totals.grandTotal, watched.currency)}.
                      </p>
                      {installmentsArr.fields.map((f, idx) => (
                        <div key={f.id} className="grid grid-cols-12 gap-2">
                          <FormField
                            control={form.control}
                            name={`installments.${idx}.sequence` as const}
                            render={({ field }) => (
                              <FormItem className="col-span-2">
                                <FormControl>
                                  <Input type="number" min={1} {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`installments.${idx}.dueDate` as const}
                            render={({ field }) => (
                              <FormItem className="col-span-5">
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`installments.${idx}.amount` as const}
                            render={({ field }) => (
                              <FormItem className="col-span-4">
                                <FormControl>
                                  <Input type="number" step="0.01" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="col-span-1"
                            onClick={() => installmentsArr.remove(idx)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          installmentsArr.append({
                            sequence: (installmentsArr.fields?.length ?? 0) + 1,
                            dueDate: watched.dueDate,
                            amount: 0,
                          })
                        }
                      >
                        <Plus className="mr-1 h-4 w-4" /> Add installment
                      </Button>
                    </div>
                  ) : null}

                  <FormField
                    control={form.control}
                    name="remindersEnabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 pt-1">
                        <FormControl>
                          <Checkbox
                            id="remindersEnabled"
                            checked={field.value}
                            onCheckedChange={(value) => {
                              const enabled = Boolean(value);
                              field.onChange(enabled);
                              if (enabled && form.getValues("reminderOffsets").length === 0) {
                                form.setValue("reminderOffsets", [0], { shouldValidate: true });
                              }
                            }}
                          />
                        </FormControl>
                        <Label
                          htmlFor="remindersEnabled"
                          className="cursor-pointer text-sm font-normal"
                        >
                          Enable automatic payment reminders
                        </Label>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="reminderOffsets"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-sm font-normal text-muted-foreground">
                          Reminder schedule
                        </FormLabel>
                        <div className="flex flex-wrap gap-2">
                          {INVOICE_REMINDER_PRESETS.map((preset) => {
                            const selected = field.value.includes(preset.offset);
                            return (
                              <Button
                                key={preset.offset}
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={!watched.remindersEnabled}
                                className={
                                  selected
                                    ? "border-primary bg-primary/10 text-primary"
                                    : undefined
                                }
                                onClick={() => {
                                  const next = selected
                                    ? field.value.filter((offset) => offset !== preset.offset)
                                    : [...field.value, preset.offset].sort((a, b) => a - b);
                                  field.onChange(next);
                                }}
                              >
                                {preset.label}
                              </Button>
                            );
                          })}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Totals & notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="discountTotal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Extra discount</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="placeOfSupply"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Place of supply (state code)</FormLabel>
                          <FormControl>
                            <Input maxLength={2} placeholder="29" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes to client</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={3}
                            placeholder="Bank details, thank-you message, etc."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-1 border-t border-border pt-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(totals.subtotal, watched.currency)}</span>
                    </div>
                    {totals.discountTotal > 0 ? (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Discount</span>
                        <span>-{formatCurrency(totals.discountTotal, watched.currency)}</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax total</span>
                      <span>{formatCurrency(totals.taxTotal, watched.currency)}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                      <span>Grand total</span>
                      <span>{formatCurrency(totals.grandTotal, watched.currency)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
                {isEdit ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void onDownloadPdf()}
                    disabled={downloading}
                  >
                    {downloading ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-1 h-4 w-4" />
                    )}
                    Download PDF
                  </Button>
                ) : null}
                <Button
                  type="submit"
                  variant="outline"
                  disabled={saving !== "none"}
                >
                  {saving === "save" ? (
                    <>
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Saving...
                    </>
                  ) : isEdit ? (
                    "Save invoice"
                  ) : (
                    "Save"
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={() => void onSaveAndSend()}
                  disabled={saving !== "none"}
                >
                  {saving === "send" ? (
                    <>
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-1 h-4 w-4" /> Save & Send
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* RIGHT: live preview */}
            <div className="lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-auto">
              <InvoicePreviewCard
                formValues={previewFormValues}
                selectedClient={selectedClient}
                org={org}
                totals={totals}
              />
            </div>
          </div>
        </form>
      </Form>

      <ClientFormDialog
        open={clientDialogOpen}
        orgId={orgId}
        onOpenChange={setClientDialogOpen}
        onSaved={handleClientCreated}
      />
    </div>
  );
}
