import { useState, useEffect, useCallback } from "react";
import type { YNABTransaction } from "@/ynab/types";

export function useUnapprovedTransactions(enabled = true) {
  const [transactions, setTransactions] = useState<YNABTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await globalThis.fetch("/api/ynab/transactions");
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? `Request failed: ${res.status}`);
      }
      const data: YNABTransaction[] = await res.json();
      setTransactions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) fetch();
  }, [fetch, enabled]);

  return { transactions, isLoading, error, refetch: fetch };
}
