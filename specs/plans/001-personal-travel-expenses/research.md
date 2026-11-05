# Phase 0 研究：個人旅行記帳（Phase 1A）

研究日期：2026-11-04。Plan：`001-personal-travel-expenses`。

本文件記錄技術選型；尚未建立可執行應用、安裝依賴或量測測試耗時。完整採用清單見 `specs/truth/techstack.md`。

## 已確認的前提

- 使用者選擇 monorepo，網頁前端、獨立後端 API 與資料庫；後端採 TypeScript。
- 前端 BDD：Playwright Test + playwright-bdd，操作瀏覽器。
- 後端 BDD：Playwright Test + playwright-bdd，直接呼叫 API；獨立設定與案例。
- 前後端皆採 E2E，另對金額與幣別等重要規則建立單元測試。使用者已確認此策略。
- 產品只做個人旅行記帳，Google 登入、分幣別統計、裝置分類預設及輸入當下的金額限制依已 review 規格執行。
- 無既有程式碼、techstack truth 或 constitution；下列框架與資料技術是本次研究採納的方案。

## 決策 1：以 pnpm workspace 管理 TypeScript monorepo

- **Decision**: 使用 pnpm workspace、TypeScript strict mode 與 Node.js 24 LTS。前端放 `apps/web`、後端放 `apps/api`；必要的純資料契約、金額解析與幣別資料放 `packages/shared`，不預先拆出其他套件。Setup 時固定 Node/pnpm 版本、各套件相容版本與 lockfile；自動檢查採 frozen lockfile。
- **Rationale**: 同一個 repository 可在一次變更中查看需求、畫面與 API；workspace 管理套件依賴，而 HTTP 仍是前後端執行時的邊界。shared 不得包含資料庫連線、登入密鑰或後端資料實體；前端不得引用 api 內部模組。Node 24 在查核時仍為 LTS，先用已進入 LTS 一段時間的版本以控制相容性風險。[pnpm workspace](https://pnpm.io/workspaces)、[Node releases](https://nodejs.org/en/about/previous-releases)。
- **Alternatives considered**:
  - 分成多個 repository：依賴及版本發布更獨立，但本專案由一人維護，跨端修改會增加協調成本。
  - 一開始使用 Turborepo/Nx：可提供任務編排及快取，本輪先用 workspace scripts，實際量測有需要再加入。

## 決策 2：前端採 React + Vite

- **Decision**: 使用 React、TypeScript、Vite 與 React Router 建立 SPA。第一版採 TanStack Query 管理伺服器資料，底層以 fetch 發送請求；表單與局部介面狀態由 React 管理；以 CSS 建立響應式介面，自動完成元件的具體做法交給 UI plan。開發時代理 `/api` 到後端，部署目標為同一對外 origin 下提供前端與 `/api`。
- **Rationale**: 旅行清單、記帳表單、分類管理需要重複元件與互動；SPA 適合此登入後使用的工具。後端仍是獨立應用，不依賴前端框架處理資料保存。同 origin 降低 cookie 與跨來源設定負擔，但不表示前後端必須同一個程序。[Vite guide](https://vite.dev/guide/)。
- **Alternatives considered**:
  - Next.js 全端：可整合畫面與伺服器，但本次明確希望學習獨立 API 的責任邊界。
  - 原生 HTML/TypeScript：依賴較少，但多個表單與共用互動需自行管理。

## 決策 3：後端採 Fastify，按功能組織模組

- **Decision**: 使用 Fastify + TypeScript。以 JSON Schema 驗證請求與回應，使用 TypeBox 讓 schema 與 TypeScript 型別對齊；OpenAPI 由相同 schema 產生。按旅行、支出、分類與登入整合組織模組，區分 HTTP 處理、業務規則與資料查詢。
- **Rationale**: 本案 API 規模小，但需要明確輸入驗證與權限檢查。型別檢查不能取代執行時驗證；即使畫面擋住負號與小數點，API 仍須拒絕不合法金額。Fastify 提供 schema 驗證與輸出序列化機制。[Fastify validation](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/)。實作時避免未經檢查的型別轉換把不合法金額靜默轉為合法值。
- **Alternatives considered**:
  - Express：自由度高，但驗證、型別與文件整合需另行組合。
  - NestJS：有明確的模組及依賴注入慣例；此階段引入的框架概念較多。

## 決策 4：PostgreSQL + Drizzle 管理資料與變更

- **Decision**: PostgreSQL 18、Drizzle ORM + Drizzle Kit、node-postgres。schema 變更產生可 review 的 SQL migrations 並納入版本管理，開發及測試使用相同 migrations。資料表、索引、外鍵、刪除限制與交易邊界交給 data-plan 設計。
- **Rationale**: 旅行、支出、分類及帳號有明確關聯，適合練習 SQL、關聯約束與交易。Drizzle 同時提供 SQL-like 查詢與型別支援，便於將程式對照生成的 SQL。[Drizzle overview](https://orm.drizzle.team/docs/overview)。分類「仍被使用不能刪除」不能只靠畫面判斷，資料層也要維持一致性；索引由實際查詢與執行計畫決定，不盲目加在每個欄位。
- **Alternatives considered**:
  - SQLite：本地啟動更容易，但這次希望練習與部署相同的 PostgreSQL 行為。
  - Prisma：資料操作與 migrations 的另一選項；本案選較貼近 SQL 的方式以配合學習目標。

## 決策 5：金額採最小單位整數，傳輸使用字串

- **Decision**: 後端以 BigInt 處理金額，PostgreSQL 使用 BIGINT 儲存最小單位整數，並保留幣別與適用的小數位數。API 金額使用十進位字串；由 api-plan 明定請求與回應格式。例：USD 12.50 對應 1250 最小單位，JPY 1200 對應 1200。禁止將金額經過 Number/parseFloat 參與業務計算；總額用精確整數計算，並處理加總溢位及資料庫聚合結果的型別。
- **Rationale**: 不同幣別有不同位數，二進位浮點計算不適合作為金額的權威表示；PostgreSQL BIGINT 為精確整數，但有範圍限制。[PostgreSQL numeric types](https://www.postgresql.org/docs/current/datatype-numeric.html)。金額上限需由儲存範圍及契約清楚定義，不能因格式化而默默四捨五入。幣別變更需重新驗證新幣別的位數，不自動做匯率換算。
- **Alternatives considered**:
  - PostgreSQL NUMERIC + decimal library：也能精確運算，但本版只有固定幣別位數的加總，最小單位整數較直接。
  - JavaScript number / 浮點資料欄位：方便但存在精度與安全整數範圍問題，不採用。

## 決策 6：幣別來源採 SIX ISO 4217 固定快照

- **Decision**: 以 SIX 維護的 ISO 4217 List One 為代碼與 minor unit 位數來源，去除重複代碼；提供 minor unit 為數字的現行條目。N.A. 條目（例如 XAU、XXX）不提供為一般支出幣別。資料隨版本封存，前後端使用同一份；不在開啟表單時即時下載。更新由人工 review 差異，不能改寫歷史支出的金額解讀。搜尋至少涵蓋代碼與幣別名稱，自動完成只允許選擇清單中的值。
- **Rationale**: 避免前後端分別依瀏覽器或第三方套件判定位數。2026-11-04 已實際取得 [SIX XML](https://www.six-group.com/dam/download/financial-information/data-center/iso-currrency/lists/list-one.xml)，發布日期 2026-09-17，SHA-256 為 `33139b438657d1cee116ba737807ea71d19d6de4b90f799a09c56f0cc6a1b0ff`；178 個去重代碼中有 165 個具數字 minor unit。JPY=0、USD/TWD=2、KWD=3、CLF=4，不能固定所有幣別兩位。使用者決定 TWD 輸入只接受整數：這是產品輸入規則，ISO 快照與資料儲存仍使用 TWD minorUnit=2，例如 TWD 8000 儲存為 800000；API 回應仍按保存位數輸出。該規則也包含部分基金或計價單位，這不是即時匯率清單。[SIX 維護來源](https://www.six-group.com/en/products-services/financial-information/market-reference-data/data-standards.html)。Setup 須將檢查過的快照及來源資訊納入專案；目前只完成研究取樣，尚未建立執行期資料檔。
- **Alternatives considered**:
  - Intl 作為驗證權威：適合名稱/顯示輔助，但不同 runtime 的資料版本可能不同。
  - 即時幣別或匯率 API：增加外部依賴，本版不做換算，沒有必要逐次查詢。

## 決策 7：Google 登入採 Better Auth，資料庫保存 session

- **Decision**: 使用 Better Auth 的 Google provider、Fastify 整合與 Drizzle PostgreSQL adapter，僅開啟 Google 登入。使用資料庫 session 與 HttpOnly cookie，正式環境採 HTTPS、Secure cookie、明確 trusted origins。後端由已驗證 session 決定使用者身分，不能相信請求自行傳入的 owner ID。
- **Rationale**: 以現成登入函式庫承接 OAuth、session 與 cookie 流程，仍保留在自己的後端和資料庫學習權限設計。每個旅行、分類與支出操作皆須檢查擁有者；共用套件不得暴露 session 或 secret。Google Cloud 的 OAuth client ID、secret 和 callback URL 是實際串接前的外部設定依賴。[Google provider](https://better-auth.com/docs/authentication/google)、[Fastify integration](https://better-auth.com/docs/integrations/fastify)、[Drizzle adapter](https://better-auth.com/docs/adapters/drizzle)。需在 Setup 驗證相容版本、所有 Set-Cookie 標頭轉送、代理後 URL 及 migrations 的整合，不將文件範例視為已測試。
- **Alternatives considered**:
  - 自行實作 Google OAuth 與 session：可學更多底層細節，但本輪會增加額外驗證及維護範圍。
  - 託管身分平台：減少自行維運，但增加服務依賴；本案先採自有後端與資料庫。

## 決策 8：各端獨立的 Gherkin E2E，加上規則單元測試

- **Decision**:
  - 前端：Playwright Test + playwright-bdd，走瀏覽器 → 真實 API → 獨立測試 PostgreSQL。
  - 後端：Playwright Test + playwright-bdd，使用 APIRequestContext 透過真實 HTTP 測 API 與持久化結果，不把單純函式呼叫當後端 E2E。
  - 單元：Vitest，驗證金額字串解析、位數、加總及日期等適合純函式的規則。
  - 前後端使用獨立設定、案例與報告；測試資料以案例/worker 隔離，套用正式 migrations。測試不可接到個人或正式資料庫。
- **Rationale**: 瀏覽器可確認日圓小數點及負號在輸入當下被阻擋；API 測試另確認繞過畫面後仍不能寫入不合法金額。E2E 驗證結果，單元測試快速定位規則問題。[playwright-bdd](https://github.com/vitalets/playwright-bdd)、[Playwright API testing](https://playwright.dev/docs/api-testing)、[Vitest](https://vitest.dev/guide/)。前後端測試用 shared 時仍需獨立的預期資料，避免同一錯誤同時污染實作與預期值。
- **Alternatives considered**:
  - 後端 Cucumber.js：可執行 Gherkin，但使用者選擇沿用 Playwright 生態。
  - 只做單元測試或只用假 API：不能驗證畫面到資料保存的整合；不符合已確認策略。

## 決策 9：控制 Google 外部依賴並量測測試耗時

- **Decision**: 自動回歸測試以測試身分提供者或受控測試資料建立真實本地 session，沿用正式 session 驗證與資料庫權限流程；只替換 Google 外部身分回應。OAuth adapter/callback 的成功、取消及無效回應需有整合測試。另以測試帳號進行真正 Google 登入的串接驗證，其結果與一般 E2E 分別報告。測試登入能力必須僅存在於隔離測試設定，不能在正式環境提供任意登入入口。
- **Rationale**: 每個記帳案例都經過 Google 會引入外部網路與登入互動的不穩定；測試身分不代表已驗證真實 Google 服務。使用登入狀態重用也須依帳號及 worker 隔離。[Playwright authentication](https://playwright.dev/docs/auth)。測試時不會 mock 核心記帳 API 或資料庫。Setup 要實測實作可行的身分替換 seam，不能用前端假裝登入取代權限驗證。
- **Alternatives considered**:
  - 每個案例登入真實 Google：外部失敗會讓大量非登入案例一起失敗。
  - 全部跳過驗證或只 mock session API：無法確認後端是否真的限制資料擁有者。

測試執行方式：開發時跑變更相關的單元/API/瀏覽器案例；完成任務及提交前跑相應完整回歸。先以 Chromium 跑日常回歸，在交付驗證加入 WebKit 與行動 viewport；模擬不是實機驗證，仍需手機手動檢查。案例需各自隔離，才能安全平行執行。保留失敗 trace、啟動時間與案例耗時，第一次實作完整流程後量測單案例、單端全套及全部回歸的冷/熱啟動時間。目前沒有實測數字；「幾分鐘內」僅是開發體驗目標，不是已證實結果或產品驗收門檻。[執行範圍](https://playwright.dev/docs/running-tests)、[平行執行](https://playwright.dev/docs/test-parallel)。

## 決策 10：本地環境及交付基礎

- **Decision**: 使用 Docker Compose 啟動 PostgreSQL，web/api 在本機以 pnpm scripts 開發；測試使用分離的資料庫及連線設定。保留 ESLint、TypeScript 檢查、migrations 檢查及測試的自動執行入口。API 採 Fastify 結構化日誌，記錄 request ID 與錯誤，不記錄 cookie、token、secret 或完整個人支出內容。
- **Rationale**: 先練習可重建的資料庫環境，部署服務商與付費方案留到部署前決定。正式目標為持續執行的 Node API、同 origin 的前端及 PostgreSQL，具體備份/還原、TLS 和 migration 發布流程須在真實使用前驗證。[Docker Compose](https://docs.docker.com/compose/)。尚未檢查本機 Docker 可用性；若不能使用，改用獨立本機 PostgreSQL 的安裝方式，不改變資料庫種類。
- **Alternatives considered**:
  - 初期直接用共用雲端資料庫開發與測試：較少本地設定，但資料隔離及重建較容易出錯。
  - 一開始將全部開發服務容器化：環境一致性較高，但會增加初期熱更新及除錯設定。

## 決策 11：使用 TanStack Query 管理伺服器資料

- **Decision**: 採用 TanStack Query（React Query），由 query 管理旅行、支出、分類及統計的讀取，由 mutation 管理新增、修改與刪除；底層維持 fetch 作為 HTTP client。表單草稿、展開/關閉等局部介面狀態由 React 管理。使用者已明確選擇此方案。
- **Rationale**: 同一筆支出變更會影響清單和各幣別總額，採集中且明確的 query keys 與 invalidation 避免自行重複維護載入、錯誤和重新查詢。查詢鍵包含適當的帳號、旅行及篩選條件；mutation 成功後重新取得受影響的支出、旅行統計及分類資料。登出或切換帳號時取消舊查詢並清除該帳號的快取，避免沿用其他帳號資料。伺服器仍是金額與權限的權威；本版不將 query cache 持久化到 localStorage，不將其當離線同步機制。金額變更先以伺服器確認結果及重新查詢為準，樂觀更新待有明確需要再評估。[TanStack Query overview](https://tanstack.com/query/latest/docs/framework/react/overview)。Setup 應明確設定 stale time、重試、錯誤處理及 credentials；非成功 HTTP 回應由 fetch 封裝轉成錯誤，避免被 query 誤認為成功。變更請求不盲目自動重試，避免重複新增支出。
- **Alternatives considered**:
  - 純 fetch + React 狀態：依賴較少，但需自行維護快取、失效及跨畫面資料同步。
  - RTK Query：適合確定需要 Redux 的情況；目前沒有跨頁複雜用戶端狀態需求，先不引入 Redux。未來可讓 Redux 管理其他狀態，避免與 Query 快取重複保存同一份伺服器資料。[伺服器與用戶端狀態的分工](https://tanstack.com/query/latest/docs/framework/react/guides/does-this-replace-client-state)。

## 後續 handoff 與待驗證項目

- `/system-analysis`：定義功能模組、API/data 分析順序與登入邊界；`/api-plan` 明定金額字串、錯誤與 session 契約；`/data-plan` 落實外鍵、ownership、整數金額/幣別位數、日期欄位及交易規則。
- `/ui-plan`：依已 review 驗收案例設計響應式流程，涵蓋輸入、貼上、修改幣別、載入與失敗狀態。金額輸入不可透過刪掉非法字符把整筆貼上金額變成另一金額。
- 分類命名已在 2026-11-05 規劃訪談確認：最多 30 個字、去除前後空白、同帳號不可重名、英文不分大小寫；API/data planner 應使用同一正規化與計長方式，並以資料庫唯一約束處理同時新增/改名。切換帳號時的裝置分類預設亦須綁定可用性及擁有者，不能取用他人分類。
- Setup 要完成登入適配、套件相容性、migrations、固定幣別快照及首條 E2E 的小範圍驗證，再擴展功能。
- 本輪未做效能或套件安裝實驗；測試總耗時、金額上限與部署費用沒有實測結論。
