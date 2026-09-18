// End-to-end: scaffold a project, install the engine into it, and prove the
// Stop hook blocks on a red suite and allows a green one.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cli, git, npmLinkEngine, tmp } from "./helpers.mjs";

function runStopHook(cwd, input = "{}") {
  const r = spawnSync("bash", [".claude/hooks/stop-check.sh"], { cwd, input, encoding: "utf8", env: { ...process.env, CI: "" } });
  return { status: r.status, stderr: r.stderr, stdout: r.stdout };
}

describe("stop-check hook", () => {
  let t;
  let project;
  beforeAll(() => {
    t = tmp();
    project = join(t.dir, "hooked");
    const init = cli(["init", "--stack", "node-api", project], t.dir);
    if (init.status !== 0) throw new Error(init.stderr);
    // Strip the engine git dep so npm installs from the local path instead of GitHub.
    const pkgPath = join(project, "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    delete pkg.devDependencies["@jangkar/testing-engines"];
    delete pkg.scripts.prepare;
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    npmLinkEngine(project);
    git(["init", "-q"], project);
    git(["add", "-A"], project);
    git(["commit", "-qm", "init"], project);
  });
  afterAll(() => t.cleanup());

  it("scaffolded project is green and typechecks under the engine's strict config", () => {
    expect(existsSync(join(project, "node_modules/@jangkar/testing-engines/package.json"))).toBe(true);
    const unit = spawnSync("npm", ["run", "test:unit"], { cwd: project, encoding: "utf8", env: { ...process.env, CI: "" } });
    expect(unit.status).toBe(0);
    expect(unit.stdout).toMatch(/Statements\s*:\s*100%/);
    const sys = spawnSync("npm", ["run", "test:system"], { cwd: project, encoding: "utf8" });
    expect(sys.status).toBe(0);
    const tc = spawnSync("npm", ["run", "typecheck"], { cwd: project, encoding: "utf8" });
    expect(tc.status).toBe(0);
  });

  it("allows the stop when nothing under src/ or tests/ changed", () => {
    expect(runStopHook(project).status).toBe(0);
  });

  it("allows the stop when stop_hook_active is already true (no infinite loop)", () => {
    writeFileSync(join(project, "tests/unit/red.test.ts"), 'import { it, expect } from "vitest";\nit("red", () => { expect(1).toBe(2); });\n');
    expect(runStopHook(project, '{"stop_hook_active": true}').status).toBe(0);
  });

  it("blocks the stop with exit 2 when a changed test is red", () => {
    const r = runStopHook(project);
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("unit suite is RED");
    expect(r.stderr).toContain("red.test.ts");
  });

  it("allows the stop again once the test is green", () => {
    writeFileSync(join(project, "tests/unit/red.test.ts"), 'import { describe, it, expect } from "vitest";\ndescribe("g", () => { it("green", () => { expect(1).toBe(1); }); });\n');
    expect(runStopHook(project).status).toBe(0);
  });

  it("lint fails on a focused test in the scaffolded project", () => {
    writeFileSync(join(project, "tests/unit/red.test.ts"), 'import { describe, it, expect } from "vitest";\ndescribe("g", () => { it.only("green", () => { expect(1).toBe(1); }); });\n');
    const r = spawnSync("npm", ["run", "lint"], { cwd: project, encoding: "utf8" });
    expect(r.status).not.toBe(0);
    expect(r.stdout + r.stderr).toContain("no-focused-tests");
  });
});
