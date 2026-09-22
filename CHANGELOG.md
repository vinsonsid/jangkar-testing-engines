# Changelog

## 0.2.0 — unreleased

Phase 1 hardening, first slice. Closes the two largest gaps in the roadmap.

- **Layering is now a lint gate.** `configs/eslint/layering.mjs` (included by `eslint/base`, also exported as `eslint/layering`) makes `src/core` fail lint on I/O and framework imports (`@supabase/*`, `next`, `react`, `@anthropic-ai/*`, `node:*`, HTTP clients, database drivers), on imports from `adapters` or `app`, on `fetch`/`process`/browser globals, and on ambient time, randomness, and ids (`Date.now()`, `new Date()`, `Math.random()`, `crypto.randomUUID()`). `src/adapters` fails on imports from `app`.
- **`upgrade` refreshes tooling.** `jangkar-test upgrade [vX.Y.Z]` re-pins when given a tag, then re-copies skills, agents, and hooks and replaces the rules block in `CLAUDE.md` between its markers, printing what was added or refreshed. Without a tag it only refreshes.
- **`doctor` detects drift.** A new check fails when any engine-owned file under `.claude/` or the `CLAUDE.md` rules block differs from the installed engine version, and names the stale files.
- `retrofit` reports refreshed files with `~` and no longer duplicates or leaves stale rules blocks.
- Added `docs/roadmap.md`.


## 0.1.0 — 2026-09-18

Initial release. Phase 1: business-logic testing.

- Shareable Vitest, ESLint, TypeScript, and Stryker configs with strict gates.
- Reusable GitHub Actions quality gate (lint, typecheck, unit, integration, coverage, mutation on core).
- Claude Code tooling: CLAUDE.testing.md rules, spec-first / test-review / coverage-gaps / system-test skills, test-auditor agent, Stop hook, pre-commit hook.
- CLI `jangkar-test` with `init`, `retrofit`, `doctor`, `upgrade`.
- Templates for Next.js and Node API. Python, Playwright, and mobile are stubs for phase 1b and 2.
- Reference example `examples/tax-calc`.
