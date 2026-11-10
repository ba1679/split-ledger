# Tasks: Owner 管理的旅行分帳與結算（005）

**Plan Package**: `specs/plans/005-owner-managed-trip-splitting`  
**Core Inputs**: `spec.md`、`plan.md`、`research.md`、`truth-delta.md`、`dsl-refine-review.md`、`frontend-dsl-review.md`、`specs/truth/techstack.md`、`specs/truth/contracts/openapi.yaml`、本輪 members/expenses/trips/settlement/repayments group 與 schemas、`specs/truth/data/data-model.dbml`、受影響的 `specs/truth/features/{backend,frontend}/` feature／模組 DSL／實際使用的根共用 DSL、`ui/ui-plan.md`、`ui/design-review.md`、`ui/split-ledger-005.pen`、對應畫面 PNG 與 HTML 流程示意。

## Task Binding Contract

- 產品行為對應 `truth-delta.md` 的 `/dsl-refine` ADD 語意單元；本輪24份新feature、212條新DSL，沒有需ALIGN／REMOVE的既有句型。214條實際使用的DSL均唯一匹配；既有2條註冊沿用。既有techstack/API/data的MODIFY由相關GREEN處理，不把它們誤標成DSL ALIGN。
- 以 `.agents/constitution/CONSTITUTION.md`、`.agents/constitution/shared.md` 為跨產物約束。檔名用英文；不改truth、acceptance、技能、HTML prototype或pen檔來配合程式過測試。若發現真實契約缺口，回交相應owner，而不是弱化斷言。
- Phase 1 Setup省略：`research.md` 決策1–2採既有React/Fastify/Drizzle/PostgreSQL/Playwright與原生BigInt；沒有新增框架或套件。NUMERIC欄位及有理數是產品模型，不是安裝技術。
- Phase 2只做型別、入口、fixture/helper/page object骨架；資料庫migration、演算法、路由接受寫入與可操作表單都屬Phase 4 GREEN。Phase 3集中完成每句測試，最後由subagent review；GREEN前不能有undefined/ambiguous step、語法或測試基建錯誤。
- API與資料的truth採 `specs/truth/**`，plan-side路徑相對本package。`ui`為一個planner產物家族（UI plan、pen、PNG與HTML流程示意），`research.md`為技術研究家族；各在最後消費者後剛好一題quality gate。spec/plan/truth-delta是需求與回追索引，不額外製造設計家族gate。
- GREEN → REFACTOR按下列順序執行；每題驗證通過才回寫 `[X]`。除Phase3明示 `[P]` 外不自動並行，共用API/資料/畫面落點採串行以免互蓋。
- 可重用的最小產品依賴不是額外任務：例如owner建立需members讀取、共同支出斷言需settlement與repayments讀取。相關GREEN可補足其Test Scope直接要求的唯讀投影；不能為方便而提早實作其他feature的獨立命令、確認流程或UI。
- 所有執行命令從repo root使用 `./scripts/pnpm.sh`，由既有wrapper選固定Node/pnpm。新檔案採現有TypeScript/Prettier/ESLint慣例。所有DB測試限定隔離ledger_test，不使用正式資料。
- 本輪沒有使用者要求的中途確認關卡，因此不新增 `[USER-CONFIRM]`；不包含部署、推送、commit或新的登入/邀請/共編能力。

## 驗收分類、證據與已完成盤點

| 驗收類型／來源 | 承接與證據 | 依賴 |
| --- | --- | --- |
| 產品行為：spec FR-001–041、NFR-001–004及4份acceptance | 24個Feature phase精確Test Scope、API/DB再讀、前端與權威狀態一致；197個原子Example。完整mapping見兩份DSL review。 | Phase3 gate→對應GREEN/REFACTOR |
| 數學與交易：research決策2–5、data truth、ExactAmount | BigInt獨立oracle、有理數/尺度/零和/差額純函式測試、同版本競態及中途故障回滾；不能使用受測函式產生預期值。 | 數學Then的Phase3測試→對應backend GREEN |
| 行為不變：原個人記帳、分類/幣別/日期/登入/分頁與未確認結果 | 原英文truth feature不刪；既有money、database、expenses、expense-form、save-outcomes、date-picker與UI回歸。 | 受影響Feature後focused回歸，交付時完整回歸 |
| UI品質：ui/ui-plan.md review七點與pen交接 | 桌面1280／375手機實際產品與對應PNG比較、箭頭16px內縮/右留44px、選項12px間距/44px點擊區；DateField選型及手機底部日曆。截圖為本輪review證據，不建立長期像素快照回歸。 | 全部前端Feature完成→ui quality gate |
| 工程交付：research決策7–8、plan Wave1–3、既有同origin部署組成 | 新migration不改舊checksum、舊資料前後快照、冷/熱啟動、local production深連結、build/typecheck/lint/format、驗證紀錄。 | 對應GREEN與兩個quality gate |
| 人工確認 | 沒有新增需人工批准的來源；實機/輔助工具未測範圍如實記錄。 | 不設人為阻擋 |

盤點已在本次規劃完成，不另產出impact-audit任務：既有BDD兩端採 `missingSteps: fail-on-gen`、steps遞迴glob與正式migration隔離DB；產品目前只有個人支出，尚無members/settlement/repayments模組。測試主要落點是 `apps/api/tests/support/{fixtures,seed,world,backend,database}.ts`、`apps/web/tests/support/{fixtures,expense-helpers,browser,accounts-categories-trips}.ts`。既有 `seed.ts` 已有 `requireProductTable` assertion，可沿用相同RED診斷模式；舊fixture仍須在測試層適配新增的合法owner/share資料，不重寫原DSL語意。

## Phase 2: Foundational

**Goal**: 建立測試與產品的可編譯落點，保持既有行為。所有新能力先只有契約或空骨架。

- [X] T001 建立共用分帳型別與純函式入口骨架
  - Read: `specs/truth/techstack.md` -> Phase1B精確分攤/分數傳輸；`research.md` -> 決策2–4；`packages/shared/src/index.ts`、`packages/shared/tests/money.test.ts`。
  - 只做：在 `packages/shared/src/` 建立ExactAmount、有理數、成員/幣別輸入與安排結果型別、英文命名模組與可編譯export介面；原parseMoney/formatMoney/rescaleMoney/combineMoney保留。未實作函式若需stub，明確拋出產品尚未實作錯誤，不回傳假零值。
  - 不做：份額/淨額/簡化/差額/兩位小數演算法，不寫測試斷言、不改舊金額規則或安裝decimal套件。
  - Evidence: shared build/typecheck成功，既有money單元回歸不變。已驗證：shared typecheck/build、money.test.ts 16/16 通過。

- [X] T002 建立後端分帳模組與內部依賴注入介面骨架
  - Read: `plan.md` -> Wave1–2；`specs/truth/contracts/groups/{members,settlement,repayments}.yaml`；`apps/api/src/{app,http}.ts`及現有modules/trips、expenses。
  - 只做：新增英文命名members/settlement/repayments產品模組、schema/service/repository型別與registration入口；定義交易barrier/故障點所需內部可選依賴介面及測試fixture接線型別。入口先不掛載可用業務路由，既有buildApp呼叫不受影響。
  - 不做：migration、成員CRUD、旅行鎖/revision、實付或簡化演算法；不加入正式環境可呼叫的測試端點。
  - Evidence: API typecheck/build通過；app僅新增可選型別設定，既有路由註冊及handler未變。

- [X] T003 建立分帳DB fixture／snapshot與精確oracle介面骨架
  - Read: `specs/truth/data/data-model.dbml` -> trip_members/expenses/expense_shares/repayments/settlements/settlement_adjustments及FK/生命週期；`apps/api/tests/support/{world,seed,database,fixtures}.ts`。
  - 只做：在 `apps/api/tests/support/splitting/` 建立namespace、ID對照、來源snapshot、獨立oracle、舊schema遷移fixture與barrier/DI wrapper的型別/空入口；拓展World slot型別，保留worker隔離與清理；建立接受phrase/typed input/callback的單句隔離harness骨架，不內建任何DSL字句；測試缺產品table/欄位用明確expect schema assertion診斷，而非SQL缺表錯誤。
  - 不做：任何DSL句的Arrange/Act/Assert、正式schema/migration、繞過鎖的假服務；具體來源資料與oracle行為由對應Phase3句型任務完成。
  - Evidence: tests typecheck通過；啟動隔離DB後既有support 17/17通過（首次DB連線失敗，服務啟動後重跑成功）。

- [X] T004 建立前端分帳型別與畫面模組落點
  - Read: `ui/ui-plan.md` -> 前端實作切分；`specs/truth/contracts/components/schemas/{trips,expenses,members,settlement,repayments,shared}.yaml`；`apps/web/src/api/index.ts`、`apps/web/src/app/App.tsx`。
  - 只做：新增members/settlement/repayments英文模組目錄與型別、api資料結構介面；規劃owner旅行下路由常數與export落點，沿用Button/Input/FormDialog/QueryState/DateField。
  - 不做：可操作表單/開關、mutation/query狀態機、成員選擇、數字格式或App路由掛載；不依舊prototype原生date改選元件。
  - Evidence: web typecheck及Vite production build通過；App路由未掛載新頁面。

- [X] T005 建立前端分帳page object與傳輸攔截骨架
  - Read: `apps/web/tests/support/{fixtures,browser,expense-helpers,save-outcomes.spec,date-picker.spec}.ts`；`frontend-dsl-review.md` -> fixture與權威結果邊界。
  - 只做：在 `apps/web/tests/support/splitting/` 建立頁面方法、穩定UUID記錄、API確認快照與遺失回應攔截的型別/介面骨架，型別重用API World；raw selectors只留page object層。
  - 不做：DSL註冊/具體驗證、假造後端成功結果、忽略404未明情況、產品頁或取整策略。
  - Evidence: tests typecheck與28項瀏覽器測試註冊成功；既有historical TWD流程在Chromium/WebKit 2/2通過，重用T003 World。

## Phase 3: Test Alignment & Implementation

**Dependencies**: T001–T005全部完成；本節每個句型任務均承接此依賴。

**Goal**: 產品碼之前完成212條新增DSL的測試註冊及完整語意；仍保留其餘2條既有註冊。

**DSL 參照**:
- 每題Read列指出唯一權威DSL。以完整句型定位該列，讀參數、DataTable、預設值與 `StepDef 實作語意`／`Playwright BDD 實作語意`；後端原有欄名 `後端實作語意` 等價。Given/When依怎麼做、落地、回寫、不必查；Then依response、DB/API權威、再讀與禁止結果。
- `truth-delta.md` -> `/dsl-refine` 212條ADD給分類；24個feature的具體規則決定本輪使用清單；不能用原型文案推導不同邏輯。
- 可重用且不列新任務：`specs/truth/features/backend/dsl.md` 的 `使用者"甲"已登入`，實作 `apps/api/tests/steps/shared/T064.ts`；`specs/truth/features/backend/trips/dsl.md` 的 `使用者"甲"建立未填日期的"日本旅行"`，實作 `apps/api/tests/steps/trips/T103.ts`。

**Markers**:
- `[BDD-RED]`：本輪全部新增句型；註冊可被runner找到、參數正確解析、實作完整契約。
- `[BDD-ALIGN]`：只在既有句語意MODIFY時使用；本輪沒有。
- `[BDD-REMOVE]`：只在DELETE時使用；本輪沒有。
- 三者都只改測試層，不修產品碼讓RED過關。

**Shared Must Read**:
- `truth-delta.md` -> `/dsl-refine` 24份feature與212條DSL ADD列；`dsl-refine-review.md`、`frontend-dsl-review.md` -> 覆蓋與邊界。
- 本節每題Read列的權威DSL；`apps/api/tests/support/{fixtures,seed,world,backend,database}.ts` 與 `apps/web/tests/support/{fixtures,browser,expense-helpers}.ts` -> 現有fixture、受控外部登入與真實API。
- `apps/{api,web}/playwright.config.ts` -> featuresRoot/steps glob、missingSteps fail-on-gen、兩端runner；`tsconfig.tests.json` -> 測試型別檢查。

**Boundary**:
- 每題完成時用單句隔離harness/註冊與參數測試驗證，全部句型齊備後才跑整檔bddgen；不暫改missingSteps或新增fallback註冊。整檔尚有其他句未實作，不阻止已完整當句的測試開發。
- 一條DSL一個 `[P]` task；新增英文 `phase-1b/` 子目錄避免與原T010等檔名碰撞。只有指定step檔及該句直接helper由該task擁有，不能同時改其他句的檔案或公共barrel。
- Common fixture/oracle完成可被其他句引用；共用helper改動由該shared句任務單一擁有。原seedTrip/seedExpense若需符合新增schema，只在測試層調整合法資料，不改原DSL驗證強度；產品migration必須由GREEN提供。
- 無005schema/API/UI時，測試應先用明確的產品契約assertion失敗（如schema缺table/column、端點尚未提供、畫面缺label）；不得是undefined/ambiguous step、module not found、SQL語法/缺表裸例外或編譯錯誤。fixture中斷造成其他step尚未到達不等於省略實作；gate須逐句靜態/隔離檢查註冊與完整程式，再用整檔RED執行確認。不得skip/放寬斷言或偷偷建產品migration。
- 所有runner檔案範圍以真實glob為準；不新增寬泛fallback step吞掉未定義句。純函式不變量測試可作相關Then的直接測試依賴，集中本phase新增，與BDD使用獨立預期值。

**Parallel Hint**:
- T006–T217各可派獨立subagent；同時最多3個，唯有檔案互斥且直接helper介面已存在者才同批。共用fixture/oracle句先完成，module Given與When再批次、Then最後；同一helper有寫入依賴時串行，不把212題一次全開。
- T218等所有句回來、兩端bddgen與註冊完整性檢查完畢才啟動subagent review；通過前不解鎖任何Phase4。

### backend/shared

- [X] T006 [P] [BDD-RED] backend/shared — `Given: owner 的分帳旅行已建立成員`
  - Read: `specs/truth/features/backend/dsl.md` -> `owner 的分帳旅行已建立成員`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/shared/phase-1b/T006.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、定向ESLint通過；單句members-fixture.spec.ts明確RED於產品缺少trips.simplify_debts；已檢查完整落地與ID回寫語意；補正owner→Alice固定ID別名，純參數1 PASS及tests tsc通過。Phase3既有seed相容接線：新schema原子建立owner/payer/share、舊schema分支保留；定向8/8及tsc/ESLint通過，T014舊資料建立成功後於缺payer欄位RED；新分支待正式migration後驗證。

- [X] T007 [P] [BDD-RED] backend/shared — `Given: owner 的分帳旅行已有下列支出：`
  - Read: `specs/truth/features/backend/dsl.md` -> `owner 的分帳旅行已有下列支出：`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/shared/phase-1b/T007.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint、diff check通過；獨立oracle測試PASS涵蓋100/3、尺度、還款/調整、0/1與大整數；權威fixture於缺schema取得預期RED。

- [X] T008 [P] [BDD-RED] backend/shared — `Given: owner 的分帳旅行已有下列獨立還款：`
  - Read: `specs/truth/features/backend/dsl.md` -> `owner 的分帳旅行已有下列獨立還款：`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/shared/phase-1b/T008.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint、Prettier通過；DataTable參數1 PASS、權威fixture1產品schema RED；已檢查實付日期/種類/尺度與獨立oracle回寫。

- [X] T009 [P] [BDD-RED] backend/shared — `Then: 這次分帳操作被拒絕為 "{錯誤}"`
  - Read: `specs/truth/features/backend/dsl.md` -> `這次分帳操作被拒絕為 "{錯誤}"`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/shared/phase-1b/T009.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint通過，參數與資料外洩2測試PASS，真實API harness產品schema RED；review後將敏感資源範圍限定其他owner，保留全部session保護與DB/再讀不變檢查。

### backend/account

- [X] T010 [P] [BDD-RED] backend/account — `Given: 分帳旅行另有未獲授權的登入帳號`
  - Read: `specs/truth/features/backend/account/dsl.md` -> `分帳旅行另有未獲授權的登入帳號`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/account/phase-1b/T010.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint/Prettier通過；單句產品schema RED；已review完整來源、獨立乙session與真實安排/子資源ID回寫。

- [X] T011 [P] [BDD-RED] backend/account — `Given: 同一owner的另一趟旅行有可讀寫分帳子資源`
  - Read: `specs/truth/features/backend/account/dsl.md` -> `同一owner的另一趟旅行有可讀寫分帳子資源`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/account/phase-1b/T011.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint/Prettier通過；單句產品schema RED；已review同一owner/session、兩旅行真實child ID與完整來源快照。

### backend/expenses

- [X] T012 [P] [BDD-RED] backend/expenses — `Given: 原支出已以 Amy 實付 JPY 33 結清`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `原支出已以 Amy 實付 JPY 33 結清`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/expenses/phase-1b/T012.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint/Prettier/diff check通過；單句產品schema RED；已review obligation100、paid33、±67調整及原支出/歷史快照。

- [X] T013 [P] [BDD-RED] backend/expenses — `Given: 支出驗證用的停用與跨旅行成員已建立`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `支出驗證用的停用與跨旅行成員已建立`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/expenses/phase-1b/T013.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、精確Given註冊與diff check通過；單句產品schema RED；已review停用Carol、同owner異旅行David真實ID及回寫。

- [X] T014 [P] [BDD-RED] backend/expenses — `Given: 舊版機票支出已完成分帳資料遷移`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `舊版機票支出已完成分帳資料遷移`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/expenses/phase-1b/T014.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint、隔離bddgen與實際Given runner通過註冊；明確RED為expenses.payer_member_id。舊migration checksum不變、UUID隔離DB及client end後清理已review。T041/T068使用expenseAuthorityWorld。

### backend/members

- [X] T015 [P] [BDD-RED] backend/members — `Given: 另一趟旅行已有同行者 "{名稱}"`
  - Read: `specs/truth/features/backend/members/dsl.md` -> `另一趟旅行已有同行者 "{名稱}"`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/members/phase-1b/T015.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、Prettier通過；單句產品schema RED；已review同owner另旅行成員、穩定ID及原旅行資料不變。

- [X] T016 [P] [BDD-RED] backend/members — `Given: 同行者 "{成員}" 已停用`
  - Read: `specs/truth/features/backend/members/dsl.md` -> `同行者 "{成員}" 已停用`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/members/phase-1b/T016.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、指定ESLint通過；Amy/Bob兩參數隔離產品schema RED；已review歷史引用/來源不變及停用前後BigInt淨額一致。

### backend/repayments

- [X] T017 [P] [BDD-RED] backend/repayments — `Given: Amy 應付 JPY 600 且 owner 已取得 JPY 700 的超額警告`
  - Read: `specs/truth/features/backend/repayments/dsl.md` -> `Amy 應付 JPY 600 且 owner 已取得 JPY 700 的超額警告`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/repayments/phase-1b/T017.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、指定ESLint通過；單句產品schema RED；已review真實server token、同UUID請求、超額100與反向端點、完整來源不變。

- [X] T018 [P] [BDD-RED] backend/repayments — `Given: 超額警告後旅行已有新的帳務版本`
  - Read: `specs/truth/features/backend/repayments/dsl.md` -> `超額警告後旅行已有新的帳務版本`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/repayments/phase-1b/T018.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、Prettier通過；單句產品schema RED；已對照DSL review真實Alice個人JPY10交易、revision+1、原警告token/快照保留。

- [X] T019 [P] [BDD-RED] backend/repayments — `Given: 還款驗證用的停用與跨旅行成員已建立`
  - Read: `specs/truth/features/backend/repayments/dsl.md` -> `還款驗證用的停用與跨旅行成員已建立`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/repayments/phase-1b/T019.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc通過；單句產品schema RED；已review重用停用/跨旅行成員fixture，保留既有實付與完整帳務來源。

### backend/settlement

- [X] T020 [P] [BDD-RED] backend/settlement — `Given: Amy 已以 JPY 33 結清點心安排且 Bob 的安排仍未結清`
  - Read: `specs/truth/features/backend/settlement/dsl.md` -> `Amy 已以 JPY 33 結清點心安排且 Bob 的安排仍未結清`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/settlement/phase-1b/T020.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc通過；單句產品schema RED；已review原100/3份額不變、Amy33與±1/3、Bob仍100/3及新key/revision/雙UUID。

- [X] T021 [P] [BDD-RED] backend/settlement — `Given: Amy 的安排已以 JPY 33 結清但保存回應曾遺失`
  - Read: `specs/truth/features/backend/settlement/dsl.md` -> `Amy 的安排已以 JPY 33 結清但保存回應曾遺失`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/settlement/phase-1b/T021.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint/Prettier/diff check通過；單句產品schema RED；已review原UUID/命令/100/3快照保留，僅清caller回應且不重送POST。

- [X] T022 [P] [BDD-RED] backend/settlement — `Given: owner 已取得 Amy 向 Alice 的目前付款安排`
  - Read: `specs/truth/features/backend/settlement/dsl.md` -> `owner 已取得 Amy 向 Alice 的目前付款安排`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/settlement/phase-1b/T022.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint/Prettier/diff check通過；單句產品schema RED；已review單次GET、原始key/revision/ExactAmount、預留雙UUID與來源不變。

- [X] T023 [P] [BDD-RED] backend/settlement — `Given: 旅行有既有實付與結清調整的分帳來源`
  - Read: `specs/truth/features/backend/settlement/dsl.md` -> `旅行有既有實付與結清調整的分帳來源`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/settlement/phase-1b/T023.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint/Prettier/diff check通過；單句產品schema RED；已review100/3、Amy33/±1/3、Bob10、獨立TWD300與完整history/oracle。

- [X] T024 [P] [BDD-RED] backend/settlement — `Given: 旅行的簡化付款已為 "{模式}"`
  - Read: `specs/truth/features/backend/settlement/dsl.md` -> `旅行的簡化付款已為 "{模式}"`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/settlement/phase-1b/T024.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint/Prettier/diff check通過；開啟/關閉2項產品schema RED、非法參數PASS；已review直接設定模式及來源/淨額不變。

- [X] T025 [P] [BDD-RED] backend/settlement — `Given: 結清交易在寫入部分調整後將發生錯誤`
  - Read: `specs/truth/features/backend/settlement/dsl.md` -> `結清交易在寫入部分調整後將發生錯誤`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/settlement/phase-1b/T025.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint/Prettier通過；dispatcher及既有fixtures.spec.ts PASS，單句產品schema RED；已review按scenario/trip隔離與finally清理。回滾Then須驗faultReached=true。

- [X] T026 [P] [BDD-RED] backend/settlement — `Given: 舊付款安排取得後帳本已有新的支出`
  - Read: `specs/truth/features/backend/settlement/dsl.md` -> `舊付款安排取得後帳本已有新的支出`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/settlement/phase-1b/T026.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc通過；單句產品schema RED；已review獨立交易/旅行鎖、Alice個人JPY10與revision+1、保留舊key/revision/expectedAmount及最新before。

### backend/account

- [X] T027 [P] [BDD-RED] backend/account — `When: owner 以目前旅行路徑 "{操作}" 另一旅行子資源`
  - Read: `specs/truth/features/backend/account/dsl.md` -> `owner 以目前旅行路徑 "{操作}" 另一旅行子資源`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/account/phase-1b/T027.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint/Prettier/diff check通過；8種參數分派PASS、隔離產品schema RED；已review有效session/Origin、合法payload及兩旅行before。

- [X] T028 [P] [BDD-RED] backend/account — `When: 未登入者嘗試讀取分帳結算`
  - Read: `specs/truth/features/backend/account/dsl.md` -> `未登入者嘗試讀取分帳結算`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/account/phase-1b/T028.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、精確無參數註冊通過；單句產品schema RED；已review無cookie context、匿名actor、完整before及唯一次GET。

- [X] T029 [P] [BDD-RED] backend/account — `When: 非 owner 帳號嘗試 "{操作}" 分帳資源`
  - Read: `specs/truth/features/backend/account/dsl.md` -> `非 owner 帳號嘗試 "{操作}" 分帳資源`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/account/phase-1b/T029.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint/Prettier通過；14種分派參數PASS，隔離產品schema RED；已review乙session、真實資源ID、合法payload/Origin及原樣安排。

### backend/expenses

- [X] T030 [P] [BDD-RED] backend/expenses — `When: owner 以舊版個人支出欄位記錄機票`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `owner 以舊版個人支出欄位記錄機票`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/expenses/phase-1b/T030.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint/Prettier/diff check通過；單句產品schema RED；已review舊版六欄位、預留UUID、真實POST及owner單人付款/分攤落地。

- [X] T031 [P] [BDD-RED] backend/expenses — `When: owner 僅修改既有含停用分攤者支出的項目`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `owner 僅修改既有含停用分攤者支出的項目`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/expenses/phase-1b/T031.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint/Prettier/diff check通過；唯一註冊及隔離產品schema RED；已review僅item PATCH、不重送停用成員ID及來源before/reply。

- [X] T032 [P] [BDD-RED] backend/expenses — `When: owner 刪除共同晚餐支出`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `owner 刪除共同晚餐支出`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/expenses/phase-1b/T032.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、diff check通過；單句產品schema RED；已review無body DELETE、204空回應、僅刪晚餐/shares且保留全部歷史。

- [X] T033 [P] [BDD-RED] backend/expenses — `When: owner 刪除已有還款的原支出`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `owner 刪除已有還款的原支出`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/expenses/phase-1b/T033.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint/Prettier/diff check通過；獨立實付及結清實付兩fixture產品schema RED；已review單次DELETE與完整before/reply及歷史保留。

- [X] T034 [P] [BDD-RED] backend/expenses — `When: owner 嘗試以 "{問題}" 保存共同支出`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `owner 嘗試以 "{問題}" 保存共同支出`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/expenses/phase-1b/T034.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、Prettier通過；8種無效參數測試PASS、真API產品schema RED；已review合法外框/預留UUID、原樣無效成員輸入、完整拒絕before/reply。

- [X] T035 [P] [BDD-RED] backend/expenses — `When: owner 嘗試以 "{問題}" 修改既有共同支出`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `owner 嘗試以 "{問題}" 修改既有共同支出`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/expenses/phase-1b/T035.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint/Prettier/diff check通過；7項參數/註冊PASS、隔離產品schema RED；已review六種partial PATCH、省略欄位保留及完整拒絕before/reply。

- [X] T036 [P] [BDD-RED] backend/expenses — `When: owner 將原支出改為 JPY 200`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `owner 將原支出改為 JPY 200`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/expenses/phase-1b/T036.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint/diff check通過；單句產品schema RED；已reviewJPY200換幣PATCH、歷史尺度與payer/shares/實付/結清/調整保留。

- [X] T037 [P] [BDD-RED] backend/expenses — `When: owner 將原支出金額改為 JPY 300`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `owner 將原支出金額改為 JPY 300`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/expenses/phase-1b/T037.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint與唯一註冊通過；隔離產品schema RED；已reviewJPY300 amount-only PATCH、原payer/shares及歷史實付/結清/調整保留。

- [X] T038 [P] [BDD-RED] backend/expenses — `When: owner 將原支出金額改為 JPY 800`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `owner 將原支出金額改為 JPY 800`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/expenses/phase-1b/T038.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc通過；獨立實付/既有結清兩fixture取得產品schema RED；已reviewamount-only JPY800 PATCH、原ID/payer/share與before/reply。

- [X] T039 [P] [BDD-RED] backend/expenses — `When: owner 將晚餐改為由 Amy 付款並由 Amy 與 Bob 分攤 JPY 200`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `owner 將晚餐改為由 Amy 付款並由 Amy 與 Bob 分攤 JPY 200`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/expenses/phase-1b/T039.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint/Prettier/diff check通過；單句產品schema RED；已review單次PATCH完整取代payer/shares/金額、before/reply及revision。

- [X] T040 [P] [BDD-RED] backend/expenses — `When: owner 記錄平均分攤支出：`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `owner 記錄平均分攤支出：`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/expenses/phase-1b/T040.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc通過；DataTable映射PASS、三種API情境產品schema RED；已review單列唯一次POST、原樣金額/成員ID、UUID與原子落地。

- [X] T041 [P] [BDD-RED] backend/expenses — `When: owner 讀取遷移後的機票支出`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `owner 讀取遷移後的機票支出`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/expenses/phase-1b/T041.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint/Prettier通過；獨立authority真API command harness PASS、遷移fixture缺payer_member_id RED；已review僅GET且response回寫原world。

### backend/members

- [X] T042 [P] [BDD-RED] backend/members — `When: owner 以另一裝置工作階段讀取旅行成員`
  - Read: `specs/truth/features/backend/members/dsl.md` -> `owner 以另一裝置工作階段讀取旅行成員`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/members/phase-1b/T042.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint、隔離bddgen及After hook載入通過；註冊PASS、真API產品schema RED；已review同owner新session/獨立context與唯一次GET、來源不變。

