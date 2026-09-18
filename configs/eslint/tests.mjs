// Lint rules for test files. Makes fake-green tests a lint error.
import vitest from "@vitest/eslint-plugin";

export default [
  {
    files: ["tests/**/*.{ts,tsx,js,mjs}", "**/*.test.{ts,tsx,js,mjs}"],
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
      "vitest/no-focused-tests": "error",
      "vitest/no-disabled-tests": "error",
      "vitest/no-commented-out-tests": "error",
      "vitest/expect-expect": "error",
      "vitest/no-conditional-expect": "error",
      "vitest/no-conditional-tests": "error",
      "vitest/no-identical-title": "error",
      "vitest/no-standalone-expect": "error",
      "vitest/valid-expect": "error",
      "vitest/valid-title": "error",
      "vitest/prefer-strict-equal": "error",
      "vitest/prefer-to-be": "error",
      "vitest/prefer-called-with": "error",
      "vitest/no-mocks-import": "error",
      "vitest/require-top-level-describe": "error",
      "vitest/no-large-snapshots": ["error", { maxSize: 20 }],
      // Tests may use explicit module boundary-free helpers.
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
];
