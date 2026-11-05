# 系統分析規劃

**Plan**：001-personal-travel-expenses（Phase 1A）  
**日期**：2026-11-05  
**輸入**：已 review 的 spec、acceptance features、research、techstack，以及使用者本輪核可的 pen.dev 設計。

## 專案結構

### 文件結構（本功能）

```text
specs/plans/001-personal-travel-expenses/
├── spec.md
├── research.md
├── plan.md
├── truth-delta.md
├── checklists/requirements.md
├── features/acceptance/*.feature
├── ui/                           # UI plan、可操作 HTML、核可的 .pen 與預覽
└── tasks.md                      # 後續 /tasks 產出；目前尚未建立

specs/truth/
├── techstack.md
├── contracts/                    # /api-plan：目前完整 API 契約
│   ├── openapi.yaml
│   ├── groups/
│   └── components/
├── data/                         # /data-plan：目前完整資料模型
└── features/                     # 後續 /dsl-refine：各端 executable features 與 DSL
```

### 原始碼結構（儲存庫根目錄）

以下為規劃，尚未建立應用程式或安裝套件。

```text
apps/
├── web/
│   ├── src/
│   │   ├── app/                  # Router、Query client、帳號生命週期
│   │   ├── features/             # auth、trips、expenses、categories
│   │   ├── components/           # 共用欄位、日期選擇器、combobox、dialog
│   │   └── api/                  # HTTP client、契約型別與 query keys
│   └── tests/                    # 前端 playwright-bdd
└── api/
    ├── src/
    │   ├── app.ts                # 可由正式入口與測試共用的組裝
    │   ├── server.ts
    │   ├── modules/              # auth、trips、expenses、categories、currencies
    │   ├── db/                   # Drizzle schema 與連線
    │   └── config/
    ├── drizzle/                  # 可 review 的 SQL migrations
    └── tests/                    # 後端 HTTP playwright-bdd
packages/
└── shared/
    ├── src/                      # 必要的金額/日期純函式與幣別快照
    └── tests/                    # Vitest；獨立預期值
```

**結構決策**：沿用已確認的 pnpm monorepo、React/Vite SPA、獨立 Fastify API 與 PostgreSQL。各後端功能內分開 HTTP、業務規則、查詢責任；前端不可引用 API 內部或資料庫 schema。Google 為外部身分依賴，Better Auth 管理其協定與 session；不自行實作另一套 OAuth。僅為未來共編保留乾淨邊界，不先加入旅伴、共享權限、分帳或同步設施。

## 分析流程規劃

### 系統介面的盤點

本次需求共盤點出 `3` 個系統介面。

1. `旅行記帳前端介面`
   - 端點類型：`網頁端點（手機與桌機）`
   - 主要介面：Google 登入入口、旅行清單/建立/日期補填、支出新增/修改/刪除、分幣別統計、分類管理、裝置分類預設及自訂日期互動。
   - 需求原文依據：FR-001～003、005～020、NFR-001；使用者已核可五頁設計及自訂日期選擇器。
   - Planner：`/ui-plan`，承接既有產物並檢查與後續契約的對齊。

2. `個人帳本與登入 API 介面`
   - 端點類型：`HTTP 後端端點，包含 Google 外部身分整合邊界`
   - 主要介面：Google/session 整合、旅行及支出操作、分類管理與刪除衝突、幣別目錄、權威統計、驗證及錯誤語意。
   - 需求原文依據：FR-001、003～020；跨裝置保存必須經由後端，FR-004 要求每次操作限制擁有者。Google 成功、取消與失敗均影響登入結果。
   - Planner：`/api-plan`。Google 外部協定已由 research 界定，和本地 session 為同一登入整合責任，一次委派分析，不另外虛構可修改的 Google API。

3. `個人帳本持久化介面`
   - 端點類型：`PostgreSQL 資料庫端點`
   - 主要介面：帳號/session、旅行、分類、支出、幣別與歷史金額意義；關聯、索引、完整性約束及更新/刪除生命週期。
   - 需求原文依據：FR-003～015、018～020；跨裝置與重新登入後資料仍存在，金額精確、分類改名連動及使用中刪除阻擋不能僅靠畫面。
   - Planner：`/data-plan`。

### 分析流程的安排

#### Wave 1 — 已核可的 UI 基準

- 分析介面：`旅行記帳前端介面` → `/ui-plan`。
- 分析重點：保留已核可流程、錯誤/載入/空狀態、行動版及日期互動；區分設計稿、HTML 雛形與正式程式的完成程度。
- 安排理由：UI 分析與 review 已先行完成，本輪將其作為 API 所需能力的輸入，避免重新設計已核可畫面。
- 狀態：設計已 review；使用者於後續要求先回推 HTML，現已完成日期選擇器的可操作雛形與 Chromium 驗證，正式 React 元件仍待實作。

#### Wave 2 — API 契約

- 分析介面：`個人帳本與登入 API 介面` → `/api-plan`。
- 分析重點：按 UI/驗收案例定義請求、回應、金額與日期表示、分類命名規則、使用者隔離、session 及失敗處理；說明 Google 外部設定與測試替換的界線。
- 安排理由：先確定前後端共同遵守的行為，再讓資料模型承接；分類命名已於本輪答覆並回寫 spec，可據此定稿契約。

#### Wave 3 — 資料模型

