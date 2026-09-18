// The engine's own self-tests. The example project has its own config.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.mjs"],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    allowOnly: !process.env.CI,
    passWithNoTests: false,
  },
});
