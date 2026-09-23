import { z } from "zod";

export const bulkImportSchema = z.object({
  rows: z.array(z.object({
    name: z.string().min(1),
    sku: z.string().min(1),
    category: z.string().min(1),
    quantity: z.number().int().min(0),
    price: z.number().min(0),
    minStock: z.number().int().min(0),
    monthlyInterest: z.number().min(0),
    description: z.string().optional(),
    image: z.string().url().optional().or(z.literal("")),
    availableBranches: z.array(z.string()).optional(),
  })),
});
