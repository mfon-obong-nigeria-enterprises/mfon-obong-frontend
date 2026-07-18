import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import Modal from "@/components/Modal";
import { toast } from "react-toastify";

// ui & components
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectItem,
  SelectContent,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@/components/ui/table";
import InputWithSuggestions from "@/components/ui/inputwithsuggestions";
import { Button } from "@/components/ui/button";

// icons
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";

// utils
import { formatCurrency } from "@/utils/styles";
import { itemDisplayName } from "@/utils/itemDisplay";

// type
import type { Row } from "../NewSales";
import type { Product } from "@/types/types";

interface AddSaleProductProps {
  rows: Row[];
  setRows: React.Dispatch<React.SetStateAction<Row[]>>;
  emptyRow: Row;
  onDiscountReasonChange?: (reason: string) => void;
  discountReason?: string;
  globalDiscount: number;
  setGlobalDiscount: React.Dispatch<React.SetStateAction<number>>;
  products: Product[];
  salesType: "Retail" | "Wholesale";
}

// ─── Nested category → product picker (portal-based) ─────────────────────────
interface CategoryProductSelectProps {
  value: string;
  onValueChange: (productId: string) => void;
  options: Product[];
  grouped: Record<string, Product[]>;
  placeholder?: string;
  triggerClassName?: string;
  selectedVariantName?: string;
}

