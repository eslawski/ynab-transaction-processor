import type { PushPayloadItem, PushResult } from "@/types";

const YNAB_BASE_URL = "https://api.ynab.com/v1";

export type { PushPayloadItem };

export async function pushTransactions(
  items: PushPayloadItem[],
  skipped: number,
  unmatched: number,
): Promise<PushResult> {
  const token = process.env.YNAB_TOKEN;
  if (!token) throw new Error("YNAB_TOKEN environment variable is not set");

  const budgetId = process.env.YNAB_BUDGET_ID;
  if (!budgetId) throw new Error("YNAB_BUDGET_ID environment variable is not set");

  for (const item of items) {
    const subtransactions = item.splits.map((s) => ({
      amount: -Math.round(s.amount * 1000),
      memo: s.memo,
    }));

    const res = await fetch(`${YNAB_BASE_URL}/budgets/${budgetId}/transactions/${item.ynabTxnId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ transaction: { subtransactions } }),
    });

    if (!res.ok) {
      throw new Error(`YNAB API error ${res.status}: ${await res.text()}`);
    }
  }

  return { updated: items.length, skipped, unmatched };
}
