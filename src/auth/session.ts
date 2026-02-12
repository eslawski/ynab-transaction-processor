import { refreshAccessToken, type GoogleUserInfo } from "./google";

export interface Session {
  id: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: number;
  user: GoogleUserInfo;
}

const sessions = new Map<string, Session>();

export const SESSION_COOKIE = "session_id";

export function createSession(params: {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: GoogleUserInfo;
}): Session {
  const session: Session = {
    id: crypto.randomUUID(),
    accessToken: params.accessToken,
    refreshToken: params.refreshToken,
    tokenExpiresAt: Date.now() + params.expiresIn * 1000,
    user: params.user,
  };
  sessions.set(session.id, session);
  return session;
}

export function getSession(sessionId: string): Session | undefined {
  return sessions.get(sessionId);
}

export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}

/**
 * Get a valid session for a request, auto-refreshing the access token if expired.
 * Returns undefined if no valid session exists.
 */
export async function getValidSession(req: Request): Promise<Session | undefined> {
  const cookies = (req as any).cookies as import("bun").CookieMap;
  const sessionId = cookies.get(SESSION_COOKIE);
  if (!sessionId) return undefined;

  const session = sessions.get(sessionId);
  if (!session) return undefined;

  // Refresh token if expired (with 60s buffer)
  if (Date.now() >= session.tokenExpiresAt - 60_000) {
    try {
      const tokens = await refreshAccessToken(session.refreshToken);
      session.accessToken = tokens.access_token;
      session.tokenExpiresAt = Date.now() + tokens.expires_in * 1000;
      if (tokens.refresh_token) {
        session.refreshToken = tokens.refresh_token;
      }
    } catch {
      // Refresh failed — session is invalid
      sessions.delete(sessionId);
      return undefined;
    }
  }

  return session;
}
