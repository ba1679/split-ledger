# 任務規劃：006 旅行垃圾桶、自訂縮圖與全站等待回饋

**Plan package**: `specs/plans/006-trip-management-and-loading`  
**建立日期**: 2026-11-14  
**狀態**: 288/292已完成；T001–T286、T288、T292 `[X]`。T287真機/讀屏與T289 UI審查依2026-11-17使用者指示略過；T290/T291 UI基準回填/核對暫緩。2026-11-18使用者已回覆人眼驗證ok並授權merge main；原四項框保留，不宣稱真機／讀屏或原完整獨立UI審查已通過。

**核心輸入**: `spec.md`、`plan.md`、`research.md`、`truth-delta.md`、`dsl-refine-review.md`、`ui/ui-plan.md`，以及 `specs/truth/techstack.md`、`specs/truth/contracts/**`、`specs/truth/data/data-model.dbml`、受影響 `specs/truth/features/**`。

## 任務綁定契約

- 本輪 truth delta：techstack／API／data 的新增與修改落在相應功能產品碼；feature owner 的20 ADD feature、230 ADD DSL與1 MODIFY DSL形成下列測試對齊與功能任務。2 NOOP群保留原帳務／日期／隔離規則與根DSL。沒有DELETE或DSL權威位置搬移，不安排REMOVE或CODE-REMOVE。
- Phase 1只處理新增技術；Phase 2只建可重用骨架；Phase 3每句DSL一筆任務，全批binding/測試碼審查後只先解鎖Phase 4首個產品schema slice，其runtime複核完成後才依鏈解鎖其餘功能。各feature用 `[BDD-GREEN] → [BDD-REFACTOR]`，不在功能階段補RED。
- 每筆任務完成需保存當時程式版本、focused範圍、命令、案例數、exit與證據；未跑或受阻保持未勾。不得把先前規格parser成功當產品BDD成功。
- 本清單沒有重做需求、API、data或設計的任務；已批准範圍直接沿用。規格實際矛盾才回交owner，不修改truth／設計遷就產品缺陷。

## UI 分流、固定依據與資源

- 本計畫混合A／C：後端資料交易與API安全責任為A；新增旅行管理、垃圾桶、縮圖及全站等待呈現為C。跨模組路由／元件綁定見各Feature與 `dsl-refine-review.md` 的畫面對照。
- 固定現況整合起點：Git `8fc9f94134c66ffd29918014b950894b1007aa86` 的 `specs/ui-baseline/split-ledger.pen`、README、ledger-baseline.md、expense-create-baseline.md及同版previews；當前.pen SHA-256 `144a81b3086885bf57f5a694a78ed75f089f032730f91767088598ed1572a3d3`。保留原baseline-v0.1／v0.2／v0.3有效確認及未改範圍，不以後來基準取代006設計提案。
- 本次變更依據：`ui/split-ledger-006.pen` design-v7，SHA-256 `6c33bce25da872057d253a44bd0e59dec1f0e41f974873fb6db0dfe10b6c1abc`；`ui/ui-plan.md`列出38 frame與32份PNG的共用參照。使用者2026-11-13原回覆：「確認 design-v7，我覺得這次不用 prototype 了，截圖的一些驗證也幫我拿掉，我之後會再更新 skill，讓前期規劃以設計稿為主就好」。本次沿用完整38frame批准，不重問。
- Prototype=不製作；不新增規劃期prototype、規劃期截圖比對或額外viewport矩陣。下列1440×900／390×844比對及瀏覽器矩陣是正式產品實作驗收，保留原交接要求。
- 實作時每個C範圍記錄設計／產品固定版本、同尺寸同可比資料、預期與產品畫面、差異與處理到 `validation.md`；首個代表性桌機／手機checkpoint通過，才套用其共用樣式到後續畫面。沒有變更意圖時不另設USER-CONFIRM；若有重大設計偏差，停止依賴範圍並回交使用者確認，其他成果保留。
- 基準回填適用：完成產品驗收與UI gate後，將已驗收旅行管理／縮圖／等待共享元件及受影響頁面更新到 `specs/ui-baseline/**`，保留最新基準的其他成果；另有獨立回填核對，不能把提案直接升為現況。
- `profile=low-memory-16gb`；已觀測RAM16GiB。主代理逐筆處理，最多保留一位輔助代理做獨立審查（本輪root直接實作，依T240增量補驗啟動唯一定審查者 `/root/review_006`；舊規劃代理不視為本輪存活代理），不spawn子代理；同時重型工作1、worker=1，Chromium後WebKit依序執行。不因[P]增加代理；代理到PID回收未知須明記。每次重型工作前核對壓力、程序與受管PID，服務/fixtures用finally teardown，勿終止使用者程序。
- 規劃與目前實作快照已保存於Git；目前分支 `feat/006-trip-management`，最新進度與續跑點以 `handoff.md` 為準。T001–T286與T288已完成各筆適用驗證；Phase3增量補驗及獨立審查、完整工程/產品回歸見validation。T287/T289人工UI驗證及T290/T291基準工作依使用者指示暫緩；T292已保存工程交付例外，原完整plan未全部驗證；歷史scope提交保留；2026-11-18已取得人工UI接受並授權提交／推送及合併main，未執行正式部署命令。

## 執行入口與完整矩陣

### 2026-11-17 使用者確認的精準回歸方式

- 使用者確認續跑時，重構只重驗實際受影響範圍。每筆先記錄改動、直接及間接消費者、重驗集合與沿用證據理由；無依賴的鄰近功能不因 source hash 改變而整批重跑。
- 保留當前完整 Feature Test Scope、Chromium/WebKit、DSL 指定裝置與最終 T288 完整整合回歸。DSL 已固定裝置的案例不因 project 名稱另重複計數；未指定裝置者依原契約補齊桌機/手機。
- 重構檢查後無必要變更時可記錄 NOOP，不為完成 marker 額外改碼。共用元件、hook cleanup、權限或交易改動仍按真實消費者擴大回歸；無法確定影響則擴大驗證。
- 歷史驗證紀錄保留；遺失的本機 raw 不宣稱已重新核對。新驗證存 `.cache/implement-006-resume/`。

以下命令均從repo根目錄，以 `./scripts/pnpm.sh` 選用 `.cache/toolchain`（Node24.22.2／pnpm11.25.0）；缺工具時先完成Setup，不用預設shell Node20執行repo。不要輸出.env或cookie。

- BDD生成：`./scripts/pnpm.sh exec bddgen -c apps/api/playwright.config.ts`，前端改 `apps/web/playwright.config.ts`；全批Phase 3之後兩端均不得undefined／ambiguous step。focused RED可用測試側臨時scope入口只引入已備妥的句型閉包，不修改truth、不skip缺失句、不將缺失依賴當成功。
- API focused：`./scripts/pnpm.sh exec playwright test -c apps/api/playwright.config.ts --project=api --workers=1 --grep '<該Feature名稱或tag>'`；Feature名稱/tag從每phase的Test Scope解析，不以任意選三個案例代替整檔。完整API不加grep。
- Web focused：同上改 `apps/web/playwright.config.ts --project=chromium`，完成後另跑`--project=webkit`。測試fixture由DSL的裝置欄位設定手機/桌機；未明示裝置的新前端案例在兩尺寸各跑一次（用測試側project或參數化，維持既有project名稱/可選scope）；有裝置欄位者忠實採表列裝置。執行帳列出每個pickle／browser／viewport組合，不把228前端規格案例數當最終瀏覽器執行數。
- 新增規格基數：API182、Web228，合計410；既有功能回歸另計。全量時以當次bddgen/`--list`收集實際案例清單，確認涵蓋所有27 backend＋28 frontend feature；不可累加不同產品版本的局部通過。
- 支援回歸：`./scripts/pnpm.sh exec playwright test -c playwright.support.config.ts --workers=1`；web-support與ui-quality各以 `--project=chromium --workers=1`、再WebKit；`playwright.deployment.config.ts`、`playwright.smoke.config.ts`同樣依配置逐project執行。全部使用隔離DB/虛構帳號。
- 品質入口：`./scripts/pnpm.sh typecheck`、`lint`、`format:check`、`test:unit`、`build`；完整矩陣在整合階段一次完成。focused通過後不無故重跑，若共享元件／程式版本變更則依影響重驗。

## 已完成的測試盤點（不是implement任務）

- 唯一歸屬已重核：兩端topology通過；受影響5個模組230新句目前無existing exact-phrase binding，需RED；既有1句需ALIGN。各句的權威DSL與代表RED入口直接列在Phase 3 task，不另維護生成的文字/行號索引。
- MODIFY句位於 `specs/truth/features/frontend/expenses/dsl.md` 的「晚餐不再出現且沒有晚餐造成的分攤與付款安排」；既有綁定 `apps/web/tests/steps/expenses/phase-1b/T178.ts`、helper `apps/web/tests/support/splitting/deleted-dinner-result.ts`。原完整shares/付款安排斷言保留，新增trip state=active才確認expense404；產品落點為 `apps/web/src/features/expenses/save-outcome.ts`、`ExpenseForm.tsx`。回歸 `shared-expense-corrections-and-recalculation.feature`、`pagination-and-save-outcomes.feature`、support/save-outcomes.spec.ts。
- API沿用 `apps/api/tests/support/fixtures.ts`、world.ts、database.ts、seed.ts、splitting/transaction-fault-fixture.ts及獨立有理數oracle；web沿用 `apps/web/tests/support/fixtures.ts`、browser.ts與各page object。現有BDD configs以fail-on-gen處理missingSteps，原worker=2，實作執行一律CLI覆寫1。
- Spec與research要求的Linux binary、RSS/CPU、真機選圖與含bytea備份還原屬工程/人工證據，不偽造新產品介面；功能/錯誤/權限/狀態均已由truth feature承接，不用工程測試替代。

## Phase 1: Setup

**Goal**: 固定新增圖片技術與執行環境，完成無產品行為的smoke。

- [X] T001 加入固定版本圖片依賴與lockfile
  - Read: `specs/truth/techstack.md` → 圖片上傳／處理；`research.md` → 決策2～5。
  - 在apps/api/package.json加入 `@fastify/multipart@10.1.8`、`sharp@0.35.5` 並更新pnpm-lock.yaml；核對Node24.22.2／pnpm11.25.0。僅依套件必要性配置最小allowBuilds/optional binary，不全域放行、不實作endpoint。

- [X] T002 配置影像執行環境與單worker測試入口
  - Dependencies: T001。
  - Read: `specs/truth/techstack.md` → 測試／部署；`scripts/pnpm.sh`、apps/api/package.json、現有Playwright配置。
  - 設定可重現的macOS/目標Linux sharp optional binary安裝；檢查隔離DB連線與正式migration runner可用、browser安裝入口、worker=1覆寫。只建環境/設定，不新增schema、purge或UI行為。

- [X] T003 執行新技術smoke並保存工具鏈證據
  - Dependencies: T002。
  - Read: `research.md` → 已執行的有限技術實驗；`specs/truth/techstack.md`。
  - 用實際sharp轉一張測試PNG為WebP並讀metadata，Fastify測試實例註冊multipart解析單檔；只驗套件可載入／parser/binary運作，記錄版本/平台/exit於validation.md的Setup節，不宣稱產品邊界/E2E通過。

## Phase 2: Foundational

**Goal**: 建立共用落點與fixture擴充骨架，不提前做產品Green或DSL row實作。

- [X] T004 建立後端旅行管理與圖片模組落點骨架
  - Dependencies: T003。
  - Read: `truth-delta.md` → data/API owner；apps/api/src/modules/trips/index.ts、splitting/trip-scope.ts、src/db/schema.ts。
  - 只做：建立內部型別、依賴注入及生命週期/圖片/收據模組的檔案邊界與編譯可用介面。
  - 不做：SQL migration、DB表、route成功回覆、狀態轉移、purge或解碼策略。

- [X] T005 建立API資料對照與交易屏障支援骨架
  - Dependencies: T004。
  - Read: apps/api/tests/support/fixtures.ts、world.ts、database.ts、splitting/transaction-fault-fixture.ts；`specs/truth/data/data-model.dbml`。
  - 只做：擴充scenario context的穩定識別/版本/快照型別、可控stream/時鐘/交易屏障接口與teardown；保留正式DB/transaction真實性。
  - 不做：Given資料語意、Then斷言、為測試自建產品表或繞過trigger。實際fixture實作隨各DSL RED。

- [X] T006 建立影像測試資產與完整性工具骨架
  - Dependencies: T005。
  - Read: `specs/truth/features/backend/trips/dsl.md` → 圖片格式／容量／metadata句群；現有API support。
  - 只做：建立測試資產目錄、原始檔hash/decoder元資料型別、可生成各格式與邊界檔的工具入口；存取以隔離暫存目錄及finally清理。
  - 不做：產品轉碼策略或偽造任一圖片Given結果；各真實fixture/可解碼邊界驗證於對應DSL RED落地。

- [X] T007 建立前端頁面操作與查證觀測骨架
  - Dependencies: T006。
  - Read: apps/web/tests/support/fixtures.ts、browser.ts、save-outcomes.spec.ts與splitting支援。
  - 只做：建立trips/thumbnail/loading的page-object邊界、request計數／回應屏障／viewport排程／object URL觀測接口，擴充timeout用可控屏障且finally釋放。
  - 不做：對應句型stepdef、假後端結果、繞過UI送出或完整產品流程。

- [X] T008 建立共用等待元件與圖片API整合的型別落點
  - Dependencies: T007。
  - Read: apps/web/src/components/QueryState.tsx、FormDialog.tsx、ui/button.tsx、src/api/index.ts；`ui/ui-plan.md` → 共用狀態。
  - 只做：建立待用狀態型別/props及檔案邊界、保持既有export與編譯；不先在使用者頁面接入。
  - 不做：spinner-only、骨架、草稿保存、路由、操作查證或任何新使用者可見行為。

## Phase 3: Test Alignment & Implementation

**Goal**: 全批對齊230新增DSL及1修改句；不寫產品碼。

**DSL 參照**:

- 每筆task均直接列唯一模組dsl.md、完整句型與代表RED的feature/Rule入口。代表入口只用來定位單句測試；本句的全部消費情境按同模組feature查找，仍需在各對應Feature Green整檔覆蓋。逐句證據分列實跑RED／產品前序受阻，後者保持runtime待驗到對應Green。讀該row的 `StepDef 實作語意`；Given/When讀落地／回寫／不必查，Then讀response、DB、再讀、不該發生與跨視角責任。五模組的006句群均不引用root DSL，既有MODIFY feature使用的root rows依原義保留且已有binding，不重複列RED。
- 所有task共同讀 `truth-delta.md` → `/dsl-refine`對應五模組ADD／單句MODIFY列，及 `dsl-refine-review.md` 的驗收覆蓋與畫面對照。對應row的Gherkin參數／DataTable／預設值不得由stepdef自行猜測。

**Markers**:

- `[BDD-RED]`：新增且尚無stepdef的句，完成時binding可生成且完整測試語意已寫出；在Arrange可成立的focused scope執行RED，失敗為產品行為或正式斷言，不得undefined、ambiguous、空實作或TODO。尚待006產品schema的案例明列runtime待驗，不假稱全部句已實際跑到。
- `[BDD-ALIGN]`：更新既有測試到新版單句契約，保留其原帳務斷言。
- 沒有DELETE，不安排 `[BDD-REMOVE]`。三者均不寫產品碼。

**Shared Must Read**:

- 各task的精確DSL row、其使用的truth feature、`truth-delta.md`與 `dsl-refine-review.md`。
- API：`apps/api/tests/support/fixtures.ts`／world.ts、現有steps/{module}/；Web：`apps/web/tests/support/fixtures.ts`、現有steps/{module}/與page object。既有MODIFY另讀T178/helper及focused支援測試。

**Boundary**:

- 一句一task，只改該句stepdef/assertion及直接測試helper。不修改產品schema/route/UI，不藉fixture補產品表、鬆trigger、fake收據或跳過驗收。
- RED時尚無006產品migration，fixture可先用明確的權威schema存在斷言回報缺失產品能力；不得以relation-not-found／一般fixture exception當可接受RED。實際資料須在產品schema存在後落到真DB。phase review確認所有句已綁定、真實資料路徑完整且沒用前置檢查掩蓋後續未寫斷言。
- 全批結束兩端bddgen均無missing/ambiguous，全部新case可列出；expected RED逐檔記錄與來源，不能只到第一個schema斷言就宣稱其他斷言已驗證。T240驗binding生成與測試碼完整性，對schema尚未存在而未到達的句明列runtime待驗。T241在產品migration落地後重跑backend新scope，將已可執行/仍待purge或圖片API等產品前序能力者逐句分列，實際Given/When/Then覆蓋與產品RED來源皆據實記錄；各前端Green先完成其可達性複核，再取得真實全scope Green。這些首次runtime複核不新增/省略DSL測試，也不把前置失敗標為最終通過。
- 同模組單一檔案多人修改易衝突，[P]只標邏輯獨立；目前low-memory逐筆回寫，重用唯一定義，不建立動態萬用step繞過row契約。

**Parallel Hint**:

- 下列逐句任務可在有限預算以互不衝突檔案平行；本輪預設全批、不分backend/frontend波次，最後獨立review通過只先解鎖T241正式schema slice，T241的獨立runtime複核通過後才依序解鎖其餘Feature。既有審查者只讀測試與證據、不自行修補。

