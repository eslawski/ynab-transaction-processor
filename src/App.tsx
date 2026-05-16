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
    <div className="relative min-h-screen w-full overflow-x-hidden">
      <AmbientBackdrop />

      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-3.5">
          <BrandMark />
          <div className="flex items-center gap-3">
            <StatusPill phase={phase} authenticated={isAuthenticated} />
            {isAuthenticated && user ? (
              <UserMenu user={user} onLogout={logout} />
            ) : (
              <Button variant="outline" size="sm" onClick={login}>
                Sign in
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-[1400px] px-6 py-10">
        {isAuthenticated && user && phase === "reauth" ? (
          <ReauthView onLogin={login} />
        ) : isAuthenticated && user ? (
          <SessionView />
        ) : (
          <LandingView onLogin={login} />
        )}
      </main>
    </div>
  );
}

function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-9 w-9 items-center justify-center rounded-xl brand-mark">
        <MatcherMark size={20} />
      </div>
      <span className="text-[15px] font-semibold tracking-tight gradient-text">
        YNAB Transaction Matcher
      </span>
    </div>
  );
}

function MatcherMark({ size = 20 }: { size?: number }) {
  const ink = "oklch(0.13 0.012 250)";
  const w = size;
  // Geometric Y — chunky stroke, rounded caps, slight stem flare via a foot cap dot
  return (
    <svg
      width={w}
      height={w}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="relative z-10"
      aria-hidden
    >
      <path
        d="M5 5 L12 12.5 L19 5 M12 12.5 L12 19.5"
        stroke={ink}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StatusPill({ phase, authenticated }: { phase: string; authenticated: boolean }) {
  if (!authenticated) return null;

  const label =
    phase === "loading" ? "Loading"
    : phase === "working" ? "Reconciling"
    : phase === "pushing" ? "Confirm push"
    : phase === "done" ? "Complete"
    : phase === "reauth" ? "Reauth"
    : "Idle";

  const tone =
    phase === "done" ? "bg-[oklch(0.84_0.165_168)]"
    : phase === "pushing" ? "bg-[oklch(0.78_0.19_60)]"
    : phase === "reauth" ? "bg-[oklch(0.72_0.21_22)]"
    : "bg-[oklch(0.74_0.16_235)]";

  return (
    <div className="hidden md:flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 backdrop-blur-md">
      <span className="relative flex h-1.5 w-1.5">
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${tone}`} />
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${tone}`} />
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function AmbientBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute -top-32 left-1/2 h-[480px] w-[920px] -translate-x-1/2 rounded-full opacity-50 blur-[120px]"
        style={{
          background:
            "radial-gradient(closest-side, oklch(0.84 0.165 168 / 0.55), transparent)",
          animation: "float 16s ease-in-out infinite",
        }}
      />
      <div
        className="absolute top-[40%] -right-40 h-[380px] w-[600px] rounded-full opacity-40 blur-[120px]"
        style={{
          background:
            "radial-gradient(closest-side, oklch(0.74 0.16 235 / 0.5), transparent)",
          animation: "float 22s ease-in-out infinite reverse",
        }}
      />
      <div
        className="absolute bottom-[-10%] -left-20 h-[360px] w-[560px] rounded-full opacity-30 blur-[120px]"
        style={{
          background:
            "radial-gradient(closest-side, oklch(0.7 0.22 305 / 0.45), transparent)",
          animation: "float 26s ease-in-out infinite",
        }}
      />
      <div className="absolute inset-0 surface-grid opacity-[0.35]" />
    </div>
  );
}

function LandingView({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-8 py-24 text-center" style={{ animation: "fadeIn 0.6s ease-out" }}>
      <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl brand-mark">
        <MatcherMark size={40} />
      </div>

      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-semibold tracking-tight gradient-text">
          Match receipts at the speed of thought.
        </h1>
        <p className="text-base text-muted-foreground">
          YNAB Transaction Matcher reads your order-confirmation emails, parses
          every line item, and pairs them with your unapproved YNAB transactions.
          Drag, drop, done.
        </p>
      </div>

      <Button size="lg" onClick={onLogin}>
        Sign in with Google
      </Button>

      <div className="grid w-full grid-cols-3 gap-3 pt-4">
        <FeatureChip label="Gmail" desc="Reads inbox" />
        <FeatureChip label="LLM" desc="Parses receipts" />
        <FeatureChip label="YNAB" desc="Splits & syncs" />
      </div>
    </div>
  );
}

function FeatureChip({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="glass flex flex-col items-start gap-1 rounded-lg px-3 py-2.5 text-left">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[oklch(0.84_0.165_168)]">
        {label}
      </span>
      <span className="text-xs text-muted-foreground">{desc}</span>
    </div>
  );
}

function ReauthView({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-4 rounded-xl glass px-8 py-12 text-center" style={{ animation: "fadeIn 0.5s ease-out" }}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[oklch(0.72_0.21_22)]/15 text-[oklch(0.78_0.21_22)]">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 9v4" /><path d="M12 17h.01" /><circle cx="12" cy="12" r="10" />
        </svg>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">Google session expired</p>
        <p className="text-xs text-muted-foreground">Sign back in to refresh your token.</p>
      </div>
      <Button variant="outline" size="sm" onClick={onLogin}>
        Sign in again
      </Button>
    </div>
  );
}

export default App;
