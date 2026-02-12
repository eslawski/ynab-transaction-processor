import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useGmailLabels, useGmailMessages } from "@/hooks/useGmail";
import { LoginButton } from "@/components/LoginButton";
import { UserMenu } from "@/components/UserMenu";
import { LabelSelector } from "@/components/LabelSelector";
import { EmailList } from "@/components/EmailList";
import "./index.css";

export function App() {
  const { isLoading, isAuthenticated, user, login, logout } = useAuth();
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const { labels, isLoading: labelsLoading } = useGmailLabels();
  const { messages, isLoading: messagesLoading, error: messagesError } = useGmailMessages(selectedLabel);

  if (isLoading) {
    return (
      <div className="container mx-auto p-8 text-center relative z-10">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="container mx-auto p-8 text-center relative z-10">
        <LoginButton onClick={login} />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 relative z-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">YNAB Transaction Processor</h1>
        <UserMenu user={user} onLogout={logout} />
      </div>

      <div className="mb-6">
        <LabelSelector
          labels={labels}
          isLoading={labelsLoading}
          selectedLabel={selectedLabel}
          onSelect={setSelectedLabel}
        />
      </div>

      <EmailList messages={messages} isLoading={messagesLoading} error={messagesError} />
    </div>
  );
}

export default App;
