import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ENGINE_ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
export const CLI = join(ENGINE_ROOT, "bin", "jangkar-test.mjs");

export function tmp(prefix = "jangkar-") {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

/** Run the CLI; never throws. Returns { status, stdout, stderr }. */
export function cli(args, cwd) {
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: "utf8", env: { ...process.env, CI: "" } });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

/**
 * Make a scaffolded project runnable without `npm install`: symlink every
 * package from the engine's node_modules into the project, then register the
 * engine itself under its package name. No network, no npm version quirks.
 */
export function npmLinkEngine(projectDir) {
  const src = join(ENGINE_ROOT, "node_modules");
  const nm = join(projectDir, "node_modules");
  mkdirSync(nm, { recursive: true });
  for (const entry of readdirSync(src)) {
    if (entry === "@jangkar") continue;
    symlinkSync(join(src, entry), join(nm, entry), "dir");
  }
  mkdirSync(join(nm, "@jangkar"));
  symlinkSync(ENGINE_ROOT, join(nm, "@jangkar", "testing-engines"), "dir");
}

export function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8", env: { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" } });
}
