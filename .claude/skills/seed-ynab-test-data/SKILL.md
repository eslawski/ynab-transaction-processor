---
name: seed-ynab-test-data
description: Seed the configured YNAB budget with unapproved, green-flagged test transactions matching the totals and dates from `project-files/example-emails.md`. Use when the user wants to load YNAB with test data that mirrors the fixture emails (e.g. "seed YNAB", "load YNAB test transactions", "submit fixture transactions to YNAB").
---

# Seed YNAB test data

Submit unapproved, green-flagged transactions to YNAB that match the mocked fixture emails. Useful for end-to-end testing the reconciler against real YNAB state.

## Inputs

Read credentials from `.env` at repo root:
- `YNAB_TOKEN`
- `YNAB_BUDGET_ID`
- `YNAB_ACCOUNT_ID`

Read the source transactions from `project-files/example-emails.md`. Each fixture section has a `Grand Total` (sometimes two — the multiple-transactions fixture has two orders in one email). Skip any fixture whose grand total is `0.0 USD` (fully gift-card covered — no charge hits the card). The fixture `emailDate` is ignored — all created transactions use today's date so they show up at the top of the YNAB register.

## Transaction shape

For each non-zero grand total, build one YNAB transaction:

| YNAB field | Value |
|---|---|
| `account_id` | `$YNAB_ACCOUNT_ID` |
| `date` | today's date in `YYYY-MM-DD` (use `date +%Y-%m-%d`) |
| `amount` | grand-total dollars × -1000 (milliunits, negative for outflow) |
| `payee_name` | `"Amazon"` |
| `memo` | `"Test: <fixture-id>"` (e.g. `Test: single-transaction fixture`) |
| `cleared` | `"uncleared"` |
| `approved` | `false` |
| `flag_color` | `"green"` |

The green flag and unapproved state are required — they're how the reconciler test loop identifies test transactions.

## Request

Single bulk POST to `https://api.ynab.com/v1/budgets/{YNAB_BUDGET_ID}/transactions` with `{"transactions": [...]}`. Use `curl` via Bash, sourcing `.env` so the token never appears literally in the command.

Pattern:

```bash
source .env && curl -sS -X POST "https://api.ynab.com/v1/budgets/${YNAB_BUDGET_ID}/transactions" \
  -H "Authorization: Bearer ${YNAB_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"transactions": [ ... ]}'
```

## Reporting back

After the request succeeds, list each created transaction as a table with date, amount, YNAB id, and source fixture id. Call out any fixtures that were skipped (e.g. the $0 fully-covered one) and why.

## Current fixture totals (as of 2026-05)

If `example-emails.md` is unchanged from the version pinned at skill creation, expect these 4 transactions (all dated today, skipping the $0 fully-covered fixture):

- -$36.36 — single-transaction
- -$8.47 — multiple-transactions #1 (Mod Podge order)
- -$67.16 — multiple-transactions #2 (KipiPol order)
- -$14.22 — single-transaction-partially-covered

Always re-parse the fixture file before submitting — don't trust this list if the file may have changed.
