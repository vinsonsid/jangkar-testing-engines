# Changelog

## 0.6.0 — 2026-11-20

Closes the gap the phase 1 bad-PR test found (decision 0008). Upgrade with `npx jangkar-test upgrade v0.6.0`.

- **Changed-line survivors fail PRs.** On a PR, `mutation-summary --changed-since <base>` exits 1 when a mutant survives, or is uncovered, on a `src/core` line the branch added or changed. A proven equivalent mutant is waived in source with `// Stryker disable next-line <Mutator>: <reason>`, which shows up in review. The global break threshold (70) still applies to everything else.
- **`doctor`: every spec AC is named in a test of the code it covers.** For each `specs/*.md`, every `### ACn` heading must appear in a test file that imports one of the `src/core` modules the spec names. Labels in tests of other modules do not count. Specs that name no module are checked against all tests.

## 0.5.0 — 2026-11-20

Phase 1 hardening, last slice. Upgrade with `npx jangkar-test upgrade v0.5.0`; it also adds the nightly trigger to your caller workflow.

- **Time budgets.** `quality-gate` runs unit tests and integration + system tests under `jangkar-test timed` and reports wall time against a budget (60 s and 300 s, inputs `unit-budget-seconds` and `integration-budget-seconds`) in the step summary. A breach is a warning; `enforce-budgets: true` makes it a failure. The default flips in the next major.
- **Scoped mutation on PRs.** PRs mutate only the `src/core` files they change (`jangkar-test mutation-scope`, which skips tests, `types.ts`, `index.ts`, declarations, and deletions). Nightly (`schedule`), manual (`workflow_dispatch`), and `run-mutation: true` runs mutate all of `src/core`.
- **Mutation summary and trend.** Every mutation run writes its score and up to 20 survivors to the step summary (`jangkar-test mutation-summary`). Full runs append to a trend file kept in the Actions cache (last 30 runs) and print the change against the previous run.
- **Caller template** gains a nightly `schedule` (02:17 WIB) and `workflow_dispatch`, and a per-event concurrency group so a push cannot cancel the nightly run. `upgrade` adds both triggers to an existing caller once.
- **`docs/decisions/`** with backfilled decisions and the phase 0 exit note: the first real defect the gate caught (yespajak margin impas, 0007).

## 0.4.0 — 2026-11-20

Phase 1 hardening, third slice: the skills and agent items. Adopters get it with `npx jangkar-test upgrade v0.4.0`; `doctor` requires the new skill.

- **`/spec-first` boundary table.** Every money, date, percentage, count, or length input gets a row with below / at / above values and the rounding policy; each row becomes three `it()` cases.
- **`test-auditor` fixed checklist.** Six rows in a fixed order (tautology, mocked-away logic, missing edge, assertion strength, layering violation, spec coverage), PASS/FAIL each, and the verdict derives from them. New checklist item 11 covers layering. `/test-review` reports the table first.
- **New `/mutation-survivors`.** Reads `reports/mutation/report.json`, groups and ranks surviving mutants in `src/core`, proposes one exact-value test per group, and refuses threshold edits and unexplained `Stryker disable`.
- Rules block step 4: run `/mutation-survivors` when a changed core file has survivors.

## 0.3.0 — 2026-10-13

Phase 1 hardening, second slice. Adds gates; upgrading adopters pass them with `npx jangkar-test upgrade v0.3.0` (adds the PR template) and by fixing any test `doctor` now names.

- **`doctor` covers the rest of section 5.** New failures: commented-out tests, imports from `__mocks__`, `@ts-expect-error` without a description, and unit tests whose only assertions are snapshots.
- **Flakiness policy.** `vitest/base` sets `retry: 0` and excludes `tests/quarantine/`. `doctor` fails on `retry` above 0 in the project config, and on any quarantined test without a `// quarantined: YYYY-MM-DD <issue URL>` label or older than 14 days.
- **PR template.** `.github/pull_request_template.md` with the Definition of Done is scaffolded by `init`/`retrofit`, added by `upgrade` when missing (never overwritten), and required by `doctor`.
- **`doctor --json`.** Same checks and exit code, machine-readable, for CI and the phase 4 fleet tool.
- **Coverage per directory.** The quality-gate step summary reports `src/core`, `src/adapters`, and the total in separate columns.

## 0.2.0 — 2026-09-29

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
