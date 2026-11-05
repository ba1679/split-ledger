# Tasks: 個人旅行記帳（Phase 1A）

**Plan Package**: `specs/plans/001-personal-travel-expenses`
**Core Inputs**: `spec.md`、`plan.md`、`research.md`、`truth-delta.md`、`specs/truth/techstack.md`、`specs/truth/contracts/**`、`specs/truth/data/**`、`specs/truth/features/backend/**`、`specs/truth/features/frontend/**`、`ui/**`

## Task Binding Contract

- 本輪是新專案；雖然本 plan 的 truth-delta 同時記錄後續 TWD MODIFY，目前沒有既有應用、測試或 step definitions，因此所有待實作句型使用 `[BDD-RED]`。TWD 送入整數、ISO minorUnit=2 與最小單位換算均以最新 truth 為準。
- Truth 參照以 `specs/truth/**` 表示；本 plan 產物使用 plan package 相對路徑。所有開發任務對應 truth-delta 的 ADD / MODIFY。
- Phase 1 限技術環境；Phase 2 限骨架；Phase 3 只做測試層；Feature phases 只做 GREEN 和 REFACTOR。不得用假資料通過真實持久化驗證。
- `.agents/constitution/CONSTITUTION.md` 與 `shared.md` 不存在；不假設憲法內容。

## Phase 1: Setup

**Goal**: 安裝並驗證本輪採用的技術，不實作業務或 DSL。

- [ ] T001 配置 Node.js 24、pnpm workspace、TypeScript strict 與鎖定版本；建立 `apps/web`、`apps/api`、`packages/shared` workspace。
  - Read: `specs/truth/techstack.md` -> 專案與執行環境；`truth-delta.md` -> /technical-research。
- [ ] T002 安裝 React、Vite、React Router、TanStack Query、Fastify、TypeBox、Better Auth、Drizzle ORM、node-postgres 與 Drizzle Kit，配置同 origin 開發代理；驗證套件相容後固定版本。
- [ ] T003 設定 PostgreSQL 18 的 Docker Compose 開發與隔離測試環境，配置正式與測試連線；不寫資料模型或產品規則。
- [ ] T004 安裝 Playwright Test、playwright-bdd、Vitest、ESLint 與 TypeScript 工具，配置 Chromium、WebKit 與前後端獨立測試入口；封存 SIX List One 快照及來源 SHA，保留 TWD ISO 位數 2。
- [ ] T005 執行 Setup smoke-test：重建依賴、連線測試 PostgreSQL、啟動最小 Fastify 與 Vite、執行空白 Playwright/Vitest 測試，確認工具鏈；不執行業務案例。

## Phase 2: Foundational

**Goal**: 建立程式與測試的入口及共用骨架，不提前實作產品行為或 DSL 句型。

- [ ] T006 建立前後端和共用套件的模組落點與入口。
  - Read: `plan.md` -> 專案結構；`truth-delta.md` -> /technical-research。
  - 只做：建立 `apps/api/src`、`apps/web/src`、`packages/shared/src` 的空模組、可組裝入口及測試掛載點。
  - 不做：不實作業務規則、API 行為或 DSL。
- [ ] T007 建立測試資料庫連線、migration 執行入口與案例隔離 fixture 骨架。
  - Read: `specs/truth/data/data-model.dbml` -> auth、trips、categories、expenses、currencies。
  - 只做：隔離 worker 的資料庫連線、清理與 fixture 注入介面。
  - 不做：不建立業務 schema、測試情境資料或 step definitions。
- [ ] T008 建立身份、HTTP 與瀏覽器測試共用 fixture / helper 骨架。
  - Read: `specs/truth/techstack.md` -> 測試隔離及登入測試；`specs/truth/contracts/groups/account.yaml` -> 登入邊界。
  - 只做：預留受控外部身份、真實本地 session、APIRequestContext、瀏覽器和測試上下文介面。
  - 不做：不實作 Google 產品流程、各句測試語意或模擬持久化結果。
- [ ] T009 建立 feature 掛載與逐句 step definition 的檔案落點。
  - Read: `truth-delta.md` -> /dsl-refine 所有列。
  - 只做：設定各介面載入 truth feature、測試檔案目錄及共用 helper 依賴；逐句獨立落點避免平行衝突。
  - 不做：不編寫任何 Given、When、Then 或產品行為。

## Phase 3: Test Alignment & Implementation

**Goal**: 所有本輪 feature 使用的句型先建立可執行的測試層；不寫產品行為。

**DSL 參照**:
- 每個任務直接指向唯一權威 `dsl.md` 的句型；依該列 `後端實作語意` 或 `Playwright BDD 實作語意` 建立 step definition，並依同列的參數、表格及預設值實作。
- 後端 Given / When 準備權威狀態並記錄回應；Then 按 DSL 查證 HTTP、資料庫、再讀與不變條件。前端安排隔離帳號與真實本地 session，按 DSL 檢查畫面和權威狀態。
- `truth-delta.md` 提供 ADD / MODIFY 來源；語意以最新 DSL 為準。TWD 僅輸入整數但存為兩位小數。

**Markers**:
- `[BDD-RED]`：新增或本輪需要但尚無 stepdef 的句；完成後可被執行，不得因 undefined step、測試基建或編譯錯誤失敗；可因尚未實作的產品行為／斷言呈現紅燈。
- `[BDD-ALIGN]` 用於已有舊語意 stepdef 的 MODIFY；`[BDD-REMOVE]` 用於 DELETE。本輪無既有 stepdef，亦無 DELETE，因此均不適用。

**Shared Must Read**:
- `truth-delta.md` -> `/dsl-refine` 的 ADD 與 MODIFY 列。
- 每個 task 指定的 `specs/truth/features/**/dsl.md` -> 該列完整契約。
- `specs/truth/techstack.md` -> 測試與驗證、登入測試與資料隔離。

**Boundary**:
- 一條權威 DSL 句型一個任務；只改該句的 stepdef、assertion 及其直接測試 helper，不寫產品碼。
- 所有 Test Scope 必須無 undefined steps；依賴尚未實作產品的驗證可紅燈，但不得透過假產品邏輯或跳過測試製造通過。
- review 由 subagent 執行；修復所有問題並重新 review 通過後才解鎖 Feature phases。

**Parallel Hint**:
- 各 `[P]` 句型可委派獨立 subagent；每句使用獨立 stepdef 檔、獨立測試資料命名空間。共用 helper 或設定由單一負責者序列整合，避免同檔衝突；review 等所有句型完成後執行。

- [ ] T010 [P] [BDD-RED] `使用者"乙"將"日本旅行"開始日改為"2027-03-11"`
  - Read: `specs/truth/features/backend/account/dsl.md` -> `使用者"乙"將"日本旅行"開始日改為"2027-03-11"`。
- [ ] T011 [P] [BDD-RED] `使用者"乙"查詢"日本旅行"`
  - Read: `specs/truth/features/backend/account/dsl.md` -> `使用者"乙"查詢"日本旅行"`。
- [ ] T012 [P] [BDD-RED] `使用者"乙"查詢"餐飲"分類`
  - Read: `specs/truth/features/backend/account/dsl.md` -> `使用者"乙"查詢"餐飲"分類`。
- [ ] T013 [P] [BDD-RED] `使用者"甲"在手機工作階段擁有"日本旅行"`
  - Read: `specs/truth/features/backend/account/dsl.md` -> `使用者"甲"在手機工作階段擁有"日本旅行"`。
- [ ] T014 [P] [BDD-RED] `使用者"甲"在電腦工作階段查詢旅行清單`
  - Read: `specs/truth/features/backend/account/dsl.md` -> `使用者"甲"在電腦工作階段查詢旅行清單`。
- [ ] T015 [P] [BDD-RED] `使用者"甲"已有有效登入工作階段`
  - Read: `specs/truth/features/backend/account/dsl.md` -> `使用者"甲"已有有效登入工作階段`。
- [ ] T016 [P] [BDD-RED] `使用者"甲"擁有"日本旅行"且使用者"乙"已登入`
  - Read: `specs/truth/features/backend/account/dsl.md` -> `使用者"甲"擁有"日本旅行"且使用者"乙"已登入`。
- [ ] T017 [P] [BDD-RED] `使用者"甲"擁有"餐飲"分類且使用者"乙"已登入`
  - Read: `specs/truth/features/backend/account/dsl.md` -> `使用者"甲"擁有"餐飲"分類且使用者"乙"已登入`。