const CategoryProductSelect: React.FC<CategoryProductSelectProps> = ({
  value,
  onValueChange,
  options,
  grouped,
  placeholder = "Select product",
  triggerClassName = "",
  selectedVariantName,
}) => {
  const [open, setOpen] = useState(false);
  const [expandedCats, setExpandedCats] = useState<string[]>([]);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedProduct = options.find((p) => p._id === value);

  // Calculate position from the trigger's bounding rect
  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = 256; // max-h-64 = 16rem = 256px
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < dropdownHeight;

    setDropdownStyle({
      position: "fixed",
      left: rect.left,
      width: Math.max(rect.width, 224), // at least w-56
      zIndex: 9999,
      ...(openUpward
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
  }, []);

  const handleOpen = () => {
    calculatePosition();
    setOpen((prev) => !prev);
  };

  // Auto-expand the category of the currently selected product
  useEffect(() => {
    if (open && selectedProduct) {
      const cat =
        typeof selectedProduct.categoryId === "object"
          ? (selectedProduct.categoryId.name ?? "Other")
          : "Other";
      setExpandedCats((prev) => (prev.includes(cat) ? prev : [...prev, cat]));
    }
  }, [open, selectedProduct]);

  // Recalculate on scroll/resize while open
  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", calculatePosition, true);
    window.addEventListener("resize", calculatePosition);
    return () => {
      window.removeEventListener("scroll", calculatePosition, true);
      window.removeEventListener("resize", calculatePosition);
    };
  }, [open, calculatePosition]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current && !triggerRef.current.contains(target)) {
        // If click is inside the portal panel, ignore
        const panel = document.getElementById("cat-product-panel");
        if (panel && panel.contains(target)) return;
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggleCat = (cat: string) =>
    setExpandedCats((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );

  const handleSelect = (productId: string) => {
    onValueChange(productId);
    setOpen(false);
  };

  const panel = open
    ? ReactDOM.createPortal(
        <div
          id="cat-product-panel"
          style={dropdownStyle}
          className="bg-white border border-[#E5E7EB] rounded shadow-xl max-h-64 overflow-y-auto"
        >
          {Object.keys(grouped).length === 0 && (
            <p className="text-xs text-gray-400 px-3 py-2">No products available</p>
          )}
          {Object.entries(grouped).map(([catName, catProducts]) => (
            <div key={catName}>
              <button
                type="button"
                onClick={() => toggleCat(catName)}
                className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-[#333] bg-[#F5F5F5] hover:bg-[#EBEBEB] border-b border-[#E5E7EB]"
              >
                <span>{catName}</span>
                {expandedCats.includes(catName) ? (
                  <ChevronDown size={12} />
                ) : (
                  <ChevronRight size={12} />
                )}
              </button>
              {expandedCats.includes(catName) &&
                catProducts.map((p) => (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => handleSelect(p._id)}
                    className={`flex items-center w-full px-5 py-2 text-xs text-left border-b border-[#F0F0F0] last:border-0 hover:bg-[#F0FFF4] ${
                      p._id === value
                        ? "bg-[#E6FAF0] text-[#2ECC71] font-medium"
                        : "text-[#444]"
                    }`}
                  >
                    {p.name}
                    {p.hasVariants && (
                      <span className="ml-1.5 text-[9px] bg-blue-50 text-blue-500 border border-blue-100 rounded-full px-1.5 py-0.5">
                        multi-grade
                      </span>
                    )}
                  </button>
                ))}
            </div>
          ))}
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className={`flex items-center justify-between gap-1 bg-white border border-[#E5E7EB] rounded px-2 text-left ${triggerClassName}`}
      >
        <span className="truncate">
          {selectedProduct ? (
            itemDisplayName(selectedProduct.name, selectedVariantName)
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </span>
        <ChevronDown className="shrink-0 text-gray-400" size={13} />
      </button>
      {panel}
    </>
  );
};
// ─────────────────────────────────────────────────────────────────────────────

const discountReasons = [
  "Bulk Purchase Discount",
  "Price Match Competitor's Offer",
  "Loyal Customer Discount",
  "End of the Season Clearance",
  "Damage/Defective Goods",
];

const AddSaleProduct: React.FC<AddSaleProductProps> = ({
  rows,
  setRows,
  emptyRow,
  onDiscountReasonChange,
  discountReason = "",
  globalDiscount,
  setGlobalDiscount,
  products,
  salesType,
}) => {
  const [modal, setModal] = useState<{
    isOpen: boolean;
    rowIndex: number | null;
  }>({
    isOpen: false,
    rowIndex: null,
  });

  const updateRow = (index: number, updates: Partial<Row>) => {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;

        const newRow = { ...row, ...updates };
        const baseAmount = newRow.quantity * newRow.unitPrice;

        let discountAmount = 0;
        if (newRow.discountType === "percent") {
          discountAmount = (baseAmount * newRow.discount) / 100;
        } else if (newRow.discountType === "amount") {
          discountAmount = newRow.discount;
        }

        return {
          ...newRow,
          total: Math.max(baseAmount - discountAmount, 0), // no negatives
        };
      })
    );
  };

  // Products with any stock (used for add-row cap)
  const availableProducts = products.filter(
    (p) =>
      p.isActive &&
      (p.hasVariants ? (p.variants?.some((v) => v.stock > 0) ?? false) : p.stock > 0)
  );

  // Total selectable slots: variant grades each count as 1, bundle products count as 2 (main + sub)
  const totalSelectableSlots = availableProducts.reduce((sum, p) => {
    if (p.hasVariants) return sum + (p.variants?.filter((v) => v.stock > 0).length ?? 0);
    if (p.isBundleProduct) return sum + 2;
    return sum + 1;
  }, 0);

  // Products visible in the dropdown for a given row:
  // - Standard products: hidden once selected in any other row
  // - Variant products: visible as long as ≥1 grade is not yet used in another row
  const buildProductOptions = (currentIndex: number, currentRow: Row) =>
    products.filter((p) => {
      if (!p.isActive) return false;
      const hasStock = p.hasVariants
        ? p.variants?.some((v) => v.stock > 0)
        : p.stock > 0;
      if (!hasStock) return false;
      if (p._id === currentRow.productId) return true; // always show own selection
      if (!p.hasVariants) {
        if (p.isBundleProduct) {
          // Bundle products can appear in up to 2 rows (one per unit type)
          return rows.filter((r, i) => i !== currentIndex && r.productId === p._id).length < 2;
        }
        return !rows.some((r, i) => i !== currentIndex && r.productId === p._id);
      }
      // Variant product: show if at least one grade hasn't been claimed by another row
      const usedVariantIds = rows
        .filter((r, i) => i !== currentIndex && r.productId === p._id)
        .map((r) => r.variantId);
      return (p.variants?.filter((v) => v.stock > 0 && !usedVariantIds.includes(v.id)) ?? []).length > 0;
    });

  // Grades available for the grade selector: exclude grades already selected in other rows
  const getAvailableVariants = (product: Product, currentIndex: number, currentRow: Row) => {
    const usedVariantIds = rows
      .filter((r, i) => i !== currentIndex && r.productId === product._id)
      .map((r) => r.variantId)
      .filter(Boolean);
    return (product.variants ?? []).filter(
      (v) => v.stock > 0 && (v.id === currentRow.variantId || !usedVariantIds.includes(v.id))
    );
  };

  // Group an array of products by category name
  const groupByCategory = (list: Product[]): Record<string, Product[]> =>
    list.reduce<Record<string, Product[]>>((acc, p) => {
      const cat = typeof p.categoryId === "object" ? (p.categoryId.name ?? "Other") : "Other";
      (acc[cat] ??= []).push(p);
      return acc;
    }, {});

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p._id === productId);
    if (product) {
      let bundleUnitType: "main" | "sub" | undefined;
      if (product.isBundleProduct) {
        const otherBundleRows = rows.filter((r, i) => i !== index && r.productId === productId);
        if (otherBundleRows.length > 0) {
          const otherType = otherBundleRows[0].bundleUnitType ?? "main";
          bundleUnitType = otherType === "main" ? "sub" : "main";
        } else {
          bundleUnitType = "main";
        }
      }
      const baseUnitPrice = product.hasVariants
        ? 0
        : product.isBundleProduct && bundleUnitType === "sub"
          ? 0  // sub-unit price is set when kgQty is entered
          : (product.unitPrice || 0);
      updateRow(index, {
        productId,
        variantId: "",
        variantName: "",
        unitPrice: baseUnitPrice,
        unit: product.unit || "pcs",
        productName: product.name || "",
        bundlesQty: undefined,
        kgQty: undefined,
        subUnit: product.subUnit,
        bundleUnitType,
        quantity: product.isBundleProduct ? 0 : 1,
      });
    } else {
      updateRow(index, { productId: "", variantId: "", variantName: "", unitPrice: 0, unit: "", productName: "", bundlesQty: undefined, kgQty: undefined, bundleUnitType: undefined });
    }
  };

  const handleBundleQtyChange = (index: number, value: number) => {
    const row = rows[index];
    const product = products.find((p) => p._id === row.productId);
    const bundleSize = product?.bundleSize ?? 20;
    const maxStock = product?.stock ?? 0;
    const unitType = row.bundleUnitType ?? "main";
    const largeLabel = (product?.unit ?? "").replace(/\(s\)$/i, "").trim().toLowerCase() + "s";

    if (unitType === "main") {
      if (salesType === "Retail" && value > maxStock && maxStock > 0) {
        toast.warn(`Only ${maxStock} ${largeLabel} available in stock`);
        return;
      }
      updateRow(index, { bundlesQty: value, kgQty: undefined, quantity: value });
    } else {
      const totalBundles = value / bundleSize;
      if (salesType === "Retail" && totalBundles > maxStock && maxStock > 0) {
        toast.warn(`Only ${Math.floor(maxStock * bundleSize)} ${product?.subUnit ?? "units"} available in stock`);
        return;
      }
      // Sub-unit: qty=1, unitPrice=total for this cut (auto-calculated, adjustable by staff)
      const subUnitTotal = value * ((product?.unitPrice || 0) / bundleSize);
      updateRow(index, { bundlesQty: undefined, kgQty: value, quantity: 1, unitPrice: subUnitTotal });
    }
  };

  const handleVariantChange = (index: number, variantId: string) => {
    const row = rows[index];
    const product = products.find((p) => p._id === row.productId);
    const variant = product?.variants?.find((v) => v.id === variantId);
    if (variant) {
      updateRow(index, { variantId: variant.id, variantName: variant.name, unitPrice: variant.unitPrice });
    }
  };

  // Add new row
  const addRow = () => {
    if (totalSelectableSlots <= 1) {
      toast.warn("You have only one product in store");
      return;
    }
    if (rows.length >= totalSelectableSlots) {
      toast.warn("No more products available to add");
      return;
    }
    setRows((prev) => [...prev, { ...emptyRow }]);
  };

  // open delete modal with checks
  const openDeleteModal = (index: number) => {
    setModal({ isOpen: true, rowIndex: index });
  };

  // delete or reset row
  const handleDelete = () => {
    if (modal.rowIndex === null) return;

    if (rows.length > 1) {
      setRows((prev) => prev.filter((_, i) => i !== modal.rowIndex));
    } else {
      setRows([emptyRow]);
    }

    setModal({ isOpen: false, rowIndex: null });
  };

  // calculate subtotal
  const subtotal = rows.reduce(
    (acc, row) => acc + (Number(row.quantity) * Number(row.unitPrice) || 0),
    0
  );

  const discountTotal = rows.reduce((acc, row) => {
    const baseAmount = row.quantity * row.unitPrice;

    if (row.discountType === "percent") {
      return acc + (baseAmount * (row.discount || 0)) / 100;
    } else {
      return acc + (row.discount || 0);
    }
  }, 0);

  const rowTotal = subtotal - discountTotal;

  const finalTotal = globalDiscount > 0 ? subtotal - globalDiscount : rowTotal;

  // Check if any row has discount
  const hasDiscount =
    rows.some((row) => row.discount > 0) || globalDiscount !== 0;

  const handleDiscountReasonChange = (reason: string) => {
    if (onDiscountReasonChange) {
      onDiscountReasonChange(reason);
    }
  };

  const handleTotalChange = (index: number, value: string) => {
    if (value === "") {
      updateRow(index, { unitPrice: 0 });
      return;
    }

    const newTotal = parseFloat(value);
    if (isNaN(newTotal)) return;

    const row = rows[index];
    const quantity = row.quantity > 0 ? row.quantity : 1;

    let newUnitPrice = 0;

    // Reverse calculate unit price from total to keep total consistent with user input
    if (row.discountType === "percent") {
      const factor = 1 - (row.discount || 0) / 100;
      if (factor !== 0) {
        newUnitPrice = newTotal / (quantity * factor);
      }
    } else {
      newUnitPrice = (newTotal + (row.discount || 0)) / quantity;
    }

    updateRow(index, { unitPrice: newUnitPrice });
  };

  const formatMoneyInput = (value: number) => {
    if (!value || value <= 0) return "";
    return `₦${Math.round(value).toLocaleString("en-US")}`;
  };

  const parseMoneyInput = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "");
    if (!digitsOnly) return 0;
    return Number(digitsOnly);
  };

  return (
    <div className="bg-white border px-2 py-5">
      <h6 className="text-[#1E1E1E] text-base font-medium mb-4">Add Product</h6>

      {/* ========================================================= */}
      {/* MOBILE VIEW (STRICTLY MATCHING SCREENSHOT) - md:hidden   */}
      {/* ========================================================= */}
      <div className="block md:hidden">
        {/* Header Row */}
        <div className="flex items-center gap-2 bg-[#F5F5F5] py-3 px-1 mb-2">
            <div className="w-[36%] text-[11px] text-[#666] font-medium pl-1">Description</div>
            <div className="w-[16%] text-[11px] text-[#666] font-medium text-center">Quantity</div>
            <div className="w-[20%] text-[11px] text-[#666] font-medium text-center">Unit Price</div>
            <div className="w-[20%] text-[11px] text-[#666] font-medium text-center">Total</div>
            <div className="w-[8%] text-[11px] text-[#666] font-medium text-center">Action</div>
        </div>

        {/* Data Rows */}
        <div className="space-y-3">
          {rows.map((row, index) => {
             const selectedProduct = products.find((p) => p._id === row.productId);
             const selectedVariant = selectedProduct?.variants?.find((v) => v.id === row.variantId);
             const maxQuantity = selectedProduct?.hasVariants
               ? (selectedVariant?.stock || 0)
               : (selectedProduct?.stock || 0);

            return (
              <div key={index} className="border-b pb-3 last:border-0 px-1 space-y-2">
                {/* Product + Grade row */}
                <div className="flex items-center gap-2">
                {/* Product Select */}
                <div className="w-[36%]">
                  <CategoryProductSelect
                    value={row.productId}
                    onValueChange={(val) => handleProductChange(index, val)}
                    options={buildProductOptions(index, row)}
                    grouped={groupByCategory(buildProductOptions(index, row))}
                    placeholder="Select"
                    triggerClassName="w-full h-[34px] text-[11px]"
                    selectedVariantName={row.variantName}
                  />
                </div>

                {/* Quantity */}
                <div className="w-[16%]">
                  {selectedProduct?.isBundleProduct ? (() => {
                    const otherBundleRows = rows.filter((r, i) => i !== index && r.productId === row.productId);
                    const forcedType: "main" | "sub" | null = otherBundleRows.length > 0
                      ? (otherBundleRows[0].bundleUnitType === "sub" ? "main" : "sub")
                      : null;
                    const unitType: "main" | "sub" = row.bundleUnitType ?? forcedType ?? "main";
                    const largeLabel = (selectedProduct.unit ?? "BUNDLE(S)").replace(/\(s\)$/i, "").trim().toLowerCase() + "s";
                    const subLabel = selectedProduct.subUnit ?? "kg";
                    return (
                      <div className="flex flex-col gap-0.5">
                        {!forcedType && (
                          <div className="flex gap-0.5">
                            {(["main", "sub"] as const).map((t) => (
                              <button key={t} type="button"
                                onClick={() => {
                                  const newPrice = t === "sub"
                                    ? (selectedProduct.unitPrice || 0) / (selectedProduct.bundleSize ?? 20)
                                    : (selectedProduct.unitPrice || 0);
                                  updateRow(index, { bundleUnitType: t, bundlesQty: undefined, kgQty: undefined, quantity: 0, unitPrice: newPrice });
                                }}
                                className={`flex-1 text-[7px] py-0.5 rounded border leading-tight ${unitType === t ? "bg-[#2ECC71] text-white border-[#2ECC71]" : "bg-gray-50 text-gray-400 border-gray-200"}`}
                              >{t === "main" ? largeLabel : subLabel}</button>
                            ))}
                          </div>
                        )}
                        <input
                          type="number" min={0}
                          max={unitType === "main" ? Math.floor(maxQuantity) : undefined}
                          value={(unitType === "main" ? row.bundlesQty : row.kgQty) || ""}
                          placeholder="0"
                          onChange={(e) => handleBundleQtyChange(index, e.target.value === "" ? 0 : Number(e.target.value))}
                          className="w-full h-[28px] border border-[#E5E7EB] rounded text-center text-[9px] outline-none bg-white"
                        />
                        <span className="text-[7px] text-gray-400 text-center">{unitType === "main" ? largeLabel : subLabel}</span>
                      </div>
                    );
                  })() : (
                    <input
                      type="number"
                      max={maxQuantity}
                      value={row.quantity === 0 ? "" : row.quantity}
                      placeholder="0"
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "") {
                            updateRow(index, { quantity: 0 });
                            return;
                        }
                        const newQuantity = Number(value);
                        if (salesType === "Retail" && newQuantity > maxQuantity && maxQuantity > 0) {
                            toast.warn(`Only ${maxQuantity} available`);
                            updateRow(index, { quantity: maxQuantity });
                        } else {
                            updateRow(index, { quantity: newQuantity });
                        }
                      }}
                      className="w-full h-[34px] border border-[#E5E7EB] rounded text-center text-[11px] outline-none bg-white focus:ring-1 focus:ring-gray-200"
                    />
                  )}
                </div>

                {/* Unit Price */}
                <div className="w-[20%]">
                  <input
                    type="text"
                    value={formatMoneyInput(row.unitPrice)}
                    onChange={(e) =>
                      updateRow(index, { unitPrice: parseMoneyInput(e.target.value) })
                    }
                    placeholder="₦0"
                    className="w-full h-[34px] border border-[#E5E7EB] rounded text-center text-[11px] outline-none bg-white focus:ring-1 focus:ring-gray-200"
                  />
                </div>

                 {/* Total */}
                 <div className="w-[20%] text-center">
                    {salesType === "Wholesale" ? (
                      <input
                        type="text"
                        value={formatMoneyInput(row.total)}
                        onChange={(e) =>
                          handleTotalChange(index, String(parseMoneyInput(e.target.value)))
                        }
                        placeholder="₦0"
                        className="w-[90%] mx-auto h-[34px] border border-[#E5E7EB] rounded text-center text-[11px] outline-none bg-white focus:ring-1 focus:ring-gray-200"
                      />
                    ) : (
                      <span className="text-[10px] text-[#333]">
                        {row.total > 0 ? formatCurrency(row.total) : "₦0.00"}
                      </span>
                    )}
                 </div>

                 {/* Action */}
                 <div className="w-[8%] flex justify-center">
                    <button
                        onClick={() => openDeleteModal(index)}
                        className="w-[30px] h-[30px] bg-[#F5F5F5] rounded flex items-center justify-center hover:bg-red-50"
                    >
                         <Trash2 className="w-3.5 h-3.5 text-[#666]" />
                    </button>
                 </div>
              </div>
              {/* Grade selector (mobile) */}
              {selectedProduct?.hasVariants && (
                <Select
                  value={row.variantId || ""}
                  onValueChange={(val) => handleVariantChange(index, val)}
                >
                  <SelectTrigger className="h-[30px] text-[11px] px-2 bg-white border border-[#E5E7EB] rounded w-full">
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableVariants(selectedProduct, index, row).map((v) => (
                      <SelectItem key={v.id} value={v.id} className="text-xs">
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* DESKTOP VIEW (PRESERVED) - hidden md:block               */}
      {/* ========================================================= */}
      <div className="hidden md:block overflow-x-auto -mx-4 sm:mx-0">
        <div className="min-w-[700px] px-4 sm:px-0">
          <Table className="w-full mt-2 space-y-20">
            <TableHeader className="bg-[#F0F0F3] h-12">
              <TableRow>
                <TableHead className="text-[#333333] font-normal px-4">
                  Product
                </TableHead>
                <TableHead className="text-[#333333] text-center font-normal">
                  Quantity
                </TableHead>
                <TableHead className="text-[#333333] text-center font-normal">
                  Unit Price
                </TableHead>
                <TableHead className="text-[#333333] text-center font-normal">
                  Total
                </TableHead>
                <TableHead className="text-[#333333] pr-5 text-center font-normal">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => {
                const selectedProduct = products.find(
                  (p) => p._id === row.productId
                );
                const selectedVariant = selectedProduct?.variants?.find(
                  (v) => v.id === row.variantId
                );
                const maxQuantity = selectedProduct?.hasVariants
                  ? (selectedVariant?.stock || 0)
                  : (selectedProduct?.stock || 0);

                return (
                  <TableRow key={index} className="!border-b">
                    {/* Product select + grade */}
                    <TableCell className="py-5 space-y-2">
                      <CategoryProductSelect
                        value={row.productId}
                        onValueChange={(val) => handleProductChange(index, val)}
                        options={buildProductOptions(index, row)}
                        grouped={groupByCategory(buildProductOptions(index, row))}
                        placeholder="Select product"
                        triggerClassName="w-[170px] h-9 text-sm"
                        selectedVariantName={row.variantName}
                      />
                      {/* Grade selector (desktop) */}
                      {selectedProduct?.hasVariants && (
                        <Select
                          value={row.variantId || ""}
                          onValueChange={(val) => handleVariantChange(index, val)}
                        >
                          <SelectTrigger className="!bg-white w-[75px] md:w-[170px] text-xs h-8">
                            <SelectValue placeholder="Select grade" />
                          </SelectTrigger>
                          <SelectContent position="popper">
                            {getAvailableVariants(selectedProduct, index, row).map((v) => (
                              <SelectItem key={v.id} value={v.id} className="text-xs">
                                {v.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>

                    {/* Quantity input */}
                    <TableCell className="w-[75px] md:w-[120px]">
                      {selectedProduct?.isBundleProduct ? (() => {
                        const otherBundleRows = rows.filter((r, i) => i !== index && r.productId === row.productId);
                        const forcedType: "main" | "sub" | null = otherBundleRows.length > 0
                          ? (otherBundleRows[0].bundleUnitType === "sub" ? "main" : "sub")
                          : null;
                        const unitType: "main" | "sub" = row.bundleUnitType ?? forcedType ?? "main";
                        const largeLabel = (selectedProduct.unit ?? "BUNDLE(S)").replace(/\(s\)$/i, "").trim().toLowerCase() + "s";
                        const subLabel = selectedProduct.subUnit ?? "kg";
                        return (
                          <div className="flex flex-col gap-1 items-center">
                            {!forcedType && (
                              <div className="flex gap-1">
                                {(["main", "sub"] as const).map((t) => (
                                  <button key={t} type="button"
                                    onClick={() => {
                                      const newPrice = t === "sub"
                                        ? 0  // price set when kgQty is entered
                                        : (selectedProduct.unitPrice || 0);
                                      updateRow(index, { bundleUnitType: t, bundlesQty: undefined, kgQty: undefined, quantity: 0, unitPrice: newPrice });
                                    }}
                                    className={`text-[9px] px-1.5 py-0.5 rounded border ${unitType === t ? "bg-[#2ECC71] text-white border-[#2ECC71]" : "bg-gray-50 text-gray-400 border-gray-200"}`}
                                  >{t === "main" ? largeLabel : subLabel}</button>
                                ))}
                              </div>
                            )}
                            <div className="flex flex-col items-center">
                              <input
                                type="number" min={0}
                                max={unitType === "main" ? Math.floor(maxQuantity) : undefined}
                                value={(unitType === "main" ? row.bundlesQty : row.kgQty) || ""}
                                placeholder="0"
                                onChange={(e) => handleBundleQtyChange(index, e.target.value === "" ? 0 : Number(e.target.value))}
                                className="w-[50px] h-9 border border-[#E5E7EB] rounded text-center text-xs outline-none bg-white focus:ring-1 focus:ring-gray-200"
                              />
                              <span className="text-[9px] text-gray-400">{unitType === "main" ? largeLabel : subLabel}</span>
                            </div>
                          </div>
                        );
                      })() : (
                        <Input
                          type="number"
                          max={maxQuantity}
                          value={row.quantity === 0 ? "" : row.quantity}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "") {
                              updateRow(index, { quantity: 0 });
                              return;
                            }
                            const newQuantity = Number(value);
                            if (salesType === "Retail" && newQuantity > maxQuantity && maxQuantity > 0) {
                              toast.warn(`Only ${maxQuantity} ${row.unit || "items"} available in stock`);
                              updateRow(index, { quantity: maxQuantity });
                            } else {
                              updateRow(index, { quantity: newQuantity });
                            }
                          }}
                          className="text-center !bg-white"
                        />
                      )}
                    </TableCell>

                    {/* Unit Price */}
                    <TableCell className="text-center">
                      <Input
                        type="text"
                        value={formatMoneyInput(row.unitPrice)}
                        onChange={(e) =>
                          updateRow(index, { unitPrice: parseMoneyInput(e.target.value) })
                        }
                        placeholder="₦0"
                        className="text-center !bg-white w-[100px] mx-auto"
                      />
                    </TableCell>

                    {/* Total */}
                    <TableCell className="text-center">
                      {salesType === "Wholesale" ? (
                        <Input
                          type="text"
                          value={formatMoneyInput(row.total)}
                          onChange={(e) =>
                            handleTotalChange(index, String(parseMoneyInput(e.target.value)))
                          }
                          placeholder="₦0"
                          className="text-center !bg-white w-[100px] mx-auto"
                        />
                      ) : (
                        formatCurrency(row.total)
                      )}
                    </TableCell>

                    {/* Delete */}
                    <TableCell>
                      <button
                        onClick={() => openDeleteModal(index)}
                        className="py-2 px-3 mx-auto bg-[#f5f5f5] hover:bg-[#f5f5f5]/90 rounded flex items-center justify-center"
                        title="Delete row"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c0 1 1 2 2 2v2M10 11v6M14 11v6" />
                        </svg>
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ isOpen: false, rowIndex: null })}
      >
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Confirm Delete</h2>
          <p className="mb-6">Are you sure you want to delete this row?</p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setModal({ isOpen: false, rowIndex: null })}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Show discount reason input only when there's a discount */}
      {hasDiscount && (
        <div className="mt-4">
          <InputWithSuggestions
            label="Discount Reason:"
            placeholder="Input or select Reason for Discount"
            options={discountReasons}
            value={discountReason}
            onChange={handleDiscountReasonChange}
            requiredMessage="Discount reason is required for all discounts above 0% for audit purposes"
          />
        </div>
      )}

      {/* add button */}
      {salesType !== "Wholesale" && (
        <Button
          variant="ghost"
          onClick={addRow}
          className="flex justify-center items-center gap-1 py-8 px-2.5 border-2 border-dashed border-[#D9D9D9] my-7 rounded-md w-full"
        >
          <Plus className="text-[#2ECC71] w-4" />
          <span className="text-[#2ECC71]">Add Another Product</span>
        </Button>
      )}

      {/* total */}
      <div className="bg-[#F5F5F5] rounded-md overflow-hidden">
        {/* subtotal */}
        <div className="flex justify-between items-center py-3 px-7">
          <p>Materials Total Cost</p>
          <p className="mr-2">{formatCurrency(subtotal)}</p>
        </div>
        {/* discount */}
        <div className="flex justify-between items-center py-3 px-7">
          <p>Discount</p>
          {/* If no discount is selected, show an input for large discount */}
          {discountTotal ? (
            <p className="border bg-white py-1 px-2 rounded">
              {formatCurrency(discountTotal)}
            </p>
          ) : (
            <div className="relative">
              <span className="absolute left-2 top-2 text-sm"></span>
              <Input
                className="w-24 border !bg-white py-1 pl-6 pr-2"
                value={formatMoneyInput(globalDiscount)}
                onChange={(e) => setGlobalDiscount(parseMoneyInput(e.target.value))}
                placeholder="₦0"
              />
            </div>
          )}
        </div>
        {/* total */}
        <div className="bg-[#F0F0F3] text-[#333333] flex justify-between items-center py-3 px-7">
          <p>Total</p>
          <p className="mr-2">{formatCurrency(finalTotal)}</p>
        </div>
      </div>
    </div>
  );
};

export default AddSaleProduct;