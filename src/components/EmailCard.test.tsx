import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EmailCard } from "./EmailCard";
import { sessionStore } from "@/store/session";
import type { EmailTransaction, RawEmail } from "@/types";

function makeEmail(overrides: Partial<RawEmail> = {}): RawEmail {
  return {
    id: "e1",
    subject: "Your Amazon.com order",
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
    charge_amount: 47.82,
    charge_date: "2026-05-01",
    line_items: [{ name: "Stapler", quantity: 2, unit_price: 12.99 }],
    tax: 3.85,
    shipping: 0,
    discount: 0,
    gift_card: 0,
    reasoning: "Found order number in subject line.",
    parseValid: true,
    ...overrides,
  };
}

beforeEach(() => {
  sessionStore.setState({ emailTransactions: [] });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("parse button states", () => {
  it("shows enabled Parse button when unprocessed", () => {
    render(<EmailCard email={makeEmail({ parseStatus: "unprocessed" })} />);
    expect(screen.getByRole("button", { name: "Parse" })).toBeEnabled();
  });

  it("shows disabled Parsing… button while parsing", () => {
    render(<EmailCard email={makeEmail({ parseStatus: "parsing" })} />);
    expect(screen.getByRole("button", { name: "Parsing…" })).toBeDisabled();
  });

  it("shows enabled Reparse button when parsed", () => {
    render(<EmailCard email={makeEmail({ parseStatus: "parsed" })} />);
    expect(screen.getByRole("button", { name: "Reparse" })).toBeEnabled();
  });

  it("shows enabled Retry button on error", () => {
    render(<EmailCard email={makeEmail({ parseStatus: "error" })} />);
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
  });

  it("shows error message when status is error", () => {
    render(<EmailCard email={makeEmail({ parseStatus: "error" })} />);
    expect(screen.getByText(/parse failed/i)).toBeInTheDocument();
  });
});

describe("parsed zone display", () => {
  it("does not render the parsed zone when there are no transactions", () => {
    render(<EmailCard email={makeEmail({ parseStatus: "parsed" })} />);
    expect(screen.queryByTitle("111-2222222-3333333")).not.toBeInTheDocument();
  });

  it("shows order number and charge amount", () => {
    sessionStore.setState({ emailTransactions: [makeEmailTxn()] });
    render(<EmailCard email={makeEmail({ parseStatus: "parsed" })} />);
    expect(screen.getByTitle("111-2222222-3333333")).toBeInTheDocument();
    expect(screen.getByText("$47.82")).toBeInTheDocument();
  });

  it("only shows transactions belonging to this email", () => {
    sessionStore.setState({
      emailTransactions: [
        makeEmailTxn({ id: "et1", rawEmailId: "e1", order_number: "111-MINE-111" }),
        makeEmailTxn({ id: "et2", rawEmailId: "other-email", order_number: "222-OTHER-222" }),
      ],
    });
    render(<EmailCard email={makeEmail({ id: "e1", parseStatus: "parsed" })} />);
    expect(screen.getByTitle("111-MINE-111")).toBeInTheDocument();
    expect(screen.queryByTitle("222-OTHER-222")).not.toBeInTheDocument();
  });

  it("renders multiple order sections for a multi-shipment email", () => {
    sessionStore.setState({
      emailTransactions: [
        makeEmailTxn({ id: "et1", order_number: "111-FIRST-111" }),
        makeEmailTxn({ id: "et2", order_number: "111-SECOND-222" }),
      ],
    });
    render(<EmailCard email={makeEmail({ parseStatus: "parsed" })} />);
    expect(screen.getByTitle("111-FIRST-111")).toBeInTheDocument();
    expect(screen.getByTitle("111-SECOND-222")).toBeInTheDocument();
  });
});

describe("line item rendering", () => {
  it("shows just the name when quantity is 1", () => {
    sessionStore.setState({
      emailTransactions: [
        makeEmailTxn({ line_items: [{ name: "Paper clips", quantity: 1, unit_price: 4.99 }] }),
      ],
    });
    render(<EmailCard email={makeEmail({ parseStatus: "parsed" })} />);
    expect(screen.getByText("Paper clips")).toBeInTheDocument();
    expect(screen.queryByText(/×1/)).not.toBeInTheDocument();
  });

  it("appends ×qty when quantity is greater than 1", () => {
    sessionStore.setState({
      emailTransactions: [
        makeEmailTxn({ line_items: [{ name: "Stapler", quantity: 3, unit_price: 12.99 }] }),
      ],
    });
    render(<EmailCard email={makeEmail({ parseStatus: "parsed" })} />);
    expect(screen.getByText("Stapler ×3")).toBeInTheDocument();
  });

  it("shows the total price (qty × unit_price) for a line item", () => {
    sessionStore.setState({
      emailTransactions: [
        makeEmailTxn({ line_items: [{ name: "Stapler", quantity: 2, unit_price: 12.99 }] }),
      ],
    });
    render(<EmailCard email={makeEmail({ parseStatus: "parsed" })} />);
    expect(screen.getByText("$25.98")).toBeInTheDocument();
  });
});

describe("financial adjustment rows", () => {
  it("shows Tax row when non-zero", () => {
    sessionStore.setState({ emailTransactions: [makeEmailTxn({ tax: 3.85 })] });
    render(<EmailCard email={makeEmail({ parseStatus: "parsed" })} />);
    expect(screen.getByText("Tax")).toBeInTheDocument();
  });

  it("hides Tax row when zero", () => {
    sessionStore.setState({ emailTransactions: [makeEmailTxn({ tax: 0 })] });
    render(<EmailCard email={makeEmail({ parseStatus: "parsed" })} />);
    expect(screen.queryByText("Tax")).not.toBeInTheDocument();
  });

  it("shows Shipping row when non-zero", () => {
    sessionStore.setState({ emailTransactions: [makeEmailTxn({ shipping: 5.99 })] });
    render(<EmailCard email={makeEmail({ parseStatus: "parsed" })} />);
    expect(screen.getByText("Shipping")).toBeInTheDocument();
  });

  it("hides Shipping row when zero", () => {
    sessionStore.setState({ emailTransactions: [makeEmailTxn({ shipping: 0 })] });
    render(<EmailCard email={makeEmail({ parseStatus: "parsed" })} />);
    expect(screen.queryByText("Shipping")).not.toBeInTheDocument();
  });

  it("shows Discount row when non-zero", () => {
    sessionStore.setState({ emailTransactions: [makeEmailTxn({ discount: 10.0 })] });
    render(<EmailCard email={makeEmail({ parseStatus: "parsed" })} />);
    expect(screen.getByText("Discount")).toBeInTheDocument();
  });

  it("hides Discount row when zero", () => {
    sessionStore.setState({ emailTransactions: [makeEmailTxn({ discount: 0 })] });
    render(<EmailCard email={makeEmail({ parseStatus: "parsed" })} />);
    expect(screen.queryByText("Discount")).not.toBeInTheDocument();
  });

  it("shows Gift card row when non-zero", () => {
    sessionStore.setState({ emailTransactions: [makeEmailTxn({ gift_card: 25.0 })] });
    render(<EmailCard email={makeEmail({ parseStatus: "parsed" })} />);
    expect(screen.getByText("Gift card")).toBeInTheDocument();
  });

  it("hides Gift card row when zero", () => {
    sessionStore.setState({ emailTransactions: [makeEmailTxn({ gift_card: 0 })] });
    render(<EmailCard email={makeEmail({ parseStatus: "parsed" })} />);
    expect(screen.queryByText("Gift card")).not.toBeInTheDocument();
  });
});

describe("parse validity", () => {
  it("shows mismatch warning when parseValid is false", () => {
    sessionStore.setState({ emailTransactions: [makeEmailTxn({ parseValid: false })] });
    render(<EmailCard email={makeEmail({ parseStatus: "parsed" })} />);
    expect(screen.getByText(/parse mismatch/i)).toBeInTheDocument();
  });

  it("does not show mismatch warning when parseValid is true", () => {
    sessionStore.setState({ emailTransactions: [makeEmailTxn({ parseValid: true })] });
    render(<EmailCard email={makeEmail({ parseStatus: "parsed" })} />);
    expect(screen.queryByText(/parse mismatch/i)).not.toBeInTheDocument();
  });
});

describe("reasoning", () => {
  it("renders the reasoning text inside a details element", () => {
    sessionStore.setState({
      emailTransactions: [makeEmailTxn({ reasoning: "LLM identified order by subject line." })],
    });
    render(<EmailCard email={makeEmail({ parseStatus: "parsed" })} />);
    expect(screen.getByText("LLM identified order by subject line.")).toBeInTheDocument();
    expect(screen.getByRole("group")).toBeInTheDocument();
  });
});

describe("parseEmail", () => {
  it("calls the parse API with the email body and date on Parse click", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [makeEmailTxn()],
    });
    vi.stubGlobal("fetch", mockFetch);

    const email = makeEmail({ parseStatus: "unprocessed" });
    render(<EmailCard email={email} />);
    fireEvent.click(screen.getByRole("button", { name: "Parse" }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/emails/${email.id}/parse`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ body: email.body, date: email.date }),
        }),
      );
    });
  });

  it("adds parsed transactions to the store on success", async () => {
    const txn = makeEmailTxn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [txn],
    }));

    render(<EmailCard email={makeEmail({ parseStatus: "unprocessed" })} />);
    fireEvent.click(screen.getByRole("button", { name: "Parse" }));

    await waitFor(() => {
      expect(sessionStore.getState().emailTransactions).toContainEqual(txn);
    });
  });

  it("clears prior transactions and adds new ones on Reparse", async () => {
    const oldTxn = makeEmailTxn({ id: "et-old", order_number: "OLD-ORDER" });
    const newTxn = makeEmailTxn({ id: "et-new", order_number: "NEW-ORDER" });

    sessionStore.setState({ emailTransactions: [oldTxn] });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [newTxn],
    }));

    render(<EmailCard email={makeEmail({ parseStatus: "parsed" })} />);
    fireEvent.click(screen.getByRole("button", { name: "Reparse" }));

    await waitFor(() => {
      const txns = sessionStore.getState().emailTransactions;
      expect(txns).toHaveLength(1);
      expect(txns[0]?.id).toBe("et-new");
    });
  });

  it("sets parse status to error when the API call fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    sessionStore.setState({ rawEmails: [makeEmail()] });

    render(<EmailCard email={makeEmail({ parseStatus: "unprocessed" })} />);
    fireEvent.click(screen.getByRole("button", { name: "Parse" }));

    await waitFor(() => {
      const email = sessionStore.getState().rawEmails.find((e) => e.id === "e1");
      expect(email?.parseStatus).toBe("error");
    });
  });
});