- [X] T009 [P] [BDD-RED] `旅行生命週期基準為 "{狀態}"`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/旅行垃圾桶與復原.feature` → `@B006-001`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `旅行生命週期基準為 "{狀態}"`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T010 [P] [BDD-RED] `owner 執行旅行命令 "{操作}"`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/旅行垃圾桶與復原.feature` → `@B006-001`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `owner 執行旅行命令 "{操作}"`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T011 [P] [BDD-RED] `旅行專屬資料與帳務對照完全一致`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/旅行垃圾桶與復原.feature` → `@B006-002`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `旅行專屬資料與帳務對照完全一致`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T012 [P] [BDD-RED] `其他旅行與共用資料保持原狀`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/旅行垃圾桶與復原.feature` → `@B006-002`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `其他旅行與共用資料保持原狀`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T013 [P] [BDD-RED] `命令拒絕為 "{錯誤}" 且沒有部分變更`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/整趟永久刪除.feature` → `@B006-008`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `命令拒絕為 "{錯誤}" 且沒有部分變更`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T014 [P] [BDD-RED] `旅行以同一身分成為垃圾桶`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/旅行垃圾桶與復原.feature` → `@B006-001`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `旅行以同一身分成為垃圾桶`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T015 [P] [BDD-RED] `旅行以同一身分成為一般可用`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/旅行垃圾桶與復原.feature` → `@B006-003`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `旅行以同一身分成為一般可用`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T016 [P] [BDD-RED] `owner 讀取 "{清單}" 旅行清單`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/旅行垃圾桶與復原.feature` → `@B006-005`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `owner 讀取 "{清單}" 旅行清單`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T017 [P] [BDD-RED] `清單只包含 "{狀態}" 的本人旅行`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/旅行垃圾桶與復原.feature` → `@B006-005`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `清單只包含 "{狀態}" 的本人旅行`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T018 [P] [BDD-RED] `整趟旅行清除後才提交永久刪除結果`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/整趟永久刪除.feature` → `@B006-007`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `整趟旅行清除後才提交永久刪除結果`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T019 [P] [BDD-RED] `垃圾桶旅行已保留 180 天且期間未要求永久刪除`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/旅行垃圾桶與復原.feature` → `@B006-011`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `垃圾桶旅行已保留 180 天且期間未要求永久刪除`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T020 [P] [BDD-RED] `下一次 "{操作}" 在交易中途會明確失敗`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/旅行競爭與結果查證.feature` → `@B006-012`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `下一次 "{操作}" 在交易中途會明確失敗`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T021 [P] [BDD-RED] `交易失敗回報錯誤且全部權威資料回滾`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/旅行競爭與結果查證.feature` → `@B006-012`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `交易失敗回報錯誤且全部權威資料回滾`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T022 [P] [BDD-RED] `前次 "{操作}" 已明確失敗且故障已解除`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/旅行競爭與結果查證.feature` → `@B006-013`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `前次 "{操作}" 已明確失敗且故障已解除`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T023 [P] [BDD-RED] `本次 "{操作}" 完整成功而沒有重複資料`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/旅行競爭與結果查證.feature` → `@B006-013`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `本次 "{操作}" 完整成功而沒有重複資料`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T024 [P] [BDD-RED] `owner 讀取垃圾桶旅行的 "{資源}"`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/垃圾桶存取與擁有者隔離.feature` → `@B006-014`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `owner 讀取垃圾桶旅行的 "{資源}"`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T025 [P] [BDD-RED] `owner 對垃圾桶旅行送出 "{寫入}"`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/垃圾桶存取與擁有者隔離.feature` → `@B006-015`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `owner 對垃圾桶旅行送出 "{寫入}"`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T026 [P] [BDD-RED] `旅行請求的存取者為 "{存取者}"`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/垃圾桶存取與擁有者隔離.feature` → `@B006-016`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `旅行請求的存取者為 "{存取者}"`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T027 [P] [BDD-RED] `該存取者嘗試 "{存取}"`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/垃圾桶存取與擁有者隔離.feature` → `@B006-016`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `該存取者嘗試 "{存取}"`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T028 [P] [BDD-RED] `請求不洩漏他人旅行且資料不變`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/垃圾桶存取與擁有者隔離.feature` → `@B006-016`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `請求不洩漏他人旅行且資料不變`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T029 [P] [BDD-RED] `原次 "{原操作}" 已成功但回應遺失，目前為 "{目前狀態}"`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/旅行競爭與結果查證.feature` → `@B006-017`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `原次 "{原操作}" 已成功但回應遺失，目前為 "{目前狀態}"`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T030 [P] [BDD-RED] `owner 查證同一次原旅行操作`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/旅行競爭與結果查證.feature` → `@B006-017`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `owner 查證同一次原旅行操作`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T031 [P] [BDD-RED] `查證分別回傳原操作結果與目前權威狀態`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/旅行競爭與結果查證.feature` → `@B006-017`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `查證分別回傳原操作結果與目前權威狀態`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T032 [P] [BDD-RED] `owner 重送同一次原旅行操作`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/旅行競爭與結果查證.feature` → `@B006-018`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `owner 重送同一次原旅行操作`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T033 [P] [BDD-RED] `原收據重播而較新意圖保持不變`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/旅行競爭與結果查證.feature` → `@B006-018`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `原收據重播而較新意圖保持不變`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T034 [P] [BDD-RED] `原旅行操作尚無可讀取收據`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/旅行競爭與結果查證.feature` → `@B006-019`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `原旅行操作尚無可讀取收據`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T035 [P] [BDD-RED] `查無收據不等於命令失敗`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/旅行競爭與結果查證.feature` → `@B006-019`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `查無收據不等於命令失敗`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T036 [P] [BDD-RED] `本次旅行命令使用 "{衝突}"`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/旅行競爭與結果查證.feature` → `@B006-020`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `本次旅行命令使用 "{衝突}"`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T037 [P] [BDD-RED] `另一裝置的 "{先完成}" 已先取得旅行寫入順序`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/旅行競爭與結果查證.feature` → `@B006-021`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `另一裝置的 "{先完成}" 已先取得旅行寫入順序`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T038 [P] [BDD-RED] `owner 保存 JPY 500 的點心支出`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/旅行競爭與結果查證.feature` → `@B006-021`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `owner 保存 JPY 500 的點心支出`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T039 [P] [BDD-RED] `點心保存結果為 "{結果}"`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/旅行競爭與結果查證.feature` → `@B006-021`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `點心保存結果為 "{結果}"`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T040 [P] [BDD-RED] `垃圾桶中恰有一筆點心且其餘帳務保持`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/旅行競爭與結果查證.feature` → `@B006-022`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `垃圾桶中恰有一筆點心且其餘帳務保持`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T041 [P] [BDD-RED] `本次新圖片已開始處理但尚未提交`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/旅行競爭與結果查證.feature` → `@B006-023`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `本次新圖片已開始處理但尚未提交`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T042 [P] [BDD-RED] `原次圖片處理完成並嘗試保存`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/旅行競爭與結果查證.feature` → `@B006-023`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `原次圖片處理完成並嘗試保存`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T043 [P] [BDD-RED] `新圖片未落地且已生效的旅行狀態保持`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/旅行競爭與結果查證.feature` → `@B006-023`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `新圖片未落地且已生效的旅行狀態保持`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T044 [P] [BDD-RED] `待保存圖片為 "{格式}"、{大小} bytes、{寬} x {高} px`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/縮圖格式與容量邊界.feature` → `@B006-024`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `待保存圖片為 "{格式}"、{大小} bytes、{寬} x {高} px`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T045 [P] [BDD-RED] `owner 保存待選圖片為旅行縮圖`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/縮圖格式與容量邊界.feature` → `@B006-024`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `owner 保存待選圖片為旅行縮圖`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T046 [P] [BDD-RED] `有效圖片保存為唯一目前縮圖`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/縮圖格式與容量邊界.feature` → `@B006-024`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `有效圖片保存為唯一目前縮圖`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T047 [P] [BDD-RED] `圖片拒絕為 "{原因}" 且保留原縮圖`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/縮圖格式與容量邊界.feature` → `@B006-026`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `圖片拒絕為 "{原因}" 且保留原縮圖`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T048 [P] [BDD-RED] `待保存檔案內容為 "{內容}"`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/縮圖格式與容量邊界.feature` → `@B006-027`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `待保存檔案內容為 "{內容}"`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T049 [P] [BDD-RED] `本次保存包含兩張各自合法圖片`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/縮圖格式與容量邊界.feature` → `@B006-028`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `本次保存包含兩張各自合法圖片`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T050 [P] [BDD-RED] `待保存照片含方向與位置資訊且內容為 "{內容}"`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/縮圖保存與私有讀取.feature` → `@B006-029`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `待保存照片含方向與位置資訊且內容為 "{內容}"`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T051 [P] [BDD-RED] `保存結果為去除原始資訊的有界縮圖`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/縮圖保存與私有讀取.feature` → `@B006-029`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `保存結果為去除原始資訊的有界縮圖`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T052 [P] [BDD-RED] `旅行使用預設圖且舊自訂圖不可再取得`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/縮圖保存與私有讀取.feature` → `@B006-030`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `旅行使用預設圖且舊自訂圖不可再取得`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T053 [P] [BDD-RED] `owner 讀取 "{路徑}" 的縮圖`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/縮圖保存與私有讀取.feature` → `@B006-031`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `owner 讀取 "{路徑}" 的縮圖`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T054 [P] [BDD-RED] `圖片讀取符合 "{結果}" 的私有契約`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/縮圖保存與私有讀取.feature` → `@B006-031`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `圖片讀取符合 "{結果}" 的私有契約`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T055 [P] [BDD-RED] `縮圖傳輸條件為 "{條件}"`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/縮圖傳輸與提交邊界.feature` → `@B006-104`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `縮圖傳輸條件為 "{條件}"`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T056 [P] [BDD-RED] `送出本次縮圖傳輸`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/縮圖傳輸與提交邊界.feature` → `@B006-104`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `送出本次縮圖傳輸`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T057 [P] [BDD-RED] `縮圖傳輸拒絕為 "{錯誤}" 且沒有提交`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/縮圖傳輸與提交邊界.feature` → `@B006-104`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `縮圖傳輸拒絕為 "{錯誤}" 且沒有提交`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T058 [P] [BDD-RED] `一般旅行的不可變歷史與owner成員已存在`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/整趟永久刪除.feature` → `@B006-114`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `一般旅行的不可變歷史與owner成員已存在`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T059 [P] [BDD-RED] `嘗試一般 "{歷史操作}"`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/整趟永久刪除.feature` → `@B006-114`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `嘗試一般 "{歷史操作}"`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T060 [P] [BDD-RED] `一般歷史保護仍拒絕且資料完全不變`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/trips/整趟永久刪除.feature` → `@B006-114`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/trips/dsl.md` → `一般歷史保護仍拒絕且資料完全不變`；`apps/api/tests/steps/trips/`（新句落 `apps/api/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T061 [P] [BDD-RED] `餐飲分類僅被垃圾桶旅行的一筆支出引用`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/categories/垃圾桶分類引用.feature` → `@B006-032`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/categories/dsl.md` → `餐飲分類僅被垃圾桶旅行的一筆支出引用`；`apps/api/tests/steps/categories/`（新句落 `apps/api/tests/steps/categories/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T062 [P] [BDD-RED] `owner 查詢垃圾桶旅行使用的分類`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/categories/垃圾桶分類引用.feature` → `@B006-032`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/categories/dsl.md` → `owner 查詢垃圾桶旅行使用的分類`；`apps/api/tests/steps/categories/`（新句落 `apps/api/tests/steps/categories/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T063 [P] [BDD-RED] `分類使用筆數仍為 1`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/categories/垃圾桶分類引用.feature` → `@B006-032`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/categories/dsl.md` → `分類使用筆數仍為 1`；`apps/api/tests/steps/categories/`（新句落 `apps/api/tests/steps/categories/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T064 [P] [BDD-RED] `owner 刪除垃圾桶旅行使用的分類`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/categories/垃圾桶分類引用.feature` → `@B006-033`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/categories/dsl.md` → `owner 刪除垃圾桶旅行使用的分類`；`apps/api/tests/steps/categories/`（新句落 `apps/api/tests/steps/categories/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T065 [P] [BDD-RED] `分類因仍被使用而拒絕刪除`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/backend/categories/垃圾桶分類引用.feature` → `@B006-033`。
  - Dependencies: T008。
  - Read: `specs/truth/features/backend/categories/dsl.md` → `分類因仍被使用而拒絕刪除`；`apps/api/tests/steps/categories/`（新句落 `apps/api/tests/steps/categories/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T066 [P] [BDD-RED] `owner 的旅行管理畫面為 "{狀態}"`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/旅行管理與確認.feature` → `@F006-034`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `owner 的旅行管理畫面為 "{狀態}"`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T067 [P] [BDD-RED] `owner 選擇旅行操作 "{操作}"`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/旅行管理與確認.feature` → `@F006-034`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `owner 選擇旅行操作 "{操作}"`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T068 [P] [BDD-RED] `管理選單列出縮圖與移入入口而不遮罩帳本`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/旅行管理與確認.feature` → `@F006-034`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `管理選單列出縮圖與移入入口而不遮罩帳本`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T069 [P] [BDD-RED] `管理旅行選單已展開`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/旅行管理與確認.feature` → `@F006-035`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `管理旅行選單已展開`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T070 [P] [BDD-RED] `畫面進入縮圖編輯且尚未保存`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/旅行管理與確認.feature` → `@F006-035`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `畫面進入縮圖編輯且尚未保存`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T071 [P] [BDD-RED] `畫面進入移入確認且尚未保存`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/旅行管理與確認.feature` → `@F006-036`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `畫面進入移入確認且尚未保存`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T072 [P] [BDD-RED] `owner 按 Escape 關閉管理選單`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/旅行管理與確認.feature` → `@F006-037`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `owner 按 Escape 關閉管理選單`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T073 [P] [BDD-RED] `選單關閉且焦點返回管理旅行`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/旅行管理與確認.feature` → `@F006-037`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `選單關閉且焦點返回管理旅行`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T074 [P] [BDD-RED] `確認內容說明 "{後果}"`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/旅行管理與確認.feature` → `@F006-038`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `確認內容說明 "{後果}"`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T075 [P] [BDD-RED] `owner 以 "{方式}" 關閉 "{編輯}"`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/旅行管理與確認.feature` → `@F006-039`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `owner 以 "{方式}" 關閉 "{編輯}"`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T076 [P] [BDD-RED] `關閉未確認操作不改變旅行資料`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/旅行管理與確認.feature` → `@F006-039`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `關閉未確認操作不改變旅行資料`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T077 [P] [BDD-RED] `移入成功回到一般清單並更新相關入口`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/旅行管理與確認.feature` → `@F006-040`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `移入成功回到一般清單並更新相關入口`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T078 [P] [BDD-RED] `復原後原旅行重新可開啟且垃圾桶移除該項`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/旅行管理與確認.feature` → `@F006-041`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `復原後原旅行重新可開啟且垃圾桶移除該項`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T079 [P] [BDD-RED] `完成整趟清除後才顯示永久刪除成功`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/旅行管理與確認.feature` → `@F006-042`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `完成整趟清除後才顯示永久刪除成功`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T080 [P] [BDD-RED] `owner 從 "{裝置}" 的我的旅行導覽進入垃圾桶`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/旅行管理與確認.feature` → `@F006-043`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `owner 從 "{裝置}" 的我的旅行導覽進入垃圾桶`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T081 [P] [BDD-RED] `垃圾桶導覽可達且不冒用旅行內導覽`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/旅行管理與確認.feature` → `@F006-043`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `垃圾桶導覽可達且不冒用旅行內導覽`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T082 [P] [BDD-RED] `目前 "{清單}" 已成功確認沒有旅行`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/旅行管理與確認.feature` → `@F006-044`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `目前 "{清單}" 已成功確認沒有旅行`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T083 [P] [BDD-RED] `owner 開啟 "{清單}"`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/旅行管理與確認.feature` → `@F006-044`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `owner 開啟 "{清單}"`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T084 [P] [BDD-RED] `畫面呈現 "{清單}" 的真正空狀態`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/旅行管理與確認.feature` → `@F006-044`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `畫面呈現 "{清單}" 的真正空狀態`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T085 [P] [BDD-RED] `目前縮圖草稿為 "{草稿}" 且尚未保存`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖預覽與保存.feature` → `@F006-046`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `目前縮圖草稿為 "{草稿}" 且尚未保存`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T086 [P] [BDD-RED] `owner 將縮圖預覽切為 "{草稿}"`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖預覽與保存.feature` → `@F006-045`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `owner 將縮圖預覽切為 "{草稿}"`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T087 [P] [BDD-RED] `畫面預覽 "{草稿}" 並清楚標示尚未保存`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖預覽與保存.feature` → `@F006-045`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `畫面預覽 "{草稿}" 並清楚標示尚未保存`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T088 [P] [BDD-RED] `前次縮圖草稿已取消且原縮圖為富士山`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖預覽與保存.feature` → `@F006-047`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `前次縮圖草稿已取消且原縮圖為富士山`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T089 [P] [BDD-RED] `縮圖編輯顯示富士山而非已放棄草稿`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖預覽與保存.feature` → `@F006-047`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `縮圖編輯顯示富士山而非已放棄草稿`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T090 [P] [BDD-RED] `owner 取消檔案選擇`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖預覽與保存.feature` → `@F006-048`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `owner 取消檔案選擇`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T091 [P] [BDD-RED] `縮圖草稿仍為 "{草稿}" 且遠端未變`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖預覽與保存.feature` → `@F006-048`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `縮圖草稿仍為 "{草稿}" 且遠端未變`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T092 [P] [BDD-RED] `最後預覽的 "{草稿}" 成為已保存縮圖`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖預覽與保存.feature` → `@F006-049`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `最後預覽的 "{草稿}" 成為已保存縮圖`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T093 [P] [BDD-RED] `本次圖片保存將明確失敗且確定未提交`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖預覽與保存.feature` → `@F006-050`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `本次圖片保存將明確失敗且確定未提交`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T094 [P] [BDD-RED] `圖片失敗有下一步且草稿仍為 "{草稿}"`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖預覽與保存.feature` → `@F006-050`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `圖片失敗有下一步且草稿仍為 "{草稿}"`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T095 [P] [BDD-RED] `前次圖片明確失敗已解除且草稿仍可用`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖預覽與保存.feature` → `@F006-051`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `前次圖片明確失敗已解除且草稿仍可用`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T096 [P] [BDD-RED] `新增旅行草稿的照片為 "{照片}"`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/新增旅行與選填縮圖.feature` → `@F006-052`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `新增旅行草稿的照片為 "{照片}"`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T097 [P] [BDD-RED] `owner 送出新增旅行`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/新增旅行與選填縮圖.feature` → `@F006-052`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `owner 送出新增旅行`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T098 [P] [BDD-RED] `新旅行只建立一次並使用 "{圖片}"`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/新增旅行與選填縮圖.feature` → `@F006-052`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `新旅行只建立一次並使用 "{圖片}"`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T099 [P] [BDD-RED] `新增表單及選圖草稿已放棄且旅行不存在`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/新增旅行與選填縮圖.feature` → `@F006-054`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `新增表單及選圖草稿已放棄且旅行不存在`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T100 [P] [BDD-RED] `owner 在新增表單選擇 "{照片}"`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/新增旅行與選填縮圖.feature` → `@F006-055`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `owner 在新增表單選擇 "{照片}"`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T101 [P] [BDD-RED] `新增表單顯示尚未保存預覽且沒有旅行資料`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/新增旅行與選填縮圖.feature` → `@F006-055`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `新增表單顯示尚未保存預覽且沒有旅行資料`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T102 [P] [BDD-RED] `新增表單說明選圖錯誤並阻止帶錯誤直接建立`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/新增旅行與選填縮圖.feature` → `@F006-056`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `新增表單說明選圖錯誤並阻止帶錯誤直接建立`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T103 [P] [BDD-RED] `owner 移除新增表單的選圖`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/新增旅行與選填縮圖.feature` → `@F006-057`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `owner 移除新增表單的選圖`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T104 [P] [BDD-RED] `新增草稿不含照片且建立入口可用`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/新增旅行與選填縮圖.feature` → `@F006-057`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `新增草稿不含照片且建立入口可用`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T105 [P] [BDD-RED] `旅行建立將明確失敗`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/新增旅行與選填縮圖.feature` → `@F006-058`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `旅行建立將明確失敗`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T106 [P] [BDD-RED] `旅行未建立且可修正草稿保持`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/新增旅行與選填縮圖.feature` → `@F006-058`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `旅行未建立且可修正草稿保持`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T107 [P] [BDD-RED] `前次建立明確失敗已解除且照片草稿保留`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/新增旅行與選填縮圖.feature` → `@F006-059`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `前次建立明確失敗已解除且照片草稿保留`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T108 [P] [BDD-RED] `旅行已建立但圖片未保存且可同旅行重傳`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/新增旅行與選填縮圖.feature` → `@F006-060`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `旅行已建立但圖片未保存且可同旅行重傳`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T109 [P] [BDD-RED] `旅行已建立但圖片失敗且可重新上傳`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/新增旅行與選填縮圖.feature` → `@F006-061`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `旅行已建立但圖片失敗且可重新上傳`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T110 [P] [BDD-RED] `owner 重新上傳已建立旅行的圖片`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/新增旅行與選填縮圖.feature` → `@F006-061`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `owner 重新上傳已建立旅行的圖片`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T111 [P] [BDD-RED] `本次 "{操作}" 已提交但回應將遺失且暫不可查證`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖預覽與保存.feature` → `@F006-063`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `本次 "{操作}" 已提交但回應將遺失且暫不可查證`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T112 [P] [BDD-RED] `結果未確認並保留原操作的查證出口`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖預覽與保存.feature` → `@F006-063`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `結果未確認並保留原操作的查證出口`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T113 [P] [BDD-RED] `原次 "{操作}" 結果未知且現在可查證`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/旅行結果查證與舊連結.feature` → `@F006-065`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `原次 "{操作}" 結果未知且現在可查證`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T114 [P] [BDD-RED] `owner 再次查證原旅行操作`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/旅行結果查證與舊連結.feature` → `@F006-065`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `owner 再次查證原旅行操作`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T115 [P] [BDD-RED] `畫面分別顯示原次結果與目前旅行狀態`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/旅行結果查證與舊連結.feature` → `@F006-065`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `畫面分別顯示原次結果與目前旅行狀態`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T116 [P] [BDD-RED] `預設縮圖保存已送出且查證結束仍未知`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖預覽與保存.feature` → `@F006-066`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `預設縮圖保存已送出且查證結束仍未知`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T117 [P] [BDD-RED] `關閉後原圖片操作仍可查證且沒有撤銷命令`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖預覽與保存.feature` → `@F006-066`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `關閉後原圖片操作仍可查證且沒有撤銷命令`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T118 [P] [BDD-RED] `旅行已在另一裝置成為 "{狀態}" 且本裝置保留舊帳本`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/旅行結果查證與舊連結.feature` → `@F006-067`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `旅行已在另一裝置成為 "{狀態}" 且本裝置保留舊帳本`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T119 [P] [BDD-RED] `owner 開啟原旅行舊連結`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/旅行結果查證與舊連結.feature` → `@F006-067`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `owner 開啟原旅行舊連結`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T120 [P] [BDD-RED] `舊連結只提供 "{狀態}" 的下一步而不顯示帳務`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/旅行結果查證與舊連結.feature` → `@F006-067`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `舊連結只提供 "{狀態}" 的下一步而不顯示帳務`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T121 [P] [BDD-RED] `本次旅行 "{操作}" 將明確失敗`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/旅行結果查證與舊連結.feature` → `@F006-068`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `本次旅行 "{操作}" 將明確失敗`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T122 [P] [BDD-RED] `旅行操作失敗可重試且沒有成功假象`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/旅行結果查證與舊連結.feature` → `@F006-068`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `旅行操作失敗可重試且沒有成功假象`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T123 [P] [BDD-RED] `旅行縮圖的讀取將 "{結果}"`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖讀取與帳號清理.feature` → `@F006-069`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `旅行縮圖的讀取將 "{結果}"`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T124 [P] [BDD-RED] `owner 查看旅行卡片`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖讀取與帳號清理.feature` → `@F006-069`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `owner 查看旅行卡片`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T125 [P] [BDD-RED] `縮圖區域保留位置且旅行識別與入口可用`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖讀取與帳號清理.feature` → `@F006-069`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `縮圖區域保留位置且旅行識別與入口可用`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T126 [P] [BDD-RED] `縮圖使用預設呈現且等待已結束`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖讀取與帳號清理.feature` → `@F006-070`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `縮圖使用預設呈現且等待已結束`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T127 [P] [BDD-RED] `圖片讀取已失敗且owner已開啟原旅行帳本`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖讀取與帳號清理.feature` → `@F006-071`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `圖片讀取已失敗且owner已開啟原旅行帳本`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T128 [P] [BDD-RED] `owner 保存 TWD 100 的早餐支出`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖讀取與帳號清理.feature` → `@F006-071`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `owner 保存 TWD 100 的早餐支出`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T129 [P] [BDD-RED] `早餐成功保存且圖片失敗沒有改壞帳務`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖讀取與帳號清理.feature` → `@F006-071`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `早餐成功保存且圖片失敗沒有改壞帳務`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T130 [P] [BDD-RED] `Alice 已查看私人旅行與垃圾桶且有未保存照片預覽`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖讀取與帳號清理.feature` → `@F006-072`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `Alice 已查看私人旅行與垃圾桶且有未保存照片預覽`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T131 [P] [BDD-RED] `Alice 登出並切換為 Carol 帳號`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖讀取與帳號清理.feature` → `@F006-072`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `Alice 登出並切換為 Carol 帳號`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T132 [P] [BDD-RED] `Carol 畫面只含自己的資料且舊預覽已釋放`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖讀取與帳號清理.feature` → `@F006-072`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `Carol 畫面只含自己的資料且舊預覽已釋放`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T133 [P] [BDD-RED] `新縮圖上傳會在提交前中斷且確定未保存`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖預覽與保存.feature` → `@F006-095`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `新縮圖上傳會在提交前中斷且確定未保存`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T134 [P] [BDD-RED] `上傳等待結束且原縮圖與帳務維持`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖預覽與保存.feature` → `@F006-095`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `上傳等待結束且原縮圖與帳務維持`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T135 [P] [BDD-RED] `owner 已在 "{裝置}" 開啟旅行選圖介面`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖限制與選圖錯誤.feature` → `@F006-098`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `owner 已在 "{裝置}" 開啟旅行選圖介面`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T136 [P] [BDD-RED] `owner 查看可選圖片條件`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖限制與選圖錯誤.feature` → `@F006-098`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `owner 查看可選圖片條件`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T137 [P] [BDD-RED] `選圖介面揭露靜態單張格式與全部上限`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖限制與選圖錯誤.feature` → `@F006-098`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `選圖介面揭露靜態單張格式與全部上限`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T138 [P] [BDD-RED] `待選圖片不合規原因為 "{原因}"`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖限制與選圖錯誤.feature` → `@F006-099`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `待選圖片不合規原因為 "{原因}"`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T139 [P] [BDD-RED] `owner 嘗試保存這次不合規選圖`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖限制與選圖錯誤.feature` → `@F006-099`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `owner 嘗試保存這次不合規選圖`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T140 [P] [BDD-RED] `畫面說明 "{原因}" 並保留原已保存資料`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖限制與選圖錯誤.feature` → `@F006-099`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `畫面說明 "{原因}" 並保留原已保存資料`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T141 [P] [BDD-RED] `前次選圖已因 "{原因}" 被拒絕且現在備有合法JPEG`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖限制與選圖錯誤.feature` → `@F006-100`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `前次選圖已因 "{原因}" 被拒絕且現在備有合法JPEG`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T142 [P] [BDD-RED] `owner 改選合法JPEG並保存縮圖`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖限制與選圖錯誤.feature` → `@F006-100`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `owner 改選合法JPEG並保存縮圖`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T143 [P] [BDD-RED] `合法新圖可讀取且錯誤與等待已結束`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖限制與選圖錯誤.feature` → `@F006-100`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `合法新圖可讀取且錯誤與等待已結束`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T144 [P] [BDD-RED] `owner 在 "{裝置}" 備有合法 "{格式}" 照片`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖限制與選圖錯誤.feature` → `@F006-101`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `owner 在 "{裝置}" 備有合法 "{格式}" 照片`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T145 [P] [BDD-RED] `owner 選圖預覽後保存該照片`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖限制與選圖錯誤.feature` → `@F006-101`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `owner 選圖預覽後保存該照片`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T146 [P] [BDD-RED] `另一裝置可讀相同旅行的已保存縮圖`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖限制與選圖錯誤.feature` → `@F006-101`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `另一裝置可讀相同旅行的已保存縮圖`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T147 [P] [BDD-RED] `其他裝置已使縮圖提交的 "{衝突}" 過期`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/旅行結果查證與舊連結.feature` → `@F006-102`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `其他裝置已使縮圖提交的 "{衝突}" 過期`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T148 [P] [BDD-RED] `owner 提交目前圖片草稿`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/旅行結果查證與舊連結.feature` → `@F006-102`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `owner 提交目前圖片草稿`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T149 [P] [BDD-RED] `畫面說明衝突並保留目前權威狀態`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/旅行結果查證與舊連結.feature` → `@F006-102`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `畫面說明衝突並保留目前權威狀態`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T150 [P] [BDD-RED] `不合法選圖仍留在新增旅行草稿`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/新增旅行與選填縮圖.feature` → `@F006-105`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `不合法選圖仍留在新增旅行草稿`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T151 [P] [BDD-RED] `owner 嘗試提交仍有選圖錯誤的新增旅行`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/新增旅行與選填縮圖.feature` → `@F006-105`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `owner 嘗試提交仍有選圖錯誤的新增旅行`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T152 [P] [BDD-RED] `選圖錯誤阻止建立且保留可修正內容`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/新增旅行與選填縮圖.feature` → `@F006-105`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `選圖錯誤阻止建立且保留可修正內容`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T153 [P] [BDD-RED] `建立旅行已送出但原次建立結果尚未確認`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/新增旅行與選填縮圖.feature` → `@F006-106`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `建立旅行已送出但原次建立結果尚未確認`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T154 [P] [BDD-RED] `站內處理原次建立的遺失回應`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/新增旅行與選填縮圖.feature` → `@F006-106`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `站內處理原次建立的遺失回應`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T155 [P] [BDD-RED] `建立結果未知保留表單照片且只查原旅行`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/新增旅行與選填縮圖.feature` → `@F006-106`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `建立結果未知保留表單照片且只查原旅行`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T156 [P] [BDD-RED] `原次建立結果未知且現在狀態可確認為一般可用`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/新增旅行與選填縮圖.feature` → `@F006-107`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `原次建立結果未知且現在狀態可確認為一般可用`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T157 [P] [BDD-RED] `owner 再次查證原次旅行建立`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/新增旅行與選填縮圖.feature` → `@F006-107`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `owner 再次查證原次旅行建立`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T158 [P] [BDD-RED] `原旅行確認後才續存同旅行照片`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/新增旅行與選填縮圖.feature` → `@F006-107`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `原旅行確認後才續存同旅行照片`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T159 [P] [BDD-RED] `原旅行命令 "{操作}" 查證中且本輪無法確認`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/旅行結果查證與舊連結.feature` → `@F006-108`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `原旅行命令 "{操作}" 查證中且本輪無法確認`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T160 [P] [BDD-RED] `本輪旅行操作查證結束仍未知`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/旅行結果查證與舊連結.feature` → `@F006-108`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `本輪旅行操作查證結束仍未知`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T161 [P] [BDD-RED] `旅行操作停止忙碌且保留原次查證入口`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/旅行結果查證與舊連結.feature` → `@F006-108`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `旅行操作停止忙碌且保留原次查證入口`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T162 [P] [BDD-RED] `原次預設圖片結果未知且編輯曾關閉再返回`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖預覽與保存.feature` → `@F006-109`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `原次預設圖片結果未知且編輯曾關閉再返回`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T163 [P] [BDD-RED] `owner 查證返回後的原次圖片保存`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖預覽與保存.feature` → `@F006-109`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `owner 查證返回後的原次圖片保存`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T164 [P] [BDD-RED] `返回後仍確認同一次預設圖片保存`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖預覽與保存.feature` → `@F006-109`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `返回後仍確認同一次預設圖片保存`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T165 [P] [BDD-RED] `前次圖片上傳在提交前中斷且現已恢復連線`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖預覽與保存.feature` → `@F006-113`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `前次圖片上傳在提交前中斷且現已恢復連線`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T166 [P] [BDD-RED] `owner 重試中斷後的圖片保存`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖預覽與保存.feature` → `@F006-113`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `owner 重試中斷後的圖片保存`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T167 [P] [BDD-RED] `重試圖片保存成功且沒有殘留等待`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/trips/縮圖預覽與保存.feature` → `@F006-113`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/trips/dsl.md` → `重試圖片保存成功且沒有殘留等待`；`apps/web/tests/steps/trips/`（新句落 `apps/web/tests/steps/trips/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T168 [P] [BDD-ALIGN] `晚餐不再出現且沒有晚餐造成的分攤與付款安排`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/expenses/shared-expense-corrections-and-recalculation.feature` → `Rule: 刪除共同支出後移除其付款安排`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/expenses/dsl.md` → 本句；`apps/web/tests/steps/expenses/phase-1b/T178.ts`、`apps/web/tests/support/splitting/deleted-dinner-result.ts`；更新state-first斷言，保留原shares/安排及再讀驗證。

