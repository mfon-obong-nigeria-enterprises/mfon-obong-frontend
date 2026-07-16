import type { Transaction } from "@/types/transactions";
import { calculateTransactionsWithBalance } from "@/utils/calculateOutstanding";
import { formatCurrency } from "@/utils/formatCurrency";
import { itemDisplayName } from "@/utils/itemDisplay";
import { getTransactionTypeBadgeStyles } from "@/utils/transactionTypeStyles";
import {
  getTransactionDateString,
} from "@/utils/transactions";
import { useEffect, useMemo, useRef, useState } from "react";
import ProcessProductReturnModal from "./ProcessProductReturnModal";
import { generateReceiptPDF } from "@/utils/generateReceiptPDF";

interface clientTrasactionDetailsProps {
  clientTransactions: Transaction[];
  client: { balance: number };
}

type ReturnPricingItem = {
  productId: string;
  returnUnitPrice: number;
  returnAmount: number;
};

type ReturnPricingMetadata = {
  version: 1;
  items: ReturnPricingItem[];
};

const parseReturnPricingMetadata = (
  notes?: string
): ReturnPricingMetadata | null => {
  if (!notes) return null;

  try {
    const parsed = JSON.parse(notes) as Partial<ReturnPricingMetadata>;
    if (!parsed || !Array.isArray(parsed.items)) return null;

    const items = parsed.items
      .filter((item) => item && typeof item.productId === "string")
      .map((item) => ({
        productId: item.productId as string,
        returnUnitPrice: Number(item.returnUnitPrice ?? 0),
        returnAmount: Number(item.returnAmount ?? 0),
      }));

    return {
      version: 1,
      items,
    };
  } catch {
    return null;
  }
};

