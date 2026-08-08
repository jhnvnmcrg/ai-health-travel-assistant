import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Only the pure modules are covered here — the ones where being wrong is
 * silent. Anything that touches Convex, React Native or the network needs a
 * different harness and is not pretended at.
 */
export default defineConfig({
  test: {
    include: ["__tests__/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": rootDir,
    },
  },
});
