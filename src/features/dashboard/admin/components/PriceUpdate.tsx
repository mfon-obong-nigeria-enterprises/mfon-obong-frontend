/** @format */
import * as React from "react";
import { Loader2, ChevronUp, ChevronDown, ChevronRight, Layers } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Product } from "@/types/types";
import { updateProductPrice, updateVariant } from "@/services/productService";
import { useInventoryStore } from "@/stores/useInventoryStore";

interface StepperInputProps {
  value: number;
  onChange: (val: number) => void;
  disabled?: boolean;
  className?: string;
}

const StepperInput: React.FC<StepperInputProps> = ({ value, onChange, disabled, className }) => (
  <div className={`relative flex items-center ${className}`}>
    <Input
      type="number"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full pr-10 focus-visible:ring-0 focus-visible:ring-offset-0 z-10"
      disabled={disabled}
    />
    <div className="absolute right-1 top-1 bottom-1 rounded-[2px] w-[18px] flex flex-col bg-[#D9D9D9] z-20 overflow-hidden">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(value + 1)}
        className="flex-1 flex items-center justify-center hover:bg-[#D1D5DB] active:bg-[#C4C9D0] transition-colors disabled:opacity-50"
      >
        <ChevronUp className="h-4 w-4 text-[#7D7D7D]" strokeWidth={2} />
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(value - 1)}
        className="flex-1 flex items-center justify-center hover:bg-[#D1D5DB] active:bg-[#C4C9D0] transition-colors disabled:opacity-50"
      >
        <ChevronDown className="h-4 w-4 text-[#7D7D7D]" strokeWidth={2} />
      </button>
    </div>
  </div>
);

interface PriceUpdateTableSectionProps {
  products: Product[];
  isReadOnly?: boolean;
}

