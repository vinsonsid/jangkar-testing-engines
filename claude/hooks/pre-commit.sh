#!/usr/bin/env bash
# Git pre-commit hook: fast checks on the staged change only.
# Installed via simple-git-hooks by jangkar-test.
set -euo pipefail

staged_ts="$(git diff --cached --name-only --diff-filter=ACMR -- '*.ts' '*.tsx' '*.mts' || true)"
[ -z "$staged_ts" ] && exit 0

echo "jangkar pre-commit: lint"
# shellcheck disable=SC2086
npx eslint --max-warnings 0 $staged_ts

echo "jangkar pre-commit: typecheck"
npx tsc -p tsconfig.json --noEmit

echo "jangkar pre-commit: forbidden patterns"
if printf '%s\n' "$staged_ts" | xargs grep -nE '\b(it|test|describe)\.(only|skip)\(' 2>/dev/null; then
  echo "Focused or skipped tests are staged. Remove them." >&2
  exit 1
fi

echo "jangkar pre-commit: unit tests for changed files"
npx vitest run --changed HEAD --passWithNoTests --coverage.enabled=false
