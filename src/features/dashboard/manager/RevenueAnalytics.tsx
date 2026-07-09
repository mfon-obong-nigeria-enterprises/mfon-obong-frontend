import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  
} from "recharts";
import {
  // ChevronDown,
  MoreVertical,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-toastify";
import DashboardTitle from "../shared/DashboardTitle";
import Stats from "../shared/Stats";
import { useRevenueStore } from "@/stores/useRevenueStore";
import type { StatCard } from "@/types/stats";
import { getAllTransactions } from "@/services/transactionService";
import { getPreviousMonthName } from "@/utils/helpersfunction";
import { getAllProducts } from "@/services/productService";
import { useEffect, useState, useMemo } from "react";
import { formatCurrency } from "@/utils/formatCurrency";

export default function RevenueAnalytics() {
  const {
    transactions,
    products,
    setTransactions,
    setProducts,
    getYTDRevenue,
    getMOMRevenue,
    getMonthlyTrendData,
    getYearOverYearData,
    getProductMarginData,
    getAverageDiscount,
    getRevenueLift,
    getMarginImpact,
    getPaymentMethodRevenue,
  } = useRevenueStore();

  const [selectedBranch, setSelectedBranch] = useState<string>("All Branches");

  // Fetch transactions using useQuery
  const {
    data: transactionData,
    isLoading: isTransactionsLoading,
    error: transactionsError,
  } = useQuery({
    queryKey: ["transactions"],
    queryFn: getAllTransactions,
    staleTime: 1 * 60 * 1000, // 1 minutes
    retry: 2,
  });

  // Extract unique branches
  const branches = useMemo(() => {
    if (!transactionData) return [];
    const uniqueBranches = new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transactionData.forEach((t: any) => {
      const branchName =
        t.branchId?.name ||
        t.branch?.name ||
        (typeof t.branch === "string" ? t.branch : null) ||
        (typeof t.branchId === "string" ? t.branchId : null);
      if (branchName) uniqueBranches.add(branchName);
    });
    return Array.from(uniqueBranches);
  }, [transactionData]);

  // Fetch products using useQuery
  const {
    data: productData,
    isLoading: isProductsLoading,
    error: productsError,
  } = useQuery({
    queryKey: ["products"],
    queryFn: getAllProducts,
    staleTime: 10 * 60 * 1000, // 10 minutes (products change less frequently)
    retry: 2,
  });

  // Update store when data is fetched
  useEffect(() => {
    if (transactionData) {
      if (selectedBranch === "All Branches") {
        setTransactions(transactionData);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filtered = transactionData.filter((t: any) => {
          const branchName =
            t.branchId?.name ||
            t.branch?.name ||
            (typeof t.branch === "string" ? t.branch : null) ||
            (typeof t.branchId === "string" ? t.branchId : null);
          return branchName === selectedBranch;
        });
        setTransactions(filtered);
      }
    }
  }, [transactionData, setTransactions, selectedBranch]);

  useEffect(() => {
    if (productData) {
      setProducts(productData);
    }
  }, [productData, setProducts]);

  // Handle errors with toast notifications
  useEffect(() => {
    if (transactionsError) {
      // console.error("Failed to fetch transactions:", transactionsError);
      toast.error("Failed to load transaction data");
    }
  }, [transactionsError]);

  useEffect(() => {
    if (productsError) {
      // console.error("Failed to fetch products:", productsError);
      toast.error("Failed to load product data");
    }
  }, [productsError]);

  // Combined loading and error states
  const isLoading = isTransactionsLoading || isProductsLoading;
  const error = (transactionsError as Error) || (productsError as Error);

  // Get computed revenue data (only compute when data is available)
  const ytdRevenue = transactions
    ? getYTDRevenue()
    : {
        totalRevenue: 0,
        previousPeriodRevenue: 0,
        percentageChange: 0,
        direction: "no-change" as const,
      };

  const monthlyRevenue = transactions
    ? getMOMRevenue()
    : {
        totalRevenue: 0,
        previousPeriodRevenue: 0,
        percentageChange: 0,
        direction: "no-change" as const,
      };

  // Get chart data (only compute when data is available)
  const monthlyTrendData = transactions ? getMonthlyTrendData() : [];
  const yearOverYearData = transactions ? getYearOverYearData() : [];
  const productMarginData =
    transactions && products ? getProductMarginData() : [];
  const averageDiscount = transactions ? getAverageDiscount() : 0;
  const revenueLift = transactions
    ? getRevenueLift()
    : { percentage: 0, direction: "no-change" as const };
  const marginImpact =
    transactions && products
      ? getMarginImpact()
      : { percentage: 0, direction: "no-change" as const };
  const paymentMethods = transactions ? getPaymentMethodRevenue() : [];

  const stats: StatCard[] = [
    {
      heading: "Total Revenue (YTD)",
      salesValue: formatCurrency(ytdRevenue.totalRevenue),
      statValue: `${
        ytdRevenue.direction === "increase"
          ? "+"
          : ytdRevenue.direction === "decrease"
          ? "-"
          : ""
      }${ytdRevenue.percentageChange}%`,
      color:
        ytdRevenue.direction === "increase"
          ? "green"
          : ytdRevenue.direction === "decrease"
          ? "red"
          : "orange",
    },
    {
      heading: `Previous Month (${getPreviousMonthName()})`,
      salesValue: formatCurrency(monthlyRevenue.previousPeriodRevenue),
    },
    {
      heading: "Growth Rate (MOM)",
      salesValue: `${
        monthlyRevenue.direction === "increase"
          ? "+"
          : monthlyRevenue.direction === "decrease"
          ? "-"
          : ""
      }${monthlyRevenue.percentageChange}%`,
      salesColor:
        monthlyRevenue.direction === "increase"
          ? "green"
          : monthlyRevenue.direction === "decrease"
          ? "red"
          : "blue",
      percentage: Math.min(monthlyRevenue.percentageChange, 100), // Cap at 100% for circular display
      displayType: "circular",
    },
  ];

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {[1, 2, 3].map((index) => (
        <div
          key={index}
          className="bg-white rounded-lg shadow-md p-6 border animate-pulse"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className="h-6 w-6 bg-gray-200 rounded"></div>
          </div>
          <div className="h-8 bg-gray-200 rounded w-20 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-16"></div>
        </div>
      ))}
    </div>
  );

  // Chart loading skeleton
  const ChartLoadingSkeleton = ({ height = "h-64" }: { height?: string }) => (
    <div
      className={`${height} bg-gray-100 rounded-lg animate-pulse flex items-center justify-center`}
    >
      <div className="text-gray-400">Loading chart data...</div>
    </div>
  );

  return (
    <div className="min-h-screen p-2 md:p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <DashboardTitle
            heading="Revenue Analytics"
            description="Welcome back! Here's your revenue performance"
          />
          {/* <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2">
              <span className="text-sm text-gray-600">Filter:</span>
              <span className="text-sm font-medium">Last 12 months</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>

            <button className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors">
              <TrendingUp className="w-4 h-4" />
              Export Data
            </button>
          </div> */}
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-700">
                <span className="text-sm font-medium">Error loading data:</span>
                <span className="text-sm">
                  {error?.message || "Unknown error"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? <LoadingSkeleton /> : <Stats data={stats} columns={3} />}

        <div className="space-y-4 sm:space-y-6">
          {/* Charts Section */}
          <div className="grid md:grid-cols-1 xl:grid-cols-6 lg:grid-cols-5 gap-4 sm:gap-6 items-stretch">
            <div className="w-full xl:col-span-4 lg:col-span-3 space-y-4 sm:space-y-6">
              {/* Monthly Revenue Trend */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Monthly Revenue Trend
                  </h3>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="p-1 hover:bg-gray-100 rounded-full transition-colors outline-none">
                        <MoreVertical className="w-5 h-5 text-gray-400 cursor-pointer" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-2" align="end">
                      <div className="space-y-1">
                        <h4 className="font-medium text-sm px-2 py-1.5 text-gray-900">
                          Filter by Branch
                        </h4>
                        <div className="h-px bg-gray-200 my-1" />
                        <button
                          onClick={() => setSelectedBranch("All Branches")}
                          className={`w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors ${
                            selectedBranch === "All Branches"
                              ? "bg-blue-50 text-blue-700 font-medium"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          All Branches
                        </button>
                        {branches.map((branch) => (
                          <button
                            key={branch}
                            onClick={() => setSelectedBranch(branch)}
                            className={`w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors ${
                              selectedBranch === branch
                                ? "bg-blue-50 text-blue-700 font-medium"
                                : "text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            {branch}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {isLoading ? (
                  <ChartLoadingSkeleton />
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyTrendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="month"
                          axisLine={true}
                          tickLine={false}
                          className="text-xs text-gray-500"
                        />
                        <YAxis
                          hide
                          tickFormatter={(value) =>
                            `₦${(value / 1000).toFixed(0)}k`
                          }
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#3B82F6"
                          strokeWidth={3}
                          dot={false}
                          activeDot={{ r: 6, fill: "#3B82F6" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

{/* Year Over Year Comparison */}
<div className="bg-white rounded-xl border border-gray-200 p-4 sm:py-10 sm:px-6 shadow-sm">
  <div className="flex items-center justify-between mb-6">
    <h3 className="text-lg font-semibold text-gray-900">
      Year-Over-Year Comparison
    </h3>
    <div className="flex items-center gap-4 text-xs">
      {yearOverYearData.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>{new Date().getFullYear() - 1}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>{new Date().getFullYear()}</span>
          </div>
        </>
      )}
    </div>
  </div>

  {isLoading ? (
    <ChartLoadingSkeleton />
  ) : yearOverYearData.length > 0 ? (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={yearOverYearData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6B7280' }}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6B7280' }}
            tickFormatter={(value) => `₦${value}k`}
          />
          <Bar 
            dataKey={(new Date().getFullYear() - 1).toString()}
            fill="#EF4444"
            radius={[2, 2, 0, 0]}
            name={`${new Date().getFullYear() - 1}`}
          />
          <Bar 
            dataKey={new Date().getFullYear().toString()}
            fill="#3B82F6"
            radius={[2, 2, 0, 0]}
            name={new Date().getFullYear().toString()}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  ) : (
    <div className="h-64 flex items-center justify-center">
      <div className="text-gray-500">No year-over-year data available</div>
    </div>
  )}
</div>
</div>
            <div className="w-full xl:col-span-2 lg:col-span-2 lg:h-full">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:flex lg:flex-col lg:h-full gap-4 sm:gap-6">
                {/* Revenue by Payment Method */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm lg:flex-1">
                  <h3 className="text-[16px] lg:text-lg font-semibold text-gray-900 mb-2">
                    Revenue by Payment Method
                  </h3>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm font-medium text-gray-600 border-b border-gray-200 pb-2">
                      <span>Method</span>
                      <span>Revenue</span>
                    </div>

                    {paymentMethods.length > 0 ? (
                      paymentMethods.map((method, index) => (
                        <div
                          key={index}
                          className="grid grid-cols-2 justify-between gap-4 py-2 border-b border-gray-200 pb-2"
                        >
                          <span className="text-sm text-gray-900">
                            {method.method}
                          </span>
                          <span
                            className={`text-sm font-semibold ${method.color}`}
                          >
                            {method.revenue}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500 text-center py-4">
                        {isLoading ? "Loading..." : "No payment data available"}
                      </div>
                    )}
                  </div>
                </div>

                {/* Discount Impact */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm flex flex-col lg:flex-1">
                  <h3 className="lg:text-lg text-[16px] font-semibold text-gray-900 mb-4">
                    Discount Impact
                  </h3>

                  <div className="space-y-4 flex flex-col">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Avg. Discount:
                      </span>
                      <span className="text-sm font-semibold">
                        {averageDiscount}%
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Revenue Lift:
                      </span>
                      <div className="flex items-center gap-1">
                        {revenueLift.direction === "increase" ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : revenueLift.direction === "decrease" ? (
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        ) : null}
                        <span
                          className={`text-sm font-semibold ${
                            revenueLift.direction === "increase"
                              ? "text-green-600"
                              : revenueLift.direction === "decrease"
                              ? "text-red-600"
                              : "text-gray-600"
                          }`}
                        >
                          {revenueLift.direction === "increase"
                            ? "+"
                            : revenueLift.direction === "decrease"
                            ? "-"
                            : ""}
                          {revenueLift.percentage}%
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Margin Impact:
                      </span>
                      <div className="flex items-center gap-1">
                        {marginImpact.direction === "increase" ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : marginImpact.direction === "decrease" ? (
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        ) : null}
                        <span
                          className={`text-sm font-semibold ${
                            marginImpact.direction === "increase"
                              ? "text-green-600"
                              : marginImpact.direction === "decrease"
                              ? "text-red-600"
                              : "text-gray-600"
                          }`}
                        >
                          {marginImpact.direction === "increase"
                            ? "+"
                            : marginImpact.direction === "decrease"
                            ? "-"
                            : ""}
                          {marginImpact.percentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Product Margin */}
                <div className="bg-white rounded-xl border border-gray-200 p-2 sm:p-6 shadow-sm relative md:col-span-2 lg:flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 pl-3 sm:pl-0">
                    Product Margin
                  </h3>

                  {productMarginData.length > 0 ? (
                    <>
                      <div className="flex items-center lg:justify-start justify-center">
                        <div className="relative w-40 h-40 md:w-32 md:h-32 mb-8 md:mb-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={productMarginData}
                                cx="50%"
                                cy="50%"
                                innerRadius={35}
                                outerRadius={60}
                                startAngle={90}
                                endAngle={-270}
                                dataKey="value"
                              >
                                {productMarginData.map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={entry.color}
                                  />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="space-y-2 absolute right-3 bottom-1.5 flex gap-4 lg:gap-0 justify-between lg:flex-col">
                        {productMarginData.map((item, index) => (
                          <div key={index}>
                            <div className="flex items-center">
                              <div
                                className="w-3 h-3"
                                style={{ backgroundColor: item.color }}
                              ></div>
                              <span className="text-sm text-gray-600">
                                {item.name}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-32">
                      <div className="text-sm text-gray-500">
                        {isLoading ? "Loading..." : "No margin data available"}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