- [ ] T018 [P] [BDD-RED] `使用者"甲"查詢目前帳號`
  - Read: `specs/truth/features/backend/account/dsl.md` -> `使用者"甲"查詢目前帳號`。
- [ ] T019 [P] [BDD-RED] `使用者"甲"的"日本旅行"開始日為"2027-03-10"且使用者"乙"已登入`
  - Read: `specs/truth/features/backend/account/dsl.md` -> `使用者"甲"的"日本旅行"開始日為"2027-03-10"且使用者"乙"已登入`。
- [ ] T020 [P] [BDD-RED] `使用者尚未完成登入`
  - Read: `specs/truth/features/backend/account/dsl.md` -> `使用者尚未完成登入`。
- [ ] T021 [P] [BDD-RED] `使用者查詢目前帳號`
  - Read: `specs/truth/features/backend/account/dsl.md` -> `使用者查詢目前帳號`。
- [ ] T022 [P] [BDD-RED] `分類查詢回覆找不到且不揭露甲的資料`
  - Read: `specs/truth/features/backend/account/dsl.md` -> `分類查詢回覆找不到且不揭露甲的資料`。
- [ ] T023 [P] [BDD-RED] `回傳使用者"甲"的帳號身分`
  - Read: `specs/truth/features/backend/account/dsl.md` -> `回傳使用者"甲"的帳號身分`。
- [ ] T024 [P] [BDD-RED] `帳號查詢回覆未登入`
  - Read: `specs/truth/features/backend/account/dsl.md` -> `帳號查詢回覆未登入`。
- [ ] T025 [P] [BDD-RED] `旅行修改回覆找不到且原日期維持不變`
  - Read: `specs/truth/features/backend/account/dsl.md` -> `旅行修改回覆找不到且原日期維持不變`。
- [ ] T026 [P] [BDD-RED] `旅行查詢回覆找不到且不揭露甲的資料`
  - Read: `specs/truth/features/backend/account/dsl.md` -> `旅行查詢回覆找不到且不揭露甲的資料`。
- [ ] T027 [P] [BDD-RED] `旅行清單包含"日本旅行"`
  - Read: `specs/truth/features/backend/account/dsl.md` -> `旅行清單包含"日本旅行"`。
- [ ] T028 [P] [BDD-RED] `"交通"分類屬於使用者"甲"`
  - Read: `specs/truth/features/backend/categories/dsl.md` -> `"交通"分類屬於使用者"甲"`。
- [ ] T029 [P] [BDD-RED] `"吃喝"不再可選且既有支出仍存在`
  - Read: `specs/truth/features/backend/categories/dsl.md` -> `"吃喝"不再可選且既有支出仍存在`。
- [ ] T030 [P] [BDD-RED] `30 字分類已保存`
  - Read: `specs/truth/features/backend/categories/dsl.md` -> `30 字分類已保存`。
- [ ] T031 [P] [BDD-RED] `使用者"乙"已有"交通"分類且使用者"甲"已登入`
  - Read: `specs/truth/features/backend/categories/dsl.md` -> `使用者"乙"已有"交通"分類且使用者"甲"已登入`。
- [ ] T032 [P] [BDD-RED] `使用者"甲"刪除"吃喝"分類`
  - Read: `specs/truth/features/backend/categories/dsl.md` -> `使用者"甲"刪除"吃喝"分類`。
- [ ] T033 [P] [BDD-RED] `使用者"甲"將"餐飲"分類改名為"吃喝"`
  - Read: `specs/truth/features/backend/categories/dsl.md` -> `使用者"甲"將"餐飲"分類改名為"吃喝"`。
- [ ] T034 [P] [BDD-RED] `使用者"甲"將"餐飲"改名為 31 個餐字`
  - Read: `specs/truth/features/backend/categories/dsl.md` -> `使用者"甲"將"餐飲"改名為 31 個餐字`。
- [ ] T035 [P] [BDD-RED] `使用者"甲"將"餐飲"改名為"food"`
  - Read: `specs/truth/features/backend/categories/dsl.md` -> `使用者"甲"將"餐飲"改名為"food"`。
- [ ] T036 [P] [BDD-RED] `使用者"甲"將"餐飲"改名為"餐飲"`
  - Read: `specs/truth/features/backend/categories/dsl.md` -> `使用者"甲"將"餐飲"改名為"餐飲"`。
- [ ] T037 [P] [BDD-RED] `使用者"甲"將"餐飲"改名為只有空白`
  - Read: `specs/truth/features/backend/categories/dsl.md` -> `使用者"甲"將"餐飲"改名為只有空白`。
- [ ] T038 [P] [BDD-RED] `使用者"甲"已有"餐飲"分類`
  - Read: `specs/truth/features/backend/categories/dsl.md` -> `使用者"甲"已有"餐飲"分類`。
- [ ] T039 [P] [BDD-RED] `使用者"甲"已有"餐飲"及"Food"分類`
  - Read: `specs/truth/features/backend/categories/dsl.md` -> `使用者"甲"已有"餐飲"及"Food"分類`。
- [ ] T040 [P] [BDD-RED] `使用者"甲"建立 30 個餐字的分類`
  - Read: `specs/truth/features/backend/categories/dsl.md` -> `使用者"甲"建立 30 個餐字的分類`。
- [ ] T041 [P] [BDD-RED] `使用者"甲"建立 31 個餐字的分類`
  - Read: `specs/truth/features/backend/categories/dsl.md` -> `使用者"甲"建立 31 個餐字的分類`。
- [ ] T042 [P] [BDD-RED] `使用者"甲"建立"交通"分類`
  - Read: `specs/truth/features/backend/categories/dsl.md` -> `使用者"甲"建立"交通"分類`。
- [ ] T043 [P] [BDD-RED] `使用者"甲"建立只有空白的分類`
  - Read: `specs/truth/features/backend/categories/dsl.md` -> `使用者"甲"建立只有空白的分類`。
- [ ] T044 [P] [BDD-RED] `使用者"甲"建立名稱為" 餐飲 "的分類`
  - Read: `specs/truth/features/backend/categories/dsl.md` -> `使用者"甲"建立名稱為" 餐飲 "的分類`。
- [ ] T045 [P] [BDD-RED] `使用者"甲"有"日本旅行"及"台南旅行"且擁有"餐飲"分類`
  - Read: `specs/truth/features/backend/categories/dsl.md` -> `使用者"甲"有"日本旅行"及"台南旅行"且擁有"餐飲"分類`。
- [ ] T046 [P] [BDD-RED] `使用者"甲"查詢分類"餐飲"`
  - Read: `specs/truth/features/backend/categories/dsl.md` -> `使用者"甲"查詢分類"餐飲"`。
- [ ] T047 [P] [BDD-RED] `使用者"甲"清除午餐的分類`
  - Read: `specs/truth/features/backend/categories/dsl.md` -> `使用者"甲"清除午餐的分類`。
- [ ] T048 [P] [BDD-RED] `使用者"甲"的"吃喝"分類仍被兩筆支出使用`
  - Read: `specs/truth/features/backend/categories/dsl.md` -> `使用者"甲"的"吃喝"分類仍被兩筆支出使用`。
- [ ] T049 [P] [BDD-RED] `使用者"甲"的"吃喝"分類沒有支出引用`
  - Read: `specs/truth/features/backend/categories/dsl.md` -> `使用者"甲"的"吃喝"分類沒有支出引用`。
- [ ] T050 [P] [BDD-RED] `使用者"甲"的"日本旅行"有歸入"吃喝"的午餐`
  - Read: `specs/truth/features/backend/categories/dsl.md` -> `使用者"甲"的"日本旅行"有歸入"吃喝"的午餐`。
- [ ] T051 [P] [BDD-RED] `使用者"甲"的"餐飲"分類已有兩筆跨旅行支出`
  - Read: `specs/truth/features/backend/categories/dsl.md` -> `使用者"甲"的"餐飲"分類已有兩筆跨旅行支出`。
- [ ] T052 [P] [BDD-RED] `兩筆支出顯示"吃喝"且仍關聯原分類`
  - Read: `specs/truth/features/backend/categories/dsl.md` -> `兩筆支出顯示"吃喝"且仍關聯原分類`。
- [ ] T053 [P] [BDD-RED] `分類"餐飲"的使用筆數為 2 且兩筆支出屬於不同旅行`
  - Read: `specs/truth/features/backend/categories/dsl.md` -> `分類"餐飲"的使用筆數為 2 且兩筆支出屬於不同旅行`。
