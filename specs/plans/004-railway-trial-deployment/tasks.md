# Tasks: Railway 免費試用部署

**Plan Package**: `specs/plans/004-railway-trial-deployment`
**Core Inputs**: `spec.md`, `plan.md`, `research.md`, `truth-delta.md`, `ui/ui-plan.md`, `specs/truth/techstack.md`, `specs/truth/contracts/openapi.yaml`, `specs/truth/contracts/groups/health.yaml`, `specs/truth/data/data-model.dbml`, 下列受影響 truth feature / DSL。

## Task Binding Contract

- Plan-side 相對路徑以本 package 為基準；程式碼及 `specs/truth/**` 路徑以儲存庫根目錄為基準。
- 本輪為部署工程與既有行為回歸。`truth-delta.md` 的 `/technical-research` 決策、`/api-plan` 就緒端點 ADD、`/data-plan` NOOP 為依據；`/dsl-refine` 尚未執行的佔位不是核准的 NOOP。
- 沒有業務 feature / DSL 語意變更，既有 steps 已落在 `apps/api/tests/steps` 與 `apps/web/tests/steps`。省略 Phase 3 Test Alignment & Implementation，也不建立空 BDD-GREEN／REFACTOR phase。若發現新增產品行為或 DSL 無唯一承接，停止受影響任務並回交 `/dsl-refine`，不可改標工程工作繞過。
- 新增 `/healthz` 為部署工程契約，以 HTTP 契約與啟動失敗檢查驗收。內頁直接進入／重新整理為正式部署 SPA 路由驗證，既有記帳行為由回歸保護。
- 本輪不得啟用付費方案。缺少 Railway／Google 存取、帳號資格、實機或額度時，記錄阻礙，保持依賴任務未完成；可獨立完成的本機任務持續進行。無額外 USER-CONFIRM 關卡，實際人工驗證仍需證據。
- 只有取得指定證據才勾選完成；將成功與未驗證項分開記錄。secret、cookie、OAuth token、備份內容均不貼入版本庫或公開日誌。

## 驗收分類與證據

| 來源 | 類型 | 任務與證據 |
| --- | --- | --- |
| FR-001、SC-001 登入 | 既有產品回歸 + 外部串接 | T007 本機 BDD；T011 真實 HTTPS／Google／手機紀錄 |
| FR-002、SC-001 帳本與隔離 | 既有產品回歸 | T007 全部 API BDD 與前端回歸；T011 兩帳號的畫面及 API 核對 |
| FR-003 內頁導覽 | 部署工程 | T006、T007 正式產物路由測試；T011 線上直接開啟與刷新 |
| FR-004、SC-002 持久化 | 部署工程 | T012 重新部署前後資料 ID、金額與擁有者核對 |
| FR-005、SC-002 還原 | 資料操作工程 | T013 匯出、隔離還原、資料核對紀錄 |
| FR-006、FR-007、SC-003 | 工程文件交付 | T008 初版手冊、T014 實際操作與到期資訊 |
| FR-008、SC-004 | 成本邊界 | T009、T010、T014 trial 狀態、餘額、期限及未付費紀錄 |
| NFR-001、NFR-002 | 全程限制 | T004～T014 敏感資料與環境隔離檢查 |

## 既有回歸參照

**Shared Must Read**:
- `specs/truth/features/frontend/auth/google-login-and-account-isolation.feature`、同目錄 `dsl.md`：Google 登入、取消、換帳號。
- `specs/truth/features/frontend/trips/trip-creation-and-dates.feature`、同目錄 `dsl.md`：旅行建立與日期、跨裝置再讀。
- `specs/truth/features/frontend/expenses/expense-recording-and-totals.feature`、`pagination-and-save-outcomes.feature`、同目錄 `dsl.md`：支出保存、金額、總額及未確認結果。
- `specs/truth/features/backend/account/accounts-and-access.feature`、同目錄 `dsl.md`：有效／無效 session 與跨帳號拒絕。
- 其餘既有業務回歸經 `pnpm test:api`、`pnpm test:web` 執行原 runner；不改 DSL 定義。真實 Google 串接不由替身測試代替。

