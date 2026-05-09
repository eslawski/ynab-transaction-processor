  Architecture Summary

  Tech Stack (additions to existing)

  - Zustand — session state store
  - dnd-kit — drag-and-drop matching
  - USE_MOCK_EMAILS env var — bypasses Gmail, uses example-emails.md fixtures

  New .env values

  YNAB_BUDGET_ID=e851004f-47e9-4675-98b0-7460f992cccc
  YNAB_ACCOUNT_ID=25a630ba-2266-4ad5-a2df-db9d8985ee80
  USE_MOCK_EMAILS=false

  ---
  Session Phase Flow (Zustand)

  loading → working → pushing → done
  - loading: two parallel fetches — existing /api/ynab/transactions + new /api/gmail/emails
  - working: user parses emails individually + does drag-and-drop matching (interleaved, no forced order)
  - pushing: confirmation screen → POST /api/ynab/push → server calls YNAB API
  - done: result summary

  ---
  API Endpoints

  Method: GET
  Path: /api/ynab/transactions
  Purpose: Existing — unapproved transactions, 30-day window
  ────────────────────────────────────────
  Method: GET
  Path: /api/gmail/emails
  Purpose: New — raw email list (subject, date, body) from "Order Confirmations" label, 30-day window. Returns fixtures
    if USE_MOCK_EMAILS=true
  ────────────────────────────────────────
  Method: POST
  Path: /api/emails/:id/parse
  Purpose: New — sends one raw email to Claude, returns EmailTransaction[]
  ────────────────────────────────────────
  Method: POST
  Path: /api/ynab/push
  Purpose: New — receives matched pairs + reconciled splits, writes to YNAB

  Gmail access token: server reads from Better Auth SQLite on each call.

  ---
  Zustand Store Shape (high-level)

  {
    phase: 'loading' | 'working' | 'pushing' | 'done'
    ynabTransactions: YNABTransaction[]          // left column
    rawEmails: RawEmail[]                        // right column (with parseStatus per email)
    emailTransactions: EmailTransaction[]        // parsed child cards
    matches: Map<ynabTxnId, emailTxnId>
    skippedYnabIds: Set<string>
    pushResult: PushResult | null
  }

  ---
  Right Column Data Model

  - Each RawEmail card has parseStatus: 'unprocessed' | 'parsing' | 'parsed' | 'error'
  - Parse button triggers POST /api/emails/:id/parse
  - After parsing, email card expands to show N child EmailTransaction cards (draggable)
  - One email → N email transactions (handles multi-shipment orders)

  ---
  Matching & Reconciliation

  - All client-side (pure functions in Zustand actions)
  - dnd-kit: EmailTransaction cards are draggables, YNABTransaction cards are drop targets
  - Reconciliation math (split calculation, 5-cent tolerance check) runs on drop
  - Slide-over drawer opens on YNAB card click: shows split breakdown, math, LLM reasoning field
  - Push with unparsed emails: silent allow — expected workflow

  ---
  UI

  - Single page, dark minimalist
  - Two-column layout: YNAB (left) | Emails (right)
  - No router — phase transitions handled by Zustand
  - shadcn/ui + Tailwind (already set up), add dnd-kit

  ---
  Ready to start building? I'd suggest starting with the Zustand store + type definitions, then the two new API
  endpoints, then the UI columns.