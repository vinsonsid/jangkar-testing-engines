// Mutation testing on business logic only. A test suite with 80% coverage can
// still catch nothing; mutation score is the honest number.
//   import base from "@jangkar/testing-engines/stryker/base";
//   export default { ...base };

/** @type {import("@stryker-mutator/api/core").PartialStrykerOptions} */
export default {
  testRunner: "vitest",
  vitest: { configFile: "vitest.config.mjs" },
  mutate: ["src/core/**/*.ts", "!src/core/**/*.test.ts", "!src/core/**/types.ts", "!src/core/**/index.ts"],
  thresholds: { high: 90, low: 75, break: 70 },
  incremental: true,
  incrementalFile: "reports/stryker-incremental.json",
  reporters: ["clear-text", "progress", "html", "json"],
  htmlReporter: { fileName: "reports/mutation/index.html" },
  jsonReporter: { fileName: "reports/mutation/report.json" },
  tempDirName: ".stryker-tmp",
  ignoreStatic: true,
  coverageAnalysis: "perTest",
  concurrency: 4,
};
