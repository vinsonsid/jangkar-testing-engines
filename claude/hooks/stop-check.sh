#!/usr/bin/env bash
# Claude Code Stop hook. Blocks the agent from ending its turn while the unit
# suite is red. Installed into the project's .claude/hooks/ by jangkar-test.
#
# Contract: read hook JSON on stdin; exit 0 to allow, exit 2 with a message on
# stderr to block. `stop_hook_active` is true when this hook already blocked
# once in this turn; we let the second stop through to avoid an infinite loop.

set -u
input="$(cat)"
if printf '%s' "$input" | grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then
  exit 0
fi

# Only act inside a project that adopted the engine.
[ -f package.json ] || exit 0
grep -q '"test:unit"' package.json || exit 0

# Only act when something under src/ or tests/ changed since HEAD.
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  changed="$(git status --porcelain -- src tests 2>/dev/null | wc -l | tr -d ' ')"
  [ "$changed" = "0" ] && exit 0
fi

out="$(npx vitest run --changed --passWithNoTests --reporter=dot --coverage.enabled=false 2>&1)"
status=$?
if [ "$status" -ne 0 ]; then
  {
    echo "jangkar stop-check: the unit suite is RED. You are not done."
    echo "Fix the failure or explain the blocker to the user. Do not skip, delete, or weaken tests."
    echo "--- last 60 lines ---"
    printf '%s\n' "$out" | tail -n 60
  } >&2
  exit 2
fi
exit 0
