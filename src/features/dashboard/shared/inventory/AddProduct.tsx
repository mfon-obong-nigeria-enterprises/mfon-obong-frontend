import { useEffect, useState, useCallback } from "react";
import { type AxiosError } from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { useForm, Controller, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useInventoryStore } from "@/stores/useInventoryStore";
import { createProduct } from "@/services/productService";
import { getWarehouseProducts, getWarehouses, transferFromWarehouse, type WarehouseProduct } from "@/services/warehouseService";
import { useGoBack } from "@/hooks/useGoBack";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Trash2 } from "lucide-react";

// ── Schema ────────────────────────────────────────────────────────────────────

const nanToUndef = (v: unknown) => (typeof v === "number" && isNaN(v) ? undefined : v);
const optNum = z.preprocess(nanToUndef, z.number().min(0).optional()) as z.ZodType<number | undefined>;

const variantRow = z.object({
  name: z.string(),
  warehouseProductVariantId: z.string().optional(),
  unitPrice: z.preprocess(nanToUndef, z.number().min(0, "Enter price")) as z.ZodType<number>,
  stock: z.preprocess(nanToUndef, z.number().min(0, "Enter qty")) as z.ZodType<number>,
  minStockLevel: z.preprocess(nanToUndef, z.number().min(0, "Enter min")) as z.ZodType<number>,
});

const schema = z.object({
  categoryId: z.string().min(1, "Choose a category"),
  warehouseProductId: z.string().min(1, "Choose a product"),
  isBundleProduct: z.boolean().default(false),
  bundleSize: z.preprocess(nanToUndef, z.number().min(1).optional()) as z.ZodType<number | undefined>,
  subUnit: z.string().optional(),
  // simple product fields
  unitPrice: optNum,
  stock: optNum,
  minStockLevel: optNum,
  // variant rows
  variants: z.array(variantRow).optional(),
});

type FormValues = z.infer<typeof schema>;

// ── Component ─────────────────────────────────────────────────────────────────

