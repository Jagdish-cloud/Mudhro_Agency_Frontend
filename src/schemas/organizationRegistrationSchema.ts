import { z } from "zod";

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{3}$/;
const IN_MOBILE_REGEX = /^[6-9]\d{9}$/;

const strongPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Include at least one uppercase letter")
  .regex(/[a-z]/, "Include at least one lowercase letter")
  .regex(/[0-9]/, "Include at least one number")
  .regex(/[^A-Za-z0-9]/, "Include at least one special character");

const contactPersonSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  number: z
    .string()
    .min(1, "Mobile number is required")
    .regex(IN_MOBILE_REGEX, "Enter a valid 10-digit Indian mobile number"),
  designation: z.string().min(1, "Designation is required"),
});

const adminRowSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.string().min(1, "Email is required").email("Enter a valid email"),
    number: z
      .string()
      .min(1, "Mobile number is required")
      .regex(IN_MOBILE_REGEX, "Enter a valid 10-digit Indian mobile number"),
    designation: z.string().min(1, "Designation is required"),
    password: strongPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .superRefine((row, ctx) => {
    if (row.password !== row.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
    }
  });

export const organizationRegistrationSchema = z
  .object({
    organizationName: z.string().min(1, "Organization name is required"),
    address: z.string().min(1, "Address is required"),
    isUnregistered: z.boolean(),
    gstNumber: z.string(),
    companyPan: z
      .string()
      .min(1, "Company PAN is required")
      .transform((s) => s.trim().toUpperCase())
      .refine((v) => PAN_REGEX.test(v), "Enter a valid Company PAN (e.g. ABCDE1234F)"),
    companyMobile: z
      .string()
      .min(1, "Company mobile is required")
      .regex(IN_MOBILE_REGEX, "Enter a valid 10-digit Indian mobile number"),
    companyEmail: z.string().min(1, "Company email is required").email("Enter a valid email"),
    contactPersons: z.array(contactPersonSchema).min(1, "Add at least one contact person"),
    admins: z.array(adminRowSchema).min(1, "Add at least one admin"),
  })
  .superRefine((data, ctx) => {
    if (!data.isUnregistered) {
      const raw = data.gstNumber?.trim() ?? "";
      if (!raw) {
        ctx.addIssue({
          code: "custom",
          message: "GST number is required for registered businesses",
          path: ["gstNumber"],
        });
      } else {
        const normalized = raw.toUpperCase();
        if (!GST_REGEX.test(normalized)) {
          ctx.addIssue({
            code: "custom",
            message: "Enter a valid 15-character GSTIN",
            path: ["gstNumber"],
          });
        }
      }
    }
  })
  .superRefine((data, ctx) => {
    const emailToIndexes = new Map<string, number[]>();
    data.admins.forEach((admin, index) => {
      const key = admin.email.trim().toLowerCase();
      const list = emailToIndexes.get(key) ?? [];
      list.push(index);
      emailToIndexes.set(key, list);
    });

    for (const [, indexes] of emailToIndexes) {
      if (indexes.length > 1) {
        for (const i of indexes) {
          ctx.addIssue({
            code: "custom",
            message: "Each admin must have a unique email",
            path: ["admins", i, "email"],
          });
        }
      }
    }
  });

export type OrganizationRegistrationFormValues = z.infer<typeof organizationRegistrationSchema>;
