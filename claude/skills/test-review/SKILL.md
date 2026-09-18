---
name: test-review
description: Adversarial review of the tests in the current diff by a fresh-context auditor. Finds tautological tests, mocked-away logic, missing edge cases, and assertions that cannot fail. Run after implementation and before opening a PR.
---

# test-review

Review target: **${ARGUMENTS:-the current working tree diff against main}**

## Why a separate agent

The session that wrote the implementation cannot audit its own tests honestly. It knows what the code does and writes tests that confirm it. This skill hands the diff to the `test-auditor` agent, which starts with no memory of the implementation and is told to assume the tests are lying.

## Steps

1. **Collect the diff.** Run:
   ```bash
   git diff --merge-base main -- src tests specs
   ```
   If the target is a PR number, use `gh pr diff <n>`. If there is no diff, say so and stop.

2. **Collect the coverage report** if present: `coverage/coverage-summary.json`. Include the per-file numbers for any file in the diff.

3. **Spawn the auditor.** Use the Agent tool with `subagent_type: "test-auditor"`. Pass it the diff, the coverage numbers, and the paths of any `specs/*.md` that the diff touches. Do not pass your own opinion of the code. Do not tell it what you expect it to find.

4. **Verify each finding yourself.** For every finding rated `high`, actually try it: revert or mutate the implementation line the auditor named, run the test, and confirm whether it still passes. A finding that survives this check is `CONFIRMED`. One that does not is dropped.

5. **Report** as a table:

   | Severity | File | Finding | Verified |
   |---|---|---|---|

   Then a short list of concrete tests to add, each as an `it("...")` title with the assertion it should make.

6. **Fix `high` findings in this turn** unless the user asked for report-only. Re-run `npm run test:unit` and paste the output.

## Severity guide

- `high`: the test would pass if the implementation were wrong. Tautology, mocked-away logic, no assertion, assertion on a mock's return value.
- `medium`: a real behavior branch in the spec has no test. Boundary or error path missing.
- `low`: weak assertion (`toBeTruthy`, `toBeDefined`), duplicate coverage, unclear title.
