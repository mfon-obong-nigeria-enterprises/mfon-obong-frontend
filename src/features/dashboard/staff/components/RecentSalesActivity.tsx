// src\features\dashboard\staff\components\RecentSalesActivity.tsx
import React from "react";
import { useTransactionsStore } from "@/stores/useTransactionStore";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { getTransactionTypeBadgeStyles } from "@/utils/transactionTypeStyles";
import { itemDisplayName } from "@/utils/itemDisplay";

// Helper for currency formatting (neutral, no signs or colors)
const formatAmount = (amount: number) => {
  return `₦${Math.abs(amount).toLocaleString()}`;
};

const RecentSalesActivity: React.FC = () => {
  const { transactions } = useTransactionsStore();

  const recentSales = [...(transactions || [])]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 4);

  // Helper to render product items (Shared logic)
  const renderProductList = (items: any[]) => {
    if (!items || items.length === 0) return null;
    const primaryItem = items[0];
    const hasMore = items.length > 1;

    return (
      <div className="flex items-center text-sm text-[#6B7280]">
        <span className="font-medium mr-1">{primaryItem.quantity}x</span>
        <span>{itemDisplayName(primaryItem.productName, primaryItem.variantName)}</span>
        {hasMore && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-5 w-5 ml-1 p-0 text-gray-400">
                <ChevronDown className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="text-sm w-auto p-3 shadow-lg bg-white">
              <div className="flex flex-col gap-2">
                {items.slice(1).map((item: any, idx: number) => (
                  <span key={idx} className="whitespace-nowrap text-gray-600">
                    <span className="font-bold">{item.quantity}x</span> {itemDisplayName(item.productName, item.variantName)}
                  </span>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
        {!hasMore && <ChevronDown className="w-4 h-4 ml-2 text-gray-400 opacity-50" />}
      </div>
    );
  };

  if (!recentSales.length) {
    return (
       <div className="w-full bg-white border border-[#D9D9D9] rounded-lg shadow-sm mt-4 py-12 text-center">
          <div className="flex flex-col items-center justify-center">
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-[#F3F4F6] mb-4">
              <FileText className="w-6 h-6 text-[#A1A1A1]" />
            </div>
            <p className="text-sm font-medium text-[#444]">No recent sales activity</p>
          </div>
        </div>
    );
  }

  return (
    <div className="w-full bg-white border border-[#D9D9D9] rounded-lg shadow-sm mt-4">
      {/* Header */}
      <div className="md:hidden flex justify-between items-center px-4 md:px-6 py-4 border-b border-[#F3F4F6]">
        <h2 className="text-[#111] text-base font-semibold">Your Recent Sales Activity</h2>
        <a href="#" className="text-[#3D80FF] text-sm flex items-center font-medium hover:underline">
          View all Sales <ChevronRight className="w-4 h-4 ml-1" />
        </a>
      </div>

      {/* ==========================================
          1. MOBILE VIEW (< md)
          (Kept standard: Amount on Right)
         ========================================== */}
      <div className="block md:hidden">
        <div className="flex flex-col divide-y divide-[#F3F4F6]">
          {recentSales.map((sale, i) => {
            return (
              <div key={i} className="flex flex-col gap-2 p-4">
                <div className="flex justify-between items-center">
                  <span className="text-[#1F2937] font-medium text-sm">
                    {sale.clientName || sale.walkInClientName || "Walk-in client"}
                  </span>
                  <span className="text-xs text-[#9CA3AF]">
                    {new Date(sale.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex-1">{renderProductList(sale.items)}</div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${getTransactionTypeBadgeStyles(sale.type)}`}>
                    {sale.type || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Amount:</span>
                  <span className="text-sm font-medium text-[#444444]">
                    {formatAmount(sale.total)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ==========================================
          2. TABLET VIEW (md to xl)
          (THE FIGMA FIX: Amount Left, Stacked)
         ========================================== */}
      <div className="hidden md:block xl:hidden">
        <div className="flex flex-col divide-y divide-[#F3F4F6]">
          {recentSales.map((sale, i) => {
            return (
              <div key={i} className="p-5 hover:bg-gray-50 transition-colors">
                {/* Row 1: Name and Time */}
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-gray-800 text-sm">
                    {sale.clientName || sale.walkInClientName || "Walk-in client"}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(sale.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                  </span>
                </div>

                {/* Row 2: Product Details */}
                <div className="mb-2">
                  {renderProductList(sale.items)}
                </div>

                {/* Row 3: Type and Amount */}
                <div className="flex justify-between items-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getTransactionTypeBadgeStyles(sale.type)}`}>
                    {sale.type || "N/A"}
                  </span>
                  <span className="text-sm font-medium text-[#444444]">
                    {formatAmount(sale.total)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ==========================================
          3. DESKTOP VIEW (xl+)
          (Restored Table Layout)
         ========================================== */}
      <div className="hidden xl:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#F9FAFB] text-[#666]">
            <tr>
              <th className="py-4 px-6 text-sm font-medium">Clients</th>
              <th className="py-4 px-6 text-sm font-medium">Products</th>
              <th className="py-4 px-6 text-sm font-medium">Type</th>
              <th className="py-4 px-6 text-sm font-medium">Amount</th>
              <th className="py-4 px-6 text-sm font-medium text-right">Time</th>
            </tr>
          </thead>
          <tbody className="text-sm text-[#333]">
            {recentSales.map((sale, i) => {
              return (
                <tr key={i} className="border-b border-[#E4E4E7] last:border-b-0 hover:bg-gray-50">
                  <td className="py-5 px-6 font-normal">
                    {sale.clientName || sale.walkInClientName || "Walk-in client"}
                  </td>
                  <td className="py-5 px-6">{renderProductList(sale.items)}</td>
                  <td className="py-5 px-6">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getTransactionTypeBadgeStyles(sale.type)}`}>
                      {sale.type || "N/A"}
                    </span>
                  </td>
                  <td className="py-5 px-6 font-medium text-[#444444]">
                    {formatAmount(sale.total)}
                  </td>
                  <td className="py-5 px-6 text-[#555] text-right">
                    {new Date(sale.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentSalesActivity;