import { X, Link2Off, ChevronRight, EyeOff, Eye } from "lucide-react";
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
  const isCredit = dollars > 0;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-background/40 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: "fadeIn 0.2s ease-out" }}
      />
      <div
        className="fixed right-3 top-3 bottom-3 z-50 flex w-[460px] flex-col rounded-2xl glass-strong shadow-2xl overflow-hidden"
        style={{ animation: "slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        {/* Header */}
        <div className="relative border-b border-border px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="kicker">YNAB Transaction</span>
              <h2 className="text-lg font-semibold tracking-tight">
                {transaction.payee_name ?? "(unknown payee)"}
              </h2>
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-[11px] text-muted-foreground">{formatDate(transaction.date)}</span>
                <span className="text-muted-foreground/40">·</span>
                <span
                  className={cn(
                    "font-mono text-sm font-semibold tabular-nums",
                    isCredit ? "text-[oklch(0.84_0.165_168)]" : "text-foreground",
                  )}
                >
                  {formatAmount(dollars)}
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {isMatched && (
            <div className="mt-3 flex items-center gap-1.5 rounded-md border border-[oklch(0.74_0.16_235)]/30 bg-[oklch(0.74_0.16_235)]/10 px-2.5 py-1 w-fit">
              <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.74_0.16_235)]" />
              <span className="font-mono text-[10px] uppercase tracking-wider text-[oklch(0.78_0.16_235)]">
                Matched
              </span>
            </div>
          )}
          {isSkipped && (
            <div className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1">
              <EyeOff className="h-3 w-3 text-muted-foreground" />
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Skipped</span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-5">
          {isMatched && matchedEmailTxn && reconciliation?.kind === "ok" ? (
            <>
              <DrawerSection title="Split lines" count={reconciliation.splits.length}>
                <div className="flex flex-col rounded-lg border border-border bg-surface/50 overflow-hidden">
                  {reconciliation.splits.map((split, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-baseline justify-between gap-3 px-3 py-2.5",
                        i > 0 && "border-t border-border",
                      )}
                    >
                      <span className="text-xs truncate" title={split.memo}>{split.memo}</span>
                      <span className="shrink-0 font-mono text-xs font-medium tabular-nums">
                        {formatAmount(split.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </DrawerSection>

              <DrawerSection title="Math breakdown">
                <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface/40 px-3 py-2.5">
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
                  <div className="my-1 h-px divider-soft" />
                  <MathRow
                    label="Total adjustment"
                    amount={reconciliation.math.totalAdjustment}
                    bold
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
              </DrawerSection>

              <DrawerSection title="LLM reasoning">
                <div className="rounded-lg border border-border bg-surface/40 px-3 py-2.5">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {matchedEmailTxn.reasoning}
                  </p>
                </div>
              </DrawerSection>

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
                <Link2Off className="h-3.5 w-3.5" />
                Unlink
              </Button>
            </>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border border-dashed border-border bg-surface/30 px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {isSkipped
                    ? "This transaction is skipped and will not be pushed to YNAB."
                    : "Drag an email transaction card onto this transaction to match it."}
                </p>
                {!isSkipped && (
                  <div className="mt-2 flex items-center justify-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60">
                    <span>email</span>
                    <ChevronRight className="h-3 w-3" />
                    <span>this txn</span>
                  </div>
                )}
              </div>
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
                  <Eye className="h-3.5 w-3.5" />
                  Unskip
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="self-start"
                  onClick={() => {
                    sessionStore.getState().skipYnabTransaction(transaction.id);
                    onClose();
                  }}
                >
                  <EyeOff className="h-3.5 w-3.5" />
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

function DrawerSection({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="kicker">{title}</h3>
        {count !== undefined && (
          <span className="font-mono text-[10px] text-muted-foreground tabular-nums">{count}</span>
        )}
      </div>
      {children}
    </section>
  );
}

function MathRow({
  label,
  amount,
  credit = false,
  bold = false,
}: {
  label: string;
  amount: number;
  credit?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className={cn("text-xs", bold ? "text-foreground" : "text-muted-foreground")}>{label}</span>
      <span
        className={cn(
          "font-mono text-xs tabular-nums",
          credit && "text-[oklch(0.84_0.165_168)]",
          bold && "font-semibold",
        )}
      >
        {credit ? "−" : ""}
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
