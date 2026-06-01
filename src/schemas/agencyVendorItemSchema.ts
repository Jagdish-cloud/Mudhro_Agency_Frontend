import { z } from "zod";

export const agencyVendorItemSchema = z.object({
  itemName: z.string().trim().min(1, "Item name is required").max(200),
  description: z.string().trim().max(2000).optional().default(""),
  defaultQuantity: z.coerce.number().positive("Quantity must be > 0").default(1),
  defaultRate: z.coerce.number().min(0).default(0),
});

export type AgencyVendorItemFormValues = z.infer<typeof agencyVendorItemSchema>;
