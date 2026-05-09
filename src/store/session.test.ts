import { describe, it, expect } from "vitest";
import { createSessionStore } from "@/store/session";
import type { EmailTransaction, RawEmail, YNABTransaction } from "@/types";

function makeYnabTxn(overrides: Partial<YNABTransaction> = {}): YNABTransaction {
  return {
    id: "y1",
    date: "2026-05-01",
    amount: -12340,
    memo: null,
    cleared: "uncleared",
    approved: false,
    flag_color: null,
    account_id: "acc",
    account_name: "Amazon",
    payee_id: null,
    payee_name: "Amazon",
    category_id: null,
    category_name: null,
    transfer_account_id: null,
    deleted: false,
    ...overrides,
  };
}

function makeRawEmail(overrides: Partial<RawEmail> = {}): RawEmail {
  return {
    id: "e1",
    subject: "Your Amazon order",
    date: "2026-05-01",
    body: "<html>…</html>",
    parseStatus: "unprocessed",
    ...overrides,
  };
}

function makeEmailTxn(overrides: Partial<EmailTransaction> = {}): EmailTransaction {
  return {
    id: "et1",
    rawEmailId: "e1",
    order_number: "111-2222222-3333333",
    charge_amount: 12.34,
    charge_date: "2026-05-01",
    line_items: [{ name: "Widget", quantity: 1, unit_price: 10.0 }],
    tax: 1.0,
    shipping: 1.34,
    discount: 0,
    gift_card: 0,
    reasoning: "",
    parseValid: true,
    ...overrides,
  };
}

describe("session store", () => {
  it("starts in loading phase with empty collections", () => {
    const store = createSessionStore();
    const state = store.getState();
    expect(state.phase).toBe("loading");
    expect(state.ynabTransactions).toEqual([]);
    expect(state.rawEmails).toEqual([]);
    expect(state.emailTransactions).toEqual([]);
    expect(state.matches.size).toBe(0);
    expect(state.skippedYnabIds.size).toBe(0);
    expect(state.pushResult).toBeNull();
  });

  it("setYnabTransactions replaces the YNAB list", () => {
    const store = createSessionStore();
    const txn = makeYnabTxn({ id: "y42" });
    store.getState().setYnabTransactions([txn]);
    expect(store.getState().ynabTransactions).toEqual([txn]);
  });

  it("setRawEmails replaces the email list", () => {
    const store = createSessionStore();
    const email = makeRawEmail({ id: "e42" });
    store.getState().setRawEmails([email]);
    expect(store.getState().rawEmails).toEqual([email]);
  });

  it("setPhase transitions through loading → working → pushing → done", () => {
    const store = createSessionStore();
    expect(store.getState().phase).toBe("loading");

    store.getState().setPhase("working");
    expect(store.getState().phase).toBe("working");

    store.getState().setPhase("pushing");
    expect(store.getState().phase).toBe("pushing");

    store.getState().setPhase("done");
    expect(store.getState().phase).toBe("done");
  });

  it("updateEmailParseStatus updates the named email and leaves others alone", () => {
    const store = createSessionStore();
    const a = makeRawEmail({ id: "ea" });
    const b = makeRawEmail({ id: "eb" });
    store.getState().setRawEmails([a, b]);

    store.getState().updateEmailParseStatus("ea", "parsing");

    const emails = store.getState().rawEmails;
    expect(emails.find((e) => e.id === "ea")?.parseStatus).toBe("parsing");
    expect(emails.find((e) => e.id === "eb")?.parseStatus).toBe("unprocessed");
  });

  it("addEmailTransactions appends new email transactions to existing ones", () => {
    const store = createSessionStore();
    const first = makeEmailTxn({ id: "et1", rawEmailId: "ea" });
    const second = makeEmailTxn({ id: "et2", rawEmailId: "eb" });
    const third = makeEmailTxn({ id: "et3", rawEmailId: "eb" });

    store.getState().addEmailTransactions([first]);
    store.getState().addEmailTransactions([second, third]);

    expect(store.getState().emailTransactions).toEqual([first, second, third]);
  });

  it("matchTransaction records a YNAB↔email pair, and unmatchTransaction removes it", () => {
    const store = createSessionStore();

    store.getState().matchTransaction("y1", "et1");
    expect(store.getState().matches.get("y1")).toBe("et1");

    store.getState().unmatchTransaction("y1");
    expect(store.getState().matches.has("y1")).toBe(false);
  });

  it("skipYnabTransaction adds an id; unskipYnabTransaction removes it", () => {
    const store = createSessionStore();

    store.getState().skipYnabTransaction("y1");
    expect(store.getState().skippedYnabIds.has("y1")).toBe(true);

    store.getState().unskipYnabTransaction("y1");
    expect(store.getState().skippedYnabIds.has("y1")).toBe(false);
  });

  it("setPushResult records the post-push summary", () => {
    const store = createSessionStore();
    store.getState().setPushResult({ updated: 3, skipped: 1, unmatched: 2 });
    expect(store.getState().pushResult).toEqual({
      updated: 3,
      skipped: 1,
      unmatched: 2,
    });
  });
});
