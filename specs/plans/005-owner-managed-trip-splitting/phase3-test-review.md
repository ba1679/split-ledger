# T218 independent review

Status: **PASS — independent re-review complete; zero open findings.** All 212 new DSL rows and two reused rows are covered. The four initial P2 findings listed below are historical and now resolved.

Scope: T006–T217, 212 new DSL registrations, two reused backend registrations, authoritative module/root DSL and all 24 new feature scopes. Row-level semantics are independently reviewed in backend/frontend companion reports, then consolidated here. No repo source, truth, or task status is changed by this review.

## Cross-cutting checks

- All 212 checked task rows resolve to their declared Write file; each file has exactly one explicit Given/When/Then registration. Distribution: backend 98, frontend 114.
- API/web runner step globs include phase-1b subdirectories, missingSteps remains fail-on-gen, and the frontend runner preserves Chromium/WebKit. Full bddgen and test TypeScript checks were performed by the parent.
- Fixture schema guards produce explicit product-table/column assertion RED before unsupported raw SQL. Existing archived migrations are applied through a distinct isolated ledger_test database, then the real migrate() boundary upgrades it.
- Shared arithmetic oracles use source rows and independent bigint rational operations, importing only product types. Historical scale conversion, signed repayments and adjustment contributions, canonical zero, complete nonzero membership, and exact comparisons were inspected.
- Transaction race/fault hooks remain private dependency injection dispatched by scenario trip ID. Race barrier proves both commands arrive before trip lock; rollback proof requires the injected first-adjustment hook to be reached.
- Browser authoritative snapshots read real owner API and DB. Lost-response interceptors verify real durable success before aborting; temporary not-found responses model uncertainty and do not manufacture successful saved projections.
- Reused login/trip-create steps preserve the original real authentication/POST boundary; the new owner assertion checks creation response and durable owner before readonly confirmation.

## Issues

Four initial findings were independently re-reviewed against the current repository and are now resolved:

1. T157/T189 member draft UUID retention is observed only through test World state. `apps/web/tests/support/splitting/unconfirmed-member-result.ts:127` compares the request UUID copied to World against the same request evidence; `assertUnconfirmedMemberDraft` at lines 81–98 never reads the current product pending UUID. A product can reallocate the draft after loss and still pass. Compare a real form attribute bound to pending state against the original UUID before submission and throughout unknown-outcome verification.
2. T079 loses the original confirmation HTTP outcome before validating success. `apps/api/tests/support/splitting/repayment-arrangements-result.ts:19` invokes a GET helper without requiring the original POST to be 201. A persisted repayment returned as HTTP 500/409 can satisfy all following arrangement/source checks. Assert original 201 before the first read; no new mutation.
3. T102 validates 201 status and durable sources, but never validates the original 201 response body. `apps/api/tests/support/splitting/sequential-settlement-result.ts:117` onward permits an empty/wrong response for Bob’s successful command. Bind the response to the reserved Bob settlement/repayment IDs, original key/revision, JPY34 and the two exact adjustments; readonly record confirmation is a suitable implementation. The current GET repayment list already has a closed DTO comparison, so it does reject extra rounding fields there. Do not characterize that existing check as absent.

4. T180 permits extra visible share rows. `apps/web/tests/support/splitting/nonsharing-payer-result.ts:122` checks Amy50 and Bob50 and excludes Alice50, but does not exclude Alice0/Alice33.33 or other extra participant rows. The authoritative DSL requires the complete UI/API share set to contain exactly Amy and Bob. Reuse the existing readonly `assertMemberShareDisplay(card, ['Amy','Bob'], 'JPY 50')` full collection assertion.

Both independent semantic reviews are complete. Their 214 coverage rows below consist of all 212 new DSL rows plus two reused rows. Historical finding references embedded in the affected rows are closed by the remediation review below. No other blocking findings were identified.

## Remediation re-review — zero open findings

The gate reviewer independently read the current implementations and regression guards after the parent fixes. No repository source or truth was changed by this review.

| Finding | Re-review result | Evidence inspected |
| --- | --- | --- |
| T079 original Act response | Resolved | Helper requires original response201 before any GET can replace world.response. New support regression rejects409/500 at that entry. |
| T102 original successful record | Resolved | Original201 body captured before readonly calls; assertSequentialSettlementRecord validates complete Bob record against DB, both reserved IDs, original key/revision,100/3 obligation,34 repayment and two exact adjustments. Closed nested no-policy shape is enforced on original body and same-ID GET; original response is retained. Malformed/wrongID/wrongcash/wrongobligation/missingadjustment/extra-policy counterexamples reject. Existing T095 remains the global database schema/storage no-policy verifier; T102's explicitly required repayment-list no-strategy check remains closedDTO. No additional mutation was added. |
| T157/T189 real draft UUID | Resolved | T157 reads actual member form data-command-id before click and compares actual POST ID to it. T189 checks that real form attribute against original commandId twice around readonly verification. DOM reallocation counterexample rejects. Future GREEN T253 must bind this metadata to actual pending state, as recorded by the parent. |
| T180 complete displayed share set | Resolved | Current card is checked with assertMemberShareDisplay for exactly two listitems Amy/Bob atJPY50. DOM extra AliceJPY0 counterexample rejects. Existing full API/DB arrangement/source checks are preserved. |

Parent verification evidence was inspected in `.cache/t218-gate/summary.json`, API/web Playwright JSON and RED error lists: backend14files/125cases and frontend10files/144cases across Chromium/WebKit are all explicit missing-product RED, with0 skipped/flaky and0 top-level runner errors. Backend errors:123 trips.simplify_debts,1 expenses.payer_member_id,1 missing ownerMemberId. Frontend errors:142 trips.simplify_debts,2 expenses.payer_member_id. No undefined/ambiguous steps or SQL/module/infrastructure failure is used as RED. Parent reports both full bddgen and tests TypeScript, targeted lint/format, two backend guards and two Chromium DOM guards pass. Formal web-support config now includes splitting/**/*.spec.ts, preventing orphaned new support specs. The gate reviewer did not unnecessarily rerun the complete suites.

**Conclusion: T218 independent semantics review passes with zero open findings.** Parent may mark T218 complete after combining its runner/registration evidence.


---

# T218 independent backend test review

Scope: all 98 new backend DSL registrations T006–T103, their direct helpers/oracles, both reused registrations, and all 14 backend 005 feature files. Read-only review; no repository files changed. Full runner RED/BDD generation/typecheck evidence is owned by the parent gate reviewer. This review checks row semantics rather than treating a fixture RED as proof of later rows.

## Initial findings — resolved by root remediation review above

### B1 — T079 does not validate the unique successful Act response (P2)

Location: `apps/api/tests/support/splitting/repayment-arrangements-result.ts:19` (also `confirm-overpayment-command.ts:43`).

`assertRepaymentArrangements` calls `assertExpenseArrangements`, which immediately replaces `world.response` through `callApi(GET settlement)`, before checking the original repayment response. The confirmation When only checks persistence if the status is 201 and otherwise permits any status. Thus the BDD confirmation→reverse-arrangement scenario can pass with a committed700 repayment but a500 or409 command response, provided later settlement reads correctly show Alice→Amy100. The isolated support spec has a201 assertion outside this helper, but that assertion is absent from the actual registered feature path. Phase3 global DSL requires Then to validate the unique command response; the valid confirmed repayment must return201. Assert original201 before the first confirmation read (or capture original response in the helper), and add a negative test that a non201 original response cannot pass even with matching durable projections. Keep stale-confirmation rejection scenarios unchanged.

### B2 — T102 omits its explicit no-rounding-strategy requirement (P2)

Location: `apps/api/tests/support/splitting/sequential-settlement-result.ts:117–153`.

