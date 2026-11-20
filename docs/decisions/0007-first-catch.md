# 0007: The first real defect the gate caught (phase 0 exit note)

- **Date:** 2026-11-20
- **Status:** Record
- **Where:** yespajak PR #2 (`core-pajak-lengkap`), commits `ee845c5`, `6317878`, `e912af2`

## What was wrong

The UMKM-versus-general-scheme calculator on yespajak.pandancoco.com shows a "margin impas": the profit margin where both schemes cost the same. For an individual (orang pribadi) with turnover up to Rp500 million, it showed **≈ 0,0%**.

That number was wrong. Under PP 55/2022, the final UMKM scheme costs individuals nothing up to Rp500 million turnover. The general scheme also costs nothing until profit passes PTKP plus Rp1.000 (PKP is rounded down to the thousand). At Rp100 million turnover, status TK/0, both schemes cost Rp0 for every margin up to **54,001%**. Below Rp54.001.000 turnover, the general scheme never costs more, so there is no impas at all. A user reading "≈ 0%" would conclude that any profit at all makes the UMKM scheme cheaper.

## Why the tests did not catch it

The spec was wrong in the first place, and the tests encoded the wrong spec faithfully:

- AC5 said "OP omzet ≤ 500 jt (pajak UMKM 0) → 0".
- The edge-case section argued that the cut-off "always exists" and that the `return null` guard "is never reached". The argument fails when turnover is at or below PTKP.

The bisection looked for the lowest margin where general tax ≥ UMKM tax. When UMKM tax is 0, that condition holds at margin 0.

The October audit (engine v0.2.0, free-form report) accepted the surviving mutants on these lines as "equivalent or unreachable". Mutation testing had flagged the exact line, but a plausible written argument overrode it.

## How it was caught

1. Engine v0.4.0 added `/mutation-survivors`, and its rules say equivalence claims deserve suspicion. The CI mutation report for `core-pajak-lengkap` listed `perbandingan.ts:89` (`<` → `<=` on the null guard) as surviving.
2. Re-reading that survivor against the boundary-table rule from v0.4.0 `/spec-first` raised one question: which inputs make UMKM tax 0 and general tax 0 at the same time? A five-line probe answered it: OP turnover ≤ Rp500 million.
3. The fix changed the definition to "the highest margin where general tax does not yet exceed UMKM tax; null if it never does". The spec gained a boundary table at PTKP + 1.000 and at the Rp500 million switch.
4. A fresh-context `test-auditor` run on the fix returned **NEEDS WORK**. Returning the bisection midpoint could land on the wrong side of the boundary. At turnover Rp54.001.000 and Rp500 million the reported margin already made general tax exceed UMKM. Invariant tests (general ≤ UMKM at the margin, general > UMKM just above it) now pin which side the margin is on.
5. A second audit returned **TRUSTWORTHY**. Every non-equivalent mutant on the function is killed, and every row of the boundary table has a test.

## What it cost

About 35 minutes of agent time from opening the mutation report to the TRUSTWORTHY verdict. That covered two fix commits, one test commit, and two audits. CI was green on every push.

## What the engine learns

- **Spec-first does not protect against a wrong spec.** Tests that confirm a spec inherit its mistakes. The defences that worked came from outside the spec: mutation testing, and an auditor that reads the implementation adversarially.
- **"Equivalent mutant" is a claim to test, not to accept.** Phase 1 hardening already prints survivors in every run summary (`mutation-summary`). The next auditor change should require a concrete input-space argument per equivalence claim.
- **Boundary tables need the thresholds of every dependency.** This one, PTKP, came from Pasal 17, not from the UMKM rule the feature was about.

## What changed for users

For OP turnover above Rp500 million, impas moves from 10,4% to 10,4001%. That is the top of the equal-tax step and is invisible at the UI's one decimal. For OP turnover up to Rp500 million, the calculator now shows the real margin (54,0% at Rp100 million, TK/0), or hides the line when there is no impas.
