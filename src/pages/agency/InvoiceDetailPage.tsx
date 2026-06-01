import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Copy,
  Download,
  ExternalLink,
  FileDown,
  Paperclip,
  Send,
  Trash2,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { AgencyPermissionGate } from "@/components/agency/AgencyPermissionGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoading } from "@/components/ui/page-status";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useMutationFeedback } from "@/context/mutation-feedback-context";
import { getCurrentOrganizationId, isCurrentUserAdmin } from "@/lib/agencyAuth";
import { ApiError, triggerBlobDownload } from "@/lib/apiClient";
import { formatCurrency } from "@/lib/currency";
import {
  recordPaymentSchema,
  sendInvoiceFormSchema,
  type RecordPaymentFormValues,
  type SendInvoiceFormValues,
} from "@/schemas/agencyInvoiceSchema";
import {
  cancelInvoiceReminderApi,
  deleteAgencyInvoiceApi,
  deleteInvoiceAttachmentApi,
  downloadAgencyInvoicePdfApi,
  downloadInvoiceAttachmentApi,
  getAgencyInvoiceApi,
  listInvoiceAttachmentsApi,
  listInvoicePaymentsApi,
  recordInvoicePaymentApi,
  rotatePortalTokenApi,
  sendAgencyInvoiceApi,
  uploadInvoiceAttachmentApi,
} from "@/services/agency/invoicesService";
import type {
  AgencyAttachmentDto,
  AgencyInvoiceDto,
  AgencyInvoiceStatus,
  AgencyPaymentDto,
} from "@/types/agencyInvoicing";

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function InvoiceDetailPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const orgId = getCurrentOrganizationId();
  const { run } = useMutationFeedback();
  const navigate = useNavigate();
  const isAdmin = isCurrentUserAdmin();
  const [invoice, setInvoice] = useState<AgencyInvoiceDto | null>(null);
  const [payments, setPayments] = useState<AgencyPaymentDto[]>([]);
  const [attachments, setAttachments] = useState<AgencyAttachmentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendOpen, setSendOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const totalRecordedPaymentDeductions = useMemo(
    () =>
      payments.reduce(
        (sum, p) => sum + p.paymentGatewayFee + p.tdsDeducted + p.otherDeduction,
        0,
      ),
    [payments],
  );

  const effectivePending = useMemo(() => {
    if (!invoice) return 0;
    return Math.max(
      0,
      roundMoney(invoice.grandTotal - invoice.amountReceived - totalRecordedPaymentDeductions),
    );
  }, [invoice, totalRecordedPaymentDeductions]);

  const displayStatus = useMemo((): AgencyInvoiceStatus => {
    if (!invoice) return "draft";
    if (invoice.status === "cancelled") return "cancelled";
    const settled = roundMoney(invoice.amountReceived + totalRecordedPaymentDeductions);
    if (invoice.grandTotal > 0 && settled >= roundMoney(invoice.grandTotal) - 0.01) {
      return "paid";
    }
    return invoice.status;
  }, [invoice, totalRecordedPaymentDeductions]);

  const load = useCallback(async () => {
    if (!orgId || !invoiceId) return;
    setLoading(true);
    try {
      const [inv, pays, atts] = await Promise.all([
        getAgencyInvoiceApi(orgId, invoiceId),
        listInvoicePaymentsApi(orgId, invoiceId),
        listInvoiceAttachmentsApi(orgId, invoiceId),
      ]);
      setInvoice(inv);
      setPayments(pays);
      setAttachments(atts);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to load invoice.");
    } finally {
      setLoading(false);
    }
  }, [orgId, invoiceId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handlePdf() {
    if (!orgId || !invoice) return;
    try {
      const blob = await downloadAgencyInvoicePdfApi(orgId, invoice.id);
      triggerBlobDownload(blob, `${invoice.invoiceNumber}.pdf`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Download failed.");
    }
  }

  async function handleRotateToken() {
    if (!orgId || !invoice) return;
    if (!window.confirm("Rotate portal token? The existing link will stop working.")) return;
    try {
      await run(
        async () => {
          const { portalToken } = await rotatePortalTokenApi(orgId, invoice.id);
          setInvoice((prev) => (prev ? { ...prev, portalToken } : prev));
        },
        { successMessage: "Portal token rotated." },
      );
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Rotation failed.");
    }
  }

  async function handleDelete() {
    if (!orgId || !invoice) return;
    if (!window.confirm("Cancel this invoice? This cannot be undone.")) return;
    try {
      await run(() => deleteAgencyInvoiceApi(orgId, invoice.id), {
        successMessage: "Invoice cancelled.",
      });
      navigate("/agency/invoices");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Delete failed.");
    }
  }

  async function handleUploadClick() {
    fileRef.current?.click();
  }

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    if (!orgId || !invoice) return;
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await run(
        async () => {
          const uploaded = await uploadInvoiceAttachmentApi(orgId, invoice.id, file);
          setAttachments((prev) => [uploaded, ...prev]);
        },
        { successMessage: "File uploaded." },
      );
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Upload failed.");
    } finally {
      event.target.value = "";
    }
  }

  async function handleAttachmentDownload(att: AgencyAttachmentDto) {
    if (!orgId || !invoice) return;
    try {
      const blob = await downloadInvoiceAttachmentApi(orgId, invoice.id, att.id);
      triggerBlobDownload(blob, att.filename);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Download failed.");
    }
  }

  async function handleAttachmentDelete(att: AgencyAttachmentDto) {
    if (!orgId || !invoice) return;
    if (!window.confirm(`Delete ${att.filename}?`)) return;
    try {
      await deleteInvoiceAttachmentApi(orgId, invoice.id, att.id);
      setAttachments((prev) => prev.filter((a) => a.id !== att.id));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Delete failed.");
    }
  }

  async function handleCancelReminder(reminderId: string) {
    if (!orgId || !invoice) return;
    try {
      await run(
        async () => {
          await cancelInvoiceReminderApi(orgId, invoice.id, reminderId);
          setInvoice((prev) =>
            prev
              ? {
                  ...prev,
                  reminders: prev.reminders.map((r) =>
                    r.id === reminderId ? { ...r, status: "cancelled" as const } : r,
                  ),
                }
              : prev,
          );
        },
        { successMessage: "Reminder cancelled." },
      );
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Cancel failed.");
    }
  }

  const portalUrl = useMemo(() => {
    if (!invoice) return "";
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/portal/invoices/${invoice.portalToken}`;
  }, [invoice]);

  if (!orgId) return <div>Sign in required.</div>;
  if (loading) {
    return <PageLoading label="Loading invoice…" />;
  }
  if (!invoice) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invoice</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Invoice not found.</CardContent>
      </Card>
    );
  }

  const canEdit = displayStatus !== "paid" && displayStatus !== "cancelled";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" asChild>
            <Link to="/agency/invoices">
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{invoice.invoiceNumber}</h1>
            <p className="text-xs text-muted-foreground">
              Created by {invoice.createdByName} ({invoice.createdByEmail}) on {new Date(invoice.createdAt).toLocaleDateString()}
            </p>
          </div>
          <Badge>{displayStatus}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={handlePdf}>
            <FileDown className="mr-1 h-4 w-4" /> PDF
          </Button>
          {canEdit ? (
            <AgencyPermissionGate moduleKey="invoices" action="edit">
              <Button variant="secondary" size="sm" asChild>
                <Link to={`/agency/invoices/${invoice.id}/edit`}>Edit</Link>
              </Button>
            </AgencyPermissionGate>
          ) : null}
          {canEdit ? (
            <AgencyPermissionGate moduleKey="invoices" action="manage">
              <Button size="sm" variant="success" onClick={() => setSendOpen(true)}>
                <Send className="mr-1 h-4 w-4" /> Send
              </Button>
            </AgencyPermissionGate>
          ) : null}
          <AgencyPermissionGate moduleKey="invoices" action="manage">
            {displayStatus !== "paid" && displayStatus !== "cancelled" ? (
              <Button variant="warning" size="sm" onClick={() => setPayOpen(true)}>
                Record payment
              </Button>
            ) : null}
          </AgencyPermissionGate>
          {isAdmin ? (
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="mr-1 h-4 w-4" /> Cancel
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Line items</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>HSN</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Tax%</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell>{it.position}</TableCell>
                    <TableCell>
                      <div className="font-medium">{it.itemName}</div>
                      {it.description ? (
                        <div className="text-xs text-muted-foreground">{it.description}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs">{it.hsnCode}</TableCell>
                    <TableCell className="text-right">{it.qty}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(it.rate, invoice.currency)}
                    </TableCell>
                    <TableCell className="text-right">{it.taxPercent}%</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(it.lineTotal, invoice.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Totals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(invoice.subtotal, invoice.currency)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-{formatCurrency(invoice.discountTotal, invoice.currency)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">CGST</span><span>{formatCurrency(invoice.cgstTotal, invoice.currency)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">SGST</span><span>{formatCurrency(invoice.sgstTotal, invoice.currency)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">IGST</span><span>{formatCurrency(invoice.igstTotal, invoice.currency)}</span></div>
            <div className="flex justify-between border-t border-border pt-2 font-semibold"><span>Grand total</span><span>{formatCurrency(invoice.grandTotal, invoice.currency)}</span></div>
            <div className="flex justify-between text-emerald-600"><span>Received</span><span>{formatCurrency(invoice.amountReceived, invoice.currency)}</span></div>
            {totalRecordedPaymentDeductions > 0 ? (
              <div className="flex justify-between text-muted-foreground">
                <span>Deduction</span>
                <span>{formatCurrency(totalRecordedPaymentDeductions, invoice.currency)}</span>
              </div>
            ) : null}
            <div className="flex justify-between font-medium"><span>Pending</span><span>{formatCurrency(effectivePending, invoice.currency)}</span></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Installments</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {invoice.installments.length === 0 ? (
              <p className="text-muted-foreground">No installments scheduled.</p>
            ) : (
              invoice.installments.map((i) => (
                <div key={i.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <div>
                    <div className="font-medium">#{i.sequence} • Due {i.dueDate}</div>
                    <div className="text-xs text-muted-foreground">{i.status}</div>
                  </div>
                  <div>{formatCurrency(i.amount, invoice.currency)}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Payments</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {payments.length === 0 ? (
              <p className="text-muted-foreground">No payments recorded.</p>
            ) : (
              payments.map((p) => {
                const hasDeductions =
                  p.paymentGatewayFee > 0 || p.tdsDeducted > 0 || p.otherDeduction > 0;
                const deductionParts: string[] = [];
                if (p.paymentGatewayFee > 0) {
                  deductionParts.push(`Gateway ${formatCurrency(p.paymentGatewayFee, invoice.currency)}`);
                }
                if (p.tdsDeducted > 0) {
                  deductionParts.push(`TDS ${formatCurrency(p.tdsDeducted, invoice.currency)}`);
                }
                if (p.otherDeduction > 0) {
                  deductionParts.push(`Other ${formatCurrency(p.otherDeduction, invoice.currency)}`);
                }
                return (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <div>
                      <div className="font-medium">{formatCurrency(p.amount, invoice.currency)}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.method} • {new Date(p.receivedAt).toLocaleDateString()}
                        {p.reference ? ` • ${p.reference}` : ""}
                      </div>
                      {hasDeductions ? (
                        <div className="text-xs text-muted-foreground">{deductionParts.join(" • ")}</div>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Reminders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {invoice.reminders.length === 0 ? (
              <p className="text-muted-foreground">No reminders scheduled.</p>
            ) : (
              invoice.reminders.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <div>
                    <div className="font-medium">{r.type} • {new Date(r.scheduledFor).toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">{r.channel} • {r.status}</div>
                  </div>
                  {r.status === "scheduled" ? (
                    <Button variant="secondary" size="sm" onClick={() => void handleCancelReminder(r.id)}>
                      Cancel
                    </Button>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Attachments</CardTitle>
            <div>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={handleFileSelected}
              />
              {isAdmin ? (
                <Button variant="secondary" size="sm" onClick={handleUploadClick}>
                  <Upload className="mr-1 h-4 w-4" /> Upload
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {attachments.length === 0 ? (
              <p className="text-muted-foreground">No attachments yet.</p>
            ) : (
              attachments.map((att) => (
                <div key={att.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{att.filename}</div>
                      <div className="text-xs text-muted-foreground">
                        {(att.sizeBytes / 1024).toFixed(1)} KB • {att.mimeType}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="secondary" size="icon" onClick={() => void handleAttachmentDownload(att)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    {isAdmin ? (
                      <Button variant="destructive" size="icon" onClick={() => void handleAttachmentDelete(att)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Client portal link</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <Input readOnly value={portalUrl} />
            <Button
              variant="secondary"
              size="icon"
              onClick={() => {
                void navigator.clipboard.writeText(portalUrl);
                toast.success("Portal link copied.");
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" asChild>
              <a href={portalUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
          {isAdmin ? (
            <Button variant="warning" size="sm" onClick={handleRotateToken}>
              Rotate token
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <SendInvoiceDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        invoice={invoice}
        orgId={orgId}
        onSent={() => void load()}
      />
      <RecordPaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        invoice={invoice}
        remainingFace={effectivePending}
        orgId={orgId}
        onRecorded={() => void load()}
      />
    </div>
  );
}

function SendInvoiceDialog({
  open,
  onOpenChange,
  invoice,
  orgId,
  onSent,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  invoice: AgencyInvoiceDto;
  orgId: string;
  onSent: () => void;
}) {
  const { run } = useMutationFeedback();
  const form = useForm<SendInvoiceFormValues>({
    resolver: zodResolver(sendInvoiceFormSchema) as unknown as Resolver<SendInvoiceFormValues>,
    defaultValues: { emailOverride: "", message: "" },
  });

  async function onSubmit(values: SendInvoiceFormValues) {
    try {
      await run(
        () =>
          sendAgencyInvoiceApi(orgId, invoice.id, {
            emailOverride: values.emailOverride || undefined,
            message: values.message || undefined,
          }),
        {
          successMessage: (res) =>
            res.mode === "stub"
              ? "SMTP not configured — email was logged to server console."
              : "Invoice emailed.",
        },
      );
      onOpenChange(false);
      onSent();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Send failed.";
      toast.error(message);
      form.setError("root", { type: "server", message });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send invoice</DialogTitle>
          <DialogDescription>
            Emails the client with a PDF attachment and portal link. Uses SMTP when configured; logs to console otherwise.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <FormField
              control={form.control}
              name="emailOverride"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email override (optional)</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Leave blank to use client email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea rows={4} placeholder="Optional message to include..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="success"
                loading={form.formState.isSubmitting}
                loadingText="Sending…"
              >
                Send
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function RecordPaymentDialog({
  open,
  onOpenChange,
  invoice,
  remainingFace,
  orgId,
  onRecorded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  invoice: AgencyInvoiceDto;
  remainingFace: number;
  orgId: string;
  onRecorded: () => void;
}) {
  const { run } = useMutationFeedback();
  const amountTouchedRef = useRef(false);
  const skipDeductionAutoRef = useRef(false);
  const pending = remainingFace;

  const form = useForm<RecordPaymentFormValues>({
    resolver: zodResolver(recordPaymentSchema) as unknown as Resolver<RecordPaymentFormValues>,
    defaultValues: {
      amount: pending,
      method: "bank_transfer",
      reference: "",
      receivedAt: new Date().toISOString().slice(0, 10),
      installmentId: "",
      notes: "",
      paymentGatewayFee: 0,
      tdsDeducted: 0,
      otherDeduction: 0,
    },
  });

  const [gw, tds, oth, amountReceived] = useWatch({
    control: form.control,
    name: ["paymentGatewayFee", "tdsDeducted", "otherDeduction", "amount"],
  });

  useEffect(() => {
    if (!open) return;
    amountTouchedRef.current = false;
    skipDeductionAutoRef.current = true;
    form.reset({
      amount: pending,
      method: "bank_transfer",
      reference: "",
      receivedAt: new Date().toISOString().slice(0, 10),
      installmentId: "",
      notes: "",
      paymentGatewayFee: 0,
      tdsDeducted: 0,
      otherDeduction: 0,
    });
  }, [open, pending, form]);

  useEffect(() => {
    if (!open || amountTouchedRef.current) return;
    if (skipDeductionAutoRef.current) {
      skipDeductionAutoRef.current = false;
      return;
    }
    const net = roundMoney(
      Math.max(0, pending - Number(gw ?? 0) - Number(tds ?? 0) - Number(oth ?? 0)),
    );
    form.setValue("amount", net);
  }, [open, pending, gw, tds, oth, form]);

  const difference = roundMoney(pending - Number(amountReceived ?? 0));

  async function onSubmit(values: RecordPaymentFormValues) {
    try {
      await run(
        () =>
          recordInvoicePaymentApi(orgId, invoice.id, {
            amount: values.amount,
            method: values.method,
            reference: values.reference || undefined,
            receivedAt: values.receivedAt || undefined,
            installmentId: values.installmentId || undefined,
            notes: values.notes || undefined,
            paymentGatewayFee: values.paymentGatewayFee,
            tdsDeducted: values.tdsDeducted,
            otherDeduction: values.otherDeduction,
          }),
        { successMessage: "Payment recorded." },
      );
      onOpenChange(false);
      onRecorded();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Record failed.";
      toast.error(message);
      form.setError("root", { type: "server", message });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark invoice as paid</DialogTitle>
          <DialogDescription>
            Pending: {formatCurrency(pending, invoice.currency)}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <div className="space-y-2">
              <Label>Invoice amount</Label>
              <Input
                readOnly
                disabled
                className="bg-muted"
                value={formatCurrency(pending, invoice.currency)}
              />
            </div>
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount received (in bank)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      onChange={(e) => {
                        amountTouchedRef.current = true;
                        field.onChange(e);
                      }}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Auto-calculated from deductions. You can manually override.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-2 rounded-lg border border-border p-3">
              <p className="text-sm font-medium">Deductions</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="paymentGatewayFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment gateway fee</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tdsDeducted"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>TDS deducted</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="otherDeduction"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Other deduction</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Difference</Label>
              <Input
                readOnly
                disabled
                className="bg-muted"
                value={formatCurrency(difference, invoice.currency)}
              />
              <p className="text-xs text-muted-foreground">
                Invoice amount − Amount received (in bank)
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Method</FormLabel>
                    <FormControl>
                      <Select {...field}>
                        <option value="bank_transfer">Bank transfer</option>
                        <option value="upi">UPI</option>
                        <option value="card">Card</option>
                        <option value="cash">Cash</option>
                        <option value="cheque">Cheque</option>
                        <option value="other">Other</option>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="receivedAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Received at</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference</FormLabel>
                    <FormControl>
                      <Input placeholder="UTR / Txn ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {invoice.installments.length > 0 ? (
              <FormField
                control={form.control}
                name="installmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Installment (optional)</FormLabel>
                    <FormControl>
                      <Select {...field}>
                        <option value="">Apply to overall invoice</option>
                        {invoice.installments.map((i) => (
                          <option key={i.id} value={i.id}>
                            #{i.sequence} • {i.dueDate} • {formatCurrency(i.amount, invoice.currency)}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="success"
                loading={form.formState.isSubmitting}
                loadingText="Saving…"
              >
                Mark as paid
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
