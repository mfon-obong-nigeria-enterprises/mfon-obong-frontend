/* eslint-disable react-hooks/exhaustive-deps */
/**
 * eslint-disable react-hooks/exhaustive-deps
 *
 * @format
 */

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, X, ChevronDown, ChevronRight } from "lucide-react";
import { type Product, type Category } from "@/types/types";
import { updateProductStock, updateVariantStock } from "@/services/productService";

type UpdateStockProduct = Product & {
  id: string;
  category: string;
  selected: boolean;
  newQuantity?: number;
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
  selected: boolean;
  newQuantity?: number;
  shieldStatus: "high" | "low";
};

interface UpdateStockProps {
  products: Product[];
  categories: Category[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedProducts: Product[]) => void;
}

const getShieldStatus = (
  product: Product,
  newQuantity?: number
): "high" | "low" => {
  const currentStock =
    newQuantity !== undefined ? newQuantity : product.stock || 0;
  const minLevel = product.minStockLevel || 0;
  return currentStock > minLevel ? "high" : "low";
};

export default function UpdateStock({
  products: initialProducts,
  categories,
  isOpen,
  onClose,
  onSave,
}: UpdateStockProps) {
  const getCategoryName = (
    categoryId: string | { _id: string; name: string; units: string[] }
  ): string => {
    if (typeof categoryId === "object" && categoryId.name) {
      return categoryId.name;
    }
    const id = typeof categoryId === "string" ? categoryId : categoryId._id;
    const foundCategory = categories.find((c) => c._id === id);
    return foundCategory?.name || "Uncategorized";
  };

  const buildVariants = (prods: Product[]): UpdateStockVariant[] => {
    const result: UpdateStockVariant[] = [];
    prods.forEach((p) => {
      if (p.hasVariants && p.variants?.length) {
        p.variants.forEach((v) => {
          result.push({
            id: v.id,
            productId: p._id,
            productName: p.name,
            name: v.name,
            stock: v.stock,
            unitPrice: v.unitPrice,
            minStockLevel: v.minStockLevel,
            selected: false,
            newQuantity: v.stock,
            shieldStatus: v.stock > v.minStockLevel ? "high" : "low",
          });
        });
      }
    });
    return result;
  };

  const [products, setProducts] = useState<UpdateStockProduct[]>(() =>
    initialProducts
      .filter((p) => !p.hasVariants)
      .map((product) => ({
        ...product,
        id: product._id,
        category: getCategoryName(product.categoryId),
        selected: false,
        newQuantity: product.stock,
        shieldStatus: getShieldStatus(product),
      }))
  );

  const [variants, setVariants] = useState<UpdateStockVariant[]>(() =>
    buildVariants(initialProducts)
  );

  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [bulkQuantity, setBulkQuantity] = useState("");

  useEffect(() => {
    if (isOpen) {
      setProducts(
        initialProducts
          .filter((p) => !p.hasVariants)
          .map((product) => ({
            ...product,
            id: product._id,
            category: getCategoryName(product.categoryId),
            selected: false,
            newQuantity: product.stock,
            shieldStatus: getShieldStatus(product),
          }))
      );
      setVariants(buildVariants(initialProducts));
      setSearchTerm("");
      setBulkQuantity("");
    }
  }, [initialProducts, categories, isOpen]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const term = searchTerm.toLowerCase();
    return products.filter((p) => {
      const nameMatch = p.name?.toLowerCase().includes(term) ?? false;
      const categoryMatch = p.category?.toLowerCase().includes(term) ?? false;
      return nameMatch || categoryMatch;
    });
  }, [products, searchTerm]);

  const allFilteredSelected = useMemo(
    () =>
      filteredProducts.length > 0 && filteredProducts.every((p) => p.selected),
    [filteredProducts]
  );

  const toggleProductSelection = (id: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p))
    );
  };

  const toggleVariantSelection = (id: string) => {
    setVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, selected: !v.selected } : v))
    );
  };

  const toggleSelectAll = (checked: boolean) => {
    const filteredIds = new Set(filteredProducts.map((p) => p.id));
    setProducts((prev) =>
      prev.map((p) => (filteredIds.has(p.id) ? { ...p, selected: checked } : p))
    );
  };

  const handleQuantityChange = (id: string, value: string) => {
    const num = parseInt(value, 10);
    const newNum = isNaN(num) ? 0 : Math.max(0, num);
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, newQuantity: newNum, shieldStatus: getShieldStatus(p, newNum) } : p
      )
    );
  };

  const handleVariantQuantityChange = (id: string, value: string) => {
    const num = parseInt(value, 10);
    const newNum = isNaN(num) ? 0 : Math.max(0, num);
    setVariants((prev) =>
      prev.map((v) =>
        v.id === id
          ? { ...v, newQuantity: newNum, shieldStatus: newNum > v.minStockLevel ? "high" : "low" }
          : v
      )
    );
  };

  const applyBulkQuantity = () => {
    const num = parseInt(bulkQuantity, 10);
    const newNum = isNaN(num) ? 0 : Math.max(0, num);
    setProducts((prev) =>
      prev.map((p) =>
        p.selected ? { ...p, newQuantity: newNum, shieldStatus: getShieldStatus(p, newNum) } : p
      )
    );
    setVariants((prev) =>
      prev.map((v) =>
        v.selected
          ? { ...v, newQuantity: newNum, shieldStatus: newNum > v.minStockLevel ? "high" : "low" }
          : v
      )
    );
    setBulkQuantity("");
  };

  const toggleExpandProduct = (productId: string) => {
    setExpandedProducts((prev) => {
      const next = new Set(prev);
      next.has(productId) ? next.delete(productId) : next.add(productId);
      return next;
    });
  };

  const handleSave = async () => {
    const updatedProducts = products.filter(
      (p) => p.selected && p.newQuantity !== undefined && p.newQuantity !== p.stock
    );
    const updatedVariants = variants.filter(
      (v) => v.selected && v.newQuantity !== undefined && v.newQuantity !== v.stock
    );

    if (updatedProducts.length === 0 && updatedVariants.length === 0) {
      onClose();
      return;
    }

    try {
      await Promise.all([
        ...updatedProducts.map(async (p) => {
          const diff = (p.newQuantity || 0) - (p.stock || 0);
          await updateProductStock(p.id, Math.abs(diff), p.unit || "", diff >= 0 ? "add" : "subtract");
        }),
        ...updatedVariants.map(async (v) => {
          const diff = (v.newQuantity || 0) - (v.stock || 0);
          await updateVariantStock(v.id, Math.abs(diff), diff >= 0 ? "add" : "subtract");
        }),
      ]);

      setProducts((prev) =>
        prev.map((p) =>
          updatedProducts.find((u) => u.id === p.id)
            ? { ...p, stock: p.newQuantity ?? p.stock, selected: false }
            : p
        )
      );
      setVariants((prev) =>
        prev.map((v) =>
          updatedVariants.find((u) => u.id === v.id)
            ? { ...v, stock: v.newQuantity ?? v.stock, selected: false }
            : v
        )
      );

      onSave(updatedProducts.map((p) => ({ ...p, stock: p.newQuantity ?? p.stock })));
      onClose();
    } catch (error) {
      console.error("Error updating stock:", error);
    }
  };

  // Products that have variants (for the expandable section)
  const variantProducts = useMemo(() => {
    const seen = new Set<string>();
    return initialProducts.filter((p) => {
      if (p.hasVariants && !seen.has(p._id)) {
        const term = searchTerm.toLowerCase();
        if (!term || p.name.toLowerCase().includes(term)) {
          seen.add(p._id);
          return true;
        }
      }
      return false;
    });
  }, [initialProducts, searchTerm]);

  const selectedCount = useMemo(
    () => products.filter((p) => p.selected).length + variants.filter((v) => v.selected).length,
    [products, variants]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <CardHeader className="flex items-center justify-between sticky top-0 bg-white z-10 p-4 border-b">
          <CardTitle>Update Stock Levels</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="flex-grow overflow-y-auto p-4">
          <div className="space-y-6 pt-4">
            {/* Search Input */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-10 bg-gray-200 pl-10"
                />
              </div>
            </div>

            {/* Bulk Update Controls */}
            <div className="space-y-4 p-4 border-b">
              <div className="flex flex-col md:flex-row md:items-center md:gap-6 space-y-4 md:space-y-0">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={allFilteredSelected}
                    onCheckedChange={(checked) =>
                      toggleSelectAll(checked as boolean)
                    }
                  />
                  <Label htmlFor="select-all">Select All</Label>
                </div>
                <div className="flex flex-col md:flex-row md:items-center md:gap-4 w-full md:w-auto">
                  <div className="flex items-center gap-2 w-full">
                    <Label className="whitespace-nowrap">
                      Set all selected to:
                    </Label>
                    <Input
                      type="number"
                      className="w-full h-8"
                      placeholder="Quantity"
                      value={bulkQuantity}
                      onChange={(e) => setBulkQuantity(e.target.value)}
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={applyBulkQuantity}
                    disabled={
                      selectedCount === 0 ||
                      bulkQuantity === "" ||
                      isNaN(parseInt(bulkQuantity, 10))
                    }
                    className="bg-emerald-500 text-white hover:bg-green-600 w-full md:w-auto"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>

            {/* Product List */}
            <div className="space-y-4">
              {filteredProducts.length === 0 ? (
                <div className="text-center p-8">
                  <p className="text-gray-500 mb-2">No products found</p>
                  <Button
                    variant="link"
                    onClick={() => setSearchTerm("")}
                    className="text-emerald-500"
                  >
                    Clear search
                  </Button>
                </div>
              ) : (
                filteredProducts.map((product) => (
                  <div key={product.id} className="border rounded-lg p-4">
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3 text-[#333333]">
                          <Checkbox
                            id={`product-${product.id}`}
                            checked={product.selected || false}
                            onCheckedChange={() =>
                              toggleProductSelection(product.id)
                            }
                          />
                          <Label htmlFor={`product-${product.id}`}>
                            {product.name || "Unnamed Product"}
                          </Label>
                        </div>
                        <span className="text-sm text-[#7D7D7D] px-3 py-1 w-26 h-7 text-center border rounded-sm bg-gray-100 ml-9">
                          {product.category}
                        </span>
                        <div className="flex gap-4 flex-wrap mt-2">
                          <div>
                            <span className="text-sm block text-[#7D7D7D] ml-6">
                              Current
                            </span>
                            <span className="text-sm text-[#444444] ml-6">
                              {product.stock} {product.unit || "units"}
                            </span>
                          </div>
                          <div>
                            <div
                              className={`px-3 py-1 text-xs font-medium rounded ml-6 ${
                                product.shieldStatus === "high"
                                  ? "bg-green-100 text-emerald-500"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {product.shieldStatus === "high"
                                ? "High Stock"
                                : "Low Stock"}
                            </div>
                          </div>
                        </div>
                        <span className="text-sm block text-[#7D7D7D] ml-6 mt-2">
                          Unit Price
                        </span>
                        <span className="text-sm font-sm text-[#444444] ml-6">
                          ₦
                          {product.unitPrice?.toLocaleString("en-NG") || "0.00"}
                        </span>
                      </div>

                      <div className="w-full md:max-w-xs space-y-2 text-[#7D7D7D] pt-4 md:pt-10">
                        <Label htmlFor={`quantity-${product.id}`}>
                          New Quantity
                        </Label>
                        <Input
                          id={`quantity-${product.id}`}
                          type="number"
                          min="0"
                          value={product.newQuantity?.toString() ?? ""}
                          onChange={(e) =>
                            handleQuantityChange(product.id, e.target.value)
                          }
                          className="border border-black w-full"
                        />
                        <Label>Min Level</Label>
                        <Input
                          value={`${product.minStockLevel || 0} ${
                            product.unit || "units"
                          }`}
                          readOnly
                          className="border-none text-[#444444]"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Variant products section */}
            {variantProducts.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-[#333333] border-b pb-2">
                  Products with Grades / Variants
                </h3>
                {variantProducts.map((product) => {
                  const isExpanded = expandedProducts.has(product._id);
                  const productVariants = variants.filter((v) => v.productId === product._id);
                  return (
                    <div key={product._id} className="border rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleExpandProduct(product._id)}
                        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 text-left"
                      >
                        <span className="font-medium text-[#333333] text-sm">{product.name}</span>
                        <div className="flex items-center gap-2 text-[#7D7D7D]">
                          <span className="text-xs">{productVariants.length} grades</span>
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="divide-y">
                          {productVariants.map((variant) => (
                            <div key={variant.id} className="p-4">
                              <div className="flex flex-col md:flex-row justify-between gap-4">
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-3">
                                    <Checkbox
                                      id={`variant-${variant.id}`}
                                      checked={variant.selected}
                                      onCheckedChange={() => toggleVariantSelection(variant.id)}
                                    />
                                    <Label htmlFor={`variant-${variant.id}`} className="font-medium">
                                      {variant.name}
                                    </Label>
                                  </div>
                                  <div className="flex gap-4 flex-wrap mt-1 ml-6">
                                    <div>
                                      <span className="text-xs block text-[#7D7D7D]">Current</span>
                                      <span className="text-sm text-[#444444]">{variant.stock} {product.unit || "units"}</span>
                                    </div>
                                    <div
                                      className={`px-2 py-0.5 text-xs font-medium rounded self-end ${
                                        variant.shieldStatus === "high"
                                          ? "bg-green-100 text-emerald-500"
                                          : "bg-red-100 text-red-800"
                                      }`}
                                    >
                                      {variant.shieldStatus === "high" ? "High Stock" : "Low Stock"}
                                    </div>
                                  </div>
                                  <span className="text-xs text-[#7D7D7D] ml-6">
                                    ₦{variant.unitPrice?.toLocaleString("en-NG") || "0.00"} per unit
                                  </span>
                                </div>

                                <div className="w-full md:max-w-xs space-y-2 text-[#7D7D7D]">
                                  <Label htmlFor={`vqty-${variant.id}`}>New Quantity</Label>
                                  <Input
                                    id={`vqty-${variant.id}`}
                                    type="number"
                                    min="0"
                                    value={variant.newQuantity?.toString() ?? ""}
                                    onChange={(e) => handleVariantQuantityChange(variant.id, e.target.value)}
                                    className="border border-black w-full"
                                  />
                                  <Label>Min Level</Label>
                                  <Input
                                    value={`${variant.minStockLevel || 0} ${product.unit || "units"}`}
                                    readOnly
                                    className="border-none text-[#444444]"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
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
        <div className="z-10 p-4 border-t flex flex-col md:flex-row justify-between items-center gap-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="select-all-footer"
              checked={allFilteredSelected}
              onCheckedChange={(checked) => toggleSelectAll(checked as boolean)}
            />
            <Label htmlFor="select-all-footer">
              {selectedCount} Product{selectedCount !== 1 ? "s" : ""} Selected
            </Label>
          </div>
          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full md:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={selectedCount === 0}
              className="bg-emerald-500 hover:bg-green-700 w-full md:w-auto"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}