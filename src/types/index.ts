import type { YNABTransaction } from "@/ynab/types";

export type { YNABTransaction };

export type EmailParseStatus = "unprocessed" | "parsing" | "parsed" | "error";

export interface RawEmail {
  id: string;
  subject: string;
  date: string;
  body: string;
  parseStatus: EmailParseStatus;
}

export type EmailSource = "mock" | "gmail";

export interface EmailsResponse {
  source: EmailSource;
  emails: RawEmail[];
}

export interface LineItem {
  name: string;
  quantity: number;
  unit_price: number;
}

export interface EmailTransaction {
  id: string;
  rawEmailId: string;
  order_number: string;
  charge_amount: number;
  charge_date: string;
  line_items: LineItem[];
  tax: number;
  shipping: number;
  discount: number;
  gift_card: number;
  reasoning: string;
  // True if sum(line_items × qty) + tax + shipping − discount − gift_card is
  // within 5 cents of charge_amount. False parses are rendered as draggable=false.
  parseValid: boolean;
}

export interface SplitLine {
  memo: string;
  amount: number;
}

export interface ReconciliationMath {
  itemsSubtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  giftCard: number;
  totalAdjustment: number;
  perSplitAdjustment: number;
  remainder: number;
}

export interface SplitResult {
  kind: "ok";
  splits: SplitLine[];
  math: ReconciliationMath;
}

export interface BlockedResult {
  kind: "blocked";
  reason: string;
  delta: number;
}

export type ReconciliationResult = SplitResult | BlockedResult;

export type SessionPhase = "loading" | "working" | "pushing" | "done";

export interface PushPayloadItem {
  ynabTxnId: string;
  splits: SplitLine[];
}

export interface PushResult {
  updated: number;
  skipped: number;
  unmatched: number;
}
