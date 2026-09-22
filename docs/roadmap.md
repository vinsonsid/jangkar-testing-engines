# Roadmap

The grand plan for `jangkar-testing-engines`. It says where the engine is, where it goes, in what order, and what has to be true before each phase starts. Phases are ordered by Vinson's priority: business logic before UI, gates before conveniences, one adopter proven before the next stack is built.

Dates are deliberately absent. Each phase has exit criteria instead. A phase is done when its criteria hold on the engine and on at least one adopter.

## 0. Where we are (v0.1.0, released 2026-09-19)

Shipped and self-tested:

- Vitest, ESLint, TypeScript, Stryker configs with the strict thresholds from `testing-standard.md`.
- Reusable `quality-gate` workflow: doctor, lint, typecheck, unit + coverage, integration + system with local Supabase, mutation on `src/core`.
- Claude Code tooling: rules block, `/spec-first`, `/test-review`, `/coverage-gaps`, `/system-test`, `test-auditor` agent, Stop hook, pre-commit hook.
- CLI `jangkar-test init | retrofit | doctor | upgrade`, templates for `nextjs` and `node-api`, reference example `tax-calc`.

Honest gaps, in order of how much they weaken the gate today:

1. **No adopter has a real feature behind the gate.** `yespajak` is retrofitted but `src/core` holds only `example.ts`. The engine has never caught a real bad test.
2. **The layering rule is prose, not a gate.** `src/core` importing `@supabase/*`, `next/*`, `fetch`, or `node:fs` is forbidden in `CLAUDE.testing.md` but nothing fails. This is the one rule everything else depends on.
3. **Branch protection is off.** The engine repo and `yespajak` are private on the free plan, so CI is advisory. "Never merge red by hand" is the only guard.
4. **`yespajak` has no canonical remote.** The local repo and the public `vinsonsid/yespajak` have unrelated histories. Until that is decided nothing there is gated remotely.
5. **`upgrade` only re-pins.** It does not refresh skills, hooks, or the rules block, so adopters drift from the engine as soon as v0.2.0 ships.
6. **Python, Playwright, Expo are stubs.** Documented, not built.
7. **No release discipline.** No tag automation, no changelog check, no rule for what a breaking change is.

## 1. Principles that do not change between phases

- **Tests live with the code.** The engine ships gates, configs, skills, scaffolds. Never tests.
- **CI on the remote is the only authority.** Local green, hook green, agent "tests pass" are hints.
- **Thresholds only go up.** Any lowering needs a commit body saying why and an issue to restore it.
- **Mechanical before procedural.** If a rule can be a lint rule or a `doctor` check, it must be. Skills and agents cover only what cannot be mechanised.
- **Prove on one adopter before generalising.** Every phase lands on `yespajak` (or the next real project) before it is called done.
- **The engine dogfoods itself.** The engine repo passes its own standard at the strictest level it asks of others.

## 2. Phases

### Phase 0: prove the gate on a real feature

Goal: the engine catches at least one real defect or fake test on `yespajak` before any new capability is built. Nothing else is worth doing if this fails.

Work:

- Decide the canonical `yespajak` repo (local rewrite vs public `vinsonsid/yespajak`), push, and run the gate on the remote. Open decision, see section 5.
- Ship the first real `yespajak` feature end to end: `/spec-first`, implement, `/test-review`, PR, CI green. Record what the auditor found, what it missed, and how long the loop took.
- Decide branch protection: public repo, Pro plan, or documented "advisory gate" mode. Open decision, see section 5.
- Add a lightweight `docs/decisions/` folder (one file per decision, date, context, choice). Backfill the decisions already made.

Exit criteria:

- One merged `yespajak` PR whose history shows spec, red tests, green tests, auditor findings resolved.
- A written note of the first thing the gate caught. If it caught nothing, the phase is not done: tighten until it does.

### Phase 1 hardening (v0.2.x): make the current promises mechanical

Goal: every rule in `testing-standard.md` sections 2, 5, and 6 fails CI without a reviewer.

Gates to add:

- **Layering as a lint rule.** Done in v0.2.0 as `configs/eslint/layering.mjs`. `no-restricted-imports` scoped to `src/core/**` banning `@supabase/*`, `next/*`, `@anthropic-ai/*`, `node:*`, `fetch`, and any `../adapters` or `../app` path. Same for `src/adapters/**` importing `app`. Consider `dependency-cruiser` if the ESLint rule cannot express "no I/O".
- **Doctor covers the rest of section 5.** Commented-out tests, `console.error` in passing tests (Vitest `onConsoleLog` fail), snapshot-only assertions in `tests/unit`, `__mocks__` of the module under test, `it.todo` on a merged branch.
- **Flakiness policy.** `retry: 0` everywhere. A test that fails on rerun without a code change is quarantined by moving it to `tests/quarantine/` with an issue link, and `doctor` fails if quarantine is older than 14 days.
- **Time budgets.** Unit suite under 60 s, integration under 5 min, in CI. A budget breach is a warning first, an error after phase 1 exit.
- **Coverage per directory.** Report `src/core` and `src/adapters` separately in the step summary so a well-covered `core` cannot hide an untested adapter.
- **Incremental mutation by default.** Stryker incremental cache is already restored in CI. Make the PR job run on changed `core` files only and the nightly run do the full set with a trend line.

