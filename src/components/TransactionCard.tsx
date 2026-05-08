import { cn } from "@/lib/utils";
import type { YNABTransaction } from "@/ynab/types";

interface TransactionCardProps {
  transaction: YNABTransaction;
}

function formatAmount(milliunits: number): string {
  const dollars = Math.abs(milliunits / 1000);
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function TransactionCard({ transaction }: TransactionCardProps) {
  const isExpense = transaction.amount < 0;
  const isUncategorized = !transaction.category_name;

  return (
    <div className="flex items-center gap-4 px-6 py-3.5 border-b border-border/40 hover:bg-white/[0.02] transition-colors group">
      {/* Date */}
      <span className="w-16 shrink-0 text-xs text-muted-foreground tabular-nums">
        {formatDate(transaction.date)}
      </span>

      {/* Payee + Category */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate leading-tight">
          {transaction.payee_name ?? "Unknown Payee"}
        </p>
        <p
          className={cn(
            "text-xs leading-tight mt-0.5 truncate",
            isUncategorized ? "text-muted-foreground/50 italic" : "text-muted-foreground"
          )}
        >
          {transaction.category_name ?? "Uncategorized"}
        </p>
      </div>

      {/* Memo */}
      {transaction.memo && (
        <p className="hidden sm:block text-xs text-muted-foreground/60 truncate max-w-[160px]">
          {transaction.memo}
        </p>
      )}

      {/* Amount */}
      <span
        className={cn(
          "shrink-0 text-sm tabular-nums font-mono font-medium",
          isExpense ? "text-red-400" : "text-emerald-400"
        )}
      >
        {isExpense ? "-" : "+"}{formatAmount(transaction.amount)}
      </span>
    </div>
  );
}
