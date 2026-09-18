# Changelog

## 0.1.0 — 2026-09-18

Initial release. Phase 1: business-logic testing.

- Shareable Vitest, ESLint, TypeScript, and Stryker configs with strict gates.
- Reusable GitHub Actions quality gate (lint, typecheck, unit, integration, coverage, mutation on core).
- Claude Code tooling: CLAUDE.testing.md rules, spec-first / test-review / coverage-gaps / system-test skills, test-auditor agent, Stop hook, pre-commit hook.
- CLI `jangkar-test` with `init`, `retrofit`, `doctor`, `upgrade`.
- Templates for Next.js and Node API. Python, Playwright, and mobile are stubs for phase 1b and 2.
- Reference example `examples/tax-calc`.