The authoritative T102 row explicitly requires201, the new Bob facts, and no rounding strategy. Its repayment list check is already a closed DTO comparison against `historicalRepaymentProjection`, so extra policy fields on that list are rejected. However, the helper never validates the original201 body and never calls the no-policy verifier or checks strategy storage. A Bob201 containing an added `roundingMethod`/nested policy (or an empty/unrelated body) can pass while balances and durable amounts remain correct; a strategy column on the new settlement also goes unexamined by this row. T095 tests a separate Amy-only scenario. Capture/assert Bob’s original201 against its persisted facts and apply existing no-policy assertions to that response/storage. A GET of the same SettlementRecord is a useful minimal readback method, not an additional explicit endpoint requirement in the T102 DSL. Add a negative extra-policy/incorrect-success-body case; preserve the current closed repayment-list and exact source checks.

## Coverage (100 rows)

Each row below was checked against the full authoritative DSL parameters/defaults/table/implementation semantics, registration and direct helper code. “Checked” means no additional actionable issue beyond findings above; product absence remains expected RED.

| Row | Registered DSL | Direct helper | Concrete semantics checked |
| --- | --- | --- | --- |
| T006 | Given: owner 的分帳旅行已建立成員 | members-fixture.ts | Direct persisted owner/session/trip and four stable members; names, roles, active flags, generated nameKey, revision checked. |
| T007 | Given: owner 的分帳旅行已有下列支出： | expense-fixture.ts | DataTable exact fields, currency historical scale, BigInt minor amounts, payer/share identities and source snapshots; independent share/net oracle. |
| T008 | Given: owner 的分帳旅行已有下列獨立還款： | repayments-fixture.ts | Preserves prior facts; real dated independent payments, no settlement link; rejects overpayment fixture bypass and increments revision. |
| T009 | Then: 這次分帳操作被拒絕為 "{錯誤}" | rejection.ts | Contract error status/code, foreign-owner/session privacy, complete DB/revision equality and authenticated owner re-reads. |
| T010 | Given: 分帳旅行另有未獲授權的登入帳號 | access-fixture.ts | Full expense/payment/settlement/adjustment history plus separate authenticated owner with companion-equivalent display name; current valid key captured. |
| T011 | Given: 同一owner的另一趟旅行有可讀寫分帳子資源 | cross-trip-fixture.ts | Same authenticated owner, distinct trips and real member/expense/payment/settlement child IDs; both snapshots retained. |
| T012 | Given: 原支出已以 Amy 實付 JPY 33 結清 | settled-expense-fixture.ts | Direct completed obligation100, cash33, paired ±67 history; original expense and immutable IDs retained. |
| T013 | Given: 支出驗證用的停用與跨旅行成員已建立 | expense-validation-fixture.ts | Real inactive Carol and same-owner other-trip David, stable distinct IDs. |
| T014 | Given: 舊版機票支出已完成分帳資料遷移 | legacy-fixture.ts | Actual old 0001/0002 database, old expense then formal migrate; original columns/totals preserved and owner/share backfill checked; conditional cleanup. |
| T015 | Given: 另一趟旅行已有同行者 "{名稱}" | other-trip-member-fixture.ts | Same-owner other trip/owner/companion rows; current-trip member set unchanged. |
| T016 | Given: 同行者 "{成員}" 已停用 | inactive-member-fixture.ts | Direct companion status mutation preserving ID/nameKey/source facts and pre/post rational balance oracle. |
| T017 | Given: Amy 應付 JPY 600 且 owner 已取得 JPY 700 的超額警告 | overpayment-warning-fixture.ts | Real server-issued 409 warning/token and reserved payment UUID; exact600 debt/700 cash/100 excess, no writes. |
| T018 | Given: 超額警告後旅行已有新的帳務版本 | stale-warning-fixture.ts | Separate committed personal10 expense/revision; old token/request retained and sources checked. |
| T019 | Given: 還款驗證用的停用與跨旅行成員已建立 | repayment-validation-fixture.ts | Inactive/cross-trip members prepared while all existing financial sources remain unchanged. |
| T020 | Given: Amy 已以 JPY 33 結清點心安排且 Bob 的安排仍未結清 | sequential-settlement-fixture.ts | Real snack100/three shares, Amy33/±1/3 persisted; Bob100/3 current key/revision and fresh two command IDs. |
| T021 | Given: Amy 的安排已以 JPY 33 結清但保存回應曾遺失 | lost-settlement-fixture.ts | Already committed Amy settlement; exact original command reconstructed, caller response cleared; no replay. |
| T022 | Given: owner 已取得 Amy 向 Alice 的目前付款安排 | current-arrangement-fixture.ts | One real owner settlement projection; exact debt/key/revision/endpoints captured and two UUIDs reserved with no write. |
| T023 | Given: 旅行有既有實付與結清調整的分帳來源 | history-reconstruction-fixture.ts | Snack/Amy33 paired history, Bob independent10, TWD300; all source counts and70/3/300 oracle verified. |
| T024 | Given: 旅行的簡化付款已為 "{模式}" | simplification-mode-fixture.ts | Direct DB mode setting; source facts and revision unchanged; full source-derived exact balances retained. |
| T025 | Given: 結清交易在寫入部分調整後將發生錯誤 | transaction-fault-fixture.ts | Worker-local private hook after actual first adjustment insert, exact trip/owner/command matching and reached flag. |
| T026 | Given: 舊付款安排取得後帳本已有新的支出 | stale-arrangement-fixture.ts | Separate locked transaction personal10/revision increment; old arrangement command retained and old sources/history preserved. |
| T027 | When: owner 以目前旅行路徑 "{操作}" 另一旅行子資源 | cross-trip-operation.ts | Operation enum maps exact current trip plus real other-trip child to one GET/PATCH/DELETE; captures both trip snapshots. |
| T028 | When: 未登入者嘗試讀取分帳結算 | unauthenticated-settlement.ts | Cookie-free request context proved before single settlement GET; anonymous identity baseline retained. |
| T029 | When: 非 owner 帳號嘗試 "{操作}" 分帳資源 | unauthorized-operation.ts | Fourteen operations use real existing IDs, valid payloads/current key, foreign session and trusted Origin for writes. |
| T030 | When: owner 以舊版個人支出欄位記錄機票 | legacy-expense-command.ts | One legacy-shaped POST with reserved UUID, omits splitting fields; checks persisted owner-only payer/share and original date. |
| T031 | When: owner 僅修改既有含停用分攤者支出的項目 | inactive-expense-command.ts | One item-only PATCH, omits historical inactive payer/share fields; captures before/reply. |
| T032 | When: owner 刪除共同晚餐支出 | delete-dinner-command.ts | One body-free dinner DELETE;204/empty body, expense/share deletion and immutable history checked. |
| T033 | When: owner 刪除已有還款的原支出 | delete-paid-expense-command.ts | One body-free original expense DELETE; only source/share removed and existing payments/settlements/adjustments preserved. |
| T034 | When: owner 嘗試以 "{問題}" 保存共同支出 | invalid-expense-command.ts | Eight invalid creation payload variants sent verbatim once, real inactive/cross-trip IDs; baseline captured. |
| T035 | When: owner 嘗試以 "{問題}" 修改既有共同支出 | update-invalid-expense-command.ts | Six invalid partial PATCH variants alter only corresponding member field; original sources/revision retained for rejection. |
| T036 | When: owner 將原支出改為 JPY 200 | change-expense-currency-command.ts | One currencyCodeJPY/amount200 PATCH; new currency scale used; other fields/share/history preserved. |
| T037 | When: owner 將原支出金額改為 JPY 300 | reduce-expense-amount-command.ts | One amount300 PATCH, stable expense ID/payer/shares and complete historical facts preserved. |
| T038 | When: owner 將原支出金額改為 JPY 800 | change-expense-to-eight-hundred-command.ts | One amount800 PATCH, stable expense ID and original share set; original history later verified. |
| T039 | When: owner 將晚餐改為由 Amy 付款並由 Amy 與 Bob 分攤 JPY 200 | replace-dinner-sharing-command.ts | One atomic amount200/payerAmy/shareAmyBob PATCH; replacement DB rows, other sources and revision+1 verified. |
| T040 | When: owner 記錄平均分攤支出： | expense-fixture.ts, shared-expense-command.ts | Exactly one DataTable expense POST with raw decimal text, stable UUID/member IDs; atomic persisted source/share set. |
| T041 | When: owner 讀取遷移後的機票支出 | read-migrated-expense-command.ts | One read through actual migrated authority API/session and original expense UUID; no migration replay. |
| T042 | When: owner 以另一裝置工作階段讀取旅行成員 | cross-device-members-command.ts | Fresh valid session/API context for same auth user; one members GET and full source equality; BDD cleanup. |
| T043 | When: owner 刪除同行者 "{成員}" | delete-member-command.ts | One body-free member DELETE with pre-command complete source baseline and retained response. |
| T044 | When: owner 嘗試對自己的固定成員執行 "{操作}" | fixed-owner-member-command.ts | Owner member enum chooses one name PATCH/status PATCH/DELETE; no extra command. |
| T045 | When: owner 將同行者 "{原名}" 改名為 "{新名}" | rename-member-command.ts | One raw-name PATCH; preserves original alias/stable ID and only updates aliases after persistence. |
| T046 | When: owner 將同行者 "{成員}" 設為 "{狀態}" | member-status-command.ts | One isActive-only PATCH for enum status; persisted flag or complete unchanged rejection sources. |
| T047 | When: owner 新增同行者 "{名稱}" | create-member-command.ts | Reserved UUID/raw-name POST; records auth-table baseline, persisted companion fields and stable name alias. |
| T048 | When: owner 以變造的確認資料送出超額還款 | tampered-overpayment-command.ts | Alters actual issued token character with same shape and same original UUID/payment; one POST. |
| T049 | When: owner 嘗試記錄 "{問題}" 的獨立還款 | invalid-repayment-command.ts | Eight single invalid repayment variants, valid baseline fields except selected problem, correct real IDs. |
| T050 | When: owner 明確確認同一筆 JPY 700 的超額還款 | confirm-overpayment-command.ts | One confirmation POST with original UUID/payment and complete server-issued token snapshot; success persistence read; original error remains available. |
| T051 | When: owner 查詢旅行實際還款紀錄 | read-repayments-command.ts | One authenticated repayment list GET, stores original status/body without modifying history. |
| T052 | When: owner 記錄 Amy 向 Alice 的 JPY "{金額}" 獨立還款 | independent-repayment-command.ts | Raw amount preserved in one independent POST; accepted201 or409 warning; cash kind/link/no settlement adjustments checked. |
| T053 | When: owner 以 JPY "{實付}" 結清 Amy 向 Alice 的安排 | settle-amy-command.ts | Original exact arrangement and two reserved UUIDs sent once; success1settlement+1cash+2adjustments; failure full rollback. |
| T054 | When: owner 以 JPY 34 結清 Bob 向 Alice 的剩餘安排 | settle-bob-command.ts | Only Bob current100/3 key/revision and fresh IDs submitted once with34/date; keeps Amy historical IDs. |
| T055 | When: owner 將簡化付款切換為 "{模式}" | change-simplification-command.ts | One mode-only PATCH; captures source baseline and persisted setting/revision on success. |
| T056 | When: owner 查詢旅行分帳結算 | read-settlement-command.ts | One owner settlement GET; original full projection/revision/keys retained; before/after source equality. |
| T057 | When: owner 查證先前已保存的結清紀錄 | recover-settlement-command.ts | One GET by original committed settlement UUID; no second POST. |
| T058 | When: 兩個裝置同時結清 Amy 向 Alice 的同一安排 | concurrent-settlement-command.ts | Fresh same-owner sessions, two distinct commands in Promise.all and private pre-lock barrier requiring both arrivals; no chosen winner. |
| T059 | Then: 分帳結算回覆未登入且不揭露帳務 | unauthenticated-settlement-result.ts | 401 privacy excludes accounting/auth fields; DB/source owner re-read unchanged and no companion auth identities/ACL credentials. |
| T060 | Then: 分帳資源拒絕存取且不揭露帳務 | unauthorized-rejection.ts | 404 shape/message equivalence with missing resource; foreign-owner privacy, both owners unchanged and owner can read full shares/history/projection. |
| T061 | Then: 跨旅行子資源存取被拒絕且來源不變 | cross-trip-result.ts | 404 same missing-child response, no other-trip source disclosure; both snapshots unchanged and correct-path full child reads. |
| T062 | Then: 原支出修正後的歷史結清快照保持不變 | preserved-settlement-history.ts | Historical100 obligation/33 cash/±67 adjustments unchanged by correction/delete; exact record and cash GET plus current source-derived balance/arrangements. |
| T063 | Then: 已記錄還款保持原事實 | preserved-repayment-history.ts | Every previous payment/history row unchanged; list and individual full DTO re-reads twice. |
| T064 | Then: 支出修改被拒絕且舊分攤與安排完全保留 | rejected-expense-update.ts | Problem-specific400/404; complete old expense/share/history/revision equality; detail/list/totals/exact settlement repeated unchanged. |
| T065 | Then: 既有停用成員的分攤集合保持原值 | preserved-inactive-shares.ts | Only item changes; inactive Carol share/payer/history preserved in DB and API and her exact liability remains. |
| T066 | Then: 晚餐已不再影響帳本與結算 | deleted-dinner-result.ts | 204/empty response, deleted expense/share absent; detail404/list empty and source-derived zero settlement. |
| T067 | Then: 晚餐的新份額為 Amy 與 Bob 各 JPY 100 | replaced-dinner-shares.ts | Persisted Amy payer/200/shareAmyBob replacement and exact100 each; other source fields unchanged; response and detail GET. |
| T068 | Then: 機票保留原始欄位且僅由 owner 付款分攤 | personal-flight-expense-result.ts | Legacy create or migrated read status, original8000TWD/date/category, sole owner share8000; totals and zero settlement; original migrated fields unchanged. |
| T069 | Then: 該支出的分攤份額為： | expense-share-result.ts | Full nonzero participant set equals DB/request; independent amount/count arithmetic, each exact fraction and exact total; detail re-read. |
| T070 | Then: 該旅行的付款安排為： | expense-arrangements-result.ts | Independent pairwise graph from expenses/shares/payments/paired adjustments and complete explicit table/API set; no self/extra/old edges. |
| T071 | Then: 兩個裝置看到同一組穩定成員 | cross-device-members-result.ts | Same auth identity/new session with exact four stable member sets and unique owner; no new member and sources unchanged. |
| T072 | Then: 同行者 "{成員}" 已從旅行移除 | deleted-member-result.ts | 204 empty body, only unused companion removed, no cascaded history, revision+1; detail404/list exclude/triprevision reads. |
| T073 | Then: 同行者 "{成員}" 的狀態為 "{狀態}" | member-status-result.ts | Only target flag changes, stable ID/history and revision+1; detail/list plus complete source-derived optional-zero balances. |
| T074 | Then: 改名後 "{名稱}" 仍沿用原成員身分 | renamed-member-result.ts | Same original ID/role/trip/nameKey updated; every financial ID reference unchanged; detail/list name resolution and exact old balances. |
| T075 | Then: 新增同行者以名稱 "{名稱}" 保存 | created-companion-result.ts | 201 equals reservedUUID, trim/nameKey/companion active, revision+1; detail/list; auth tables unchanged and anonymous access denied. |
| T076 | Then: 先前還款與其他幣別來源保持不變 | preserved-other-currency-sources.ts | Prior cash rows and other-currency/full source facts unchanged; other-currency arrangements equal source-only oracle. |
| T077 | Then: 實際還款保留各次付款事實 | repayment-facts-result.ts | All individual400/600 DTO facts match DB in paidOn/id descending order, separate IDs and individual GETs. |
| T078 | Then: 獨立還款已以 JPY "{金額}" 保存 | saved-independent-repayment-result.ts | Original201 response equals exact reserved cash row, amount/date/kind/link; no settlement/adjustment, revision+1; list and detail. |
| T079 | Then: 獨立還款後的付款安排如下： | expense-arrangements-result.ts, repayment-arrangements-result.ts | Complete cross-currency source-only arrangements/table and repeat projection/key/revision equality; Initial B1 resolved: original Act201 is now required before reads. |
| T080 | Then: 變造確認未獲接受且沒有保存還款 | rejected-tampered-overpayment.ts | Any4xx accepted,500 rejected; reserved UUID absent, full sources/revision unchanged; original600 arrangements and repeated GET. |
| T081 | Then: 超額還款尚未保存並回傳 JPY 100 的反向應付警告 | overpayment-warning-result.ts | Exact409 closed warning shape/token/revision/reverse endpoints/excess100 and message700/600/100; no write, original key projection. |
| T082 | Then: 分帳來源紀錄維持操作前內容 | preserved-splitting-sources.ts | All source business columns unchanged, permits metadata/timestamps; owner list/details of expenses/payments/history and exact shares. |
| T083 | Then: 各幣別淨額精確總和為零 | zero-sum-result.ts | Independent BigInt per-currency reduced rational sum0, all nonzero source rows required, optionalzero; repeated same revision; product pure invariants. |
| T084 | Then: 同一安排最多只保存一次完整結清 | concurrent-settlement-result.ts | Both actual barrier arrivals, exactly201/409, winner atomic rows+exact paired adjustments/rev+1, loser UUIDs absent, complete response/GET/zero tail. |
| T085 | Then: 成員的分幣別精確淨額如下： | member-balances-result.ts | Full table member/currency nets match independent all-source oracle; unlisted must zero, nonzero cannot omitted; same revision repeated. |
| T086 | Then: 最新實付後的直接與簡化安排皆依來源重建 | rebuilt-payment-history-result.ts | ModePATCH200/current revision, history unchanged, exact Bob70/3JPY/TWD300, Amy0; independent both-mode scenario oracle with no Then mode mutation. |
| T087 | Then: 查證取得同一份結清與實付紀錄 | recovered-settlement-result.ts | Original200 committed IDs/obligation100/3/cash33/date/pair±1/3 match DB; cash/record re-read with no new history. |
| T088 | Then: 相同資料的結算安排可重現 | reproducible-settlement-result.ts | Ten read-only GETs preserve all projection fields, ordering, keys, counts/explanation/revision and DB snapshot. |
| T089 | Then: 簡化付款設定已保存為 "{模式}" | saved-simplification-result.ts | PATCH200/DB/trip/settlement projections match mode/new revision; fresh same-owner session persistence proof; source reads unchanged. |
| T090 | Then: 簡化前後每位成員的精確淨額不變 | mode-balance-invariance-result.ts | Before source-derived full per-member/currency balance oracle unchanged after mode; complete optional-zero API set and exact separate zero sums. |
| T091 | Then: 簡化建議的付款筆數不多於直接安排 | simplification-count-result.ts | Independent remaining-amount-sorted candidate plus direct source graph and fallback count guarantee; no lost nonzero balance; actual product calculator fallback test. |
| T092 | Then: 結清失敗不留下任何部分帳務紀錄 | failed-settlement-result.ts | Actual faultReached mandatory;500 private error, full rollback/revision and reservedIDs404; original exact key/debt retained and source zero sums. |
| T093 | Then: 結清差額的兩位成員調整為： | settlement-adjustments-result.ts | 201+DB+GET exactly two signed opposite adjustments; independent obligation-paid fraction, cash/date/link/amount and revision+1. |
| T094 | Then: 結清後原支出與分攤集合保持不變 | preserved-settled-expense-result.ts | All original expense/share rows unchanged; original100 snack/date/category/payer/three100/3 exact shares via detail/list. |
| T095 | Then: 結清紀錄沒有取整方式欄位 | no-rounding-policy-result.ts | Closed response and actual full DB schema/row fields exclude strategy/policy, original IDs and cash link, full record/cash re-read. |
| T096 | Then: 結算中沒有任何待付款安排 | no-outstanding-arrangements-result.ts | Empty arrangements/count0 and exact source nets0 including subminor fractions; repeated projection and no write. |
| T097 | Then: 結算付款安排如下： | expense-arrangements-result.ts, settlement-arrangements-result.ts | Complete explicit table plus independent selected-mode graph, counts, exact amounts, unique current keys and stablecurrency/debtor/creditor order; reread. |
| T098 | Then: 結算說明以三句內描述付款對象與筆數變化 | simplification-explanation-result.ts | Three-sentence neutral Chinese semantic Alice→Carol,2→1/net/source unchanged; actual graph/oracle matched. |
| T099 | Then: 結算說明指出付款安排無需調整 | unchanged-arrangement-explanation-result.ts | Three-sentence semantic no adjustment needed while Amy→Alice500 remains1; exact graph/net/source unchanged; repeated projection. |
| T100 | Then: 該安排已由正數實付關閉 | positive-settlement-closed-result.ts | 201 original snapshot/full record/cash facts, exact obligation-paid pair throughT093, same source expenses; no Amy tail and all other source obligations retained. |
| T101 | Then: 該安排沒有反向付款或殘餘尾差 | no-settlement-remainder-result.ts | Independent cross-multiply proof original obligation+cash+signed adjustment exactly cancels; no reverse/pair edge and complete exact current net/arrangements. |
| T102 | Then: 點心所有安排結清且全體沒有尾差 | sequential-settlement-result.ts | Bob34/±2/3 persisted, original Amy33/±1/3 history unchanged, exact three100/3 source and zero current balances/empty arrangements; Closed cash-list DTO excludes extra strategy fields there; Initial B2 resolved: original201/full record/no-policy shape now checked; global storage verifier retained. |
| T103 | Then: 新旅行同時具有唯一固定 owner 成員 | new-trip-owner-result.ts | Creating POST already contains ownerMemberId; unique stable active owner/name/role+defaultmode/revision match DB and trip/members re-reads without repair. |
| Reused backend/shared T064 | Given 使用者"甲"已登入 | backend.ts login → seedIdentity | Isolated auth identity and valid persisted session; stable owner relationship used by createTrip. |
| Reused backend/trips T103 | When 使用者"甲"建立未填日期的"日本旅行" | backend.ts createTrip | Fresh preallocated UUID, authenticated trusted-Origin POST only; name and omitted dates preserved; response retained forT103 new owner Then. |

