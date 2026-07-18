/* eslint-disable @typescript-eslint/no-explicit-any */
// @/services/productService.ts
import api from "./baseApi";
import type { Product, NewProduct, NewProductVariant } from "@/types/types";
import { useAuthStore } from "@/stores/useAuthStore";
import type { ProductImportRow } from "@/types/types";

export const getAllProducts = async (): Promise<Product[]> => {
  const response = await api.get("/products");
  return response.data;
};

export const getAllProductsByBranch = async (
  branchId?: string
): Promise<Product[]> => {
  const url = branchId ? `/products/branch/${branchId}` : `/products/branch/`; // Let interceptor handle this
  const response = await api.get(url);
  return response.data;
};

export const createProduct = async (product: NewProduct) => {
  const branchId = useAuthStore.getState().user?.branchId;
  if (!branchId) {
    throw new Error("Branch ID is required to create a product");
  }
  const response = await api.post("/products", { ...product, branchId });
  return response.data;
};

export const updateProduct = async (
  id: string,
  updatedData: Partial<NewProduct>
) => {
  const response = await api.patch(`/products/${id}`, updatedData);
  return response.data;
};

// ✅ New function for updating stock levels
export const updateProductStock = async (
  productId: string,
  quantity: number,
  unit: string,
  operation: "add" | "subtract"
): Promise<Product> => {
  const response = await api.patch(`/products/${productId}/stock`, {
    quantity,
    unit,
    operation,
  });
  return response.data;
};

export const deleteProduct = async (id: string): Promise<void> => {
  const response = await api.delete(`/products/${id}/delete`);
  return response.data;
};

export const createVariant = async (productId: string, data: NewProductVariant) => {
  const response = await api.post(`/products/${productId}/variants`, data);
  return response.data;
};

export const updateVariant = async (variantId: string, data: Partial<NewProductVariant>) => {
  const response = await api.patch(`/products/variants/${variantId}`, data);
  return response.data;
};

export const deleteVariant = async (variantId: string) => {
  const response = await api.delete(`/products/variants/${variantId}`);
  return response.data;
};

export const updateVariantStock = async (
  variantId: string,
  quantity: number,
  operation: "add" | "subtract"
) => {
  const response = await api.patch(`/products/variants/${variantId}/stock`, { quantity, operation });
  return response.data;
};

export const updateProductPrice = async (
  productId: string,
  newPrice: number
) => {
  const response = await api.patch(`/products/${productId}`, {
    unitPrice: newPrice,
  });
  return response.data;
};

// ✅ Helper function to resolve category name to categoryId
const resolveCategoryId = async (categoryName: string): Promise<string> => {
  try {
    // First, try to get all categories to find a match
    const response = await api.get("/categories");
    const categories = response.data;

    const matchingCategory = categories.find(
      (cat: any) => cat.name.toLowerCase() === categoryName.toLowerCase()
    );

    if (matchingCategory) {
      return matchingCategory._id;
    }

    // If no category found, you might want to create a default category
    // or throw an error. For now, we'll use a fallback approach
    throw new Error(`Category "${categoryName}" not found`);
  } catch (error) {
    console.error("Error resolving category:", error);
    throw new Error(`Failed to resolve category: ${categoryName}`);
  }
};

// ✅ Bulk import function using existing createProduct endpoint
export const bulkImportProducts = async (
  products: ProductImportRow[],
  onProgress?: (processed: number, total: number) => void
): Promise<{
  success: Product[];
  errors: Array<{ product: ProductImportRow; error: string }>;
}> => {
  const branchId = useAuthStore.getState().user?.branchId;
  if (!branchId) {
    throw new Error("Branch ID is required to create products");
  }

  const success: Product[] = [];
  const errors: Array<{ product: ProductImportRow; error: string }> = [];

  // Process products sequentially to avoid overwhelming the server
  for (let i = 0; i < products.length; i++) {
    const productData = products[i];

    try {
      // Resolve category name to categoryId
      const categoryId = await resolveCategoryId(productData.Category);

      // Transform ProductImportRow to NewProduct format
      const newProduct: NewProduct = {
        name: productData["Product Name"],
        categoryId: categoryId,
        unit: "pcs", // Default unit, you might want to make this configurable
        unitPrice:
          typeof productData["Price per unit"] === "string"
            ? parseFloat(productData["Price per unit"])
            : productData["Price per unit"],
        minStockLevel: 0, // Default minimum stock level
        stock:
          typeof productData["Stock Quantity"] === "string"
            ? parseInt(productData["Stock Quantity"])
            : productData["Stock Quantity"],
      };

      const createdProduct = await createProduct(newProduct);
      success.push(createdProduct);
    } catch (error) {
      errors.push({
        product: productData,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    }

    // Update progress
    if (onProgress) {
      onProgress(i + 1, products.length);
    }

    // Small delay to avoid overwhelming the server
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return { success, errors };
};