Tooling to add:

- **`upgrade` that refreshes.** Done in v0.2.0. Re-pins, re-copies skills, agents, hooks, and the rules block between the `BEGIN/END` markers, and prints what changed. `doctor` fails on drift from the installed engine.
- **`doctor --ci` JSON output** so a fleet tool (phase 4) can read it.
- **PR template** with the Definition of Done from section 8, installed by `retrofit`.
- **Anthropic fixtures.** An `msw` handler set plus a `record` helper that captures a real call once into `tests/fixtures/anthropic/*.json` and replays it after. Needed for `yespajak` now, generalises to phase 3.
- **Supabase integration recipe.** A documented `tests/integration/setup.ts` that resets the local database per file, plus a seed convention, so adapter tests do not leak state.

Skills and agents:

- `/spec-first` gains a "boundary table" section for money, date, and tax inputs so rounding edges are always enumerated.
- `test-auditor` gains a fixed checklist output (tautology, mocked-away logic, missing edge, assertion strength, layering violation) with a pass or fail per item, so its report is comparable across runs.
- New `/mutation-survivors`: reads the Stryker report and turns each surviving mutant into a proposed test.

Exit criteria:

- A deliberately bad PR on `yespajak` (core importing Supabase, a tautological test, a lowered threshold, a `.only`) fails in CI at every one of those points with no human review.
- `upgrade v0.2.0` on `yespajak` leaves `doctor` green with refreshed tooling.

### Phase 1b: Python backend

Goal: the same standard for a Python service, with no second set of rules to remember.

- `configs/python/pyproject.fragment.toml`: pytest, `pytest-cov` with `fail-under = 80` on `src/core` and `src/adapters`, `ruff` strict, `mypy --strict`, `mutmut` on `src/core` with a 70 break, `import-linter` contracts for the layering rule.
- `jangkar-test init --stack python` and `retrofit` for a `pyproject.toml` project. The CLI stays plain Node and works from the submodule path.
- `quality-gate.yml` gains a `python` input that switches the matrix. Same job names so branch protection contexts do not change.
- Stop hook and pre-commit hook detect `pyproject.toml` and run `pytest` instead of `vitest`.
- `examples/tax-calc-py`: the same PPh21 and PPN example in Python, so the two examples can be diffed for parity.

Exit criteria: one Python project (or the example) passes the full gate on a remote, and `doctor` reports the same check names as the Node stack.

### Phase 2: frontend and mobile

Goal: UI and device tests exist and are gated, at a lower coverage floor than logic, without weakening the logic gates.

Web:

- `configs/vitest/react.mjs` gets React Testing Library, `jest-dom`, and a `browser` mode option. Component tests cover behaviour, not markup.
- `configs/playwright/base.ts`: Playwright against `next build && next start` with local Supabase, `e2e/` directory, one smoke flow per user-facing use case named after its spec.
- Reusable `e2e.yml` replaces the placeholder: build, start, seed, run, upload trace on failure.
- Accessibility gate: `axe` on every Playwright page visit, zero serious violations.
- Visual regression: Playwright screenshots on a fixed viewport for pages that are mostly layout, opt-in per page.
- App-layer coverage floor of 60 percent, reported separately, raised as it stabilises.

Mobile:

- `templates/mobile-expo`: Expo project with `src/core` under the standard Vitest gates, Maestro flows in `e2e/flows/*.yaml`, one EAS build profile for CI.
- `e2e.yml` gains a `maestro` job on a macOS runner with an iOS simulator.

Skills:

- `/e2e-first`: writes the Playwright or Maestro flow from a spec's acceptance criteria before the UI exists.
- `test-auditor` learns UI anti-patterns: asserting on class names, sleeping instead of waiting, screenshots as the only assertion.

Exit criteria: `yespajak` (or the next Next.js project) has one Playwright flow per system test, gated on the remote, and the e2e job runs in under 10 minutes.

### Phase 3: LLM-specific quality

Goal: features that call Claude are held to a bar as real as tax calculations. `yespajak` already calls the Anthropic SDK, so this phase is not optional for the first adopter.