Additional checks: no skipped/fallback rows; only type imports of product rational types in test oracles; all monetary arithmetic uses BigInt, Number conversions are minorUnit metadata only. Legacy fixture uses real formal migration and per-scenario cleanup. Concurrent/fault hooks remain isolated internal DI; barrier and fault-reached are asserted. Existing source-only oracle treats debtor adjustment once and verifies the opposite paired fact. Optional zero balances are accepted while every nonzero source balance is mandatory.


---

# T218 independent frontend DSL review

Scope: T104–T217 (114 rows), all ten 005 frontend feature files, root/frontend module DSL semantics, Phase 3 Boundary and direct helpers. Read-only review: no repository files changed. Full bddgen, tests typecheck and full-feature RED execution are owned by root.

## Initial findings — resolved by root remediation review above

### F1 — P2 — T157/T189 do not prove that the product retains the original member draft UUID

- Location: `apps/web/tests/support/splitting/unconfirmed-member-result.ts:127`; UI draft check at lines 85–97; `create-member.ts` obtains the UUID only from the submitted POST and assigns the World key itself.
- Required: members DSL `同行者畫面保留 Carol 並提示保存結果尚未確認` explicitly retains the original UUID and prevents new-ID resubmission.
- Gap: comparison against `splitting:browserMemberCommandId` compares test-side values. The app can query the original UUID, retain Carol and unknown text, then allocate a replacement pending UUID without issuing it yet; every existing assertion passes.
- Fix: read the actual real form pending UUID before submission and reassert it after the unknown outcome (for example the existing repayment/settlement `data-command-id` seam bound to the real POST draft state). Keep Then read-only and add a negative case changing only the current form UUID.
- Same-pattern review: repayment T130/T196/T203/T205 and settlement T136/T140/T215 already inspect real form metadata; recovery T202/T216 checks actual original GET plus single POST. Expense correction uses the existing expense UUID path rather than a new command UUID.

