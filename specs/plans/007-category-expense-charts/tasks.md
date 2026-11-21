# 任務規劃：旅行分類花費分析

**Plan package**: `specs/plans/007-category-expense-charts`
**核心輸入**: `spec.md`、`plan.md`、`research.md`、`truth-delta.md`、`dsl-refine-review.md`、`ui/ui-plan.md`、`specs/truth/techstack.md`、`specs/truth/contracts/**`、`specs/truth/data/data-model.dbml`、本輪8份 `specs/truth/features/{backend,frontend}/expenses/分類*.feature` 及同模組 `dsl.md`。

## 任務綁定契約

- 本文件只規劃執行，所有新task初始未完成；既有UI批准直接引用，不新增重複的USER-CONFIRM。產品行為由truth feature/DSL、API/data契約及delta約束，不把截圖、工程檢查或單元測試當主驗收替代品。
- Setup只做新增圖表技術與環境；Foundational只建立可共用的入口/骨架；所有新增DSL測試集中Phase3。全批測試層review通過後才寫產品碼；分析wave1/2是規劃歷史，本次執行未另拆測試波次。
- `/dsl-refine` delta為ADD13/NOOP3，沒有MODIFY/DELETE行為：8個ADD feature，BE29及FE74個ADD DSL句型。每句一個RED任務；本輪既有step搜尋未發現分類分析/expense-analysis綁定，不需ALIGN/REMOVE或CODE-REMOVE。兩介面根DSL無本輪句型，不放進各Feature必讀。
- 一條task只在實作及指定驗證完成後標[X]，附固定版本/log/範圍。RED允許因產品尚未實作而失敗，但不允許undefined、stub、缺fixture/服務/權限環境或測試自身例外；Given可獨立落地且不得預先做目標讀取。GREEN不藉改truth/弱化oracle/跳過case通過。
- 本輪寫入範圍：tasks及plan-side交接；未修改truth或產品。未安排commit/PR/部署，後續變更依既有授權範圍處理。

## UI 分流、資源模式與 session checkpoints

- 資源契約：`profile=low-memory-16gb`，RAM/swap未知；主代理實作，沿用既有`/root/record_truth_delta`作未參與實作的固定reviewer，最多main+1（含idle）、heavy工作1、workers=1，Chromium→WebKit依序；[P]是獨立性提示，實際每輪恰一個已解鎖task，不逐句spawn。審查者不得改受審實作或另建代理；無法確認釋放則交接，不增加替代常駐環境。
- 程序/資源登記位置：執行時`validation.md`記錄task、版本、PID/session/用途、開始/退出/未知、記憶體可觀測基線；入口/重型命令前/每task後檢查，只清理由本輪啟動且可確認歸屬的程序。不能以agent回覆當OS回收證明。當前無新server，歷史Pen session27046退出未知，保留使用者Pen app。
- C類IF-01：帳本入口、獨立分析頁、兩圖、共享幣別、資訊卡及狀態；IF-02/03是該C功能行為依賴，無額外畫面。B類：沿用支出/分類/成員/旅行管理、既有totals/結餘位置與等待流程，只增加分析失效及快取隔離；不改其資訊位置。
- 固定現況：commit `8fc9f94134c66ffd29918014b950894b1007aa86` 下 `specs/ui-baseline/split-ledger.pen`、`ledger-baseline.md`及帳本/支出預覽；baseline hash `144a81b3086885bf57f5a694a78ed75f089f032730f91767088598ed1572a3d3`。規劃時產品HEAD `d00f8b066ccb37645eb5b12ba16731a012c5d928`，執行另固定實際產品版本。
- 新設計：`ui/split-ledger-007.pen` design-v1，交付hash `d74e31d53c59f19ab2b4e5991808673fd599020b81dd0667a186f98ded8f3968`；確認時hash `5337ee04327ee2e2e3076ae6055cf6c72a99d38435f0af4f874faa9bcbd45665`，只更新批准索引，八張產品預覽未變。使用者2026-11-19「UI 確認 ok」批准相同範圍；prototype **不製作**，無待確認/原型阻礙。若改設計意圖，只有受影響任務回交ui-plan並阻擋，不自行縮規格。
- 基準回填：產品全綠、適用完整回歸、逐畫面比對及唯一UI家族gate後，才回填新增分析頁/入口/共用圖表狀態與預覽/README；再獨立核對。規劃與早期GREEN不得把提案升成baseline。

| Checkpoint | 完成條件／驗證 | 下一範圍與交接 |
| --- | --- | --- |
| CP1 測試層 | T111獨立全批review，8檔無undefined，精確DB oracle及89案例映射完整，RED原因可解釋 | 後端3份feature；handoff.md保存RED/待跑矩陣 |
| CP2 後端完整組 | T112–T117完成，30案例全綠、同快照與舊totals相容；後端受影響回歸通過 | 代表前端入口/主頁；handoff.md |
| CP3 代表桌機/手機 | T118–T120完成，主分析1440×900/390×844同混合資料及入口局部/完整上下文比對無未決差異 | 其餘4份前端feature；handoff.md |
| CP4 其餘前端 | T121–T128全綠，保存變更/互動/讀取/權限所有相關畫面及適用狀態比對 | 最終完整回歸與UI家族審查；handoff.md |
| CP5 最終整合 | T129–T133完整矩陣、工程證據、UI gate通過 | 回填baseline並獨立核對；handoff.md |
| CP6 交付 | T134–T135完成，基準/預覽/README與已驗收固定產品一致 | plan交付；仍不自動部署 |

到達session checkpoint保存目前task、dirty、版本、證據、未跑矩陣、服務退出/未知與下一範圍後結束該session；不重問已授權工作。未跑/skip/中止不當通過，不拼接不同版本的零散成功冒充完整矩陣。

## 驗收分類與證據

| 類型／來源 | 執行承接 | 通過證據與依賴 |
| --- | --- | --- |
| 產品：FR001–010、SC001–003及A1–4 | BE精確統計、FE入口與數值 | 真API+PostgreSQL、精確分數oracle、分類完整集合、圖形/文字比例；Phase3review後GREEN |
| 產品：FR012、SC004及A5–7 | BE資料修正、FE修正後重看 | 保存前真快照、保存後DB權威與重開新response/畫面，不預刷新快取 |
| 產品：FR011/013、NFR002、SC005及A8–11 | FE圖表互動/讀取狀態 | 真response barrier/錯誤、觸控/鍵盤/減少動態、舊全圖保留、跨scope競態 |
| 產品：FR004/014、SC006及A12–13 | BE/FE存取與生命週期 | 401/404/409、不洩漏、DB不變、原快取與資訊卡移除、復原 |
| 工程：research決策2/4/7、data NOOP及效能風險 | Phase3的算術/幾何focused測試，T129–T131 | 巨大整數/100÷3/歷史尺度/有限權重/真DB EXPLAIN與負載紀錄，不新增數值SLO或持久化表 |
| C類呈現：approved ui/ui-plan.md | T120逐代表比對、各FE任務逐狀態比對、T133唯一UI gate | 固定設計/產品、同尺寸/同資料截圖與逐項差異表；不使用像素快照自動回歸取代功能 |
| B類相容/重構：delta NOOP | 每組REFACTOR及T130/T132 | 既有expenses、categories、members、repayments、settlements、trips、design-system完整受影響回歸；無另起純重構專案 |
| 確認：design-v1使用者批准 | 已有效，為前端GREEN的引用前置 | 原回覆及固定hash已核對，沒有新增USER-CONFIRM任務；新意圖變更才重新走適用確認 |
| 工程交付：共用UI契約回填 | T134→T135 | 產品驗收後正式工具更新.pen、README/同版預覽，再獨立比對；無假.pen、無覆蓋其他plan成果 |

## 執行入口與完整測試帳

