import type { EmailTransaction } from "@/types";
import { reconcile } from "@/reconciler/reconciler";

const DUMMY_CATEGORY_ID = "00000000-0000-0000-0000-000000000000";
const YNAB_BASE_URL = "https://api.ynab.com/v1";

export async function createYNABTransaction(txn: EmailTransaction): Promise<string> {
  const token = process.env.YNAB_TOKEN;
  if (!token) throw new Error("YNAB_TOKEN environment variable is not set");

  const budgetId = process.env.YNAB_BUDGET_ID;
  if (!budgetId) throw new Error("YNAB_BUDGET_ID environment variable is not set");

  const accountId = process.env.YNAB_ACCOUNT_ID;
  if (!accountId) throw new Error("YNAB_ACCOUNT_ID environment variable is not set");

  const result = reconcile(txn, txn.charge_amount);
  if (result.kind === "blocked") {
    throw new Error(`Cannot split transaction: ${result.reason}`);
  }

  const subtransactions = result.splits.map((s) => ({
    amount: -Math.round(s.amount * 1000),
    memo: s.memo,
    category_id: DUMMY_CATEGORY_ID,
  }));

  const res = await fetch(`${YNAB_BASE_URL}/budgets/${budgetId}/transactions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transaction: {
        account_id: accountId,
        date: txn.charge_date,
        amount: -Math.round(txn.charge_amount * 1000),
        payee_name: "Amazon",
        approved: false,
        cleared: "uncleared",
        subtransactions,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`YNAB API error ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as { data: { transaction: { id: string } } };
  return json.data.transaction.id;
}
