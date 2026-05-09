import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { EmailTransaction } from "@/types";

export function EmailTransactionCard({ transaction }: { transaction: EmailTransaction }) {
  const summary = summarizeLineItems(transaction.line_items);
  return (
    <Card
      className={cn(
        "ml-4 gap-1 border-l-2 border-l-primary/50 px-4 py-3",
        !transaction.parseValid && "border-l-amber-400/70 bg-amber-400/5",
      )}
      data-parse-valid={transaction.parseValid}
      data-email-txn-id={transaction.id}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="font-mono text-xs text-muted-foreground" title={transaction.order_number}>
          #{transaction.order_number}
        </div>
        <div className="font-mono text-sm tabular-nums">
          {formatAmount(transaction.charge_amount)}
        </div>
      </div>
      <div className="truncate text-xs text-muted-foreground" title={summary}>
        {summary}
      </div>
      {!transaction.parseValid && (
        <div className="font-mono text-[10px] uppercase tracking-wider text-amber-400">
          parse mismatch · check email
        </div>
      )}
    </Card>
  );
}

function summarizeLineItems(items: EmailTransaction["line_items"]): string {
  if (items.length === 0) return "(no line items)";
  const totalCount = items.reduce((sum, li) => sum + li.quantity, 0);
  const first = items[0];
  if (!first) return "(no line items)";
  const firstName = truncate(first.name, 40);
  if (items.length === 1) {
    return first.quantity > 1 ? `${firstName} × ${first.quantity}` : firstName;
  }
  return `${firstName} +${items.length - 1} more (${totalCount} items)`;
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

function formatAmount(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