- 現有BDD入口：`apps/api/playwright.config.ts`、`apps/web/playwright.config.ts`；steps glob是`./tests/steps/**/*.ts`，`missingSteps=fail-on-gen`；新檔放 `tests/steps/expenses/category-analysis/` 即可被載入。獨立DB fixture沿用正式migrations與`apps/api/tests/support/fixtures.ts`；web fixture沿用真API/Vite proxy，不新建mock後端。
- 產生與列舉：`pnpm exec bddgen -c apps/api/playwright.config.ts`、web同理，執行時保存`playwright test --list`到矩陣清單。聚焦單檔：`pnpm exec playwright test -c apps/api/playwright.config.ts 'expenses/<檔名>.feature.spec.js' --workers=1`；web加`--project=chromium`或`--project=webkit`逐一執行。檔案名稱原樣引用，不用只挑一條grep代替整份Test Scope。
- Phase3全批：api `--grep @F007-B`、web `--grep @F007-F`，但仍先生成兩端所有feature檢查既有綁定無衝突。當缺產品導致Given前序無法完成時記產品失敗；不可改成假API成功讓測試跑過。
- 30個BE語意案例至少1次；FE59個語意ID都覆蓋Chromium/WebKit。F01/F30/F31/F33/F57固定桌機，F02/F32/F58固定手機；其餘51個ID兩個尺寸皆執行。基礎FE矩陣110次/瀏覽器、合計220次；固定Given覆寫viewport時不得把同一次誤算成兩種尺寸覆蓋。F03本身以獨立裝置執行、Then不重開頁。
- 變體另列：F32/F58扇形與常駐列點按；F33 Enter與Space；F34/F40/F41及waiting/動畫相關範圍採reduced-motion；hover離開、資訊卡靠viewport邊界/不遮底部、Escape/關閉回焦與Tab接續。以fixture/runner的顯式variant入口安排，保留feature唯一Act，不在Then再推進操作。基礎220不包含額外變體，預期案例數由T111鎖定的實際list/manifest列出，不以總數掩蓋漏ID。
- `validation.md`執行帳欄位：產品commit或HEAD+dirty檔案hash、task/feature/Rule ID、瀏覽器/viewport/variant、命令、預期數/通過/失敗/skip、exit code、log/trace/截圖、資源退出、review findings。每個最終版本完整跑，不把舊版成功累加。
- Vitest現有只include packages/tests與smoke，新增api/web純函式測試須在T006納入限定unit目錄；API support runner `playwright.support.config.ts`已覆蓋**/*.spec.ts；web support `playwright.web-support.config.ts`目前只含固定檔及splitting目錄，T006須加本輪category-analysis目錄，並命令覆寫其workers=2為1。

## Phase 1: Setup

**Goal**: 加入本輪選定的shadcn/ui本地Chart＋Recharts3技術，確認Node/peer及既有build可用；不接分析路由、不寫DSL或帳務規則。

- [X] T001 固定新增圖表依賴與相容版本
  Read: `specs/truth/techstack.md` → 分類花費分析；`research.md` → 決策3；`apps/web/package.json`、`pnpm-lock.yaml`。
  Dependencies: 無（第一個可執行task）。
  以Node24.22.2/pnpm11.25.0記錄執行環境；核對Recharts3穩定patch及React19.3.1對應react-is的可用性/peer，固定直接依賴與lockfile。保留React版本與現有primitive；無相容版本證據則停止此依賴、回交technical-research，不擅自升級React或更換圖表引擎。
  記錄安裝前build/bundle基線；不寫圖表產品資料、計算或測試DSL。
  驗證（2026-11-19）：Node24.22.2/pnpm11.25.0，固定recharts3.11.0/react-is19.3.1；peer涵蓋React19.3.1。安裝前後web build均exit0，JS497.25kB/gzip152.21kB；摘要見`checks/verification-summary.md`；原始T001輸出已本機封存，位置見`checks/README.md`。

- [X] T002 匯入本地Chart技術元件與最小配置
  Read: `research.md` → 決策3；`apps/web/src/components/ui/`、`apps/web/src/design-system.css`、`apps/web/src/lib/utils.ts`。
  Dependencies: T001。
  只匯入需要的shadcn ChartContainer/Tooltip/Content本地組件至`apps/web/src/components/ui/chart.tsx`，接既有CSS tokens/React型別與明確容器尺寸；記來源/版本/授權。可用隔離技術harness渲染靜態測試資料，不掛產品分析route，不實作分類選取/金額/百分比語意。

- [X] T003 smoke-test 驗證圖表依賴及技術環境
  Read: `research.md` → 決策3與風險；`apps/web/vite.config.ts`、`apps/web/tsconfig.json`。
  Dependencies: T002。
  單worker依序跑web typecheck/build與隔離harness的Chromium/WebKit基本掛載/resize，確認有界靜態Pie/Tooltip可載入、無console例外/peer衝突；記版本與log後清理技術harness，不新增產品入口。這是技術smoke，不跑/聲稱本輪BDD全綠。

## Phase 2: Foundational

**Goal**: 建立下游共用落點與資源管理骨架，每項只做結構，不實作DSL語意或產品行為。

- [X] T004 預留API來源讀取及純計算落點
  Read: `apps/api/src/modules/expenses/{index.ts,personal-totals.ts}`、`packages/shared/src/rational.ts`；`truth-delta.md` → API/data及後端feature ADD。
  Dependencies: T003。
  只做：預留`apps/api/src/modules/expenses/analysis/`的schema/repository/service純型別與空模組入口、現有expenses註冊接縫；引用既有ExactAmount型別。
  不做：不註冊可成功的分析GET、不寫SQL/owner或份額聚合、不回假空資料、不改舊totals/DB schema。

- [X] T005 預留前端容器、圖卡及API client落點
  Read: `apps/web/src/app/App.tsx`、`apps/web/src/api/index.ts`、`apps/web/src/features/trips/TripLedger.tsx`、`apps/web/src/components/QueryState.tsx`；`ui/ui-plan.md`。
  Dependencies: T004。
  只做：預留`apps/web/src/features/expenses/analysis/`與`apps/web/src/api/expense-analysis.ts`的型別/模組殼，圈定後續TripExpenseAnalysis/卡片/明細/資訊卡的責任；盤點結果已在本文件，不另輸出調查task。
  不做：不掛可操作route/帳本入口、不畫產品圖、不接fetch/query、不寫百分比/選幣規則、不改現有頁面。

- [X] T006 建立測試入口、world狀態及runner收錄骨架
  Read: `apps/api/tests/support/{world.ts,fixtures.ts,database.ts,seed.ts}`、`apps/web/tests/support/fixtures.ts`、兩端playwright.config.ts、`vitest.config.ts`、`playwright.web-support.config.ts`。
  Dependencies: T005。
  只做：預留兩端`tests/steps/expenses/category-analysis/`與`tests/support/category-analysis/`空模組及具名context型別；沿用scenario/worker隔離及正式migrations。讓Vitest限定收錄`apps/{api,web}/tests/unit/**/*.test.ts`、web-support收錄`**/category-analysis/**/*.spec.ts`；接明確viewport/variant參數入口但不放斷言。
  不做：不實作Given/When/Then、不加假通過step/skip、不啟動第二套服務、不更動舊BDD預期。

- [X] T007 預留獨立oracle及受控response生命週期入口
  Read: `apps/api/tests/support/splitting/expense-fixture.ts`、`apps/web/tests/support/loading/response-proxy.ts`、`apps/web/tests/support/trips/account-switch-fixture.ts`、`packages/shared/tests/money.test.ts`。
  Dependencies: T006。
  只做：預留seed/來源快照/獨立有理數oracle/page object/response barrier/context清理的函式簽名與檔案，標示world內ID映射；建立finally/teardown資源登記接縫。
  不做：不實作特定種子、分攤演算法/SQL oracle、barrier行為或斷言；這些在各DSL RED任務完成，不呼叫產品聚合函式自證。

## Phase 3: Test Alignment & Implementation

**Goal**: 全批對齊103條ADD DSL，再獨立review；不寫產品行為。BE/FE分組只利查找，不是兩個獨立解鎖wave。

**DSL 參照**:

- 每句唯一權威：後端 `specs/truth/features/backend/expenses/dsl.md` 或前端 `specs/truth/features/frontend/expenses/dsl.md` 的「007分類花費分析」區段；不掃其他模組、不把兩介面同文Given當同一StepDef。
- 本輪不使用根DSL rows。task標題完整句型對應該介面表的一列，讀Gherkin參數、DataTable、預設及後端/Playwright實作語意；Given/When依怎麼做/權威落地/回寫/不必查，Then依回應+DB或UI+真API/DB最低oracle。
- `truth-delta.md` → `/dsl-refine` 的8份feature與5組DSL ADD列；delta提供分類，具體契約以唯一DSL row為準。

**Markers**:

- `[BDD-RED]`：本輪103條皆為ADD且未有stepdef；完成綁定、必要helper與focused測試，失敗只能是產品缺口或有效assertion。
- `[BDD-ALIGN]` / `[BDD-REMOVE]` 定義維持模板：既有MODIFY測試對齊/DELETE測試移除；本輪沒有此類task。
- 三種marker只動測試層，不寫產品程式，不弱化truth/改成mock成功。

**Shared Must Read**:

- 上述兩份模組DSL的本輪每列；`truth-delta.md` → `/dsl-refine`；8份新增truth feature及`dsl-refine-review.md`的案例/畫面映射。
- 後端既有入口：`apps/api/tests/steps/expenses/`、`apps/api/tests/support/fixtures.ts`、`world.ts`、`seed.ts`、`splitting/expense-fixture.ts`、`personal-totals.spec.ts`。
- 前端既有入口：`apps/web/tests/steps/expenses/`、`apps/web/tests/support/{fixtures.ts,expense-helpers.ts}`、`splitting/fixture.ts`、`loading/response-proxy.ts`、`trips/account-switch-fixture.ts`；前序狀態及受控失敗不替換後端帳務。
- `specs/truth/contracts/groups/expenses.yaml` → getTripExpenseAnalysis；`specs/truth/contracts/components/schemas/expenses.yaml` → ExpenseCategory*；`specs/truth/data/data-model.dbml` → 分類分析Note/來源；`research.md` → 精確/近似與測試矩陣。

**Boundary**:

- T008–T110每task恰一個DSL row；只改該綁定及直接依賴helper/assertion。Read使用本介面模組表；依T007骨架建立測試語意，不改產品。
- 句型含前序已查看/已保存時，安排真權威來源與舊快照，不把本案例目標Act藏進Given；當產品尚缺端點/頁面時可合理RED，不以補假資料繞過。
- API聚合/精確分數及web格式化/圖形權重的focused單元測試跟各自相關Then任務完成，來源獨立：100/3、歷史尺度、超安全整數/401位字串、10^12累積端點、極小權重/無NaN/Infinity、半入去尾零。應驗證真函式，不建立與實作逐行鏡像的測試。
- BE ADD句「分類分析旅行已新增以下支出：」尚未被本輪BE feature引用，仍依delta列入一個RED task；以直接fixture/StepDef-support測試證明可落地、唯一綁定，不自行新增truth案例或宣稱它新增一條產品驗收。
- 最後T111必須由未參與此批測試實作的固定reviewer核對整批；問題由實作者修正再複審。不得將既有dsl-refine文件審查當本輪StepDef review。解鎖全部8個Feature的必要前置是T111。

**Parallel Hint**:

- T008–T036後端、T037–T110前端，語意上可獨立；同檔helper/world/config寫入需序列化。low-memory逐筆實作/驗證/回寫；不每句新建agent。T111等待全部103條完成後一次review。

### 後端 expenses DSL

- [X] T008 [P] [BDD-RED] backend `分類分析旅行已有以下支出：`
  Read: `specs/truth/features/backend/expenses/dsl.md:101` → 該完整row。
  Dependencies: T007；落點 `apps/api/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T009 [P] [BDD-RED] backend `分類分析旅行已新增以下支出：`
  Read: `specs/truth/features/backend/expenses/dsl.md:102` → 該完整row。
  Dependencies: T007；落點 `apps/api/tests/steps/expenses/category-analysis/` 及對應support。
  此ADD Given目前未被BE feature使用：加直接DB fixture/step-support測試，不新增truth Scenario。

