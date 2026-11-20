import { existsSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { cli, ENGINE_ROOT, git, npmLinkEngine, tmp } from "./helpers.mjs";

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
    for (const s of ["spec-first", "test-review", "coverage-gaps", "system-test", "mutation-survivors"]) {
      expect(existsSync(join(project, `.claude/skills/${s}/SKILL.md`))).toBe(true);
    }
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
    rmSync(join(t.dir, ".github/pull_request_template.md"));
    const r = cli(["upgrade"], t.dir);
    expect(r.stdout).toContain("+ .github/pull_request_template.md");
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
    const tpl = join(t.dir, ".github/pull_request_template.md");
    writeFileSync(tpl, readFileSync(tpl, "utf8") + "\nproject-specific checklist\n");
    const custom = readFileSync(tpl, "utf8");
    const r = cli(["upgrade", "v9.9.9"], t.dir);
    expect(r.status).toBe(0);
    expect(readFileSync(tpl, "utf8")).toBe(custom);
    expect(JSON.parse(readFileSync(join(t.dir, "package.json"), "utf8")).devDependencies["@jangkar/testing-engines"]).toBe("github:vinsonsid/jangkar-testing-engines#v9.9.9");
    expect(readFileSync(join(t.dir, ".github/workflows/quality-gate.yml"), "utf8")).toContain("quality-gate.yml@v9.9.9");
    expect(r.stdout).toContain("0 refreshed");
    const wf = readFileSync(join(t.dir, ".github/workflows/quality-gate.yml"), "utf8");
    expect(wf.match(/^\s+schedule:/gm)).toHaveLength(1);
    expect(wf.match(/^\s+workflow_dispatch:/gm)).toHaveLength(1);
    expect(r.stdout).toContain("To get v9.9.9's tooling");
  });
});

describe("jangkar-test doctor: section 5 checks, quarantine, PR template, --json", () => {
  let t;
  let project;
  beforeAll(() => {
    t = tmp();
    project = join(t.dir, "probe");
    const r = cli(["init", "--stack", "node-api", project], t.dir);
    if (r.status !== 0) throw new Error(r.stderr);
  });
  afterAll(() => t.cleanup());

  /** Write a file, run `doctor --json`, remove the file, return the parsed report. */
  const doctorWith = (rel, content) => {
    const p = join(project, rel);
    mkdirSync(join(p, ".."), { recursive: true });
    writeFileSync(p, content);
    const r = cli(["doctor", project, "--json"], t.dir);
    rmSync(p);
    return { status: r.status, report: JSON.parse(r.stdout) };
  };
  const failed = (report) => report.checks.filter((c) => !c.ok);
  const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
  const ISSUE = "https://github.com/acme/app/issues/7";

  it("--json reports every check and exits 0 on a clean project", () => {
    const r = cli(["doctor", project, "--json"], t.dir);
    expect(r.status).toBe(0);
    const report = JSON.parse(r.stdout);
    expect(report).toMatchObject({ engine: ENGINE_VERSION, ok: true, failed: 0 });
    expect(report.passed).toBe(report.checks.length);
    expect(report.checks.map((c) => c.name)).toContain("PR template carries the Definition of Done");
  });

  it.each([
    ["commented-out test", 'import { it, expect } from "vitest";\nit("a", () => { expect(1).toBe(1); });\n  // it("b", () => { expect(2).toBe(2); });\n'],
    ["import from __mocks__", 'import { it, expect } from "vitest";\nimport { f } from "../../src/core/__mocks__/example";\nit("a", () => { expect(f()).toBe(1); });\n'],
    ["@ts-expect-error without a description", 'import { it, expect } from "vitest";\n// @ts-expect-error\nit("a", () => { expect(1).toBe(1); });\n'],
    ["snapshot is the only assertion", 'import { it, expect } from "vitest";\nit("a", () => { expect({ a: 1 }).toMatchInlineSnapshot(); });\n'],
  ])("fails on %s", (label, content) => {
    const { status, report } = doctorWith("tests/unit/bad.test.ts", content);
    expect(status).toBe(1);
    expect(failed(report)).toStrictEqual([expect.objectContaining({ name: "no forbidden patterns in tests", hint: expect.stringContaining(label) })]);
  });

  it("allows a snapshot next to a real assertion, and a described @ts-expect-error", () => {
    const { status } = doctorWith(
      "tests/unit/ok.test.ts",
      'import { it, expect } from "vitest";\nit("a", () => {\n  // @ts-expect-error: wrong arg type on purpose\n  expect(1).toBe(1);\n  expect({ a: 1 }).toMatchInlineSnapshot();\n});\n',
    );
    expect(status).toBe(0);
  });

  it("fails when the project config retries failing tests", () => {
    const cfg = join(project, "vitest.config.mjs");
    const before = readFileSync(cfg, "utf8");
    writeFileSync(cfg, before.replace("test: {", "test: { retry: 2,"));
    const r = cli(["doctor", project, "--json"], t.dir);
    writeFileSync(cfg, before);
    expect(r.status).toBe(1);
    expect(failed(JSON.parse(r.stdout))).toStrictEqual([expect.objectContaining({ name: "vitest config does not retry failing tests", hint: expect.stringContaining("retry=2") })]);
  });

  it("accepts a labelled quarantine within 14 days", () => {
    const { status } = doctorWith("tests/quarantine/flaky.test.ts", `// quarantined: ${daysAgo(13)} ${ISSUE}\n`);
    expect(status).toBe(0);
  });

  it.each([
    ["older than 14 days", `// quarantined: ${daysAgo(15)} ${ISSUE}\n`, "over 14 days"],
    ["without an issue link", `// quarantined: ${daysAgo(1)}\n`, "needs"],
    ["without a date", `// ${ISSUE}\n`, "needs"],
  ])("fails a quarantined test %s", (_, content, hint) => {
    const { status, report } = doctorWith("tests/quarantine/flaky.test.ts", content);
    expect(status).toBe(1);
    expect(failed(report)).toStrictEqual([expect.objectContaining({ name: expect.stringContaining("tests/quarantine/"), hint: expect.stringContaining(hint) })]);
  });

  it.each([
    ["missing", null],
    ["present without the Definition of Done", "## What and why\n"],
  ])("fails when the PR template is %s", (_, replacement) => {
    const p = join(project, ".github/pull_request_template.md");
    const before = readFileSync(p, "utf8");
    if (replacement === null) rmSync(p);
    else writeFileSync(p, replacement);
    const r = cli(["doctor", project, "--json"], t.dir);
    writeFileSync(p, before);
    expect(r.status).toBe(1);
    expect(failed(JSON.parse(r.stdout)).map((c) => c.name)).toStrictEqual(["PR template carries the Definition of Done"]);
  });
});

