import { useState, useEffect } from "react";
import { X, ChevronDown, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { itemDisplayName } from "@/utils/itemDisplay";

import {
  assignWaybillToTransaction,
  type WaybillError,
} from "@/services/waybillService";

// Types based on your transaction structure
interface Transaction {
  _id: string;
  clientId?: { name: string };
  walkInClientName?: string;
  waybillNumber?: string;
  items: Array<{
    quantity: number;
    productName: string;
    variantName?: string;
  }>;
  total: number;
  createdAt: string;
}

interface WaybillModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  onWaybillGenerated?: (transactionId: string, waybillNumber: string) => void;
}

const WaybillModal = ({
  isOpen,
  onClose,
  transactions,
  onWaybillGenerated,
}: WaybillModalProps) => {
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [waybillNumber, setWaybillNumber] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const recentTransactions = transactions
    .filter((t) => !t.waybillNumber) // Only show transactions without waybill
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 50); // Limit to 50 most recent

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedTransaction(null);
      setWaybillNumber("");
      setIsDropdownOpen(false);
    }
  }, [isOpen]);

  const handleTransactionSelect = (transaction: Transaction) => {
    // Check if transaction already has a waybill
    if (transaction.waybillNumber) {
      toast.warn("This transaction already has a waybill assigned");
      return;
    }

    setSelectedTransaction(transaction);
    setIsDropdownOpen(false);
  };

  const handleWaybillNumberChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    // Remove spaces and convert to uppercase for consistency
    const value = e.target.value.trim().toUpperCase();
    setWaybillNumber(value);
  };

  const validateWaybillNumber = (number: string): boolean => {
    // Basic validation - you can customize this based on your requirements
    if (!number || number.length < 3) {
      toast.error("Waybill number must be at least 3 characters long");
      return false;
    }

    // Check if it contains only alphanumeric characters and hyphens
    const waybillPattern = /^[A-Z0-9-]+$/;
    if (!waybillPattern.test(number)) {
      toast.error(
        "Waybill number can only contain letters, numbers, and hyphens"
      );
      return false;
    }

    return true;
  };

  const handleSaveWaybill = async () => {
    if (!selectedTransaction) {
      toast.error("Please select a transaction first");
      return;
    }

    if (!waybillNumber) {
      toast.error("Please enter a waybill number");
      return;
    }

    // Validate waybill number format
    if (!validateWaybillNumber(waybillNumber)) {
      return;
    }

    setIsLoading(true);

    try {
      await assignWaybillToTransaction(selectedTransaction._id, waybillNumber);

      // Success - close modal and reset state
      toast.success("Waybill assigned successfully");

      // Call optional callback with transaction ID and waybill number
      if (onWaybillGenerated) {
        onWaybillGenerated(selectedTransaction._id, waybillNumber);
      }

      // Reset state and close
      setSelectedTransaction(null);
      setWaybillNumber("");
      onClose();
    } catch (error) {
      const waybillError = error as WaybillError;
      toast.error(waybillError.message || "Failed to assign waybill");
      console.error("Error assigning waybill:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    onClose();
    setSelectedTransaction(null);
    setWaybillNumber("");
    setIsDropdownOpen(false);
  };

  const handleModalClick = () => {
    if (isDropdownOpen) {
      setIsDropdownOpen(false);
    }
  };

  const handleDropdownClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-[#4444] bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleModalClick}
    >
      <div
        className="bg-white rounded-lg w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-[#1E1E1E] font-Inter">
            Add Waybill
          </h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <X size={20} />
          </button>
        </div>

        {/* Client Name Dropdown */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-[#333333] mb-2">
            Client's Name
          </label>
          <div className="relative" onClick={handleDropdownClick}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              disabled={isLoading}
              className="w-full p-3 border border-[#D9D9D9] rounded-md text-left bg-white hover:border-[#3D80FF] focus:border-[#3D80FF] focus:outline-none flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span
                className={
                  selectedTransaction ? "text-[#333333]" : "text-[#999999]"
                }
              >
                {selectedTransaction
                  ? selectedTransaction.clientId?.name ||
                    selectedTransaction.walkInClientName
                  : "Select recent transaction"}
              </span>
              <ChevronDown
                size={16}
                className={`text-gray-400 transition-transform ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isDropdownOpen && !isLoading && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#D9D9D9] rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                {recentTransactions.length > 0 ? (
                  recentTransactions.map((transaction) => {
                    const hasWaybill = !!transaction.waybillNumber;

                    return (
                      <button
                        key={transaction._id}
                        onClick={() => handleTransactionSelect(transaction)}
                        disabled={hasWaybill}
                        className={`w-full p-3 text-left border-b border-[#F0F0F0] last:border-b-0 transition-colors ${
                          hasWaybill
                            ? "opacity-50 cursor-not-allowed bg-gray-50"
                            : "hover:bg-[#F5F5F5]"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-[#333333] font-medium truncate mr-2">
                            {transaction.clientId?.name ||
                              transaction.walkInClientName}
                          </span>
                          <div className="flex items-center gap-2 text-sm whitespace-nowrap">
                            {hasWaybill && (
                              <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded text-xs">
                                <Package size={12} />
                                <span>{transaction.waybillNumber}</span>
                              </div>
                            )}
                            <span className="text-[#666666]">
                              {new Date(
                                transaction.createdAt
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="text-[#888888] text-sm mt-1 truncate">
                          {transaction.items.length > 0 && (
                            <span>
                              {transaction.items[0].quantity}x{" "}
                              {itemDisplayName(transaction.items[0].productName, transaction.items[0].variantName)}
                              {transaction.items.length > 1 &&
                                ` +${transaction.items.length - 1} more`}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="p-3 text-[#999999] text-center">
                    No recent transactions found
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Waybill Number Input */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-[#333333] mb-2">
            Waybill Number
          </label>
          <div className="relative">
            <input
              type="text"
              value={waybillNumber}
              onChange={handleWaybillNumberChange}
              placeholder="Enter waybill number (e.g., WB-2024-001)"
              disabled={!selectedTransaction || isLoading}
              className="w-full p-3 border border-[#D9D9D9] rounded-md bg-white text-[#333333] placeholder:text-[#999999] focus:border-[#3D80FF] focus:outline-none disabled:bg-[#F9F9F9] disabled:cursor-not-allowed transition-colors"
              maxLength={50}
            />
          </div>
          {!selectedTransaction && (
            <p className="text-sm text-[#999999] mt-1">
              Please select a transaction first
            </p>
          )}
          {selectedTransaction && waybillNumber && (
            <p className="text-sm text-green-600 mt-1">
              ✓ Ready to assign waybill
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleCancel}
            variant="outline"
            disabled={isLoading}
            className="flex-1 h-12 border-[#D9D9D9] text-[#666666] hover:bg-[#F5F5F5] disabled:opacity-50 transition-colors"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveWaybill}
            disabled={!selectedTransaction || !waybillNumber || isLoading}
            className="flex-1 h-12 bg-[#4CD964] hover:bg-[#45C55A] text-white disabled:bg-[#CCCCCC] disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Assigning..." : "Save Waybill"}
          </Button>
        </div>

        {/* Help Text */}
        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <p className="text-sm text-blue-700">
            <strong>Note:</strong> Enter a unique waybill number and assign it
            to the selected transaction. Transactions that already have waybill
            numbers cannot be selected again.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WaybillModal;
