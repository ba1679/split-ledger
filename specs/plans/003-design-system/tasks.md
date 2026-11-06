# Tasks: 前端設計系統與樣式遷移

**Plan Package**: `specs/plans/003-design-system`
**Core Inputs**: `spec.md`, `plan.md`, `research.md`, `truth-delta.md`, `features/acceptance/design-system-migration.feature`, `ui/ui-plan.md`, `ui/index.html`, `specs/truth/techstack.md`, `specs/truth/contracts/**`, `specs/truth/data/**`, `specs/truth/features/frontend/**`

## Task Binding Contract

- 產品介面測試對應 truth；純重構、工程交付及人工確認回追 spec、plan 與既有回歸。不得改變帳務、權限或既有操作。
- 第一階段僅遷移旅行清單及新增旅行的必要範圍；T025 獲使用者明確確認前，T026–T030 不得開始。示範可因回饋反覆修正。
- 本計畫沿用既有前後端 E2E；本輪新增介面 DSL 須先在 Phase 3 對齊。BDD 測試可能因既有產品行為已成立而直接通過；不得為製造紅燈破壞產品或基準。
- 驗收分類：畫面、載入、錯誤與鍵盤行為由新增 feature 和既有 feature 承接；行為不變以既有回歸承接；設計值、圖示、文件、移除舊碼和使用者確認由工程交付任務承接。

## Phase 1: Setup

**Goal**: 準備新增技術，不遷移畫面、不改測試語意；避免全域 reset 提前影響未遷移介面。

- [ ] T001 加入 `tailwindcss`、`@tailwindcss/vite`、`lucide-react` 及按需使用 shadcn/ui 所需依賴，固定相容版本與 lockfile。
  - Read: `specs/truth/techstack.md` -> 前端樣式遷移決策；`research.md` -> 決策 1–3。
  - 在現有 pnpm workspace 配置；確認 React 19、Vite 與 TypeScript 相容，記錄版本。shadcn/ui 是本地元件來源，不假設整套元件均為套件。
- [ ] T002 配置 Tailwind Vite 整合及 shadcn/ui 所需 alias、設定與樣式入口。
  - Read: `apps/web/vite.config.ts`、`apps/web/tsconfig.json`、`apps/web/src/main.tsx`、`research.md` -> 決策 1–2。
  - 保持現有 CSS 正常運作，控制 Preflight 與 cascade；不改畫面、元件行為或加入尚未需要的元件。
- [ ] T003 執行新增依賴、設定與建置 smoke-test。
  - Read: `specs/truth/techstack.md` -> 專案與執行環境、前端。
  - 驗證乾淨安裝可解析依賴、`pnpm --filter @split-ledger/web typecheck` 與 `pnpm --filter @split-ledger/web build`；不執行 feature 或變更產品行為。

## Phase 2: Foundational

**Goal**: 建立測試和實作落點；不實現 feature 或提早遷移畫面。

- [ ] T004 準備設計系統與 step definition 落點。
  - Read: `truth-delta.md` -> `/technical-research`、`/dsl-refine`；`apps/web/src/components/`、`apps/web/tests/steps/`。
  - 只做：建立必要的空目錄或最小入口供共用 token、元件與 `design-system` 測試使用；不建立未使用的抽象。
  - 不做：不實作產品樣式、元件或 DSL 斷言。
- [ ] T005 準備視覺回歸 fixture 的落點。
  - Read: `apps/web/tests/support/fixtures.ts`、`apps/web/tests/support/ui-quality.spec.ts`、`specs/truth/features/frontend/design-system/dsl.md`。
  - 只做：預留穩定資料、視窗、字型及基準資產的測試入口；沿用既有登入與隔離資料設施。
  - 不做：不撰寫 DSL 步驟斷言或修改產品行為。

## Phase 2A: 遷移前基準

- [ ] T006 記錄實際現有介面的桌面及手機基準。
  - 來源：`spec.md` -> NFR-001、SC-003；`research.md` -> 決策 4；前置：T003–T005，且必須先於任何畫面遷移。
  - 對旅行清單與新增旅行表單記錄畫面、操作、載入／失敗和焦點；並記錄其餘登入、旅行帳本、支出及分類畫面之桌面／手機基準與狀態。固定瀏覽器、viewport、字型與資料；明確保存位置與取得方式。可參考 `pnpm test:ui-quality` 的截圖，但其輸出位於 `.cache/ui-review/`，須另行保存避免後續覆蓋。
  - 證據：可重現的基準檔及畫面／狀態清單；缺少實機或特定狀態時記錄限制，不以靜態雛形替代現行產品基準。