- [ ] T054 [P] [BDD-RED] `分類保存成功且識別不變`
  - Read: `specs/truth/features/backend/categories/dsl.md` -> `分類保存成功且識別不變`。
- [ ] T055 [P] [BDD-RED] `分類保存被拒絕且沒有新增分類`
  - Read: `specs/truth/features/backend/categories/dsl.md` -> `分類保存被拒絕且沒有新增分類`。
- [ ] T056 [P] [BDD-RED] `分類刪除被拒絕且分類與兩筆支出維持不變`
  - Read: `specs/truth/features/backend/categories/dsl.md` -> `分類刪除被拒絕且分類與兩筆支出維持不變`。
- [ ] T057 [P] [BDD-RED] `分類建立因重名被拒絕且原分類不變`
  - Read: `specs/truth/features/backend/categories/dsl.md` -> `分類建立因重名被拒絕且原分類不變`。
- [ ] T058 [P] [BDD-RED] `分類改名因重名被拒絕且原分類與關聯不變`
  - Read: `specs/truth/features/backend/categories/dsl.md` -> `分類改名因重名被拒絕且原分類與關聯不變`。
- [ ] T059 [P] [BDD-RED] `分類改名被拒絕且原分類不變`
  - Read: `specs/truth/features/backend/categories/dsl.md` -> `分類改名被拒絕且原分類不變`。
- [ ] T060 [P] [BDD-RED] `午餐仍在"日本旅行"且沒有分類`
  - Read: `specs/truth/features/backend/categories/dsl.md` -> `午餐仍在"日本旅行"且沒有分類`。
- [ ] T061 [P] [BDD-RED] `使用者查詢可用幣別`
  - Read: `specs/truth/features/backend/currencies/dsl.md` -> `使用者查詢可用幣別`。
- [ ] T062 [P] [BDD-RED] `日幣為零位小數且美元為兩位小數`
  - Read: `specs/truth/features/backend/currencies/dsl.md` -> `日幣為零位小數且美元為兩位小數`。
- [ ] T063 [P] [BDD-RED] `系統使用已封存的可用幣別目錄`
  - Read: `specs/truth/features/backend/currencies/dsl.md` -> `系統使用已封存的可用幣別目錄`。
- [ ] T064 [P] [BDD-RED] `使用者"甲"已登入`
  - Read: `specs/truth/features/backend/dsl.md` -> `使用者"甲"已登入`。
- [ ] T065 [P] [BDD-RED] `"午餐"已保存且沒有分類`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `"午餐"已保存且沒有分類`。
- [ ] T066 [P] [BDD-RED] `"日本旅行"不再含"住宿"支出`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `"日本旅行"不再含"住宿"支出`。
- [ ] T067 [P] [BDD-RED] `"日本旅行"日幣總額為 10500`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `"日本旅行"日幣總額為 10500`。
- [ ] T068 [P] [BDD-RED] `"日本旅行"日幣總額為 17500`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `"日本旅行"日幣總額為 17500`。
- [ ] T069 [P] [BDD-RED] `"日本旅行"總額只有 JPY 25500`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `"日本旅行"總額只有 JPY 25500`。
- [ ] T070 [P] [BDD-RED] `"日本旅行"總額為 TWD 8000 與 JPY 17000`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `"日本旅行"總額為 TWD 8000 與 JPY 17000`。
- [ ] T071 [P] [BDD-RED] `"機票"以 TWD 8000 及"2027-01-15"保存`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `"機票"以 TWD 8000 及"2027-01-15"保存`。
- [ ] T072 [P] [BDD-RED] `"飲料"以 USD 12.50 保存`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `"飲料"以 USD 12.50 保存`。
- [ ] T073 [P] [BDD-RED] `使用者"甲"刪除"住宿"支出`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `使用者"甲"刪除"住宿"支出`。
- [ ] T074 [P] [BDD-RED] `使用者"甲"在"日本旅行"記錄"機票"為 TWD 8000，日期"2027-01-15"`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `使用者"甲"在"日本旅行"記錄"機票"為 TWD 8000，日期"2027-01-15"`。
- [ ] T075 [P] [BDD-RED] `使用者"甲"在手機工作階段已保存"日本旅行"的 JPY 1200 午餐`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `使用者"甲"在手機工作階段已保存"日本旅行"的 JPY 1200 午餐`。
- [ ] T076 [P] [BDD-RED] `使用者"甲"在電腦工作階段查詢"日本旅行"支出`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `使用者"甲"在電腦工作階段查詢"日本旅行"支出`。
- [ ] T077 [P] [BDD-RED] `使用者"甲"將機票改為 JPY 8000`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `使用者"甲"將機票改為 JPY 8000`。
- [ ] T078 [P] [BDD-RED] `使用者"甲"將餐費改為 JPY 2500`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `使用者"甲"將餐費改為 JPY 2500`。
- [ ] T079 [P] [BDD-RED] `使用者"甲"擁有"日本旅行"`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `使用者"甲"擁有"日本旅行"`。
- [ ] T080 [P] [BDD-RED] `使用者"甲"查詢"日本旅行"總額`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `使用者"甲"查詢"日本旅行"總額`。
- [ ] T081 [P] [BDD-RED] `使用者"甲"的"日本旅行"有 JPY 15000 的住宿與 JPY 10500 的其他支出`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `使用者"甲"的"日本旅行"有 JPY 15000 的住宿與 JPY 10500 的其他支出`。
- [ ] T082 [P] [BDD-RED] `使用者"甲"的"日本旅行"有 JPY 15000 的住宿與 JPY 2000 的餐費`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `使用者"甲"的"日本旅行"有 JPY 15000 的住宿與 JPY 2000 的餐費`。
- [ ] T083 [P] [BDD-RED] `使用者"甲"的"日本旅行"有 TWD 8000 的機票與 JPY 17500 的其他支出`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `使用者"甲"的"日本旅行"有 TWD 8000 的機票與 JPY 17500 的其他支出`。
- [ ] T084 [P] [BDD-RED] `使用者"甲"的"日本旅行"有 TWD 8000、JPY 15000 與 JPY 2000 的已保存支出`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `使用者"甲"的"日本旅行"有 TWD 8000、JPY 15000 與 JPY 2000 的已保存支出`。
- [ ] T085 [P] [BDD-RED] `使用者"甲"的"日本旅行"有"住宿"支出`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `使用者"甲"的"日本旅行"有"住宿"支出`。
- [ ] T086 [P] [BDD-RED] `使用者"甲"的"日本旅行"期間為"2027-03-10"至"2027-03-15"`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `使用者"甲"的"日本旅行"期間為"2027-03-10"至"2027-03-15"`。
- [ ] T087 [P] [BDD-RED] `使用者"甲"記錄"午餐"為 JPY -100，日期"2027-03-11"`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `使用者"甲"記錄"午餐"為 JPY -100，日期"2027-03-11"`。
- [ ] T088 [P] [BDD-RED] `使用者"甲"記錄"午餐"為 JPY 0，日期"2027-03-11"`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `使用者"甲"記錄"午餐"為 JPY 0，日期"2027-03-11"`。
- [ ] T089 [P] [BDD-RED] `使用者"甲"記錄"午餐"為 JPY 100.5，日期"2027-03-11"`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `使用者"甲"記錄"午餐"為 JPY 100.5，日期"2027-03-11"`。
- [ ] T090 [P] [BDD-RED] `使用者"甲"記錄"午餐"為 TWD 100.50，日期"2027-03-11"`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `使用者"甲"記錄"午餐"為 TWD 100.50，日期"2027-03-11"`。
- [ ] T091 [P] [BDD-RED] `使用者"甲"記錄"飲料"為 USD 12.50，日期"2027-03-11"`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `使用者"甲"記錄"飲料"為 USD 12.50，日期"2027-03-11"`。
- [ ] T092 [P] [BDD-RED] `使用者"甲"記錄未分類的"午餐"支出`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `使用者"甲"記錄未分類的"午餐"支出`。
- [ ] T093 [P] [BDD-RED] `使用者"甲"記錄項目空白的 JPY 100 支出`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `使用者"甲"記錄項目空白的 JPY 100 支出`。
- [ ] T094 [P] [BDD-RED] `支出保存被拒絕且帳本沒有"午餐"`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `支出保存被拒絕且帳本沒有"午餐"`。
- [ ] T095 [P] [BDD-RED] `支出保存被拒絕且帳本沒有新增支出`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `支出保存被拒絕且帳本沒有新增支出`。
- [ ] T096 [P] [BDD-RED] `支出清單包含 JPY 1200 的"午餐"`
  - Read: `specs/truth/features/backend/expenses/dsl.md` -> `支出清單包含 JPY 1200 的"午餐"`。