describe("jangkar-test timed", () => {
  const run = (args, env = {}) => {
    const r = spawnSync(process.execPath, [join(ENGINE_ROOT, "bin/jangkar-test.mjs"), "timed", ...args], { encoding: "utf8", env: { ...process.env, GITHUB_STEP_SUMMARY: "", ...env } });
    return { status: r.status, stdout: r.stdout };
  };

  it("passes the command's exit code through and reports within budget", () => {
    const ok = run(["unit", "60", "--", process.execPath, "-e", "process.exit(0)"]);
    expect(ok.status).toBe(0);
    expect(ok.stdout).toMatch(/^unit: \d+\.\d s of 60 s budget$/m);
    expect(run(["unit", "60", "--", process.execPath, "-e", "process.exit(3)"]).status).toBe(3);
  });

  it("warns over budget without failing, and fails when enforced", () => {
    const warn = run(["unit", "0.001", "--", process.execPath, "-e", "0"]);
    expect(warn.status).toBe(0);
    expect(warn.stdout).toContain("::warning title=Time budget::unit:");
    const enforced = run(["unit", "0.001", "--", process.execPath, "-e", "0"], { JANGKAR_ENFORCE_BUDGETS: "1" });
    expect(enforced.status).toBe(1);
    expect(enforced.stdout).toContain("::error title=Time budget::unit:");
  });

  it("appends a row to the step summary", () => {
    const t = tmp();
    const summary = join(t.dir, "summary.md");
    run(["integration+system", "300", "--", process.execPath, "-e", "0"], { GITHUB_STEP_SUMMARY: summary });
    expect(readFileSync(summary, "utf8")).toMatch(/^\| integration\+system \| \d+\.\d s \| 300 s \| within \|\n$/);
    t.cleanup();
  });

  it("rejects a missing separator or a non-positive budget", () => {
    expect(run(["unit", "60", process.execPath]).status).toBe(1);
    expect(run(["unit", "0", "--", process.execPath, "-e", "0"]).status).toBe(1);
  });
});

describe("jangkar-test mutation-scope", () => {
  let t;
  beforeAll(() => {
    t = tmp();
    git(["init", "-q", "-b", "main"], t.dir);
    for (const f of ["src/core/keep.ts", "src/core/gone.ts", "src/adapters/db.ts"]) {
      mkdirSync(join(t.dir, f, ".."), { recursive: true });
      writeFileSync(join(t.dir, f), "export const x = 1;\n");
    }
    git(["add", "."], t.dir);
    git(["commit", "-q", "-m", "base"], t.dir);
    git(["tag", "base"], t.dir);
    const changed = {
      "src/core/keep.ts": "export const x = 2;\n",
      "src/core/pajak/new.ts": "export const y = 1;\n",
      "src/core/pajak/view.tsx": "export const z = 1;\n",
      "src/core/pajak/new.test.ts": "x\n",
      "src/core/pajak/types.ts": "export type T = 1;\n",
      "src/core/pajak/index.ts": "export {};\n",
      "src/core/pajak/ambient.d.ts": "declare const a: 1;\n",
      "src/adapters/db.ts": "export const x = 3;\n",
      "src/core/notes.md": "x\n",
    };
    for (const [f, text] of Object.entries(changed)) {
      mkdirSync(join(t.dir, f, ".."), { recursive: true });
      writeFileSync(join(t.dir, f), text);
    }
    rmSync(join(t.dir, "src/core/gone.ts"));
    git(["add", "-A"], t.dir);
    git(["commit", "-q", "-m", "change"], t.dir);
  });
  afterAll(() => t.cleanup());

  it("lists changed core sources only, without tests, types, index, declarations, or deletions", () => {
    const r = cli(["mutation-scope", "base"], t.dir);
    expect(r.status).toBe(0);
    expect(r.stdout.trim().split(",").sort()).toStrictEqual(["src/core/keep.ts", "src/core/pajak/new.ts", "src/core/pajak/view.tsx"]);
  });

  it("prints nothing when no core source changed", () => {
    const r = cli(["mutation-scope", "HEAD"], t.dir);
    expect(r.status).toBe(0);
    expect(r.stdout).toBe("\n");
  });

  it("fails on an unknown base", () => {
    expect(cli(["mutation-scope", "no-such-ref"], t.dir).status).toBe(1);
  });
});

