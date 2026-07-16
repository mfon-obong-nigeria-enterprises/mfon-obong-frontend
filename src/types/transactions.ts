import type { Client, TransactionType } from "./types";

export interface ExtraCharge {
  name: string;
  amount: number;
}

export interface Item {
  productName: string;
  productId: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  subtotal: number;
  createdAt: string;
}

export interface BaseUser {
  name: string;
  phone: string;
}

export interface BaseUserWithId extends BaseUser {
  _id: string;
}

export interface ClientWithBalance extends BaseUserWithId {
  balance: number | string;
}

export interface Transaction {
  _id: string;
  invoiceNumber?: string;
  type: TransactionType;
  client: Client | null;
  walkInClient?: BaseUser;
  clientId?: ClientWithBalance;
  clientName?: string;
  walkInClientName?: string;
  userId: {
    _id: string;
    name: string;
    role?: string;
  };
  userName?: string;
  items: Item[];
  subtotal?: number;
  discount?: number;
  transportFare?: number;
  loading?: number;
  loadingAndOffloading?: number;
  extraCharges?: ExtraCharge[];
  total: number;
  amountPaid?: number;
  paymentMethod?: string;
  status: string;
  date?: string;
  createdAt: string;
  notes?: string;
  waybillNumber?: string;
  amount?: number;
  description?: string;
  branchId?: string;
  branchName?: string;
  reference?: string;
  referenceTransactionId?: string | { _id?: string };
  reason?: string;
  clientBalanceAfterTransaction?: number;
  actualAmountReturned?: number;
}

export type MergedTransaction = Transaction & {
  client: Client | null;
};

// Your existing TransactionCreate for sales/purchases
export type TransactionCreate = {
  bankName?: string;
  type: "PURCHASE" | "PICKUP" | "WHOLESALE" | "RETURN";
  items: {
    productId: string;
    quantity: number;
    unit?: string;
    discount?: number;
    unitPrice?: number;
    wholesalePrice?: number;
  }[];
  amountPaid: number;
  discount: number;
  paymentMethod: string;
  notes: string;
  branchId?: string;
  clientId?: string;
  date?: string;
  salesType?: "Retail" | "Wholesale";
  walkInClient?: { name: string; phone: string };
  extraCharges?: ExtraCharge[];
  waybillNumber?: string;
};

// New type specifically for client debt payments
export type ClientPaymentCreate = {
  type: "DEPOSIT";
  amount: number;
  description?: string;
  paymentMethod?: string;
  reference?: string;
  clientId: string;
  branchId?: string;
};

// Union type for all transaction creation scenarios
export type TransactionCreateUnion = TransactionCreate | ClientPaymentCreate;