export const PriceUpdateTableSection: React.FC<PriceUpdateTableSectionProps> = ({
  products,
  isReadOnly = false,
}) => {
  const [editingPrices, setEditingPrices] = React.useState<{ [key: string]: number }>({});
  const [loadingId, setLoadingId] = React.useState<string | null>(null);
  const [expandedProductIds, setExpandedProductIds] = React.useState<Set<string>>(new Set());

  const updateProductInStore = useInventoryStore((state) => state.updateProduct);

  const simpleProducts = products.filter((p) => !p.hasVariants);
  const variantProducts = products.filter((p) => p.hasVariants);

  const toggleExpand = (productId: string) => {
    setExpandedProductIds((prev) => {
      const next = new Set(prev);
      next.has(productId) ? next.delete(productId) : next.add(productId);
      return next;
    });
  };

  const handlePriceChange = (id: string, value: number) => {
    setEditingPrices((prev) => ({ ...prev, [id]: value }));
  };

  const handleReset = (id: string) => {
    setEditingPrices((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const handleUpdate = async (productId: string, newPrice: number) => {
    try {
      setLoadingId(productId);
      const updatedProduct = await updateProductPrice(productId, newPrice);
      updateProductInStore(updatedProduct);
      setEditingPrices((prev) => {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      });
    } catch (err) {
      console.error("Failed to update price:", err);
    } finally {
      setLoadingId(null);
    }
  };

  const handleVariantUpdate = async (
    variantId: string,
    productId: string,
    newPrice: number
  ) => {
    try {
      setLoadingId(variantId);
      await updateVariant(variantId, { unitPrice: newPrice });
      // Reflect the change in the Zustand store by updating the parent product
      const parentProduct = products.find((p) => p._id === productId);
      if (parentProduct) {
        updateProductInStore({
          ...parentProduct,
          variants: (parentProduct.variants ?? []).map((v) =>
            v.id === variantId ? { ...v, unitPrice: newPrice } : v
          ),
        });
      }
      setEditingPrices((prev) => {
        const copy = { ...prev };
        delete copy[variantId];
        return copy;
      });
    } catch (err) {
      console.error("Failed to update variant price:", err);
    } finally {
      setLoadingId(null);
    }
  };

  const getBadgeStyles = (change: number) => {
    if (change >= 10) return "bg-[#FFF8DD] text-[#F59E0B]";
    if (change > 0) return "bg-[#DCFCE7] text-[#16A34A]";
    return "bg-gray-100 text-gray-600";
  };

  return (
    <div className="space-y-6 bg-white rounded-lg">
      <div className="px-1">
        <h2 className="text-xl font-semibold text-[#333333]">Price Update Management</h2>
      </div>

      {/* ── Desktop Table View ── */}
      <div className="hidden lg:block space-y-4">
        <p className="text-[#666666] text-sm">Product Price Update</p>
        <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-[#F9FAFB]">
              <TableRow className="border-b border-[#E5E7EB]">
                <TableHead className="font-semibold text-[#333333] border-r border-[#E5E7EB] h-12 pl-6">Product</TableHead>
                <TableHead className="font-semibold text-[#333333] border-r border-[#E5E7EB] h-12 pl-6">Current Price</TableHead>
                <TableHead className="font-semibold text-[#333333] border-r border-[#E5E7EB] h-12 w-[280px] pl-6">New Price</TableHead>
                <TableHead className="font-semibold text-[#333333] border-r border-[#E5E7EB] h-12 pl-6">Change%</TableHead>
                <TableHead className="font-semibold text-[#333333] border-r border-[#E5E7EB] h-12 pl-6">Unit</TableHead>
                <TableHead className="font-semibold text-[#333333] h-12 pl-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Simple products */}
              {simpleProducts.map((product) => {
                const currentPrice = editingPrices[product._id] ?? product.unitPrice;
                const change = ((currentPrice - product.unitPrice) / product.unitPrice) * 100;
                const displayChange = parseFloat(change.toFixed(0));
                const isEditing = editingPrices[product._id] !== undefined;
                const isChanged = isEditing && currentPrice !== product.unitPrice;
                const isValid = isEditing && !isNaN(currentPrice) && currentPrice > 0;

                return (
                  <TableRow
                    key={product._id}
                    className="border-b border-[#E5E7EB] last:border-0 hover:bg-transparent"
                  >
                    <TableCell className="text-[#333333] border-r border-[#E5E7EB] py-4 pl-6">
                      {product.name || "Unnamed Product"}
                    </TableCell>
                    <TableCell className="text-[#333333] border-r border-[#E5E7EB] py-4 pl-6">
                      ₦{(product.unitPrice || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="border-r border-[#E5E7EB] py-4 pl-6 pr-4">
                      <StepperInput
                        value={currentPrice}
                        onChange={(val) => handlePriceChange(product._id, val)}
                        disabled={loadingId === product._id || isReadOnly}
                        className="h-12 md:h-full border border-[#E5E7EB] rounded-md"
                      />
                    </TableCell>
                    <TableCell className="py-4 pl-6 border border-[#E5E7EB]">
                      <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${getBadgeStyles(displayChange)}`}>
                        {change > 0 ? "+" : ""}{displayChange}%
                      </span>
                    </TableCell>
                    <TableCell className="text-[#333333] border-r border-[#E5E7EB] py-4 pl-6">
                      {product.unit || "No unit specified"}
                    </TableCell>
                    <TableCell className="py-4 pl-6">
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleUpdate(product._id, currentPrice)}
                          disabled={loadingId === product._id || !isChanged || !isValid || isReadOnly}
                          className="bg-[#22C55E] hover:bg-[#16A34A] text-white h-9 px-4 font-medium min-w-[80px]"
                        >
                          {loadingId === product._id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleReset(product._id)}
                          disabled={loadingId === product._id || !isEditing || isReadOnly}
                          className="border-[#D1D5DB] text-[#333333] hover:bg-gray-50 h-9 px-4 font-medium min-w-[80px]"
                        >
                          Reset
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {/* Variant products */}
              {variantProducts.map((product) => {
                const isExpanded = expandedProductIds.has(product._id);
                const variants = product.variants ?? [];

                return (
                  <React.Fragment key={product._id}>
                    {/* Group header row — spans all columns */}
                    <TableRow
                      className="border-b border-[#E5E7EB] bg-blue-50 hover:bg-blue-50 cursor-pointer select-none"
                      onClick={() => toggleExpand(product._id)}
                    >
                      <TableCell className="border-r border-[#E5E7EB] py-3 pl-4" colSpan={6}>
                        <div className="flex items-center gap-2">
                          {isExpanded
                            ? <ChevronDown className="h-4 w-4 text-blue-500 shrink-0" />
                            : <ChevronRight className="h-4 w-4 text-blue-500 shrink-0" />}
                          <span className="font-medium text-[#333333]">{product.name}</span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-blue-100 text-blue-600 border border-blue-200 rounded-full px-2 py-0.5">
                            <Layers size={10} />
                            Multi-grade &middot; {variants.length} grade{variants.length !== 1 ? "s" : ""}
                          </span>
                          <span className="text-xs text-gray-400">{product.unit}</span>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Variant sub-rows */}
                    {isExpanded && variants.map((variant) => {
                      const currentPrice = editingPrices[variant.id] ?? variant.unitPrice;
                      const change = variant.unitPrice > 0
                        ? ((currentPrice - variant.unitPrice) / variant.unitPrice) * 100
                        : 0;
                      const displayChange = parseFloat(change.toFixed(0));
                      const isEditing = editingPrices[variant.id] !== undefined;
                      const isChanged = isEditing && currentPrice !== variant.unitPrice;
                      const isValid = isEditing && !isNaN(currentPrice) && currentPrice > 0;

                      return (
                        <TableRow
                          key={variant.id}
                          className="border-b border-[#E5E7EB] last:border-0 bg-white hover:bg-gray-50"
                        >
                          <TableCell className="text-[#555] border-r border-[#E5E7EB] py-3 pl-10">
                            <span className="text-xs text-gray-400 mr-1">↳</span>
                            {variant.name}
                          </TableCell>
                          <TableCell className="text-[#333333] border-r border-[#E5E7EB] py-3 pl-6">
                            ₦{(variant.unitPrice || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="border-r border-[#E5E7EB] py-3 pl-6 pr-4">
                            <StepperInput
                              value={currentPrice}
                              onChange={(val) => handlePriceChange(variant.id, val)}
                              disabled={loadingId === variant.id || isReadOnly}
                              className="h-10 border border-[#E5E7EB] rounded-md"
                            />
                          </TableCell>
                          <TableCell className="py-3 pl-6 border border-[#E5E7EB]">
                            <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${getBadgeStyles(displayChange)}`}>
                              {change > 0 ? "+" : ""}{displayChange}%
                            </span>
                          </TableCell>
                          <TableCell className="text-[#333333] border-r border-[#E5E7EB] py-3 pl-6">
                            {product.unit || "—"}
                          </TableCell>
                          <TableCell className="py-3 pl-6">
                            <div className="flex items-center gap-2">
                              <Button
                                onClick={() => handleVariantUpdate(variant.id, product._id, currentPrice)}
                                disabled={loadingId === variant.id || !isChanged || !isValid || isReadOnly}
                                className="bg-[#22C55E] hover:bg-[#16A34A] text-white h-9 px-4 font-medium min-w-[80px]"
                              >
                                {loadingId === variant.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => handleReset(variant.id)}
                                disabled={loadingId === variant.id || !isEditing || isReadOnly}
                                className="border-[#D1D5DB] text-[#333333] hover:bg-gray-50 h-9 px-4 font-medium min-w-[80px]"
                              >
                                Reset
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Mobile Card View ── */}
      <div className="lg:hidden space-y-4">
        {/* Simple product cards */}
        {simpleProducts.map((product) => {
          const currentPrice = editingPrices[product._id] ?? product.unitPrice;
          const change = ((currentPrice - product.unitPrice) / product.unitPrice) * 100;
          const displayChange = parseFloat(change.toFixed(0));
          const isEditing = editingPrices[product._id] !== undefined;
          const isChanged = isEditing && currentPrice !== product.unitPrice;
          const isValid = isEditing && !isNaN(currentPrice) && currentPrice > 0;

          return (
            <div
              key={product._id}
              className="border border-[#E5E7EB] rounded-lg p-5 space-y-4 bg-white shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div className="flex gap-1 text-[#333333] text-[15px]">
                  <span className="text-[#666666]">Product:</span>
                  <span>{product.name || "Unnamed Product"}</span>
                </div>
                <span className="text-[#666666] text-[15px]">{product.unit || "Piece"}</span>
              </div>

              <div className="flex items-center justify-between md:justify-start gap-3">
                <div className="flex gap-1 text-[#333333] text-[15px] whitespace-nowrap">
                  <span className="text-[#666666]">Current Price:</span>
                  <span>₦{(product.unitPrice || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 flex-1 md:justify-start justify-end max-w-[200px]">
                  <StepperInput
                    value={currentPrice}
                    onChange={(val) => handlePriceChange(product._id, val)}
                    disabled={loadingId === product._id || isReadOnly}
                    className="h-10 md:w-[110px]"
                  />
                  <span className={`inline-block px-2 py-1.5 rounded text-xs font-medium whitespace-nowrap ${getBadgeStyles(displayChange)}`}>
                    {change > 0 ? "+" : ""}{displayChange}%
                  </span>
                </div>
              </div>

              <div className="flex md:justify-end gap-3 pt-2">
                <Button
                  onClick={() => handleUpdate(product._id, currentPrice)}
                  disabled={loadingId === product._id || !isChanged || !isValid || isReadOnly}
                  className="flex-1 md:flex-initial bg-[#22C55E] hover:bg-[#16A34A] text-white h-10 font-medium px-4"
                >
                  {loadingId === product._id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleReset(product._id)}
                  disabled={loadingId === product._id || !isEditing || isReadOnly}
                  className="flex-1 md:flex-initial border-[#D1D5DB] text-[#333333] hover:bg-gray-50 h-10 font-medium"
                >
                  Reset
                </Button>
              </div>
            </div>
          );
        })}

        {/* Variant product cards */}
        {variantProducts.map((product) => {
          const isExpanded = expandedProductIds.has(product._id);
          const variants = product.variants ?? [];

          return (
            <div
              key={product._id}
              className="border border-[#E5E7EB] rounded-lg bg-white shadow-sm overflow-hidden"
            >
              {/* Collapsible header */}
              <button
                type="button"
                onClick={() => toggleExpand(product._id)}
                className="w-full flex items-center justify-between p-4 bg-blue-50 text-left"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-[#333333]">{product.name}</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-blue-100 text-blue-600 border border-blue-200 rounded-full px-2 py-0.5">
                    <Layers size={10} />
                    Multi-grade
                  </span>
                </div>
                <div className="flex items-center gap-1 text-gray-500 shrink-0">
                  <span className="text-xs">{variants.length} grade{variants.length !== 1 ? "s" : ""}</span>
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
              </button>

              {/* Grade sub-cards */}
              {isExpanded && (
                <div className="divide-y divide-[#E5E7EB]">
                  {variants.map((variant) => {
                    const currentPrice = editingPrices[variant.id] ?? variant.unitPrice;
                    const change = variant.unitPrice > 0
                      ? ((currentPrice - variant.unitPrice) / variant.unitPrice) * 100
                      : 0;
                    const displayChange = parseFloat(change.toFixed(0));
                    const isEditing = editingPrices[variant.id] !== undefined;
                    const isChanged = isEditing && currentPrice !== variant.unitPrice;
                    const isValid = isEditing && !isNaN(currentPrice) && currentPrice > 0;

                    return (
                      <div key={variant.id} className="p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-[#333333] text-sm">{variant.name}</span>
                          <span className="text-xs text-[#666666]">{product.unit || "unit"}</span>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm whitespace-nowrap">
                            <span className="text-[#666666]">Current: </span>
                            <span className="text-[#333333]">₦{(variant.unitPrice || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-1 justify-end max-w-[200px]">
                            <StepperInput
                              value={currentPrice}
                              onChange={(val) => handlePriceChange(variant.id, val)}
                              disabled={loadingId === variant.id || isReadOnly}
                              className="h-10 md:w-[110px]"
                            />
                            <span className={`inline-block px-2 py-1.5 rounded text-xs font-medium whitespace-nowrap ${getBadgeStyles(displayChange)}`}>
                              {change > 0 ? "+" : ""}{displayChange}%
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <Button
                            onClick={() => handleVariantUpdate(variant.id, product._id, currentPrice)}
                            disabled={loadingId === variant.id || !isChanged || !isValid || isReadOnly}
                            className="flex-1 bg-[#22C55E] hover:bg-[#16A34A] text-white h-10 font-medium px-4"
                          >
                            {loadingId === variant.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleReset(variant.id)}
                            disabled={loadingId === variant.id || !isEditing || isReadOnly}
                            className="flex-1 border-[#D1D5DB] text-[#333333] hover:bg-gray-50 h-10 font-medium"
                          >
                            Reset
                          </Button>
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
    </div>
  );
};