- [X] T169 [P] [BDD-RED] `原支出刪除結果未知且旅行目前為 "{狀態}"`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/expenses/旅行生命週期下的刪除查證.feature` → `@F006-103`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/expenses/dsl.md` → `原支出刪除結果未知且旅行目前為 "{狀態}"`；`apps/web/tests/steps/expenses/`（新句落 `apps/web/tests/steps/expenses/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T170 [P] [BDD-RED] `owner 查證原次支出刪除`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/expenses/旅行生命週期下的刪除查證.feature` → `@F006-103`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/expenses/dsl.md` → `owner 查證原次支出刪除`；`apps/web/tests/steps/expenses/`（新句落 `apps/web/tests/steps/expenses/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T171 [P] [BDD-RED] `支出刪除查證呈現 "{結果}"`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/expenses/旅行生命週期下的刪除查證.feature` → `@F006-103`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/expenses/dsl.md` → `支出刪除查證呈現 "{結果}"`；`apps/web/tests/steps/expenses/`（新句落 `apps/web/tests/steps/expenses/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T172 [P] [BDD-RED] `支出草稿未提交且另一裝置已將旅行移入垃圾桶`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/expenses/旅行生命週期下的刪除查證.feature` → `@F006-110`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/expenses/dsl.md` → `支出草稿未提交且另一裝置已將旅行移入垃圾桶`；`apps/web/tests/steps/expenses/`（新句落 `apps/web/tests/steps/expenses/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T173 [P] [BDD-RED] `owner 從舊表單保存點心`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/expenses/旅行生命週期下的刪除查證.feature` → `@F006-110`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/expenses/dsl.md` → `owner 從舊表單保存點心`；`apps/web/tests/steps/expenses/`（新句落 `apps/web/tests/steps/expenses/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T174 [P] [BDD-RED] `舊表單說明垃圾桶狀態並提供復原下一步`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/expenses/旅行生命週期下的刪除查證.feature` → `@F006-110`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/expenses/dsl.md` → `舊表單說明垃圾桶狀態並提供復原下一步`；`apps/web/tests/steps/expenses/`（新句落 `apps/web/tests/steps/expenses/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T175 [P] [BDD-RED] `全站 "{畫面}" 的 "{內容}" 初讀為 "{結果}"`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/全站初讀與局部等待.feature` → `@F006-073`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `全站 "{畫面}" 的 "{內容}" 初讀為 "{結果}"`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T176 [P] [BDD-RED] `owner 開啟全站 "{畫面}"`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/全站初讀與局部等待.feature` → `@F006-073`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `owner 開啟全站 "{畫面}"`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T177 [P] [BDD-RED] `指定內容顯示結構骨架且不提前顯示空值`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/全站初讀與局部等待.feature` → `@F006-073`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `指定內容顯示結構骨架且不提前顯示空值`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T178 [P] [BDD-RED] `該內容已在等待且本次讀取即將成功`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/全站初讀與局部等待.feature` → `@F006-074`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `該內容已在等待且本次讀取即將成功`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T179 [P] [BDD-RED] `原次資料讀取完成`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/全站初讀與局部等待.feature` → `@F006-074`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `原次資料讀取完成`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T180 [P] [BDD-RED] `畫面顯示 "{內容}" 的權威資料且骨架結束`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/全站初讀與局部等待.feature` → `@F006-074`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `畫面顯示 "{內容}" 的權威資料且骨架結束`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T181 [P] [BDD-RED] `垃圾桶顯示已確認空狀態且沒有等待`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/全站初讀與局部等待.feature` → `@F006-075`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `垃圾桶顯示已確認空狀態且沒有等待`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T182 [P] [BDD-RED] `站內身分確認尚未完成`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/全站初讀與局部等待.feature` → `@F006-076`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `站內身分確認尚未完成`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T183 [P] [BDD-RED] `使用者開啟網站`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/全站初讀與局部等待.feature` → `@F006-076`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `使用者開啟網站`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T184 [P] [BDD-RED] `身分確認有圖形與輔助語意且不洩漏私人內容`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/全站初讀與局部等待.feature` → `@F006-076`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `身分確認有圖形與輔助語意且不洩漏私人內容`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T185 [P] [BDD-RED] `新增支出必要選項 "{選項}" 尚在讀取`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/全站初讀與局部等待.feature` → `@F006-077`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `新增支出必要選項 "{選項}" 尚在讀取`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T186 [P] [BDD-RED] `owner 檢視新增支出選項`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/全站初讀與局部等待.feature` → `@F006-077`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `owner 檢視新增支出選項`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T187 [P] [BDD-RED] `局部選項等待且必要內容未齊不能保存`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/全站初讀與局部等待.feature` → `@F006-077`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `局部選項等待且必要內容未齊不能保存`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T188 [P] [BDD-RED] `owner 已備妥 "{操作}" 且命令將延遲後成功`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/全站操作忙碌與防重複.feature` → `@F006-078`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `owner 已備妥 "{操作}" 且命令將延遲後成功`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T189 [P] [BDD-RED] `owner 執行全站操作 "{操作}"`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/全站操作忙碌與防重複.feature` → `@F006-078`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `owner 執行全站操作 "{操作}"`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T190 [P] [BDD-RED] `操作等待以置中圖形保留尺寸與操作語意`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/全站操作忙碌與防重複.feature` → `@F006-078`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `操作等待以置中圖形保留尺寸與操作語意`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。
  - 2026-11-17 `/tasks` 增量補驗：原ADD row/RED binding與已完成的BDD證據保留，沒有新DSL句或新binding；只補本句漏盤點的既有回歸 `apps/web/tests/support/splitting/owner-overview-feedback.spec.ts` 375/1280兩案例。T288實際RED為該檔期待status class=sr-only，但design-v7/S08與本句要求可見置中圖形；不改產品/DSL/truth、不鬆金額、導航、尺寸、防重複及付款斷言。以可見spinner/可及名稱/無可見等待文字/置中及尺寸穩定取代過期class契約。
  - 補驗 Scope/Read：上述完整support檔；`spec.md` FR-014/015、`plan.md` UI等待決策、`ui/ui-plan.md` design-v7共用狀態；同row與F006-078切換簡化付款。root DSL新增句群不使用，無新根row。
  - 完成證據：原失敗保留；新375/1280×Chromium/WebKit共4案例整檔、target lint/format；既有F006-078 desktop/mobile兩engine同版通過證據可沿用（本次只改未被BDD import的support檔）。實際實作者完成回寫後才解鎖T240補驗審查。不要求把已Green產品故意改紅。
  - 第二補驗實跑：Chrome/WebKit各1完整empty/offline/pending/unknown/confirmed-save case PASS（各4.1s），target lint/format0，DB0。只改pending等待斷言；shared assertSpinnerOnly用於status spinner（不施加到可聚焦button），原label opacity0保持尺寸且不塗繪文字。原owner4case獨立審查維持。
  - 第二補驗範圍（`/tasks`）：`apps/web/tests/support/ui-quality.spec.ts` 的empty/offline/pending/unknown/confirmed-save案例仍用「儲存中…」作button name，實際RED已保存；同一F006-078/T190 row要求原「儲存支出」名稱、busy/status可理解及spinner-only。只替換此過期pending斷言為原save disabled/aria-busy、可及名稱與可見圖形/隱藏可見label、尺寸穩定；保留所有離線/草稿/unknown/重新查證/成功/DB斷言。375px案例×兩engine整段通過及target lint/format後重回T240獨立補驗。既有owner4case及其獨立審查保留、不重做；此前T288單獨已完成的CSS tablet修正另列版本，不是本次Phase3產品改碼。
  - 補驗實跑2026-11-17：Chromium2/2(7.5s)、WebKit2/2(9.9s)，lint/format0，子DB0；產品/既有BDD binding零變更。新可見/無可見文字/可及名稱/置中斷言通過，原軌道selector縮為.switch-track以排除新增spinner span；原24px/44px/帳務/付款/導航斷言完整保留。cache `t190-supplement-*`，T240待獨立review。


