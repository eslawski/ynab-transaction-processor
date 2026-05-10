import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { sessionStore, useSessionStore } from "@/store/session";
import type { EmailTransaction, LineItem, RawEmail } from "@/types";
import { useShallow } from "zustand/react/shallow";

export function EmailCard({ email }: { email: RawEmail }) {
  const childTransactions = useSessionStore(
    useShallow((s) => s.emailTransactions.filter((t) => t.rawEmailId === email.id)),
  );

  return (
    <Card className="overflow-hidden gap-0 p-0">
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium leading-snug" title={email.subject}>
            {email.subject}
          </div>
          <div className="font-mono text-xs text-muted-foreground">{formatDate(email.date)}</div>
        </div>
        <ParseButton email={email} />
      </div>

      {email.parseStatus === "error" && (
        <div className="px-4 pb-3 font-mono text-[10px] uppercase tracking-wider text-red-400">
          parse failed · click retry
        </div>
      )}

      {email.parseStatus === "parsed" && childTransactions.length > 0 && (
        <div className="flex flex-col divide-y divide-border/40 border-t border-border/40 bg-muted/30">
          {childTransactions.map((txn) => (
            <OrderSection key={txn.id} txn={txn} />
          ))}
        </div>
      )}
    </Card>
  );
}

function OrderSection({ txn }: { txn: EmailTransaction }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="font-mono text-xs text-muted-foreground" title={txn.order_number}>
          #{txn.order_number}
        </span>
        <span className="font-mono text-sm font-medium tabular-nums">
          {formatAmount(txn.charge_amount)}
        </span>
      </div>

      {txn.line_items.map((item, i) => (
        <LineRow key={i} label={formatLineItemName(item)} amount={item.quantity * item.unit_price} />
      ))}
      {txn.tax !== 0 && <LineRow label="Tax" amount={txn.tax} />}
      {txn.shipping !== 0 && <LineRow label="Shipping" amount={txn.shipping} />}
      {txn.discount !== 0 && <LineRow label="Discount" amount={-txn.discount} credit />}
      {txn.gift_card !== 0 && <LineRow label="Gift card" amount={-txn.gift_card} credit />}

      {!txn.parseValid && (
        <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-amber-400">
          parse mismatch · check email
        </div>
      )}

      <details className="mt-1.5">
        <summary className="cursor-pointer select-none font-mono text-[10px] uppercase tracking-wider text-muted-foreground/50 hover:text-muted-foreground transition-colors">
          Reasoning
        </summary>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{txn.reasoning}</p>
      </details>
    </div>
  );
}

function LineRow({
  label,
  amount,
  credit = false,
}: {
  label: string;
  amount: number;
  credit?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className={cn("text-xs", credit ? "text-muted-foreground" : "text-muted-foreground")}>
        {label}
      </span>
      <span
        className={cn(
          "font-mono text-xs tabular-nums",
          credit ? "text-emerald-400" : "text-foreground/80",
        )}
      >
        {credit ? "-" : ""}
        {formatAmount(Math.abs(amount))}
      </span>
    </div>
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
      variant={status === "error" ? "destructive" : "outline"}
      disabled={isParsing}
      onClick={() => parseEmail(email)}
    >
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

function formatLineItemName(item: LineItem): string {
  return item.quantity > 1 ? `${item.name} ×${item.quantity}` : item.name;
}

function formatAmount(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