- [X] T010 [P] [BDD-RED] backend `分類分析旅行尚無支出`
  Read: `specs/truth/features/backend/expenses/dsl.md:103` → 該完整row。
  Dependencies: T007；落點 `apps/api/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T011 [P] [BDD-RED] backend `分類分析旅行有 {筆數} 筆各 "{幣別}" {餐費} 的單人餐飲及旅行前 "{機票幣別}" {票價} 的機票`
  Read: `specs/truth/features/backend/expenses/dsl.md:104` → 該完整row。
  Dependencies: T007；落點 `apps/api/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T012 [P] [BDD-RED] backend `另一分類分析旅行有 "{幣別}" {金額} 的單人餐飲`
  Read: `specs/truth/features/backend/expenses/dsl.md:105` → 該完整row。
  Dependencies: T007；落點 `apps/api/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T013 [P] [BDD-RED] backend `分類分析旅行已有 Amy 還款 "{還款幣別}" {還款} 及 Bob 實付結清 "{實付幣別}" {實付}`
  Read: `specs/truth/features/backend/expenses/dsl.md:106` → 該完整row。
  Dependencies: T007；落點 `apps/api/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T014 [P] [BDD-RED] backend `分類分析支出 "{項目}" 已保存金額為 "{幣別}" {金額}`
  Read: `specs/truth/features/backend/expenses/dsl.md:107` → 該完整row。
  Dependencies: T007；落點 `apps/api/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T015 [P] [BDD-RED] backend `分類分析支出 "{項目}" 已保存分攤者為 "{分攤者}"`
  Read: `specs/truth/features/backend/expenses/dsl.md:108` → 該完整row。
  Dependencies: T007；落點 `apps/api/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T016 [P] [BDD-RED] backend `分類分析支出 "{項目}" 已刪除`
  Read: `specs/truth/features/backend/expenses/dsl.md:109` → 該完整row。
  Dependencies: T007；落點 `apps/api/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T017 [P] [BDD-RED] backend `分類分析的分類 "{舊名}" 已改名為 "{新名}"`
  Read: `specs/truth/features/backend/expenses/dsl.md:110` → 該完整row。
  Dependencies: T007；落點 `apps/api/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T018 [P] [BDD-RED] backend `分類分析支出 "{項目}" 已清除分類`
  Read: `specs/truth/features/backend/expenses/dsl.md:111` → 該完整row。
  Dependencies: T007；落點 `apps/api/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T019 [P] [BDD-RED] backend `分類分析成員 "{舊名}" 已改名為 "{新名}" 並停用`
  Read: `specs/truth/features/backend/expenses/dsl.md:112` → 該完整row。
  Dependencies: T007；落點 `apps/api/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T020 [P] [BDD-RED] backend `分類分析旅行狀態為 "{狀態}"`
  Read: `specs/truth/features/backend/expenses/dsl.md:113` → 該完整row。
  Dependencies: T007；落點 `apps/api/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T021 [P] [BDD-RED] backend `分類分析查看者為 "{身分}"`
  Read: `specs/truth/features/backend/expenses/dsl.md:114` → 該完整row。
  Dependencies: T007；落點 `apps/api/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T022 [P] [BDD-RED] backend `擁有者讀取分類分析`
  Read: `specs/truth/features/backend/expenses/dsl.md:115` → 該完整row。
  Dependencies: T007；落點 `apps/api/tests/steps/expenses/category-analysis/` 及對應support。
  對應IF02同快照契約補受控讀寫交錯的support測試，與B03/B14共同核對單次查詢的完整精確回應及唯讀；測試層安排，不在此實作transaction。

- [X] T023 [P] [BDD-RED] backend `目前查看者讀取分類分析`
  Read: `specs/truth/features/backend/expenses/dsl.md:116` → 該完整row。
  Dependencies: T007；落點 `apps/api/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T024 [P] [BDD-RED] backend `分類分析回傳 "{圖別}" 在 "{幣別}" 的完整分類金額：`
  Read: `specs/truth/features/backend/expenses/dsl.md:117` → 該完整row。
  Dependencies: T007；落點 `apps/api/tests/steps/expenses/category-analysis/` 及對應support。
  補本節列明的精確計算/格式化或有界圖形focused測試，實作缺口維持RED。

- [X] T025 [P] [BDD-RED] backend `分類分析回傳的完整總額如下：`
  Read: `specs/truth/features/backend/expenses/dsl.md:118` → 該完整row。
  Dependencies: T007；落點 `apps/api/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T026 [P] [BDD-RED] backend `分類分析回傳的幣別依序為 "{幣別清單}"`
  Read: `specs/truth/features/backend/expenses/dsl.md:119` → 該完整row。
  Dependencies: T007；落點 `apps/api/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T027 [P] [BDD-RED] backend `分類分析的 "{圖別}" 在 "{幣別}" 沒有分類且總額為零`
  Read: `specs/truth/features/backend/expenses/dsl.md:120` → 該完整row。
  Dependencies: T007；落點 `apps/api/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T028 [P] [BDD-RED] backend `分類分析回傳共同消費狀態為 "{狀態}"`
  Read: `specs/truth/features/backend/expenses/dsl.md:121` → 該完整row。
  Dependencies: T007；落點 `apps/api/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T029 [P] [BDD-RED] backend `分類分析成功且沒有任何支出幣別`
  Read: `specs/truth/features/backend/expenses/dsl.md:122` → 該完整row。
  Dependencies: T007；落點 `apps/api/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T030 [P] [BDD-RED] backend `分類分析旅行有歷史精度 {舊精度} 的 "{幣別}" {舊金額} 及精度 {新精度} 的 "{新幣別}" {新金額}，皆由 Alice 與 Amy 分攤`
  Read: `specs/truth/features/backend/expenses/dsl.md:123` → 該完整row。
  Dependencies: T007；落點 `apps/api/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T031 [P] [BDD-RED] backend `分類分析的 "{幣別}" 計算精度為 {精度}`
  Read: `specs/truth/features/backend/expenses/dsl.md:124` → 該完整row。
  Dependencies: T007；落點 `apps/api/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T032 [P] [BDD-RED] backend `分類分析查詢前後的來源帳務完全相同`
  Read: `specs/truth/features/backend/expenses/dsl.md:125` → 該完整row。
  Dependencies: T007；落點 `apps/api/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T033 [P] [BDD-RED] backend `分類分析另有與同行者 "{成員}" 同名的獨立帳號`
  Read: `specs/truth/features/backend/expenses/dsl.md:126` → 該完整row。
  Dependencies: T007；落點 `apps/api/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T034 [P] [BDD-RED] backend `分類分析的個人對象為 Alice 的擁有者成員`
  Read: `specs/truth/features/backend/expenses/dsl.md:127` → 該完整row。
  Dependencies: T007；落點 `apps/api/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T035 [P] [BDD-RED] backend `分類分析支出 "{項目}" 仍保留原本三個成員的歷史分攤`
  Read: `specs/truth/features/backend/expenses/dsl.md:128` → 該完整row。
  Dependencies: T007；落點 `apps/api/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T036 [P] [BDD-RED] backend `分類分析讀取被拒絕為 "{原因}"`
  Read: `specs/truth/features/backend/expenses/dsl.md:129` → 該完整row。
  Dependencies: T007；落點 `apps/api/tests/steps/expenses/category-analysis/` 及對應support。

### 前端 expenses DSL

