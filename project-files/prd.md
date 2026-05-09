# Amazon YNAB Budget Assistant — PRD

**Status:** Draft  
**Version:** 1.1  
**Date:** May 2026  
**Audience:** Personal use only

---

## 1. Overview

This tool streamlines the process of reconciling Amazon credit card transactions in YNAB. Currently, each Amazon charge must be manually cross-referenced with order history, split by line item, and annotated with memos — a tedious, error-prone process.

The app automates the enrichment step by:
1. Pulling unapproved Amazon transactions from YNAB
2. Parsing Amazon order emails from Gmail via LLM
3. Matching email transactions to YNAB transactions
4. Computing per-item splits with correct amounts and memos
5. Pushing confirmed splits back to YNAB in bulk

The tool is for personal use only and is designed for simplicity and reliability over automation.

---

## 2. Goals

- Eliminate manual cross-referencing of Amazon charges against order history
- Automatically split YNAB transactions by line item with correct amounts and memos
- Provide a clear, interactive UI to match, review, and push enriched transactions
- Never push data to YNAB without explicit user confirmation
- Keep the workflow simple and opinionated — no unnecessary configuration

---

## 3. Non-Goals

- Automatic transaction categorization or approval in YNAB
- Support for multiple users or shared accounts
- Persistent session state or memory between runs
- Handling non-Amazon transactions
- Automatic scheduling or background sync — all runs are manually triggered

---

## 4. Data Sources

### 4.1 YNAB

- Pull all **unapproved** transactions from the designated Amazon credit card account
- Lookback window: **30 days**
- Maximum expected volume: **25 transactions per session**
- Each transaction exposes: date, amount, payee, memo, approval status

### 4.2 Gmail / Amazon Order Emails

- Amazon order confirmation emails are stored under a dedicated Gmail label called "Order Confirmations"
- Emails are fetched for the last 30 days and parsed via LLM into structured **email transactions**
- Each email may contain charges for multiple shipments; each shipment is parsed as a discrete email transaction
- Each email transaction exposes:
  - Order number
  - Charge amount (full shipment total: items + tax + shipping, minus discounts and gift cards)
  - Charge date
  - Line items (name, quantity, unit price)
  - Tax amount
  - Shipping amount
  - Discount amount (total discounts applied)
  - Gift card amount (total gift card redemption)
  - **LLM reasoning field** — a plain-language explanation of how the model interpreted the email, surfaced in the UI during review

---

## 5. Matching Logic

YNAB transactions are matched to email transactions on **charge amount only**. Date is not used as a primary match key because Amazon charges occur at shipment time, which may be days or weeks after the order confirmation email.

### 5.1 Unambiguous Match
- If exactly one email transaction matches a YNAB transaction's amount, they are automatically paired.

### 5.2 Ambiguous Match (Multiple Candidates)
- If multiple email transactions share the same amount, the user must manually select the correct match.
- Ambiguous YNAB transactions cannot be matched via drag-and-drop until the math reconciles (see Section 6.4). The triage UI is shown inline in the transaction detail view.

### 5.3 No Match
- YNAB transactions with no matching email transaction are shown as **unmatched** in the UI.
- This is not an error state — many email transactions in the 30-day window will naturally have no corresponding YNAB transaction.
- The user can explicitly **skip** an unmatched YNAB transaction to acknowledge it without pushing.

### 5.4 Blocked Match (Reconciliation Failure)
- If the financial math for a candidate email transaction cannot reconcile to the YNAB transaction amount within **5 cents**, drag-and-drop matching is **blocked** for that pair.
- The transaction is flagged and excluded from the push. The user handles it manually outside the app.
- This prevents bad math from silently entering YNAB.

### 5.5 Relationship Cardinality
- Each email transaction maps to **at most one** YNAB transaction.
- Each YNAB transaction maps to **at most one** email transaction.
- Multi-shipment orders produce multiple discrete email transactions and are handled naturally as separate 1:1 matches.

---

## 6. Financial Reconciliation

This is the core computational logic of the app. Every YNAB transaction charge represents the **full shipment total**: item prices + tax + shipping − discounts − gift card redemptions. The split lines must sum exactly to this amount.

### 6.1 What a YNAB Transaction Represents

A single YNAB transaction always equals one shipment total:

```
(sum of item prices) + tax + shipping − discounts − gift cards = YNAB charge amount
```

### 6.2 Split Amount Calculation

Adjustments (tax, shipping, discounts, gift cards) are distributed **evenly across split lines** — not proportionally by item price, and not as separate split lines.

**Split count** is the number of split lines (i.e. distinct item types), not the sum of quantities. A 3-pack of an item is one split line, not three.

```
per-split adjustment = total adjustment / number of split lines
split amount = item unit price + per-split tax + per-split shipping − per-split discount − per-split gift card
```

### 6.3 Rounding

- Even distribution will not always divide cleanly.
- Remainders (fractional cents) are applied to the **first split line**.
- The app auto-adjusts within a **5-cent tolerance** to ensure splits sum to the YNAB total.
- If the delta exceeds 5 cents, the match is blocked (see Section 5.4).

### 6.4 Example

YNAB charge: **$47.23**

| Field | Amount |
|---|---|
| Item A (qty 1) | $18.00 |
| Item B (qty 2) | $24.00 |
| Shipping | $5.99 |
| Tax | $3.24 |
| Discount | −$3.00 |
| Gift Card | −$1.00 |
| **Total** | **$47.23** |

