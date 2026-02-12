import { serve } from "bun";
import index from "./index.html";
import { auth } from "./auth/auth";
import { listLabels, listMessagesByLabel } from "./gmail/client";
import type { GmailMessageHeader } from "./gmail/types";

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    // --- Auth Routes (handled by better-auth) ---

    "/api/auth/*": (req) => auth.handler(req),

    // --- Gmail Routes ---

    "/api/gmail/labels": {
      async GET(req) {
        const session = await auth.api.getSession({
          headers: req.headers,
        });
        if (!session) {
          return Response.json({ error: "Not authenticated" }, { status: 401 });
        }

        const tokenResult = await auth.api.getAccessToken({
          body: { providerId: "google" },
          headers: req.headers,
        });
        if (!tokenResult?.accessToken) {
          return Response.json({ error: "No Google access token" }, { status: 401 });
        }

        try {
          const labels = await listLabels(tokenResult.accessToken);
          return Response.json(labels);
        } catch (err) {
          console.error("Failed to list labels:", err);
          return Response.json({ error: "Failed to fetch labels" }, { status: 500 });
        }
      },
    },

    "/api/gmail/messages": {
      async GET(req) {
        const session = await auth.api.getSession({
          headers: req.headers,
        });
        if (!session) {
          return Response.json({ error: "Not authenticated" }, { status: 401 });
        }

        const tokenResult = await auth.api.getAccessToken({
          body: { providerId: "google" },
          headers: req.headers,
        });
        if (!tokenResult?.accessToken) {
          return Response.json({ error: "No Google access token" }, { status: 401 });
        }

        const url = new URL(req.url);
        const labelId = url.searchParams.get("label");
        const maxResults = parseInt(url.searchParams.get("maxResults") ?? "20", 10);

        if (!labelId) {
          return Response.json({ error: "Missing label parameter" }, { status: 400 });
        }

        try {
          const messages = await listMessagesByLabel(tokenResult.accessToken, labelId, maxResults);

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
