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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// icons
import { VscRefresh } from "react-icons/vsc";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Search } from "lucide-react";

// stores
import { useTransactionsStore } from "@/stores/useTransactionStore";
import { useAuthStore } from "@/stores/useAuthStore";

// hooks
import usePagination from "@/hooks/usePagination";

// utils
import { getTransactionDate } from "@/utils/transactions";

const StaffSales = () => {
  const transactions = useTransactionsStore(
    (state) => state.transactions ?? []
  );
  const { user } = useAuthStore();

  const [filter, setFilter] = useState<"today" | "week" | "month" | "all">(
    "today"
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const query = searchQuery.trim().toLowerCase();

    const filtered = transactions?.filter((tx) => {
      // Only show this staff member's own transactions
      const txUserId = (tx.userId as any)?._id || (tx.userId as any);
      if (user?.id && txUserId !== user.id) return false;

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
      <section className="md:bg-white md:border rounded-[10px] mt-5 overflow-hidden">
        <div className="flex justify-between items-center h-[72px] border px-2 md:px-10 py-6">
          <h4 className="hidden md:block font-medium text-lg text-[#1E1E1E] font-Inter">
            Your Sales Activity
          </h4>
          <div className="flex gap-3 items-center">
            {["today", "week", "month", "all"].map((f) => (
              <p
                key={f}
                onClick={() =>
                  setFilter(f as "today" | "week" | "month" | "all")
                }
                className={`cursor-pointer px-5 py-3 rounded-[2px] text-sm font-Inter  hidden md:block ${
                  filter === f
                    ? "bg-[#D8E5FE] text-[#3D80FF]"
                    : "bg-transparent text-[#444444]"
                }`}
              >
                {f === "today"
                  ? "Today"
                  : f === "week"
                  ? "This week"
                  : f === "month"
                  ? "This Month"
                  : "All"}
              </p>
            ))}
            <div className="md:hidden w-full">
              <Tabs
                value={filter}
                onValueChange={(val) =>
                  setFilter(val as "today" | "week" | "month" | "all")
                }
              >
                <TabsList className="grid grid-cols-4 w-full md:hidden">
                  <TabsTrigger
                    value="today"
                    className="w-full px-5 py-3 text-sm font-Inter 
                 data-[state=active]:bg-[#3D80FF] data-[state=active]:text-white 
                 data-[state=inactive]:bg-transparent data-[state=inactive]:text-[#444444]"
                  >
                    Today
                  </TabsTrigger>
                  <TabsTrigger
                    value="week"
                    className="w-full px-5 py-3 text-sm font-Inter 
                  data-[state=active]:bg-[#3D80FF] data-[state=active]:text-white 
                  data-[state=inactive]:bg-transparent data-[state=inactive]:text-[#444444]"
                  >
                    This Week
                  </TabsTrigger>
                  <TabsTrigger
                    value="month"
                    className="w-full px-5 py-3 text-sm font-Inter 
                 data-[state=active]:bg-[#3D80FF] data-[state=active]:text-white 
                 data-[state=inactive]:bg-transparent data-[state=inactive]:text-[#444444]"
                  >
                    This Month
                  </TabsTrigger>
                  <TabsTrigger
                    value="all"
                    className="w-full px-5 py-3 text-sm font-Inter 
                 data-[state=active]:bg-[#3D80FF] data-[state=active]:text-white 
                 data-[state=inactive]:bg-transparent data-[state=inactive]:text-[#444444]"
                  >
                    All
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
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