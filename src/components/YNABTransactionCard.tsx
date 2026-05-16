import { Link2Off } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
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
    dollars < 0
      ? "text-foreground"
      : dollars > 0
      ? "text-[oklch(0.84_0.165_168)]"
      : "text-muted-foreground";

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        "group relative gap-1.5 px-4 py-3 cursor-pointer transition-all duration-200 hover:border-border-strong hover:bg-card",
        isOver && "drop-glow border-transparent scale-[1.01]",
        isMatched && "border-transparent ring-azure bg-[oklch(0.74_0.16_235)]/[0.05]",
        isSkipped && "opacity-50 border-dashed",
      )}
      onClick={onClick}
    >
      {/* Accent rail */}
      <span
        aria-hidden
        className={cn(
          "absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full transition-colors",
          isMatched
            ? "bg-[oklch(0.74_0.16_235)]"
            : isSkipped
            ? "bg-muted-foreground/30"
            : "bg-transparent group-hover:bg-[oklch(0.84_0.165_168)]/50",
        )}
      />

      <div className="flex items-baseline justify-between gap-2">
        <div className="truncate text-sm font-medium tracking-tight">
          {transaction.payee_name ?? "(unknown payee)"}
        </div>
        <div className={cn("font-mono text-sm font-medium tabular-nums shrink-0", amountColor)}>
          {formatAmount(dollars)}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="font-mono text-[11px] text-muted-foreground">{formatDate(transaction.date)}</div>
        {!isMatched && !isSkipped && (
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100">
            drop or click
          </span>
        )}
      </div>

      {isMatched && matchedEmailTxn && (
        <div
          className="mt-1.5 flex items-center justify-between gap-2 rounded-md border border-[oklch(0.74_0.16_235)]/30 bg-[oklch(0.74_0.16_235)]/[0.06] px-2 py-1"
          style={{ animation: "fadeIn 0.25s ease-out" }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[oklch(0.74_0.16_235)]" />
            <span
              className="font-mono text-[11px] text-[oklch(0.78_0.16_235)] truncate"
              title={matchedEmailTxn.order_number}
            >
              matched · #{matchedEmailTxn.order_number}
            </span>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:bg-surface hover:text-foreground transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              sessionStore.getState().unmatchTransaction(transaction.id);
            }}
          >
            <Link2Off className="h-3 w-3" />
            Unlink
          </button>
        </div>
      )}

      {isSkipped && (
        <div className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-md border border-border bg-surface/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
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
