# Testing Standard

This is the contract every project that adopts `@jangkar/testing-engines` must meet. `jangkar-test doctor` checks the mechanical parts. The CI quality gate enforces the rest. Nothing here is advisory.

## 1. Why this exists

All projects are built with Claude Code. An AI agent writes code fast and reports "tests pass" with the same confidence whether the tests are real or not. The standard exists to make the report worthless and the gate authoritative: a change is done when CI on the remote says it is done, not when the agent says so.

## 2. Layering rule

Every project separates code into three layers. Only the first two are subject to phase 1 gates.

| Layer | Path | Contains | May import | Tested by |
|---|---|---|---|---|
| Core | `src/core/` | Pure business logic. Calculations, validation, state transitions, domain types. | Only other `core` modules and the standard library. **No I/O, no framework, no SDK.** | Unit tests + mutation testing |
| Adapters | `src/adapters/` | Everything that touches the outside world: database, HTTP clients, filesystem, third-party SDKs (Supabase, Anthropic, payment). | `core` and external packages. | Integration tests against a real local dependency |
| App | `src/app/`, `app/`, `components/` | Routes, pages, UI, CLI entry points. Glue only. | `core` and `adapters`. | Phase 2 (E2E) |

If logic is hard to test, it is in the wrong layer. Move it to `core`.

## 3. Test types and where they live

| Type | Path | Scope | Real dependencies? |
|---|---|---|---|
| Unit | `tests/unit/**/*.test.ts` | One `core` module in isolation | None. `core` has none. |
| Integration | `tests/integration/**/*.test.ts` | One `adapters` module against its real dependency | Yes: local Supabase, sqlite, `msw` for third-party HTTP |
| System | `tests/system/**/*.system.test.ts` | One use case end to end through `core` + `adapters` | Yes, all local |
| E2E | `e2e/` | Browser or device against a running app | Phase 2 |

## 4. Gates (strict by default)

| Gate | Threshold | Enforced by |
|---|---|---|
| Lint | zero errors, zero warnings | `eslint` with `configs/eslint/base` + `tests` |
| Types | zero errors under `configs/tsconfig/strict` | `tsc --noEmit` |
| Unit + integration | all green, no `.only`, no `.skip` | `vitest run`, `allowOnly: false` in CI, lint rules |
| Coverage on `core` + `adapters` | 80% lines, branches, functions, statements | `vitest --coverage` thresholds |
| Mutation score on `core` | 70% break, 75% low, 90% high | Stryker on PRs touching `src/core` |
| System tests | all green | `vitest run tests/system` |
| `doctor` | zero violations | `jangkar-test doctor` as first CI step |

## 5. Forbidden

These are lint errors or `doctor` failures. They do not need a reviewer to catch them.

- `it.only`, `describe.only`, `test.only`
- `it.skip`, `describe.skip`, `it.todo` left in a merged branch
- `expect(true).toBe(true)` and other assertion-free or tautological tests
- `any`, `// @ts-ignore`, `@ts-expect-error` without a description
- Snapshot tests as the only assertion for business logic
- Mocking the module under test, or mocking a `core` module from another `core` test
- `console.error` during a passing test in CI
- Tests that import from `__mocks__` of the implementation they test
- Commented-out tests

## 6. Allowed mocking

Mock only at the network boundary of an adapter, and only when a real local dependency is not possible:

- Third-party paid APIs (Anthropic, payment gateways): `msw` request handlers with recorded fixtures.
- Time: `vi.useFakeTimers()`.
- Randomness: inject a seeded generator into `core`.

Supabase, Postgres, Redis, and the filesystem are never mocked. Use the local instance.

## 7. Spec-first workflow

For every feature or bug fix:

1. Run `/spec-first`. It produces `specs/<feature>.md` with Given/When/Then acceptance criteria and failing test files. It will not write implementation.
2. Implement until the tests pass.
3. Run `/test-review`. A fresh-context auditor reads the diff and reports tautologies, mocked-away logic, and missing edge cases. Fix findings.
4. Run `npm run test:all`. Paste the output in the PR.
5. Open the PR. CI is the final word.

## 8. Definition of Done (paste into every PR)

```
- [ ] Spec in specs/<feature>.md, written before implementation
- [ ] Unit tests for every new or changed core module
- [ ] Integration test for every new or changed adapter
- [ ] System test for the use case, if user-facing
- [ ] /test-review run, findings resolved
- [ ] npm run test:all output pasted below
- [ ] No forbidden patterns (section 5)
- [ ] Coverage and mutation thresholds unchanged or raised
```

## 9. Raising the bar

Thresholds only go up. Lowering a threshold in a project requires a commit that says why in the message body and a follow-up issue to restore it.
