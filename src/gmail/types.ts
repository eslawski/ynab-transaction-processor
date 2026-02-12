export interface GmailLabel {
  id: string;
  name: string;
  type: string;
  messagesTotal?: number;
  messagesUnread?: number;
}

export interface GmailLabelList {
  labels: GmailLabel[];
}

export interface GmailMessageHeader {
  name: string;
  value: string;
}

export interface GmailMessagePayload {
  headers: GmailMessageHeader[];
}

export interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  payload: GmailMessagePayload;
  internalDate: string;
}

export interface GmailMessageListEntry {
  id: string;
  threadId: string;
}

export interface GmailMessageList {
  messages?: GmailMessageListEntry[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}
