# Phase 0 技術堆疊總結：旅行記帳與分帳工具

截至 2026-11-04 的採用決策。本專案尚在設計階段，下列是後續實作依據，並非已安裝或已部署的清單。

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
| 金額 | 最小單位整數、BigInt、PostgreSQL BIGINT | 精確加總；API 使用十進位字串並驗證範圍 |
| 幣別 | SIX ISO 4217 List One 固定快照 | 代碼與小數位數；數字 minor unit 條目，排除 N.A. |
| 快照基準 | 發布 2026-09-17，取樣 2026-11-04 | 178 個唯一代碼中 165 個具數字 minor unit；Setup 封存資料及來源 |
| 日期 | 日期字串與 PostgreSQL DATE | 支出及旅行日曆日期；新增支出預設裝置當地日期 |

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
| 耗時管理 | 按功能選取案例、隔離後平行、失敗 trace、冷/熱啟動量測 | 實作後建立基準；目前沒有實測時間 |

### 本地環境

| 類別 | 採用技術 | 用途 |
| --- | --- | --- |
| 資料庫環境 | Docker Compose | 開發及測試 PostgreSQL；資料隔離 |
| 開發入口 | pnpm scripts | 啟動 web/api、驗證及測試 |

## 本次開發不引入的技術

- Turborepo/Nx：先以 workspace scripts 管理，待量測需求再評估。
- 微服務、Kubernetes、Redis、訊息佇列：第一版未有使用需求。
- 即時匯率服務、瀏覽器浮點金額運算：本版保留原幣別，使用精確金額表示。
- Redux Toolkit / RTK Query 與 SSR 框架：伺服器資料由 TanStack Query 管理，局部狀態由 React 管理；後續依需求評估 Redux。
- 共編基礎設施及離線同步：後續產品階段再評估。

部署供應商尚未選定，正式使用前需落實 HTTPS、資料備份/還原、OAuth 正式設定及 migration 發布流程。具體套件版本由 Setup 驗證相容性並鎖定。
