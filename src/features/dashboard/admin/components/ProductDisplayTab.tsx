/** @format */
import { useState, useEffect } from "react"; // Added useEffect
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
// import { toast } from "sonner";
import { toast } from "react-toastify";
import { Pencil, Trash2, MoveUp, MoveDown, ChevronDown, ChevronUp, Layers, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useInventoryStore } from "@/stores/useInventoryStore";
import {
  updateProduct,
  deleteProduct,
  createVariant,
  updateVariant,
  deleteVariant,
} from "@/services/productService";
import { type Product, type NewProduct } from "@/types/types";
import {
  // Shadcn UI components
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  SelectGroup,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/LoadingSpinner";
import Modal from "@/components/Modal"; // Assuming this Modal component exists
import { newProductSchema } from "@/schemas/productSchema";
import { useAuthStore } from "@/stores/useAuthStore"; // Import useAuthStore hook
import { isAxiosError } from "axios";

interface ProductDisplayProps {
  product: Product; // IMPORTANT: Use the Product type directly from types.ts
}

// Stock status — for variant products, flag low if ANY variant is at/below its own min level
const getShieldStatus = (product: Product): "high" | "low" => {
  if (product.hasVariants && product.variants?.length) {
    const anyLow = product.variants.some((v) => v.stock <= v.minStockLevel);
    return anyLow ? "low" : "high";
  }
  return (product.stock || 0) > (product.minStockLevel || 0) ? "high" : "low";
};

type EditVariant = {
  id?: string;
  name: string;
  unitPrice: number;
  stock: number;
  minStockLevel: number;
};

const emptyEditVariant = (): EditVariant => ({
  name: "",
  unitPrice: 0,
  stock: 0,
  minStockLevel: 0,
});

const ProductDisplayTab = ({ product }: ProductDisplayProps) => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const {
    categories,
    updateProduct: updateProductInStore,
    removeProduct: removeProductFromStore,
  } = useInventoryStore();

  const [editMode, setEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Variant edit state
  const [editVariants, setEditVariants] = useState<EditVariant[]>([]);
  const [deletedVariantIds, setDeletedVariantIds] = useState<string[]>([]);

  // Aggregated values for variant products
  const variants = product.variants ?? [];
  const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);
  const totalValue = variants.reduce((sum, v) => sum + v.stock * v.unitPrice, 0);
  const prices = variants.map((v) => v.unitPrice);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;

  const {
    register,
    control,
    handleSubmit,
    getValues,
    formState: { errors },
    reset,
  } = useForm<NewProduct>({
    defaultValues: {
      name: product.name,
      // Ensure categoryId is a string ID for default value when initializing the form
      categoryId:
        typeof product.categoryId === "object"
          ? product.categoryId._id
          : product.categoryId,
      unit: product.unit,
      stock: product.stock,
      unitPrice: product.unitPrice,
      minStockLevel: product.minStockLevel,
    },
    resolver: zodResolver(newProductSchema),
  });

  useEffect(() => {
    if (editMode) {
      reset({
        name: product.name,
        categoryId:
          typeof product.categoryId === "object"
            ? product.categoryId._id
            : product.categoryId,
        unit: product.unit,
        stock: product.stock,
        unitPrice: product.unitPrice,
        minStockLevel: product.minStockLevel,
      });
      // Seed variant edit state
      if (product.hasVariants) {
        setEditVariants(
          (product.variants ?? []).map((v) => ({
            id: v.id,
            name: v.name,
            unitPrice: v.unitPrice,
            stock: v.stock,
            minStockLevel: v.minStockLevel,
          }))
        );
        setDeletedVariantIds([]);
      }
    }
  }, [editMode, product, reset]);

  // Helper to safely get category name and units from the product's categoryId
  // This handles cases where categoryId is a string or an object
  const getCategoryDetails = (
    categoryId: string | { _id: string; name: string; units: string[] } // Must match Product type's categoryId
  ): { name: string; units: string[] } => {
    if (typeof categoryId === "object" && categoryId.name && categoryId.units) {
      return { name: categoryId.name, units: categoryId.units };
    }
    // If categoryId is a string, or an object without units, try to find it in the global categories
    const id = typeof categoryId === "string" ? categoryId : categoryId._id;
    const foundCategory = categories.find((cat) => cat._id === id);
    if (foundCategory) {
      return { name: foundCategory.name, units: foundCategory.units };
    }
    // Fallback if category not found or incomplete
    return { name: "Uncategorized", units: [] };
  };

  // Get details for the displayed product's category
  const productCategoryDetails = getCategoryDetails(product.categoryId);
  const categoryDisplayName = productCategoryDetails.name;

  const onSubmit = async (data: NewProduct) => {
    try {
      setIsLoading(true);

      // Prepare payload to ensure categoryId is a string ID for the API
      const payload = {
        ...data,
        categoryId:
          typeof data.categoryId === "object"
            ? data.categoryId // If it somehow became an object from form, extract ID
            : data.categoryId, // Otherwise, it's already a string ID
      };

      // Call API to update on the server (assuming updateProduct service exists and returns Product)
      const updated = await updateProduct(product._id, payload);

      // Update zustand store to trigger UI update
      updateProductInStore(updated);

      toast.success("Product updated successfully");
      setEditMode(false); // Close modal on success
    } catch (err) {
      toast.error("Failed to update product: " + err);
    } finally {
      setIsLoading(false); // Ensure loading is off regardless of outcome
    }
  };

  // --- Variant edit helpers ---
  const updateEditVariant = (
    index: number,
    field: keyof EditVariant,
    value: string | number
  ) => {
    setEditVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
  };

  const addEditVariant = () =>
    setEditVariants((prev) => [...prev, emptyEditVariant()]);

  const removeEditVariant = (index: number) => {
    const v = editVariants[index];
    if (v.id) setDeletedVariantIds((prev) => [...prev, v.id!]);
    setEditVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVariantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editVariants.length === 0) {
      toast.error("Add at least one grade");
      return;
    }
    const invalid = editVariants.some((v) => !v.name.trim());
    if (invalid) {
      toast.error("Every grade must have a name");
      return;
    }

    setIsLoading(true);
    try {
      const { name, categoryId, unit } = getValues();

      // 1. Update product-level fields
      const updated = await updateProduct(product._id, { name, categoryId, unit });

      // 2. Delete removed variants
      for (const vid of deletedVariantIds) {
        await deleteVariant(vid);
      }

      // 3. Update existing / create new variants
      for (const v of editVariants) {
        if (v.id) {
          await updateVariant(v.id, {
            name: v.name,
            unitPrice: v.unitPrice,
            stock: v.stock,
            minStockLevel: v.minStockLevel,
          });
        } else {
          await createVariant(product._id, {
            name: v.name,
            unitPrice: v.unitPrice,
            stock: v.stock,
            minStockLevel: v.minStockLevel,
          });
        }
      }

      // 4. Refresh product list in store via React Query invalidation
      queryClient.invalidateQueries({ queryKey: ["products"] });
      updateProductInStore({ ...updated, variants: undefined }); // optimistic clear until refetch

      toast.success("Product updated successfully");
      setEditMode(false);
    } catch {
      toast.error("Failed to update product");
    } finally {
      setIsLoading(false);
    }
  };

  // UPDATED: Function to handle product deletion with proper API call
  const handleDelete = async () => {
    try {
      setIsLoading(true);

      // Call the delete API endpoint
      await deleteProduct(product._id);

      // Remove from Zustand store to update UI immediately
      removeProductFromStore(product._id);

      toast.success("Product deleted successfully");
      setIsDeleteModalOpen(false); // Close modal on success
    } catch (error) {
      if (isAxiosError(error) && error.response) {
        console.error("Delete product error:", error);
        toast.error(
          "Failed to delete product: " + (error?.message || "Unknown error")
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const shieldStatus = getShieldStatus(product);

  // Shared header fields (name, category, unit) used by both edit forms
  const sharedFields = (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-xs text-gray-700">Product name</label>
          <Input id="name" {...register("name")} placeholder="Product name" />
          {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="categoryId" className="text-xs text-gray-700">Category</label>
          <Controller
            name="categoryId"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Category</SelectLabel>
                    {categories.map((cat) => (
                      <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          />
          {errors.categoryId && <p className="text-red-500 text-xs">{errors.categoryId.message}</p>}
        </div>
      </div>
      <div className="flex flex-col gap-1 max-w-xs">
        <label htmlFor="unit" className="text-xs text-gray-700">Unit</label>
        <Controller
          name="unit"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Unit</SelectLabel>
                  {productCategoryDetails.units.length > 0 ? (
                    productCategoryDetails.units.map((unit, i) => (
                      <SelectItem key={i} value={unit}>{unit}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>No units for this category</SelectItem>
                  )}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        />
        {errors.unit && <p className="text-red-500 text-xs">{errors.unit.message}</p>}
      </div>
    </>
  );

  if (editMode && product.hasVariants) {
    return (
      <form
        onSubmit={handleVariantSubmit}
        className="bg-white border border-orange-500 rounded p-4 space-y-4 shadow-xl"
      >
        {sharedFields}

        {/* Grades list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h6 className="text-sm font-medium text-[#333]">Grades / Variants</h6>
            <button
              type="button"
              onClick={addEditVariant}
              className="flex items-center gap-1 text-xs text-[#2ECC71] hover:text-green-600 font-medium"
            >
              <Plus size={13} /> Add Grade
            </button>
          </div>

          {editVariants.map((v, i) => (
            <div key={i} className="border border-[#d9d9d9] rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#444]">Grade {i + 1}</span>
                {editVariants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeEditVariant(i)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Grade name</label>
                  <Input
                    value={v.name}
                    onChange={(e) => updateEditVariant(i, "name", e.target.value)}
                    placeholder="e.g. Grade 1"
                    className="text-sm h-8"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Price per unit (₦)</label>
                  <Input
                    type="number"
                    value={v.unitPrice || ""}
                    onChange={(e) => updateEditVariant(i, "unitPrice", parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="text-sm h-8"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Stock</label>
                  <Input
                    type="number"
                    value={v.stock || ""}
                    onChange={(e) => updateEditVariant(i, "stock", parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="text-sm h-8"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Low stock alert level</label>
                  <Input
                    type="number"
                    value={v.minStockLevel || ""}
                    onChange={(e) => updateEditVariant(i, "minStockLevel", parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="text-sm h-8"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-8 mt-5">
          <Button onClick={() => setEditMode(false)} variant="outline" className="text-xs" type="button">
            Cancel
          </Button>
          <Button type="submit" className="text-xs" disabled={isLoading}>
            {isLoading ? <LoadingSpinner /> : "Save"}
          </Button>
        </div>
      </form>
    );
  }

  if (editMode) {
    return (
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white border border-orange-500 rounded p-4 space-y-3 shadow-xl"
      >
        {sharedFields}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex flex-col gap-1">
            <label htmlFor="stock" className="text-xs text-gray-700">Stock</label>
            <Input
              id="stock"
              type="number"
              {...register("stock", { valueAsNumber: true })}
              placeholder="Stock"
            />
            {errors.stock && <p className="text-red-500 text-xs">{errors.stock.message}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="unitPrice" className="text-xs text-gray-700">Unit price</label>
            <Input
              id="unitPrice"
              type="number"
              {...register("unitPrice", { valueAsNumber: true })}
              placeholder="Unit Price"
            />
            {errors.unitPrice && <p className="text-red-500 text-xs">{errors.unitPrice.message}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="minStockLevel" className="text-xs text-gray-700">Min stock alert level</label>
            <Input
              id="minStockLevel"
              type="number"
              {...register("minStockLevel", { valueAsNumber: true })}
              placeholder="Minimum Stock Level"
            />
            {errors.minStockLevel && <p className="text-red-500 text-xs">{errors.minStockLevel.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mt-5">
          <Button onClick={() => setEditMode(false)} variant="outline" className="text-xs" type="button">
            Cancel
          </Button>
          <Button type="submit" className="text-xs" disabled={isLoading}>
            {isLoading ? <LoadingSpinner /> : "Save"}
          </Button>
        </div>
      </form>
    );
  }

  // Display mode
  return (
    <article className="bg-white border border-[var(--cl-border-gray)] rounded p-10 sm:p-4 mt-6 font-Arial hover:shadow-xl hover:border-green-400 transition-all duration-200 ease-in-out">
      {/* Header */}
      <div className="flex justify-between" id={product._id}>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h6 className="text-lg font-normal text-[var(--cl-text-gray)] capitalize">
              {product.unit} {product.name}
            </h6>
            {product.hasVariants && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-200 rounded-full px-2 py-0.5">
                <Layers size={10} />
                Multi-grade
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 bg-gray-100 px-3 py-1 inline-block rounded mt-1">
            {categoryDisplayName}
          </p>
        </div>

        {user?.role !== "STAFF" ? (
          <div className="flex gap-3">
            <Pencil
              size={16}
              className="text-orange-500 cursor-pointer hover:text-orange-600"
              onClick={() => setEditMode(true)}
            />
            <Trash2
              size={16}
              className="text-[#7d7d7d] cursor-pointer hover:text-red-500"
              onClick={() => setIsDeleteModalOpen(true)}
            />
          </div>
        ) : (
          <div
            className={`mt-10 border rounded-lg px-2 py-1 text-[.75rem] flex gap-0.5 items-center ${
              shieldStatus === "high"
                ? "border-[var(--cl-bg-green)] bg-[var(--cl-bg-light-green)] text-[var(--cl-bg-green)]"
                : "border-[#F95353] bg-[#FFE4E2] text-[#F95353]"
            }`}
          >
            {shieldStatus === "high" ? (
              <p className="flex gap-1 items-center">Good</p>
            ) : (
              <p className="flex gap-1 items-center">Low</p>
            )}
          </div>
        )}
      </div>

      {/* Stats grid — aggregated for variant products, direct for standard */}
      {product.hasVariants ? (
        <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
          <div>
            <p className="font-medium text-gray-400">Total Stock</p>
            <p className="text-[var(--cl-text-semidark)] text-[0.8125rem]">
              {totalStock} {product.unit}
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-400">Price Range</p>
            <p className="text-[var(--cl-text-semidark)] text-[0.8125rem]">
              {minPrice === maxPrice
                ? `₦${minPrice.toLocaleString("en-NG")}`
                : `₦${minPrice.toLocaleString("en-NG")} – ₦${maxPrice.toLocaleString("en-NG")}`}
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-400">Total Value</p>
            <p className="text-[var(--cl-text-semidark)] text-[0.8125rem]">
              ₦ {totalValue.toLocaleString("en-NG")}
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-400">Grades</p>
            <p className="text-[var(--cl-text-semidark)] text-[0.8125rem]">
              {variants.length} grade{variants.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
          <div>
            <p className="font-medium text-gray-400">Stock</p>
            <p className="text-[var(--cl-text-semidark)] text-[0.8125rem]">
              {product.stock} {product.unit}
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-400">Unit Price</p>
            <p className="text-[var(--cl-text-semidark)] text-[0.8125rem]">
              ₦ {product.unitPrice.toLocaleString("en-NG")}
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-400">Total Value</p>
            <p className="text-[var(--cl-text-semidark)] text-[0.8125rem]">
              ₦ {(product.stock * product.unitPrice).toLocaleString("en-NG")}
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-400">Minimum Level</p>
            <p className="text-[var(--cl-text-semidark)] text-[0.8125rem]">
              {product.minStockLevel}
            </p>
          </div>
        </div>
      )}

      {/* Expandable variants section */}
      {product.hasVariants && variants.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {isExpanded ? "Hide grades" : "View all grades"}
          </button>

          {isExpanded && (
            <div className="mt-3 border border-gray-100 rounded-lg overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-4 bg-gray-50 px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                <span>Grade</span>
                <span className="text-right">Stock</span>
                <span className="text-right">Unit Price</span>
                <span className="text-right">Status</span>
              </div>
              {/* Rows */}
              {variants.map((v) => {
                const isLow = v.stock <= v.minStockLevel;
                return (
                  <div
                    key={v.id}
                    className="grid grid-cols-4 px-3 py-2 text-[0.8125rem] border-t border-gray-100 items-center"
                  >
                    <span className="text-[var(--cl-text-semidark)] font-medium">
                      {v.name}
                    </span>
                    <span className="text-right text-[var(--cl-text-semidark)]">
                      {v.stock} {product.unit}
                    </span>
                    <span className="text-right text-[var(--cl-text-semidark)]">
                      ₦{v.unitPrice.toLocaleString("en-NG")}
                    </span>
                    <span className="flex justify-end">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          isLow
                            ? "bg-[#FFE4E2] text-[#F95353]"
                            : "bg-[var(--cl-bg-light-green)] text-[var(--cl-bg-green)]"
                        }`}
                      >
                        {isLow ? "Low" : "OK"}
                      </span>
                    </span>
                  </div>
                );
              })}
              {/* Footer: aggregate */}
              <div className="grid grid-cols-4 px-3 py-2 bg-gray-50 border-t border-gray-200 text-[0.8125rem] font-semibold text-gray-600">
                <span>Total</span>
                <span className="text-right">{totalStock} {product.unit}</span>
                <span className="text-right">₦{totalValue.toLocaleString("en-NG")}</span>
                <span />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stock Status Badge */}
      <div
        className={`mt-4 border rounded px-1 py-1 text-[.75rem] flex gap-0.5 items-center ${
          shieldStatus === "high"
            ? "border-[var(--cl-bg-green)] bg-[var(--cl-bg-light-green)] text-[var(--cl-bg-green)]"
            : "border-[#F95353] bg-[#FFE4E2] text-[#F95353]"
        }`}
      >
        {shieldStatus === "high" ? (
          <p className="flex gap-1 items-center">
            <MoveUp size={12} />
            <span>
              {product.hasVariants ? "All grades well stocked" : "High stock"}
            </span>
          </p>
        ) : (
          <p className="flex gap-1 items-center">
            <MoveDown size={12} />
            <span>
              {product.hasVariants
                ? `Low stock on ${variants.filter((v) => v.stock <= v.minStockLevel).length} grade(s) — Reorder soon`
                : "Low Stock - Reorder soon"}
            </span>
          </p>
        )}
      </div>

      {/* Loading overlay for operations */}
      {isLoading && <LoadingSpinner />}

      {/* Delete confirmation modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        size="sm"
      >
        <div className="flex flex-col justify-center items-center gap-3 py-5">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete Product
            </h3>
            <p className="text-gray-600">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-gray-900">
                {product.name}
              </span>
              ?
            </p>
            <p className="text-sm text-gray-500 mt-2">
              This action cannot be undone.
            </p>
          </div>
          <div className="flex gap-3 items-center mt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isLoading}
              type="button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
              type="button"
            >
              {isLoading ? "Deleting" : "Yes, Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </article>
  );
};

export default ProductDisplayTab;
