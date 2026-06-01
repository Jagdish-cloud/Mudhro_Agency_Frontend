import type {
  AgreementPaymentStructure,
  AgreementPaymentTerms,
  AgreementSignature,
} from "@/types/agency/agreement";

const PAYMENT_LABELS: { key: AgreementPaymentStructure; label: string }[] = [
  { key: "50-50", label: "50% upfront, 50% on completion" },
  { key: "100-upfront", label: "100% upfront" },
  { key: "100-completion", label: "100% on completion" },
  { key: "milestone-based", label: "Milestone-based" },
];

export type AgreementPreviewModel = {
  serviceProviderName: string;
  agreementDate: string;
  serviceType: string;
  deliverables: { description: string }[];
  startDate: string | null;
  endDate: string | null;
  duration: number | null;
  durationUnit: string | null;
  numberOfRevisions: number;
  jurisdiction: string | null;
  paymentTerms: AgreementPaymentTerms | null;
  signatures: AgreementSignature[];
  currency: string;
  serviceProviderSignaturePreviewUrl?: string | null;
  /** When previewing before save, SP may not yet exist in `signatures`. */
  serviceProviderSignerDisplay?: string;
};

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function dateLabel(value: string | null): string {
  if (!value) return "[Date]";
  return value;
}

type AgreementPreviewProps = {
  model: AgreementPreviewModel;
  className?: string;
};

export function AgreementPreview({ model, className }: AgreementPreviewProps) {
  const sp = model.signatures.find((s) => s.signerType === "service_provider");
  const clientSigs = model.signatures.filter((s) => s.signerType === "client");
  const spSigner = model.serviceProviderSignerDisplay ?? sp?.signerName;
  const structure = model.paymentTerms?.paymentStructure;

  return (
    <div className={`space-y-6 text-sm leading-relaxed text-foreground ${className ?? ""}`}>
      <header className="space-y-2 text-center">
        <h2 className="text-lg font-semibold tracking-tight">SERVICE AGREEMENT</h2>
        <p className="text-left">
          This Agreement is entered into between {model.serviceProviderName} (&quot;Service Provider&quot;) and
          Client on {model.agreementDate}.
        </p>
      </header>

      <section>
        <h3 className="mb-2 font-semibold">1. Scope of Work</h3>
        <p className="mb-2">Service Type: {model.serviceType}</p>
        {model.deliverables.length > 0 ? (
          <ul className="mb-2 list-inside list-decimal space-y-1">
            {model.deliverables.map((d, i) => (
              <li key={i}>{d.description}</li>
            ))}
          </ul>
        ) : null}
        <p className="text-muted-foreground">
          Any additional features, integrations, or changes not explicitly listed above are outside the scope of this
          Agreement and may require a separate quotation or amendment.
        </p>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">2. Timeline &amp; Milestones</h3>
        <p>Start Date: {dateLabel(model.startDate)}</p>
        <p>Estimated Completion: {dateLabel(model.endDate)}</p>
        {model.duration != null && model.durationUnit ? (
          <p>
            Total Duration: {model.duration} {model.durationUnit}
          </p>
        ) : null}
        <p className="mt-2 text-muted-foreground">
          Timelines are estimates and may shift based on the timely receipt of content, feedback, and approvals from the
          Client. Delays caused by the Client will not be the responsibility of the Service Provider.
        </p>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">3. Payment Terms</h3>
        <ul className="mb-2 space-y-1">
          {PAYMENT_LABELS.map(({ key, label }) => (
            <li key={key}>
              {structure === key ? "☑" : "☐"} {label}
            </li>
          ))}
        </ul>
        {structure === "milestone-based" && model.paymentTerms && model.paymentTerms.milestones.length > 0 ? (
          <ul className="mb-2 list-inside list-disc space-y-1">
            {model.paymentTerms.milestones
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((m) => (
                <li key={m.id}>
                  {m.description} – {formatMoney(m.amount, model.currency)} (Due: {dateLabel(m.date)})
                </li>
              ))}
          </ul>
        ) : null}
        {model.paymentTerms?.paymentMethod ? (
          <p className="mb-2">Payment Method: {model.paymentTerms.paymentMethod}</p>
        ) : null}
        <p className="text-muted-foreground">
          Work will commence only after receipt of any applicable upfront payment. Late payments may result in work being
          paused until the outstanding balance is cleared.
        </p>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">4. Revisions</h3>
        <p>Up to {model.numberOfRevisions} revisions are included.</p>
        <p className="mt-2 text-muted-foreground">
          A revision means minor adjustments within the agreed scope of work. A complete redesign or change of direction
          will be treated as new work and billed separately.
        </p>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">5. Client Responsibilities</h3>
        <ul className="list-inside list-disc space-y-1">
          <li>Provide all required content, materials, and feedback in a timely manner.</li>
          <li>Review and approve deliverables within a reasonable time.</li>
          <li>Ensure that all materials supplied do not infringe on any third-party rights.</li>
        </ul>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">6. Ownership &amp; Usage Rights</h3>
        <p>
          All intellectual property rights in the deliverables transfer to the Client upon receipt of full payment. The
          Service Provider retains the right to display the work in its portfolio unless agreed otherwise in writing.
        </p>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">7. Confidentiality</h3>
        <p>
          Both parties agree to keep confidential any non-public information shared during the course of this engagement
          and to use such information solely for the purpose of fulfilling the obligations under this Agreement.
        </p>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">8. Termination</h3>
        <p>
          Either party may terminate this Agreement with written notice. Payments for completed work are non-refundable.
          Upon settlement of any outstanding dues, the Service Provider will hand over completed deliverables.
        </p>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">9. Limitation of Liability</h3>
        <p>
          The Service Provider shall not be liable for any lost business or revenue, third-party tools or hosting issues,
          or delays caused by the Client.
        </p>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">10. Governing Law</h3>
        <p>Governing Law / Jurisdiction: {model.jurisdiction || "[Jurisdiction / Country]"}</p>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">11. Acceptance &amp; E-Signature</h3>
        <div className="space-y-4">
          <div>
            <p className="font-medium">Service Provider</p>
            {model.serviceProviderSignaturePreviewUrl ? (
              <img
                src={model.serviceProviderSignaturePreviewUrl}
                alt="Service provider signature"
                className="mt-2 max-h-28 max-w-xs border border-border bg-white object-contain p-1"
              />
            ) : sp?.signatureImagePath ? (
              <p className="text-muted-foreground">[Signature image on file]</p>
            ) : null}
            {spSigner ? <p className="mt-1">{spSigner}</p> : <p className="text-muted-foreground">[Pending signature]</p>}
          </div>
          <div>
            <p className="font-medium">Client</p>
            {clientSigs.length === 0 ? (
              <p className="text-muted-foreground">[Pending signature]</p>
            ) : (
              clientSigs.map((sig) => (
                <div key={sig.id} className="mt-2 border-t border-border pt-2">
                  <p>{sig.signerName}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
