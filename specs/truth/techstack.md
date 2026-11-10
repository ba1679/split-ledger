# 技術堆疊總覽：旅行記帳與分帳工具

截至 2026-11-10 的採用技術。既有前後端、共用套件與測試已在工作區實作，版本由 package.json 與 pnpm lockfile 固定；Phase 1B 下列分帳方向已選定但尚未實作。

## 技術堆疊總覽

### 專案與執行環境

| 類別 | 採用技術 | 用途 |
| --- | --- | --- |
| 程式語言 | TypeScript strict mode | 前後端及共用純函式 |
| 執行環境 | Node.js 24 LTS | API、工具及測試 |
| Monorepo | pnpm workspace | apps/web、apps/api 與必要的 packages/shared |
| 版本管理 | 固定工具版本、pnpm lockfile | 可重現安裝；Setup 鎖定相容套件版本 |

### 前端

| 類別 | 採用技術 | 用途 |
| --- | --- | --- |
| UI | React + TypeScript | 旅行、支出與分類的互動介面 |
| 建置與路由 | Vite、React Router | SPA 開發、建置及頁面導航 |
| 伺服器資料 | TanStack Query + fetch | API 查詢、mutation、快取、載入/錯誤與變更後失效；登出清除帳號快取 |
| 局部狀態與樣式 | React 狀態、CSS | 表單草稿及響應式介面 |
| 裝置偏好 | localStorage | 保存上次選擇的可用分類；不得保存登入 secret |
| 對外組成 | 同 origin 的網頁及 /api | 開發代理及正式反向代理；後端獨立執行 |

### 前端樣式遷移決策（尚未實作）

| 類別 | 採用技術 | 用途 |
| --- | --- | --- |
| 樣式與設計值 | Tailwind CSS、CSS 自訂屬性、Vite 整合 | 以語意設計值與共用樣式逐步遷移現有介面；示範先確認 |
| 共用元件 | shadcn/ui 按需引入的本地元件 | 對齊既有外觀與互動，逐項驗證行為及無障礙 |
| 圖示 | lucide-react | 逐步取代自行繪製的圖示，統一樣式與語意 |

上述為本輪選定的遷移方向，尚未安裝或驗證；現行實作仍為前述 CSS。套件版本與相容性待實作確認，示範經使用者確認後才遷移其餘介面。

### 後端

| 類別 | 採用技術 | 用途 |
| --- | --- | --- |
| HTTP API | Fastify + TypeScript | 按功能組織路由、業務規則及查詢 |
| 契約與驗證 | JSON Schema、TypeBox、OpenAPI | 執行時驗證、型別與 API 文件 |
| 登入 | Better Auth Google provider、Fastify 整合 | Google 登入及 session 驗證 |
| Session | Better Auth + Drizzle PostgreSQL adapter、HttpOnly cookie | 資料庫保存 session；正式 HTTPS/Secure 與 trusted origins |
| 日誌 | Fastify 結構化日誌 | request ID、錯誤觀測及敏感資訊遮蔽 |

### 資料與幣別處理

| 類別 | 採用技術 | 用途 |
| --- | --- | --- |
| 資料庫 | PostgreSQL 18 | 帳號、旅行、支出、分類與 session 持久化 |
| 資料存取 | Drizzle ORM、node-postgres | 型別化 SQL 查詢 |
| 結構變更 | Drizzle Kit、SQL migrations | 可 review 及重建的 schema 歷史 |
| 原始與實付金額 | 最小單位整數、BigInt、PostgreSQL BIGINT | 保留原始金額；API 使用十進位字串並驗證範圍 |
| 幣別 | SIX ISO 4217 List One 固定快照 | 代碼與小數位數；數字 minor unit 條目，排除 N.A. |
| 快照基準 | 發布 2026-09-17，取樣 2026-11-04 | 178 個唯一代碼中 165 個具數字 minor unit；Setup 封存資料及來源 |
| 日期 | 日期字串與 PostgreSQL DATE | 支出及旅行日曆日期；新增支出預設裝置當地日期 |

### Phase 1B 分帳決策（已選定，尚未實作）