## Phase 3: Test Alignment & Implementation

**Goal**: 在產品遷移前對齊本輪新增 DSL；測試層不寫產品碼。

**DSL 參照**: 以下每句唯一權威位置是 `specs/truth/features/frontend/design-system/dsl.md` 的對應列，依其 Playwright BDD 實作語意編寫；本 feature 未使用介面根 DSL。`truth-delta.md` -> `/dsl-refine` ADD rows。

**Markers**: `[BDD-RED]` 表示新增句型的測試層實作，允許既有行為已符合而通過；`[BDD-ALIGN]` / `[BDD-REMOVE]` 分別用於本輪修改／刪除的句型，本輪無此類句型。所有 marker 僅改測試層。

**Shared Must Read**: `specs/truth/features/frontend/design-system/interface-regression.feature`、`specs/truth/features/frontend/design-system/dsl.md` 全部句型、`truth-delta.md` -> `/dsl-refine`、`apps/web/tests/support/fixtures.ts`、`apps/web/tests/support/ui-quality.spec.ts`、`apps/web/playwright.config.ts`。本輪新增句型在 `apps/web/tests/steps/` 尚無對應定義。

**Boundary**: 每句一項 task，僅改對應 stepdef／直接依賴 helper，避免重複定義。依 T006 的固定基準，不把 `大致一致` 當未定的自動通過閾值：記錄差異並人工審查；不可無限更新基準來消除差異。完成後確認無 undefined steps；若尚缺基準或有環境失敗，記錄並修復，不得宣稱驗收通過。

**Parallel Hint**: T007–T019 可按檔案隔離後平行；共同 fixture 或設定變動須先協調避免覆寫；T020 等所有步驟完成後由獨立 subagent review。

- [ ] T007 [P] [BDD-RED] `Given: 使用者已登入且有一筆「日本旅行」`
- [ ] T008 [P] [BDD-RED] `Given: 使用者已登入且旅行清單資料尚未返回`
- [ ] T009 [P] [BDD-RED] `Given: 使用者已登入且旅行清單暫時無法讀取`
- [ ] T010 [P] [BDD-RED] `Given: 使用者已登入且旅行清單已載入`
- [ ] T011 [P] [BDD-RED] `When: 使用者在電腦開啟旅行清單`
- [ ] T012 [P] [BDD-RED] `When: 使用者在手機開啟旅行清單`
- [ ] T013 [P] [BDD-RED] `When: 使用者開啟旅行清單`
- [ ] T014 [P] [BDD-RED] `When: 使用者以鍵盤開啟新增旅行表單`
- [ ] T015 [P] [BDD-RED] `Then: 旅行清單的桌面版面與已確認的遷移前基準大致一致`
- [ ] T016 [P] [BDD-RED] `Then: 旅行清單的手機版面與已確認的遷移前基準大致一致`
- [ ] T017 [P] [BDD-RED] `Then: 畫面告知旅行清單正在載入`
- [ ] T018 [P] [BDD-RED] `Then: 畫面說明讀取失敗並提供重新嘗試入口`
- [ ] T019 [P] [BDD-RED] `Then: 焦點進入新增旅行表單，欄位與操作有可理解名稱`
- [ ] T020 subagent review (phase quality gate)
  - 核對唯一綁定、測試語意、固定基準、無 undefined step 與失敗原因；修正 issues 後再審查。前置：T006–T019。

## Phase 4A: ADD Feature File - frontend/design-system/interface-regression.feature

**Goal**: 保留示範介面在桌面／手機的外觀與可觀察互動。

**Shared Must Read**:
- `specs/truth/features/frontend/design-system/interface-regression.feature` -> Feature 全文。
- `specs/truth/features/frontend/design-system/dsl.md` -> 本 feature 全部句型。
- `truth-delta.md` -> `/dsl-refine` 四個 ADD Rule 與 DSL ADD；`/technical-research` 前端三項 ADD。
- `ui/ui-plan.md` -> 視覺方向、旅行清單及新增旅行示範、狀態及互動。
- `ui/index.html` -> 示範雛形；其模擬成功後留在清單不代表正式產品流程，正式行為依既有 truth。

**Boundary**: 僅處理示範介面的共用樣式、圖示及必要元件；維持現有成功導向與對話框行為。使用前確認 T020；不遷移其餘畫面。外觀人工確認不以測試全綠取代。

**Test Scope**: `specs/truth/features/frontend/design-system/interface-regression.feature`；執行入口 `pnpm test:web`，可用 Playwright 篩選 feature，並保留結果。

