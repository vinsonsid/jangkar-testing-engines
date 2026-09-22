#!/usr/bin/env node
// jangkar-test: init | retrofit | doctor | upgrade
// Plain Node, no dependencies, so it runs via `npx github:...` before install.

import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ENGINE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const enginePkg = JSON.parse(readFileSync(join(ENGINE_ROOT, "package.json"), "utf8"));
const ENGINE_VERSION = `v${enginePkg.version}`;
const ENGINE_REPO = "vinsonsid/jangkar-testing-engines";
const MARK_BEGIN = "<!-- BEGIN:jangkar-testing-engines -->";
const MARK_END = "<!-- END:jangkar-testing-engines -->";
const STACKS = ["nextjs", "node-api"];
const PHASE_LATER = { python: "phase 1b", "mobile-expo": "phase 2" };

const log = (...a) => console.log(...a);
const fail = (msg) => {
  console.error(`jangkar-test: ${msg}`);
  process.exit(1);
};

// ---------- helpers ----------

function readJson(p) {
  return JSON.parse(readFileSync(p, "utf8"));
}
function writeJson(p, obj) {
  writeFileSync(p, JSON.stringify(obj, null, 2) + "\n");
}
function walk(dir, base = dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".git", "coverage", "dist", ".next", ".stryker-tmp", "reports"].includes(entry.name)) continue;
      out.push(...walk(full, base));
    } else out.push(relative(base, full));
  }
  return out;
}
function substitute(text, vars) {
  return Object.entries(vars).reduce((t, [k, v]) => t.replaceAll(k, v), text);
}
function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=");
      if (v !== undefined) flags[k] = v;
      else if (argv[i + 1] && !argv[i + 1].startsWith("--")) flags[k] = argv[++i];
      else flags[k] = true;
    } else positional.push(a);
  }
  return { flags, positional };
}
function detectStack(dir) {
  const pkgPath = join(dir, "package.json");
  if (!existsSync(pkgPath)) return null;
  const pkg = readJson(pkgPath);
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  if (deps.next) return "nextjs";
  return "node-api";
}
function deepMergeMissing(target, source) {
  // Adds keys from source that are missing in target. Never overwrites.
  for (const [k, v] of Object.entries(source)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      target[k] = deepMergeMissing(target[k] && typeof target[k] === "object" ? target[k] : {}, v);
    } else if (!(k in target)) target[k] = v;
  }
  return target;
}

// Copies template files. Returns { written, skipped }.
function copyTemplate(srcDir, destDir, vars, { overwrite }) {
  const written = [];
  const skipped = [];
  for (const rel of walk(srcDir)) {
    if (rel === "package.json" || rel === "package.fragment.json") continue;
    const src = join(srcDir, rel);
    const dest = join(destDir, rel);
    if (existsSync(dest) && !overwrite) {
      skipped.push(rel);
      continue;
    }
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, substitute(readFileSync(src, "utf8"), vars));
    written.push(rel);
  }
  return { written, skipped };
}

/** Files the engine owns inside an adopter: relative path -> engine source path. */
function ownedClaudeFiles() {
  const out = [];
  for (const sub of ["skills", "agents", "hooks"]) {
    const src = join(ENGINE_ROOT, "claude", sub);
    for (const rel of walk(src)) {
      if (rel === "settings.hooks.json") continue;
      out.push({ rel: join(".claude", sub, rel), src: join(src, rel) });
    }
  }
  return out;
}

function rulesBlock() {
  return readFileSync(join(ENGINE_ROOT, "claude", "CLAUDE.testing.md"), "utf8").trim();
}

/** Replace the engine's block in CLAUDE.md text, or append it. Returns the new text. */
function withRulesBlock(existing) {
  const block = rulesBlock();
  const begin = existing.indexOf(MARK_BEGIN);
  const end = existing.indexOf(MARK_END);
  if (begin !== -1 && end !== -1 && end > begin) {
    return existing.slice(0, begin) + block + existing.slice(end + MARK_END.length);
  }
  return existing ? `${existing.trimEnd()}\n\n${block}\n` : `${block}\n`;
}

/**
 * Install or refresh skills, agents, hooks, hook wiring, and the CLAUDE.md
 * rules block. Idempotent. Returns { written, updated, unchanged } so callers
 * can print an honest diff summary.
 */