### F2 — P2 — T180 does not assert the complete visible share-member set

- Location: `apps/web/tests/support/splitting/nonsharing-payer-result.ts:122–124`.
- Required: expenses DSL states `畫面/API shares集合恰Amy/Bob各50、payer=Alice`.
- Gap: the API/source projection asserts exactly two members, but the UI only contains Amy50/Bob50 and does not contain Alice50. An extra visible Alice0 or Alice33.33 share row still passes. This is the specific regression the non-sharing-payer example is intended to prevent.
- Fix: reuse the existing read-only `assertMemberShareDisplay(card, ['Amy', 'Bob'], 'JPY 50')`, which checks the entire visible share list and its row count. Keep Alice payer display as a separate assertion; add a negative UI fixture with an extra Alice share row.

## Boundary observations

- No additional business write was found in Then helpers. Active/deleted member option inspection and renamed-history refresh/navigation are explicitly allowed by their DSL; those paths monitor writes and re-read authority.
- Lost-response success is obtained through real server forwarding and verified commit, then dropped. Temporary browser 404 is deliberately distinct from the actual original record 200. No fabricated API success found.
- BigInt source-only oracles, original historical cash/settlement/adjustment snapshots, exact fractions, zero balances and complete nonzero sets are used. Visible rounded text is not an accounting oracle.
- Approved initialDraft null-payer and actual draft UUID metadata seams were treated as permitted future product boundary contracts.
- Isolated calendar specs cover desktop/mobile controls and dialog bounds. The later UI gate retains bottom-sheet visual review responsibility.

