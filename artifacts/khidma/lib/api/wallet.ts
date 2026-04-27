import type { Transaction } from "@/lib/types";

import { requireSupabase } from "@/lib/supabase/client";
import { toAppError } from "@/lib/supabase/errors";

import { walletTxToTransaction, type DbWalletTx } from "./mappers";

export async function getWalletTransactions(
  freelancerId: string,
  opts?: { limit?: number },
): Promise<Transaction[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("wallet_transactions")
    .select("*")
    .eq("freelancer_id", freelancerId)
    .order("created_at", { ascending: false })
    .limit(Math.min(opts?.limit ?? 100, 200));
  if (error) throw toAppError(error);
  return ((data ?? []) as DbWalletTx[]).map(walletTxToTransaction);
}

/** Sum of all `available` earnings + adjustments minus refunds. */
export async function getComputedBalance(freelancerId: string): Promise<number> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("wallet_transactions")
    .select("amount, type, status")
    .eq("freelancer_id", freelancerId)
    .eq("status", "available");
  if (error) throw toAppError(error);
  return (data ?? []).reduce((acc: number, row: { amount: number; type: string }) => {
    const a = Number(row.amount);
    if (row.type === "refund") return acc - a;
    return acc + a;
  }, 0);
}
