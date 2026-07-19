import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { Icon } from "@iconify/react";
import {
  getWarehouseById,
  createWarehouseProduct,
  updateWarehouseProduct,
  updateWarehouseVariant,
  addWarehouseStock,
  createWarehouseVariant,
  addWarehouseVariantStock,
  getTransferHistory,
  type WarehouseProduct,
  type WarehouseProductVariant,
} from "@/services/warehouseService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useInventoryStore } from "@/stores/useInventoryStore";

type Tab = "products" | "transfers";

export default function WarehouseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { categories } = useInventoryStore();

  const [tab, setTab] = useState<Tab>("products");
  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (catName: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catName)) next.delete(catName);
      else next.add(catName);
      return next;
    });
  };

  // Modals
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddStock, setShowAddStock] = useState<WarehouseProduct | null>(null);
  const [showAddVariant, setShowAddVariant] = useState<WarehouseProduct | null>(null);
  const [showAddVariantStock, setShowAddVariantStock] = useState<{ product: WarehouseProduct; variant: WarehouseProductVariant } | null>(null);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  // Edit product
  const [showEditProduct, setShowEditProduct] = useState<WarehouseProduct | null>(null);
  const [editProductName, setEditProductName] = useState("");
  const [editProductConfirm, setEditProductConfirm] = useState(false);

  // Edit variant
  const [showEditVariant, setShowEditVariant] = useState<{ product: WarehouseProduct; variant: WarehouseProductVariant } | null>(null);
  const [editVariantName, setEditVariantName] = useState("");
  const [editVariantConfirm, setEditVariantConfirm] = useState(false);

  // Forms
  const [productForm, setProductForm] = useState({ categoryId: "", name: "", unit: "", hasVariants: false, stock: "" });
  const [stockForm, setStockForm] = useState({ quantity: "", notes: "" });
  const [variantForm, setVariantForm] = useState({ name: "", stock: "" });

  const { data: warehouse, isLoading } = useQuery({
    queryKey: ["warehouse", id],
    queryFn: () => getWarehouseById(id!),
    enabled: !!id,
  });

  const { data: transfers = [] } = useQuery({
    queryKey: ["transfers", id],
    queryFn: () => getTransferHistory(id),
    enabled: !!id && tab === "transfers",
  });

  const addProductMutation = useMutation({
    mutationFn: (data: typeof productForm) =>
      createWarehouseProduct(id!, {
        categoryId: data.categoryId,
        name: data.name,
        unit: data.unit,
        hasVariants: data.hasVariants,
        stock: data.hasVariants ? 0 : Number(data.stock) || 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse", id] });
      toast.success("Product added to warehouse");
      setShowAddProduct(false);
      setProductForm({ categoryId: "", name: "", unit: "", hasVariants: false, stock: "" });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to add product"),
  });

  const addStockMutation = useMutation({
    mutationFn: ({ productId, qty, notes }: { productId: string; qty: number; notes?: string }) =>
      addWarehouseStock(productId, { quantity: qty, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse", id] });
      toast.success("Stock updated");
      setShowAddStock(null);
      setStockForm({ quantity: "", notes: "" });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to update stock"),
  });

  const addVariantMutation = useMutation({
    mutationFn: ({ productId, name, stock }: { productId: string; name: string; stock: number }) =>
      createWarehouseVariant(productId, { name, stock }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse", id] });
      toast.success("Variant added");
      setShowAddVariant(null);
      setVariantForm({ name: "", stock: "" });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to add variant"),
  });

  const addVariantStockMutation = useMutation({
    mutationFn: ({ variantId, qty, notes }: { variantId: string; qty: number; notes?: string }) =>
      addWarehouseVariantStock(variantId, { quantity: qty, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse", id] });
      toast.success("Variant stock updated");
      setShowAddVariantStock(null);
      setStockForm({ quantity: "", notes: "" });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to update stock"),
  });

  const editProductMutation = useMutation({
    mutationFn: ({ productId, name }: { productId: string; name: string }) =>
      updateWarehouseProduct(productId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse", id] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product renamed across warehouse and all linked branches");
      setShowEditProduct(null);
      setEditProductConfirm(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to rename product"),
  });

  const editVariantMutation = useMutation({
    mutationFn: ({ variantId, name }: { variantId: string; name: string }) =>
      updateWarehouseVariant(variantId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse", id] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Variant renamed across warehouse and all linked branches");
      setShowEditVariant(null);
      setEditVariantConfirm(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to rename variant"),
  });

  const selectedCategory = categories.find(c => c._id === productForm.categoryId);
  const filteredProducts = (warehouse?.products ?? []).filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const groupedProducts = useMemo(() => {
    const groups: Record<string, WarehouseProduct[]> = {};
    for (const p of filteredProducts) {
      const catName = p.categoryRef?.name ?? "Uncategorized";
      if (!groups[catName]) groups[catName] = [];
      groups[catName].push(p);
    }
    return groups;
  }, [filteredProducts]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <Icon icon="svg-spinners:ring-resize" width={40} className="text-[#2ECC71]" />
      </div>
    );
  }

  if (!warehouse) return null;

  return (
    <div className="min-h-screen bg-[#F5F5F5] px-4 md:px-10 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-[#777] hover:text-[#333]">
            <Icon icon="material-symbols:arrow-back" width={22} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-[#1E1E1E]">{warehouse.name}</h1>
            {warehouse.address && <p className="text-sm text-[#777]">{warehouse.address}</p>}
          </div>
          {tab === "products" && (
            <Button onClick={() => setShowAddProduct(true)} className="bg-[#2ECC71] hover:bg-[#27AE60] text-white">
              <Icon icon="material-symbols:add" width={18} className="mr-1" />
              Add Product
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-lg p-1 border border-[#e5e5e5] w-fit">
          {(["products", "transfers"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
                tab === t ? "bg-[#2ECC71] text-white" : "text-[#555] hover:bg-gray-50"
              }`}
            >
              {t === "transfers" ? "Transfer History" : "Products"}
            </button>
          ))}
        </div>

        {/* Products Tab */}
        {tab === "products" && (
          <>
            <div className="mb-4">
              <Input
                placeholder="Search products..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="max-w-xs border-[#ccc]"
              />
            </div>

            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#e5e5e5] p-12 text-center">
                <Icon icon="material-symbols:inventory-2-outline" width={48} className="mx-auto text-[#ccc] mb-3" />
                <p className="text-[#555] font-medium">No products yet</p>
                <p className="text-sm text-[#999] mt-1">Add products to this warehouse to track stock</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(groupedProducts).map(([catName, catProducts]) => {
                  const isOpen = expandedCategories.has(catName);
                  return (
                  <div key={catName} className="bg-white rounded-xl border border-[#e5e5e5] overflow-hidden">
                    <button
                      onClick={() => toggleCategory(catName)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#1E1E1E]">{catName}</span>
                        <span className="text-xs text-[#999] bg-gray-100 px-2 py-0.5 rounded-full">
                          {catProducts.length} product{catProducts.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <Icon
                        icon={isOpen ? "material-symbols:expand-less" : "material-symbols:expand-more"}
                        width={22}
                        className="text-[#777] flex-shrink-0"
                      />
                    </button>

                    {isOpen && (
                    <div className="divide-y divide-[#e5e5e5]">
                      {catProducts.map(product => (
                        <div key={product._id}>
                          <div className="flex items-center justify-between p-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-[#1E1E1E]">{product.name}</span>
                                {product.hasVariants && (
                                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                                    Multi-variant
                                  </span>
                                )}
                              </div>
                              {!product.hasVariants && (
                                <p className="text-sm text-[#555] mt-0.5">
                                  Stock: <span className={`font-semibold ${product.stock <= 0 ? "text-red-600" : "text-[#2ECC71]"}`}>{product.stock}</span> {product.unit}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 ml-3">
                              <button
                                title="Rename product"
                                onClick={() => {
                                  setShowEditProduct(product);
                                  setEditProductName(product.name);
                                  setEditProductConfirm(false);
                                }}
                                className="text-[#777] hover:text-[#3D80FF]"
                              >
                                <Icon icon="material-symbols:edit-outline" width={18} />
                              </button>
                              {!product.hasVariants && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs border-[#2ECC71] text-[#2ECC71] hover:bg-green-50"
                                  onClick={() => setShowAddStock(product)}
                                >
                                  Add Stock
                                </Button>
                              )}
                              {product.hasVariants && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs"
                                    onClick={() => setShowAddVariant(product)}
                                  >
                                    Add Variant
                                  </Button>
                                  <button
                                    onClick={() => setExpandedProduct(expandedProduct === product._id ? null : product._id)}
                                    className="text-[#777] hover:text-[#333]"
                                  >
                                    <Icon
                                      icon={expandedProduct === product._id ? "material-symbols:expand-less" : "material-symbols:expand-more"}
                                      width={22}
                                    />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Variants */}
                          {product.hasVariants && expandedProduct === product._id && (
                            <div className="border-t border-[#e5e5e5] px-4 pb-4 pt-3 space-y-2">
                              {product.variants.length === 0 ? (
                                <p className="text-sm text-[#999]">No variants yet. Add a variant above.</p>
                              ) : (
                                product.variants.map(variant => (
                                  <div key={variant._id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                                    <div>
                                      <span className="text-sm font-medium text-[#333]">{variant.name}</span>
                                      <span className="text-sm text-[#777] ml-2">
                                        — <span className={`font-semibold ${variant.stock <= 0 ? "text-red-600" : "text-[#2ECC71]"}`}>{variant.stock}</span> {product.unit}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        title="Rename variant"
                                        onClick={() => {
                                          setShowEditVariant({ product, variant });
                                          setEditVariantName(variant.name);
                                          setEditVariantConfirm(false);
                                        }}
                                        className="text-[#777] hover:text-[#3D80FF]"
                                      >
                                        <Icon icon="material-symbols:edit-outline" width={16} />
                                      </button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-xs border-[#2ECC71] text-[#2ECC71] hover:bg-green-50"
                                        onClick={() => setShowAddVariantStock({ product, variant })}
                                      >
                                        Add Stock
                                      </Button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Transfers Tab */}
        {tab === "transfers" && (
          <div className="bg-white rounded-xl border border-[#e5e5e5] overflow-hidden">
            {transfers.length === 0 ? (
              <div className="p-12 text-center">
                <Icon icon="material-symbols:swap-horiz" width={48} className="mx-auto text-[#ccc] mb-3" />
                <p className="text-[#555] font-medium">No transfers yet</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-[#e5e5e5]">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-[#555]">Product</th>
                    <th className="text-left px-4 py-3 font-medium text-[#555]">Variant</th>
                    <th className="text-right px-4 py-3 font-medium text-[#555]">Qty</th>
                    <th className="text-left px-4 py-3 font-medium text-[#555]">By</th>
                    <th className="text-left px-4 py-3 font-medium text-[#555]">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-[#555]">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e5e5]">
                  {transfers.map(t => (
                    <tr key={t._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-[#1E1E1E]">
                        {t.warehouseProductRef?.name}
                      </td>
                      <td className="px-4 py-3 text-[#555]">
                        {t.warehouseProductVariantRef?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-red-600">
                        -{t.quantity} {t.warehouseProductRef?.unit}
                      </td>
                      <td className="px-4 py-3 text-[#555]">{t.performedByRef?.name}</td>
                      <td className="px-4 py-3 text-[#777]">
                        {new Date(t.createdAt).toLocaleDateString("en-NG", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 text-[#999]">{t.notes ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Add Product Dialog */}
      <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Product to Warehouse</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={e => { e.preventDefault(); addProductMutation.mutate(productForm); }}
            className="space-y-4 pt-2"
          >
            <div>
              <Label className="text-sm text-[#333]">Category</Label>
              <Select
                value={productForm.categoryId}
                onValueChange={v => setProductForm(p => ({ ...p, categoryId: v, unit: "" }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm text-[#333]">Product Name</Label>
              <Input
                className="mt-2 border-[#444]"
                placeholder="e.g. Binding Wire"
                value={productForm.name}
                onChange={e => setProductForm(p => ({ ...p, name: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label className="text-sm text-[#333]">Unit (primary)</Label>
              <Select
                value={productForm.unit}
                onValueChange={v => setProductForm(p => ({ ...p, unit: v }))}
                disabled={!selectedCategory}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder={selectedCategory ? "Select unit" : "Select a category first"} />
                </SelectTrigger>
                <SelectContent>
                  {(selectedCategory?.units ?? []).map(u => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setProductForm(p => ({ ...p, hasVariants: !p.hasVariants }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${productForm.hasVariants ? "bg-[#2ECC71]" : "bg-gray-300"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${productForm.hasVariants ? "translate-x-6" : "translate-x-1"}`} />
              </button>
              <Label className="text-sm text-[#333]">Has multiple variants (grades/sizes)</Label>
            </div>

            {!productForm.hasVariants && (
              <div>
                <Label className="text-sm text-[#333]">Opening Stock</Label>
                <Input
                  className="mt-2 border-[#444]"
                  type="number"
                  min={0}
                  step="any"
                  placeholder="0"
                  value={productForm.stock}
                  onChange={e => setProductForm(p => ({ ...p, stock: e.target.value }))}
                />
              </div>
            )}

            {productForm.hasVariants && (
              <p className="text-xs text-[#777] bg-blue-50 p-3 rounded-lg">
                You can add variants and their stock after creating the product.
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAddProduct(false)}>Cancel</Button>
              <Button
                type="submit"
                className="bg-[#2ECC71] hover:bg-[#27AE60]"
                disabled={addProductMutation.isPending || !productForm.categoryId || !productForm.name || !productForm.unit}
              >
                {addProductMutation.isPending ? "Adding..." : "Add Product"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Stock Dialog (simple product) */}
      <Dialog open={!!showAddStock} onOpenChange={() => setShowAddStock(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Stock — {showAddStock?.name}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={e => {
              e.preventDefault();
              if (!showAddStock) return;
              addStockMutation.mutate({ productId: showAddStock._id, qty: Number(stockForm.quantity), notes: stockForm.notes || undefined });
            }}
            className="space-y-4 pt-2"
          >
            <div>
              <Label className="text-sm text-[#333]">Current stock: <span className="font-semibold">{showAddStock?.stock} {showAddStock?.unit}</span></Label>
            </div>
            <div>
              <Label className="text-sm text-[#333]">Quantity to add ({showAddStock?.unit})</Label>
              <Input
                className="mt-2 border-[#444]"
                type="number"
                min={0.001}
                step="any"
                placeholder="0"
                value={stockForm.quantity}
                onChange={e => setStockForm(p => ({ ...p, quantity: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label className="text-sm text-[#333]">Notes (optional)</Label>
              <Input
                className="mt-2 border-[#444]"
                placeholder="e.g. Received from supplier"
                value={stockForm.notes}
                onChange={e => setStockForm(p => ({ ...p, notes: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAddStock(null)}>Cancel</Button>
              <Button type="submit" className="bg-[#2ECC71] hover:bg-[#27AE60]" disabled={addStockMutation.isPending}>
                {addStockMutation.isPending ? "Saving..." : "Add Stock"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Variant Dialog */}
      <Dialog open={!!showAddVariant} onOpenChange={() => setShowAddVariant(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Variant — {showAddVariant?.name}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={e => {
              e.preventDefault();
              if (!showAddVariant) return;
              addVariantMutation.mutate({ productId: showAddVariant._id, name: variantForm.name, stock: Number(variantForm.stock) || 0 });
            }}
            className="space-y-4 pt-2"
          >
            <div>
              <Label className="text-sm text-[#333]">Variant Name</Label>
              <Input
                className="mt-2 border-[#444]"
                placeholder="e.g. Grade 60"
                value={variantForm.name}
                onChange={e => setVariantForm(p => ({ ...p, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label className="text-sm text-[#333]">Opening Stock ({showAddVariant?.unit})</Label>
              <Input
                className="mt-2 border-[#444]"
                type="number"
                min={0}
                step="any"
                placeholder="0"
                value={variantForm.stock}
                onChange={e => setVariantForm(p => ({ ...p, stock: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAddVariant(null)}>Cancel</Button>
              <Button type="submit" className="bg-[#2ECC71] hover:bg-[#27AE60]" disabled={addVariantMutation.isPending}>
                {addVariantMutation.isPending ? "Adding..." : "Add Variant"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Product Name Dialog */}
      <Dialog open={!!showEditProduct} onOpenChange={() => { setShowEditProduct(null); setEditProductConfirm(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Product</DialogTitle>
          </DialogHeader>
          {!editProductConfirm ? (
            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-sm text-[#333]">Current name</Label>
                <p className="mt-1 text-sm font-medium text-[#555]">{showEditProduct?.name}</p>
              </div>
              <div>
                <Label className="text-sm text-[#333]">New name</Label>
                <Input
                  className="mt-2 border-[#444]"
                  value={editProductName}
                  onChange={e => setEditProductName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => { setShowEditProduct(null); setEditProductConfirm(false); }}>Cancel</Button>
                <Button
                  onClick={() => {
                    const trimmed = editProductName.trim();
                    if (!trimmed || trimmed === showEditProduct?.name) {
                      setShowEditProduct(null);
                      return;
                    }
                    setEditProductConfirm(true);
                  }}
                  disabled={!editProductName.trim()}
                  className="bg-[#3D80FF] hover:bg-[#2563EB] text-white"
                >
                  Continue
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 text-sm text-amber-800">
                <p className="font-semibold mb-1">Rename will cascade to all branches</p>
                <p>
                  All branch inventories that have adopted <strong>"{showEditProduct?.name}"</strong> from this warehouse will be automatically renamed to <strong>"{editProductName.trim()}"</strong>.
                </p>
                <p className="mt-2">This cannot be undone. Are you sure?</p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditProductConfirm(false)}>Back</Button>
                <Button
                  onClick={() => editProductMutation.mutate({ productId: showEditProduct!._id, name: editProductName.trim() })}
                  disabled={editProductMutation.isPending}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {editProductMutation.isPending ? "Renaming..." : "Yes, Rename Everywhere"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Variant Name Dialog */}
      <Dialog open={!!showEditVariant} onOpenChange={() => { setShowEditVariant(null); setEditVariantConfirm(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Variant — {showEditVariant?.product.name}</DialogTitle>
          </DialogHeader>
          {!editVariantConfirm ? (
            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-sm text-[#333]">Current variant name</Label>
                <p className="mt-1 text-sm font-medium text-[#555]">{showEditVariant?.variant.name}</p>
              </div>
              <div>
                <Label className="text-sm text-[#333]">New variant name</Label>
                <Input
                  className="mt-2 border-[#444]"
                  value={editVariantName}
                  onChange={e => setEditVariantName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => { setShowEditVariant(null); setEditVariantConfirm(false); }}>Cancel</Button>
                <Button
                  onClick={() => {
                    const trimmed = editVariantName.trim();
                    if (!trimmed || trimmed === showEditVariant?.variant.name) {
                      setShowEditVariant(null);
                      return;
                    }
                    setEditVariantConfirm(true);
                  }}
                  disabled={!editVariantName.trim()}
                  className="bg-[#3D80FF] hover:bg-[#2563EB] text-white"
                >
                  Continue
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 text-sm text-amber-800">
                <p className="font-semibold mb-1">Rename will cascade to all branches</p>
                <p>
                  All branch inventories with the variant <strong>"{showEditVariant?.variant.name}"</strong> linked to this warehouse will be automatically renamed to <strong>"{editVariantName.trim()}"</strong>.
                </p>
                <p className="mt-2">This cannot be undone. Are you sure?</p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditVariantConfirm(false)}>Back</Button>
                <Button
                  onClick={() => editVariantMutation.mutate({ variantId: showEditVariant!.variant._id, name: editVariantName.trim() })}
                  disabled={editVariantMutation.isPending}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {editVariantMutation.isPending ? "Renaming..." : "Yes, Rename Everywhere"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Variant Stock Dialog */}
      <Dialog open={!!showAddVariantStock} onOpenChange={() => setShowAddVariantStock(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add Stock — {showAddVariantStock?.product.name} / {showAddVariantStock?.variant.name}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={e => {
              e.preventDefault();
              if (!showAddVariantStock) return;
              addVariantStockMutation.mutate({
                variantId: showAddVariantStock.variant._id,
                qty: Number(stockForm.quantity),
                notes: stockForm.notes || undefined,
              });
            }}
            className="space-y-4 pt-2"
          >
            <div>
              <Label className="text-sm text-[#333]">
                Current stock: <span className="font-semibold">{showAddVariantStock?.variant.stock} {showAddVariantStock?.product.unit}</span>
              </Label>
            </div>
            <div>
              <Label className="text-sm text-[#333]">Quantity to add ({showAddVariantStock?.product.unit})</Label>
              <Input
                className="mt-2 border-[#444]"
                type="number"
                min={0.001}
                step="any"
                placeholder="0"
                value={stockForm.quantity}
                onChange={e => setStockForm(p => ({ ...p, quantity: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label className="text-sm text-[#333]">Notes (optional)</Label>
              <Input
                className="mt-2 border-[#444]"
                placeholder="e.g. Received from supplier"
                value={stockForm.notes}
                onChange={e => setStockForm(p => ({ ...p, notes: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAddVariantStock(null)}>Cancel</Button>
              <Button type="submit" className="bg-[#2ECC71] hover:bg-[#27AE60]" disabled={addVariantStockMutation.isPending}>
                {addVariantStockMutation.isPending ? "Saving..." : "Add Stock"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
