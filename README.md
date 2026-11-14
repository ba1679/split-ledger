# 旅帳 Split Ledger

一個為朋友出遊設計的旅行記帳與分帳工具。由帳本擁有者記錄旅程、個人與共同支出，系統依原始幣別計算每個人的應收應付，並協助追蹤還款與結算。

這也是一個全端與資料庫實作專案：從需求、驗收情境、API 與資料模型，到實作、測試及部署驗證，都保留在 repository 中，方便追溯設計決策。

## 功能介紹

- **旅行與支出管理**：使用 Google 帳號登入，建立旅行，新增、修改或刪除支出；分類可在自己的不同旅行間共用。
- **同行者管理**：為每趟旅行新增同行者，修改名稱或停用已使用的成員，同時保留歷史紀錄。
- **共同支出**：指定一位付款人及一位以上分攤者，平均分攤支出；付款人也可以不參與分攤。
- **分幣別結算**：查看成員的應收應付及付款安排，並可切換簡化付款，減少轉帳筆數。不同幣別分開計算，不進行匯率換算。
- **還款追蹤**：記錄實際付款和部分還款，依最新紀錄更新餘額及付款安排。
- **跨裝置介面**：支援桌面與手機尺寸；登入後可存取同一份帳本。

例如，一筆 JPY 100 的支出由三人平均分攤時，系統內部以精確的 `100/3` 計算每人的份額，畫面顯示為 JPY 33.33。計算不使用已四捨五入的畫面金額，避免反覆加總造成誤差。

目前由帳本擁有者單獨登入及管理，同行者不需要帳號，也不能自行查看或編輯。多人共同編輯、匯率換算、自訂分攤比例及離線同步尚未提供；產品方向見[產品路線圖](docs/product-roadmap.md)。

## 技術架構

| 範圍 | 技術與職責 |
| --- | --- |
| 前端 | React、TypeScript、Vite、React Router、TanStack Query；提供旅行、支出及結算介面 |
| 後端 | Fastify、TypeBox、Better Auth；處理 API、Google 登入、資料驗證及帳本存取 |
| 資料 | PostgreSQL、Drizzle ORM；儲存帳本資料，以 migration 管理資料結構 |
| 共用邏輯 | pnpm workspace 中的 `packages/shared`；集中金額、有理數與分帳計算 |
| 測試 | Vitest、Playwright、playwright-bdd；涵蓋計算不變量、API 及瀏覽器情境 |

開發環境中，Vite 將 `/api` 代理至 Fastify。正式建置後由 API 提供前端靜態檔案，讓網頁與 API 使用同一個 origin。

### 值得關注的設計

- **精確金額計算**：分攤與結算使用有理數保留精確值，顯示格式化與內部計算分開處理；各幣別獨立計算。
- **歷史資料與身分**：同行者以穩定識別關聯支出與還款，改名不改變歷史關聯；已使用的同行者可停用並保留紀錄。
- **可追溯的付款安排**：簡化付款只改變建議安排，不改寫原始支出與還款；支出或付款變動後重新計算餘額。
- **資料隔離與資料庫演進**：API 依帳號及旅行範圍限制存取；啟動時執行具 checksum 與交易保護的 migrations，並保留既有個人支出的相容性。

## 快速開始

### 事前準備

- Node.js **24.22.2**（見 [.node-version](.node-version)）與 pnpm **11.25.0**（見 [package.json](package.json)）
- Docker 與 Docker Compose，用來啟動 PostgreSQL
- 一組 Google OAuth client ID 與 secret

1. 安裝依賴並建立本機環境設定：

   ```sh
   pnpm install --frozen-lockfile
   cp .env.example .env
   ```

   若已有 `.env`，請保留現有內容，不要覆蓋。

