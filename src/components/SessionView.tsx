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
              <p className="text-sm text-muted-foreground">No unapproved transactions.</p>
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
