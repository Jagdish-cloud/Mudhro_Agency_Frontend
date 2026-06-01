import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";
import type { ComputedInvoiceTotals } from "@/lib/invoiceTax";
import type { AgencyInvoiceFormValues } from "@/schemas/agencyInvoiceSchema";
import type { AgencyClientDto } from "@/types/agencyInvoicing";
import type { OrganizationProfile } from "@/types/organization";

type InvoicePreviewCardProps = {
  formValues: AgencyInvoiceFormValues;
  selectedClient: AgencyClientDto | null;
  org: OrganizationProfile | null;
  totals: ComputedInvoiceTotals & { items: Array<{ lineSubtotal: number; lineTotal: number }> };
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Per-line discount % for table display (matches builder Disc %). */
function formatLineDiscPercent(value: unknown): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0%";
  if (Number.isInteger(n)) return `${n}%`;
  const rounded = Math.round(n * 100) / 100;
  return `${rounded}%`;
}

export function InvoicePreviewCard({
  formValues,
  selectedClient,
  org,
  totals,
}: InvoicePreviewCardProps) {
  const currency = formValues.currency || "INR";
  const items = formValues.items ?? [];
  const hsnList = Array.from(
    new Set(items.map((i) => i.hsnCode?.trim()).filter((v): v is string => Boolean(v))),
  );

  return (
    <Card className="shadow-sm">
      <CardContent className="space-y-6 p-6 text-sm">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-base font-semibold leading-tight text-foreground">
              {org?.name ?? "Your Organization"}
            </p>
            {org?.address ? (
              <p className="mt-1 max-w-[26ch] whitespace-pre-line text-xs text-muted-foreground">
                {org.address}
              </p>
            ) : null}
            {org?.companyEmail ? (
              <p className="text-xs text-muted-foreground">{org.companyEmail}</p>
            ) : null}
            {org?.companyMobile ? (
              <p className="text-xs text-muted-foreground">{org.companyMobile}</p>
            ) : null}
          </div>
          <div className="text-right">
            <p className="text-xl font-semibold uppercase tracking-[0.18em] text-foreground">
              Invoice
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {formValues.invoiceNumber?.trim() || "INV-—"}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              Issue: {formatDate(formValues.issueDate)}
            </p>
            <p className="text-xs text-muted-foreground">
              Due: {formatDate(formValues.dueDate)}
            </p>
          </div>
        </header>

        <section>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Bill To
          </p>
          {selectedClient ? (
            <div className="mt-1">
              <p className="font-medium text-foreground">{selectedClient.name}</p>
              {selectedClient.contactName ? (
                <p className="text-xs text-muted-foreground">
                  {selectedClient.contactName}
                </p>
              ) : null}
              {selectedClient.billingAddress ? (
                <p className="whitespace-pre-line text-xs text-muted-foreground">
                  {selectedClient.billingAddress}
                </p>
              ) : null}
              {selectedClient.email ? (
                <p className="text-xs text-muted-foreground">
                  {selectedClient.email}
                </p>
              ) : null}
              {selectedClient.gstNumber ? (
                <p className="text-xs text-muted-foreground">
                  GSTIN: {selectedClient.gstNumber}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-1 italic text-muted-foreground">No client selected</p>
          )}
        </section>

        <section>
          <table className="w-full table-fixed text-xs">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="w-[28%] py-2">Description</th>
                <th className="w-[12%] py-2">HSN/SAC</th>
                <th className="w-[10%] py-2 text-right">Qty</th>
                <th className="w-[18%] py-2 text-right">Unit Price</th>
                <th className="w-[10%] py-2 text-right">Disc %</th>
                <th className="w-[22%] py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-3 italic text-muted-foreground">
                    Add a line item to preview the invoice.
                  </td>
                </tr>
              ) : (
                items.map((it, idx) => {
                  const computed = totals.items[idx];
                  const hsnDisplay = it.hsnCode?.trim() ? it.hsnCode.trim() : "—";
                  return (
                    <tr key={idx} className="border-b border-border/60 align-top">
                      <td className="py-2">
                        <p className="font-medium text-foreground">
                          {it.itemName?.trim() || "Item"}
                        </p>
                        {it.description ? (
                          <p className="whitespace-pre-line text-muted-foreground">
                            {it.description}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-2 text-muted-foreground">{hsnDisplay}</td>
                      <td className="py-2 text-right">{Number(it.qty || 0)}</td>
                      <td className="py-2 text-right">
                        {formatCurrency(Number(it.rate || 0), currency)}
                      </td>
                      <td className="py-2 text-right text-muted-foreground">
                        {formatLineDiscPercent(it.discountPercent)}
                      </td>
                      <td className="py-2 text-right">
                        {formatCurrency(computed?.lineTotal ?? 0, currency)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </section>

        <section className="ml-auto w-full max-w-xs space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(totals.subtotal, currency)}</span>
          </div>
          {totals.discountTotal > 0 ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span>-{formatCurrency(totals.discountTotal, currency)}</span>
            </div>
          ) : null}
          <div className="flex justify-between">
            <span className="text-muted-foreground">GST Total</span>
            <span>{formatCurrency(totals.taxTotal, currency)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-sm font-semibold text-foreground">
            <span>Total</span>
            <span>{formatCurrency(totals.grandTotal, currency)}</span>
          </div>
        </section>

        <section className="rounded-md border border-dashed border-border/70 bg-muted/30 p-3 text-[11px] text-muted-foreground">
          <p className="font-semibold uppercase tracking-wide">Tax Details</p>
          <p>
            GSTIN: {org?.gstNumber?.trim() || "—"}
            {hsnList.length > 0 ? `   |   SAC/HSN: ${hsnList.join(", ")}` : ""}
          </p>
          {totals.cgstTotal > 0 || totals.sgstTotal > 0 ? (
            <p>
              CGST: {formatCurrency(totals.cgstTotal, currency)}
              {"   |   "}
              SGST: {formatCurrency(totals.sgstTotal, currency)}
            </p>
          ) : null}
          {totals.igstTotal > 0 ? (
            <p>IGST: {formatCurrency(totals.igstTotal, currency)}</p>
          ) : null}
          {formValues.amountsInclusiveOfTax ? (
            <p className="italic">Amounts entered are inclusive of GST.</p>
          ) : null}
        </section>

        {formValues.notes?.trim() ? (
          <section className="border-t border-border pt-3 text-xs text-muted-foreground">
            <p className="font-semibold uppercase tracking-wide">Notes</p>
            <p className="whitespace-pre-line">{formValues.notes}</p>
          </section>
        ) : null}

        <footer className="border-t border-border pt-3 text-center text-xs text-muted-foreground">
          Thank you for your business.
        </footer>
      </CardContent>
    </Card>
  );
}
