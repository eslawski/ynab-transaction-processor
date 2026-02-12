import { useCallback, useEffect, useState } from "react";

interface GmailLabel {
  id: string;
  name: string;
  type: string;
}

interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  date: string;
}

export function useGmailLabels() {
  const [labels, setLabels] = useState<GmailLabel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLabels = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/gmail/labels");
      if (!res.ok) throw new Error(`Failed to fetch labels: ${res.status}`);
      const data = await res.json();
      setLabels(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch labels");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLabels();
  }, [fetchLabels]);

  return { labels, isLoading, error, refetch: fetchLabels };
}

export function useGmailMessages(labelId: string | null) {
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!labelId) {
      setMessages([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    fetch(`/api/gmail/messages?label=${encodeURIComponent(labelId)}&maxResults=20`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch messages: ${res.status}`);
        return res.json();
      })
      .then((data) => setMessages(data))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to fetch messages"))
      .finally(() => setIsLoading(false));
  }, [labelId]);

  return { messages, isLoading, error };
}
