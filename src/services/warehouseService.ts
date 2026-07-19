import api from "./baseApi";

export type Warehouse = {
  _id: string;
  id: string;
  name: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
  _count?: { products: number };
};

export type WarehouseProductVariant = {
  _id: string;
  id: string;
  warehouseProductId: string;
  name: string;
  stock: number;
  isActive: boolean;
};

export type WarehouseProduct = {
  _id: string;
  id: string;
  warehouseId: string;
  categoryId: string;
  categoryRef?: { id: string; name: string };
  name: string;
  unit: string;
  hasVariants: boolean;
  stock: number;
  isActive: boolean;
  variants: WarehouseProductVariant[];
  warehouseRef?: { id: string; name: string };
};

export type StockTransfer = {
  _id: string;
  id: string;
  warehouseId: string;
  branchId: string;
  warehouseProductId: string;
  warehouseProductVariantId?: string;
  quantity: number;
  notes?: string;
  createdAt: string;
  warehouseRef?: { id: string; name: string };
  warehouseProductRef?: { id: string; name: string; unit: string };
  warehouseProductVariantRef?: { id: string; name: string };
  performedByRef?: { id: string; name: string; role: string };
};

// Warehouses
export const getWarehouses = async (): Promise<Warehouse[]> => {
  const res = await api.get("/warehouse");
  return res.data;
};

export const getWarehouseById = async (id: string): Promise<Warehouse & { products: WarehouseProduct[] }> => {
  const res = await api.get(`/warehouse/${id}`);
  return res.data;
};

export const createWarehouse = async (data: { name: string; address?: string }): Promise<Warehouse> => {
  const res = await api.post("/warehouse", data);
  return res.data;
};

export const updateWarehouse = async (id: string, data: Partial<Warehouse>): Promise<Warehouse> => {
  const res = await api.patch(`/warehouse/${id}`, data);
  return res.data;
};

// Warehouse Products
export const getWarehouseProducts = async (warehouseId?: string, categoryId?: string): Promise<WarehouseProduct[]> => {
  const params: any = {};
  if (warehouseId) params.warehouseId = warehouseId;
  if (categoryId) params.categoryId = categoryId;
  const res = await api.get("/warehouse/products", { params });
  return res.data;
};

export const getWarehouseProductById = async (id: string): Promise<WarehouseProduct> => {
  const res = await api.get(`/warehouse/products/${id}`);
  return res.data;
};

export const createWarehouseProduct = async (
  warehouseId: string,
  data: { categoryId: string; name: string; unit: string; hasVariants?: boolean; stock?: number }
): Promise<WarehouseProduct> => {
  const res = await api.post(`/warehouse/${warehouseId}/products`, data);
  return res.data;
};

export const updateWarehouseProduct = async (
  productId: string,
  data: { name?: string; unit?: string; isActive?: boolean }
): Promise<WarehouseProduct> => {
  const res = await api.patch(`/warehouse/products/${productId}`, data);
  return res.data;
};

export const addWarehouseStock = async (
  productId: string,
  data: { quantity: number; notes?: string }
): Promise<WarehouseProduct> => {
  const res = await api.patch(`/warehouse/products/${productId}/stock`, data);
  return res.data;
};

// Warehouse Variants
export const createWarehouseVariant = async (
  warehouseProductId: string,
  data: { name: string; stock?: number }
): Promise<WarehouseProductVariant> => {
  const res = await api.post(`/warehouse/products/${warehouseProductId}/variants`, data);
  return res.data;
};

export const updateWarehouseVariant = async (
  variantId: string,
  data: { name?: string; isActive?: boolean }
): Promise<WarehouseProductVariant> => {
  const res = await api.patch(`/warehouse/variants/${variantId}`, data);
  return res.data;
};

export const addWarehouseVariantStock = async (
  variantId: string,
  data: { quantity: number; notes?: string }
): Promise<WarehouseProductVariant> => {
  const res = await api.patch(`/warehouse/variants/${variantId}/stock`, data);
  return res.data;
};

// Stock Transfers
export const transferFromWarehouse = async (data: {
  warehouseId: string;
  branchId: string;
  warehouseProductId: string;
  warehouseProductVariantId?: string;
  quantity: number;
  notes?: string;
}): Promise<any> => {
  const res = await api.post("/warehouse/transfer", data);
  return res.data;
};

export const runInitialCleanup = async (): Promise<{ message: string; counts: Record<string, number> }> => {
  const res = await api.post("/warehouse/admin/initial-cleanup");
  return res.data;
};

export const getTransferHistory = async (warehouseId?: string, branchId?: string): Promise<StockTransfer[]> => {
  const params: any = {};
  if (warehouseId) params.warehouseId = warehouseId;
  if (branchId) params.branchId = branchId;
  const res = await api.get("/warehouse/transfers", { params });
  return res.data;
};
