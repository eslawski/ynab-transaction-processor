import { afterEach, describe, expect, it, vi } from "vitest";
import type { SplitLine } from "@/types";
import { pushTransactions, type PushPayloadItem } from "./push";

function makeItem(overrides: Partial<PushPayloadItem> = {}): PushPayloadItem {
  return {
    ynabTxnId: "txn-1",
    splits: [{ memo: "Widget (1)", amount: 12.34 }],
    ...overrides,
  };
}

function okFetch(): typeof fetch {
  return vi.fn().mockResolvedValue({ ok: true, text: async () => "" }) as unknown as typeof fetch;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("pushTransactions", () => {
  it("calls PATCH with subtransactions converted to negative milliunits and preserves memo", async () => {
    vi.stubEnv("YNAB_TOKEN", "test-token");
    vi.stubEnv("YNAB_BUDGET_ID", "budget-123");
    const mockFetch = okFetch();
    vi.stubGlobal("fetch", mockFetch);

    await pushTransactions([makeItem()], 0, 0);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.ynab.com/v1/budgets/budget-123/transactions/txn-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          transaction: {
            subtransactions: [{ amount: -12340, memo: "Widget (1)" }],
          },
        }),
      }),
    );
  });

  it("returns updated=items.length, plus the passed-in skipped and unmatched counts", async () => {
    vi.stubEnv("YNAB_TOKEN", "tok");
    vi.stubEnv("YNAB_BUDGET_ID", "bud");
    vi.stubGlobal("fetch", okFetch());

    const result = await pushTransactions(
      [makeItem({ ynabTxnId: "a" }), makeItem({ ynabTxnId: "b" })],
      3,
      1,
    );

    expect(result).toEqual({ updated: 2, skipped: 3, unmatched: 1 });
  });

  it("throws when YNAB_TOKEN is not set", async () => {
    vi.stubEnv("YNAB_BUDGET_ID", "bud");
    // YNAB_TOKEN deliberately not set

    await expect(pushTransactions([makeItem()], 0, 0)).rejects.toThrow("YNAB_TOKEN");
  });

  it("throws when YNAB_BUDGET_ID is not set", async () => {
    vi.stubEnv("YNAB_TOKEN", "tok");
    // YNAB_BUDGET_ID deliberately not set

    await expect(pushTransactions([makeItem()], 0, 0)).rejects.toThrow("YNAB_BUDGET_ID");
  });

  it("throws when the YNAB API returns a non-ok response", async () => {
    vi.stubEnv("YNAB_TOKEN", "tok");
    vi.stubEnv("YNAB_BUDGET_ID", "bud");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        text: async () => "unprocessable",
      }) as unknown as typeof fetch,
    );

    await expect(pushTransactions([makeItem()], 0, 0)).rejects.toThrow("422");
  });
});