- [ ] T097 [P] [BDD-RED] `"台南旅行"已保存且開始日未填`
  - Read: `specs/truth/features/backend/trips/dsl.md` -> `"台南旅行"已保存且開始日未填`。
- [ ] T098 [P] [BDD-RED] `"日本旅行"已保存且兩端日期皆未填`
  - Read: `specs/truth/features/backend/trips/dsl.md` -> `"日本旅行"已保存且兩端日期皆未填`。
- [ ] T099 [P] [BDD-RED] `"日本旅行"已保存且結束日未填`
  - Read: `specs/truth/features/backend/trips/dsl.md` -> `"日本旅行"已保存且結束日未填`。
- [ ] T100 [P] [BDD-RED] `"日本旅行"期間為"2027-03-10"至"2027-03-15"`
  - Read: `specs/truth/features/backend/trips/dsl.md` -> `"日本旅行"期間為"2027-03-10"至"2027-03-15"`。
- [ ] T101 [P] [BDD-RED] `使用者"甲"將"日本旅行"結束日改為"2027-03-09"`
  - Read: `specs/truth/features/backend/trips/dsl.md` -> `使用者"甲"將"日本旅行"結束日改為"2027-03-09"`。
- [ ] T102 [P] [BDD-RED] `使用者"甲"將"日本旅行"結束日改為"2027-03-15"`
  - Read: `specs/truth/features/backend/trips/dsl.md` -> `使用者"甲"將"日本旅行"結束日改為"2027-03-15"`。
- [ ] T103 [P] [BDD-RED] `使用者"甲"建立未填日期的"日本旅行"`
  - Read: `specs/truth/features/backend/trips/dsl.md` -> `使用者"甲"建立未填日期的"日本旅行"`。
- [ ] T104 [P] [BDD-RED] `使用者"甲"建立結束日為"2027-04-05"的"台南旅行"`
  - Read: `specs/truth/features/backend/trips/dsl.md` -> `使用者"甲"建立結束日為"2027-04-05"的"台南旅行"`。
- [ ] T105 [P] [BDD-RED] `使用者"甲"建立開始日為"2027-03-10"的"日本旅行"`
  - Read: `specs/truth/features/backend/trips/dsl.md` -> `使用者"甲"建立開始日為"2027-03-10"的"日本旅行"`。
- [ ] T106 [P] [BDD-RED] `使用者"甲"的"日本旅行"開始日為"2027-03-10"且結束日未填`
  - Read: `specs/truth/features/backend/trips/dsl.md` -> `使用者"甲"的"日本旅行"開始日為"2027-03-10"且結束日未填`。
- [ ] T107 [P] [BDD-RED] `日期更新被拒絕且"日本旅行"日期維持不變`
  - Read: `specs/truth/features/backend/trips/dsl.md` -> `日期更新被拒絕且"日本旅行"日期維持不變`。
- [ ] T108 [P] [BDD-RED] `使用者仍停留在登入入口且看不到帳本資料`
  - Read: `specs/truth/features/frontend/auth/dsl.md` -> `使用者仍停留在登入入口且看不到帳本資料`。
- [ ] T109 [P] [BDD-RED] `使用者取消 Google 登入`
  - Read: `specs/truth/features/frontend/auth/dsl.md` -> `使用者取消 Google 登入`。
- [ ] T110 [P] [BDD-RED] `使用者完成 Google 登入`
  - Read: `specs/truth/features/frontend/auth/dsl.md` -> `使用者完成 Google 登入`。
- [ ] T111 [P] [BDD-RED] `使用者尚未登入`
  - Read: `specs/truth/features/frontend/auth/dsl.md` -> `使用者尚未登入`。
- [ ] T112 [P] [BDD-RED] `使用者看到自己的旅行清單`
  - Read: `specs/truth/features/frontend/auth/dsl.md` -> `使用者看到自己的旅行清單`。
- [ ] T113 [P] [BDD-RED] `畫面只顯示第二個帳號的旅行與分類`
  - Read: `specs/truth/features/frontend/auth/dsl.md` -> `畫面只顯示第二個帳號的旅行與分類`。
- [ ] T114 [P] [BDD-RED] `第二個帳號完成 Google 登入`
  - Read: `specs/truth/features/frontend/auth/dsl.md` -> `第二個帳號完成 Google 登入`。
- [ ] T115 [P] [BDD-RED] `裝置曾顯示第一個帳號的旅行與分類`
  - Read: `specs/truth/features/frontend/auth/dsl.md` -> `裝置曾顯示第一個帳號的旅行與分類`。
- [ ] T116 [P] [BDD-RED] `"吃喝" 不再可選`
  - Read: `specs/truth/features/frontend/categories/dsl.md` -> `"吃喝" 不再可選`。
- [ ] T117 [P] [BDD-RED] `"吃喝" 分類未被支出使用且原支出仍存在`
  - Read: `specs/truth/features/frontend/categories/dsl.md` -> `"吃喝" 分類未被支出使用且原支出仍存在`。
- [ ] T118 [P] [BDD-RED] `"吃喝" 分類正被兩筆支出使用`
  - Read: `specs/truth/features/frontend/categories/dsl.md` -> `"吃喝" 分類正被兩筆支出使用`。
- [ ] T119 [P] [BDD-RED] `"日本旅行" 與 "台南旅行" 的支出已使用同一個 "餐飲" 分類`
  - Read: `specs/truth/features/frontend/categories/dsl.md` -> `"日本旅行" 與 "台南旅行" 的支出已使用同一個 "餐飲" 分類`。
- [ ] T120 [P] [BDD-RED] `使用者刪除 "吃喝" 分類`
  - Read: `specs/truth/features/frontend/categories/dsl.md` -> `使用者刪除 "吃喝" 分類`。
- [ ] T121 [P] [BDD-RED] `使用者將 "餐飲" 分類保存為原名`
  - Read: `specs/truth/features/frontend/categories/dsl.md` -> `使用者將 "餐飲" 分類保存為原名`。
- [ ] T122 [P] [BDD-RED] `使用者將 "餐飲" 分類改名為 "food"`
  - Read: `specs/truth/features/frontend/categories/dsl.md` -> `使用者將 "餐飲" 分類改名為 "food"`。
- [ ] T123 [P] [BDD-RED] `使用者將 "餐飲" 分類改名為 "吃喝"`
  - Read: `specs/truth/features/frontend/categories/dsl.md` -> `使用者將 "餐飲" 分類改名為 "吃喝"`。
- [ ] T124 [P] [BDD-RED] `使用者將午餐支出改為未分類`
  - Read: `specs/truth/features/frontend/categories/dsl.md` -> `使用者將午餐支出改為未分類`。
- [ ] T125 [P] [BDD-RED] `使用者已有 "Food" 與 "餐飲" 分類`
  - Read: `specs/truth/features/frontend/categories/dsl.md` -> `使用者已有 "Food" 與 "餐飲" 分類`。
- [ ] T126 [P] [BDD-RED] `使用者已有 "餐飲" 分類`
  - Read: `specs/truth/features/frontend/categories/dsl.md` -> `使用者已有 "餐飲" 分類`。
- [ ] T127 [P] [BDD-RED] `使用者已登入且在分類管理頁`
  - Read: `specs/truth/features/frontend/categories/dsl.md` -> `使用者已登入且在分類管理頁`。
- [ ] T128 [P] [BDD-RED] `使用者建立 "交通" 分類`
  - Read: `specs/truth/features/frontend/categories/dsl.md` -> `使用者建立 "交通" 分類`。
- [ ] T129 [P] [BDD-RED] `使用者建立 30 個餐字的分類`
  - Read: `specs/truth/features/frontend/categories/dsl.md` -> `使用者建立 30 個餐字的分類`。
- [ ] T130 [P] [BDD-RED] `使用者建立 31 個餐字的分類`
  - Read: `specs/truth/features/frontend/categories/dsl.md` -> `使用者建立 31 個餐字的分類`。
- [ ] T131 [P] [BDD-RED] `使用者建立只有空白名稱的分類`
  - Read: `specs/truth/features/frontend/categories/dsl.md` -> `使用者建立只有空白名稱的分類`。