| 類別 | 採用技術 | 用途 |
| --- | --- | --- |
| 精確分攤 | TypeScript BigInt 約分有理數、packages/shared | 分子分母精確運算與有號淨額；不以有限小數取代循環份額 |
| 分數持久化與傳輸 | PostgreSQL NUMERIC 整數分子分母、十進位字串 | 保存結算調整；原始支出與成員集合重建份額；不以 SQL 除法生成近似權威值 |
| 債務簡化 | 直接債務圖、確定性淨額貪婪配對、筆數比較回退 | 每幣別保留淨額，付款筆數不增加；穩定 ID 排序，未宣稱全域最少 |
| 安排說明 | 後端確定性文字模板 | 三句內說明改道及筆數變化 |
| 付款取整 | BigInt 商餘數、還款與成對調整原子寫入 | 付款人當次決定取整，維持全體零和及原始公平份額 |
| 寫入一致性 | 旅行列 FOR UPDATE、READ COMMITTED、帳務 revision | 同旅行寫入序列化；超額與取整確認需核對最新版本 |
| 結算讀取 | REPEATABLE READ read-only snapshot | 同一份來源快照重建分攤、淨額與兩種安排 |
| 成員名稱 | 旅行成員統一命名空間、trim、ASCII 不分大小寫名稱鍵與唯一鍵 | owner 及啟用/停用同行者不重名；穩定 ID 關聯 |
| 資料演進 | 新增 SQL migration、既有 checksum/advisory lock | 回填 owner 成員與既有單人分攤，不改歷史金額 |

### 測試與驗證

| 類別 | 採用技術 | 用途 |
| --- | --- | --- |
| 前端 BDD techstack | Playwright Test + playwright-bdd | 前端 Gherkin E2E：瀏覽器 → API → 測試 PostgreSQL |
| 後端 BDD techstack | Playwright Test + playwright-bdd + APIRequestContext | 獨立後端 Gherkin E2E：HTTP API 與權威資料結果 |
| 規則單元測試 | Vitest | 金額解析、位數及加總等純函式 |
| 測試隔離 | 專用 PostgreSQL、案例/worker 隔離、正式 migrations | 可重現與可安全平行的測試 |
| 登入測試 | 受控外部身分、真實本地 session；獨立真實 Google 串接驗證 | 自動回歸保留 session/權限，清楚區分外部服務驗證 |
| 瀏覽器範圍 | 日常 Chromium；交付加入 WebKit、行動 viewport 及手動手機驗證 | 桌機與手機流程；模擬不代替實機 |
| 品質檢查 | TypeScript、ESLint、migrations 檢查 | 開發及自動回歸入口 |
| 程式碼排版 | Prettier、根設定及忽略清單 | 全專案手寫程式、測試與設定的格式整理與唯讀檢查；2 格縮排、單引號、分號、100 字元目標行寬 |
| 空行與整合 | ESLint Stylistic padding、eslint-config-prettier | 保留基本 lint 規則，固定 imports/函式/回傳的空行；關閉與 Prettier 衝突規則；其他邏輯分段依上下文判斷 |
| 耗時管理 | 按功能選取案例、隔離後平行、失敗 trace、冷/熱啟動量測 | 各輪實際測試結果與耗時保存於開發驗證紀錄，效能主張需獨立量測 |

### 本地環境

| 類別 | 採用技術 | 用途 |
| --- | --- | --- |
| 資料庫環境 | Docker Compose | 開發及測試 PostgreSQL；資料隔離 |
| 開發入口 | pnpm scripts | 啟動 web/api、驗證及測試；lint:fix 修正空行、format 整理排版、format:check 檢查格式 |

### 試用部署決策（尚未實作或驗證）

| 類別 | 採用技術 | 用途 |
| --- | --- | --- |
| 試用平台 | Railway 免費試用、Railway HTTPS 網址 | 兩人以測試資料驗證；不代表正式營運或保證免費持續運行 |
| 應用部署 | Node.js 24、Fastify 提供 Vite 靜態產物及同 origin `/api` | 單一公開服務；建置、SPA fallback 與正式啟動待驗證 |
| 試用資料庫 | Railway PostgreSQL 18、持久 volume、私有連線 | 測試資料持久化；重新部署及連線待驗證 |
| 試用資料還原 | PostgreSQL 邏輯備份與隔離還原驗證 | 測試資料保護與還原演練；正式環境另行規劃 |


## 本次開發不引入的技術

- Turborepo/Nx：先以 workspace scripts 管理，待量測需求再評估。
- 微服務、Kubernetes、Redis、訊息佇列：第一版未有使用需求。
- 即時匯率服務、瀏覽器浮點金額運算：本版保留原幣別，使用精確金額表示。
- Redux Toolkit / RTK Query 與 SSR 框架：伺服器資料由 TanStack Query 管理，局部狀態由 React 管理；後續依需求評估 Redux。
- 共編基礎設施及離線同步：後續產品階段再評估。
- Phase 1B 不引入浮點分攤、有限小數作權威份額、全域最少轉帳求解器或生成式 AI 結算說明服務。


正式部署供應商尚未確定；正式使用前需落實 HTTPS、資料備份/還原、OAuth 正式設定及 migration 發布流程。
