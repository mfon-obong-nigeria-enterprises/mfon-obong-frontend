/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, X, ChevronDown, ChevronRight, Building2 } from "lucide-react";
import { type Product, type Category } from "@/types/types";
import { formatStock } from "@/lib/formatStock";
import { useAuthStore } from "@/stores/useAuthStore";
import { updateProductStock, updateVariantStock } from "@/services/productService";
import {
  getWarehouses,
  getWarehouseProducts,
  transferFromWarehouse,
} from "@/services/warehouseService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Source = "direct" | "warehouse";

type UpdateStockProduct = Product & {
  id: string;
  category: string;
  selected: boolean;
  quantity: number;
  shieldStatus: "high" | "low";
};

type UpdateStockVariant = {
  id: string;
  productId: string;
  productName: string;
  name: string;
  stock: number;
  unitPrice: number;
  minStockLevel: number;
  warehouseProductVariantId?: string | null;
  selected: boolean;
  quantity: number;
  shieldStatus: "high" | "low";
};

// Status based on projected stock after adding quantity
const projectedStatus = (current: number, adding: number, min: number): "high" | "low" =>
  (current + adding) > min ? "high" : "low";

interface UpdateStockProps {
  products: Product[];
  categories: Category[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedProducts: Product[]) => void;
}

