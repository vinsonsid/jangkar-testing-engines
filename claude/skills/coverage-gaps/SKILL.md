---
name: coverage-gaps
description: Read the Vitest coverage report, list every uncovered branch and function in src/core and src/adapters, and propose one concrete test per gap. Use when coverage is below threshold or before a PR.
---

# coverage-gaps

## Steps

1. Ensure a fresh report: `npm run test:unit` (it runs with `--coverage`). If `coverage/coverage-final.json` is missing afterwards, report the error and stop.

2. Parse `coverage/coverage-final.json`. For each file under `src/core` or `src/adapters`:
   - List uncovered functions by name and line.
   - List uncovered branches by line, and read the source around each one to say what condition is untested.
   - Skip files above 95% on all four metrics.

3. Rank the gaps. Business rules, error paths, and boundary conditions first. Logging and trivial getters last.

4. For each of the top gaps (at most 15), write:
   - the file and line
   - the condition that is untested, in plain words
   - a proposed test as an `it("...")` title and the precise assertion

5. If the user asked you to fix, write the tests into the matching `tests/unit` or `tests/integration` file, run `npm run test:unit`, paste the new coverage table. Do not touch implementation code to make coverage easier. Never add `/* v8 ignore */` or `istanbul ignore` comments.
