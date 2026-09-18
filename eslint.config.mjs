import base from "./configs/eslint/base.mjs";
import tests from "./configs/eslint/tests.mjs";

export default [
  ...base,
  ...tests,
  { ignores: ["templates/**", "examples/**/coverage/**", "examples/**/reports/**"] },
  {
    // Engine self-tests are plain JS; keep them under the tests ruleset but not type-checked.
    files: ["tests/**/*.mjs"],
    rules: { "vitest/require-top-level-describe": "off" },
  },
];
