import type { EmailTransaction, LineItem, RawEmail } from "@/types";
import { callClaudeForToolUse } from "./anthropic";
import { PARSE_SYSTEM_PROMPT, PARSE_TOOL, PARSE_TOOL_NAME } from "./prompt";

export const PARSE_TOLERANCE_DOLLARS = 0.05;

export interface ParsedTransactionFromLLM {
  order_number: string;
  charge_amount: number;
  charge_date: string;
  line_items: LineItem[];
  tax: number;
  shipping: number;
  discount: number;
  gift_card: number;
  reasoning: string;
}

interface ToolInput {
  transactions?: ParsedTransactionFromLLM[];
}

export async function parseEmailWithClaude(email: Pick<RawEmail, "id" | "body" | "date">): Promise<EmailTransaction[]> {
  const userMessage = `Email date: ${email.date}\n\nEmail body:\n\n${email.body}`;

  const input = (await callClaudeForToolUse({
    systemPrompt: PARSE_SYSTEM_PROMPT,
    userMessage,
    tool: PARSE_TOOL,
    toolName: PARSE_TOOL_NAME,
  })) as ToolInput;

  const transactions = input.transactions ?? [];
  return transactions.map((t, idx) => buildEmailTransaction(t, email.id, idx));
}

function buildEmailTransaction(
  parsed: ParsedTransactionFromLLM,
  rawEmailId: string,
  index: number,
): EmailTransaction {
  return {
    id: `${rawEmailId}::txn-${index}`,
    rawEmailId,
    order_number: parsed.order_number,
    charge_amount: parsed.charge_amount,
    charge_date: parsed.charge_date,
    line_items: parsed.line_items,
    tax: parsed.tax,
    shipping: parsed.shipping,
    discount: parsed.discount,
    gift_card: parsed.gift_card,
    reasoning: parsed.reasoning,
    parseValid: validateParsedTransaction(parsed),
  };
}

export interface ParseValidationDetail {
  valid: boolean;
  delta: number;
  itemsSubtotal: number;
  computedTotal: number;
}

export function validateParsedTransaction(t: {
  charge_amount: number;
  line_items: LineItem[];
  tax: number;
  shipping: number;
  discount: number;
  gift_card: number;
}): boolean {
  return computeParseValidation(t).valid;
}

export function computeParseValidation(t: {
  charge_amount: number;
  line_items: LineItem[];
  tax: number;
  shipping: number;
  discount: number;
  gift_card: number;
}): ParseValidationDetail {
  const itemsSubtotal = t.line_items.reduce(
    (sum, li) => sum + li.unit_price * li.quantity,
    0,
  );
  const computedTotal = itemsSubtotal + t.tax + t.shipping - t.discount - t.gift_card;
  const delta = Math.abs(computedTotal - t.charge_amount);
  // Round delta to cents to avoid floating-point noise just below tolerance.
  const deltaCents = Math.round(delta * 100);
  const toleranceCents = Math.round(PARSE_TOLERANCE_DOLLARS * 100);
  return {
    valid: deltaCents <= toleranceCents,
    delta,
    itemsSubtotal,
    computedTotal,
  };
}
