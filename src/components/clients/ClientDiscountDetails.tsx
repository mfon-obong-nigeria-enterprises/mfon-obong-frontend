//src/components/clients/ClientDiscountDetails.tsx
import type { Transaction } from "@/types/transactions";
import { formatCurrency } from "@/utils/formatCurrency";
import {
  getTransactionDate,
  getTransactionDateString,
} from "@/utils/transactions";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

interface ClientDiscountDetailsProps {
  clientTransactions: Transaction[];
}

const ClientDiscountDetails: React.FC<ClientDiscountDetailsProps> = ({
  clientTransactions,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  // Remove duplicates and filter discount transactions
  const filteredDiscountTransactions = useMemo(() => {
    // First remove duplicates
    const uniqueTransactions = clientTransactions.reduce((acc, current) => {
      const existingIndex = acc.findIndex((item) => item._id === current._id);
      if (existingIndex === -1) {
        acc.push(current);
      }
      return acc.sort((a, b) => {
        const dateA = getTransactionDate(a).getTime();
        const dateB = getTransactionDate(b).getTime();
        return dateB - dateA; // Descending order (newest first)
      });
    }, [] as Transaction[]);

    // Then filter for discount transactions and search term
    return uniqueTransactions.filter((txn) => {
      const hasDiscount =
        (txn.type === "PURCHASE" || txn.type === "PICKUP") &&
        txn.discount &&
        txn.discount > 0;

      if (!hasDiscount) return false;

      if (!searchTerm) return true;

      const searchLower = searchTerm.toLowerCase();
      return (
        txn._id.toLowerCase().includes(searchLower) ||
        txn.items?.some((item) =>
          item.productName.toLowerCase().includes(searchLower)
        ) ||
        (txn.invoiceNumber &&
          txn.invoiceNumber.toLowerCase().includes(searchLower))
      );
    });
  }, [clientTransactions, searchTerm]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 justify-between flex-wrap bg-[#ffffff] px-6 py-10 rounded-md shadow-lg border">
        <h1 className="text-[#333333] font-medium text-lg font-Inter">
          Discount History
        </h1>
        <div className="bg-[#F5F5F5] flex items-center gap-1 px-4 rounded-md w-full sm:w-1/2 ">
          <Search size={18} className="text-[#A4A4A4]" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            type="search"
            placeholder="Search discount payment by ID or date.."
            className="py-2 outline-0 w-full"
          />
        </div>
      </div>
      {filteredDiscountTransactions.length > 0 ? (
        <ul className="space-y-6 mt-6 ">
          {filteredDiscountTransactions.map((txn, index) => (
            <li
              key={`${txn._id}-${txn.createdAt}-discount-${index}`} // More unique key
              className="px-4 py-6 border rounded-md  bg-white shadow-lg flex flex-col gap-2"
            >
              <div className="flex items-center justify-between ">
                <p>{txn.invoiceNumber || `TXN-${txn._id.slice(-6)}`}</p>
                <p className="text-[#2ECC71] font-normal font-Inter text-lg">
                  {formatCurrency(txn.discount ?? 0)} saved
                </p>
              </div>
              <div className="flex items-center justify-between ">
                <p>{txn.createdAt && getTransactionDateString(txn)}</p>
                {txn?.total ? (
                  <p className="text-[#7D7D7D] text-sm font-Inter">
                    {(
                      ((txn?.discount ?? 0) / (txn?.subtotal ?? 0)) *
                      100
                    ).toFixed(2)}
                    % discount
                  </p>
                ) : (
                  "No discount"
                )}
              </div>


              <div className="mt-4 border-l-5 border-[#2ECC71] pl-4 bg-[#E2F3EB] p-4 rounded-md">
                <p className="text-[#333333] font-normal text-[16px] font-Inter">
                  Summary:
                </p>
                <div className="flex items-center justify-between py-2">
                  <p>Original Total:</p>
                  <p>{formatCurrency(txn.subtotal ?? 0)}</p>
                </div>
                <div className="flex items-center justify-between py-2">
                  <p>Final Total:</p>
                  <p>{formatCurrency(txn.total)}</p>
                </div>
                <div className="flex items-center justify-between py-2 text-[#2ECC71]">
                  <p>Total Save:</p>
                  <p>{formatCurrency(txn.discount ?? 0)}</p>
                </div>
              </div>

              <div className="mt-3 bg-[#FFE7A4] rounded-md p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-[#333333] font-normal text-[16px] font-Inter">
                    Reason:
                  </p>
                  <p className="text-[#7D7D7D] text-sm bg-[#FFF2CE80] rounded-sm px-2">
                    {txn.notes || "No reason provided"}
                  </p>
                </div>
                <p className="text-xs text-[#444444] font-normal font-Inter">
                  Applied by: {txn.userId?.name || "Unknown"}
                </p>
              </div> 
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-center py-10">
          <p className="text-gray-500 mb-2">No discount transactions found.</p>
          {searchTerm && (
            <p className="text-sm text-gray-400">
              Try adjusting your search term or clearing the search to see all
              discount transactions.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ClientDiscountDetails;