- [X] T037 [P] [BDD-RED] frontend `分類分析旅行已有以下支出：`
  Read: `specs/truth/features/frontend/expenses/dsl.md:145` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T038 [P] [BDD-RED] frontend `分類分析旅行已新增以下支出：`
  Read: `specs/truth/features/frontend/expenses/dsl.md:146` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T039 [P] [BDD-RED] frontend `分類分析旅行尚無支出`
  Read: `specs/truth/features/frontend/expenses/dsl.md:147` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T040 [P] [BDD-RED] frontend `分類分析旅行有 {筆數} 筆各 "{幣別}" {餐費} 的單人餐飲及旅行前 "{機票幣別}" {票價} 的機票`
  Read: `specs/truth/features/frontend/expenses/dsl.md:148` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T041 [P] [BDD-RED] frontend `另一分類分析旅行有 "{幣別}" {金額} 的單人餐飲`
  Read: `specs/truth/features/frontend/expenses/dsl.md:149` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T042 [P] [BDD-RED] frontend `分類分析旅行已有 Amy 還款 "{還款幣別}" {還款} 及 Bob 實付結清 "{實付幣別}" {實付}`
  Read: `specs/truth/features/frontend/expenses/dsl.md:150` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T043 [P] [BDD-RED] frontend `分類分析支出 "{項目}" 已保存金額為 "{幣別}" {金額}`
  Read: `specs/truth/features/frontend/expenses/dsl.md:151` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T044 [P] [BDD-RED] frontend `分類分析支出 "{項目}" 已保存分攤者為 "{分攤者}"`
  Read: `specs/truth/features/frontend/expenses/dsl.md:152` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T045 [P] [BDD-RED] frontend `分類分析支出 "{項目}" 已刪除`
  Read: `specs/truth/features/frontend/expenses/dsl.md:153` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T046 [P] [BDD-RED] frontend `分類分析的分類 "{舊名}" 已改名為 "{新名}"`
  Read: `specs/truth/features/frontend/expenses/dsl.md:154` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T047 [P] [BDD-RED] frontend `分類分析支出 "{項目}" 已清除分類`
  Read: `specs/truth/features/frontend/expenses/dsl.md:155` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T048 [P] [BDD-RED] frontend `分類分析成員 "{舊名}" 已改名為 "{新名}" 並停用`
  Read: `specs/truth/features/frontend/expenses/dsl.md:156` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T049 [P] [BDD-RED] frontend `分類分析旅行狀態為 "{狀態}"`
  Read: `specs/truth/features/frontend/expenses/dsl.md:157` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T050 [P] [BDD-RED] frontend `分類分析查看者為 "{身分}"`
  Read: `specs/truth/features/frontend/expenses/dsl.md:158` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T051 [P] [BDD-RED] frontend `分類分析使用裝置為 "{裝置}"`
  Read: `specs/truth/features/frontend/expenses/dsl.md:159` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T052 [P] [BDD-RED] frontend `分類分析旅行的支出清單已載入 {筆數} 筆`
  Read: `specs/truth/features/frontend/expenses/dsl.md:160` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T053 [P] [BDD-RED] frontend `分類分析先前內容已確認`
  Read: `specs/truth/features/frontend/expenses/dsl.md:161` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T054 [P] [BDD-RED] frontend `分類分析保留選擇為 "{幣別}"`
  Read: `specs/truth/features/frontend/expenses/dsl.md:162` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T055 [P] [BDD-RED] frontend `分類分析頁已選擇 "{幣別}"`
  Read: `specs/truth/features/frontend/expenses/dsl.md:163` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T056 [P] [BDD-RED] frontend `分類分析頁已先查看 "{先前幣別}" 再選擇 "{目前幣別}"`
  Read: `specs/truth/features/frontend/expenses/dsl.md:164` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T057 [P] [BDD-RED] frontend `分類分析的 "{圖別}" 分類 "{分類}" 資訊卡已開啟`
  Read: `specs/truth/features/frontend/expenses/dsl.md:165` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T058 [P] [BDD-RED] frontend `分類分析資訊卡已關閉且焦點在原分類控制`
  Read: `specs/truth/features/frontend/expenses/dsl.md:166` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T059 [P] [BDD-RED] frontend `分類分析旅行有多個分類及超長分類名稱的已保存支出`
  Read: `specs/truth/features/frontend/expenses/dsl.md:167` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T060 [P] [BDD-RED] frontend `分類分析下一次讀取為 "{結果}"`
  Read: `specs/truth/features/frontend/expenses/dsl.md:168` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T061 [P] [BDD-RED] frontend `分類分析已有餐飲個人 "{幣別}" {個人}、團體 "{團體幣別}" {團體} 的已確認內容`
  Read: `specs/truth/features/frontend/expenses/dsl.md:169` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T062 [P] [BDD-RED] frontend `另一裝置已新增餐飲 "{幣別}" {金額} 且由 Alice 與 Amy 分攤`
  Read: `specs/truth/features/frontend/expenses/dsl.md:170` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T063 [P] [BDD-RED] frontend `分類分析頁已處於 "{狀態}"`
  Read: `specs/truth/features/frontend/expenses/dsl.md:171` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T064 [P] [BDD-RED] frontend `分類分析裝置已離線`
  Read: `specs/truth/features/frontend/expenses/dsl.md:172` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T065 [P] [BDD-RED] frontend `分類分析有日本餐飲 "{日本幣別}" {日本金額} 及台南交通 "{台南幣別}" {台南金額} 的兩趟單人旅行`
  Read: `specs/truth/features/frontend/expenses/dsl.md:173` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T066 [P] [BDD-RED] frontend `日本分類分析正在延遲讀取`
  Read: `specs/truth/features/frontend/expenses/dsl.md:174` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T067 [P] [BDD-RED] frontend `台南分類分析下一次讀取尚未完成`
  Read: `specs/truth/features/frontend/expenses/dsl.md:175` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T068 [P] [BDD-RED] frontend `目前已顯示台南分類分析且日本舊讀取仍在等待`
  Read: `specs/truth/features/frontend/expenses/dsl.md:176` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T069 [P] [BDD-RED] frontend `從帳本開啟分類分析`
  Read: `specs/truth/features/frontend/expenses/dsl.md:177` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T070 [P] [BDD-RED] frontend `在分類分析選擇幣別 "{幣別}"`
  Read: `specs/truth/features/frontend/expenses/dsl.md:178` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T071 [P] [BDD-RED] frontend `以鍵盤在分類分析選擇幣別 "{幣別}"`
  Read: `specs/truth/features/frontend/expenses/dsl.md:179` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T072 [P] [BDD-RED] frontend `以 "{操作}" 查看分類分析的 "{圖別}" 分類 "{分類}"`
  Read: `specs/truth/features/frontend/expenses/dsl.md:180` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T073 [P] [BDD-RED] frontend `以 "{操作}" 關閉分類分析資訊卡`
  Read: `specs/truth/features/frontend/expenses/dsl.md:181` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T074 [P] [BDD-RED] frontend `重試分類分析讀取`
  Read: `specs/truth/features/frontend/expenses/dsl.md:182` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T075 [P] [BDD-RED] frontend `回到目前旅行的分類分析`
  Read: `specs/truth/features/frontend/expenses/dsl.md:183` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T076 [P] [BDD-RED] frontend `切換至台南旅行分類分析`
  Read: `specs/truth/features/frontend/expenses/dsl.md:184` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T077 [P] [BDD-RED] frontend `日本旅行較晚的分類分析讀取完成`
  Read: `specs/truth/features/frontend/expenses/dsl.md:185` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T078 [P] [BDD-RED] frontend `開啟原旅行的分類分析連結`
  Read: `specs/truth/features/frontend/expenses/dsl.md:186` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T079 [P] [BDD-RED] frontend `從分類分析返回帳本`
  Read: `specs/truth/features/frontend/expenses/dsl.md:187` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T080 [P] [BDD-RED] frontend `分類分析的 "{圖別}" 在 "{幣別}" 顯示總額 "{總額}"`
  Read: `specs/truth/features/frontend/expenses/dsl.md:188` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T081 [P] [BDD-RED] frontend `分類分析頁屬於目前旅行且可返回原帳本`
  Read: `specs/truth/features/frontend/expenses/dsl.md:189` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T082 [P] [BDD-RED] frontend `手機帳本的分析入口位於旅行導覽下一列且底部導覽維持五項`
  Read: `specs/truth/features/frontend/expenses/dsl.md:190` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T083 [P] [BDD-RED] frontend `分類分析兩圖在桌機並排、手機依個人再團體排列`
  Read: `specs/truth/features/frontend/expenses/dsl.md:191` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T084 [P] [BDD-RED] frontend `分類分析頁的 "{圖別}" 在 "{幣別}" 顯示完整分類明細：`
  Read: `specs/truth/features/frontend/expenses/dsl.md:192` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。
  補本節列明的精確計算/格式化或有界圖形focused測試，實作缺口維持RED。

- [X] T085 [P] [BDD-RED] frontend `分類分析頁在 "{幣別}" 的個人總額為 "{個人}"、團體總額為 "{團體}"`
  Read: `specs/truth/features/frontend/expenses/dsl.md:193` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T086 [P] [BDD-RED] frontend `分類分析扇形與各圖精確分類比例一致`
  Read: `specs/truth/features/frontend/expenses/dsl.md:194` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。
  補本節列明的精確計算/格式化或有界圖形focused測試，實作缺口維持RED。

