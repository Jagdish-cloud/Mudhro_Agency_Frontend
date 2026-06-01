import { FileDown } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError, triggerBlobDownload } from "@/lib/apiClient";
import { formatCurrency } from "@/lib/currency";
import {
  downloadPortalInvoicePdfApi,
  getPortalInvoiceApi,
  markPortalInvoiceViewedApi,
} from "@/services/agency/portalService";
import type { PortalInvoice } from "@/types/agencyInvoicing";

export function PortalInvoicePage() {
  const { token } = useParams<{ token: string }>();
  const [invoice, setInvoice] = useState<PortalInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    getPortalInvoiceApi(token)
      .then((inv) => {
        if (!cancelled) {
          setInvoice(inv);
          void markPortalInvoiceViewedApi(token).catch(() => {});
        }
      })
      .catch((err: unknown) => {
        const message = err instanceof ApiError ? err.message : "Invoice unavailable.";
        setError(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handlePdf() {
    if (!token || !invoice) return;
    try {
      const blob = await downloadPortalInvoicePdfApi(token);
      triggerBlobDownload(blob, `${invoice.invoiceNumber}.pdf`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Download failed.");
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-3xl px-4 py-10 text-sm text-muted-foreground">Loading invoice...</div>;
  }

  if (error || !invoice) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card>
          <CardHeader><CardTitle>Invoice unavailable</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">{error ?? "This invoice link is invalid or has expired."}</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">{invoice.invoiceNumber}</h1>
          <p className="text-sm text-muted-foreground">
            Issued {invoice.issueDate} • Due {invoice.dueDate} • {invoice.status.toUpperCase()}
          </p>
        </div>
        <Button variant="outline" onClick={handlePdf}>
          <FileDown className="mr-1 h-4 w-4" /> Download PDF
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>From</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <div className="font-medium">{invoice.organization.name}</div>
            <div className="text-muted-foreground whitespace-pre-line">{invoice.organization.address}</div>
            <div>{invoice.organization.email} • {invoice.organization.phone}</div>
            {invoice.organization.gstNumber ? (
              <div className="text-muted-foreground">GST: {invoice.organization.gstNumber}</div>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Bill to</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <div className="font-medium">{invoice.client.name}</div>
            {invoice.client.contactName ? <div>{invoice.client.contactName}</div> : null}
            <div className="text-muted-foreground whitespace-pre-line">{invoice.client.billingAddress ?? ""}</div>
            {invoice.client.email ? <div>{invoice.client.email}</div> : null}
            {invoice.client.gstNumber ? (
              <div className="text-muted-foreground">GST: {invoice.client.gstNumber}</div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Items</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="p-3">Item</th>
                <th className="p-3">HSN</th>
                <th className="p-3 text-right">Qty</th>
                <th className="p-3 text-right">Rate</th>
                <th className="p-3 text-right">Tax%</th>
                <th className="p-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((it) => (
                <tr key={it.id} className="border-b border-border last:border-0">
                  <td className="p-3">
                    <div className="font-medium">{it.itemName}</div>
                    {it.description ? <div className="text-xs text-muted-foreground">{it.description}</div> : null}
                  </td>
                  <td className="p-3 text-xs">{it.hsnCode}</td>
                  <td className="p-3 text-right">{it.qty}</td>
                  <td className="p-3 text-right">{formatCurrency(it.rate, invoice.currency)}</td>
                  <td className="p-3 text-right">{it.taxPercent}%</td>
                  <td className="p-3 text-right">{formatCurrency(it.lineTotal, invoice.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {invoice.installments.length > 0 ? (
          <Card>
            <CardHeader><CardTitle>Installments</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {invoice.installments.map((i) => (
                <div key={i.id} className="flex justify-between rounded-lg border border-border px-3 py-2">
                  <div>#{i.sequence} • Due {i.dueDate} • {i.status}</div>
                  <div>{formatCurrency(i.amount, invoice.currency)}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : <div />}
        <Card>
          <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(invoice.subtotal, invoice.currency)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-{formatCurrency(invoice.discountTotal, invoice.currency)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">CGST</span><span>{formatCurrency(invoice.cgstTotal, invoice.currency)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">SGST</span><span>{formatCurrency(invoice.sgstTotal, invoice.currency)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">IGST</span><span>{formatCurrency(invoice.igstTotal, invoice.currency)}</span></div>
            <div className="flex justify-between border-t border-border pt-2 font-semibold"><span>Grand total</span><span>{formatCurrency(invoice.grandTotal, invoice.currency)}</span></div>
            <div className="flex justify-between text-emerald-600"><span>Received</span><span>{formatCurrency(invoice.amountReceived, invoice.currency)}</span></div>
            <div className="flex justify-between font-medium"><span>Pending</span><span>{formatCurrency(invoice.amountPending, invoice.currency)}</span></div>
          </CardContent>
        </Card>
      </div>

      {invoice.paymentTerms ? (
        <Card>
          <CardHeader><CardTitle>Payment terms</CardTitle></CardHeader>
          <CardContent className="text-sm whitespace-pre-line">{invoice.paymentTerms}</CardContent>
        </Card>
      ) : null}
      {invoice.notes ? (
        <Card>
          <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
          <CardContent className="text-sm whitespace-pre-line">{invoice.notes}</CardContent>
        </Card>
      ) : null}
    </div>
  );
}
