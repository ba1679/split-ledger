# Truth Delta: 001-personal-travel-expenses

**Plan Package**: `specs/plans/001-personal-travel-expenses`
**Truth Root**: `specs/truth`

## /technical-research

| 動作 | Truth 規格 | 改動摘要 | 原因 |
| --- | --- | --- | --- |
| ADD | `specs/truth/techstack.md` -> 專案與執行環境 | TypeScript strict、Node 24 LTS 與 pnpm monorepo。 | 使用者選擇 TypeScript 與 monorepo。 |
| ADD | `specs/truth/techstack.md` -> 前端 | React、Vite、React Router、TanStack Query + fetch、React 局部狀態與裝置分類偏好。 | 支援手機及電腦的記帳流程；使用者於研究 review 時選擇 TanStack Query。 |
| ADD | `specs/truth/techstack.md` -> 後端 | Fastify、TypeBox/JSON Schema、OpenAPI。 | 獨立 API 及輸入、權限的權威驗證。 |
| ADD | `specs/truth/techstack.md` -> 後端/登入與 Session | Better Auth Google provider、Drizzle adapter 及資料庫 session cookie。 | 符合 Google 登入與跨裝置需求。 |
| ADD | `specs/truth/techstack.md` -> 資料與幣別處理/資料庫 | PostgreSQL 18、Drizzle、SQL migrations。 | 練習關聯、約束與資料結構變更。 |
| ADD | `specs/truth/techstack.md` -> 資料與幣別處理/金額與幣別 | BigInt/BIGINT 最小單位、字串傳輸及固定 SIX ISO 4217 快照。 | 避免金額精度與不同幣別規則不一致。 |
| ADD | `specs/truth/techstack.md` -> 測試與驗證 | 各端獨立 Playwright + playwright-bdd E2E、Vitest 單元測試及耗時量測。 | 使用者確認的 BDD 工具和測試策略。 |
| ADD | `specs/truth/techstack.md` -> 本地環境與排除技術 | Docker Compose、pnpm scripts；暫不引入任務快取平台及共編同步。 | 保持第一版環境可重建且範圍明確。 |

## /api-plan

| 動作 | Truth 規格 | 改動摘要 | 原因 |
| --- | --- | --- | --- |
| ADD | `specs/truth/contracts/openapi.yaml` -> 業務 API 根目錄與 session scheme | 新增 9 個 path 的分檔索引、帳號/trips/expenses/categories/currencies tags 與固定名稱 cookie security scheme。 | Phase 1A 需同一份可檢查的前後端契約與可辨識登入邊界。 |
| ADD | `specs/truth/contracts/groups/account.yaml` -> `GET /api/me` | 新增已驗證帳號的最小投影；Google OAuth 與 session 仍由 Better Auth 管理。 | 前端需隔離帳號快取及裝置分類預設，不能自行信任 owner id。 |
| ADD | `specs/truth/contracts/groups/trips.yaml` -> 旅行建立、列表、單筆與修改 | 新增名稱、各自選填/可清除日期、日期先後驗證、支出總筆數與分頁契約。 | 支援跨裝置旅行帳本與補填日期。 |
| ADD | `specs/truth/contracts/groups/expenses.yaml` -> 支出 CRUD 與分幣別總額 | 新增精確金額字串、歷史 minorUnit、分類可清除、精確總筆數及各幣別統計。 | 支援多幣別紀錄、修改/刪除後正確統計，不做換匯。 |
| ADD | `specs/truth/contracts/groups/categories.yaml` -> 分類建立、查詢、改名、刪除 | 新增跨旅行分類、使用筆數、同帳號名稱唯一、使用中刪除衝突。 | 使用者確認 30 字、ASCII 英文不分大小寫與跨旅行分類生命週期。 |
| ADD | `specs/truth/contracts/groups/currencies.yaml` -> `GET /api/currencies` | 新增固定 SIX ISO 4217 快照的代碼、名稱及 minorUnit 目錄。 | 前端自動完成與前後端金額位數一致。 |
| ADD | `specs/truth/contracts/components/schemas/shared.yaml` -> 金額、日期與錯誤語意 | 明定字串金額、日曆日期、404 擁有者隔離、409 分類與 UUID 衝突、403 來源拒絕，以及 401/400 等錯誤。 | 避免浮點、時區、權限與 CSRF 語意分歧。 |
| ADD | `specs/truth/contracts/openapi.yaml` -> info.description；`components/` 與 `groups/` -> 對應 description | 明定 UUID 查證未確認建立、歷史位數精確加總、session 配置、Origin/JSON 防護與嚴格解析；依使用者要求將額外說明文件整併至契約，語意不變。 | 必要規則直接隨操作/欄位呈現，無需跨說明文件查找。 |

## /data-plan

| 動作 | Truth 規格 | 改動摘要 | 原因 |
| --- | --- | --- | --- |
| ADD | `specs/truth/data/data-model.dbml` -> `Table auth.user` | 新增 Better Auth 使用者投影，以 text id 供業務 owner 參照。 | Google 登入後的擁有者識別須能持久化並與業務 UUID 共存。 |
| ADD | `specs/truth/data/data-model.dbml` -> `Table auth.session` | 新增資料庫 session 與到 user 的關聯；token 僅屬 auth 邊界。 | 支援跨裝置登入及後端權威身分判定。 |
| ADD | `specs/truth/data/data-model.dbml` -> `Table auth.account`、`Table auth.verification` | 新增 Google provider 帳號關聯及框架驗證資料。 | Better Auth 核心 schema 需承接 Google OAuth，實際欄位待固定版本 generate 驗證。 |
| ADD | `specs/truth/data/data-model.dbml` -> `Table trips` | 新增有 owner 的旅行、各自可空日期與穩定列表索引。 | 支援本人帳本及日期補填。 |
| ADD | `specs/truth/data/data-model.dbml` -> `Table categories` | 新增跨旅行分類、generated 名稱鍵與同 owner 唯一性。 | 分類可改名且同帳號 30 字/英文不分大小寫的重名規則須可被資料庫保護。 |
| ADD | `specs/truth/data/data-model.dbml` -> `Table currencies` | 新增固定 SIX 目錄、可選狀態、來源日期與目前小數位數。 | 金額輸入與 API 幣別清單需要同一可封存來源。 |
| ADD | `specs/truth/data/data-model.dbml` -> `Table expenses` | 新增正數 BIGINT 最小單位、歷史 minor_unit、原幣別及 DATE 支出日期。 | 精確多幣別統計及歷史金額解讀不能依賴浮點或目前目錄。 |
| ADD | `specs/truth/data/data-model.dbml` -> `Ref expenses.(owner_id, trip_id/category_id)` | 新增複合外鍵與分類刪除 RESTRICT，支出只能連到本人旅行/分類。 | 防跨帳號關聯並由資料庫保證使用中分類不可刪。 |
| ADD | `specs/truth/data/data-model.dbml` -> Project/Table Note 與 migration 註解 | 明定日期/分類/金額約束、併發衝突映射、row lock、計數/總額、trim 與快照更新；依使用者要求整併額外說明文件，語意不變。 | 約束與交易直接在模型內承接，供 migrations 與後續 BDD 使用。 |

## /dsl-refine

| 動作 | Truth 規格 | 改動摘要 | 原因 |
| --- | --- | --- | --- |
