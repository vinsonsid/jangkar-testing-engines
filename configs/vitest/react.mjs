import { mergeConfig } from "vitest/config";
import base from "./base.mjs";

/**
 * React / jsdom environment. Phase 2 (frontend). Requires the project to
 * install jsdom and @testing-library/react. Unit tests for src/core still run
 * under node via the `environmentMatchGlobs` mapping below.
 */
export default mergeConfig(base, {
  test: {
    environment: "jsdom",
    environmentMatchGlobs: [
      ["tests/unit/**", "node"],
      ["tests/system/**", "node"],
      ["src/core/**", "node"],
      ["src/adapters/**", "node"],
    ],
  },
});
