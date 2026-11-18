# 技術堆疊總覽：旅行記帳與分帳工具

截至 2026-11-13 的採用技術。既有前後端、共用套件、Phase 1B 分帳模組與測試已在工作區實作，版本由 package.json 與 pnpm lockfile 固定；下列「旅行生命週期、圖片與等待回饋」為已選定、尚未在產品實作的新技術方向，不代表已部署或驗收。

## 技術堆疊總覽

### 專案與執行環境

| 類別 | 採用技術 | 用途 |
| --- | --- | --- |
| 程式語言 | TypeScript strict mode | 前後端及共用純函式 |
| 執行環境 | Node.js 24 LTS | API、工具及測試 |
| Monorepo | pnpm workspace | apps/web、apps/api 與必要的 packages/shared |
| 版本管理 | 固定工具版本、pnpm lockfile | 已鎖定相容套件版本，支援可重現安裝 |

### 前端

| 類別 | 採用技術 | 用途 |
| --- | --- | --- |
| UI | React + TypeScript | 旅行、支出與分類的互動介面 |
| 建置與路由 | Vite、React Router | SPA 開發、建置及頁面導航 |
| 伺服器資料 | TanStack Query + fetch | API 查詢、mutation、快取、載入/錯誤與變更後失效；登出清除帳號快取 |
| 局部狀態與樣式 | React 狀態、Tailwind CSS、CSS 自訂屬性及必要的客製 CSS | 表單草稿、共用設計值及響應式介面 |
| 裝置偏好 | localStorage | 保存上次選擇的可用分類；不得保存登入 secret |
| 對外組成 | 同 origin 的網頁及 /api | 開發由 Vite 代理；試用部署由 Fastify 同時提供靜態網頁與 API |

### 前端設計系統（已完成遷移）

| 類別 | 採用技術 | 用途 |
| --- | --- | --- |
| 樣式與設計值 | Tailwind CSS、CSS 自訂屬性、Vite 整合 | design-system.css 集中品牌值，styles/index.css 載入必要頁面與元件 CSS |
| 共用元件 | shadcn/ui 本地 Button、Input | 已用於登入、旅行、支出、分類及共用操作 |
| 客製互動 | FormDialog、DateField、SearchCombo | 因核心互動客製需求採自製，內部組合共用 Input 與圖示 |
| 圖示 | lucide-react | 現有介面已使用套件圖示，自行繪製圖示已移除 |

設計系統已於 2026-11-09 完成遷移與 Chromium 行為、鍵盤、響應式及基本無障礙自動檢查；不維護截圖式視覺回歸。完整人工輔助工具檢查仍待驗證。後續部署驗證另完成 Linux WebKit 回歸，手機操作由使用者回報通過。

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
| 快照基準 | 發布 2026-09-17，取樣 2026-11-04 | 已封存資料及來源；178 個唯一代碼中 165 個具數字 minor unit |
| 日期 | 日期字串與 PostgreSQL DATE | 支出及旅行日曆日期；新增支出預設裝置當地日期 |

### Phase 1B 分帳技術（既有程式已落地）

