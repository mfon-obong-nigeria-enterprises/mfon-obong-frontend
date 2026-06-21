import type { Client } from "@/types/types";
import type { Transaction } from "@/types/transactions";
import { useMemo } from "react";
import {
  formatCurrency
} from "@/utils/formatCurrency";
import { formatLargeNumber, formatLargeMonetaryNumber } from "@/utils/formatLargeNumber";

const ClientDetailInfo = ({
  client,
  transactions
}: {
  client: Client;
  transactions: Transaction[];
}) => {

  const totalOrders = useMemo(() => {
    if (!transactions || transactions.length === 0) return 0;
    return transactions.filter(
      (txn) => txn.type === "PURCHASE"
    ).length;
  }, [transactions]);

  const lifetimeValue = useMemo(() => {
    if (!transactions || transactions.length === 0) return "₦0";
    const total = transactions.reduce((sum, txn) => {
      if (txn.type === "PURCHASE") {
        return sum + Math.abs(txn.total ?? 0);
      }
      return sum;
    }, 0);
    return `${formatLargeMonetaryNumber(total)}`;
  }, [transactions]);

  // Determine visual status
  const accountStatus = useMemo(() => {
    if (client.balance > 0) return { text: "Credit", class: "text-[#2ECC71]" };
    if (client.balance < 0) return { text: "Overdue", class: "text-[#EF4444]" };
    return { text: "Current", class: "text-[#7d7d7d]" };
  }, [client.balance]);

  if (!client) return null;

  return (
    <section className="bg-white p-6 md:p-6 rounded-xl lg:max-w-[347px] font-sans shadow-sm sticky top-6 overflow-y-auto max-h-[calc(100vh-6rem)]">
      {/* Header */}
      <h1 className="text-[16px] font-semibold text-[#333333] mb-8">
        {client.name || "Null"}
      </h1>

      {/* Balance Card */}
      
      <div 
  className={`relative flex flex-col justify-center px-6 py-7 rounded-lg mb-8 overflow-hidden ${
    client.balance > 0
      ? "bg-[#E2F3EB]"
      : client.balance < 0
      ? "bg-[#FFE9E9]"
      : "bg-[#F5F5F5]"
  }`}
>
  {/* This div acts as the "Border" */}
  <div 
    className={`absolute left-0 top-0 bottom-0 w-[5px] ${
      client.balance > 0
        ? "bg-[#2ECC71]"
        : client.balance < 0
        ? "bg-[#EF4444]"
        : "bg-[#7D7D7D]"
    }`} 
  />

  <div className="flex justify-between items-start w-full">
    <div className="flex flex-col gap-2">
      <span className="text-[15px] text-[#333333]">Current balance</span>
      <span className={`text-[28px] font-bold ${
        client.balance > 0
          ? "text-[#2ECC71]"
          : client.balance < 0
          ? "text-[#F95353]"
          : "text-[#444444]"
      }`}>
        {formatCurrency(client.balance)}
      </span>
    </div>
    
  </div>
</div>

      {/* Details List */}
      <div className="flex flex-col w-full mb-8 gap-1">
        {/* Phone */}
        <div className="flex justify-between items-center py-1.5 border-b border-[#D9D9D9]">
            <span className="text-[11px] text-[#7D7D7D]">Phone</span>
            <span className="text-[12px] text-[#444444] font-medium">{client.phone || "080 xxx xxx xxx"}</span>
        </div>

        {/* Address */}
        <div className="flex justify-between items-center py-1.5 border-b border-[#D9D9D9]">
            <span className="text-[11px] text-[#7D7D7D]">Address</span>
            <span className="text-[12px] text-[#444444] font-medium text-right max-w-[60%]">
                {client.address || "124 Abak Road ( wharehouse 3)"}
            </span>
        </div>

        {/* Registered */}
        <div className="flex justify-between items-center py-1.5 border-b border-[#D9D9D9]">
            <span className="text-[11px] text-[#7D7D7D]">Registered</span>
            <span className="text-[12px] text-[#444444] font-medium">
                {client.createdAt ? new Date(client.createdAt).toLocaleDateString() : "5/4/2025"}
            </span>
        </div>

         {/* Last Activity */}
         <div className="flex justify-between items-center py-1.5 border-b border-[#D9D9D9]">
            <span className="text-[11px] text-[#7D7D7D]">Last activity</span>
            <span className="text-[12px] text-[#444444] font-medium">
                {client.lastTransactionDate ? new Date(client.lastTransactionDate).toLocaleDateString() : "5/25/2025"}
            </span>
        </div>

        {/* Account Status */}
        <div className="flex justify-between items-center py-1.5 border-b border-[#D9D9D9]">
            <span className="text-[11px] text-[#7D7D7D]">Account status</span>
            <span className={`text-[12px] font-medium ${accountStatus.class}`}>
                {accountStatus.text}
            </span>
        </div>
      </div>

      {/* Client Description */}
      <div className="bg-[#F5F5F5] border border-[#D9D9D9] rounded-lg p-2 mb-8">
        <h3 className="text-xs text-[#7D7D7D] mb-2">Client Description</h3>
        <p className="text-[10px] text-[#444444] ">
            {client.description && client.description.trim().length > 0
  ? client.description
  : "No description provided for this client."}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Total Order */}
        <div className="bg-[#F5F5F5] rounded-lg p-6 flex flex-col items-center justify-center gap-1">
          <span className="text-xl md:text-2xl font-semibold text-[#333333]">
            {formatLargeNumber(totalOrders)}
          </span>
          <span className="text-xs text-[#444444]">Total order</span>
        </div>

        {/* Lifetime Value */}
        <div className="bg-[#F5F5F5] rounded-lg p-6 flex flex-col items-center justify-center gap-1">
             <span className="text-xl md:text-2xl font-semibold text-[#333333]">
               {lifetimeValue}
             </span>
             <span className="text-xs text-[#444444]">Lifetime value</span>
        </div>

      </div>
    </section>
  );
};

export default ClientDetailInfo;