- [X] T087 [P] [BDD-RED] frontend `分類分析團體區塊說明只計至少兩人分攤的共同消費`
  Read: `specs/truth/features/frontend/expenses/dsl.md:195` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T088 [P] [BDD-RED] frontend `分類分析目前幣別為 "{幣別}" 且選項依序為 "{清單}"`
  Read: `specs/truth/features/frontend/expenses/dsl.md:196` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T089 [P] [BDD-RED] frontend `分類分析的 "{圖別}" 顯示 "{幣別}" 零值且沒有消費扇形或占比`
  Read: `specs/truth/features/frontend/expenses/dsl.md:197` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T090 [P] [BDD-RED] frontend `分類分析團體區塊顯示全旅行沒有共同消費的說明`
  Read: `specs/truth/features/frontend/expenses/dsl.md:198` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T091 [P] [BDD-RED] frontend `分類分析資訊卡顯示 "{分類}"、"{幣別}"、"{金額}" 與 "{占比}"`
  Read: `specs/truth/features/frontend/expenses/dsl.md:199` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T092 [P] [BDD-RED] frontend `分類分析常駐明細不依賴顏色或動畫才能閱讀`
  Read: `specs/truth/features/frontend/expenses/dsl.md:200` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T093 [P] [BDD-RED] frontend `分類分析兩圖的 "{分類}" 配色相同`
  Read: `specs/truth/features/frontend/expenses/dsl.md:201` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T094 [P] [BDD-RED] frontend `分類分析資訊卡關閉且焦點回到原分類控制`
  Read: `specs/truth/features/frontend/expenses/dsl.md:202` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T095 [P] [BDD-RED] frontend `分類分析的 "{圖別}" 為代表唯一分類的完整圓環`
  Read: `specs/truth/features/frontend/expenses/dsl.md:203` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T096 [P] [BDD-RED] frontend `分類分析的 "{圖別}" 分類 "{分類}" 金額為 "{金額}" 且占比顯示 "{占比}"`
  Read: `specs/truth/features/frontend/expenses/dsl.md:204` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T097 [P] [BDD-RED] frontend `分類分析所有分類名稱與金額完整可讀且不自動合併為其他`
  Read: `specs/truth/features/frontend/expenses/dsl.md:205` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T098 [P] [BDD-RED] frontend `分類分析顯示初次讀取狀態且沒有已確認的零總額`
  Read: `specs/truth/features/frontend/expenses/dsl.md:206` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T099 [P] [BDD-RED] frontend `分類分析顯示初讀失敗及重試，不冒充沒有支出`
  Read: `specs/truth/features/frontend/expenses/dsl.md:207` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T100 [P] [BDD-RED] frontend `分類分析顯示旅行尚無支出且沒有幣別選擇或消費扇形`
  Read: `specs/truth/features/frontend/expenses/dsl.md:208` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T101 [P] [BDD-RED] frontend `分類分析保留個人 "{幣別}" {個人}、團體 "{團體幣別}" {團體} 的圖表明細並顯示更新中`
  Read: `specs/truth/features/frontend/expenses/dsl.md:209` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T102 [P] [BDD-RED] frontend `分類分析保留個人 "{幣別}" {個人}、團體 "{團體幣別}" {團體} 的圖表明細並顯示更新失敗可重試`
  Read: `specs/truth/features/frontend/expenses/dsl.md:210` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T103 [P] [BDD-RED] frontend `分類分析保留舊內容、可辨識離線且更新動畫停止`
  Read: `specs/truth/features/frontend/expenses/dsl.md:211` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T104 [P] [BDD-RED] frontend `台南分類分析讀取中不顯示日本旅行的分類或金額`
  Read: `specs/truth/features/frontend/expenses/dsl.md:212` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T105 [P] [BDD-RED] frontend `分類分析顯示 "{狀態}" 且不洩漏原旅行圖表、分類或金額`
  Read: `specs/truth/features/frontend/expenses/dsl.md:213` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T106 [P] [BDD-RED] frontend `分類分析返回目前旅行帳本且原有總額與成員結餘位置保留`
  Read: `specs/truth/features/frontend/expenses/dsl.md:214` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T107 [P] [BDD-RED] frontend `分類分析個人餐飲的滑鼠提示已顯示`
  Read: `specs/truth/features/frontend/expenses/dsl.md:215` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T108 [P] [BDD-RED] frontend `將滑鼠移離分類分析的餐飲區域`
  Read: `specs/truth/features/frontend/expenses/dsl.md:216` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T109 [P] [BDD-RED] frontend `分類分析的滑鼠提示已關閉`
  Read: `specs/truth/features/frontend/expenses/dsl.md:217` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T110 [P] [BDD-RED] frontend `分類分析提供顯示取整說明且原始份額仍精確`
  Read: `specs/truth/features/frontend/expenses/dsl.md:218` → 該完整row。
  Dependencies: T007；落點 `apps/web/tests/steps/expenses/category-analysis/` 及對應support。

- [X] T111 subagent review (phase quality gate)
  Dependencies: T008–T110全部完成。
  Read: 本phase Shared Must Read、8檔89案例、103個DSL task diff及RED logs/矩陣、真DB種子與oracle、UI路由/資訊位置。
  由固定未實作審查者唯讀檢查：103唯一綁定/無undefined與模糊regex、資料合法/可獨立安排、89案例完整、失敗原因不是harness、無mock API自證/無產品碼；新unit與support測試有正確runner收錄。列明BE30及FE220基礎+變體矩陣、同一Rule不在Then重做Act；有issues先修再review。
  保存reviewer、固定diff/環境、findings/複審及完整RED執行帳到validation.md；通過只解鎖T112起8份feature，結束CP1。

## Phase 4A: ADD Feature File - backend/expenses/分類花費精確統計.feature

**Goal**: 建立單次同快照、全旅行分幣別精確分類分析。

**Shared Must Read**:

- `specs/truth/features/backend/expenses/分類花費精確統計.feature` → B01–B14、B29–B30；`specs/truth/features/backend/expenses/dsl.md` → 本檔所有steps唯一row與007共同oracle。
- `truth-delta.md` → `/dsl-refine` 的本feature ADD與本介面DSL ADD；`plan.md` → IF-02/03及UI分流；`dsl-refine-review.md` → 本檔Rule/acceptance/畫面對照。
- `specs/truth/contracts/groups/expenses.yaml` → getTripExpenseAnalysis/舊totals NOOP；`specs/truth/contracts/components/schemas/expenses.yaml` → 四個ExpenseCategory schema；`specs/truth/contracts/components/schemas/shared.yaml` → ExactAmount/ApiError；`specs/truth/data/data-model.dbml` → owner/member、expense/shares/category及分析Note；delta `/api-plan`/`/data-plan`對應列。
- `specs/truth/techstack.md` → 分類分析/測試；`research.md` → 決策1/2/6/7；delta `/technical-research`對應決策。

**受影響畫面與完成證據**:

- 不新增UI；資料支援analysis/main/states的C類行為依賴。
- 後端真API/DB Test Scope是此truth gate；無獨立視覺交付，不因資料介面另加UI家族審查。
- HTTP/DB快照、精確分數預期、權限/來源不變與controlled-interleaving證據留validation.md，不能僅驗回應文字。

**Boundary**:

- Dependencies: T111及T111；只實作本feature責任：apps/api/src/modules/expenses/analysis/：一次REPEATABLE READ read-only內驗owner/active、owner member、完整支出/shares/current分類名；TypeBox response與純BigInt reducer，無page/date截斷，hasShared跨全部幣別，最大歷史尺度含不合資格rows；無新表/索引/migration。
- 不改truth/弱化斷言、不新增協作權限/任意member selector/換匯/持久化分析，不把現有totals預設改成共同花費。REFACTOR保持行為、原scope及相關既有回歸全綠。

**Test Scope**:

- `specs/truth/features/backend/expenses/分類花費精確統計.feature` → B01–B14、B29–B30，完整檔案全綠；API專案workers1，不只聚焦一條抽樣。

- [X] T112 [BDD-GREEN] 讓 Test Scope 全綠
  Dependencies: T111、T111。
  落點與完成條件依本phase；先保留Phase3有效RED證據，再最小產品實作與整份Test Scope綠燈；保存log/精確oracle，並跑本feature相關純函式與受控同快照support測試，記錄DB來源不變；這些測試已在Phase3建立。

- [X] T113 [BDD-REFACTOR] 在綠燈下整理本feature責任與共用接縫
  Dependencies: T112。
  只整理本phase產品責任，重跑完整Test Scope及既有expenses/totals、來源修正/還款歷史與相關存取回歸，列出實際檔名/命令與結果；變更共享接縫時擴及全部消費者。不得宣稱未跑回歸通過。

## Phase 4B: ADD Feature File - backend/expenses/分類分析資料修正.feature

**Goal**: 重新查詢只採最新保存的來源與穩定身分。

**Shared Must Read**:

- `specs/truth/features/backend/expenses/分類分析資料修正.feature` → B15–B22；`specs/truth/features/backend/expenses/dsl.md` → 本檔所有steps唯一row與007共同oracle。
- `truth-delta.md` → `/dsl-refine` 的本feature ADD與本介面DSL ADD；`plan.md` → IF-02/03及UI分流；`dsl-refine-review.md` → 本檔Rule/acceptance/畫面對照。
- `specs/truth/contracts/groups/expenses.yaml` → getTripExpenseAnalysis/舊totals NOOP；`specs/truth/contracts/components/schemas/expenses.yaml` → 四個ExpenseCategory schema；`specs/truth/contracts/components/schemas/shared.yaml` → ExactAmount/ApiError；`specs/truth/data/data-model.dbml` → owner/member、expense/shares/category及分析Note；delta `/api-plan`/`/data-plan`對應列。
- `specs/truth/techstack.md` → 分類分析/測試；`research.md` → 決策1/2/6/7；delta `/technical-research`對應決策。

**受影響畫面與完成證據**:

- 不新增畫面；對應前端修正後重看。
- 後端真API/DB Test Scope是此truth gate；無獨立視覺交付，不因資料介面另加UI家族審查。
- HTTP/DB快照、精確分數預期、權限/來源不變與controlled-interleaving證據留validation.md，不能僅驗回應文字。

**Boundary**:

- Dependencies: T113及T111；只實作本feature責任：在同一來源查詢/分類關聯補修正、刪除、改幣別與未分類的重算責任；分類/成員以ID，inactive歷史不刪；固定ownerMemberId，維持舊CRUD與付款/結清語意。
- 不改truth/弱化斷言、不新增協作權限/任意member selector/換匯/持久化分析，不把現有totals預設改成共同花費。REFACTOR保持行為、原scope及相關既有回歸全綠。

**Test Scope**:

- `specs/truth/features/backend/expenses/分類分析資料修正.feature` → B15–B22，完整檔案全綠；API專案workers1，不只聚焦一條抽樣。

- [X] T114 [BDD-GREEN] 讓 Test Scope 全綠
  Dependencies: T113、T111。
  落點與完成條件依本phase；先保留Phase3有效RED證據，再最小產品實作與整份Test Scope綠燈；保存log/精確oracle。

