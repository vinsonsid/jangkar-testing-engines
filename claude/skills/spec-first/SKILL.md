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

   ## Boundary table
   | Input | Type | Below | At | Above | Rounding / unit | AC |
   |---|---|---|---|---|---|---|
   | omzet | money | 4 799 999 999 | 4 800 000 000 | 4 800 000 001 | floor to rupiah | AC2, AC3 |
   | tanggal | date | 2024-12-31 | 2025-01-01 | 2025-01-02 | Asia/Jakarta, no DST | AC4 |

   ## Out of scope
   - ...

   ## Assumptions
   - ...
   ```

   Aim for at least one acceptance criterion per branch of behavior and at least three edge cases.

   **Boundary table rules.** Every money, date, percentage, count, or string-length input gets a row. Every threshold the spec mentions (a tax bracket, a cutoff date, a maximum length, a zero) gets its three values: one below, exactly at, one above. The rounding column states the policy and its unit (`floor to rupiah`, `half up to 2 dp`, `truncate to day`) or `none`. Write `n/a` in a cell only with a reason. A feature with no such inputs says `No numeric or date inputs` instead of the table. Each row names the AC that depends on it, and step 3 turns each of the three cells into an `it()`.

3. **Write the failing tests.** One test file per module under `tests/unit/` for `core`, `tests/integration/` for `adapters`, and one `tests/system/<feature>.system.test.ts` if the feature is a user-facing use case. Rules:
   - Each acceptance criterion maps to at least one `it()` whose title starts with the AC id: `it("AC1: rejects negative amounts", ...)`.
   - Each boundary-table row maps to three `it()` cases (below, at, above), each asserting the exact value, not a range.
   - Assertions are specific: `toStrictEqual({ ok: false, error: "NEGATIVE_AMOUNT" })`, not `toBeDefined()`.
   - No mocks of `core`. Adapters use the real local dependency.
   - Import the intended public API by its intended path even though it does not exist yet.

4. **Run the tests** with `npm run test:unit -- <paths>` and paste the output. The expected result is compile or import failures and red tests. If anything is green, the test is tautological. Fix it.

5. **Stop.** End your turn with the spec path, the test file paths, and the red test output. Tell the user to start a new turn for implementation.
