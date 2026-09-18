import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ENGINE_ROOT } from "./helpers.mjs";

describe("reusable workflow", () => {
  const canonical = readFileSync(join(ENGINE_ROOT, "ci/github/quality-gate.yml"), "utf8");

  it("is mirrored byte-for-byte into .github/workflows", () => {
    const mirror = readFileSync(join(ENGINE_ROOT, ".github/workflows/quality-gate.yml"), "utf8");
    expect(mirror).toBe(canonical);
  });

  it("exposes a single required check named quality-gate that depends on every gate", () => {
    expect(canonical).toContain("name: quality-gate\n    runs-on");
    expect(canonical).toMatch(/needs: \[doctor, lint, typecheck, unit, integration, mutation\]/);
  });

  it("runs doctor first and every other job needs it", () => {
    expect(canonical).toContain("npx jangkar-test doctor");
    for (const job of ["lint", "typecheck", "unit"]) {
      expect(canonical).toMatch(new RegExp(`  ${job}:\\n(.*\\n){1,3}    needs: doctor`));
    }
  });

  it("caller template points at the engine workflow with a version placeholder", () => {
    const caller = readFileSync(join(ENGINE_ROOT, "ci/github/caller-template.yml"), "utf8");
    expect(caller).toContain("vinsonsid/jangkar-testing-engines/.github/workflows/quality-gate.yml@__ENGINE_VERSION__");
    const templateCopy = readFileSync(join(ENGINE_ROOT, "templates/_shared/.github/workflows/quality-gate.yml"), "utf8");
    expect(templateCopy).toBe(caller);
  });
});