- [X] T043 [P] [BDD-RED] backend/members — `When: owner 刪除同行者 "{成員}"`
  - Read: `specs/truth/features/backend/members/dsl.md` -> `owner 刪除同行者 "{成員}"`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/members/phase-1b/T043.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint/Prettier/diff check通過；字串參數PASS、未引用/已引用兩情境產品schema RED；已review無body DELETE、穩定member ID及拒絕before不變。

- [X] T044 [P] [BDD-RED] backend/members — `When: owner 嘗試對自己的固定成員執行 "{操作}"`
  - Read: `specs/truth/features/backend/members/dsl.md` -> `owner 嘗試對自己的固定成員執行 "{操作}"`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/members/phase-1b/T044.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint/Prettier通過；參數分派PASS及3種操作產品schema RED；已review固定owner穩定ID、合法PATCH/無body DELETE、唯一命令與拒絕before。

- [X] T045 [P] [BDD-RED] backend/members — `When: owner 將同行者 "{原名}" 改名為 "{新名}"`
  - Read: `specs/truth/features/backend/members/dsl.md` -> `owner 將同行者 "{原名}" 改名為 "{新名}"`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/members/phase-1b/T045.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint/Prettier、隔離bddgen/list通過；雙參數註冊PASS，成功/衝突fixture產品schema RED；已reviewname-only PATCH、穩定ID與前後別名保留。

- [X] T046 [P] [BDD-RED] backend/members — `When: owner 將同行者 "{成員}" 設為 "{狀態}"`
  - Read: `specs/truth/features/backend/members/dsl.md` -> `owner 將同行者 "{成員}" 設為 "{狀態}"`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/members/phase-1b/T046.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint/Prettier/diff check、隔離bddgen/list通過；狀態參數PASS及啟用/停用產品schema RED；已reviewisActive-only PATCH與前後權威狀態。

- [X] T047 [P] [BDD-RED] backend/members — `When: owner 新增同行者 "{名稱}"`
  - Read: `specs/truth/features/backend/members/dsl.md` -> `owner 新增同行者 "{名稱}"`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/members/phase-1b/T047.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc通過；註冊參數PASS、成功/衝突fixture產品schema RED；已review原始名稱/預留UUID與真實POST、落地後才更新別名。

### backend/repayments

- [X] T048 [P] [BDD-RED] backend/repayments — `When: owner 以變造的確認資料送出超額還款`
  - Read: `specs/truth/features/backend/repayments/dsl.md` -> `owner 以變造的確認資料送出超額還款`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/repayments/phase-1b/T048.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、diff check通過；句型/token變造PASS、隔離產品schema RED；已review同UUID/JPY700/確認快照、只改token一字元與唯一次POST。

- [X] T049 [P] [BDD-RED] backend/repayments — `When: owner 嘗試記錄 "{問題}" 的獨立還款`
  - Read: `specs/truth/features/backend/repayments/dsl.md` -> `owner 嘗試記錄 "{問題}" 的獨立還款`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/repayments/phase-1b/T049.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint通過；8種參數/註冊PASS、真API產品schema RED；已review各問題僅改指定欄位、原樣單次POST及UUID/before/reply。

- [X] T050 [P] [BDD-RED] backend/repayments — `When: owner 明確確認同一筆 JPY 700 的超額還款`
  - Read: `specs/truth/features/backend/repayments/dsl.md` -> `owner 明確確認同一筆 JPY 700 的超額還款`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/repayments/phase-1b/T050.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc通過；payload保留PASS、fresh/stale兩情境產品schema RED；已review原UUID/付款內容/完整server確認資料原樣重送一次，成功才讀落地after。

- [X] T051 [P] [BDD-RED] backend/repayments — `When: owner 查詢旅行實際還款紀錄`
  - Read: `specs/truth/features/backend/repayments/dsl.md` -> `owner 查詢旅行實際還款紀錄`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/repayments/phase-1b/T051.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint/diff check通過並完成Prettier；隔離真API實際endpoint RED（預期200/實際404）；已reviewowner session唯一次GET與原始response/JSON回寫。

- [X] T052 [P] [BDD-RED] backend/repayments — `When: owner 記錄 Amy 向 Alice 的 JPY "{金額}" 獨立還款`
  - Read: `specs/truth/features/backend/repayments/dsl.md` -> `owner 記錄 Amy 向 Alice 的 JPY "{金額}" 獨立還款`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/repayments/phase-1b/T052.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、diff check通過；句型/payload PASS、400實付/700警告兩fixture產品schema RED；已review原樣金額/UUID、無confirmation唯一次POST與201落地/409不寫入。

### backend/settlement

- [X] T053 [P] [BDD-RED] backend/settlement — `When: owner 以 JPY "{實付}" 結清 Amy 向 Alice 的安排`
  - Read: `specs/truth/features/backend/settlement/dsl.md` -> `owner 以 JPY "{實付}" 結清 Amy 向 Alice 的安排`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/settlement/phase-1b/T053.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint通過；原樣快照/原子性2項PASS、隔離產品schema RED；review補齊201一結清/一實付/兩調整及非201（含故障500）完整after=before。

- [X] T054 [P] [BDD-RED] backend/settlement — `When: owner 以 JPY 34 結清 Bob 向 Alice 的剩餘安排`
  - Read: `specs/truth/features/backend/settlement/dsl.md` -> `owner 以 JPY 34 結清 Bob 向 Alice 的剩餘安排`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/settlement/phase-1b/T054.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint/Prettier通過；request欄位PASS、隔離產品schema RED；已reviewBob原100/3/key/revision與預留雙UUID、34實付，保留Amy歷史。

- [X] T055 [P] [BDD-RED] backend/settlement — `When: owner 將簡化付款切換為 "{模式}"`
  - Read: `specs/truth/features/backend/settlement/dsl.md` -> `owner 將簡化付款切換為 "{模式}"`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/settlement/phase-1b/T055.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc通過；模式/句型PASS及開啟/關閉產品schema RED；已review僅simplifyDebts PATCH、owner/Origin、before/reply及成功設定/revision落地。

- [X] T056 [P] [BDD-RED] backend/settlement — `When: owner 查詢旅行分帳結算`
  - Read: `specs/truth/features/backend/settlement/dsl.md` -> `owner 查詢旅行分帳結算`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/settlement/phase-1b/T056.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint/Prettier通過；註冊PASS及真API缺trip_members產品RED；已review唯一次owner GET、完整reply/revision/opaque keys及前後來源不變。

- [X] T057 [P] [BDD-RED] backend/settlement — `When: owner 查證先前已保存的結清紀錄`
  - Read: `specs/truth/features/backend/settlement/dsl.md` -> `owner 查證先前已保存的結清紀錄`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/settlement/phase-1b/T057.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、Prettier通過；唯讀recorder PASS、真DB產品schema RED；已reviewowner session GET原預留settlementId、保存原response/reply且無POST。

- [X] T058 [P] [BDD-RED] backend/settlement — `When: 兩個裝置同時結清 Amy 向 Alice 的同一安排`
  - Read: `specs/truth/features/backend/settlement/dsl.md` -> `兩個裝置同時結清 Amy 向 Alice 的同一安排`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/settlement/phase-1b/T058.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint通過；bounded barrier兩項PASS、隔離產品schema RED；已review同owner不同session/UUID、原安排並行事件及beforeTripLock屏障/finally hooks清理。

### backend/account

- [X] T059 [P] [BDD-RED] backend/account — `Then: 分帳結算回覆未登入且不揭露帳務`
  - Read: `specs/truth/features/backend/account/dsl.md` -> `分帳結算回覆未登入且不揭露帳務`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/account/phase-1b/T059.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint/Prettier通過；註冊/敏感欄位PASS、真DB產品schema RED；已review401/個資與帳務不洩漏、完整來源/owner再讀、同行者無認證憑證。

- [X] T060 [P] [BDD-RED] backend/account — `Then: 分帳資源拒絕存取且不揭露帳務`
  - Read: `specs/truth/features/backend/account/dsl.md` -> `分帳資源拒絕存取且不揭露帳務`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/account/phase-1b/T060.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: 全域tests tsc、定向ESLint/Prettier/diff check通過；錯誤比較PASS、產品schema RED；review修正Then僅GET不存在資源、允許合法ApiError可選欄位/requestId差異，保留雙owner帳務及完整owner再讀。

- [X] T061 [P] [BDD-RED] backend/account — `Then: 跨旅行子資源存取被拒絕且來源不變`
  - Read: `specs/truth/features/backend/account/dsl.md` -> `跨旅行子資源存取被拒絕且來源不變`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/account/phase-1b/T061.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint及錯誤/隱私純測試PASS、隔離產品schema RED；已review兩旅行完整snapshot/正確路徑逐資源再讀。review修正允許不同requestId但拒其洩漏來源ID。

### backend/expenses

- [X] T062 [P] [BDD-RED] backend/expenses — `Then: 原支出修正後的歷史結清快照保持不變`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `原支出修正後的歷史結清快照保持不變`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/expenses/phase-1b/T062.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint/diff check通過；3項純驗證PASS、PATCH/DELETE產品schema RED；已review逐欄歷史/單筆API/現行oracle重建，修正零列可省略、非零必完整。

- [X] T063 [P] [BDD-RED] backend/expenses — `Then: 已記錄還款保持原事實`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `已記錄還款保持原事實`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/expenses/phase-1b/T063.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint/diff check通過；歷史變更/刪除檢測PASS、PATCH/DELETE產品schema RED；已review完整DB rows與list/detail兩輪再讀不變。

- [X] T064 [P] [BDD-RED] backend/expenses — `Then: 支出修改被拒絕且舊分攤與安排完全保留`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `支出修改被拒絕且舊分攤與安排完全保留`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/expenses/phase-1b/T064.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint/diff check通過；投影純驗證PASS、六種拒絕產品schema RED；已review完整DB/revision及detail/list/totals/settlement兩輪再讀、獨立shares/net/arrangements與零列可省略。

- [X] T065 [P] [BDD-RED] backend/expenses — `Then: 既有停用成員的分攤集合保持原值`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `既有停用成員的分攤集合保持原值`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/expenses/phase-1b/T065.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint/Prettier通過；來源變異檢測PASS、隔離產品schema RED；已review僅item更正、payer/shares/成員與歷史不變、Carol停用仍保留負淨額。

- [X] T066 [P] [BDD-RED] backend/expenses — `Then: 晚餐已不再影響帳本與結算`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `晚餐已不再影響帳本與結算`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/expenses/phase-1b/T066.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint/Prettier通過；殘留/歷史變異檢測PASS、隔離產品schema RED；已review204空回應、DB/share刪除、單筆404/清單排除與零來源無安排/淨額。

- [X] T067 [P] [BDD-RED] backend/expenses — `Then: 晚餐的新份額為 Amy 與 Bob 各 JPY 100`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `晚餐的新份額為 Amy 與 Bob 各 JPY 100`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/expenses/phase-1b/T067.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint通過；直接斷言PASS、真API產品schema RED；已reviewPATCH/DB/GET的Amy付款/JPY200/Amy與Bob各100、排除舊share且其餘來源不變。

- [X] T068 [P] [BDD-RED] backend/expenses — `Then: 機票保留原始欄位且僅由 owner 付款分攤`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `機票保留原始欄位且僅由 owner 付款分攤`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/expenses/phase-1b/T068.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint通過；原欄位/owner-only反例純測試PASS，舊請求/真遷移兩條產品schema RED；已reviewexpenseAuthorityWorld、全部原欄位、TWD8000.00/唯一owner份額、零淨額與GET不變。

- [X] T069 [P] [BDD-RED] backend/expenses — `Then: 該支出的分攤份額為：`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `該支出的分攤份額為：`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/expenses/phase-1b/T069.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc通過；BigInt/參數純驗證PASS、真API產品schema RED；已reviewDataTable穩定ID/非零DB集合、response/GET份額、歷史尺度、平均值及總和交叉相乘，拒34/33/33。

- [X] T070 [P] [BDD-RED] backend/expenses — `Then: 該旅行的付款安排為：`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `該旅行的付款安排為：`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/expenses/phase-1b/T070.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint通過；有理數/完整安排集合兩項PASS、隔離產品schema RED；已review獨立source pairwise oracle、跨尺度/幣別、反向實付與調整及額外/遺漏/重複拒絕。

### backend/members

- [X] T071 [P] [BDD-RED] backend/members — `Then: 兩個裝置看到同一組穩定成員`
  - Read: `specs/truth/features/backend/members/dsl.md` -> `兩個裝置看到同一組穩定成員`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/members/phase-1b/T071.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc及完整集合反例純測試PASS、隔離產品schema RED；已review兩裝置同owner不同session、四名穩定ID/role/name/active、唯一owner與來源不變。

- [X] T072 [P] [BDD-RED] backend/members — `Then: 同行者 "{成員}" 已從旅行移除`
  - Read: `specs/truth/features/backend/members/dsl.md` -> `同行者 "{成員}" 已從旅行移除`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/members/phase-1b/T072.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint通過；參數/來源反例PASS、隔離產品schema RED；已review204空本文、僅刪companion、全部帳務保留/revision+1與單筆404/清單/旅行再讀。

- [X] T073 [P] [BDD-RED] backend/members — `Then: 同行者 "{成員}" 的狀態為 "{狀態}"`
  - Read: `specs/truth/features/backend/members/dsl.md` -> `同行者 "{成員}" 的狀態為 "{狀態}"`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/members/phase-1b/T073.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint/Prettier通過；2項參數/不變量PASS、啟用/停用產品schema RED；已reviewDB/response/GET、穩定ID/歷史/revision+1與全員net不變；零列可省略、非零歷史負債必回傳。

- [X] T074 [P] [BDD-RED] backend/members — `Then: 改名後 "{名稱}" 仍沿用原成員身分`
  - Read: `specs/truth/features/backend/members/dsl.md` -> `改名後 "{名稱}" 仍沿用原成員身分`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/members/phase-1b/T074.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc及兩項直接契約測試PASS、隔離產品schema RED；已review穩定ID/role、ASCII nameKey、全部歷史引用與名稱解析、獨立net oracle；修正零列可省略而非零必完整。

- [X] T075 [P] [BDD-RED] backend/members — `Then: 新增同行者以名稱 "{名稱}" 保存`
  - Read: `specs/truth/features/backend/members/dsl.md` -> `新增同行者以名稱 "{名稱}" 保存`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/members/phase-1b/T075.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint/Prettier與純契約PASS、隔離產品schema RED；已review201/預留UUID/trim/nameKey/role/active/revision/DB/GET。review移除Then fixture寫入，改驗認證ID集合未新增/改綁與匿名401（允許session合法刷新）。

### backend/repayments

- [X] T076 [P] [BDD-RED] backend/repayments — `Then: 先前還款與其他幣別來源保持不變`
  - Read: `specs/truth/features/backend/repayments/dsl.md` -> `先前還款與其他幣別來源保持不變`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/repayments/phase-1b/T076.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: 全域tests tsc、ESLint通過；來源變異檢測PASS、兩fixture產品schema RED；已review原還款逐欄、支出/share/結清/調整保留及其他幣別direct oracle安排。

- [X] T077 [P] [BDD-RED] backend/repayments — `Then: 實際還款保留各次付款事實`
  - Read: `specs/truth/features/backend/repayments/dsl.md` -> `實際還款保留各次付款事實`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/repayments/phase-1b/T077.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint/Prettier/diff check通過；逐欄/合併/日期/同日ID排序反例PASS、隔離產品schema RED；已review兩筆400/600獨立事實、完整DTO與detail GET。

- [X] T078 [P] [BDD-RED] backend/repayments — `Then: 獨立還款已以 JPY "{金額}" 保存`
  - Read: `specs/truth/features/backend/repayments/dsl.md` -> `獨立還款已以 JPY "{金額}" 保存`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/repayments/phase-1b/T078.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint/Prettier/diff check通過；逐欄變異反例PASS、400與確認700隔離產品schema RED；已review預留UUID/完整DTO/DB/清單/單筆/revision及既有來源保留。

- [X] T079 [P] [BDD-RED] backend/repayments — `Then: 獨立還款後的付款安排如下：`
  - Read: `specs/truth/features/backend/repayments/dsl.md` -> `獨立還款後的付款安排如下：`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/repayments/phase-1b/T079.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/Prettier通過；隔離註冊PASS與3個產品schema RED；已review跨幣別完整direct oracle、再次讀取revision/key/order不變。超額測試修正為真實warning/confirm流程，不繞過Given限制。
  - Review follow-up verified: T218 review修正：先驗原始POST201再唯讀重算，409/500不能被後續GET覆蓋；新增non-201 guard PASS。

- [X] T080 [P] [BDD-RED] backend/repayments — `Then: 變造確認未獲接受且沒有保存還款`
  - Read: `specs/truth/features/backend/repayments/dsl.md` -> `變造確認未獲接受且沒有保存還款`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/repayments/phase-1b/T080.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint通過；4xx純斷言PASS、隔離產品schema RED；已review拒絕500、預留UUID未寫入、完整來源/revision不變及600安排DB oracle/兩次GET。

- [X] T081 [P] [BDD-RED] backend/repayments — `Then: 超額還款尚未保存並回傳 JPY 100 的反向應付警告`
  - Read: `specs/truth/features/backend/repayments/dsl.md` -> `超額還款尚未保存並回傳 JPY 100 的反向應付警告`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/repayments/phase-1b/T081.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/diff通過；純反例PASS、真實schema RED；已review OverpaymentWarning 獨立schema完整keys、真token/excess/revision/說明及來源不變。

### backend/settlement

- [X] T082 [P] [BDD-RED] backend/settlement — `Then: 分帳來源紀錄維持操作前內容`
  - Read: `specs/truth/features/backend/settlement/dsl.md` -> `分帳來源紀錄維持操作前內容`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/settlement/phase-1b/T082.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint與隔離bddgen通過；逐欄來源反例PASS、兩模式schema RED；已review五類業務來源保留、owner列表/單筆/結清調整再讀及唯讀快照。

- [X] T083 [P] [BDD-RED] backend/settlement — `Then: 各幣別淨額精確總和為零`
  - Read: `specs/truth/features/backend/settlement/dsl.md` -> `各幣別淨額精確總和為零`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/settlement/phase-1b/T083.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests/shared測試tsc、ESLint、隔離bddgen/diff通過；2純契約PASS+schema RED；4 shared cases明確缺calculateSplitting assertion RED。已review獨立逐幣別oracle/完整非零/可省零/約分/100÷3/混合尺度/84組確定性矩陣。
  - 同句數學證據：在 `packages/shared/tests/splitting-invariants.test.ts` 新增約分/正分母/零0/1、不同歷史尺度、100/3總和、正負淨額零和與確定性小樣本矩陣；API期望值不共用產品函式。與該句step一同RED，之後GREEN不得改預期值。

- [X] T084 [P] [BDD-RED] backend/settlement — `Then: 同一安排最多只保存一次完整結清`
  - Read: `specs/truth/features/backend/settlement/dsl.md` -> `同一安排最多只保存一次完整結清`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/settlement/phase-1b/T084.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/隔離bddgen通過；兩勝者純反例2PASS、真實schema RED；已review真barrier兩到達/一201一409/一結清一實付兩相反調整/落敗UUID無部分資料/revision+1/只讀再查無尾差。

- [X] T085 [P] [BDD-RED] backend/settlement — `Then: 成員的分幣別精確淨額如下：`
  - Read: `specs/truth/features/backend/settlement/dsl.md` -> `成員的分幣別精確淨額如下：`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/settlement/phase-1b/T085.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/隔離bddgen通過；純反例PASS+真實schema RED；已review有號大單位有理數、完整獨立oracle/非零必回/零可省/未知及重複拒絕/revision與只讀再查。

- [X] T086 [P] [BDD-RED] backend/settlement — `Then: 最新實付後的直接與簡化安排皆依來源重建`
  - Read: `specs/truth/features/backend/settlement/dsl.md` -> `最新實付後的直接與簡化安排皆依來源重建`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/settlement/phase-1b/T086.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/隔離bddgen/diff通過；純契約PASS、兩模式schema RED；已review來源不重套調整、JPY70/3與TWD300完整安排/Amy0、模式/revision及唯讀再查。

- [X] T087 [P] [BDD-RED] backend/settlement — `Then: 查證取得同一份結清與實付紀錄`
  - Read: `specs/truth/features/backend/settlement/dsl.md` -> `查證取得同一份結清與實付紀錄`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/settlement/phase-1b/T087.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/隔離bddgen通過；DTO變異反例PASS+真實schema RED；已review原UUID/100÷3/實付33/±1÷3調整/日期/完整DB快照與只讀GET查證，無第二次保存。

- [X] T088 [P] [BDD-RED] backend/settlement — `Then: 相同資料的結算安排可重現`
  - Read: `specs/truth/features/backend/settlement/dsl.md` -> `相同資料的結算安排可重現`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/settlement/phase-1b/T088.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/隔離bddgen通過；逐欄與重排反例PASS+真實schema RED；已review10次唯讀GET與唯一Act的revision/mode/金額/端點/key/排序/計數/說明逐欄一致及每次來源不變。

- [X] T089 [P] [BDD-RED] backend/settlement — `Then: 簡化付款設定已保存為 "{模式}"`
  - Read: `specs/truth/features/backend/settlement/dsl.md` -> `簡化付款設定已保存為 "{模式}"`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/settlement/phase-1b/T089.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/隔離bddgen通過；投影反例PASS+兩模式schema RED；已reviewPATCH/DB/原與新同owner session 的trip及settlement五投影同模式/revision，無再次產品寫入。

- [X] T090 [P] [BDD-RED] backend/settlement — `Then: 簡化前後每位成員的精確淨額不變`
  - Read: `specs/truth/features/backend/settlement/dsl.md` -> `簡化前後每位成員的精確淨額不變`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/settlement/phase-1b/T090.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/隔離bddgen通過；變異反例PASS+schema RED；已review前後來源完整保留、獨立非零全體net/零可省/逐幣零和、模式/revision與唯讀再查。

- [X] T091 [P] [BDD-RED] backend/settlement — `Then: 簡化建議的付款筆數不多於直接安排`
  - Read: `specs/truth/features/backend/settlement/dsl.md` -> `簡化建議的付款筆數不多於直接安排`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/settlement/phase-1b/T091.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/diff通過；3純oracle反例PASS、API schema RED；review補產品calculateSplitting直接fallback測試：A→C8/A→D7/B→E9，候選4筆必回退完整3筆，現於缺產品函式明確RED。

- [X] T092 [P] [BDD-RED] backend/settlement — `Then: 結清失敗不留下任何部分帳務紀錄`
  - Read: `specs/truth/features/backend/settlement/dsl.md` -> `結清失敗不留下任何部分帳務紀錄`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/settlement/phase-1b/T092.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/隔離bddgen通過；2純反例PASS+真實schema RED；已reviewfaultReached必真、500公開錯誤不洩密/完整來源與revision回滾/預留IDs與調整不存在/原key與精確應付及只讀404查證。

- [X] T093 [P] [BDD-RED] backend/settlement — `Then: 結清差額的兩位成員調整為：`
  - Read: `specs/truth/features/backend/settlement/dsl.md` -> `結清差額的兩位成員調整為：`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/settlement/phase-1b/T093.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/隔離bddgen通過；有號分數純驗證PASS、33/34 schema RED；已reviewDB/201/GET恰兩端調整、obligation−paid獨立跨尺度算式/相反零和/單結清實付/revision與唯讀快照。

- [X] T094 [P] [BDD-RED] backend/settlement — `Then: 結清後原支出與分攤集合保持不變`
  - Read: `specs/truth/features/backend/settlement/dsl.md` -> `結清後原支出與分攤集合保持不變`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/settlement/phase-1b/T094.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/隔離bddgen/diff通過；2純反例PASS+schema RED；已review原支出/share逐欄集合不變、GET列表/單筆仍100與三份100/3、拒絕34/33/33及只讀快照。

- [X] T095 [P] [BDD-RED] backend/settlement — `Then: 結清紀錄沒有取整方式欄位`
  - Read: `specs/truth/features/backend/settlement/dsl.md` -> `結清紀錄沒有取整方式欄位`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/settlement/phase-1b/T095.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/隔離bddgen通過；封閉欄位反例PASS+schema RED；已reviewAPI巢狀DTO/三表schema與落地紀錄皆無取整策略、GET record及repayment一致與唯讀。

- [X] T096 [P] [BDD-RED] backend/settlement — `Then: 結算中沒有任何待付款安排`
  - Read: `specs/truth/features/backend/settlement/dsl.md` -> `結算中沒有任何待付款安排`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/settlement/phase-1b/T096.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/隔離bddgen通過；精確零與隱藏±1/300債務反例PASS+schema RED；已review空安排/雙計數0、所有來源net真正0及同revision只讀重查。

- [X] T097 [P] [BDD-RED] backend/settlement — `Then: 結算付款安排如下：`
  - Read: `specs/truth/features/backend/settlement/dsl.md` -> `結算付款安排如下：`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/settlement/phase-1b/T097.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/隔離bddgen/diff通過；完整集合/模式反例PASS+schema RED；已review獨立direct/greedy/fallback oracle、完整安排/key/成員/contract排序/revision與兩次唯讀投影一致。

- [X] T098 [P] [BDD-RED] backend/settlement — `Then: 結算說明以三句內描述付款對象與筆數變化`
  - Read: `specs/truth/features/backend/settlement/dsl.md` -> `結算說明以三句內描述付款對象與筆數變化`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/settlement/phase-1b/T098.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/隔離bddgen/diff通過；2文案/投影反例PASS+schema RED；已review三句內自然中文/禁用術語/付款方向與二變一語意、來源oracle/net不變與唯讀GET。

- [X] T099 [P] [BDD-RED] backend/settlement — `Then: 結算說明指出付款安排無需調整`
  - Read: `specs/truth/features/backend/settlement/dsl.md` -> `結算說明指出付款安排無需調整`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/settlement/phase-1b/T099.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/隔離bddgen通過；等價文案/錯誤投影反例PASS+schema RED；已review無需調整非無需付款、三句內/禁用術語、Amy→Alice500/雙計數1/來源net與只讀再查不變。

- [X] T100 [P] [BDD-RED] backend/settlement — `Then: 該安排已由正數實付關閉`
  - Read: `specs/truth/features/backend/settlement/dsl.md` -> `該安排已由正數實付關閉`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/settlement/phase-1b/T100.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/隔離bddgen通過；1/33/34/100純oracle PASS與4產品schema RED；已review單結清實付/成對調整/原key與revision/GET實付/完整非零net與安排保留Bob、零可省且無反向尾差。

- [X] T101 [P] [BDD-RED] backend/settlement — `Then: 該安排沒有反向付款或殘餘尾差`
  - Read: `specs/truth/features/backend/settlement/dsl.md` -> `該安排沒有反向付款或殘餘尾差`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/settlement/phase-1b/T101.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/diff通過；精確取消反例PASS+1/33/34/100/700真實schema RED；已reviewBigInt原債務+實付+調整精確0、支出/share保留、GET完整來源oracle安排含Bob100/3且無反向尾差、零net可省。

- [X] T102 [P] [BDD-RED] backend/settlement — `Then: 點心所有安排結清且全體沒有尾差`
  - Read: `specs/truth/features/backend/settlement/dsl.md` -> `點心所有安排結清且全體沒有尾差`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/settlement/phase-1b/T102.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/diff通過；2純反例PASS+schema RED；已reviewBob新增34/±2÷3與Amy歷史33/±1÷3全列保留、所有精確0/空安排/原100與三份100÷3、完整還款清單及只讀。
  - Review follow-up verified: T218 review修正：原201 body與Bob完整DB record/repay/兩adjust/closed no-policy shape逐欄核對，GET同record再讀且保留原Act response；錯ID/實付/義務/少adjust/多policy反例PASS。

### backend/trips

- [X] T103 [P] [BDD-RED] backend/trips — `Then: 新旅行同時具有唯一固定 owner 成員`
  - Read: `specs/truth/features/backend/trips/dsl.md` -> `新旅行同時具有唯一固定 owner 成員`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/api/tests/steps/trips/phase-1b/T103.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/單句bddgen/diff通過；投影反例PASS、真實POST201後ownerMemberId缺失明確RED；已reviewPOST即建唯一owner/DB身分/預設模式與revision/GET trip及members一致，Then不補seed。

### frontend/shared

- [X] T104 [P] [BDD-RED] frontend/shared — `Given: Amy 支付 Alice JPY 33 的安排已結清`
  - Read: `specs/truth/features/frontend/dsl.md` -> `Amy 支付 Alice JPY 33 的安排已結清`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/shared/phase-1b/T104.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: 全域tests tsc/ESLint/Prettier/隔離bddgen/diff通過，Chromium真實schema RED；已review最新安排GET→真POST33→record/還款GET及±1÷3調整，完整快照保存供後續驗證，無製造成功。

