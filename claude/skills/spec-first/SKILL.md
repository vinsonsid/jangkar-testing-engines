---
name: spec-first
description: Write acceptance criteria and failing tests for a feature BEFORE any implementation. Use at the start of every feature, bug fix, or refactor. Refuses to write implementation code.
---

# spec-first

You are producing a specification and a failing test suite for: **$ARGUMENTS**

## Hard rule

Do not write, edit, or scaffold implementation code in this invocation. Not a stub, not a type, not an empty function. If a test needs a module that does not exist, the test imports it anyway and fails to compile. That failure is the point. Implementation happens in a later turn.

## Steps

1. **Understand the request.** Read the relevant existing `src/core` and `src/adapters` modules and any prior `specs/*.md` that touch the same domain. Ask the user at most three clarifying questions if the behavior is genuinely ambiguous. Otherwise state your assumptions in the spec.

2. **Write `specs/<kebab-feature>.md`** with this shape:

   ```markdown
   # <Feature>

   ## Intent
   One paragraph: what the user gets and why.

   ## Layer placement
   - core: <modules and functions to add or change>
   - adapters: <modules, if any>
   - app: <glue, if any>

   ## Acceptance criteria
   ### AC1: <short name>
   Given <state>
   When <action>
   Then <observable result>

   ### AC2 ...

   ## Edge cases and failure modes
   - <empty input, boundaries, invalid state transitions, concurrency, locale, rounding>

   ## Out of scope
   - ...

   ## Assumptions
   - ...
   ```

   Aim for at least one acceptance criterion per branch of behavior and at least three edge cases. Business logic that handles money, dates, or tax needs boundary cases at every rounding and threshold.

3. **Write the failing tests.** One test file per module under `tests/unit/` for `core`, `tests/integration/` for `adapters`, and one `tests/system/<feature>.system.test.ts` if the feature is a user-facing use case. Rules:
   - Each acceptance criterion maps to at least one `it()` whose title starts with the AC id: `it("AC1: rejects negative amounts", ...)`.
   - Assertions are specific: `toStrictEqual({ ok: false, error: "NEGATIVE_AMOUNT" })`, not `toBeDefined()`.
   - No mocks of `core`. Adapters use the real local dependency.
   - Import the intended public API by its intended path even though it does not exist yet.

4. **Run the tests** with `npm run test:unit -- <paths>` and paste the output. The expected result is compile or import failures and red tests. If anything is green, the test is tautological. Fix it.

5. **Stop.** End your turn with the spec path, the test file paths, and the red test output. Tell the user to start a new turn for implementation.
