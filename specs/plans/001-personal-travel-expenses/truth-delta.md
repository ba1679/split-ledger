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

| MODIFY | `specs/truth/contracts/components/schemas/shared.yaml` -> `MoneyAmount` | TWD 新送入金額僅允許整數字串，保留 ISO 的二位儲存及輸出。 | 使用者確認台幣輸入只用整數。 |

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
| ADD | `specs/truth/features/backend/account/accounts-and-access.feature` -> 帳號、未登入、隔離與跨工作階段 Rule | 新增帳號投影、未完成登入拒絕、他人旅行與分類不可讀，以及同帳號跨裝置讀取案例。 | 承接登入與帳本擁有者驗收。 |
| ADD | `specs/truth/features/backend/account/dsl.md` -> 帳號查詢與隔離句型 | 定義 session、HTTP 回應、資料庫擁有者與再讀驗證。 | 後端案例需驗權威身分與資料隔離。 |
| ADD | `specs/truth/features/backend/trips/trip-creation-and-dates.feature` -> 可選日期與更新 Rule | 新增無日期、單端日期、反序拒絕與合法補填案例。 | 承接旅行建立及日期順序驗收。 |
| ADD | `specs/truth/features/backend/trips/dsl.md` -> 旅行建立與日期句型 | 定義建立或修改請求、日期落地、拒絕時原值不變及再讀。 | 讓日期驗證可由 HTTP 與資料庫共同證明。 |
| ADD | `specs/truth/features/backend/expenses/expenses-and-totals.feature` -> 支出、金額與總額 Rule | 新增原幣別與旅行外日期、幣別分組、修改/刪除重算、金額驗證、未分類及跨工作階段讀取案例。 | 承接多幣別個人支出驗收。 |
| ADD | `specs/truth/features/backend/expenses/dsl.md` -> 支出保存、修改、刪除與查詢句型 | 定義支出請求、權威金額與分類狀態、總額再讀及拒絕時資料不變。 | 防止只依回應或畫面判定支出已保存。 |
| ADD | `specs/truth/features/backend/categories/categories-across-trips.feature` -> 分類生命週期與名稱 Rule | 新增跨旅行引用、改名、使用中刪除拒絕、解除關聯、空白/長度/重名及帳號隔離案例。 | 承接分類驗收及已確認的 30 字命名規則。 |
| ADD | `specs/truth/features/backend/categories/dsl.md` -> 分類建立、改名、刪除與關聯句型 | 定義分類 HTTP 操作、資料庫識別與關聯、衝突及失敗不變驗證。 | 分類改名與刪除需以權威關聯確認。 |
| ADD | `specs/truth/features/backend/currencies/available-currencies.feature` -> 可用幣別 Rule | 新增 JPY、USD 小數位數的目錄案例。 | 金額輸入與驗證需共用固定幣別來源。 |
| ADD | `specs/truth/features/backend/currencies/dsl.md` -> 幣別目錄句型 | 定義公開目錄查詢及封存資料交叉驗證。 | 確保位數不由測試或前端猜測。 |
| ADD | `specs/truth/features/backend/dsl.md` -> 已登入帳號共用 Given | 新增跨旅行與分類模組共用的有效 session 準備句型。 | 同一登入安排在兩個模組有相同契約與唯一權威位置。 |
| ADD | `specs/truth/features/frontend/auth/google-login-and-account-isolation.feature` -> 登入與帳號隔離 Rule | 新增完成/未完成登入及換帳號後的可見資料案例。 | 承接使用者可觀察的登入與個人資料邊界。 |
| ADD | `specs/truth/features/frontend/auth/dsl.md` -> 登入畫面與工作階段句型 | 定義受控登入安排、頁面操作與帳號來源驗證。 | 前端測試需確認畫面與實際帳號一致。 |
| ADD | `specs/truth/features/frontend/trips/trip-creation-and-dates.feature` -> 旅行表單與日期 Rule | 新增選填日期、建立、補填與反序日期提示案例。 | 承接手機與桌機的旅行操作。 |
| ADD | `specs/truth/features/frontend/trips/dsl.md` -> 旅行頁面與表單句型 | 定義頁面安排、日期操作、保存結果與權威資料核對。 | 讓旅行 UI 驗收可由瀏覽器測試落地。 |
| ADD | `specs/truth/features/frontend/expenses/expense-recording-and-totals.feature` -> 支出輸入與總額 Rule | 新增日期預設、幣別位數、負號/零元限制、保存與分幣別呈現案例。 | 承接支出表單及統計的可觀察行為。 |
| ADD | `specs/truth/features/frontend/expenses/pagination-and-save-outcomes.feature` -> 分頁與未知保存結果 Rule | 新增載入更多後總額維持、查證建立結果與保留草稿案例。 | 承接 UI plan 的分頁及未知結果處理。 |
| ADD | `specs/truth/features/frontend/expenses/dsl.md` -> 支出表單、列表與保存句型 | 定義瀏覽器操作、伺服器資料安排、精確金額顯示與保存狀態驗證。 | 前端不能只以提示文字推定已保存。 |
| ADD | `specs/truth/features/frontend/categories/category-management-and-device-default.feature` -> 分類管理與裝置偏好 Rule | 新增跨旅行分類、改名、刪除衝突、可用分類及裝置預選案例。 | 承接分類可選與本機上次選擇驗收。 |
| ADD | `specs/truth/features/frontend/categories/dsl.md` -> 分類管理與預選句型 | 定義分類頁操作、權威分類清單與裝置偏好驗證。 | 區分伺服器分類資料和本機預選行為。 |
| ADD | `specs/truth/features/frontend/dsl.md` -> `When: 使用者開啟新增支出表單` | 新增分類與支出模組共用的開啟支出表單句型。 | 同一畫面操作在介面根維持單一權威位置。 |

| MODIFY | `specs/truth/features/backend/expenses/expenses-and-totals.feature` -> 台幣輸入拒絕小數 Rule | 新增 TWD 小數輸入拒絕案例。 | 承接使用者確認的整數輸入規則。 |
| MODIFY | `specs/truth/features/backend/expenses/dsl.md` -> TWD 8000 保存與小數拒絕句型 | 修正 TWD 保存為 minorUnit 2、800000 最小單位，並新增小數拒絕句型。 | 與 ISO 資料模型及產品輸入規則一致。 |
| MODIFY | `specs/truth/features/frontend/expenses/expense-recording-and-totals.feature` -> 台幣輸入 Rule | 新增輸入時阻擋 TWD 小數點案例。 | 承接使用者確認的整數輸入規則。 |
| MODIFY | `specs/truth/features/frontend/expenses/dsl.md` -> TWD 金額輸入 Given | 新增 TWD 表單安排句型。 | 支援 TWD 整數輸入案例。 |

## 本輪 TWD 決策補充

使用者確認 TWD 輸入僅允許整數；不改 SIX 快照的 TWD minorUnit=2 或資料儲存規則。`/api-plan` 的 `MoneyAmount` 與 `/dsl-refine` 的前後端支出 feature/DSL 已更新，TWD 8000 儲存為 800000 最小單位。`/data-plan` 的資料模型無語意變更。