- [ ] T132 [P] [BDD-RED] `使用者建立名稱為 " 餐飲 " 的分類`
  - Read: `specs/truth/features/frontend/categories/dsl.md` -> `使用者建立名稱為 " 餐飲 " 的分類`。
- [ ] T133 [P] [BDD-RED] `使用者查看兩趟旅行的支出`
  - Read: `specs/truth/features/frontend/categories/dsl.md` -> `使用者查看兩趟旅行的支出`。
- [ ] T134 [P] [BDD-RED] `使用者清除分類並保存支出`
  - Read: `specs/truth/features/frontend/categories/dsl.md` -> `使用者清除分類並保存支出`。
- [ ] T135 [P] [BDD-RED] `兩筆支出都顯示 "餐飲" 分類`
  - Read: `specs/truth/features/frontend/categories/dsl.md` -> `兩筆支出都顯示 "餐飲" 分類`。
- [ ] T136 [P] [BDD-RED] `兩趟旅行的原支出都顯示 "吃喝" 分類`
  - Read: `specs/truth/features/frontend/categories/dsl.md` -> `兩趟旅行的原支出都顯示 "吃喝" 分類`。
- [ ] T137 [P] [BDD-RED] `分類建立成功`
  - Read: `specs/truth/features/frontend/categories/dsl.md` -> `分類建立成功`。
- [ ] T138 [P] [BDD-RED] `午餐支出仍存在且沒有分類`
  - Read: `specs/truth/features/frontend/categories/dsl.md` -> `午餐支出仍存在且沒有分類`。
- [ ] T139 [P] [BDD-RED] `午餐支出已關聯 "吃喝" 分類`
  - Read: `specs/truth/features/frontend/categories/dsl.md` -> `午餐支出已關聯 "吃喝" 分類`。
- [ ] T140 [P] [BDD-RED] `原分類仍為同一個分類`
  - Read: `specs/truth/features/frontend/categories/dsl.md` -> `原分類仍為同一個分類`。
- [ ] T141 [P] [BDD-RED] `原支出仍存在`
  - Read: `specs/truth/features/frontend/categories/dsl.md` -> `原支出仍存在`。
- [ ] T142 [P] [BDD-RED] `另一帳號已有 "交通" 分類且目前帳號沒有`
  - Read: `specs/truth/features/frontend/categories/dsl.md` -> `另一帳號已有 "交通" 分類且目前帳號沒有`。
- [ ] T143 [P] [BDD-RED] `支出表單預選 "交通" 且其餘必填欄位已填妥`
  - Read: `specs/truth/features/frontend/categories/dsl.md` -> `支出表單預選 "交通" 且其餘必填欄位已填妥`。
- [ ] T144 [P] [BDD-RED] `此裝置對目前帳號上次選擇的 "交通" 分類仍可用`
  - Read: `specs/truth/features/frontend/categories/dsl.md` -> `此裝置對目前帳號上次選擇的 "交通" 分類仍可用`。
- [ ] T145 [P] [BDD-RED] `此裝置對目前帳號上次選擇的分類已被刪除`
  - Read: `specs/truth/features/frontend/categories/dsl.md` -> `此裝置對目前帳號上次選擇的分類已被刪除`。
- [ ] T146 [P] [BDD-RED] `此裝置對目前帳號沒有可用的上次分類紀錄`
  - Read: `specs/truth/features/frontend/categories/dsl.md` -> `此裝置對目前帳號沒有可用的上次分類紀錄`。
- [ ] T147 [P] [BDD-RED] `畫面提示分類名稱最多 30 個字且不新增分類`
  - Read: `specs/truth/features/frontend/categories/dsl.md` -> `畫面提示分類名稱最多 30 個字且不新增分類`。
- [ ] T148 [P] [BDD-RED] `畫面提示已有相同名稱且不新增分類`
  - Read: `specs/truth/features/frontend/categories/dsl.md` -> `畫面提示已有相同名稱且不新增分類`。
- [ ] T149 [P] [BDD-RED] `畫面提示已有相同名稱且原分類維持不變`
  - Read: `specs/truth/features/frontend/categories/dsl.md` -> `畫面提示已有相同名稱且原分類維持不變`。
- [ ] T150 [P] [BDD-RED] `畫面提示輸入分類名稱且不新增分類`
  - Read: `specs/truth/features/frontend/categories/dsl.md` -> `畫面提示輸入分類名稱且不新增分類`。
- [ ] T151 [P] [BDD-RED] `畫面說明分類仍在使用且支出分類維持不變`
  - Read: `specs/truth/features/frontend/categories/dsl.md` -> `畫面說明分類仍在使用且支出分類維持不變`。
- [ ] T152 [P] [BDD-RED] `目前帳號的 "交通" 分類建立成功`
  - Read: `specs/truth/features/frontend/categories/dsl.md` -> `目前帳號的 "交通" 分類建立成功`。
- [ ] T153 [P] [BDD-RED] `表單沒有預選分類`
  - Read: `specs/truth/features/frontend/categories/dsl.md` -> `表單沒有預選分類`。
- [ ] T154 [P] [BDD-RED] `表單預選 "交通" 分類`
  - Read: `specs/truth/features/frontend/categories/dsl.md` -> `表單預選 "交通" 分類`。
- [ ] T155 [P] [BDD-RED] `該筆支出沒有分類`
  - Read: `specs/truth/features/frontend/categories/dsl.md` -> `該筆支出沒有分類`。
- [ ] T156 [P] [BDD-RED] `使用者開啟新增支出表單`
  - Read: `specs/truth/features/frontend/dsl.md` -> `使用者開啟新增支出表單`。
