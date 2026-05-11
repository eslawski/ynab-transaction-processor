import { X } from "lucide-react";
import { reconcile } from "@/reconciler/reconciler";
import { sessionStore, useSessionStore } from "@/store/session";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { YNABTransaction } from "@/types";
import { useShallow } from "zustand/react/shallow";

interface Props {
  transaction: YNABTransaction;
  onClose: () => void;
}

export function TransactionDrawer({ transaction, onClose }: Props) {
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

  const ynabAmountDollars = Math.abs(transaction.amount) / 1000;
  const reconciliation =
    matchedEmailTxn ? reconcile(matchedEmailTxn, ynabAmountDollars) : null;

  const dollars = transaction.amount / 1000;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 flex h-full w-[440px] flex-col border-l border-border bg-background">
        <div className="flex items-start justify-between border-b border-border/60 p-4">
          <div className="flex flex-col gap-0.5">
            <div className="text-sm font-medium">
              {transaction.payee_name ?? "(unknown payee)"}
            </div>
            <div className="font-mono text-xs text-muted-foreground">
              {formatDate(transaction.date)}
            </div>
            <div
              className={cn(
                "font-mono text-sm font-medium tabular-nums",
                dollars < 0 ? "text-red-400" : "text-emerald-400",
              )}
            >
              {formatAmount(dollars)}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
          {isMatched && matchedEmailTxn && reconciliation?.kind === "ok" ? (
            <>
              <section>
                <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Split lines
                </h3>
                <div className="flex flex-col gap-1">
                  {reconciliation.splits.map((split, i) => (
                    <div key={i} className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-xs">{split.memo}</span>
                      <span className="shrink-0 font-mono text-xs tabular-nums">
                        {formatAmount(split.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Math breakdown
                </h3>
                <div className="flex flex-col gap-1 rounded border border-border/40 bg-muted/20 px-3 py-2.5">
                  <MathRow label="Items subtotal" amount={reconciliation.math.itemsSubtotal} />
                  {reconciliation.math.tax !== 0 && (
                    <MathRow label="Tax" amount={reconciliation.math.tax} />
                  )}
                  {reconciliation.math.shipping !== 0 && (
                    <MathRow label="Shipping" amount={reconciliation.math.shipping} />
                  )}
                  {reconciliation.math.discount !== 0 && (
                    <MathRow label="Discount" amount={-reconciliation.math.discount} credit />
                  )}
                  {reconciliation.math.giftCard !== 0 && (
                    <MathRow label="Gift card" amount={-reconciliation.math.giftCard} credit />
                  )}
                  <div className="mt-1 border-t border-border/40 pt-1">
                    <MathRow
                      label="Total adjustment"
                      amount={reconciliation.math.totalAdjustment}
                    />
                    <MathRow
                      label="Per split"
                      amount={reconciliation.math.perSplitAdjustment}
                    />
                    {reconciliation.math.remainder !== 0 && (
                      <MathRow
                        label="Remainder → first split"
                        amount={reconciliation.math.remainder}
                      />
                    )}
                  </div>
                </div>
              </section>

              <section>
                <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  LLM reasoning
                </h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {matchedEmailTxn.reasoning}
                </p>
              </section>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => {
                  sessionStore.getState().unmatchTransaction(transaction.id);
                  onClose();
                }}
              >
                Unlink
              </Button>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                {isSkipped
                  ? "This transaction is skipped and will not be pushed to YNAB."
                  : "Drag an email transaction card onto this transaction to match it."}
              </p>
              {isSkipped ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() => {
                    sessionStore.getState().unskipYnabTransaction(transaction.id);
                    onClose();
                  }}
                >
                  Unskip
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start text-muted-foreground"
                  onClick={() => {
                    sessionStore.getState().skipYnabTransaction(transaction.id);
                    onClose();
                  }}
                >
                  Skip this transaction
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function MathRow({
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
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("font-mono text-xs tabular-nums", credit && "text-emerald-400")}>
        {credit ? "-" : ""}
        {formatAmount(Math.abs(amount))}
      </span>
    </div>
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
