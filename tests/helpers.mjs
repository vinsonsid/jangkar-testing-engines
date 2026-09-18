import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
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

export function npmLinkEngine(projectDir) {
  // Real `npm install` of the engine from the local path plus vitest etc. is slow; instead use
  // `npm install --no-audit --no-fund --install-links <engine>` which copies the engine in.
  execFileSync("npm", ["install", "--no-audit", "--no-fund", "--no-save", "--install-links", ENGINE_ROOT], {
    cwd: projectDir,
    stdio: "pipe",
  });
}

export function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8", env: { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" } });
}
