import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
// store
import { useTransactionsStore } from "@/stores/useTransactionStore";

// hooks
import { useMergedTransactions } from "@/hooks/useMergedTransactions";

// utils
import { formatCurrency } from "@/utils/styles";
import { itemDisplayName } from "@/utils/itemDisplay";
import { getTransactionTypeBadgeStyles } from "@/utils/transactionTypeStyles";

const RecentTransactionsMobile = () => {
  const { transactions } = useTransactionsStore();
  const mergedTransactions = useMergedTransactions(transactions ?? []);
  return (
    <div>
      <main className="xl:hidden">
        <ul className="space-y-3">
          {[...(mergedTransactions || [])]
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
            )
            .slice(0, 5)
            .map((transaction) => (
              <li
                key={transaction._id}
                className="bg-white flex flex-col gap-2 border border-[#D9D9D9] rounded-md p-2 shadow"
              >
                <div className="flex justify-between items-center py-2">
                  <p className="text-sm text-[#444444]">
                    <span className="font-medium">PAYMENT ID:</span>
                    <span className="ml-0.5">{transaction.invoiceNumber}</span>
                  </p>
                  <span
                    className={`border text-[0.625rem] py-1.5 px-3 rounded-[6.25rem] ${getTransactionTypeBadgeStyles(transaction.type)}`}
                  >
                    {transaction.type}
                  </span>
                </div>
                {/* next */}
                <div className="flex justify-between items-center py-2">
                  {/* time, date, item... */}
                  <div>
                    {/* time, items... */}
                    <div className="flex flex-col text-[#444444]">
                      <p className="flex items-center">
                        <span className="text-xs">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </span>
                        {/* <span className="text-xs ml-1">
                          {new Date(transaction.createdAt).toLocaleTimeString()}
                        </span> */}
                      </p>
                      {/* list of items purchased */}
                      <p>
                        {transaction.items.length > 0 && (
                          <>
                            <span className="text-xs">
                              {transaction.items[0].quantity}x{" "}
                              {itemDisplayName(transaction.items[0].productName, transaction.items[0].variantName)}
                            </span>
                            {transaction.items.length > 1 && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="ml-1"
                                  >
                                    <ChevronDown className="w-3 h-3" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="text-xs max-w-12">
                                  {transaction.items
                                    .slice(1)
                                    .map(
                                      (item, index) =>
                                        `${item.quantity}x ${itemDisplayName(item.productName, item.variantName)}${
                                          index < transaction.items.length - 2
                                            ? ", "
                                            : ""
                                        }`
                                    )}
                                </PopoverContent>
                              </Popover>
                            )}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  {/* amount */}
                  <p
                    className={` text-center ${
                      transaction.total < 0
                        ? "text-[#F95353]"
                        : "text-[#2ECC71]"
                    }`}
                  >
                    {formatCurrency(transaction.total)}
                  </p>
                </div>
                {/* next */}
                <div className="flex justify-between items-center py-2">
                  {/* location */}
                  <p>{transaction.branchName}</p>

                  {/* balance */}
                  <p>{formatCurrency(transaction.clientBalanceAfterTransaction ?? transaction.client?.balance ?? 0)}</p>
                </div>
              </li>
            ))}
        </ul>
      </main>
    </div>
  );
};

export default RecentTransactionsMobile;
