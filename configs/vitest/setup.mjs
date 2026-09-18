// Global setup for every test file. Kept deliberately small.
//
// 1. Unhandled promise rejections fail the run instead of being swallowed.
// 2. In CI, `console.error` inside a test fails that test. Vibe-coded code
//    often "works" while logging errors; that is not passing.

import { afterEach, beforeEach, vi } from "vitest";

process.on("unhandledRejection", (reason) => {
  throw reason instanceof Error ? reason : new Error(String(reason));
});

if (process.env.CI && process.env.JANGKAR_ALLOW_CONSOLE_ERROR !== "1") {
  let errors = [];
  beforeEach(() => {
    errors = [];
    vi.spyOn(console, "error").mockImplementation((...args) => {
      errors.push(args.map(String).join(" "));
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    if (errors.length > 0) {
      throw new Error(
        `console.error was called ${errors.length} time(s) during this test:\n` +
          errors.map((e) => `  - ${e}`).join("\n") +
          "\nSet JANGKAR_ALLOW_CONSOLE_ERROR=1 to bypass for a specific run.",
      );
    }
  });
}
