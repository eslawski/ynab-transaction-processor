import { TransactionCard } from "@/components/TransactionCard";
import type { YNABTransaction } from "@/ynab/types";

interface TransactionListProps {
  transactions: YNABTransaction[];
  isLoading: boolean;
  error: string | null;
  onRefetch: () => void;
}

export function TransactionList({ transactions, isLoading, error, onRefetch }: TransactionListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <div className="flex items-center gap-3">
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span className="text-sm">Loading transactions…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-sm text-destructive">{error}</p>
        <button
          onClick={onRefetch}
          className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="border border-border/40 rounded-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border/40 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Unapproved
          </span>
          {transactions.length > 0 && (
            <span className="text-xs bg-white/10 text-muted-foreground px-1.5 py-0.5 rounded-sm tabular-nums">
              {transactions.length}
            </span>
          )}
        </div>
        <button
          onClick={onRefetch}
          className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          title="Refresh"
        >
          ↻
        </button>
      </div>

      {/* Column headers */}
      {transactions.length > 0 && (
        <div className="flex items-center gap-4 px-6 py-2 border-b border-border/40">
          <span className="w-16 shrink-0 text-[10px] uppercase tracking-widest text-muted-foreground/50">
            Date
          </span>
          <span className="flex-1 text-[10px] uppercase tracking-widest text-muted-foreground/50">
            Payee / Category
          </span>
          <span className="hidden sm:block text-[10px] uppercase tracking-widest text-muted-foreground/50 max-w-[160px] w-[160px]">
            Memo
          </span>
          <span className="shrink-0 text-[10px] uppercase tracking-widest text-muted-foreground/50">
            Amount
          </span>
        </div>
      )}

      {/* Rows */}
      {transactions.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground/60 italic">
          No unapproved transactions
        </div>
      ) : (
        <div>
          {transactions.map((t) => (
            <TransactionCard key={t.id} transaction={t} />
          ))}
        </div>
      )}
    </div>
  );
}