## Row coverage

| Task | Direct helper(s) | Review result |
| --- | --- | --- |
| T104 | `settled-arrangement-fixture.ts` | Real latest arrangement POST, 33 cash fact, opposite 1/3 adjustments, immutable history saved. |
| T105 | `independent-repayment-fixture.ts` | Real independent-payment POST and original UUID GET; date, DTO and non-overpayment authority preserved. |
| T106 | `fixture.ts` | Exact table names/UUIDs, March 11/null category/false mode, true expenses/settlement/totals, no navigation. |
| T107 | `calendar-keyboard.ts` | Actual focused calendar ArrowRight then Enter; no form save; focus/evidence captured. |
| T108 | `calendar-escape.ts` | Single Escape on existing calendar; no date editing or submission. |
| T109 | `preserved-browser-sources.ts` | Original full expense/share/payment facts compared, only explicitly confirmed cash addition permitted. |
| T110 | `member-balances-screen-result.ts` | Complete member/currency table, signed exact oracle and zero sum; visible direction and max-two-decimal strings. |
| T111 | `calendar-result.ts` | Original date and trigger focus; hidden dialog, no writes, unchanged authority. |
| T112 | `selected-calendar-result.ts` | Selected input value, hidden dialog, original focus, readable non-overflow controls and unchanged authority; isolated desktop/mobile bounds checks. |
| T113 | `legacy-browser-fixture.ts` | True old-schema migration and proxy of actual upgraded authority bytes; no invented backfill. |
| T114 | `expense-draft.ts` | Real valid snack draft and member radio/checkbox selection; zero POST. |
| T115 | `missing-payer-draft.ts` | Approved real ExpenseForm initialDraft seam for null payer; real providers/session/API; valid remaining draft. |
| T116 | `empty-expense-shares.ts` | Real checkbox clear-all with valid payer and other fields; zero POST. |
| T117 | `expense-calendar.ts` | Custom date textbox/dialog, March 11 focus, no native date input; no writes. |
| T118 | `lost-expense-correction.ts` | Real PATCH succeeds before response abort; 200/3 authority and blocked original lookup/projections retained. |
| T119 | `mobile-saved-fixture.ts` | Fresh 375px context same owner reads saved facts and records stable IDs; disposed afterward. |
| T120 | `other-trip-amy-fixture.ts` | Real same-owner second trip Amy; current trip only owner; current aliases remain clean. |
| T121 | `member-directory-fixture.ts` | Exact Alice active owner/Amy active/Bob inactive directory, no financial facts, real page query. |
| T122 | `member-lost-response-fixture.ts` | Real successful POST before abort, original lookup blocked and captured, one new member/revision; cleanup hook. |
| T123 | `referenced-member-fixture.ts` | Real three-way lunch 300 and independent 20; stable member ID, exact -80 net, original histories. |
| T124 | `unreferenced-carol-fixture.ts` | Real Carol POST + detail/list; all financial references absent; refresh directory. |
| T125 | `inactive-referenced-member-fixture.ts` | Expense reference exists before true deactivate PATCH; same member and prior history/net preserved. |
| T126 | `stale-member-deletion-fixture.ts` | Original deletion dialog retained while separate owner session commits a real new reference. |
| T127 | `other-account-browser-fixture.ts` | Isolated different auth session whose Amy name does not confer companion authority; separate page/context. |
| T128 | `anonymous-browser-fixture.ts` | Fresh no-session context, null get-session; known companion remains test-side data only. |
| T129 | `overpayment-warning.ts` | Real UI 700 POST gets 409 signed snapshot/token; pending warning and no saved repayment. |
| T130 | `repayment-draft.ts` | Real repayment draft with original UUID read from actual form metadata before POST. |
| T131 | `repayment-calendar.ts` | Real Alice/Amy repayment form and shared custom calendar, no save. |
| T132 | `other-trip-carol-fixture.ts` | Actual same-owner foreign Carol; clean current IDs; both complete authority snapshots. |
| T133 | `stale-overpayment-warning.ts` | Second real owner session PATCH 1000 to 900; revision/500 debt change, first browser old warning preserved. |
| T134 | `lost-repayment-response.ts` | Real POST commit before abort; actual original GET 200 checked before temporary browser 404. |
| T135 | `lost-repayment-response.ts` | Same transport fixture, original GET true 200 passed through; no fake success. |
| T136 | `settlement-form.ts` | Actual arrangement link/full fraction/revision; distinct original command/payment UUIDs read from form. |
| T137 | `settlement-screen.ts` | Already-persisted true mode asserted rather than repaired; browser trip/settlement same revision. |
| T138 | `settlement-calendar.ts` | Real 100 debt and actual settlement form/custom date calendar; no write. |
| T139 | `direct-settlement-screen.ts` | False mode arranged before tested Act, true source preservation, then real current screen reads. |
| T140 | `stale-settlement-form.ts` | Second-session snack 200 commit while first form retains old key, fraction, date and two metadata UUIDs. |
| T141 | `rejected-simplification-save.ts` | Explicit pre-write 400 failure only; old false revision/source remains unchanged. |
| T142 | `lost-settlement-response.ts` | Real atomic settlement+payment+two adjustments precede abort; original actual GET checked then temporary 404. |
| T143 | `lost-settlement-response.ts` | Available original record lookup passes through actual server bytes; no substitute success. |
| T144 | `saved-simplification-fixture.ts` | True PATCH enabled + owner GET trip/settlement and source/oracle checks; no UI toggle. |
| T145 | `save-shared-expense.ts` | Single create click with actual payload UUID, full draft; local/4xx/5xx correctly distinguished. |
| T146 | `save-expense-correction.ts` | Single original expense PATCH; genuine committed correction before abort and explicit unknown UI. |
| T147 | `delete-shared-expense.ts` | Real dinner confirmation DELETE once; source/shares removed, histories retained, current browser settlement queried. |
| T148 | `delete-shared-expense.ts` | Same delete helper on original snack UUID, histories retained; no extra payment mutation. |
| T149 | `change-expense-amount.ts` | Original expense amount-only PATCH and preserved payer/share set/history; browser current settlement same revision. |
| T150 | `replace-dinner-sharing.ts` | Single dinner PATCH 200/Amy/Amy+Bob; old contribution replaced, exact shares and current projections. |
| T151 | `change-expense-amount.ts` | Same amount helper on snack 200 preserving committed settlement/adjustment history. |
| T152 | `view-expense-shares.ts` | Current or legacy authority original expense/detail and member GET before visible share checks. |
| T153 | `deactivate-member.ts` | Existing companion UUID deactivation through actual dialog and single PATCH. |
| T154 | `delete-member.ts` | Actual unused-member deletion confirmation and single DELETE. |
| T155 | `desktop-splitting.ts` | Fresh 1280px authenticated owner context; actual members/expenses/settlement responses; cleanup. |
| T156 | `rename-member.ts` | Raw new name retained; original UUID PATCH, local or real conflict captured. |
| T157 | `create-member.ts` | Single member create and raw input; true request UUID captured. See F1: original pre-save/current draft UUID not read from product metadata. |
| T158 | `view-members.ts` | Read-only directory navigation and true members response; complete source snapshot unchanged. |
| T159 | `confirm-stale-member-deletion.ts` | Confirm original stale dialog only; real 409 MEMBER_IN_USE and current-reference baseline. |
| T160 | `reactivate-member.ts` | Reactivate original member UUID once, no replacement member or rename. |
| T161 | `expense-member-options.ts` | Only actual new expense form + members query; no save. |
| T162 | `open-repayment-members.ts` | Only actual repayment form + members query; no save. |
| T163 | `direct-splitting-access.ts` | Given actor page/context used; actual denial captured; anonymous guard accompanied by same-context backend 401 probe. |
| T164 | `save-independent-repayment.ts` | Single original repayment POST or local rejection; 5xx unknown, recovery true original GET only. |
| T165 | `cancel-overpayment.ts` | Cancel genuine warning once, dismiss confirmation, no new POST. |
| T166 | `confirm-overpayment.ts` | Explicit same original command+token confirmation; conflict optional unconfirmed warning refresh constrained. |
| T167 | `open-independent-repayment-members.ts` | Real payer/payee option controls opened by keyboard and dismissed without change or writes. |
| T168 | `view-settlement.ts` | Current persisted mode page opened, actual trip/settlement same revision and full key evidence. |
| T169 | `save-settlement.ts` | Single payment click retains full exact snapshot and two original UUIDs; no auto POST retry. |
| T170 | `open-amy-settlement.ts` | Latest Amy arrangement actual link opened; blank actual payment, no save. |
| T171 | `toggle-simplification.ts` | One readable switch activation, real PATCH then browser new-revision GET; failure preserves confirmation. |
| T172 | `toggle-simplification.ts` | Same toggle helper for false mode; source/net unchanged. |
| T173 | `expense-field-validation-result.ts` | Readable payer correction, original full draft retained, only definite rejection/local validation, complete authority unchanged. |
| T174 | `unconfirmed-expense-correction-result.ts` | Unknown correction retains 200 draft and original route, no success or false not-written claim; real after vs old confirmed state. |
| T175 | `expense-field-validation-result.ts` | Same field validation helper on empty shares, no effective source write. |
| T176 | `preserved-settlement-payment.ts` | Original complete settlement record, payment and two adjustments/IDs/date remain immutable; visible 33 history. |
| T177 | `preserved-independent-repayment-result.ts` | Original 400 independent fact/date remains; corrected 800 source, current JPY400/TWD300 screen and exact oracles. |
| T178 | `deleted-dinner-result.ts` | Original dinner UUID 404, sole source/shares gone, zero net/no arrangements; ledger disappearance checked by preceding Act. |
| T179 | `migrated-flight-result.ts` | True migrated original ID/date/category/amount/totals compared; owner-only share and no member debt. |
| T180 | `nonsharing-payer-result.ts` | Exactly Amy/Bob shares50 and payerAlice; complete exact net/direct arrangements, visible card shares; see F2 for missing complete UI member-set assertion. |
| T181 | `expense-share-display-result.ts` | Each selected member visible and accessible formatted amount; no ellipsis/fraction/formula; exact shares sum. |
| T182 | `saved-three-way-expense-result.ts` | Real saved UUID, full three-way 100/3 sources/net, visible 33.33 card; same latest authority. |
| T183 | `deactivated-member-history-result.ts` | Same inactive member identity and full expense/share/repayment history/net preserved; readable inactive row. |
| T184 | `owner-member-controls-result.ts` | No actionable owner lifecycle control in visible UI/tab order; owner GET remains active. |
| T185 | `renamed-member-history-result.ts` | Explicit DSL-permitted read-only refresh/detail/history navigation; stable renamed identity and unchanged facts. |
| T186 | `deleted-member-options-result.ts` | Deleted member 404/list absent; actual expense and repayment picker ID sets exclude deleted ID; no save. |
| T187 | `active-member-options-result.ts` | Create vs reactivate differentiated by ID/count and status; real current expense options use same active ID. |
| T188 | `member-name-conflict-result.ts` | Field-associated accessible duplicate-name error, raw input retained; members/all accounting sources unchanged. |
| T189 | `unconfirmed-member-result.ts` | See F1: UI Carol/unknown and original verification checked, but retained product draft UUID is currently not asserted. |
| T190 | `inactive-expense-options-result.ts` | Real new-expense radios/checkboxes exclude or natively disable inactive ID; all active IDs remain; history unchanged. |
| T191 | `inactive-repayment-options-result.ts` | Real repayment options exclude or natively disable inactive ID; all active IDs remain; history unchanged. |
| T192 | `private-splitting-access-result.ts` | Given actor payload/body/accessibility/no editor/tab checks plus owner full unchanged authority; own actor name allowed. |
| T193 | `referenced-member-deletion-result.ts` | True 409 MEMBER_IN_USE, same Amy still readable/referenced; accessible enabled deactivation offered but not clicked. |
| T194 | `desktop-splitting-result.ts` | Fresh desktop page and all original phone stable identities/projections; visible shares and exact net display. |
| T195 | `fully-repaid-independent-result.ts` | Two immutable independent facts 400/600 and original UUID GETs; JPY0/noJPYarrangements, TWD300 and visible history. |
| T196 | `unconfirmed-repayment-result.ts` | Real form original UUID/full400 draft retained; actual commit vs temporary404 distinguished; unknown not success. |
| T197 | `saved-partial-repayment-result.ts` | One original 400 independent repayment; no settlement/adjustment; visible JPY600/TWD300/history and actual recovery evidence. |
| T198 | `confirmed-overpayment-result.ts` | True token confirmation saves original700 independent; reverse JPY100 and TWD300, two visible histories, no adjustments. |
| T199 | `pending-overpayment-result.ts` | Real captured 409 snapshot/token/revision/excess/reverse, visible warning and choices; full authority unchanged/original404. |
| T200 | `foreign-repayment-member-result.ts` | Actual complete native option sets exclude foreign Carol ID/name; both trips preserved, no write. |
| T201 | `cancelled-overpayment-result.ts` | Cancel adds no POST; original404 and complete prior sources/JPY600/TWD300 retained. |
| T202 | `recovered-repayment-result.ts` | Existing app original UUID GET200 must occur; one POST and full saved partial-payment UI/authority checked; no Then Act. |
| T203 | `repayment-field-validation-result.ts` | Same-party draft error/readable correction, actual metadata UUID and draft retained, full authority unchanged/original404. |
| T204 | `repayment-field-validation-result.ts` | Same validation helper verifies original zero amount draft, no cash or adjustment/source change. |
| T205 | `stale-overpayment-result.ts` | Original confirmation conflict, only optional same unconfirmed command refresh; new200 warning/500 balance; old command404. |
| T206 | `closed-settlement-result.ts` | Original record/payment/obligation/two zero-sum adjustments and no residual/reverse target; visible owed vs paid summary. |
| T207 | `sequential-browser-settlement-result.ts` | Both immutable records/payments/four adjustments, exact zero all three/no debt, original100/3 shares, visible closed state. |
| T208 | `simplification-explanation-screen-result.ts` | Real direct2/suggested1 source graph and net preservation; visible <=3-sentence relation explanation and named switch. |
| T209 | `unchanged-arrangement-screen-result.ts` | Complete single500 arrangement and unchanged1/1 counts; neutral <=3-sentence text, no false no-payment statement. |
| T210 | `rejected-simplification-screen-result.ts` | Actual rejected save, false old revision/two original keys retained; readable error/retry only inspected. |
| T211 | `arrangements-screen-result.ts` | Complete true API/source-oracle arrangement set and UI groups/links/opaque keys; no extra/reverse/old debts. |
| T212 | `zero-settlement-rejected-result.ts` | Actual zero retained with aria-invalid/readable positive error; full unchanged authority and two original UUID404. |
| T213 | `empty-settlement-draft-result.ts` | Accessible owed33.33 vs blank actual input; no rounding strategy; original100/3 key/revision and no writes. |
| T214 | `stale-settlement-rejected-result.ts` | Actual409 conflict/not-found maps stale refresh guidance; single original POST, latest corrected source unchanged, UUID404. |
| T215 | `unconfirmed-settlement-result.ts` | Actual form preserves both original metadata UUIDs/date/33; browser temporary404 vs real record200; single atomic commit. |
| T216 | `recovered-settlement-result.ts` | Existing app original settlement GET200, one POST/two UUIDs/full snapshot; real atomic source and success summary. |
| T217 | `persisted-simplification-screen-result.ts` | Persisted true mode/revision/full original source/key reproduced; checked switch and full UI arrangement; no repair write. |


