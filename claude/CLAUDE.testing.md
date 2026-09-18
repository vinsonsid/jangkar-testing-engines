<!-- BEGIN:jangkar-testing-engines -->
# Testing rules (jangkar-testing-engines)

This project uses `@jangkar/testing-engines`. The full standard is in `node_modules/@jangkar/testing-engines/docs/testing-standard.md`. These rules are not optional.

## Workflow for every feature or fix

1. **Spec first.** Run `/spec-first <feature>` before writing implementation. It writes `specs/<feature>.md` and failing tests. Do not write implementation in the same turn as the spec.
2. **Implement** in `src/core` (pure logic) and `src/adapters` (I/O). Routes and components in `app/` are glue only.
3. **Review the tests.** Run `/test-review`. Resolve every finding rated `high` before continuing.
4. **Prove it.** Run `npm run test:all` and paste the full output in your final message. Never summarize test results from memory. If a test fails, say so and show the failure.
5. **Definition of Done.** Paste the DoD checklist from the standard into the PR description with every box checked honestly.

## Layering

- `src/core/`: no I/O, no `await` on external calls, no imports from `@supabase/*`, `next/*`, `@anthropic-ai/*`, `node:fs`, `fetch`. Inject time, ids, and randomness as parameters.
- `src/adapters/`: thin wrappers over the outside world. No business logic.
- Logic that is hard to test is in the wrong layer. Move it to `core`.

## Forbidden in committed code

`it.only`, `it.skip`, `it.todo`, `expect(true).toBe(true)`, `any`, `@ts-ignore`, snapshot-only tests for logic, mocking the module under test, `console.error` in passing tests, commented-out tests. Lint and `jangkar-test doctor` fail on these.

## Mocking

Never mock Supabase, Postgres, the filesystem, or your own `core`. Use the local instance. Mock only third-party paid APIs at the network boundary with `msw` and recorded fixtures.

## When tests fail

Fix the code or the test on its merits. Never lower a threshold, delete a test, add `.skip`, or widen an assertion to make CI green. If a threshold must change, say why in the commit body and open an issue to restore it.

## Honesty

A Stop hook runs the unit suite before you can end a turn. If it is red, you are not done. Report what failed and keep working or explain the blocker.
<!-- END:jangkar-testing-engines -->
