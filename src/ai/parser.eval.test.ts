// Live API eval tests for parseEmailWithClaude. These hit the real Anthropic
// API and run only via `bun run test:eval` (excluded from the default vitest
// run). Use them to catch regressions in the system prompt or parsing logic.
//
// Expected values below are sourced from a manually verified parse run
// (see parsed_mock_data.html at the repo root). Reasoning and charge_date
// are intentionally not asserted on. Line items are matched by a short
// name prefix to tolerate small variations in the LLM's 40-char truncation.

import { describe, expect, it } from "vitest";
import { loadFixtureEmails } from "@/gmail/fixtures";
import type { EmailTransaction, RawEmail } from "@/types";
import { parseEmailWithClaude } from "./parser";

interface ExpectedLineItem {
  name_prefix: string;
  quantity: number;
  unit_price: number;
}

interface ExpectedTransaction {
  order_number: string;
  charge_amount: number;
  tax: number;
  shipping: number;
  discount: number;
  gift_card: number;
  line_items: ExpectedLineItem[];
}

const EXPECTED: Record<string, ExpectedTransaction[]> = {
  "fixture-single-transaction": [
    {
      order_number: "113-5013604-0940264",
      charge_amount: 36.36,
      tax: 2.07,
      shipping: 0,
      discount: 0,
      gift_card: 0,
      line_items: [
        { name_prefix: "Panari 7000 Series", quantity: 1, unit_price: 13.77 },
        { name_prefix: "STP Premium Small", quantity: 2, unit_price: 10.26 },
      ],
    },
  ],
  "fixture-multiple-transactions": [
    {
      order_number: "113-5068025-3552244",
      charge_amount: 8.47,
      tax: 0.48,
      shipping: 0,
      discount: 0,
      gift_card: 0,
      line_items: [
        { name_prefix: "Mod Podge", quantity: 1, unit_price: 7.99 },
      ],
    },
    {
      order_number: "113-7040670-7917827",
      charge_amount: 67.16,
      tax: 3.80,
      shipping: 0,
      discount: 0,
      gift_card: 0,
      line_items: [
        { name_prefix: "KipiPol", quantity: 1, unit_price: 23.99 },
        { name_prefix: "Aroveea", quantity: 1, unit_price: 14.99 },
        { name_prefix: "Walrus", quantity: 1, unit_price: 16.90 },
        { name_prefix: "HotHands", quantity: 1, unit_price: 7.48 },
      ],
    },
  ],
  "fixture-single-transaction-fully-covered": [
    {
      order_number: "111-4127947-7928237",
      charge_amount: 0,
      tax: 0,
      shipping: 0,
      discount: 0,
      gift_card: 9.20,
      line_items: [
        { name_prefix: "Amazon Basics Hardboard", quantity: 1, unit_price: 9.20 },
      ],
    },
  ],
  "fixture-single-transaction-partially-covered": [
    {
      order_number: "111-3351789-9551407",
      charge_amount: 14.22,
      tax: 0,
      shipping: 0,
      discount: 0,
      gift_card: 9.77,
      line_items: [
        { name_prefix: "The Miracles Among Us", quantity: 1, unit_price: 23.99 },
      ],
    },
  ],
};

function findEmail(emails: RawEmail[], id: string): RawEmail {
  const email = emails.find((e) => e.id === id);
  if (!email) throw new Error(`Fixture email not found: ${id}`);
  return email;
}

function findTransaction(actual: EmailTransaction[], orderNumber: string): EmailTransaction {
  const match = actual.find((t) => t.order_number === orderNumber);
  if (!match) {
    const seen = actual.map((t) => t.order_number).join(", ") || "<none>";
    throw new Error(`Order ${orderNumber} not parsed. Got: ${seen}`);
  }
  return match;
}

function assertTransaction(actual: EmailTransaction, expected: ExpectedTransaction): void {
  expect(actual.charge_amount, `charge_amount for ${expected.order_number}`).toBeCloseTo(expected.charge_amount, 2);
  expect(actual.tax, `tax for ${expected.order_number}`).toBeCloseTo(expected.tax, 2);
  expect(actual.shipping, `shipping for ${expected.order_number}`).toBeCloseTo(expected.shipping, 2);
  expect(actual.discount, `discount for ${expected.order_number}`).toBeCloseTo(expected.discount, 2);
  expect(actual.gift_card, `gift_card for ${expected.order_number}`).toBeCloseTo(expected.gift_card, 2);

  expect(
    actual.line_items.length,
    `line_items count for ${expected.order_number} (got: ${actual.line_items.map((li) => li.name).join(" | ")})`,
  ).toBe(expected.line_items.length);

  for (const exp of expected.line_items) {
    const li = actual.line_items.find((x) => x.name.startsWith(exp.name_prefix));
    if (!li) {
      const names = actual.line_items.map((x) => `"${x.name}"`).join(", ");
      throw new Error(
        `No line item starts with "${exp.name_prefix}" for ${expected.order_number}. Got: ${names}`,
      );
    }
    expect(li.quantity, `quantity for "${exp.name_prefix}"`).toBe(exp.quantity);
    expect(li.unit_price, `unit_price for "${exp.name_prefix}"`).toBeCloseTo(exp.unit_price, 2);
  }
}

describe.concurrent("parseEmailWithClaude (live API)", () => {
  const emails = loadFixtureEmails();

  for (const [fixtureId, expectedTxns] of Object.entries(EXPECTED)) {
    it(`parses ${fixtureId} with correct amounts`, async () => {
      const email = findEmail(emails, fixtureId);
      const actual = await parseEmailWithClaude(email);

      expect(
        actual.length,
        `transaction count for ${fixtureId} (got order_numbers: ${actual.map((t) => t.order_number).join(", ")})`,
      ).toBe(expectedTxns.length);

      for (const expected of expectedTxns) {
        const txn = findTransaction(actual, expected.order_number);
        assertTransaction(txn, expected);
      }
    });
  }
});
