export interface YNABTransaction {
  id: string;
  date: string; // ISO format: "2024-05-07"
  amount: number; // milliunits (divide by 1000 for dollars)
  memo: string | null;
  cleared: "cleared" | "uncleared" | "reconciled";
  approved: boolean;
  flag_color: string | null;
  account_id: string;
  account_name: string;
  payee_id: string | null;
  payee_name: string | null;
  category_id: string | null;
  category_name: string | null;
  transfer_account_id: string | null;
  deleted: boolean;
}

export interface YNABTransactionsResponse {
  data: {
    transactions: YNABTransaction[];
    server_knowledge: number;
  };
}
