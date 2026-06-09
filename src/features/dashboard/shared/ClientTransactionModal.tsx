import Modal from "@/components/Modal";
import { useTransactionsStore } from "@/stores/useTransactionStore";
import { MapPin, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatCurrency";
import { useMemo } from "react";
import { calculateTransactionsWithBalance } from "@/utils/calculateOutstanding";
import { getTransactionTypeBadgeStyles } from "@/utils/transactionTypeStyles";
import { getTransactionDateString } from "@/utils/transactions";

// --- Helpers (mirrored from ClientTransactionDetails) ---

type ReturnPricingItem = {
  productId: string;
  returnUnitPrice: number;
  returnAmount: number;
};

type ReturnPricingMetadata = {
  version: 1;
  items: ReturnPricingItem[];
};

const parseReturnPricingMetadata = (notes?: string): ReturnPricingMetadata | null => {
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
    return { version: 1, items };
  } catch {
    return null;
  }
};

const formatRole = (role: string | undefined): string => {
  if (!role) return "Staff";
  return role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const formatReturnReason = (value?: string): string => {
  if (!value) return "Return";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
};

const resolveReturnReasonText = (txn: any): string => {
  if (txn.reason) return formatReturnReason(txn.reason);
  if (txn.description) return txn.description;
  return "Return";
};


const getTypeStyles = (type: string) => ({
  badge: getTransactionTypeBadgeStyles(type),
  amount: type === "DEPOSIT" ? "text-[#2ECC71]" : "text-[#333333]",
});

// -------------------------------------------------------

const ClientTransactionModal = () => {
  const navigate = useNavigate();
  const { open, selectedTransaction, closeModal, transactions } = useTransactionsStore();

  const transactionsWithBalance = useMemo(() => {
    if (!transactions || !selectedTransaction?.clientId) return [];
    const clientTransactions = transactions.filter(
      (t) =>
        t.clientId?._id === selectedTransaction.clientId?._id ||
        t.clientId === selectedTransaction.clientId?._id
    );
    return calculateTransactionsWithBalance(clientTransactions, {
      balance: selectedTransaction.client?.balance ?? 0,
    });
  }, [transactions, selectedTransaction]);

  const txn = useMemo(() => {
    if (!selectedTransaction) return null;
    return (
      transactionsWithBalance.find((t) => t._id === selectedTransaction._id) ||
      selectedTransaction
    );
  }, [transactionsWithBalance, selectedTransaction]);

  if (!transactions || !txn) return null;

  const styles = getTypeStyles(txn.type);
  const isCredit = txn.type === "DEPOSIT";
  const isPartialPayment =
    (txn.type === "PURCHASE" || txn.type === "PICKUP") &&
    (txn.amountPaid ?? 0) > 0 &&
    (txn.amountPaid ?? 0) < (txn.total ?? 0);

  return (
    <Modal isOpen={open} onClose={closeModal} size="xxl">
      <h4 className="text-lg text-text-dark font-medium pt-3 px-6 mb-2 border-b border-[#d9d9d9]">
        Transaction Details
      </h4>

      {selectedTransaction && selectedTransaction.clientId && (
        <div className="overflow-y-auto max-h-[80vh]">
          {/* Customer Info */}
          <div
            className={`flex justify-between border border-l-[6px] mx-6
              ${
                typeof selectedTransaction.client?.balance === "number"
                  ? selectedTransaction.client.balance < 0
                    ? "border-[#DA251C] bg-[#FFE9E9] text-[#F95353]"
                    : selectedTransaction.client.balance > 0
                    ? "border-[#2ECC71] bg-[#C8F9DD] text-[#2ECC71]"
                    : "border-[#7d7d7d] bg-[#f6f6f6] text-[#7d7d7d]"
                  : "border-[#7d7d7d] bg-[#f6f6f6] text-[#7d7d7d]"
              }
              mt-7 mb-5 p-3 rounded-[0.875rem]`}
          >
            <div className="space-y-2">
              <p className="text-[#444444] font-medium capitalize">
                {selectedTransaction.clientName}
              </p>
              <address className="flex gap-0.5 items-center text-[#444444] text-sm">
                <MapPin size={14} />
                <span>{selectedTransaction.client?.address || "No address provided"}</span>
              </address>
              <p className="flex gap-1 items-center text-[#444444] text-sm">
                <Phone size={14} />
                <span>{selectedTransaction.clientId?.phone}</span>
              </p>
            </div>
            <div>
              <p className="font-normal text-base">
                {formatCurrency(Number(selectedTransaction.client?.balance))}
              </p>
            </div>
          </div>

          {/* Transaction Card — same layout as ClientTransactionDetails */}
          <div className="mx-6 mb-6 bg-white border border-gray-300 rounded-lg p-4 md:p-6 shadow-sm">

            {/* Header */}
            <div className="border-b border-[#D9D9D9] pb-4 flex flex-wrap justify-between items-start md:items-center mb-6 gap-4">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                <span className={`${styles.badge} px-3 py-1 rounded-full text-xs font-medium w-fit uppercase`}>
                  {txn.type}
                </span>
                <div className="flex flex-col">
                  <span className="text-[#333333] text-sm font-medium">
                    {getTransactionDateString(txn)}
                  </span>
                </div>
              </div>
              <div className="text-right ml-auto md:ml-0">
                <span className="text-[#7D7D7D] text-xs block">Total:</span>
                <span className={`text-lg text-[#444444] md:text-xl font-bold ${styles.amount}`}>
                  {isCredit ? "+" : ""}
                  {formatCurrency(
                    txn.type === "RETURN" && txn.actualAmountReturned !== undefined
                      ? txn.actualAmountReturned
                      : txn.total || 0
                  )}
                </span>
              </div>
            </div>

            {/* Main Grid: Transaction Details, Process By */}
            <div className="pb-4 grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

              {/* Transaction Details */}
              <div>
                <h3 className="text-[#444444] text-[16px] mb-3">Transaction Details</h3>
                <ul className="space-y-1.5">
                  <li className="text-sm text-[#444444]">
                    <span className="font-medium">Amount: </span>
                    {formatCurrency(
                      txn.type === "RETURN" && txn.actualAmountReturned !== undefined
                        ? txn.actualAmountReturned
                        : txn.total || 0
                    )}
                  </li>
                  <li className="text-sm text-[#444444]">
                    <span className="font-medium">Method: </span>
                    {(txn.amountPaid ?? 0) > 0 ? txn.paymentMethod || "N/A" : "No payment"}
                  </li>
                  {(txn.amountPaid ?? 0) > 0 && (
                    <li className="text-sm text-[#444444]">
                      <span className="font-medium">Amount Paid: </span>
                      {formatCurrency(txn.amountPaid ?? 0)}
                    </li>
                  )}
                  {txn.type !== "RETURN" && txn.total && (txn.amountPaid ?? 0) < txn.total && (
                    <li className="text-sm text-[#F95353]">
                      <span className="font-medium">Outstanding: </span>
                      {formatCurrency(txn.total - (txn.amountPaid ?? 0))}
                    </li>
                  )}
                  {txn.type !== "RETURN" && (txn.amountPaid ?? 0) > (txn.total ?? 0) && (
                    <li className="text-sm text-[#2ECC71]">
                      <span className="font-medium">Credit Added: </span>
                      {formatCurrency((txn.amountPaid ?? 0) - (txn.total ?? 0))}
                    </li>
                  )}
                </ul>
              </div>

              {/* Process By */}
              <div>
                <h3 className="text-[#333333] text-[13px] mb-3">Process By</h3>
                <ul className="space-y-2">
                  <li className="text-sm text-[#444444]">
                    <span className="font-medium">{formatRole(txn.userId?.role)}: </span>
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
                </ul>
              </div>
            </div>

            {/* Product Purchase Table */}
            {(txn.type === "PURCHASE" || txn.type === "PICKUP" || txn.type === "WHOLESALE") &&
              txn.items && txn.items.length > 0 && (
                <div className="border-t border-gray-100 pt-6">
                  <h3 className="text-[#333333] text-[16px] mb-4">
                    Product {txn.type === "PICKUP" ? "Pickup" : "Purchase"}:
                  </h3>
                  <div className="bg-[#F9FAFB] overflow-hidden">
                    <div className="grid grid-cols-[1fr_1fr_1fr_auto] md:grid-cols-4 gap-4 p-4 bg-[#F5F5F5] border-b border-gray-100">
                      <span className="text-xs md:text-[16px] text-[#333333]">Quantity</span>
                      <span className="text-xs md:text-[16px] text-[#333333]">Description of goods</span>
                      <span className="text-xs md:text-[16px] text-[#333333]">Rate</span>
                      <span className="text-xs md:text-[16px] text-[#333333] text-right">Amount</span>
                    </div>
                    <div className="bg-white border-b border-[#F5F5F5] border-[1px] pt-4 grid grid-cols-1 gap-2">
                      {txn.items.map((item, index) => (
                        <div key={`${item.productId}-${index}`}>
                          <div className="grid grid-cols-[1fr_1fr_1fr_auto] md:grid-cols-4 px-4 gap-4 items-center">
                            <span className="text-xs md:text-sm text-[#444444]">
                              {item.quantity} {item.unit?.split(" ")[0]?.toLowerCase() || "units"}
                            </span>
                            <span className="text-xs md:text-sm text-[#444444]">{item.productName} ({item.unit})</span>
                            <span className="text-xs md:text-sm text-[#444444] font-medium">
                              {formatCurrency(item.unitPrice)}/{item.unit?.split(" ")[0]?.toLowerCase() || "unit"}
                            </span>
                            <span className="text-xs md:text-sm text-[#444444] text-right">
                              {formatCurrency(item.subtotal)}
                            </span>
                          </div>
                          {index < txn.items.length - 1 && <div className="h-[1px] bg-gray-100 my-2" />}
                        </div>
                      ))}
                      <div className="bg-[#F5F5F5] flex justify-end px-4 gap-4 items-center py-3 border-t border-gray-100">
                        <span className="text-xs md:text-sm text-[#333333] font-medium">Materials Total Cost:</span>
                        <span className="text-xs md:text-sm text-[#333333] font-bold">
                          {formatCurrency(txn.items.reduce((sum, item) => sum + (item.subtotal || 0), 0))}
                        </span>
                      </div>
                      {Number(txn.transportFare || 0) > 0 && (
                        <div className="bg-[#F5F5F5] flex justify-end px-4 gap-4 items-center py-3">
                          <span className="text-xs md:text-sm text-[#333333] font-medium">Transport:</span>
                          <span className="text-xs md:text-sm text-[#333333] font-bold">
                            {formatCurrency(Number(txn.transportFare))}
                          </span>
                        </div>
                      )}
                      {Number(txn.loading || 0) > 0 && (
                        <div className="bg-[#F5F5F5] flex justify-end px-4 gap-4 items-center py-3">
                          <span className="text-xs md:text-sm text-[#333333] font-medium">Loading:</span>
                          <span className="text-xs md:text-sm text-[#333333] font-bold">
                            {formatCurrency(Number(txn.loading))}
                          </span>
                        </div>
                      )}
                      {Number(txn.loadingAndOffloading || 0) > 0 && (
                        <div className="bg-[#F5F5F5] flex justify-end px-4 gap-4 items-center py-3">
                          <span className="text-xs md:text-sm text-[#333333] font-medium">Loading & Offloading:</span>
                          <span className="text-xs md:text-sm text-[#333333] font-bold">
                            {formatCurrency(Number(txn.loadingAndOffloading))}
                          </span>
                        </div>
                      )}
                      {(txn.extraCharges || []).filter((c) => c.amount > 0).map((charge, idx) => (
                        <div key={idx} className="bg-[#F5F5F5] flex justify-end px-4 gap-4 items-center py-3">
                          <span className="text-xs md:text-sm text-[#333333] font-medium">{charge.name}:</span>
                          <span className="text-xs md:text-sm text-[#333333] font-bold">
                            {formatCurrency(charge.amount)}
                          </span>
                        </div>
                      ))}
                      {Number(txn.discount || 0) > 0 && (
                        <div className="bg-[#F5F5F5] flex justify-end px-4 gap-4 items-center py-3">
                          <span className="text-xs md:text-sm text-[#333333] font-medium">Discount:</span>
                          <span className="text-xs md:text-sm text-[#333333] font-bold">
                            -{formatCurrency(Number(txn.discount))}
                          </span>
                        </div>
                      )}
                      <div className="bg-[#F5F5F5] flex justify-end px-4 gap-4 items-center py-3 border-t-2 border-gray-300">
                        <span className="text-xs md:text-sm text-[#333333] font-bold">Subtotal:</span>
                        <span className="text-xs md:text-sm text-[#333333] font-bold">
                          {formatCurrency(txn.total || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            {/* Returned Items Table */}
            {txn.type === "RETURN" && txn.items && txn.items.length > 0 && (() => {
              const metadata = parseReturnPricingMetadata(txn.notes);
              const metadataMap = new Map((metadata?.items || []).map((m) => [m.productId, m]));
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
                              <span className="text-xs md:text-sm text-[#444444]">{item.productName} ({item.unit})</span>
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

            {/* Partial Payment Banner */}
            {isPartialPayment && (
              <div className="bg-[#F5F5F5] rounded-md p-4 mb-4 mt-8">
                <p className="text-[#444444] text-[16px] font-medium">Partial Payment Received</p>
                <p className="text-[#444444] text-[10px] mt-1">Payment towards outstanding balance</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-[#F5F5F5] py-2 px-5 flex justify-end items-center gap-10">
            {selectedTransaction?.clientId?._id && (
              <Button
                onClick={() => navigate(`/clients/${selectedTransaction.clientId?._id}`)}
                className="bg-white text-[#444444] border border-[#7D7D7D]"
              >
                View Full Details
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ClientTransactionModal;
