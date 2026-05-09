import { useEffect } from "react";
import { sessionStore, useSessionStore } from "@/store/session";
import type { EmailsResponse, YNABTransaction } from "@/types";

export function useSessionLoader(enabled: boolean): void {
  const phase = useSessionStore((s) => s.phase);

  useEffect(() => {
    if (!enabled) return;
    if (phase !== "loading") return;

    let cancelled = false;

    (async () => {
      try {
        const [ynabRes, gmailRes] = await Promise.all([
          fetch("/api/ynab/transactions"),
          fetch("/api/gmail/emails"),
        ]);

        if (!ynabRes.ok) {
          throw new Error(`YNAB fetch failed: ${ynabRes.status}`);
        }
        if (!gmailRes.ok) {
          throw new Error(`Gmail fetch failed: ${gmailRes.status}`);
        }

        const [ynabTransactions, gmail] = (await Promise.all([
          ynabRes.json(),
          gmailRes.json(),
        ])) as [YNABTransaction[], EmailsResponse];

        if (cancelled) return;

        const state = sessionStore.getState();
        state.setYnabTransactions(ynabTransactions);
        state.setRawEmails(gmail.emails);
        state.setEmailSource(gmail.source);
        state.setPhase("working");
      } catch (err) {
        console.error("Session load failed:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, phase]);
}
