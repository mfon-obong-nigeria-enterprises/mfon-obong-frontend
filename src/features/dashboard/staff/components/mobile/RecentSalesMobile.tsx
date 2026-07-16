import { useTransactionsStore } from "@/stores/useTransactionStore";
import { balanceTextClass, formatCurrency } from "@/utils/styles";
import { itemDisplayName } from "@/utils/itemDisplay";
import { MdKeyboardArrowDown } from "react-icons/md";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react"; // icon for empty state

const RecentSalesMobile = () => {
  const { transactions } = useTransactionsStore();
  const recentSales = [...(transactions || [])]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 4);

  return (
    <div className="bg-[#F5F5F5] flex md:hidden flex-col gap-3.5">
      {recentSales.length > 0 ? (
        recentSales.map((sale, i) => (
          <div key={i} className="bg-white p-4 rounded-[10px] shadow-md mt-4">
            {/* name and time */}
            <div className="flex justify-between">
              <p className="text-[#333333] mb-2 capitalize">
                {sale.clientName || sale.walkInClientName}
              </p>
              <span className="text-xs text-[var(--cl-secondary)]">
                {new Date(sale.createdAt).toLocaleTimeString("en-NG", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </span>
            </div>

            {/* items */}
            <p className="text-[#444444B2] text-xs md:text-sm">
              {sale.items.length > 0 && (
                <>
                  <span>
                    {sale.items[0].quantity}x {itemDisplayName(sale.items[0].productName, sale.items[0].variantName)}
                  </span>
                  {sale.items.length > 1 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="ml-1">
                          <MdKeyboardArrowDown className="w-4 h-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="text-sm max-w-60">
                        {sale.items.slice(1).map((item, index) => (
                          <span key={index}>
                            {item.quantity}x {itemDisplayName(item.productName, item.variantName)}
                            {index < sale.items.length - 2 ? ", " : ""}
                          </span>
                        ))}
                      </PopoverContent>
                    </Popover>
                  )}
                </>
              )}
            </p>

            {/* balance */}
            <p
              className={`text-sm font-semibold ${balanceTextClass(
                sale.total
              )}`}
            >
              {formatCurrency(sale.total)}
            </p>
          </div>
        ))
      ) : (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="w-12 h-12 flex items-center justify-center rounded-full bg-[#EDEDED] mb-4">
            <FileText className="w-6 h-6 text-[#A1A1A1]" />
          </div>
          <p className="text-sm font-medium text-[#444]">
            No recent sales activity
          </p>
          <p className="text-xs text-[#888] mt-1">
            Transactions will appear here once sales are recorded.
          </p>
        </div>
      )}
    </div>
  );
};

export default RecentSalesMobile;
