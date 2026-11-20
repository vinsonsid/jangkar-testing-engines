# 0005: yespajak tax-policy questions resolved as status quo

- **Date:** 2026-11-20
- **Status:** Provisional. Taken by Claude while Vinson asked for the plan to run without him; any of the three can be reversed by a new decision.

## Context
Three questions from the October core migration (yespajak PR #2) were left for Vinson and blocked the merge for seven weeks.

## Decisions
1. **Rounding.** Floor to the rupiah stays in the UMKM module only. Other modules keep their current behaviour, which the existing tests pin. No live output changes.
2. **`bandingkan` above Rp4,8 M.** It keeps computing both schemes; the UI marks the final scheme as unavailable (`BATAS_OMZET_UMKM`). Moving that flag into core (`pajakUMKM: null`) stays possible later.
3. **Guards in `cariMarginImpas`.** The `return 0` guard stays as a documented defence; it is unreachable, and the spec says so. The `return null` guard turned out to be reachable and is now tested (see 0007).

## Why status quo
Each choice changes numbers on a public tax calculator. That is the owner's call, so the default is the behaviour users already see.
