import { defineConfig, mergeConfig } from "vitest/config";
import base from "@jangkar/testing-engines/vitest/node";

export default mergeConfig(
  base,
  defineConfig({
    test: {
      // Project-specific overrides go here. Thresholds may only go up.
    },
  }),
);
