import { useState, useMemo, useEffect } from "react";

// components
import DashboardTitle from "../shared/DashboardTitle";
import MySalesActivity from "./components/desktop/MySalesActivity";
import MobileSalesActivity from "./components/mobile/MobileSalesActivity";

// ui
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

// icons
import { VscRefresh } from "react-icons/vsc";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Search } from "lucide-react";

// stores
import { useTransactionsStore } from "@/stores/useTransactionStore";

// hooks
import usePagination from "@/hooks/usePagination";

// utils
import { getTransactionDate } from "@/utils/transactions";

const StaffSales = () => {
  const transactions = useTransactionsStore(
    (state) => state.transactions ?? []
  );

  const [filter, setFilter] = useState<"today" | "week" | "month" | "all">(
    "all"
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const query = searchQuery.trim().toLowerCase();

    const filtered = transactions?.filter((tx) => {


      const txDate = getTransactionDate(tx);

      // Date filter
      if (filter !== "all") {
        if (filter === "today") {
          if (
            !(
              txDate.getDate() === now.getDate() &&
              txDate.getMonth() === now.getMonth() &&
              txDate.getFullYear() === now.getFullYear()
            )
          )
            return false;
        }

        if (filter === "week") {
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);
          if (!(txDate >= startOfWeek && txDate <= endOfWeek)) return false;
        }

        if (filter === "month") {
          if (
            !(
              txDate.getMonth() === now.getMonth() &&
              txDate.getFullYear() === now.getFullYear()
            )
          )
            return false;
        }
      }

      // Client name search filter
      if (query) {
        const clientName = (
          (tx as any).client?.name ||
          (tx as any).clientName ||
          (tx as any).walkInClient?.name ||
          ""
        ).toLowerCase();
        if (!clientName.includes(query)) return false;
      }

      return true;
    });

    // Sort by date - NEWEST FIRST
    return filtered.sort((a, b) => {
      const dateA = getTransactionDate(a).getTime();
      const dateB = getTransactionDate(b).getTime();
      return dateB - dateA;
    });
  }, [transactions, filter, searchQuery]);

  //  use filtered transaction for pagination
  const {
    currentPage,
    totalPages,
    goToPreviousPage,
    goToNextPage,
    canGoPrevious,
    canGoNext,
    resetPage,
  } = usePagination((filteredTransactions ?? []).length, 5);

  useEffect(() => {
    resetPage();
  }, [filter, searchQuery, resetPage]);

  const currentTransaction = useMemo(() => {
    const startIndex = (currentPage - 1) * 5;
    const endIndex = startIndex + 5;
    return filteredTransactions?.slice(startIndex, endIndex);
  }, [filteredTransactions, currentPage]);

  return (
    <div>
      <div className="flex flex-col md:flex-row md:justify-between gap-3">
        <DashboardTitle
          heading="My Sales"
          description="View your sales activity"
        />

        {/* buttons */}
        <div className="flex gap-5">
          <Button
            variant="tertiary"
            onClick={() => window.location.reload()}
            className="min-w-40 border-[#7d7d7d]"
          >
            <VscRefresh />
            Refresh
          </Button>
        </div>
      </div>

      {/* search bar */}
      <div className="relative mt-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7d7d7d]" size={16} />
        <Input
          type="text"
          placeholder="Search by client name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 border-[#d9d9d9] text-sm font-Inter"
        />
      </div>

      {/* sales activity */}
      <section className="bg-white border border-[#D9D9D9] rounded-[10px] mt-5 overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b px-4 md:px-10 py-6">
          <h4 className="font-medium text-lg text-[#1E1E1E] font-Inter">
            Your Sales Activity
          </h4>
          <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
            {["today", "week", "month", "all"].map((f) => (
              <button
                key={f}
                onClick={() =>
                  setFilter(f as "today" | "week" | "month" | "all")
                }
                className={`cursor-pointer px-4 py-2 rounded-[6px] text-sm font-Inter font-medium transition-all ${
                  filter === f
                    ? "bg-[#D8E5FE] text-[#3D80FF]"
                    : "bg-transparent text-[#444444] hover:bg-gray-50"
                }`}
              >
                {f === "today"
                  ? "Today"
                  : f === "week"
                  ? "This Week"
                  : f === "month"
                  ? "This Month"
                  : "All"}
              </button>
            ))}
          </div>
        </div>

        {/* --- CHANGED: md to lg to ensure Tablet uses Mobile view --- */}
        <div className="hidden lg:block">
            <MySalesActivity filteredTransactions={currentTransaction} />
        </div>
        <div className="lg:hidden">
             <MobileSalesActivity filteredTransactions={currentTransaction} />
        </div>
        {/* ------------------------------------------------------------- */}

        {/* pagination */}
        {currentTransaction &&
          currentTransaction?.length > 0 &&
          totalPages > 1 && (
            <div className="h-14 bg-[#f5f5f5] text-sm text-[#7D7D7D] flex justify-center items-center gap-3">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={canGoPrevious ? goToPreviousPage : undefined}
                      className={
                        !canGoPrevious
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                      aria-label="Go to previous page"
                    >
                      <Button
                        disabled={!canGoPrevious}
                        className="border border-[#d9d9d9] rounded"
                      >
                        <ChevronLeft size={14} />
                      </Button>
                    </PaginationPrevious>
                  </PaginationItem>
                  <PaginationItem className="px-4 text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </PaginationItem>
                  <PaginationNext
                    onClick={canGoNext ? goToNextPage : undefined}
                    className={
                      !canGoNext
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                    aria-label="Go to next page"
                  >
                    <Button className="border border-[#d9d9d9] rounded">
                      <ChevronRight size={14} />
                    </Button>
                  </PaginationNext>
                </PaginationContent>
              </Pagination>
            </div>
          )}
      </section>

    </div>
  );
};

export default StaffSales;