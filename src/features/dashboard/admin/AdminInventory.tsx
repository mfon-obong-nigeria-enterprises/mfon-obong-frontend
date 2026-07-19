/** @format */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDebouncedCallback } from "use-debounce";

import DashboardTitle from "../shared/DashboardTitle";
import InventoryTab from "./components/InventoryTab";
import Modal from "@/components/Modal";

import { useInventoryStore } from "@/stores/useInventoryStore";

import { IoIosArrowUp, IoIosSearch } from "react-icons/io";
// import { CiImport } from "react-icons/ci";
import { Plus, ChevronRight, RotateCcw, MoreVertical } from "lucide-react";

import type { Product } from "@/types/types";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import UpdateStock from "./components/UpdateStock";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import EmptyInventory from "../shared/EmptyInventory";

const AdminInventory = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [, setPosition] = useState({ xPercent: 80, yPercent: 80 });
  const [dragging, setDragging] = useState(false);
  const [rel] = useState({ x: 0, y: 0 });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [stockStatus, setStockStatus] = useState("all");
  const [priceRange, setPriceRange] = useState("all");
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [showExportConfirm, setShowExportConfirm] = useState(false);

  // Zustand store
  const {
    products,
    categories,
    searchQuery,
    setSearchQuery,
    updateProductsBulk,
  } = useInventoryStore();

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setSearchQuery(value);
  }, 300);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  const getCategoryName = (product: Product): string => {
    if (!product.categoryId) return "Uncategorized";
    if (typeof product.categoryId === "object") {
      return product.categoryId.name;
    }
    const category = categories.find((c) => c._id === product.categoryId);
    return category?.name || "Uncategorized";
  };

  const productsForUpdateStock: Product[] = useMemo(() => {
    return products;
  }, [products]);

  // ✅ FIXED: Save handler now updates Zustand & allows API call
  const handleSave = async (updatedProducts: Product[]) => {
    try {
      // Optional: send to backend (uncomment if API exists)
      // await api.post("/inventory/bulk-update", updatedProducts);

      updateProductsBulk(updatedProducts); // update Zustand state
      setIsModalOpen(false); // close modal after saving
    } catch (error) {
      console.error("Failed to update stock:", error);
    }
  };

  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return products
      .filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          getCategoryName(product).toLowerCase().includes(query)
      )
      .map((prod) => ({ type: "product" as const, item: prod }));
  }, [searchQuery, products, categories]);

  const handleSuggestionClick = (suggestion: {
    type: "product";
    item: Product;
  }) => {
    const id = suggestion.item._id;
    if (id) {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setSearchQuery("");
      }
    }
  };

  function filterByStockStatus(product: Product) {
    if (stockStatus === "all") return true;
    if (stockStatus === "high") return product.stock >= product.minStockLevel;
    if (stockStatus === "low")
      return product.stock > 0 && product.stock < product.minStockLevel;
    if (stockStatus === "out") return product.stock === 0;
    return true;
  }

  function filterByPriceRange(product: Product) {
    if (priceRange === "all") return true;
    const price = product.unitPrice;
    if (priceRange === "under-1000") return price < 1000;
    if (priceRange === "1000-5000") return price >= 1000 && price <= 5000;
    if (priceRange === "5000-10000") return price > 5000 && price <= 10000;
    if (priceRange === "10000-50000") return price > 10000 && price <= 50000;
    if (priceRange === "above-50000") return price > 50000;
    return true;
  }

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const categoryName =
          typeof product.categoryId === "object"
            ? product.categoryId.name.toLowerCase()
            : "";

        return (
          (product.name.toLowerCase().includes(searchQuery) ||
            categoryName.includes(searchQuery)) &&
          filterByStockStatus(product) &&
          filterByPriceRange(product)
        );
      }),
    [products, searchQuery, stockStatus, priceRange]
  );

  const handleMouseUp = () => setDragging(false);

  const handleExportExcel = () => {
    const data = filteredProducts.map((prod) => ({
      Name: prod.name,
      Category:
        typeof prod.categoryId === "object"
          ? prod.categoryId.name
          : prod.categoryId,
      Unit: prod.unit,
      Stock: prod.stock,
      "Unit Price": prod.unitPrice,
      "Min Stock Level": prod.minStockLevel,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
    XLSX.writeFile(workbook, "inventory_export.xlsx");
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();

    const columns = [
      { header: "Product Name", dataKey: "name" },
      { header: "Category", dataKey: "category" },
      { header: "Unit", dataKey: "unit" },
      { header: "Stock", dataKey: "stock" },
      { header: "Unit Price", dataKey: "unitPrice" },
      { header: "Min Stock Level", dataKey: "minStockLevel" },
    ];

    const rows = filteredProducts.map((prod) => ({
      name: prod.name,
      category:
        typeof prod.categoryId === "object"
          ? prod.categoryId.name
          : prod.categoryId,
      unit: prod.unit,
      stock: prod.stock,
      unitPrice: prod.unitPrice,
      minStockLevel: prod.minStockLevel,
    }));

    doc.text("Inventory Export", 14, 16);
    autoTable(doc, {
      startY: 22,
      columns,
      body: rows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [44, 204, 113] },
    });
    doc.save("inventory_export.pdf");
  };

  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = rect.left + rect.width - 80;
      const y = rect.top + rect.height - 80;
      const xPercent = (x / window.innerWidth) * 100;
      const yPercent = (y / window.innerHeight) * 100;
      setPosition({ xPercent, yPercent });
    }
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging) return;
      const newX = e.clientX - rel.x;
      const newY = e.clientY - rel.y;
      const xPercent = (newX / window.innerWidth) * 100;
      const yPercent = (newY / window.innerHeight) * 100;
      setPosition({
        xPercent: Math.min(98, Math.max(2, xPercent)),
        yPercent: Math.min(98, Math.max(2, yPercent)),
      });
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, rel]);

  return (
    <main className="px-2 sm:px-1 lg:px-4 lg:max-w-4xl xl:max-w-6xl mx-auto">
      <div className="">
        <DashboardTitle
          heading="Inventory Management"
          description="Manage your products and categories"
        />

        {products?.length > 0 ? (
          <section className="bg-white rounded-lg shadow-sm mt-5">
            {/* Header Section */}
            <div className="border-b border-gray-200">
              <div className="px-4 sm:px-6 py-4 sm:py-6">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-xl sm:text-2xl font-semibold text-gray-900">
                    Products & Categories
                  </h3>

                  {/* Desktop Actions */}
                  <div className="hidden lg:flex items-center gap-3">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="gap-2">
                          <IoIosArrowUp size={20} />
                          Export
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 w-48">
                        <button
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-t-md"
                          onClick={() => setShowExportConfirm(true)}
                        >
                          Export as PDF
                        </button>
                        <button
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-b-md"
                          onClick={handleExportExcel}
                        >
                          Export as Excel
                        </button>
                      </PopoverContent>
                    </Popover>

                    <Button
                      variant="outline"
                      onClick={handleOpenModal}
                      className="gap-2"
                    >
                      <RotateCcw size={20} />
                      Update Stock
                    </Button>

                    {/* <Button
                      variant="outline"
                      onClick={() => navigate("/import-stock")}
                      className="gap-2"
                    >
                      <CiImport size={20} />
                      Import Stock
                    </Button> */}
                    {/* <Button
                      onClick={() => navigate("/admin/dashboard/sale")}
                      className="gap-2"
                    >
                      <Plus size={16} />
                      Add Sales
                    </Button> */}
                  </div>

                  {/* Mobile Actions Button */}
                  <div className="lg:hidden">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowMobileActions(!showMobileActions)}
                      className="gap-2"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {showMobileActions && (
                  <Card className="mt-4 lg:hidden">
                    <CardContent className="p-3">
                      <div className="grid grid-cols-1 gap-2">
                        <Button
                          variant="ghost"
                          onClick={() => setShowExportConfirm(true)}
                          className="justify-start gap-2"
                        >
                          <IoIosArrowUp size={16} />
                          Export as PDF
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={handleExportExcel}
                          className="justify-start gap-2"
                        >
                          <IoIosArrowUp size={16} />
                          Export as Excel
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={handleOpenModal}
                          className="justify-start gap-2"
                        >
                          <RotateCcw size={16} />
                          Update Stock
                        </Button>
                        {/* <Button
                          variant="ghost"
                          onClick={() => navigate("/import-stock")}
                          className="justify-start gap-2"
                        >
                          <CiImport size={16} />
                          Import Stock
                        </Button> */}
                        <Button
                          variant="ghost"
                          onClick={() => navigate("/admin/dashboard/sale")}
                          className="justify-start gap-2"
                        >
                          <Plus size={16} />
                          Add Sales
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Search & Filters */}
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-5">
              <div className="relative lg:flex-1 w-full lg:w-auto">
                <div className="relative">
                  <IoIosSearch
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={20}
                  />
                  <input
                    type="search"
                    placeholder="Search products, categories..."
                    onChange={(e) => debouncedSearch(e.target.value)}
                    className="lg:w-full md:max-w-[699px] w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                {searchQuery.trim() && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white shadow-lg z-10 border border-gray-200 rounded-b-lg max-h-50 overflow-y-auto">
                    {suggestions.map((suggestion, i) => (
                      <div
                        key={i}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">
                          {suggestion.item.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {getCategoryName(suggestion.item)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {searchQuery.trim() && suggestions.length === 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white shadow-lg z-10 p-4 text-center text-gray-500 border border-gray-200 rounded-b-lg">
                    No matching products found for{" "}
                    <span className="font-medium">"{searchQuery}"</span>
                  </div>
                )}
              </div>

              <div className="items-center gap-4 flex">
                <Select value={stockStatus} onValueChange={setStockStatus}>
                  <SelectTrigger className="w-full sm:w-38">
                    <SelectValue placeholder="Stock status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All products</SelectItem>
                    <SelectItem value="high">High stock</SelectItem>
                    <SelectItem value="low">Low stock</SelectItem>
                    <SelectItem value="out">Out of stock</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={priceRange} onValueChange={setPriceRange}>
                  <SelectTrigger className="w-full sm:w-38">
                    <SelectValue placeholder="Price range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All prices</SelectItem>
                    <SelectItem value="under-1000">Under ₦1,000</SelectItem>
                    <SelectItem value="1000-5000">₦1,000 - ₦5,000</SelectItem>
                    <SelectItem value="5000-10000">₦5,000 - ₦10,000</SelectItem>
                    <SelectItem value="10000-50000">
                      ₦10,000 - ₦50,000
                    </SelectItem>
                    <SelectItem value="above-50000">Above ₦50,000</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6" ref={containerRef}>
              <InventoryTab
                products={filteredProducts}
                categories={categories}
                stockStatus={stockStatus}
                priceRange={priceRange}
              />

              {/* Floating Add Button - Fixed */}
              <div>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="fixed bottom-6 right-6 z-50 flex justify-center items-center bg-green-600 hover:bg-green-700 w-14 h-14 sm:w-16 sm:h-16 rounded-full text-white shadow-xl transition-colors"
                >
                  <Plus className="h-6 w-6 sm:h-8 sm:w-8" />
                </button>
              </div>
            </div>

            <UpdateStock
              products={productsForUpdateStock}
              categories={categories}
              isOpen={isModalOpen}
              onClose={handleCloseModal}
              onSave={handleSave}
            />

            {/* <div className="fixed bottom-6 right-6 z-40">
  <button
    onClick={() => setIsAddModalOpen(true)}
    className="fixed bottom-6 right-6 z-50 flex justify-center items-center bg-green-600 hover:bg-green-700 w-14 h-14 sm:w-16 sm:h-16 rounded-full text-white shadow-xl transition-colors"
  >
    <Plus className="h-6 w-6 sm:h-8 sm:w-8" />
  </button>
</div> */}

            <Modal
              isOpen={isAddModalOpen}
              onClose={() => setIsAddModalOpen(false)}
              className="fixed inset-0 z-50 flex items-center justify-center"
            >
              <div className="p-4 sm:p-6">
                <h6 className="text-lg font-semibold text-gray-900 mb-4">
                  What would you like to add?
                </h6>
                <div className="space-y-3">
                  <Link
                    to="/add-prod"
                    className="flex justify-between items-center border border-gray-200 p-4 rounded-lg hover:shadow-md hover:border-gray-300 transition-all"
                    onClick={() => setIsAddModalOpen(false)}
                  >
                    <div>
                      <p className="font-medium text-gray-900">Add Product</p>
                      <p className="text-sm text-gray-600">
                        Add a new product to your inventory
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </Link>

                </div>
              </div>
            </Modal>

            <Modal
              isOpen={showExportConfirm}
              onClose={() => setShowExportConfirm(false)}
            >
              <div className="p-6 max-w-[378px] max-h-[212px] bg-white rounded-lg shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Confirm Export
                </h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to download the inventory list as a PDF?
                </p>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setShowExportConfirm(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => { handleExportPDF(); setShowExportConfirm(false); }}
                    className="bg-[#2ECC71] hover:bg-[var(--cl-bg-green-hover)]"
                  >
                    Download
                  </Button>
                </div>
              </div>
            </Modal>
          </section>
        ) : (
          <EmptyInventory />
        )}
      </div>
    </main>
  );
};

export default AdminInventory;