- [ ] T021 [BDD-GREEN] 讓 Test Scope 全綠，並按 `spec.md` FR-001–FR-002 在示範中實際引入共用設計值、可重用元件及套件圖示；比對 T006 基準。
- [ ] T022 [BDD-REFACTOR] 在綠燈下整理示範範圍元件和樣式，避免重複及改變既有行為；重跑 Test Scope。

## Phase 4B: ui quality gate

**Read**: `ui/ui-plan.md` -> 示範視覺與流程；`ui/index.html`；已實作的旅行清單、新增旅行及 T006 基準。正式互動與資料結果以現有 truth 為準。

- [ ] T023 subagent review (ui quality gate)
  - 獨立對照實作、雛形與既有基準，檢查手機、桌面、焦點、載入／失敗及可辨識的圖示差異；列出差異與修正，不改 truth、不以重跑 GREEN 代替審查。前置：T021–T022。

## Phase 5: 示範交付與使用者確認

- [ ] T024 整理示範與前後對照供使用者審查。
  - 來源：`spec.md` -> FR-001–FR-003、NFR-001–NFR-003、SC-001；`research.md` -> 決策 4。前置：T023。
  - 證據：可操作示範、桌面／手機前後畫面、共用設計值／元件／圖示示例、操作與回歸結果、差異和未驗證限制；檢查尚未遷移區域仍可操作。
- [ ] T025 [USER-CONFIRM] 展示示範並等待使用者確認。
  - 前置：T024；確認對象：使用者；通過條件：使用者明確確認示範方向可用於其餘遷移。受阻任務：T026–T030。
  - 若使用者要求調整，完成修正與必要回歸後重新展示；未明確確認時保持未完成，不能以時間或自動審查代替。

## Phase 6: 其餘介面遷移與工程交付

**來源**: `spec.md` -> FR-004–FR-006、NFR-001–NFR-003、SC-002–SC-004；`plan.md` -> 前端介面；`truth-delta.md` -> 既有旅行行為 NOOP 與技術選型。**Dependencies**: T025，所有本 phase 任務均不得在確認前開始。

- [ ] T026 遷移其餘現有介面與圖示。
  - 範圍：登入、旅行帳本、支出、分類及其尚未遷移的共用元件、日期選擇器、導覽及互動狀態；沿用既有資料與權限契約。按原始盤點逐項記錄完成或經使用者確認的例外。
  - 回歸：`pnpm test:web`、`pnpm test:web-support`、`pnpm test:ui-quality`；檢查既有前端 truth 的登入、旅行、支出及分類。這些測試不保證所有畫面視覺及輔助工具覆蓋，另以 T006 基準逐畫面桌面／手機比對及鍵盤、焦點、錯誤狀態檢查補足。
  - 證據：遷移清單、測試輸出、各畫面對照與人工檢查結果；保留差異與限制。
- [ ] T027 完成設計系統維護文件及共用設計值驗證。
  - 前置：T026；來源：`spec.md` FR-005、SC-004。說明設計值權威位置、命名與修改方式、共用元件與圖示用法；在可回復的驗證中修改一項共用值，證明至少兩處使用位置同步反映，再還原。
  - 證據：文件路徑、修改前後對照及還原結果。
- [ ] T028 移除無用途的舊樣式與自行繪製圖示。
  - 前置：T026；來源：`spec.md` FR-004、FR-006。檢查所有引用及動態使用後移除不再使用的程式與樣式，保留必要的基礎或特殊 CSS；對每個例外記錄原因並取得使用者確認。
  - 證據：引用檢查與差異清單、`pnpm --filter @split-ledger/web build`；不得僅憑檔案大小判定完成。
- [ ] T029 完成全範圍回歸與品質檢查。
  - 前置：T026–T028；執行 `pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm test:web`、`pnpm test:web-support`、`pnpm test:ui-quality`；按既有交付策略在 Chromium、WebKit、手機 viewport 與實際手機檢查主要記帳流程。涉及既有 API 的前端 E2E 保持真實測試資料隔離。
  - 證據：各項結果、基準差異及人工可存取性檢查；無實機或測試環境時明列未完成與限制，不宣稱已通過。
- [ ] T030 交付全站遷移清單與最終檢查結果。
  - 前置：T029；對照 `features/acceptance/design-system-migration.feature`、`spec.md` SC-001–SC-004，列出每一項驗收對應的測試、人工確認或工程證據；揭露尚未解決差異與例外，確認使用者確認紀錄及文件可查閱。
