import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import type { EmailTransaction } from "@/types";

export function EmailTransactionCard({ txn }: { txn: EmailTransaction }) {
  const { setNodeRef, transform, isDragging, attributes, listeners } = useDraggable({
    id: txn.id,
    data: { txn },
    disabled: !txn.parseValid,
  });

  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: CSS.Translate.toString(transform) } : undefined}
      {...listeners}
      {...attributes}
      className={cn(
        "rounded border border-border/50 bg-background/60 select-none",
        txn.parseValid && "cursor-grab active:cursor-grabbing hover:border-border",
        !txn.parseValid && "cursor-not-allowed opacity-60",
        isDragging && "opacity-25",
      )}
    >
      <CardBody txn={txn} />
    </div>
  );
}

export function EmailTransactionCardOverlay({ txn }: { txn: EmailTransaction }) {
  return (
    <div className="rounded border border-border bg-background shadow-2xl cursor-grabbing select-none">
      <CardBody txn={txn} />
    </div>
  );
}

function CardBody({ txn }: { txn: EmailTransaction }) {
  return (
    <div className="flex flex-col gap-1 px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span
          className="font-mono text-[11px] text-muted-foreground truncate"
          title={txn.order_number}
        >
          #{txn.order_number}
        </span>
        <span className="font-mono text-sm font-medium tabular-nums shrink-0">
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
        <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-400">
          parse mismatch · not draggable
        </div>
      )}

      <details className="mt-1">
        <summary className="cursor-pointer select-none font-mono text-[10px] uppercase tracking-wider text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors">
          Reasoning
        </summary>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{txn.reasoning}</p>
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
      <span className="text-xs text-muted-foreground">{label}</span>
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

function formatLineItemName(item: { name: string; quantity: number }): string {
  return item.quantity > 1 ? `${item.name} ×${item.quantity}` : item.name;
}

function formatAmount(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
