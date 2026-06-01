import { z } from "zod";

const IN_MOBILE_REGEX = /^[6-9]\d{9}$/;

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[0-9]/, "Include a number")
  .regex(/[^A-Za-z0-9]/, "Include a special character");

const baseProfileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120, "Name is too long"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  number: z
    .string()
    .trim()
    .regex(IN_MOBILE_REGEX, "Enter a valid 10-digit Indian mobile number"),
  designation: z
    .string()
    .trim()
    .min(1, "Designation is required")
    .max(120, "Designation is too long"),
});

export const createUserFormSchema = baseProfileSchema
  .extend({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export type CreateUserFormValues = z.infer<typeof createUserFormSchema>;

export const updateMemberFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  number: z
    .string()
    .trim()
    .regex(IN_MOBILE_REGEX, "Enter a valid 10-digit Indian mobile number"),
  designation: z.string().trim().min(1, "Designation is required").max(120),
  status: z.enum(["active", "inactive"]),
  role: z.union([z.literal(1), z.literal(2)]),
});

export type UpdateMemberFormValues = z.infer<typeof updateMemberFormSchema>;

export const updateSelfProfileFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120, "Name is too long"),
  number: z
    .string()
    .trim()
    .regex(IN_MOBILE_REGEX, "Enter a valid 10-digit Indian mobile number"),
  designation: z
    .string()
    .trim()
    .min(1, "Designation is required")
    .max(120, "Designation is too long"),
});

export type UpdateSelfProfileFormValues = z.infer<typeof updateSelfProfileFormSchema>;

export const changePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    path: ["newPassword"],
    message: "New password must be different from current password",
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>;