- [X] T191 [P] [BDD-RED] `原次 "{操作}" 正在處理且完成屏障可釋放`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/全站操作忙碌與防重複.feature` → `@F006-079`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `原次 "{操作}" 正在處理且完成屏障可釋放`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T192 [P] [BDD-RED] `owner 在等待中連續再次觸發相同操作`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/全站操作忙碌與防重複.feature` → `@F006-079`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `owner 在等待中連續再次觸發相同操作`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T193 [P] [BDD-RED] `操作只得到一個 "{結果}" 的已確認結果`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/全站操作忙碌與防重複.feature` → `@F006-079`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `操作只得到一個 "{結果}" 的已確認結果`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T194 [P] [BDD-RED] `使用者未登入且站內Google登入將延遲`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/全站操作忙碌與防重複.feature` → `@F006-080`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `使用者未登入且站內Google登入將延遲`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T195 [P] [BDD-RED] `使用者開始站內Google登入`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/全站操作忙碌與防重複.feature` → `@F006-080`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `使用者開始站內Google登入`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T196 [P] [BDD-RED] `登入控制顯示圖形與可理解的登入狀態`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/全站操作忙碌與防重複.feature` → `@F006-080`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `登入控制顯示圖形與可理解的登入狀態`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T197 [P] [BDD-RED] `原次站內登入正在等待且隨後會成功返回`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/全站操作忙碌與防重複.feature` → `@F006-081`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `原次站內登入正在等待且隨後會成功返回`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T198 [P] [BDD-RED] `登入只啟動一次且成功返回後結束等待`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/全站操作忙碌與防重複.feature` → `@F006-081`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `登入只啟動一次且成功返回後結束等待`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T199 [P] [BDD-RED] `支出已有 20 筆與確認總額且另有 5 筆未顯示`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/背景更新與分頁等待.feature` → `@F006-082`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `支出已有 20 筆與確認總額且另有 5 筆未顯示`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T200 [P] [BDD-RED] `owner 選擇載入更多支出`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/背景更新與分頁等待.feature` → `@F006-082`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `owner 選擇載入更多支出`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T201 [P] [BDD-RED] `原有支出與總額保持可見且只有尾端忙碌`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/背景更新與分頁等待.feature` → `@F006-082`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `原有支出與總額保持可見且只有尾端忙碌`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T202 [P] [BDD-RED] `第二頁支出正在讀取且原次回應可完成`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/背景更新與分頁等待.feature` → `@F006-083`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `第二頁支出正在讀取且原次回應可完成`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T203 [P] [BDD-RED] `列表恰有 25 筆不同支出且總額保持`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/背景更新與分頁等待.feature` → `@F006-083`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `列表恰有 25 筆不同支出且總額保持`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T204 [P] [BDD-RED] `已載入 25 筆支出且背景更新將 "{結果}"`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/背景更新與分頁等待.feature` → `@F006-084`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `已載入 25 筆支出且背景更新將 "{結果}"`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T205 [P] [BDD-RED] `系統進行本次背景資料更新`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/背景更新與分頁等待.feature` → `@F006-084`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `系統進行本次背景資料更新`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T206 [P] [BDD-RED] `更新僅顯示局部等待而保留全部已載入資料`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/背景更新與分頁等待.feature` → `@F006-084`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `更新僅顯示局部等待而保留全部已載入資料`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T207 [P] [BDD-RED] `舊內容保持且局部等待結束並可重試`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/背景更新與分頁等待.feature` → `@F006-085`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `舊內容保持且局部等待結束並可重試`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T208 [P] [BDD-RED] `背景更新已失敗且連線恢復`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/背景更新與分頁等待.feature` → `@F006-086`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `背景更新已失敗且連線恢復`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T209 [P] [BDD-RED] `owner 重試本次讀取`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/全站初讀與局部等待.feature` → `@F006-088`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `owner 重試本次讀取`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T210 [P] [BDD-RED] `最新已保存資料完整顯示且沒有重複`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/背景更新與分頁等待.feature` → `@F006-086`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `最新已保存資料完整顯示且沒有重複`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T211 [P] [BDD-RED] `初讀等待結束並顯示讀取錯誤與重試`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/全站初讀與局部等待.feature` → `@F006-087`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `初讀等待結束並顯示讀取錯誤與重試`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T212 [P] [BDD-RED] `旅行初讀已失敗且現在可成功取得清單`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/全站初讀與局部等待.feature` → `@F006-088`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `旅行初讀已失敗且現在可成功取得清單`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T213 [P] [BDD-RED] `支出編輯草稿已修改且本次保存將明確失敗`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/操作失敗與未知結果.feature` → `@F006-089`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `支出編輯草稿已修改且本次保存將明確失敗`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T214 [P] [BDD-RED] `owner 保存目前支出編輯草稿`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/操作失敗與未知結果.feature` → `@F006-089`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `owner 保存目前支出編輯草稿`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T215 [P] [BDD-RED] `保存等待結束且原帳務與修改草稿均保留`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/操作失敗與未知結果.feature` → `@F006-089`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `保存等待結束且原帳務與修改草稿均保留`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T216 [P] [BDD-RED] `前次支出保存明確失敗已解除且草稿保留`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/操作失敗與未知結果.feature` → `@F006-090`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `前次支出保存明確失敗已解除且草稿保留`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T217 [P] [BDD-RED] `原支出恰更新一次且呈現已確認結果`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/操作失敗與未知結果.feature` → `@F006-090`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `原支出恰更新一次且呈現已確認結果`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T218 [P] [BDD-RED] `實付結清已填合法草稿且保存會成功但回應遺失`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/操作失敗與未知結果.feature` → `@F006-091`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `實付結清已填合法草稿且保存會成功但回應遺失`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T219 [P] [BDD-RED] `owner 保存本次實付結清`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/操作失敗與未知結果.feature` → `@F006-091`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `owner 保存本次實付結清`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T220 [P] [BDD-RED] `實付結果尚未確認且不能重複新增`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/操作失敗與未知結果.feature` → `@F006-091`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `實付結果尚未確認且不能重複新增`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T221 [P] [BDD-RED] `原次實付正在查證但本輪仍無法確認`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/操作失敗與未知結果.feature` → `@F006-092`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `原次實付正在查證但本輪仍無法確認`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T222 [P] [BDD-RED] `本輪結果查證結束仍未知`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/操作失敗與未知結果.feature` → `@F006-092`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `本輪結果查證結束仍未知`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T223 [P] [BDD-RED] `停止持續動畫並保留再次查證入口及草稿`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/操作失敗與未知結果.feature` → `@F006-092`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `停止持續動畫並保留再次查證入口及草稿`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T224 [P] [BDD-RED] `原次實付結果未知且現在可查證`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/操作失敗與未知結果.feature` → `@F006-093`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `原次實付結果未知且現在可查證`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T225 [P] [BDD-RED] `owner 再次查證原實付`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/操作失敗與未知結果.feature` → `@F006-093`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `owner 再次查證原實付`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T226 [P] [BDD-RED] `原實付已確認且恰有一筆付款事實`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/操作失敗與未知結果.feature` → `@F006-093`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `原實付已確認且恰有一筆付款事實`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T227 [P] [BDD-RED] `畫面顯示等待連線而非無限處理中`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/全站初讀與局部等待.feature` → `@F006-094`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `畫面顯示等待連線而非無限處理中`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T228 [P] [BDD-RED] `owner 使用 "{裝置}" 與鍵盤讀屏且偏好減少動態效果`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/鍵盤與減少動態效果.feature` → `@F006-096`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `owner 使用 "{裝置}" 與鍵盤讀屏且偏好減少動態效果`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T229 [P] [BDD-RED] `owner 以鍵盤開啟移至垃圾桶確認`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/鍵盤與減少動態效果.feature` → `@F006-096`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `owner 以鍵盤開啟移至垃圾桶確認`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T230 [P] [BDD-RED] `確認的名稱後果與安全焦點可辨識`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/鍵盤與減少動態效果.feature` → `@F006-096`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `確認的名稱後果與安全焦點可辨識`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T231 [P] [BDD-RED] `日期保存已送出且即將 "{結果}"`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/鍵盤與減少動態效果.feature` → `@F006-097`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `日期保存已送出且即將 "{結果}"`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T232 [P] [BDD-RED] `可理解 "{結果}" 且焦點未無故移走`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/鍵盤與減少動態效果.feature` → `@F006-097`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `可理解 "{結果}" 且焦點未無故移走`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T233 [P] [BDD-RED] `日期保存進入本例指定狀態`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/鍵盤與減少動態效果.feature` → `@F006-097`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `日期保存進入本例指定狀態`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T234 [P] [BDD-RED] `所有必要支出選項已由等待恢復成功`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/全站初讀與局部等待.feature` → `@F006-111`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `所有必要支出選項已由等待恢復成功`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T235 [P] [BDD-RED] `owner 保存選項恢復後的支出`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/全站初讀與局部等待.feature` → `@F006-111`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `owner 保存選項恢復後的支出`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T236 [P] [BDD-RED] `選項等待結束且支出正常保存`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/全站初讀與局部等待.feature` → `@F006-111`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `選項等待結束且支出正常保存`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T237 [P] [BDD-RED] `旅行清單正在等待連線且網路即將恢復`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/全站初讀與局部等待.feature` → `@F006-112`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `旅行清單正在等待連線且網路即將恢復`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T238 [P] [BDD-RED] `網路恢復並完成原次旅行讀取`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/全站初讀與局部等待.feature` → `@F006-112`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `網路恢復並完成原次旅行讀取`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T239 [P] [BDD-RED] `連線等待結束且旅行資料可正常使用`
  - Test Scope（代表 RED 區塊）: `specs/truth/features/frontend/design-system/全站初讀與局部等待.feature` → `@F006-112`。
  - Dependencies: T008。
  - Read: `specs/truth/features/frontend/design-system/dsl.md` → `連線等待結束且旅行資料可正常使用`；`apps/web/tests/steps/design-system/`（新句落 `apps/web/tests/steps/design-system/trip-management/`，避免覆蓋舊task同名檔）。

- [X] T240 subagent review (phase quality gate)
  - Dependencies: T009–T239（231筆全部完成）。
  - 第二補驗審查結果：2026-11-17同一固定reviewer APPROVED/zero blocking，核對UI quality保留原斷言、2新完整流程+4原案例、1493初始/中間manifest與3檔delta；另支持CSS狹域修正及D/M像素相同，要求全management D/M/tablet及完整UIquality。不是T289 UI家族gate，T288尚待完成。
  - 補驗審查結果：2026-11-17固定未實作reviewer `/root/review_006` APPROVED/zero blocking；獨立核1493來源只有該support檔改動、4case JSON無skip/flaky/error、保留全部帳務等斷言，證據見validation T190/T240補驗及cache `t240-supplement-review.md`。
  - 2026-11-17補驗波：原231 binding/static/runtime獨立審查與T241後所有未改的產品證據維持有效；本次僅審T190補充的owner-overview工程等待斷言/完整4case證據、保留其他斷言、無產品碼變動與唯一binding不變。由未實作補驗的固定reviewer執行；零blocking才恢復[X]並解鎖T288續跑。這是原Phase3漏面補驗，不重啟已完成的首次Phase3 session checkpoint，也不重跑無依賴Feature Green。
  - Read: 全部Phase 3 task的最新diff、各DSL完整row、20新增feature與既有expense受影響file、bddgen/RED證據。
  - Evidence: 未參與受審測試實作的既有審查者核對231句唯一binding、生成案例與測試碼語意完整、參數與表格正確、真DB與原子性/請求次數斷言完整、無產品碼混入；兩端全scope生成0undefined/ambiguous、預期RED不含環境/fixture缺陷；逐句記錄實際已執行與因產品schema未落地而runtime待驗的差別，不以靜態review冒稱全部可達。記錄findings，修正再審；本次static/binding審查通過只解鎖T241，runtime待驗責任轉入T241及各scope首Green，不宣稱231句已全部觀察RED。

## Phase 4.1: ADD Feature File - backend/trips/旅行垃圾桶與復原.feature

**Goal**: 實作新生命週期schema、ID保留／收據基礎、owner狀態及清單、移入與復原，讓整份Test Scope全綠。

**Shared Must Read**:

- `specs/truth/features/backend/trips/旅行垃圾桶與復原.feature` → 全部Rule／Examples；`specs/truth/features/backend/trips/dsl.md` → 本檔全部使用句。
- `truth-delta.md` → `/dsl-refine`的本feature及DSL ADD列，並回追 `/api-plan`、`/data-plan` 對應語意列。
- `plan.md` → Wave 1資料生命週期、Wave 2權威契約；`specs/truth/contracts/groups/trips.yaml`、`specs/truth/contracts/groups/trip-management.yaml`、`specs/truth/contracts/components/schemas/trips.yaml`、`specs/truth/contracts/components/parameters.yaml` → 本Feature對應的命令、查詢、版本與錯誤定義。
- `specs/truth/data/data-model.dbml` → trips.deleted_at/lifecycle_revision/thumbnail_revision、trip_id_reservations、trip_operation_receipts、trip_thumbnails基本DDL與不可變限制、migration回填/索引；`specs/truth/techstack.md` → 本模組新技術；`research.md` → 適用決策2～9。

**受影響畫面與完成證據**: A，無直接呈現改動；前端C責任由對應後續Feature承接。後端以真DB/API與故障/競爭證據驗證，不要求無關UI批准。

**Boundary**: 先新增完整006表結構以供真fixture使用；此階段不需完成purge刪除例外或圖片HTTP處理。舊migration checksum不可改，UUID保留與create同交易、state為owner scope、移入/復原不變帳務。 限落點 `apps/api/src/db/schema.ts、新增apps/api/drizzle/0004或下一號migration、src/modules/trips/` 及該scope必要直接依賴；共享修改需跑已綠且受影響的原scope，不改truth遷就實作。

**Test Scope**:

- `specs/truth/features/backend/trips/旅行垃圾桶與復原.feature`（整檔、全部展開值；API project、worker=1）。

- [X] T241 [BDD-GREEN] 實作新生命週期schema、ID保留／收據基礎、owner狀態及清單、移入與復原
  - Dependencies: T240。
  - 先以正式新migration建立006產品schema，再重跑backend新增scope並完成本Test Scope。由原獨立審查者複核Phase3延後的runtime帳：本scope的句均實際走到、其餘scope僅可因真實待實作產品前序能力受阻，不能因未寫測試/萬用schema guard掩蓋。記錄已觀察RED與產品前序受阻的逐句差別；有undefined/fixture缺陷回修原Phase3測試，不造schema/skip/改truth。此獨立runtime複核及本scope全Green均通過才可完成T241、解鎖T242；其餘句仍需在各自Green完整走到Then才算驗證。
  - Evidence: 整檔真API/DB通過，記錄案例集合、結果與版本到validation.md；完整來源與不變條件均成立，不只回應2xx。

- [X] T242 [BDD-REFACTOR] 在綠燈下整理此功能的產品碼與直接測試支援
  - Dependencies: T241。
  - 保留public contract與行為，僅消除本scope重複／改善模組邊界；重跑同Test Scope及實際受影響既有回歸。

## Phase 4.2: ADD Feature File - backend/trips/縮圖格式與容量邊界.feature

**Goal**: 實作真實圖片驗證、受限單檔上傳與目前縮圖保存，讓整份Test Scope全綠。

**Shared Must Read**:

- `specs/truth/features/backend/trips/縮圖格式與容量邊界.feature` → 全部Rule／Examples；`specs/truth/features/backend/trips/dsl.md` → 本檔全部使用句。
- `truth-delta.md` → `/dsl-refine`的本feature及DSL ADD列，並回追 `/api-plan`、`/data-plan` 對應語意列。
- `plan.md` → Wave 1資料生命週期、Wave 2權威契約；`specs/truth/contracts/groups/trip-management.yaml`、`specs/truth/contracts/components/schemas/trips.yaml`、`specs/truth/contracts/components/parameters.yaml` → 本Feature對應的命令、查詢、版本與錯誤定義。
- `specs/truth/data/data-model.dbml` → trip_thumbnails bytes/尺寸CHECK、trips.thumbnail_revision及receipt指紋；`specs/truth/techstack.md` → 本模組新技術；`research.md` → 適用決策2～9。

**受影響畫面與完成證據**: A，無直接呈現改動；前端C責任由對應後續Feature承接。後端以真DB/API與故障/競爭證據驗證，不要求無關UI批准。

