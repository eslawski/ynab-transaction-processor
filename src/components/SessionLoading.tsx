import { Loader2 } from "lucide-react";

export function SessionLoading() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
      <p className="text-sm">Loading transactions and emails…</p>
    </div>
  );
}