- [ ] T157 [P] [BDD-RED] `"日本旅行" 已有 TWD 8000、JPY 15000 與 JPY 2000 支出`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `"日本旅行" 已有 TWD 8000、JPY 15000 與 JPY 2000 支出`。
- [ ] T158 [P] [BDD-RED] `"日本旅行" 有 JPY 15000 住宿且 JPY 總額為 25500`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `"日本旅行" 有 JPY 15000 住宿且 JPY 總額為 25500`。
- [ ] T159 [P] [BDD-RED] `"日本旅行" 有 TWD 8000 機票且 JPY 總額為 17500`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `"日本旅行" 有 TWD 8000 機票且 JPY 總額為 17500`。
- [ ] T160 [P] [BDD-RED] `"日本旅行" 的 JPY 總額為 17000 且餐費為 JPY 2000`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `"日本旅行" 的 JPY 總額為 17000 且餐費為 JPY 2000`。
- [ ] T161 [P] [BDD-RED] `使用者保存支出`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `使用者保存支出`。
- [ ] T162 [P] [BDD-RED] `使用者刪除住宿支出`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `使用者刪除住宿支出`。
- [ ] T163 [P] [BDD-RED] `使用者嘗試輸入小數點`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `使用者嘗試輸入小數點`。
- [ ] T164 [P] [BDD-RED] `使用者嘗試輸入第三位小數`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `使用者嘗試輸入第三位小數`。
- [ ] T165 [P] [BDD-RED] `使用者嘗試輸入負號`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `使用者嘗試輸入負號`。
- [ ] T166 [P] [BDD-RED] `使用者在新增支出表單選擇 JPY 且金額為 100`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `使用者在新增支出表單選擇 JPY 且金額為 100`。
- [ ] T167 [P] [BDD-RED] `使用者在新增支出表單選擇 TWD 且金額為 100`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `使用者在新增支出表單選擇 TWD 且金額為 100`。
- [ ] T168 [P] [BDD-RED] `使用者在新增支出表單選擇 USD 且金額為 12.50`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `使用者在新增支出表單選擇 USD 且金額為 12.50`。
- [ ] T169 [P] [BDD-RED] `使用者在電腦查看該旅行帳本`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `使用者在電腦查看該旅行帳本`。
- [ ] T170 [P] [BDD-RED] `使用者將支出日期改為 "2027-01-15"`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `使用者將支出日期改為 "2027-01-15"`。
- [ ] T171 [P] [BDD-RED] `使用者將機票修改為 JPY 8000`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `使用者將機票修改為 JPY 8000`。
- [ ] T172 [P] [BDD-RED] `使用者將餐費修改為 JPY 2500`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `使用者將餐費修改為 JPY 2500`。
- [ ] T173 [P] [BDD-RED] `使用者已填妥午餐支出且金額為 0`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `使用者已填妥午餐支出且金額為 0`。
- [ ] T174 [P] [BDD-RED] `使用者已填妥午餐支出且金額為 JPY 1200`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `使用者已填妥午餐支出且金額為 JPY 1200`。
- [ ] T175 [P] [BDD-RED] `使用者已填妥支出且建立結果回應遺失`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `使用者已填妥支出且建立結果回應遺失`。
- [ ] T176 [P] [BDD-RED] `使用者已填妥支出且建立結果回應遺失又暫時無法查證`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `使用者已填妥支出且建立結果回應遺失又暫時無法查證`。
- [ ] T177 [P] [BDD-RED] `使用者已填妥支出且裝置離線`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `使用者已填妥支出且裝置離線`。
- [ ] T178 [P] [BDD-RED] `使用者已填妥飲料支出且金額為 USD 12.50`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `使用者已填妥飲料支出且金額為 USD 12.50`。
- [ ] T179 [P] [BDD-RED] `使用者已開啟新增支出表單且幣別目錄可用`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `使用者已開啟新增支出表單且幣別目錄可用`。
- [ ] T180 [P] [BDD-RED] `使用者搜尋並選擇 "JPY" 幣別`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `使用者搜尋並選擇 "JPY" 幣別`。
- [ ] T181 [P] [BDD-RED] `使用者搜尋並選擇 "USD" 幣別`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `使用者搜尋並選擇 "USD" 幣別`。
- [ ] T182 [P] [BDD-RED] `使用者查看 "日本旅行" 帳本`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `使用者查看 "日本旅行" 帳本`。
- [ ] T183 [P] [BDD-RED] `使用者看到已保存支出與分幣別總額`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `使用者看到已保存支出與分幣別總額`。
- [ ] T184 [P] [BDD-RED] `使用者載入更多支出`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `使用者載入更多支出`。
- [ ] T185 [P] [BDD-RED] `同一 Google 帳號已在手機保存旅行支出`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `同一 Google 帳號已在手機保存旅行支出`。
- [ ] T186 [P] [BDD-RED] `帳本不再顯示住宿`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `帳本不再顯示住宿`。
- [ ] T187 [P] [BDD-RED] `帳本顯示午餐為 JPY 1200`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `帳本顯示午餐為 JPY 1200`。
- [ ] T188 [P] [BDD-RED] `帳本顯示飲料為 USD 12.50`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `帳本顯示飲料為 USD 12.50`。
- [ ] T189 [P] [BDD-RED] `支出日期預設為 "2027-03-11" 且可修改`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `支出日期預設為 "2027-03-11" 且可修改`。
- [ ] T190 [P] [BDD-RED] `支出表單日期預設為 "2027-03-11"`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `支出表單日期預設為 "2027-03-11"`。
- [ ] T191 [P] [BDD-RED] `旅行支出跨越兩頁且總額包含全部支出`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `旅行支出跨越兩頁且總額包含全部支出`。
- [ ] T192 [P] [BDD-RED] `畫面保留草稿並告知支出尚未保存`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `畫面保留草稿並告知支出尚未保存`。
- [ ] T193 [P] [BDD-RED] `畫面分別顯示 TWD 8000 與 JPY 17000 總額`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `畫面分別顯示 TWD 8000 與 JPY 17000 總額`。
- [ ] T194 [P] [BDD-RED] `畫面增加下一頁支出且分幣別總額仍涵蓋全帳本`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `畫面增加下一頁支出且分幣別總額仍涵蓋全帳本`。
- [ ] T195 [P] [BDD-RED] `畫面提示保存結果尚未確認並保留原草稿`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `畫面提示保存結果尚未確認並保留原草稿`。
- [ ] T196 [P] [BDD-RED] `畫面提示正數金額且午餐支出未新增`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `畫面提示正數金額且午餐支出未新增`。
- [ ] T197 [P] [BDD-RED] `畫面查證原支出已保存且不重複新增`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `畫面查證原支出已保存且不重複新增`。
- [ ] T198 [P] [BDD-RED] `畫面顯示 JPY 總額為 10500`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `畫面顯示 JPY 總額為 10500`。
- [ ] T199 [P] [BDD-RED] `畫面顯示 JPY 總額為 17500`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `畫面顯示 JPY 總額為 17500`。
- [ ] T200 [P] [BDD-RED] `畫面顯示 JPY 總額為 25500`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `畫面顯示 JPY 總額為 25500`。
- [ ] T201 [P] [BDD-RED] `畫面顯示 TWD 總額不再包含機票`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `畫面顯示 TWD 總額不再包含機票`。
- [ ] T202 [P] [BDD-RED] `表單幣別顯示 "JPY" 且金額只接受整數`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `表單幣別顯示 "JPY" 且金額只接受整數`。
- [ ] T203 [P] [BDD-RED] `表單幣別顯示 "USD" 且金額最多兩位小數`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `表單幣別顯示 "USD" 且金額最多兩位小數`。
- [ ] T204 [P] [BDD-RED] `表單日期顯示 "2027-01-15"`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `表單日期顯示 "2027-01-15"`。
- [ ] T205 [P] [BDD-RED] `裝置當地日期為 "2027-03-11" 且使用者已有旅行`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `裝置當地日期為 "2027-03-11" 且使用者已有旅行`。
- [ ] T206 [P] [BDD-RED] `金額仍為 100 且沒有小數點`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `金額仍為 100 且沒有小數點`。
- [ ] T207 [P] [BDD-RED] `金額仍為 100 且沒有負號`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `金額仍為 100 且沒有負號`。
- [ ] T208 [P] [BDD-RED] `金額仍為 12.50`
  - Read: `specs/truth/features/frontend/expenses/dsl.md` -> `金額仍為 12.50`。
- [ ] T209 [P] [BDD-RED] `"日本旅行" 已有開始日 "2027-03-10" 且未填結束日`
  - Read: `specs/truth/features/frontend/trips/dsl.md` -> `"日本旅行" 已有開始日 "2027-03-10" 且未填結束日`。
- [ ] T210 [P] [BDD-RED] `使用者在電腦查看旅行清單`
  - Read: `specs/truth/features/frontend/trips/dsl.md` -> `使用者在電腦查看旅行清單`。
- [ ] T211 [P] [BDD-RED] `使用者將結束日 "2027-03-09" 保存到 "日本旅行"`
  - Read: `specs/truth/features/frontend/trips/dsl.md` -> `使用者將結束日 "2027-03-09" 保存到 "日本旅行"`。
- [ ] T212 [P] [BDD-RED] `使用者將結束日 "2027-03-15" 保存到 "日本旅行"`
  - Read: `specs/truth/features/frontend/trips/dsl.md` -> `使用者將結束日 "2027-03-15" 保存到 "日本旅行"`。
- [ ] T213 [P] [BDD-RED] `使用者已登入且在旅行清單`
  - Read: `specs/truth/features/frontend/trips/dsl.md` -> `使用者已登入且在旅行清單`。
- [ ] T214 [P] [BDD-RED] `使用者建立名稱為 "台南旅行"、未填開始日且結束日為 "2027-04-05" 的旅行`
  - Read: `specs/truth/features/frontend/trips/dsl.md` -> `使用者建立名稱為 "台南旅行"、未填開始日且結束日為 "2027-04-05" 的旅行`。
- [ ] T215 [P] [BDD-RED] `使用者建立名稱為 "日本旅行" 且未填日期的旅行`
  - Read: `specs/truth/features/frontend/trips/dsl.md` -> `使用者建立名稱為 "日本旅行" 且未填日期的旅行`。
- [ ] T216 [P] [BDD-RED] `使用者建立名稱為 "日本旅行"、開始日為 "2027-03-10" 且未填結束日的旅行`
  - Read: `specs/truth/features/frontend/trips/dsl.md` -> `使用者建立名稱為 "日本旅行"、開始日為 "2027-03-10" 且未填結束日的旅行`。
- [ ] T217 [P] [BDD-RED] `使用者看到 "台南旅行" 的未定開始日與結束日`
  - Read: `specs/truth/features/frontend/trips/dsl.md` -> `使用者看到 "台南旅行" 的未定開始日與結束日`。
- [ ] T218 [P] [BDD-RED] `使用者看到 "日本旅行" 的空帳本與未定日期`
  - Read: `specs/truth/features/frontend/trips/dsl.md` -> `使用者看到 "日本旅行" 的空帳本與未定日期`。