**Boundary**: 合法4格式與7邊界必須成功；4超界/16不合法/雙檔必須拒絕。保存當前WebP及基本讀取已屬本scope，不留假的回應等待下一phase。 限落點 `apps/api/src/modules/trips/圖片模組、src/app.ts的multipart唯一例外` 及該scope必要直接依賴；共享修改需跑已綠且受影響的原scope，不改truth遷就實作。

**Test Scope**:

- `specs/truth/features/backend/trips/縮圖格式與容量邊界.feature`（整檔、全部展開值；API project、worker=1）。

- [X] T243 [BDD-GREEN] 實作真實圖片驗證、受限單檔上傳與目前縮圖保存
  - Dependencies: T242。
  - T240審查新增的被動觀測前置：正式接線 `tripManagementHooks.afterThumbnailJob`，在完整圖片job（含逾時後原生處理與全部DB續體）最外層finally觸發且恰一次；不能在HTTP timeout回應時提早觸發。T057要求native gate仍held時completion=0，release後completion=1再核DB。獨立runtime審查需核實無detached後續寫入；測試registry不自行emit、不以sleep/onResponse代替。
  - Evidence: 整檔真API/DB通過，記錄案例集合、結果與版本到validation.md；完整來源與不變條件均成立，不只回應2xx。

- [X] T244 [BDD-REFACTOR] 在綠燈下整理此功能的產品碼與直接測試支援
  - Dependencies: T243。
  - 保留public contract與行為，僅消除本scope重複／改善模組邊界；重跑同Test Scope及實際受影響既有回歸。

## Phase 4.3: ADD Feature File - backend/trips/整趟永久刪除.feature

**Goal**: 完成整趟purge routine、歷史保護精確例外與永不復活，讓整份Test Scope全綠。

**Shared Must Read**:

- `specs/truth/features/backend/trips/整趟永久刪除.feature` → 全部Rule／Examples；`specs/truth/features/backend/trips/dsl.md` → 本檔全部使用句。
- `truth-delta.md` → `/dsl-refine`的本feature及DSL ADD列，並回追 `/api-plan`、`/data-plan` 對應語意列。
- `plan.md` → Wave 1資料生命週期、Wave 2權威契約；`specs/truth/contracts/groups/trip-management.yaml`、`specs/truth/contracts/groups/trips.yaml`、`specs/truth/contracts/components/schemas/trips.yaml`、`specs/truth/contracts/components/parameters.yaml` → 本Feature對應的命令、查詢、版本與錯誤定義。
- `specs/truth/data/data-model.dbml` → data-model.dbml檔尾006 purge context/鎖序/deferred checks、reservation/receipts不可變；`specs/truth/techstack.md` → 本模組新技術；`research.md` → 適用決策2～9。

**受影響畫面與完成證據**: A，無直接呈現改動；前端C責任由對應後續Feature承接。後端以真DB/API與故障/競爭證據驗證，不要求無關UI批准。

**Boundary**: owner/trip transaction-local context只允許trash相符DELETE，調整→還款→結清→份額→支出→成員→縮圖→旅行與reservation/收據同交易；不得全域停trigger或允許一般歷史UPDATE。 限落點 `apps/api/drizzle/下一號purge migration、src/modules/trips/生命週期命令` 及該scope必要直接依賴（purge-result oracle實際讀取的owner-scoped已提交receipt GET及purged兩種圖片URL正式404）；完整receipt重播／競爭仍由T253承接，reset／trash可讀仍由T245承接。共享修改需跑已綠且受影響的原scope，不改truth遷就實作。

**Test Scope**:

- `specs/truth/features/backend/trips/整趟永久刪除.feature`（整檔、全部展開值；API project、worker=1）。

- [X] T247 [BDD-GREEN] 完成整趟purge routine、歷史保護精確例外與永不復活
  - Dependencies: T244。
  - Evidence: 整檔真API/DB通過，記錄案例集合、結果與版本到validation.md；完整來源與不變條件均成立，不只回應2xx。

- [X] T248 [BDD-REFACTOR] 在綠燈下整理此功能的產品碼與直接測試支援
  - Dependencies: T247。
  - 保留public contract與行為，僅消除本scope重複／改善模組邊界；重跑同Test Scope及實際受影響既有回歸。

## Phase 4.4: ADD Feature File - backend/trips/縮圖保存與私有讀取.feature

**Goal**: 完成正規化、預設圖保存與私有圖片生命週期，讓整份Test Scope全綠。

**Shared Must Read**:

- `specs/truth/features/backend/trips/縮圖保存與私有讀取.feature` → 全部Rule／Examples；`specs/truth/features/backend/trips/dsl.md` → 本檔全部使用句。
- `truth-delta.md` → `/dsl-refine`的本feature及DSL ADD列，並回追 `/api-plan`、`/data-plan` 對應語意列。
- `plan.md` → Wave 1資料生命週期、Wave 2權威契約；`specs/truth/contracts/groups/trip-management.yaml`、`specs/truth/contracts/components/schemas/trips.yaml`、`specs/truth/contracts/components/parameters.yaml` → 本Feature對應的命令、查詢、版本與錯誤定義。
- `specs/truth/data/data-model.dbml` → trip_thumbnails一對一、只存目前圖、三種revision責任；`specs/truth/techstack.md` → 本模組新技術；`research.md` → 適用決策2～9。

**受影響畫面與完成證據**: A，無直接呈現改動；前端C責任由對應後續Feature承接。後端以真DB/API與故障/競爭證據驗證，不要求無關UI批准。

**Boundary**: EXIF方向、sRGB、無metadata、不放大不永久裁切、每邊1200／524288bytes；複雜合法fixture有界成功。舊版本404、private no-store/nosniff、trash專用路徑，不公開token URL。 限落點 `apps/api/src/modules/trips/圖片處理、私有GET/DELETE與transaction` 及該scope必要直接依賴；共享修改需跑已綠且受影響的原scope，不改truth遷就實作。

**Test Scope**:

- `specs/truth/features/backend/trips/縮圖保存與私有讀取.feature`（整檔、全部展開值；API project、worker=1）。

- [X] T245 [BDD-GREEN] 完成正規化、預設圖保存與私有圖片生命週期
  - Dependencies: T248。
  - Evidence: 整檔真API/DB通過，記錄案例集合、結果與版本到validation.md；完整來源與不變條件均成立，不只回應2xx。

- [X] T246 [BDD-REFACTOR] 在綠燈下整理此功能的產品碼與直接測試支援
  - Dependencies: T245。
  - 保留public contract與行為，僅消除本scope重複／改善模組邊界；重跑同Test Scope及實際受影響既有回歸。

## Phase 4.5: ADD Feature File - backend/trips/垃圾桶存取與擁有者隔離.feature

**Goal**: 統一全部旅行子資源active scope與owner隔離，讓整份Test Scope全綠。

**Shared Must Read**:

- `specs/truth/features/backend/trips/垃圾桶存取與擁有者隔離.feature` → 全部Rule／Examples；`specs/truth/features/backend/trips/dsl.md` → 本檔全部使用句。
- `truth-delta.md` → `/dsl-refine`的本feature及DSL ADD列，並回追 `/api-plan`、`/data-plan` 對應語意列。
- `plan.md` → Wave 1資料生命週期、Wave 2權威契約；`specs/truth/contracts/groups/trips.yaml`、`specs/truth/contracts/groups/trip-management.yaml`、`specs/truth/contracts/groups/expenses.yaml`、`specs/truth/contracts/groups/members.yaml`、`specs/truth/contracts/groups/repayments.yaml`、`specs/truth/contracts/groups/settlement.yaml`、`specs/truth/contracts/components/schemas/trips.yaml`、`specs/truth/contracts/components/parameters.yaml` → 本Feature對應的命令、查詢、版本與錯誤定義。
- `specs/truth/data/data-model.dbml` → trips普通查詢同snapshot或旅行鎖檢查、owner複合FK；`specs/truth/techstack.md` → 本模組新技術；`research.md` → 適用決策2～9。

**受影響畫面與完成證據**: A，無直接呈現改動；前端C責任由對應後續Feature承接。後端以真DB/API與故障/競爭證據驗證，不要求無關UI批准。

**Boundary**: 普通讀寫含不存在子ID先查旅行狀態，trash409與未知/他人404區別；60組owner/訪客/同行者讀寫隔離完整，不只trip主入口。 限落點 `apps/api/src/modules/splitting/trip-scope.ts、trips/expenses/members/repayments/settlement各讀寫入口` 及該scope必要直接依賴；共享修改需跑已綠且受影響的原scope，不改truth遷就實作。

**Test Scope**:

- `specs/truth/features/backend/trips/垃圾桶存取與擁有者隔離.feature`（整檔、全部展開值；API project、worker=1）。

- [X] T249 [BDD-GREEN] 統一全部旅行子資源active scope與owner隔離
  - Dependencies: T246。
  - Evidence: 整檔真API/DB通過，記錄案例集合、結果與版本到validation.md；完整來源與不變條件均成立，不只回應2xx。

- [X] T250 [BDD-REFACTOR] 在綠燈下整理此功能的產品碼與直接測試支援
  - Dependencies: T249。
  - 保留public contract與行為，僅消除本scope重複／改善模組邊界；重跑同Test Scope及實際受影響既有回歸。

## Phase 4.6: ADD Feature File - backend/categories/垃圾桶分類引用.feature

**Goal**: 保留垃圾桶分類usageCount與刪除引用保護，讓整份Test Scope全綠。

**Shared Must Read**:

- `specs/truth/features/backend/categories/垃圾桶分類引用.feature` → 全部Rule／Examples；`specs/truth/features/backend/categories/dsl.md` → 本檔全部使用句。
- `truth-delta.md` → `/dsl-refine`的本feature及DSL ADD列，並回追 `/api-plan`、`/data-plan` 對應語意列。
- `plan.md` → Wave 1資料生命週期、Wave 2權威契約；`specs/truth/contracts/groups/categories.yaml`、`specs/truth/contracts/components/schemas/categories.yaml` → 本Feature對應的命令、查詢、版本與錯誤定義。
- `specs/truth/data/data-model.dbml` → categories/expenses FK與垃圾桶引用保留；`specs/truth/techstack.md` → 本模組新技術；`research.md` → 適用決策2～9。

**受影響畫面與完成證據**: A，無直接呈現改動；前端C責任由對應後續Feature承接。後端以真DB/API與故障/競爭證據驗證，不要求無關UI批准。

**Boundary**: trash不能減少usageCount或解除引用；purge後才移除目標引用，分類本體與其他旅行不刪。 限落點 `apps/api/src/modules/categories/index.ts及分類查詢` 及該scope必要直接依賴；共享修改需跑已綠且受影響的原scope，不改truth遷就實作。

**Test Scope**:

- `specs/truth/features/backend/categories/垃圾桶分類引用.feature`（整檔、全部展開值；API project、worker=1）。

- [X] T251 [BDD-GREEN] 保留垃圾桶分類usageCount與刪除引用保護
  - Dependencies: T250。
  - Evidence: 整檔真API/DB通過，記錄案例集合、結果與版本到validation.md；完整來源與不變條件均成立，不只回應2xx。

- [X] T252 [BDD-REFACTOR] 在綠燈下整理此功能的產品碼與直接測試支援
  - Dependencies: T251。
  - 保留public contract與行為，僅消除本scope重複／改善模組邊界；重跑同Test Scope及實際受影響既有回歸。

## Phase 4.7: ADD Feature File - backend/trips/旅行競爭與結果查證.feature

**Goal**: 收斂回滾、收據重播、版本與跨裝置序列化，讓整份Test Scope全綠。

**Shared Must Read**:

- `specs/truth/features/backend/trips/旅行競爭與結果查證.feature` → 全部Rule／Examples；`specs/truth/features/backend/trips/dsl.md` → 本檔全部使用句。
- `truth-delta.md` → `/dsl-refine`的本feature及DSL ADD列，並回追 `/api-plan`、`/data-plan` 對應語意列。
- `plan.md` → Wave 1資料生命週期、Wave 2權威契約；`specs/truth/contracts/groups/trip-management.yaml`、`specs/truth/contracts/groups/expenses.yaml`、`specs/truth/contracts/components/schemas/trips.yaml`、`specs/truth/contracts/components/parameters.yaml` → 本Feature對應的命令、查詢、版本與錯誤定義。
- `specs/truth/data/data-model.dbml` → trip_operation_receipts指紋/結果、reservation最小資料、檔尾鎖序與transaction；`specs/truth/techstack.md` → 本模組新技術；`research.md` → 適用決策2～9。

**受影響畫面與完成證據**: A，無直接呈現改動；前端C責任由對應後續Feature承接。後端以真DB/API與故障/競爭證據驗證，不要求無關UI批准。

**Boundary**: 用真PostgreSQL屏障測兩種保存/移入先後；圖片處理交易外但commit前重驗；原receipt先於版本檢查、原結果與currentState分開、鎖後重讀receipt，不留部分資料。 限落點 `apps/api/src/modules/trips/收據及命令、splitting/trip-scope.ts、帳務writer、故障注入接口` 及該scope必要直接依賴；共享修改需跑已綠且受影響的原scope，不改truth遷就實作。

**Test Scope**:

- `specs/truth/features/backend/trips/旅行競爭與結果查證.feature`（整檔、全部展開值；API project、worker=1）。

- [X] T253 [BDD-GREEN] 收斂回滾、收據重播、版本與跨裝置序列化
  - Dependencies: T252。
  - Evidence: 整檔真API/DB通過，記錄案例集合、結果與版本到validation.md；完整來源與不變條件均成立，不只回應2xx。

- [X] T254 [BDD-REFACTOR] 在綠燈下整理此功能的產品碼與直接測試支援
  - Dependencies: T253。
  - 保留public contract與行為，僅消除本scope重複／改善模組邊界；重跑同Test Scope及實際受影響既有回歸。

## Phase 4.8: ADD Feature File - backend/trips/縮圖傳輸與提交邊界.feature

**Goal**: 完成Origin解析順序、總量、deadline及單工作入場控制，讓整份Test Scope全綠。

**Shared Must Read**:

- `specs/truth/features/backend/trips/縮圖傳輸與提交邊界.feature` → 全部Rule／Examples；`specs/truth/features/backend/trips/dsl.md` → 本檔全部使用句。
- `truth-delta.md` → `/dsl-refine`的本feature及DSL ADD列，並回追 `/api-plan`、`/data-plan` 對應語意列。
- `plan.md` → Wave 1資料生命週期、Wave 2權威契約；`specs/truth/contracts/groups/trip-management.yaml`、`specs/truth/contracts/components/schemas/trips.yaml`、`specs/truth/contracts/components/parameters.yaml` → 本Feature對應的命令、查詢、版本與錯誤定義。
- `specs/truth/data/data-model.dbml` → receipt僅提交成功建立、trip_thumbnails不留半成品；`specs/truth/techstack.md` → 本模組新技術；`research.md` → 適用決策2～9。

**受影響畫面與完成證據**: A，無直接呈現改動；前端C責任由對應後續Feature承接。後端以真DB/API與故障/競爭證據驗證，不要求無關UI批准。

**Boundary**: 限制檔案10MiB、總body10551296、framing65536、單part、fields0；上傳60s／處理10s初值、每instance一工作。斷線前後提交分開，503不盲目重送；其餘JSON Origin與SPA fallback不退化。 限落點 `apps/api/src/app.ts、trips/上傳stream/decoder admission與timeout` 及該scope必要直接依賴；共享修改需跑已綠且受影響的原scope，不改truth遷就實作。

**Test Scope**:

- `specs/truth/features/backend/trips/縮圖傳輸與提交邊界.feature`（整檔、全部展開值；API project、worker=1）。

- [X] T255 [BDD-GREEN] 完成Origin解析順序、總量、deadline及單工作入場控制
  - Dependencies: T254。
  - Evidence: 整檔真API/DB通過，記錄案例集合、結果與版本到validation.md；完整來源與不變條件均成立，不只回應2xx。

- [X] T256 [BDD-REFACTOR] 在綠燈下整理此功能的產品碼與直接測試支援
  - Dependencies: T255。
  - 保留public contract與行為，僅消除本scope重複／改善模組邊界；重跑同Test Scope及實際受影響既有回歸。

## Phase 4.9: 後端整合 checkpoint

**來源**: plan.md Wave1/2、research.md後端E2E、truth-delta三個owner與既有NOOP。

- [X] T257 [REGRESSION] 驗證後端完整功能組與既有帳務保護
  - Dependencies: T256。
  - Read: `specs/truth/features/backend/**`、API contracts/data；已完成8份新增feature及既有19份回歸。
  - Evidence: 全API BDD 27檔（新增182案例另列）、API support、migration空庫與既有0003資料升級、檢查舊migration checksum未動、正常重啟不重複套用；正式schema權限/FK/trigger/bytea/receipt一致。記錄版本與exit，無skip。此為功能整合，不另加truth產物家族review。

## Phase 4.10: ADD Feature File - frontend/trips/旅行管理與確認.feature

**Goal**: 完成管理dropdown、兩段確認、垃圾桶路由與清單更新，讓整份Test Scope全綠並核對呈現。

**Shared Must Read**:

- `specs/truth/features/frontend/trips/旅行管理與確認.feature` → 全部Rule／Examples；`specs/truth/features/frontend/trips/dsl.md` → 本檔全部使用句與適用006操作對照。
- `truth-delta.md` → `/dsl-refine`本feature／模組DSL ADD列；`plan.md` → Wave3前端介面；`dsl-refine-review.md` → 本feature畫面／資訊位置與驗收對照。
- `specs/truth/contracts/groups/trips.yaml`、`specs/truth/contracts/groups/trip-management.yaml` → 本Feature對應的命令、查詢、版本與錯誤定義。 `specs/truth/techstack.md` → 適用查詢/圖片/等待技術；`research.md` → 決策6/9/10，圖片功能另讀2～5。
- `ui/ui-plan.md` → `U01 U02 U03 U05 U06 S01 S02 S04` 固定frame／同版預覽及有效批准；`ui/split-ledger-006.pen` → design-v7；`ui/ui-plan.md` → 不製作prototype及有效批准。固定baseline起點及同版previews見本檔UI契約，只用於未改部分與整合。

**受影響畫面與完成證據**:

- C：`U01 U02 U03 U05 U06 S01 S02 S04` 的全部已索引D/M（U05是M1/M2/M3、S08是D/M1/M2）。正式落點 `apps/web/src/features/trips/{Trips,TripLedger}.tsx、app/App.tsx、components/{AppShell,FormDialog}.tsx`。
- 逐畫面依已確認資訊位置、尺寸及資料，在validation.md保存固定產品版本、預期/實際/差異/處理；不能以無溢出或功能全綠取代設計對照。
- 本phase是代表checkpoint：先核對U02-D/M、U06-D/M、S01-D/M的管理選單／確認／AppShell共用結構；這些與整檔其他狀態都通過後才解鎖後續同版型工作。

**Boundary**: 先完成代表U02/U06/S01桌機與手機的實際比對；同時完成整檔其他畫面。trash不是trip UUID，桌機我的旅行次層、手機次級選單、原同行者/分帳底列唯一active。 只改本Test Scope必要產品行為與樣式，未改部分沿用固定baseline；不另建完整prototype，不修改帳務精度或資訊位置。

