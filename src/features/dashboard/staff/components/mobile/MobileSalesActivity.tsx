import type { Transaction } from "@/types/transactions";

// ui
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { getTransactionTypeBadgeStyles } from "@/utils/transactionTypeStyles";
import { itemDisplayName } from "@/utils/itemDisplay";

// icons
import { ChevronDown, Package } from "lucide-react";

const MobileSalesActivity = ({
  filteredTransactions,
}: {
  filteredTransactions: Transaction[];
}) => {
  return (
    <div className="space-y-4 p-4 md:p-6 bg-[#f9f9f9] min-h-[300px]">
      {filteredTransactions && filteredTransactions?.length > 0 ? (
        filteredTransactions?.map((transaction, i) => {
          return (
            <div
              key={transaction._id + i}
              className="bg-white rounded-[10px] p-5 shadow-sm border border-transparent hover:border-gray-200 transition-all"
            >
              {/* Row 1: Name and Time */}
              <div className="flex justify-between items-start mb-2">
                <span className="text-[#1E1E1E] text-[15px] font-normal capitalize font-Inter">
                  {transaction.clientId?.name || transaction.walkInClientName}
                </span>
                <span className="text-[#888888] text-[13px] uppercase font-Inter">
                  {new Date(transaction.createdAt).toLocaleTimeString("en-NG", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </span>
              </div>

              {/* Row 2: Product and Chevron */}
              <div className="flex items-center gap-1 mb-2">
                <div className="text-[#7D7D7D] text-[14px] font-Inter flex items-center">
                  {transaction.items.length > 0 && (
                    <>
                      <span>
                        {transaction.items[0].quantity}x{" "}
                        {itemDisplayName(transaction.items[0].productName, transaction.items[0].variantName)}
                      </span>

                      {/* Chevron/Popover Logic */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 ml-2 hover:bg-transparent"
                          >
                             <ChevronDown className="w-4 h-4 text-[#999999]" />
                          </Button>
                        </PopoverTrigger>
                        {transaction.items.length > 1 && (
                          <PopoverContent className="text-sm max-w-60">
                            <div className="space-y-1">
                              {transaction.items
                                .slice(1)
                                .map((item, index) => (
                                  <div key={index}>
                                    {item.quantity}x {itemDisplayName(item.productName, item.variantName)}
                                  </div>
                                ))}
                            </div>
                          </PopoverContent>
                        )}
                      </Popover>
                    </>
                  )}
                </div>
              </div>

              {/* Row 3: Type and Amount */}
              <div className="flex justify-between items-center">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${getTransactionTypeBadgeStyles(transaction.type)}`}>
                  {transaction.type || "N/A"}
                </span>
                <span className="text-[15px] font-medium text-[#444444] font-Inter">
                  ₦{transaction.total?.toLocaleString()}
                </span>
              </div>
            </div>
          );
        })
      ) : (
        <div className="bg-white rounded-[10px] p-10 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-[#F5F5F5] flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-[#A1A1A1]" />
          </div>
          <p className="text-lg font-medium text-[#666] mb-2">
            No transactions yet
          </p>
          <p className="text-sm text-[#999] max-w-xs">
            Your sales activity will appear here once transactions are recorded.
          </p>
        </div>
      )}
    </div>
  );
};

export default MobileSalesActivity;