import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` throws outside React Server Components; tests import server modules directly.
      "server-only": fileURLToPath(new URL("./tests/stubs/empty.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/core/**/*.ts", "src/server/**/*.ts", "src/lib/**/*.ts"],
      exclude: ["src/server/actions/**", "src/server/seed/**"],
      thresholds: {
        "src/core/**": { lines: 95, branches: 95, functions: 95, statements: 95 },
      },
    },
  },
});
