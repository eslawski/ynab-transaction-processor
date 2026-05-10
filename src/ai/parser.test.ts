import { describe, expect, it } from "vitest";
import { computeParseValidation, validateParsedTransaction } from "./parser";

const baseLineItem = (overrides: Partial<{ name: string; quantity: number; unit_price: number }> = {}) => ({
  name: "Widget",
  quantity: 1,
  unit_price: 10,
  ...overrides,
});

describe("validateParsedTransaction", () => {
  it("passes when items + tax + shipping equals charge_amount exactly", () => {
    expect(
      validateParsedTransaction({
        charge_amount: 12.34,
        line_items: [baseLineItem({ unit_price: 10 })],
        tax: 1,
        shipping: 1.34,
        discount: 0,
        gift_card: 0,
      }),
    ).toBe(true);
  });

  it("passes when discount and gift_card reduce items to charge_amount", () => {
    expect(
      validateParsedTransaction({
        charge_amount: 5,
        line_items: [baseLineItem({ unit_price: 20, quantity: 1 })],
        tax: 0,
        shipping: 0,
        discount: 5,
        gift_card: 10,
      }),
    ).toBe(true);
  });

  it("passes when fully gift-card-covered (charge_amount = 0)", () => {
    expect(
      validateParsedTransaction({
        charge_amount: 0,
        line_items: [baseLineItem({ unit_price: 9.2 })],
        tax: 0,
        shipping: 0,
        discount: 0,
        gift_card: 9.2,
      }),
    ).toBe(true);
  });

  it("passes when delta is within 5 cents (3 cent rounding noise)", () => {
    expect(
      validateParsedTransaction({
        charge_amount: 12.37,
        line_items: [baseLineItem({ unit_price: 10 })],
        tax: 1,
        shipping: 1.34,
        discount: 0,
        gift_card: 0,
      }),
    ).toBe(true);
  });

  it("passes at exactly 5 cents", () => {
    expect(
      validateParsedTransaction({
        charge_amount: 12.39,
        line_items: [baseLineItem({ unit_price: 10 })],
        tax: 1,
        shipping: 1.34,
        discount: 0,
        gift_card: 0,
      }),
    ).toBe(true);
  });

  it("fails when delta exceeds 5 cents", () => {
    expect(
      validateParsedTransaction({
        charge_amount: 13,
        line_items: [baseLineItem({ unit_price: 10 })],
        tax: 1,
        shipping: 1.34,
        discount: 0,
        gift_card: 0,
      }),
    ).toBe(false);
  });

  it("multiplies unit_price by quantity in the items subtotal", () => {
    expect(
      validateParsedTransaction({
        charge_amount: 36.36,
        line_items: [
          { name: "Air filter", quantity: 1, unit_price: 13.77 },
          { name: "Engine oil", quantity: 2, unit_price: 10.26 },
        ],
        tax: 2.07,
        shipping: 0,
        discount: 0,
        gift_card: 0,
      }),
    ).toBe(true);
  });
});

describe("computeParseValidation", () => {
  it("returns delta and itemsSubtotal for a passing case", () => {
    const detail = computeParseValidation({
      charge_amount: 12.34,
      line_items: [baseLineItem({ unit_price: 10 })],
      tax: 1,
      shipping: 1.34,
      discount: 0,
      gift_card: 0,
    });
    expect(detail.valid).toBe(true);
    expect(detail.itemsSubtotal).toBe(10);
    expect(detail.computedTotal).toBeCloseTo(12.34, 2);
    expect(detail.delta).toBeCloseTo(0, 2);
  });

  it("returns positive delta when computed total exceeds charge_amount", () => {
    const detail = computeParseValidation({
      charge_amount: 10,
      line_items: [baseLineItem({ unit_price: 12 })],
      tax: 0,
      shipping: 0,
      discount: 0,
      gift_card: 0,
    });
    expect(detail.valid).toBe(false);
    expect(detail.delta).toBeCloseTo(2, 2);
  });
});
