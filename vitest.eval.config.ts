import path from "node:path";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// Eval-only config. Hits the real Anthropic API, so it never runs as part
// of `bun run test` / `bun run test:run`. Invoke explicitly via
// `bun run test:eval`. Loads .env explicitly because vitest workers fork
// with a clean env and don't inherit bun's auto-loaded variables.
export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    include: ["src/**/*.eval.test.ts"],
    environment: "node",
    testTimeout: 90_000,
    hookTimeout: 90_000,
    env: loadEnv(mode, process.cwd(), ""),
  },
}));