// Helper to format role for display
const formatRole = (role: string | undefined): string => {
  if (!role) return "Staff";
  return role
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const formatReturnReason = (value?: string): string => {
  if (!value) return "Return";

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
};

const resolveReturnReasonText = (txn: Transaction): string => {
  const reasonFromTxn = (txn as Transaction & { reason?: string }).reason;
  if (reasonFromTxn) return formatReturnReason(reasonFromTxn);
  if (txn.description) return txn.description;
  return "Return";
};

const getReferenceTransactionId = (txn: Transaction): string | null => {
  const rawReference = (
    txn as Transaction & { referenceTransactionId?: string | { _id?: string } }
  ).referenceTransactionId;

  if (typeof rawReference === "string" && rawReference.trim()) {
    return rawReference;
  }

  if (
    rawReference &&
    typeof rawReference === "object" &&
    typeof rawReference._id === "string" &&
    rawReference._id.trim()
  ) {
    return rawReference._id;
  }

  return null;
};


// Helper to get styles based on transaction type matching the screenshots
const getTypeStyles = (type: string) => {
  return {
    badge: getTransactionTypeBadgeStyles(type),
    amount: type === "DEPOSIT" ? "text-[#2ECC71]" : "text-[#333333]",
  };
};

export const ClientTransactionDetails: React.FC<clientTrasactionDetailsProps> = ({
  clientTransactions,
  client,
}) => {
  const [isReturnModalOpen, setReturnModalOpen] = useState(false);
  const [selectedTxnForReturn, setSelectedTxnForReturn] = useState<Transaction | null>(null);
  const [highlightedTransactionId, setHighlightedTransactionId] = useState<string | null>(null);
  const transactionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleOpenReturnModal = (transaction: Transaction) => {
    setSelectedTxnForReturn(transaction);
    setReturnModalOpen(true);
  };

  const handleCloseReturnModal = () => setReturnModalOpen(false);

  const scrollToReferencedTransaction = (transactionId: string | null) => {
    if (!transactionId) return;

    const target = transactionRefs.current[transactionId];
    if (!target) return;

    target.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedTransactionId(transactionId);

    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }

    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedTransactionId((current) =>
        current === transactionId ? null : current
      );
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  const transactionWithBalance = useMemo(() => {
    const transactionsWithBalance = calculateTransactionsWithBalance(
      clientTransactions,
      client
    );

    return transactionsWithBalance.sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt).getTime();
      const dateB = new Date(b.date || b.createdAt).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [clientTransactions, client]);


  return (
    <div className="font-sans text-[#333333]">

      {/* --- TRANSACTION LIST --- */}
      {transactionWithBalance.length === 0 ? (
        <p className="text-center text-sm text-[#7D7D7D] py-10">
          No transactions found for this client
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          {transactionWithBalance.map((txn, i) => {
            const styles = getTypeStyles(txn.type);
            const isCredit = txn.type === "DEPOSIT";
            const referenceTxnId = getReferenceTransactionId(txn);
            const isPartialPayment =
              (txn.type === "PURCHASE" || txn.type === "PICKUP") &&
              (txn.amountPaid ?? 0) > 0 &&
              (txn.amountPaid ?? 0) < (txn.total ?? 0);

            return (
              <div
                key={`${txn._id}-${getTransactionDateString(txn)}-${i}`}
                ref={(element) => {
                  transactionRefs.current[txn._id] = element;
                }}
                className={`border border-gray-300 rounded-lg p-4 md:p-6 shadow-sm transition-all duration-700 ${
                  highlightedTransactionId === txn._id
                    ? "transaction-highlight ring-2 ring-[#3D80FF] bg-[#F5FAFF]"
                    : i % 2 === 0
                    ? "bg-white"
                    : "bg-[#EEEFF1]"
                }`}
              >
                {/* --- HEADER --- */}
                <div className="border-b border-[#D9D9D9] pb-4 flex flex-wrap justify-between items-start md:items-center mb-6 gap-4">
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                    {/* Type Badge */}
                    <span
                      className={`${styles.badge} px-3 py-1 rounded-full text-xs font-medium w-fit uppercase`}
                    >
                      {txn.type}
                    </span>

                    {/* Date & Time */}
                    <div className="flex flex-col">
                      <span className="text-[#333333] text-sm font-medium">
                        {getTransactionDateString(txn)}
                      </span>
                    </div>
                  </div>

                  {/* Total & Actions */}
                  <div className="flex items-center gap-4 md:gap-6 ml-auto md:ml-0">
                    <div className="text-right">
                      <span className="text-[#7D7D7D] text-xs block">
                        Total:
                      </span>
                      <span
                        className={`text-lg text-[#444444] md:text-xl font-bold ${styles.amount}`}
                      >
                        {isCredit ? "+" : ""}
                        {formatCurrency(
                          txn.type === "RETURN" && txn.actualAmountReturned !== undefined
                            ? txn.actualAmountReturned
                            : txn.total || 0
                        )}
                      </span>
                    </div>
                    {/* Only show Return button for tangible transactions */}
                    {(txn.type === "PURCHASE" || txn.type === "PICKUP" || txn.type === "WHOLESALE") && (
                      <button
                        onClick={() => handleOpenReturnModal(txn)}
                        className="border border-gray-300 text-[#444444] px-4 py-1.5 rounded-md text-sm font-medium bg-white transition-all duration-200 hover:bg-[#F3F7FF] hover:border-[#3D80FF] hover:text-[#2E6EF7] hover:shadow-sm hover:-translate-y-[1px]"
                      >
                        Return
                      </button>
                    )}
                    {txn.type === "RETURN" && referenceTxnId && (
                      <button
                        onClick={() => scrollToReferencedTransaction(referenceTxnId)}
                        className="border border-[#3D80FF] text-[#3D80FF] px-4 py-1.5 rounded-md text-sm font-medium hover:bg-[#EFF5FF] bg-white hover:shadow-sm hover:-translate-y-[1px]"
                      >
                        View Original
                      </button>
                    )}
                    <button
                      onClick={() => generateReceiptPDF(txn)}
                      className="border border-gray-300 text-[#444444] px-4 py-1.5 rounded-md text-sm font-medium bg-white transition-all duration-200 hover:bg-[#F3F7FF] hover:border-[#3D80FF] hover:text-[#2E6EF7] hover:shadow-sm hover:-translate-y-[1px]"
                    >
                      Print Receipt
                    </button>
                  </div>
                </div>

                {/* --- MAIN GRID (Details, Process) --- */}
                <div className=" pb-4 grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

                  {/* 1. Transaction Details */}
                  <div>
                    <h3 className="text-[#444444] text-[16px] mb-3">
                      Transaction Details
                    </h3>
                    <ul className="space-y-1.5">
                      <li className="text-sm text-[#444444]">
                        <span className="font-medium text-[#444444]">
                          Amount:{" "}
                        </span>
                        {formatCurrency(
                          txn.type === "RETURN" && txn.actualAmountReturned !== undefined
                            ? txn.actualAmountReturned
                            : txn.total || 0
                        )}
                      </li>
                      <li className="text-sm text-[#444444]">
                        <span className="font-medium text-[#444444]">
                          Method:{" "}
                        </span>
                        {(txn.amountPaid ?? 0) > 0 ? (txn.paymentMethod || "N/A") : "No payment"}
                      </li>
                      {(txn.amountPaid ?? 0) > 0 && (
                        <li className="text-sm text-[#444444]">
                          <span className="font-medium text-[#444444]">
                            Amount Paid:{" "}
                          </span>
                          {formatCurrency(txn.amountPaid ?? 0)}
                        </li>
                      )}
                      {txn.type !== "RETURN" && txn.total && (txn.amountPaid ?? 0) < txn.total && (
                        <li className="text-sm text-[#F95353]">
                          <span className="font-medium">
                            Outstanding:{" "}
                          </span>
                          {formatCurrency(txn.total - (txn.amountPaid ?? 0))}
                        </li>
                      )}
                      {/* Amount Paid duplicate removed */}
                      {txn.type !== "RETURN" && (txn.amountPaid ?? 0) > (txn.total ?? 0) && (
                        <li className="text-sm text-[#2ECC71]">
                          <span className="font-medium">
                            Credit Added:{" "}
                          </span>
                          {formatCurrency((txn.amountPaid ?? 0) - (txn.total ?? 0))}
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* 2. Process By */}
                  <div>
                    <h3 className="text-[#333333] text-[13px] mb-3">
                      Process By
                    </h3>
                    <ul className="space-y-2">
                      <li className="text-sm text-[#444444]">
                        <span className="font-medium text-[#444444]">{formatRole(txn.userId?.role)}: </span>
                        <span className="break-all whitespace-normal">{txn.userId?.name || "Unknown"}</span>
                      </li>
                      {txn.invoiceNumber && (
                        <li>
                          <span className="bg-[#E2F3EB] text-[#3D80FF] px-2 py-0.5 rounded text-xs font-medium">
                            {txn.invoiceNumber}
                          </span>
                        </li>
                      )}
                      {txn.waybillNumber && (
                        <li>
                          <span className="bg-[#E2F3EB] text-[#3D80FF] px-2 py-0.5 rounded text-xs font-medium">
                            {txn.waybillNumber}
                          </span>
                        </li>
                      )}
                      {txn.reference && (
                        <li className="text-xs text-[#7D7D7D]">
                          Ref: {txn.reference}
                        </li>
                      )}
                    </ul>
                  </div>
                </div>

                
                {/* --- FOOTER SECTIONS (Conditional) --- */}

                {/* A. Product Purchase Table */}
                {(txn.type === "PURCHASE" || txn.type === "PICKUP" || txn.type === "WHOLESALE") &&
                  txn.items &&
                  txn.items.length > 0 && (
                    <div className="border-t border-gray-100 pt-6">
                      <h3 className="text-[#333333] text-[16px] mb-4">
                        Product {txn.type === "PICKUP" ? "Pickup" : "Purchase"}:
                      </h3>
                      <div className="bg-[#F9FAFB] overflow-hidden">
                        {/* Table Header */}
                        <div className="grid grid-cols-[1fr_1fr_1fr_auto] md:grid-cols-4 gap-4 p-4 bg-[#F5F5F5] border-b border-gray-100">
                          <span className="text-xs md:text-[16px] text-[#333333]">
                            Quantity
                          </span>
                          <span className="text-xs md:text-[16px] text-[#333333]">
                            Description of goods
                          </span>
                          <span className="text-xs md:text-[16px] text-[#333333]">
                            Rate
                          </span>
                          <span className="text-xs md:text-[16px] text-[#333333] text-right">
                            Amount
                          </span>
                        </div>
                        {/* Table Body */}
                        <div className="bg-white border-b border-[#F5F5F5] border-[1px] pt-4  grid grid-cols-1 gap-2">
                          {txn.items.map((item, index) => (
                            <div key={`${item.productId}-${index}`}>
                              <div className="grid grid-cols-[1fr_1fr_1fr_auto] md:grid-cols-4 px-4 gap-4 items-center">
                                <span className="text-xs md:text-sm text-[#444444]">
                                  {item.quantity}{" "}
                                  {item.unit?.split(" ")[0]?.toLowerCase() ||
                                    "units"}
                                </span>
                                <span className="text-xs md:text-sm text-[#444444]">
                                  {itemDisplayName(item.productName, item.variantName)} ({item.unit})
                                </span>
                                <span className="text-xs md:text-sm text-[#444444] font-medium">
                                  {formatCurrency(item.unitPrice)}/
                                  {item.unit?.split(" ")[0]?.toLowerCase() ||
                                    "unit"}
                                </span>
                                <span className="text-xs md:text-sm text-[#444444] text-right">
                                  {formatCurrency(item.subtotal)}
                                </span>
                              </div>
                              {index < txn.items.length - 1 && (
                                <div className="h-[1px] bg-gray-100 my-2"></div>
                              )}
                            </div>
                          ))}
                          {/* Subtotal */}
                          <div className="bg-[#F5F5F5] flex justify-end px-4 gap-4 items-center py-3 border-t border-gray-100">
                            <span className="text-xs md:text-sm text-[#333333] font-medium">
                              Materials Total Cost:
                            </span>
                            <span className="text-xs md:text-sm text-[#333333] font-bold">
                              {formatCurrency(
                                txn.items.reduce(
                                  (sum, item) => sum + (item.subtotal || 0),
                                  0
                                )
                              )}
                            </span>
                          </div>

                          {/* Transport */}
                          {(() => {
                            const transport = Number(txn.transportFare || 0);
                            return transport > 0 ? (
                              <div className="bg-[#F5F5F5] flex justify-end px-4 gap-4 items-center py-3">
                                <span className="text-xs md:text-sm text-[#333333] font-medium">
                                  Transport:
                                </span>
                                <span className="text-xs md:text-sm text-[#333333] font-bold">
                                  {formatCurrency(transport)}
                                </span>
                              </div>
                            ) : null;
                          })()}

                          {/* Loading */}
                          {(() => {
                            const loading = Number(txn.loading || 0);
                            return loading > 0 ? (
                              <div className="bg-[#F5F5F5] flex justify-end px-4 gap-4 items-center py-3">
                                <span className="text-xs md:text-sm text-[#333333] font-medium">
                                  Loading:
                                </span>
                                <span className="text-xs md:text-sm text-[#333333] font-bold">
                                  {formatCurrency(loading)}
                                </span>
                              </div>
                            ) : null;
                          })()}

                          {/* Loading & Offloading */}
                          {(() => {
                            const loadingOff = Number(txn.loadingAndOffloading || 0);
                            return loadingOff > 0 ? (
                              <div className="bg-[#F5F5F5] flex justify-end px-4 gap-4 items-center py-3">
                                <span className="text-xs md:text-sm text-[#333333] font-medium">
                                  Loading & Offloading:
                                </span>
                                <span className="text-xs md:text-sm text-[#333333] font-bold">
                                  {formatCurrency(loadingOff)}
                                </span>
                              </div>
                            ) : null;
                          })()}

                          {/* Extra / Miscellaneous Charges */}
                          {(txn.extraCharges || []).filter((c) => c.amount > 0).map((charge, idx) => (
                            <div key={idx} className="bg-[#F5F5F5] flex justify-end px-4 gap-4 items-center py-3">
                              <span className="text-xs md:text-sm text-[#333333] font-medium">
                                {charge.name}:
                              </span>
                              <span className="text-xs md:text-sm text-[#333333] font-bold">
                                {formatCurrency(charge.amount)}
                              </span>
                            </div>
                          ))}

                          {/* Discount */}
                          {(() => {
                            const discount = Number(txn.discount || 0);
                            return discount > 0 ? (
                              <div className="bg-[#F5F5F5] flex justify-end px-4 gap-4 items-center py-3">
                                <span className="text-xs md:text-sm text-[#333333] font-medium">
                                  Discount:
                                </span>
                                <span className="text-xs md:text-sm text-[#333333] font-bold">
                                  -{formatCurrency(discount)}
                                </span>
                              </div>
                            ) : null;
                          })()}

                          {/* Total */}
                          <div className="bg-[#F5F5F5] flex justify-end px-4 gap-4 items-center py-3 border-t-2 border-gray-300">
                            <span className="text-xs md:text-sm text-[#333333] font-bold">
                              Subtotal:
                            </span>
                            <span className="text-xs md:text-sm text-[#333333] font-bold">
                              {formatCurrency(txn.total || 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}


                {/* B. Returned Items Table — inline for RETURN transactions */}
                {txn.type === "RETURN" && txn.items && txn.items.length > 0 && (() => {
                  const metadata = parseReturnPricingMetadata(txn.notes);
                  const metadataMap = new Map(
                    (metadata?.items || []).map((m) => [m.productId, m])
                  );
                  return (
                    <div className="border-t border-gray-100 pt-6">
                      <h3 className="text-[#333333] text-[16px] mb-4">Returned Products:</h3>
                      <div className="bg-[#F9FAFB] overflow-hidden">
                        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 p-4 bg-[#F5F5F5] border-b border-gray-100">
                          <span className="text-xs md:text-sm text-[#333333]">Quantity</span>
                          <span className="text-xs md:text-sm text-[#333333]">Unit Price</span>
                          <span className="text-xs md:text-sm text-[#333333]">Return Price</span>
                          <span className="text-xs md:text-sm text-[#333333]">Product</span>
                          <span className="text-xs md:text-sm text-[#333333] text-right">Amount</span>
                        </div>
                        <div className="bg-white border border-[#F5F5F5] pt-4 grid grid-cols-1 gap-2">
                          {txn.items.map((item, idx) => {
                            const meta = metadataMap.get(item.productId);
                            const hasExactLineData =
                              meta?.returnAmount !== undefined && !Number.isNaN(meta.returnAmount) &&
                              meta?.returnUnitPrice !== undefined && !Number.isNaN(meta.returnUnitPrice);
                            return (
                              <div key={`${item.productId}-${idx}`}>
                                <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] px-4 gap-4 items-center">
                                  <span className="text-xs md:text-sm text-[#444444]">
                                    {item.quantity} {item.unit?.split(" ")[0]?.toLowerCase() || "units"}
                                  </span>
                                  <span className="text-xs md:text-sm text-[#444444]">
                                    {formatCurrency(item.unitPrice)}/{item.unit?.split(" ")[0]?.toLowerCase() || "unit"}
                                  </span>
                                  <span className="text-xs md:text-sm text-[#444444]">
                                    {hasExactLineData ? `${formatCurrency(meta.returnUnitPrice)}/${item.unit?.split(" ")[0]?.toLowerCase() || "unit"}` : "-"}
                                  </span>
                                  <span className="text-xs md:text-sm text-[#444444]">{itemDisplayName(item.productName, item.variantName)} ({item.unit})</span>
                                  <span className="text-xs md:text-sm text-[#444444] text-right">
                                    {hasExactLineData
                                      ? formatCurrency(meta.returnAmount)
                                      : idx === 0 && txn.actualAmountReturned !== undefined
                                      ? formatCurrency(txn.actualAmountReturned)
                                      : "-"}
                                  </span>
                                </div>
                                {idx < txn.items.length - 1 && <div className="h-[1px] bg-gray-100 my-2" />}
                              </div>
                            );
                          })}
                          <div className="bg-[#F5F5F5] flex justify-end px-4 gap-4 items-center py-3 border-t border-gray-100">
                            <span className="text-xs md:text-sm text-[#333333] font-medium">Reason:</span>
                            <span className="text-xs md:text-sm text-[#333333]">{resolveReturnReasonText(txn)}</span>
                          </div>
                          <div className="bg-[#F5F5F5] flex justify-end px-4 gap-4 items-center py-3 border-t-2 border-gray-300">
                            <span className="text-xs md:text-sm text-[#333333] font-bold">Total Returned:</span>
                            <span className="text-xs md:text-sm text-[#333333] font-bold">
                              {formatCurrency(txn.actualAmountReturned ?? txn.total ?? 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* --- FOOTER: PARTIAL PAYMENT BANNER --- */}
                {isPartialPayment && (
                   <div className="bg-[#F5F5F5] rounded-md p-4 mb-4 mt-8">
                      <p className="text-[#444444] text-[16px] font-medium">Partial Payment Received</p>
                      <p className="text-[#444444] text-[10px] mt-1">Payment towards outstanding balance</p>
                   </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <ProcessProductReturnModal
        isOpen={isReturnModalOpen}
        onClose={handleCloseReturnModal}
        transaction={selectedTxnForReturn}
      />
    </div>
  );
};