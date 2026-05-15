import { afterEach, describe, expect, it, vi } from "vitest";
import type { EmailTransaction } from "@/types";
import { createYNABTransaction } from "./create";

function okFetch(transactionId = "new-txn-id"): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: true,
    text: async () => "",
    json: async () => ({ data: { transaction: { id: transactionId } } }),
  }) as unknown as typeof fetch;
}

function baseTxn(overrides: Partial<EmailTransaction> = {}): EmailTransaction {
  return {
    id: "email-txn-1",
    rawEmailId: "raw-1",
    order_number: "ORDER-1",
    charge_amount: 12.34,
    charge_date: "2026-03-01",
    line_items: [{ name: "Widget", quantity: 1, unit_price: 12.34 }],
    tax: 0,
    shipping: 0,
    discount: 0,
    gift_card: 0,
    reasoning: "test",
    parseValid: true,
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("createYNABTransaction", () => {
  it("POSTs a single transaction without subtransactions when there is one split line", async () => {
    vi.stubEnv("YNAB_TOKEN", "test-token");
    vi.stubEnv("YNAB_BUDGET_ID", "budget-123");
    vi.stubEnv("YNAB_ACCOUNT_ID", "account-456");
    const mockFetch = okFetch();
    vi.stubGlobal("fetch", mockFetch);

    await createYNABTransaction(baseTxn());

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.ynab.com/v1/budgets/budget-123/transactions",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          transaction: {
            account_id: "account-456",
            date: "2026-03-01",
            amount: -12340,
            payee_name: "Amazon",
            approved: false,
            cleared: "uncleared",
            flag_color: "blue",
            category_id: "00000000-0000-0000-0000-000000000000",
            memo: "Widget (1)",
          },
        }),
      }),
    );
  });

  it("POSTs subtransactions when there is more than one split line", async () => {
    vi.stubEnv("YNAB_TOKEN", "test-token");
    vi.stubEnv("YNAB_BUDGET_ID", "budget-123");
    vi.stubEnv("YNAB_ACCOUNT_ID", "account-456");
    const mockFetch = okFetch();
    vi.stubGlobal("fetch", mockFetch);

    await createYNABTransaction(
      baseTxn({
        charge_amount: 20,
        line_items: [
          { name: "A", quantity: 1, unit_price: 10 },
          { name: "B", quantity: 1, unit_price: 10 },
        ],
      }),
    );

    const body = JSON.parse((mockFetch.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.transaction.amount).toBe(-20000);
    expect(body.transaction.flag_color).toBe("blue");
    expect(body.transaction.subtransactions).toHaveLength(2);
    expect(body.transaction.subtransactions[0]).toMatchObject({
      amount: -10000,
      memo: "A (1)",
      category_id: "00000000-0000-0000-0000-000000000000",
    });
    expect(body.transaction.subtransactions[1]).toMatchObject({
      amount: -10000,
      memo: "B (1)",
      category_id: "00000000-0000-0000-0000-000000000000",
    });
    expect(body.transaction.memo).toBeUndefined();
  });

  it("throws when YNAB_TOKEN is not set", async () => {
    vi.stubEnv("YNAB_BUDGET_ID", "bud");
    vi.stubEnv("YNAB_ACCOUNT_ID", "acc");
    vi.stubGlobal("fetch", okFetch());

    await expect(createYNABTransaction(baseTxn())).rejects.toThrow("YNAB_TOKEN");
  });
});
