import { useAuth } from "@/hooks/useAuth";
import { UserMenu } from "@/components/UserMenu";
import { Button } from "@/components/ui/button";
import "./index.css";

export function App() {
  const { isAuthenticated, user, login, logout } = useAuth();

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

      {/* Main — two-column shell (left: emails, right: YNAB transactions) */}
      <main className="grid grid-cols-2 gap-6 px-6 py-8" />
    </div>
  );
}

export default App;
