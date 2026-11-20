# 0008: Phase 1 exit, the bad-PR test

- **Date:** 2026-11-20
- **Status:** Record
- **Where:** yespajak draft PRs #5–#12, engine v0.5.0 then v0.6.0

## The test

Eight deliberately bad PRs on yespajak. Each was committed with `--no-verify` so local hooks could not help, and each had to fail CI with no human review.

| PR | Violation | Gate that failed it (v0.5.0) |
|---|---|---|
| #5 | `src/core` imports `@supabase/supabase-js` | lint: `no-restricted-imports`, "core must not talk to the database" |
| #6 | `expect(true).toBe(true)` | doctor: tautological assertion |
| #7 | coverage threshold lowered to 50 | doctor: thresholds not lowered below 80 |
| #8 | `it.only` | doctor: focused/skipped/todo test |
| #9 | `retry: 2` | doctor: no retries, quarantine instead |
| #10 | commented-out test | doctor: commented-out test |
| #11 | mutation `break` lowered to 50 | doctor: break not lowered below 70 |
| #12 | non-NPWP PPh 23 surcharge changed from 2× to 1.5×, with tests rewritten to recompute results from the function's own output | **none: CI was green** |

Every failure came from the intended gate, and none was incidental. #5 also failed typecheck, because the package is not installed, but lint names the layering rule on its own.

## Why #12 passed

The rewritten tests checked `pph === bruto × tarifDipakai / 100`, using the function's own `tarifDipakai`. They pass whatever multiplier the code uses. Scoped mutation testing did find the problem: one survivor, on the changed line `pph23.ts:92`. The file still scored 90.91% and the break threshold is 70, so the job passed. The tests also dropped every AC label, but `doctor` did not check labels.

## The two gates added in v0.6.0

1. **A survivor on a changed line fails the PR.** A score threshold judges a whole file, so it cannot protect the one line a PR changes. The new rule is local: if this branch changed a line and a mutant on it survives, no test pins the change. An equivalent mutant is waived in source, with a reason that shows up in review.
2. **Every spec AC is named in a test of the module the spec covers.** This check is per spec, not global. In #12 the labels AC1–AC6 still appeared in other modules' tests, and an early global version of the check passed for that reason.

Both gates were run against #12's real CI mutation report and branch, and each one fails it on its own. Both pass on yespajak `main`, where all 46 ACs across 6 specs are named.

Confirmed in CI after yespajak moved to v0.6.0:

| PR | Change | Result |
|---|---|---|
| #12, rebased | unchanged | fails at doctor: "every spec AC is named in a test" (pph23 AC1–AC6) |
| #14 | #12 with the AC labels kept in the test title, so doctor passes | fails only at mutation: "1 mutant(s) survive on lines this branch changed", `pph23.ts:92` |

#14 went through the local pre-commit hook without `--no-verify`, and the hook let it pass. Hooks do not run mutation testing, so CI is the only place this is caught. All nine test PRs were closed unmerged.

## What it does not catch

A PR can keep the AC labels and still write self-referential assertions on a line it did not change. That is the auditor's job: the `test-auditor` checklist item "Tautology" catches it. The phase 1 exit claim is narrower: a bad PR in any of these eight shapes fails CI without review.
