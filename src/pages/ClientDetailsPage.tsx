/** @format */

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClientStore } from "@/stores/useClientStore";
import { useTransactionsStore } from "@/stores/useTransactionStore";

import ClientDetailInfo from "@/components/clients/ClientDetailInfo";
import { mergeTransactionsWithClients } from "@/utils/mergeTransactionsWithClients";
import { ClientTransactionDetails } from "@/components/clients/ClientTransactionDetails";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ClientDiscountDetails from "@/components/clients/ClientDiscountDetails";
import { DateFromToPicker } from "@/components/DateFromToPicker";

import { useAuthStore } from "@/stores/useAuthStore";
import DeleteClientDialog from "@/features/dashboard/manager/component/DeleteClientDialog";
import EditClientDialog from "@/features/dashboard/manager/component/EditClientDialog";
import { toast } from "react-toastify";
import BlockUnblockClient from "@/features/dashboard/manager/BlockUnblockClient";
import jsPDF from "jspdf";
import { getAllTransactions } from "@/services/transactionService";
import { getClientById } from "@/services/clientService";
import { useQuery } from "@tanstack/react-query";
import { getTransactionDate } from "@/utils/transactions";
import { calculateTransactionsWithBalance } from "@/utils/calculateOutstanding";
import { itemDisplayName } from "@/utils/itemDisplay";

import type { DateRange } from "react-day-picker";

interface ClientDetailsPageProps {
  isManagerView?: boolean;
}

