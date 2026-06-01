export type CurrencyCode = "INR" | "USD" | "EUR" | "GBP" | "AED" | "SGD";

export const SUPPORTED_CURRENCIES: CurrencyCode[] = ["INR", "USD", "EUR", "GBP", "AED", "SGD"];

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AED: "د.إ",
  SGD: "S$",
};

const LOCALE_BY_CURRENCY: Record<CurrencyCode, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "en-IE",
  GBP: "en-GB",
  AED: "en-AE",
  SGD: "en-SG",
};

export function getCurrencySymbol(code: string): string {
  const upper = (code || "INR").toUpperCase();
  return CURRENCY_SYMBOLS[upper as CurrencyCode] ?? upper;
}

export function formatCurrency(amount: number | string | null | undefined, code = "INR"): string {
  const upper = (code || "INR").toUpperCase() as CurrencyCode;
  const value = typeof amount === "string" ? Number(amount) : (amount ?? 0);
  const numeric = Number.isFinite(value) ? (value as number) : 0;
  const locale = LOCALE_BY_CURRENCY[upper] ?? "en-IN";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: upper,
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(numeric);
  } catch {
    return `${getCurrencySymbol(upper)} ${numeric.toFixed(2)}`;
  }
}

export function formatNumber(amount: number | string | null | undefined, digits = 2): string {
  const value = typeof amount === "string" ? Number(amount) : (amount ?? 0);
  const numeric = Number.isFinite(value) ? (value as number) : 0;
  return numeric.toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