- [X] T105 [P] [BDD-RED] frontend/shared — `Given: 分帳旅行已有 Amy 支付 Alice JPY {金額} 的獨立還款`
  - Read: `specs/truth/features/frontend/dsl.md` -> `分帳旅行已有 Amy 支付 Alice JPY {金額} 的獨立還款`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/shared/phase-1b/T105.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: 全域tests tsc/ESLint/Prettier/隔離bddgen通過；參數驗證PASS+真實schema RED；已reviewowner POST合法還款/預留UUID/3月12日/完整DB及DTO/revision+1/來源不變與GET獨立oracle餘額。

- [X] T106 [P] [BDD-RED] frontend/shared — `Given: 分帳旅行已有以下支出：`
  - Read: `specs/truth/features/frontend/dsl.md` -> `分帳旅行已有以下支出：`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/shared/phase-1b/T106.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/隔離bddgen通過；Chromium表格驗證PASS+真實schema RED；已review真實資料與穩定成員/3月11日/null分類、四API/獨立oracle與完整初始快照，不開頁；共用fixture優先供T104/105。
  - Review follow-up verified: 最後來源刪除後允許catalog已知幣別canonical 0/1；仍拒未知成員/幣別、非零無來源/重複/非約分/缺非零列。獨立balance helper兩直接測試PASS，tests tsc/ESLint/Prettier/diff通過。

- [X] T107 [P] [BDD-RED] frontend/shared — `When: owner 以鍵盤選擇日期 2027-03-12`
  - Read: `specs/truth/features/frontend/dsl.md` -> `owner 以鍵盤選擇日期 2027-03-12`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/shared/phase-1b/T107.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/diff/隔離bddgen通過；1280/375真DateField鍵盤2PASS+整合schema RED；已review只ArrowRight→Enter選12日、關閉與原trigger焦點/完整API前快照及零寫入觀察供Then。

- [X] T108 [P] [BDD-RED] frontend/shared — `When: owner 按 Escape 關閉日期日曆`
  - Read: `specs/truth/features/frontend/dsl.md` -> `owner 按 Escape 關閉日期日曆`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/shared/phase-1b/T108.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: 全域tests tsc（並行錯誤修後）/ESLint/Prettier/diff/隔離bddgen通過；1280/375真DateField Escape2PASS+整合schema RED；已review只Escape一次/原日期trigger/完整前快照及零寫入觀察，無重新開啟或保存。

- [X] T109 [P] [BDD-RED] frontend/shared — `Then: 來源支出與先前實付紀錄保持不變`
  - Read: `specs/truth/features/frontend/dsl.md` -> `來源支出與先前實付紀錄保持不變`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/shared/phase-1b/T109.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；完整來源不可變反例2PASS+真模式切換與既有400還款scenario明確schema RED；已reviewAct前完整baseline、支出/份額/原實付DB與DTO全欄保留，只允許原UUID明示700新付款、無結清調整新增；Then只GET且還原world.response。

- [X] T110 [P] [BDD-RED] frontend/shared — `Then: 分帳畫面顯示以下成員淨額：`
  - Read: `specs/truth/features/frontend/dsl.md` -> `分帳畫面顯示以下成員淨額：`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/shared/phase-1b/T110.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/DataTable含正負100/3隔離bddgen/diff通過；獨立有理數/half-up顯示oracle PASS、Chromium明確schema RED；已review完整指定幣別成員集合/API可省零/各幣別精確零和/唯讀。GREEN UI定位契約：region「成員淨額」，group名稱「成員 幣別」，含金額與應收/應付/已平衡；不用四捨五入值相加或跨幣別換算。

- [X] T111 [P] [BDD-RED] frontend/shared — `Then: 日期欄仍為 2027-03-11 且焦點返回日期觸發點`
  - Read: `specs/truth/features/frontend/dsl.md` -> `日期欄仍為 2027-03-11 且焦點返回日期觸發點`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/shared/phase-1b/T111.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: 隔離bddgen/ESLint/Prettier/diff通過，並行T109/T110型別錯誤修正後全域tests tsc通過；1280/375真DateField斷言2PASS+完整schema RED；已reviewThen只讀日期3/11/hidden/expanded=false/原trigger焦點、零寫入及完整權威快照不變，提供T112共用assertCalendarControls。

- [X] T112 [P] [BDD-RED] frontend/shared — `Then: 日期欄顯示 2027-03-12 且日曆關閉並返回日期觸發點`
  - Read: `specs/truth/features/frontend/dsl.md` -> `日期欄顯示 2027-03-12 且日曆關閉並返回日期觸發點`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/shared/phase-1b/T112.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；1280/375真DateField結果只讀斷言2PASS+完整schema RED；已review日期3/12/日曆關閉/原trigger焦點、可讀與水平邊界、零寫入及完整權威快照不變，重用T111控制helper。

### frontend/expenses

- [X] T113 [P] [BDD-RED] frontend/expenses — `Given: Phase 1A 已有 2027-01-15 的 TWD 8000 機票`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `Phase 1A 已有 2027-01-15 的 TWD 8000 機票`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/expenses/phase-1b/T113.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: 全域tests tsc/ESLint/Prettier/隔離bddgen通過；真實舊DB→正式migrate缺payer_member_id明確RED；已review瀏覽器API轉送實際authority response、原ID/8000/日期/owner份額快照與BDD After清理，不造成功資料。

- [X] T114 [P] [BDD-RED] frontend/expenses — `Given: owner 已填共同支出點心 JPY 100、付款 Alice、分攤 {成員集合}`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `owner 已填共同支出點心 JPY 100、付款 Alice、分攤 {成員集合}`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/expenses/phase-1b/T114.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: 全域tests tsc/ESLint/Prettier/隔離bddgen通過；參數純驗證PASS、兩集合schema RED及真實UI缺Alice radio的明確expect RED；已review合法草稿/日期/未分類/radio與checkbox互動、零POST與保存前權威快照。

- [X] T115 [P] [BDD-RED] frontend/expenses — `Given: owner 已填共同支出點心但未選付款人`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `owner 已填共同支出點心但未選付款人`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/expenses/phase-1b/T115.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: 全域tests tsc/ESLint/Prettier/隔離bddgen/diff通過；真實三人fixture schema RED，另已驗Vite元件/provider/API正常載入後缺payer radio明確RED。技術決策：測試專用entry掛載正式ExpenseForm optional initialDraft（payer=null），GREEN T247須接公開prop，正常route不傳仍預選owner；不新增清除UI/不改React內部state。review修正SearchCombo用value、spec不得用虛構成員UUID。

- [X] T116 [P] [BDD-RED] frontend/expenses — `Given: owner 已填共同支出點心但未選任何分攤者`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `owner 已填共同支出點心但未選任何分攤者`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/expenses/phase-1b/T116.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: 全域tests tsc/ESLint/Prettier/隔離bddgen/diff通過；Chromium schema與真實UI缺Alice checkbox均明確RED；已review合法其餘欄位/Alice付款、checkbox全選後清空、零POST與完整DB/API快照不變。

- [X] T117 [P] [BDD-RED] frontend/expenses — `Given: owner 已開啟支出日期日曆且焦點在 2027-03-11`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `owner 已開啟支出日期日曆且焦點在 2027-03-11`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/expenses/phase-1b/T117.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: 全域tests tsc/ESLint/Prettier/隔離bddgen/diff通過；1280/375真實DateField焦點/非原生/零寫入2PASS，兩viewport Given schema RED。已review共享calendarContext保留input/trigger/dialog/初始日供107/108/131/139引用，實際開啟並聚焦3月11日。

- [X] T118 [P] [BDD-RED] frontend/expenses — `Given: 共同支出晚餐修改已填 JPY 200 且保存回應遺失與查證暫不可用`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `共同支出晚餐修改已填 JPY 200 且保存回應遺失與查證暫不可用`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/expenses/phase-1b/T118.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: 全域tests tsc/ESLint/Prettier/隔離bddgen通過；2payload/DTO反例PASS+Chromium schema RED；已review真PATCH fetch成功/權威after讀後abort、原UUID與單次寫入、暫阻查證與刷新；review修正允許合法updatedAt更新但保留createdAt/其他業務欄。

### frontend/members

- [X] T119 [P] [BDD-RED] frontend/members — `Given: owner 的手機已保存目前分帳資料`
  - Read: `specs/truth/features/frontend/members/dsl.md` -> `owner 的手機已保存目前分帳資料`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/members/phase-1b/T119.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/隔離bddgen通過，手機真實schema RED；已review獨立375px context/owner cookie/旅行頁與真GET members/expenses/settlement、穩定ID及完整來源快照保存、finally關閉context。

- [X] T120 [P] [BDD-RED] frontend/members — `Given: 另一旅行有 Amy 而目前旅行只有 owner Alice`
  - Read: `specs/truth/features/frontend/members/dsl.md` -> `另一旅行有 Amy 而目前旅行只有 owner Alice`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/members/phase-1b/T120.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/隔離bddgen通過、Chromium schema RED；已review同owner日本僅Alice/台南真Amy、完整兩旅行成員與來源快照、當前alias未被覆蓋與同行者頁真讀。

- [X] T121 [P] [BDD-RED] frontend/members — `Given: 同行者名單有 owner Alice、啟用 Amy 與停用 Bob`
  - Read: `specs/truth/features/frontend/members/dsl.md` -> `同行者名單有 owner Alice、啟用 Amy 與停用 Bob`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/members/phase-1b/T121.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/隔離bddgen通過；Chromium真實schema RED；已reviewAlice固定owner/Amy啟用/Bob停用精確三人、真GET與穩定ID/來源快照/無陪同認證帳號及頁面載入。

- [X] T122 [P] [BDD-RED] frontend/members — `Given: 同行者新增表單填入 Carol 且保存回應遺失與查證暫不可用`
  - Read: `specs/truth/features/frontend/members/dsl.md` -> `同行者新增表單填入 Carol 且保存回應遺失與查證暫不可用`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/members/phase-1b/T122.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/隔離bddgen通過；flock Chromium schema RED；已review單次真POST fetch→201/原UUID與DB/API after核對→abort、原ID GET暫阻、mutationFinished/failure/persisted供後續保存與結果未明斷言且無第二POST。

- [X] T123 [P] [BDD-RED] frontend/members — `Given: 小美已被三人 JPY 300 午餐及 JPY 20 還款引用`
  - Read: `specs/truth/features/frontend/members/dsl.md` -> `小美已被三人 JPY 300 午餐及 JPY 20 還款引用`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/members/phase-1b/T123.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/隔離bddgen通過；Chromium schema RED；已review小美穩定ID/午餐300三份100/真POST20與完整DB/DTO、Alice180/小美−80/Bob−100獨立oracle、revision+1/來源不變與頁面真讀。

- [X] T124 [P] [BDD-RED] frontend/members — `Given: 已新增未被引用的同行者 Carol`
  - Read: `specs/truth/features/frontend/members/dsl.md` -> `已新增未被引用的同行者 Carol`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/members/phase-1b/T124.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/隔離bddgen通過；全引用欄反例PASS+加鎖Chromium schema RED；已review真POST Carol/預留UUID/DB與GET列表單筆、五類所有端點無引用/完整前後來源與頁面刷新。

- [X] T125 [P] [BDD-RED] frontend/members — `Given: 已被支出引用的 "{成員}" 已停用`
  - Read: `specs/truth/features/frontend/members/dsl.md` -> `已被支出引用的 "{成員}" 已停用`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/members/phase-1b/T125.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/diff/隔離bddgen通過；加鎖Chromium schema RED；已review真300三人午餐→PATCH停用→GET完整名單/單筆/ID/歷史來源與net保留、revision+1及頁面真讀。

- [X] T126 [P] [BDD-RED] frontend/members — `Given: 未引用的 Amy 刪除確認已開啟但另一裝置剛引用 Amy`
  - Read: `specs/truth/features/frontend/members/dsl.md` -> `未引用的 Amy 刪除確認已開啟但另一裝置剛引用 Amy`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/members/phase-1b/T126.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: 全域tests tsc/ESLint/Prettier/diff/隔離bddgen通過；加鎖Chromium schema RED；已review未引用Amy原刪除dialog開啟→獨立owner session真POST100引用Amy、完整before/after/revision+1/原dialog與URL及頁面零寫入。

- [X] T127 [P] [BDD-RED] frontend/members — `Given: 目前瀏覽器已改為另一個登入帳號`
  - Read: `specs/truth/features/frontend/members/dsl.md` -> `目前瀏覽器已改為另一個登入帳號`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/members/phase-1b/T127.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/隔離bddgen通過；真另一session/cookie/storage隔離PASS+完整schema RED；已review獨立auth Amy不等於companion Amy、owner來源/alias不變、新context.page保存於splitting:accessBrowser及BDD After清理。

- [X] T128 [P] [BDD-RED] frontend/members — `Given: 目前瀏覽器未登入且僅知道同行者 Amy 的資料`
  - Read: `specs/truth/features/frontend/members/dsl.md` -> `目前瀏覽器未登入且僅知道同行者 Amy 的資料`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/members/phase-1b/T128.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/隔離bddgen通過；真匿名context/cookie/storage/session-null PASS+完整schema RED；已review只test-side知tripPath與Amy資料、不注入認證/來源、owner快照alias不變與共用After清理。

### frontend/repayments

- [X] T129 [P] [BDD-RED] frontend/repayments — `Given: JPY 700 的超額 JPY 100 警告已呈現且尚未保存`
  - Read: `specs/truth/features/frontend/repayments/dsl.md` -> `JPY 700 的超額 JPY 100 警告已呈現且尚未保存`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/repayments/phase-1b/T129.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/diff/隔離bddgen通過；警告變異反例PASS+加鎖Chromium schema RED；已review真UI單POST700/409/原UUID與全payload/token/revision/反向100、待確認按鈕、完整前投影不變與原ID404。

- [X] T130 [P] [BDD-RED] frontend/repayments — `Given: owner 已填 Amy 支付 {收款人} JPY {金額} 的獨立還款`
  - Read: `specs/truth/features/frontend/repayments/dsl.md` -> `owner 已填 Amy 支付 {收款人} JPY {金額} 的獨立還款`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/repayments/phase-1b/T130.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/隔離bddgen三參數通過；原字串/同人/0驗證PASS、三schema RED與真UI缺付款人combobox RED；已review真表單/日期/零寫入與來源快照。review修正StrictMode重複初始化風險，改從真form data-command-id讀正式保留UUID；GREEN T251須將metadata綁實際POST草稿ID，正常可見UI不變。

- [X] T131 [P] [BDD-RED] frontend/repayments — `Given: owner 已開啟還款日期日曆且焦點在 2027-03-11`
  - Read: `specs/truth/features/frontend/repayments/dsl.md` -> `owner 已開啟還款日期日曆且焦點在 2027-03-11`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/repayments/phase-1b/T131.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/隔離bddgen通過；1280/375 Chromium四例schema或缺真付款人combobox明確RED；已reviewAlice/Amy空旅行/真還款表單/共用DateField3月11日焦點與context/完整前後快照及零寫入。

- [X] T132 [P] [BDD-RED] frontend/repayments — `Given: 其他旅行的 Carol 不屬於本旅行`
  - Read: `specs/truth/features/frontend/repayments/dsl.md` -> `其他旅行的 Carol 不屬於本旅行`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/repayments/phase-1b/T132.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/隔離bddgen通過；加鎖Chromium schema RED；已review同owner外旅行真Carol/兩旅行完整來源與四API/member列表、當前Alice/Amy alias不污染，不開表單。

- [X] T133 [P] [BDD-RED] frontend/repayments — `Given: 另一裝置已將代付由 JPY 1000 改成 JPY 900`
  - Read: `specs/truth/features/frontend/repayments/dsl.md` -> `另一裝置已將代付由 JPY 1000 改成 JPY 900`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/repayments/phase-1b/T133.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: 全域tests tsc/ESLint/Prettier/diff/隔離bddgen通過；加鎖Chromium schema RED；已review獨立owner session真PATCH900/餘額500/revision+1/他幣及歷史不變；首裝置保留原警告100/token/UUID/payload且無新確認，原ID404。

- [X] T134 [P] [BDD-RED] frontend/repayments — `Given: 獨立還款成功回應遺失且原結果暫不可查證`
  - Read: `specs/truth/features/frontend/repayments/dsl.md` -> `獨立還款成功回應遺失且原結果暫不可查證`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/repayments/phase-1b/T134.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/隔離bddgen通過（並行readonly錯誤修後全域tsc亦PASS）；payload反例PASS+加鎖Chromium schema RED；已review真POST201/DB與完整after核對後abort、原UUID真GET200後僅browser暫404、單次寫入/原ID與available共用模式。

- [X] T135 [P] [BDD-RED] frontend/repayments — `Given: 獨立還款成功回應遺失但原結果可查證`
  - Read: `specs/truth/features/frontend/repayments/dsl.md` -> `獨立還款成功回應遺失但原結果可查證`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/repayments/phase-1b/T135.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/diff/隔離bddgen通過；加鎖Chromium schema RED；已review僅引用available真攔截模式、不預送POST/不fake成功、原UUID GET200透傳/禁止第二POST及BDD After restore。

### frontend/settlement

- [X] T136 [P] [BDD-RED] frontend/settlement — `Given: owner 已開啟 {付款人} 支付 Alice 的實付結清表單`
  - Read: `specs/truth/features/frontend/settlement/dsl.md` -> `owner 已開啟 {付款人} 支付 Alice 的實付結清表單`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/settlement/phase-1b/T136.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: 全域tests tsc/ESLint/Prettier/隔離bddgen通過；精確快照PASS+Amy/Bob Chromium schema RED。已review真GET完整key/revision/ExactAmount與連結、實付空白/日期/零寫入；review改真form data-command-id/data-repayment-id取代StrictMode不可靠crypto次序。GREEN T257須綁實際POST command state metadata。

- [X] T137 [P] [BDD-RED] frontend/settlement — `Given: owner 已開啟簡化付款的結算畫面`
  - Read: `specs/truth/features/frontend/settlement/dsl.md` -> `owner 已開啟簡化付款的結算畫面`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/settlement/phase-1b/T137.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: 全域tests tsc/ESLint/Prettier/diff/隔離bddgen通過；模式/revision反例PASS+加鎖Chromium schema RED；已review僅assert已保存模式、不PATCH/切switch、真GET trip/settlement同版本與完整oracle/checked/key連結/畫面及來源快照。

- [X] T138 [P] [BDD-RED] frontend/settlement — `Given: owner 已開啟結清日期日曆且焦點在 2027-03-11`
  - Read: `specs/truth/features/frontend/settlement/dsl.md` -> `owner 已開啟結清日期日曆且焦點在 2027-03-11`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/settlement/phase-1b/T138.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/隔離bddgen通過；1280/375 Chromium schema RED；已review真Amy→Alice100安排/正式結清表單與共用DateField3月11日焦點、零mutation及完整API/DB來源不變。

- [X] T139 [P] [BDD-RED] frontend/settlement — `Given: owner 已開啟關閉簡化付款的結算畫面`
  - Read: `specs/truth/features/frontend/settlement/dsl.md` -> `owner 已開啟關閉簡化付款的結算畫面`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/settlement/phase-1b/T139.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/diff/隔離bddgen通過；true/false初始模式加鎖Chromium均schema RED；已reviewfalse不多餘PATCH、true才真保存false/revision+1/來源不變，再用共用同版本完整畫面查核。

- [X] T140 [P] [BDD-RED] frontend/settlement — `Given: 另一裝置已修改點心而目前結清表單仍為舊安排`
  - Read: `specs/truth/features/frontend/settlement/dsl.md` -> `另一裝置已修改點心而目前結清表單仍為舊安排`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/settlement/phase-1b/T140.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: 全域tests tsc/ESLint/Prettier/隔離bddgen通過；加鎖Chromium schema RED；已review真另一owner session PATCH點心200/三份200÷3與新key/revision，首表單保持舊100÷3/33.33/輸入/兩UUIDmetadata且零刷新寫入；after供後續拒絕前比對。

- [X] T141 [P] [BDD-RED] frontend/settlement — `Given: 本次簡化付款保存明確失敗`
  - Read: `specs/truth/features/frontend/settlement/dsl.md` -> `本次簡化付款保存明確失敗`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/settlement/phase-1b/T141.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/diff/隔離bddgen通過；明確拒絕分類PASS+加鎖Chromium schema RED；已review目標PATCH寫入前400 VALIDATION_ERROR（不fetch/不切switch）、false/舊revision/兩安排與完整權威快照不變。

- [X] T142 [P] [BDD-RED] frontend/settlement — `Given: 結清成功回應遺失且原結果暫不可查證`
  - Read: `specs/truth/features/frontend/settlement/dsl.md` -> `結清成功回應遺失且原結果暫不可查證`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/settlement/phase-1b/T142.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/diff/隔離bddgen通過；原兩UUID/key/revision/100÷3及13欄變異反例PASS+Chromium schema RED；已review真POST201完整結清/實付/兩調整後abort、原ID先真GET200再browser暫404、單次寫入/fullbefore-after/available模式與After restore。

- [X] T143 [P] [BDD-RED] frontend/settlement — `Given: 結清成功回應遺失但原結果可查證`
  - Read: `specs/truth/features/frontend/settlement/dsl.md` -> `結清成功回應遺失但原結果可查證`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/settlement/phase-1b/T143.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: 全域tests tsc（並行readonly測試修後）/ESLint/Prettier/diff/隔離bddgen通過；加鎖Chromium schema RED；已review僅available註冊/不預POST/原兩UUID與來源不變、真GET200原樣透傳與沿用既有After。

- [X] T144 [P] [BDD-RED] frontend/settlement — `Given: 該旅行已保存簡化付款開啟`
  - Read: `specs/truth/features/frontend/settlement/dsl.md` -> `該旅行已保存簡化付款開啟`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/settlement/phase-1b/T144.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: 全域tests tsc/ESLint/Prettier/diff/隔離bddgen通過；保存契約純反例PASS+schema RED；已review真PATCH true→GET trip/settlement同版本與獨立oracle、全部來源/費用/還款/總額不變，保存已確認快照，不開頁或切UI。

### frontend/expenses

- [X] T145 [P] [BDD-RED] frontend/expenses — `When: owner 保存共同支出`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `owner 保存共同支出`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/expenses/phase-1b/T145.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint、format、隔離bddgen通過；分類與真表單本地驗證2 PASS，整合於缺schema/付款分攤欄位RED；已review單次POST、真UUID/payload與權威前後快照，只有4xx視為拒絕，5xx保留結果未明。

- [X] T146 [P] [BDD-RED] frontend/expenses — `When: owner 保存共同支出修改`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `owner 保存共同支出修改`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/expenses/phase-1b/T146.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/隔離bddgen通過；單次PATCH/原ID/路徑/草稿變異反例PASS+加鎖Chromium schema RED；已review只點一次保存、有界等待真authoritativeAfter→UI結果未明/原草稿與原UUID、無重送或假成功。

- [X] T147 [P] [BDD-RED] frontend/expenses — `When: owner 刪除共同支出晚餐`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `owner 刪除共同支出晚餐`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/expenses/phase-1b/T147.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint、隔離bddgen通過；單次刪除/錯UUID/額外寫入/歷史消失/share殘留反例PASS，加鎖Chromium明確schema RED；已review真確認UI只送一次DELETE、204空回覆、完整歷史保留與新revision。
  - Review follow-up verified: 已補真瀏覽器結算GET、完整同revision快照及簡化付款switch狀態；單次DELETE限制持續監控，無模式寫入；stale projection反例PASS、tests tsc/ESLint通過，整合維持明確schema RED。

- [X] T148 [P] [BDD-RED] frontend/expenses — `When: owner 刪除共同支出點心`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `owner 刪除共同支出點心`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/expenses/phase-1b/T148.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；真Amy33結清歷史的隔離Chromium於缺schema明確RED；已review重用單次DELETE helper，原點心UUID/來源與分攤移除、歷史保留與revision驗證。

- [X] T149 [P] [BDD-RED] frontend/expenses — `When: owner 將代付金額改為 JPY 800`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `owner 將代付金額改為 JPY 800`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/expenses/phase-1b/T149.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc、ESLint、隔離bddgen通過；payload契約PASS+加鎖Chromium schema RED；已review只修改既有代付金額800、原UUID/付款/分攤及全部歷史保留，瀏覽器重讀目前模式新revision，無額外模式寫入。

- [X] T150 [P] [BDD-RED] frontend/expenses — `When: owner 將晚餐改為 JPY 200、付款 Amy、分攤 Amy、Bob`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `owner 將晚餐改為 JPY 200、付款 Amy、分攤 Amy、Bob`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/expenses/phase-1b/T150.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/隔離bddgen/diff通過；payload變異反例PASS+加鎖Chromium schema RED；已review真UI一次PATCH晚餐200/Amy付款/AmyBob分攤各100、原UUID與歷史保留、帳本GET及結算GET與同一新revision權威結果一致。

- [X] T151 [P] [BDD-RED] frontend/expenses — `When: owner 將點心金額改為 JPY 200`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `owner 將點心金額改為 JPY 200`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/expenses/phase-1b/T151.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/隔離bddgen/diff通過；真Amy33結清後點心改200隔離Chromium明確schema RED；已review只委派金額修改共用helper、原UUID與全部實付/結清/調整歷史不變、新revision重讀。

- [X] T152 [P] [BDD-RED] frontend/expenses — `When: owner 查看支出 "{項目}" 的分攤`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `owner 查看支出 "{項目}" 的分攤`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/expenses/phase-1b/T152.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/雙參數隔離bddgen/diff通過；普通三等分與正式舊資料migration兩條Chromium明確schema RED；已review真支出與名單GET、完整ExactAmount及唯讀前後快照，舊資料使用expenseAuthorityWorld。

### frontend/members

- [X] T153 [P] [BDD-RED] frontend/members — `When: owner 停用同行者 "{成員}"`
  - Read: `specs/truth/features/frontend/members/dsl.md` -> `owner 停用同行者 "{成員}"`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/members/phase-1b/T153.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；payload契約PASS+Chromium明確schema RED；已review原成員UUID、真停用確認一次、PATCH isActive=false完成、保存真回應及原權威帳務快照。

- [X] T154 [P] [BDD-RED] frontend/members — `When: owner 刪除同行者 "{成員}"`
  - Read: `specs/truth/features/frontend/members/dsl.md` -> `owner 刪除同行者 "{成員}"`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/members/phase-1b/T154.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/單句bddgen/diff通過；固定UUID/單次DELETE反例PASS+Chromium明確schema RED；已review真刪除確認與原始status/reply保存，既開dialog helper支援204/409且不重開刷新，供後續拒絕語意獨立驗證。

- [X] T155 [P] [BDD-RED] frontend/members — `When: owner 在電腦開啟目前旅行分帳`
  - Read: `specs/truth/features/frontend/members/dsl.md` -> `owner 在電腦開啟目前旅行分帳`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/members/phase-1b/T155.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；Chromium於缺schema明確RED；已review新1280px context同owner真session、一次導頁等待名單/支出/結算三真GET、無寫入與完整手機權威快照保留，After清理。下游讀desktopSplittingKey.page。

- [X] T156 [P] [BDD-RED] frontend/members — `When: owner 將同行者 "{舊名}" 改名為 "{新名}"`
  - Read: `specs/truth/features/frontend/members/dsl.md` -> `owner 將同行者 "{舊名}" 改名為 "{新名}"`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/members/phase-1b/T156.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/雙字串參數隔離bddgen/diff通過；payload反例PASS、兩條Chromium明確schema RED；已review真改名按鈕單次PATCH原UUID且只有name，保留空白輸入/原快照/成功或409回應，無新增metadata seam。
  - Review follow-up verified: 配合T188允許本地名稱衝突，改為單次提交後有界等PATCH或input關聯可見錯誤；local保留原UUID/raw名稱/before、status/response=null且零寫入，200/409契約不弱化。tsc/lint/format/diff與定向observer/payload Chromium2PASS。

- [X] T157 [P] [BDD-RED] frontend/members — `When: owner 新增同行者 "{名稱}"`
  - Read: `specs/truth/features/frontend/members/dsl.md` -> `owner 新增同行者 "{名稱}"`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/members/phase-1b/T157.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/四參數隔離bddgen/diff通過；payload契約PASS、五條Chromium明確schema RED；已reviewraw輸入/真預留UUID/單POST、可讀驗證與結果未明分類、真丟回應等待persisted及mutationFinished且failure為空，5xx不當作確定拒絕。
  - Review follow-up verified: T218 review修正：保存前讀真member form data-command-id，實際POST UUID須相同；T253須由真pending state綁此metadata。tests tsc/lint/format通過。

- [X] T158 [P] [BDD-RED] frontend/members — `When: owner 查看同行者管理`
  - Read: `specs/truth/features/frontend/members/dsl.md` -> `owner 查看同行者管理`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/members/phase-1b/T158.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；Chromium明確schema RED；已review一次導頁等真成員GET200/標題、保存名單與完整前後權威快照、零API寫入。

