import { formatCurrency } from "@/lib/currency";

/** Hex/sRGB only — html2canvas cannot parse Tailwind v4 `oklab()` theme colors. */
const PREVIEW = {
  bg: "#ffffff",
  text: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  borderLight: "#cbd5e1",
} as const;

export type ExpensePreviewLine = {
  serviceName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type ExpensePreviewProps = {
  id?: string;
  organizationName: string;
  vendorName: string;
  projectName?: string | null;
  billNumber: string;
  billDate: string;
  dueDate: string;
  lines: ExpensePreviewLine[];
  taxPercentage: number;
  subTotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  additionalNotes?: string | null;
  currencyCode?: string;
};

export function ExpensePreview({
  id = "expense-preview-print",
  organizationName,
  vendorName,
  projectName,
  billNumber,
  billDate,
  dueDate,
  lines,
  taxPercentage,
  subTotalAmount,
  taxAmount,
  totalAmount,
  additionalNotes,
  currencyCode = "INR",
}: ExpensePreviewProps) {
  return (
    <div
      id={id}
      className="rounded-lg p-6 text-sm print:border-0 print:shadow-none"
      style={{
        backgroundColor: PREVIEW.bg,
        color: PREVIEW.text,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: PREVIEW.border,
      }}
    >
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: PREVIEW.muted }}>
            From
          </p>
          <p className="text-lg font-semibold">{organizationName}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: PREVIEW.muted }}>
            Bill
          </p>
          <p className="text-lg font-semibold">{billNumber}</p>
          <p style={{ color: PREVIEW.muted }}>Bill date: {billDate}</p>
          <p style={{ color: PREVIEW.muted }}>Due: {dueDate}</p>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: PREVIEW.muted }}>
            Vendor
          </p>
          <p className="font-medium">{vendorName}</p>
        </div>
        {projectName ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: PREVIEW.muted }}>
              Project
            </p>
            <p className="font-medium">{projectName}</p>
          </div>
        ) : null}
      </div>

      <table className="w-full border-collapse text-left">
        <thead>
          <tr
            className="text-xs uppercase tracking-wide"
            style={{ borderBottomWidth: 1, borderBottomStyle: "solid", borderBottomColor: PREVIEW.border }}
          >
            <th className="pb-2 pr-2" style={{ color: PREVIEW.muted }}>
              Service
            </th>
            <th className="pb-2 pr-2 text-right" style={{ color: PREVIEW.muted }}>
              Qty
            </th>
            <th className="pb-2 pr-2 text-right" style={{ color: PREVIEW.muted }}>
              Rate
            </th>
            <th className="pb-2 text-right" style={{ color: PREVIEW.muted }}>
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => (
            <tr
              key={i}
              style={{
                borderBottomWidth: 1,
                borderBottomStyle: "solid",
                borderBottomColor: PREVIEW.borderLight,
              }}
            >
              <td className="py-2 pr-2">{line.serviceName}</td>
              <td className="py-2 pr-2 text-right">{line.quantity}</td>
              <td className="py-2 pr-2 text-right tabular-nums">
                {formatCurrency(line.unitPrice, currencyCode)}
              </td>
              <td className="py-2 text-right tabular-nums">
                {formatCurrency(line.lineTotal, currencyCode)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 ml-auto w-full max-w-xs space-y-1 text-sm">
        <div className="flex justify-between">
          <span style={{ color: PREVIEW.muted }}>Subtotal</span>
          <span className="tabular-nums">{formatCurrency(subTotalAmount, currencyCode)}</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: PREVIEW.muted }}>Tax ({taxPercentage}%)</span>
          <span className="tabular-nums">{formatCurrency(taxAmount, currencyCode)}</span>
        </div>
        <div
          className="flex justify-between pt-2 text-base font-semibold"
          style={{ borderTopWidth: 1, borderTopStyle: "solid", borderTopColor: PREVIEW.border }}
        >
          <span>Total</span>
          <span className="tabular-nums">{formatCurrency(totalAmount, currencyCode)}</span>
        </div>
      </div>

      {additionalNotes ? (
        <div className="mt-6 pt-4" style={{ borderTopWidth: 1, borderTopStyle: "solid", borderTopColor: PREVIEW.border }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: PREVIEW.muted }}>
            Notes
          </p>
          <p className="mt-1 whitespace-pre-wrap" style={{ color: PREVIEW.muted }}>
            {additionalNotes}
          </p>
        </div>
      ) : null}
    </div>
  );
}