| 類別 | 採用技術 | 用途 |
| --- | --- | --- |
| 精確分攤 | TypeScript BigInt 約分有理數、packages/shared | 分子分母精確運算與有號淨額；不以有限小數取代循環份額 |
| 分數持久化與傳輸 | PostgreSQL NUMERIC 整數分子分母、十進位字串 | 保存結算調整；原始支出與成員集合重建份額；不以 SQL 除法生成近似權威值 |
| 債務簡化 | 直接債務圖、確定性淨額貪婪配對、筆數比較回退 | 每幣別保留淨額，付款筆數不增加；穩定 ID 排序，未宣稱全域最少 |
| 安排說明 | 後端確定性文字模板 | 三句內說明改道及筆數變化 |
| 結清實付與差額 | 正數實付、精確有理數差額；不足額僅原子記錄獨立還款，保留可支付欠款 | 2026-11-11 使用者修正：只免除不足一個現行最小貨幣單位的尾差；達一個單位以上必須部分還款。實付預填未付額並允許修改；完整結清仍以成對調整維持零和，不因超付反轉債務 |
| 個人總花費 | 同一唯讀快照以 BigInt 有理數加總 owner 參與的支出份額 | 不以付款人代付額或還款淨額代替消費；所有分頁的支出均納入，先精確加總再呈現，保留既有全旅行 totals 的預設 API 行為 |
| 寫入一致性 | 旅行列 FOR UPDATE、READ COMMITTED、帳務 revision | 同旅行寫入序列化；結清核對安排版本，獨立部分還款的超額確認核對最新版本 |
| 結算讀取 | REPEATABLE READ read-only snapshot | 同一份來源快照重建分攤、淨額與兩種安排 |
| 成員名稱 | 旅行成員統一命名空間、trim、ASCII 不分大小寫名稱鍵與唯一鍵 | owner 及啟用/停用同行者不重名；穩定 ID 關聯 |
| 資料演進 | 新增 SQL migration、既有 checksum/advisory lock | 回填 owner 成員與既有單人分攤，不改歷史金額 |

### 旅行生命週期、圖片與等待回饋（已選定，尚未實作）

| 類別 | 採用技術 | 用途 |
| --- | --- | --- |
| 旅行垃圾桶 | PostgreSQL nullable 刪除時間、生命週期版本、owner scoped active/trash 查詢 | 保留整趟帳務供復原；一般帳本與子資源拒絕垃圾桶旅行讀寫，不自動到期清除 |
| 生命週期寫入 | 既有旅行列 FOR UPDATE 鎖序、PostgreSQL 交易 | 移入／復原／purge／圖片提交與帳務 writer 序列化；圖片解碼在交易外，提交前重驗狀態與版本 |
| 整趟永久刪除 | 專用 DB purge routine、交易內 owner/trip context 與精確 trigger DELETE 例外 | 依 FK 順序清除專屬資料及圖片；其他歷史刪改保護延續，失敗完整回滾，不全域關閉 trigger |
| 結果查證與去重 | 持久 operation UUID／預期版本、最小操作收據與已刪旅行 ID tombstone | 防遺失回應、過期重送覆蓋新意圖及舊建立重試復活旅行；不保存被清除的圖片或帳務內容 |
| 圖片上傳 | Fastify、`@fastify/multipart 10.1.8`、瀏覽器 FormData/fetch | 限單一 image file part、10 MiB、完整 parts／truncated／abort 檢查及請求總量／時間限制；保留 Origin、session 與 owner 檢查 |
| 圖片輸入政策 | 靜態 JPEG／PNG／WebP；最多 10,485,760 bytes、25,000,000 px、單邊 16,384 px | 後端實際解碼驗證；拒絕動畫／多頁、HEIC／HEIF、AVIF、GIF、SVG、TIFF、PDF，不依賴 MIME 或副檔名作權威 |
| 圖片處理 | `sharp 0.35.5` 預編譯 binary、EXIF 方向校正、sRGB 與 metadata 移除 | 原比例不放大 WebP；最大邊／quality 依序 1200/80、960/75、640/70，採首個不超過 512 KiB 結果；每 instance 一個工作、有限 timeout |
| 圖片保存 | 獨立一對一 PostgreSQL bytea、Drizzle customType/Buffer、DB 長度限制 | 每趟僅保存目前縮圖及中繼資料，最大 524,288 bytes；原圖不持久化，更換／恢復預設／purge 與 DB 同交易，清單不選 bytes |
| 私有圖片讀取 | 同 origin session 驗證的 binary API、縮圖版本、private no-store、nosniff | 每次驗 owner 與旅行狀態；沒有公開媒體 URL；垃圾桶只經專用 scope 讀辨識資訊，換帳號清除圖片 UI／object URL |
| 等待與確認 UI | 既有 Button／QueryState／FormDialog／lucide-react、共用 skeleton／busy 呈現與 CSS reduced-motion | 初次讀取、背景更新、分頁、mutation、查證／未知與 paused 分開；dialog 描述、取消優先焦點與焦點恢復 |
| 快取與恢復 | TanStack Query account/trip scope、取消 in-flight 查詢、失效／清除及明確查證 | 移入／purge 不留可操作舊帳本；背景更新保留資料，mutation 不盲目 retry；視覺 busy 不代替業務結果 |

