import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Icon } from "@iconify/react";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { getWarehouses, createWarehouse } from "@/services/warehouseService";
import { getAllCategories, createCategory, updateCategory, deleteCategory } from "@/services/categoryService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import TagInput from "@/components/TagInput";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useInventoryStore } from "@/stores/useInventoryStore";

type Tab = "warehouses" | "categories";

export default function WarehouseListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>("warehouses");

  // Warehouse form
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", address: "" });

  // Category forms
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", description: "", units: [] as string[] });
  const [editingCategory, setEditingCategory] = useState<{
    id: string; name: string; description: string; units: string[];
  } | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<{ id: string; name: string } | null>(null);

  const { data: warehouses = [], isLoading } = useQuery({
    queryKey: ["warehouses"],
    queryFn: getWarehouses,
  });

  const { data: categories = [], isLoading: catsLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: getAllCategories,
  });

  // ── Warehouse mutations ──────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: createWarehouse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      toast.success("Warehouse created");
      setShowAdd(false);
      setForm({ name: "", address: "" });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to create warehouse");
    },
  });

  // ── Category mutations ───────────────────────────────────────────────────────

  const createCategoryMutation = useMutation({
    mutationFn: (data: { name: string; description: string; units: string[] }) =>
      createCategory(data as any),
    onSuccess: (newCat) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      const store = useInventoryStore.getState();
      store.setCategories([...store.categories, newCat]);
      toast.success("Category created");
      setShowAddCategory(false);
      setCatForm({ name: "", description: "", units: [] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to create category");
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; description: string; units: string[] } }) =>
      updateCategory(id, data),
    onSuccess: (_, { id, data }) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      const store = useInventoryStore.getState();
      store.setCategories(store.categories.map(c => c._id === id ? { ...c, ...data } : c));
      toast.success("Category updated");
      setEditingCategory(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update category");
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      const store = useInventoryStore.getState();
      store.setCategories(store.categories.filter(c => c._id !== id));
      toast.success("Category deleted");
      setDeletingCategory(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to delete category");
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    createMutation.mutate({ name: form.name.trim(), address: form.address.trim() || undefined });
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] px-4 md:px-10 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-[#1E1E1E]">Warehouse</h1>
            <p className="text-sm text-[#777] mt-1">
              Manage central stock and product categories
            </p>
          </div>
          {tab === "warehouses" && (
            <Button onClick={() => setShowAdd(true)} className="bg-[#2ECC71] hover:bg-[#27AE60] text-white">
              <Icon icon="material-symbols:add" width={18} className="mr-1" />
              New Warehouse
            </Button>
          )}
          {tab === "categories" && (
            <Button onClick={() => setShowAddCategory(true)} className="bg-[#2ECC71] hover:bg-[#27AE60] text-white">
              <Icon icon="material-symbols:add" width={18} className="mr-1" />
              New Category
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-lg p-1 border border-[#e5e5e5] w-fit">
          {(["warehouses", "categories"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === t ? "bg-[#2ECC71] text-white" : "text-[#555] hover:bg-gray-50"
              }`}
            >
              {t === "warehouses" ? "Warehouses" : "Categories"}
            </button>
          ))}
        </div>

        {/* Warehouses Tab */}
        {tab === "warehouses" && (
          isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-xl border border-[#e5e5e5] p-5 animate-pulse h-32" />
              ))}
            </div>
          ) : warehouses.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#e5e5e5] p-12 text-center">
              <Icon icon="material-symbols:warehouse-outline" width={48} className="mx-auto text-[#ccc] mb-3" />
              <p className="text-[#555] font-medium">No warehouses yet</p>
              <p className="text-sm text-[#999] mt-1">Create your first warehouse to start managing central stock</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {warehouses.map(wh => (
                <button
                  key={wh._id}
                  onClick={() => navigate(`/manager/dashboard/warehouse/${wh._id}`)}
                  className="bg-white rounded-xl border border-[#e5e5e5] p-5 text-left hover:border-[#2ECC71] hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="bg-green-50 rounded-lg p-2">
                      <Icon icon="material-symbols:warehouse-outline" width={24} className="text-[#2ECC71]" />
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${wh.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {wh.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <h3 className="font-semibold text-[#1E1E1E] text-base">{wh.name}</h3>
                  {wh.address && <p className="text-sm text-[#777] mt-1 truncate">{wh.address}</p>}
                  <p className="text-xs text-[#999] mt-2">
                    {wh._count?.products ?? 0} product{(wh._count?.products ?? 0) !== 1 ? "s" : ""}
                  </p>
                </button>
              ))}
            </div>
          )
        )}

        {/* Categories Tab */}
        {tab === "categories" && (
          catsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-xl border border-[#e5e5e5] p-4 animate-pulse h-20" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#e5e5e5] p-12 text-center">
              <Icon icon="material-symbols:category-outline" width={48} className="mx-auto text-[#ccc] mb-3" />
              <p className="text-[#555] font-medium">No categories yet</p>
              <p className="text-sm text-[#999] mt-1">Create categories to organise products across all branches</p>
            </div>
          ) : (
            <div className="space-y-3">
              {categories.map(cat => (
                <div key={cat._id} className="bg-white rounded-xl border border-[#e5e5e5] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#1E1E1E]">{cat.name}</h3>
                      {cat.description && (
                        <p className="text-sm text-[#777] mt-0.5">{cat.description}</p>
                      )}
                      {cat.units && cat.units.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {cat.units.map((u, i) => (
                            <span key={i} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">
                              {u}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => setEditingCategory({
                          id: cat._id,
                          name: cat.name,
                          description: cat.description ?? "",
                          units: cat.units ?? [],
                        })}
                        className="p-2 rounded-lg hover:bg-orange-50 text-[#aaa] hover:text-orange-500 transition-colors"
                        title="Edit category"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setDeletingCategory({ id: cat._id, name: cat.name })}
                        className="p-2 rounded-lg hover:bg-red-50 text-[#aaa] hover:text-red-500 transition-colors"
                        title="Delete category"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* ── Warehouse dialog ─────────────────────────────────────────────────── */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Warehouse</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div>
              <Label className="text-sm text-[#333]">Warehouse Name</Label>
              <Input
                className="mt-2 border-[#444]"
                placeholder="e.g. Main Warehouse"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label className="text-sm text-[#333]">Address (optional)</Label>
              <Input
                className="mt-2 border-[#444]"
                placeholder="Warehouse address"
                value={form.address}
                onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#2ECC71] hover:bg-[#27AE60]" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Create category dialog ───────────────────────────────────────────── */}
      <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Category</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={e => {
              e.preventDefault();
              if (!catForm.name.trim()) return;
              createCategoryMutation.mutate(catForm);
            }}
            className="space-y-4 pt-2"
          >
            <div>
              <Label className="text-sm text-[#333]">Category Name</Label>
              <Input
                className="mt-2 border-[#444]"
                placeholder="e.g. Iron Rods"
                value={catForm.name}
                onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label className="text-sm text-[#333]">Description (optional)</Label>
              <Textarea
                className="mt-2 border-[#444] resize-none"
                rows={2}
                placeholder="Brief description of this category"
                value={catForm.description}
                onChange={e => setCatForm(p => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-sm text-[#333]">Measurement Units</Label>
              <div className="mt-2">
                <TagInput
                  value={catForm.units}
                  onChange={units => setCatForm(p => ({ ...p, units }))}
                  placeholder="Type a unit and press Enter (e.g. bag, tonne)"
                  className="border-[#7d7d7d]"
                />
              </div>
              <p className="text-xs text-[#999] mt-1">
                These units will be available when adding products to this category
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAddCategory(false)}>Cancel</Button>
              <Button
                type="submit"
                className="bg-[#2ECC71] hover:bg-[#27AE60]"
                disabled={createCategoryMutation.isPending || !catForm.name.trim()}
              >
                {createCategoryMutation.isPending ? "Creating..." : "Create Category"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit category dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          {editingCategory && (
            <form
              onSubmit={e => {
                e.preventDefault();
                updateCategoryMutation.mutate({
                  id: editingCategory.id,
                  data: {
                    name: editingCategory.name,
                    description: editingCategory.description,
                    units: editingCategory.units,
                  },
                });
              }}
              className="space-y-4 pt-2"
            >
              <div>
                <Label className="text-sm text-[#333]">Category Name</Label>
                <Input
                  className="mt-2 border-[#444]"
                  value={editingCategory.name}
                  onChange={e => setEditingCategory(p => p ? { ...p, name: e.target.value } : p)}
                  required
                />
              </div>
              <div>
                <Label className="text-sm text-[#333]">Description (optional)</Label>
                <Textarea
                  className="mt-2 border-[#444] resize-none"
                  rows={2}
                  value={editingCategory.description}
                  onChange={e => setEditingCategory(p => p ? { ...p, description: e.target.value } : p)}
                />
              </div>
              <div>
                <Label className="text-sm text-[#333]">Measurement Units</Label>
                <div className="mt-2">
                  <TagInput
                    value={editingCategory.units}
                    onChange={units => setEditingCategory(p => p ? { ...p, units } : p)}
                    placeholder="Type a unit and press Enter"
                    className="border-[#7d7d7d]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditingCategory(null)}>Cancel</Button>
                <Button
                  type="submit"
                  className="bg-[#2ECC71] hover:bg-[#27AE60]"
                  disabled={updateCategoryMutation.isPending || !editingCategory.name.trim()}
                >
                  {updateCategoryMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete category confirm ──────────────────────────────────────────── */}
      <Dialog open={!!deletingCategory} onOpenChange={() => setDeletingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#555] pt-1">
            Are you sure you want to delete "<strong>{deletingCategory?.name}</strong>"? This cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setDeletingCategory(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deletingCategory && deleteCategoryMutation.mutate(deletingCategory.id)}
              disabled={deleteCategoryMutation.isPending}
            >
              {deleteCategoryMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Deleting...</>
              ) : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
