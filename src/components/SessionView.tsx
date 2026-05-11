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
  const { ynabTransactions, rawEmails, emailSource, matches } = useSessionStore(
    useShallow((s) => ({
      ynabTransactions: s.ynabTransactions,
      rawEmails: s.rawEmails,
      emailSource: s.emailSource,
      matches: s.matches,
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

    // Block if this email txn is already matched to a different YNAB txn
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

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-4">
        {dropError && (
          <div className="rounded border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-400">
            {dropError}
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          <section className="flex flex-col gap-3">
            <header className="flex items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Order confirmation emails
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  last 30 days
                </span>
                {emailSource === "mock" && (
                  <span className="rounded border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-400">
                    mock data
                  </span>
                )}
              </div>
              <span className="font-mono text-xs text-muted-foreground">{rawEmails.length}</span>
            </header>
            {rawEmails.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No order confirmation emails in the last 30 days.
              </p>
            ) : (
              rawEmails.map((email) => <EmailCard key={email.id} email={email} />)
            )}
          </section>

          <section className="flex flex-col gap-3">
            <header className="flex items-baseline justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Unapproved YNAB transactions
              </h2>
              <span className="font-mono text-xs text-muted-foreground">
                {ynabTransactions.length}
              </span>
            </header>
            {ynabTransactions.length === 0 ? (
              <div className="flex flex-col items-center gap-5 rounded-xl border border-dashed border-border/40 px-8 py-12 text-center">
                {/* Budget Beaver — arms raised in celebration, nothing to chew on */}
                <svg width="110" height="130" viewBox="0 0 110 130" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Tail */}
                  <ellipse cx="55" cy="118" rx="32" ry="11" fill="#5C3D11" opacity="0.85"/>
                  <path d="M27 115 Q55 125 83 115" stroke="#7A5520" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
                  <path d="M32 120 Q55 128 78 120" stroke="#7A5520" strokeWidth="1" fill="none" strokeLinecap="round"/>
                  <path d="M35 112 Q55 120 75 112" stroke="#7A5520" strokeWidth="1" fill="none" strokeLinecap="round"/>

                  {/* Body */}
                  <ellipse cx="55" cy="90" rx="24" ry="26" fill="#9B7040"/>
                  {/* Belly */}
                  <ellipse cx="55" cy="93" rx="14" ry="18" fill="#C48C58"/>

                  {/* Left arm raised in celebration */}
                  <path d="M33 80 Q18 64 14 48" stroke="#9B7040" strokeWidth="10" strokeLinecap="round" fill="none"/>
                  <circle cx="13" cy="45" r="7" fill="#9B7040"/>

                  {/* Right arm raised in celebration */}
                  <path d="M77 80 Q92 64 96 48" stroke="#9B7040" strokeWidth="10" strokeLinecap="round" fill="none"/>
                  <circle cx="97" cy="45" r="7" fill="#9B7040"/>

                  {/* Head */}
                  <circle cx="55" cy="52" r="26" fill="#9B7040"/>

                  {/* Left ear */}
                  <ellipse cx="35" cy="30" rx="8" ry="9" fill="#9B7040"/>
                  <ellipse cx="35" cy="31" rx="5" ry="6" fill="#C87050"/>

                  {/* Right ear */}
                  <ellipse cx="75" cy="30" rx="8" ry="9" fill="#9B7040"/>
                  <ellipse cx="75" cy="31" rx="5" ry="6" fill="#C87050"/>

                  {/* Happy squinting eyes (arc = ∩ shape) */}
                  <path d="M41 50 Q46 43 51 50" stroke="#2D1B08" strokeWidth="3" strokeLinecap="round" fill="none"/>
                  <path d="M59 50 Q64 43 69 50" stroke="#2D1B08" strokeWidth="3" strokeLinecap="round" fill="none"/>

                  {/* Rosy cheeks */}
                  <circle cx="40" cy="57" r="7" fill="rgba(210,100,70,0.18)"/>
                  <circle cx="70" cy="57" r="7" fill="rgba(210,100,70,0.18)"/>

                  {/* Nose */}
                  <ellipse cx="55" cy="60" rx="5" ry="3.5" fill="#3D2010"/>

                  {/* Smile */}
                  <path d="M48 67 Q55 74 62 67" stroke="#3D2010" strokeWidth="1.5" strokeLinecap="round" fill="none"/>

                  {/* Big beaver buck teeth */}
                  <rect x="47" y="66" width="16" height="13" rx="3" fill="#F8F2DC"/>
                  <line x1="55" y1="66" x2="55" y2="79" stroke="#DDD0A8" strokeWidth="1.2"/>

                  {/* Sparkle stars */}
                  <path d="M6 28 L7.4 23.5 L8.8 28 L13.5 29.4 L8.8 30.8 L7.4 35 L6 30.8 L1.5 29.4 Z" fill="rgba(250,204,21,0.65)"/>
                  <path d="M97 88 L98 85.5 L99 88 L101.5 89 L99 90 L98 92.5 L97 90 L94.5 89 Z" fill="rgba(250,204,21,0.5)"/>
                  <circle cx="4" cy="70" r="3" fill="rgba(250,204,21,0.4)"/>
                  <circle cx="106" cy="30" r="2" fill="rgba(250,204,21,0.45)"/>
                  <circle cx="10" cy="108" r="1.5" fill="rgba(250,204,21,0.35)"/>
                  <circle cx="102" cy="108" r="2.5" fill="rgba(250,204,21,0.4)"/>
                </svg>
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-semibold text-amber-400">Dam. Nothing to approve.</p>
                  <p className="text-xs text-muted-foreground">The budget beaver is taking the rest of the day off.</p>
                </div>
              </div>
            ) : (
              ynabTransactions.map((txn) => (
                <YNABTransactionCard
                  key={txn.id}
                  transaction={txn}
                  onClick={() => setDrawerTxnId(txn.id)}
                />
              ))
            )}

            <Button
              type="button"
              disabled={matches.size === 0}
              className="mt-2 self-start"
              onClick={() => sessionStore.getState().setPhase("pushing")}
            >
              Push to YNAB
            </Button>
          </section>
        </div>
      </div>

      <DragOverlay>{activeTxn && <EmailTransactionCardOverlay txn={activeTxn} />}</DragOverlay>

      {drawerTxn && (
        <TransactionDrawer transaction={drawerTxn} onClose={() => setDrawerTxnId(null)} />
      )}
    </DndContext>
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
    <div className="mx-auto flex max-w-sm flex-col gap-6 py-12">
      <h2 className="text-sm font-semibold">Confirm push to YNAB</h2>

      <div className="flex flex-col gap-2 rounded border border-border/60 px-4 py-3 font-mono text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">To update</span>
          <span className="text-emerald-400">{matchedCount}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Skipped</span>
          <span>{skippedCount}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Unmatched</span>
          <span>{unmatchedCount}</span>
        </div>
      </div>

      {pushError && (
        <p className="text-sm text-red-400">{pushError}</p>
      )}

      <div className="flex gap-3">
        <Button type="button" disabled={isPushing} onClick={handleConfirm}>
          {isPushing ? "Pushing…" : "Confirm"}
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
    <div className="mx-auto flex max-w-sm flex-col gap-6 py-12">
      <h2 className="text-sm font-semibold">Push complete</h2>

      <div className="flex flex-col gap-2 rounded border border-border/60 px-4 py-3 font-mono text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Updated</span>
          <span className="text-emerald-400">{pushResult?.updated ?? 0}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Skipped</span>
          <span>{pushResult?.skipped ?? 0}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Unmatched</span>
          <span>{pushResult?.unmatched ?? 0}</span>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">Session complete. Reload to start a new session.</p>
    </div>
  );
}
