---
name: mutation-survivors
description: Read the Stryker report, list every surviving mutant in src/core, and propose one concrete test per survivor that would kill it. Use when mutation score is below threshold, after /coverage-gaps, or before a PR that touches core.
---

# mutation-survivors

A surviving mutant is a change to the implementation that no test noticed. Each one is a bug the suite would let through. This skill turns the report into tests, not into excuses.

## Steps

1. Ensure a fresh report: `npm run test:mutation`. If `reports/mutation/report.json` is missing afterwards, report the error and stop. Do not lower `thresholds` in `stryker.config.mjs` to make the run pass.

2. Parse `reports/mutation/report.json`. For every file under `src/core`, list each mutant whose `status` is `Survived` or `NoCoverage` with its `mutatorName`, `location.start.line`, and `replacement`. Read the source around each one so you can say, in plain words, which behaviour the mutant changes.

3. Group survivors that the same test would kill (the same line, or the same condition mutated three ways). Rank groups: money, date, and tax arithmetic first, then conditionals on business rules, then error paths, then string formatting last. Mutants on logging or on a `default` branch that the spec declares unreachable go last, with the spec line that says so.

4. For each of the top groups (at most 15), write:
   - the file, line, and mutator (`ConditionalExpression`, `ArithmeticOperator`, `EqualityOperator`, ...)
   - the original and the mutated expression
   - the behaviour that changes, as a user would notice it
   - a proposed test as an `it("...")` title, the exact input, and the exact assertion. The assertion is a value, not a range or `toBeDefined`, because a mutant survives any assertion loose enough to accept both versions.

5. If the user asked you to fix, write the tests into the matching `tests/unit` file, run `npm run test:unit` to confirm they pass against the current code, then `npm run test:mutation` and paste the new score. Do not touch implementation code to make a mutant easier to kill, and never add a mutant to `// Stryker disable` without the spec line that makes the mutated behaviour unreachable.

6. If a survivor is equivalent (the mutated code cannot behave differently for any input), say so with the reason, and propose a simplification of the implementation instead of a test. Equivalent mutants are rare; be suspicious of your own claim.
