import { serve } from "bun";
import index from "./index.html";
import { buildAuthorizationUrl, exchangeCodeForTokens, fetchUserInfo } from "./auth/google";
import {
  createSession,
  deleteSession,
  getValidSession,
  SESSION_COOKIE,
} from "./auth/session";
import { listLabels, listMessagesByLabel } from "./gmail/client";
import type { GmailMessageHeader } from "./gmail/types";

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 1 week
};

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    "/api/hello": {
      async GET(req) {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        });
      },
      async PUT(req) {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        });
      },
    },

    "/api/hello/:name": async (req) => {
      const name = req.params.name;
      return Response.json({
        message: `Hello, ${name}!`,
      });
    },

    // --- Auth Routes ---

    "/api/auth/login": {
      GET(req) {
        const state = crypto.randomUUID();
        const url = buildAuthorizationUrl(state);

        req.cookies.set({
          name: "oauth_state",
          value: state,
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: 600,
        });

        return new Response(null, {
          status: 302,
          headers: { Location: url },
        });
      },
    },

    "/api/auth/callback": {
      async GET(req) {
        const url = new URL(req.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const storedState = req.cookies.get("oauth_state");

        if (!state || !storedState || state !== storedState) {
          console.log(`Invalid state parameter: ${state} !== ${storedState}`);
          return Response.json({ error: "Invalid state parameter" }, { status: 400 });
        }

        if (!code) {
          console.log(`Missing authorization code`);
          return Response.json({ error: "Missing authorization code" }, { status: 400 });
        }

        try {
          const tokens = await exchangeCodeForTokens(code);
          const user = await fetchUserInfo(tokens.access_token);

          console.log(`Creating session for user: ${user.email}`);
          const session = createSession({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token ?? "",
            expiresIn: tokens.expires_in,
            user,
          });

          req.cookies.set({
            name: SESSION_COOKIE,
            value: session.id,
            ...SESSION_COOKIE_OPTIONS,
          });
          req.cookies.delete("oauth_state");

          return new Response(null, {
            status: 302,
            headers: { Location: "/" },
          });
        } catch (err) {
          console.error("OAuth callback error:", err);
          return Response.json({ error: "Authentication failed" }, { status: 500 });
        }
      },
    },

    "/api/auth/me": {
      async GET(req) {
        const session = await getValidSession(req);
        if (!session) {
          return Response.json({ error: "Not authenticated" }, { status: 401 });
        }
        return Response.json(session.user);
      },
    },

    "/api/auth/logout": {
      async POST(req) {
        const sessionId = req.cookies.get(SESSION_COOKIE);
        if (sessionId) {
          deleteSession(sessionId);
        }
        req.cookies.delete(SESSION_COOKIE);
        return new Response(null, { status: 200 });
      },
    },

    // --- Gmail Routes ---

    "/api/gmail/labels": {
      async GET(req) {
        const session = await getValidSession(req);
        if (!session) {
          return Response.json({ error: "Not authenticated" }, { status: 401 });
        }

        try {
          const labels = await listLabels(session.accessToken);
          return Response.json(labels);
        } catch (err) {
          console.error("Failed to list labels:", err);
          return Response.json({ error: "Failed to fetch labels" }, { status: 500 });
        }
      },
    },

    "/api/gmail/messages": {
      async GET(req) {
        const session = await getValidSession(req);
        if (!session) {
          return Response.json({ error: "Not authenticated" }, { status: 401 });
        }

        const url = new URL(req.url);
        const labelId = url.searchParams.get("label");
        const maxResults = parseInt(url.searchParams.get("maxResults") ?? "20", 10);

        if (!labelId) {
          return Response.json({ error: "Missing label parameter" }, { status: 400 });
        }

        try {
          const messages = await listMessagesByLabel(session.accessToken, labelId, maxResults);

          // Transform messages to a simpler format for the frontend
          const simplified = messages.map((msg) => {
            const headers = msg.payload?.headers ?? [];
            const getHeader = (name: string) =>
              headers.find((h: GmailMessageHeader) => h.name === name)?.value ?? "";

            return {
              id: msg.id,
              threadId: msg.threadId,
              subject: getHeader("Subject"),
              from: getHeader("From"),
              date: getHeader("Date"),
              snippet: msg.snippet,
            };
          });

          return Response.json(simplified);
        } catch (err) {
          console.error("Failed to list messages:", err);
          return Response.json({ error: "Failed to fetch messages" }, { status: 500 });
        }
      },
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`Server running at ${server.url}`);
