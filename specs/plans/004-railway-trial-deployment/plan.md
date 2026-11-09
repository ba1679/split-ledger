# 系統分析規劃

建立日期：2026-11-09。Plan package：`specs/plans/004-railway-trial-deployment`；Truth root：`specs/truth`；變更交接：本 package 的 `truth-delta.md`。依 spec、research 及現有 truth 分析，未部署、不啟用付費方案。專屬 system-analysis 憲法檔不存在，依共用憲法與 skill 規則執行。

## 專案結構

### 文件結構（本功能）

```text
specs/plans/004-railway-trial-deployment/
├── spec.md
├── checklists/requirements.md
├── research.md
├── plan.md
├── truth-delta.md
├── ui/ui-plan.md                 # 本輪 UI 分析
└── tasks.md                      # 後續 /tasks 產出
```

API 與資料模型主產物由 owner 維護於 `specs/truth/contracts/**`、`specs/truth/data/**`；不建立 package-local 契約副本。部署操作手冊與驗證證據的實際文件位置由 /tasks 落實。

### 原始碼結構（儲存庫根目錄）

```text
apps/
├── api/
│   ├── src/server.ts
│   ├── src/app.ts
│   ├── src/modules/
│   ├── src/db/
│   └── drizzle/
└── web/
    ├── src/
    ├── vite.config.ts
    └── package.json
packages/shared/
scripts/
tests/
compose.yaml
package.json
```

**結構決策**: 保留 workspace 邊界，依 research 規劃單一公開應用服務提供頁面及 API，資料庫獨立持久化。建置、執行期、路由與備份為工程交付責任，不新增產品管理後台或平台控制 API。

## 分析流程規劃

### 系統介面的盤點

本次需求共盤點出 `4` 個系統介面。

1. `線上登入及記帳頁面介面`
   - 端點類型：前端端點。
   - 主要介面：Google 登入入口、旅行與支出頁、手機操作、直接開啟與重新整理頁面；確認現有狀態是否足夠，不預設新增畫面。
   - 需求原文依據：FR-001～003、SC-001。
   - 委派：`/ui-plan`；產物 `ui/ui-plan.md`。
2. `同 origin API、認證及就緒介面`
   - 端點類型：後端／HTTP 端點。
   - 主要介面：既有 API 契約、Google callback、session、未知路徑與靜態檔邊界、部署就緒資訊。研究新增就緒檢查是否需要契約 ADD，避免 SPA fallback 吞掉 API 錯誤。
   - 需求原文依據：FR-001～003、NFR-001、research 決策 1～3 與 migration 失敗邊界。
   - 委派：`/api-plan`；主產物 `specs/truth/contracts/**`。
3. `測試資料持久化及備份還原介面`
   - 端點類型：資料庫與資料操作端點。
   - 主要介面：既有業務與 auth 資料責任、啟動 migrations、持久 volume、隔離還原與核對；判斷模型 NOOP，不為備份或部署新增業務資料表。
   - 需求原文依據：FR-004～005、NFR-002、SC-002。
   - 委派：`/data-plan`；主產物 `specs/truth/data/**`。
4. `試用部署及管理者操作介面`
   - 端點類型：雲端部署／人工操作端點。
   - 主要介面：Railway build/start/port/environment、OAuth 設定、部署狀態、日誌、用量、到期與失敗處置文件。
   - 需求原文依據：FR-006～008、SC-003～004。
   - 委派：`/api-plan` 合併 handoff，僅分析服務啟動／HTTP 就緒與部署輸入輸出邊界；平台操作與 runbook 留給 /tasks 工程任務，不將平台畫面誤當產品 UI 或創建平台管理 API。

### 分析流程的安排

#### Wave 1

- 平行分析介面：`同 origin API、認證及就緒介面`、`試用部署及管理者操作介面`（合併 `/api-plan`）；`測試資料持久化及備份還原介面`（`/data-plan`）。
- 分析重點：API owner 核對業務契約是否 NOOP，明確就緒／失敗回應與路由責任，保留部署證據要求；data owner 核對模型、migration 與隔離還原的資料邊界。兩者透過既有 PostgreSQL 與啟動成功條件分析，無須等待彼此新增 schema／業務契約。
- 安排理由：本輪沒有新增業務流程，現有契約與模型已可作共同輸入；先釐清部署帶來的對外行為與資料風險，再核對使用者頁面。
- 交接必帶：plan package、truth root、truth-delta path、上述介面名稱、spec 條目、research、相應 truth。owner 更新各自 truth 及 delta；共享 delta 寫入需保留其他 owner。

#### Wave 2

- 分析介面：`線上登入及記帳頁面介面`（`/ui-plan`）。
- 分析重點：讀取 Wave 1 契約與 delta，核對線上登入、手機、頁面導覽／重新整理、既有錯誤狀態覆蓋；判定是否需新增 UI 或雛形。若產品 UI 無變更，記錄既有頁面引用與回歸要求，不為部署另造後台或畫面。
- 安排理由：同 origin 路由及認證邊界確認後，才能判斷前端是否需要額外互動與狀態。無改變時將 UI NOOP 證據交給 /tasks。

## 後續 handoff

- 平台帳號資格、憑證值、實際網址、剩餘額度及資源可用性留待部署操作查核；這些不阻塞文件分析，但未確認前不得宣稱部署驗收通過。
- /tasks 需涵蓋正式建置／shared 相容性、SQL 路徑、靜態路由、監聽位址與 PORT、就緒檢查、Railway 設定、實際 Google／手機驗證、重新部署保存、隔離還原與用量／期限紀錄。
- 若 owner 引入新介面行為而現有 feature/DSL 無覆蓋，先經 /dsl-refine；純工程及既有回歸部分可交 /tasks。不得以本輪分析代替實際測試證據。

## 分析交接結果

### Wave 1（已完成）

- `/api-plan`：新增部署用 `GET /healthz` 契約，初始化完成回應 204、無本文、不需登入；既有業務與登入 API NOOP。契約已打包檢查，但端點尚未實作。靜態路由、API 錯誤不被 SPA fallback 吞掉及啟動失敗的驗證交 /tasks。
- `/data-plan`：既有資料模型 NOOP；試用 volume、邏輯備份、隔離還原與資料核對為工程交付。無需新增業務表。
- 各 owner 已更新 truth-delta 對應 section。部署就緒檢查不構成新增使用者業務流程，可由工程驗收承接；若後續 UI 分析發現產品行為缺口，須回交 /dsl-refine。

### Wave 2（已完成）

- `/ui-plan`：完成 `ui/ui-plan.md`；既有登入、旅行、帳本與支出表單沿用，不新增產品畫面或靜態雛形。內頁直接開啟與重新整理屬部署 SPA 路由驗證；真實 Google、手機、兩帳號隔離及重新部署保存仍需實測。
- 已可交 `/tasks`：按既有產品回歸、部署工程驗收與人工外部服務驗證分類，不需為本輪純部署新增業務 Gherkin。`/dsl-refine` 尚未執行，該 owner 的佔位不代表 NOOP 已由其核准；若任務分析發現新增產品行為缺口，應先補 acceptance 並回交 /dsl-refine。
- 本輪未進入 `/clarify`，未變更產品程式或執行部署。實際帳號資格、網址、憑證、可用額度及部署資源留待操作驗證；不阻塞任務規劃。
