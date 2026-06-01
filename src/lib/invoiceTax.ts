export type InvoiceItemInput = {
  qty: number | string;
  rate: number | string;
  taxPercent?: number | string;
  discountPercent?: number | string;
};

export type ComputedInvoiceItem = {
  lineSubtotal: number;
  taxAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  lineTotal: number;
};

export type ComputedInvoiceTotals = {
  subtotal: number;
  discountTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  taxTotal: number;
  grandTotal: number;
};

function num(value: number | string | undefined | null, fallback = 0): number {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(parsed) ? (parsed as number) : fallback;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function isIntraState(sellerStateCode?: string | null, buyerStateCode?: string | null): boolean {
  if (!sellerStateCode || !buyerStateCode) return true;
  return sellerStateCode.trim().toUpperCase() === buyerStateCode.trim().toUpperCase();
}

export function computeInvoiceItem(
  item: InvoiceItemInput,
  options: {
    sellerStateCode?: string | null;
    buyerStateCode?: string | null;
    discountTotal?: number;
    subtotalForDiscount?: number;
    amountsInclusiveOfTax?: boolean;
  } = {},
): ComputedInvoiceItem {
  const qty = num(item.qty);
  const rate = num(item.rate);
  const taxPercent = num(item.taxPercent);
  const discountPercent = num(item.discountPercent);

  // When the entered rate already includes tax, derive the net rate so the
  // downstream math (discount, line subtotal, tax split) stays the same as
  // for tax-exclusive invoices.
  const effectiveRate =
    options.amountsInclusiveOfTax && taxPercent > 0
      ? rate / (1 + taxPercent / 100)
      : rate;
  const gross = qty * effectiveRate;
  const lineDiscount = gross * (discountPercent / 100);
  const lineSubtotal = round2(gross - lineDiscount);

  const taxAmount = round2(lineSubtotal * (taxPercent / 100));
  const intra = isIntraState(options.sellerStateCode, options.buyerStateCode);
  const cgstAmount = intra ? round2(taxAmount / 2) : 0;
  const sgstAmount = intra ? round2(taxAmount - cgstAmount) : 0;
  const igstAmount = intra ? 0 : taxAmount;

  const lineTotal = round2(lineSubtotal + taxAmount);
  return { lineSubtotal, taxAmount, cgstAmount, sgstAmount, igstAmount, lineTotal };
}

export function computeInvoiceTotals(
  items: InvoiceItemInput[],
  options: {
    sellerStateCode?: string | null;
    buyerStateCode?: string | null;
    discountTotal?: number | string;
    amountsInclusiveOfTax?: boolean;
  } = {},
): ComputedInvoiceTotals & { items: ComputedInvoiceItem[] } {
  const itemOptions = {
    sellerStateCode: options.sellerStateCode,
    buyerStateCode: options.buyerStateCode,
    amountsInclusiveOfTax: options.amountsInclusiveOfTax,
  };
  const computedItems = items.map((item) => computeInvoiceItem(item, itemOptions));
  const subtotal = round2(computedItems.reduce((acc, it) => acc + it.lineSubtotal, 0));
  const cgstTotal = round2(computedItems.reduce((acc, it) => acc + it.cgstAmount, 0));
  const sgstTotal = round2(computedItems.reduce((acc, it) => acc + it.sgstAmount, 0));
  const igstTotal = round2(computedItems.reduce((acc, it) => acc + it.igstAmount, 0));
  const taxTotal = round2(cgstTotal + sgstTotal + igstTotal);
  const discountTotal = round2(num(options.discountTotal));
  const grandTotal = round2(Math.max(0, subtotal + taxTotal - discountTotal));
  return { subtotal, discountTotal, cgstTotal, sgstTotal, igstTotal, taxTotal, grandTotal, items: computedItems };
}

export function stateCodeFromGst(gstNumber?: string | null): string | null {
  if (!gstNumber) return null;
  const trimmed = gstNumber.trim();
  if (trimmed.length < 2) return null;
  return trimmed.slice(0, 2);
}
