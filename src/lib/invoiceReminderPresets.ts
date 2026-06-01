export const INVOICE_REMINDER_PRESETS = [
  { offset: -3, label: "3 days before due" },
  { offset: 0, label: "On due date" },
  { offset: 7, label: "7 days after" },
  { offset: 10, label: "10 days after" },
  { offset: 15, label: "15 days after" },
] as const;

export type InvoiceReminderOffset = (typeof INVOICE_REMINDER_PRESETS)[number]["offset"];
