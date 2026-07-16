// ==================== CORE TYPES ====================
export type Role = "SUPER_ADMIN" | "MAINTAINER" | "ADMIN" | "STAFF";

export interface PriceHistoryItem {
  price: number;
  date: string;
  _id: string;
}

// ==================== PRODUCT TYPES ====================
export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  stock: number;
  unitPrice: number;
  minStockLevel: number;
  isActive: boolean;
}

export interface Product {
  _id: string;
  name: string;
  categoryId:
    | string
    | {
        _id: string;
        name: string;
        units: string[];
      };
  minStockLevel: number;
  stock: number;
  unit: string;
  unitPrice: number;
  wholesalePrice?: number;
  hasVariants?: boolean;
  isBundleProduct?: boolean;
  bundleSize?: number;
  subUnit?: string;
  variants?: ProductVariant[];
  priceHistory?: PriceHistoryItem[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

// ==================== CATEGORY TYPE ====================
export interface Category {
  description: string | undefined;
  _id: string;
  name: string;
  units: string[];
}

// ==================== API RESPONSE TYPE ====================
export interface ApiResponse<T = unknown> {
  success: boolean;
  status: number;
  message: string;
  data: T;
}

// ==================== AUTH TYPES ====================
export interface LoginUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  branch: string;
  branchId: string;
  createdAt: string;
}

export interface UserProfile {
  _id: string;
  name: string;
  email: string;
  role: Role;
  branch: string;
  branchId: string;
  createdAt: string;
  profilePicture?: string;
}

export interface LoginResponse {
  status: number;
  message: string;
  data: {
    user: LoginUser;
  };
}

export type TransactionType =
  | "PURCHASE"
  | "PICKUP"
  | "DEPOSIT"
  | "WHOLESALE"
  | "RETURN";

// ==================== CLIENT TYPES ====================
export interface TransactionItem {
  _id: string;
  type: TransactionType;
  amount: number;
  description?: string;
  date: string;
  createdAt: string;
  reference: string;
  total?: number;
  amountPaid?: number;
}

export interface Client {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  salesType?: "Retail" | "Wholesale";
  address?: string;
  balance: number;
  description?: string;
  transactions: TransactionItem[];
  isActive: boolean;
  isRegistered: boolean;
  createdAt: string;
  updatedAt: string;
  lastTransactionDate?: string;
}

interface BaseTransactionPayload {
  type: TransactionType;
}

// ==================== TRANSACTION PAYLOAD TYPES ====================
export interface PaymentTransactionPayload extends BaseTransactionPayload {
  type: "DEPOSIT";
  amount: number;
  total: number;
  paymentMethod: string;
  reference: string;
  description: string;
  amountPaid?: number;
}

export interface ProductTransactionPayload extends BaseTransactionPayload {
  type: "PURCHASE" | "PICKUP" | "WHOLESALE" | "RETURN";
  salesType?: "Retail" | "Wholesale";
  items: {
    productId: string;
    quantity: number;
    unitPrice?: number;
    wholesalePrice?: number;
    discount?: number;
  }[];
}

export type CreateTransactionPayload =
  | PaymentTransactionPayload
  | ProductTransactionPayload;

// ==================== PRODUCT RELATED TYPES ====================
export interface NewProductVariant {
  name: string;
  unitPrice: number;
  stock: number;
  minStockLevel: number;
}

export interface NewProduct {
  name: string;
  categoryId: string;
  unit: string;
  unitPrice?: number;
  stock?: number;
  minStockLevel?: number;
  hasVariants?: boolean;
  isBundleProduct?: boolean;
  bundleSize?: number;
  subUnit?: string;
  variants?: NewProductVariant[];
  // branchId: string;
}

export type ProductImportRow = {
  "Product Name": string;
  Category: string;
  "Stock Quantity": number | string;
  "Price per unit": number | string;
};

export interface ProductUpdatePricePayload {
  productId: string;
  newPrice: number;
}

// ==================== INVENTORY STATE TYPE ====================
export interface InventoryState {
  products: Product[];
  categories: Category[];
  searchQuery: string;
  selectedCategoryId: string;
  categoryUnits: string[];
}

// sales for the barchart on admin dashboard
export interface DailySales {
  day: string;
  sales: number;
}

export type WeeklySales = {
  week: string;
  sales: number;
};

export type MonthlySales = {
  month: string;
  sales: number;
};

// NOTIFICATION TYPES
export type NotificationType =
  | "info"
  | "success"
  | "error"
  | "alert"
  | "message"
  | "warning";

export interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  date: Date;
  type?: NotificationType;
}
