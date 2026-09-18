import { mergeConfig } from "vitest/config";
import base from "./base.mjs";

/** Node environment: pure logic, adapters, APIs. */
export default mergeConfig(base, {
  test: {
    environment: "node",
  },
});
