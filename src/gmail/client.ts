import { Database } from "bun:sqlite";
import type { EmailsResponse, RawEmail } from "@/types";
import { loadFixtureEmails } from "./fixtures";

const GMAIL_BASE_URL = "https://gmail.googleapis.com/gmail/v1";

export class GoogleAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleAuthError";
  }
}
const ORDER_LABEL_NAME = "Order Confirmations";
const RECENT_WINDOW_QUERY = "newer_than:30d";
const MAX_RESULTS = 100;

export async function getOrderConfirmationEmails(userId: string): Promise<EmailsResponse> {
  if (process.env.USE_MOCK_EMAILS === "true") {
    return { source: "mock", emails: loadFixtureEmails() };
  }

  const accessToken = readGoogleAccessToken(userId);
  if (!accessToken) {
    throw new GoogleAuthError("No Google access token found for the current session");
  }

  const labelId = await findLabelId(accessToken, ORDER_LABEL_NAME);
  if (!labelId) return { source: "gmail", emails: [] };

  const messageIds = await listMessageIds(accessToken, labelId);
  const messages = await Promise.all(messageIds.map((id) => fetchMessage(accessToken, id)));
  return {
    source: "gmail",
    emails: messages.filter((m): m is RawEmail => m !== null),
  };
}

function readGoogleAccessToken(userId: string): string | null {
  const db = new Database("sqlite.db", { readonly: true });
  try {
    const row = db
      .query<{ accessToken: string | null }, [string]>(
        `SELECT accessToken FROM account WHERE userId = ? AND providerId = 'google' LIMIT 1`,
      )
      .get(userId);
    return row?.accessToken ?? null;
  } finally {
    db.close();
  }
}

interface GmailLabel {
  id: string;
  name: string;
}

interface GmailLabelsResponse {
  labels?: GmailLabel[];
}

async function findLabelId(token: string, name: string): Promise<string | null> {
  const res = await fetch(`${GMAIL_BASE_URL}/users/me/labels`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 401) throw new GoogleAuthError(`Gmail auth expired (${res.status})`);
    throw new Error(`Gmail labels error ${res.status}: ${await res.text()}`);
  }
  const json: GmailLabelsResponse = await res.json();
  return json.labels?.find((l) => l.name === name)?.id ?? null;
}

interface GmailMessageRef {
  id: string;
  threadId: string;
}

interface GmailMessagesListResponse {
  messages?: GmailMessageRef[];
  nextPageToken?: string;
}

async function listMessageIds(token: string, labelId: string): Promise<string[]> {
  const url = new URL(`${GMAIL_BASE_URL}/users/me/messages`);
  url.searchParams.set("labelIds", labelId);
  url.searchParams.set("q", RECENT_WINDOW_QUERY);
  url.searchParams.set("maxResults", String(MAX_RESULTS));
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Gmail messages error ${res.status}: ${await res.text()}`);
  }
  const json: GmailMessagesListResponse = await res.json();
  return (json.messages ?? []).map((m) => m.id);
}

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailPart {
  mimeType?: string;
  body?: { data?: string; size?: number };
  parts?: GmailPart[];
  headers?: GmailHeader[];
}

interface GmailMessage {
  id: string;
  internalDate: string;
  payload: GmailPart;
}

async function fetchMessage(token: string, id: string): Promise<RawEmail | null> {
  const res = await fetch(`${GMAIL_BASE_URL}/users/me/messages/${id}?format=full`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const msg: GmailMessage = await res.json();
  const headers = msg.payload.headers ?? [];
  const subject = headers.find((h) => h.name.toLowerCase() === "subject")?.value ?? "(no subject)";
  const date = new Date(parseInt(msg.internalDate, 10)).toISOString();
  const body = findMimeType(msg.payload, "text/plain") ?? findMimeType(msg.payload, "text/html") ?? "";

  return {
    id: msg.id,
    subject,
    date,
    body,
    parseStatus: "unprocessed",
  };
}

function findMimeType(part: GmailPart, target: string): string | null {
  if (part.mimeType === target && part.body?.data) {
    return decodeBase64Url(part.body.data);
  }
  if (part.parts) {
    for (const child of part.parts) {
      const found = findMimeType(child, target);
      if (found) return found;
    }
  }
  return null;
}

function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf-8");
}
