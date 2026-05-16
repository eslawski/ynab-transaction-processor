import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { AlertTriangle, ArrowUpRight, CheckCircle2, Inbox, Sparkles, Wallet } from "lucide-react";
import { reconcile } from "@/reconciler/reconciler";
import { sessionStore, useSessionStore } from "@/store/session";
import { useSessionLoader } from "@/hooks/useSessionLoader";
import { Button } from "@/components/ui/button";
import type { EmailTransaction, PushPayloadItem, PushResult } from "@/types";
import { useShallow } from "zustand/react/shallow";
import { EmailCard } from "./EmailCard";
import { EmailTransactionCardOverlay } from "./EmailTransactionCard";
import { SessionLoading } from "./SessionLoading";
import { TransactionDrawer } from "./TransactionDrawer";
import { YNABTransactionCard } from "./YNABTransactionCard";

export function SessionView() {
  const phase = useSessionStore((s) => s.phase);
  useSessionLoader(true);

  if (phase === "loading") return <SessionLoading />;
  if (phase === "pushing") return <PushConfirmView />;
  if (phase === "done") return <DoneView />;
  return <WorkingView />;
}

function WorkingView() {
  const { ynabTransactions, rawEmails, emailSource, matches, skippedYnabIds } = useSessionStore(
    useShallow((s) => ({
      ynabTransactions: s.ynabTransactions,
      rawEmails: s.rawEmails,
      emailSource: s.emailSource,
      matches: s.matches,
      skippedYnabIds: s.skippedYnabIds,
    })),
  );

  const [activeTxn, setActiveTxn] = useState<EmailTransaction | null>(null);
  const [drawerTxnId, setDrawerTxnId] = useState<string | null>(null);
  const [dropError, setDropError] = useState<string | null>(null);

  const drawerTxn = drawerTxnId
    ? (ynabTransactions.find((t) => t.id === drawerTxnId) ?? null)
    : null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveTxn((event.active.data.current as { txn?: EmailTransaction } | undefined)?.txn ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTxn(null);
    const { active, over } = event;
    if (!over) return;

    const emailTxn = (active.data.current as { txn?: EmailTransaction } | undefined)?.txn;
    if (!emailTxn) return;

    const ynabTxn = ynabTransactions.find((t) => t.id === over.id);
    if (!ynabTxn) return;

    const state = sessionStore.getState();

    const existingYnabId = [...state.matches.entries()].find(
      ([, eTxnId]) => eTxnId === emailTxn.id,
    )?.[0];
    if (existingYnabId && existingYnabId !== ynabTxn.id) {
      showDropError(`Order #${emailTxn.order_number} is already matched. Unlink it first.`);
      return;
    }

    const result = reconcile(emailTxn, Math.abs(ynabTxn.amount) / 1000);
    if (result.kind === "blocked") {
      showDropError(`Cannot match: amounts differ by $${result.delta.toFixed(2)}.`);
      return;
    }

    state.matchTransaction(ynabTxn.id, emailTxn.id);
  }

  function showDropError(msg: string) {
    setDropError(msg);
    setTimeout(() => setDropError(null), 4000);
  }

  const matchedCount = matches.size;
  const skippedCount = skippedYnabIds.size;
  const unmatchedCount = ynabTransactions.length - matchedCount - skippedCount;
  const totalYnab = ynabTransactions.length;
  const progress = totalYnab === 0 ? 0 : Math.min(100, ((matchedCount + skippedCount) / totalYnab) * 100);

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-6" style={{ animation: "fadeIn 0.4s ease-out" }}>
        <SessionHeader
          matched={matchedCount}
          skipped={skippedCount}
          unmatched={unmatchedCount}
          total={totalYnab}
          progress={progress}
        />

        {dropError && (
          <div
            className="flex items-center gap-2.5 rounded-lg border border-[oklch(0.72_0.21_22)]/40 bg-[oklch(0.72_0.21_22)]/10 px-4 py-2.5 text-sm text-[oklch(0.82_0.18_22)]"
            style={{ animation: "slideUp 0.25s ease-out" }}
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{dropError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="flex flex-col gap-3">
            <ColumnHeader
              icon={<Inbox className="h-3.5 w-3.5" />}
              title="Order confirmation emails"
              subtitle="Last 30 days"
              count={rawEmails.length}
              accent="azure"
              extra={
                emailSource === "mock" ? (
                  <span className="chip border-[oklch(0.82_0.17_80)]/40 bg-[oklch(0.82_0.17_80)]/10 text-[oklch(0.86_0.17_80)]">
                    <Sparkles className="h-3 w-3" />
                    mock data
                  </span>
                ) : null
              }
            />
            {rawEmails.length === 0 ? (
              <EmptyState
                title="Inbox is empty"
                desc="No order-confirmation emails in the last 30 days."
              />
            ) : (
              <div className="flex flex-col gap-3">
                {rawEmails.map((email) => (
                  <EmailCard key={email.id} email={email} />
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <ColumnHeader
              icon={<Wallet className="h-3.5 w-3.5" />}
              title="Unapproved YNAB transactions"
              subtitle="Drop emails here"
              count={ynabTransactions.length}
              accent="mint"
            />
            {ynabTransactions.length === 0 ? (
              <BeaverEmptyState />
            ) : (
              <div className="flex flex-col gap-3">
                {ynabTransactions.map((txn) => (
                  <YNABTransactionCard
                    key={txn.id}
                    transaction={txn}
                    onClick={() => setDrawerTxnId(txn.id)}
                  />
                ))}
              </div>
            )}

            <div className="sticky bottom-4 z-20 mt-4">
              <div className="glass-strong flex items-center justify-between gap-4 rounded-xl px-4 py-3 shadow-2xl">
                <div className="flex flex-col leading-tight">
                  <span className="kicker">Ready to push</span>
                  <span className="font-mono text-sm tabular-nums">
                    <span className="text-[oklch(0.84_0.165_168)]">{matchedCount}</span>
                    <span className="text-muted-foreground"> / {totalYnab}</span>
                  </span>
                </div>
                <Button
                  type="button"
                  disabled={matches.size === 0}
                  onClick={() => sessionStore.getState().setPhase("pushing")}
                >
                  Push to YNAB
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTxn && <EmailTransactionCardOverlay txn={activeTxn} />}
      </DragOverlay>

      {drawerTxn && (
        <TransactionDrawer transaction={drawerTxn} onClose={() => setDrawerTxnId(null)} />
      )}
    </DndContext>
  );
}

function SessionHeader({
  matched,
  skipped,
  unmatched,
  total,
  progress,
}: {
  matched: number;
  skipped: number;
  unmatched: number;
  total: number;
  progress: number;
}) {
  return (
    <div className="glass flex flex-col gap-3 rounded-xl px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col leading-tight">
          <span className="kicker">Reconciliation session</span>
          <span className="text-lg font-semibold tracking-tight">
            {total === 0
              ? "All clear"
              : matched + skipped === total
              ? "Ready to push"
              : `${total - matched - skipped} left to review`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Stat label="Matched" value={matched} tone="mint" />
          <Stat label="Skipped" value={skipped} tone="muted" />
          <Stat label="Open" value={unmatched} tone="azure" />
        </div>
      </div>
      <div className="relative h-1 w-full overflow-hidden rounded-full bg-surface">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[oklch(0.84_0.165_168)] via-[oklch(0.78_0.18_195)] to-[oklch(0.74_0.16_235)] transition-[width] duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "mint" | "muted" | "azure" }) {
  const color =
    tone === "mint" ? "text-[oklch(0.84_0.165_168)]"
    : tone === "azure" ? "text-[oklch(0.78_0.16_235)]"
    : "text-foreground";
  return (
    <div className="flex flex-col items-end leading-tight">
      <span className={`font-mono text-base font-semibold tabular-nums ${color}`}>{value}</span>
      <span className="kicker">{label}</span>
    </div>
  );
}

function ColumnHeader({
  icon,
  title,
  subtitle,
  count,
  accent,
  extra,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  count: number;
  accent: "mint" | "azure";
  extra?: React.ReactNode;
}) {
  const ring =
    accent === "mint" ? "text-[oklch(0.84_0.165_168)]" : "text-[oklch(0.78_0.16_235)]";
  return (
    <header className="flex items-end justify-between gap-3 px-1">
      <div className="flex items-center gap-2.5">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg bg-surface/70 border border-border ${ring}`}>
          {icon}
        </span>
        <div className="flex flex-col leading-tight">
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          <span className="kicker">{subtitle}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {extra}
        <span className="font-mono text-xs text-muted-foreground tabular-nums">{count}</span>
      </div>
    </header>
  );
}

function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="glass flex flex-col items-center gap-2 rounded-xl px-6 py-12 text-center">
      <span className="text-sm font-medium">{title}</span>
      <span className="text-xs text-muted-foreground">{desc}</span>
    </div>
  );
}

function BeaverEmptyState() {
  return (
    <div className="glass flex flex-col items-center gap-5 rounded-xl px-8 py-12 text-center">
      <svg width="110" height="130" viewBox="0 0 110 130" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="55" cy="118" rx="32" ry="11" fill="#5C3D11" opacity="0.85"/>
        <path d="M27 115 Q55 125 83 115" stroke="#7A5520" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
        <path d="M32 120 Q55 128 78 120" stroke="#7A5520" strokeWidth="1" fill="none" strokeLinecap="round"/>
        <path d="M35 112 Q55 120 75 112" stroke="#7A5520" strokeWidth="1" fill="none" strokeLinecap="round"/>
        <ellipse cx="55" cy="90" rx="24" ry="26" fill="#9B7040"/>
        <ellipse cx="55" cy="93" rx="14" ry="18" fill="#C48C58"/>
        <path d="M33 80 Q18 64 14 48" stroke="#9B7040" strokeWidth="10" strokeLinecap="round" fill="none"/>
        <circle cx="13" cy="45" r="7" fill="#9B7040"/>
        <path d="M77 80 Q92 64 96 48" stroke="#9B7040" strokeWidth="10" strokeLinecap="round" fill="none"/>
        <circle cx="97" cy="45" r="7" fill="#9B7040"/>
        <circle cx="55" cy="52" r="26" fill="#9B7040"/>
        <ellipse cx="35" cy="30" rx="8" ry="9" fill="#9B7040"/>
        <ellipse cx="35" cy="31" rx="5" ry="6" fill="#C87050"/>
        <ellipse cx="75" cy="30" rx="8" ry="9" fill="#9B7040"/>
        <ellipse cx="75" cy="31" rx="5" ry="6" fill="#C87050"/>
        <path d="M41 50 Q46 43 51 50" stroke="#2D1B08" strokeWidth="3" strokeLinecap="round" fill="none"/>
        <path d="M59 50 Q64 43 69 50" stroke="#2D1B08" strokeWidth="3" strokeLinecap="round" fill="none"/>
        <circle cx="40" cy="57" r="7" fill="rgba(210,100,70,0.18)"/>
        <circle cx="70" cy="57" r="7" fill="rgba(210,100,70,0.18)"/>
        <ellipse cx="55" cy="60" rx="5" ry="3.5" fill="#3D2010"/>
        <path d="M48 67 Q55 74 62 67" stroke="#3D2010" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <rect x="47" y="66" width="16" height="13" rx="3" fill="#F8F2DC"/>
        <line x1="55" y1="66" x2="55" y2="79" stroke="#DDD0A8" strokeWidth="1.2"/>
        <path d="M6 28 L7.4 23.5 L8.8 28 L13.5 29.4 L8.8 30.8 L7.4 35 L6 30.8 L1.5 29.4 Z" fill="rgba(250,204,21,0.65)"/>
        <path d="M97 88 L98 85.5 L99 88 L101.5 89 L99 90 L98 92.5 L97 90 L94.5 89 Z" fill="rgba(250,204,21,0.5)"/>
        <circle cx="4" cy="70" r="3" fill="rgba(250,204,21,0.4)"/>
        <circle cx="106" cy="30" r="2" fill="rgba(250,204,21,0.45)"/>
        <circle cx="10" cy="108" r="1.5" fill="rgba(250,204,21,0.35)"/>
        <circle cx="102" cy="108" r="2.5" fill="rgba(250,204,21,0.4)"/>
      </svg>
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-semibold text-[oklch(0.86_0.17_80)]">Dam. Nothing to approve.</p>
        <p className="text-xs text-muted-foreground">The budget beaver is taking the rest of the day off.</p>
      </div>
    </div>
  );
}

function PushConfirmView() {
  const { ynabTransactions, matches, skippedYnabIds, emailTransactions } = useSessionStore(
    useShallow((s) => ({
      ynabTransactions: s.ynabTransactions,
      matches: s.matches,
      skippedYnabIds: s.skippedYnabIds,
      emailTransactions: s.emailTransactions,
    })),
  );

  const [isPushing, setIsPushing] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  const matchedCount = matches.size;
  const skippedCount = skippedYnabIds.size;
  const unmatchedCount = ynabTransactions.length - matchedCount - skippedCount;

  async function handleConfirm() {
    setIsPushing(true);
    setPushError(null);
    try {
      const items: PushPayloadItem[] = [];
      for (const [ynabId, emailTxnId] of matches.entries()) {
        const ynabTxn = ynabTransactions.find((t) => t.id === ynabId);
        const emailTxn = emailTransactions.find((t) => t.id === emailTxnId);
        if (!ynabTxn || !emailTxn) continue;

        const result = reconcile(emailTxn, Math.abs(ynabTxn.amount) / 1000);
        if (result.kind !== "ok") continue;

        items.push({ ynabTxnId: ynabId, splits: result.splits });
      }

      const res = await fetch("/api/ynab/push", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items, skipped: skippedCount, unmatched: unmatchedCount }),
      });

      if (!res.ok) throw new Error(`Push failed: ${res.status}`);
      const pushResult = (await res.json()) as PushResult;

      sessionStore.getState().setPushResult(pushResult);
      sessionStore.getState().setPhase("done");
    } catch (err) {
      console.error("Push failed:", err);
      setPushError("Push failed. Check the console and try again.");
      setIsPushing(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 py-12" style={{ animation: "slideUp 0.4s ease-out" }}>
      <div className="flex flex-col gap-1">
        <span className="kicker">Step 2 of 2</span>
        <h2 className="text-2xl font-semibold tracking-tight gradient-text">Confirm push to YNAB</h2>
        <p className="text-sm text-muted-foreground">
          Review the summary below. Matched transactions will be split and updated.
          Skipped ones stay untouched.
        </p>
      </div>

      <div className="glass flex flex-col rounded-xl">
        <SummaryRow label="To update" value={matchedCount} tone="mint" />
        <div className="h-px divider-soft" />
        <SummaryRow label="Skipped" value={skippedCount} tone="muted" />
        <div className="h-px divider-soft" />
        <SummaryRow label="Unmatched" value={unmatchedCount} tone="muted" />
      </div>

      {pushError && (
        <div className="flex items-center gap-2 rounded-lg border border-[oklch(0.72_0.21_22)]/40 bg-[oklch(0.72_0.21_22)]/10 px-4 py-2.5 text-sm text-[oklch(0.82_0.18_22)]">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{pushError}</span>
        </div>
      )}

      <div className="flex gap-3">
        <Button type="button" disabled={isPushing} onClick={handleConfirm} className="flex-1">
          {isPushing ? "Pushing…" : "Confirm push"}
          {!isPushing && <ArrowUpRight className="h-4 w-4" />}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isPushing}
          onClick={() => sessionStore.getState().setPhase("working")}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

function DoneView() {
  const pushResult = useSessionStore((s) => s.pushResult);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 py-12" style={{ animation: "slideUp 0.4s ease-out" }}>
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[oklch(0.84_0.165_168)]/15 text-[oklch(0.84_0.165_168)]">
          <span className="absolute inset-0 animate-ping rounded-full bg-[oklch(0.84_0.165_168)]/20" style={{ animationDuration: "2s" }} />
          <CheckCircle2 className="relative h-8 w-8" />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold tracking-tight gradient-text">Push complete</h2>
          <p className="text-sm text-muted-foreground">Your YNAB budget is now in sync.</p>
        </div>
      </div>

      <div className="glass flex flex-col rounded-xl">
        <SummaryRow label="Updated" value={pushResult?.updated ?? 0} tone="mint" />
        <div className="h-px divider-soft" />
        <SummaryRow label="Skipped" value={pushResult?.skipped ?? 0} tone="muted" />
        <div className="h-px divider-soft" />
        <SummaryRow label="Unmatched" value={pushResult?.unmatched ?? 0} tone="muted" />
      </div>

      <p className="text-center text-xs text-muted-foreground">Reload to start a new session.</p>
    </div>
  );
}

function SummaryRow({ label, value, tone }: { label: string; value: number; tone: "mint" | "muted" }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={
          tone === "mint"
            ? "font-mono text-lg font-semibold tabular-nums text-[oklch(0.84_0.165_168)]"
            : "font-mono text-lg tabular-nums text-foreground/80"
        }
      >
        {value}
      </span>
    </div>
  );
}
