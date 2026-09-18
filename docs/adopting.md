# Adopting the engine

## New project

```bash
npx github:vinsonsid/jangkar-testing-engines init --stack nextjs my-app
cd my-app
npm install
npm run test:all
```

Stacks available in phase 1: `nextjs`, `node-api`. `python` and `mobile-expo` arrive in later phases.

## Existing project (retrofit)

From the project root:

```bash
npm install --save-dev github:vinsonsid/jangkar-testing-engines#v0.1.0
npx jangkar-test retrofit
npm install
npm run test:all
```

`retrofit` is additive. It:

- writes `vitest.config.mjs`, `eslint.config.mjs`, `stryker.config.mjs` if absent, or reports what it would change if present
- makes `tsconfig.json` extend the strict config
- creates `src/core`, `src/adapters`, `tests/unit`, `tests/integration`, `tests/system`, `specs`
- adds the `test:*`, `lint`, `typecheck` npm scripts
- copies `.github/workflows/quality-gate.yml`
- copies `.claude/skills/*`, `.claude/agents/*`, `.claude/hooks/*` and merges hook wiring into `.claude/settings.json`
- appends the testing rules block to `CLAUDE.md`

Run `npx jangkar-test doctor` afterwards. It exits non-zero until the project meets the standard.

## Pinning and upgrading

Projects pin the engine to a git tag. Upgrades are explicit:

```bash
npx jangkar-test upgrade v0.2.0
npm install
npx jangkar-test doctor
```

If you prefer a submodule (for Python or non-npm projects):

```bash
git submodule add -b main https://github.com/vinsonsid/jangkar-testing-engines .testing-engines
node .testing-engines/bin/jangkar-test.mjs retrofit
```

## Branch protection (required)

The gate only means something if the remote enforces it. For each project:

```bash
gh api -X PUT repos/OWNER/REPO/branches/main/protection \
  -f required_status_checks[strict]=true \
  -f 'required_status_checks[contexts][]=quality-gate' \
  -F enforce_admins=true \
  -f required_pull_request_reviews[required_approving_review_count]=0 \
  -F restrictions=null
```

Or in the GitHub UI: Settings, Branches, add rule for `main`, require status check `quality-gate`, include administrators.

## Local integration dependencies

The `integration` and `system` jobs expect a real local dependency. For Supabase projects, install the Supabase CLI and run `supabase start` before `npm run test:integration`. CI does this automatically when a `supabase/` directory exists.