## T082 SQL DATE oracle correction — independent audit

Status: **PASS — zero open findings.** During paused T227 GREEN, independently reviewed only `apps/api/tests/support/splitting/preserved-splitting-sources.ts` and its direct `.spec.ts` against the authoritative backend/settlement T082 DSL. node-postgres represents SQL DATE as a local-midnight Date; converting that value to UTC can move its calendar day in Asia/Taipei. The corrected `dateOnly` reads local year/month/day, preserving the SQL calendar date and the existing string-date path. No product date behavior, truth, source comparisons, ignored-field list or permitted metadata mutation was changed. Original before/after business-row equality and owner API source re-reads remain intact. January/July guards cover standard/daylight-saving calendar contexts in the two requested timezones.

Independent verification:

- `TZ=Asia/Taipei ./scripts/pnpm.sh exec playwright test -c playwright.support.config.ts preserved-splitting-sources.spec.ts --grep 'SQL DATE projection|parameter-free'`: **2/2 PASS (2.3 seconds)**.
- `TZ=America/Los_Angeles` with the same wrapper/Playwright command: **2/2 PASS (2.3 seconds)**.
- `./scripts/pnpm.sh exec tsc -p tsconfig.tests.json --noEmit`: **PASS**.
- Focused ESLint and Prettier check for exactly the two reviewed files: **PASS** after the parent corrected one blank-line lint violation. The final change was whitespace only; passing semantic guards were not unnecessarily repeated.

