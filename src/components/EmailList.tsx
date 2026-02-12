import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface EmailMessage {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

interface EmailListProps {
  messages: EmailMessage[];
  isLoading: boolean;
  error: string | null;
}

export function EmailList({ messages, isLoading, error }: EmailListProps) {
  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading messages...</div>;
  }

  if (error) {
    return <div className="text-sm text-destructive">{error}</div>;
  }

  if (messages.length === 0) {
    return <div className="text-sm text-muted-foreground">No messages found. Select a label above.</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      {messages.map((msg) => (
        <Card key={msg.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{msg.subject || "(No subject)"}</CardTitle>
            <CardDescription>
              {msg.from} &middot; {msg.date}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground line-clamp-2">{msg.snippet}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
