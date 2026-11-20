# 0006: Phase 1 scope adjustments

- **Date:** 2026-11-20
- **Status:** Accepted

## Context
The roadmap listed Anthropic fixtures and a Supabase integration recipe as phase 1 work and called phase 3 "not optional for the first adopter" because yespajak calls the Anthropic SDK. yespajak depends on neither the Anthropic SDK nor Supabase (checked 2026-11-20); its only runtime framework is Next.js.

## Decisions
1. **Anthropic fixtures move to phase 3, and the Supabase recipe moves to the first adopter with a database.** Neither can be proven on an adopter today, and the roadmap's own rule is to prove on one adopter before generalising.
2. **Time budgets warn first.** `quality-gate` reports unit (60 s) and integration + system (300 s) against budget, as a warning. The `enforce-budgets` input turns a breach into a failure. The default flips to enforcing in the next major release, with notice in the changelog.
3. **PR mutation is scoped.** PRs mutate only the `src/core` files they change; nightly and manual runs mutate all of `src/core` and record a trend.

## Consequences
The phase 1 exit is the bad-PR test plus a green `doctor` after upgrade on yespajak. Phase 3 is no longer next by default; phase 2 (web) is, because yespajak has no LLM feature.
