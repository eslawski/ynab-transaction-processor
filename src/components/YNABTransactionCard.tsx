import { useDroppable } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { sessionStore, useSessionStore } from "@/store/session";
import type { YNABTransaction } from "@/types";
import { useShallow } from "zustand/react/shallow";

interface Props {
  transaction: YNABTransaction;
  onClick: () => void;
}

export function YNABTransactionCard({ transaction, onClick }: Props) {
  const { matches, emailTransactions, skippedYnabIds } = useSessionStore(
    useShallow((s) => ({
      matches: s.matches,
      emailTransactions: s.emailTransactions,
      skippedYnabIds: s.skippedYnabIds,
    })),
  );

  const matchedEmailTxnId = matches.get(transaction.id);
  const isMatched = matchedEmailTxnId !== undefined;
  const isSkipped = skippedYnabIds.has(transaction.id);
  const matchedEmailTxn = isMatched
    ? emailTransactions.find((t) => t.id === matchedEmailTxnId)
    : null;

  const { setNodeRef, isOver } = useDroppable({
    id: transaction.id,
    disabled: isMatched || isSkipped,
  });

  const dollars = transaction.amount / 1000;
  const amountColor =
    dollars < 0 ? "text-red-400" : dollars > 0 ? "text-emerald-400" : "text-muted-foreground";

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        "gap-1 px-4 py-3 cursor-pointer transition-colors",
        isOver && "ring-1 ring-primary bg-primary/5",
        isMatched && "border-emerald-500/40 bg-emerald-500/5",
        isSkipped && "opacity-50 border-dashed",
      )}
      onClick={onClick}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="truncate text-sm font-medium">
          {transaction.payee_name ?? "(unknown payee)"}
        </div>
        <div className={cn("font-mono text-sm tabular-nums shrink-0", amountColor)}>
          {formatAmount(dollars)}
        </div>
      </div>
      <div className="font-mono text-xs text-muted-foreground">{formatDate(transaction.date)}</div>

      {isMatched && matchedEmailTxn && (
        <div className="mt-1 flex items-center justify-between gap-2">
          <span
            className="font-mono text-[11px] text-emerald-400 truncate"
            title={matchedEmailTxn.order_number}
          >
            #{matchedEmailTxn.order_number}
          </span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              sessionStore.getState().unmatchTransaction(transaction.id);
            }}
          >
            Unlink
          </Button>
        </div>
      )}

      {isSkipped && (
        <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          skipped
        </div>
      )}
    </Card>
  );
}

function formatAmount(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
