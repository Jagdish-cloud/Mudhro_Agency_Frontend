import { z } from "zod";

const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{3}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const PHONE_REGEX = /^[+0-9 \-()]{0,20}$/;

export const agencyVendorSchema = z.object({
  name: z.string().trim().min(1, "Vendor name is required").max(200),
  contactName: z.string().trim().max(200).optional().default(""),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(200)
    .optional()
    .default("")
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter a valid email"),
  phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .default("")
    .refine((v) => !v || PHONE_REGEX.test(v), "Enter a valid phone"),
  billingAddress: z.string().trim().max(1000).optional().default(""),
  gstNumber: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .default("")
    .refine((v) => !v || GST_REGEX.test(v), "Invalid GST format"),
  panNumber: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .default("")
    .refine((v) => !v || PAN_REGEX.test(v), "Invalid PAN format"),
  stateCode: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine((v) => !v || /^[0-9]{2}$/.test(v), "State code must be 2 digits"),
  status: z.enum(["active", "inactive", "archived"]).default("active"),
  notes: z.string().trim().max(2000).optional().default(""),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
});

export type AgencyVendorFormValues = z.infer<typeof agencyVendorSchema>;
