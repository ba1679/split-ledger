# 旅帳

個人旅行記帳：Google 登入、旅行、原幣別支出與跨旅行分類。Phase 1A 不包含分帳、換匯或離線同步。

## 本機開發

使用 `.node-version` 的 Node 版本與 `package.json` 的 pnpm 版本。

```sh
pnpm install --frozen-lockfile
cp .env.example .env
# 在 .env 設定隨機 BETTER_AUTH_SECRET（至少 32 字元）與 Google OAuth 憑證。
pnpm db:up
pnpm --filter @split-ledger/api dev
# 另一個終端機：
pnpm --filter @split-ledger/web dev
```

瀏覽 [本機網頁](http://127.0.0.1:5173)。API 在 3001；Vite 將 `/api` 代理到同一 origin。API 啟動時套用有 checksum 與交易保護的 migrations。

此工作區若已存在 `.env`，保留其內容，不要用範例覆蓋。Google OAuth 憑證由開發者在 `.env` 提供。此環境也可用 `sh scripts/pnpm.sh ...` 使用忽略的 `.cache/toolchain/` 本地工具鏈。

Google OAuth client 的授權 origin 使用 `APP_ORIGIN`，redirect URI 設為 `${APP_ORIGIN}/api/auth/callback/google`；本機預設為 `http://127.0.0.1:5173/api/auth/callback/google`。更換域名或 port 時同步更新 Google 與 `.env`，設定細節見 [Google provider 官方文件](https://better-auth.com/docs/authentication/google)。正式使用須配置 HTTPS；登入 secret、OAuth secret、cookie 或 token 不得提交。

## 程式碼排版

全專案程式碼、測試與設定檔採用已確認的分類 API 與分類表單排版風格。歷史規格、Markdown 文件、skills、幣別資料快照、資料庫 migrations、lockfile 及產生檔由 `.prettierignore` 排除。

Prettier 負責縮排與換行：2 格縮排、單引號、分號、100 字元目標行寬。ESLint 保留現有基本檢查，並要求 imports 與主體之間、函式之間、回傳之前留空行。其他邏輯分段由整理時依驗證、資料處理、回傳等步驟判斷；相關變數放一起，不要求每一行之間都留白。

```sh
# 修正空行，再整理格式
pnpm lint:fix
pnpm format

# 檢查全專案格式與 lint 規則
pnpm format:check
pnpm lint
```

設定集中在 `.prettierrc.json`、`.prettierignore` 與 `eslint.config.js`。Prettier 與 ESLint 分開執行，並使用 `eslint-config-prettier` 關閉衝突規則，做法依循 [Prettier 官方整合說明](https://prettier.io/docs/integrating-with-linters)。本輪需求、技術決策與驗證結果見 [002-code-formatting](specs/plans/002-code-formatting/spec.md)。

## 驗證

```sh
pnpm typecheck
pnpm exec tsc -p tsconfig.tests.json
pnpm lint
pnpm build
pnpm test:unit
pnpm test:support
pnpm test:web-support
pnpm test:ui-quality
pnpm test:smoke
pnpm test:api
pnpm test:web --project chromium
pnpm test:web --project webkit
```

BDD 使用正式 migrations、每個 worker 的獨立 PostgreSQL、真實 API/session 與瀏覽器。Google 自動測試僅替換外部 Google HTTP 回應；真實 Google 登入及手機實機驗證另行執行。測試資料庫與開發資料庫分開，測試不使用開發帳本資料。

目前實作狀態與驗證證據見 [實作紀錄](docs/development/implementation.md)，任務進度見 [tasks.md](specs/plans/001-personal-travel-expenses/tasks.md)。

UI 核對方式、修正與瀏覽器驗證限制見 [UI 品質審查](docs/development/ui-quality-review.md)。
