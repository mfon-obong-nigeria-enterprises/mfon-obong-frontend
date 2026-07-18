// components
import ClientTransactionModal from "@/features/dashboard/shared/ClientTransactionModal";
import WalkinTransactionModal from "@/features/dashboard/shared/WalkinTransactionModal";
import SearchBar from "@/features/dashboard/shared/SearchBar";

// ui components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// icons
import { ChevronDown, Receipt, TrendingUp } from "lucide-react";

// stores
import { useTransactionsStore } from "@/stores/useTransactionStore";

// utils
import { balanceClassT, toSentenceCaseName } from "@/utils/styles";
import { itemDisplayName } from "@/utils/itemDisplay";

// types
import type { Transaction } from "@/types/transactions";

//hooks
import { useTransactionSearch } from "@/hooks/useTransactionSearch";
import { formatCurrency } from "@/utils/formatCurrency";

// Empty State Component
function EmptySalesState() {
  return (
    <div className="w-full py-16 px-4 text-center">
      <div className="flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-6 mx-auto">
        <Receipt className="w-10 h-10 text-gray-400" />
      </div>
      <h3 className="text-xl font-medium text-gray-900 mb-3">
        No Sales Transactions Yet
      </h3>
      <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
        Start processing sales transactions to see them appear here. All your
        recent sales activities will be displayed in this table for easy
        tracking and management.
      </p>
      <div className="flex items-center justify-center text-xs text-gray-400">
        <TrendingUp className="w-4 h-4 mr-1" />
        <span>Your sales data will be automatically tracked and organized</span>
      </div>
    </div>
  );
}

const SalesTableData = ({
  currentTransaction,
  setCurrentPage,
}: {
  currentTransaction: Transaction[];
  setCurrentPage: (page: number) => void;
}) => {
  const { open, openModal, selectedTransaction } = useTransactionsStore();

  const { fetchSuggestions, onSelect } = useTransactionSearch({
    type: "client",
    pageSize: 5,
    onPageChange: (page: number) => setCurrentPage(page),
  });

  const hasTransactions = currentTransaction && currentTransaction.length > 0;

  return (
    <div className="bg-white px-3 md:px-6 py-3 md:py-6 rounded-lg font-Inter">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <CardTitle className="text-[#1E1E1E] text-xl font-medium">
              Recent Sales
            </CardTitle>
            <div className="w-full sm:w-1/2">
              <SearchBar
                type="client"
                placeholder="Search by client name..."
                fetchSuggestions={fetchSuggestions}
                onSelect={onSelect}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {!hasTransactions ? (
            <EmptySalesState />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-[#D9D9D9]">
                  <TableHead className="text-[#333333] text-base">
                    Date
                  </TableHead>
                  <TableHead className="text-[#333333] text-base">
                    Client
                  </TableHead>
                  <TableHead className="text-[#333333] text-base">
                    Items
                  </TableHead>
                  <TableHead className="text-[#333333] text-base">
                    Amount
                  </TableHead>
                  <TableHead className="text-[#333333] text-base">
                    Staff
                  </TableHead>
                  <TableHead className="text-[#333333] text-base">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentTransaction.map((transaction) => (
                  <TableRow
                    key={transaction._id}
                    id={`invoice-${transaction.invoiceNumber}`}
                  >
                    <TableCell className="text-sm text-gray-600">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {toSentenceCaseName(
                        transaction.clientId?.name ||
                          transaction.walkInClient?.name ||
                          "No Name"
                      )}
                    </TableCell>
                    <TableCell>
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
                              <PopoverContent className="text-sm max-w-30">
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
                    </TableCell>
                    <TableCell
                      className={`${balanceClassT(
                        transaction.total
                      )} text-start`}
                    >
                      {formatCurrency(transaction.total)}
                    </TableCell>
                    <TableCell>{transaction.userId.name}</TableCell>
                    <TableCell className="text-start text-[#3D80FF] text-sm">
                      <button
                        onClick={() => openModal(transaction)}
                        className="underline cursor-pointer hover:no-underline transition-all duration-150 ease-in-out"
                      >
                        View
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {open &&
            (selectedTransaction?.clientId ? (
              <ClientTransactionModal />
            ) : (
              <WalkinTransactionModal />
            ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesTableData;
