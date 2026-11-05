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

## Currencies — T225/T226

Exact feature 1/1 green; root lint/workspace typecheck pass. Compiled API startup serves the archived 165-row catalog with JPY=0 and USD/TWD=2. Concurrent checksummed migration replay preserves one history row and 165 currencies. Refactor assessment found no justified cleanup; focused rerun stays green.

## Accounts and ownership — T227

Account + currency feature regression: 7/7 green. Canonical support tests: 6/6 green, covering real Better Auth callback/session/cookie forwarding/revocation, forged/expired tokens, source rejection before malformed JSON, strict validation with unchanged DB and non-disclosing ownership responses, and pinned auth schema metadata. SQL/Drizzle auth namespace and necessary owner-scoped business persistence are migrated. API/test typechecks, lint, build and compiled server startup with .env loading pass. No live Google credentials or production login bypass are present.

T228 removed the unused testMode option and broad fixture factory cast; direct typed assembly catches interface drift. Scoped 7/7 regression, API/test typechecks and lint remain green.

## Trips — T229

Exact trip feature 5/5 and prior account/currency regression 7/7 green. Support 9/9 includes UUID collision without disclosure/mutation, strict invalid-date/body rejection, Unicode trim and null-clearing with authoritative re-read. Product trip creation inserts under the verified session owner and reads back inside one transaction. API/test types, lint and API build pass.

T230 extracted shared trip field validation without changing omitted/null behavior or transaction boundaries. Completed BDD 12/12, trip support 3/3, typechecks and lint pass.

## Categories — T231

Category feature 14/14; all completed backend features 26/26; support 13/13 green. Added owner-scoped category CRUD/list, Unicode codepoint validation, generated ASCII name-key uniqueness and constraint-backed deletion. Supporting expense single-read joins the current category label; category-only PATCH preserves historical money. Deterministic concurrent insert/delete test verifies FK wait then 409 with both records intact. PostgreSQL18 RESTRICT emits 23001; mapping recognizes this and 23503 only for the category-reference constraint. Cross-owner UUID privacy, 30/31 emoji limits, ASCII-only folding, bodyless DELETE and category clearing/foreign rejection are covered. Types/lint/API build pass.

T232 assessment found no justified cleanup; exact category14 rerun and typechecks remain green.