2 split lines. Per-split adjustment: $(5.99 + 3.24 − 3.00 − 1.00) / 2 = $2.615$

| Split Line | Item Price | Adjustment | Final Amount |
|---|---|---|---|
| Item A (1) | $18.00 | +$2.62 (remainder here) | **$20.62** |
| Item B (2) | $24.00 | +$2.61 | **$26.61** |
| **Total** | | | **$47.23** ✓ |

---

## 7. Memo & Split Format

### 7.1 Split Line Memo
- Format: `<item name truncated to 30 chars> (<quantity>)`
- Examples: `Scotch Tape Heavy Duty (3)`, `USB-C Cable 6ft (1)`
- Items with quantity > 1 are grouped into a single split line, not duplicated
- No cap on number of splits — all line items are represented

### 7.2 Split Amount
- The final computed amount after even distribution of tax, shipping, discounts, and gift cards
- No adjustment labels appear in the memo — the split amount is the final number, full stop

---

## 8. User Interface & Flow

### Step 1 — Launch
- User manually opens the app and initiates a session
- App fetches unapproved Amazon YNAB transactions (last 30 days)
- App fetches and parses Amazon order emails from Gmail (last 30 days, scoped label) via LLM
- Matching logic runs automatically

### Step 2 — Side-by-Side View
- Main screen shows two columns: **YNAB transactions** (left) and **email transactions** (right)
- Matched pairs are visually linked; unmatched items on either side are clearly indicated
- User drags an email transaction card onto a YNAB transaction card to create a match
- An **unlink button** on each matched pair breaks the association (no drag-and-drop to undo)
- Blocked pairs (reconciliation failure) cannot be matched via drag-and-drop

### Step 3 — Transaction Detail View
Clicking into a YNAB transaction opens a detail view showing:

- Proposed split lines with memo and final computed amount per line
- Full math breakdown: item prices, tax, shipping, discount, gift card, per-split adjustment, and final amounts
- **LLM reasoning field** from the parsed email transaction — explains how the model interpreted the charge
- If ambiguous (multiple email candidates): user selects the correct match before splits are shown
- If unmatched: user can mark the transaction as **skipped**

### Step 4 — Confirmation & Push
- User initiates a bulk push when satisfied
- Confirmation screen shows a summary count: transactions to update / skipped / unmatched
- User confirms and the app writes all matched transactions to YNAB as split transactions
- Skipped and unmatched transactions are excluded

### Step 5 — Result Summary
- Brief post-push summary, e.g. `14 transactions updated, 3 skipped, 2 unmatched`

---

## 9. Edge Cases

| Scenario | Handling |
|---|---|
| Multiple email transactions match the same YNAB amount | User manually selects the correct match from candidates in the detail view |
| No email transaction matches a YNAB transaction | Shown as unmatched; user can skip |
| Non-order Amazon charges (Prime, Audible, AWS, etc.) | No matching email exists; falls into unmatched bucket |
| Multi-shipment orders | Amazon emails break these into per-shipment records; each is a discrete 1:1 email transaction |
| Order with many line items | All items represented as individual splits; no cap |
| Rounding remainder from even distribution | Applied to the first split line |
| Math reconciliation delta > 5 cents | Match is blocked; transaction flagged for manual handling outside the app |
| User wants to undo a match | Unlink button on matched pair; no drag-and-drop undo |
| Push with unmatched or skipped transactions remaining | Those transactions are excluded; push proceeds for matched transactions only |
| LLM parses ambiguous or incomplete email data | Reasoning field surfaces the model's interpretation; user can review before confirming |

---

## 10. LLM Email Parsing

### Input
- Raw email content from Gmail (scoped to Amazon orders label, last 30 days)

### Output (per email transaction, as JSON)
```json
{
  "order_number": "123-4567890-1234567",
  "charge_amount": 47.23,
  "charge_date": "2026-04-15",
  "line_items": [
    { "name": "Scotch Tape Heavy Duty", "quantity": 3, "unit_price": 8.00 },
    { "name": "USB-C Cable 6ft", "quantity": 1, "unit_price": 24.00 }
  ],
  "tax": 3.24,
  "shipping": 5.99,
  "discount": 3.00,
  "gift_card": 1.00,
  "reasoning": "This email contained two shipment charges. This record represents the second shipment totaling $47.23. Discount of $3.00 was a clipped coupon applied at checkout. Gift card redemption of $1.00 was noted in the payment summary section."
}
```

### Validation
- App verifies: `sum(unit_price * quantity) + tax + shipping − discount − gift_card` is within 5 cents of `charge_amount`
- If not, the email transaction is flagged and drag-and-drop matching to any YNAB transaction is blocked

---

## 11. Future Considerations

- Persistent tracking of previously matched email transactions to avoid re-processing across sessions
- Ability to manually enter or edit a memo for unmatched transactions before pushing
- Auto-categorization of splits based on item name patterns
- Smarter date-range scoping based on oldest unmatched YNAB transaction rather than a fixed 30-day window


## Useful references:

- A lot of this was inspried by an n8n workflow that I created. I have included that under the filed called "Expense Extractor Workflow.json". It't not exactly what I am trying to build here, but it has a log of the parsing logic and LLM formatting in case that's helpful
- YNAB has an API here is it's dowumcnetion site you can explore: https://api.ynab.com/#endpoints. Use native fetch never axios