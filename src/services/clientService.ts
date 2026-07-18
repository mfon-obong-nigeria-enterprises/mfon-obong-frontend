import api from "./baseApi";
import { type AxiosError } from "axios";
import type { Client } from "@/types/types";

export type CreateClientPayload = {
  name: string;
  phone: string;
  address: string;
  email?: string;
  description?: string;
  balance?: number;
  openingBalance?: number;
  openingBalanceType?: "debt" | "credit";
  openingBalanceDate?: string;
};

export const getAllClients = async (): Promise<Client[]> => {
  try {
    const response = await api.get("/clients");
    return response.data;
  } catch (error) {
    const err = error as AxiosError;
    // Ignore cancellations triggered by React Query abort signals to avoid noisy logs
    if (
      err.code === "ERR_CANCELED" ||
      err.message === "canceled" ||
      err.name === "CanceledError"
    ) {
      throw error;
    }
    console.error("Error fetching clients:", err.response?.data || err.message);
    throw error;
  }
};

export const getClientById = async (id: string): Promise<Client> => {
  try {
    const response = await api.get(`/clients/${id}`);
    return response.data;
  } catch (error) {
    const err = error as AxiosError;
    console.error("Error fetching client:", err.response?.data || err.message);
    throw error;
  }
};

export const getClientDebtors = async (): Promise<Client[]> => {
  const response = await api.get("/clients/debtors");
  return response.data;
};

export const createClient = async (
  client: CreateClientPayload
): Promise<Client> => {
  try {
    const response = await api.post("/clients", client);
    return response.data;
  } catch (error) {
    const err = error as AxiosError;
    console.error("Error creating client:", err.response?.data || err.message);
    throw error;
  }
};

export const updateClient = async (
  id: string,
  updatedData: Partial<Client>
): Promise<Client> => {
  try {
    const response = await api.patch(`/clients/${id}`, updatedData);
    return response.data;
  } catch (error) {
    const err = error as AxiosError;
    console.error("Error updating client:", err.response?.data || err.message);
    throw error;
  }
};

export const deleteClient = async (clientId: string): Promise<void> => {
  try {
    const response = await api.delete(`/clients/${clientId}`);
    return response.data;
  } catch (error) {
    const err = error as AxiosError;
    console.error("Error deleting client:", err.response?.data || err.message);
    throw error;
  }
};

export const blockClient = async (clientId: string): Promise<void> => {
  try {
    const response = await api.patch(`/clients/${clientId}/block`);
    return response.data;
  } catch (error) {
    const err = error as AxiosError;
    console.error("Error blocking client:", err.response?.data || err.message);
    throw error;
  }
};

export const unblockClient = async (clientId: string): Promise<void> => {
  try {
    const response = await api.patch(`/clients/${clientId}/unblock`);
    return response.data;
  } catch (error) {
    const err = error as AxiosError;
    console.error(
      "Error unblocking client:",
      err.response?.data || err.message
    );
    throw error;
  }
};