export default function UpdateStock({
  products: initialProducts,
  categories,
  isOpen,
  onClose,
  onSave,
}: UpdateStockProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const branchId = user?.branchId ?? "";

  const [source, setSource] = useState<Source>("direct");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [bulkQuantity, setBulkQuantity] = useState("");
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Fetch all warehouses for the picker
  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: getWarehouses,
    enabled: isOpen,
    staleTime: 60_000,
  });

  // Fetch warehouse products to map warehouseProductId → warehouseId
  const { data: warehouseProducts = [] } = useQuery({
    queryKey: ["warehouse-products-all"],
    queryFn: () => getWarehouseProducts(),
    enabled: isOpen,
    staleTime: 60_000,
  });

  const wpIdToWarehouseId = useMemo(() => {
    const map = new Map<string, string>();
    for (const wp of warehouseProducts) {
      map.set(wp._id || wp.id, wp.warehouseId);
    }
    return map;
  }, [warehouseProducts]);

  const getCategoryName = (
    categoryId: string | { _id: string; name: string; units: string[] }
  ): string => {
    if (typeof categoryId === "object" && categoryId.name) return categoryId.name;
    const id = typeof categoryId === "string" ? categoryId : categoryId._id;
    return categories.find((c) => c._id === id)?.name ?? "Uncategorized";
  };

  const buildSimpleProducts = (prods: Product[]): UpdateStockProduct[] =>
    prods
      .filter((p) => !p.hasVariants)
      .map((p) => ({
        ...p,
        id: p._id,
        category: getCategoryName(p.categoryId),
        selected: false,
        quantity: 0,
        shieldStatus: (p.stock || 0) > (p.minStockLevel || 0) ? "high" : "low",
      }));

  const buildVariants = (prods: Product[]): UpdateStockVariant[] => {
    const result: UpdateStockVariant[] = [];
    for (const p of prods) {
      if (p.hasVariants && p.variants?.length) {
        for (const v of p.variants) {
          result.push({
            id: v.id,
            productId: p._id,
            productName: p.name,
            name: v.name,
            stock: v.stock,
            unitPrice: v.unitPrice,
            minStockLevel: v.minStockLevel,
            warehouseProductVariantId: v.warehouseProductVariantId,
            selected: false,
            quantity: 0,
            shieldStatus: v.stock > v.minStockLevel ? "high" : "low",
          });
        }
      }
    }
    return result;
  };

  const [products, setProducts] = useState<UpdateStockProduct[]>(() =>
    buildSimpleProducts(initialProducts)
  );
  const [variants, setVariants] = useState<UpdateStockVariant[]>(() =>
    buildVariants(initialProducts)
  );

  useEffect(() => {
    if (isOpen) {
      setProducts(buildSimpleProducts(initialProducts));
      setVariants(buildVariants(initialProducts));
      setSearchTerm("");
      setBulkQuantity("");
      setSource("direct");
      setSelectedWarehouseId("");
      setExpandedProducts(new Set());
    }
  }, [initialProducts, categories, isOpen]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const t = searchTerm.toLowerCase();
    return products.filter(
      (p) => p.name?.toLowerCase().includes(t) || p.category?.toLowerCase().includes(t)
    );
  }, [products, searchTerm]);

  const variantProducts = useMemo(() => {
    const seen = new Set<string>();
    return initialProducts.filter((p) => {
      if (p.hasVariants && !seen.has(p._id)) {
        const t = searchTerm.toLowerCase();
        if (!t || p.name.toLowerCase().includes(t)) {
          seen.add(p._id);
          return true;
        }
      }
      return false;
    });
  }, [initialProducts, searchTerm]);

  const allFilteredSelected = useMemo(
    () => filteredProducts.length > 0 && filteredProducts.every((p) => p.selected),
    [filteredProducts]
  );

  const selectedCount = useMemo(
    () =>
      products.filter((p) => p.selected).length +
      variants.filter((v) => v.selected).length,
    [products, variants]
  );

  const toggleProductSelection = (id: string) =>
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p))
    );

  const toggleVariantSelection = (id: string) =>
    setVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, selected: !v.selected } : v))
    );

  const toggleSelectAll = (checked: boolean) => {
    const ids = new Set(filteredProducts.map((p) => p.id));
    setProducts((prev) =>
      prev.map((p) => (ids.has(p.id) ? { ...p, selected: checked } : p))
    );
  };

  const handleQuantityChange = (id: string, value: string) => {
    const qty = Math.max(0, parseInt(value, 10) || 0);
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, quantity: qty, shieldStatus: projectedStatus(p.stock || 0, qty, p.minStockLevel || 0) }
          : p
      )
    );
  };

  const handleVariantQuantityChange = (id: string, value: string) => {
    const qty = Math.max(0, parseInt(value, 10) || 0);
    setVariants((prev) =>
      prev.map((v) =>
        v.id === id
          ? { ...v, quantity: qty, shieldStatus: projectedStatus(v.stock, qty, v.minStockLevel) }
          : v
      )
    );
  };

  const applyBulkQuantity = () => {
    const qty = Math.max(0, parseInt(bulkQuantity, 10) || 0);
    setProducts((prev) =>
      prev.map((p) =>
        p.selected
          ? { ...p, quantity: qty, shieldStatus: projectedStatus(p.stock || 0, qty, p.minStockLevel || 0) }
          : p
      )
    );
    setVariants((prev) =>
      prev.map((v) =>
        v.selected
          ? { ...v, quantity: qty, shieldStatus: projectedStatus(v.stock, qty, v.minStockLevel) }
          : v
      )
    );
    setBulkQuantity("");
  };

  const toggleExpandProduct = (id: string) => {
    setExpandedProducts((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Whether a branch product is linked to the currently selected warehouse
  const isLinkedToSelectedWarehouse = (warehouseProductId?: string | null): boolean => {
    if (!warehouseProductId || !selectedWarehouseId) return false;
    return wpIdToWarehouseId.get(warehouseProductId) === selectedWarehouseId;
  };

  const handleSave = async () => {
    if (source === "warehouse" && !selectedWarehouseId) {
      toast.error("Please select a warehouse first");
      return;
    }

    const toUpdateProducts = products.filter((p) => p.selected && p.quantity > 0);
    const toUpdateVariants = variants.filter((v) => v.selected && v.quantity > 0);

    if (toUpdateProducts.length === 0 && toUpdateVariants.length === 0) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      if (source === "warehouse") {
        await Promise.all([
          ...toUpdateProducts.map(async (p) => {
            if (p.warehouseProductId && isLinkedToSelectedWarehouse(p.warehouseProductId)) {
              await transferFromWarehouse({
                warehouseId: selectedWarehouseId,
                branchId,
                warehouseProductId: p.warehouseProductId,
                quantity: p.quantity,
              });
            } else {
              await updateProductStock(p.id, p.quantity, p.unit || "", "add");
            }
          }),
          ...toUpdateVariants.map(async (v) => {
            const parentProduct = initialProducts.find((p) => p._id === v.productId);
            const warehouseProductId = parentProduct?.warehouseProductId ?? null;
            if (
              warehouseProductId &&
              v.warehouseProductVariantId &&
              isLinkedToSelectedWarehouse(warehouseProductId)
            ) {
              await transferFromWarehouse({
                warehouseId: selectedWarehouseId,
                branchId,
                warehouseProductId,
                warehouseProductVariantId: v.warehouseProductVariantId,
                quantity: v.quantity,
              });
            } else {
              await updateVariantStock(v.id, v.quantity, "add");
            }
          }),
        ]);
      } else {
        await Promise.all([
          ...toUpdateProducts.map((p) =>
            updateProductStock(p.id, p.quantity, p.unit || "", "add")
          ),
          ...toUpdateVariants.map((v) =>
            updateVariantStock(v.id, v.quantity, "add")
          ),
        ]);
      }

      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Stock updated successfully");
      onSave(
        toUpdateProducts.map((p) => ({ ...p, stock: (p.stock || 0) + p.quantity }))
      );
      onClose();
    } catch {
      toast.error("Failed to update stock");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <CardHeader className="flex items-center justify-between sticky top-0 bg-white z-10 p-4 border-b">
          <CardTitle>Update Stock</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="flex-grow overflow-y-auto p-4">
          <div className="space-y-5 pt-2">

            {/* Source toggle */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-gray-600 font-medium">Source:</span>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
                  <button
                    type="button"
                    onClick={() => { setSource("direct"); setSelectedWarehouseId(""); }}
                    className={`px-4 py-1.5 font-medium transition-colors ${
                      source === "direct"
                        ? "bg-emerald-500 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Direct Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setSource("warehouse")}
                    className={`flex items-center gap-1.5 px-4 py-1.5 font-medium transition-colors ${
                      source === "warehouse"
                        ? "bg-emerald-500 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Building2 size={13} />
                    From Warehouse
                  </button>
                </div>
              </div>

              {/* Warehouse picker — shown only when "From Warehouse" is selected */}
              {source === "warehouse" && (
                <div className="flex items-center gap-3">
                  <Label className="text-sm text-gray-600 whitespace-nowrap">
                    Select warehouse:
                  </Label>
                  <Select
                    value={selectedWarehouseId}
                    onValueChange={setSelectedWarehouseId}
                  >
                    <SelectTrigger className="w-56">
                      <SelectValue placeholder="Choose warehouse..." />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((w) => (
                        <SelectItem key={w._id || w.id} value={w._id || w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedWarehouseId && (
                    <span className="text-xs text-blue-600">
                      Deducts from warehouse stock automatically
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 bg-gray-50"
              />
            </div>

            {/* Bulk controls */}
            <div className="p-4 border rounded-lg bg-gray-50">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={allFilteredSelected}
                    onCheckedChange={(c) => toggleSelectAll(c as boolean)}
                  />
                  <Label htmlFor="select-all">Select All</Label>
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <Label className="whitespace-nowrap text-sm">Set all selected to:</Label>
                  <Input
                    type="number"
                    className="h-8 w-28"
                    placeholder="Qty"
                    value={bulkQuantity}
                    onChange={(e) => setBulkQuantity(e.target.value)}
                  />
                  <Button
                    size="sm"
                    onClick={applyBulkQuantity}
                    disabled={
                      selectedCount === 0 ||
                      !bulkQuantity ||
                      isNaN(parseInt(bulkQuantity, 10))
                    }
                    className="bg-emerald-500 text-white hover:bg-green-600"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>

            {/* Simple products */}
            <div className="space-y-3">
              {filteredProducts.length === 0 && variantProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No products found</p>
                  {searchTerm && (
                    <Button
                      variant="link"
                      onClick={() => setSearchTerm("")}
                      className="text-emerald-500 mt-1"
                    >
                      Clear search
                    </Button>
                  )}
                </div>
              ) : (
                filteredProducts.map((product) => {
                  const linkedToSelected =
                    source === "warehouse" && selectedWarehouseId
                      ? isLinkedToSelectedWarehouse(product.warehouseProductId)
                      : false;
                  const dimmed = source === "warehouse" && selectedWarehouseId && !linkedToSelected;
                  return (
                    <div
                      key={product.id}
                      className={`border rounded-lg p-4 transition-opacity ${dimmed ? "opacity-50" : ""}`}
                    >
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Checkbox
                              id={`p-${product.id}`}
                              checked={product.selected}
                              onCheckedChange={() => toggleProductSelection(product.id)}
                              disabled={!!dimmed}
                            />
                            <Label htmlFor={`p-${product.id}`} className="font-medium">
                              {product.name}
                            </Label>
                            {source === "warehouse" && selectedWarehouseId && linkedToSelected && (
                              <span className="text-[10px] text-emerald-600 border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                                In this warehouse
                              </span>
                            )}
                            {dimmed && (
                              <span className="text-[10px] text-gray-400">Not in this warehouse</span>
                            )}
                          </div>
                          <span className="text-xs text-[#7D7D7D] px-2 py-0.5 border rounded bg-gray-100 w-fit ml-6">
                            {product.category}
                          </span>
                          <div className="flex gap-4 flex-wrap ml-6 mt-1">
                            <div>
                              <p className="text-xs text-[#7D7D7D]">Current stock</p>
                              <p className="text-sm text-[#444]">
                                {formatStock(product.stock, product.unit || "units", product.isBundleProduct, product.bundleSize, product.subUnit)}
                              </p>
                            </div>
                            <div
                              className={`px-2 py-0.5 text-xs font-medium rounded self-end ${
                                product.shieldStatus === "high"
                                  ? "bg-green-100 text-emerald-600"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {product.shieldStatus === "high" ? "High Stock" : "Low Stock"}
                            </div>
                          </div>
                          <div className="ml-6">
                            <p className="text-xs text-[#7D7D7D]">Unit price</p>
                            <p className="text-sm text-[#444]">
                              ₦{product.unitPrice?.toLocaleString("en-NG") || "0.00"}
                            </p>
                          </div>
                        </div>

                        <div className="w-full md:max-w-[200px] space-y-1 md:pt-4">
                          <Label htmlFor={`qty-${product.id}`} className="text-[#555]">
                            Quantity
                          </Label>
                          <Input
                            id={`qty-${product.id}`}
                            type="number"
                            min="0"
                            value={product.quantity || ""}
                            onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                            className="border border-gray-300 w-full"
                            placeholder="0"
                          />
                          <p className="text-[10px] text-gray-400">Added to current stock</p>
                          <p className="text-xs text-[#7D7D7D] mt-1">
                            Min level: {formatStock(product.minStockLevel || 0, product.unit || "units", product.isBundleProduct, product.bundleSize, product.subUnit)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Variant products */}
            {variantProducts.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[#333] border-b pb-2">
                  Products with Grades / Variants
                </h3>
                {variantProducts.map((product) => {
                  const isExpanded = expandedProducts.has(product._id);
                  const productVariants = variants.filter((v) => v.productId === product._id);
                  const productLinkedToSelected =
                    source === "warehouse" && selectedWarehouseId
                      ? isLinkedToSelectedWarehouse(product.warehouseProductId)
                      : false;
                  return (
                    <div key={product._id} className="border rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleExpandProduct(product._id)}
                        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[#333] text-sm">{product.name}</span>
                          {source === "warehouse" && selectedWarehouseId && productLinkedToSelected && (
                            <span className="text-[10px] text-emerald-600 border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                              In this warehouse
                            </span>
                          )}
                          {source === "warehouse" && selectedWarehouseId && !productLinkedToSelected && (
                            <span className="text-[10px] text-gray-400">Not in this warehouse</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[#7D7D7D]">
                          <span className="text-xs">{productVariants.length} grades</span>
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="divide-y">
                          {productVariants.map((variant) => {
                            // Variant is usable in warehouse mode only if parent product is in the selected warehouse
                            // AND the variant itself has a warehouse link
                            const variantDimmed =
                              source === "warehouse" &&
                              selectedWarehouseId &&
                              (!productLinkedToSelected || !variant.warehouseProductVariantId);
                            const dimmed = !!variantDimmed;
                            return (
                              <div
                                key={variant.id}
                                className={`p-4 transition-opacity ${dimmed ? "opacity-50" : ""}`}
                              >
                                <div className="flex flex-col md:flex-row justify-between gap-4">
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Checkbox
                                        id={`v-${variant.id}`}
                                        checked={variant.selected}
                                        onCheckedChange={() => toggleVariantSelection(variant.id)}
                                        disabled={dimmed}
                                      />
                                      <Label htmlFor={`v-${variant.id}`} className="font-medium">
                                        {variant.name}
                                      </Label>
                                      {dimmed && (
                                        <span className="text-[10px] text-gray-400">
                                          Not in this warehouse
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex gap-4 flex-wrap ml-6">
                                      <div>
                                        <p className="text-xs text-[#7D7D7D]">Current</p>
                                        <p className="text-sm text-[#444]">
                                          {variant.stock} {product.unit || "units"}
                                        </p>
                                      </div>
                                      <div
                                        className={`px-2 py-0.5 text-xs font-medium rounded self-end ${
                                          variant.shieldStatus === "high"
                                            ? "bg-green-100 text-emerald-600"
                                            : "bg-red-100 text-red-700"
                                        }`}
                                      >
                                        {variant.shieldStatus === "high" ? "High Stock" : "Low Stock"}
                                      </div>
                                    </div>
                                    <p className="text-xs text-[#7D7D7D] ml-6">
                                      ₦{variant.unitPrice?.toLocaleString("en-NG")} per unit
                                    </p>
                                  </div>

                                  <div className="w-full md:max-w-[200px] space-y-1">
                                    <Label htmlFor={`vqty-${variant.id}`} className="text-[#555]">
                                      Quantity
                                    </Label>
                                    <Input
                                      id={`vqty-${variant.id}`}
                                      type="number"
                                      min="0"
                                      value={variant.quantity || ""}
                                      onChange={(e) =>
                                        handleVariantQuantityChange(variant.id, e.target.value)
                                      }
                                      className="border border-gray-300 w-full"
                                      placeholder="0"
                                    />
                                    <p className="text-[10px] text-gray-400">Added to current stock</p>
                                    <p className="text-xs text-[#7D7D7D] mt-1">
                                      Min level: {variant.minStockLevel || 0}{" "}
                                      {product.unit || "units"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>

        {/* Footer */}
        <div className="p-4 border-t flex flex-col md:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all-footer"
              checked={allFilteredSelected}
              onCheckedChange={(c) => toggleSelectAll(c as boolean)}
            />
            <Label htmlFor="select-all-footer">
              {selectedCount} item{selectedCount !== 1 ? "s" : ""} selected
            </Label>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button variant="outline" onClick={onClose} className="w-full md:w-auto">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={selectedCount === 0 || isSaving}
              className="bg-emerald-500 hover:bg-green-700 w-full md:w-auto"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
