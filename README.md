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
