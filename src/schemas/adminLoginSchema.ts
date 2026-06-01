import { z } from "zod";

export const adminLoginFormSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type AdminLoginFormValues = z.infer<typeof adminLoginFormSchema>;
