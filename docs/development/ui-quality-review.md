# T245 UI quality review

Reviewed on 2026-11-05 by an independent implementation agent that did not author the frontend product code. The final review has no outstanding actionable findings within the approved five-page UI scope.

2026-11-09 maintenance note: plan 003 removed stored screenshots, image comparison, and capture-only tests. The current runner checks behavior, accessibility and viewport fit without producing review images. The filenames below describe historical review output, not maintained baselines.

## Reference and method

The approved source is `specs/plans/001-personal-travel-expenses/ui/ui-plan.md`, the five HTML pages rendered by `app.js`, `styles.css`, `date-picker.js` / `.css`, the structure of `prototype-design.pen`, and its `design-previews` images. The latest UI plan takes precedence over the older prototype for TWD integer input, category names up to 30 Unicode code points, and unconfirmed write results. The ui-ux-pro-max accessibility, interaction, responsive layout, and long-token wrapping guidelines were used as review criteria without replacing the approved design.

Actual React pages were rendered in Chromium and WebKit at 375, 768, and 1440 CSS pixels wide, each with a 1000px viewport height. Login, trips, trip ledger, expense form, and categories were captured and checked for document horizontal overflow. Separate 375×812 captures exercise feedback states. The unchanged static prototype was also rendered directly from its local HTML in each engine at 375 and 1440 for visual comparison; the approved expense and date-picker preview images were inspected separately.

Product scenarios use the existing isolated PostgreSQL/Fastify/Vite fixtures and real session, trip, category, currency, expense, and totals APIs. Only transport is delayed, aborted, or put offline to expose failure states; core business responses are not fabricated. A delayed write reaches the real API before its response is released, and an unconfirmed write is checked against its real saved row using the original UUID.

## Findings and corrections

| Finding | Correction verified |
| --- | --- |
| A valid 100-character unbroken trip name expanded the ledger heading and expense back link beyond every tested viewport, in both engines. | Shrinkable heading text, wrapping user content, a constrained back link, and a stable primary action keep all content visible without horizontal scrolling. |
| Mobile totals were two full-width white cards instead of the approved compact adjacent cards with an inverse green first card. | Card sizing, spacing, first-card colors, and number hierarchy now follow the approved layout. Large exact totals continue to wrap. |
| Shared navigation, back links, create actions, and category rows omitted the approved decorative icons. | Consistent decorative SVGs restore the approved navigation and row hierarchy; accessible control names remain textual. |
| The desktop expense panel was 760px wide instead of the approved 710px. | The panel is 710px; currency and amount remain full-width, with date/category beside one another on desktop. Mobile fields stack for usable date controls. |
| A transport error displayed native English `Failed to fetch` text. | Read failures provide Chinese connection/retry guidance while preserving explicit API business errors. The reproducible check rejects native fetch-error wording. |

The real currency catalog's labels and generic `JOURNEY` card decoration are legitimate differences from illustrative prototype data. They do not introduce destination fields or guessed currency data. TWD still accepts integer input while stored/output precision remains two digits; historical metadata-only edits retain their saved precision.

## Reproducible checks

Run these sequentially because the web fixtures allocate fixed ports beginning at 44000:

```sh
sh scripts/pnpm.sh exec playwright test -c playwright.ui-quality.config.ts
sh scripts/pnpm.sh test:web-support
sh scripts/pnpm.sh exec tsc -p tsconfig.tests.json
sh scripts/pnpm.sh exec eslint apps/web/tests/support/ui-quality.spec.ts playwright.ui-quality.config.ts
```

Final results: UI quality **10/10 passed** (21.9s), existing web support **28/28 passed** (16.9s), test TypeScript and focused ESLint passed. The quality runner uses one worker and reduced-motion preference. Five quality cases run in each engine:

- Five-page, three-width screenshots and overflow checks.
- Unbroken names, maximum individual monetary values, exact JPY total `18,446,744,073,709,551,614`, and USD decimal totals.
- Real loading, transport error, Chinese guidance, retry, and a genuine missing-trip return link.
- Unchanged approved prototype screenshots for direct layout review.
- Empty ledger, offline retained draft, disabled pending form, unconfirmed saved response, explicit recheck, and `role=status` success feedback, with authoritative database checks.

The existing 28 support cases additionally cover date keyboard movement, leap days, month/year switching, nested Escape and Tab trapping, focus restoration, six-week calendar positioning, 320×568 touch targets and scrolling, mobile currency selection and invalid paste, manual precision correction, historical TWD preservation, category validation/preferences/storage failure, and POST/PATCH/DELETE unknown-result handling. Calendar screenshots from both engines were inspected against the approved date-picker design.

## Local evidence

Historical output from this review was written under `.cache/ui-review/`; filenames start with `chromium-` or `webkit-`:

| Evidence | Filename suffix |
| --- | --- |
| Five production screens | `login-375.png`, `trips-768.png`, `trip-375.png`, `expense-1440.png`, `categories-375.png` (all five pages have all three widths) |
| Static approved references | `approved-trip-375.png`, `approved-expense-1440.png` (all five pages at 375/1440) |
| Long content | `long-trip-375.png`, `long-backlink-375.png` (also 768/1440) |
| Read feedback | `loading-375.png`, `error-375.png`, `missing-trip-375.png` |
| Write feedback | `empty-trip-375.png`, `offline-draft-375.png`, `saving-375.png`, `saved-status-375.png`, `unconfirmed-draft-375.png` |

Date support screenshots are `.cache/ui-validation/calendar-320x568-chromium.png` and `calendar-320x568-webkit.png`. Full-page screenshots show the fixed bottom navigation at its viewport position; the page's bottom padding allows content to scroll above it during actual interaction. Browser output logs used for this review are `.cache/ui-review/quality-final.log` and `web-support-final.log`.

This review covers desktop browser engines and simulated viewport/touch behavior, not physical mobile devices, screen-reader speech output, or live Google OAuth. The local Google credentials remain blank; automated authentication uses the existing isolated test session/external Google test fixture. No truth, approved UI artifacts, or production feature scope was changed by the reviewer.
