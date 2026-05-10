import react from "@vitejs/plugin-react";
import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // Eval tests hit the real Anthropic API and live behind `bun run test:eval`.
    exclude: [...configDefaults.exclude, "**/*.eval.test.ts"],
    environment: "jsdom",
    setupFiles: ["src/test-setup.ts"],
  },
});
