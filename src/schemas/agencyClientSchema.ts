import { z } from "zod";

const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{3}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const PHONE_REGEX = /^[+0-9 \-()]{0,20}$/;

export const agencyClientSchema = z
  .object({
    clientRegion: z.enum(["domestic", "international"]).default("domestic"),
    name: z.string().trim().min(1, "Client name is required").max(200),
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
    legalIdLabel: z.string().trim().max(100).optional().default(""),
    legalIdNumber: z.string().trim().max(100).optional().default(""),
    status: z.enum(["active", "inactive", "archived"]).default("active"),
    notes: z.string().trim().max(2000).optional().default(""),
    tags: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.clientRegion === "domestic") {
      if (data.legalIdLabel || data.legalIdNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Legal ID fields are only for international clients.",
          path: ["legalIdNumber"],
        });
      }
      return;
    }

    if (data.gstNumber || data.panNumber || data.stateCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "GST, PAN, and state code are not used for international clients.",
        path: ["gstNumber"],
      });
    }
  });

export type AgencyClientFormValues = z.infer<typeof agencyClientSchema>;

export function validateInternationalVerification(
  values: AgencyClientFormValues,
  options: { hasExistingLegalDocument?: boolean; pendingLegalFile?: File | null },
): string | null {
  if (values.clientRegion !== "international") return null;

  const hasNumber = Boolean(values.legalIdNumber?.trim());
  const hasDoc =
    Boolean(options.pendingLegalFile) || Boolean(options.hasExistingLegalDocument);

  if (!hasNumber && !hasDoc) {
    return "Provide a government ID number or upload a legal document.";
  }

  return null;
}
