import type { YNABTransactionsResponse, YNABTransaction } from "./types";

const YNAB_BASE_URL = "https://api.ynab.com/v1";

export async function getUnapprovedTransactions(): Promise<YNABTransaction[]> {
  const token = process.env.YNAB_TOKEN;
  if (!token) {
    throw new Error("YNAB_TOKEN environment variable is not set");
  }

  const budgetId = process.env.YNAB_BUDGET_ID;
  if (!budgetId) {
    throw new Error("YNAB_BUDGET_ID environment variable is not set");
  }

  const accountId = process.env.YNAB_ACCOUNT_ID;
  if (!accountId) {
    throw new Error("YNAB_ACCOUNT_ID environment variable is not set");
  }

  const url = `${YNAB_BASE_URL}/budgets/${budgetId}/accounts/${accountId}/transactions?type=unapproved`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`YNAB API error ${res.status}: ${text}`);
  }

  const json: YNABTransactionsResponse = await res.json();
  return json.data.transactions;
}