Future-history isolated examples, other date helpers, future features, product code, task ticks and commits were outside this audit and were not changed or executed.


## T062 raw PostgreSQL date/timestamp projection — independent audit

Status: **PASS — zero open findings.** During paused T229 GREEN, independently reviewed only `apps/api/tests/support/splitting/preserved-settlement-history.ts` and its direct `.spec.ts` against backend/expenses T062 DSL. The recorded three whole-feature failures in `.cache/t229/green.log` were caused by the test projection shifting SQL DATE through UTC and discarding timestamp milliseconds through `String(Date)`. The repaired helper reads local calendar fields for SQL DATE and calls `toISOString()` directly on timestamp Date values; string-valued date/timestamp handling is retained. Original immutable history, paidOn, exact obligation/adjustments, full response equality and readonly source reconstruction checks remain intact. No product date behavior or acceptance expectation was changed.

The first independent timezone run identified one incompatible existing pure fixture: a UTC-midnight instant was being treated as SQL DATE local midnight. The parent changed that fixture to `new Date(2027, 0, 20)` while retaining the Jan20 expectation; this models the actual pg DATE representation rather than relaxing the assertion. Final verification:

- `TZ=Asia/Taipei ./scripts/pnpm.sh exec playwright test -c playwright.support.config.ts preserved-settlement-history.spec.ts --grep 'parameter-free|current balances|raw pg dates'`: **4/4 PASS (2.4 seconds)**.
- `TZ=America/Los_Angeles` with the same wrapper/Playwright command: **4/4 PASS (2.5 seconds)**. January/July local dates and exact `.685` timestamp milliseconds remain verified through the full historical repayment projection.
- `./scripts/pnpm.sh exec tsc -p tsconfig.tests.json --noEmit`: **PASS**; focused ESLint/Prettier for the exact two files: **PASS**; `git diff --check`: **PASS**.

Isolated future PATCH/DELETE settlement cases, other helpers, future features, product files, task ticks and commits were not changed or executed by this audit.


## T231 temporal-oracle upstream repair — independent audit

Status: **PASS — zero open findings.** Independently reviewed the new test-only `source-temporal.ts` utility and its spec, plus the three implicated helpers `positive-settlement-closed-result.ts` (T100), `recovered-settlement-result.ts` (T087) and `preserved-settled-expense-result.ts` (T094), against their authoritative backend/settlement DSL rows. The six recorded failures in `/tmp/t231-focused.log` show test-side SQL DATE UTC day shifts or Date→String timestamp millisecond loss. The utility preserves local calendar fields for SQL DATE and the original timestamp instant/milliseconds; both Date and source-string inputs are verified. All original exact amounts, IDs, snapshot fields, immutable source equality, current balance/arrangement oracles and readonly API checks remain unchanged. No product behavior, truth, earlier T062/T082 helpers or unrelated test helpers was changed by this repair/audit.

Independent checks used the existing wrapper and API support runner. For both `TZ=Asia/Taipei` and `TZ=America/Los_Angeles`, ran the four selected support files with grep `SQL DATE|SQL timestamp|accepts the original immutable record|preserves all expense columns|original expense GET|accepts 1/33/34/100`. Results: **6/6 PASS in Asia/Taipei (2.6 seconds)** and **6/6 PASS in America/Los_Angeles (2.5 seconds)**. This covers both new temporal guards and four existing pure helper guards, including rejection of altered dates/IDs/money/adjustments or rounded source shares; future mutation/isolated examples were excluded.

Focused ESLint and Prettier across exactly the five changed test files, full `tsconfig.tests.json` noEmit check and `git diff --check` all passed. No task ticks or commit were made. The parent retains responsibility for resuming T231 and rerunning its complete 14-example feature.


## T102 sequential-record timestamp repair — independent audit

Status: **PASS — zero open findings.** During paused T233 GREEN, independently reviewed exactly `sequential-settlement-result.ts` and its direct spec against backend/settlement T102 DSL. The only helper change replaces `new Date(String(settlement.created_at))` with existing `sourceTimestamp`, preserving the `.387` milliseconds already present in the raw PostgreSQL Date. Complete original201 and readonly GET record equality, Bob34/±2/3 adjustments, immutable Amy33 history, exact0/1 balances, original100/3 shares and closed no-policy fields remain unchanged. The strengthened full-record pure guard uses raw Date objects for settlement/payment created_at at `.387` and explicitly rejects a `.000` response; this improves precision coverage without relaxing an expectation. No product, other helper, truth or task state was changed by this audit.