- [X] T159 [P] [BDD-RED] frontend/members — `When: owner 確認刪除同行者 "{成員}"`
  - Read: `specs/truth/features/frontend/members/dsl.md` -> `owner 確認刪除同行者 "{成員}"`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/members/phase-1b/T159.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/字串單句bddgen/diff通過；加鎖Chromium明確schema RED；已review同原已開dialog/URL/UUID、只確認一次、真DELETE409 MEMBER_IN_USE、第二裝置引用後權威before吻合，無重開或刷新。

- [X] T160 [P] [BDD-RED] frontend/members — `When: owner 重新啟用同行者 "{成員}"`
  - Read: `specs/truth/features/frontend/members/dsl.md` -> `owner 重新啟用同行者 "{成員}"`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/members/phase-1b/T160.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/字串隔離bddgen/diff通過；Chromium明確schema RED；已review原inactive同行者UUID、一次重新啟用PATCH僅isActive=true、200真回應及原權威快照保存，重用T153型別與payload斷言。

- [X] T161 [P] [BDD-RED] frontend/members — `When: owner 開啟新支出的成員選項`
  - Read: `specs/truth/features/frontend/members/dsl.md` -> `owner 開啟新支出的成員選項`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/members/phase-1b/T161.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；Chromium明確schema RED；已review只開新支出路徑一次、真GET members完成與radio/checkbox呈現、無選取或寫入，保存原名單與完整權威前後快照。

- [X] T162 [P] [BDD-RED] frontend/members — `When: owner 開啟獨立還款的成員選項`
  - Read: `specs/truth/features/frontend/members/dsl.md` -> `owner 開啟獨立還款的成員選項`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/members/phase-1b/T162.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen通過；加鎖Chromium明確schema RED；已review只開真還款表單並等members GET、穩定ID目錄/付款收款控制、零寫入與完整before=after，保存openedRepaymentMembersKey。

- [X] T163 [P] [BDD-RED] frontend/members — `When: 使用者直達目前旅行分帳`
  - Read: `specs/truth/features/frontend/members/dsl.md` -> `使用者直達目前旅行分帳`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/members/phase-1b/T163.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen通過；匿名獨立context直達→登入及真401 PASS；非owner缺分帳路由授權GET與兩條完整Given明確產品RED；已review用accessBrowserState.page、一次導頁、保存全部trip-scoped回應body/status與零寫入、不owner回填。匿名PrivatePage先擋頁時用同context唯讀trip GET驗401。

### frontend/repayments

- [X] T164 [P] [BDD-RED] frontend/repayments — `When: owner 保存獨立還款`
  - Read: `specs/truth/features/frontend/repayments/dsl.md` -> `owner 保存獨立還款`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/repayments/phase-1b/T164.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen通過；status分類PASS、五條真schema/表單產品RED；已review一次click/原UUID與payload、local validation無POST正常收斂、201/409/4xx與5xx區分、真UUID查證成功或結果未明無重送，保存完整前後快照。

- [X] T165 [P] [BDD-RED] frontend/repayments — `When: owner 取消超額還款`
  - Read: `specs/truth/features/frontend/repayments/dsl.md` -> `owner 取消超額還款`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/repayments/phase-1b/T165.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen通過；加鎖Chromium明確schema RED；已review對真server警告只取消一次、確認入口/警告關閉、除了原警告POST無新增寫入，保存cancelledOverpaymentKey。

- [X] T166 [P] [BDD-RED] frontend/repayments — `When: owner 明確確認超額還款`
  - Read: `specs/truth/features/frontend/repayments/dsl.md` -> `owner 明確確認超額還款`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/repayments/phase-1b/T166.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；完整confirmation防竄改PASS，成功/stale兩條Chromium明確schema RED；已review一次確認、原UUID原付款/token完整snapshot、201或409衝突；只允許原未確認內容取得新警告，無自動接受。

- [X] T167 [P] [BDD-RED] frontend/repayments — `When: owner 開啟獨立還款成員選單`
  - Read: `specs/truth/features/frontend/repayments/dsl.md` -> `owner 開啟獨立還款成員選單`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/repayments/phase-1b/T167.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen通過；加鎖Chromium明確schema RED；已review重用真members查詢、付款/收款選單各Space/Escape並保留原值、保存完整穩定ID選項、全量快照及零寫入。

### frontend/settlement

- [X] T168 [P] [BDD-RED] frontend/settlement — `When: owner 查看分帳結算`
  - Read: `specs/truth/features/frontend/settlement/dsl.md` -> `owner 查看分帳結算`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/settlement/phase-1b/T168.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；Chromium明確schema RED；已review只讀當前persisted mode並重用openConfirmedSettlementScreen，保存真GET完整ExactAmount/revision/畫面/安排連結，無額外模式寫入。

- [X] T169 [P] [BDD-RED] frontend/settlement — `When: owner 輸入實付 JPY {金額} 並結清`
  - Read: `specs/truth/features/frontend/settlement/dsl.md` -> `owner 輸入實付 JPY {金額} 並結清`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/settlement/phase-1b/T169.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/四金額參數bddgen及list/diff通過；命令與status oracle兩PASS+Chromium明確schema RED；已review單次click、原兩UUID/key/revision/完整分數/date、0本地validation無POST、201/4xx/5xx/原UUID查證分流；拒絕比對Act時權威baseline、真丟回應驗commit且無重送。

- [X] T170 [P] [BDD-RED] frontend/settlement — `When: owner 開啟 Amy 支付 Alice 的實付結清表單`
  - Read: `specs/truth/features/frontend/settlement/dsl.md` -> `owner 開啟 Amy 支付 Alice 的實付結清表單`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/settlement/phase-1b/T170.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；Chromium明確schema RED；已review最新Amy→Alice安排完整快照/revision、真導航點目標連結一次、應付標示及實付空白，未填日期/實付且零寫入。

- [X] T171 [P] [BDD-RED] frontend/settlement — `When: owner 開啟簡化付款`
  - Read: `specs/truth/features/frontend/settlement/dsl.md` -> `owner 開啟簡化付款`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/settlement/phase-1b/T171.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；status分類PASS、schema/switch三條明確產品RED；已review一次真switch PATCH、成功必須同revision browser settlement GET、來源/餘額不變；400保持權威原快照、5xx不冒充確定未寫入，提供T172共用toggle helper。

- [X] T172 [P] [BDD-RED] frontend/settlement — `When: owner 關閉簡化付款`
  - Read: `specs/truth/features/frontend/settlement/dsl.md` -> `owner 關閉簡化付款`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/settlement/phase-1b/T172.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；兩條Chromium明確schema/switch產品RED；已review重用toggle false、真PATCH保存同revision、關閉後一筆恢復直接兩筆安排，無公共helper變更。

### frontend/expenses

- [X] T173 [P] [BDD-RED] frontend/expenses — `Then: 付款欄提示選擇付款人且帳務不變`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `付款欄提示選擇付款人且帳務不變`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/expenses/phase-1b/T173.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；Chromium明確schema RED；已reviewThen只讀付款欄可讀提示/完整原草稿/無成功提示、T145結果與零或單POST、完整權威帳務不變；clone請求陣列防晚到重複寫入，提供T175共用驗證helper。

- [X] T174 [P] [BDD-RED] frontend/expenses — `Then: 修改草稿保留且未宣稱支出與分帳已更新`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `修改草稿保留且未宣稱支出與分帳已更新`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/expenses/phase-1b/T174.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；權威分離反例PASS+Chromium明確schema RED；已reviewThen唯讀保留完整草稿/原PATCH UUID/未確認提示，權威真200新revision與舊confirmed顯示分離、無重送或查證解封；分類欄修為現有SearchCombo顯示「未分類」後tsc/lint通過。

- [X] T175 [P] [BDD-RED] frontend/expenses — `Then: 分攤欄提示至少選一人且帳務不變`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `分攤欄提示至少選一人且帳務不變`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/expenses/phase-1b/T175.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；真空分攤草稿保存後Chromium明確schema RED；已review重用T173 helper唯讀核對至少一人提示/原草稿/無成功提示/無重複寫入/權威帳務不變，Then無新Act。

- [X] T176 [P] [BDD-RED] frontend/expenses — `Then: 原結清與差額調整仍保留原值且實付仍顯示 JPY 33`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `原結清與差額調整仍保留原值且實付仍顯示 JPY 33`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/expenses/phase-1b/T176.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；歷史義務/日期/實付/調整變異反例PASS、修改/刪除兩條Chromium明確schema RED；已reviewThen唯讀完整settlement/repayment/兩adjustments DB原列及GET全欄位投影、原100/3/33/正負1/3、當前畫面Amy→Alice33與原日期，不重新計算或覆寫歷史。

- [X] T177 [P] [BDD-RED] frontend/expenses — `Then: 已保存的 JPY 400 還款仍存在且 Amy 剩餘應付 Alice JPY 400`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `已保存的 JPY 400 還款仍存在且 Amy 剩餘應付 Alice JPY 400`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/expenses/phase-1b/T177.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；舊600/原還款改寫/TWD改寫反例PASS+Chromium明確schema RED；已reviewThen唯讀原還款UUID/400/date/全欄保留、代付800及JPY400/TWD300安排、兩模式獨立oracle與真current revision。GREEN UI契約：region「付款安排」、group「Amy 付款給 Alice JPY」及TWD同格式。

- [X] T178 [P] [BDD-RED] frontend/expenses — `Then: 晚餐不再出現且沒有晚餐造成的分攤與付款安排`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `晚餐不再出現且沒有晚餐造成的分攤與付款安排`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/expenses/phase-1b/T178.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/單句bddgen/diff通過；刪除殘留source/share/debt/arrangement/revision反例PASS+Chromium明確schema RED；已reviewThen唯讀原UUID GET404/全量新API/DB、唯一晚餐及shares移除、安排空與零額canonical、既有browser同revision且無結清links。

- [X] T179 [P] [BDD-RED] frontend/expenses — `Then: 機票仍由 Alice 付款且只由 Alice 分攤並保留原始內容與統計`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `機票仍由 Alice 付款且只由 Alice 分攤並保留原始內容與統計`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/expenses/phase-1b/T179.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: 隔離tests tsc/ESLint/Prettier/單句bddgen/diff通過，並行修正後全域tsc亦通過；投影與canonical零/合法scale反例PASS+真舊DBmigration明確缺payer_member_id RED；已review唯讀legacy authority原UUID/全舊欄位/統計/Alice唯一payer與share，份額及total保持minorUnit2，零淨額允合法0..4尺度。

- [X] T180 [P] [BDD-RED] frontend/expenses — `Then: 點心只有 Amy 與 Bob 各分攤 JPY 50 且 Alice 應收 JPY 100`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `點心只有 Amy 與 Bob 各分攤 JPY 50 且 Alice 應收 JPY 100`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/expenses/phase-1b/T180.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；完整payer/share/net/arrangement反例PASS+Chromium明確schema RED；已reviewThen唯讀保存Act/原UUID GET/DB與當前帳本card，Alice付100但不分攤、AmyBob各50、精確淨額及恰兩安排；UI卡片可見Amy/Bob各JPY50。
  - Review follow-up verified: T218 review修正：重用T181完整UI list驗證恰Amy/Bob各50，額外Alice0不可通過；新DOM集合反例PASS。

- [X] T181 [P] [BDD-RED] frontend/expenses — `Then: 點心各成員分攤金額皆顯示 "{顯示}" 且不附算式`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `點心各成員分攤金額皆顯示 "{顯示}" 且不附算式`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/expenses/phase-1b/T181.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/三顯示字串隔離bddgen通過；BigInt等分/不分餘數/排除未選payer反例PASS、三條Chromium明確schema RED；已reviewThen唯讀真expense GET與完整snapshot、每份約分與精確合計，UI語意list「支出分攤」/listitem姓名+金額、金額可見文字與accessible name同值，無分數算式或精確公平文案；提供T182共用assertMemberShareDisplay。

- [X] T182 [P] [BDD-RED] frontend/expenses — `Then: 點心已保存且三人各分攤 JPY 100/3`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `點心已保存且三人各分攤 JPY 100/3`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/expenses/phase-1b/T182.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；精確三份額/集合/payer/net/arrangement反例PASS+Chromium明確schema RED；已review原UUID/單payer/三份100/3/日期分類/完整來源與最新settlement、當前帳本各33.33重用T181唯讀顯示檢查；Cucumber literal slash已正確跳脫。

### frontend/members

- [X] T183 [P] [BDD-RED] frontend/members — `Then: "{成員}" 的歷史分攤及還款仍保留`
  - Read: `specs/truth/features/frontend/members/dsl.md` -> `"{成員}" 的歷史分攤及還款仍保留`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/members/phase-1b/T183.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/參數單句bddgen/diff通過；歷史保留oracle PASS+Chromium明確schema RED；已reviewThen唯讀T123/T153原UUID停用狀態、份額/還款/淨額全量保留、真GET原member/list、當前同行者頁姓名與停用標示，無新Act或導航。

- [X] T184 [P] [BDD-RED] frontend/members — `Then: owner Alice 不提供停用與刪除操作`
  - Read: `specs/truth/features/frontend/members/dsl.md` -> `owner Alice 不提供停用與刪除操作`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/members/phase-1b/T184.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；控制缺席/disabled與可用button/link反例PASS+Chromium明確schema RED；已reviewThen只讀owner停用/刪除控制及tab-order、GET原owner仍active、無寫入且完整帳務不變，不送非法命令充當UI證據。

- [X] T185 [P] [BDD-RED] frontend/members — `Then: 午餐與還款顯示 "{名稱}" 且仍關聯原成員身分`
  - Read: `specs/truth/features/frontend/members/dsl.md` -> `午餐與還款顯示 "{名稱}" 且仍關聯原成員身分`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/members/phase-1b/T185.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/參數隔離bddgen/diff通過；原UUID/歷史欄位與破壞反例PASS+Chromium明確schema RED；已reviewThen僅DSL明許刷新/唯讀展示，以原UUID驗午餐份額100/淨額-80及原還款全欄，清單/支出分攤/還款紀錄顯示新名，零寫入。

- [X] T186 [P] [BDD-RED] frontend/members — `Then: 同行者名單及新紀錄選項不含 "{成員}"`
  - Read: `specs/truth/features/frontend/members/dsl.md` -> `同行者名單及新紀錄選項不含 "{成員}"`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/members/phase-1b/T186.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過（T185型別修後全域tsc通過）；刪除ID/缺survivor/重複picker反例PASS+Chromium明確schema RED；已review真DELETE204/原member404/完整來源與其他身分保留、唯讀開支出與還款picker核對UUID，零新寫入；提供T187 readExpenseMemberChoiceIds。

- [X] T187 [P] [BDD-RED] frontend/members — `Then: 同行者名單顯示啟用中的 "{名稱}" 且可作為付款人及分攤者`
  - Read: `specs/truth/features/frontend/members/dsl.md` -> `同行者名單顯示啟用中的 "{名稱}" 且可作為付款人及分攤者`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/members/phase-1b/T187.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/三名稱參數隔離bddgen/diff通過；UUID替換/重複/未trim/未active/誤新增反例PASS+新增及重新啟用兩條Chromium明確schema RED；已review穩定Act UUID/只能多一人或同ID啟用、原歷史保留及revision+1，唯讀picker核對完整active UUID集合與可用radio/checkbox，無填寫保存。

- [X] T188 [P] [BDD-RED] frontend/members — `Then: 同行者欄位提示名稱已使用且既有成員與帳務不變`
  - Read: `specs/truth/features/frontend/members/dsl.md` -> `同行者欄位提示名稱已使用且既有成員與帳務不變`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/members/phase-1b/T188.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；accessible錯誤正反例PASS、四條Chromium明確schema RED；review修正同頁雙form依新增/儲存名稱按鈕scope，雙form真Chromium2PASS。Then保留raw輸入/aria-invalid/錯誤description、UUID與完整帳務不變，兼容local或409，唯讀並還原world.response。

- [X] T189 [P] [BDD-RED] frontend/members — `Then: 同行者畫面保留 Carol 並提示保存結果尚未確認`
  - Read: `specs/truth/features/frontend/members/dsl.md` -> `同行者畫面保留 Carol 並提示保存結果尚未確認`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/members/phase-1b/T189.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；authority反例與真DOM未確認狀態2PASS、完整Chromium明確schema RED；已review唯讀Carol草稿/未知提示/無成功或確定失敗、真commit僅一Carol及原UUID GET查證、無替換UUID/重送/導航/查證解封，完整原歷史不變。
  - Review follow-up verified: T218 review修正：兩次直接核對真member form data-command-id等於原commandId，非只比較World側ID；錯替換UUID真DOM反例與既有未知提示guard PASS。T253需公開綁真pending UUID metadata。

- [X] T190 [P] [BDD-RED] frontend/members — `Then: 新支出不可選取 "{成員}"`
  - Read: `specs/truth/features/frontend/members/dsl.md` -> `新支出不可選取 "{成員}"`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/members/phase-1b/T190.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/雙成員參數bddgen及list/diff通過（T189並行型別修後全域tsc通過）；選項availability反例PASS+Chromium明確schema RED；已reviewThen只讀原inactive UUID/歷史與完整快照，radio/checkbox中該ID缺席或原生disabled且未選取、所有active仍可用，無新Act，提供T191共用assertInactiveMemberChoices。

- [X] T191 [P] [BDD-RED] frontend/members — `Then: 獨立還款不可選取 "{成員}"`
  - Read: `specs/truth/features/frontend/members/dsl.md` -> `獨立還款不可選取 "{成員}"`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/members/phase-1b/T191.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/雙成員參數bddgen及list/diff通過；Chromium明確schema RED；已review唯讀已開付款/收款原生options，停用UUID缺席或disabled且未選取、active全集可用、GET原member及歷史完整快照保留，零新Act/寫入且還原world.response。

- [X] T192 [P] [BDD-RED] frontend/members — `Then: 畫面不洩漏同行者或帳務且不提供編輯能力`
  - Read: `specs/truth/features/frontend/members/dsl.md` -> `畫面不洩漏同行者或帳務且不提供編輯能力`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/members/phase-1b/T192.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/隔離bddgen/list通過（T195型別修後全域tsc通過）；保密oracle PASS與匿名/他帳號兩條Chromium明確schema RED；已review用T163 actor context/page與真401/404、closed ApiError optional field/requestId、DOM/AX/欄位及Tab無可用編輯入口、owner全快照不變。review修requestId數字片段不誤當金額，message/field仍掃金額、全payload仍掃原UUID/姓名/內容，a33b trace與真正洩漏反例PASS。

- [X] T193 [P] [BDD-RED] frontend/members — `Then: 畫面提示成員已被使用並提供停用而未刪除 Amy`
  - Read: `specs/truth/features/frontend/members/dsl.md` -> `畫面提示成員已被使用並提供停用而未刪除 Amy`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/members/phase-1b/T193.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen與list/diff通過；可讀錯誤/停用入口反例PASS+Chromium明確schema RED；已review原DELETE409 MEMBER_IN_USE、Amy同UUID仍active與競爭引用後完整快照/revision不變，可用且可鍵盤的停用替代入口只讀不點，零新mutation並還原world.response。

- [X] T194 [P] [BDD-RED] frontend/members — `Then: 電腦顯示同一份同行者、支出與分攤結果`
  - Read: `specs/truth/features/frontend/members/dsl.md` -> `電腦顯示同一份同行者、支出與分攤結果`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/members/phase-1b/T194.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；Chromium明確schema RED；已review用desktopSplittingKey.page真新context、手機同UUID名單/完整expenses/settlement與revision、當前卡片三份33.33與成員精確淨額，零重建/寫入並再讀手機原快照不變。

### frontend/repayments

- [X] T195 [P] [BDD-RED] frontend/repayments — `Then: JPY 已結清且保留 JPY 400 與 JPY 600 兩筆獨立實付`
  - Read: `specs/truth/features/frontend/repayments/dsl.md` -> `JPY 已結清且保留 JPY 400 與 JPY 600 兩筆獨立實付`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/repayments/phase-1b/T195.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；原400不可變/兩獨立事實/不可假adjust/staleJPY/TWD/日期反例PASS+Chromium明確schema RED；已review兩原UUID GET/全DB與DTO、只新增600 independent無結清調整、JPY精確0可省零列與TWD300保留、當前UI成功/已結清/兩實付歷史，Then無導航寫入。

- [X] T196 [P] [BDD-RED] frontend/repayments — `Then: 保留還款草稿與原識別並提示結果尚未確認`
  - Read: `specs/truth/features/frontend/repayments/dsl.md` -> `保留還款草稿與原識別並提示結果尚未確認`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/repayments/phase-1b/T196.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen通過；換UUID/重送/未查證/假404/未commit/假成功反例PASS+Chromium明確schema RED；已reviewThen只讀原UUID與完整400草稿/未知提示/查證入口、browser暫404但真原GET200/一筆實付、可見餘額只舊confirmed標示，無導航重送解封或查證Act。

- [X] T197 [P] [BDD-RED] frontend/repayments — `Then: 已保存 JPY 400 實付且 Amy 剩餘應付 Alice JPY 600、TWD 300`
  - Read: `specs/truth/features/frontend/repayments/dsl.md` -> `已保存 JPY 400 實付且 Amy 剩餘應付 Alice JPY 600、TWD 300`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/repayments/phase-1b/T197.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；權威反例PASS、正常/原UUID恢復兩條Chromium明確schema RED；已review唯一400獨立實付原ID/date/DTO、JPY600/TWD300及原來源不變、無結清調整，UI兩安排一歷史與成功；允Act短暫unknown但僅available loss且既有browser原UUID GET200後成功，無新Act或導航。

- [X] T198 [P] [BDD-RED] frontend/repayments — `Then: 已保存 JPY 700 獨立實付且 Alice 改為應付 Amy JPY 100`
  - Read: `specs/truth/features/frontend/repayments/dsl.md` -> `已保存 JPY 700 獨立實付且 Alice 改為應付 Amy JPY 100`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/repayments/phase-1b/T198.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；原400/新700/反向端點/金額/TWD/日期/完整非零集合反例PASS+Chromium明確schema RED；已review原UUID真confirmation201及兩原ID GET、兩獨立付款保留且無結清調整、JPY Alice→Amy100/TWD300、UI完整兩安排兩歷史，live紀錄無額外POST且Then唯讀。

- [X] T199 [P] [BDD-RED] frontend/repayments — `Then: 提示超額 JPY 100 將使 Alice 應付 Amy JPY 100 且尚未保存`
  - Read: `specs/truth/features/frontend/repayments/dsl.md` -> `提示超額 JPY 100 將使 Alice 應付 Amy JPY 100 且尚未保存`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/repayments/phase-1b/T199.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；真409 warning/token/revision/excess/反向端點與來源保留反例PASS+Chromium明確schema RED；已reviewT164 captured warning優先或T129基準、完整API/DB不變/原UUID404/JPY600 TWD300、UI明確超額100與反向Alice→Amy100、確認取消入口、零第二POST且Then唯讀。

- [X] T200 [P] [BDD-RED] frontend/repayments — `Then: 本旅行還款選單不可選取 Carol`
  - Read: `specs/truth/features/frontend/repayments/dsl.md` -> `本旅行還款選單不可選取 Carol`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/repayments/phase-1b/T200.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；foreign enabled/disabled/換名假ID/漏本地重複等選項反例PASS+Chromium明確schema RED；已reviewT167/T132真目錄、兩native select全部option排除Carol UUID/name並保留本旅行全集可選、兩旅行完整權威快照不變，Then無寫入並還原兩world.response。

- [X] T201 [P] [BDD-RED] frontend/repayments — `Then: 沒有新增還款且 Amy 仍應付 Alice JPY 600`
  - Read: `specs/truth/features/frontend/repayments/dsl.md` -> `沒有新增還款且 Amy 仍應付 Alice JPY 600`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/repayments/phase-1b/T201.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；七類取消/重送/來源變異反例PASS+Chromium明確schema RED；已reviewT165取消後確認入口與警告關閉/無成功提示、僅原警告POST、原UUID GET404、完整來源與JPY600/TWD300基準不變，重用T199獨立檢查，Then只讀並還原world.response。

- [X] T202 [P] [BDD-RED] frontend/repayments — `Then: 畫面查證原還款成功且不重複新增`
  - Read: `specs/truth/features/frontend/repayments/dsl.md` -> `畫面查證原還款成功且不重複新增`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/repayments/phase-1b/T202.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；原命令/查證/單POST恢復反例PASS+Chromium明確schema RED；已review先等app既有原UUID GET200再T197完整來源/UI成功檢查、原ID/date/唯一400與JPY600/TWD300、沒有Then查證click/新POST/導航或route解封。

- [X] T203 [P] [BDD-RED] frontend/repayments — `Then: 還款欄提示付款人與收款人不可相同且帳務不變`
  - Read: `specs/truth/features/frontend/repayments/dsl.md` -> `還款欄提示付款人與收款人不可相同且帳務不變`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/repayments/phase-1b/T203.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；5xx/unknown/重送/換ID/版本變動/假adjust反例PASS+Chromium明確schema RED；已reviewThen唯讀原完整草稿與data-command-id/可讀同人錯誤/無成功、local或確定4xx才拒絕、完整sources/投影不變及原UUID404，提供T204 amount共用helper。

- [X] T204 [P] [BDD-RED] frontend/repayments — `Then: 還款欄提示正數金額且帳務不變`
  - Read: `specs/truth/features/frontend/repayments/dsl.md` -> `還款欄提示正數金額且帳務不變`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/repayments/phase-1b/T204.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；真0元草稿→單次保存→readonly Then Chromium明確schema RED；已review只註冊重用T203 amount驗證helper，正數可讀提示/原完整草稿與UUID/全帳務不變，無shared或產品修改。

- [X] T205 [P] [BDD-RED] frontend/repayments — `Then: 顯示新的超額 JPY 200 警告且未保存舊確認`
  - Read: `specs/truth/features/frontend/repayments/dsl.md` -> `顯示新的超額 JPY 200 警告且未保存舊確認`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/repayments/phase-1b/T205.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；舊確認接受/換UUID/自動confirm/重複POST/來源變動反例PASS+Chromium明確schema RED；已review原409 ACCOUNTING_REVISION_CONFLICT、只允app原UUID未確認payload刷新警告、UI超額200/反向200/餘額500待再次確認、原UUID404/修正後完整快照與TWD300保留、Then只讀無新Act。

### frontend/settlement

- [X] T206 [P] [BDD-RED] frontend/settlement — `Then: {付款人} 的安排已關閉且保存實付 JPY {實付} 與原應付 JPY {應付}`
  - Read: `specs/truth/features/frontend/settlement/dsl.md` -> `{付款人} 的安排已關閉且保存實付 JPY {實付} 與原應付 JPY {應付}`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/settlement/phase-1b/T206.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/三例值隔離bddgen/diff通過；summary格式/禁取整key反例PASS、33/34/700三條Chromium明確schema RED；已review原UUID GET/完整原子實付與兩調整/其他安排oracle及歷史份額不變、UI應付與實付成功摘要不混用、無取整方式與重送，提供readClosedBrowserSettlement唯讀helper。

- [X] T207 [P] [BDD-RED] frontend/settlement — `Then: 三人已平衡且保留兩筆實付與原始份額`
  - Read: `specs/truth/features/frontend/settlement/dsl.md` -> `三人已平衡且保留兩筆實付與原始份額`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/settlement/phase-1b/T207.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；正反向極小尾差反例PASS+Chromium明確schema RED；已reviewT206與backend sequential oracle、原Amy33/Bob34兩immutable records/實付反覆GET與四調整、原100/3份額/expense不變、真三人精確0/無安排與UI已結清無links/尾差，Then無新Act。

- [X] T208 [P] [BDD-RED] frontend/settlement — `Then: 三句內說明 Alice 改付 Carol、兩筆變一筆與淨額及來源紀錄不變`
  - Read: `specs/truth/features/frontend/settlement/dsl.md` -> `三句內說明 Alice 改付 Carol、兩筆變一筆與淨額及來源紀錄不變`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/settlement/phase-1b/T208.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；說明正反例PASS+Chromium明確schema RED；已reviewThen唯讀真API 2→1與獨立來源oracle、淨額及原支出/還款不變，原Alice→Bob→Carol與新Alice→Carol三句內中性說明、switch可見/accessible name/checked、無改道精確公平術語。

- [X] T209 [P] [BDD-RED] frontend/settlement — `Then: 仍為 Amy 支付 Alice JPY 500 並提示目前的付款安排已無需調整`
  - Read: `specs/truth/features/frontend/settlement/dsl.md` -> `仍為 Amy 支付 Alice JPY 500 並提示目前的付款安排已無需調整`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/settlement/phase-1b/T209.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；中性三句提示反例PASS+Chromium明確schema RED；已reviewThen唯讀toggle saved同revision、獨立source/net不變、完整唯一Amy→Alice500與direct/suggested=1、重用T211 UI安排/link全集、提示「目前的付款安排已無需調整」且未誤稱無需付款。

