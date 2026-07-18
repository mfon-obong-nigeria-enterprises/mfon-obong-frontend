// components
import ClientTransactionModal from "../ClientTransactionModal";
import WalkinTransactionModal from "../WalkinTransactionModal";

//utils
import { formatCurrency } from "@/utils/styles";
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

// icons
import { ChevronDown } from "lucide-react";
import { getTransactionTypeBadgeStyles } from "@/utils/transactionTypeStyles";

const TransactionsTableMobile = ({
  currentTransaction,
}: {
  currentTransaction: Transaction[];
}) => {
  const { open, openModal, selectedTransaction } = useTransactionsStore();
  const { user } = useAuthStore();

  return (
    <section className="xl:hidden">
      <ul className="space-y-3">
        {currentTransaction?.length > 0 ? (
          currentTransaction.map((transaction, idx) => (
            <li
              key={idx}
              className="bg-white flex flex-col gap-2 border border-[#D9D9D9] rounded-md p-4 shadow"
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

              {/* time,date*/}
              <p className="flex flex-col text-[#444444]">
                <span className="text-xs">
                  {getTransactionDateString(transaction, "en-GB")}
                </span>
                {/* <span className="text-xs ml-1">
                  {getTransactionTimeString(transaction)}
                </span> */}
              </p>

              {/* items and location */}
              <div className="flex justify-between items-center py-2">
                {/* items */}
                {user?.role === "SUPER_ADMIN" && (
                  <div className="flex items-center justify-center text-[#444444] text-sm font-normal py-3">
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
                            <PopoverContent className="text-sm max-w-60">
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
                )}

                {/* location */}
                <p className="text-xs text-[#7D7D7D]">
                  {transaction.branchName}
                </p>
              </div>

              {/* amount, balance, action */}
              <div className="flex justify-between items-center pt-2 border-t border-[#d9d9d9]">
                {/* amount */}

                <p
                  className={` text-center ${
                    transaction.total < 0 ? "text-[#F95353]" : "text-[#2ECC71]"
                  }`}
                >
                  {formatCurrency(transaction.total)}
                </p>

                {/* balance */}
                <p>
                  Balance:{" "}
                  <span
                    className={`${
                      (transaction.clientBalanceAfterTransaction ?? transaction.client?.balance ?? 0) < 0
                        ? "text-[#F95353]"
                        : (transaction.clientBalanceAfterTransaction ?? transaction.client?.balance ?? 0) > 0
                        ? "text-[#2ECC71]"
                        : "text-[#444444]"
                    }`}
                  >
                    {formatCurrency(transaction.clientBalanceAfterTransaction ?? transaction.client?.balance ?? 0)}
                  </span>
                </p>

                {/* view button */}
                <button
                  onClick={() => openModal(transaction)}
                  className="text-[#3D80FF] text-sm underline cursor-pointer hover:no-underline transition-all duration-150 ease-in-out"
                >
                  View
                </button>
              </div>
            </li>
          ))
        ) : (
          <p className="text-gray-400 text-center font-normal text-sm py-10">
            No transaction.
          </p>
        )}
      </ul>

      {/* modal */}
      {open && selectedTransaction?.clientId ? (
        <ClientTransactionModal />
      ) : (
        <WalkinTransactionModal />
      )}
    </section>
  );
};

export default TransactionsTableMobile;
