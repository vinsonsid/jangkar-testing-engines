# 0003: Public repos instead of GitHub Pro

- **Date:** 2026-09-29
- **Status:** Accepted

## Context
Branch protection on private repos needs a paid plan. Without it the quality gate is advisory.

## Decision
Make the engine and yespajak public. Engine `main` requires the `check` status; yespajak `main` requires `quality-gate / quality-gate`. Admins are included; force-push is blocked.

## Consequences
CI is the authority with no bypass, including for the owner and for agents: a direct push to a protected `main` is rejected (seen on 2026-10-13). Adopters can install the engine from GitHub without a token.
