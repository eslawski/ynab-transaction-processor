import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import type {
  EmailParseStatus,
  EmailSource,
  EmailTransaction,
  PushResult,
  RawEmail,
  SessionPhase,
  YNABTransaction,
} from "@/types";

export interface SessionState {
  phase: SessionPhase;
  ynabTransactions: YNABTransaction[];
  rawEmails: RawEmail[];
  emailSource: EmailSource | null;
  emailTransactions: EmailTransaction[];
  matches: Map<string, string>;
  skippedYnabIds: Set<string>;
  pushResult: PushResult | null;
  setYnabTransactions: (txns: YNABTransaction[]) => void;
  setRawEmails: (emails: RawEmail[]) => void;
  setEmailSource: (source: EmailSource | null) => void;
  setPhase: (phase: SessionPhase) => void;
  updateEmailParseStatus: (emailId: string, status: EmailParseStatus) => void;
  addEmailTransactions: (txns: EmailTransaction[]) => void;
  clearEmailTransactionsForEmail: (emailId: string) => void;
  matchTransaction: (ynabId: string, emailTxnId: string) => void;
  unmatchTransaction: (ynabId: string) => void;
  skipYnabTransaction: (ynabId: string) => void;
  unskipYnabTransaction: (ynabId: string) => void;
  setPushResult: (result: PushResult | null) => void;
}

export function createSessionStore() {
  return createStore<SessionState>((set) => ({
    phase: "loading",
    ynabTransactions: [],
    rawEmails: [],
    emailSource: null,
    emailTransactions: [],
    matches: new Map(),
    skippedYnabIds: new Set(),
    pushResult: null,
    setYnabTransactions: (ynabTransactions) => set({ ynabTransactions }),
    setRawEmails: (rawEmails) => set({ rawEmails }),
    setEmailSource: (emailSource) => set({ emailSource }),
    setPhase: (phase) => set({ phase }),
    updateEmailParseStatus: (emailId, status) =>
      set((state) => ({
        rawEmails: state.rawEmails.map((e) =>
          e.id === emailId ? { ...e, parseStatus: status } : e,
        ),
      })),
    addEmailTransactions: (txns) =>
      set((state) => ({
        emailTransactions: [...state.emailTransactions, ...txns],
      })),
    clearEmailTransactionsForEmail: (emailId) =>
      set((state) => ({
        emailTransactions: state.emailTransactions.filter((t) => t.rawEmailId !== emailId),
      })),
    matchTransaction: (ynabId, emailTxnId) =>
      set((state) => {
        const next = new Map(state.matches);
        next.set(ynabId, emailTxnId);
        return { matches: next };
      }),
    unmatchTransaction: (ynabId) =>
      set((state) => {
        const next = new Map(state.matches);
        next.delete(ynabId);
        return { matches: next };
      }),
    skipYnabTransaction: (ynabId) =>
      set((state) => {
        const next = new Set(state.skippedYnabIds);
        next.add(ynabId);
        return { skippedYnabIds: next };
      }),
    unskipYnabTransaction: (ynabId) =>
      set((state) => {
        const next = new Set(state.skippedYnabIds);
        next.delete(ynabId);
        return { skippedYnabIds: next };
      }),
    setPushResult: (pushResult) => set({ pushResult }),
  }));
}

export const sessionStore = createSessionStore();

export function useSessionStore<T>(selector: (state: SessionState) => T): T {
  return useStore(sessionStore, selector);
}
