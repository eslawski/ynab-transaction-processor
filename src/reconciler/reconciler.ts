import type {
  BlockedResult,
  EmailTransaction,
  ReconciliationResult,
  SplitLine,
  SplitResult,
} from "@/types";

const TOLERANCE_CENTS = 5;
const MEMO_NAME_MAX = 30;

function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

function toDollars(cents: number): number {
  return cents / 100;
}

function formatMemo(name: string, quantity: number): string {
  return `${name.slice(0, MEMO_NAME_MAX)} (${quantity})`;
}

export function reconcile(
  emailTxn: EmailTransaction,
  ynabAmount: number,
): ReconciliationResult {
  const taxCents = toCents(emailTxn.tax);
  const shippingCents = toCents(emailTxn.shipping);
  const discountCents = toCents(emailTxn.discount);
  const giftCardCents = toCents(emailTxn.gift_card);
  const totalAdjustmentCents =
    taxCents + shippingCents - discountCents - giftCardCents;

  const splitCount = emailTxn.line_items.length;
  const perSplitAdjustmentCents = Math.trunc(totalAdjustmentCents / splitCount);
  const remainderCents =
    totalAdjustmentCents - perSplitAdjustmentCents * splitCount;

  const splitCentsByIndex = emailTxn.line_items.map(
    (li, i) =>
      toCents(li.unit_price) * li.quantity +
      perSplitAdjustmentCents +
      (i === 0 ? remainderCents : 0),
  );

  const sumOfSplitsCents = splitCentsByIndex.reduce((s, c) => s + c, 0);
  const ynabAmountCents = toCents(ynabAmount);
  const deltaCents = Math.abs(sumOfSplitsCents - ynabAmountCents);
  if (deltaCents > TOLERANCE_CENTS) {
    return {
      kind: "blocked",
      reason: `Computed splits differ from YNAB amount by ${deltaCents} cents (tolerance ${TOLERANCE_CENTS}).`,
      delta: toDollars(deltaCents),
    } satisfies BlockedResult;
  }

  const splits: SplitLine[] = emailTxn.line_items.map((li, i) => ({
    memo: formatMemo(li.name, li.quantity),
    amount: toDollars(splitCentsByIndex[i]!),
  }));

  const itemsSubtotalCents = emailTxn.line_items.reduce(
    (sum, li) => sum + toCents(li.unit_price) * li.quantity,
    0,
  );

  return {
    kind: "ok",
    splits,
    math: {
      itemsSubtotal: toDollars(itemsSubtotalCents),
      tax: emailTxn.tax,
      shipping: emailTxn.shipping,
      discount: emailTxn.discount,
      giftCard: emailTxn.gift_card,
      totalAdjustment: toDollars(totalAdjustmentCents),
      perSplitAdjustment: toDollars(perSplitAdjustmentCents),
      remainder: toDollars(remainderCents),
    },
  } satisfies SplitResult;
}