- [X] T210 [P] [BDD-RED] frontend/settlement — `Then: 保留關閉模式的已確認兩筆安排並提供重試`
  - Read: `specs/truth/features/frontend/settlement/dsl.md` -> `保留關閉模式的已確認兩筆安排並提供重試`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/settlement/phase-1b/T210.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；Chromium明確schema RED；已reviewT141/T171真拒絕/單PATCH、false舊revision完整快照/兩筆原opaque links、switch未開啟/可讀失敗/可用重試、無新成功狀態，重用T211完整安排唯讀檢查且未按重試或新導航。

- [X] T211 [P] [BDD-RED] frontend/settlement — `Then: 分帳畫面只列出以下付款安排：`
  - Read: `specs/truth/features/frontend/settlement/dsl.md` -> `分帳畫面只列出以下付款安排：`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/settlement/phase-1b/T211.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/多列DataTable隔離bddgen通過；完整集合/顯示/模式oracle反例PASS+Chromium明確schema RED；已reviewbrowser confirmed與最新GET同revision、完整source-only模式oracle、UI所有付款安排group與「結清」links恰集合及真opaque key、最多兩位不含算式，Then無導航寫入。

- [X] T212 [P] [BDD-RED] frontend/settlement — `Then: 實付欄提示正數且安排未結清`
  - Read: `specs/truth/features/frontend/settlement/dsl.md` -> `實付欄提示正數且安排未結清`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/settlement/phase-1b/T212.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；saved/recovered/unknown/5xx假拒絕與來源變異反例PASS+Chromium明確schema RED；已reviewThen唯讀0草稿/正數錯誤/aria-invalid/無成功、原key與100/3/revision及全source投影不變、兩reserved UUID GET404，零或單原POST。

- [X] T213 [P] [BDD-RED] frontend/settlement — `Then: 應付顯示 JPY 33.33 而實付留空且沒有取整方式選擇`
  - Read: `specs/truth/features/frontend/settlement/dsl.md` -> `應付顯示 JPY 33.33 而實付留空且沒有取整方式選擇`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/settlement/phase-1b/T213.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen通過；UI策略/過多小數/算式反例PASS+Chromium明確schema RED；已reviewThen唯讀T170 opening snapshot、可讀應付33.33/實付空、無取整控制或option、最新真GET仍100/3/full key/revision且全部來源不變，零寫入。

- [X] T214 [P] [BDD-RED] frontend/settlement — `Then: 提示安排已更新並要求刷新且沒有本次實付或結清`
  - Read: `specs/truth/features/frontend/settlement/dsl.md` -> `提示安排已更新並要求刷新且沒有本次實付或結清`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/settlement/phase-1b/T214.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；舊command/新baseline/POST對抗反例PASS+Chromium明確schema RED；已review409兩合法code、原100/3 key對新200/3與新revision、完整修正後快照不變/兩reserved UUID404、僅原POST一次；UI可讀要求刷新及可用入口只檢不點、無成功或新Act。

- [X] T215 [P] [BDD-RED] frontend/settlement — `Then: 畫面保留實付草稿並提示結清結果尚未確認`
  - Read: `specs/truth/features/frontend/settlement/dsl.md` -> `畫面保留實付草稿並提示結清結果尚未確認`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/settlement/phase-1b/T215.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；錯outcome/換兩UUID或snapshot/date/重送/無查證/假404未commit等反例PASS+Chromium明確schema RED；已reviewThen唯讀保留33/date/兩metadata UUID及完整原command、browser暫404但真record/payment200與一record一pay兩adjust完整原子快照，維持route無重送/導航/查證click。

- [X] T216 [P] [BDD-RED] frontend/settlement — `Then: 畫面查證原結清成功且不重複記錄`
  - Read: `specs/truth/features/frontend/settlement/dsl.md` -> `畫面查證原結清成功且不重複記錄`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/settlement/phase-1b/T216.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；原兩UUID/snapshot/單POST/原GET200及拒替換重送反例PASS+Chromium明確schema RED；已review等app既有原UUID恢復可接When暫unknown，重用T206完整record/payment/twoadjust/歷史與關閉安排，UI查證後成功摘要/未知提示消失，無click新POST導航或route解封。

- [X] T217 [P] [BDD-RED] frontend/settlement — `Then: 簡化付款仍開啟且重現 Alice 支付 Carol JPY 60`
  - Read: `specs/truth/features/frontend/settlement/dsl.md` -> `簡化付款仍開啟且重現 Alice 支付 Carol JPY 60`；`truth-delta.md` -> 同句ADD。
  - Write: `apps/web/tests/steps/settlement/phase-1b/T217.ts`；依Phase3 Boundary只實作這句及其直接測試helper。
  - Evidence: tests tsc/ESLint/Prettier/單句bddgen/diff通過；false/stale revision/改key/balance/source反例PASS+Chromium明確schema RED；已reviewsaved trip/snapshot、When screen與新GET完全同revision、switch仍checked、完整Alice→Carol60及原opaque links，零repair PATCH或新Act。

- [X] T218 subagent review (phase quality gate)
  - Dependencies: T006–T217全部完成；Read: 兩端全部本輪Test Scope、權威DSL、所有新step/helper、既有兩條重用step與本Phase3 Boundary。
  - Evidence: `./scripts/pnpm.sh exec bddgen -c apps/api/playwright.config.ts`、web同指令均成功且無undefined/ambiguous；`./scripts/pnpm.sh exec tsc -p tsconfig.tests.json`通過；逐句對照212條完整實作，確認Given落地、Then權威+再讀與不變量，前端不是只看文字。
  - 實跑本輪24份feature取得RED清單；逐句最小註冊/參數測試補足因前序fixture RED未到達的When/Then，確認不是註冊或基建失敗。此處不要求產品先GREEN。並行/rollback測試只用隔離內部barrier/DI，沒有公開測試入口。
  - 若有issue，修正測試層再review；不得改truth或產品行為來通過。通過後才解鎖Phase4。
  - Gate result: PASS；212新DSL+2重用逐列獨立review，四issue修正後zero open findings；兩端完整bddgen/tests tsc通過，24files/197distinct Examples（API125＋Web72×2＝269執行）均真正產品契約RED，零skip/undefined/SQL/module/infra。正式web-support glob含全部splitting specs，--list 532/118。詳見phase3-test-review.md及validation.md，已解鎖T219。

## Phase 4A: ADD Feature File - backend/trips/trip-splitting-initial-state.feature

**Goal**: 以新migration落地分帳持久化模型及舊資料owner/單人share回填，建立旅行時原子建立唯一owner成員；補其直接需要的members讀取與Trip投影。結構須支援後續測試fixture，但不提前提供尚未受測的寫入命令。

**Dependencies**: Phase3 gate T218。本輪首個Feature不依賴其他Feature的REFACTOR；此處必要唯讀依賴可在該GREEN內完成，禁止以額外mutation或mock取代。

**Shared Must Read**:
- `specs/truth/features/backend/trips/trip-splitting-initial-state.feature` -> Feature全文、全部Rule/Example。
- `specs/truth/features/backend/trips/dsl.md` -> 此Feature實際使用的Given/When/Then rows。
- `specs/truth/features/backend/dsl.md` -> `使用者"甲"已登入`。
- `truth-delta.md` -> `/dsl-refine` ADD `specs/truth/features/backend/trips/trip-splitting-initial-state.feature` 與上述DSL列。
- `plan.md` -> 旅行分帳 API 介面＋旅行分帳持久化介面、Wave1–2。
- `specs/truth/contracts/groups/trips.yaml` -> 本檔受測operation；`specs/truth/contracts/components/schemas/trips.yaml` -> Trip ownerMemberId/simplifyDebts/accountingRevision；建立旅行原子owner及revision。
- `specs/truth/data/data-model.dbml` -> trips、trip_members、expenses/expense_shares、repayments、settlements、settlement_adjustments的欄位/複合FK/不可變生命週期及migration回填（只有此phase建立全輪schema供各feature隔離fixture使用）。
- `specs/truth/contracts/groups/members.yaml` -> 新owner成員GET；`specs/truth/contracts/components/schemas/members.yaml` -> 固定角色/啟用狀態。
- `truth-delta.md` -> `/api-plan` trips operation/schema列；`/data-plan` 上述表及生命週期列；`/technical-research` 本檔數值/鎖/遷移列。
- `specs/truth/techstack.md` -> Phase1B精確分攤、寫入一致性與分端BDD；`research.md` -> 決策6–7（owner/名稱與migration）。
- Product landing: `apps/api/src/modules/trips/index.ts`、`apps/api/src/db/schema.ts`、`apps/api/drizzle/0003_trip_splitting.sql`（新檔）；`apps/api/src/app.ts` -> 路由/依賴接線。

**Boundary**:
- 只實作本Test Scope所需的產品行為及必要讀取依賴；資料/金額不跨幣別，不更改預期值或放寬權威驗證。使用既有型別/fixture；測試新語意已集中Phase3，這裡不補RED/ALIGN/REMOVE。
- DB寫入沿用同旅行owner篩選、旅行→子資源鎖序與版本；失敗不改帳務。完整模型migration只在4A建立，不改已套用的0001/0002；其餘GREEN只修本scope必要模型/演算法，不能以DDL fixture替代產品migration。

**Test Scope**:
- `specs/truth/features/backend/trips/trip-splitting-initial-state.feature` 全檔，不以grep挑掉失敗Example。
- Generation: `./scripts/pnpm.sh exec bddgen -c apps/api/playwright.config.ts`；Focused run: `./scripts/pnpm.sh exec playwright test -c apps/api/playwright.config.ts trips/trip-splitting-initial-state.feature`。用同範圍的 `--list` 核對本檔全部案例，不更改全域missingSteps或只挑成功Example。
- 後端API project；schema/純函式受影響時同跑focused support與money/splitting-invariants單元測試。

- [X] T219 [BDD-GREEN] 讓 Test Scope 全綠
  - Dependencies: T218；產品落點以上述Product landing為起點，完成Goal；Evidence：記錄整檔命令/案例數/綠燈與受影響focused回歸，寫入 `validation.md`（plan-side新檔）。

- [X] T220 [BDD-REFACTOR] 在綠燈下整理本檔產品模組
  - Dependencies: T219；只整理本檔共用邊界與必要產品重複，保留精確/隔離/不可變契約。重跑本Test Scope；未受影響範圍不擴大重構，不能藉重構放寬測試。

## Phase 4B: ADD Feature File - backend/expenses/shared-expenses-and-personal-compatibility.feature

**Goal**: 實作BigInt有理數與共同支出POST、個人請求/舊資料相容、有效成員驗證及ExactAmount投影；補本檔斷言需要的members/expenses/settlement/repayments唯讀查核通道，不實作獨立還款或結清命令。

**Dependencies**: T220；Phase3 gate T218。先完成上一Feature的REFACTOR再開始此GREEN；此處必要唯讀依賴可在該GREEN內完成，禁止以額外mutation或mock取代。

**Shared Must Read**:
- `specs/truth/features/backend/expenses/shared-expenses-and-personal-compatibility.feature` -> Feature全文、全部Rule/Example。
- `specs/truth/features/backend/expenses/dsl.md` -> 此Feature實際使用的Given/When/Then rows。
- `specs/truth/features/backend/dsl.md` -> `owner 的分帳旅行已建立成員`、`這次分帳操作被拒絕為 "{錯誤}"`。
- `truth-delta.md` -> `/dsl-refine` ADD `specs/truth/features/backend/expenses/shared-expenses-and-personal-compatibility.feature` 與上述DSL列。
- `plan.md` -> 旅行分帳 API 介面＋旅行分帳持久化介面、Wave1–2。
- `specs/truth/contracts/groups/expenses.yaml` -> 本檔受測operation；`specs/truth/contracts/components/schemas/expenses.yaml` -> Expense/ExpenseShare/Create/Update；原始MoneyAmount與ExactAmount、相容欄位。
- `specs/truth/data/data-model.dbml` -> expenses、expense_shares；完整替換、歷史minorUnit與實付/結清不可連帶刪除。
- `specs/truth/contracts/groups/{members,settlement,repayments}.yaml` -> 本檔權威再讀直接使用的members/settlement/repayments GET；`specs/truth/contracts/components/schemas/shared.yaml` -> ExactAmount/MoneyAmount。
- `truth-delta.md` -> `/api-plan` expenses operation/schema列；`/data-plan` 上述表及生命週期列；`/technical-research` 本檔數值/鎖/遷移列。
- `specs/truth/techstack.md` -> Phase1B精確分攤、寫入一致性與分端BDD；`research.md` -> 決策2–5（有理數、差額、直接/簡化圖與交易）。
- Product landing: `apps/api/src/modules/expenses/index.ts`、`packages/shared/src/` 分帳純函式與共用旅行鎖入口；`apps/api/src/app.ts` -> 路由/依賴接線。

**Boundary**:
- 只實作本Test Scope所需的產品行為及必要讀取依賴；資料/金額不跨幣別，不更改預期值或放寬權威驗證。使用既有型別/fixture；測試新語意已集中Phase3，這裡不補RED/ALIGN/REMOVE。
- DB寫入沿用同旅行owner篩選、旅行→子資源鎖序與版本；失敗不改帳務。完整模型migration只在4A建立，不改已套用的0001/0002；其餘GREEN只修本scope必要模型/演算法，不能以DDL fixture替代產品migration。

**Test Scope**:
- `specs/truth/features/backend/expenses/shared-expenses-and-personal-compatibility.feature` 全檔，不以grep挑掉失敗Example。
- Generation: `./scripts/pnpm.sh exec bddgen -c apps/api/playwright.config.ts`；Focused run: `./scripts/pnpm.sh exec playwright test -c apps/api/playwright.config.ts expenses/shared-expenses-and-personal-compatibility.feature`。用同範圍的 `--list` 核對本檔全部案例，不更改全域missingSteps或只挑成功Example。
- 後端API project；schema/純函式受影響時同跑focused support與money/splitting-invariants單元測試。

- [X] T221 [BDD-GREEN] 讓 Test Scope 全綠
  - Dependencies: T220；產品落點以上述Product landing為起點，完成Goal；Evidence：記錄整檔命令/案例數/綠燈與受影響focused回歸，寫入 `validation.md`（plan-side新檔）。

- [X] T222 [BDD-REFACTOR] 在綠燈下整理本檔產品模組
  - Dependencies: T221；只整理本檔共用邊界與必要產品重複，保留精確/隔離/不可變契約。重跑本Test Scope；未受影響範圍不擴大重構，不能藉重構放寬測試。

## Phase 4C: ADD Feature File - backend/members/trip-member-lifecycle.feature

**Goal**: 實作trim/ASCII唯一鍵、owner保護、改名/停用/啟用及引用刪除；歷史ID與淨額保持，名稱衝突及引用錯誤精確映射。

**Dependencies**: T222；Phase3 gate T218。先完成上一Feature的REFACTOR再開始此GREEN；此處必要唯讀依賴可在該GREEN內完成，禁止以額外mutation或mock取代。

**Shared Must Read**:
- `specs/truth/features/backend/members/trip-member-lifecycle.feature` -> Feature全文、全部Rule/Example。
- `specs/truth/features/backend/members/dsl.md` -> 此Feature實際使用的Given/When/Then rows。
- `specs/truth/features/backend/dsl.md` -> `owner 的分帳旅行已建立成員`、`這次分帳操作被拒絕為 "{錯誤}"`、`owner 的分帳旅行已有下列支出：`、`owner 的分帳旅行已有下列獨立還款：`。
- `truth-delta.md` -> `/dsl-refine` ADD `specs/truth/features/backend/members/trip-member-lifecycle.feature` 與上述DSL列。
- `plan.md` -> 旅行分帳 API 介面＋旅行分帳持久化介面、Wave1–2。
- `specs/truth/contracts/groups/members.yaml` -> 本檔受測operation；`specs/truth/contracts/components/schemas/members.yaml` -> TripMember/CreateMemberRequest/UpdateMemberRequest；名稱/停用/引用衝突。
- `specs/truth/data/data-model.dbml` -> trip_members角色/nameKey/唯一索引、owner保護及各歷史Ref。
- `specs/truth/contracts/groups/{expenses,repayments,settlement}.yaml` -> 歷史關聯的GET再讀；只讀本檔引用的成員/份額/實付/淨額欄位。
- `truth-delta.md` -> `/api-plan` members operation/schema列；`/data-plan` 上述表及生命週期列；`/technical-research` 本檔數值/鎖/遷移列。
- `specs/truth/techstack.md` -> Phase1B精確分攤、寫入一致性與分端BDD；`research.md` -> 決策6–7（owner/名稱與migration）。
- Product landing: `apps/api/src/modules/members/index.ts`；`apps/api/src/app.ts` -> 路由/依賴接線。

**Boundary**:
- 只實作本Test Scope所需的產品行為及必要讀取依賴；資料/金額不跨幣別，不更改預期值或放寬權威驗證。使用既有型別/fixture；測試新語意已集中Phase3，這裡不補RED/ALIGN/REMOVE。
- DB寫入沿用同旅行owner篩選、旅行→子資源鎖序與版本；失敗不改帳務。完整模型migration只在4A建立，不改已套用的0001/0002；其餘GREEN只修本scope必要模型/演算法，不能以DDL fixture替代產品migration。

**Test Scope**:
- `specs/truth/features/backend/members/trip-member-lifecycle.feature` 全檔，不以grep挑掉失敗Example。
- Generation: `./scripts/pnpm.sh exec bddgen -c apps/api/playwright.config.ts`；Focused run: `./scripts/pnpm.sh exec playwright test -c apps/api/playwright.config.ts members/trip-member-lifecycle.feature`。用同範圍的 `--list` 核對本檔全部案例，不更改全域missingSteps或只挑成功Example。
- 後端API project；schema/純函式受影響時同跑focused support與money/splitting-invariants單元測試。

- [X] T223 [BDD-GREEN] 讓 Test Scope 全綠
  - Dependencies: T222；產品落點以上述Product landing為起點，完成Goal；Evidence：記錄整檔命令/案例數/綠燈與受影響focused回歸，寫入 `validation.md`（plan-side新檔）。

- [X] T224 [BDD-REFACTOR] 在綠燈下整理本檔產品模組
  - Dependencies: T223；只整理本檔共用邊界與必要產品重複，保留精確/隔離/不可變契約。重跑本Test Scope；未受影響範圍不擴大重構，不能藉重構放寬測試。

## Phase 4D: ADD Feature File - backend/members/cross-device-member-access.feature

**Goal**: 同一owner不同有效session讀同一旅行穩定成員，不以本地快取/姓名冒充權限。

**Dependencies**: T224；Phase3 gate T218。先完成上一Feature的REFACTOR再開始此GREEN；此處必要唯讀依賴可在該GREEN內完成，禁止以額外mutation或mock取代。

**Shared Must Read**:
- `specs/truth/features/backend/members/cross-device-member-access.feature` -> Feature全文、全部Rule/Example。
- `specs/truth/features/backend/members/dsl.md` -> 此Feature實際使用的Given/When/Then rows。
- `specs/truth/features/backend/dsl.md` -> `owner 的分帳旅行已建立成員`。
- `truth-delta.md` -> `/dsl-refine` ADD `specs/truth/features/backend/members/cross-device-member-access.feature` 與上述DSL列。
- `plan.md` -> 旅行分帳 API 介面＋旅行分帳持久化介面、Wave1–2。
- `specs/truth/contracts/groups/members.yaml` -> 本檔受測operation；`specs/truth/contracts/components/schemas/members.yaml` -> TripMember/CreateMemberRequest/UpdateMemberRequest；名稱/停用/引用衝突。
- `specs/truth/data/data-model.dbml` -> trip_members角色/nameKey/唯一索引、owner保護及各歷史Ref。
- `specs/truth/contracts/groups/{expenses,repayments,settlement}.yaml` -> 歷史關聯的GET再讀；只讀本檔引用的成員/份額/實付/淨額欄位。
- `truth-delta.md` -> `/api-plan` members operation/schema列；`/data-plan` 上述表及生命週期列；`/technical-research` 本檔數值/鎖/遷移列。
- `specs/truth/techstack.md` -> Phase1B精確分攤、寫入一致性與分端BDD；`research.md` -> 決策6–7（owner/名稱與migration）。
- Product landing: `apps/api/src/modules/members/index.ts`；`apps/api/src/app.ts` -> 路由/依賴接線。

**Boundary**:
- 只實作本Test Scope所需的產品行為及必要讀取依賴；資料/金額不跨幣別，不更改預期值或放寬權威驗證。使用既有型別/fixture；測試新語意已集中Phase3，這裡不補RED/ALIGN/REMOVE。
- DB寫入沿用同旅行owner篩選、旅行→子資源鎖序與版本；失敗不改帳務。完整模型migration只在4A建立，不改已套用的0001/0002；其餘GREEN只修本scope必要模型/演算法，不能以DDL fixture替代產品migration。

**Test Scope**:
- `specs/truth/features/backend/members/cross-device-member-access.feature` 全檔，不以grep挑掉失敗Example。
- Generation: `./scripts/pnpm.sh exec bddgen -c apps/api/playwright.config.ts`；Focused run: `./scripts/pnpm.sh exec playwright test -c apps/api/playwright.config.ts members/cross-device-member-access.feature`。用同範圍的 `--list` 核對本檔全部案例，不更改全域missingSteps或只挑成功Example。
- 後端API project；schema/純函式受影響時同跑focused support與money/splitting-invariants單元測試。

- [X] T225 [BDD-GREEN] 讓 Test Scope 全綠
  - Dependencies: T224；產品落點以上述Product landing為起點，完成Goal；Evidence：記錄整檔命令/案例數/綠燈與受影響focused回歸，寫入 `validation.md`（plan-side新檔）。

- [X] T226 [BDD-REFACTOR] 在綠燈下整理本檔產品模組
  - Dependencies: T225；只整理本檔共用邊界與必要產品重複，保留精確/隔離/不可變契約。重跑本Test Scope；未受影響範圍不擴大重構，不能藉重構放寬測試。

## Phase 4E: ADD Feature File - backend/settlement/currency-balances-and-payment-simplification.feature

**Goal**: 從同一快照重建各幣別有理數淨額、直接圖與確定性簡化安排；旅行設定持久切換、筆數回退與三句中性說明。

**Dependencies**: T226；Phase3 gate T218。先完成上一Feature的REFACTOR再開始此GREEN；此處必要唯讀依賴可在該GREEN內完成，禁止以額外mutation或mock取代。

**Shared Must Read**:
- `specs/truth/features/backend/settlement/currency-balances-and-payment-simplification.feature` -> Feature全文、全部Rule/Example。
- `specs/truth/features/backend/settlement/dsl.md` -> 此Feature實際使用的Given/When/Then rows。
- `specs/truth/features/backend/dsl.md` -> `owner 的分帳旅行已有下列支出：`、`owner 的分帳旅行已建立成員`。
- `truth-delta.md` -> `/dsl-refine` ADD `specs/truth/features/backend/settlement/currency-balances-and-payment-simplification.feature` 與上述DSL列。
- `plan.md` -> 旅行分帳 API 介面＋旅行分帳持久化介面、Wave1–2。
- `specs/truth/contracts/groups/settlement.yaml` -> 本檔受測operation；`specs/truth/contracts/components/schemas/settlement.yaml` -> SettlementView/PaymentArrangement/SettleArrangementRequest/SettlementRecord；版本/快照/兩調整。
- `specs/truth/data/data-model.dbml` -> trips、expenses/expense_shares、repayments、settlements、settlement_adjustments與旅行鎖。
- `specs/truth/contracts/groups/trips.yaml` -> simplifyDebts PATCH；`specs/truth/contracts/components/schemas/{trips,repayments,shared}.yaml` -> revision、實付與有理數快照。
- `truth-delta.md` -> `/api-plan` settlement operation/schema列；`/data-plan` 上述表及生命週期列；`/technical-research` 本檔數值/鎖/遷移列。
- `specs/truth/techstack.md` -> Phase1B精確分攤、寫入一致性與分端BDD；`research.md` -> 決策2–5（有理數、差額、直接/簡化圖與交易）。
- Product landing: `apps/api/src/modules/settlement/index.ts`、`packages/shared/src/` 分帳純函式與共用旅行鎖入口；`apps/api/src/app.ts` -> 路由/依賴接線。

**Boundary**:
- 只實作本Test Scope所需的產品行為及必要讀取依賴；資料/金額不跨幣別，不更改預期值或放寬權威驗證。使用既有型別/fixture；測試新語意已集中Phase3，這裡不補RED/ALIGN/REMOVE。
- DB寫入沿用同旅行owner篩選、旅行→子資源鎖序與版本；失敗不改帳務。完整模型migration只在4A建立，不改已套用的0001/0002；其餘GREEN只修本scope必要模型/演算法，不能以DDL fixture替代產品migration。

**Test Scope**:
- `specs/truth/features/backend/settlement/currency-balances-and-payment-simplification.feature` 全檔，不以grep挑掉失敗Example。
- Generation: `./scripts/pnpm.sh exec bddgen -c apps/api/playwright.config.ts`；Focused run: `./scripts/pnpm.sh exec playwright test -c apps/api/playwright.config.ts settlement/currency-balances-and-payment-simplification.feature`。用同範圍的 `--list` 核對本檔全部案例，不更改全域missingSteps或只挑成功Example。
- 後端API project；schema/純函式受影響時同跑focused support與money/splitting-invariants單元測試。

- [X] T227 [BDD-GREEN] 讓 Test Scope 全綠
  - Dependencies: T226；產品落點以上述Product landing為起點，完成Goal；Evidence：記錄整檔命令/案例數/綠燈與受影響focused回歸，寫入 `validation.md`（plan-side新檔）。

- [X] T228 [BDD-REFACTOR] 在綠燈下整理本檔產品模組
  - Dependencies: T227；只整理本檔共用邊界與必要產品重複，保留精確/隔離/不可變契約。重跑本Test Scope；未受影響範圍不擴大重構，不能藉重構放寬測試。

## Phase 4F: ADD Feature File - backend/repayments/independent-repayments-and-overpayment-confirmation.feature

**Goal**: 實作獨立實付、分次/多次、同幣別重算與先警告再同UUID/伺服器快照確認的超額反轉；驗證token與revision，絕不借用結清調整抹超額。

**Dependencies**: T228；Phase3 gate T218。先完成上一Feature的REFACTOR再開始此GREEN；此處必要唯讀依賴可在該GREEN內完成，禁止以額外mutation或mock取代。

**Shared Must Read**:
- `specs/truth/features/backend/repayments/independent-repayments-and-overpayment-confirmation.feature` -> Feature全文、全部Rule/Example。
- `specs/truth/features/backend/repayments/dsl.md` -> 此Feature實際使用的Given/When/Then rows。
- `specs/truth/features/backend/dsl.md` -> `owner 的分帳旅行已有下列支出：`、`owner 的分帳旅行已有下列獨立還款：`、`這次分帳操作被拒絕為 "{錯誤}"`。
- `truth-delta.md` -> `/dsl-refine` ADD `specs/truth/features/backend/repayments/independent-repayments-and-overpayment-confirmation.feature` 與上述DSL列。
- `plan.md` -> 旅行分帳 API 介面＋旅行分帳持久化介面、Wave1–2。
- `specs/truth/contracts/groups/repayments.yaml` -> 本檔受測operation；`specs/truth/contracts/components/schemas/repayments.yaml` -> Repayment/CreateRepaymentRequest/OverpaymentWarning/Confirmation；同UUID與警告token。
- `specs/truth/data/data-model.dbml` -> repayments；kind/settlementId、同旅行兩端、正數、歷史位數、超額及旅行鎖。
- `specs/truth/contracts/groups/settlement.yaml` -> 實付後分幣別結算GET；`specs/truth/contracts/components/schemas/shared.yaml` -> MoneyAmount/ExactAmount/ApiError。
- `truth-delta.md` -> `/api-plan` repayments operation/schema列；`/data-plan` 上述表及生命週期列；`/technical-research` 本檔數值/鎖/遷移列。
- `specs/truth/techstack.md` -> Phase1B精確分攤、寫入一致性與分端BDD；`research.md` -> 決策2–5（有理數、差額、直接/簡化圖與交易）。
- Product landing: `apps/api/src/modules/repayments/index.ts`、`packages/shared/src/` 分帳純函式與共用旅行鎖入口；`apps/api/src/app.ts` -> 路由/依賴接線。

**Boundary**:
- 只實作本Test Scope所需的產品行為及必要讀取依賴；資料/金額不跨幣別，不更改預期值或放寬權威驗證。使用既有型別/fixture；測試新語意已集中Phase3，這裡不補RED/ALIGN/REMOVE。
- DB寫入沿用同旅行owner篩選、旅行→子資源鎖序與版本；失敗不改帳務。完整模型migration只在4A建立，不改已套用的0001/0002；其餘GREEN只修本scope必要模型/演算法，不能以DDL fixture替代產品migration。