- [X] T115 [BDD-REFACTOR] 在綠燈下整理本feature責任與共用接縫
  Dependencies: T114。
  只整理本phase產品責任，重跑完整Test Scope及既有expenses/totals、來源修正/還款歷史與相關存取回歸，列出實際檔名/命令與結果；變更共享接縫時擴及全部消費者。不得宣稱未跑回歸通過。

## Phase 4C: ADD Feature File - backend/expenses/分類分析存取邊界.feature

**Goal**: 分析GET沿用owner隔離與旅行生命週期。

**Shared Must Read**:

- `specs/truth/features/backend/expenses/分類分析存取邊界.feature` → B23–B28；`specs/truth/features/backend/expenses/dsl.md` → 本檔所有steps唯一row與007共同oracle。
- `truth-delta.md` → `/dsl-refine` 的本feature ADD與本介面DSL ADD；`plan.md` → IF-02/03及UI分流；`dsl-refine-review.md` → 本檔Rule/acceptance/畫面對照。
- `specs/truth/contracts/groups/expenses.yaml` → getTripExpenseAnalysis/舊totals NOOP；`specs/truth/contracts/components/schemas/expenses.yaml` → 四個ExpenseCategory schema；`specs/truth/contracts/components/schemas/shared.yaml` → ExactAmount/ApiError；`specs/truth/data/data-model.dbml` → owner/member、expense/shares/category及分析Note；delta `/api-plan`/`/data-plan`對應列。
- `specs/truth/techstack.md` → 分類分析/測試；`research.md` → 決策1/2/6/7；delta `/technical-research`對應決策。

**受影響畫面與完成證據**:

- 不另設錯誤UI；前端沿用TripAccessState。
- 後端真API/DB Test Scope是此truth gate；無獨立視覺交付，不因資料介面另加UI家族審查。
- HTTP/DB快照、精確分數預期、權限/來源不變與controlled-interleaving證據留validation.md，不能僅驗回應文字。

**Boundary**:

- Dependencies: T115及T111；只實作本feature責任：在expenses GET接既有requireOwnedTrip/登入guard與lifecycle；未登入401、他人/未知/purged404、本人trash409，先驗owner/lifecycle再讀子帳務；restore重新可讀，不重建purged來源。
- 不改truth/弱化斷言、不新增協作權限/任意member selector/換匯/持久化分析，不把現有totals預設改成共同花費。REFACTOR保持行為、原scope及相關既有回歸全綠。

**Test Scope**:

- `specs/truth/features/backend/expenses/分類分析存取邊界.feature` → B23–B28，完整檔案全綠；API專案workers1，不只聚焦一條抽樣。

- [X] T116 [BDD-GREEN] 讓 Test Scope 全綠
  Dependencies: T115、T111。
  落點與完成條件依本phase；先保留Phase3有效RED證據，再最小產品實作與整份Test Scope綠燈；保存log/精確oracle。

- [X] T117 [BDD-REFACTOR] 在綠燈下整理本feature責任與共用接縫
  Dependencies: T116。
  只整理本phase產品責任，重跑完整Test Scope及既有expenses/totals、來源修正/還款歷史與相關存取回歸，列出實際檔名/命令與結果；變更共享接縫時擴及全部消費者。不得宣稱未跑回歸通過。

## Phase 4D: ADD Feature File - frontend/expenses/分類分析入口與數值.feature

**Goal**: 從同旅行帳本開獨立分析頁並呈現精確分類。

**Shared Must Read**:

- `specs/truth/features/frontend/expenses/分類分析入口與數值.feature` → F01–F21；`specs/truth/features/frontend/expenses/dsl.md` → 本檔所有steps唯一row與007共同oracle。
- `truth-delta.md` → `/dsl-refine` 的本feature ADD與本介面DSL ADD；`plan.md` → IF-01及UI分流；`dsl-refine-review.md` → 本檔Rule/acceptance/畫面對照。
- `specs/truth/contracts/groups/expenses.yaml` → getTripExpenseAnalysis/舊totals NOOP；`specs/truth/contracts/components/schemas/expenses.yaml` → 四個ExpenseCategory schema；`specs/truth/contracts/components/schemas/shared.yaml` → ExactAmount/ApiError；`specs/truth/data/data-model.dbml` → owner/member、expense/shares/category及分析Note；delta `/api-plan`/`/data-plan`對應列。
- `specs/truth/techstack.md` → 分類分析/測試；`research.md` → 決策3/4/5/7；delta `/technical-research`對應決策。

- `ui/ui-plan.md` → 本feature上述畫面索引/有效批准/行為註記，`ui/split-ledger-007.pen` design-v1及本節frame對應`ui/design-previews/<frame>.png`；固定baseline commit/hash依本文件UI契約（不改用最新版取代批准）。B類既有呈現另讀固定產品HEAD的TripLedger/ExpenseForm/Categories/TripAccessState/QueryState及baseline帳本/支出預覽，依實際改動綁相關頁面。

**受影響畫面與完成證據**:

- ledger/analysis-entry desktop O24TBs/mobile zS1cF；analysis/main desktop z7pOeL/mobile vrPz0；group/mobile-scroll vjeyS；states GS7hF的zero/無共同。
- 第一組代表畫面須T120通過才解鎖其他同版型前端。
- 所有已影響frame在validation.md留設計/實作固定版本、同資料、尺寸、預期與產品截圖及「設計預期｜實際｜差異影響｜處理/確認」；未決差異或未跑矩陣維持未完成。

**Boundary**:

- Dependencies: T117及T111；只實作本feature責任：新增 /trips/:id/analysis、TripLedger入口、account/trip query+AbortSignal與精確payload client；兩圖/同幣別控制、圈心總額、常駐分類、10^12有界權重、零/無共同/幣別fallback；以獨立formatter取金額，不用圖形Number算金額。
- 不改truth/弱化斷言、不新增協作權限/任意member selector/換匯/持久化分析，不把現有totals預設改成共同花費。REFACTOR保持行為、原scope及相關既有回歸全綠。

**Test Scope**:

- `specs/truth/features/frontend/expenses/分類分析入口與數值.feature` → F01–F21，完整檔案全綠；Chromium/WebKit依序，依本文件完整viewport/變體帳，不只聚焦一條抽樣。

- [X] T118 [BDD-GREEN] 讓 Test Scope 全綠
  Dependencies: T117、T111。
  落點與完成條件依本phase；先保留Phase3有效RED證據，再最小產品實作與整份Test Scope綠燈；保存log/精確oracle及本phase畫面差異證據。

- [X] T119 [BDD-REFACTOR] 在綠燈下整理本feature責任與共用接縫
  Dependencies: T118。
  只整理本phase產品責任，重跑完整Test Scope及既有expenses、categories、旅行管理/設計系統中直接受影響案例，列出實際檔名/命令與結果；變更共享接縫時擴及全部消費者。不得宣稱未跑回歸通過。

## Phase 4D-Checkpoint: 代表畫面比對

**Goal**: 在主頁GREEN/REFACTOR後保存首組設計比對證據；不是另一個Feature或UI家族gate。

- [X] T120 完成第一組代表桌機／手機設計比對 checkpoint
  Dependencies: T118–T119。
  來源: `ui/ui-plan.md` → 代表畫面及共用UI交付契約；`dsl-refine-review.md` → 畫面/資料映射。
  使用同一台南旅行混合支出（個人600=餐飲300+購物300、團體1500=餐飲900+交通600），分析1440×900/390×844比對z7pOeL/vrPz0，手機捲動對vjeyS；帳本入口對O24TBs/zS1cF及完整ledger上下文。
  逐項核區塊/順序/導航/卡片/資訊密度/字體/色彩/間距/常駐分類/共用幣別，保存固定產品版本/設計hash、預期及實際截圖與差異處理，無未批准差異才解鎖T121–T128。這是代表畫面自查，不新增第二個UI家族gate；完成CP3後交接。

## Phase 4E: ADD Feature File - frontend/expenses/分類分析修正後重看.feature

**Goal**: 帳務保存成功後再次進分析取得最新兩圖。

**Shared Must Read**:

- `specs/truth/features/frontend/expenses/分類分析修正後重看.feature` → F22–F29；`specs/truth/features/frontend/expenses/dsl.md` → 本檔所有steps唯一row與007共同oracle。
- `truth-delta.md` → `/dsl-refine` 的本feature ADD與本介面DSL ADD；`plan.md` → IF-01及UI分流；`dsl-refine-review.md` → 本檔Rule/acceptance/畫面對照。
- `specs/truth/contracts/groups/expenses.yaml` → getTripExpenseAnalysis/舊totals NOOP；`specs/truth/contracts/components/schemas/expenses.yaml` → 四個ExpenseCategory schema；`specs/truth/contracts/components/schemas/shared.yaml` → ExactAmount/ApiError；`specs/truth/data/data-model.dbml` → owner/member、expense/shares/category及分析Note；delta `/api-plan`/`/data-plan`對應列。
- `specs/truth/techstack.md` → 分類分析/測試；`research.md` → 決策3/4/5/7；delta `/technical-research`對應決策。

- `ui/ui-plan.md` → 本feature上述畫面索引/有效批准/行為註記，`ui/split-ledger-007.pen` design-v1及本節frame對應`ui/design-previews/<frame>.png`；固定baseline commit/hash依本文件UI契約（不改用最新版取代批准）。B類既有呈現另讀固定產品HEAD的TripLedger/ExpenseForm/Categories/TripAccessState/QueryState及baseline帳本/支出預覽，依實際改動綁相關頁面。

**受影響畫面與完成證據**:

- analysis/main z7pOeL/vrPz0/vjeyS；B類原ExpenseForm/Categories/Members及ledger現況位置。
- 依賴代表畫面T120；保存後主頁新資料同尺寸比對，不重畫原管理UI。
- 所有已影響frame在validation.md留設計/實作固定版本、同資料、尺寸、預期與產品截圖及「設計預期｜實際｜差異影響｜處理/確認」；未決差異或未跑矩陣維持未完成。

