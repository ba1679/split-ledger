# Phase 1A implementation record

Branch: `codex/001-personal-travel-expenses` (base `9d4bc0a`).

Execution agreement: complete tasks in dependency order; verify and check each task before advancing. Phase 3 may group related DSL tasks per agent, with at most three agents in parallel. Shared fixtures/configuration have one owner. Feature Green and Refactor remain separate steps. Local commits are authorized at reviewable milestones; no push or merge is included.

## Verified environment

- Node 24.22.2, pnpm 11.25.0; all direct dependencies are pinned in package manifests and the lockfile.
- TypeScript 5.9.3 satisfies the installed typescript-eslint support range; peer checks pass.
- Docker Compose separates development PostgreSQL 18.3 (54329) and test PostgreSQL 18.3 (54330).
- SIX List One published 2026-09-17 is archived in `packages/shared/data/`. SHA256 matches the research record. There are 165 selectable codes; TWD minorUnit remains 2.
- Setup: PostgreSQL queries, actual Fastify/Vite startup, Vitest and Chromium smoke passed. WebKit smoke also passed once its browser download completed.
- Foundations: application typechecks/builds; worker databases isolate test data and are dropped afterward. Both browser engines reach worker-local Vite and its real API proxy.
- Gherkin discovery: 40 backend scenarios and 48 frontend scenarios per browser.

## Test boundaries

Each BDD worker owns a fresh database and real Fastify instance; frontend workers additionally own Vite. Each scenario gets its own account/data namespace. A missing application migration during RED is reported as a product assertion, not an unhandled SQL error.

Google's external authorization/token/JWKS responses are controlled only from test support modules. Callback state, PKCE, RSA-signed ID tokens, Better Auth session verification and PostgreSQL persistence remain in the execution path. These tests do not establish that real Google credentials/callback configuration are correct.

## Commands

With Node matching `.node-version` and pnpm matching `packageManager`, use normal `pnpm` commands. In this workspace `sh scripts/pnpm.sh ...` can also use the verified local toolchain under ignored `.cache/toolchain/`.

```sh
pnpm install --frozen-lockfile
pnpm db:up
node scripts/smoke.mjs
pnpm test:unit
pnpm test:smoke
pnpm typecheck
pnpm exec tsc -p tsconfig.tests.json
pnpm lint
pnpm build
pnpm test:api
pnpm test:web --project chromium
pnpm test:web --project webkit
```

`pnpm test:api` / `test:web` are acceptance runs and remain RED until the corresponding product feature is implemented. Never use a passing setup smoke test as a substitute for feature acceptance.

## Phase 3 review gate

T010–T223 implemented and individually mapped to exact DSL registrations. Both independent cross-reviews have no remaining findings after fixes to OAuth fixture identity/cancellation, category timestamp expectations, pure GET device actions, cleanup ordering and authoritative totals assertions. Fail-on-generation rejects undefined steps. Final serial RED: all 40 API and 48 Chromium scenarios failed only at explicit missing-product-migration assertions; no undefined steps, compilation, startup or teardown errors. Lint and test TypeScript pass. T224 passed before any product Green implementation.