**Test Scope**:
- `specs/truth/features/backend/repayments/independent-repayments-and-overpayment-confirmation.feature` 全檔，不以grep挑掉失敗Example。
- Generation: `./scripts/pnpm.sh exec bddgen -c apps/api/playwright.config.ts`；Focused run: `./scripts/pnpm.sh exec playwright test -c apps/api/playwright.config.ts repayments/independent-repayments-and-overpayment-confirmation.feature`。用同範圍的 `--list` 核對本檔全部案例，不更改全域missingSteps或只挑成功Example。
- 後端API project；schema/純函式受影響時同跑focused support與money/splitting-invariants單元測試。

- [X] T229 [BDD-GREEN] 讓 Test Scope 全綠
  - Dependencies: T228；產品落點以上述Product landing為起點，完成Goal；Evidence：記錄整檔命令/案例數/綠燈與受影響focused回歸，寫入 `validation.md`（plan-side新檔）。

- [X] T230 [BDD-REFACTOR] 在綠燈下整理本檔產品模組
  - Dependencies: T229；只整理本檔共用邊界與必要產品重複，保留精確/隔離/不可變契約。重跑本Test Scope；未受影響範圍不擴大重構，不能藉重構放寬測試。

## Phase 4G: ADD Feature File - backend/settlement/settlement-payments-and-adjustments.feature

**Goal**: 實作正數實付結清、精確obligation快照、一實付兩零和調整原子寫入及GET查證；拒絕過期/無效/衝突，無取整策略且超付不產生反向安排。

**Dependencies**: T230；Phase3 gate T218。先完成上一Feature的REFACTOR再開始此GREEN；此處必要唯讀依賴可在該GREEN內完成，禁止以額外mutation或mock取代。

**Shared Must Read**:
- `specs/truth/features/backend/settlement/settlement-payments-and-adjustments.feature` -> Feature全文、全部Rule/Example。
- `specs/truth/features/backend/settlement/dsl.md` -> 此Feature實際使用的Given/When/Then rows。
- `specs/truth/features/backend/dsl.md` -> `owner 的分帳旅行已有下列支出：`、`這次分帳操作被拒絕為 "{錯誤}"`。
- `truth-delta.md` -> `/dsl-refine` ADD `specs/truth/features/backend/settlement/settlement-payments-and-adjustments.feature` 與上述DSL列。
- `plan.md` -> 旅行分帳 API 介面＋旅行分帳持久化介面、Wave1–2。
- `specs/truth/contracts/groups/settlement.yaml` -> 本檔受測operation；`specs/truth/contracts/components/schemas/settlement.yaml` -> SettlementView/PaymentArrangement/SettleArrangementRequest/SettlementRecord；版本/快照/兩調整。
- `specs/truth/data/data-model.dbml` -> trips、expenses/expense_shares、repayments、settlements、settlement_adjustments與旅行鎖。
- `specs/truth/contracts/groups/trips.yaml` -> simplifyDebts PATCH；`specs/truth/contracts/components/schemas/{trips,repayments,shared}.yaml` -> revision、實付與有理數快照。
- `truth-delta.md` -> `/api-plan` settlement operation/schema列；`/data-plan` 上述表及生命週期列；`/technical-research` 本檔數值/鎖/遷移列。
- `specs/truth/techstack.md` -> Phase1B精確分攤、寫入一致性與分端BDD；`research.md` -> 決策2–5（有理數、差額、直接/簡化圖與交易）。
- Product landing: `apps/api/src/modules/settlement/index.ts`、`packages/shared/src/` 分帳純函式與共用旅行鎖入口；`apps/api/src/app.ts` -> 路由/依賴接線。

**Boundary**:
- 只實作本Test Scope所需的產品行為及必要讀取依賴；資料/金額不跨幣別，不更改預期值或放寬權威驗證。使用既有型別/fixture；測試新語意已集中Phase3，這裡不補RED/ALIGN/REMOVE。
- DB寫入沿用同旅行owner篩選、旅行→子資源鎖序與版本；失敗不改帳務。完整模型migration只在4A建立，不改已套用的0001/0002；其餘GREEN只修本scope必要模型/演算法，不能以DDL fixture替代產品migration。

**Test Scope**:
- `specs/truth/features/backend/settlement/settlement-payments-and-adjustments.feature` 全檔，不以grep挑掉失敗Example。
- Generation: `./scripts/pnpm.sh exec bddgen -c apps/api/playwright.config.ts`；Focused run: `./scripts/pnpm.sh exec playwright test -c apps/api/playwright.config.ts settlement/settlement-payments-and-adjustments.feature`。用同範圍的 `--list` 核對本檔全部案例，不更改全域missingSteps或只挑成功Example。
- 後端API project；schema/純函式受影響時同跑focused support與money/splitting-invariants單元測試。

- [X] T231 [BDD-GREEN] 讓 Test Scope 全綠
  - Dependencies: T230；產品落點以上述Product landing為起點，完成Goal；Evidence：記錄整檔命令/案例數/綠燈與受影響focused回歸，寫入 `validation.md`（plan-side新檔）。

- [X] T232 [BDD-REFACTOR] 在綠燈下整理本檔產品模組
  - Dependencies: T231；只整理本檔共用邊界與必要產品重複，保留精確/隔離/不可變契約。重跑本Test Scope；未受影響範圍不擴大重構，不能藉重構放寬測試。

## Phase 4H: ADD Feature File - backend/settlement/balance-after-sequential-settlements.feature

**Goal**: 讓Amy33已結清後Bob34的新revision安排可結清，全員有理數餘額精確0，歷史事實及原100/3不變。

**Dependencies**: T232；Phase3 gate T218。先完成上一Feature的REFACTOR再開始此GREEN；此處必要唯讀依賴可在該GREEN內完成，禁止以額外mutation或mock取代。

**Shared Must Read**:
- `specs/truth/features/backend/settlement/balance-after-sequential-settlements.feature` -> Feature全文、全部Rule/Example。
- `specs/truth/features/backend/settlement/dsl.md` -> 此Feature實際使用的Given/When/Then rows。
- `truth-delta.md` -> `/dsl-refine` ADD `specs/truth/features/backend/settlement/balance-after-sequential-settlements.feature` 與上述DSL列。
- `plan.md` -> 旅行分帳 API 介面＋旅行分帳持久化介面、Wave1–2。
- `specs/truth/contracts/groups/settlement.yaml` -> 本檔受測operation；`specs/truth/contracts/components/schemas/settlement.yaml` -> SettlementView/PaymentArrangement/SettleArrangementRequest/SettlementRecord；版本/快照/兩調整。
- `specs/truth/data/data-model.dbml` -> trips、expenses/expense_shares、repayments、settlements、settlement_adjustments與旅行鎖。
- `specs/truth/contracts/groups/trips.yaml` -> simplifyDebts PATCH；`specs/truth/contracts/components/schemas/{trips,repayments,shared}.yaml` -> revision、實付與有理數快照。
- `truth-delta.md` -> `/api-plan` settlement operation/schema列；`/data-plan` 上述表及生命週期列；`/technical-research` 本檔數值/鎖/遷移列。
- `specs/truth/techstack.md` -> Phase1B精確分攤、寫入一致性與分端BDD；`research.md` -> 決策2–5（有理數、差額、直接/簡化圖與交易）。
- Product landing: `apps/api/src/modules/settlement/index.ts`、`packages/shared/src/` 分帳純函式與共用旅行鎖入口；`apps/api/src/app.ts` -> 路由/依賴接線。

**Boundary**:
- 只實作本Test Scope所需的產品行為及必要讀取依賴；資料/金額不跨幣別，不更改預期值或放寬權威驗證。使用既有型別/fixture；測試新語意已集中Phase3，這裡不補RED/ALIGN/REMOVE。
- DB寫入沿用同旅行owner篩選、旅行→子資源鎖序與版本；失敗不改帳務。完整模型migration只在4A建立，不改已套用的0001/0002；其餘GREEN只修本scope必要模型/演算法，不能以DDL fixture替代產品migration。

**Test Scope**:
- `specs/truth/features/backend/settlement/balance-after-sequential-settlements.feature` 全檔，不以grep挑掉失敗Example。
- Generation: `./scripts/pnpm.sh exec bddgen -c apps/api/playwright.config.ts`；Focused run: `./scripts/pnpm.sh exec playwright test -c apps/api/playwright.config.ts settlement/balance-after-sequential-settlements.feature`。用同範圍的 `--list` 核對本檔全部案例，不更改全域missingSteps或只挑成功Example。
- 後端API project；schema/純函式受影響時同跑focused support與money/splitting-invariants單元測試。

- [X] T233 [BDD-GREEN] 讓 Test Scope 全綠
  - Dependencies: T232；產品落點以上述Product landing為起點，完成Goal；Evidence：記錄整檔命令/案例數/綠燈與受影響focused回歸，寫入 `validation.md`（plan-side新檔）。

- [X] T234 [BDD-REFACTOR] 在綠燈下整理本檔產品模組
  - Dependencies: T233；只整理本檔共用邊界與必要產品重複，保留精確/隔離/不可變契約。重跑本Test Scope；未受影響範圍不擴大重構，不能藉重構放寬測試。

## Phase 4I: ADD Feature File - backend/expenses/shared-expense-corrections-and-recalculation.feature

**Goal**: 修改原支出金額/付款人/集合時完整取代貢獻、刪除移除share；保留實付與停用成員舊引用，並重建最新安排。

**Dependencies**: T234；Phase3 gate T218。先完成上一Feature的REFACTOR再開始此GREEN；此處必要唯讀依賴可在該GREEN內完成，禁止以額外mutation或mock取代。

**Shared Must Read**:
- `specs/truth/features/backend/expenses/shared-expense-corrections-and-recalculation.feature` -> Feature全文、全部Rule/Example。
- `specs/truth/features/backend/expenses/dsl.md` -> 此Feature實際使用的Given/When/Then rows。
- `specs/truth/features/backend/dsl.md` -> `owner 的分帳旅行已有下列支出：`、`owner 的分帳旅行已有下列獨立還款：`。
- `truth-delta.md` -> `/dsl-refine` ADD `specs/truth/features/backend/expenses/shared-expense-corrections-and-recalculation.feature` 與上述DSL列。
- `plan.md` -> 旅行分帳 API 介面＋旅行分帳持久化介面、Wave1–2。
- `specs/truth/contracts/groups/expenses.yaml` -> 本檔受測operation；`specs/truth/contracts/components/schemas/expenses.yaml` -> Expense/ExpenseShare/Create/Update；原始MoneyAmount與ExactAmount、相容欄位。
- `specs/truth/data/data-model.dbml` -> expenses、expense_shares；完整替換、歷史minorUnit與實付/結清不可連帶刪除。
- `specs/truth/contracts/groups/{members,settlement,repayments}.yaml` -> 本檔權威再讀直接使用的members/settlement/repayments GET；`specs/truth/contracts/components/schemas/shared.yaml` -> ExactAmount/MoneyAmount。
- `truth-delta.md` -> `/api-plan` expenses operation/schema列；`/data-plan` 上述表及生命週期列；`/technical-research` 本檔數值/鎖/遷移列。
- `specs/truth/techstack.md` -> Phase1B精確分攤、寫入一致性與分端BDD；`research.md` -> 決策2–5（有理數、差額、直接/簡化圖與交易）。
- Product landing: `apps/api/src/modules/expenses/index.ts`、`packages/shared/src/` 分帳純函式與共用旅行鎖入口；`apps/api/src/app.ts` -> 路由/依賴接線。

**Boundary**:
- 只實作本Test Scope所需的產品行為及必要讀取依賴；資料/金額不跨幣別，不更改預期值或放寬權威驗證。使用既有型別/fixture；測試新語意已集中Phase3，這裡不補RED/ALIGN/REMOVE。
- DB寫入沿用同旅行owner篩選、旅行→子資源鎖序與版本；失敗不改帳務。完整模型migration只在4A建立，不改已套用的0001/0002；其餘GREEN只修本scope必要模型/演算法，不能以DDL fixture替代產品migration。

**Test Scope**:
- `specs/truth/features/backend/expenses/shared-expense-corrections-and-recalculation.feature` 全檔，不以grep挑掉失敗Example。
- Generation: `./scripts/pnpm.sh exec bddgen -c apps/api/playwright.config.ts`；Focused run: `./scripts/pnpm.sh exec playwright test -c apps/api/playwright.config.ts expenses/shared-expense-corrections-and-recalculation.feature`。用同範圍的 `--list` 核對本檔全部案例，不更改全域missingSteps或只挑成功Example。
- 後端API project；schema/純函式受影響時同跑focused support與money/splitting-invariants單元測試。

- [X] T235 [BDD-GREEN] 讓 Test Scope 全綠
  - Dependencies: T234；產品落點以上述Product landing為起點，完成Goal；Evidence：記錄整檔命令/案例數/綠燈與受影響focused回歸，寫入 `validation.md`（plan-side新檔）。

- [X] T236 [BDD-REFACTOR] 在綠燈下整理本檔產品模組
  - Dependencies: T235；只整理本檔共用邊界與必要產品重複，保留精確/隔離/不可變契約。重跑本Test Scope；未受影響範圍不擴大重構，不能藉重構放寬測試。

## Phase 4J: ADD Feature File - backend/expenses/shared-expense-update-validation.feature

**Goal**: 補足PATCH空集合/重複/停用/跨旅行驗證，省略欄位仍保留原值；拒絕時來源與revision完整不變。

**Dependencies**: T236；Phase3 gate T218。先完成上一Feature的REFACTOR再開始此GREEN；此處必要唯讀依賴可在該GREEN內完成，禁止以額外mutation或mock取代。

**Shared Must Read**:
- `specs/truth/features/backend/expenses/shared-expense-update-validation.feature` -> Feature全文、全部Rule/Example。
- `specs/truth/features/backend/expenses/dsl.md` -> 此Feature實際使用的Given/When/Then rows。
- `specs/truth/features/backend/dsl.md` -> `owner 的分帳旅行已有下列支出：`。
- `truth-delta.md` -> `/dsl-refine` ADD `specs/truth/features/backend/expenses/shared-expense-update-validation.feature` 與上述DSL列。
- `plan.md` -> 旅行分帳 API 介面＋旅行分帳持久化介面、Wave1–2。
- `specs/truth/contracts/groups/expenses.yaml` -> 本檔受測operation；`specs/truth/contracts/components/schemas/expenses.yaml` -> Expense/ExpenseShare/Create/Update；原始MoneyAmount與ExactAmount、相容欄位。
- `specs/truth/data/data-model.dbml` -> expenses、expense_shares；完整替換、歷史minorUnit與實付/結清不可連帶刪除。
- `specs/truth/contracts/groups/{members,settlement,repayments}.yaml` -> 本檔權威再讀直接使用的members/settlement/repayments GET；`specs/truth/contracts/components/schemas/shared.yaml` -> ExactAmount/MoneyAmount。
- `truth-delta.md` -> `/api-plan` expenses operation/schema列；`/data-plan` 上述表及生命週期列；`/technical-research` 本檔數值/鎖/遷移列。
- `specs/truth/techstack.md` -> Phase1B精確分攤、寫入一致性與分端BDD；`research.md` -> 決策2–5（有理數、差額、直接/簡化圖與交易）。
- Product landing: `apps/api/src/modules/expenses/index.ts`、`packages/shared/src/` 分帳純函式與共用旅行鎖入口；`apps/api/src/app.ts` -> 路由/依賴接線。

**Boundary**:
- 只實作本Test Scope所需的產品行為及必要讀取依賴；資料/金額不跨幣別，不更改預期值或放寬權威驗證。使用既有型別/fixture；測試新語意已集中Phase3，這裡不補RED/ALIGN/REMOVE。
- DB寫入沿用同旅行owner篩選、旅行→子資源鎖序與版本；失敗不改帳務。完整模型migration只在4A建立，不改已套用的0001/0002；其餘GREEN只修本scope必要模型/演算法，不能以DDL fixture替代產品migration。

**Test Scope**:
- `specs/truth/features/backend/expenses/shared-expense-update-validation.feature` 全檔，不以grep挑掉失敗Example。
- Generation: `./scripts/pnpm.sh exec bddgen -c apps/api/playwright.config.ts`；Focused run: `./scripts/pnpm.sh exec playwright test -c apps/api/playwright.config.ts expenses/shared-expense-update-validation.feature`。用同範圍的 `--list` 核對本檔全部案例，不更改全域missingSteps或只挑成功Example。
- 後端API project；schema/純函式受影響時同跑focused support與money/splitting-invariants單元測試。

- [X] T237 [BDD-GREEN] 讓 Test Scope 全綠
  - Dependencies: T236；產品落點以上述Product landing為起點，完成Goal；Evidence：記錄整檔命令/案例數/綠燈與受影響focused回歸，寫入 `validation.md`（plan-side新檔）。

- [X] T238 [BDD-REFACTOR] 在綠燈下整理本檔產品模組
  - Dependencies: T237；只整理本檔共用邊界與必要產品重複，保留精確/隔離/不可變契約。重跑本Test Scope；未受影響範圍不擴大重構，不能藉重構放寬測試。

## Phase 4K: ADD Feature File - backend/expenses/expense-source-corrections-and-payment-history.feature

**Goal**: 修正/刪除/換幣別保留獨立還款、不可變結清及調整；正確反映減額/刪除後反向餘額且不跨幣別抵扣、不重新套用差額。

**Dependencies**: T238；Phase3 gate T218。先完成上一Feature的REFACTOR再開始此GREEN；此處必要唯讀依賴可在該GREEN內完成，禁止以額外mutation或mock取代。

**Shared Must Read**:
- `specs/truth/features/backend/expenses/expense-source-corrections-and-payment-history.feature` -> Feature全文、全部Rule/Example。
- `specs/truth/features/backend/expenses/dsl.md` -> 此Feature實際使用的Given/When/Then rows。
- `specs/truth/features/backend/dsl.md` -> `owner 的分帳旅行已有下列支出：`、`owner 的分帳旅行已有下列獨立還款：`。
- `truth-delta.md` -> `/dsl-refine` ADD `specs/truth/features/backend/expenses/expense-source-corrections-and-payment-history.feature` 與上述DSL列。
- `plan.md` -> 旅行分帳 API 介面＋旅行分帳持久化介面、Wave1–2。
- `specs/truth/contracts/groups/expenses.yaml` -> 本檔受測operation；`specs/truth/contracts/components/schemas/expenses.yaml` -> Expense/ExpenseShare/Create/Update；原始MoneyAmount與ExactAmount、相容欄位。
- `specs/truth/data/data-model.dbml` -> expenses、expense_shares；完整替換、歷史minorUnit與實付/結清不可連帶刪除。
- `specs/truth/contracts/groups/{members,settlement,repayments}.yaml` -> 本檔權威再讀直接使用的members/settlement/repayments GET；`specs/truth/contracts/components/schemas/shared.yaml` -> ExactAmount/MoneyAmount。
- `truth-delta.md` -> `/api-plan` expenses operation/schema列；`/data-plan` 上述表及生命週期列；`/technical-research` 本檔數值/鎖/遷移列。
- `specs/truth/techstack.md` -> Phase1B精確分攤、寫入一致性與分端BDD；`research.md` -> 決策2–5（有理數、差額、直接/簡化圖與交易）。
- Product landing: `apps/api/src/modules/expenses/index.ts`、`packages/shared/src/` 分帳純函式與共用旅行鎖入口；`apps/api/src/app.ts` -> 路由/依賴接線。

**Boundary**:
- 只實作本Test Scope所需的產品行為及必要讀取依賴；資料/金額不跨幣別，不更改預期值或放寬權威驗證。使用既有型別/fixture；測試新語意已集中Phase3，這裡不補RED/ALIGN/REMOVE。
- DB寫入沿用同旅行owner篩選、旅行→子資源鎖序與版本；失敗不改帳務。完整模型migration只在4A建立，不改已套用的0001/0002；其餘GREEN只修本scope必要模型/演算法，不能以DDL fixture替代產品migration。

**Test Scope**:
- `specs/truth/features/backend/expenses/expense-source-corrections-and-payment-history.feature` 全檔，不以grep挑掉失敗Example。
- Generation: `./scripts/pnpm.sh exec bddgen -c apps/api/playwright.config.ts`；Focused run: `./scripts/pnpm.sh exec playwright test -c apps/api/playwright.config.ts expenses/expense-source-corrections-and-payment-history.feature`。用同範圍的 `--list` 核對本檔全部案例，不更改全域missingSteps或只挑成功Example。
- 後端API project；schema/純函式受影響時同跑focused support與money/splitting-invariants單元測試。

- [X] T239 [BDD-GREEN] 讓 Test Scope 全綠
  - Dependencies: T238；產品落點以上述Product landing為起點，完成Goal；Evidence：記錄整檔命令/案例數/綠燈與受影響focused回歸，寫入 `validation.md`（plan-side新檔）。

- [X] T240 [BDD-REFACTOR] 在綠燈下整理本檔產品模組
  - Dependencies: T239；只整理本檔共用邊界與必要產品重複，保留精確/隔離/不可變契約。重跑本Test Scope；未受影響範圍不擴大重構，不能藉重構放寬測試。

## Phase 4L: ADD Feature File - backend/settlement/payment-history-reconstruction-and-transaction-consistency.feature

**Goal**: 統一旅行列鎖與revision、REPEATABLE READ一致性讀取；實付/調整存在時兩模式同源、同安排競爭只一完整成功、中途故障完全回滾。

**Dependencies**: T240；Phase3 gate T218。先完成上一Feature的REFACTOR再開始此GREEN；此處必要唯讀依賴可在該GREEN內完成，禁止以額外mutation或mock取代。

**Shared Must Read**:
- `specs/truth/features/backend/settlement/payment-history-reconstruction-and-transaction-consistency.feature` -> Feature全文、全部Rule/Example。
- `specs/truth/features/backend/settlement/dsl.md` -> 此Feature實際使用的Given/When/Then rows。
- `specs/truth/features/backend/dsl.md` -> `owner 的分帳旅行已有下列支出：`。
- `truth-delta.md` -> `/dsl-refine` ADD `specs/truth/features/backend/settlement/payment-history-reconstruction-and-transaction-consistency.feature` 與上述DSL列。
- `plan.md` -> 旅行分帳 API 介面＋旅行分帳持久化介面、Wave1–2。
- `specs/truth/contracts/groups/settlement.yaml` -> 本檔受測operation；`specs/truth/contracts/components/schemas/settlement.yaml` -> SettlementView/PaymentArrangement/SettleArrangementRequest/SettlementRecord；版本/快照/兩調整。
- `specs/truth/data/data-model.dbml` -> trips、expenses/expense_shares、repayments、settlements、settlement_adjustments與旅行鎖。
- `specs/truth/contracts/groups/trips.yaml` -> simplifyDebts PATCH；`specs/truth/contracts/components/schemas/{trips,repayments,shared}.yaml` -> revision、實付與有理數快照。
- `truth-delta.md` -> `/api-plan` settlement operation/schema列；`/data-plan` 上述表及生命週期列；`/technical-research` 本檔數值/鎖/遷移列。
- `specs/truth/techstack.md` -> Phase1B精確分攤、寫入一致性與分端BDD；`research.md` -> 決策2–5（有理數、差額、直接/簡化圖與交易）。
- Product landing: `apps/api/src/modules/settlement/index.ts`、`packages/shared/src/` 分帳純函式與共用旅行鎖入口；`apps/api/src/app.ts` -> 路由/依賴接線。

**Boundary**:
- 只實作本Test Scope所需的產品行為及必要讀取依賴；資料/金額不跨幣別，不更改預期值或放寬權威驗證。使用既有型別/fixture；測試新語意已集中Phase3，這裡不補RED/ALIGN/REMOVE。
- DB寫入沿用同旅行owner篩選、旅行→子資源鎖序與版本；失敗不改帳務。完整模型migration只在4A建立，不改已套用的0001/0002；其餘GREEN只修本scope必要模型/演算法，不能以DDL fixture替代產品migration。

**Test Scope**:
- `specs/truth/features/backend/settlement/payment-history-reconstruction-and-transaction-consistency.feature` 全檔，不以grep挑掉失敗Example。
- Generation: `./scripts/pnpm.sh exec bddgen -c apps/api/playwright.config.ts`；Focused run: `./scripts/pnpm.sh exec playwright test -c apps/api/playwright.config.ts settlement/payment-history-reconstruction-and-transaction-consistency.feature`。用同範圍的 `--list` 核對本檔全部案例，不更改全域missingSteps或只挑成功Example。
- 後端API project；schema/純函式受影響時同跑focused support與money/splitting-invariants單元測試。

- [X] T241 [BDD-GREEN] 讓 Test Scope 全綠
  - Dependencies: T240；產品落點以上述Product landing為起點，完成Goal；Evidence：記錄整檔命令/案例數/綠燈與受影響focused回歸，寫入 `validation.md`（plan-side新檔）。

- [X] T242 [BDD-REFACTOR] 在綠燈下整理本檔產品模組
  - Dependencies: T241；只整理本檔共用邊界與必要產品重複，保留精確/隔離/不可變契約。重跑本Test Scope；未受影響範圍不擴大重構，不能藉重構放寬測試。

## Phase 4M: ADD Feature File - backend/account/splitting-data-access-isolation.feature

**Goal**: 逐資源強制owner驗證，同行者不新增帳號權限；非owner讀寫404且來源不變，未登入401不洩漏。

**Dependencies**: T242；Phase3 gate T218。先完成上一Feature的REFACTOR再開始此GREEN；此處必要唯讀依賴可在該GREEN內完成，禁止以額外mutation或mock取代。

**Shared Must Read**:
- `specs/truth/features/backend/account/splitting-data-access-isolation.feature` -> Feature全文、全部Rule/Example。
- `specs/truth/features/backend/account/dsl.md` -> 此Feature實際使用的Given/When/Then rows。
- `specs/truth/features/backend/dsl.md` -> `owner 的分帳旅行已建立成員`。
- `truth-delta.md` -> `/dsl-refine` ADD `specs/truth/features/backend/account/splitting-data-access-isolation.feature` 與上述DSL列。
- `plan.md` -> 旅行分帳 API 介面＋旅行分帳持久化介面、Wave1–2。
- `specs/truth/contracts/groups/{members,expenses,settlement,repayments,trips}.yaml` -> 本檔各受測operation的owner/parent-child隔離與401/404；`specs/truth/contracts/components/schemas/shared.yaml` -> ApiError。
- `specs/truth/data/data-model.dbml` -> 各分帳表owner_id/trip_id複合FK；owner唯一授權邊界。
- `truth-delta.md` -> `/api-plan` 分帳group的授權/驗證列；`/data-plan` 上述表及生命週期列；`/technical-research` 本檔數值/鎖/遷移列。
- `specs/truth/techstack.md` -> Phase1B精確分攤、寫入一致性與分端BDD；`research.md` -> 決策2–5（有理數、差額、直接/簡化圖與交易）。
- Product landing: `apps/api/src/modules/auth/index.ts`；`apps/api/src/app.ts` -> 路由/依賴接線。

**Boundary**:
- 只實作本Test Scope所需的產品行為及必要讀取依賴；資料/金額不跨幣別，不更改預期值或放寬權威驗證。使用既有型別/fixture；測試新語意已集中Phase3，這裡不補RED/ALIGN/REMOVE。
- DB寫入沿用同旅行owner篩選、旅行→子資源鎖序與版本；失敗不改帳務。完整模型migration只在4A建立，不改已套用的0001/0002；其餘GREEN只修本scope必要模型/演算法，不能以DDL fixture替代產品migration。

**Test Scope**:
- `specs/truth/features/backend/account/splitting-data-access-isolation.feature` 全檔，不以grep挑掉失敗Example。
- Generation: `./scripts/pnpm.sh exec bddgen -c apps/api/playwright.config.ts`；Focused run: `./scripts/pnpm.sh exec playwright test -c apps/api/playwright.config.ts account/splitting-data-access-isolation.feature`。用同範圍的 `--list` 核對本檔全部案例，不更改全域missingSteps或只挑成功Example。
- 後端API project；schema/純函式受影響時同跑focused support與money/splitting-invariants單元測試。

- [X] T243 [BDD-GREEN] 讓 Test Scope 全綠
  - Dependencies: T242；產品落點以上述Product landing為起點，完成Goal；Evidence：記錄整檔命令/案例數/綠燈與受影響focused回歸，寫入 `validation.md`（plan-side新檔）。

- [X] T244 [BDD-REFACTOR] 在綠燈下整理本檔產品模組
  - Dependencies: T243；只整理本檔共用邊界與必要產品重複，保留精確/隔離/不可變契約。重跑本Test Scope；未受影響範圍不擴大重構，不能藉重構放寬測試。

## Phase 4N: ADD Feature File - backend/account/same-owner-cross-trip-splitting-isolation.feature

**Goal**: 同owner不同旅行的真實childId不可混用parent路徑；複合owner/trip查核並保留兩旅行來源。