**Boundary**:

- Dependencies: T120及T111；只實作本feature責任：將分析失效接入ExpenseForm保存/刪除、Categories改名/清除與成員變更；帳號級分類改名涵蓋所有引用旅行，保留既有mutation unknown/防重複，不把還款/實付算消費；更新分類/幣別資料不留舊圖。
- 不改truth/弱化斷言、不新增協作權限/任意member selector/換匯/持久化分析，不把現有totals預設改成共同花費。REFACTOR保持行為、原scope及相關既有回歸全綠。

**Test Scope**:

- `specs/truth/features/frontend/expenses/分類分析修正後重看.feature` → F22–F29，完整檔案全綠；Chromium/WebKit依序，依本文件完整viewport/變體帳，不只聚焦一條抽樣。

- [X] T121 [BDD-GREEN] 讓 Test Scope 全綠
  Dependencies: T120、T111。
  落點與完成條件依本phase；先保留Phase3有效RED證據，再最小產品實作與整份Test Scope綠燈；保存log/精確oracle及本phase畫面差異證據。

- [X] T122 [BDD-REFACTOR] 在綠燈下整理本feature責任與共用接縫
  Dependencies: T121。
  只整理本phase產品責任，重跑完整Test Scope及既有expenses、categories、旅行管理/設計系統中直接受影響案例，列出實際檔名/命令與結果；變更共享接縫時擴及全部消費者。不得宣稱未跑回歸通過。

## Phase 4F: ADD Feature File - frontend/expenses/分類圖表互動.feature

**Goal**: 三種操作皆可取得相同分類資訊並回焦。

**Shared Must Read**:

- `specs/truth/features/frontend/expenses/分類圖表互動.feature` → F30–F41、F57–F59；`specs/truth/features/frontend/expenses/dsl.md` → 本檔所有steps唯一row與007共同oracle。
- `truth-delta.md` → `/dsl-refine` 的本feature ADD與本介面DSL ADD；`plan.md` → IF-01及UI分流；`dsl-refine-review.md` → 本檔Rule/acceptance/畫面對照。
- `specs/truth/contracts/groups/expenses.yaml` → getTripExpenseAnalysis/舊totals NOOP；`specs/truth/contracts/components/schemas/expenses.yaml` → 四個ExpenseCategory schema；`specs/truth/contracts/components/schemas/shared.yaml` → ExactAmount/ApiError；`specs/truth/data/data-model.dbml` → owner/member、expense/shares/category及分析Note；delta `/api-plan`/`/data-plan`對應列。
- `specs/truth/techstack.md` → 分類分析/測試；`research.md` → 決策3/4/5/7；delta `/technical-research`對應決策。

- `ui/ui-plan.md` → 本feature上述畫面索引/有效批准/行為註記，`ui/split-ledger-007.pen` design-v1及本節frame對應`ui/design-previews/<frame>.png`；固定baseline commit/hash依本文件UI契約（不改用最新版取代批准）。B類既有呈現另讀固定產品HEAD的TripLedger/ExpenseForm/Categories/TripAccessState/QueryState及baseline帳本/支出預覽，依實際改動綁相關頁面。

**受影響畫面與完成證據**:

- detail/desktop ZAxvn、detail/mobile Lj8SI；main z7pOeL/vrPz0及GS7hF極小/長內容；資訊卡留同頁，不鑽取支出詳情。
- 依賴T120；1440×900/390×844同資料核提示/卡片、44px操作、focus/viewport邊界/不遮底部及長內容，留逐項差異表。
- 所有已影響frame在validation.md留設計/實作固定版本、同資料、尺寸、預期與產品截圖及「設計預期｜實際｜差異影響｜處理/確認」；未決差異或未跑矩陣維持未完成。

**Boundary**:

- Dependencies: T122及T111；只實作本feature責任：組合本地Chart與CategoryInfo/Details：hover移離、tap扇形/常駐列、Enter/Space、Escape/關閉回焦；兩圖同ID同色、tooltip精確值、長名稱不裁切/不併其他、極小正數與顯示取整說明、reduced-motion。
- 不改truth/弱化斷言、不新增協作權限/任意member selector/換匯/持久化分析，不把現有totals預設改成共同花費。REFACTOR保持行為、原scope及相關既有回歸全綠。

**Test Scope**:

- `specs/truth/features/frontend/expenses/分類圖表互動.feature` → F30–F41、F57–F59，完整檔案全綠；Chromium/WebKit依序，依本文件完整viewport/變體帳，不只聚焦一條抽樣。

- [X] T123 [BDD-GREEN] 讓 Test Scope 全綠
  Dependencies: T122、T111。
  落點與完成條件依本phase；先保留Phase3有效RED證據，再最小產品實作與整份Test Scope綠燈；保存log/精確oracle及本phase畫面差異證據。

- [X] T124 [BDD-REFACTOR] 在綠燈下整理本feature責任與共用接縫
  Dependencies: T123。
  只整理本phase產品責任，重跑完整Test Scope及既有expenses、categories、旅行管理/設計系統中直接受影響案例，列出實際檔名/命令與結果；變更共享接縫時擴及全部消費者。不得宣稱未跑回歸通過。

## Phase 4G: ADD Feature File - frontend/expenses/分類分析讀取與範圍狀態.feature

**Goal**: 初讀與背景更新保留正確快照且隔離遲到結果。

**Shared Must Read**:

- `specs/truth/features/frontend/expenses/分類分析讀取與範圍狀態.feature` → F42–F50；`specs/truth/features/frontend/expenses/dsl.md` → 本檔所有steps唯一row與007共同oracle。
- `truth-delta.md` → `/dsl-refine` 的本feature ADD與本介面DSL ADD；`plan.md` → IF-01及UI分流；`dsl-refine-review.md` → 本檔Rule/acceptance/畫面對照。
- `specs/truth/contracts/groups/expenses.yaml` → getTripExpenseAnalysis/舊totals NOOP；`specs/truth/contracts/components/schemas/expenses.yaml` → 四個ExpenseCategory schema；`specs/truth/contracts/components/schemas/shared.yaml` → ExactAmount/ApiError；`specs/truth/data/data-model.dbml` → owner/member、expense/shares/category及分析Note；delta `/api-plan`/`/data-plan`對應列。
- `specs/truth/techstack.md` → 分類分析/測試；`research.md` → 決策3/4/5/7；delta `/technical-research`對應決策。

- `ui/ui-plan.md` → 本feature上述畫面索引/有效批准/行為註記，`ui/split-ledger-007.pen` design-v1及本節frame對應`ui/design-previews/<frame>.png`；固定baseline commit/hash依本文件UI契約（不改用最新版取代批准）。B類既有呈現另讀固定產品HEAD的TripLedger/ExpenseForm/Categories/TripAccessState/QueryState及baseline帳本/支出預覽，依實際改動綁相關頁面。

**受影響畫面與完成證據**:

- GS7hF初載/空/初敗/背景/離線；main兩尺寸；切旅行讀取沿用header/TripAccessState。
- 依賴T120；每個pending/failed/empty/paused狀態在固定尺寸及可控真response下比對，區分舊確認值與新DB，不以快照測試取代oracle。
- 所有已影響frame在validation.md留設計/實作固定版本、同資料、尺寸、預期與產品截圖及「設計預期｜實際｜差異影響｜處理/確認」；未決差異或未跑矩陣維持未完成。

**Boundary**:

- Dependencies: T124及T111；只實作本feature責任：將分析query接既有QueryState/waiting：初載skeleton不假零、初敗重試、background保全圖/明細而busy可讀、失敗不標最新、paused停動畫；refocus重取及trip/account scope取消/結果歸屬；不以本地清空偽造成功。
- 不改truth/弱化斷言、不新增協作權限/任意member selector/換匯/持久化分析，不把現有totals預設改成共同花費。REFACTOR保持行為、原scope及相關既有回歸全綠。

**Test Scope**:

- `specs/truth/features/frontend/expenses/分類分析讀取與範圍狀態.feature` → F42–F50，完整檔案全綠；Chromium/WebKit依序，依本文件完整viewport/變體帳，不只聚焦一條抽樣。

- [X] T125 [BDD-GREEN] 讓 Test Scope 全綠
  Dependencies: T124、T111。
  落點與完成條件依本phase；先保留Phase3有效RED證據，再最小產品實作與整份Test Scope綠燈；保存log/精確oracle及本phase畫面差異證據。

- [X] T126 [BDD-REFACTOR] 在綠燈下整理本feature責任與共用接縫
  Dependencies: T125。
  只整理本phase產品責任，重跑完整Test Scope及既有expenses、categories、旅行管理/設計系統中直接受影響案例，列出實際檔名/命令與結果；變更共享接縫時擴及全部消費者。不得宣稱未跑回歸通過。

## Phase 4H: ADD Feature File - frontend/expenses/分類分析權限與生命週期.feature

**Goal**: 路由及舊快取不能繞過目前帳號與生命週期。

**Shared Must Read**:

