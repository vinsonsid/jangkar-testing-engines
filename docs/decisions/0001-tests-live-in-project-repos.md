# 0001: Tests live in each project repo

- **Date:** 2026-09-18
- **Status:** Accepted

## Context
A shared engine could hold tests for every project, or only the rules that tests must meet.

## Decision
Tests live next to the code they test, in the adopter's repo. The engine ships configs, CI gates, skills, agents, hooks, and scaffolds. It never ships a project's tests.

## Consequences
An adopter upgrades the engine without touching its tests. The engine proves itself through its own `tests/` and the `examples/` project, not by testing adopters.
