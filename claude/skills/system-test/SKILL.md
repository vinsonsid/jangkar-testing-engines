---
name: system-test
description: Scaffold a system test that exercises one use case end to end through src/core and src/adapters against real local dependencies (local Supabase, sqlite, msw for third-party HTTP). Use for every user-facing use case.
---

# system-test

Use case: **$ARGUMENTS**

## What a system test is here

A system test drives a use case the way the app would, through the real adapters, against a real local dependency, and asserts on the resulting state of that dependency and the returned value. It does not go through the browser. It does not mock `core` or the database.

## Steps

1. **Identify the use case boundary.** Which app-layer entry point (route handler, server action, CLI command) triggers it? Which adapters does it call? Which `core` functions decide the outcome? Read `specs/*.md` for the acceptance criteria.

2. **Check local infrastructure.**
   - Supabase project: confirm `supabase/` exists and `supabase status` reports running. If not running, tell the user to run `supabase start` and stop.
   - Third-party HTTP (Anthropic, payments): confirm `msw` is installed and a handler exists under `tests/msw/`. If not, add a handler with a recorded fixture.

3. **Write `tests/system/<use-case>.system.test.ts`:**
   - `beforeEach`: reset the relevant tables (truncate via the service role client, or a helper in `tests/helpers/db.ts`). Seed the minimum data the scenario needs.
   - One `describe` per use case. One `it` per acceptance criterion. Titles start with the AC id.
   - Call the app-layer function directly, or the `core` function with real adapters injected.
   - Assert on both the return value and the persisted state (read it back from the database).
   - Use `vi.useFakeTimers()` only when the scenario depends on time.

4. **Run it:** `npm run test:system -- tests/system/<use-case>.system.test.ts`. Paste the output.

5. If any assertion needed a mock of `core` or the database to pass, the design is wrong. Say so and propose the layering fix instead of shipping the test.
