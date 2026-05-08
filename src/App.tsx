import { useAuth } from "@/hooks/useAuth";
import { useUnapprovedTransactions } from "@/hooks/useYNAB";
import { UserMenu } from "@/components/UserMenu";
import { TransactionList } from "@/components/TransactionList";
import { Button } from "@/components/ui/button";
import "./index.css";

export function App() {
  const { isAuthenticated, user, login, logout } = useAuth();
  const { transactions, isLoading, error, refetch } = useUnapprovedTransactions();

  return (
    <div className="min-h-screen w-full">
      {/* Header */}
      <header className="border-b border-border/40 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold tracking-tight">YNAB</h1>
          <p className="text-xs text-muted-foreground">Transaction Review</p>
        </div>
        {isAuthenticated && user ? (
          <UserMenu user={user} onLogout={logout} />
        ) : (
          <Button variant="outline" size="sm" onClick={login}>
            Sign in
          </Button>
        )}
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <TransactionList
          transactions={transactions}
          isLoading={isLoading}
          error={error}
          onRefetch={refetch}
        />
      </main>
    </div>
  );
}

export default App;
