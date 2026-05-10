# YNAB Transaction Processor

Processes Amazon order confirmation emails and reconciles them against unapproved YNAB transactions.

## Setup

```bash
bun install
```

Copy `.env.example` to `.env` and fill in your credentials (Google OAuth, YNAB token/budget/account, Anthropic API key).

## Development

```bash
bun dev    # start dev server
bun start  # production
```

## Tests

```bash
bun test        # watch mode
bun test:run    # single run (CI)
```

### Eval tests

```bash
bun test:eval
```

Eval tests (files ending in `.eval.test.ts`) are excluded from the regular test run because they call the real Anthropic API — they're slow (~90s timeout), cost money, and aren't deterministic enough for CI. They exist to catch regressions in the system prompt or email-parsing logic and should be run manually when the AI prompt or parsing code changes.

## Mock email data

Set `USE_MOCK_EMAILS=true` in `.env` to skip Gmail and load fixture emails from `project-files/example-emails.md` instead. Useful for local development and testing without a live Gmail connection.

```env
USE_MOCK_EMAILS=true
```

## Seeding YNAB with test data

Use the `/seed-ynab-test-data` Claude Code skill to POST unapproved, green-flagged test transactions to your YNAB budget. The transactions are derived from the fixture emails in `project-files/example-emails.md` and are all dated today so they appear at the top of the register.

```
/seed-ynab-test-data
```
