import { Card } from "@/components/ui/card";
import type { RawEmail } from "@/types";

export function EmailCard({ email }: { email: RawEmail }) {
  return (
    <Card className="gap-1 px-4 py-3">
      <div className="text-sm font-medium leading-snug" title={email.subject}>
        {email.subject}
      </div>
      <div className="font-mono text-xs text-muted-foreground">
        {formatDate(email.date)}
      </div>
    </Card>
  );
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
