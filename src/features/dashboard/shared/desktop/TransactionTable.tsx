// components
import ClientTransactionModal from "../ClientTransactionModal";
import WalkinTransactionModal from "../WalkinTransactionModal";

//utils
import { balanceClassT } from "@/utils/styles";
import { getTypeStyles } from "@/utils/helpersfunction";
import { formatCurrency, toSentenceCaseName } from "@/utils/styles";
import { itemDisplayName } from "@/utils/itemDisplay";
import {
  getTransactionDateString,
  // getTransactionTimeString,
} from "@/utils/transactions";

// types
import type { Transaction } from "@/types/transactions";

// stores
import { useTransactionsStore } from "@/stores/useTransactionStore";
import { useAuthStore } from "@/stores/useAuthStore";

// ui
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

//  icons
import { ChevronDown } from "lucide-react";

const TransactionTable = ({
  currentTransaction,
}: {
  currentTransaction: Transaction[];
}) => {
  const { open, openModal, selectedTransaction } = useTransactionsStore();
  const { user } = useAuthStore();

  return (
    <div className="hidden xl:block">
      <table className=" w-full overflow-x-scroll">
        <thead className="bg-[#F5F5F5] border border-[#d9d9d9]">
          <tr>
            <th className="py-3 pl-3 text-base text-[#333333] font-normal text-start">
              Payment ID
            </th>
            <th className="py-3 text-base text-[#333333] font-normal pl-1 text-start">
              Date
            </th>
            {user?.role === "SUPER_ADMIN" ? (
              <th className="py-3 text-base text-[#333333] font-normal pl-1 text-start">
                Items
              </th>
            ) : (
              <th className="py-3 text-base text-[#333333] font-normal pl-1 text-start">
                Clients
              </th>
            )}
            <th className="py-3 text-base text-[#333333] font-normal pl-1 text-start">
              Type
            </th>
            <th className="py-3 text-base text-[#333333] font-normal pl-1 text-start">
              Status
            </th>
            <th className="py-3 text-base text-[#333333] font-normal pl-1 text-start">
              Amount
            </th>
            {user?.role === "SUPER_ADMIN" && (
              <th className="py-3 text-base text-[#333333] font-normal pl-1 text-start">
                Location
              </th>
            )}
            <th className="py-3 text-base text-[#333333] font-normal pl-1  text-start">
              Balance
            </th>
            <th className="py-3 text-base text-[#333333] font-normal pl-1 text-start">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {currentTransaction?.length > 0 ? (
            currentTransaction.map((transaction) => (
              <tr
                key={transaction._id ?? transaction.invoiceNumber}
                id={`invoice-${transaction.invoiceNumber}`}
                className="border-b border-[#d9d9d9]"
              >
                <td className=" text-start pl-3 text-[#444444] text-sm font-normal py-3">
                  {transaction.invoiceNumber}
                </td>
                <td className=" py-3 pl-1  font-normal ">
                  <p className="text-sm text-[#444444] text-start">
                    {getTransactionDateString(transaction)}
                    {/* {transaction.date} */}
                  </p>
                </td>
                <td className=" text-start pl-1 text-[#444444] text-sm font-normal py-3">
                  {user?.role === "SUPER_ADMIN" ? (
                    <div className="flex items-center justify-start text-[#444444] text-sm font-normal py-3">
                      {transaction.items.length > 0 && (
                        <>
                          <span>
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
                                  <ChevronDown className="w-4 h-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="text-sm max-w-40">
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
                    </div>
                  ) : (
                    <p>
                      {toSentenceCaseName(
                        transaction.clientId?.name ||
                          transaction.walkInClientName ||
                          "Not found"
                      )}
                    </p>
                  )}
                </td>
                <td className={`  text-center pl-1`}>
                  {transaction.type && (
                    <p
                      className={`border text-xs py-1.5 rounded-[6.25rem] md:w-[85px]   ${getTypeStyles(
                        transaction.type
                      )}`}
                    >
                      {transaction.type}
                    </p>
                  )}
                </td>
                <td
                  className={`text-xs text-start pl-1 ${
                    transaction.status === "COMPLETED"
                      ? "text-[#2ECC71]"
                      : "text-[#F95353]"
                  }`}
                >
                  {transaction.status}
                </td>

                <td
                  className={`text-start pl-1 ${balanceClassT(
                    transaction.total
                  )}`}
                >
                  {formatCurrency(transaction.total ?? 0)}
                </td>
                {user?.role === "SUPER_ADMIN" && (
                  <td className=" text-start pl-1 text-[#444444] text-sm font-normal py-3">
                    {transaction.branchName}
                  </td>
                )}
                <td
                  className={`text-start pl-1 ${
                    (transaction.clientBalanceAfterTransaction ?? transaction.client?.balance ?? 0) < 0
                      ? "text-[#F95353]"
                      : (transaction.clientBalanceAfterTransaction ?? transaction.client?.balance ?? 0) > 0
                      ? "text-[#2ECC71]"
                      : "text-[#444444]"
                  }`}
                >
                  {formatCurrency(transaction.clientBalanceAfterTransaction ?? transaction.client?.balance ?? 0)}
                </td>
                <td className="text-start pl-1 text-[#3D80FF] text-sm">
                  <button
                    onClick={() => openModal(transaction)}
                    className="underline cursor-pointer hover:no-underline transition-all duration-150 ease-in-out"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={8} className="py-16">
                <div className="flex flex-col items-center justify-center text-center space-y-3">
                  {/* Icon / visual */}
                  <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-100 border border-gray-200">
                    <ChevronDown className="w-6 h-6 text-gray-400" />
                  </div>

                  {/* Message */}
                  <p className="text-gray-500 text-sm font-medium">
                    No transactions found
                  </p>
                  <p className="text-gray-400 text-xs">
                    Your transactions will appear here once they are recorded.
                  </p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {open && selectedTransaction?.clientId ? (
        <ClientTransactionModal />
      ) : (
        <WalkinTransactionModal />
      )}
    </div>
  );
};

export default TransactionTable;
