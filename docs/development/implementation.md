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

`pnpm test:api` / `test:web` run executable acceptance features against real product code. Setup smoke tests do not replace feature acceptance.

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

## Expenses — T233 independent verification

Exact expense BDD14 and unit17 green at initial implementation. Independent read-only review plus 23 real HTTP probes against fresh PostgreSQL found no issues: JPY/USD/TWD maximum/overflow boundaries, historical scale retained on same-currency/omitted-amount updates, exact currency changes with precision-loss refusal, TWD omitted-amount exception, totals beyond BIGINT (18446744073709551614), mixed historical USD scales (13.53), full counts and owner/trip-bound untampered cursors. Final feature/support/static/index-plan evidence follows after completion.

T233 final: backend40/40, support17/17, unit17/17 (money and runtime); workspace/test typechecks, repo lint and workspace build pass. Compiled Node24 server executes an authenticated maximum-USD write and totals through the shared package. Real PostgreSQL18.3 EXPLAIN(ANALYZE,BUFFERS) on 20k synthetic rows is archived in expense-query-plans.md, without planner forcing or production latency claims.

T234 found no justified further split/abstraction; exact expense14 and API/shared typechecks remain green. All backend feature phases are complete before frontend implementation begins.

## Frontend account session — T235/T236

Real Better Auth client, account-scoped Query cache, protected routes and approved responsive application shell are implemented. Auth acceptance passes Chromium3/3 and WebKit3/3, plus web/test types, lint and production build. Refactor only makes the existing zero stale-time explicit. Browser fixtures use isolated Vite caches and an external Google authorization HTML redirect supported by both engines; real callback/state/PKCE/session verification remains exercised.

## Frontend trips and custom calendar — T237/T238

Trip creation, optional independent dates and validated date editing use real API data. Trips12/12 across Chromium/WebKit and prior auth6/6 pass; web/test types, lint and build pass. Custom React date dialog retains approved desktop positioning/mobile sheet and local-date semantics. Dedicated browser risk checks6/6 cover initial focus, leap day/month boundary, nested Escape/outside click without closing the form, focus restoration/Tab trapping, 5-to-6-week repositioning, year/month selection and 320x568 mobile geometry with 44px cells. An additional2/2 verifies mobile date fields stack; screenshots inspected in ignored .cache/ui-validation/. Run `sh scripts/pnpm.sh exec playwright test -c playwright.date-picker.config.ts`. Refactor assessment justified no further abstraction; exact trips12/12 rerun passes.

## Frontend expense recording and totals — T239/T240

Real API-backed expense CRUD, searchable keyboard comboboxes, strict amount/paste handling, local dates and authoritative whole-trip totals are implemented. Historical units are preserved, unchanged amount omitted from PATCH, and incompatible currency changes retain the original amount for manual correction. BDD19 scenarios across both engines38/38, auth/trips regression18/18, final focused input checks12/12 and expense support4/4 pass. Web/test types, scoped lint, build and diff check pass. Support checks include exact legacy TWD metadata update, invalid whole-paste rejection, touch selection, lower-precision manual correction and 375px layout. Initial Backspace check failure came from a macOS End-key caret assumption; corrected test uses ArrowRight. Input correction now checks actual contiguous character removal instead of event metadata. Screenshots inspected. New `pnpm test:web-support` runs date and expense compatibility checks. T240 justified no further abstraction; exact38/38 rerun passes.

## Pagination and unknown write outcomes — T241/T242

Cursor-based InfiniteQuery appends and deduplicates rows, takes totalCount from the server, retains loaded rows on read failure and keeps totals independent. POST/PATCH/DELETE unavailable responses are checked against the original UUID and intent; unresolved outcomes preserve/lock the draft and expose manual GET verification without retrying mutations. A missing POST read does not imply not-saved. Exact BDD6/6, unknown-result support8/8 and prior frontend regression56/56 pass across both engines. Support covers 404/503 followed by successful recheck with one POST; explicit400/403/409 remain editable without probes; PATCH/DELETE manual verification does not resend. Types/lint/build/diff pass. Refactor assessment kept clear existing boundaries; exact6/6 rerun passes.

## Frontend categories and device defaults — T243

Category CRUD and cross-trip cache invalidation use the real API. Validation trims Unicode whitespace, counts codepoints and folds only ASCII A-Z for same-owner name checks. In-use delete remains an actionable explanation. Account-keyed localStorage remembers only explicit option selections; inaccessible storage and invalid/foreign IDs safely fall back. Pending preference verification blocks accidental unclassified submission; submitted category ID/label stay frozen during unknown write outcomes. Full frontend96/96, final category scope34/34, new category risks10/10 and prior expense/unknown support12/12 pass across Chromium/WebKit; web/test types, lint and build pass. Full regression exposed a Phase3 When synchronization gap: rename/delete helpers now await terminal success/error before unchanged authoritative DB/API assertions. The root reviewed this correction.

T244 retained the clear category form/delete/preference boundaries without further abstraction. Exact category scope34/34 rerun passes.

## Final UI gate and delivery — T245

Independent frontend review found and verified fixes for unbroken-name overflow, approved totals-card layout/colors, decorative navigation/action icons, the 710px expense panel and Chinese transport recovery guidance. No actionable findings remain in the reviewed scope. Real-browser quality 10/10 and web support 28/28 pass across both engines, including five pages at 375/768/1440 and calendar 320x568. Root visually inspected the final WebKit mobile ledger and Chromium desktop form. Detailed method, findings, reproducible commands and limitations are in ui-quality-review.md. The exact long-token UX rule was found locally; React-specific layout searches had no verified match, so the CSS change rests on that stack-independent rule and actual browser evidence.

Final verification after product fixes: frontend 96/96 (48 Chromium + 48 WebKit); API 40/40; backend support 17/17; unit 17/17; workspace and test TypeScript, repository lint, production builds and diff check pass. UI-source changes were followed by final web/test types, lint and web build. All 245 tasks are checked only after their implementation and verification. Work is committed locally on the agreed codex branch, with no push or merge.

Live Google credentials/callback configuration, physical phones and screen-reader speech output remain unverified. Google credentials are not present in the local .env; follow README configuration to exercise live login. Browser/device simulations and the external Google test fixture do not establish those external checks.
