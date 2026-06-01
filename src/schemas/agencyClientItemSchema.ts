import { z } from "zod";

const nonNegNumber = z.coerce.number().min(0);
const percent = z.coerce.number().min(0).max(100);

export const agencyClientItemSchema = z.object({
  itemName: z.string().trim().min(1, "Item name is required").max(200),
  description: z.string().trim().max(2000).optional().default(""),
  hsnCode: z
    .string()
    .trim()
    .min(1, "HSN/SAC code is required")
    .max(20, "HSN/SAC code is too long"),
  defaultRate: nonNegNumber.default(0),
  defaultTaxPercent: percent.default(0),
  defaultDiscountPercent: percent.default(0),
  unit: z.string().trim().max(50).optional().default(""),
});

export type AgencyClientItemFormValues = z.infer<
  typeof agencyClientItemSchema
>;