- [ ] T219 [P] [BDD-RED] `使用者看到 "日本旅行" 的開始日與未定結束日`
  - Read: `specs/truth/features/frontend/trips/dsl.md` -> `使用者看到 "日本旅行" 的開始日與未定結束日`。
- [ ] T220 [P] [BDD-RED] `使用者看到已保存的 "日本旅行"`
  - Read: `specs/truth/features/frontend/trips/dsl.md` -> `使用者看到已保存的 "日本旅行"`。
- [ ] T221 [P] [BDD-RED] `同一 Google 帳號已在手機建立 "日本旅行"`
  - Read: `specs/truth/features/frontend/trips/dsl.md` -> `同一 Google 帳號已在手機建立 "日本旅行"`。
- [ ] T222 [P] [BDD-RED] `畫面提示日期順序錯誤且原旅行日期維持不變`
  - Read: `specs/truth/features/frontend/trips/dsl.md` -> `畫面提示日期順序錯誤且原旅行日期維持不變`。
- [ ] T223 [P] [BDD-RED] `畫面顯示旅行期間為 "2027-03-10" 至 "2027-03-15"`
  - Read: `specs/truth/features/frontend/trips/dsl.md` -> `畫面顯示旅行期間為 "2027-03-10" 至 "2027-03-15"`。
- [ ] T224 subagent review (phase quality gate)：逐句核對唯一 DSL、執行入口與 fixture 隔離，確認無 undefined steps 且沒有代替產品的假邏輯。

Phase 3 涵蓋 T010–T223，共 214 個唯一句型。

## Phase 4A: ADD Feature File - backend/currencies/available-currencies.feature

**Goal**: 依此功能的 truth 與對應介面規劃，以最小產品實作使 Test Scope 全綠。

**Shared Must Read**:
- `specs/truth/features/backend/currencies/available-currencies.feature` -> Feature 全文。
- `specs/truth/features/backend/currencies/dsl.md` -> 本 feature 使用的所有句型。
- `truth-delta.md` -> `/dsl-refine` 的 `backend/currencies/available-currencies.feature` ADD 列及其相關 MODIFY 列。
- `specs/truth/contracts/groups/currencies.yaml` -> 該模組 operations；`specs/truth/contracts/components/schemas/currencies.yaml` 與 `specs/truth/contracts/components/schemas/shared.yaml` -> 相關資料形狀及錯誤。
- `specs/truth/data/data-model.dbml` -> currencies、來源與位數。

**Boundary**: 只實作此 feature 所需行為；保留其他已通過範圍。前端對齊核可雛形與 UI plan；不將雛形假資料當成正式資料。

**Test Scope**:
- `specs/truth/features/backend/currencies/available-currencies.feature`

- [ ] T225 [BDD-GREEN] 以真實產品邏輯讓 Test Scope 全綠，並確認已完成相依功能沒有回歸。
- [ ] T226 [BDD-REFACTOR] 在綠燈保護下整理本 feature 的產品碼，重跑 Test Scope。

## Phase 4B: ADD Feature File - backend/account/accounts-and-access.feature

**Goal**: 依此功能的 truth 與對應介面規劃，以最小產品實作使 Test Scope 全綠。

**Shared Must Read**:
- `specs/truth/features/backend/account/accounts-and-access.feature` -> Feature 全文。
- `specs/truth/features/backend/account/dsl.md` -> 本 feature 使用的所有句型。
- `truth-delta.md` -> `/dsl-refine` 的 `backend/account/accounts-and-access.feature` ADD 列及其相關 MODIFY 列。
- `specs/truth/contracts/groups/account.yaml`、`specs/truth/contracts/components/schemas/account.yaml` -> 帳號投影與登入邊界。
- `specs/truth/data/data-model.dbml` -> auth.user、auth.session、auth.account、auth.verification。

**Boundary**: 只實作此 feature 所需行為；保留其他已通過範圍。前端對齊核可雛形與 UI plan；不將雛形假資料當成正式資料。

**Test Scope**:
- `specs/truth/features/backend/account/accounts-and-access.feature`

- [ ] T227 [BDD-GREEN] 以真實產品邏輯讓 Test Scope 全綠，並確認已完成相依功能沒有回歸。
- [ ] T228 [BDD-REFACTOR] 在綠燈保護下整理本 feature 的產品碼，重跑 Test Scope。

## Phase 4C: ADD Feature File - backend/trips/trip-creation-and-dates.feature

**Goal**: 依此功能的 truth 與對應介面規劃，以最小產品實作使 Test Scope 全綠。

**Shared Must Read**:
- `specs/truth/features/backend/trips/trip-creation-and-dates.feature` -> Feature 全文。
- `specs/truth/features/backend/trips/dsl.md` -> 本 feature 使用的所有句型。
- `truth-delta.md` -> `/dsl-refine` 的 `backend/trips/trip-creation-and-dates.feature` ADD 列及其相關 MODIFY 列。
- `specs/truth/features/backend/dsl.md` -> 本 feature 使用的共用句型。
- `specs/truth/contracts/groups/trips.yaml` -> 該模組 operations；`specs/truth/contracts/components/schemas/trips.yaml` 與 `specs/truth/contracts/components/schemas/shared.yaml` -> 相關資料形狀及錯誤。
- `specs/truth/data/data-model.dbml` -> trips、auth.user。

**Boundary**: 只實作此 feature 所需行為；保留其他已通過範圍。前端對齊核可雛形與 UI plan；不將雛形假資料當成正式資料。

**Test Scope**:
- `specs/truth/features/backend/trips/trip-creation-and-dates.feature`

- [ ] T229 [BDD-GREEN] 以真實產品邏輯讓 Test Scope 全綠，並確認已完成相依功能沒有回歸。
- [ ] T230 [BDD-REFACTOR] 在綠燈保護下整理本 feature 的產品碼，重跑 Test Scope。

## Phase 4D: ADD Feature File - backend/categories/categories-across-trips.feature

**Goal**: 依此功能的 truth 與對應介面規劃，以最小產品實作使 Test Scope 全綠。

**Shared Must Read**:
- `specs/truth/features/backend/categories/categories-across-trips.feature` -> Feature 全文。
- `specs/truth/features/backend/categories/dsl.md` -> 本 feature 使用的所有句型。
- `truth-delta.md` -> `/dsl-refine` 的 `backend/categories/categories-across-trips.feature` ADD 列及其相關 MODIFY 列。
- `specs/truth/features/backend/dsl.md` -> 本 feature 使用的共用句型。
- `specs/truth/contracts/groups/categories.yaml` -> 該模組 operations；`specs/truth/contracts/components/schemas/categories.yaml` 與 `specs/truth/contracts/components/schemas/shared.yaml` -> 相關資料形狀及錯誤。
- `specs/truth/data/data-model.dbml` -> categories、expenses、複合外鍵與 RESTRICT。

**Boundary**: 只實作此 feature 所需行為；保留其他已通過範圍。前端對齊核可雛形與 UI plan；不將雛形假資料當成正式資料。

**Test Scope**:
- `specs/truth/features/backend/categories/categories-across-trips.feature`

- [ ] T231 [BDD-GREEN] 以真實產品邏輯讓 Test Scope 全綠，並確認已完成相依功能沒有回歸。
- [ ] T232 [BDD-REFACTOR] 在綠燈保護下整理本 feature 的產品碼，重跑 Test Scope。

## Phase 4E: ADD Feature File - backend/expenses/expenses-and-totals.feature

**Goal**: 依此功能的 truth 與對應介面規劃，以最小產品實作使 Test Scope 全綠。

**Shared Must Read**:
- `specs/truth/features/backend/expenses/expenses-and-totals.feature` -> Feature 全文。
- `specs/truth/features/backend/expenses/dsl.md` -> 本 feature 使用的所有句型。
- `truth-delta.md` -> `/dsl-refine` 的 `backend/expenses/expenses-and-totals.feature` ADD 列及其相關 MODIFY 列。
- `specs/truth/contracts/groups/expenses.yaml` -> 該模組 operations；`specs/truth/contracts/components/schemas/expenses.yaml` 與 `specs/truth/contracts/components/schemas/shared.yaml` -> 相關資料形狀及錯誤。
- `specs/truth/data/data-model.dbml` -> expenses、trips、categories、currencies、歷史位數與加總。

**Boundary**: 只實作此 feature 所需行為；保留其他已通過範圍。前端對齊核可雛形與 UI plan；不將雛形假資料當成正式資料。

