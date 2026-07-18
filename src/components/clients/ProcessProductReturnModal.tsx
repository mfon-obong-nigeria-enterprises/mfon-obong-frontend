import React, { useState, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Minus, Plus, ChevronDown } from 'lucide-react';
import type { Transaction } from '@/types/transactions';
import { getTransactionDate } from '@/utils/transactions';
import { itemDisplayName } from '@/utils/itemDisplay';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createReturnTransaction, getAllTransactions, type ReturnTransactionItem } from '@/services/transactionService';
import { toast } from 'react-toastify';

// Infer the item type from the Transaction's items array
type TransactionItem = Transaction['items'][number];

interface ReturnedItemInfo extends ReturnTransactionItem {
  unitPrice: number;
  returnPrice: number;
  returnAmount: number;
}

interface ProductReturnCardProps {
  item: TransactionItem;
  maxQuantity: number;
  returnedInfo: { quantity: number; returnPrice: number; returnAmount: number };
  onReturnInfoChange: (info: { quantity: number; returnPrice: number; returnAmount: number }) => void;
}

const ProductReturnCard: React.FC<ProductReturnCardProps> = ({ item, maxQuantity, returnedInfo, onReturnInfoChange }) => {
  const { quantity: returnedQuantity, returnPrice, returnAmount } = returnedInfo;

  const formatMoneyInput = (value: number) => {
    if (!value || value <= 0) return "";
    return `₦${Math.round(value).toLocaleString("en-US")}`;
  };

  const parseMoneyInput = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "");
    if (!digitsOnly) return 0;
    return Number(digitsOnly);
  };

  const handleIncrement = () => {
    const newQuantity = Math.min(returnedQuantity + 1, maxQuantity);
    onReturnInfoChange({
      quantity: newQuantity,
      returnPrice: returnPrice,
      returnAmount: newQuantity * returnPrice,
    });
  };

  const handleDecrement = () => {
    const newQuantity = Math.max(returnedQuantity - 1, 0);
    onReturnInfoChange({
      quantity: newQuantity,
      returnPrice: returnPrice,
      returnAmount: newQuantity * returnPrice,
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
    if (isNaN(val)) val = 0;
    val = Math.max(0, Math.min(val, maxQuantity));
    onReturnInfoChange({
      quantity: val,
      returnPrice: returnPrice,
      returnAmount: val * returnPrice,
    });
  };

  const handleReturnPriceChange = (rawValue: string) => {
    const val = parseMoneyInput(rawValue);

    onReturnInfoChange({
      quantity: returnedQuantity,
      returnPrice: val,
      returnAmount: returnedQuantity * val,
    });
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white mb-4">
      {/* Checkbox and Item Details */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-start gap-3">
          <input
  type="checkbox"
  className="
    mt-1 h-5 w-5 appearance-none rounded border border-gray-300 bg-white
    checked:bg-[#2ECC71] checked:border-transparent
    checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%224%22%20stroke%3D%22white%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M4.5%2012.75l6%206%209-13.5%22%2F%3E%3C%2Fsvg%3E')]
    checked:bg-center checked:bg-no-repeat
    focus:ring-0 focus:outline-none cursor-pointer
  "
  checked={returnedQuantity > 0}
  onChange={(e) => {
    const newQuantity = e.target.checked ? 1 : 0;
    onReturnInfoChange({
      quantity: newQuantity,
      returnPrice: item.unitPrice, // Reset to default on check
      returnAmount: newQuantity * item.unitPrice,
    });
  }}
/>
          <div>
            <h3 className="text-base font-semibold text-[#333333]">{itemDisplayName(item.productName, item.variantName)}</h3>
            <p className="text-sm text-gray-500 mt-1">{item.quantity} {item.unit || 'units'} purchased</p>
            {maxQuantity < item.quantity && (
              <p className="text-xs text-amber-600 mt-0.5">{item.quantity - maxQuantity} already returned</p>
            )}
            <p className="text-sm text-gray-500 mt-1">₦{item.unitPrice.toLocaleString()}/{item.unit || 'unit'}</p>
          </div>
        </div>
        <span className="text-base font-bold text-[#333333]">₦{item.subtotal.toLocaleString()}</span>
      </div>

      <hr className="my-4 border-gray-200" />

      {/* Controls Row */}
      <div className="grid grid-cols-3 items-start gap-4">
  {/* Quantity Controls */}
  <div>
    <label className="block text-xs text-gray-500 mb-1.5">Quantity to Return</label>
    <div className="flex items-center gap-2">
      {/* Minus Button */}
      <button
        onClick={handleDecrement}
        className="w-[34px] h-[34px] flex items-center justify-center border border-gray-300 rounded bg-white hover:bg-gray-50 text-gray-600 transition-colors"
      >
        <Minus size={14} />
      </button>

      {/* Input with internal steppers */}
      <div className="relative">
        <input
          type="number"
          value={returnedQuantity.toString()}
          onChange={handleInputChange}
          min={0}
          max={maxQuantity}
          className="w-[31px] h-[34px] border border-[#D9D9D9] rounded pl-2 text-left text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Plus Button */}
      <button
        onClick={handleIncrement}
        className="w-[34px] h-[34px] flex items-center justify-center border border-gray-300 rounded bg-white hover:bg-gray-50 text-gray-600 transition-colors"
      >
        <Plus size={14} />
      </button>
    </div>
    {/* Stacked Helper Text (Unit & Max) */}
    <div className="flex flex-col mt-1.5">
      <span className="text-xs text-gray-500">{item.unit || 'units'}</span>
      <span className="text-xs text-gray-400">Max {maxQuantity}</span>
    </div>
  </div>

  {/* Return Price Input */}
  <div className="text-left">
    <label className="block text-xs text-gray-500 mb-1.5">Return Price</label>
    <input
      type="text"
      value={formatMoneyInput(returnPrice)}
      onChange={(e) => handleReturnPriceChange(e.target.value)}
      disabled={returnedQuantity === 0}
      className="bg-white h-[34px] px-3 rounded text-sm font-medium w-[100px] border border-gray-300 text-left disabled:bg-gray-100"
      placeholder="₦0"
    />
  </div>

  {/* Return Amount Display */}
  <div className="text-right">
    <label className="block text-xs text-gray-500 mb-1.5">Return Amount:</label>
    <input
      type="text"
      value={formatMoneyInput(returnAmount)}
      onChange={(e) => {
        const value = parseMoneyInput(e.target.value);
        const maxAmount = returnPrice * returnedQuantity;
        if (value > maxAmount) {
          toast.warn(`Amount cannot exceed ₦${maxAmount.toLocaleString()}`);
          onReturnInfoChange({ quantity: returnedQuantity, returnPrice, returnAmount: maxAmount });
        } else {
          onReturnInfoChange({ quantity: returnedQuantity, returnPrice, returnAmount: value });
        }
      }}
      disabled={returnedQuantity === 0}
      className="bg-white h-[34px] px-3 rounded text-sm font-medium w-[100px] border border-gray-300 text-right disabled:bg-gray-100"
    />
  </div>
</div>
    </div>
  );
};

interface ProcessProductReturnModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: Transaction | null;
}

const ProcessProductReturnModal: React.FC<ProcessProductReturnModalProps> = ({ isOpen, onClose, transaction }) => {
  const queryClient = useQueryClient();
  const [returnedItems, setReturnedItems] = useState<Record<string, ReturnedItemInfo>>({});
  const [reason, setReason] = useState('');
  const [actualAmountReturned, setActualAmountReturned] = useState(0);

  // Fetch all transactions to find prior returns referencing this transaction
  const { data: allTransactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: getAllTransactions,
    enabled: isOpen,
  });

  // Build a map of already-returned quantities per productId for this specific transaction
  const alreadyReturnedMap = useMemo(() => {
    if (!allTransactions || !transaction) return new Map<string, number>();
    const map = new Map<string, number>();
    allTransactions
      .filter((t) => {
        const refId = typeof t.referenceTransactionId === 'object'
          ? t.referenceTransactionId?._id
          : t.referenceTransactionId;
        return t.type === 'RETURN' && refId === transaction._id;
      })
      .forEach((returnTxn) => {
        returnTxn.items.forEach((item) => {
          const current = map.get(item.productId) || 0;
          map.set(item.productId, current + item.quantity);
        });
      });
    return map;
  }, [allTransactions, transaction]);

  const formatMoneyInput = (value: number) => {
    if (!value || value <= 0) return "";
    return `₦${Math.round(value).toLocaleString("en-US")}`;
  };

  const parseMoneyInput = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "");
    if (!digitsOnly) return 0;
    return Number(digitsOnly);
  };

  const returnMutation = useMutation({
    mutationFn: createReturnTransaction,
    onSuccess: () => {
      toast.success("Return processed successfully!");
      if (transaction?.clientId?._id) {
        queryClient.invalidateQueries({ queryKey: ['client', transaction.clientId._id] });
      }
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      handleClose();
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || 'Failed to process return';
      toast.error(message);
    }
  });

  const handleReturnInfoChange = (item: TransactionItem, info: { quantity: number; returnPrice: number; returnAmount: number }) => {
    setReturnedItems(prev => {
      const newItems = { ...prev };
      if (info.quantity > 0) {
        newItems[item.productId] = {
          productId: item.productId,
          quantity: info.quantity,
          unit: item.unit || 'unit',
          unitPrice: item.unitPrice,
          returnPrice: info.returnPrice,
          returnAmount: info.returnAmount,
        };
      } else {
        delete newItems[item.productId];
      }
      return newItems;
    });
  };

  // This now sums up the individual (potentially edited) return amounts
  const calculatedTotalReturn = useMemo(() => {
    return Object.values(returnedItems).reduce((total, item) => total + item.returnAmount, 0);
  }, [returnedItems]);

  // Sync the editable amount when the calculated total changes
  useEffect(() => {
    setActualAmountReturned(calculatedTotalReturn);
  }, [calculatedTotalReturn]);

  const totalItemsSelected = Object.keys(returnedItems).length;

  if (!isOpen || !transaction) return null;

  const handleClose = () => {
    setReturnedItems({});
    setActualAmountReturned(0);
    setReason('');
    onClose();
  };

  const handleSubmit = () => {
    if (!transaction.clientId?._id) {
      toast.error("Client information is missing.");
      return;
    }

    const itemsToSubmit: ReturnTransactionItem[] = Object.values(returnedItems).map(({ productId, quantity, unit }) => ({
      productId,
      quantity,
      unit,
    }));

    if (itemsToSubmit.length === 0) {
      toast.warning("Please select at least one item to return.");
      return;
    }

    if (!reason) {
      toast.warning("Please select a reason for the return.");
      return;
    }

    const returnPricingNotes = JSON.stringify({
      version: 1,
      items: Object.values(returnedItems).map((item) => ({
        productId: item.productId,
        returnUnitPrice: item.returnPrice,
        returnAmount: item.returnAmount,
      })),
    });

    returnMutation.mutate({
      clientId: transaction.clientId._id,
      type: "RETURN",
      reason,
      referenceTransactionId: transaction._id,
      items: itemsToSubmit,
      actualAmountReturned: actualAmountReturned,
      notes: returnPricingNotes,
      skipStockRestore: transaction.type === "WHOLESALE",
    });
  };

  const transactionDate = getTransactionDate(transaction);
  const formattedDate = transactionDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-none flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-[505px] max-h-screen flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-start sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-[18px] font-bold text-[#1E1E1E]">Process Product Return</h2>
            <p className="text-sm text-[#7D7D7D] mt-1">
              Transaction: {transaction.invoiceNumber || `TXN-${transaction._id.slice(-6)}`} - {formattedDate}
            </p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-grow min-h-0">
          {/* Select Item Section */}
          <div className="mb-8">
            <h3 className="text-base font-semibold text-[#444444] mb-4">
              Select Item to return
            </h3>
            <div className="space-y-4">
              {transaction.items && transaction.items.length > 0 ? (() => {
                const returnableItems = transaction.items.map((item) => ({
                  item,
                  maxQuantity: item.quantity - (alreadyReturnedMap.get(item.productId) || 0),
                })).filter(({ maxQuantity }) => maxQuantity > 0);

                return returnableItems.length > 0 ? (
                  returnableItems.map(({ item, maxQuantity }, index) => (
                    <ProductReturnCard
                      key={`${item.productId}-${index}`}
                      item={item}
                      maxQuantity={maxQuantity}
                      returnedInfo={returnedItems[item.productId] || { quantity: 0, returnPrice: item.unitPrice, returnAmount: 0 }}
                      onReturnInfoChange={(info) => handleReturnInfoChange(item, info)}
                    />
                  ))
                ) : (
                  <p className="text-sm text-gray-500">All items from this transaction have already been returned.</p>
                );
              })() : (
                <p className="text-sm text-gray-500">No items available for return in this transaction.</p>
              )}
            </div>
          </div>

          {/* Return Reason Section */}
          <div>
            <h3 className="text-[#444444] text-base font-normal mb-2">
              Return Reason
            </h3>
            <div className="relative">
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="block w-full pl-4 pr-10 py-3 text-sm border-none rounded bg-[#F5F5F5] text-[#7D7D7D] appearance-none focus:outline-none focus:ring-0 cursor-pointer"
                defaultValue=""
              >
                <option value="" disabled hidden>
                  Select a reason
                </option>
                <option value="damage_defective">Damage/Defective product</option>
                <option value="wrong_item">Wrong item delivered</option>
                <option value="customer_request">Customer request</option>
                <option value="quality_issue">Quality issue</option>
                <option value="excess_order">Excess order</option>
                <option value="other">Other</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <ChevronDown size={20} />
              </div>
            </div>
          </div>

          {/* Items Selected Summary Box */}
          <div className="bg-[#F9FAFB] rounded-lg p-4 mt-6 flex justify-between items-center">
             <div className="flex flex-col gap-1">
                <span className="text-xs text-[#7D7D7D]">Items Selected:</span>
                <span className="text-base font-medium text-[#333333]">Return Amount:</span>
             </div>
             <div className="flex flex-col gap-1 text-right">
                <span className="text-xs text-[#333333]">{totalItemsSelected} item(s)</span>
                <input
                  type="text"
                  value={formatMoneyInput(actualAmountReturned)}
                  onChange={(e) => {
                    const value = parseMoneyInput(e.target.value);
                    // Prevent amount from exceeding the calculated total
                    if (value > calculatedTotalReturn) {
                      toast.warn(`Return amount cannot exceed ₦${calculatedTotalReturn.toLocaleString()}`);
                      setActualAmountReturned(calculatedTotalReturn);
                    } else {
                      setActualAmountReturned(value);
                    }
                  }}
                  className="bg-white px-2 py-1 rounded border border-gray-200 text-sm font-medium text-[#7D7D7D] text-right w-[100px]"
                />
             </div>
          </div>
        </div>
        
        {/* Footer Buttons */}
        <div className="p-6 pt-2 mt-auto bg-white sticky bottom-0">
            <div className="flex justify-end gap-4">
                <button 
                    onClick={handleClose} 
                    className="px-8 py-3 border border-[#9CA3AF] rounded-md text-[#333333] font-medium text-sm hover:bg-gray-50 w-full sm:w-auto"
                >
                    Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={returnMutation.isPending}
                  className="px-6 py-3 bg-[#2ECC71] text-white rounded-md font-medium text-sm hover:bg-green-600 disabled:bg-green-300 disabled:cursor-not-allowed w-full sm:w-auto"
                >
                  {returnMutation.isPending ? 'Processing...' : 'Process Return'}
                </button>
            </div>
        </div>
      </div>
    </div>
  , document.body);
};

export default ProcessProductReturnModal;