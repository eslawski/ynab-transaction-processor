import { useSessionStore } from "@/store/session";
import { useSessionLoader } from "@/hooks/useSessionLoader";
import { SessionLoading } from "./SessionLoading";
import { EmailCard } from "./EmailCard";
import { YNABTransactionCard } from "./YNABTransactionCard";

export function SessionView() {
  const phase = useSessionStore((s) => s.phase);
  const ynabTransactions = useSessionStore((s) => s.ynabTransactions);
  const rawEmails = useSessionStore((s) => s.rawEmails);

  useSessionLoader(true);

  if (phase === "loading") {
    return <SessionLoading />;
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      <section className="flex flex-col gap-3">
        <header className="flex items-baseline justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Order confirmation emails
          </h2>
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
          <span className="font-mono text-xs text-muted-foreground">{ynabTransactions.length}</span>
        </header>
        {ynabTransactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No unapproved transactions.</p>
        ) : (
          ynabTransactions.map((txn) => <YNABTransactionCard key={txn.id} transaction={txn} />)
        )}
      </section>
    </div>
  );
}
