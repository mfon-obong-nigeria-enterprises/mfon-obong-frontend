/** @format */

import Modal from "@/components/Modal";
import { useTransactionsStore } from "@/stores/useTransactionStore";
import { Button } from "@/components/ui/button";
import { ChevronUp } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";
import { getTransactionTypeBadgeStyles } from "@/utils/transactionTypeStyles";
import { balanceClassT } from "@/utils/styles";
import { toast } from "sonner";
import { itemDisplayName } from "@/utils/itemDisplay";
import { generateReceiptPDF } from "@/utils/generateReceiptPDF";

const WalkinTransactionModal = () => {
  const { open, selectedTransaction, closeModal } = useTransactionsStore();

  // Export PDF function
  const handleExportPDF = async () => {
    if (!selectedTransaction) return;
    await generateReceiptPDF(selectedTransaction);
    toast.success("PDF downloaded successfully!");
  };


  return (
    <Modal isOpen={open} onClose={closeModal} size="xxl">
      <h4 className="text-lg text-text-dark font-medium py-3 px-6 mb-2 border-b border-[#d9d9d9]">
        Walk-in Client
      </h4>
      {/* subtitle */}
      {selectedTransaction && selectedTransaction.walkInClient && (
        <section>
          <div className="flex justify-between items-center px-6 py-2 border-b border-[#d9d9d9]">
            <div>
              <p className="font-medium text-[#444444]">
                Transaction Details - {selectedTransaction.invoiceNumber}
              </p>
            </div>
            <div>
              <Button variant={"tertiary"} onClick={handleExportPDF}>
                <ChevronUp />
                Export PDF
              </Button>
            </div>
          </div>

          {/* client info grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 my-4 px-4">
            <article className="py-2 border border-[#D9D9D9] rounded-[0.625rem]">
              <p className="text-[#444444] text-sm font-medium p-2 border-b border-[#d9d9d9]">
                Client Information
              </p>
              <p className="flex justify-between items-center text-xs border-b border-[#d9d9d9] py-1 px-3">
                <span className="text-[#7D7D7D] font-medium">Client Type:</span>
                <span className="text-[#444444] font-light">
                  Walk-in client
                </span>
              </p>

              {/* name */}
              <p className="flex justify-between items-center text-xs text-[#7D7D7D]  border-b border-[#d9d9d9] py-1 px-3">
                <span className="font-medium">Client Name:</span>
                <span className=" font-light">
                  {selectedTransaction.walkInClientName}
                </span>
              </p>
              {/* phone number */}
              <p className="flex justify-between items-center text-xs border-b border-[#d9d9d9] py-1 px-3">
                <span className="text-[#7D7D7D] font-medium">
                  Client Phone:
                </span>
                <span className="text-[#7d7d7d] italic font-light">
                  {selectedTransaction.walkInClient.phone || "Not provided"}
                </span>
              </p>

              {/* resgister status */}
              <p className="flex justify-between items-center text-xs border-b border-[#d9d9d9] py-1 px-3">
                <span className="text-[#7D7D7D] font-medium">
                  Registration:
                </span>
                <span className="bg-[#F39C12] text-white font-light py-1 px-2 rounded-[0.625rem]">
                  Unregistered
                </span>
              </p>
            </article>

            {/* Transaction info */}
            <article className="py-2 border border-[#D9D9D9] rounded-[0.625rem]">
              <p className="text-[#444444] text-sm font-medium p-2 border-b border-[#d9d9d9]">
                Transaction Information
              </p>
              <p className="flex justify-between items-center text-xs text-[#7D7D7D]  border-b border-[#d9d9d9] py-1 px-3">
                <span className="font-medium">Invoice Number:</span>
                <span className=" font-light text-[#444444]">
                  {selectedTransaction.invoiceNumber}
                </span>
              </p>
              {selectedTransaction.waybillNumber && (
                <p className="flex justify-between items-center text-xs text-[#7D7D7D]  border-b border-[#d9d9d9] py-1 px-3">
                  <span className="font-medium">Waybill Number:</span>
                  <span className="font-light text-[#444444]">
                    {selectedTransaction.waybillNumber}
                  </span>
                </p>
              )}
              <p className="flex justify-between items-center text-xs text-[#7D7D7D]  border-b border-[#d9d9d9] py-1 px-3">
                <span className="font-medium">Date & Time:</span>
                <p className=" font-light text-[#444444]">
                  <span>
                    {new Date(
                      selectedTransaction.createdAt
                    ).toLocaleDateString()}
                  </span>
                  <span className="text-[9px] ml-1.5">
                    {new Date(selectedTransaction.createdAt).toLocaleTimeString(
                      "en-US",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      }
                    )}
                  </span>
                </p>
              </p>
              {/* type */}
              <p className="flex justify-between items-center text-xs text-[#7D7D7D]  border-b border-[#d9d9d9] py-1 px-3">
                <span className="font-medium">Transaction Type:</span>
                <span
                  className={`font-light text-[0.625rem] px-2 py-1 rounded-[0.625rem] capitalize ${getTransactionTypeBadgeStyles(selectedTransaction.type)}`}
                >
                  {typeof selectedTransaction?.type === "string"
                    ? selectedTransaction.type.toLowerCase()
                    : "N/A"}
                </span>
              </p>
              {/* amount */}
              <p className="flex justify-between items-center text-xs text-[#7D7D7D]  border-b border-[#d9d9d9] py-1 px-3">
                <span className="font-medium">Amount:</span>
                <span className={` font-light ${balanceClassT}`}>
                  {formatCurrency(selectedTransaction.total)}
                </span>
              </p>
              {/* process by */}
              <p className="flex justify-between items-center text-xs text-[#7D7D7D]  border-b border-[#d9d9d9] py-1 px-3">
                <span className="font-medium">Process by:</span>
                <span className=" font-light text-[#444444]">
                  {selectedTransaction.userId.name}
                </span>
              </p>
              <p className="min-h-4"></p>
            </article>
          </div>

          {/* items or services */}
          <div className="border border-[#d9d9d9] rounded-[0.625rem] mx-4">
            <h6 className="border-b border-[#d9d9d9] py-2 px-4">
              Item/Services
            </h6>
            {/* table */}
            <div className="p-4">
              <table className="w-full">
                <thead className="w-full bg-[#F5F5F5] text-center border-b border-[#d9d9d9]">
                  <tr>
                    <td className="text-[#7D7D7D] py-3 text-xs">Description</td>
                    <td className="text-[#7D7D7D] py-3 text-xs">Quantity</td>
                    <td className="text-[#7D7D7D] py-3 text-xs">Unit Price</td>
                    <td className="text-[#7D7D7D] py-3 text-xs">Discount</td>
                    <td className="text-[#7D7D7D] py-3 text-xs">Total</td>
                  </tr>
                </thead>
                <tbody>
                  {selectedTransaction.items.map((item) => (
                    <tr
                      key={item.productId}
                      className="text-[#444444] text-center text-xs border-b border-[#d9d9d9]"
                    >
                      <td className="py-2">{itemDisplayName(item.productName, item.variantName)} ({item.unit})</td>
                      <td className="py-2">{item.quantity}</td>
                      <td className="py-2">{formatCurrency(item.unitPrice)}</td>
                      <td className="py-2">₦0.00</td>
                      <td className="py-2">{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* discount, extra charges and total */}
            <div className="flex justify-end px-5 mt-5 pb-3">
              <div className="space-y-1">
                <p className="font-medium text-sm">
                  <span className="text-[#333333]">Total Discount</span>
                  <span className="text-text-dark ml-3">
                    {selectedTransaction?.discount
                      ? formatCurrency(selectedTransaction.discount)
                      : "0"}
                  </span>
                </p>

                {/* Extra charges */}
                {(selectedTransaction.extraCharges || []).filter((c) => c.amount > 0).map((charge, idx) => (
                  <p key={idx} className="font-medium text-sm">
                    <span className="text-[#333333]">{charge.name}:</span>
                    <span className="text-text-dark ml-3">{formatCurrency(charge.amount)}</span>
                  </p>
                ))}

                {/* total */}
                <p className="font-medium text-sm">
                  <span className="text-[#333333]">Total Amount:</span>
                  <span className="text-[#1c1818] ml-3">
                    {formatCurrency(selectedTransaction.total)}
                  </span>
                </p>
              </div>
            </div>
          </div>
          {/* discounts */}
          <p className="bg-[#FFE7A4] mt-5 mb-10 mx-4 px-3 py-3 rounded-[0.625rem] ">
            <span className="mr-1 text-sm text-[#7d7d7d]">Total Discount:</span>
            <span className="text-sm text-[#7D7D7D] font-medium">
              {selectedTransaction?.discount
                ? formatCurrency(selectedTransaction.discount)
                : "No Discounts Applied..."}
            </span>
          </p>
        </section>
      )}
    </Modal>
  );
};

export default WalkinTransactionModal;