- `specs/truth/features/frontend/expenses/分類分析權限與生命週期.feature` → F51–F56；`specs/truth/features/frontend/expenses/dsl.md` → 本檔所有steps唯一row與007共同oracle。
- `truth-delta.md` → `/dsl-refine` 的本feature ADD與本介面DSL ADD；`plan.md` → IF-01及UI分流；`dsl-refine-review.md` → 本檔Rule/acceptance/畫面對照。
- `specs/truth/contracts/groups/expenses.yaml` → getTripExpenseAnalysis/舊totals NOOP；`specs/truth/contracts/components/schemas/expenses.yaml` → 四個ExpenseCategory schema；`specs/truth/contracts/components/schemas/shared.yaml` → ExactAmount/ApiError；`specs/truth/data/data-model.dbml` → owner/member、expense/shares/category及分析Note；delta `/api-plan`/`/data-plan`對應列。
- `specs/truth/techstack.md` → 分類分析/測試；`research.md` → 決策3/4/5/7；delta `/technical-research`對應決策。

- `ui/ui-plan.md` → 本feature上述畫面索引/有效批准/行為註記，`ui/split-ledger-007.pen` design-v1及本節frame對應`ui/design-previews/<frame>.png`；固定baseline commit/hash依本文件UI契約（不改用最新版取代批准）。B類既有呈現另讀固定產品HEAD的TripLedger/ExpenseForm/Categories/TripAccessState/QueryState及baseline帳本/支出預覽，依實際改動綁相關頁面。

**受影響畫面與完成證據**:

- analysis/main與GS7hF權限狀態；ledger原baseline、返回入口；B類既有登入/旅行管理。
- 依賴T120；兩尺寸核登入/他人/trash/purge/restore、資訊卡不可見及返回ledger上下文，舊資料不留可及性樹。
- 所有已影響frame在validation.md留設計/實作固定版本、同資料、尺寸、預期與產品截圖及「設計預期｜實際｜差異影響｜處理/確認」；未決差異或未跑矩陣維持未完成。

**Boundary**:

- Dependencies: T126及T111；只實作本feature責任：分析route接登入/TripAccessState；登出/切帳號/trash/purge取消in-flight並清scope快取/選取/資訊卡，restore可重新讀；返回同旅行帳本，保留原totals/成員結餘/支出資訊位置。
- 不改truth/弱化斷言、不新增協作權限/任意member selector/換匯/持久化分析，不把現有totals預設改成共同花費。REFACTOR保持行為、原scope及相關既有回歸全綠。

**Test Scope**:

- `specs/truth/features/frontend/expenses/分類分析權限與生命週期.feature` → F51–F56，完整檔案全綠；Chromium/WebKit依序，依本文件完整viewport/變體帳，不只聚焦一條抽樣。

- [X] T127 [BDD-GREEN] 讓 Test Scope 全綠
  Dependencies: T126、T111。
  落點與完成條件依本phase；先保留Phase3有效RED證據，再最小產品實作與整份Test Scope綠燈；保存log/精確oracle及本phase畫面差異證據。

- [X] T128 [BDD-REFACTOR] 在綠燈下整理本feature責任與共用接縫
  Dependencies: T127。
  只整理本phase產品責任，重跑完整Test Scope及既有expenses、categories、旅行管理/設計系統中直接受影響案例，列出實際檔名/命令與結果；變更共享接縫時擴及全部消費者。不得宣稱未跑回歸通過。

## Phase 5: 工程驗證與最終整合

**來源**: `research.md` → 決策2/4/7、殘餘風險；`spec.md` → NFR001/002、SC001–006；`truth-delta.md` → 既有totals/資料模型NOOP。
**Dependencies**: T112–T128全部完成；這裡只補工程證據及執行已定義回歸，不新增未由truth承接的產品驗收。

- [X] T129 驗證精確計算、同快照實作與查詢成本證據
  Dependencies: T128。
  跑Phase3已建立的算術/幾何unit、API controlled-interleaving support測試：循環份額、混合歷史尺度、巨大字串、約分、finite 10^12累積權重與0/單分類/極小分類；核對數值近似只在繪圖邊界，無DB寫入。
  以真PostgreSQL及正式migrations建立多頁/較大資料集，記支出數/分攤數/分類數、EXPLAIN ANALYZE BUFFERS、查詢次數/延遲、payload及記憶體/分母成長；不要虛構毫秒SLO。發現實質瓶頸先做等價查詢優化並重跑受影響scope，需要新增索引/契約變更則回交owner，不能自行修改data truth或提前加彙總表。
  保存版本/資料量/SQL計畫/log至validation.md；既有資料庫與內容不被分析查詢改寫。

- [X] T130 執行完整後端與純函式回歸
  Dependencies: T129。
  依序執行`pnpm test:unit`、`pnpm exec bddgen -c apps/api/playwright.config.ts`與`pnpm exec playwright test -c apps/api/playwright.config.ts --workers=1`、`pnpm exec playwright test -c playwright.support.config.ts --workers=1`；涵蓋整個backend truth而非只30新例，舊totals/personal totals、expense修正、還款/結清、成員、分類及旅行生命週期均在完整帳。
  先gen後--list固定預期集合，0undefined/0失敗/0非預期skip；已GREEN但最終版本改動過的範圍必須重驗，輸出環境/命令/數量/exit/log與資源退出。

- [X] T131 完成工程品質與bundle檢查
  Dependencies: T130。
  依序跑`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`及`pnpm test:smoke`；若既有無關失敗須辨識固定版本證據並處理/記錄，不冒稱全通過。
  比較T001的前後build/bundle記錄，確認Chart只加入需要的組件、無重複React/不必要primitive、合理切分分析頁；記實際大小與變化及必要處理，不自行設未經研究的硬預算。檢查console/React及a11y診斷的適用項並收斂，不以lint代替UI/業務驗收。

- [ ] T132 執行完整前端及跨裝置整合回歸
  Dependencies: T131。
  先全量bddgen、--list固定矩陣；完整frontend truth依序Chromium→WebKit `pnpm exec playwright test -c apps/web/playwright.config.ts --project=<browser> --workers=1`，追加本文件新59語意ID的適用第二viewport與Enter/Space/觸控/reduced-motion/邊界變體。保留全部既有frontend案例，不只新220基礎次數。
  依序跑`pnpm exec playwright test -c playwright.web-support.config.ts --project=<browser> --workers=1`及`pnpm exec playwright test -c playwright.ui-quality.config.ts --project=<browser> --workers=1`；新category-analysis support目錄必須被T006收錄。
  整合帳覆蓋4份acceptance的13旅程對應89規則，實際跑量與ID/variant去重對帳。補人工觸控/VoiceOver等輔助科技主要路徑檢查（裝置/工具/範圍明列；無環境維持待驗證），同版本無缺項/非預期skip/未決缺陷才完成；不把模擬viewport宣稱真機證據。

## Phase 6: UI quality gate

**Goal**: 在最後一個設計消費者及最終整合後，僅一次獨立審查本輪UI產物家族。truth本身以各Test Scope全綠為gate，不額外重複家族審查。

**Read**:

- `ui/ui-plan.md`及有效design-v1 `.pen`/9份預覽、固定baseline commit/hash及既有ledger預覽；`plan.md` IF01/B類分流、`dsl-refine-review.md`畫面對照。
- T120及各FE GREEN的逐畫面/狀態差異表，T129–T132實際產品版本/回歸、可及性及工程證據；prototype不製作，無需補原型版本。

**Boundary**: 不改truth/設計遷就錯誤產品，不加feature，不用重跑GREEN或無溢出代替視覺比對；不新增每feature gate。

- [ ] T133 subagent review (UI quality gate)
  Dependencies: T120、T121–T132全部完成。
  由未參與產品/設計比對實作的固定reviewer核對analysis主頁兩尺寸、入口兩尺寸/完整ledger、手機團體捲動、hover/tap/鍵盤資訊卡、所有GS7hF狀態、權限/生命週期與返回同旅行；核對同資料、固定設計hash/產品版本、跨畫面一致性、全13旅程、文字/色彩/字體/間距/操作及狀態。
  保存reviewer/findings及逐項「預期｜實際｜差異與影響｜處理/確認」，實作者修正、適用測試/畫面重驗後複審；未決批准差異、未跑矩陣或範圍失效皆不可通過。通過是產品UI驗收，解鎖T134並完成CP5。

## Phase 7: 驗收後基準回填

**來源**: `plan.md`／`ui/ui-plan.md` → 實作驗收後回填責任；共用UI交付契約。
**Dependencies**: T112–T133全部完成，產品Test Scope/完整回歸/代表及逐畫面比對/唯一UI gate均通過；無新增使用者確認阻礙。

- [ ] T134 回填本次已驗收的共用基準
  Dependencies: T133。
  Read: 固定起點commit/hash、最新`specs/ui-baseline/**`與其更新紀錄、T120/各畫面驗收/T133固定產品證據。
  寫入範圍僅新增分析頁、帳本分析入口、必要共用圖卡/資訊卡/狀態及相應`specs/ui-baseline/previews/`、`README.md`和必要ledger-baseline索引。使用支援.pen格式的正式工具保存，不能以JSON/改副檔名或只PNG取代。
  先比較最新基準與固定起點，保留其他plan已驗收成果；同畫面/元件衝突按影響重驗並回交owner，不以舊整檔覆蓋。更新正式產品commit或可取回固定內容版本、frame/範圍/同版預覽/已知差異/更新紀錄，完成自查後留待T135獨立核對，不自行宣稱plan完成。

- [ ] T135 subagent review (baseline backfill)
  Dependencies: T134。
  由未參與本次回填實作的固定reviewer核對基準diff、產品驗收版本、.pen正式保存/frame、預覽及README/索引一致，且其他plan成果未被覆蓋；與T133的產品UI家族gate職責分開，不新增第二次產品gate。
  保存固定版本/檔案hash、reviewer、findings/處理及完整待跑為零的矩陣；回填有問題先修再核對。通過後回寫validation.md/handoff.md、CP6及tasks完成狀態，才可宣告本plan交付；沒有自動commit/PR/部署。
