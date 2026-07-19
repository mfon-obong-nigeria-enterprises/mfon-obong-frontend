/** @format */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, X, Pencil, Save, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";
import { deleteCategory, updateCategory } from "@/services/categoryService";
import { isAxiosError } from "axios";
import { useInventoryStore } from "@/stores/useInventoryStore";
import { useAuthStore } from "@/stores/useAuthStore";
import TagInput from "@/components/TagInput";

type ModalProps = {
  setOpenModal: () => void;
  categoryId: string;
  categoryName: string;
  description?: string;
  units?: string[];
  productCount: number;
  initialEditMode?: boolean;
};

const CategoryModal = ({
  setOpenModal,
  categoryId,
  categoryName,
  description,
  units,
  productCount,
  initialEditMode = false,
}: ModalProps) => {
  const [editMode, setEditMode] = useState(initialEditMode);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editedName, setEditedName] = useState(categoryName);
  const [editedDescription, setEditedDescription] = useState(description || "");
  const [editedUnits, setEditedUnits] = useState<string[]>(units || []);

  const setCategories = useInventoryStore((s) => s.setCategories);
  const categories = useInventoryStore((s) => s.categories);
  const userRole = useAuthStore((s) => s.user?.role);
  const isSuperAdmin = userRole === "SUPER_ADMIN";

  // ✅ Save changes
  const handleSave = async () => {
    // Validation - check if required fields are filled
    if (!editedName.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      setIsLoading(true);


      const response = await updateCategory(categoryId, {
        name: editedName,
        description: editedDescription,
        units: editedUnits,
      });


      const updatedCategory = response.data || response;

      toast.success("Category updated successfully");
      setEditMode(false);

     
      setCategories(
        categories.map((cat) =>
          cat._id === categoryId ? { ...cat, ...updatedCategory } : cat
        )
      );
     
      setEditedName(updatedCategory.name || editedName);
      setEditedDescription(updatedCategory.description || editedDescription);
      
    } catch (error) {
      if (isAxiosError(error) && error.response) {
        toast.error(
          "Failed to update category: " + (error.response.data?.message || "Unknown error")
        );
      } else {
        toast.error("Failed to update category");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Delete category
  const handleDelete = async () => {
    try {
      setIsLoading(true);
      await deleteCategory(categoryId);

      toast.success("Category deleted successfully");

      // 🔄 Remove from Zustand store
      setCategories(categories.filter((cat) => cat._id !== categoryId));
      setIsDeleteModalOpen(false);
      setOpenModal();
    } catch (error) {
      if (isAxiosError(error) && error.response) {
        toast.error(
          "Failed to delete category: " + (error.response.data?.message || "Unknown error")
        );
      } else {
        toast.error("Failed to delete category");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    const currentCategory = categories.find(cat => cat._id === categoryId);
    setEditedName(currentCategory?.name || categoryName);
    setEditedDescription(currentCategory?.description || description || "");
    setEditedUnits(currentCategory?.units || units || []);
    setEditMode(false);
  };

  // Check if form can be saved
  const canSave = editedName.trim() !== "";

  const currentCategory = categories.find(cat => cat._id === categoryId);
  const displayName = currentCategory?.name || categoryName;
  const displayDescription = currentCategory?.description || description;

  return (
    <>
     
      <div
        onClick={setOpenModal}
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90dvh] overflow-hidden flex flex-col"
        >
          {/* Header - Improved mobile layout */}
          <div className="flex justify-between items-start p-4 sm:p-6 border-b border-gray-200">
            <div className="flex-1 min-w-0 mr-3">
              {editMode ? (
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="text-lg font-bold w-full"
                  disabled={isLoading}
                  placeholder="Category name"
                />
              ) : (
                <h3 className="font-bold text-lg text-gray-900 truncate">{displayName}</h3>
              )}
            </div>

            <div className="flex gap-1 sm:gap-2 flex-shrink-0">
              {editMode ? (
                <>
                  {/* Save Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-fit p-2 hover:bg-green-50"
                    onClick={handleSave}
                    disabled={!canSave || isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save size={16} className="text-green-600" />
                    )}
                  </Button>

                  {/* Cancel Edit Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-fit p-2 hover:bg-gray-50"
                    onClick={handleCancelEdit}
                    disabled={isLoading}
                  >
                    <X size={16} className="text-gray-600" />
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-fit p-2 hover:bg-orange-50"
                  onClick={() => setEditMode(true)}
                  disabled={isLoading}
                >
                  <Pencil
                    size={16}
                    className="text-orange-500 cursor-pointer"
                  />
                </Button>
              )}

              {/* Delete Button — SUPER_ADMIN only */}
              {isSuperAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-fit p-2 hover:bg-red-50"
                  onClick={() => setIsDeleteModalOpen(true)}
                  disabled={isLoading}
                >
                  <Trash2
                    size={16}
                    className="text-gray-500 cursor-pointer hover:text-red-500"
                  />
                </Button>
              )}

              {/* Close Modal Button */}
              <Button
                variant="ghost"
                size="sm"
                className="w-fit p-2 hover:bg-gray-50"
                onClick={setOpenModal}
                disabled={isLoading}
              >
                <X size={16} className="text-gray-600" />
              </Button>
            </div>
          </div>

          {/* Content - Scrollable area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* Description Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              {editMode ? (
                <Textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  placeholder="Enter category description (optional)"
                  className="min-h-[100px] resize-none text-center"
                  disabled={isLoading}
                />
              ) : (
                <p className="text-gray-600 leading-relaxed">
                  {displayDescription || "No description available"}
                </p>
              )}
            </div>

            {/* Measurement Units Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Measurement Units
              </label>
              {editMode ? (
                <TagInput
                  value={editedUnits}
                  onChange={setEditedUnits}
                  placeholder="Type a unit and press Enter (e.g. bag, litre)"
                  className="border-[#7d7d7d]"
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(currentCategory?.units || units || []).length > 0 ? (
                    (currentCategory?.units || units || []).map((u, i) => (
                      <span key={i} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm">
                        {u}
                      </span>
                    ))
                  ) : (
                    <p className="text-gray-400 text-sm italic">No units defined</p>
                  )}
                </div>
              )}
            </div>

            {/* Product Count */}
            <div className="bg-gray-50 rounded-lg p-4 text-center mt-6">
              <p className="text-2xl font-bold text-gray-900">{productCount}</p>
              <p className="text-sm text-gray-600 mt-1">Products </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal - Also mobile responsive */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
            <h3 className="font-bold text-lg mb-3 text-gray-900">Confirm Deletion</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete the category "{displayName}"?
              This action cannot be undone.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isLoading}
                className="order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isLoading}
                className="order-1 sm:order-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  "Delete Category"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CategoryModal;