**Test Scope**:

- `specs/truth/features/frontend/trips/旅行管理與確認.feature`（整檔、全部表列資料；Chromium、WebKit及DSL指定兩尺寸依序，worker=1）。

- [X] T258 [BDD-GREEN] 完成管理dropdown、兩段確認、垃圾桶路由與清單更新
  - Dependencies: T257。
  - Evidence: 整檔產品BDD與權威資料一致，完成上述畫面/狀態比對、request count、鍵盤及手機操作所需證據；差異只在既定適配範圍內處理。

- [X] T259 [BDD-REFACTOR] 在綠燈下整理本功能與共用狀態邊界
  - Dependencies: T258。
  - 不改業務/設計意圖，重跑本整檔及受影響已綠scope，刷新受影響產品/畫面證據，保留未改範圍。

## Phase 4.11: ADD Feature File - frontend/trips/縮圖預覽與保存.feature

**Goal**: 實作照片/預設草稿、最後預覽保存、取消及查證續接，讓整份Test Scope全綠並核對呈現。

**Shared Must Read**:

- `specs/truth/features/frontend/trips/縮圖預覽與保存.feature` → 全部Rule／Examples；`specs/truth/features/frontend/trips/dsl.md` → 本檔全部使用句與適用006操作對照。
- `truth-delta.md` → `/dsl-refine`本feature／模組DSL ADD列；`plan.md` → Wave3前端介面；`dsl-refine-review.md` → 本feature畫面／資訊位置與驗收對照。
- `specs/truth/contracts/groups/trip-management.yaml` → 本Feature對應的命令、查詢、版本與錯誤定義。 `specs/truth/techstack.md` → 適用查詢/圖片/等待技術；`research.md` → 決策6/9/10，圖片功能另讀2～5。
- `ui/ui-plan.md` → `U04 S03 S05 S09` 固定frame／同版預覽及有效批准；`ui/split-ledger-006.pen` → design-v7；`ui/ui-plan.md` → 不製作prototype及有效批准。固定baseline起點及同版previews見本檔UI契約，只用於未改部分與整合。

**受影響畫面與完成證據**:

- C：`U04 S03 S05 S09` 的全部已索引D/M（U05是M1/M2/M3、S08是D/M1/M2）。正式落點 `apps/web/src/features/trips/縮圖dialog、api/圖片客戶端、帳號scope查證狀態`。
- 逐畫面依已確認資訊位置、尺寸及資料，在validation.md保存固定產品版本、預期/實際/差異/處理；不能以無溢出或功能全綠取代設計對照。
- 依賴已通過代表checkpoint T259；共享元件改動需重驗受影響已綠代表及其他畫面，不重新批准未改設計。

**Boundary**: 只有保存圖片提交；預設也先預覽，重新選圖/使用預設圖相鄰文字工具列，取消/X/Escape放棄未提交草稿、提交後關閉不撤回。File/reset意圖、原operationId及draft跨關閉續查不可誤丟。 只改本Test Scope必要產品行為與樣式，未改部分沿用固定baseline；不另建完整prototype，不修改帳務精度或資訊位置。

**Test Scope**:

- `specs/truth/features/frontend/trips/縮圖預覽與保存.feature`（整檔、全部表列資料；Chromium、WebKit及DSL指定兩尺寸依序，worker=1）。

- [X] T260 [BDD-GREEN] 實作照片/預設草稿、最後預覽保存、取消及查證續接
  - Dependencies: T259。
  - Evidence: 整檔產品BDD與權威資料一致，完成上述畫面/狀態比對、request count、鍵盤及手機操作所需證據；差異只在既定適配範圍內處理。

- [X] T261 [BDD-REFACTOR] 在綠燈下整理本功能與共用狀態邊界
  - Dependencies: T260。
  - 不改業務/設計意圖，重跑本整檔及受影響已綠scope，刷新受影響產品/畫面證據，保留未改範圍。

## Phase 4.12: ADD Feature File - frontend/trips/新增旅行與選填縮圖.feature

**Goal**: 串接create確認後同trip圖片保存、失敗重傳與unknown，讓整份Test Scope全綠並核對呈現。

**Shared Must Read**:

- `specs/truth/features/frontend/trips/新增旅行與選填縮圖.feature` → 全部Rule／Examples；`specs/truth/features/frontend/trips/dsl.md` → 本檔全部使用句與適用006操作對照。
- `truth-delta.md` → `/dsl-refine`本feature／模組DSL ADD列；`plan.md` → Wave3前端介面；`dsl-refine-review.md` → 本feature畫面／資訊位置與驗收對照。
- `specs/truth/contracts/groups/trips.yaml`、`specs/truth/contracts/groups/trip-management.yaml` → 本Feature對應的命令、查詢、版本與錯誤定義。 `specs/truth/techstack.md` → 適用查詢/圖片/等待技術；`research.md` → 決策6/9/10，圖片功能另讀2～5。
- `ui/ui-plan.md` → `U07 U08 S10 S05` 固定frame／同版預覽及有效批准；`ui/split-ledger-006.pen` → design-v7；`ui/ui-plan.md` → 不製作prototype及有效批准。固定baseline起點及同版previews見本檔UI契約，只用於未改部分與整合。

**受影響畫面與完成證據**:

- C：`U07 U08 S10 S05` 的全部已索引D/M（U05是M1/M2/M3、S08是D/M1/M2）。正式落點 `apps/web/src/features/trips/TripForm.tsx、Trips.tsx與圖片保存客戶端`。
- 逐畫面依已確認資訊位置、尺寸及資料，在validation.md保存固定產品版本、預期/實際/差異/處理；不能以無溢出或功能全綠取代設計對照。
- 依賴已通過代表checkpoint T259；共享元件改動需重驗受影響已綠代表及其他畫面，不重新批准未改設計。

**Boundary**: 圖片選填；無圖建立、無效圖阻止/可移除、建立失敗保留表單/File；圖片失敗保留trip/default/File供同trip重傳。create unknown先原state，確認後才圖，不重建或以舊失敗回退較新圖。 只改本Test Scope必要產品行為與樣式，未改部分沿用固定baseline；不另建完整prototype，不修改帳務精度或資訊位置。

**Test Scope**:

- `specs/truth/features/frontend/trips/新增旅行與選填縮圖.feature`（整檔、全部表列資料；Chromium、WebKit及DSL指定兩尺寸依序，worker=1）。

- [X] T262 [BDD-GREEN] 串接create確認後同trip圖片保存、失敗重傳與unknown
  - Dependencies: T261。
  - Evidence: 整檔產品BDD與權威資料一致，完成上述畫面/狀態比對、request count、鍵盤及手機操作所需證據；差異只在既定適配範圍內處理。

- [X] T263 [BDD-REFACTOR] 在綠燈下整理本功能與共用狀態邊界
  - Dependencies: T262。
  - 不改業務/設計意圖，重跑本整檔及受影響已綠scope，刷新受影響產品/畫面證據，保留未改範圍。

## Phase 4.13: ADD Feature File - frontend/trips/縮圖限制與選圖錯誤.feature

**Goal**: 完成可見圖片限制、選圖拒絕與改選成功，讓整份Test Scope全綠並核對呈現。

**Shared Must Read**:

- `specs/truth/features/frontend/trips/縮圖限制與選圖錯誤.feature` → 全部Rule／Examples；`specs/truth/features/frontend/trips/dsl.md` → 本檔全部使用句與適用006操作對照。
- `truth-delta.md` → `/dsl-refine`本feature／模組DSL ADD列；`plan.md` → Wave3前端介面；`dsl-refine-review.md` → 本feature畫面／資訊位置與驗收對照。
- `specs/truth/contracts/groups/trip-management.yaml` → 本Feature對應的命令、查詢、版本與錯誤定義。 `specs/truth/techstack.md` → 適用查詢/圖片/等待技術；`research.md` → 決策6/9/10，圖片功能另讀2～5。
- `ui/ui-plan.md` → `U04 U07 S03` 固定frame／同版預覽及有效批准；`ui/split-ledger-006.pen` → design-v7；`ui/ui-plan.md` → 不製作prototype及有效批准。固定baseline起點及同版previews見本檔UI契約，只用於未改部分與整合。

**受影響畫面與完成證據**:

- C：`U04 U07 S03` 的全部已索引D/M（U05是M1/M2/M3、S08是D/M1/M2）。正式落點 `apps/web/src/features/trips/選圖控制及共用圖片驗證提示`。
- 逐畫面依已確認資訊位置、尺寸及資料，在validation.md保存固定產品版本、預期/實際/差異/處理；不能以無溢出或功能全綠取代設計對照。
- 依賴已通過代表checkpoint T259；共享元件改動需重驗受影響已綠代表及其他畫面，不重新批准未改設計。

**Boundary**: 4格式/裝置、21拒絕/恢復組合依真API/檔案驗；顯示可行轉檔/縮小/改選，不能以副檔名取代後端權威解碼。 只改本Test Scope必要產品行為與樣式，未改部分沿用固定baseline；不另建完整prototype，不修改帳務精度或資訊位置。

**Test Scope**:

- `specs/truth/features/frontend/trips/縮圖限制與選圖錯誤.feature`（整檔、全部表列資料；Chromium、WebKit及DSL指定兩尺寸依序，worker=1）。

- [X] T264 [BDD-GREEN] 完成可見圖片限制、選圖拒絕與改選成功
  - Dependencies: T263。
  - Evidence: 整檔產品BDD與權威資料一致，完成上述畫面/狀態比對、request count、鍵盤及手機操作所需證據；差異只在既定適配範圍內處理。

- [X] T265 [BDD-REFACTOR] 在綠燈下整理本功能與共用狀態邊界
  - Dependencies: T264。
  - 不改業務/設計意圖，重跑本整檔及受影響已綠scope，刷新受影響產品/畫面證據，保留未改範圍。

## Phase 4.14: ADD Feature File - frontend/trips/縮圖讀取與帳號清理.feature

**Goal**: 實作私有圖片占位、fallback及換帳清理，讓整份Test Scope全綠並核對呈現。

**Shared Must Read**:

- `specs/truth/features/frontend/trips/縮圖讀取與帳號清理.feature` → 全部Rule／Examples；`specs/truth/features/frontend/trips/dsl.md` → 本檔全部使用句與適用006操作對照。
- `truth-delta.md` → `/dsl-refine`本feature／模組DSL ADD列；`plan.md` → Wave3前端介面；`dsl-refine-review.md` → 本feature畫面／資訊位置與驗收對照。
- `specs/truth/contracts/groups/trip-management.yaml`、`specs/truth/contracts/groups/account.yaml` → 本Feature對應的命令、查詢、版本與錯誤定義。 `specs/truth/techstack.md` → 適用查詢/圖片/等待技術；`research.md` → 決策6/9/10，圖片功能另讀2～5。
- `ui/ui-plan.md` → `U01 U02 U03 S07` 固定frame／同版預覽及有效批准；`ui/split-ledger-006.pen` → design-v7；`ui/ui-plan.md` → 不製作prototype及有效批准。固定baseline起點及同版previews見本檔UI契約，只用於未改部分與整合。

**受影響畫面與完成證據**:

- C：`U01 U02 U03 S07` 的全部已索引D/M（U05是M1/M2/M3、S08是D/M1/M2）。正式落點 `apps/web/src/features/trips/卡片圖片、components/AppShell.tsx、features/auth/session.tsx、api/圖片讀取`。
- 逐畫面依已確認資訊位置、尺寸及資料，在validation.md保存固定產品版本、預期/實際/差異/處理；不能以無溢出或功能全綠取代設計對照。
- 依賴已通過代表checkpoint T259；共享元件改動需重驗受影響已綠代表及其他畫面，不重新批准未改設計。

**Boundary**: 延遲保留版面、失敗default不擋記帳；name/date/count與入口不遮住，切帳撤銷object URL/快取/舊in-flight，不能清他owner DB或承諾遠端裝置即時移除。 只改本Test Scope必要產品行為與樣式，未改部分沿用固定baseline；不另建完整prototype，不修改帳務精度或資訊位置。

**Test Scope**:

- `specs/truth/features/frontend/trips/縮圖讀取與帳號清理.feature`（整檔、全部表列資料；Chromium、WebKit及DSL指定兩尺寸依序，worker=1）。

- [X] T266 [BDD-GREEN] 實作私有圖片占位、fallback及換帳清理
  - Dependencies: T265。
  - Evidence: 整檔產品BDD與權威資料一致，完成上述畫面/狀態比對、request count、鍵盤及手機操作所需證據；差異只在既定適配範圍內處理。

- [X] T267 [BDD-REFACTOR] 在綠燈下整理本功能與共用狀態邊界
  - Dependencies: T266。
  - 不改業務/設計意圖，重跑本整檔及受影響已綠scope，刷新受影響產品/畫面證據，保留未改範圍。

## Phase 4.15: ADD Feature File - frontend/trips/旅行結果查證與舊連結.feature

**Goal**: 統一生命周期結果未知、衝突刷新及舊帳本限制，讓整份Test Scope全綠並核對呈現。

**Shared Must Read**:

- `specs/truth/features/frontend/trips/旅行結果查證與舊連結.feature` → 全部Rule／Examples；`specs/truth/features/frontend/trips/dsl.md` → 本檔全部使用句與適用006操作對照。
- `truth-delta.md` → `/dsl-refine`本feature／模組DSL ADD列；`plan.md` → Wave3前端介面；`dsl-refine-review.md` → 本feature畫面／資訊位置與驗收對照。
- `specs/truth/contracts/groups/trip-management.yaml`、`specs/truth/contracts/groups/trips.yaml` → 本Feature對應的命令、查詢、版本與錯誤定義。 `specs/truth/techstack.md` → 適用查詢/圖片/等待技術；`research.md` → 決策6/9/10，圖片功能另讀2～5。
- `ui/ui-plan.md` → `S05 S06` 固定frame／同版預覽及有效批准；`ui/split-ledger-006.pen` → design-v7；`ui/ui-plan.md` → 不製作prototype及有效批准。固定baseline起點及同版previews見本檔UI契約，只用於未改部分與整合。

**受影響畫面與完成證據**:

- C：`S05 S06` 的全部已索引D/M（U05是M1/M2/M3、S08是D/M1/M2）。正式落點 `apps/web/src/app/App.tsx、features/trips/操作結果狀態、api/query scope`。
- 逐畫面依已確認資訊位置、尺寸及資料，在validation.md保存固定產品版本、預期/實際/差異/處理；不能以無溢出或功能全綠取代設計對照。
- 依賴已通過代表checkpoint T259；共享元件改動需重驗受影響已綠代表及其他畫面，不重新批准未改設計。

**Boundary**: 原收據與目前狀態分開，操作耗盡停止busy可再查；過期版本先讀當前，不盲目用新版本重送；trash指向復原、purged返回清單、舊cache/in-flight不能重顯帳務。 只改本Test Scope必要產品行為與樣式，未改部分沿用固定baseline；不另建完整prototype，不修改帳務精度或資訊位置。

**Test Scope**:

- `specs/truth/features/frontend/trips/旅行結果查證與舊連結.feature`（整檔、全部表列資料；Chromium、WebKit及DSL指定兩尺寸依序，worker=1）。

- [X] T268 [BDD-GREEN] 統一生命周期結果未知、衝突刷新及舊帳本限制
  - Dependencies: T267。
  - Evidence: 整檔76PASS＋實際受影響回歸，618 distinct/624接受PASS（含6個helper替代補驗）；28檔manifest3a7466…、76PNG/兩browser兩尺寸及30命令exit0，品質與資源audit完成，t268-review.md獨立APPROVED/0blocking。ReactDoctor維護提醒交T269；詳validation.md。

- [X] T269 [BDD-REFACTOR] 在綠燈下整理本功能與共用狀態邊界
  - Dependencies: T268。
  - Evidence: 32檔manifest14bbcc…、完整76＋管理40＋QA32＝148PASS/20命令0；76圖前後73像素完全相同、3微差逐圖無設計差異，Doctor四項清除只餘有意reset；品質/資源及t269-review.md獨立APPROVED/0blocking。未重跑無影響舊129/API，T288保完整。

## Phase 4.16: ADD Feature File - frontend/expenses/旅行生命週期下的刪除查證.feature

**Goal**: 改為state-first支出刪除查證與舊表單垃圾桶回饋，讓整份Test Scope全綠並核對呈現。

**Shared Must Read**:

- `specs/truth/features/frontend/expenses/旅行生命週期下的刪除查證.feature` → 全部Rule／Examples；`specs/truth/features/frontend/expenses/dsl.md` → 本檔全部使用句與適用006操作對照。
- `truth-delta.md` → `/dsl-refine`本feature／模組DSL ADD列；`plan.md` → Wave3前端介面；`dsl-refine-review.md` → 本feature畫面／資訊位置與驗收對照。
- `specs/truth/contracts/groups/expenses.yaml`、`specs/truth/contracts/groups/trip-management.yaml` → 本Feature對應的命令、查詢、版本與錯誤定義。 `specs/truth/techstack.md` → 適用查詢/圖片/等待技術；`research.md` → 決策6/9/10，圖片功能另讀2～5。
- `ui/ui-plan.md` → `S05 S06 S08` 固定frame／同版預覽及有效批准；`ui/split-ledger-006.pen` → design-v7；`ui/ui-plan.md` → 不製作prototype及有效批准。固定baseline起點及同版previews見本檔UI契約，只用於未改部分與整合。

**受影響畫面與完成證據**:

- C：`S05 S06 S08` 的全部已索引D/M（U05是M1/M2/M3、S08是D/M1/M2）。正式落點 `apps/web/src/features/expenses/save-outcome.ts、ExpenseForm.tsx`。
- 逐畫面依已確認資訊位置、尺寸及資料，在validation.md保存固定產品版本、預期/實際/差異/處理；不能以無溢出或功能全綠取代設計對照。
- 依賴已通過代表checkpoint T259；共享元件改動需重驗受影響已綠代表及其他畫面，不重新批准未改設計。

**Boundary**: 只有active且單筆404才能按原語意確認DELETE；trash與purged不得誤認原DELETE成功。保留原UUID/草稿、無重送；舊表單保存拒絕需停止busy與復原下一步。 只改本Test Scope必要產品行為與樣式，未改部分沿用固定baseline；不另建完整prototype，不修改帳務精度或資訊位置。

**Test Scope**:

- `specs/truth/features/frontend/expenses/旅行生命週期下的刪除查證.feature`（整檔、全部表列資料；Chromium、WebKit及DSL指定兩尺寸依序，worker=1）。

- [X] T270 [BDD-GREEN] 改為state-first支出刪除查證與舊表單垃圾桶回饋
  - Dependencies: T269。
  - Evidence: source37 b9e327…，整scope16＋受影響回歸150distinct/182接受PASS（UI修正替代32）、42命令0、current16PNG/S05/S06/S08/品質/資源齊，t270-review.md獨立APPROVED/0blocking；詳validation.md。