describe("jangkar-test mutation-summary", () => {
  let t;
  const mutant = (status, line, replacement = "x") => ({ status, mutatorName: "EqualityOperator", replacement, location: { start: { line, column: 1 }, end: { line, column: 2 } } });
  beforeAll(() => {
    t = tmp();
    mkdirSync(join(t.dir, "reports/mutation"), { recursive: true });
    writeFileSync(join(t.dir, "reports/mutation/report.json"), JSON.stringify({
      files: {
        "src/core/a.ts": { mutants: [mutant("Killed", 1), mutant("Killed", 2), mutant("Timeout", 3), mutant("Survived", 4, "a | b"), mutant("Ignored", 5), mutant("CompileError", 6)] },
        "src/core/b.ts": { mutants: [mutant("NoCoverage", 7)] },
      },
    }));
  });
  afterAll(() => t.cleanup());

  it("scores detected over detected plus undetected, ignoring ignored and compile errors, and lists survivors", () => {
    const r = cli(["mutation-summary"], t.dir);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("### Mutation score: 60% (3 of 5 detected)");
    expect(r.stdout).toContain("| src/core/a.ts:4 | Survived | EqualityOperator | `a \\| b` |");
    expect(r.stdout).toContain("| src/core/b.ts:7 | NoCoverage | EqualityOperator | `x` |");
    expect(r.stdout).not.toContain(":5 |");
  });

  it("appends to the trend file and reports the change against the previous run", () => {
    const trend = join(t.dir, "reports/mutation-trend.json");
    writeFileSync(trend, JSON.stringify([{ date: "2026-01-01", sha: "abc1234", score: 62.5 }]));
    const r = cli(["mutation-summary", "reports/mutation/report.json", "--trend", "reports/mutation-trend.json"], t.dir);
    expect(r.stdout).toContain("Trend (last 2 full runs): 62.5 → 60 (-2.50 vs previous)");
    const saved = JSON.parse(readFileSync(trend, "utf8"));
    expect(saved).toHaveLength(2);
    expect(saved[1]).toMatchObject({ score: 60 });
  });

  it("keeps only the last 30 entries", () => {
    const trend = join(t.dir, "reports/mutation-trend.json");
    writeFileSync(trend, JSON.stringify(Array.from({ length: 30 }, (_, i) => ({ date: "2026-01-01", sha: "", score: i }))));
    cli(["mutation-summary", "reports/mutation/report.json", "--trend", "reports/mutation-trend.json"], t.dir);
    const saved = JSON.parse(readFileSync(trend, "utf8"));
    expect(saved).toHaveLength(30);
    expect(saved[0].score).toBe(1);
    expect(saved[29].score).toBe(60);
  });

  it("fails without a report", () => {
    expect(cli(["mutation-summary", "missing.json"], t.dir).status).toBe(1);
  });
});

describe("jangkar-test upgrade on a pre-v0.5.0 caller", () => {
  it("adds the nightly schedule and workflow_dispatch once and keeps existing triggers", () => {
    const t = tmp();
    writeFileSync(join(t.dir, "package.json"), JSON.stringify({ name: "old", devDependencies: {} }));
    mkdirSync(join(t.dir, ".github/workflows"), { recursive: true });
    const wf = join(t.dir, ".github/workflows/quality-gate.yml");
    writeFileSync(wf, "name: quality-gate\n\non:\n  pull_request:\n  push:\n    branches: [main]\n\njobs:\n  quality-gate:\n    uses: vinsonsid/jangkar-testing-engines/.github/workflows/quality-gate.yml@v0.4.0\n");
    const first = cli(["upgrade"], t.dir);
    expect(first.stdout).toContain("~ .github/workflows/quality-gate.yml (added nightly schedule and workflow_dispatch)");
    const text = readFileSync(wf, "utf8");
    expect(text).toContain('on:\n  schedule:\n    - cron: "17 19 * * *" # nightly full mutation run\n  workflow_dispatch:\n  pull_request:\n  push:\n    branches: [main]\n');
    const second = cli(["upgrade"], t.dir);
    expect(second.stdout).not.toContain("added nightly");
    expect(readFileSync(wf, "utf8")).toBe(text);
    t.cleanup();
  });
});
