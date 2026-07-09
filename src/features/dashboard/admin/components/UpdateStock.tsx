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
import { Search, X } from "lucide-react";
import { type Product, type Category } from "@/types/types";
import { updateProductStock } from "@/services/productService"; 

// Define UpdateStockProduct type locally
type UpdateStockProduct = Product & {
  id: string;
  category: string;
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

  const [products, setProducts] = useState<UpdateStockProduct[]>(() => {
    return initialProducts.map((product) => ({
      ...product,
      id: product._id,
      category: getCategoryName(product.categoryId),
      selected: false,
      newQuantity: product.stock,
      shieldStatus: getShieldStatus(product),
    }));
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [bulkQuantity, setBulkQuantity] = useState("");

  useEffect(() => {
    if (isOpen) {
      setProducts(
        initialProducts.map((product) => ({
          ...product,
          id: product._id,
          category: getCategoryName(product.categoryId),
          selected: false,
          newQuantity: product.stock,
          shieldStatus: getShieldStatus(product),
        }))
      );
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

  const selectedCount = useMemo(
    () => products.filter((p) => p.selected).length,
    [products]
  );

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
        p.id === id
          ? {
              ...p,
              newQuantity: newNum,
              shieldStatus: getShieldStatus(p, newNum),
            }
          : p
      )
    );
  };

  const applyBulkQuantity = () => {
    const num = parseInt(bulkQuantity, 10);
    const newNum = isNaN(num) ? 0 : Math.max(0, num);

    setProducts((prev) =>
      prev.map((p) =>
        p.selected
          ? {
              ...p,
              newQuantity: newNum,
              shieldStatus: getShieldStatus(p, newNum),
            }
          : p
      )
    );
    setBulkQuantity("");
  };

  // ✅ FIXED handleSave
  const handleSave = async () => {
    const updatedProductsPayload = products.filter(
      (p) =>
        p.selected &&
        p.newQuantity !== undefined &&
        p.newQuantity !== p.stock
    );

    if (updatedProductsPayload.length === 0) {
      onClose();
      return;
    }

    try {
      // 1️⃣ Call API for each update
      await Promise.all(
        updatedProductsPayload.map(async (p) => {
          const difference = (p.newQuantity || 0) - (p.stock || 0);
          const operation = difference >= 0 ? "add" : "subtract";
          await updateProductStock(
            p.id,
            Math.abs(difference),
            p.unit || "",
            operation
          );
        })
      );

      // 2️⃣ Update local state for instant UI feedback
      setProducts((prev) =>
        prev.map((p) =>
          updatedProductsPayload.find((u) => u.id === p.id)
            ? { ...p, stock: p.newQuantity ?? p.stock, selected: false }
            : p
        )
      );

      // 3️⃣ Propagate to parent/Zustand store
      onSave(
        updatedProductsPayload.map((p) => ({
          ...p,
          stock: p.newQuantity ?? p.stock,
        }))
      );

      // 4️⃣ Close modal
      onClose();
    } catch (error) {
      console.error("Error updating stock:", error);
    }
  };

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