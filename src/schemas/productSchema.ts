import { z } from "zod";

// react-hook-form's valueAsNumber turns empty inputs into NaN, not undefined.
// z.number() rejects NaN even with .optional(), so we pre-process it away.
const nanToUndefined = (v: unknown) =>
  typeof v === "number" && isNaN(v) ? undefined : v;

// Cast is required: z.preprocess infers output as `unknown` in TypeScript,
// but at runtime it produces the correct value. The cast restores the proper type.
const optionalNum = z.preprocess(nanToUndefined, z.number().min(0).optional()) as z.ZodType<number | undefined>;

const variantSchema = z.object({
  name: z.string().min(1, { message: "Enter grade name" }),
  unitPrice: z.preprocess(nanToUndefined, z.number().min(0, { message: "Enter price" })) as z.ZodType<number>,
  stock: z.preprocess(nanToUndefined, z.number().min(0, { message: "Enter quantity" })) as z.ZodType<number>,
  minStockLevel: z.preprocess(nanToUndefined, z.number().min(0, { message: "Enter min level" })) as z.ZodType<number>,
});

export const newProductSchema = z
  .object({
    name: z.string().min(1, { message: "Enter product name" }),
    categoryId: z.string().min(1, { message: "Choose a category" }),
    unit: z.string().min(1, { message: "Choose a unit" }),
    hasVariants: z.boolean().default(false),
    isBundleProduct: z.boolean().default(false),
    bundleSize: z.preprocess(nanToUndefined, z.number().min(1).optional()) as z.ZodType<number | undefined>,
    subUnit: z.string().optional(),
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

// Explicit type because z.preprocess() infers output as `unknown` in TypeScript,
// even though the runtime values are correctly typed numbers.
export type NewProductFormValues = {
  name: string;
  categoryId: string;
  unit: string;
  hasVariants: boolean;
  isBundleProduct?: boolean;
  bundleSize?: number;
  subUnit?: string;
  unitPrice?: number;
  stock?: number;
  minStockLevel?: number;
  variants?: {
    name: string;
    unitPrice: number;
    stock: number;
    minStockLevel: number;
  }[];
};