2. 編輯 `.env`：將 `BETTER_AUTH_SECRET` 設為至少 32 個字元的隨機值，並設定 `GOOGLE_CLIENT_ID` 與 `GOOGLE_CLIENT_SECRET`。預設資料庫連線、`APP_ORIGIN` 和 API port 已列於 [.env.example](.env.example)。

   在 Google OAuth 設定中，將授權 JavaScript origin 設為 `http://127.0.0.1:5173`，redirect URI 設為 `http://127.0.0.1:5173/api/auth/callback/google`。若變更網址或 port，請同步修改 `APP_ORIGIN` 與 Google 設定。設定細節參考 [Better Auth Google provider 文件](https://better-auth.com/docs/authentication/google)。

3. 啟動資料庫與應用程式：

   ```sh
   pnpm db:up
   pnpm --filter @split-ledger/api dev
   ```

   另開一個終端機：

   ```sh
   pnpm --filter @split-ledger/web dev
   ```

4. 開啟 [http://127.0.0.1:5173](http://127.0.0.1:5173)，使用 Google 登入。API 預設在 port 3001，啟動時會套用 migrations。

結束開發時可用 `pnpm db:down` 停止容器。開發資料庫使用 Docker volume；測試資料庫使用獨立容器與暫存儲存空間。請勿將 `.env` 或 OAuth 憑證提交至 repository。

## 測試與品質檢查

執行 API 或瀏覽器測試前，先執行 `pnpm db:up`；瀏覽器測試首次執行時需安裝 Playwright 瀏覽器：

```sh
pnpm exec playwright install chromium webkit
```

```sh
# 靜態檢查與建置
pnpm typecheck
pnpm exec tsc -p tsconfig.tests.json
pnpm lint
pnpm format:check
pnpm build

# 核心計算與驗收情境
pnpm test:unit
pnpm test:api
pnpm test:web --project chromium
pnpm test:web --project webkit

# 支援、介面與部署整合檢查
pnpm test:support
pnpm test:web-support
pnpm test:ui-quality
pnpm test:deployment
```

BDD 情境透過真實 API、session、正式 migrations 與隔離的測試資料庫執行；瀏覽器情境涵蓋 Chromium 與 WebKit。自動化登入測試替換外部 Google HTTP 回應，因此不等同真實 Google 登入驗證。測試資料庫位於 port 54330，與開發資料庫分開；測試會建立及移除獨立的 worker 資料庫。

分帳功能的測試結果、資料遷移及驗證限制記錄於 [Phase 1B 驗證紀錄](specs/plans/005-owner-managed-trip-splitting/validation.md)。其中瀏覽器視窗尺寸測試不代表已在實體手機或輔助科技上完成驗證。

## 開發方式與專案結構

專案以需求和驗收情境驅動開發：先整理功能範圍與使用者情境，接著設計 API、資料模型與介面，再將情境細化為前後端可執行的 Gherkin／DSL，透過實作與測試逐步驗證。規劃文件保留每次迭代的決策，`specs/truth/` 則集中目前的契約、資料與行為規格。

```text
apps/web/             React 前端與瀏覽器測試
apps/api/             Fastify API、資料庫 migrations 與 API 測試
packages/shared/      共用金額及分帳計算
specs/truth/          API、資料模型、前後端 feature 與 DSL
specs/plans/          各次需求、設計、任務及驗證紀錄
specs/ui-baseline/    已核對產品現況的設計稿、共用元件、預覽與版本索引
docs/                 產品路線圖與開發文件
```

想快速了解一次完整迭代，可從 [Phase 1B 需求](specs/plans/005-owner-managed-trip-splitting/spec.md)、[系統分析](specs/plans/005-owner-managed-trip-splitting/plan.md)、[驗證紀錄](specs/plans/005-owner-managed-trip-splitting/validation.md) 開始；後續使用者回饋與規則修正見[回饋紀錄](specs/plans/005-owner-managed-trip-splitting/feedback-2026-11-11.md)。

### Skills 客製化調整

本專案使用 Waterball 的 AI BDD skills，並在安裝後依實作經驗補強以下流程：

- **重構與確認關卡**：讓任務規劃支援純重構、工程交付及明確的人工確認，無需變更 DSL 時可沿用既有回歸測試。
- **依 UI 影響分流**：區分沒有 UI 影響、沿用既有呈現的資料／行為變更，以及需要設計的新介面或版面變更；需要設計時由 `/ui-plan` 交付 `.pen`、桌機／手機預覽與受影響範圍的確認。
- **固定現況基準**：以產品 commit、畫面 ID 與同版預覽引用已核對的 baseline；新提案留在各 plan 的 `ui/`，產品驗收後才回填現況，保留舊版本的有效確認與引用。
- **畫布三區管理**：同一份 `.pen` 分成「版本與索引」「共用元件庫」「既有產品畫面」三個具名區域。元件集中定義、畫面以實例引用；產品畫面依功能、裝置與狀態分組。新增 baseline 同步更新索引，整理時保留節點 ID、元件引用及已確認的畫面呈現。
- **按需選用 prototype**：由尚待回答的互動問題決定是否製作點擊連線或局部程式原型；設計與註記足夠時可不製作。選用時才追蹤原型版本、操作證據與決策，不將完整 prototype 當成所有開發的前置條件。
- **畫面驗收**：任務須引用所有實際影響畫面的設計，先比對代表畫面，再逐項記錄設計與產品的差異，避免僅以功能測試通過作為完成依據。
- **低記憶體執行**：加入 16GB 模式，重用代理、限制重型工作與測試並行度，保留獨立審查及完整驗證範圍。
- **跨 session 交接**：在明確 checkpoint 保存進度、版本、待跑驗證與設計確認紀錄，支援分階段續跑、舊任務補驗及獨立後端先行。

客製化規則與模板位於 `.agents/skills/`，調整背景及驗證紀錄保留於 `docs/skill-engineering/`。

設計流程見 [/ui-plan](.agents/skills/ui-plan/SKILL.md)；現有畫面與共用元件的開發參考入口見 [UI baseline 索引](specs/ui-baseline/README.md)。

## 線上試用

[Railway 試用版](https://app-production-ca12.up.railway.app/)是先前個人記帳階段的部署紀錄，未確認包含目前的分帳功能，也不保證持續可用。部署設定與限制見[操作手冊](specs/plans/004-railway-trial-deployment/runbook.md)及[驗證紀錄](specs/plans/004-railway-trial-deployment/validation.md)；請勿將試用版視為正式資料的長期保存服務。
