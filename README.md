# jangkar-testing-engines

A shared testing engine for every Jangkar project. It ships the configs, CI gates, and Claude Code tooling that hold vibe-coded software to a real quality bar. It does **not** hold the tests themselves: tests live next to the code they test, in the same commits.

## The problem it solves

All projects are built with Claude Code. An agent writes code fast and reports "tests pass" with the same confidence whether the tests are real or not. This repo makes that report irrelevant. A change is done when CI on the remote says so.

Three mechanisms, in order of importance:

1. **Hard gates in CI.** Lint, strict types, 80% coverage on business logic, mutation score on `src/core`, no focused or skipped tests, real local dependencies for integration tests. Branch protection makes the gate the only way to `main`.
2. **Spec first.** The `/spec-first` skill writes acceptance criteria and failing tests before implementation and refuses to write implementation in the same turn.
3. **Independent review.** The `/test-review` skill hands the diff to a fresh-context `test-auditor` agent that assumes the tests are lying and tries to prove it.

## What is in here

| Path | What |
|---|---|
| `docs/testing-standard.md` | The contract every project must meet. Start here. |
| `docs/architecture-for-testability.md` | The `core` / `adapters` / `app` layering rule. |
| `docs/adopting.md` | New project and retrofit walkthrough, branch protection. |
| `docs/roadmap.md` | The grand plan: phases, exit criteria, open decisions. |
| `configs/` | Importable Vitest, ESLint, TypeScript, Stryker configs. |
| `ci/github/quality-gate.yml` | Reusable GitHub Actions workflow (mirrored in `.github/workflows/`). |
| `claude/` | `CLAUDE.md` rules block, skills, the auditor agent, Stop and pre-commit hooks. |
| `templates/` | Project scaffolds per stack. |
| `bin/jangkar-test.mjs` | CLI: `init`, `retrofit`, `doctor`, `upgrade`. |
| `examples/tax-calc/` | The standard done right, as a small real module. |
| `tests/` | The engine tests itself. |

## Quick start

New project:

```bash
npx github:vinsonsid/jangkar-testing-engines init --stack nextjs my-app
```

Existing project:

```bash
npm i -D github:vinsonsid/jangkar-testing-engines#v0.2.0
npx jangkar-test retrofit
npx jangkar-test doctor
```

Then enable branch protection. See `docs/adopting.md`.

## Roadmap

See `docs/roadmap.md`. In short: prove the gate on a real feature, make every rule mechanical (v0.2), then Python, frontend and mobile, LLM evals, and fleet upgrades.

## Developing the engine

```bash
npm install
npm run check          # lint + typecheck + self-tests
npm run example:test -- --coverage
npm run example:mutation
```
