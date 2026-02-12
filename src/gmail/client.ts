import type { GmailLabel, GmailLabelList, GmailMessage, GmailMessageList } from "./types";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

function authHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}` };
}

export async function listLabels(accessToken: string): Promise<GmailLabel[]> {
  const res = await fetch(`${GMAIL_API}/labels`, {
    headers: authHeaders(accessToken),
  });

  if (!res.ok) {
    throw new Error(`Failed to list labels: ${res.status}`);
  }

  const data: GmailLabelList = await res.json();
  return data.labels ?? [];
}

export async function listMessagesByLabel(
  accessToken: string,
  labelId: string,
  maxResults = 20,
): Promise<GmailMessage[]> {
  const params = new URLSearchParams({
    labelIds: labelId,
    maxResults: String(maxResults),
  });

  const res = await fetch(`${GMAIL_API}/messages?${params}`, {
    headers: authHeaders(accessToken),
  });

  if (!res.ok) {
    throw new Error(`Failed to list messages: ${res.status}`);
  }

  const data: GmailMessageList = await res.json();
  if (!data.messages?.length) return [];

  // Fetch metadata for each message in parallel
  const messages = await Promise.all(
    data.messages.map((entry) => getMessage(accessToken, entry.id)),
  );

  return messages;
}

export async function getMessage(accessToken: string, messageId: string): Promise<GmailMessage> {
  const params = new URLSearchParams({
    format: "metadata",
    metadataHeaders: "Subject",
    metadataHeaders: "From",
    metadataHeaders: "Date",
  });

  // URLSearchParams dedupes keys, so build manually
  const url = `${GMAIL_API}/messages/${messageId}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`;

  const res = await fetch(url, {
    headers: authHeaders(accessToken),
  });

  if (!res.ok) {
    throw new Error(`Failed to get message ${messageId}: ${res.status}`);
  }

  return res.json();
}
