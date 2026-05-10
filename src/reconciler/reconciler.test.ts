import { describe, expect, it } from "vitest";
import type { EmailTransaction } from "@/types";
import { reconcile } from "./reconciler";

function makeEmailTxn(overrides: Partial<EmailTransaction> = {}): EmailTransaction {
  return {
    id: "et1",
    rawEmailId: "e1",
    order_number: "111-2222222-3333333",
    charge_amount: 0,
    charge_date: "2026-05-01",
    line_items: [],
    tax: 0,
    shipping: 0,
    discount: 0,
    gift_card: 0,
    reasoning: "",
    parseValid: true,
    ...overrides,
  };
}

describe("reconcile", () => {
  it("single-item order distributes tax and shipping into the one split", () => {
    const txn = makeEmailTxn({
      charge_amount: 12.34,
      line_items: [{ name: "Widget", quantity: 1, unit_price: 10 }],
      tax: 1,
      shipping: 1.34,
    });

    const result = reconcile(txn, 12.34);

    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.splits).toEqual([{ memo: "Widget (1)", amount: 12.34 }]);
  });

  it("multi-item order spreads an evenly divisible adjustment across splits", () => {
    const txn = makeEmailTxn({
      charge_amount: 22,
      line_items: [
        { name: "Alpha", quantity: 1, unit_price: 10 },
        { name: "Beta", quantity: 1, unit_price: 10 },
      ],
      tax: 2,
    });

    const result = reconcile(txn, 22);

    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.splits).toEqual([
      { memo: "Alpha (1)", amount: 11 },
      { memo: "Beta (1)", amount: 11 },
    ]);
  });

  it("applies the remainder from uneven division to the first split line", () => {
    const txn = makeEmailTxn({
      charge_amount: 23.01,
      line_items: [
        { name: "Alpha", quantity: 1, unit_price: 10 },
        { name: "Beta", quantity: 1, unit_price: 10 },
      ],
      tax: 3.01,
    });

    const result = reconcile(txn, 23.01);

    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.splits).toEqual([
      { memo: "Alpha (1)", amount: 11.51 },
      { memo: "Beta (1)", amount: 11.5 },
    ]);
  });

  it("subtracts discount and gift card from the per-split adjustment", () => {
    const txn = makeEmailTxn({
      // items 20 + tax 1 - discount 3 - gift_card 4 = 14
      charge_amount: 14,
      line_items: [
        { name: "Alpha", quantity: 1, unit_price: 10 },
        { name: "Beta", quantity: 1, unit_price: 10 },
      ],
      tax: 1,
      discount: 3,
      gift_card: 4,
    });

    const result = reconcile(txn, 14);

    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.splits).toEqual([
      { memo: "Alpha (1)", amount: 7 },
      { memo: "Beta (1)", amount: 7 },
    ]);
  });

  it("reconciles an order fully covered by a gift card to zero per split", () => {
    const txn = makeEmailTxn({
      charge_amount: 0,
      line_items: [{ name: "Widget", quantity: 1, unit_price: 9.2 }],
      gift_card: 9.2,
    });

    const result = reconcile(txn, 0);

    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.splits).toEqual([{ memo: "Widget (1)", amount: 0 }]);
  });

  it("returns a BlockedResult when computed splits drift more than 5 cents from the YNAB amount", () => {
    const txn = makeEmailTxn({
      // computed total = 11.00; YNAB amount differs by 6 cents
      charge_amount: 11,
      line_items: [{ name: "Widget", quantity: 1, unit_price: 10 }],
      tax: 1,
    });

    const result = reconcile(txn, 11.06);

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.delta).toBeCloseTo(0.06, 10);
  });

  it("truncates the item name to 30 characters before the quantity suffix", () => {
    const longName = "A".repeat(45);
    const txn = makeEmailTxn({
      charge_amount: 10,
      line_items: [{ name: longName, quantity: 1, unit_price: 10 }],
    });

    const result = reconcile(txn, 10);

    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.splits[0]!.memo).toBe(`${"A".repeat(30)} (1)`);
  });

  it("collapses an item with quantity > 1 into one split line, not multiple", () => {
    const txn = makeEmailTxn({
      charge_amount: 22,
      line_items: [{ name: "Widget", quantity: 2, unit_price: 10 }],
      tax: 2,
    });

    const result = reconcile(txn, 22);

    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.splits).toEqual([{ memo: "Widget (2)", amount: 22 }]);
  });
});
