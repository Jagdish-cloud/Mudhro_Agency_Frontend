import { z } from "zod";

import { INVOICE_REMINDER_PRESETS } from "@/lib/invoiceReminderPresets";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const allowedReminderOffsets: number[] = INVOICE_REMINDER_PRESETS.map(
  (preset) => preset.offset,
);
const dateString = z.string().trim().regex(ISO_DATE_REGEX, "Use YYYY-MM-DD");

export const agencyInvoiceItemSchema = z.object({
  itemName: z.string().trim().min(1, "Name required").max(200),
  description: z.string().trim().max(2000).optional().default(""),
  hsnCode: z.string().trim().min(1, "HSN required").max(20),
  qty: z.coerce.number().positive("Qty must be > 0"),
  rate: z.coerce.number().min(0, "Rate must be >= 0"),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  taxPercent: z.coerce.number().min(0).max(100).default(0),
});

export const agencyInstallmentSchema = z.object({
  sequence: z.coerce.number().int().min(1),
  dueDate: dateString,
  amount: z.coerce.number().positive(),
});

export const agencyInvoiceSchema = z
  .object({
    clientId: z.string().uuid("Select a client"),
    projectId: z.string().uuid().optional().or(z.literal("")),
    invoiceNumber: z.string().trim().max(60).optional().default(""),
    issueDate: dateString,
    dueDate: dateString,
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter ISO code")
      .default("INR"),
    status: z
      .enum(["draft", "sent", "viewed", "paid", "partial", "overdue", "cancelled"])
      .default("draft"),
    paymentTerms: z.string().trim().max(500).optional().default(""),
    notes: z.string().trim().max(2000).optional().default(""),
    placeOfSupply: z
      .string()
      .trim()
      .optional()
      .default("")
      .refine((v) => !v || /^[0-9]{2}$/.test(v), "State code must be 2 digits"),
    items: z.array(agencyInvoiceItemSchema).min(1, "Add at least one line item"),
    installments: z.array(agencyInstallmentSchema).optional().default([]),
    discountTotal: z.coerce.number().min(0).default(0),
    amountsInclusiveOfTax: z.boolean().default(false),
    remindersEnabled: z.boolean().default(true),
    reminderOffsets: z
      .array(z.number().int())
      .default([0])
      .refine(
        (offsets) => offsets.every((offset) => allowedReminderOffsets.includes(offset)),
        "Invalid reminder selection",
      ),
    // UI-only: drives the installments field array; not POSTed to the API.
    paymentTermsMode: z.enum(["full", "advance_balance"]).default("full"),
  })
  .refine((data) => data.dueDate >= data.issueDate, {
    message: "Due date must be on or after issue date",
    path: ["dueDate"],
  })
  .refine(
    (data) => !data.remindersEnabled || data.reminderOffsets.length >= 1,
    {
      message: "Select at least one payment reminder",
      path: ["reminderOffsets"],
    },
  );

export type AgencyInvoiceFormValues = z.infer<typeof agencyInvoiceSchema>;
export type AgencyInvoiceItemFormValues = z.infer<typeof agencyInvoiceItemSchema>;
export type AgencyInstallmentFormValues = z.infer<typeof agencyInstallmentSchema>;

export const recordPaymentSchema = z.object({
  amount: z.coerce.number().positive(),
  method: z
    .enum(["cash", "upi", "bank_transfer", "card", "cheque", "other"])
    .default("bank_transfer"),
  reference: z.string().trim().max(200).optional().default(""),
  receivedAt: z.string().trim().optional().default(""),
  installmentId: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().default(""),
  paymentGatewayFee: z.coerce.number().min(0).optional().default(0),
  tdsDeducted: z.coerce.number().min(0).optional().default(0),
  otherDeduction: z.coerce.number().min(0).optional().default(0),
});

export type RecordPaymentFormValues = z.infer<typeof recordPaymentSchema>;

export const sendInvoiceFormSchema = z.object({
  emailOverride: z.string().trim().email().optional().or(z.literal("")),
  message: z.string().trim().max(4000).optional().default(""),
});

export type SendInvoiceFormValues = z.infer<typeof sendInvoiceFormSchema>;