function installClaudeTooling(dir) {
  const claudeDir = join(dir, ".claude");
  const written = [];
  const updated = [];
  const unchanged = [];
  const place = (rel, next) => {
    const dest = join(dir, rel);
    const before = existsSync(dest) ? readFileSync(dest, "utf8") : null;
    if (before === next) return unchanged.push(rel);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, next);
    (before === null ? written : updated).push(rel);
  };
  for (const { rel, src } of ownedClaudeFiles()) place(rel, readFileSync(src, "utf8"));
  // Hooks must stay executable after a text write.
  for (const { rel } of ownedClaudeFiles()) if (rel.endsWith(".sh")) chmodSync(join(dir, rel), 0o755);

  // Merge hook wiring into .claude/settings.json without touching other keys.
  const settingsPath = join(claudeDir, "settings.json");
  const settings = existsSync(settingsPath) ? readJson(settingsPath) : {};
  const wiring = readJson(join(ENGINE_ROOT, "claude", "hooks", "settings.hooks.json"));
  settings.hooks ??= {};
  for (const [event, entries] of Object.entries(wiring.hooks)) {
    settings.hooks[event] ??= [];
    const already = JSON.stringify(settings.hooks[event]).includes("stop-check.sh");
    if (!already) settings.hooks[event].push(...entries);
  }
  place(".claude/settings.json", JSON.stringify(settings, null, 2) + "\n");

  // Rules block in CLAUDE.md: append if absent, replace if stale.
  const claudeMd = join(dir, "CLAUDE.md");
  const existing = existsSync(claudeMd) ? readFileSync(claudeMd, "utf8") : "";
  place("CLAUDE.md", withRulesBlock(existing));
  return { written, updated, unchanged };
}

/** Owned files whose content differs from this engine version. */
function claudeToolingDrift(dir) {
  const drift = [];
  for (const { rel, src } of ownedClaudeFiles()) {
    const dest = join(dir, rel);
    if (!existsSync(dest) || readFileSync(dest, "utf8") !== readFileSync(src, "utf8")) drift.push(rel);
  }
  const claudeMd = join(dir, "CLAUDE.md");
  if (existsSync(claudeMd)) {
    const text = readFileSync(claudeMd, "utf8");
    const begin = text.indexOf(MARK_BEGIN);
    const end = text.indexOf(MARK_END);
    const installed = begin !== -1 && end > begin ? text.slice(begin, end + MARK_END.length) : "";
    if (installed !== rulesBlock()) drift.push("CLAUDE.md (rules block)");
  }
  return drift;
}

function mergePackageFragments(dir, stack, vars) {
  const pkgPath = join(dir, "package.json");
  const pkg = existsSync(pkgPath) ? readJson(pkgPath) : { name: vars.__PROJECT_NAME__, version: "0.1.0", private: true };
  // Stack fragment first so it can pin versions the shared fragment would otherwise set.
  const fragments = [join(ENGINE_ROOT, "templates", stack, "package.fragment.json"), join(ENGINE_ROOT, "templates", "_shared", "package.fragment.json")];
  for (const f of fragments) {
    if (!existsSync(f)) continue;
    const frag = JSON.parse(substitute(readFileSync(f, "utf8"), vars));
    deepMergeMissing(pkg, frag);
  }
  // Engine ref always pinned to this version, even if present.
  pkg.devDependencies["@jangkar/testing-engines"] = `github:${ENGINE_REPO}#${ENGINE_VERSION}`;
  writeJson(pkgPath, pkg);
}

// ---------- commands ----------