- **Structured output contracts.** Every LLM adapter returns a typed shape validated at the boundary (zod or equivalent). A schema mismatch is an adapter test failure, not a runtime surprise.
- **Golden evals.** `evals/<feature>/cases.jsonl` with input, expected fields, and a rubric. Deterministic checks first (fields present, numbers within tolerance, forbidden phrases absent). An LLM-judge only where a deterministic check is impossible, with the judge prompt versioned in the repo.
- **Eval gate.** A PR touching `src/adapters/llm/**` or `prompts/**` runs the eval set against recorded fixtures by default and against the live API on a label. Pass rate floor per feature, floor only goes up.
- **Cost and latency budgets** per feature, asserted in the eval run.
- **Prompt versioning.** Prompts are files under `prompts/`, imported by adapters, so a prompt change is a diff and the auditor can see it.
- `/eval-first` skill: builds the golden cases from a spec's acceptance criteria before the prompt is written.

Exit criteria: the `yespajak` classification or extraction feature has a golden set of at least 30 cases, a fixed pass floor, and a PR that degrades it fails CI.

### Phase 4: fleet operations

Goal: five or more adopters stay on the current engine without hand work.

- `jangkar-test fleet` reads a `fleet.json` (repo list) and reports each adopter's pinned engine version, last gate result, and coverage and mutation trend using `doctor --ci` output and the GitHub API.
- Automatic upgrade PRs: a workflow in the engine repo opens `upgrade vX.Y.Z` PRs on every adopter on each release. The adopter's own gate decides.
- Codemods in `upgrade` for breaking config changes, with a `--dry-run`.
- Org-level rulesets replace per-repo branch protection once the plan or visibility decision allows it.
- A small status page (GitHub Pages from the engine repo) with one row per adopter.

Exit criteria: a release of the engine reaches every adopter as a green PR within a day with no manual steps.

### Phase 5: beyond correctness

Only after phases 0 to 3 hold. Each of these is a separate opt-in job in `quality-gate.yml`, off by default, so the core gate never gets slower.

- Security: `npm audit` at high, secret scanning, `semgrep` with a small owned ruleset.
- Performance: `autocannon` budgets for API routes, Lighthouse budgets for pages.
- Post-deploy smoke: one Playwright flow against production after each deploy, alerting on failure.
- Dependency policy: Renovate config shipped by `retrofit`, majors require a green gate plus a manual label.

## 3. Engine self-quality (every phase)

- The engine passes `jangkar-test doctor` on itself where the checks apply, and `npm run check` runs in `engine-ci.yml` on every PR.
- Every CLI command has a test in `tests/` that runs it against a temporary project and asserts on the filesystem, not on stdout.
- Every reusable workflow change is exercised by a caller in `examples/` on a PR before a tag.
- Mutation testing on `bin/` and `configs/` once they hold real logic (phase 1 hardening adds enough).

## 4. Release and versioning policy

- Semver. A **major** changes a threshold, a check name, a job name, or a config export. A **minor** adds a gate, check, skill, or stack. A **patch** fixes behaviour without changing what passes.
- Every release: `CHANGELOG.md` entry, `git tag vX.Y.Z`, `engine-ci` green, `ci/github` and `.github/workflows` in sync, mirrored by `tests/ci.test.mjs`.
- A release that adds a gate is announced with the adopter command to pass it, so an upgrade PR never arrives red without explanation.
- Deprecations live for one minor before removal.

## 5. Open decisions

These block or shape phases and only Vinson can make them.

| Decision | Blocks | Options |
|---|---|---|
| Canonical `yespajak` repo | Phase 0 | Force-push the local repo over the public one; keep the public one and re-retrofit it; rename one |
| Branch protection on private repos | Phase 0 exit | Make repos public; GitHub Pro; accept advisory mode with a written "never merge red" rule |
| Engine repo visibility | Phase 4 | Private means every adopter needs a GitHub token to `npm install`; public removes that friction |
| Second adopter | Phase 1 hardening exit | A Node API project would exercise the second template before Python or UI |
| Coverage floor for the app layer in phase 2 | Phase 2 | 60 percent proposed; could start advisory |

## 6. Suggested order of work

1. Phase 0 on `yespajak`, including the two decisions it needs.
2. Layering lint rule and the `upgrade` refresh, released as v0.2.0. These two close the largest gaps.
3. Rest of phase 1 hardening, released as v0.2.x patches and v0.3.0.
4. Phase 3 LLM evals before phase 2, if `yespajak`'s next features are LLM-heavy. Otherwise phase 2 web first.
5. Phase 1b Python when a Python project exists, not before.
6. Phase 4 when there are three or more adopters.
7. Phase 5 last, opt-in.

## 7. What "done" looks like

A new Jangkar project runs one command, gets the standard, and its first feature cannot merge until spec, tests, auditor, and CI agree. An old project upgrades in one PR. A Python service, a Next.js app, an Expo app, and an LLM feature are all held to the same bar, and Vinson can see the whole fleet's health on one page.