**Dependencies**: T244；Phase3 gate T218。先完成上一Feature的REFACTOR再開始此GREEN；此處必要唯讀依賴可在該GREEN內完成，禁止以額外mutation或mock取代。

**Shared Must Read**:
- `specs/truth/features/backend/account/same-owner-cross-trip-splitting-isolation.feature` -> Feature全文、全部Rule/Example。
- `specs/truth/features/backend/account/dsl.md` -> 此Feature實際使用的Given/When/Then rows。
- `truth-delta.md` -> `/dsl-refine` ADD `specs/truth/features/backend/account/same-owner-cross-trip-splitting-isolation.feature` 與上述DSL列。
- `plan.md` -> 旅行分帳 API 介面＋旅行分帳持久化介面、Wave1–2。
- `specs/truth/contracts/groups/{members,expenses,settlement,repayments,trips}.yaml` -> 本檔各受測operation的owner/parent-child隔離與401/404；`specs/truth/contracts/components/schemas/shared.yaml` -> ApiError。
- `specs/truth/data/data-model.dbml` -> 各分帳表owner_id/trip_id複合FK；owner唯一授權邊界。
- `truth-delta.md` -> `/api-plan` 分帳group的授權/驗證列；`/data-plan` 上述表及生命週期列；`/technical-research` 本檔數值/鎖/遷移列。
- `specs/truth/techstack.md` -> Phase1B精確分攤、寫入一致性與分端BDD；`research.md` -> 決策2–5（有理數、差額、直接/簡化圖與交易）。
- Product landing: `apps/api/src/modules/auth/index.ts`；`apps/api/src/app.ts` -> 路由/依賴接線。

**Boundary**:
- 只實作本Test Scope所需的產品行為及必要讀取依賴；資料/金額不跨幣別，不更改預期值或放寬權威驗證。使用既有型別/fixture；測試新語意已集中Phase3，這裡不補RED/ALIGN/REMOVE。
- DB寫入沿用同旅行owner篩選、旅行→子資源鎖序與版本；失敗不改帳務。完整模型migration只在4A建立，不改已套用的0001/0002；其餘GREEN只修本scope必要模型/演算法，不能以DDL fixture替代產品migration。

**Test Scope**:
- `specs/truth/features/backend/account/same-owner-cross-trip-splitting-isolation.feature` 全檔，不以grep挑掉失敗Example。
- Generation: `./scripts/pnpm.sh exec bddgen -c apps/api/playwright.config.ts`；Focused run: `./scripts/pnpm.sh exec playwright test -c apps/api/playwright.config.ts account/same-owner-cross-trip-splitting-isolation.feature`。用同範圍的 `--list` 核對本檔全部案例，不更改全域missingSteps或只挑成功Example。
- 後端API project；schema/純函式受影響時同跑focused support與money/splitting-invariants單元測試。

- [X] T245 [BDD-GREEN] 讓 Test Scope 全綠
  - Dependencies: T244；產品落點以上述Product landing為起點，完成Goal；Evidence：記錄整檔命令/案例數/綠燈與受影響focused回歸，寫入 `validation.md`（plan-side新檔）。

- [X] T246 [BDD-REFACTOR] 在綠燈下整理本檔產品模組
  - Dependencies: T245；只整理本檔共用邊界與必要產品重複，保留精確/隔離/不可變契約。重跑本Test Scope；未受影響範圍不擴大重構，不能藉重構放寬測試。

## Phase 4O: ADD Feature File - frontend/expenses/shared-expenses-and-share-display.feature

**Goal**: 延伸ExpenseForm為同一套個人/共同支出，加入付款人與平均分攤選項、兩位小數/去尾零預覽與必選驗證；沿用原金額規則與資料顯示。

**Dependencies**: T246；Phase3 gate T218。先完成上一Feature的REFACTOR再開始此GREEN；此處必要唯讀依賴可在該GREEN內完成，禁止以額外mutation或mock取代。

**Shared Must Read**:
- `specs/truth/features/frontend/expenses/shared-expenses-and-share-display.feature` -> Feature全文、全部Rule/Example。
- `specs/truth/features/frontend/expenses/dsl.md` -> 此Feature實際使用的Given/When/Then rows。
- `specs/truth/features/frontend/dsl.md` -> `分帳旅行已有以下支出：`。
- `truth-delta.md` -> `/dsl-refine` ADD `specs/truth/features/frontend/expenses/shared-expenses-and-share-display.feature` 與上述DSL列。
- `plan.md` -> owner 分帳與結算介面、Wave3。
- `ui/ui-plan.md` -> 3. 記錄或編修支出、Prototype review決策與pen交接；`ui/design-review.md` -> 該畫面與狀態索引。
- `ui/split-ledger-005.pen` -> 該畫面桌面/手機frame；`ui/design-previews/03-desktop-expense.png`、`ui/design-previews/09-mobile-expense.png`；`ui/design-previews/13-states.png` -> 本檔相關成功/錯誤/確認狀態。
- `ui/expense.html` -> 僅作流程/資訊結構示意；舊循環小數、術語、原生date與間距不作實作依據；最新spec/UI plan與pen優先。
- `specs/truth/contracts/groups/expenses.yaml`、對應schemas -> 本檔畫面讀寫及錯誤投影；`specs/truth/contracts/components/schemas/shared.yaml` -> ExactAmount/MoneyAmount/ApiError。
- `specs/truth/contracts/groups/{members,settlement}.yaml` -> 選項成員GET與保存後結算GET；`specs/truth/contracts/components/schemas/expenses.yaml` -> PATCH省略欄位保留。
- `specs/truth/techstack.md` -> 前端設計系統與分端BDD；`research.md` -> 決策1/3/5（真實API、顯示與實付分離、版本/查證）。
- Product landing: `apps/web/src/features/expenses/ExpenseForm.tsx`、`apps/web/src/features/trips/TripLedger.tsx`；`apps/web/src/api/index.ts`、`apps/web/src/app/App.tsx`、`apps/web/src/components/AppShell.tsx` -> API型別、導航與owner路由。

**Boundary**:
- 只實作本Test Scope所需的產品行為及必要讀取依賴；資料/金額不跨幣別，不更改預期值或放寬權威驗證。使用既有型別/fixture；測試新語意已集中Phase3，這裡不補RED/ALIGN/REMOVE。
- 畫面對齊本phase列出的UI plan/pen/PNG，最多兩位小數、中性文案與簡化付款命名；原始/實付輸入仍依幣別位數。共用控制元件集中調整，不複製原生date。

**Test Scope**:
- `specs/truth/features/frontend/expenses/shared-expenses-and-share-display.feature` 全檔，不以grep挑掉失敗Example。
- Generation: `./scripts/pnpm.sh exec bddgen -c apps/web/playwright.config.ts`；Focused run: `./scripts/pnpm.sh exec playwright test -c apps/web/playwright.config.ts expenses/shared-expenses-and-share-display.feature`。用同範圍的 `--list` 核對本檔全部案例，不更改全域missingSteps或只挑成功Example。
- Chromium與WebKit；NFR主流程/日期案例依DSL在桌面與375px跑，保存authority/網路與失敗trace證據，不把viewport模擬宣稱為實機。

- [X] T247 [BDD-GREEN] 讓 Test Scope 全綠
  - Dependencies: T246；產品落點以上述Product landing為起點，完成Goal；Evidence：記錄整檔命令/案例數/綠燈與受影響focused回歸，寫入 `validation.md`（plan-side新檔）。

- [X] T248 [BDD-REFACTOR] 在綠燈下整理本檔產品模組
  - Dependencies: T247；只整理本檔共用邊界與必要產品重複，保留精確/隔離/不可變契約。重跑本Test Scope；未受影響範圍不擴大重構，不能藉重構放寬測試。

## Phase 4P: ADD Feature File - frontend/settlement/currency-balances-and-payment-simplification.feature

**Goal**: 呈現分幣別餘額、直接/簡化安排與中性說明，持久化switch、保存失敗回退、包含最新實付的刷新；將帳本結算入口與導航接上。

**Dependencies**: T248；Phase3 gate T218。先完成上一Feature的REFACTOR再開始此GREEN；此處必要唯讀依賴可在該GREEN內完成，禁止以額外mutation或mock取代。

**Shared Must Read**:
- `specs/truth/features/frontend/settlement/currency-balances-and-payment-simplification.feature` -> Feature全文、全部Rule/Example。
- `specs/truth/features/frontend/settlement/dsl.md` -> 此Feature實際使用的Given/When/Then rows。
- `specs/truth/features/frontend/dsl.md` -> `分帳旅行已有以下支出：`、`分帳畫面顯示以下成員淨額：`、`來源支出與先前實付紀錄保持不變`、`分帳旅行已有 Amy 支付 Alice JPY {金額} 的獨立還款`。
- `truth-delta.md` -> `/dsl-refine` ADD `specs/truth/features/frontend/settlement/currency-balances-and-payment-simplification.feature` 與上述DSL列。
- `plan.md` -> owner 分帳與結算介面、Wave3。
- `ui/ui-plan.md` -> 4. 結算／5. 實付後按結清、Prototype review決策與pen交接；`ui/design-review.md` -> 該畫面與狀態索引。
- `ui/split-ledger-005.pen` -> 該畫面桌面/手機frame；`ui/design-previews/04-desktop-settlement.png`、`ui/design-previews/10-mobile-settlement.png`；`ui/design-previews/13-states.png` -> 本檔相關成功/錯誤/確認狀態。
- `ui/settlement.html` -> 僅作流程/資訊結構示意；舊循環小數、術語、原生date與間距不作實作依據；最新spec/UI plan與pen優先。
- `specs/truth/contracts/groups/settlement.yaml`、對應schemas -> 本檔畫面讀寫及錯誤投影；`specs/truth/contracts/components/schemas/shared.yaml` -> ExactAmount/MoneyAmount/ApiError。
- `specs/truth/contracts/groups/trips.yaml` -> simplifyDebts PATCH；`specs/truth/contracts/groups/repayments.yaml` -> 歷史實付GET及結清後事實。
- `specs/truth/techstack.md` -> 前端設計系統與分端BDD；`research.md` -> 決策1/3/5（真實API、顯示與實付分離、版本/查證）。
- Product landing: `apps/web/src/features/settlement/`（新模組）；`apps/web/src/api/index.ts`、`apps/web/src/app/App.tsx`、`apps/web/src/components/AppShell.tsx` -> API型別、導航與owner路由。

**Boundary**:
- 只實作本Test Scope所需的產品行為及必要讀取依賴；資料/金額不跨幣別，不更改預期值或放寬權威驗證。使用既有型別/fixture；測試新語意已集中Phase3，這裡不補RED/ALIGN/REMOVE。
- 畫面對齊本phase列出的UI plan/pen/PNG，最多兩位小數、中性文案與簡化付款命名；原始/實付輸入仍依幣別位數。共用控制元件集中調整，不複製原生date。

**Test Scope**:
- `specs/truth/features/frontend/settlement/currency-balances-and-payment-simplification.feature` 全檔，不以grep挑掉失敗Example。
- Generation: `./scripts/pnpm.sh exec bddgen -c apps/web/playwright.config.ts`；Focused run: `./scripts/pnpm.sh exec playwright test -c apps/web/playwright.config.ts settlement/currency-balances-and-payment-simplification.feature`。用同範圍的 `--list` 核對本檔全部案例，不更改全域missingSteps或只挑成功Example。
- Chromium與WebKit；NFR主流程/日期案例依DSL在桌面與375px跑，保存authority/網路與失敗trace證據，不把viewport模擬宣稱為實機。

- [X] T249 [BDD-GREEN] 讓 Test Scope 全綠
  - Dependencies: T248；產品落點以上述Product landing為起點，完成Goal；Evidence：記錄整檔命令/案例數/綠燈與受影響focused回歸，寫入 `validation.md`（plan-side新檔）。

- [X] T250 [BDD-REFACTOR] 在綠燈下整理本檔產品模組
  - Dependencies: T249；只整理本檔共用邊界與必要產品重複，保留精確/隔離/不可變契約。重跑本Test Scope；未受影響範圍不擴大重構，不能藉重構放寬測試。

## Phase 4Q: ADD Feature File - frontend/repayments/independent-repayments-and-overpayment-confirmation.feature

**Goal**: 完成獨立還款表單、部分/多次、超額警告取消/確認與版本更新、未確認結果查證；ApiError保留confirmation等結構資料，不能丟失token或換新UUID。

**Dependencies**: T250；Phase3 gate T218。先完成上一Feature的REFACTOR再開始此GREEN；此處必要唯讀依賴可在該GREEN內完成，禁止以額外mutation或mock取代。

**Shared Must Read**:
- `specs/truth/features/frontend/repayments/independent-repayments-and-overpayment-confirmation.feature` -> Feature全文、全部Rule/Example。
- `specs/truth/features/frontend/repayments/dsl.md` -> 此Feature實際使用的Given/When/Then rows。
- `specs/truth/features/frontend/dsl.md` -> `分帳旅行已有以下支出：`、`分帳旅行已有 Amy 支付 Alice JPY {金額} 的獨立還款`、`來源支出與先前實付紀錄保持不變`。
- `truth-delta.md` -> `/dsl-refine` ADD `specs/truth/features/frontend/repayments/independent-repayments-and-overpayment-confirmation.feature` 與上述DSL列。
- `plan.md` -> owner 分帳與結算介面、Wave3。
- `ui/ui-plan.md` -> 6. 獨立還款、Prototype review決策與pen交接；`ui/design-review.md` -> 該畫面與狀態索引。
- `ui/split-ledger-005.pen` -> 該畫面桌面/手機frame；`ui/design-previews/06-desktop-repayment.png`、`ui/design-previews/12-mobile-repayment.png`；`ui/design-previews/13-states.png` -> 本檔相關成功/錯誤/確認狀態。
- `ui/repayment.html` -> 僅作流程/資訊結構示意；舊循環小數、術語、原生date與間距不作實作依據；最新spec/UI plan與pen優先。
- `specs/truth/contracts/groups/repayments.yaml`、對應schemas -> 本檔畫面讀寫及錯誤投影；`specs/truth/contracts/components/schemas/shared.yaml` -> ExactAmount/MoneyAmount/ApiError。
- `specs/truth/contracts/groups/{members,settlement}.yaml` -> 付款/收款選項與部分還款後結算GET。
- `specs/truth/techstack.md` -> 前端設計系統與分端BDD；`research.md` -> 決策1/3/5（真實API、顯示與實付分離、版本/查證）。
- Product landing: `apps/web/src/features/repayments/`（新模組）；`apps/web/src/api/index.ts`、`apps/web/src/app/App.tsx`、`apps/web/src/components/AppShell.tsx` -> API型別、導航與owner路由。

**Boundary**:
- 只實作本Test Scope所需的產品行為及必要讀取依賴；資料/金額不跨幣別，不更改預期值或放寬權威驗證。使用既有型別/fixture；測試新語意已集中Phase3，這裡不補RED/ALIGN/REMOVE。
- 畫面對齊本phase列出的UI plan/pen/PNG，最多兩位小數、中性文案與簡化付款命名；原始/實付輸入仍依幣別位數。共用控制元件集中調整，不複製原生date。

**Test Scope**:
- `specs/truth/features/frontend/repayments/independent-repayments-and-overpayment-confirmation.feature` 全檔，不以grep挑掉失敗Example。
- Generation: `./scripts/pnpm.sh exec bddgen -c apps/web/playwright.config.ts`；Focused run: `./scripts/pnpm.sh exec playwright test -c apps/web/playwright.config.ts repayments/independent-repayments-and-overpayment-confirmation.feature`。用同範圍的 `--list` 核對本檔全部案例，不更改全域missingSteps或只挑成功Example。
- Chromium與WebKit；NFR主流程/日期案例依DSL在桌面與375px跑，保存authority/網路與失敗trace證據，不把viewport模擬宣稱為實機。

- [X] T251 [BDD-GREEN] 讓 Test Scope 全綠
  - Dependencies: T250；產品落點以上述Product landing為起點，完成Goal；Evidence：記錄整檔命令/案例數/綠燈與受影響focused回歸，寫入 `validation.md`（plan-side新檔）。

- [X] T252 [BDD-REFACTOR] 在綠燈下整理本檔產品模組
  - Dependencies: T251；只整理本檔共用邊界與必要產品重複，保留精確/隔離/不可變契約。重跑本Test Scope；未受影響範圍不擴大重構，不能藉重構放寬測試。

## Phase 4R: ADD Feature File - frontend/members/member-management-and-historical-identity.feature

**Goal**: 完成同行者新增/改名/停用/啟用/刪除確認、重名與使用中錯誤、owner固定狀態及結果未明；停用者不得加入新支出或新還款。

**Dependencies**: T252；Phase3 gate T218。先完成上一Feature的REFACTOR再開始此GREEN；此處必要唯讀依賴可在該GREEN內完成，禁止以額外mutation或mock取代。

**Shared Must Read**:
- `specs/truth/features/frontend/members/member-management-and-historical-identity.feature` -> Feature全文、全部Rule/Example。
- `specs/truth/features/frontend/members/dsl.md` -> 此Feature實際使用的Given/When/Then rows。
- `truth-delta.md` -> `/dsl-refine` ADD `specs/truth/features/frontend/members/member-management-and-historical-identity.feature` 與上述DSL列。
- `plan.md` -> owner 分帳與結算介面、Wave3。
- `ui/ui-plan.md` -> 2. 同行者、Prototype review決策與pen交接；`ui/design-review.md` -> 該畫面與狀態索引。
- `ui/split-ledger-005.pen` -> 該畫面桌面/手機frame；`ui/design-previews/02-desktop-members.png`、`ui/design-previews/08-mobile-members.png`；`ui/design-previews/13-states.png` -> 本檔相關成功/錯誤/確認狀態。
- `ui/members.html` -> 僅作流程/資訊結構示意；舊循環小數、術語、原生date與間距不作實作依據；最新spec/UI plan與pen優先。
- `specs/truth/contracts/groups/members.yaml`、對應schemas -> 本檔畫面讀寫及錯誤投影；`specs/truth/contracts/components/schemas/shared.yaml` -> ExactAmount/MoneyAmount/ApiError。
- `specs/truth/contracts/groups/{expenses,repayments}.yaml` -> 停用者選取與歷史關聯的相關讀寫欄位。
- `specs/truth/techstack.md` -> 前端設計系統與分端BDD；`research.md` -> 決策1/3/5（真實API、顯示與實付分離、版本/查證）。
- Product landing: `apps/web/src/features/members/`（新模組）；`apps/web/src/api/index.ts`、`apps/web/src/app/App.tsx`、`apps/web/src/components/AppShell.tsx` -> API型別、導航與owner路由。

**Boundary**:
- 只實作本Test Scope所需的產品行為及必要讀取依賴；資料/金額不跨幣別，不更改預期值或放寬權威驗證。使用既有型別/fixture；測試新語意已集中Phase3，這裡不補RED/ALIGN/REMOVE。
- 畫面對齊本phase列出的UI plan/pen/PNG，最多兩位小數、中性文案與簡化付款命名；原始/實付輸入仍依幣別位數。共用控制元件集中調整，不複製原生date。

**Test Scope**:
- `specs/truth/features/frontend/members/member-management-and-historical-identity.feature` 全檔，不以grep挑掉失敗Example。
- Generation: `./scripts/pnpm.sh exec bddgen -c apps/web/playwright.config.ts`；Focused run: `./scripts/pnpm.sh exec playwright test -c apps/web/playwright.config.ts members/member-management-and-historical-identity.feature`。用同範圍的 `--list` 核對本檔全部案例，不更改全域missingSteps或只挑成功Example。
- Chromium與WebKit；NFR主流程/日期案例依DSL在桌面與375px跑，保存authority/網路與失敗trace證據，不把viewport模擬宣稱為實機。

- [X] T253 [BDD-GREEN] 讓 Test Scope 全綠
  - Dependencies: T252；產品落點以上述Product landing為起點，完成Goal；Evidence：記錄整檔命令/案例數/綠燈與受影響focused回歸，寫入 `validation.md`（plan-side新檔）。
  - Test handoff (T218): 同行者新增form須提供data-command-id，綁定實際將提交/查證的pending UUID；T157提交前核對，T189結果未明前後核對，正常成功可開始新draft；不得只加固定測試值。

- [X] T254 [BDD-REFACTOR] 在綠燈下整理本檔產品模組
  - Dependencies: T253；只整理本檔共用邊界與必要產品重複，保留精確/隔離/不可變契約。重跑本Test Scope；未受影響範圍不擴大重構，不能藉重構放寬測試。

## Phase 4S: ADD Feature File - frontend/members/splitting-access-and-cross-device.feature

**Goal**: 同owner跨裝置取得權威成員/支出/分攤；未登入/其他帳號直達路由不提供資料，沿用登入與帳號快取清理。

**Dependencies**: T254；Phase3 gate T218。先完成上一Feature的REFACTOR再開始此GREEN；此處必要唯讀依賴可在該GREEN內完成，禁止以額外mutation或mock取代。

**Shared Must Read**:
- `specs/truth/features/frontend/members/splitting-access-and-cross-device.feature` -> Feature全文、全部Rule/Example。
- `specs/truth/features/frontend/members/dsl.md` -> 此Feature實際使用的Given/When/Then rows。
- `specs/truth/features/frontend/dsl.md` -> `分帳旅行已有以下支出：`。
- `truth-delta.md` -> `/dsl-refine` ADD `specs/truth/features/frontend/members/splitting-access-and-cross-device.feature` 與上述DSL列。
- `plan.md` -> owner 分帳與結算介面、Wave3。
- `ui/ui-plan.md` -> 2. 同行者、Prototype review決策與pen交接；`ui/design-review.md` -> 該畫面與狀態索引。
- `ui/split-ledger-005.pen` -> 該畫面桌面/手機frame；`ui/design-previews/02-desktop-members.png`、`ui/design-previews/08-mobile-members.png`；`ui/design-previews/13-states.png` -> 本檔相關成功/錯誤/確認狀態。
- `ui/members.html` -> 僅作流程/資訊結構示意；舊循環小數、術語、原生date與間距不作實作依據；最新spec/UI plan與pen優先。
- `specs/truth/contracts/groups/members.yaml`、對應schemas -> 本檔畫面讀寫及錯誤投影；`specs/truth/contracts/components/schemas/shared.yaml` -> ExactAmount/MoneyAmount/ApiError。
- `specs/truth/contracts/groups/{expenses,repayments}.yaml` -> 停用者選取與歷史關聯的相關讀寫欄位。
- `specs/truth/techstack.md` -> 前端設計系統與分端BDD；`research.md` -> 決策1/3/5（真實API、顯示與實付分離、版本/查證）。
- Product landing: `apps/web/src/features/members/`（新模組）；`apps/web/src/api/index.ts`、`apps/web/src/app/App.tsx`、`apps/web/src/components/AppShell.tsx` -> API型別、導航與owner路由。

**Boundary**:
- 只實作本Test Scope所需的產品行為及必要讀取依賴；資料/金額不跨幣別，不更改預期值或放寬權威驗證。使用既有型別/fixture；測試新語意已集中Phase3，這裡不補RED/ALIGN/REMOVE。
- 畫面對齊本phase列出的UI plan/pen/PNG，最多兩位小數、中性文案與簡化付款命名；原始/實付輸入仍依幣別位數。共用控制元件集中調整，不複製原生date。

**Test Scope**:
- `specs/truth/features/frontend/members/splitting-access-and-cross-device.feature` 全檔，不以grep挑掉失敗Example。
- Generation: `./scripts/pnpm.sh exec bddgen -c apps/web/playwright.config.ts`；Focused run: `./scripts/pnpm.sh exec playwright test -c apps/web/playwright.config.ts members/splitting-access-and-cross-device.feature`。用同範圍的 `--list` 核對本檔全部案例，不更改全域missingSteps或只挑成功Example。
- Chromium與WebKit；NFR主流程/日期案例依DSL在桌面與375px跑，保存authority/網路與失敗trace證據，不把viewport模擬宣稱為實機。

- [X] T255 [BDD-GREEN] 讓 Test Scope 全綠
  - Dependencies: T254；產品落點以上述Product landing為起點，完成Goal；Evidence：記錄整檔命令/案例數/綠燈與受影響focused回歸，寫入 `validation.md`（plan-side新檔）。

- [X] T256 [BDD-REFACTOR] 在綠燈下整理本檔產品模組
  - Dependencies: T255；只整理本檔共用邊界與必要產品重複，保留精確/隔離/不可變契約。重跑本Test Scope；未受影響範圍不擴大重構，不能藉重構放寬測試。

## Phase 4T: ADD Feature File - frontend/settlement/settlement-payments-and-save-outcomes.feature

**Goal**: 完成應付33.33/實付留空、正數結清、600付700不反向、兩筆順序結清、舊安排刷新與遺失結果查證；expectedAmount保持原ExactAmount。

**Dependencies**: T256；Phase3 gate T218。先完成上一Feature的REFACTOR再開始此GREEN；此處必要唯讀依賴可在該GREEN內完成，禁止以額外mutation或mock取代。

**Shared Must Read**:
- `specs/truth/features/frontend/settlement/settlement-payments-and-save-outcomes.feature` -> Feature全文、全部Rule/Example。
- `specs/truth/features/frontend/settlement/dsl.md` -> 此Feature實際使用的Given/When/Then rows。
- `specs/truth/features/frontend/dsl.md` -> `分帳旅行已有以下支出：`、`Amy 支付 Alice JPY 33 的安排已結清`。
- `truth-delta.md` -> `/dsl-refine` ADD `specs/truth/features/frontend/settlement/settlement-payments-and-save-outcomes.feature` 與上述DSL列。
- `plan.md` -> owner 分帳與結算介面、Wave3。
- `ui/ui-plan.md` -> 5. 實付後按結清、Prototype review決策與pen交接；`ui/design-review.md` -> 該畫面與狀態索引。
- `ui/split-ledger-005.pen` -> 該畫面桌面/手機frame；`ui/design-previews/05-desktop-settle.png`、`ui/design-previews/11-mobile-settle.png`；`ui/design-previews/13-states.png` -> 本檔相關成功/錯誤/確認狀態。
- `ui/settle.html` -> 僅作流程/資訊結構示意；舊循環小數、術語、原生date與間距不作實作依據；最新spec/UI plan與pen優先。
- `specs/truth/contracts/groups/settlement.yaml`、對應schemas -> 本檔畫面讀寫及錯誤投影；`specs/truth/contracts/components/schemas/shared.yaml` -> ExactAmount/MoneyAmount/ApiError。
- `specs/truth/contracts/groups/trips.yaml` -> simplifyDebts PATCH；`specs/truth/contracts/groups/repayments.yaml` -> 歷史實付GET及結清後事實。
- `specs/truth/techstack.md` -> 前端設計系統與分端BDD；`research.md` -> 決策1/3/5（真實API、顯示與實付分離、版本/查證）。
- Product landing: `apps/web/src/features/settlement/`（新模組）；`apps/web/src/api/index.ts`、`apps/web/src/app/App.tsx`、`apps/web/src/components/AppShell.tsx` -> API型別、導航與owner路由。

**Boundary**:
- 只實作本Test Scope所需的產品行為及必要讀取依賴；資料/金額不跨幣別，不更改預期值或放寬權威驗證。使用既有型別/fixture；測試新語意已集中Phase3，這裡不補RED/ALIGN/REMOVE。
- 畫面對齊本phase列出的UI plan/pen/PNG，最多兩位小數、中性文案與簡化付款命名；原始/實付輸入仍依幣別位數。共用控制元件集中調整，不複製原生date。

**Test Scope**:
- `specs/truth/features/frontend/settlement/settlement-payments-and-save-outcomes.feature` 全檔，不以grep挑掉失敗Example。
- Generation: `./scripts/pnpm.sh exec bddgen -c apps/web/playwright.config.ts`；Focused run: `./scripts/pnpm.sh exec playwright test -c apps/web/playwright.config.ts settlement/settlement-payments-and-save-outcomes.feature`。用同範圍的 `--list` 核對本檔全部案例，不更改全域missingSteps或只挑成功Example。
- Chromium與WebKit；NFR主流程/日期案例依DSL在桌面與375px跑，保存authority/網路與失敗trace證據，不把viewport模擬宣稱為實機。

- [X] T257 [BDD-GREEN] 讓 Test Scope 全綠
  - Dependencies: T256；產品落點以上述Product landing為起點，完成Goal；Evidence：記錄整檔命令/案例數/綠燈與受影響focused回歸，寫入 `validation.md`（plan-side新檔）。

- [X] T258 [BDD-REFACTOR] 在綠燈下整理本檔產品模組
  - Dependencies: T257；只整理本檔共用邊界與必要產品重複，保留精確/隔離/不可變契約。重跑本Test Scope；未受影響範圍不擴大重構，不能藉重構放寬測試。

## Phase 4U: ADD Feature File - frontend/expenses/shared-expense-corrections-and-recalculation.feature