**Test Scope**:
- `specs/truth/features/backend/expenses/expenses-and-totals.feature`

- [ ] T233 [BDD-GREEN] 以真實產品邏輯讓 Test Scope 全綠，並確認已完成相依功能沒有回歸。
- [ ] T234 [BDD-REFACTOR] 在綠燈保護下整理本 feature 的產品碼，重跑 Test Scope。

## Phase 4F: ADD Feature File - frontend/auth/google-login-and-account-isolation.feature

**Goal**: 依此功能的 truth 與對應介面規劃，以最小產品實作使 Test Scope 全綠。

**Shared Must Read**:
- `specs/truth/features/frontend/auth/google-login-and-account-isolation.feature` -> Feature 全文。
- `specs/truth/features/frontend/auth/dsl.md` -> 本 feature 使用的所有句型。
- `truth-delta.md` -> `/dsl-refine` 的 `frontend/auth/google-login-and-account-isolation.feature` ADD 列及其相關 MODIFY 列。
- `ui/ui-plan.md` -> 登入入口、互動、API/data 對齊與錯誤處理。
- `ui/index.html` -> 對應靜態雛形及共用日期元件。

**Boundary**: 只實作此 feature 所需行為；保留其他已通過範圍。前端對齊核可雛形與 UI plan；不將雛形假資料當成正式資料。

**Test Scope**:
- `specs/truth/features/frontend/auth/google-login-and-account-isolation.feature`

- [ ] T235 [BDD-GREEN] 以真實產品邏輯讓 Test Scope 全綠，並確認已完成相依功能沒有回歸。
- [ ] T236 [BDD-REFACTOR] 在綠燈保護下整理本 feature 的產品碼，重跑 Test Scope。

## Phase 4G: ADD Feature File - frontend/trips/trip-creation-and-dates.feature

**Goal**: 依此功能的 truth 與對應介面規劃，以最小產品實作使 Test Scope 全綠。

**Shared Must Read**:
- `specs/truth/features/frontend/trips/trip-creation-and-dates.feature` -> Feature 全文。
- `specs/truth/features/frontend/trips/dsl.md` -> 本 feature 使用的所有句型。
- `truth-delta.md` -> `/dsl-refine` 的 `frontend/trips/trip-creation-and-dates.feature` ADD 列及其相關 MODIFY 列。
- `ui/ui-plan.md` -> 我的旅行及旅行日期、互動、API/data 對齊與錯誤處理。
- `ui/trips.html`、`ui/trip.html`、`ui/date-picker.js`、`ui/date-picker.css` -> 對應靜態雛形及共用日期元件。

**Boundary**: 只實作此 feature 所需行為；保留其他已通過範圍。前端對齊核可雛形與 UI plan；不將雛形假資料當成正式資料。

**Test Scope**:
- `specs/truth/features/frontend/trips/trip-creation-and-dates.feature`

- [ ] T237 [BDD-GREEN] 以真實產品邏輯讓 Test Scope 全綠，並確認已完成相依功能沒有回歸。
- [ ] T238 [BDD-REFACTOR] 在綠燈保護下整理本 feature 的產品碼，重跑 Test Scope。

## Phase 4H: ADD Feature File - frontend/expenses/expense-recording-and-totals.feature

**Goal**: 依此功能的 truth 與對應介面規劃，以最小產品實作使 Test Scope 全綠。

**Shared Must Read**:
- `specs/truth/features/frontend/expenses/expense-recording-and-totals.feature` -> Feature 全文。
- `specs/truth/features/frontend/expenses/dsl.md` -> 本 feature 使用的所有句型。
- `truth-delta.md` -> `/dsl-refine` 的 `frontend/expenses/expense-recording-and-totals.feature` ADD 列及其相關 MODIFY 列。
- `specs/truth/features/frontend/dsl.md` -> 本 feature 使用的共用句型。
- `ui/ui-plan.md` -> 旅行帳本及支出表單、互動、API/data 對齊與錯誤處理。
- `ui/trip.html`、`ui/expense.html`、`ui/date-picker.js`、`ui/date-picker.css` -> 對應靜態雛形及共用日期元件。

**Boundary**: 只實作此 feature 所需行為；保留其他已通過範圍。前端對齊核可雛形與 UI plan；不將雛形假資料當成正式資料。

**Test Scope**:
- `specs/truth/features/frontend/expenses/expense-recording-and-totals.feature`

- [ ] T239 [BDD-GREEN] 以真實產品邏輯讓 Test Scope 全綠，並確認已完成相依功能沒有回歸。
- [ ] T240 [BDD-REFACTOR] 在綠燈保護下整理本 feature 的產品碼，重跑 Test Scope。

## Phase 4I: ADD Feature File - frontend/expenses/pagination-and-save-outcomes.feature

**Goal**: 依此功能的 truth 與對應介面規劃，以最小產品實作使 Test Scope 全綠。

**Shared Must Read**:
- `specs/truth/features/frontend/expenses/pagination-and-save-outcomes.feature` -> Feature 全文。
- `specs/truth/features/frontend/expenses/dsl.md` -> 本 feature 使用的所有句型。
- `truth-delta.md` -> `/dsl-refine` 的 `frontend/expenses/pagination-and-save-outcomes.feature` ADD 列及其相關 MODIFY 列。
- `ui/ui-plan.md` -> 旅行帳本及支出表單、互動、API/data 對齊與錯誤處理。
- `ui/trip.html`、`ui/expense.html`、`ui/date-picker.js`、`ui/date-picker.css` -> 對應靜態雛形及共用日期元件。

**Boundary**: 只實作此 feature 所需行為；保留其他已通過範圍。前端對齊核可雛形與 UI plan；不將雛形假資料當成正式資料。

**Test Scope**:
- `specs/truth/features/frontend/expenses/pagination-and-save-outcomes.feature`

- [ ] T241 [BDD-GREEN] 以真實產品邏輯讓 Test Scope 全綠，並確認已完成相依功能沒有回歸。
- [ ] T242 [BDD-REFACTOR] 在綠燈保護下整理本 feature 的產品碼，重跑 Test Scope。

## Phase 4J: ADD Feature File - frontend/categories/category-management-and-device-default.feature

**Goal**: 依此功能的 truth 與對應介面規劃，以最小產品實作使 Test Scope 全綠。

**Shared Must Read**:
- `specs/truth/features/frontend/categories/category-management-and-device-default.feature` -> Feature 全文。
- `specs/truth/features/frontend/categories/dsl.md` -> 本 feature 使用的所有句型。
- `truth-delta.md` -> `/dsl-refine` 的 `frontend/categories/category-management-and-device-default.feature` ADD 列及其相關 MODIFY 列。
- `specs/truth/features/frontend/dsl.md` -> 本 feature 使用的共用句型。
- `ui/ui-plan.md` -> 分類管理及裝置預選、互動、API/data 對齊與錯誤處理。
- `ui/categories.html`、`ui/expense.html` -> 對應靜態雛形及共用日期元件。

**Boundary**: 只實作此 feature 所需行為；保留其他已通過範圍。前端對齊核可雛形與 UI plan；不將雛形假資料當成正式資料。

**Test Scope**:
- `specs/truth/features/frontend/categories/category-management-and-device-default.feature`

- [ ] T243 [BDD-GREEN] 以真實產品邏輯讓 Test Scope 全綠，並確認已完成相依功能沒有回歸。
- [ ] T244 [BDD-REFACTOR] 在綠燈保護下整理本 feature 的產品碼，重跑 Test Scope。

## Phase 4K: UI quality gate

**Goal**: 確認已實作的畫面與回追的 plan-side UI 產物一致，測試綠燈不能取代此審查。

**Read**:
- `ui/ui-plan.md` -> 五頁、日期選擇器、API/data 對齊及 TWD 例外。
- `ui/index.html`、`ui/trips.html`、`ui/trip.html`、`ui/expense.html`、`ui/categories.html`、`ui/styles.css`、`ui/date-picker.js`、`ui/date-picker.css`、`ui/prototype-design.pen`。
- `apps/web/src/` -> 對應已實作頁面與共用元件。

**Boundary**: 不改 truth、不新增 feature，不以重跑 GREEN 取代設計對齊。核對分類驗證、TWD 整數輸入及未確認結果等雛形尚未同步的差異，以最新 UI plan 為準。

- [ ] T245 subagent review (ui quality gate)：核對版面、日期互動、行動版與已核可的錯誤／載入狀態；記錄差異並修正至符合計畫。

