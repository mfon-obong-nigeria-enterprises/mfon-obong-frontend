import jsPDF from "jspdf";
import type { Transaction } from "@/types/transactions";
import { itemDisplayName } from "@/utils/itemDisplay";

const fmt = (amount: number): string => {
  const val = new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
  return `N${val}`;
};

const fmtDate = (date: Date): string =>
  date.toLocaleDateString("en-GB", { day: "numeric", month: "numeric", year: "2-digit" });

const fmtRole = (role?: string): string => {
  if (!role) return "Staff";
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
};

const drawCompanyHeader = async (doc: jsPDF, pageWidth: number, margin: number, startY: number): Promise<number> => {
  let cursorY = startY;

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
    // continue without logo
  }

  const logoSize = 20;
  const headerTopY = cursorY;

  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", margin, headerTopY, logoSize, logoSize);
  }

  // Motto & RC below logo
  doc.setFont("helvetica", "italic");
  doc.setFontSize(6);
  doc.setTextColor(80, 80, 80);
  doc.text("Motto: TRUTH IS SUCCESS", margin, headerTopY + logoSize + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text("RC. BN2801551", margin, headerTopY + logoSize + 8);

  // Company name centred
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(204, 0, 0);
  doc.text("MFON-OBONG NIGERIA ENTERPRISES", pageWidth / 2, headerTopY + 8, { align: "center" });

  // Description right of logo
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(80, 80, 80);
  const textStartX = margin + logoSize + 6;
  const descText =
    "Building Materials Merchant, General Contractors, Transporters, Dealers and Suppliers of all types of " +
    "Construction Materials such as Wood of all sizes, Cement, Rods, Zinc, Ceiling Board, Aluminium Products, " +
    "Importer and Exporter of General goods etc.";
  const descLines = doc.splitTextToSize(descText, pageWidth - textStartX - margin);
  doc.text(descLines, textStartX, headerTopY + 14);

  cursorY = headerTopY + logoSize + 12;

  // Divider
  doc.setDrawColor(204, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 5;

  // 4-column addresses
  const colWidth = (pageWidth - margin * 2) / 4;
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

  // Contact
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(60, 60, 60);
  doc.text("Tel: 0802-472-0210,  0703-436-7795", margin, cursorY);
  cursorY += 6;

  // Final divider
  doc.setDrawColor(204, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 6;

  return cursorY;
};

export const generateReceiptPDF = async (txn: Transaction): Promise<void> => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 15;

  let cursorY = await drawCompanyHeader(doc, pageWidth, margin, 15);

  // --- RECEIPT TITLE ---
  const title =
    txn.type === "DEPOSIT"
      ? "PAYMENT RECEIPT"
      : txn.type === "RETURN"
      ? "RETURN RECEIPT"
      : txn.type === "WHOLESALE"
      ? "WHOLESALE INVOICE"
      : "SALES RECEIPT";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(204, 0, 0);
  doc.text(title, pageWidth / 2, cursorY + 5, { align: "center" });
  cursorY += 12;

  doc.setDrawColor(204, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 7;

  // --- META INFO ---
  const txnDate = new Date((txn as any).date || txn.createdAt);
  const clientName =
    (txn.client as any)?.name ||
    (txn.clientId as any)?.name ||
    txn.clientName ||
    txn.walkInClient?.name ||
    "Walk-in Client";
  const processedBy = `${fmtRole(txn.userId?.role)}: ${txn.userId?.name || "Unknown"}`;

  const metaLeft: { label: string; value: string }[] = [];
  const metaRight: { label: string; value: string }[] = [];

  if (txn.invoiceNumber) metaLeft.push({ label: "Invoice No:", value: txn.invoiceNumber });
  if (txn.waybillNumber) metaLeft.push({ label: "Waybill No:", value: txn.waybillNumber });
  metaLeft.push({ label: "Client:", value: clientName });
  metaLeft.push({ label: "Processed By:", value: processedBy });

  metaRight.push({ label: "Date:", value: fmtDate(txnDate) });
  metaRight.push({ label: "Type:", value: txn.type });

  const metaRows = Math.max(metaLeft.length, metaRight.length);
  for (let i = 0; i < metaRows; i++) {
    doc.setFontSize(8.5);
    if (metaLeft[i]) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(60, 60, 60);
      doc.text(metaLeft[i].label, margin, cursorY);
      doc.setFont("helvetica", "normal");
      doc.text(metaLeft[i].value, margin + 26, cursorY);
    }
    if (metaRight[i]) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(60, 60, 60);
      doc.text(metaRight[i].label, pageWidth / 2, cursorY);
      doc.setFont("helvetica", "normal");
      doc.text(metaRight[i].value, pageWidth / 2 + 14, cursorY);
    }
    cursorY += 5;
  }

  cursorY += 3;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 6;

  // --- ITEMS TABLE ---
  if (txn.type !== "DEPOSIT" && txn.items && txn.items.length > 0) {
    const colQty = margin + 4;
    const colDesc = margin + 18;
    const colRate = pageWidth - margin - 28;
    const colAmount = pageWidth - margin - 4;

    // Column headers
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(130, 130, 130);
    doc.text("Qty", colQty, cursorY);
    doc.text("Description", colDesc, cursorY);
    doc.text("Rate", colRate, cursorY, { align: "right" });
    doc.text("Amount", colAmount, cursorY, { align: "right" });
    cursorY += 4;

    doc.setDrawColor(220, 220, 220);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 4;

    // Rows
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(60, 60, 60);
    txn.items.forEach((item) => {
      const qty = item.quantity || 0;
      const rate = item.unitPrice || 0;
      const amount = Number(item.subtotal) || qty * rate;
      doc.text(String(qty), colQty, cursorY);
      doc.text(`${itemDisplayName(item.productName, item.variantName)} (${item.unit})`.toUpperCase(), colDesc, cursorY);
      doc.text(fmt(rate), colRate, cursorY, { align: "right" });
      doc.text(fmt(amount), colAmount, cursorY, { align: "right" });
      cursorY += 6;
    });

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 5;

    // Charges breakdown (right-aligned)
    const itemsSubtotal = txn.items.reduce((s, i) => s + (Number(i.subtotal) || 0), 0);
    const transport = Number((txn as any).transportFare || 0);
    const loading = Number((txn as any).loading || 0);
    const loadingOff = Number((txn as any).loadingAndOffloading || 0);
    const extraCharges: { name: string; amount: number }[] = (txn as any).extraCharges || [];
    const discount = Number(txn.discount || 0);

    const summaryLines: { label: string; value: string; bold?: boolean; color?: [number, number, number] }[] = [];
    summaryLines.push({ label: "Materials Total:", value: fmt(itemsSubtotal) });
    if (transport > 0) summaryLines.push({ label: "Transport:", value: fmt(transport) });
    if (loading > 0) summaryLines.push({ label: "Loading:", value: fmt(loading) });
    if (loadingOff > 0) summaryLines.push({ label: "Loading & Offloading:", value: fmt(loadingOff) });
    extraCharges.filter((c) => c.amount > 0).forEach((c) => summaryLines.push({ label: `${c.name}:`, value: fmt(c.amount) }));
    if (discount > 0) summaryLines.push({ label: "Discount:", value: `-${fmt(discount)}` });

    if (txn.type === "RETURN") {
      summaryLines.push({ label: "AMOUNT RETURNED:", value: fmt(txn.actualAmountReturned || 0), bold: true });
    } else {
      summaryLines.push({ label: "TOTAL:", value: fmt(txn.total || 0), bold: true });
    }

    summaryLines.forEach((row) => {
      doc.setFont("helvetica", row.bold ? "bold" : "normal");
      doc.setFontSize(8.5);
      const [r, g, b] = row.color || (row.bold ? [204, 0, 0] : [80, 80, 80]);
      doc.setTextColor(r, g, b);
      doc.text(row.label, pageWidth - margin - 55, cursorY);
      doc.text(row.value, pageWidth - margin - 4, cursorY, { align: "right" });
      cursorY += 5;
    });

    cursorY += 2;
    doc.setDrawColor(204, 0, 0);
    doc.setLineWidth(0.4);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 6;
  }

  // --- PAYMENT / DEPOSIT SECTION ---
  if (txn.type === "DEPOSIT") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(204, 0, 0);
    doc.text(`Amount Deposited: ${fmt(txn.total || 0)}`, margin, cursorY);
    cursorY += 7;
    if (txn.paymentMethod) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      doc.text(`Payment Method: ${txn.paymentMethod}`, margin, cursorY);
      cursorY += 6;
    }
    doc.setDrawColor(204, 0, 0);
    doc.setLineWidth(0.4);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 6;
  } else if (txn.type !== "RETURN") {
    const amountPaid = Number(txn.amountPaid || 0);
    const total = Number(txn.total || 0);
    const outstanding = total - amountPaid;

    if (amountPaid > 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(60, 60, 60);
      doc.text("Amount Paid:", pageWidth - margin - 55, cursorY);
      doc.setTextColor(46, 160, 90);
      doc.text(fmt(amountPaid), pageWidth - margin - 4, cursorY, { align: "right" });
      cursorY += 5;

      if (txn.paymentMethod) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(60, 60, 60);
        const pmLabelX = pageWidth - margin - 55;
        const pmMaxWidth = pageWidth - margin - pmLabelX;
        const pmLines = doc.splitTextToSize(`Payment Method: ${txn.paymentMethod}`, pmMaxWidth);
        doc.text(pmLines, pmLabelX, cursorY);
        cursorY += pmLines.length * 4.5 + 0.5;
      }
    }

    if (outstanding > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(204, 0, 0);
      doc.text("Outstanding:", pageWidth - margin - 55, cursorY);
      doc.text(fmt(outstanding), pageWidth - margin - 4, cursorY, { align: "right" });
      cursorY += 5;
    }

    cursorY += 2;
    doc.setDrawColor(204, 0, 0);
    doc.setLineWidth(0.4);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 6;
  }

  // --- FOOTER ---
  const footerY = pageHeight - 15;
  doc.setDrawColor(204, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(margin, footerY, pageWidth - margin, footerY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text("This is a system-generated receipt", pageWidth / 2, footerY + 4, { align: "center" });
  doc.text("Thank you for your business!", pageWidth / 2, footerY + 8, { align: "center" });

  doc.save(`Receipt_${txn.invoiceNumber || txn._id}.pdf`);
};