**Goal**: 連接共同支出編修/刪除與結算失效刷新，歷史實付/結清快照不可變；未知保存保留草稿及上次已確認狀態。

**Dependencies**: T258；Phase3 gate T218。先完成上一Feature的REFACTOR再開始此GREEN；此處必要唯讀依賴可在該GREEN內完成，禁止以額外mutation或mock取代。

**Shared Must Read**:
- `specs/truth/features/frontend/expenses/shared-expense-corrections-and-recalculation.feature` -> Feature全文、全部Rule/Example。
- `specs/truth/features/frontend/expenses/dsl.md` -> 此Feature實際使用的Given/When/Then rows。
- `specs/truth/features/frontend/dsl.md` -> `分帳旅行已有以下支出：`、`分帳畫面顯示以下成員淨額：`、`分帳旅行已有 Amy 支付 Alice JPY {金額} 的獨立還款`、`Amy 支付 Alice JPY 33 的安排已結清`。
- `truth-delta.md` -> `/dsl-refine` ADD `specs/truth/features/frontend/expenses/shared-expense-corrections-and-recalculation.feature` 與上述DSL列。
- `plan.md` -> owner 分帳與結算介面、Wave3。
- `ui/ui-plan.md` -> 3. 記錄或編修支出、Prototype review決策與pen交接；`ui/design-review.md` -> 該畫面與狀態索引。
- `ui/split-ledger-005.pen` -> 該畫面桌面/手機frame；`ui/design-previews/03-desktop-expense.png`、`ui/design-previews/09-mobile-expense.png`；`ui/design-previews/13-states.png` -> 本檔相關成功/錯誤/確認狀態。
- `ui/expense.html` -> 僅作流程/資訊結構示意；舊循環小數、術語、原生date與間距不作實作依據；最新spec/UI plan與pen優先。
- `specs/truth/contracts/groups/expenses.yaml`、對應schemas -> 本檔畫面讀寫及錯誤投影；`specs/truth/contracts/components/schemas/shared.yaml` -> ExactAmount/MoneyAmount/ApiError。
- `specs/truth/contracts/groups/{members,settlement}.yaml` -> 選項成員GET與保存後結算GET；`specs/truth/contracts/components/schemas/expenses.yaml` -> PATCH省略欄位保留。
- `specs/truth/techstack.md` -> 前端設計系統與分端BDD；`research.md` -> 決策1/3/5（真實API、顯示與實付分離、版本/查證）。
- Product landing: `apps/web/src/features/expenses/ExpenseForm.tsx`、`apps/web/src/features/trips/TripLedger.tsx`；`apps/web/src/api/index.ts`、`apps/web/src/app/App.tsx`、`apps/web/src/components/AppShell.tsx` -> API型別、導航與owner路由。

**Boundary**:
- 只實作本Test Scope所需的產品行為及必要讀取依賴；資料/金額不跨幣別，不更改預期值或放寬權威驗證。使用既有型別/fixture；測試新語意已集中Phase3，這裡不補RED/ALIGN/REMOVE。
- 畫面對齊本phase列出的UI plan/pen/PNG，最多兩位小數、中性文案與簡化付款命名；原始/實付輸入仍依幣別位數。共用控制元件集中調整，不複製原生date。

**Test Scope**:
- `specs/truth/features/frontend/expenses/shared-expense-corrections-and-recalculation.feature` 全檔，不以grep挑掉失敗Example。
- Generation: `./scripts/pnpm.sh exec bddgen -c apps/web/playwright.config.ts`；Focused run: `./scripts/pnpm.sh exec playwright test -c apps/web/playwright.config.ts expenses/shared-expense-corrections-and-recalculation.feature`。用同範圍的 `--list` 核對本檔全部案例，不更改全域missingSteps或只挑成功Example。
- Chromium與WebKit；NFR主流程/日期案例依DSL在桌面與375px跑，保存authority/網路與失敗trace證據，不把viewport模擬宣稱為實機。

- [X] T259 [BDD-GREEN] 讓 Test Scope 全綠
  - Dependencies: T258；產品落點以上述Product landing為起點，完成Goal；Evidence：記錄整檔命令/案例數/綠燈與受影響focused回歸，寫入 `validation.md`（plan-side新檔）。

- [X] T260 [BDD-REFACTOR] 在綠燈下整理本檔產品模組
  - Dependencies: T259；只整理本檔共用邊界與必要產品重複，保留精確/隔離/不可變契約。重跑本Test Scope；未受影響範圍不擴大重構，不能藉重構放寬測試。

## Phase 4V: ADD Feature File - frontend/expenses/date-selection-and-focus.feature

**Goal**: 沿用既有DateField，在此表單完成鍵盤選日、Escape關閉及焦點返回；不以原生日期元件替換。

**Dependencies**: T260；Phase3 gate T218。先完成上一Feature的REFACTOR再開始此GREEN；此處必要唯讀依賴可在該GREEN內完成，禁止以額外mutation或mock取代。

**Shared Must Read**:
- `specs/truth/features/frontend/expenses/date-selection-and-focus.feature` -> Feature全文、全部Rule/Example。
- `specs/truth/features/frontend/expenses/dsl.md` -> 此Feature實際使用的Given/When/Then rows。
- `specs/truth/features/frontend/dsl.md` -> `owner 以鍵盤選擇日期 2027-03-12`、`日期欄顯示 2027-03-12 且日曆關閉並返回日期觸發點`、`owner 按 Escape 關閉日期日曆`、`日期欄仍為 2027-03-11 且焦點返回日期觸發點`。
- `truth-delta.md` -> `/dsl-refine` ADD `specs/truth/features/frontend/expenses/date-selection-and-focus.feature` 與上述DSL列。
- `plan.md` -> owner 分帳與結算介面、Wave3。
- `ui/ui-plan.md` -> 3. 記錄或編修支出、Prototype review決策與pen交接；`ui/design-review.md` -> 該畫面與狀態索引。
- `ui/split-ledger-005.pen` -> 該畫面桌面/手機frame；`ui/design-previews/03-desktop-expense.png`、`ui/design-previews/09-mobile-expense.png`；`ui/design-previews/13-states.png` -> 本檔相關成功/錯誤/確認狀態。
- `ui/design-previews/14-calendar.png` -> 桌面日曆/手機底部面板；`apps/web/src/components/DateField.tsx`、`apps/web/src/components/date-picker.css` -> 既有選型及鍵盤契約。
- `ui/expense.html` -> 僅作流程/資訊結構示意；舊循環小數、術語、原生date與間距不作實作依據；最新spec/UI plan與pen優先。
- `specs/truth/contracts/groups/expenses.yaml`、對應schemas -> 本檔畫面讀寫及錯誤投影；`specs/truth/contracts/components/schemas/shared.yaml` -> ExactAmount/MoneyAmount/ApiError。
- `specs/truth/contracts/groups/{members,settlement}.yaml` -> 選項成員GET與保存後結算GET；`specs/truth/contracts/components/schemas/expenses.yaml` -> PATCH省略欄位保留。
- `specs/truth/techstack.md` -> 前端設計系統與分端BDD；`research.md` -> 決策1/3/5（真實API、顯示與實付分離、版本/查證）。
- Product landing: `apps/web/src/features/expenses/ExpenseForm.tsx`、`apps/web/src/features/trips/TripLedger.tsx`；`apps/web/src/api/index.ts`、`apps/web/src/app/App.tsx`、`apps/web/src/components/AppShell.tsx` -> API型別、導航與owner路由。

**Boundary**:
- 只實作本Test Scope所需的產品行為及必要讀取依賴；資料/金額不跨幣別，不更改預期值或放寬權威驗證。使用既有型別/fixture；測試新語意已集中Phase3，這裡不補RED/ALIGN/REMOVE。
- 畫面對齊本phase列出的UI plan/pen/PNG，最多兩位小數、中性文案與簡化付款命名；原始/實付輸入仍依幣別位數。共用控制元件集中調整，不複製原生date。

**Test Scope**:
- `specs/truth/features/frontend/expenses/date-selection-and-focus.feature` 全檔，不以grep挑掉失敗Example。
- Generation: `./scripts/pnpm.sh exec bddgen -c apps/web/playwright.config.ts`；Focused run: `./scripts/pnpm.sh exec playwright test -c apps/web/playwright.config.ts expenses/date-selection-and-focus.feature`。用同範圍的 `--list` 核對本檔全部案例，不更改全域missingSteps或只挑成功Example。
- Chromium與WebKit；NFR主流程/日期案例依DSL在桌面與375px跑，保存authority/網路與失敗trace證據，不把viewport模擬宣稱為實機。

- [X] T261 [BDD-GREEN] 讓 Test Scope 全綠
  - Dependencies: T260；產品落點以上述Product landing為起點，完成Goal；Evidence：記錄整檔命令/案例數/綠燈與受影響focused回歸，寫入 `validation.md`（plan-side新檔）。

- [X] T262 [BDD-REFACTOR] 在綠燈下整理本檔產品模組
  - Dependencies: T261；只整理本檔共用邊界與必要產品重複，保留精確/隔離/不可變契約。重跑本Test Scope；未受影響範圍不擴大重構，不能藉重構放寬測試。

## Phase 4W: ADD Feature File - frontend/settlement/date-selection-and-focus.feature

**Goal**: 沿用既有DateField，在此表單完成鍵盤選日、Escape關閉及焦點返回；不以原生日期元件替換。

**Dependencies**: T262；Phase3 gate T218。先完成上一Feature的REFACTOR再開始此GREEN；此處必要唯讀依賴可在該GREEN內完成，禁止以額外mutation或mock取代。

**Shared Must Read**:
- `specs/truth/features/frontend/settlement/date-selection-and-focus.feature` -> Feature全文、全部Rule/Example。
- `specs/truth/features/frontend/settlement/dsl.md` -> 此Feature實際使用的Given/When/Then rows。
- `specs/truth/features/frontend/dsl.md` -> `owner 以鍵盤選擇日期 2027-03-12`、`日期欄顯示 2027-03-12 且日曆關閉並返回日期觸發點`、`owner 按 Escape 關閉日期日曆`、`日期欄仍為 2027-03-11 且焦點返回日期觸發點`。
- `truth-delta.md` -> `/dsl-refine` ADD `specs/truth/features/frontend/settlement/date-selection-and-focus.feature` 與上述DSL列。
- `plan.md` -> owner 分帳與結算介面、Wave3。
- `ui/ui-plan.md` -> 5. 實付後按結清、Prototype review決策與pen交接；`ui/design-review.md` -> 該畫面與狀態索引。
- `ui/split-ledger-005.pen` -> 該畫面桌面/手機frame；`ui/design-previews/05-desktop-settle.png`、`ui/design-previews/11-mobile-settle.png`；`ui/design-previews/13-states.png` -> 本檔相關成功/錯誤/確認狀態。
- `ui/design-previews/14-calendar.png` -> 桌面日曆/手機底部面板；`apps/web/src/components/DateField.tsx`、`apps/web/src/components/date-picker.css` -> 既有選型及鍵盤契約。
- `ui/settle.html` -> 僅作流程/資訊結構示意；舊循環小數、術語、原生date與間距不作實作依據；最新spec/UI plan與pen優先。
- `specs/truth/contracts/groups/settlement.yaml`、對應schemas -> 本檔畫面讀寫及錯誤投影；`specs/truth/contracts/components/schemas/shared.yaml` -> ExactAmount/MoneyAmount/ApiError。
- `specs/truth/contracts/groups/trips.yaml` -> simplifyDebts PATCH；`specs/truth/contracts/groups/repayments.yaml` -> 歷史實付GET及結清後事實。
- `specs/truth/techstack.md` -> 前端設計系統與分端BDD；`research.md` -> 決策1/3/5（真實API、顯示與實付分離、版本/查證）。
- Product landing: `apps/web/src/features/settlement/`（新模組）；`apps/web/src/api/index.ts`、`apps/web/src/app/App.tsx`、`apps/web/src/components/AppShell.tsx` -> API型別、導航與owner路由。

**Boundary**:
- 只實作本Test Scope所需的產品行為及必要讀取依賴；資料/金額不跨幣別，不更改預期值或放寬權威驗證。使用既有型別/fixture；測試新語意已集中Phase3，這裡不補RED/ALIGN/REMOVE。
- 畫面對齊本phase列出的UI plan/pen/PNG，最多兩位小數、中性文案與簡化付款命名；原始/實付輸入仍依幣別位數。共用控制元件集中調整，不複製原生date。

**Test Scope**:
- `specs/truth/features/frontend/settlement/date-selection-and-focus.feature` 全檔，不以grep挑掉失敗Example。
- Generation: `./scripts/pnpm.sh exec bddgen -c apps/web/playwright.config.ts`；Focused run: `./scripts/pnpm.sh exec playwright test -c apps/web/playwright.config.ts settlement/date-selection-and-focus.feature`。用同範圍的 `--list` 核對本檔全部案例，不更改全域missingSteps或只挑成功Example。
- Chromium與WebKit；NFR主流程/日期案例依DSL在桌面與375px跑，保存authority/網路與失敗trace證據，不把viewport模擬宣稱為實機。

- [X] T263 [BDD-GREEN] 讓 Test Scope 全綠
  - Dependencies: T262；產品落點以上述Product landing為起點，完成Goal；Evidence：記錄整檔命令/案例數/綠燈與受影響focused回歸，寫入 `validation.md`（plan-side新檔）。

- [X] T264 [BDD-REFACTOR] 在綠燈下整理本檔產品模組
  - Dependencies: T263；只整理本檔共用邊界與必要產品重複，保留精確/隔離/不可變契約。重跑本Test Scope；未受影響範圍不擴大重構，不能藉重構放寬測試。

## Phase 4X: ADD Feature File - frontend/repayments/date-selection-and-focus.feature

**Goal**: 沿用既有DateField，在此表單完成鍵盤選日、Escape關閉及焦點返回；不以原生日期元件替換。

**Dependencies**: T264；Phase3 gate T218。先完成上一Feature的REFACTOR再開始此GREEN；此處必要唯讀依賴可在該GREEN內完成，禁止以額外mutation或mock取代。

**Shared Must Read**:
- `specs/truth/features/frontend/repayments/date-selection-and-focus.feature` -> Feature全文、全部Rule/Example。
- `specs/truth/features/frontend/repayments/dsl.md` -> 此Feature實際使用的Given/When/Then rows。
- `specs/truth/features/frontend/dsl.md` -> `owner 以鍵盤選擇日期 2027-03-12`、`日期欄顯示 2027-03-12 且日曆關閉並返回日期觸發點`、`owner 按 Escape 關閉日期日曆`、`日期欄仍為 2027-03-11 且焦點返回日期觸發點`。
- `truth-delta.md` -> `/dsl-refine` ADD `specs/truth/features/frontend/repayments/date-selection-and-focus.feature` 與上述DSL列。
- `plan.md` -> owner 分帳與結算介面、Wave3。
- `ui/ui-plan.md` -> 6. 獨立還款、Prototype review決策與pen交接；`ui/design-review.md` -> 該畫面與狀態索引。
- `ui/split-ledger-005.pen` -> 該畫面桌面/手機frame；`ui/design-previews/06-desktop-repayment.png`、`ui/design-previews/12-mobile-repayment.png`；`ui/design-previews/13-states.png` -> 本檔相關成功/錯誤/確認狀態。
- `ui/design-previews/14-calendar.png` -> 桌面日曆/手機底部面板；`apps/web/src/components/DateField.tsx`、`apps/web/src/components/date-picker.css` -> 既有選型及鍵盤契約。
- `ui/repayment.html` -> 僅作流程/資訊結構示意；舊循環小數、術語、原生date與間距不作實作依據；最新spec/UI plan與pen優先。
- `specs/truth/contracts/groups/repayments.yaml`、對應schemas -> 本檔畫面讀寫及錯誤投影；`specs/truth/contracts/components/schemas/shared.yaml` -> ExactAmount/MoneyAmount/ApiError。
- `specs/truth/contracts/groups/{members,settlement}.yaml` -> 付款/收款選項與部分還款後結算GET。
- `specs/truth/techstack.md` -> 前端設計系統與分端BDD；`research.md` -> 決策1/3/5（真實API、顯示與實付分離、版本/查證）。
- Product landing: `apps/web/src/features/repayments/`（新模組）；`apps/web/src/api/index.ts`、`apps/web/src/app/App.tsx`、`apps/web/src/components/AppShell.tsx` -> API型別、導航與owner路由。

**Boundary**:
- 只實作本Test Scope所需的產品行為及必要讀取依賴；資料/金額不跨幣別，不更改預期值或放寬權威驗證。使用既有型別/fixture；測試新語意已集中Phase3，這裡不補RED/ALIGN/REMOVE。
- 畫面對齊本phase列出的UI plan/pen/PNG，最多兩位小數、中性文案與簡化付款命名；原始/實付輸入仍依幣別位數。共用控制元件集中調整，不複製原生date。

**Test Scope**:
- `specs/truth/features/frontend/repayments/date-selection-and-focus.feature` 全檔，不以grep挑掉失敗Example。
- Generation: `./scripts/pnpm.sh exec bddgen -c apps/web/playwright.config.ts`；Focused run: `./scripts/pnpm.sh exec playwright test -c apps/web/playwright.config.ts repayments/date-selection-and-focus.feature`。用同範圍的 `--list` 核對本檔全部案例，不更改全域missingSteps或只挑成功Example。
- Chromium與WebKit；NFR主流程/日期案例依DSL在桌面與375px跑，保存authority/網路與失敗trace證據，不把viewport模擬宣稱為實機。

- [X] T265 [BDD-GREEN] 讓 Test Scope 全綠
  - Dependencies: T264；產品落點以上述Product landing為起點，完成Goal；Evidence：記錄整檔命令/案例數/綠燈與受影響focused回歸，寫入 `validation.md`（plan-side新檔）。

- [X] T266 [BDD-REFACTOR] 在綠燈下整理本檔產品模組
  - Dependencies: T265；只整理本檔共用邊界與必要產品重複，保留精確/隔離/不可變契約。重跑本Test Scope；未受影響範圍不擴大重構，不能藉重構放寬測試。

## Phase 4Y: ui quality gate

**Goal**: 正式產品對齊本輪UI planner產物；BDD全綠不能代替視覺/元件/操作檢查。

**Read**:
- `ui/ui-plan.md` -> 六個畫面、狀態/可讀性、review七點與DateField規則；`ui/design-review.md` -> 版面索引。
- `ui/split-ledger-005.pen`（只透過pen工具讀取）、`ui/design-previews/01-desktop-ledger.png` 至 `14-calendar.png` -> 6桌面、6手機及狀態/日曆；`ui/{index,members,expense,settlement,settle,repayment}.html`只作流程示意。
- 正式 `apps/web/src/features/{trips,expenses,members,settlement,repayments}/`、共用元件與樣式。

**Boundary**:
- 本ui家族只此一題；不改truth、不加feature、不以重跑GREEN或改pen稿遷就錯誤產品當通過條件。若有issue修產品後重新review，保留實際證據。

- [X] T267 subagent review (ui quality gate)
  - Dependencies: T266，全部前端GREEN/REFACTOR完成；Evidence寫 `validation.md`，逐畫面桌面1280/手機375檢查、成功/空/載入/失敗/未確認/版本過期/超額確認有清楚動作與可讀狀態。
  - 依UI plan量測共用選單箭頭右縮16px/右側預留至少44px；radio/checkbox不得吃一般input樣式，內距/文字/選項間距至少12px、label點擊區至少44px，手機名稱/狀態不擠壓或橫向溢出。不要建立長期像素快照測試。
  - 確認日期三表單重用DateField、手動輸入/年月/今天/鍵盤/焦點/Escape與手機底部面板；沿用真實日期自測證據，不把HTML原生date當設計。檢查名稱簡化付款、中性文案、兩位小數及accessible label一致。
  - 由subagent對實作與設計逐項比對，issue修正後再review直到無問題；不新增使用者批准關卡。

## Phase 4Z: research quality gate

**Goal**: 確認產品實作符合技術研究家族，而不是只在happy path過測試。

**Read**:
- `research.md` -> 決策1–8與殘餘風險。
- `packages/shared/src/` 分帳模組、API計算/交易/確認與migration、前端顯示/實付快照、測試oracle與barrier/DI證據。

**Boundary**:
- 本research家族只此一題；不改truth、不加feature、不重跑GREEN作為代替review，不把純技術文件缺口寫成新增產品限制。

- [X] T268 subagent review (research quality gate)
  - Dependencies: T266；Read: 上述research決策與實作；Evidence：追查所有金額不經Number/parseFloat/SQL近似除法、有理數零/符號/尺度正規化、確定性圖與筆數回退、差額不重套、交易鎖所有寫入一致且讀同snapshot、確認token綁定/版本重核、預留ID查證。
  - 確認舊migration checksum未改，新migration對既有owner/單人share回填、歷史minorUnit/分類/日期不變；BigInt分母增長、冷/熱結算與資料遷移量測有代表性資料規模及耗時紀錄，不虛構性能SLO。
  - 只提供有證據的符合/缺口；issue需修實作後重新review，不能以新工具或新依賴悄悄改選型。

## Phase 5: 工程交付與既有回歸

**來源**: `spec.md` FR-013–015/FR-039–041、NFR-001–004；`research.md` 決策1/7/8；`plan.md` Wave1–3；`truth-delta.md` 各owner的NOOP與005新增語意。

**Dependencies**: T267、T268。本phase不重新訪談、不部署、不push、不要求額外使用者確認；若出現環境不可用則具體記錄阻塞及受影響證據，不將未測標成完成。

- [X] T269 完成既有個人記帳與005分帳的完整自動回歸
  - Dependencies: T267、T268；Read：原英文truth feature、`packages/shared/tests/money.test.ts`、本輪splitting-invariants、`apps/api/tests/support/{auth,categories,database,expenses,fixtures,trips}.spec.ts`、`apps/web/tests/support/{expense-form,save-outcomes,date-picker,categories,ui-quality}.spec.ts`。
  - 入口：`./scripts/pnpm.sh test:unit`、`./scripts/pnpm.sh test:api`、`./scripts/pnpm.sh test:web`、`./scripts/pnpm.sh test:support`、`./scripts/pnpm.sh test:web-support`、`./scripts/pnpm.sh test:ui-quality`。BDD保留所有舊檔及24份新檔；Web兩個已配置projects都執行，375px場景按DSL/quality gate覆蓋。
  - Evidence：`validation.md` 記錄命令/版本/案例數/耗時/失敗trace與修正。重點驗原始TWD整數輸入與歷史小數保留、不同幣別總額/分頁、日期閏日與320px原日曆回歸、未知結果查證不重送、登入隔離與帳號切換快取。
  - 若原測試依賴fixture資料，修測試基建使其符合合法新schema但不改舊預期；產品regression修產品，發現需求真矛盾回交owner。

- [X] T270 驗證同origin正式產物與新增旅行路由的本地深連結
  - Dependencies: T269；來源：`research.md` 決策1與既有同origin部署、`spec.md` NFR-001/FR-039，沿用004交付環境而不做外部部署。
  - Read: `apps/api/src/app.ts` -> static SPA fallback現只接受舊旅行/支出路徑；`apps/web/src/app/App.tsx` -> 本輪實際新增路由；`tests/deployment/runtime.spec.ts`、`playwright.deployment.config.ts`。
  - 交付：`./scripts/pnpm.sh build` 後以local production Fastify/Vite產物及隔離DB驗證；必要時擴充明確SPA fallback allowlist，僅納入已實作的members/settlement/settle/repayment路徑，不能讓未知 `/api/` 回HTML或開放任意私密資源。沿用/擴充部署支援測試承接此工程整合，不虛構另一套產品DSL。
  - Evidence：`./scripts/pnpm.sh test:deployment`；直接GET/刷新新route應回正確SPA shell（最終資料仍由API授權），未知API/靜態檔保持404、Accept規則與health/readiness不變。記錄本地測試而非聲稱線上已部署。

- [X] T271 完成型別、lint、格式與資料演進驗證紀錄
  - Dependencies: T270；來源：憲法工程品質、research決策7–8；Read: 根package scripts、`apps/api/src/db/migrate.ts`、原migration0001/0002與新005migration。
  - 入口：`./scripts/pnpm.sh typecheck`、`./scripts/pnpm.sh exec tsc -p tsconfig.tests.json`、`./scripts/pnpm.sh lint`、`./scripts/pnpm.sh format:check`，與 `git diff --check`；只在失敗或新修正造成影響時重跑已通過範圍。
  - Evidence：隔離DB空建/有舊資料升級/重啟皆驗證、既有migration hash不變、舊支出/總額/分類/日期前後對照、必要BigInt/遷移量測規模與耗時；不碰真實帳本，不以drop正式DB充作驗證。
  - 交付：`validation.md` 彙整全部綠燈與兩個subagent quality gate，列出實機手機/人工輔助工具尚未執行的範圍、確實阻塞與殘餘風險；本任務沒有額外部署/commit/push。

## 任務與交付對照

| 類別 | 任務 | 通過條件 |
| --- | --- | --- |
| Foundational | T001–T005 | 只做型別/入口/測試骨架，產品與DSL語意未偷做 |
| 全部新增DSL | T006–T217 | 每條唯一權威row一題RED，214條使用句含2條已存在註冊 |
| 測試層gate | T218 | subagent review、兩端bddgen/typecheck、無undefined/ambiguous/基建錯誤 |
| 24份產品feature | T219–T266 | 每檔GREEN→REFACTOR，整檔scope與直接依賴投影成立 |
| UI家族gate | T267 | 正式產品對齊六畫面/狀態/日曆與七點回饋，不能以BDD取代 |
| research家族gate | T268 | 數值/圖/鎖/快照/確認/遷移符合研究決策且有量測 |
| 既有回歸／工程交付 | T269–T271 | 完整回歸、本地正式產物深連結、品質及驗證紀錄 |

| Feature phase | Feature | GREEN → REFACTOR |
| --- | --- | --- |
| 4A | `specs/truth/features/backend/trips/trip-splitting-initial-state.feature` | T219 → T220 |
| 4B | `specs/truth/features/backend/expenses/shared-expenses-and-personal-compatibility.feature` | T221 → T222 |
| 4C | `specs/truth/features/backend/members/trip-member-lifecycle.feature` | T223 → T224 |
| 4D | `specs/truth/features/backend/members/cross-device-member-access.feature` | T225 → T226 |
| 4E | `specs/truth/features/backend/settlement/currency-balances-and-payment-simplification.feature` | T227 → T228 |
| 4F | `specs/truth/features/backend/repayments/independent-repayments-and-overpayment-confirmation.feature` | T229 → T230 |
| 4G | `specs/truth/features/backend/settlement/settlement-payments-and-adjustments.feature` | T231 → T232 |
| 4H | `specs/truth/features/backend/settlement/balance-after-sequential-settlements.feature` | T233 → T234 |
| 4I | `specs/truth/features/backend/expenses/shared-expense-corrections-and-recalculation.feature` | T235 → T236 |
| 4J | `specs/truth/features/backend/expenses/shared-expense-update-validation.feature` | T237 → T238 |
| 4K | `specs/truth/features/backend/expenses/expense-source-corrections-and-payment-history.feature` | T239 → T240 |
| 4L | `specs/truth/features/backend/settlement/payment-history-reconstruction-and-transaction-consistency.feature` | T241 → T242 |
| 4M | `specs/truth/features/backend/account/splitting-data-access-isolation.feature` | T243 → T244 |
| 4N | `specs/truth/features/backend/account/same-owner-cross-trip-splitting-isolation.feature` | T245 → T246 |
| 4O | `specs/truth/features/frontend/expenses/shared-expenses-and-share-display.feature` | T247 → T248 |
| 4P | `specs/truth/features/frontend/settlement/currency-balances-and-payment-simplification.feature` | T249 → T250 |
| 4Q | `specs/truth/features/frontend/repayments/independent-repayments-and-overpayment-confirmation.feature` | T251 → T252 |
| 4R | `specs/truth/features/frontend/members/member-management-and-historical-identity.feature` | T253 → T254 |
| 4S | `specs/truth/features/frontend/members/splitting-access-and-cross-device.feature` | T255 → T256 |
| 4T | `specs/truth/features/frontend/settlement/settlement-payments-and-save-outcomes.feature` | T257 → T258 |
| 4U | `specs/truth/features/frontend/expenses/shared-expense-corrections-and-recalculation.feature` | T259 → T260 |
| 4V | `specs/truth/features/frontend/expenses/date-selection-and-focus.feature` | T261 → T262 |
| 4W | `specs/truth/features/frontend/settlement/date-selection-and-focus.feature` | T263 → T264 |
| 4X | `specs/truth/features/frontend/repayments/date-selection-and-focus.feature` | T265 → T266 |

本 plan 已依 `/implement` 按依賴完成 T001–T271，逐項執行證據見 `validation.md`。本次跨機接手自 T254 續跑，未執行外部部署、push 或 commit。
