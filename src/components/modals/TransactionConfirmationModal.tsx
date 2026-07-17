import React, { useState, useEffect } from "react";
import { X, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTransactionTypeBadgeStyles } from "@/utils/transactionTypeStyles";
import { itemDisplayName, formatBundleQty, isBundleItem } from "@/utils/itemDisplay";

export type TransactionItem = {
  productName: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  unit?: string;
  bundlesQty?: number;
  kgQty?: number;
  subUnit?: string;
};

export type TransactionConfirmationData = {
  clientName: string;
  transactionType: "PURCHASE" | "PICKUP" | "WHOLESALE" | "RETURN" | "DEPOSIT";
  items: TransactionItem[];
  subtotal: number;
  transportCost: number;
  loadingOffloading: number;
  loadingCharge: number;
  extraCharges?: { name: string; amount: number }[];
  discount: number;
  total: number;
  amountPaid: number;
  paymentMethod?: string;
  previousBalance?: number;
  newBalance?: number;
  processedBy?: string;
  transactionDate?: string | Date;
};

interface TransactionConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  data: TransactionConfirmationData;
  isProcessing?: boolean;
}

const TransactionConfirmationModal: React.FC<TransactionConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  data,
  isProcessing = false,
}) => {
  const CONFIRM_DELAY_SECONDS = 2;
  const [isConfirmEnabled, setIsConfirmEnabled] = useState(false);
  const [countdown, setCountdown] = useState(CONFIRM_DELAY_SECONDS);

  // Safety delay: Disable confirm button for 2 seconds when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsConfirmEnabled(false);
      setCountdown(CONFIRM_DELAY_SECONDS);

      const countdownTimer = setInterval(() => {
        setCountdown((prev) => Math.max(prev - 1, 0));
      }, 1000);

      const enableTimer = setTimeout(() => {
        setIsConfirmEnabled(true);
        setCountdown(0);
      }, CONFIRM_DELAY_SECONDS * 1000);

      return () => {
        clearInterval(countdownTimer);
        clearTimeout(enableTimer);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatCurrency = (amount: number) => {
    return `₦${Math.abs(amount).toLocaleString("en-NG", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const formatSignedCurrency = (amount: number) => {
    const sign = amount < 0 ? "-" : "+";
    return `${sign}${formatCurrency(amount)}`;
  };

  const extraChargesTotal = (data.extraCharges || []).reduce((sum, c) => sum + c.amount, 0);
  const additionalCharges =
    (data.transportCost || 0) +
    (data.loadingOffloading || 0) +
    (data.loadingCharge || 0) +
    extraChargesTotal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            Confirm Transaction
          </h2>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="mx-6 mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-amber-900 font-medium text-sm">
              Important: Review Before Confirming
            </p>
            <p className="text-amber-700 text-sm mt-1">
              This transaction cannot be modified or deleted after confirmation. Please verify all details carefully.
            </p>
          </div>
        </div>

        {/* Transaction Summary */}
        <div className="px-6 py-6 space-y-6">
          {/* Client & Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Client</p>
              <p className="font-medium text-gray-900">{data.clientName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Transaction Type</p>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getTransactionTypeBadgeStyles(data.transactionType)}`}>
                {data.transactionType}
              </span>
            </div>
          </div>

          {/* Transaction Date & Processed By */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-200">
            <div>
              <p className="text-sm text-gray-500 mb-1">Transaction Date</p>
              <p className="font-medium text-gray-900">
                {data.transactionDate
                  ? new Date(data.transactionDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : new Date().toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
              </p>
            </div>
            {data.processedBy && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Processed By</p>
                <p className="font-medium text-gray-900">{data.processedBy}</p>
              </div>
            )}
          </div>

          {/* Products */}
          <div>
            <p className="text-sm text-gray-500 mb-2">Products</p>
            
            {/* Desktop Table View */}
            <div className="hidden md:block border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Item</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Qty</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Price</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.items.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-900">{itemDisplayName(item.productName, item.variantName)}</td>
                      <td className="py-3 px-4 text-right text-gray-700">
                        {isBundleItem(item.bundlesQty, item.kgQty)
                          ? formatBundleQty(item.bundlesQty, item.kgQty, item.unit, item.subUnit)
                          : item.unit
                            ? `${item.quantity} ${item.unit}`
                            : ""}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-700">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-gray-900">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {data.items.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-gray-900 text-sm">{itemDisplayName(item.productName, item.variantName)}</span>
                    <span className="text-xs text-gray-500">
                      {isBundleItem(item.bundlesQty, item.kgQty)
                        ? formatBundleQty(item.bundlesQty, item.kgQty, item.unit, item.subUnit)
                        : `${item.quantity} ${item.unit || "pcs"}`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">
                      {isBundleItem(item.bundlesQty, item.kgQty)
                        ? `${formatCurrency(item.unitPrice)} × ${formatBundleQty(item.bundlesQty, item.kgQty, item.unit, item.subUnit)}`
                        : item.unit
                          ? `${formatCurrency(item.unitPrice)} × ${item.quantity} ${item.unit}`
                          : formatCurrency(item.unitPrice)}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Materials Total Cost</span>
              <span className="font-medium text-gray-900">{formatCurrency(data.subtotal)}</span>
            </div>

            {additionalCharges > 0 && (
              <>
                {data.transportCost > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Transport Cost</span>
                    <span className="text-gray-900">{formatCurrency(data.transportCost)}</span>
                  </div>
                )}
                {data.loadingOffloading > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Loading & Offloading</span>
                    <span className="text-gray-900">{formatCurrency(data.loadingOffloading)}</span>
                  </div>
                )}
                {data.loadingCharge > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Loading Charge</span>
                    <span className="text-gray-900">{formatCurrency(data.loadingCharge)}</span>
                  </div>
                )}
                {(data.extraCharges || []).map((charge, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-600">{charge.name}</span>
                    <span className="text-gray-900">{formatCurrency(charge.amount)}</span>
                  </div>
                ))}
              </>
            )}

            {data.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Discount</span>
                <span className="text-red-600">-{formatCurrency(data.discount)}</span>
              </div>
            )}

            {/* Total Amount - Emphasized */}
            <div className="pt-4 mt-2 border-t-2 border-gray-400">
              <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-gray-900 uppercase tracking-wide">
                    Subtotal
                  </span>
                  <span className="text-xl md:text-2xl font-bold text-blue-600">
                    {formatCurrency(data.total)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-3 mt-3 border-t border-gray-200">
              <span className="text-gray-600">Amount Paid</span>
              <span className="font-semibold text-green-600">{formatCurrency(data.amountPaid)}</span>
            </div>

            {data.amountPaid < data.total && (
              <div className="flex justify-between">
                <span className="text-gray-600">Outstanding Balance</span>
                <span className="font-semibold text-orange-600">
                  {formatCurrency(data.total - data.amountPaid)}
                </span>
              </div>
            )}

            {/* Payment Method */}
            {data.paymentMethod && (
              <div className="flex justify-between pt-3 border-t border-gray-200">
                <span className="text-gray-600">Payment Method</span>
                <span className="font-medium text-gray-900">{data.paymentMethod}</span>
              </div>
            )}
          </div>

          {/* Client Balance Change */}
          {(data.previousBalance !== undefined && data.newBalance !== undefined) && (
            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
              <p className="text-sm font-medium text-gray-700 mb-3">Client Balance</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Previous Balance</span>
                  <span className={`font-semibold ${data.previousBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatSignedCurrency(data.previousBalance)}
                  </span>
                </div>
                <div className="flex items-center justify-center py-1">
                  <div className="border-t border-gray-300 flex-1"></div>
                  <span className="px-2 text-gray-400 text-xs">→</span>
                  <div className="border-t border-gray-300 flex-1"></div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">New Balance</span>
                  <span className={`font-bold text-lg ${data.newBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatSignedCurrency(data.newBalance)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
            className="min-w-[120px]"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isProcessing || !isConfirmEnabled}
            className="min-w-[180px] bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              "Processing..."
            ) : !isConfirmEnabled ? (
              <span className="flex items-center gap-2">
                <Clock size={16} className="animate-pulse" />
                Wait ({countdown}s)
              </span>
            ) : (
              "Confirm Transaction"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TransactionConfirmationModal;