function cmdInit({ flags, positional }) {
  const stack = flags.stack;
  const target = positional[0];
  if (!stack || !target) fail("usage: jangkar-test init --stack <nextjs|node-api> <dir>");
  if (PHASE_LATER[stack]) fail(`stack "${stack}" arrives in ${PHASE_LATER[stack]}. Available now: ${STACKS.join(", ")}`);
  if (!STACKS.includes(stack)) fail(`unknown stack "${stack}". Available: ${STACKS.join(", ")}`);
  const dir = resolve(target);
  if (existsSync(dir) && readdirSync(dir).length > 0) fail(`${dir} is not empty. Use "retrofit" for an existing project.`);
  mkdirSync(dir, { recursive: true });
  const vars = { __ENGINE_VERSION__: ENGINE_VERSION, __PROJECT_NAME__: target.split("/").pop() };

  // Stack package.json is the base, then fragments merged in.
  const stackPkg = join(ENGINE_ROOT, "templates", stack, "package.json");
  writeFileSync(join(dir, "package.json"), substitute(readFileSync(stackPkg, "utf8"), vars));
  mergePackageFragments(dir, stack, vars);

  const shared = copyTemplate(join(ENGINE_ROOT, "templates", "_shared"), dir, vars, { overwrite: true });
  const specific = copyTemplate(join(ENGINE_ROOT, "templates", stack), dir, vars, { overwrite: true });
  const claude = installClaudeTooling(dir);
  writeFileSync(
    join(dir, "README.md"),
    `# ${vars.__PROJECT_NAME__}\n\nScaffolded by @jangkar/testing-engines ${ENGINE_VERSION} (${stack}).\n\n\`\`\`bash\nnpm install\nnpm run test:all\n\`\`\`\n\nRead \`CLAUDE.md\` before writing code. Spec first: \`/spec-first <feature>\`.\n`,
  );
  log(`Initialised ${stack} project in ${dir}`);
  log(`  ${shared.written.length + specific.written.length + claude.written.length + 2} files written`);
  log(`\nNext:\n  cd ${target}\n  npm install\n  npm run test:all\n  git init && gh repo create --private --source . --push\n  # then enable branch protection, see docs/adopting.md`);
}

function cmdRetrofit({ flags, positional }) {
  const dir = resolve(positional[0] ?? ".");
  if (!existsSync(join(dir, "package.json"))) fail(`no package.json in ${dir}. Use "init" for a new project.`);
  const stack = flags.stack ?? detectStack(dir);
  if (!STACKS.includes(stack)) fail(`unsupported stack "${stack}"`);
  const vars = { __ENGINE_VERSION__: ENGINE_VERSION, __PROJECT_NAME__: readJson(join(dir, "package.json")).name ?? "project" };
  const overwrite = flags.force === true;

  log(`Retrofitting ${dir} as ${stack}${overwrite ? " (--force: overwriting configs)" : ""}`);
  mergePackageFragments(dir, stack, vars);
  const shared = copyTemplate(join(ENGINE_ROOT, "templates", "_shared"), dir, vars, { overwrite });
  const specific = copyTemplate(join(ENGINE_ROOT, "templates", stack), dir, vars, { overwrite });

  // tsconfig: make it extend the engine if it does not already.
  const tsPath = join(dir, "tsconfig.json");
  if (existsSync(tsPath)) {
    const ts = readJson(tsPath);
    const want = stack === "nextjs" ? "@jangkar/testing-engines/tsconfig/next" : "@jangkar/testing-engines/tsconfig/strict";
    if (ts.extends !== want) {
      ts.extends = want;
      // Drop options the strict base already sets, so the base wins.
      for (const k of ["strict", "target", "module", "moduleResolution", "skipLibCheck", "esModuleInterop", "isolatedModules"]) delete ts.compilerOptions?.[k];
      writeJson(tsPath, ts);
      log(`  updated tsconfig.json to extend ${want}`);
    }
  }
  const claude = installClaudeTooling(dir);

  for (const f of [...shared.written, ...specific.written, ...claude.written]) log(`  + ${f}`);
  for (const f of claude.updated) log(`  ~ ${f} (refreshed from engine ${ENGINE_VERSION})`);
  const kept = [...new Set([...shared.skipped, ...specific.skipped])].filter((f) => /\.(config\.mjs|json)$/.test(f) || f.startsWith(".github/"));
  if (kept.length) {
    log("\nKept existing files (use --force to overwrite, or make them extend the engine):");
    for (const f of kept) log(`  = ${f}`);
  }
  log("\nNext:\n  npm install\n  npx jangkar-test doctor\n  npm run test:all");
}

