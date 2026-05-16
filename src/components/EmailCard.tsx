import { Loader2, Mail, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { sessionStore, useSessionStore } from "@/store/session";
import type { EmailTransaction, RawEmail } from "@/types";
import { useShallow } from "zustand/react/shallow";
import { EmailTransactionCard } from "./EmailTransactionCard";

export function EmailCard({ email }: { email: RawEmail }) {
  const childTransactions = useSessionStore(
    useShallow((s) => s.emailTransactions.filter((t) => t.rawEmailId === email.id)),
  );

  const parsed = email.parseStatus === "parsed";
  const errored = email.parseStatus === "error";

  return (
    <Card className={cn("gap-0 overflow-hidden p-0 transition-colors", errored && "border-[oklch(0.72_0.21_22)]/30")}>
      <div className="flex items-start gap-3 px-4 py-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface text-muted-foreground">
          <Mail className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium leading-snug" title={email.subject}>
            {email.subject}
          </div>
          <div className="flex items-center gap-2 text-[11px] leading-relaxed">
            <span className="font-mono text-muted-foreground">{formatDate(email.date)}</span>
            {parsed && childTransactions.length > 0 && (
              <span className="font-mono text-[10px] uppercase tracking-wider text-[oklch(0.84_0.165_168)]">
                · {childTransactions.length} parsed
              </span>
            )}
          </div>
        </div>
        <ParseButton email={email} />
      </div>

      {errored && (
        <div className="flex items-center gap-1.5 border-t border-[oklch(0.72_0.21_22)]/20 bg-[oklch(0.72_0.21_22)]/10 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-[oklch(0.82_0.18_22)]">
          <RotateCw className="h-3 w-3" />
          parse failed · click retry
        </div>
      )}

      {parsed && childTransactions.length > 0 && (
        <div
          className="flex flex-col gap-2 border-t border-border bg-[oklch(0.16_0.014_250)]/60 p-3"
          style={{ animation: "fadeIn 0.3s ease-out" }}
        >
          {childTransactions.map((txn) => (
            <EmailTransactionCard key={txn.id} txn={txn} />
          ))}
        </div>
      )}
    </Card>
  );
}

function ParseButton({ email }: { email: RawEmail }) {
  const status = email.parseStatus;
  const isParsing = status === "parsing";
  const label =
    isParsing ? "Parsing…"
    : status === "error" ? "Retry"
    : status === "parsed" ? "Reparse"
    : "Parse";

  return (
    <Button
      type="button"
      size="sm"
      variant={status === "error" ? "destructive" : status === "parsed" ? "ghost" : "outline"}
      disabled={isParsing}
      onClick={() => parseEmail(email)}
      className="shrink-0"
    >
      {isParsing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {label}
    </Button>
  );
}

async function parseEmail(email: RawEmail): Promise<void> {
  const state = sessionStore.getState();
  state.clearEmailTransactionsForEmail(email.id);
  state.updateEmailParseStatus(email.id, "parsing");
  try {
    const res = await fetch(`/api/emails/${encodeURIComponent(email.id)}/parse`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: email.body, date: email.date }),
    });
    if (!res.ok) throw new Error(`Parse failed: ${res.status}`);
    const transactions = (await res.json()) as EmailTransaction[];
    sessionStore.getState().addEmailTransactions(transactions);
    sessionStore.getState().updateEmailParseStatus(email.id, "parsed");
  } catch (err) {
    console.error(`Failed to parse email ${email.id}:`, err);
    sessionStore.getState().updateEmailParseStatus(email.id, "error");
  }
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
