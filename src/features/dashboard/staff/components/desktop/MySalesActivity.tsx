//src\features\dashboard\staff\components\desktop\MySalesActivity.tsx
// type
import type { Transaction } from "@/types/transactions";

// utils
//import { balanceTextClass } from "@/utils/styles";
import { itemDisplayName } from "@/utils/itemDisplay";

// ui
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  getTransactionDateString,
} from "@/utils/transactions";
import { getTransactionTypeBadgeStyles } from "@/utils/transactionTypeStyles";

// icons
import { ChevronDown, Receipt, TrendingUp } from "lucide-react";

const MySalesActivity = ({
  filteredTransactions,
}: {
  filteredTransactions: Transaction[];
}) => {
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 px-8">
      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-6">
        <Receipt className="w-10 h-10 text-gray-400" />
      </div>

      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        No Sales Activity Yet
      </h3>

      <p className="text-gray-500 text-center max-w-md mb-6">
        Your sales transactions will appear here once you start making sales.
        Get started by creating your first transaction.
      </p>

      <div className="flex items-center gap-2 text-sm text-gray-400">
        <TrendingUp className="w-4 h-4" />
        <span>Track your sales performance and activity</span>
      </div>
    </div>
  );

  // Sort transactions by createdAt (latest first)
  const sortedTransactions = [...(filteredTransactions || [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full min-w-[800px] border-collapse border-[#D9D9D9]">
        <thead>
          <tr className="bg-[#F5F5F5] border border-[#D9D9D9] h-[65px]">
            <th className="text-left min-w-36 text-[#333333] font-Inter font-medium text-base pl-5 md:pl-10">
              Clients
            </th>
            <th className="text-left text-[#333333] font-Inter font-medium text-base">
              Products
            </th>
            <th className="text-left text-[#333333] font-Inter font-medium text-base">
              Type
            </th>
            <th className="text-left text-[#333333] font-Inter font-medium text-base">
              Amount
            </th>
            {/* <th className="text-left text-[#333333] font-Inter font-medium text-base">
              Amount Paid
            </th> */}
            <th className="text-right text-[#333333] font-Inter font-medium text-base pr-5 md:pr-16">
              Date
            </th>
          </tr>
        </thead>

        <tbody>
          {sortedTransactions.length > 0 ? (
            sortedTransactions.map((transaction, i) => (
              <tr
                key={transaction._id || i}
                className={`h-[65px] border-b border-[#D9D9D9] ${
                  transaction.clientId?._id
                    ? "hover:bg-gray-50 transition-colors cursor-pointer"
                    : ""
                }`}
                onClick={() => {
                  if (transaction.clientId?._id) {
                    window.location.href = `/clients/${transaction.clientId._id}`;
                  }
                }}
              >
                <td className="text-[#444444] text-base pl-5 md:pl-10 capitalize">
                  {transaction.clientId?.name || transaction.walkInClientName}
                </td>

                <td className="text-[#444444] text-base min-w-36">
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
                </td>

                <td className="text-base">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getTransactionTypeBadgeStyles(transaction.type)}`}>
                    {transaction.type || "N/A"}
                  </span>
                </td>

                <td className="text-[#444444] font-medium text-base">
                  ₦{Math.abs(transaction.total ?? 0).toLocaleString()}
                </td>

                <td className="uppercase text-[#444444] text-base text-right pr-5 md:pr-10">
                  {getTransactionDateString(transaction, "en-GB")}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="p-0">
                <EmptyState />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default MySalesActivity;

//type
// import type { Transaction } from "@/types/transactions";

// // utils
// import { formatCurrency, balanceTextClass } from "@/utils/styles";

// // ui
// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from "@/components/ui/popover";
// import { Button } from "@/components/ui/button";
// import {
//   getTransactionDateString,
//   // getTransactionTimeString,
// } from "@/utils/transactions";

// //  icons
// import { ChevronDown, Receipt, TrendingUp } from "lucide-react";

// const MySalesActivity = ({
//   filteredTransactions,
// }: {
//   filteredTransactions: Transaction[];
// }) => {
//   const EmptyState = () => (
//     <div className="flex flex-col items-center justify-center py-16 px-8">
//       <div className="flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-6">
//         <Receipt className="w-10 h-10 text-gray-400" />
//       </div>

//       <h3 className="text-xl font-semibold text-gray-900 mb-2">
//         No Sales Activity Yet
//       </h3>

//       <p className="text-gray-500 text-center max-w-md mb-6">
//         Your sales transactions will appear here once you start making sales.
//         Get started by creating your first transaction.
//       </p>

//       <div className="flex items-center gap-2 text-sm text-gray-400">
//         <TrendingUp className="w-4 h-4" />
//         <span>Track your sales performance and activity</span>
//       </div>
//     </div>
//   );

//   return (
//     <div className="hidden md:block">
//       <table className="w-full">
//         <thead>
//           <tr className="bg-[#F5F5F5] h-[65px]">
//             <td className="min-w-36 text-[#333333] font-Inter font-medium text-base pl-5 md:pl-10">
//               Client Name
//             </td>
//             <td className="text-[#333333] font-Inter font-medium text-base">
//               Products
//             </td>
//             <td className="text-[#333333] font-Inter font-medium text-base">
//               Type
//             </td>
//             <td className="text-[#333333] font-Inter font-medium text-base">
//               Amount
//             </td>
//             <td className="text-[#333333] font-Inter font-medium text-base">
//               Amount Paid
//             </td>
//             <td className="text-[#333333] font-Inter font-medium text-base text-right pr-5 md:pr-16">
//               {/* Time */} Date
//             </td>
//           </tr>
//         </thead>
//         <tbody>
//           {filteredTransactions && filteredTransactions?.length > 0 ? (
//             filteredTransactions?.map((transaction, i) => (
//               <tr
//                 key={transaction._id + i}
//                 className="h-[65px] border-b border-[#D9D9D9]"
//               >
//                 <td className="text-[#444444] text-base pl-5 md:pl-10 capitalize">
//                   {transaction.clientId?.name || transaction.walkInClientName}
//                 </td>
//                 <td className="text-[#444444] text-base min-w-36">
//                   {transaction.items.length > 0 && (
//                     <>
//                       <span>
//                         {transaction.items[0].quantity}x{" "}
//                         {transaction.items[0].productName}
//                       </span>
//                       {transaction.items.length > 1 && (
//                         <Popover>
//                           <PopoverTrigger asChild>
//                             <Button
//                               variant="ghost"
//                               size="icon"
//                               className="ml-1"
//                             >
//                               <ChevronDown className="w-4 h-4" />
//                             </Button>
//                           </PopoverTrigger>
//                           <PopoverContent className="text-sm max-w-60">
//                             {transaction.items
//                               .slice(1)
//                               .map(
//                                 (item, index) =>
//                                   `${item.quantity}x ${item.productName}${
//                                     index < transaction.items.length - 2
//                                       ? ", "
//                                       : ""
//                                   }`
//                               )}
//                           </PopoverContent>
//                         </Popover>
//                       )}
//                     </>
//                   )}
//                 </td>
//                 <td
//                   className={` text-sm  py-1 px-2 capitalize ${
//                     transaction.type === "PURCHASE"
//                       ? " text-[#F95353]"
//                       : transaction.type === "PICKUP"
//                       ? " text-[#FFA500]"
//                       : "  text-[#2ECC71]"
//                   }`}
//                 >
//                   {transaction.type}
//                 </td>
//                 <td className={balanceTextClass(transaction.total)}>
//                   {formatCurrency(transaction?.total)}
//                 </td>
//                 <td className={balanceTextClass(transaction.amountPaid)}>
//                   ₦{transaction.amountPaid?.toLocaleString()}
//                 </td>
//                 <td className="uppercase text-[#444444] text-base text-right pr-5 md:pr-10">
//                   {/* {getTransactionTimeString(transaction, "en-NG")} */}
//                   {getTransactionDateString(transaction, "en-NG")}
//                 </td>
//               </tr>
//             ))
//           ) : (
//             <tr>
//               <td colSpan={4} className="p-0">
//                 <EmptyState />
//               </td>
//             </tr>
//           )}
//         </tbody>
//       </table>
//     </div>
//   );
// };

// export default MySalesActivity;
