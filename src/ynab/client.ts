import type { YNABTransactionsResponse, YNABTransaction } from "./types";

const YNAB_BASE_URL = "https://api.ynab.com/v1";
const BUDGET_ID = "e851004f-47e9-4675-98b0-7460f992cccc";
const ACCOUNT_ID = "25a630ba-2266-4ad5-a2df-db9d8985ee80";

export { BUDGET_ID, ACCOUNT_ID };

export async function getUnapprovedTransactions(): Promise<YNABTransaction[]> {
  const token = process.env.YNAB_TOKEN;
  if (!token) {
    throw new Error("YNAB_TOKEN environment variable is not set");
  }

  const url = `${YNAB_BASE_URL}/budgets/${BUDGET_ID}/accounts/${ACCOUNT_ID}/transactions?type=unapproved`;

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
