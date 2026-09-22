import { existsSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { cli, npmLinkEngine, tmp } from "./helpers.mjs";

const ENGINE_VERSION = `v${JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version}`;

describe("jangkar-test init", () => {
  let t;
  let project;
  beforeAll(() => {
    t = tmp();
    project = join(t.dir, "probe");
    const r = cli(["init", "--stack", "node-api", project], t.dir);
    if (r.status !== 0) throw new Error(r.stderr);
  });
  afterAll(() => t.cleanup());

  it("writes configs that import the engine", () => {
    for (const f of ["vitest.config.mjs", "eslint.config.mjs", "stryker.config.mjs", "tsconfig.json"]) {
      expect(existsSync(join(project, f))).toBe(true);
      expect(readFileSync(join(project, f), "utf8")).toContain("@jangkar/testing-engines");
    }
  });

  it("pins the engine and adds every test script", () => {
    const pkg = JSON.parse(readFileSync(join(project, "package.json"), "utf8"));
    expect(pkg.devDependencies["@jangkar/testing-engines"]).toBe(`github:vinsonsid/jangkar-testing-engines#${ENGINE_VERSION}`);
    for (const s of ["lint", "typecheck", "test:unit", "test:integration", "test:system", "test:mutation", "test:all"]) {
      expect(typeof pkg.scripts[s]).toBe("string");
    }
    expect(pkg.name).toBe("probe");
  });

  it("installs Claude tooling and the CI caller with the version substituted", () => {
    expect(readFileSync(join(project, "CLAUDE.md"), "utf8")).toContain("<!-- BEGIN:jangkar-testing-engines -->");
    const settings = JSON.parse(readFileSync(join(project, ".claude/settings.json"), "utf8"));
    expect(JSON.stringify(settings.hooks.Stop)).toContain("stop-check.sh");
    expect(existsSync(join(project, ".claude/skills/spec-first/SKILL.md"))).toBe(true);
    expect(existsSync(join(project, ".claude/agents/test-auditor.md"))).toBe(true);
    const wf = readFileSync(join(project, ".github/workflows/quality-gate.yml"), "utf8");
    expect(wf).toContain(`quality-gate.yml@${ENGINE_VERSION}`);
    expect(wf).not.toContain("__ENGINE_VERSION__");
  });

  it("passes doctor immediately after init", () => {
    const r = cli(["doctor", project], t.dir);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("all");
  });

  it("lint fails when core imports I/O, reads the clock, or reaches into adapters", () => {
    npmLinkEngine(project);
    const bad = join(project, "src/core/bad.ts");
    writeFileSync(bad, [
      'import { readFileSync } from "node:fs";',
      "export function bad(): number {",
      "  void readFileSync;",
      "  return Date.now();",
      "}",
      "",
    ].join("\n"));
    const r = spawnSync(process.execPath, [join(project, "node_modules/eslint/bin/eslint.js"), "src/core/bad.ts"], { cwd: project, encoding: "utf8" });
    rmSync(bad);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain("core must not use Node I/O");
    expect(r.stdout).toContain("core must not read the clock");
  });

  it("fails doctor once a focused test is added", () => {
    const f = join(project, "tests/unit/focused.test.ts");
    writeFileSync(f, 'import { it, expect } from "vitest";\nit.only("x", () => { expect(1).toBe(1); });\n');
    const r = cli(["doctor", project], t.dir);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain("focused/skipped/todo test");
  });

  it("fails doctor when a coverage threshold is lowered", () => {
    const cfg = join(project, "vitest.config.mjs");
    writeFileSync(cfg, readFileSync(cfg, "utf8").replace("test: {", "test: { coverage: { thresholds: { lines: 50 } },"));
    const r = cli(["doctor", project], t.dir);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain("lines=50");
  });

  it("refuses to init into a non-empty directory", () => {
    const r = cli(["init", "--stack", "node-api", project], t.dir);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("not empty");
  });

  it("refuses stacks that are not yet available", () => {
    const r = cli(["init", "--stack", "python", join(t.dir, "py")], t.dir);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("phase 1b");
  });
});

describe("jangkar-test retrofit", () => {
  let t;
  beforeAll(() => {
    t = tmp();
    // A minimal create-next-app-like project.
    writeFileSync(
      join(t.dir, "package.json"),
      JSON.stringify({ name: "legacy", scripts: { dev: "next dev", lint: "eslint" }, dependencies: { next: "16.0.0" }, devDependencies: { typescript: "^5" } }, null, 2),
    );
    writeFileSync(join(t.dir, "tsconfig.json"), JSON.stringify({ compilerOptions: { strict: false, target: "ES2017", jsx: "preserve" }, include: ["**/*.ts"] }));
    writeFileSync(join(t.dir, "CLAUDE.md"), "# legacy\n\nexisting rules\n");
    mkdirSync(join(t.dir, ".claude"));
    writeFileSync(join(t.dir, ".claude/settings.json"), JSON.stringify({ permissions: { allow: ["Bash(npm:*)"] } }));
  });
  afterAll(() => t.cleanup());

  it("detects nextjs, adds scripts without clobbering, and preserves existing settings", () => {
    const r = cli(["retrofit"], t.dir);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("as nextjs");
    const pkg = JSON.parse(readFileSync(join(t.dir, "package.json"), "utf8"));
    expect(pkg.scripts.dev).toBe("next dev");
    expect(pkg.scripts.lint).toBe("eslint"); // existing script kept
    expect(pkg.scripts["test:unit"]).toContain("--coverage");
    expect(pkg.devDependencies["eslint-config-next"]).toBeDefined();
    const ts = JSON.parse(readFileSync(join(t.dir, "tsconfig.json"), "utf8"));
    expect(ts.extends).toBe("@jangkar/testing-engines/tsconfig/next");
    expect(ts.compilerOptions.strict).toBeUndefined();
    expect(ts.compilerOptions.jsx).toBe("preserve");
    const settings = JSON.parse(readFileSync(join(t.dir, ".claude/settings.json"), "utf8"));
    expect(settings.permissions.allow).toStrictEqual(["Bash(npm:*)"]);
    expect(JSON.stringify(settings.hooks.Stop)).toContain("stop-check.sh");
    const claude = readFileSync(join(t.dir, "CLAUDE.md"), "utf8");
    expect(claude.startsWith("# legacy")).toBe(true);
    expect(claude).toContain("<!-- END:jangkar-testing-engines -->");
  });

  it("is idempotent: a second run adds nothing twice", () => {
    const before = readFileSync(join(t.dir, "CLAUDE.md"), "utf8");
    const r = cli(["retrofit"], t.dir);
    expect(r.status).toBe(0);
    expect(readFileSync(join(t.dir, "CLAUDE.md"), "utf8")).toBe(before);
    const settings = JSON.parse(readFileSync(join(t.dir, ".claude/settings.json"), "utf8"));
    expect(settings.hooks.Stop).toHaveLength(1);
  });

  it("passes doctor after retrofit", () => {
    const r = cli(["doctor"], t.dir);
    expect(r.status).toBe(0);
  });

  it("doctor reports drift when an owned skill or the rules block is edited", () => {
    const skill = join(t.dir, ".claude/skills/spec-first/SKILL.md");
    writeFileSync(skill, readFileSync(skill, "utf8") + "\nlocal edit\n");
    const md = join(t.dir, "CLAUDE.md");
    writeFileSync(md, readFileSync(md, "utf8").replace("## Honesty", "## Honesty (edited)"));
    const r = cli(["doctor"], t.dir);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain("stale: .claude/skills/spec-first/SKILL.md, CLAUDE.md (rules block)");
  });

  it("upgrade without a tag refreshes drifted tooling and keeps the rest of CLAUDE.md", () => {
    const r = cli(["upgrade"], t.dir);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("~ .claude/skills/spec-first/SKILL.md");
    expect(r.stdout).toContain("~ CLAUDE.md");
    const md = readFileSync(join(t.dir, "CLAUDE.md"), "utf8");
    expect(md.startsWith("# legacy\n\nexisting rules")).toBe(true);
    expect(md).not.toContain("(edited)");
    expect(md.match(/BEGIN:jangkar-testing-engines/g)).toHaveLength(1);
    expect(cli(["doctor"], t.dir).status).toBe(0);
  });

  it("upgrade with a tag re-pins package.json and the workflow, then refreshes", () => {
    const r = cli(["upgrade", "v9.9.9"], t.dir);
    expect(r.status).toBe(0);
    expect(JSON.parse(readFileSync(join(t.dir, "package.json"), "utf8")).devDependencies["@jangkar/testing-engines"]).toBe("github:vinsonsid/jangkar-testing-engines#v9.9.9");
    expect(readFileSync(join(t.dir, ".github/workflows/quality-gate.yml"), "utf8")).toContain("quality-gate.yml@v9.9.9");
    expect(r.stdout).toContain("0 refreshed");
    expect(r.stdout).toContain("To get v9.9.9's tooling");
  });
});
