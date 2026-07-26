/** @format */

import { getTransactionDate } from "./transactions";

export interface DebtCycle {
  cycleNumber: number;
  startDate: Date;
  endDate: Date | null; // null = ongoing
  transactions: any[];
  isOngoing: boolean;
}

export function computeOpeningBalance(allTxns: any[], currentBalance: number): number {
  let supplyOutstanding = 0;
  let depositTotal = 0;
  let returnTotal = 0;

  allTxns.forEach((txn) => {
    if (txn.type === "PURCHASE" || txn.type === "PICKUP" || txn.type === "WHOLESALE") {
      supplyOutstanding += (Number(txn.total) || 0) - (Number(txn.amountPaid) || 0);
    } else if (txn.type === "DEPOSIT") {
      depositTotal += Number(txn.total) || 0;
    } else if (txn.type === "RETURN") {
      returnTotal += Number(txn.actualAmountReturned) || 0;
    }
  });

  return currentBalance + supplyOutstanding - depositTotal - returnTotal;
}

// Takes transactions sorted oldest-first and an opening balance (balance before the first transaction).
// Returns an array of cycles split at every point the running balance hits 0.
export function computeDebtCycles(
  chronologicalTxns: any[],
  openingBalance: number
): DebtCycle[] {
  if (chronologicalTxns.length === 0) return [];

  const cycles: DebtCycle[] = [];
  let runningBalance = openingBalance;
  let cycleStart = 0;
  let cycleNumber = 1;

  for (let i = 0; i < chronologicalTxns.length; i++) {
    const txn = chronologicalTxns[i];

    // Prefer the backend-stored snapshot; fall back to manual replay
    if (
      txn.clientBalanceAfterTransaction !== undefined &&
      txn.clientBalanceAfterTransaction !== null
    ) {
      runningBalance = Number(txn.clientBalanceAfterTransaction);
    } else {
      if (txn.type === "PURCHASE" || txn.type === "PICKUP" || txn.type === "WHOLESALE") {
        runningBalance -= (Number(txn.total) || 0) - (Number(txn.amountPaid) || 0);
      } else if (txn.type === "DEPOSIT") {
        runningBalance += Number(txn.total) || 0;
      } else if (txn.type === "RETURN") {
        runningBalance += Number(txn.actualAmountReturned) || 0;
      }
    }

    // Tolerance of 0.5 to handle floating-point rounding
    if (Math.abs(runningBalance) < 0.5) {
      cycles.push({
        cycleNumber: cycleNumber++,
        startDate: getTransactionDate(chronologicalTxns[cycleStart]),
        endDate: getTransactionDate(txn),
        transactions: chronologicalTxns.slice(cycleStart, i + 1),
        isOngoing: false,
      });
      cycleStart = i + 1;
      runningBalance = 0;
    }
  }

  // Any remaining transactions form an ongoing (uncleared) cycle
  if (cycleStart < chronologicalTxns.length) {
    cycles.push({
      cycleNumber: cycleNumber,
      startDate: getTransactionDate(chronologicalTxns[cycleStart]),
      endDate: null,
      transactions: chronologicalTxns.slice(cycleStart),
      isOngoing: true,
    });
  }

  return cycles;
}
