import { z } from "zod";

// react-hook-form's valueAsNumber turns empty inputs into NaN, not undefined.
// z.number() rejects NaN even with .optional(), so we pre-process it away.
const nanToUndefined = (v: unknown) =>
  typeof v === "number" && isNaN(v) ? undefined : v;

const optionalNum = z.preprocess(nanToUndefined, z.number().min(0).optional());

const variantSchema = z.object({
  name: z.string().min(1, { message: "Enter grade name" }),
  unitPrice: z.preprocess(nanToUndefined, z.number().min(0, { message: "Enter price" })),
  stock: z.preprocess(nanToUndefined, z.number().min(0, { message: "Enter quantity" })),
  minStockLevel: z.preprocess(nanToUndefined, z.number().min(0, { message: "Enter min level" })),
});

export const newProductSchema = z
  .object({
    name: z.string().min(1, { message: "Enter product name" }),
    categoryId: z.string().min(1, { message: "Choose a category" }),
    unit: z.string().min(1, { message: "Choose a unit" }),
    hasVariants: z.boolean().default(false),
    unitPrice: optionalNum,
    stock: optionalNum,
    minStockLevel: optionalNum,
    variants: z.array(variantSchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.hasVariants) {
      if (data.unitPrice === undefined || data.unitPrice < 1) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a value", path: ["unitPrice"] });
      }
      if (data.stock === undefined || data.stock < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a value", path: ["stock"] });
      }
      if (data.minStockLevel === undefined || data.minStockLevel < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a value", path: ["minStockLevel"] });
      }
    } else {
      if (!data.variants || data.variants.length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Add at least one grade/variant", path: ["variants"] });
      }
    }
  });

export type NewProductFormValues = z.infer<typeof newProductSchema>;
