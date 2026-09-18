import { describe, expect, it } from "vitest";
import base, { COVERAGE_THRESHOLD } from "../configs/vitest/base.mjs";
import node from "../configs/vitest/node.mjs";
import stryker from "../configs/stryker/base.mjs";
import eslintBase from "../configs/eslint/base.mjs";
import eslintTests from "../configs/eslint/tests.mjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ENGINE_ROOT } from "./helpers.mjs";

describe("vitest base config", () => {
  it("enforces 80% on all four coverage metrics", () => {
    const t = base.test.coverage.thresholds;
    expect(COVERAGE_THRESHOLD).toBe(80);
    expect(t).toStrictEqual({ lines: 80, branches: 80, functions: 80, statements: 80, autoUpdate: false });
  });

  it("scopes coverage to core and adapters only", () => {
    expect(base.test.coverage.include).toStrictEqual(["src/core/**/*.{ts,tsx}", "src/adapters/**/*.{ts,tsx}"]);
  });

  it("does not pass with no tests", () => {
    expect(base.test.passWithNoTests).toBe(false);
  });

  it("node config inherits thresholds and sets node environment", () => {
    expect(node.test.environment).toBe("node");
    expect(node.test.coverage.thresholds.lines).toBe(80);
  });
});

describe("stryker base config", () => {
  it("breaks below 70 and mutates only core", () => {
    expect(stryker.thresholds).toStrictEqual({ high: 90, low: 75, break: 70 });
    expect(stryker.mutate[0]).toBe("src/core/**/*.ts");
    expect(stryker.mutate.some((m) => m.startsWith("!") && m.includes(".test."))).toBe(true);
  });
});

describe("eslint configs", () => {
  it("base forbids any, ts-ignore, floating promises", () => {
    // The project-wide entry is the one that sets no-explicit-any; the JS-only entry after it relaxes type-aware rules.
    const rules = eslintBase.find((c) => c.rules?.["no-console"] && !c.files).rules;
    expect(rules["@typescript-eslint/no-explicit-any"]).toBe("error");
    expect(rules["@typescript-eslint/no-floating-promises"]).toBe("error");
    expect(rules["@typescript-eslint/ban-ts-comment"][1]["ts-ignore"]).toBe(true);
  });

  it("tests config forbids focused, disabled, and conditional tests", () => {
    const rules = eslintTests[0].rules;
    for (const r of ["vitest/no-focused-tests", "vitest/no-disabled-tests", "vitest/no-conditional-expect", "vitest/expect-expect"]) {
      expect(rules[r]).toBe("error");
    }
  });
});

describe("tsconfig strict", () => {
  it("turns on the unchecked-index and exact-optional flags", () => {
    const ts = JSON.parse(readFileSync(join(ENGINE_ROOT, "configs/tsconfig/strict.json"), "utf8"));
    expect(ts.compilerOptions.strict).toBe(true);
    expect(ts.compilerOptions.noUncheckedIndexedAccess).toBe(true);
    expect(ts.compilerOptions.exactOptionalPropertyTypes).toBe(true);
  });
});
