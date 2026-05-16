import { useEffect, useState } from "react";
import { ChevronRight, Check, GripVertical, Loader2, SendHorizontal } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import type { EmailTransaction } from "@/types";
import { useSessionStore } from "@/store/session";

export function EmailTransactionCard({ txn }: { txn: EmailTransaction }) {
  const isMatched = useSessionStore((s) => [...s.matches.values()].includes(txn.id));
  const [open, setOpen] = useState(!isMatched);

  useEffect(() => {
    setOpen(!isMatched);
  }, [isMatched]);

  const { setNodeRef, transform, isDragging, attributes, listeners } = useDraggable({
    id: txn.id,
    data: { txn },
    disabled: !txn.parseValid || isMatched,
  });

  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: CSS.Translate.toString(transform) } : undefined}
      {...listeners}
      {...attributes}
      className={cn(
        "group relative rounded-lg border border-border bg-surface/50 backdrop-blur-sm select-none transition-all",
        txn.parseValid && !isMatched && "cursor-grab hover:bg-surface hover:border-border-strong active:cursor-grabbing",
        !txn.parseValid && "cursor-not-allowed opacity-60 border-[oklch(0.82_0.17_80)]/30",
        isDragging && "opacity-30",
        isMatched && "ring-azure border-transparent bg-[oklch(0.74_0.16_235)]/[0.06]",
      )}
    >
      {txn.parseValid && !isMatched && (
        <span className="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2 text-muted-foreground/30 opacity-0 transition-opacity group-hover:opacity-100">
          <GripVertical className="h-3 w-3" />
        </span>
      )}
      <CardBody txn={txn} open={open} onToggle={() => setOpen((o) => !o)} isMatched={isMatched} />
    </div>
  );
}

export function EmailTransactionCardOverlay({ txn }: { txn: EmailTransaction }) {
  return (
    <div className="rounded-lg border border-border-strong glass-strong cursor-grabbing select-none rotate-[-1.5deg] shadow-2xl ring-mint">
      <CardBody txn={txn} open={true} onToggle={() => {}} isMatched={false} />
    </div>
  );
}

function SendToYNABButton({ txn }: { txn: EmailTransaction }) {
  const isSent = useSessionStore((s) => s.sentToYNABIds.has(txn.id));
  const markSentToYNAB = useSessionStore((s) => s.markSentToYNAB);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/ynab/create-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txn }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      markSentToYNAB(txn.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSending(false);
    }
  }

  if (isSent) {
    return (
      <div className="mt-2 flex justify-end">
        <div className="flex items-center gap-1.5 rounded-full border border-[oklch(0.84_0.165_168)]/30 bg-[oklch(0.84_0.165_168)]/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[oklch(0.84_0.165_168)]">
          <Check className="h-3 w-3" />
          Sent to YNAB
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-col items-end">
      <button
        type="button"
        disabled={sending}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={handleSend}
        className="flex items-center gap-1.5 rounded-md border border-border bg-surface/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-all hover:bg-surface hover:text-foreground hover:border-border-strong disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <SendHorizontal className="h-3 w-3" />}
        {sending ? "Sending" : "Send to YNAB"}
      </button>
      {error && (
        <div className="mt-1 font-mono text-[10px] text-[oklch(0.82_0.18_22)] break-all text-right">{error}</div>
      )}
    </div>
  );
}

function CardBody({
  txn,
  open,
  onToggle,
  isMatched,
}: {
  txn: EmailTransaction;
  open: boolean;
  onToggle: () => void;
  isMatched: boolean;
}) {
  return (
    <div className="flex flex-col px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onToggle}
          className="shrink-0 rounded p-0.5 text-muted-foreground/50 hover:bg-surface hover:text-muted-foreground transition-colors"
        >
          <ChevronRight className={cn("h-3 w-3 transition-transform duration-200", open && "rotate-90")} />
        </button>
        <div className="flex items-baseline justify-between gap-2 flex-1 min-w-0">
          <span
            className={cn(
              "font-mono text-[11px] truncate transition-colors",
              isMatched ? "text-[oklch(0.78_0.16_235)]" : "text-muted-foreground",
            )}
            title={txn.order_number}
          >
            #{txn.order_number}
          </span>
          <span className="font-mono text-sm font-medium tabular-nums shrink-0">
            {formatAmount(txn.charge_amount)}
          </span>
        </div>
      </div>

      {open && (
        <div className="mt-2 flex flex-col gap-1 pl-5" style={{ animation: "fadeIn 0.2s ease-out" }}>
          {txn.line_items.map((item, i) => (
            <LineRow
              key={i}
              label={formatLineItemName(item)}
              amount={item.quantity * item.unit_price}
            />
          ))}
          {txn.tax !== 0 && <LineRow label="Tax" amount={txn.tax} muted />}
          {txn.shipping !== 0 && <LineRow label="Shipping" amount={txn.shipping} muted />}
          {txn.discount !== 0 && <LineRow label="Discount" amount={-txn.discount} credit />}
          {txn.gift_card !== 0 && <LineRow label="Gift card" amount={-txn.gift_card} credit />}

          {!txn.parseValid && (
            <div className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-md border border-[oklch(0.82_0.17_80)]/30 bg-[oklch(0.82_0.17_80)]/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[oklch(0.86_0.17_80)]">
              parse mismatch · not draggable
            </div>
          )}

          {txn.parseValid && <SendToYNABButton txn={txn} />}

          <details className="mt-1">
            <summary className="cursor-pointer select-none font-mono text-[10px] uppercase tracking-wider text-muted-foreground/40 hover:text-muted-foreground/80 transition-colors">
              LLM reasoning
            </summary>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground border-l-2 border-border pl-2.5">{txn.reasoning}</p>
          </details>
        </div>
      )}
    </div>
  );
}

function LineRow({
  label,
  amount,
  credit = false,
  muted = false,
}: {
  label: string;
  amount: number;
  credit?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className={cn("text-xs", muted ? "text-muted-foreground/70" : "text-muted-foreground")}>{label}</span>
      <span
        className={cn(
          "font-mono text-xs tabular-nums",
          credit ? "text-[oklch(0.84_0.165_168)]" : muted ? "text-foreground/60" : "text-foreground/85",
        )}
      >
        {credit ? "−" : ""}
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
