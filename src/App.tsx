import { useAuth } from "@/hooks/useAuth";
import { UserMenu } from "@/components/UserMenu";
import { SessionView } from "@/components/SessionView";
import { Button } from "@/components/ui/button";
import { useSessionStore } from "@/store/session";
import "./index.css";

export function App() {
  const { isAuthenticated, user, login, logout } = useAuth();
  const phase = useSessionStore((s) => s.phase);

  return (
    <div className="min-h-screen w-full">
      <header className="flex items-center justify-between border-b border-border/40 px-6 py-4">
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

      <main className="px-6 py-8">
        {isAuthenticated && user && phase === "reauth" ? (
          <div className="flex flex-col items-center gap-3 py-24 text-muted-foreground">
            <p className="text-sm">Your Google session has expired.</p>
            <Button variant="outline" size="sm" onClick={login}>
              Sign in again
            </Button>
          </div>
        ) : isAuthenticated && user ? (
          <SessionView />
        ) : (
          <div className="flex flex-col items-center gap-3 py-24 text-muted-foreground">
            <p className="text-sm">Sign in to begin a reconciliation session.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
