import { fileURLToPath } from "node:url";
import { defineConfig, mergeConfig } from "vitest/config";
import base from "@jangkar/testing-engines/vitest/node";

const root = fileURLToPath(new URL(".", import.meta.url));

export default mergeConfig(
  base,
  defineConfig({
    root,
    test: {
      coverage: { reportsDirectory: `${root}coverage` },
    },
  }),
);
