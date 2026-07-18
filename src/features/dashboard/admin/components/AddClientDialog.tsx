/** @format */

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useClientMutations } from "@/hooks/useClientMutations";
import { isAxiosError, type AxiosError } from "axios";
import { toast } from "react-toastify";
import type { CreateClientPayload } from "@/services/clientService";

interface AddClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormData {
  name: string;
  phone: string;
  description: string;
  address: string;
  hasOpeningBalance: boolean;
  openingBalance: string;
  openingBalanceType: "debt" | "credit";
  openingBalanceDate: string;
}

export function AddClientDialog({ open, onOpenChange }: AddClientDialogProps) {
  const { createMutate } = useClientMutations();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const [formData, setFormData] = useState<FormData>({
    name: "",
    phone: "",
    description: "",
    address: "",
    hasOpeningBalance: false,
    openingBalance: "",
    openingBalanceType: "debt",
    openingBalanceDate: today,
  });

  const handleOpeningBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, "").replace(/[^0-9.]/g, "");
    if (!raw) {
      setFormData((prev) => ({ ...prev, openingBalance: "" }));
      return;
    }
    const parts = raw.split(".");
    const intFormatted = parts[0] ? Number(parts[0]).toLocaleString("en-NG") : "";
    const formatted =
      parts.length > 1 ? `${intFormatted}.${parts[1].slice(0, 2)}` : intFormatted;
    setFormData((prev) => ({ ...prev, openingBalance: formatted }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const digitsOnly = inputValue.replace(/\D/g, "");
    const limitedDigits = digitsOnly.slice(0, 11);

    setFormData((prev) => ({
      ...prev,
      phone: limitedDigits,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!formData.name.trim()) {
      setError("Client name is required");
      setIsLoading(false);
      return;
    }

    if (!formData.phone.trim()) {
      setError("Phone number is required");
      setIsLoading(false);
      return;
    }

    if (!formData.address.trim()) {
      setError("Client address is required");
      setIsLoading(false);
      return;
    }

    const digitsOnly = formData.phone.replace(/\D/g, "");
    if (digitsOnly.length !== 11) {
      setError("Phone number must be exactly 11 digits");
      setIsLoading(false);
      return;
    }

    if (!/^[0-9]+$/.test(digitsOnly)) {
      setError("Phone number must contain only digits");
      setIsLoading(false);
      return;
    }

    if (formData.hasOpeningBalance) {
      const amount = parseFloat(formData.openingBalance.replace(/,/g, ""));
      if (!formData.openingBalance || isNaN(amount) || amount <= 0) {
        setError("Please enter a valid opening balance amount");
        setIsLoading(false);
        return;
      }
      if (!formData.openingBalanceDate) {
        setError("Please enter the date for the opening balance");
        setIsLoading(false);
        return;
      }
    }

    try {
      const clientData: CreateClientPayload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
      };

      if (formData.description.trim()) {
        clientData.description = formData.description.trim();
      }

      if (formData.hasOpeningBalance && formData.openingBalance) {
        const amount = parseFloat(formData.openingBalance.replace(/,/g, ""));
        if (!isNaN(amount) && amount > 0) {
          clientData.openingBalance = amount;
          clientData.openingBalanceType = formData.openingBalanceType;
          clientData.openingBalanceDate = formData.openingBalanceDate;
        }
      }

      await createMutate.mutateAsync(clientData);

      toast.success("Client added successfully");
      onOpenChange(false);

      setFormData({
        name: "",
        phone: "",
        description: "",
        address: "",
        hasOpeningBalance: false,
        openingBalance: "",
        openingBalanceType: "debt",
        openingBalanceDate: today,
      });
      setError(null);
    } catch (err) {
      if (isAxiosError(err)) {
        const axiosError = err as AxiosError<{ message: string }>;

        if (axiosError.response?.status === 409) {
          setError(
            "A client with this name or phone number already exists. Please use different details."
          );
        } else if (axiosError.response?.data?.message) {
          setError(axiosError.response.data.message);
        } else {
          setError("Failed to add client. Please try again.");
        }
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isLoading) {
      setFormData({
        name: "",
        phone: "",
        description: "",
        address: "",
        hasOpeningBalance: false,
        openingBalance: "",
        openingBalanceType: "debt",
        openingBalanceDate: today,
      });
      setError(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <div className="">
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogOverlay className="bg-[#ffffff] fixed inset-0 z-50" />
        <DialogContent aria-describedby="add-client-dialog z-50" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-medium text-xl pb-2 pt-2 text-[#1E1E1E]">
              Register New Client
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3 pt-2">
            {error && (
              <div className="text-red-600 text-sm p-2 bg-red-50 rounded">
                {error}
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <Label
                  htmlFor="name"
                  className="text-sm text-[#333333] font-[400]"
                >
                  Client Name
                </Label>
                <Input
                  className="w-full mt-2 font-[400] text-sm border-[#444444] border"
                  id="name"
                  value={formData.name}
                  disabled={isLoading}
                  placeholder="Enter client name..."
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="flex-1 min-w-0">
                <Label
                  htmlFor="phone"
                  className="text-sm text-[#333333] font-[400]"
                >
                  Phone Number
                </Label>
                <Input
                  className="w-full mt-2 font-[400] text-sm border border-[#444444]"
                  id="phone"
                  value={formData.phone}
                  disabled={isLoading}
                  placeholder="080 XXX XXX XX"
                  onChange={handlePhoneChange}
                  required
                />
              </div>
            </div>

            <div>
              <Label
                htmlFor="address"
                className="text-sm text-[#333333] font-[400]"
              >
                Client Address
              </Label>
              <Input
                className="mt-2 font-[400] text-sm border border-[#444444]"
                id="address"
                placeholder="Enter client address"
                required
                disabled={isLoading}
                value={formData.address}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    address: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <Label
                htmlFor="description"
                className="text-sm text-[#444444] font-[400] "
              >
                Description (optional)
              </Label>
              <Textarea
                className="mt-2 font-[400] text-sm border border-[#444444]"
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Add any additional notes about this client..."
                rows={2}
                disabled={isLoading}
              />
            </div>

            {/* Opening Balance Toggle */}
            <div className="border border-[#d9d9d9] rounded-lg p-3 space-y-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      hasOpeningBalance: !prev.hasOpeningBalance,
                    }))
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                    formData.hasOpeningBalance ? "bg-[#2ECC71]" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.hasOpeningBalance
                        ? "translate-x-6"
                        : "translate-x-1"
                    }`}
                  />
                </button>
                <div>
                  <Label className="text-sm text-[#333333] font-[400] cursor-pointer">
                    Add opening balance (optional)
                  </Label>
                  <p className="text-xs text-[#777777] mt-0.5">
                    For migrating existing clients with a prior balance
                  </p>
                </div>
              </div>

              {formData.hasOpeningBalance && (
                <div className="space-y-3">
                  {/* Debt / Credit toggle */}
                  <div>
                    <Label className="text-sm text-[#333333] font-[400] block mb-2">
                      Balance type
                    </Label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            openingBalanceType: "debt",
                          }))
                        }
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium border transition-colors ${
                          formData.openingBalanceType === "debt"
                            ? "bg-red-50 border-red-400 text-red-700"
                            : "bg-white border-[#d9d9d9] text-[#555555] hover:bg-gray-50"
                        }`}
                      >
                        Debt (owes us)
                      </button>
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            openingBalanceType: "credit",
                          }))
                        }
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium border transition-colors ${
                          formData.openingBalanceType === "credit"
                            ? "bg-green-50 border-green-400 text-green-700"
                            : "bg-white border-[#d9d9d9] text-[#555555] hover:bg-gray-50"
                        }`}
                      >
                        Credit (we owe them)
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3 flex-wrap">
                    <div className="flex-1 min-w-[140px]">
                      <Label
                        htmlFor="openingBalance"
                        className="text-sm text-[#333333] font-[400]"
                      >
                        Amount (₦)
                      </Label>
                      <Input
                        className="mt-2 font-[400] text-sm border border-[#444444]"
                        id="openingBalance"
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        disabled={isLoading}
                        value={formData.openingBalance}
                        onChange={handleOpeningBalanceChange}
                      />
                    </div>

                    <div className="flex-1 min-w-[140px]">
                      <Label
                        htmlFor="openingBalanceDate"
                        className="text-sm text-[#333333] font-[400]"
                      >
                        As of date
                      </Label>
                      <Input
                        className="mt-2 font-[400] text-sm border border-[#444444]"
                        id="openingBalanceDate"
                        type="date"
                        disabled={isLoading}
                        value={formData.openingBalanceDate}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            openingBalanceDate: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-[10px] pt-4 items-end justify-end ">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className="border-[#444444] border p-5"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#2ECC71] p-5 hover:bg-[#27AE60]"
                disabled={isLoading}
              >
                {isLoading ? "Adding..." : "Add Client"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