- 分析介面：`個人帳本持久化介面` → `/data-plan`。
- 分析重點：承接 API 的資料形狀與操作，設計精確金額/日期、帳號隔離、外鍵、索引、分類刪除競爭及交易邊界；明確區分 Better Auth 管理資料與業務資料。
- 安排理由：本波依賴 Wave 2 的契約，不與其同時定稿，避免金額、欄位、錯誤與刪除語意各自推理。

#### Wave 4 — 跨產物對齊

- 分析介面：`旅行記帳前端介面` → `/ui-plan`；API/data owner 必要時校正自身產物。
- 分析重點：UI 所需欄位、統計、使用筆數、分類預設、清除日期/分類、錯誤及快取失效是否均有契約支援；列出雛形同步缺口。
- 安排理由：必須等 API/data 都有具體產物才能比對，不重啟視覺設計 review。

### 委派與交付控制

每次 handoff 皆包含：

- Plan package：`specs/plans/001-personal-travel-expenses`
- Truth root：`specs/truth`
- Truth delta：`specs/plans/001-personal-travel-expenses/truth-delta.md`
- 本波介面名稱、分析重點、前一波已完成的輸入。

`system-analysis` 只寫本 plan。`/api-plan` 與 `/data-plan` 分別維護 contracts/data，並經 `/truth-delta` 登記語意單元；`/ui-plan` 只維護本 plan 的 ui。首次建立應登記 ADD，不將尚未分析標成 NOOP。專案目前沒有 `.agents/constitution/`，不假設存在額外規則。

## 後續入口與檢查

- API/data/UI 對齊且待確認事項收斂後，才交 `/dsl-refine` 拆成前後端可執行 feature 與 DSL；之後 `/tasks` 排列 Setup、Foundational、測試及實作工作。
- Setup 須驗證 Google/Better Auth 適配、正式與隔離測試 DB migrations、固定幣別快照，以及第一條真實 HTTP/DB/瀏覽器流程。套件版本、部署與效能均不得宣稱已驗證。
- 自訂日期選擇器已完成 HTML 可操作同步及基本鍵盤/觸控模擬驗證；後續工作仍須完成正式 React 元件、WebKit、完整可存取性與實機驗證。
- 本輪是規劃，不開始應用程式實作，也不自動推進後續產品 phase。

## 本輪分析結果與交付狀態

| Wave | Planner | 結果 |
| --- | --- | --- |
| 1 | `/ui-plan` | 已承接使用者核可的五頁與自訂日期設計；日期後續已同步可操作 HTML，正式程式仍未實作。 |
| 2 | `/api-plan` → `/truth-delta` | 已建立 contracts/openapi.yaml、groups、components：9 個 path、17 個業務操作，其中 16 個需登入；8 筆 ADD。規則收在對應 description，不另設說明文件。 |
| 3 | `/data-plan` → `/truth-delta` | 已建立 data/data-model.dbml：8 表、7 關聯；9 筆 ADD。包含 3 張核心業務表、幣別目錄及 4 張框架管理的登入表；約束與交易規則收在各表 Note。 |
| 4 | `/ui-plan` 與 API/data owner 核對 | 已在 ui/ui-plan.md 列出畫面/契約對應、帳號快取、歷史位數、分頁筆數、未知結果與待同步項目。 |

本輪額外收斂分類命名：最多 30 個 Unicode code points、去除前後空白、同帳號名稱唯一、ASCII 英文不分大小寫；已回寫 spec、acceptance、research 與 UI plan。FR-017 的幣別來源待確認標記已依既有研究結果清理。這兩項是本輪相對於上一版的需求文件差異。

### 規劃驗證與限制

- Redocly CLI 2.75.0：OpenAPI lint 與 bundle 通過；另核對 17 個 operationId 唯一、所有外部/內部 `$ref` 可解析。lint 仍有兩項建議：尚未指定授權條款、公開幣別查詢未列 4xx；不自行替使用者選擇開源授權，也不為消除警告虛構錯誤流程。
- DBML 經 `@dbml/cli dbml2sql --postgres` 成功解析/匯出，核對 8 表與 7 關聯；匯出 SQL 僅為檢查用，並非可直接套用的 migration。模型 Note 的 CHECK、generated 欄、collation 與檔尾 app_trim 定義仍須落實到正式 migrations 並在 PostgreSQL 驗證。
- 規劃與 Markdown 引用檢查不等於真實服務測試。套件相容性、auth schema 生成、資料庫交易與瀏覽器 E2E 都由 Setup/後續任務承接。

**Readiness**：本輪系統/API/data 規劃已交付，可進入 `/dsl-refine`。目前沒有 interface features/DSL 或 tasks.md，不跳過它們直接實作。日期已依使用者要求先同步 HTML；分類新驗證等其餘雛形缺口與正式元件工作仍須由後續任務承接。

### 開啟 API 預覽

- 維護來源：`specs/truth/contracts/openapi.yaml` 與其 groups/components。支援本地多檔引用的工具可直接開啟來源。
- VS Code／Swagger 單檔匯入：在專案根目錄執行 `sh scripts/preview-openapi.sh`，開啟 `.cache/openapi/openapi.yaml`；網頁版開啟 `.cache/openapi/index.html`。
- 預覽檔自動產生且由既有 `.cache/` 忽略規則排除，不作第二份 truth，不手動維護。修改來源後重跑同一指令。
- Swagger Parser 已驗證來源及預覽檔。實際 Swagger UI 重現「只有根檔、缺少外部分檔位置」的 Resolver error；單檔預覽顯示全部 17 個操作，沒有 Resolver error。