**Test Scope**: 前述 feature，以及 `apps/api/tests/support/{database,auth}.spec.ts`；啟動與靜態路由由本輪獨立工程測試補足。現有資料庫 fixture 僅允許本機 `ledger_test`／54330，禁止把既有破壞性 E2E 指向 Railway。

## Phase 1: Setup

**Goal**: 備妥靜態服務依賴及部署／備份工具，不接上正式頁面或產品路由。

**Shared Must Read**: `research.md` 決策 1、2、4；`specs/truth/techstack.md` 試用部署、Node 與 PostgreSQL。

- [X] T001 加入 Fastify 靜態服務依賴與部署工具設定
  - Read: `apps/api/package.json`、根 `package.json`、`.node-version`、pnpm lockfile。
  - 為 API 安裝與 Fastify 5 相容的 `@fastify/static` 並鎖版；沿用 Node 24.22.2、pnpm 11.25.0。備妥 Railway CLI（若採 CLI 部署）及 PostgreSQL 18 `pg_dump`／`pg_restore`，記錄版本與安裝入口。
  - 不註冊產品靜態路由、不建雲端資源、不載入帳本或真實 secret。此為 research 已選同程序靜態服務的依賴落地，非變更業務框架。
  - 證據：安裝成功、lockfile 可重現、工具版本紀錄。

- [X] T002 smoke-test 驗證靜態服務套件與工具鏈
  - Dependencies: T001。
  - 以臨時 Fastify app 與臨時文字檔驗證 plugin 可載入及讀檔；確認 Node、pnpm、備份工具版本。不串接正式應用或寫入資料庫。
  - 證據：最小 smoke 結果；失敗先修正相容版本再往下。

## Phase 2: Foundational

**Goal**: 建立獨立正式啟動測試的共用入口，不提前完成路由或就緒行為。

- [X] T003 建立部署工程測試的程序與隔離資料庫 fixture
  - Dependencies: T002。
  - Read: `apps/api/tests/support/database.ts`、`apps/api/tests/support/fixtures.ts`、`playwright.support.config.ts`。
  - 只做：在 `tests/deployment/` 與獨立 `playwright.deployment.config.ts` 建立正式啟動 child process、臨時 port、隔離資料庫與 cleanup helper；加根 script `test:deployment`。
  - 不做：不改業務 fixtures／DSL、不寫路由成功斷言、不寫產品實作、不連 Railway DB。
  - 證據：fixture 可建立與清除隔離資源，型別檢查通過。

## Phase 4A: 正式執行與 HTTP 部署工程

**Shared Must Read**: `research.md` 決策 1～3；`plan.md` 介面 2、4；`truth-delta.md` `/technical-research` 與 `/api-plan`；`specs/truth/contracts/groups/health.yaml`；`ui/ui-plan.md` 路由邊界。

**Boundary**: 僅調整建置、啟動、靜態路由與部署契約；不改業務資料模型、畫面與認證語意。

**Test Scope**: `tests/deployment/` 的真實編譯產物程序測試、既有回歸參照；T007 為本 phase 完整驗證。

**Parallel Hint**: T004→T005→T006→T007 依序，共享啟動與路由檔案，不平行編輯。

- [X] T004 完成可重現的正式建置與啟動入口
  - Dependencies: T003；來源：FR-001、FR-006、research 決策 2。
  - 修改根／API package scripts、必要 shared export／建置設定；從乾淨安裝 `pnpm install --frozen-lockfile` 建置前後端，確保 shared 執行期解析、SQL migrations 與前端資源位置正確。
  - `server.ts` 支援 Railway `PORT`、`0.0.0.0` 與現有本機開發；處理必要設定缺漏及 SIGTERM。設定 `NODE_ENV=production`，環境讀取不輸出秘密。
  - 證據：以正式入口在本機隔離 DB 啟動，驗證無開發監看程序依賴、全新 DB migration 成功及程序關閉。

- [X] T005 實作部署就緒檢查
  - Dependencies: T004；來源：`specs/truth/contracts/groups/health.yaml`、plan Wave 1。
  - 在初始化成功後提供免登入 `GET /healthz`，204 無本文、不含敏感內容；migrations／幣別檢查失敗不可回傳就緒。
  - 證據：補充並執行部署工程測試，涵蓋成功啟動、不可連 DB、migration 失敗時無成功就緒；不把此端點宣稱為持續 DB 監控。