const ClientDetailsPage: React.FC<ClientDetailsPageProps> = ({
  isManagerView = false,
}) => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  //store
  const { clients } = useClientStore();
  const { transactions, setTransactions } = useTransactionsStore();
  // Get user from auth store
  const { user } = useAuthStore();

  // Determine if current user is a manager/super_admin
  const isSuperAdmin = useMemo(() => {
    if (isManagerView) return true;
    if (!user || !user.role) return false;
    return user.role.toString().trim().toUpperCase() === "SUPER_ADMIN";
  }, [user, isManagerView]);

  const { data: fetchedTransactions, isLoading: transactionsLoading } =
    useQuery({
      queryKey: ["transactions", user?.branchId],
      queryFn: getAllTransactions,
      enabled: !!user?.branchId,
      staleTime: 0,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
    });

  // Always fetch the client fresh so balance is never stale
  const { data: freshClientData } = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => getClientById(clientId!),
    enabled: !!clientId,
    staleTime: 0,
    refetchOnMount: true,
  });

  // Update store when data is fetched
  useEffect(() => {
    if (fetchedTransactions) {
      setTransactions(fetchedTransactions);
    }
  }, [fetchedTransactions, setTransactions]);

  // Filter states
  const [transactionTypeFilter, setTransactionTypeFilter] =
    useState<string>("all");
  const [staffFilter, setStaffFilter] = useState<string>("all-staff");
  // Use a DateRange like in Transactions component
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRange>({
    from: undefined,
    to: undefined,
  });
  const [showDialog, setShowDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showBlockUnblockDialog, setShowBlockUnblockDialog] = useState(false);
  const [clientMenuValue, setClientMenuValue] = useState("");

  //
  const mergedTransactions = useMemo(() => {
    if (!transactions || !clients) return [];
    const merged = mergeTransactionsWithClients(transactions, clients);

    return merged;
  }, [transactions, clients]);

  //get Clients
  const client = useMemo(() => {
    if (!clients || !clientId) return null;
    const c = clients.find((c) => c._id === clientId) || null;
    return c;
  }, [clients, clientId]);
  //

  // Check if client is blocked
  const isClientBlocked = useMemo(() => {
    return client?.isActive === false;
  }, [client]);

  // Fix auto-scroll issue
  useEffect(() => {
    // Prevent auto-scroll on page load
    const preventAutoScroll = () => {
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    // Run immediately
    preventAutoScroll();
    // Also run after a short delay to catch any delayed scrolling
    const timeoutId = setTimeout(preventAutoScroll, 100);
    return () => clearTimeout(timeoutId);
  }, [clientId]); //reruns when clientId changes

  // Current balance: fresh API fetch is the single source of truth, Zustand store as fallback
  const currentBalance = freshClientData?.balance ?? client?.balance ?? 0;

  const displayClient = useMemo(() => {
    const base = freshClientData ?? client;
    if (!base) return null;
    return { ...base, balance: currentBalance };
  }, [client, freshClientData, currentBalance]);

  // Get all transactions for this client (unfiltered - used for metrics)
  const allClientTransactions = useMemo(() => {
    if (!clientId) return [];
    return mergedTransactions
      .filter((t) => t.client?._id === clientId)
      .sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt).getTime();
        const dateB = new Date(b.date || b.createdAt).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [clientId, mergedTransactions]);

  const clientTransactions = useMemo(() => {
    if (!clientId) return [];
    let filtered = mergedTransactions.filter(
      (t) => t.client?._id === clientId
    );

    // Apply transaction type filter
    if (transactionTypeFilter !== "all") {
      const typeMap: { [key: string]: string } = {
        purchase: "PURCHASE",
        "pick-up": "PICKUP",
        pickup: "PICKUP",
        deposit: "DEPOSIT",
        return: "RETURN",
      };

      const filterType = typeMap[transactionTypeFilter];
      if (filterType) {
        filtered = filtered.filter((t) => t.type === filterType);
      }
    }

    if (staffFilter !== "all-staff") {
      filtered = filtered.filter((t) => t.userId?.name === staffFilter);
    }

    // dateRangeFilter logic using getTransactionDate for backdated transactions
    if (dateRangeFilter.from && dateRangeFilter.to) {
      filtered = filtered.filter((t) => {
        const txDate = getTransactionDate(t);
        const fromDate = new Date(dateRangeFilter.from!);
        const toDate = new Date(dateRangeFilter.to!);

        // Set time to start/end of day for accurate comparison
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);

        return txDate >= fromDate && txDate <= toDate;
      });
    } else if (dateRangeFilter.from) {
      const fromDate = new Date(dateRangeFilter.from);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((t) => getTransactionDate(t) >= fromDate);
    } else if (dateRangeFilter.to) {
      const toDate = new Date(dateRangeFilter.to);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((t) => getTransactionDate(t) <= toDate);
    }

    return filtered.sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt).getTime();
      const dateB = new Date(b.date || b.createdAt).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [
    clientId,
    dateRangeFilter,
    mergedTransactions,
    transactionTypeFilter,
    staffFilter,
  ]);

  const transactionsWithBalance = useMemo(() => {
    if (!client) return [];
    return calculateTransactionsWithBalance(clientTransactions, {
      balance: currentBalance,
    });
  }, [clientTransactions, client, currentBalance]);

  // --- PDF GENERATION LOGIC ---
  const handleExportPDF = async () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;
    let cursorY = 15;

    // Load company logo
    let logoBase64: string | null = null;
    try {
      const response = await fetch("/logo.png");
      const blob = await response.blob();
      logoBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      // Logo failed to load — continue without it
    }

    const formatCurrencyForPDF = (amount: number) => {
      const val = new Intl.NumberFormat("en-NG", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Math.abs(amount));
      return `N${val}`;
    };

    const formatDate = (date: Date) => {
      return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "numeric",
        year: "2-digit",
      });
    };

    const checkPageBreak = (neededHeight: number) => {
      if (cursorY + neededHeight > pageHeight - margin) {
        doc.addPage();
        cursorY = margin;
        return true;
      }
      return false;
    };

    // --- 1. HEADER ---
    const logoSize = 20;
    const headerTopY = cursorY;
    if (logoBase64) {
      doc.addImage(logoBase64, "PNG", margin, headerTopY, logoSize, logoSize);
    }

    // Motto and RC number stacked below the logo
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6);
    doc.setTextColor(80, 80, 80);
    doc.text("Motto: TRUTH IS SUCCESS", margin, headerTopY + logoSize + 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.text("RC. BN2801551", margin, headerTopY + logoSize + 8);

    // Company name centered on the page
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(204, 0, 0);
    doc.text("MFON-OBONG NIGERIA ENTERPRISES", pageWidth / 2, headerTopY + 8, { align: "center" });

    // Business description centered, below company name
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(80, 80, 80);
    const descriptionText =
      "Building Materials Merchant, General Contractors, Transporters, Dealers and Suppliers of all types of " +
      "Construction Materials such as Wood of all sizes, Cement, Rods, Zinc, Ceiling Board, Aluminium Products, " +
      "Importer and Exporter of General goods etc.";
    const textStartX = margin + logoSize + 6;
    const descLines = doc.splitTextToSize(descriptionText, pageWidth - textStartX - margin);
    doc.text(descLines, textStartX, headerTopY + 14);

    cursorY = headerTopY + logoSize + 12;

    // Dividing line
    doc.setDrawColor(204, 0, 0);
    doc.setLineWidth(0.4);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 5;

    // Four address columns
    const contentWidth = pageWidth - margin * 2;
    const colWidth = contentWidth / 4;
    const col1X = margin;
    const col2X = margin + colWidth;
    const col3X = margin + colWidth * 2;
    const col4X = margin + colWidth * 3;

    const addresses = [
      {
        label: "HEAD OFFICE:",
        lines: ["LUS/TM NO. 24/25,", "Timber Market, Utu Edem", "Usung, Ikot Ekpene,", "Akwa Ibom State"],
      },
      {
        label: "UYO (Shelter Afrique):",
        lines: ["Plot 32 Block 1,", "Shelter Afrique,", "Uyo, Akwa Ibom State"],
      },
      {
        label: "UYO (Oron Road):",
        lines: ["Km 7 Oron Road,", "(by 1st U-Turn after", "Custom Office),", "Uyo, Akwa Ibom State"],
      },
      {
        label: "UYO (Idoro Road):",
        lines: ["Idoro Road,", "(By Pepsi Junction),", "Uyo, Akwa Ibom State"],
      },
    ];

    const colXPositions = [col1X, col2X, col3X, col4X];
    const addrLineHeight = 3.8;
    const addrStartY = cursorY;

    addresses.forEach((addr, i) => {
      const x = colXPositions[i];
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(33, 33, 33);
      doc.text(addr.label, x, addrStartY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(60, 60, 60);
      addr.lines.forEach((line, j) => {
        doc.text(line, x, addrStartY + 4 + j * addrLineHeight);
      });
    });

    const maxLines = Math.max(...addresses.map((a) => a.lines.length));
    cursorY += 4 + maxLines * addrLineHeight + 4;

    // Contact numbers
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(60, 60, 60);
    doc.text("Tel: 0802-472-0210,  0703-436-7795", margin, cursorY);
    cursorY += 6;

    // Dividing line before statement content
    doc.setDrawColor(204, 0, 0);
    doc.setLineWidth(0.4);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 6;

    // Account Statement title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(204, 0, 0);
    doc.text("Account Statement", pageWidth / 2, cursorY + 5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text("Materials Supply Record", pageWidth / 2, cursorY + 11, { align: "center" });
    cursorY += 18;

    doc.setDrawColor(204, 0, 0);
    doc.setLineWidth(0.4);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 8;

    // --- DATA PREPARATION ---
    // Sort the filtered transactions (Newest to Oldest)
    const sortedTxns = [...transactionsWithBalance].sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt).getTime();
      const dateB = new Date(b.date || b.createdAt).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const supplies = sortedTxns.filter(
      (t) => t.type === "PURCHASE" || t.type === "PICKUP" || t.type === "WHOLESALE"
    );

    // Final balance is always the live client balance from the API — never derived from transaction sort order
    const finalBalance = currentBalance;

    // Compute opening balance by reversing all transaction effects from the known-correct final balance.
    // This is reliable even for old transactions that lack a clientBalanceAfterTransaction snapshot.
    let periodSupplyOutstanding = 0;
    let periodDepositTotal = 0;
    let periodReturnTotal = 0;

    sortedTxns.forEach((txn) => {
      const rawT = (mergedTransactions.find((m) => m._id === txn._id) || txn) as any;
      if (rawT.type === "PURCHASE" || rawT.type === "PICKUP" || rawT.type === "WHOLESALE") {
        periodSupplyOutstanding += (Number(rawT.total) || 0) - (Number(rawT.amountPaid) || 0);
      } else if (rawT.type === "DEPOSIT") {
        periodDepositTotal += Number(rawT.total) || 0;
      } else if (rawT.type === "RETURN") {
        periodReturnTotal += Number(rawT.actualAmountReturned) || 0;
      }
    });

    // openingBalance = finalBalance + what was owed - what was paid back
    const openingBalance = finalBalance + periodSupplyOutstanding - periodDepositTotal - periodReturnTotal;
    const isDebt = openingBalance < 0;
    const isCredit = openingBalance > 0;
    const absInitialBalance = Math.abs(openingBalance);

    // Report date range
    const reportStartDate =
      sortedTxns.length > 0
        ? getTransactionDate(sortedTxns[0])
        : dateRangeFilter.from || new Date();
    const startDate = reportStartDate;
    const endDate =
      dateRangeFilter.to ||
      (sortedTxns.length > 0
        ? getTransactionDate(sortedTxns[sortedTxns.length - 1])
        : new Date());

    // --- 2. B/F SECTION (HEADER) ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(51, 51, 51);
    doc.text(client?.name || "", pageWidth - margin, cursorY, {
      align: "right",
    });
    cursorY += 6;

    let dateRangeText = "";
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    const startMonth = startDate.toLocaleDateString("en-US", { month: "long" });
    const endMonth = endDate.toLocaleDateString("en-US", { month: "long" });

    if (startYear === endYear) {
      dateRangeText =
        startMonth === endMonth
          ? `${startMonth}, ${startYear}`
          : `${startMonth} - ${endMonth}, ${startYear}`;
    } else {
      dateRangeText = `${startMonth} ${startYear} - ${endMonth} ${endYear}`;
    }
    doc.setFont("helvetica", "bold");
    doc.setTextColor(204, 0, 0);
    doc.text(`Transaction History, ${dateRangeText}`, margin, cursorY);
    doc.setTextColor(51, 51, 51);
    cursorY += 10;

    // Running total starts with BF debt if applicable
    let runningTotalForGrand = isDebt ? absInitialBalance : 0;

    // Only draw B/F box if there is a debt before the filter period
    if (isDebt) {
      doc.setFillColor(252, 240, 242);
      doc.rect(margin, cursorY, pageWidth - margin * 2, 10, "F");
      doc.setFillColor(204, 0, 0);
      doc.rect(margin, cursorY, 1.5, 10, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(51, 51, 51);
      doc.text(
        `B/F Debt - ${formatDate(startDate)}: ${formatCurrencyForPDF(absInitialBalance)}`,
        margin + 4,
        cursorY + 6.5
      );
      cursorY += 18;
    }

    // --- 3. SUPPLIES LOOP ---
    supplies.forEach((txn) => {
      const rawTxn = mergedTransactions.find((t) => t._id === txn._id) || txn;
      const t = rawTxn as any;

      const transactionTotal = Number(t.total) || 0;
      runningTotalForGrand += transactionTotal;

      let itemsTotal = 0;
      if (t.items && t.items.length > 0) {
        itemsTotal = t.items.reduce(
          (sum: number, item: any) =>
            sum + (item.quantity || 0) * (item.unitPrice || 0),
          0
        );
      } else {
        itemsTotal = Number(t.subtotal) || transactionTotal;
      }

      const charges = [];
      const loading = Number(t.loading) || 0;
      const transport = Number(t.transportFare) || 0;
      const loadingOffloading = Number(t.loadingAndOffloading) || 0;

      if (loading > 0) charges.push({ label: "Loading", amount: loading });
      if (transport > 0)
        charges.push({ label: "Transport", amount: transport });
      if (loadingOffloading > 0)
        charges.push({
          label: "Loading/Offloading",
          amount: loadingOffloading,
        });

      const extraChargesList: { name: string; amount: number }[] = t.extraCharges || [];
      let extraChargesTotal = 0;
      extraChargesList.forEach((charge) => {
        if (charge.amount > 0) {
          charges.push({ label: charge.name, amount: charge.amount });
          extraChargesTotal += charge.amount;
        }
      });

      const discount = Number(t.discount) || 0;
      const calculatedExpectedTotal =
        itemsTotal + loading + transport + loadingOffloading + extraChargesTotal - discount;
      const discrepancy = transactionTotal - calculatedExpectedTotal;

      if (discrepancy > 1) {
        charges.push({ label: "Other Charges", amount: discrepancy });
      }

      // Block Height Calculation
      const headerHeight = 8;
      const itemLineHeight = 6;
      const itemTableHeaderHeight = 5;
      const chargesLineHeight = 6;
      const discountLineHeight = 6;
      const subTotalHeight = 10;
      const itemsCount = txn.items?.length || 1;

      let totalBlockHeight =
        headerHeight +
        (txn.items && txn.items.length > 0 ? itemTableHeaderHeight : 0) +
        itemsCount * itemLineHeight +
        charges.length * chargesLineHeight +
        subTotalHeight +
        5;

      if (discount > 0) totalBlockHeight += discountLineHeight;

      checkPageBreak(totalBlockHeight);

      // Header
      doc.setFillColor(252, 240, 242);
      doc.rect(margin, cursorY, pageWidth - margin * 2, headerHeight, "F");
      doc.setFillColor(204, 0, 0);
      doc.rect(margin, cursorY, 1.5, headerHeight, "F");

      doc.setFont("helvetica", "normal");
      doc.setTextColor(204, 0, 0);
      doc.text(
        `${t.type === "WHOLESALE" ? "Wholesale Supplied" : "Materials Supplied"} on ${formatDate(getTransactionDate(txn))}`,
        margin + 4,
        cursorY + 5.5
      );

      // Invoice & waybill numbers — right side of header
      const refParts: string[] = [];
      if (t.invoiceNumber) refParts.push(t.invoiceNumber);
      if (t.waybillNumber) refParts.push(t.waybillNumber);
      if (refParts.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(80, 80, 80);
        doc.text(refParts.join("  |  "), pageWidth - margin - 4, cursorY + 5.5, { align: "right" });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
      }

      cursorY += headerHeight + 3;

      // Items
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);

      const colQty = margin + 4;
      const colDesc = margin + 18;
      const colRate = pageWidth - margin - 28;
      const colAmount = pageWidth - margin - 4;

      if (txn.items && txn.items.length > 0) {
        // Table header row
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(130, 130, 130);
        doc.text("Qty", colQty, cursorY);
        doc.text("Description", colDesc, cursorY);
        doc.text("Rate", colRate, cursorY, { align: "right" });
        doc.text("Amount", colAmount, cursorY, { align: "right" });
        cursorY += itemTableHeaderHeight;

        // Item rows
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        txn.items.forEach((item) => {
          const qty = item.quantity || 0;
          const price = item.unitPrice || 0;
          const descText = (`${itemDisplayName(item.productName, item.variantName)} (${item.unit})`)?.toUpperCase() || "ITEM";
          doc.text(String(qty), colQty, cursorY);
          doc.text(descText, colDesc, cursorY);
          doc.text(formatCurrencyForPDF(price), colRate, cursorY, { align: "right" });
          doc.text(formatCurrencyForPDF(qty * price), colAmount, cursorY, { align: "right" });
          cursorY += itemLineHeight;
        });
      } else {
        doc.text(txn.description || "Items supplied", margin + 4, cursorY);
        doc.text(
          formatCurrencyForPDF(itemsTotal),
          pageWidth - margin - 4,
          cursorY,
          { align: "right" }
        );
        cursorY += itemLineHeight;
      }

      // Charges
      charges.forEach((charge) => {
        doc.text(charge.label, margin + 4, cursorY);
        doc.text(
          formatCurrencyForPDF(charge.amount),
          pageWidth - margin - 4,
          cursorY,
          { align: "right" }
        );
        cursorY += chargesLineHeight;
      });

      // Discount
      if (discount > 0) {
        doc.text("Discount", margin + 4, cursorY);
        doc.text(
          `-${formatCurrencyForPDF(discount)}`,
          pageWidth - margin - 4,
          cursorY,
          { align: "right" }
        );
        cursorY += discountLineHeight;
      }

      // Subtotal
      doc.setFillColor(252, 240, 242);
      doc.rect(margin, cursorY, pageWidth - margin * 2, subTotalHeight, "F");
      doc.setFont("helvetica", "bold");
      doc.setTextColor(204, 0, 0);
      doc.text(
        `SUB TOTAL: ${formatCurrencyForPDF(transactionTotal)}`,
        pageWidth - margin - 4,
        cursorY + 6.5,
        { align: "right" }
      );
      cursorY += subTotalHeight + 6;
    });

    // --- 4. GRAND TOTAL ---
    checkPageBreak(15);
    doc.setFillColor(204, 0, 0);
    doc.rect(margin, cursorY, pageWidth - margin * 2, 12, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(
      `GRAND TOTAL: ${formatCurrencyForPDF(runningTotalForGrand)}`,
      pageWidth - margin - 4,
      cursorY + 8,
      { align: "right" }
    );
    cursorY += 18;

    // --- 5. LESS SECTION ---
    const lessSectionHeaderHeight = 10;
    checkPageBreak(lessSectionHeaderHeight + 5);

    doc.setFillColor(252, 240, 242);
    doc.rect(
      margin,
      cursorY,
      pageWidth - margin * 2,
      lessSectionHeaderHeight,
      "F"
    );
    doc.setFillColor(204, 0, 0);
    doc.rect(margin, cursorY, 1.5, lessSectionHeaderHeight, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(204, 0, 0);
    doc.text("Less:", margin + 5, cursorY + 7);
    cursorY += lessSectionHeaderHeight;

    let totalDeductions = 0;

    // LOGIC: If user has Positive Balance (Credit), render it here in 'Less'
    if (isCredit) {
      totalDeductions += absInitialBalance;
      const itemHeight = 18;
      checkPageBreak(itemHeight);

      doc.setFillColor(224, 224, 224);
      doc.rect(margin, cursorY, pageWidth - margin * 2, itemHeight, "F");
      doc.setFillColor(150, 150, 150);
      doc.rect(margin, cursorY, 1.5, itemHeight, "F");

      doc.setFillColor(224, 224, 224);
      doc.rect(margin + 5, cursorY + 2, 35, 6, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(51, 51, 51);
      doc.text(`On ${formatDate(startDate)}`, margin + 7, cursorY + 6);

      doc.setFontSize(9);
      const description = "Opening Balance (User Credit): ";
      const valStr = formatCurrencyForPDF(absInitialBalance);
      
      const descriptionWidth =
        (doc.getStringUnitWidth(description) * doc.getFontSize()) /
        doc.internal.scaleFactor;
      const startX = margin + 7;
      const textY = cursorY + 12;

      doc.setTextColor(68, 68, 68);
      doc.text(description, startX, textY);
      doc.setTextColor(46, 204, 113);
      doc.text(valStr, startX + descriptionWidth, textY);

      doc.setDrawColor(230, 230, 230);
      doc.line(margin + 5, cursorY + 16, pageWidth - margin - 5, cursorY + 16);
      cursorY += itemHeight;
    }

    sortedTxns.forEach((txn) => {
      const rawTxn = mergedTransactions.find((t) => t._id === txn._id) || txn;
      const t = rawTxn as any;
      const displayItems = [];

      if (t.type === "DEPOSIT") {
        const amount = Number(t.total) || 0;
        totalDeductions += amount;
        const depositMethod = t.paymentMethod ? ` (${t.paymentMethod})` : "";
        displayItems.push({
          description: `Deposited${depositMethod}: `,
          value: formatCurrencyForPDF(amount),
          isReturn: false,
        });
      } else if (t.type === "RETURN") {
        if (t.items && t.items.length > 0) {
          const returnTotal = Number(t.actualAmountReturned) || 0;
          totalDeductions += returnTotal;

          const retHeaderHeight = 8;
          const retItemTableHeaderHeight = 5;
          const retItemLineHeight = 6;
          const retSubTotalHeight = 10;
          const retBlockHeight =
            retHeaderHeight + 3 + retItemTableHeaderHeight +
            t.items.length * retItemLineHeight + retSubTotalHeight + 6;

          checkPageBreak(retBlockHeight);

          // Header bar
          doc.setFillColor(252, 240, 242);
          doc.rect(margin, cursorY, pageWidth - margin * 2, retHeaderHeight, "F");
          doc.setFillColor(140, 28, 19);
          doc.rect(margin, cursorY, 1.5, retHeaderHeight, "F");
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(204, 0, 0);
          doc.text(`Items Returned on ${formatDate(getTransactionDate(txn))}`, margin + 4, cursorY + 5.5);

          if (t.invoiceNumber) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7.5);
            doc.setTextColor(80, 80, 80);
            doc.text(t.invoiceNumber, pageWidth - margin - 4, cursorY + 5.5, { align: "right" });
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
          }
          cursorY += retHeaderHeight + 3;

          // Table column headers
          const colQty = margin + 4;
          const colDesc = margin + 18;
          const colRate = pageWidth - margin - 28;
          const colAmount = pageWidth - margin - 4;

          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          doc.setTextColor(130, 130, 130);
          doc.text("Qty", colQty, cursorY);
          doc.text("Description", colDesc, cursorY);
          doc.text("Rate", colRate, cursorY, { align: "right" });
          doc.text("Amount", colAmount, cursorY, { align: "right" });
          cursorY += retItemTableHeaderHeight;

          // Item rows
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(80, 80, 80);
          t.items.forEach((item: any) => {
            const qty = item.quantity || 0;
            const rate = item.unitPrice || 0;
            const amount = Number(item.subtotal) || qty * rate;
            const descText = (`${itemDisplayName(item.productName, item.variantName)} (${item.unit})`)?.toUpperCase() || "ITEM";
            doc.text(String(qty), colQty, cursorY);
            doc.text(descText, colDesc, cursorY);
            doc.text(formatCurrencyForPDF(rate), colRate, cursorY, { align: "right" });
            doc.text(formatCurrencyForPDF(amount), colAmount, cursorY, { align: "right" });
            cursorY += retItemLineHeight;
          });

          // Amount returned footer
          doc.setFillColor(252, 240, 242);
          doc.rect(margin, cursorY, pageWidth - margin * 2, retSubTotalHeight, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(204, 0, 0);
          doc.text(
            `AMOUNT RETURNED: ${formatCurrencyForPDF(returnTotal)}`,
            pageWidth - margin - 4,
            cursorY + 6.5,
            { align: "right" }
          );
          cursorY += retSubTotalHeight + 6;
        } else {
          // Fallback: no items stored, show total
          const amount = Number(t.actualAmountReturned) || Number(t.total) || 0;
          totalDeductions += amount;
          displayItems.push({
            description: `(Returned items): `,
            value: formatCurrencyForPDF(amount),
            isReturn: true,
          });
        }
      } else if (
        (t.type === "PURCHASE" || t.type === "PICKUP" || t.type === "WHOLESALE") &&
        (Number(t.amountPaid) || 0) > 0
      ) {
        const paid = Number(t.amountPaid);
        totalDeductions += paid;
        const payMethod = t.paymentMethod ? ` (${t.paymentMethod})` : "";
        displayItems.push({
          description: `Payment${payMethod}: `,
          value: formatCurrencyForPDF(paid),
          isReturn: false,
        });
      }

      displayItems.forEach((item) => {
        const itemHeight = 18;
        checkPageBreak(itemHeight);

        doc.setFillColor(224, 224, 224);
        doc.rect(margin, cursorY, pageWidth - margin * 2, itemHeight, "F");
        doc.setFillColor(150, 150, 150);
        doc.rect(margin, cursorY, 1.5, itemHeight, "F");

        doc.setFillColor(224, 224, 224);
        doc.rect(margin + 5, cursorY + 2, 35, 6, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(51, 51, 51);
        doc.text(
          `On ${formatDate(getTransactionDate(txn))}`,
          margin + 7,
          cursorY + 6
        );

        doc.setFontSize(9);
        const descriptionWidth =
          (doc.getStringUnitWidth(item.description) * doc.getFontSize()) /
          doc.internal.scaleFactor;
        const startX = margin + 7;
        const textY = cursorY + 12;

        doc.setTextColor(68, 68, 68);
        doc.text(item.description, startX, textY);
        doc.setTextColor(item.isReturn ? 231 : 46, item.isReturn ? 76 : 204, item.isReturn ? 60 : 113);
        doc.text(item.value, startX + descriptionWidth, textY);

        doc.setDrawColor(230, 230, 230);
        doc.line(
          margin + 5,
          cursorY + 16,
          pageWidth - margin - 5,
          cursorY + 16
        );
        cursorY += itemHeight;
      });
    });
    cursorY += 5;

    // --- 6. BALANCE ---
    checkPageBreak(12);
    // finalBalance already computed above from the backend snapshot

    let balanceLabel = "BALANCE";
    if (finalBalance < 0) balanceLabel = "BALANCE (DEBT)";
    else if (finalBalance > 0) balanceLabel = "BALANCE (CREDIT)";

    const balanceTextColor: [number, number, number] =
      finalBalance > 0 ? [46, 204, 113] : [204, 0, 0];
    const balanceFillColor: [number, number, number] =
      finalBalance > 0 ? [232, 250, 240] : [252, 240, 242];
    const balanceBorderColor: [number, number, number] =
      finalBalance > 0 ? [46, 204, 113] : [204, 0, 0];

    doc.setFillColor(...balanceFillColor);
    doc.rect(margin, cursorY, pageWidth - margin * 2, 12, "F");
    doc.setFillColor(...balanceBorderColor);
    doc.rect(margin, cursorY, 1.5, 12, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...balanceTextColor);
    doc.text(
      `${balanceLabel}: ${formatCurrencyForPDF(finalBalance)}`,
      pageWidth - margin - 4,
      cursorY + 8,
      { align: "right" }
    );

    // --- 7. CURRENT BALANCE (only when filter excludes the latest transaction) ---
    const latestClientTxn = allClientTransactions[0]; // already sorted newest first
    const isLatestIncluded = latestClientTxn
      ? sortedTxns.some((t) => t._id === latestClientTxn._id)
      : true;

    if (!isLatestIncluded) {
      cursorY += 16;
      checkPageBreak(12);

      const currentBalanceLabel =
        currentBalance > 0
          ? "CURRENT BALANCE (CREDIT)"
          : currentBalance < 0
          ? "CURRENT BALANCE (DEBT)"
          : "CURRENT BALANCE";

      doc.setFillColor(230, 240, 255);
      doc.rect(margin, cursorY, pageWidth - margin * 2, 12, "F");
      doc.setFillColor(46, 110, 247);
      doc.rect(margin, cursorY, 1.5, 12, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(51, 51, 51);
      doc.text(
        `${currentBalanceLabel}: ${formatCurrencyForPDF(currentBalance)}`,
        pageWidth - margin - 4,
        cursorY + 8,
        { align: "right" }
      );
    }

    // --- FOOTER ---
    const footerY = pageHeight - 15;
    doc.setDrawColor(204, 0, 0);
    doc.setLineWidth(0.4);
    doc.line(margin, footerY, pageWidth - margin, footerY);
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text("This is a system-generated statement", pageWidth / 2, footerY + 4, { align: "center" });
    doc.text("For inquiries, please contact your account manager", pageWidth / 2, footerY + 8, { align: "center" });
    doc.text(`Statement Date: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`, pageWidth / 2, footerY + 12, { align: "center" });

    doc.save(`Statement_${client?.name || "Client"}.pdf`);
  };

  // Get unique staff members for filter dropdown
  const staffMembers = useMemo(() => {
    const uniqueStaff = Array.from(
      new Set(
        mergedTransactions
          .filter((t) => t.client?._id === clientId)
          .map((t) => t.userId?.name)
          .filter(Boolean)
      )
    );
    return uniqueStaff;
  }, [mergedTransactions, clientId]);

  const handleSelection = (value: string) => {
    switch (value) {
      case "edit":
        setShowEditDialog(true);
        break;
      case "suspend":
      case "unsuspend":
        setShowBlockUnblockDialog(true);
        break;
      case "delete":
        setShowDialog(true);
        break;
      default:
        break;
    }
    setClientMenuValue("");
  };

  const handleBlockUnblockSuccess = () => {
    const action = isClientBlocked ? "unblocked" : "blocked";
    toast.success(`Client ${action} successfully`);
  };

  const handleDeleteSuccess = () => {
    toast.success(`${client?.name} deleted successfully `);
    navigate(-1);
  };
  const handleEditSuccess = () => {
    toast.success(`${client?.name} edited successfully `);
  };

  const handleApplyFilters = () => {
    // Filters are applied automatically via useMemo
  };

  const handleResetFilters = () => {
    setTransactionTypeFilter("all");
    setStaffFilter("all-staff");
    setDateRangeFilter({ from: undefined, to: undefined });
  };

  // Loading states
  if (transactionsLoading || !clients || clients.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2ECC71] mx-auto mb-4"></div>
          <p>Loading data...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Client not found</h2>
          <p className="text-gray-600 mb-4">
            The client you're looking for doesn't exist.
          </p>
          <Button onClick={() => navigate(-1)}>Back to Clients</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="grid md:grid-cols-5 grid-cols-1 items-center  md:px-10 sticky top-0 bg-white z-10 border-b border-[#D9D9D9]">
        <div className="flex gap-5 justify-between md:justify-start col-span-2 md:col-span-2 px-5 md:px-0">
          <button
            onClick={() => navigate(-1)}
            className="flex gap-1 items-center text-[#7D7D7D] cursor-pointer"
          >
            <ChevronLeft />
            <span>Back</span>
          </button>
          <p className="lg:text-lg text-sm text-[#1E1E1E]">
            Client Account Management
          </p>
        </div>
        <div className="flex justify-end gap-4 my-2 md:mx-7 col-span-3 md:col-span-3 border-t-[#D9D9D9] md:border-none border-t-2 pt-2 md:pt-0 transition-all px-5 md:px-0">
          <Button
            className="bg-white hover:bg-gray-100 text-text-dark border border-[#7D7D7D] font-medium px-4 hover:text-[#2E6EF7] hover:shadow-sm hover:-translate-y-[1px]"
            onClick={handleExportPDF}
          >
            <span>Export data</span>
          </Button>
          {isSuperAdmin && (
            <Select value={clientMenuValue} onValueChange={handleSelection}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Edit Client"></SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel></SelectLabel>
                  <SelectItem value="edit">Edit Client</SelectItem>
                  <SelectItem value={isClientBlocked ? "unsuspend" : "suspend"}>
                    {isClientBlocked ? "Unsuspend Client" : "Suspend Client"}
                  </SelectItem>
                  <SelectItem value="delete">Delete Client</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        </div>
      </header>

      {/* main content */}
      <main className="grid gap-3 bg-[#F5F5F5] py-5 px-3 md:px-9 grid-cols-1 lg:grid-cols-5">
        {/* section by the left */}
        <div className=" lg:col-span-2">
          {displayClient && <ClientDetailInfo client={displayClient} transactions={allClientTransactions} />}
        </div>

        {/* section by the right */}
        <section className="lg:-translate-x-28 max-w-[793px] bg-white py-8 px-5  lg:col-span-3">
          <Tabs className="space-y-4" defaultValue="clientTransaction">
            <TabsList className="flex gap-2 lg:justify-start justify-evenly ">
              <TabsTrigger value="clientTransaction">Transaction</TabsTrigger>
              <TabsTrigger value="clientDiscount">Discount</TabsTrigger>
            </TabsList>

            <TabsContent value="clientTransaction">
              {/* data */}
              <div className="flex flex-wrap justify-start items-end w-full gap-3 mb-10">
                <div className="flex flex-col justify-end min-w-[250px]">
                  <DateFromToPicker
                    date={dateRangeFilter}
                    onDateChange={(range) =>
                      setDateRangeFilter(range || { from: undefined, to: undefined })
                    }
                  />
                </div>

                <div className="flex flex-col w-[179px]">
                  <label className="mb-2 text-xs font-medium text-[#7D7D7D]">
                    Transaction type
                  </label>
                  <Select
                    value={transactionTypeFilter}
                    onValueChange={setTransactionTypeFilter}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Transactions" />
                    </SelectTrigger>
                    <SelectContent className="text-[#444444]">
                      <SelectItem value="all">All transactions</SelectItem>
                      <SelectItem value="purchase">Purchase</SelectItem>
                      <SelectItem value="deposit">Deposit</SelectItem>
                      <SelectItem value="return">Return</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col w-[180px]">
                  <label className="mb-2 text-xs font-medium text-[#7D7D7D]">
                    Staff member
                  </label>
                  <Select value={staffFilter} onValueChange={setStaffFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Staff" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-staff">All Staff</SelectItem>
                      {staffMembers.map((staff) => (
                        <SelectItem key={staff} value={staff}>
                          {staff}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col justify-end">
                  <Button
                    className="bg-[#2ECC71] hover:bg-[#27ae60] text-white font-medium px-4"
                    onClick={handleApplyFilters}
                  >
                    Apply filters
                  </Button>
                </div>

                <div className="flex flex-col justify-end">
                  <Button
                    className="bg-white hover:bg-gray-100 text-text-dark border border-[#7D7D7D] font-medium px-4 hover:text-[#2E6EF7] hover:shadow-sm hover:-translate-y-[1px]"
                    onClick={handleResetFilters}
                  >
                    Reset filters
                  </Button>
                </div>              </div>

              <ClientTransactionDetails
                clientTransactions={transactionsWithBalance}
                client={{ balance: currentBalance }}
              />
            </TabsContent>
            <TabsContent value="clientDiscount">
              <ClientDiscountDetails clientTransactions={clientTransactions} />
            </TabsContent>
          </Tabs>
        </section>
      </main>
      <DeleteClientDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        client={client}
        onDeleteSuccess={handleDeleteSuccess}
      />
      <EditClientDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        client={client}
        onEditSuccess={handleEditSuccess}
      />

      <BlockUnblockClient
        open={showBlockUnblockDialog}
        onOpenchange={setShowBlockUnblockDialog}
        client={client}
        isBlocked={isClientBlocked}
        onSuccess={handleBlockUnblockSuccess}
      />
    </>
  );
};

export default ClientDetailsPage;