新增套件版本於 2026-11-13 查核，並在 macOS arm64／Node24 做過獨立 parser／轉碼小型實驗；尚未加入專案 manifest 或 lockfile，也未通過 Linux/Railpack、真機選圖、容量、備份或產品 E2E 驗證。正式實作須固定直接依賴及跨平台 optional binary，按必要性調整 pnpm allowBuilds。永久刪除完成指 live application 資料與存取移除，不承諾清除既有備份、已下載副本或磁碟安全覆寫。

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
| 旅行／圖片／等待驗證（已選定，待執行） | 沿用兩端 Gherkin E2E、真 PostgreSQL、故障／併發控制、Chromium/WebKit 與真機選圖 | 驗垃圾桶全部子資源、purge trigger 例外與回滾、操作去重、格式／大小／動畫／abort、跨帳號圖片存取及全站等待覆蓋；另驗 Linux binary、RSS 與含 bytea 備份還原 |

### 本地環境

| 類別 | 採用技術 | 用途 |
| --- | --- | --- |
| 資料庫環境 | Docker Compose | 開發及測試 PostgreSQL；資料隔離 |
| 開發入口 | pnpm scripts | 啟動 web/api、驗證及測試；lint:fix 修正空行、format 整理排版、format:check 檢查格式 |

### 試用部署（2026-11-09 已完成部署與驗收）

| 類別 | 採用技術 | 用途 |
| --- | --- | --- |
| 試用平台 | Railway 免費試用、Railway HTTPS 網址 | 兩人以測試資料驗證；不代表正式營運或保證免費持續運行 |
| 應用部署 | Node.js 24、Fastify 提供 Vite 靜態產物及同 origin `/api` | 單一公開服務；啟動、SPA fallback、HTTPS、靜態資源及健康檢查已驗證 |
| 部署設定 | Railway SDK 3.16.0、`.railway/railway.ts`、CLI plan/apply | 已從 railway.json 遷移並套用；app partial 管理應用設定，變數由平台管理 |
| 試用資料庫 | Railway PostgreSQL 18、持久 volume、私有連線 | 已驗證重新部署後測試帳本與支出保存 |
| 試用資料還原 | PostgreSQL 18 pg_dump／pg_restore | 已完成卷外備份與本機隔離還原，9 張表完整內容比對一致 |

真實 Google 登入、兩帳號與 iOS Safari 手機記帳由使用者回報通過；未獨立擷取線上 session cookie 或跨帳號 API trace。上述為 2026-11-09 的交付證據，未重新查核目前線上狀態、試用餘額或到期情況；長期容量、費用及實際到期行為仍未驗證。


## 本次開發不引入的技術

- Turborepo/Nx：先以 workspace scripts 管理，待量測需求再評估。
- 微服務、Kubernetes、Redis、訊息佇列：第一版未有使用需求。
- 即時匯率服務、瀏覽器浮點金額運算：本版保留原幣別，使用精確金額表示。
- Redux Toolkit / RTK Query 與 SSR 框架：伺服器資料由 TanStack Query 管理，局部狀態由 React 管理；後續依需求評估 Redux。
- 共編基礎設施及離線同步：後續產品階段再評估。
- Phase 1B 不引入浮點分攤、有限小數作權威份額、全域最少轉帳求解器或生成式 AI 結算說明服務。
- 旅行縮圖不引入外部媒體服務、S3 bucket/CDN、app 本機永久圖片目錄、原圖保存、HEIC codec 自建或圖片裁切編輯器；目前採有界 bytea 縮圖。
- 等待呈現不引入動畫套件、全站 Suspense 遷移、固定假等待或假的上傳百分比；不新增垃圾桶自動清除排程。


Railway 為已驗證的試用平台，正式營運供應商與長期維運方案尚未確定；正式使用前仍需規劃長期備份、費用與容量、到期處置及正式 OAuth／migration 發布管理。
