import { serve } from "bun";
import index from "./index.html";
import { auth } from "./auth/auth";
import { getUnapprovedTransactions } from "./ynab/client";

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
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`Server running at ${server.url}`);
