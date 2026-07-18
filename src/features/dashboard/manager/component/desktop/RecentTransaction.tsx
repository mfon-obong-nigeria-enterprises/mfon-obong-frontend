//src\features\dashboard\manager\component\desktop\RecentTransaction.tsx
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
import { balanceClassT, formatCurrency } from "@/utils/styles";
import { itemDisplayName } from "@/utils/itemDisplay";
import {
  getTransactionDate,
  getTransactionDateString,
} from "@/utils/transactions";
import { getTransactionTypeBadgeStyles } from "@/utils/transactionTypeStyles";

const RecentTransactions = () => {
  const { transactions } = useTransactionsStore();
  const mergedTransactions = useMergedTransactions(transactions ?? []);

  return (
    <section className="hidden xl:block">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="border-b border-gray-200">
              <th className="py-3 text-base text-[#333333] font-normal text-start pl-1">
                Invoice
              </th>
              <th className="py-3 text-base text-[#333333] font-normal text-start pl-1">
                Date
              </th>
              <th className="py-3 text-base text-[#333333] font-normal text-start pl-1">
                Items
              </th>
              <th className="py-3 text-base text-[#333333] font-normal text-start pl-1">
                Type
              </th>
              <th className="py-3 text-base text-[#333333] font-normal text-start pl-1">
                Amount
              </th>
              <th className="py-3 text-base text-[#333333] font-normal text-start pl-1">
                Location
              </th>
              <th className="py-3 text-base text-[#333333] font-normal text-start pl-1">
                Balance
              </th>
            </tr>
          </thead>

          <tbody>
            {[...(mergedTransactions || [])]
              .sort(
                (a, b) =>
                  getTransactionDate(b).getTime() -
                  getTransactionDate(a).getTime()
              )
              .slice(0, 5)
              .map((transaction) => (
                <tr key={transaction._id} className="border-b border-[#d9d9d9]">
                  <td className="text-start pl-1 text-[#444444] text-sm font-normal py-3">
                    {transaction.invoiceNumber}
                  </td>

                  <td className="text-start pl-1 text-[#444444] text-sm font-normal py-3 ">
                    <div className="flex flex-col">
                      <span>{getTransactionDateString(transaction)}</span>
                      {/* <span className="text-sm text-[#7D7D7D]">{getTransactionTimeString(transaction)}</span> */}
                    </div>
                  </td>

                  <td className="flex items-center justify-start text-[#444444] text-sm font-normal py-3 ">
                    {transaction.items.length > 0 && (
                      <>
                        <span>
                          {transaction.items[0].quantity}x{" "}
                          {itemDisplayName(transaction.items[0].productName, transaction.items[0].variantName)}
                        </span>
                        {transaction.items.length > 1 && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <ChevronDown className="w-4 h-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="text-sm max-w-38">
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
                  </td>

                  <td className="text-start pl-1">
                    <p
                      className={`border text-[0.625rem] py-1.5 px-3 rounded-[6.25rem] max-w-18 text-center ${getTransactionTypeBadgeStyles(transaction.type)}`}
                    >
                      {transaction.type}
                    </p>
                  </td>

                  <td
                    className={`text-sm text-start pl-1 ${
                      transaction.total < 0
                        ? "text-[#F95353]"
                        : "text-[#2ECC71]"
                    }`}
                  >
                    {formatCurrency(transaction.total)}
                  </td>

                  <td className="text-start pl-1 text-[#444444] text-sm font-normal py-3">
                    {transaction.branchName}
                  </td>

                  <td
                    className={`text-sm text-start pl-1 ${balanceClassT(
                      transaction.clientBalanceAfterTransaction ?? transaction.client?.balance
                    )} 
                      `}
                  >
                    {formatCurrency(transaction.clientBalanceAfterTransaction ?? transaction.client?.balance ?? 0)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default RecentTransactions;
