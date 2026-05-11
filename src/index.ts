import { serve } from "bun";
import index from "./index.html";
import { auth } from "./auth/auth";
import { getUnapprovedTransactions } from "./ynab/client";
import { getOrderConfirmationEmails } from "./gmail/client";
import { parseEmailWithClaude } from "./ai/parser";
import { pushTransactions, type PushPayloadItem } from "./ynab/push";

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    // --- Auth Routes (handled by better-auth) ---

    "/api/auth/*": (req) => auth.handler(req),

    // --- YNAB Routes ---

    "/api/ynab/transactions": {
      async GET(_req) {
        try {
          const transactions = await getUnapprovedTransactions();
          return Response.json(transactions);
        } catch (err) {
          console.error("Failed to fetch YNAB transactions:", err);
          return Response.json({ error: "Failed to fetch transactions" }, { status: 500 });
        }
      },
    },

    // --- Gmail Routes ---

    "/api/gmail/emails": {
      async GET(req) {
        try {
          const session = await auth.api.getSession({ headers: req.headers });
          if (!session) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }
          const emails = await getOrderConfirmationEmails(session.user.id);
          return Response.json(emails);
        } catch (err) {
          console.error("Failed to fetch Gmail emails:", err);
          return Response.json({ error: "Failed to fetch emails" }, { status: 500 });
        }
      },
    },

    // --- YNAB Push ---

    "/api/ynab/push": {
      async POST(req) {
        try {
          const payload = (await req.json()) as {
            items?: unknown;
            skipped?: unknown;
            unmatched?: unknown;
          };
          if (!Array.isArray(payload.items)) {
            return Response.json({ error: "items must be an array" }, { status: 400 });
          }
          const skipped = typeof payload.skipped === "number" ? payload.skipped : 0;
          const unmatched = typeof payload.unmatched === "number" ? payload.unmatched : 0;
          const result = await pushTransactions(
            payload.items as PushPayloadItem[],
            skipped,
            unmatched,
          );
          return Response.json(result);
        } catch (err) {
          console.error("Failed to push transactions:", err);
          return Response.json({ error: "Failed to push transactions" }, { status: 500 });
        }
      },
    },

    // --- LLM Email Parsing ---

    "/api/emails/:id/parse": {
      async POST(req) {
        const id = req.params.id;
        try {
          const payload = (await req.json()) as { body?: unknown; date?: unknown };
          if (typeof payload.body !== "string" || payload.body.length === 0) {
            return Response.json({ error: "Missing email body" }, { status: 400 });
          }
          const date = typeof payload.date === "string" ? payload.date : new Date().toISOString();
          const transactions = await parseEmailWithClaude({
            id,
            body: payload.body,
            date,
          });
          return Response.json(transactions);
        } catch (err) {
          console.error(`Failed to parse email ${id}:`, err);
          return Response.json({ error: "Failed to parse email" }, { status: 500 });
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