const AddProduct = () => {
  const goBack = useGoBack();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const { categories, products: branchProducts } = useInventoryStore();
  const branchId = useAuthStore(s => s.user?.branchId);

  const [selectedWProduct, setSelectedWProduct] = useState<WarehouseProduct | null>(null);
  const [sourceFromWarehouse, setSourceFromWarehouse] = useState(false);
  const [warehouseId, setWarehouseId] = useState("");

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues: { isBundleProduct: false, variants: [] },
  });

  const selectedCategoryId = useWatch({ control, name: "categoryId" });
  const isBundleProduct = watch("isBundleProduct");

  // Fetch warehouses for "source from warehouse" selector
  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: getWarehouses,
  });

  // Fetch warehouse products for the selected category
  const { data: warehouseProducts = [] } = useQuery({
    queryKey: ["warehouse-products", selectedCategoryId],
    queryFn: () => getWarehouseProducts(undefined, selectedCategoryId),
    enabled: !!selectedCategoryId,
  });

  // Exclude warehouse products already added to this branch
  const availableWarehouseProducts = warehouseProducts.filter(
    wp => !branchProducts.some(bp => bp.warehouseProductId === (wp._id || wp.id))
  );

  // Reset warehouse product when category changes
  useEffect(() => {
    setValue("warehouseProductId", "");
    setSelectedWProduct(null);
    setSourceFromWarehouse(false);
    setWarehouseId("");
  }, [selectedCategoryId, setValue]);

  const handleWarehouseProductSelect = (wpId: string) => {
    const wp = warehouseProducts.find(p => p._id === wpId || p.id === wpId);
    if (!wp) return;
    setSelectedWProduct(wp);
    setValue("warehouseProductId", wpId);
    setValue("variants", []);
    setValue("stock", 0);
    setSourceFromWarehouse(false);
    setWarehouseId("");
  };

  const addVariantFromWarehouse = useCallback((warehouseVariantId: string) => {
    if (!selectedWProduct) return;
    const wv = selectedWProduct.variants.find(v => (v._id || v.id) === warehouseVariantId);
    if (!wv) return;
    const current = watch("variants") ?? [];
    setValue("variants", [
      ...current,
      {
        name: wv.name,
        warehouseProductVariantId: wv._id || wv.id,
        unitPrice: 0,
        stock: 0,
        minStockLevel: 0,
      },
    ]);
  }, [selectedWProduct, watch, setValue]);

  const removeVariant = useCallback((index: number) => {
    const current = watch("variants") ?? [];
    setValue("variants", current.filter((_, i) => i !== index));
  }, [watch, setValue]);

  const onSubmit = async (data: FormValues) => {
    if (!branchId) { toast.error("Branch ID missing — please log in again"); return; }
    if (!selectedWProduct) { toast.error("Select a warehouse product"); return; }
    if (selectedWProduct.hasVariants && (!data.variants || data.variants.length === 0)) {
      toast.error("Add at least one grade before saving");
      return;
    }

    setIsLoading(true);
    try {
      const payload: any = {
        name: selectedWProduct.name,
        categoryId: selectedWProduct.categoryId,
        unit: selectedWProduct.unit,
        hasVariants: selectedWProduct.hasVariants,
        isBundleProduct: data.isBundleProduct,
        bundleSize: data.bundleSize,
        subUnit: data.subUnit,
        branchId,
        warehouseProductId: selectedWProduct._id || selectedWProduct.id,
      };

      if (selectedWProduct.hasVariants) {
        payload.variants = (data.variants ?? []).map(v => ({
          name: v.name,
          warehouseProductVariantId: v.warehouseProductVariantId,
          unitPrice: v.unitPrice,
          stock: v.stock,
          minStockLevel: v.minStockLevel,
        }));
      } else {
        payload.unitPrice = data.unitPrice;
        payload.stock = data.stock;
        payload.minStockLevel = data.minStockLevel;
      }

      await createProduct(payload);
      queryClient.invalidateQueries({ queryKey: ["products"] });

      // Source from warehouse: deduct from warehouse stock
      if (sourceFromWarehouse && warehouseId) {
        if (selectedWProduct.hasVariants) {
          const variants = data.variants ?? [];
          for (const v of variants) {
            if (v.stock > 0 && v.warehouseProductVariantId) {
              await transferFromWarehouse({
                warehouseId,
                branchId: branchId!,
                warehouseProductId: selectedWProduct._id || selectedWProduct.id,
                warehouseProductVariantId: v.warehouseProductVariantId,
                quantity: v.stock,
                notes: `Initial stock for branch product creation`,
              });
            }
          }
        } else if ((data.stock ?? 0) > 0) {
          await transferFromWarehouse({
            warehouseId,
            branchId: branchId!,
            warehouseProductId: selectedWProduct._id || selectedWProduct.id,
            quantity: data.stock!,
            notes: `Initial stock for branch product creation`,
          });
        }
        queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      }

      toast.success("Product added to branch");
      reset();
      setSelectedWProduct(null);
      setSourceFromWarehouse(false);
      setWarehouseId("");
      goBack();
    } catch (error) {
      const err = error as AxiosError<{ message: string }>;
      toast.error(err?.response?.data?.message || "Error creating product");
    } finally {
      setIsLoading(false);
    }
  };

  const variants = watch("variants") ?? [];

  return (
    <section className="min-h-screen bg-[#F5F5F5] px-3 md:px-10 py-2 flex justify-center items-start font-Inter pt-10">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white max-w-[60rem] w-full rounded-[0.625rem] border border-[#d9d9d9] px-5 md:px-10 py-10 space-y-4"
      >
        <h5 className="text-[#333333] font-medium text-sm md:text-lg">
          Add Product to Branch
        </h5>

        <div className="border-t border-[#d9d9d9] mt-2 py-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Category */}
          <Controller
            name="categoryId"
            control={control}
            render={({ field }) => (
              <div className="flex flex-col gap-2">
                <Label className="text-[#333333] text-sm">Category</Label>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {categories.map(cat => (
                        <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {errors.categoryId && <p className="text-red-500 text-xs">{errors.categoryId.message}</p>}
              </div>
            )}
          />

          {/* Warehouse Product */}
          <Controller
            name="warehouseProductId"
            control={control}
            render={({ field }) => (
              <div className="flex flex-col gap-2">
                <Label className="text-[#333333] text-sm">Product (from warehouse)</Label>
                <Select
                  onValueChange={v => { field.onChange(v); handleWarehouseProductSelect(v); }}
                  value={field.value ?? ""}
                  disabled={!selectedCategoryId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={selectedCategoryId ? "Select product" : "Select a category first"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {availableWarehouseProducts.length === 0 ? (
                        <div className="py-2 px-3 text-sm text-gray-500">
                          {warehouseProducts.length === 0
                            ? "No products in this category"
                            : "All products in this category have already been added"}
                        </div>
                      ) : (
                        availableWarehouseProducts.map(p => (
                          <SelectItem key={p._id} value={p._id}>
                            {p.name} ({p.unit})
                          </SelectItem>
                        ))
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {errors.warehouseProductId && <p className="text-red-500 text-xs">{errors.warehouseProductId.message}</p>}
              </div>
            )}
          />
        </div>

        {/* Product details — shown only when a warehouse product is selected */}
        {selectedWProduct && (
          <>
            {/* Info banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800 flex gap-2 items-start">
              <span className="mt-0.5">ℹ</span>
              <span>
                <strong>{selectedWProduct.name}</strong> &nbsp; Primary Unit: {selectedWProduct.unit} - {selectedWProduct.hasVariants ? "Multi-variant product" : "Simple product"}
              </span>
            </div>

            <h5 className="text-[#333333] font-medium text-sm md:text-lg mt-4">Inventory & Pricing</h5>
            <div className="border-t border-[#d9d9d9] mt-2 py-5 space-y-5">

              {/* Simple product fields */}
              {!selectedWProduct.hasVariants && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="flex flex-col gap-2">
                    <Label className="text-[#333333] text-sm">Price per {selectedWProduct.unit} (₦)</Label>
                    <Input
                      {...register("unitPrice", { valueAsNumber: true })}
                      placeholder="0.00"
                      type="number"
                      step="0.01"
                    />
                    {errors.unitPrice && <p className="text-red-500 text-xs">{errors.unitPrice.message}</p>}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-[#333333] text-sm">Initial quantity ({selectedWProduct.unit})</Label>
                    <Input
                      {...register("stock", { valueAsNumber: true })}
                      placeholder="0"
                      type="number"
                      step="any"
                    />
                    {errors.stock && <p className="text-red-500 text-xs">{errors.stock.message}</p>}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-[#333333] text-sm">Low stock alert level</Label>
                    <Input
                      {...register("minStockLevel", { valueAsNumber: true })}
                      placeholder="0"
                      type="number"
                    />
                    {errors.minStockLevel && <p className="text-red-500 text-xs">{errors.minStockLevel.message}</p>}
                  </div>
                </div>
              )}

              {/* Variant rows */}
              {selectedWProduct.hasVariants && (() => {
                const availableVariants = selectedWProduct.variants.filter(
                  wv => !variants.some(v => v.warehouseProductVariantId === (wv._id || wv.id))
                );
                return (
                  <div className="space-y-3">
                    <p className="text-sm text-[#555]">
                      Select the grades your branch carries and set pricing:
                    </p>

                    {variants.length === 0 && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
                        No grades added yet — pick at least one from the dropdown below.
                      </p>
                    )}

                    {variants.map((v, i) => (
                      <div key={v.warehouseProductVariantId} className="border border-[#d9d9d9] rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-semibold text-[#333]">{v.name}</p>
                          <button
                            type="button"
                            onClick={() => removeVariant(i)}
                            className="text-red-400 hover:text-red-600 p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs text-[#555]">Price per {selectedWProduct.unit} (₦)</Label>
                            <Input
                              {...register(`variants.${i}.unitPrice`, { valueAsNumber: true })}
                              placeholder="0.00"
                              type="number"
                              step="0.01"
                              className="text-sm"
                            />
                            {errors.variants?.[i]?.unitPrice && (
                              <p className="text-red-500 text-xs">{errors.variants[i]?.unitPrice?.message}</p>
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs text-[#555]">Initial qty ({selectedWProduct.unit})</Label>
                            <Input
                              {...register(`variants.${i}.stock`, { valueAsNumber: true })}
                              placeholder="0"
                              type="number"
                              step="any"
                              className="text-sm"
                            />
                            {errors.variants?.[i]?.stock && (
                              <p className="text-red-500 text-xs">{errors.variants[i]?.stock?.message}</p>
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs text-[#555]">Low stock alert</Label>
                            <Input
                              {...register(`variants.${i}.minStockLevel`, { valueAsNumber: true })}
                              placeholder="0"
                              type="number"
                              className="text-sm"
                            />
                            {errors.variants?.[i]?.minStockLevel && (
                              <p className="text-red-500 text-xs">{errors.variants[i]?.minStockLevel?.message}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {availableVariants.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        <Label className="text-sm text-[#333]">Add a grade</Label>
                        <Select value="" onValueChange={addVariantFromWarehouse}>
                          <SelectTrigger className="max-w-xs">
                            <SelectValue placeholder="Select grade to add..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableVariants.map(wv => (
                              <SelectItem key={wv._id || wv.id} value={wv._id || wv.id}>
                                {wv.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : variants.length > 0 ? (
                      <p className="text-xs text-[#999]">All available grades have been added.</p>
                    ) : null}
                  </div>
                );
              })()}

              {/* Source from warehouse toggle */}
              <div className="border border-[#d9d9d9] rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSourceFromWarehouse(p => !p)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${sourceFromWarehouse ? "bg-[#2ECC71]" : "bg-gray-300"}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${sourceFromWarehouse ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                  <div>
                    <Label className="text-sm text-[#333333]">Initial stock sourced from warehouse</Label>
                    <p className="text-xs text-[#777] mt-0.5">Stock will be deducted from the warehouse balance</p>
                  </div>
                </div>

                {sourceFromWarehouse && (
                  <div className="pt-1">
                    <Label className="text-sm text-[#333]">Select warehouse</Label>
                    <Select value={warehouseId} onValueChange={setWarehouseId}>
                      <SelectTrigger className="mt-2 max-w-xs">
                        <SelectValue placeholder="Choose warehouse" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map(wh => (
                          <SelectItem key={wh._id} value={wh._id}>{wh.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {sourceFromWarehouse && !warehouseId && (
                      <p className="text-amber-600 text-xs mt-1">Please select a warehouse</p>
                    )}
                  </div>
                )}
              </div>

              {/* Bundle config */}
              <div className="flex flex-col gap-3 py-2">
                <div className="flex items-center gap-3">
                  <Controller
                    name="isBundleProduct"
                    control={control}
                    render={({ field }) => (
                      <button
                        type="button"
                        onClick={() => field.onChange(!field.value)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${field.value ? "bg-[#2ECC71]" : "bg-gray-300"}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${field.value ? "translate-x-6" : "translate-x-1"}`} />
                      </button>
                    )}
                  />
                  <Label className="text-[#333333] text-sm">
                    Sells in units + sub-units (e.g. bags + kg)
                  </Label>
                </div>
                {isBundleProduct && (
                  <div className="flex gap-4 pl-14">
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs text-[#555]">Sub-units per bundle</Label>
                      <Input
                        {...register("bundleSize", { valueAsNumber: true })}
                        type="number"
                        min={1}
                        placeholder="e.g. 20"
                        className="w-28"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs text-[#555]">Sub-unit name</Label>
                      <Input {...register("subUnit")} placeholder="e.g. kg" className="w-24" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <div className="flex flex-col-reverse lg:flex-row justify-center lg:justify-end gap-7 mt-7">
          <Button
            type="button"
            onClick={() => goBack()}
            className="bg-white hover:bg-[#f5f5f5] text-[#333333] border border-[var(--cl-secondary)]"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading || !selectedWProduct || (sourceFromWarehouse && !warehouseId)}
            className="bg-[#2ECC71] hover:bg-[var(--cl-bg-green-hover)]"
          >
            {isLoading ? "Adding..." : "Add Product"}
          </Button>
        </div>
      </form>
      {isLoading && <LoadingSpinner />}
    </section>
  );
};

export default AddProduct;