- [X] T271 [BDD-REFACTOR] 在綠燈下整理本功能與共用狀態邊界
  - Dependencies: T270。
  - 不改業務/設計意圖，重跑本整檔及受影響已綠scope，刷新受影響產品/畫面證據，保留未改範圍。

## Phase 4.MODIFY: 既有支出刪除查證契約

**Goal**: 新版DSL對應既有共同支出更正/刪除功能保持全綠。

**Shared Must Read**:

- `specs/truth/features/frontend/expenses/shared-expense-corrections-and-recalculation.feature` → 刪除共同支出後移除其付款安排；同模組dsl.md → 修改的「晚餐不再出現且沒有晚餐造成的分攤與付款安排」。
- `truth-delta.md` → `/dsl-refine`單句MODIFY與既有features NOOP；`plan.md` → Wave2 save-outcome.ts風險；`specs/truth/contracts/groups/expenses.yaml`、`specs/truth/contracts/groups/trip-management.yaml` → 普通404與state。
- 本feature其餘使用的 `specs/truth/features/frontend/dsl.md` → `分帳旅行已有以下支出：`、`分帳畫面顯示以下成員淨額：`、`分帳旅行已有 Amy 支付 Alice JPY {金額} 的獨立還款`、`Amy 支付 Alice JPY 33 的安排已結清`，依實際步驟唯一匹配讀取；其既有binding未改，不另RED。
- `ui/ui-plan.md` → S05/S06/S08及U02；固定baseline的ledger/expense-create及原已確認資訊責任。新狀態屬C，既有餘額/份額資訊位置保持。

**受影響畫面與完成證據**: ExpenseForm/save-outcome、帳本及分帳安排既有呈現；依賴T259代表checkpoint。state-first查證需與原完整份額/安排斷言同時成立；受影響狀態納入上個Feature畫面證據。

**Boundary**: 只補正單筆刪除成功的判斷前提，不放寬原始帳務驗證、不回寫歷史還款／結清。

**Test Scope**:

- `specs/truth/features/frontend/expenses/shared-expense-corrections-and-recalculation.feature`（全檔，不只該Rule）。
- `specs/truth/features/frontend/expenses/pagination-and-save-outcomes.feature`；`apps/web/tests/support/save-outcomes.spec.ts`、splitting/deleted-dinner-result.spec.ts。

- [X] T272 [BDD-GREEN] 以state-first查證維持既有共同支出刪除與帳務回歸
  - Dependencies: T271。
  - 落點save-outcome.ts/ExpenseForm.tsx；在新增scope之外補齊既有整檔、support focused，兩browser與受影響手機呈現通過。

- [X] T273 [BDD-REFACTOR] 收斂支出查證分支而保留原意圖
  - Dependencies: T272。
  - 不將任意404視成功，保持原UUID、付款歷史與精確重算，重跑同Test Scope。

## Phase 4.17: ADD Feature File - frontend/design-system/全站初讀與局部等待.feature

**Goal**: 將全站12種內容接入初載骨架與局部選項/身分等待，讓整份Test Scope全綠並核對呈現。

**Shared Must Read**:

- `specs/truth/features/frontend/design-system/全站初讀與局部等待.feature` → 全部Rule／Examples；`specs/truth/features/frontend/design-system/dsl.md` → 本檔全部使用句與適用006操作對照。
- `truth-delta.md` → `/dsl-refine`本feature／模組DSL ADD列；`plan.md` → Wave3前端介面；`dsl-refine-review.md` → 本feature畫面／資訊位置與驗收對照。
- `specs/truth/contracts/groups/account.yaml`、`specs/truth/contracts/groups/trips.yaml`、`specs/truth/contracts/groups/trip-management.yaml`、`specs/truth/contracts/groups/expenses.yaml`、`specs/truth/contracts/groups/categories.yaml`、`specs/truth/contracts/groups/members.yaml`、`specs/truth/contracts/groups/repayments.yaml`、`specs/truth/contracts/groups/settlement.yaml`、`specs/truth/contracts/groups/currencies.yaml` → 本Feature對應的命令、查詢、版本與錯誤定義。 `specs/truth/techstack.md` → 適用查詢/圖片/等待技術；`research.md` → 決策6/9/10，圖片功能另讀2～5。
- `ui/ui-plan.md` → `S04 S08` 固定frame／同版預覽及有效批准；`ui/split-ledger-006.pen` → design-v7；`ui/ui-plan.md` → 不製作prototype及有效批准。固定baseline起點及同版previews見本檔UI契約，只用於未改部分與整合。

**受影響畫面與完成證據**:

- C：`S04 S08` 的全部已索引D/M（U05是M1/M2/M3、S08是D/M1/M2）。正式落點 `apps/web/src/components/QueryState.tsx、app/App.tsx、features/auth/session.tsx、各功能query/form`。
- 逐畫面依已確認資訊位置、尺寸及資料，在validation.md保存固定產品版本、預期/實際/差異/處理；不能以無溢出或功能全綠取代設計對照。
- 依賴已通過代表checkpoint T259；共享元件改動需重驗受影響已綠代表及其他畫面，不重新批准未改設計。

**Boundary**: 全站資訊位置不搬移：帳本總額、單筆份額、分帳安排各自負責；初讀未完成不假零/空/登出，選項未齊不能保存，paused恢復不能殘留busy。 只改本Test Scope必要產品行為與樣式，未改部分沿用固定baseline；不另建完整prototype，不修改帳務精度或資訊位置。

**Test Scope**:

- `specs/truth/features/frontend/design-system/全站初讀與局部等待.feature`（整檔、全部表列資料；Chromium、WebKit及DSL指定兩尺寸依序，worker=1）。

- [X] T274 [BDD-GREEN] 將全站12種內容接入初載骨架與局部選項/身分等待
  - Dependencies: T273。
  - Evidence: 整檔產品BDD與權威資料一致，完成上述畫面/狀態比對、request count、鍵盤及手機操作所需證據；差異只在既定適配範圍內處理。

- [X] T275 [BDD-REFACTOR] 在綠燈下整理本功能與共用狀態邊界
  - Dependencies: T274。
  - 不改業務/設計意圖，重跑本整檔及受影響已綠scope，刷新受影響產品/畫面證據，保留未改範圍。

## Phase 4.18: ADD Feature File - frontend/design-system/全站操作忙碌與防重複.feature

**Goal**: 把22操作與站內登入接入穩定busy及防重複，讓整份Test Scope全綠並核對呈現。

**Shared Must Read**:

- `specs/truth/features/frontend/design-system/全站操作忙碌與防重複.feature` → 全部Rule／Examples；`specs/truth/features/frontend/design-system/dsl.md` → 本檔全部使用句與適用006操作對照。
- `truth-delta.md` → `/dsl-refine`本feature／模組DSL ADD列；`plan.md` → Wave3前端介面；`dsl-refine-review.md` → 本feature畫面／資訊位置與驗收對照。
- `specs/truth/contracts/groups/account.yaml`、`specs/truth/contracts/groups/trips.yaml`、`specs/truth/contracts/groups/trip-management.yaml`、`specs/truth/contracts/groups/expenses.yaml`、`specs/truth/contracts/groups/categories.yaml`、`specs/truth/contracts/groups/members.yaml`、`specs/truth/contracts/groups/repayments.yaml`、`specs/truth/contracts/groups/settlement.yaml` → 本Feature對應的命令、查詢、版本與錯誤定義。 `specs/truth/techstack.md` → 適用查詢/圖片/等待技術；`research.md` → 決策6/9/10，圖片功能另讀2～5。
- `ui/ui-plan.md` → `S03 S08 S10` 固定frame／同版預覽及有效批准；`ui/split-ledger-006.pen` → design-v7；`ui/ui-plan.md` → 不製作prototype及有效批准。固定baseline起點及同版previews見本檔UI契約，只用於未改部分與整合。

**受影響畫面與完成證據**:

- C：`S03 S08 S10` 的全部已索引D/M（U05是M1/M2/M3、S08是D/M1/M2）。正式落點 `apps/web/src/components/ui/button.tsx、FormDialog.tsx及trips/expenses/categories/members/repayments/settlement/auth操作`。
- 逐畫面依已確認資訊位置、尺寸及資料，在validation.md保存固定產品版本、預期/實際/差異/處理；不能以無溢出或功能全綠取代設計對照。
- 依賴已通過代表checkpoint T259；共享元件改動需重驗受影響已綠代表及其他畫面，不重新批准未改設計。

**Boundary**: 依dsl.md的22操作資料對照驗正確帳務與request count；spinner-only但accessibility名稱/狀態保留、尺寸不變，busy guard不能只靠disabled樣式。 只改本Test Scope必要產品行為與樣式，未改部分沿用固定baseline；不另建完整prototype，不修改帳務精度或資訊位置。

**Test Scope**:

- `specs/truth/features/frontend/design-system/全站操作忙碌與防重複.feature`（整檔、全部表列資料；Chromium、WebKit及DSL指定兩尺寸依序，worker=1）。

- [X] T276 [BDD-GREEN] 把22操作與站內登入接入穩定busy及防重複
  - Dependencies: T275。
  - Evidence: 整檔產品BDD與權威資料一致，完成上述畫面/狀態比對、request count、鍵盤及手機操作所需證據；差異只在既定適配範圍內處理。

- [X] T277 [BDD-REFACTOR] 在綠燈下整理本功能與共用狀態邊界
  - Dependencies: T276。
  - 不改業務/設計意圖，重跑本整檔及受影響已綠scope，刷新受影響產品/畫面證據，保留未改範圍。

## Phase 4.19: ADD Feature File - frontend/design-system/背景更新與分頁等待.feature

**Goal**: 實作局部更新與20+5筆分頁狀態，讓整份Test Scope全綠並核對呈現。

**Shared Must Read**:

- `specs/truth/features/frontend/design-system/背景更新與分頁等待.feature` → 全部Rule／Examples；`specs/truth/features/frontend/design-system/dsl.md` → 本檔全部使用句與適用006操作對照。
- `truth-delta.md` → `/dsl-refine`本feature／模組DSL ADD列；`plan.md` → Wave3前端介面；`dsl-refine-review.md` → 本feature畫面／資訊位置與驗收對照。
- `specs/truth/contracts/groups/expenses.yaml` → 本Feature對應的命令、查詢、版本與錯誤定義。 `specs/truth/techstack.md` → 適用查詢/圖片/等待技術；`research.md` → 決策6/9/10，圖片功能另讀2～5。
- `ui/ui-plan.md` → `S04 S08` 固定frame／同版預覽及有效批准；`ui/split-ledger-006.pen` → design-v7；`ui/ui-plan.md` → 不製作prototype及有效批准。固定baseline起點及同版previews見本檔UI契約，只用於未改部分與整合。

**受影響畫面與完成證據**:

- C：`S04 S08` 的全部已索引D/M（U05是M1/M2/M3、S08是D/M1/M2）。正式落點 `apps/web/src/features/trips/TripLedger.tsx、components/QueryState.tsx與query observer`。
- 逐畫面依已確認資訊位置、尺寸及資料，在validation.md保存固定產品版本、預期/實際/差異/處理；不能以無溢出或功能全綠取代設計對照。
- 依賴已通過代表checkpoint T259；共享元件改動需重驗受影響已綠代表及其他畫面，不重新批准未改設計。

**Boundary**: 背景/更多保留已載入內容和確認總額、尾端busy、不重複追加；失敗保留舊資料並可重試，不改成全頁骨架。 只改本Test Scope必要產品行為與樣式，未改部分沿用固定baseline；不另建完整prototype，不修改帳務精度或資訊位置。

**Test Scope**:

- `specs/truth/features/frontend/design-system/背景更新與分頁等待.feature`（整檔、全部表列資料；Chromium、WebKit及DSL指定兩尺寸依序，worker=1）。

- [X] T278 [BDD-GREEN] 實作局部更新與20+5筆分頁狀態
  - Dependencies: T277。
  - Evidence: 整檔產品BDD與權威資料一致，完成上述畫面/狀態比對、request count、鍵盤及手機操作所需證據；差異只在既定適配範圍內處理。

- [X] T279 [BDD-REFACTOR] 在綠燈下整理本功能與共用狀態邊界
  - Dependencies: T278。
  - 不改業務/設計意圖，重跑本整檔及受影響已綠scope，刷新受影響產品/畫面證據，保留未改範圍。

## Phase 4.20: ADD Feature File - frontend/design-system/操作失敗與未知結果.feature

**Goal**: 完善支出草稿與付款unknown的可恢復回饋，讓整份Test Scope全綠並核對呈現。

**Shared Must Read**:

- `specs/truth/features/frontend/design-system/操作失敗與未知結果.feature` → 全部Rule／Examples；`specs/truth/features/frontend/design-system/dsl.md` → 本檔全部使用句與適用006操作對照。
- `truth-delta.md` → `/dsl-refine`本feature／模組DSL ADD列；`plan.md` → Wave3前端介面；`dsl-refine-review.md` → 本feature畫面／資訊位置與驗收對照。
- `specs/truth/contracts/groups/expenses.yaml`、`specs/truth/contracts/groups/repayments.yaml`、`specs/truth/contracts/groups/settlement.yaml` → 本Feature對應的命令、查詢、版本與錯誤定義。 `specs/truth/techstack.md` → 適用查詢/圖片/等待技術；`research.md` → 決策6/9/10，圖片功能另讀2～5。
- `ui/ui-plan.md` → `S05 S08` 固定frame／同版預覽及有效批准；`ui/split-ledger-006.pen` → design-v7；`ui/ui-plan.md` → 不製作prototype及有效批准。固定baseline起點及同版previews見本檔UI契約，只用於未改部分與整合。

**受影響畫面與完成證據**:

- C：`S05 S08` 的全部已索引D/M（U05是M1/M2/M3、S08是D/M1/M2）。正式落點 `apps/web/src/features/expenses/{ExpenseForm,save-outcome}.ts*、features/settlement/SettleArrangement.tsx、repayments/IndependentRepayment.tsx`。
- 逐畫面依已確認資訊位置、尺寸及資料，在validation.md保存固定產品版本、預期/實際/差異/處理；不能以無溢出或功能全綠取代設計對照。
- 依賴已通過代表checkpoint T259；共享元件改動需重驗受影響已綠代表及其他畫面，不重新批准未改設計。

**Boundary**: 明確失敗與unknown分流，保留draft、原次付款UUID，查證耗盡停動畫/可再查，不能重送產生第二付款。 只改本Test Scope必要產品行為與樣式，未改部分沿用固定baseline；不另建完整prototype，不修改帳務精度或資訊位置。

**Test Scope**:

- `specs/truth/features/frontend/design-system/操作失敗與未知結果.feature`（整檔、全部表列資料；Chromium、WebKit及DSL指定兩尺寸依序，worker=1）。

- [X] T280 [BDD-GREEN] 完善支出草稿與付款unknown的可恢復回饋
  - Dependencies: T279。
  - Evidence: 整檔產品BDD與權威資料一致，完成上述畫面/狀態比對、request count、鍵盤及手機操作所需證據；差異只在既定適配範圍內處理。

- [X] T281 [BDD-REFACTOR] 在綠燈下整理本功能與共用狀態邊界
  - Dependencies: T280。
  - 不改業務/設計意圖，重跑本整檔及受影響已綠scope，刷新受影響產品/畫面證據，保留未改範圍。

## Phase 4.21: ADD Feature File - frontend/design-system/鍵盤與減少動態效果.feature

**Goal**: 完成兩尺寸確認與日期等待的鍵盤/讀屏語意，讓整份Test Scope全綠並核對呈現。

**Shared Must Read**:

- `specs/truth/features/frontend/design-system/鍵盤與減少動態效果.feature` → 全部Rule／Examples；`specs/truth/features/frontend/design-system/dsl.md` → 本檔全部使用句與適用006操作對照。
- `truth-delta.md` → `/dsl-refine`本feature／模組DSL ADD列；`plan.md` → Wave3前端介面；`dsl-refine-review.md` → 本feature畫面／資訊位置與驗收對照。
- `specs/truth/contracts/groups/trips.yaml` → 本Feature對應的命令、查詢、版本與錯誤定義。 `specs/truth/techstack.md` → 適用查詢/圖片/等待技術；`research.md` → 決策6/9/10，圖片功能另讀2～5。
- `ui/ui-plan.md` → `S01 S02 S08` 固定frame／同版預覽及有效批准；`ui/split-ledger-006.pen` → design-v7；`ui/ui-plan.md` → 不製作prototype及有效批准。固定baseline起點及同版previews見本檔UI契約，只用於未改部分與整合。

**受影響畫面與完成證據**:

- C：`S01 S02 S08` 的全部已索引D/M（U05是M1/M2/M3、S08是D/M1/M2）。正式落點 `apps/web/src/components/{FormDialog,DateField}.tsx、ui/button.tsx、design-system.css與responsive狀態CSS`。
- 逐畫面依已確認資訊位置、尺寸及資料，在validation.md保存固定產品版本、預期/實際/差異/處理；不能以無溢出或功能全綠取代設計對照。
- 依賴已通過代表checkpoint T259；共享元件改動需重驗受影響已綠代表及其他畫面，不重新批准未改設計。

**Boundary**: 安全初始焦點、focus trap/Escape回焦、status不反覆播報，reduced-motion仍有圖形/名稱，不靠顏色；保留日期真實日曆與原帳務。 只改本Test Scope必要產品行為與樣式，未改部分沿用固定baseline；不另建完整prototype，不修改帳務精度或資訊位置。

**Test Scope**:

- `specs/truth/features/frontend/design-system/鍵盤與減少動態效果.feature`（整檔、全部表列資料；Chromium、WebKit及DSL指定兩尺寸依序，worker=1）。

- [X] T282 [BDD-GREEN] 完成兩尺寸確認與日期等待的鍵盤/讀屏語意
  - Dependencies: T281。
  - Evidence: 整檔產品BDD與權威資料一致，完成上述畫面/狀態比對、request count、鍵盤及手機操作所需證據；差異只在既定適配範圍內處理。

- [X] T283 [BDD-REFACTOR] 在綠燈下整理本功能與共用狀態邊界
  - Dependencies: T282。
  - 不改業務/設計意圖，重跑本整檔及受影響已綠scope，刷新受影響產品/畫面證據，保留未改範圍。

## Phase 5: 工程交付與完整產品驗收

**來源**: spec.md NFR／成功標準、research.md後續驗證1～4、plan.md共通handoff與techstack測試矩陣。這些任務不以工程證據替代上述產品介面行為。

