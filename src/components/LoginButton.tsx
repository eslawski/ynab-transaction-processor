import { Button } from "@/components/ui/button";

export function LoginButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6">
      <h1 className="text-3xl font-bold">YNAB Transaction Processor</h1>
      <p className="text-muted-foreground">Sign in to review your transactions</p>
      <Button size="lg" onClick={onClick}>
        Sign in with Google
      </Button>
    </div>
  );
}