Independent verification selected `sequential-settlement-result.spec.ts` and `source-temporal.spec.ts` under `playwright.support.config.ts` with grep `rejects malformed|requires actual rational zero|source oracle rejects|SQL DATE|SQL timestamp`: **5/5 PASS in Asia/Taipei (2.2 seconds)** and **5/5 PASS in America/Los_Angeles (2.2 seconds)**. Only the three existing pure sequential guards and two temporal guards ran; the isolated feature mutation case was excluded. Exact two-file ESLint/Prettier, full tests TypeScript noEmit and `git diff --check` all passed. Parent owns resumption of the complete T233 feature/support run; no task ticks or commit made.


## Legacy expense pagination fixture compatibility — independent audit

Status: **PASS — zero open findings.** During paused T235 GREEN, independently reviewed the exact tracked diff in `apps/api/tests/support/expenses.spec.ts` and the existing seedExpense implementation. The baseline `.cache/t235-verification/legacy-support-baseline.log` proves the old bulk INSERT failed in Arrange on the new required payer_member_id, before any cursor API Act. The repair replaces only that Arrange statement with53 calls to the existing schema-compatible direct database fixture. Owner/trip remain甲/日本旅行, unique item names remain跨頁支出1..53, each amount remainsJPY100/minorUnit0, and dates exactly retain March11−(index%3). Existing fixture transactions add the required sole-owner payer/share, preserving personal-expense semantics; no product mutation is substituted into the Arrange and no cursor, isolation, privacy, total or concurrency assertion/API Act was changed.

Independent full-file command `./scripts/pnpm.sh exec playwright test -c playwright.support.config.ts expenses.spec.ts` passed **4/4 (3.0 seconds)**, including the previously blocked50+3 pagination/cursor and account/trip/UUID privacy case, exact BIGINT/historical precision, historical-scale totals, and concurrent partial updates. Exact-file ESLint/Prettier, full tests TypeScript noEmit and `git diff --check` all passed. No product, truth, other tests, task ticks or commit were changed by this audit.


## T064 rejected-expense temporal projection — independent audit

Status: **PASS — zero open findings.** During paused T237 GREEN, independently reviewed exactly `rejected-expense-update.ts` and its direct spec against backend/expenses T064 DSL. The helper now uses existing sourceDateOnly/sourceTimestamp for the DB SQL date and timestamp fields. Correct400/404 response checking, full source/revision preservation, complete prior expense/share/history values, repeated detail/list/totals/settlement authority and exact balance/arrangement oracles remain intact; no assertion or business expectation was weakened. The pure projection guard supplies a complete original source row with local-midnight Jan20, raw Date `.674` created/updated timestamps and exact shares. It accepts the matching full projection and explicitly rejects a shifted calendar day or truncated createdAt/updatedAt.

Independent full-file command `./scripts/pnpm.sh exec playwright test -c playwright.support.config.ts rejected-expense-update.spec.ts` passed **8/8 (4.0 seconds)**, including all six actual invalid-reference PATCH rejection cases and their preserved-source readonly verification. New pure guard with `--grep 'unchanged expense projection'` additionally passed **1/1 under Asia/Taipei (2.5 seconds)** and **1/1 under America/Los_Angeles (2.4 seconds)**. Exact two-file ESLint/Prettier, full tests TypeScript noEmit and diff check passed. No product, other helper, truth, task ticks or commit were changed. Parent owns resumption of complete T237 feature verification.


## T084 concurrent-winner timestamp repair — independent audit

Status: **PASS — zero open findings.** During paused T241 GREEN, independently reviewed the one-expression replacement/import in `concurrent-settlement-result.ts` against backend/settlement T084 DSL. Existing sourceTimestamp now preserves raw PostgreSQL winner-record Date milliseconds instead of losing them through String(Date). Barrier proof, either-winner handling, exactly201/409, complete atomic winner rows and revision+1, losing UUID absence, original source equality, complete winning201/GET record/payment equality, and exact no-tail settlement checks are unchanged. No race or response assertion was relaxed, and no mirror test was added. The product mode-PATCH issue is separate and was not edited or reviewed by this temporal audit.

Independent command `./scripts/pnpm.sh exec playwright test -c playwright.support.config.ts concurrent-settlement-result.spec.ts source-temporal.spec.ts` passed **5/5 (2.4 seconds)**: both pure winner/partial-save counterexample guards, actual private-barrier concurrency and readonly durable verification, plus both existing temporal guards. Actual concurrent responses were201/409 and losing resources404. `TZ=America/Los_Angeles` with the existing source-temporal support file passed **2/2 (1.8 seconds)**; the utility had already passed explicit dual-timezone audits. Focused helper ESLint/Prettier, full tests TypeScript noEmit and diff check passed. No product, truth, task tick or commit changes; parent owns resumption of complete T241 feature verification.


## T061 cross-trip child projection temporal repair — independent audit

Status: **PASS — zero open findings.** During paused T245 GREEN, independently reviewed `cross-trip-result.ts` against backend/account T061 DSL. Replacing its local iso/date conversion functions with aliases of the existing sourceTimestamp/sourceDateOnly utility preserves raw PostgreSQL Date timestamp milliseconds and SQL calendar dates. All current-path404 equivalence/privacy checks, both trips’ complete source/revision equality, correct-parent owner GET existence/full-field responses, historical precision/share/repayment/settlement checks remain intact. No assertion or expected product response was weakened. No product, truth or other helper was changed by this audit.

Independent command `./scripts/pnpm.sh exec playwright test -c playwright.support.config.ts cross-trip-result.spec.ts source-temporal.spec.ts` passed **11/11 (5.8 seconds)**: all9 cross-trip support cases, including8 real wrong-parent operations and correct-parent full resource reads, plus both existing temporal guards. Existing utility guards also passed **2/2 under America/Los_Angeles (2.0 seconds)**, complementing prior explicit dual-timezone verification. Focused helper ESLint/Prettier, full tests TypeScript noEmit and diff check passed. No task ticks or commit made; parent owns the complete T245 eight-example feature rerun.


## T185 generated name key and T154 empty204 transport repairs — independent audit

Status: **PASS — zero open findings.** During paused T253 GREEN, independently reviewed `renamed-member-history-result.ts`/its direct spec against frontend/members T185 DSL and the generated stored name_key data contract, plus `delete-member.ts` against T154 deletion and T193 stale-reference rejection semantics.

The rename oracle now requires the target row’s name_key to equal the trimmed name with only ASCII A–Z folded to lowercase; it does not ignore the column. This correctly expects小美→Amy to yieldamy while retaining the same UUID, owner/role/status/created fields, all historical references and unchanged exact balances. The strengthened pure fixture/counterexample specifically rejects retaining the old generated key. Existing readonly refreshed expense/payment displays and no-new-write checks remain intact.

For deletion, the actual contracted status is asserted before interpreting a response. HTTP204 has no message body, so the helper avoids an unsupported browser protocol body read, records the empty representation and additionally requires content-length absent or0; the real DELETE and persisted deletion/picker assertions still prove success.409 continues to read and parse the actual complete error response and verify the member/history remain. No synthetic successful API response, new Act or product change was introduced.

Independent browser commands ran with Python fcntl exclusive locking at `/tmp/split-ledger-browser-tests.lock`, using the existing wrapper and formal web-support config:

- Full `renamed-member-history-result.spec.ts`: **4/4 PASS across Chromium/WebKit (5.5 seconds)**, including the real rename and readonly lunch/payment display verification.
- Full `delete-member.spec.ts deleted-member-options-result.spec.ts referenced-member-deletion-result.spec.ts`: **12/12 PASS across Chromium/WebKit (19.6 seconds)**, exercising real204 deletion, removed picker identity and actual409 stale-reference preservation/deactivation guidance. No new product/UI defect was observed.
- Focused lint/format for the exact changed helpers/spec, full tests TypeScript and diff check: **PASS**.

No other helper/product/truth/task tick or commit changes by this audit. Parent owns the final complete T253 feature rerun.