- [X] T284 [ENGINEERING] 驗證目標Linux的compiled runtime與sharp binary
  - Evidence: 2026-11-17 Linux arm64 Debian12、Node24.22.2/pnpm11.25.0 frozen install/build exit0；sharp0.35.5/libvips8.18.7/multipart10.1.8 smoke200；compiled deployment 7/7 PASS（含空庫、001–003真帳務升級、checksum、SPA/health/auth與失敗啟動），lint/format exit0。來源及image hash、命令/環境見validation T284；隔離子DB0，容器僅sleep。未部署。
  - Dependencies: T283。
  - Read: `research.md` → 後續驗證1；`specs/truth/techstack.md` → 試用部署/圖片處理；tests/deployment/runtime.spec.ts與Railpack設定。
  - 在隔離Linux/Railpack同等環境用frozen lockfile建置/啟動，驗Node24/optional binary/multipart/sharp，migration從空庫及舊資料可啟動、靜態SPA與health/auth gate不退化；記錄image/OS/CPU架構/版本/命令/exit及checksum於validation.md。不得把macOS實驗代替此項，不部署正式服務。

- [X] T285 [ENGINEERING] 量測10MiB與25MP及連續轉碼的資源邊界
  - Evidence: 使用者確認0.5GB，獨立compiled runtime容器硬限499,998,720bytes/2CPU/no額外swap；10MiB且25MP真PNG與高熵JPEG交替8次200、503/abort/60秒408後恢復200。服務HWM260,784,128bytes、CPU3.61s、10收據/10revision、OOM0、退出0；詳validation T285及新raw。fixture共置造成driver137的失敗探測另列，不當服務容量結論。
  - Dependencies: T284。
  - Read: `research.md` → 決策3/5及後續驗證1；API admission/timeouts、`specs/truth/features/backend/trips/縮圖傳輸與提交邊界.feature`。
  - 對compiled runtime真實上傳合法上限圖/高熵圖，記錄CPU、RSS/peak、耗時與工作/stream數、503/timeout/abort後釋放；先記錄實際目標service記憶體容量及可用預算，對照單工作與有界deadline無OOM/無未釋放工作。容量不足回交owner調整admission，不自行降低已授權圖片邊界或標PASS。

- [X] T286 [ENGINEERING] 驗證含圖片與垃圾桶資料的隔離備份還原
  - Evidence: PostgreSQL18.3 pg_dump/pg_restore至另一空隔離DB exit0；public/auth逐表JSON與constraint/trigger/function/index完全相同；active/trash圖片bytea/metadata/HTTP隔離、restore保圖、receipt重播、purged UUID409與五類DB保護均PASS。完整帳務/真purge fixtures與dump SHA見validation T286，兩子庫及服務均回收，無正式部署。
  - Dependencies: T285。
  - Read: `research.md` → 後續驗證4；`specs/truth/data/data-model.dbml` → 新表/receipt/tombstone及purge。
  - 使用虛構owner與active/trash/已purged識別/收據、目前WebP、完整帳務的隔離DB；pg_dump/pg_restore至另一空隔離DB。比對表/constraint/trigger、bytea checksum及metadata、復原圖片可讀與owner隔離、receipt去重與已刪UUID不可復活；記錄命令遮蔽連線secret、檔案hash及restore結果。歷史9表證據不算本次通過。

- [ ] T287 [MANUAL-VERIFY] 完成真機選圖、縮圖觀感與輔助工具核對
  - 本輪處置：2026-11-17使用者回覆「這項先 skip」，依指示略過並解除本輪後續前置；不記為PASS、不補造裝置/讀屏證據，保留人工驗證缺口與未完成框。後續UI/基準/交付必須附此例外。
  - Dependencies: T286。
  - Read: `research.md` → 後續驗證3；`spec.md` US2/US3及NFR；`ui/ui-plan.md`固定design-v7。
  - 由具實機的開發者/授權測試者在iOS與Android記錄裝置/OS/browser、實際選圖JPEG/PNG/WebP（HEIC拒絕/轉檔下一步）、新增兩階段/同trip重傳、取消/換圖/預設、記帳/垃圾桶復原及圖片方向/觀感。補實際鍵盤/讀屏、reduced-motion、狀態播報與焦點人工核對；真機/讀屏不可用則本task保持未完成並列缺口，viewport自動測試不替代。無新增設計批准要求。

- [X] T288 [REGRESSION] 完成全產品測試矩陣與編譯品質檢查
  - Dependencies: T286, T240（T190補驗獨立審查）。
  - Evidence: 最終1493來源be3e1546…cc01be，host/Linux零差異；清單對照2375 Playwright基本執行（API348/API-support356/前端357×2+手機193×2/web-support275×2/UI5×2/smoke2×2/deployment7）及unit23均PASS/0skip/flaky/error；另300次精準影響重驗（管理88、初讀/舊連結212）不重複計入基本集合。最終typecheck/lint/format/build雙平台0；tablet溢出與unknown-trip返回修正、2獨立support斷言對齊及審查、完整版本沿用鏈見validation及t288-final-audit.json。所有owned runner/子DB回收，僅睡眠容器後停止；人工T287/UIgate/基準回填尚未完成。
  - Read: 本檔執行入口與完整矩陣、`dsl-refine-review.md`47模板覆蓋、全部truth features與既有NOOP。
  - 同一最終產品版本依序跑API全量27檔、Web全量28檔在Chromium/WebKit及新增DSL兩尺寸矩陣、test:unit、API support、web-support、ui-quality、deployment runtime、smoke，以及typecheck/lint/format:check/build。以當次--list清單對照executions/通過/失敗/skip，無遺漏且無skip才能通過；需要Linux執行WebKit時同版構建/資料/規格留證。
  - 在validation.md保存完整矩陣、版本/環境/exit/log及相關故障復原證據；新程式變更後重跑受影響scope，不能拼接不同版本結果。這是整體功能/工程驗收，不另新增truth家族review。

## Phase 6: UI quality gate

**Goal**: 在全部設計消費者與正式驗收完成後，剛好一次獨立UI家族核對。

**Read**:

- `ui/ui-plan.md`、`ui/split-ledger-006.pen`及32份同版設計預覽（38frame的共用參照見ui/ui-plan.md）、有效design-v7原確認；本檔固定baseline commit及相應原畫面/元件；`dsl-refine-review.md`畫面位置責任。
- `validation.md` 的產品固定版本、各畫面同尺寸同可比資料、代表checkpoint、逐項預期/實際/差異與修正、真機/鍵盤/讀屏結果；全部前端產品與shared導航/元件。

**Boundary**: 不改truth、不加feature、不重跑GREEN當作review；原型不製作，沒有原型證據前置。未參與受審產品實作的既有審查者執行；重大差異未有開發者決策不得自行接受。

- [ ] T289 subagent review (ui quality gate)
  - 2026-11-18更新：使用者回覆「目前人眼驗證 ok，現階段可以先 merge main 了」，已取得目前UI的人工接受及合併授權；原完整獨立審查未補執行，保持本框與例外，不再阻擋此次合併。
  - 本輪處置：使用者2026-11-17明確回覆「如果只是 UI 的話可以先跳過，我來人眼驗證就好」，依指示停止自動補拍/審查，交由使用者人眼驗證，不標PASS。首輪review核對來源/設計及12張最終主畫面未發現confirmed product defect；其餘視覺責任未完成。
  - Dependencies: T288；T287於2026-11-17由使用者明確回覆「這項先 skip」豁免本輪前置，非驗證通過。
  - Evidence: 核對38frame責任、桌機/手機完整主旅程與關鍵狀態、跨頁共享導航/按鈕/骨架一致性，名稱/日期/筆數/分攤/淨額各在已確認位置。差異全修正或有可追溯的使用者接受；不能只寫PASS、無溢出或功能綠燈。

## Phase 7: 驗收後基準回填

**來源**: 共用UI交付契約Rule7；plan.md/UI已驗收變更納入現況。這是實作後交付任務，本輪規劃不寫入baseline。

- [ ] T290 回填本次已驗收的共用UI基準
  - 本輪處置：配合使用者暫略UI驗證，回填暫緩，現有baseline不變；未驗收範圍不升現況。Pen工具另有本期用量上限，已正常退出CLI，不繞過工具限制。
  - Dependencies: T289, T288。
  - Read: 上方固定baseline起點、實作時最新baseline及其diff、已通過validation.md/UI gate及產品版本。
  - 寫入範圍：`specs/ui-baseline/split-ledger.pen`、相關previews/、README.md與適用ledger/expense-create索引；將已驗收的旅行管理/垃圾桶/縮圖、新增選填圖片與全站等待共用元件/狀態回填，記錄產品commit、涵蓋frame、預覽hash、差異與更新紀錄。
  - 用支援.pen的設計工具編輯/儲存/核對，保留既有三區組織與baseline-v0.1/v0.2/v0.3未改成果；同畫面衝突回交owner，禁止用舊整檔覆蓋最新基準或將未驗收範圍升為現況。

- [ ] T291 subagent review (baseline backfill)
  - 本輪處置：T290暫緩，故本輪不執行回填核對。
  - Dependencies: T290。
  - Read: 基準diff、UI gate、產品驗收版本、.pen可編輯結構/預覽/README與其他plan整合差異。
  - Evidence: 未參與回填的審查者核對產品/設計/基準/索引同版一致、只回填已驗收範圍、保留其他成果，實際版本與findings落validation.md；這是回填核對，不再加第二個產品UI家族gate。

- [X] T292 保存最終交付與續跑/完成狀態
  - 2026-11-18更新：記錄人工UI接受、兩處CSS修正與局部驗證、更新目前handoff及人工驗證狀態；使用者授權提交／推送並合併main。四項歷史驗證／基準缺口仍保留，Git實際提交與合併結果以歷史為準。
  - 本輪交付例外：2026-11-17使用者明確將UI交其人眼驗證；本筆改為保存工程交付及T287/T289/T290/T291暫緩狀態，不宣稱原完整plan全部通過。已更新tasks/validation/handoff/manual-validation；核對產品1493來源未變、diff hygiene與程序退出，manual入口保留供使用者人工檢視，未commit/push/deploy。
  - Dependencies: 原T291本輪依上述使用者指示豁免；工程T288已通過。
  - Dependencies之外亦核對所有任務與工程/人工證據完整；更新本plan/handoff/validation的版本、未提交變更、資源/受管程序、完整矩陣、基準回填與審查結果。所有要求通過才標plan完成；受阻/未跑保持未完成，需發布或正式部署另依使用者指示，不因本清單自動執行。

## 畫面／狀態到任務綁定

以下38個frame ID來自已確認design-v7的 `ui/ui-plan.md`，共用32份PNG；標示共用狀態的列引用相同語意總表，尺寸/適配依原.pen frame與UI註記；每個消費者同時包含相應Green與Refactor，實作改動後需更新其畫面證據。baseline與本次提案不混版。

| 畫面／狀態 | .pen frame／同版預覽 | Feature Green／Refactor |
| ---------- | -------------------- | ----------------------- |

| `U01-D` | `qOVYr`／`ui/design-previews/qOVYr.png` | T258/T259, T266/T267 |
| `U01-M` | `uBMYs`／`ui/design-previews/uBMYs.png` | T258/T259, T266/T267 |
| `U02-D` | `nh4JN`／`ui/design-previews/nh4JN.png` | T258/T259, T266/T267, T272/T273 |
| `U02-M` | `c5e28`／`ui/design-previews/c5e28.png` | T258/T259, T266/T267, T272/T273 |
| `U03-D` | `WLw0N`／`ui/design-previews/WLw0N.png` | T258/T259, T266/T267 |
| `U03-M` | `VtNXn`／`ui/design-previews/VtNXn.png` | T258/T259, T266/T267 |
| `U04-D` | `Wd1Pq`／`ui/design-previews/Wd1Pq.png` | T260/T261, T264/T265 |
| `U04-M` | `A0kb5`／`ui/design-previews/A0kb5.png` | T260/T261, T264/T265 |
| `S01-D` | `k5UPcL`／`ui/design-previews/k5UPcL.png` | T258/T259, T282/T283 |
| `S01-M` | `vkszC`／`ui/design-previews/vkszC.png` | T258/T259, T282/T283 |
| `S02-D` | `G7HrKo`／`ui/design-previews/G7HrKo.png` | T258/T259, T282/T283 |
| `S02-M` | `rHv6p`／`ui/design-previews/rHv6p.png` | T258/T259, T282/T283 |
| `S03-D` | `ybPvI`／共用狀態 `ui/design-previews/DECWg.png` | T260/T261, T264/T265, T276/T277 |
| `S03-M` | `DECWg`／`ui/design-previews/DECWg.png` | T260/T261, T264/T265, T276/T277 |
| `S04-D` | `g1Pexm`／共用狀態 `ui/design-previews/U2nnu.png` | T258/T259, T274/T275, T278/T279 |
| `S04-M` | `U2nnu`／`ui/design-previews/U2nnu.png` | T258/T259, T274/T275, T278/T279 |
| `S05-D` | `M6LRw`／共用狀態 `ui/design-previews/kMwFM.png` | T260/T261, T262/T263, T268/T269, T270/T271, T272/T273, T280/T281 |
| `S05-M` | `kMwFM`／`ui/design-previews/kMwFM.png` | T260/T261, T262/T263, T268/T269, T270/T271, T272/T273, T280/T281 |
| `S06-D` | `ddFff`／共用狀態 `ui/design-previews/hmwlx.png` | T268/T269, T270/T271, T272/T273 |
| `S06-M` | `hmwlx`／`ui/design-previews/hmwlx.png` | T268/T269, T270/T271, T272/T273 |
| `S07-D` | `vCf8Y`／`ui/design-previews/vCf8Y.png` | T266/T267 |
| `S07-M` | `quiiR`／`ui/design-previews/quiiR.png` | T266/T267 |
| `S09-D` | `s8IowS`／`ui/design-previews/s8IowS.png` | T260/T261 |
| `S09-M` | `tI380`／`ui/design-previews/tI380.png` | T260/T261 |
| `U05-M1` | `FTGvi`／`ui/design-previews/FTGvi.png` | T258/T259 |
| `U05-M2` | `skr2f`／`ui/design-previews/skr2f.png` | T258/T259 |
| `U05-M3` | `K7sv4E`／`ui/design-previews/K7sv4E.png` | T258/T259 |
| `S08-D` | `Z6aGfB`／`ui/design-previews/Z6aGfB.png` | T270/T271, T272/T273, T274/T275, T276/T277, T278/T279, T280/T281, T282/T283 |
| `S08-M1` | `lEany`／共用狀態 `ui/design-previews/Z6aGfB.png` | T270/T271, T272/T273, T274/T275, T276/T277, T278/T279, T280/T281, T282/T283 |
| `S08-M2` | `l3jVE`／共用狀態 `ui/design-previews/Z6aGfB.png` | T270/T271, T272/T273, T274/T275, T276/T277, T278/T279, T280/T281, T282/T283 |
| `U06-D` | `ZMoXS`／`ui/design-previews/ZMoXS.png` | T258/T259 |
| `U06-M` | `xsZKA`／`ui/design-previews/xsZKA.png` | T258/T259 |
| `U07-D` | `Dsq2D`／`ui/design-previews/Dsq2D.png` | T262/T263, T264/T265 |
| `U07-M` | `kOFc3`／`ui/design-previews/kOFc3.png` | T262/T263, T264/T265 |
| `U08-D` | `GfuLl`／`ui/design-previews/GfuLl.png` | T262/T263 |
| `U08-M` | `eSFbG`／`ui/design-previews/eSFbG.png` | T262/T263 |
| `S10-D` | `s825M`／`ui/design-previews/s825M.png` | T262/T263, T276/T277 |
| `S10-M` | `F1Hwk`／`ui/design-previews/F1Hwk.png` | T262/T263, T276/T277 |

## 驗收分類與交接 checkpoints

| 類型／來源                               | 任務與證據責任                                                                                              |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| US1／FR001～008、FR018、SC001～003       | 後端生命週期/永久刪除/scope/分類/競爭與前端管理/舊連結/舊表單；真DB、權限、完整復原、範圍外不變、取消與焦點 |
| US2／FR009～013、SC003～004              | 圖片格式/容量/正規化/private讀取與前端草稿/兩階段/重傳/fallback/換帳；全部表列邊界及方向/metadata/舊版本    |
| US3／FR014～017、NFR001～002、SC005～006 | 全站12初讀/22操作/登入/分頁/背景/paused/unknown/減少動態效果；按權威資料與請求數驗，不只畫面字              |
| 非功能、相容性與災難恢復                 | Linux、RSS/CPU、備份還原、真機及輔助工具、全矩陣/編譯品質；各工程task明列來源與證據，不替代產品BDD          |
| 呈現與現況同步                           | 一次UI quality gate→已驗收baseline回填→獨立回填核對；已批准設計直接沿用，只有新重大偏差才需新決策           |

詳細47個acceptance模板到114 Rules的完整對照保留在 `dsl-refine-review.md`；本清單的每個truth feature均有唯一Green/Refactor。410個展開規格的分端計數見本檔執行矩陣；逐句代表入口已內嵌各task，這些均不是已執行測試數。

| Checkpoint | 完成條件／驗證 | 下一範圍與交接 |
| ---------- | -------------- | -------------- |

| Setup/Foundation | T001–T008完成、環境smoke與骨架編譯；未做產品行為 | Phase3第一句；handoff.md |
| 全批測試層review | T009–T239完成且T240獨立審查通過、無undefined | 第一個backend Green；handoff.md及validation.md |
| 後端完整功能組 | 8新增Feature各Green/Refactor及T257完整後端回歸通過 | 前端管理代表畫面；handoff.md |
| 第一組代表畫面 | T259完成、U02/U06/S01兩尺寸及整檔通過 | 縮圖/新增及其餘前端；handoff.md |
| 其餘前端功能組 | 最後前端Refactor T283及所有先前scope/畫面證據齊備 | Linux/資源/備份/人工與完整整合；handoff.md |
| 最終整合與UI | T284–T288、T289通過 | T290基準回填；handoff.md |
| 基準與最終交付 | T290、T291、T292完成 | 所有要求均滿足才標plan完成 |

抵達上述session checkpoint時保存交接並結束當輪，不自動建立新chat；下一輪依已解鎖task續跑，不重新審批有效design-v7、不跳過未完成review。缺真機/平台/審查工具時僅阻擋其依賴，保持實際進度，不把缺項標通過。

## 2026-11-15 /tasks 增量相依修正

T245整檔的purged Given必須使用正式purge；原T245→T246→T247順序形成無法完成的驗收前序。保留全部ID、T001–T244狀態、truth及整檔Green/refactor門檻，修正主鏈為T244→T247→T248→T245→T246→T249，並依執行順序交換兩phase區塊。T247必要直接依賴明列既有purge Then所查的已提交receipt GET及purged圖片404；不縮減驗收、不mock Given、不宣稱完整receipt scope完成。T245先前6/9PASS及reset/trash各focused1PASS屬部分證據，維持[ ]，待T248後重跑全部9例與回歸。根據/tasks SOP Phase5增量保留ID與歷史證據規則，以及plan Wave1/2、data purge及DSL已刪旅行建態權威；不涉及UI或truth語意決策。
