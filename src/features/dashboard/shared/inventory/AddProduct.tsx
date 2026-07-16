import { useEffect, useState } from "react";
import { type AxiosError } from "axios";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { useForm, Controller, useWatch, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useInventoryStore } from "@/stores/useInventoryStore";
import { createProduct } from "@/services/productService";
import { newProductSchema, type NewProductFormValues } from "@/schemas/productSchema";
import { useGoBack } from "@/hooks/useGoBack";
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
import { Plus, Trash2 } from "lucide-react";

const emptyVariant = { name: "", unitPrice: 0, stock: 0, minStockLevel: 0 };

const AddProduct = () => {
  const goBack = useGoBack();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const { categories, categoryUnits, setSelectedCategoryId } = useInventoryStore();

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<NewProductFormValues>({
    resolver: zodResolver(newProductSchema) as unknown as Resolver<NewProductFormValues>,
    defaultValues: { hasVariants: false, variants: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "variants" });

  const selectedCategoryId = useWatch({ control, name: "categoryId" });
  const hasVariants = watch("hasVariants");

  useEffect(() => {
    if (selectedCategoryId && categories.length > 0) {
      setSelectedCategoryId(selectedCategoryId);
      setValue("unit", "");
    }
  }, [selectedCategoryId, setSelectedCategoryId, categories, setValue]);

  const onSubmit = async (data: NewProductFormValues) => {
    setIsLoading(true);
    try {
      await createProduct(data);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product created successfully");
      reset();
      goBack();
    } catch (error) {
      const err = error as AxiosError<{ message: string }>;
      const message = err?.response?.data.message || "Error creating product";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="min-h-screen bg-[#F5F5F5] px-3 md:px-10 py-2 flex justify-center items-start font-Inter pt-10">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white max-w-[60rem] w-full rounded-[0.625rem] border border-[#d9d9d9] px-5 md:px-10 py-10 space-y-4"
      >
        <h5 className="text-[#333333] font-medium text-sm md:text-lg">
          Product Information
        </h5>

        <div className="border-t border-[#d9d9d9] mt-2 py-5 grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5">
          {/* Product name */}
          <div className="flex flex-col gap-2">
            <Label className="text-[#333333] text-sm">Product name</Label>
            <Input
              {...register("name")}
              placeholder="Product name"
              className="border border-[#7D7D7D] rounded-md p-2"
            />
            {errors.name && (
              <p className="text-red-500 text-xs">{errors.name.message}</p>
            )}
          </div>

          {/* Category */}
          <Controller
            name="categoryId"
            control={control}
            render={({ field }) => (
              <div className="flex flex-col gap-2">
                <Label className="text-[#333333] text-sm">Select category</Label>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {categories.length === 0 ? (
                        <div className="py-2 px-3 text-sm text-gray-500">
                          No categories available. Try refreshing.
                        </div>
                      ) : (
                        categories.map((cat) => (
                          <SelectItem key={cat._id} value={cat._id}>
                            {cat.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {errors.categoryId && (
                  <p className="text-red-500 text-xs">{errors.categoryId.message}</p>
                )}
              </div>
            )}
          />
        </div>

        <h5 className="text-[#333333] font-medium text-sm md:text-lg mt-5">
          Inventory
        </h5>

        <div className="border-t border-[#d9d9d9] mt-2 py-5 space-y-5">
          {/* Unit */}
          <Controller
            name="unit"
            control={control}
            render={({ field }) => (
              <div className="flex flex-col gap-2 max-w-xs">
                <Label className="text-[#333333] text-sm">Primary unit</Label>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={!selectedCategoryId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        selectedCategoryId
                          ? "Select unit"
                          : "Select a category first"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {categoryUnits.length === 0 ? (
                        <div className="py-2 px-3 text-sm text-gray-500">
                          {selectedCategoryId ? "No units available" : "Select a category first"}
                        </div>
                      ) : (
                        categoryUnits.map((unit, i) => (
                          <SelectItem key={i} value={unit}>
                            {unit}
                          </SelectItem>
                        ))
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {errors.unit && (
                  <p className="text-red-500 text-xs">{errors.unit.message}</p>
                )}
              </div>
            )}
          />

          {/* Has Variants Toggle */}
          <div className="flex items-center gap-3 py-2">
            <button
              type="button"
              onClick={() => {
                const next = !hasVariants;
                setValue("hasVariants", next);
                if (next && fields.length === 0) append(emptyVariant);
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                hasVariants ? "bg-[#2ECC71]" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  hasVariants ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <Label className="text-[#333333] text-sm cursor-pointer">
              This product has multiple grades / variants
            </Label>
          </div>

          {/* Standard fields (no variants) */}
          {!hasVariants && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-2">
                <Label className="text-[#333333] text-sm">Initial quantity</Label>
                <Input
                  {...register("stock", { valueAsNumber: true })}
                  placeholder="100"
                  type="number"
                />
                {errors.stock && (
                  <p className="text-red-500 text-xs">{errors.stock.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-[#333333] text-sm">Price per unit (₦)</Label>
                <Input
                  {...register("unitPrice", { valueAsNumber: true })}
                  placeholder="0.00"
                  type="number"
                  step="0.01"
                />
                {errors.unitPrice && (
                  <p className="text-red-500 text-xs">{errors.unitPrice.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-[#333333] text-sm">Low stock alert level</Label>
                <Input
                  {...register("minStockLevel", { valueAsNumber: true })}
                  placeholder="10"
                  type="number"
                />
                {errors.minStockLevel && (
                  <p className="text-red-500 text-xs">{errors.minStockLevel.message}</p>
                )}
              </div>
            </div>
          )}

          {/* Variants section */}
          {hasVariants && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h6 className="text-[#333333] font-medium text-sm">Grades / Variants</h6>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => append(emptyVariant)}
                  className="bg-[#2ECC71] hover:bg-green-600 text-white text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Grade
                </Button>
              </div>

              {errors.variants?.root && (
                <p className="text-red-500 text-xs">{errors.variants.root.message}</p>
              )}
              {typeof errors.variants?.message === "string" && (
                <p className="text-red-500 text-xs">{errors.variants.message}</p>
              )}

              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="border border-[#d9d9d9] rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-[#444]">Grade {index + 1}</span>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <Label className="text-[#333333] text-xs">Grade name</Label>
                      <Input
                        {...register(`variants.${index}.name`)}
                        placeholder="e.g. Grade 1, Grade 60"
                        className="text-sm"
                      />
                      {errors.variants?.[index]?.name && (
                        <p className="text-red-500 text-xs">{errors.variants[index]?.name?.message}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <Label className="text-[#333333] text-xs">Price per unit (₦)</Label>
                      <Input
                        {...register(`variants.${index}.unitPrice`, { valueAsNumber: true })}
                        placeholder="0.00"
                        type="number"
                        step="0.01"
                        className="text-sm"
                      />
                      {errors.variants?.[index]?.unitPrice && (
                        <p className="text-red-500 text-xs">{errors.variants[index]?.unitPrice?.message}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <Label className="text-[#333333] text-xs">Initial quantity</Label>
                      <Input
                        {...register(`variants.${index}.stock`, { valueAsNumber: true })}
                        placeholder="0"
                        type="number"
                        className="text-sm"
                      />
                      {errors.variants?.[index]?.stock && (
                        <p className="text-red-500 text-xs">{errors.variants[index]?.stock?.message}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <Label className="text-[#333333] text-xs">Low stock alert level</Label>
                      <Input
                        {...register(`variants.${index}.minStockLevel`, { valueAsNumber: true })}
                        placeholder="0"
                        type="number"
                        className="text-sm"
                      />
                      {errors.variants?.[index]?.minStockLevel && (
                        <p className="text-red-500 text-xs">{errors.variants[index]?.minStockLevel?.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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
            disabled={isLoading}
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
