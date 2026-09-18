// Shared Vitest base config. Projects import and extend it:
//   import { defineConfig, mergeConfig } from "vitest/config";
//   import base from "@jangkar/testing-engines/vitest/base";
//   export default mergeConfig(base, defineConfig({ /* overrides */ }));
//
// Phase 1 scope: coverage is measured on src/core and src/adapters only.
// UI and route code is phase 2 and is excluded on purpose so the gate is honest
// about business logic rather than diluted by view code.

import { fileURLToPath } from "node:url";

const setupFile = fileURLToPath(new URL("./setup.mjs", import.meta.url));

export const COVERAGE_THRESHOLD = 80;

/** @type {import("vitest/config").UserConfig} */
const base = {
  test: {
    // Focused tests (.only) never pass in CI. Locally they are allowed for iteration.
    allowOnly: !process.env.CI,
    // A project with zero tests is a failing project, not a passing one.
    passWithNoTests: false,
    globals: false,
    include: ["tests/**/*.test.{ts,tsx,js,mjs}", "src/**/*.test.{ts,tsx,js,mjs}"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/e2e/**"],
    setupFiles: [setupFile],
    reporters: process.env.CI ? ["default", "junit"] : ["default"],
    outputFile: { junit: "reports/junit.xml" },
    testTimeout: 10_000,
    hookTimeout: 20_000,
    coverage: {
      provider: "v8",
      enabled: false, // turned on by `vitest run --coverage` in test:unit
      all: true,
      include: ["src/core/**/*.{ts,tsx}", "src/adapters/**/*.{ts,tsx}"],
      exclude: [
        "**/*.test.*",
        "**/*.d.ts",
        "**/index.ts",
        "**/types.ts",
        "**/__fixtures__/**",
        "**/__mocks__/**",
      ],
      reporter: ["text", "html", "json", "json-summary", "lcov"],
      reportsDirectory: "coverage",
      thresholds: {
        lines: COVERAGE_THRESHOLD,
        branches: COVERAGE_THRESHOLD,
        functions: COVERAGE_THRESHOLD,
        statements: COVERAGE_THRESHOLD,
        // Coverage may only go up. Vitest rewrites the thresholds in the
        // project's config file when actual coverage exceeds them.
        autoUpdate: false,
      },
    },
  },
};

export default base;
