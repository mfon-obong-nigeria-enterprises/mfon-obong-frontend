/** @format */

import React, { useMemo } from "react";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import {
  computeDebtCycles,
  computeOpeningBalance,
  type DebtCycle,
} from "@/utils/computeDebtCycles";
import { getTransactionDate } from "@/utils/transactions";
import { isSubUnitItem, itemDisplayName } from "@/utils/itemDisplay";

interface DebtCyclesModalProps {
  isOpen: boolean;
  onClose: () => void;
  allClientTransactions: any[];
  client: { name: string };
  currentBalance: number;
}

const DebtCyclesModal: React.FC<DebtCyclesModalProps> = ({
  isOpen,
  onClose,
  allClientTransactions,
  client,
  currentBalance,
}) => {
  const chronologicalTxns = useMemo(() => {
    return [...allClientTransactions].sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt).getTime();
      const dateB = new Date(b.date || b.createdAt).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [allClientTransactions]);

  const openingBalance = useMemo(
    () => computeOpeningBalance(chronologicalTxns, currentBalance),
    [chronologicalTxns, currentBalance]
  );

  const cycles = useMemo(
    () => computeDebtCycles(chronologicalTxns, openingBalance),
    [chronologicalTxns, openingBalance]
  );

  const formatDisplayDate = (date: Date | null) => {
    if (!date) return "Present";
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const exportCyclePDF = async (cycle: DebtCycle, cycleIndex: number) => {
    const cycleOpeningBalance = cycleIndex === 0 ? openingBalance : 0;
    const cycleFinalBalance = cycle.isOngoing ? currentBalance : 0;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;
    let cursorY = 15;

    // Load logo
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
      // Continue without logo
    }

    const fmt = (amount: number) => {
      const val = new Intl.NumberFormat("en-NG", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Math.abs(amount));
      return `N${val}`;
    };

    const fmtDate = (date: Date) =>
      date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "numeric",
        year: "2-digit",
      });

    const checkPageBreak = (needed: number) => {
      if (cursorY + needed > pageHeight - margin) {
        doc.addPage();
        cursorY = margin;
      }
    };

    // --- HEADER ---
    const logoSize = 20;
    const headerTopY = cursorY;
    if (logoBase64) {
      doc.addImage(logoBase64, "PNG", margin, headerTopY, logoSize, logoSize);
    }

    doc.setFont("helvetica", "italic");
    doc.setFontSize(6);
    doc.setTextColor(80, 80, 80);
    doc.text("Motto: TRUTH IS SUCCESS", margin, headerTopY + logoSize + 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.text("RC. BN2801551", margin, headerTopY + logoSize + 8);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(204, 0, 0);
    doc.text(
      "MFON-OBONG NIGERIA ENTERPRISES",
      pageWidth / 2,
      headerTopY + 8,
      { align: "center" }
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(80, 80, 80);
    const descriptionText =
      "Building Materials Merchant, General Contractors, Transporters, Dealers and Suppliers of all types of " +
      "Construction Materials such as Wood of all sizes, Cement, Rods, Zinc, Ceiling Board, Aluminium Products, " +
      "Importer and Exporter of General goods etc.";
    const textStartX = margin + logoSize + 6;
    const descLines = doc.splitTextToSize(
      descriptionText,
      pageWidth - textStartX - margin
    );
    doc.text(descLines, textStartX, headerTopY + 14);

    cursorY = headerTopY + logoSize + 12;

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.4);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 5;

    // Address columns
    const contentWidth = pageWidth - margin * 2;
    const colWidth = contentWidth / 4;
    const addresses = [
      {
        label: "HEAD OFFICE:",
        lines: [
          "LUS/TM NO. 24/25,",
          "Timber Market, Utu Edem",
          "Usung, Ikot Ekpene,",
          "Akwa Ibom State",
        ],
      },
      {
        label: "UYO (Shelter Afrique):",
        lines: ["Plot 32 Block 1,", "Shelter Afrique,", "Uyo, Akwa Ibom State"],
      },
      {
        label: "UYO (Oron Road):",
        lines: [
          "Km 7 Oron Road,",
          "(by 1st U-Turn after",
          "Custom Office),",
          "Uyo, Akwa Ibom State",
        ],
      },
      {
        label: "UYO (Idoro Road):",
        lines: [
          "Idoro Road,",
          "(By Pepsi Junction),",
          "Uyo, Akwa Ibom State",
        ],
      },
    ];

    const addrLineHeight = 3.8;
    const addrStartY = cursorY;
    addresses.forEach((addr, i) => {
      const x = margin + i * colWidth;
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

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(60, 60, 60);
    doc.text("Tel: 0802-472-0210,  0703-436-7795", margin, cursorY);
    cursorY += 6;

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.4);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 6;

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(204, 0, 0);
    doc.text("Account Statement", pageWidth / 2, cursorY + 5, {
      align: "center",
    });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text("Materials Supply Record", pageWidth / 2, cursorY + 11, {
      align: "center",
    });
    cursorY += 18;

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.4);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 8;

    // --- DATA PREP ---
    // Sort cycle transactions newest-first for the PDF (matches the existing full-statement layout)
    const cycleTxns = [...cycle.transactions].sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt).getTime();
      const dateB = new Date(b.date || b.createdAt).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const cycleSupplies = cycleTxns.filter(
      (t) =>
        t.type === "PURCHASE" ||
        t.type === "PICKUP" ||
        t.type === "WHOLESALE"
    );

    const isDebt = cycleOpeningBalance < 0;
    const isCredit = cycleOpeningBalance > 0;
    const absOpenBal = Math.abs(cycleOpeningBalance);

    // Client name + cycle label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(51, 51, 51);
    doc.text(client.name || "", pageWidth - margin, cursorY, {
      align: "right",
    });
    cursorY += 6;

    const periodStart = cycle.startDate;
    const periodEnd = cycle.endDate || new Date();
    const startYear = periodStart.getFullYear();
    const endYear = periodEnd.getFullYear();
    const startMonth = periodStart.toLocaleDateString("en-US", {
      month: "long",
    });
    const endMonth = periodEnd.toLocaleDateString("en-US", { month: "long" });
    let dateRangeText = "";
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
    doc.text(
      `Cycle ${cycle.cycleNumber} — ${dateRangeText}`,
      margin,
      cursorY
    );
    doc.setTextColor(51, 51, 51);
    cursorY += 10;

    let runningTotalForGrand = isDebt ? absOpenBal : 0;

    // B/F Debt box (only when cycle 1 carries forward a prior debt)
    if (isDebt) {
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, cursorY, pageWidth - margin * 2, 10, "F");
      doc.setFillColor(0, 0, 0);
      doc.rect(margin, cursorY, 1.5, 10, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(51, 51, 51);
      doc.text(
        `B/F Debt - ${fmtDate(periodStart)}: ${fmt(absOpenBal)}`,
        margin + 4,
        cursorY + 6.5
      );
      cursorY += 18;
    }

    // --- SUPPLIES LOOP ---
    cycleSupplies.forEach((txn) => {
      const t = txn as any;
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

      const charges: { label: string; amount: number }[] = [];
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

      const extraChargesList: { name: string; amount: number }[] =
        t.extraCharges || [];
      let extraChargesTotal = 0;
      extraChargesList.forEach((charge) => {
        if (charge.amount > 0) {
          charges.push({ label: charge.name, amount: charge.amount });
          extraChargesTotal += charge.amount;
        }
      });

      const discount = Number(t.discount) || 0;
      const calculatedExpectedTotal =
        itemsTotal +
        loading +
        transport +
        loadingOffloading +
        extraChargesTotal -
        discount;
      const discrepancy = transactionTotal - calculatedExpectedTotal;
      if (discrepancy > 1)
        charges.push({ label: "Other Charges", amount: discrepancy });

      const headerHeight = 8;
      const itemLineHeight = 6;
      const itemTableHeaderHeight = 5;
      const chargesLineHeight = 6;
      const discountLineHeight = 6;
      const subTotalHeight = 10;
      const itemsCount = t.items?.length || 1;
      let totalBlockHeight =
        headerHeight +
        (t.items && t.items.length > 0 ? itemTableHeaderHeight : 0) +
        itemsCount * itemLineHeight +
        charges.length * chargesLineHeight +
        subTotalHeight +
        5;
      if (discount > 0) totalBlockHeight += discountLineHeight;
      checkPageBreak(totalBlockHeight);

      doc.setFillColor(240, 240, 240);
      doc.rect(margin, cursorY, pageWidth - margin * 2, headerHeight, "F");
      doc.setFillColor(0, 0, 0);
      doc.rect(margin, cursorY, 1.5, headerHeight, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(204, 0, 0);
      doc.text(
        `${t.type === "WHOLESALE" ? "Wholesale Supplied" : "Materials Supplied"} on ${fmtDate(getTransactionDate(txn))}`,
        margin + 4,
        cursorY + 5.5
      );

      const refParts: string[] = [];
      if (t.invoiceNumber) refParts.push(t.invoiceNumber);
      if (t.waybillNumber) refParts.push(t.waybillNumber);
      if (refParts.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(80, 80, 80);
        doc.text(
          refParts.join("  |  "),
          pageWidth - margin - 4,
          cursorY + 5.5,
          { align: "right" }
        );
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
      }
      cursorY += headerHeight + 3;

      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      const colQty = margin + 4;
      const colDesc = margin + 42;
      const colRate = pageWidth - margin - 28;
      const colAmount = pageWidth - margin - 4;

      if (t.items && t.items.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(130, 130, 130);
        doc.text("Qty", colQty, cursorY);
        doc.text("Description", colDesc, cursorY);
        doc.text("Rate(N)", colRate, cursorY, { align: "right" });
        doc.text("Amount(N)", colAmount, cursorY, { align: "right" });
        cursorY += itemTableHeaderHeight;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        t.items.forEach((item: any) => {
          const qty = item.quantity || 0;
          const price = item.unitPrice || 0;
          const amount = Number(item.subtotal) || qty * price;
          const isSub = isSubUnitItem(item.bundlesQty, item.kgQty);
          const isType1Sub = isSub && item.subUnitIsSellUnit;
          const baseName = itemDisplayName(item.productName, item.variantName);
          const qtyLabel = isType1Sub
            ? String(item.kgQty ?? qty)
            : isSub
            ? "1"
            : String(item.bundlesQty ?? qty);
          const descText = isType1Sub
            ? `${item.subUnit ?? ""} of ${baseName}`.toUpperCase()
            : isSub
            ? `${item.kgQty}${item.subUnit ?? "kg"} of ${baseName}`.toUpperCase()
            : item.unit
            ? `${item.unit} of ${baseName}`.toUpperCase()
            : baseName.toUpperCase();
          doc.text(qtyLabel, colQty, cursorY);
          doc.text(descText, colDesc, cursorY);
          doc.text(
            fmt(isSub ? amount : price).slice(1),
            colRate,
            cursorY,
            { align: "right" }
          );
          doc.text(fmt(amount).slice(1), colAmount, cursorY, {
            align: "right",
          });
          cursorY += itemLineHeight;
        });
      } else {
        doc.text(t.description || "Items supplied", margin + 4, cursorY);
        doc.text(fmt(itemsTotal), pageWidth - margin - 4, cursorY, {
          align: "right",
        });
        cursorY += itemLineHeight;
      }

      charges.forEach((charge) => {
        doc.text(charge.label, margin + 4, cursorY);
        doc.text(fmt(charge.amount), pageWidth - margin - 4, cursorY, {
          align: "right",
        });
        cursorY += chargesLineHeight;
      });

      if (discount > 0) {
        doc.text("Discount", margin + 4, cursorY);
        doc.text(`-${fmt(discount)}`, pageWidth - margin - 4, cursorY, {
          align: "right",
        });
        cursorY += discountLineHeight;
      }

      doc.setFillColor(240, 240, 240);
      doc.rect(margin, cursorY, pageWidth - margin * 2, subTotalHeight, "F");
      doc.setFont("helvetica", "bold");
      doc.setTextColor(204, 0, 0);
      doc.text(
        `SUB TOTAL: ${fmt(transactionTotal)}`,
        pageWidth - margin - 4,
        cursorY + 6.5,
        { align: "right" }
      );
      cursorY += subTotalHeight + 6;
    });

    // --- GRAND TOTAL ---
    checkPageBreak(15);
    doc.setFillColor(204, 0, 0);
    doc.rect(margin, cursorY, pageWidth - margin * 2, 12, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(
      `GRAND TOTAL: ${fmt(runningTotalForGrand)}`,
      pageWidth - margin - 4,
      cursorY + 8,
      { align: "right" }
    );
    cursorY += 18;

    // --- LESS SECTION ---
    const lessSectionHeaderHeight = 10;
    checkPageBreak(lessSectionHeaderHeight + 5);
    doc.setFillColor(240, 240, 240);
    doc.rect(
      margin,
      cursorY,
      pageWidth - margin * 2,
      lessSectionHeaderHeight,
      "F"
    );
    doc.setFillColor(0, 0, 0);
    doc.rect(margin, cursorY, 1.5, lessSectionHeaderHeight, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(204, 0, 0);
    doc.text("Less:", margin + 5, cursorY + 7);
    cursorY += lessSectionHeaderHeight;

    // Credit opening balance shows in Less section
    if (isCredit) {
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
      doc.text(`On ${fmtDate(periodStart)}`, margin + 7, cursorY + 6);
      doc.setFontSize(9);
      const creditDesc = "Opening Balance (User Credit): ";
      const creditVal = fmt(absOpenBal);
      const creditDescWidth =
        (doc.getStringUnitWidth(creditDesc) * doc.getFontSize()) /
        doc.internal.scaleFactor;
      const creditStartX = margin + 7;
      const creditTextY = cursorY + 12;
      doc.setTextColor(68, 68, 68);
      doc.text(creditDesc, creditStartX, creditTextY);
      doc.setTextColor(46, 204, 113);
      doc.text(creditVal, creditStartX + creditDescWidth, creditTextY);
      doc.setDrawColor(230, 230, 230);
      doc.line(
        margin + 5,
        cursorY + 16,
        pageWidth - margin - 5,
        cursorY + 16
      );
      cursorY += itemHeight;
    }

    cycleTxns.forEach((txn) => {
      const t = txn as any;
      const displayItems: {
        description: string;
        value: string;
        isReturn: boolean;
      }[] = [];

      if (t.type === "DEPOSIT") {
        const amount = Number(t.total) || 0;
        const depositMethod = t.paymentMethod ? ` (${t.paymentMethod})` : "";
        displayItems.push({
          description: `Deposited${depositMethod}: `,
          value: fmt(amount),
          isReturn: false,
        });
      } else if (t.type === "RETURN") {
        if (t.items && t.items.length > 0) {
          const returnTotal = Number(t.actualAmountReturned) || 0;

          const retHeaderHeight = 8;
          const retItemTableHeaderHeight = 5;
          const retItemLineHeight = 6;
          const retSubTotalHeight = 10;
          const retBlockHeight =
            retHeaderHeight +
            3 +
            retItemTableHeaderHeight +
            t.items.length * retItemLineHeight +
            retSubTotalHeight +
            6;
          checkPageBreak(retBlockHeight);

          doc.setFillColor(240, 240, 240);
          doc.rect(
            margin,
            cursorY,
            pageWidth - margin * 2,
            retHeaderHeight,
            "F"
          );
          doc.setFillColor(0, 0, 0);
          doc.rect(margin, cursorY, 1.5, retHeaderHeight, "F");
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(204, 0, 0);
          doc.text(
            `Items Returned on ${fmtDate(getTransactionDate(txn))}`,
            margin + 4,
            cursorY + 5.5
          );
          if (t.invoiceNumber) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7.5);
            doc.setTextColor(80, 80, 80);
            doc.text(
              t.invoiceNumber,
              pageWidth - margin - 4,
              cursorY + 5.5,
              { align: "right" }
            );
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
          }
          cursorY += retHeaderHeight + 3;

          const retColQty = margin + 4;
          const retColDesc = margin + 18;
          const retColRate = pageWidth - margin - 28;
          const retColAmount = pageWidth - margin - 4;

          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          doc.setTextColor(130, 130, 130);
          doc.text("Qty", retColQty, cursorY);
          doc.text("Description", retColDesc, cursorY);
          doc.text("Rate(N)", retColRate, cursorY, { align: "right" });
          doc.text("Amount(N)", retColAmount, cursorY, { align: "right" });
          cursorY += retItemTableHeaderHeight;

          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(80, 80, 80);
          t.items.forEach((item: any) => {
            const qty = item.quantity || 0;
            const rate = item.unitPrice || 0;
            const amount = Number(item.subtotal) || qty * rate;
            const isSub = isSubUnitItem(item.bundlesQty, item.kgQty);
            const isType1Sub = isSub && item.subUnitIsSellUnit;
            const baseName = itemDisplayName(
              item.productName,
              item.variantName
            );
            const qtyLabel = isType1Sub
              ? String(item.kgQty ?? qty)
              : isSub
              ? "1"
              : String(item.bundlesQty ?? qty);
            const descText = isType1Sub
              ? `${item.subUnit ?? ""} of ${baseName}`.toUpperCase()
              : isSub
              ? `${item.kgQty}${item.subUnit ?? "kg"} of ${baseName}`.toUpperCase()
              : item.unit
              ? `${item.unit} of ${baseName}`.toUpperCase()
              : baseName.toUpperCase();
            doc.text(qtyLabel, retColQty, cursorY);
            doc.text(descText, retColDesc, cursorY);
            doc.text(
              fmt(isSub ? amount : rate).slice(1),
              retColRate,
              cursorY,
              { align: "right" }
            );
            doc.text(fmt(amount).slice(1), retColAmount, cursorY, {
              align: "right",
            });
            cursorY += retItemLineHeight;
          });

          doc.setFillColor(240, 240, 240);
          doc.rect(
            margin,
            cursorY,
            pageWidth - margin * 2,
            retSubTotalHeight,
            "F"
          );
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(204, 0, 0);
          doc.text(
            `AMOUNT RETURNED: ${fmt(returnTotal)}`,
            pageWidth - margin - 4,
            cursorY + 6.5,
            { align: "right" }
          );
          cursorY += retSubTotalHeight + 6;
        } else {
          const amount =
            Number(t.actualAmountReturned) || Number(t.total) || 0;
          displayItems.push({
            description: "(Returned items): ",
            value: fmt(amount),
            isReturn: true,
          });
        }
      } else if (
        (t.type === "PURCHASE" ||
          t.type === "PICKUP" ||
          t.type === "WHOLESALE") &&
        (Number(t.amountPaid) || 0) > 0
      ) {
        const paid = Number(t.amountPaid);
        const payMethod = t.paymentMethod ? ` (${t.paymentMethod})` : "";
        displayItems.push({
          description: `Payment${payMethod}: `,
          value: fmt(paid),
          isReturn: false,
        });
      }

      displayItems.forEach((dItem) => {
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
          `On ${fmtDate(getTransactionDate(txn))}`,
          margin + 7,
          cursorY + 6
        );
        doc.setFontSize(9);
        const descWidth =
          (doc.getStringUnitWidth(dItem.description) * doc.getFontSize()) /
          doc.internal.scaleFactor;
        const startX = margin + 7;
        const textY = cursorY + 12;
        doc.setTextColor(68, 68, 68);
        doc.text(dItem.description, startX, textY);
        doc.setTextColor(
          dItem.isReturn ? 231 : 46,
          dItem.isReturn ? 76 : 204,
          dItem.isReturn ? 60 : 113
        );
        doc.text(dItem.value, startX + descWidth, textY);
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

    // --- BALANCE ---
    checkPageBreak(12);
    let balanceLabel = "BALANCE";
    if (cycleFinalBalance < 0) balanceLabel = "BALANCE (DEBT)";
    else if (cycleFinalBalance > 0) balanceLabel = "BALANCE (CREDIT)";

    const balanceTextColor: [number, number, number] =
      cycleFinalBalance > 0 ? [46, 204, 113] : [204, 0, 0];
    const balanceFillColor: [number, number, number] =
      cycleFinalBalance > 0 ? [232, 250, 240] : [252, 240, 242];
    const balanceBorderColor: [number, number, number] =
      cycleFinalBalance > 0 ? [46, 204, 113] : [204, 0, 0];

    doc.setFillColor(...balanceFillColor);
    doc.rect(margin, cursorY, pageWidth - margin * 2, 12, "F");
    doc.setFillColor(...balanceBorderColor);
    doc.rect(margin, cursorY, 1.5, 12, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...balanceTextColor);
    doc.text(
      `${balanceLabel}: ${fmt(cycleFinalBalance)}`,
      pageWidth - margin - 4,
      cursorY + 8,
      { align: "right" }
    );

    // --- FOOTER ---
    const footerY = pageHeight - 15;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.4);
    doc.line(margin, footerY, pageWidth - margin, footerY);
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(
      "This is a system-generated statement",
      pageWidth / 2,
      footerY + 4,
      { align: "center" }
    );
    doc.text(
      "For inquiries, please contact your account manager",
      pageWidth / 2,
      footerY + 8,
      { align: "center" }
    );
    doc.text(
      `Statement Date: ${new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })}`,
      pageWidth / 2,
      footerY + 12,
      { align: "center" }
    );

    doc.save(
      `Statement_${client.name}_Cycle${cycle.cycleNumber}.pdf`
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xxl">
      <div className="py-4 px-6">
        <h4 className="text-lg font-semibold text-[#333333] mb-1">
          Debt Cycles
        </h4>
        <p className="text-xs text-[#7D7D7D] mb-5">
          <span className="font-medium text-[#444444]">{client.name}</span> —
          each cycle is a debt period that starts fresh after the balance was
          fully cleared.
        </p>

        {cycles.length === 0 ? (
          <div className="text-center py-10 text-[#7D7D7D] text-sm">
            No transaction history found for this client.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#F5F5F5] text-[#7D7D7D] text-xs">
                  <th className="text-left py-3 px-4 font-medium border-b border-[#D9D9D9]">
                    Cycle
                  </th>
                  <th className="text-left py-3 px-4 font-medium border-b border-[#D9D9D9]">
                    Period
                  </th>
                  <th className="text-left py-3 px-4 font-medium border-b border-[#D9D9D9]">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 font-medium border-b border-[#D9D9D9]">
                    Transactions
                  </th>
                  <th className="text-right py-3 px-4 font-medium border-b border-[#D9D9D9]">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {cycles.map((cycle, idx) => (
                  <tr
                    key={cycle.cycleNumber}
                    className="border-b border-[#D9D9D9] hover:bg-[#FAFAFA] transition-colors"
                  >
                    <td className="py-3 px-4 font-medium text-[#333333]">
                      Cycle {cycle.cycleNumber}
                    </td>
                    <td className="py-3 px-4 text-[#444444] whitespace-nowrap">
                      {formatDisplayDate(cycle.startDate)} –{" "}
                      {formatDisplayDate(cycle.endDate)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                          cycle.isOngoing
                            ? "bg-[#FEF3CD] text-[#B07A00]"
                            : "bg-[#D4EDDA] text-[#155724]"
                        }`}
                      >
                        {cycle.isOngoing ? "Ongoing" : "Cleared"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#7D7D7D]">
                      {cycle.transactions.length} transaction
                      {cycle.transactions.length !== 1 ? "s" : ""}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        className="text-xs bg-white hover:bg-gray-100 text-text-dark border border-[#7D7D7D] font-medium px-3 py-1 h-auto hover:text-[#2E6EF7] hover:border-[#2E6EF7] hover:shadow-sm"
                        onClick={() => exportCyclePDF(cycle, idx)}
                      >
                        Export PDF
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default DebtCyclesModal;