function cmdDoctor({ positional, flags }) {
  const dir = resolve(positional[0] ?? ".");
  const checks = [];
  const add = (ok, name, hint = "") => checks.push({ ok, name, hint });

  const pkgPath = join(dir, "package.json");
  if (!existsSync(pkgPath)) fail(`no package.json in ${dir}`);
  const pkg = readJson(pkgPath);
  const devDeps = pkg.devDependencies ?? {};

  add(!!devDeps["@jangkar/testing-engines"], "engine is a devDependency", "npx jangkar-test retrofit");

  for (const script of ["lint", "typecheck", "test:unit", "test:integration", "test:system", "test:mutation", "test:all"]) {
    add(typeof pkg.scripts?.[script] === "string", `npm script "${script}"`, "npx jangkar-test retrofit");
  }
  add(typeof pkg.scripts?.["test:unit"] === "string" && pkg.scripts["test:unit"].includes("--coverage"), 'test:unit runs with --coverage', "coverage gate is enforced by vitest thresholds");

  const configChecks = [
    ["vitest.config.mjs", "@jangkar/testing-engines/vitest/"],
    ["eslint.config.mjs", "@jangkar/testing-engines/eslint/"],
    ["stryker.config.mjs", "@jangkar/testing-engines/stryker/"],
  ];
  for (const [file, needle] of configChecks) {
    const p = join(dir, file);
    const exists = existsSync(p);
    add(exists, `${file} exists`, "npx jangkar-test retrofit");
    if (exists) add(readFileSync(p, "utf8").includes(needle), `${file} imports the engine config`, `import from "${needle}..."`);
  }

  const tsPath = join(dir, "tsconfig.json");
  add(existsSync(tsPath) && String(readJson(tsPath).extends ?? "").startsWith("@jangkar/testing-engines/tsconfig/"), "tsconfig.json extends the engine strict config");

  for (const d of ["src/core", "src/adapters", "tests/unit", "tests/integration", "tests/system", "specs"]) {
    add(existsSync(join(dir, d)), `directory ${d}/`);
  }

  // Test files present and no forbidden patterns.
  const testFiles = existsSync(join(dir, "tests")) ? walk(join(dir, "tests")).filter((f) => /\.test\.(ts|tsx|js|mjs)$/.test(f)).map((f) => join("tests", f)) : [];
  const srcTests = existsSync(join(dir, "src")) ? walk(join(dir, "src")).filter((f) => /\.test\.(ts|tsx|js|mjs)$/.test(f)).map((f) => join("src", f)) : [];
  const all = [...testFiles, ...srcTests];
  add(all.length > 0, "at least one test file exists", "run /spec-first");
  const forbidden = [];
  const patterns = [
    [/\b(it|test|describe)\.(only|skip|todo)\s*\(/, "focused/skipped/todo test"],
    [/expect\(\s*true\s*\)\s*\.\s*toBe\(\s*true\s*\)/, "tautological assertion"],
    [/@ts-ignore/, "@ts-ignore"],
    [/\/\*\s*(v8|istanbul)\s+ignore/, "coverage ignore comment"],
    [/vi\.mock\(\s*["'][^"']*\/core\//, "mocking a core module"],
  ];
  for (const f of all) {
    const text = readFileSync(join(dir, f), "utf8");
    for (const [re, label] of patterns) {
      const m = text.match(re);
      if (m) forbidden.push(`${f}: ${label}`);
    }
  }
  add(forbidden.length === 0, "no forbidden patterns in tests", forbidden.join("; "));

  // Threshold tampering: any explicit threshold below the engine floor in the project's config.
  const vitestCfg = existsSync(join(dir, "vitest.config.mjs")) ? readFileSync(join(dir, "vitest.config.mjs"), "utf8") : "";
  const low = [...vitestCfg.matchAll(/\b(lines|branches|functions|statements)\s*:\s*(\d+)/g)].filter((m) => Number(m[2]) < 80).map((m) => `${m[1]}=${m[2]}`);
  add(low.length === 0, "coverage thresholds not lowered below 80", low.join(", "));
  const strykerCfg = existsSync(join(dir, "stryker.config.mjs")) ? readFileSync(join(dir, "stryker.config.mjs"), "utf8") : "";
  const brk = strykerCfg.match(/\bbreak\s*:\s*(\d+)/);
  add(!brk || Number(brk[1]) >= 70, "mutation break threshold not lowered below 70", brk ? `break=${brk[1]}` : "");
  add(!/allowOnly\s*:\s*true|passWithNoTests\s*:\s*true/.test(vitestCfg), "vitest config does not disable allowOnly/passWithNoTests guards");

  const wf = join(dir, ".github/workflows/quality-gate.yml");
  add(existsSync(wf) && readFileSync(wf, "utf8").includes(`${ENGINE_REPO}/.github/workflows/quality-gate.yml@`), "CI calls the engine quality-gate workflow", "npx jangkar-test retrofit");

  const claudeMd = join(dir, "CLAUDE.md");
  add(existsSync(claudeMd) && readFileSync(claudeMd, "utf8").includes(MARK_BEGIN), "CLAUDE.md contains the testing rules block");
  add(existsSync(join(dir, ".claude/hooks/stop-check.sh")), ".claude/hooks/stop-check.sh installed");
  const settingsPath = join(dir, ".claude/settings.json");
  add(existsSync(settingsPath) && JSON.stringify(readJson(settingsPath).hooks?.Stop ?? []).includes("stop-check.sh"), "Stop hook wired in .claude/settings.json");
  for (const s of ["spec-first", "test-review", "coverage-gaps", "system-test"]) add(existsSync(join(dir, `.claude/skills/${s}/SKILL.md`)), `skill /${s} installed`);
  add(existsSync(join(dir, ".claude/agents/test-auditor.md")), "test-auditor agent installed");
  const drift = claudeToolingDrift(dir);
  add(drift.length === 0, `Claude tooling matches engine ${ENGINE_VERSION}`, drift.length ? `stale: ${drift.join(", ")}. Run: npx jangkar-test upgrade` : "");

  const failures = checks.filter((c) => !c.ok);
  if (!flags.quiet) {
    for (const c of checks) log(`  ${c.ok ? "✓" : "✗"} ${c.name}${!c.ok && c.hint ? `  (${c.hint})` : ""}`);
    log("");
  }
  if (failures.length) {
    log(`doctor: ${failures.length} of ${checks.length} checks failed.`);
    process.exit(1);
  }
  log(`doctor: all ${checks.length} checks passed.`);
  log("reminder: branch protection on main must require the \"quality-gate\" status check. See docs/adopting.md.");
}

function cmdUpgrade({ positional }) {
  const dir = resolve(".");
  const pkgPath = join(dir, "package.json");
  if (!existsSync(pkgPath)) fail("no package.json here");
  const tag = positional[0];
  if (tag && !/^v\d+\.\d+\.\d+$/.test(tag)) fail("usage: jangkar-test upgrade [vX.Y.Z]");

  // 1. Re-pin, if a tag was given. Without one, refresh tooling from the installed engine.
  if (tag) {
    const pkg = readJson(pkgPath);
    pkg.devDependencies ??= {};
    pkg.devDependencies["@jangkar/testing-engines"] = `github:${ENGINE_REPO}#${tag}`;
    writeJson(pkgPath, pkg);
    const wf = join(dir, ".github/workflows/quality-gate.yml");
    if (existsSync(wf)) writeFileSync(wf, readFileSync(wf, "utf8").replace(/(quality-gate\.yml@)\S+/, `$1${tag}`));
    log(`Pinned engine to ${tag} in package.json${existsSync(wf) ? " and .github/workflows/quality-gate.yml" : ""}.`);
  }

  // 2. Refresh the files the engine owns, from the engine that is running now.
  const { written, updated, unchanged } = installClaudeTooling(dir);
  for (const f of written) log(`  + ${f}`);
  for (const f of updated) log(`  ~ ${f}`);
  log(`Claude tooling: ${written.length} added, ${updated.length} refreshed, ${unchanged.length} unchanged (engine ${ENGINE_VERSION}).`);
  if (tag && tag !== ENGINE_VERSION) {
    log(`\nThis refresh used the installed engine ${ENGINE_VERSION}. To get ${tag}'s tooling:\n  npm install && npx jangkar-test upgrade`);
  }
  log("\nNext:\n  npx jangkar-test doctor\n  git diff .claude CLAUDE.md   # review what changed");
}

function usage() {
  log(`jangkar-test ${ENGINE_VERSION}

  init --stack <${STACKS.join("|")}> <dir>   scaffold a new project
  retrofit [dir] [--stack s] [--force]     add the engine to an existing project
  doctor [dir] [--quiet]                   check a project against the standard (exit 1 on failure)
  upgrade [vX.Y.Z]                         re-pin (optional) and refresh skills, hooks, and rules from the engine
`);
}

const { flags, positional } = parseArgs(process.argv.slice(2));
const cmd = positional.shift();
const commands = { init: cmdInit, retrofit: cmdRetrofit, doctor: cmdDoctor, upgrade: cmdUpgrade };
if (!cmd || flags.help || !(cmd in commands)) {
  usage();
  process.exit(cmd && !(cmd in commands) ? 1 : 0);
}
commands[cmd]({ flags, positional });
