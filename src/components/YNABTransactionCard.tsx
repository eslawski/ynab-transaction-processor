import { Card } from "@/components/ui/card";
import type { YNABTransaction } from "@/types";

export function YNABTransactionCard({ transaction }: { transaction: YNABTransaction }) {
  const dollars = transaction.amount / 1000;
  return (
    <Card className="gap-1 px-4 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className="truncate text-sm font-medium">
          {transaction.payee_name ?? "(unknown payee)"}
        </div>
        <div className="font-mono text-sm tabular-nums">{formatAmount(dollars)}</div>
      </div>
      <div className="font-mono text-xs text-muted-foreground">
        {formatDate(transaction.date)}
      </div>
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