- [X] T006 同 origin 提供前端正式產物與 SPA 導覽
  - Dependencies: T005；來源：FR-001、FR-003、research 決策 1、UI plan。
  - Fastify 提供 Vite 產物，支援頁面導覽 fallback；保留 `/api`、`/api/auth/*`、`/healthz` 的優先路由；未知 API、缺失 JS/CSS 與不適用方法不得回首頁 200。
  - 證據：部署測試覆蓋 `/`、已知內頁直接進入／刷新、資源 content-type、缺失資源、未知 API 及健康檢查；不改產品頁面。

- [X] T007 執行正式產物與既有業務回歸
  - Dependencies: T006；來源：FR-001～003、NFR-001、SC-001。
  - 執行 `pnpm typecheck`、`pnpm exec tsc -p tsconfig.tests.json`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test:deployment`。
  - 沿用本機隔離 DB 執行 `pnpm test:support`、`pnpm test:api`、`pnpm test:web --project chromium` 及 `--project webkit`；涵蓋上列既有 feature。若 shared 金額實作被調整，另跑 `pnpm test:unit`。
  - 證據：在 `validation.md` 記錄指令、範圍、結果與限制；不把本機 Vite 代理測試當正式產物路由證據。

## Phase 4B: Railway 設定與操作手冊

**Shared Must Read**: `spec.md` FR-004～008；`research.md` 決策 2、4、5；`plan.md` 介面 3、4；`truth-delta.md` `/data-plan` NOOP；`specs/truth/data/data-model.dbml`。
**Boundary**: 不新增平台管理產品 API，不啟用付費，不改既有 schema。
**Test Scope**: 設定對照、實際 trial 狀態、Railway build/deploy 日誌與 T011～T013 驗收。

- [X] T008 寫入 Railway 設定與部署／備份手冊初版
  - Dependencies: T007；來源：FR-006～008。
  - 交付根 `railway.json` 或 `railway.toml`，明確 workspace build/start、`/healthz`；本 package `runbook.md` 記錄建立一個應用與 PostgreSQL 18、volume、私有 URL、HTTPS 網址、環境變數名稱及 Google callback 設定。
  - 手冊包含遷移失敗、API fallback、OAuth 錯誤、日誌、重啟／重新部署、程式回復與 schema 回復的差異；正式 secrets 由平台輸入。
  - 提供 PostgreSQL 18 匯出與隔離還原程序、來源／目標辨識、避免覆寫、受保護的卷外備份位置及核對項目。可從本地透過受控連線匯出；若需臨時公開連線，紀錄啟用／關閉步驟，不留永久公開入口。
  - 證據：設定可解析且對應實際 scripts；本機測試資料匯出／隔離還原預演可執行。

- [X] T009 確認實際試用資格及必要存取
  - Dependencies: T008；來源：FR-007～008、SC-004、spec 假設。
  - 使用可用 Railway 登入確認 Trial 類型、額度、期限、容量、網路與資源限制；確認可取得兩個 Google 帳號和所需 OAuth 設定權限。紀錄查核時間、官方來源、平台介面實際值。
  - 證據：`validation.md` 脫敏紀錄。受限試用若無法交換 OAuth token、無額度或需付費解鎖，保留未完成與阻礙，不自動升級；登入／秘密由安全介面處理。

- [X] T010 建立 Railway 免費試用環境並部署
  - Dependencies: T009；來源：FR-001、FR-004、FR-008。
  - 建立 spec 限定服務組合，確認 PostgreSQL 18 相容性、volume 掛載、DB 私有連線；部署 workspace 及正式建置入口，設定 HTTPS origin、獨立試用 secrets、Google callback、`NODE_ENV=production` 與 healthcheck。
  - 證據：平台成功部署、`/healthz` 204、網址可連、用量和 trial 狀態；記錄版本 SHA 或來源版本。不得用測試替身在公開環境建立登入捷徑。

## Phase 4C: 線上驗收與資料操作

**Shared Must Read**: `spec.md` SC-001～004；`ui/ui-plan.md` 畫面與流程；`runbook.md`；既有回歸參照；`specs/truth/contracts/groups/health.yaml`。
**Boundary**: 僅測試資料；實際帳號／手機步驟缺證據時維持未完成，不以模擬結果取代。
**Test Scope**: 真實 Google、兩帳號、至少一次手機操作、重新部署保存、隔離還原與操作文件。
**Parallel Hint**: T011→T012→T013→T014；避免備份與重新部署互相干擾。品質關卡各自讀取最終成果。

- [X] T011 驗證 HTTPS、真實 Google 與兩人手機記帳
  - Dependencies: T010；來源：FR-001～003、SC-001。
  - 兩個帳號各完成 Google 登入與建立旅行／支出；核對原幣別金額及總額；換帳號及直接請求對方測試資源應拒絕存取。測登入取消／登出、內頁刷新及直接開啟。
  - 至少一台實際手機完成主要流程，核對 cookie Secure／HttpOnly、頁面與靜態資源載入。紀錄裝置／瀏覽器及結果，無需記錄 token 或帳號個資。
  - 證據：`validation.md` 結果與脫敏截圖／請求狀態；無法親自操作時請使用者完成所需實際步驟後再勾選。

- [X] T012 驗證重新部署後測試資料仍存在
  - Dependencies: T011；來源：FR-004、SC-002。
  - 記錄旅行／支出測試識別、owner 對應及金額；重新部署應用後以原帳號再讀，確認同一資料、總額、擁有者與 migration 無重複套用，不清除或重建 DB volume。
  - 證據：版本與部署時間、重新部署前後比對寫入 `validation.md`。

- [X] T013 驗證卷外備份與隔離還原
  - Dependencies: T012；來源：FR-005、SC-002。
  - 按 runbook 匯出 Railway 測試 DB，保存於受保護的卷外位置；還原到獨立的本機 PostgreSQL 18 目標，核對 auth 擁有者關聯、旅行／支出、精確金額／幣別及筆數。備份不得提交 git。
  - 證據：工具版本、時間、備份完整性識別、來源／目標脫敏辨識及比對結果；關閉臨時連線與清理隔離資源，不影響原 DB。

- [X] T014 完成實際用量、試用到期與交付紀錄
  - Dependencies: T013；來源：FR-006～008、SC-003～004。
  - 更新 `runbook.md`／`validation.md`：實際部署與備份操作、用量／剩餘額度／期限、查核日期與官方來源、錯誤與復原方式、到期前保全及停止／續用選項；不假定到期自動保留服務或資料。
  - 核對兩個 SC-002 演練和 SC-001 真實驗證；保留未完成限制。README 提供 runbook 入口，無 secrets 或備份資料。
  - 證據：所有 SC 對應紀錄可找到，trial 未升級付費。未驗證實際到期不宣稱已演練到期流程。

## Phase 5: Plan-side quality gates

**Goal**: 最後消費者 T014 完成後，獨立核對交付成果與每一類規劃產物；測試全綠不能代替文件對齊。
**Boundary**: 不改 truth、不新增 feature、不以重跑 GREEN 當通過條件；有落差先修正再複核。

- [X] T015 subagent review (ui quality gate)
  - Dependencies: T014。
  - Read: `ui/ui-plan.md`、`apps/web/src/`、T011 證據。
  - 通過條件：現有 UI 行為與計畫一致，手機／登入／路由驗證證據充分，沒有憑空加入平台管理畫面。

- [X] T016 subagent review (research quality gate)
  - Dependencies: T015。
  - Read: `research.md`、最終建置／啟動／Railway 設定、`runbook.md`、`validation.md`。
  - 通過條件：同 origin、執行期、migration、備份隔離、免費邊界與研究一致；未驗證假設有明確揭露。

- [X] T017 subagent review (plan quality gate)
  - Dependencies: T016。
  - Read: `plan.md`、`spec.md`、`truth-delta.md`、所有交付物與驗收證據。
  - 通過條件：四個介面責任、FR／NFR／SC 全部有可追溯成果；資料隔離、部署保存與還原已證明；遇外部阻礙的任務沒有被誤勾完成。
