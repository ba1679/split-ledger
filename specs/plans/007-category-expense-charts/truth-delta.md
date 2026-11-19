# Truth Delta: 007-category-expense-charts

**Plan Package**: `specs/plans/007-category-expense-charts`
**Truth Root**: `specs/truth`

本檔由 `/specify` 初始化。`/clarify` 已完成一輪三題，使用者確認 `1A、2B、3A`：當前旅行、團體圖僅兩人以上分攤支出、切換幣別。個人圖採 owner 對應成員的實際份額；多帳號共編只作未來語意邊界參考，不在本輪交付。使用者本輪另補充希望圖表 UI 舒服且可用 hover 查看更多資訊，並指出自製 SVG 的長期維護成本；`/technical-research` 因此將尚未實作的選型修正為 shadcn/ui Chart＋Recharts 3 系列。`/data-plan`、`/api-plan` 與 `/dsl-refine` 已完成對應 truth 規劃，介面 feature／DSL 承接 13 個 acceptance journeys 及已確認的 design-v1；分類分析尚未實作或完成產品驗收。

## /technical-research

| 動作 | Truth 規格 | 改動摘要 | 原因 |
| --- | --- | --- | --- |
| MODIFY | `specs/truth/techstack.md` -> 文件日期與技術現況導言 | 日期更新為 2026-11-19，區分工作區既有程式與 007 尚未實作的分類分析方向；未宣稱重新部署或完成產品驗收。 | 避免以 2026-11-13 的狀態描述目前工作區。 |
| MODIFY | `specs/truth/techstack.md` -> 旅行生命週期、圖片與等待回饋：實作／依賴狀態 | 由「已選定、尚未實作」修正為工作區已有相關程式；確認 API manifest 包含 `@fastify/multipart 10.1.8` 與 `sharp 0.35.5`，保留跨平台與產品 E2E 尚未重新驗證的限制。 | 已檢查 management、圖片、等待回饋程式與 manifest；這是現況校正，不改既有功能語意或驗收契約。 |
| ADD | `specs/truth/techstack.md` -> 分類花費分析／統計來源與快照 | 選定 Fastify／Drizzle 與 PostgreSQL REPEATABLE READ read-only 交易，同快照讀完整旅行支出、分攤與分類，一次提供已有支出幣別及兩圖結果；具體 HTTP schema 交 API owner。 | 圓餅圖不得依賴已載入清單分頁，也需避免兩圖取自不同提交版本。 |
| ADD | `specs/truth/techstack.md` -> 分類花費分析／精確分類聚合 | 沿用 TypeScript BigInt 有理數與 ExactAmount，先對齊同幣別保存精度，依成員份額與兩人以上共同支出原始金額分別聚合。 | 保留循環份額與歷史 minorUnit 的精度，不把還款或結算當消費。 |
| ADD | `specs/truth/techstack.md` -> 分類花費分析／資料與身分邊界 | 以既有支出、分攤、分類及穩定 ID 衍生統計；沿用 owner／active gate，以 owner 對應成員計個人花費，不新增協作資料模型。 | 將存取權限與消費歸屬分開，滿足本輪需求且保留未來共編規劃空間。 |
| ADD | `specs/truth/techstack.md` -> 分類花費分析／圖表與可及明細 | 選定 shadcn/ui 本地 Chart＋Recharts 3 系列與 React／CSS tokens，提供品牌化響應式圖表及 hover tooltip；保留 HTML 常駐明細、手機點按與鍵盤選取；穩定 patch、react-is 相容性待實作時確認。 | 使用者補充希望 UI 舒服且 hover 可查看資訊，並質疑自製 SVG 維護成本；採用現成圖表組件承接互動與尺寸行為，仍須由 UI 設計確認視覺品質。 |
| ADD | `specs/truth/techstack.md` -> 分類花費分析／格式化與繪圖邊界 | 金額維持精確字串與 BigInt 格式化；累積比例先縮放至 10^12，以相鄰累積值之差產生供 Recharts 使用的有界 Number 權重，末端閉合；tooltip 金額取精確資料，極小分類保留文字。 | 圖表權重只是幾何近似，不讓浮點、顯示取整或 tooltip 改寫帳務。 |
| ADD | `specs/truth/techstack.md` -> 分類花費分析／快取與更新 | 沿用 TanStack Query 帳號／旅行 scope 與等待元件；全幣別單次查詢，支出或分類變更失效分析，生命週期及登出清除舊範圍快取。 | 新統計需與已保存資料一致，且背景更新、切換旅行及帳號時不能誤顯舊結果。 |
| ADD | `specs/truth/techstack.md` -> 測試與驗證／分類花費分析驗證 | 沿用前後端各自 Playwright Test＋playwright-bdd E2E、APIRequestContext 與真 PostgreSQL；Vitest 補精確聚合及圖形邊界純函式驗證；另驗 Recharts 全圓／零值／極小權重、hover tooltip、手機／鍵盤互動與 reduced-motion，標示尚待執行。 | 覆蓋分頁、權限、同快照、更新失效及循環份額，也回應使用者新增的互動方向；單元測試不取代主驗收。 |
| ADD | `specs/truth/techstack.md` -> 本次開發不引入的技術／分類花費圖 | 明列不自建 SVG 圖表／tooltip 引擎，也不引入 Canvas 引擎、新金額套件、彙總表、匯率、推送及共編 ACL／邀請模型；本輪採 shadcn/ui Chart＋Recharts。 | 使用者補充互動需求後，修正尚未交付的圖表選型與維護責任，同時固定其他已確認的產品與技術邊界。 |
| NOOP | `specs/truth/techstack.md` -> 專案與執行環境、前端／後端框架及資料庫／登入 | 已檢查 TypeScript／Node／pnpm、React／Vite／TanStack Query、Fastify／Better Auth、PostgreSQL／Drizzle；本輪沿用，不換堆疊。 | 現有前後端及帳號隔離責任足以承接新增唯讀統計。 |
| NOOP | `specs/truth/techstack.md` -> Phase 1B 分帳技術／精確分攤、個人總花費及既有 totals 語意 | 已檢查既有 BigInt 有理數、owner 份額與 totals 查詢；新增分類聚合不改既有付款／分攤權威或 totals 預設語意。 | 圓餅圖是新的衍生檢視，既有記帳與結算行為應保持。 |
| NOOP | `specs/truth/techstack.md` -> 測試與驗證／前後端 BDD techstack 與兩端 E2E 策略 | 前端與後端各用 Playwright Test＋playwright-bdd，後端含 APIRequestContext；本輪加案例，runner 和主驗收策略不改判。 | 既有 truth 已拍板各端 runner、系統端點與測試策略，無需重問或更換。 |
| NOOP | `specs/truth/techstack.md` -> 試用部署／2026-11-09 歷史部署與還原證據 | 已檢查 Railway／PostgreSQL 試用部署敘述，本輪不改原有歷史驗證結論，亦不宣稱涵蓋 007。 | 技術研究與讀碼不等於新功能線上驗收。 |

## /api-plan

| 動作 | Truth 規格 | 改動摘要 | 原因 |
| --- | --- | --- | --- |
| MODIFY | `specs/truth/contracts/openapi.yaml` -> `info.version/description` 與 `expenses` tag 描述 | 規劃契約版本由 0.3.0 升至 0.4.0，說明 007 分類分析新增唯讀契約尚未實作／驗收，並擴充 expenses tag 的功能描述；保留既有 006 狀態宣告。 | 讓根契約可辨識本輪新增範圍；版本是契約文件版本，不是部署或產品發布。 |
| ADD | `specs/truth/contracts/openapi.yaml` -> `/api/trips/{tripId}/expense-analysis` path 與 `ExpenseCategoryAnalysisResponse` component 引用 | 根檔掛載新的 expenses group 唯讀入口及回應 schema 引用，不在根檔內重寫操作或模型。 | 遵循既有 root／group／component 分檔規則，讓新契約可被解析。 |
| ADD | `specs/truth/contracts/groups/expenses.yaml` -> `GET expenseAnalysis`／`getTripExpenseAnalysis` | 新增無 query／分頁的 owner-only 唯讀分析；同一 REPEATABLE READ 快照讀全旅行支出、分攤與分類，一次回全部已有支出幣別、個人與團體結果；401 未登入、404 未知／他人、409 本人垃圾桶沿用 ApiError。 | 使用者 `1A／2B／3A` 與 IF-02 要求完整當前旅行、分幣別、精確份額及共同支出分析，且不得改既有 totals response。 |
| ADD | `specs/truth/contracts/components/schemas/expenses.yaml` -> `ExpenseCategoryAnalysisResponse` | 必回 tripId、固定 ownerMemberId、整趟 hasSharedExpenses 與依幣別升序的 currencies；空旅行 currencies 為空，登入帳號不提供任意 member selector。 | 回應明確區分帳號授權與統計成員，並讓 UI 判斷跨幣別的共同支出存在狀態。 |
| ADD | `specs/truth/contracts/components/schemas/expenses.yaml` -> `ExpenseCategoryCurrency` | 每個仍有支出的幣別恰一筆，包含 currencyCode、該幣別全部來源支出的最大歷史 minorUnit，以及 personal／group 兩圖；即使兩圖均零仍保留幣別。 | 只在前端切換同一快照的幣別投影，不會漏掉僅他人單人消費的幣別或混用不同尺度。 |
| ADD | `specs/truth/contracts/components/schemas/expenses.yaml` -> `ExpenseCategoryChart` | 每圖必回精確 ExactAmount total 與正金額 categories；零圖 total=0/1 且 categories 為空，分類占比由精確分類額／總額導出，不在 API 回已取整百分比。 | 圖表不把顯示取整或幾何近似寫入帳務契約，零值可與讀取失敗區分。 |
| ADD | `specs/truth/contracts/components/schemas/expenses.yaml` -> `ExpenseCategoryAmount` | 每分類必回 category（穩定 id＋目前 name 或未分類 null）與精確 ExactAmount；未分類先列，其餘依 id 升序，金額使用外層幣別共同尺度。 | 分類改名、清除關聯、歷史位數與穩定圖表識別可一致處理。 |
| NOOP | `specs/truth/contracts/groups/expenses.yaml`、`components/schemas/expenses.yaml` -> `GET totals`／`TotalsResponse`／`PersonalTotalsResponse` 及既有支出讀寫 | 已檢查舊 totals scope=all／personal、原支出 request／response 與修改／刪除語意；本輪新增獨立讀取入口，不改既有形狀、預設或總額定義。 | 團體共同花費與旅行全部支出總額不同，不能以改寫 totals 遷就圖表。 |
| NOOP | `specs/truth/contracts/components/{parameters.yaml,schemas/shared.yaml,security.yaml}` -> `TripId`／`ApiError`／`ExactAmount`／`BetterAuthSession` | 新入口沿用既有旅行 ID、401／404／409 錯誤形狀、精確金額與 session 安全設定；無新錯誤碼、請求參數或協作權限。 | 現有共享契約足以支援 IF-02，存取隔離及金額權威保持一致。 |

## /data-plan

| 動作 | Truth 規格 | 改動摘要 | 原因 |
| --- | --- | --- | --- |
| ADD | `specs/truth/data/data-model.dbml` -> Project Note／分類花費分析的衍生讀取 | 明定 owner 與 active 範圍下，以同一唯讀一致快照讀取當前旅行全部支出、分攤集合、固定 owner 成員及分類；依穩定成員 ID 算個人份額、兩人以上分攤算團體原金額一次，未分類與停用成員保留、歷史 minor_unit 對齊，還款／結清不計消費；不持久化分析結果。 | IF-03 需要可追溯的權威來源與關聯；沿用既有 schema 即可滿足 `1A／2B／3A`，避免分頁漏算、混幣或衍生總額成為第二份真相。 |
| NOOP | `specs/truth/data/data-model.dbml` -> `trips`／`trip_members`／`expenses`／`expense_shares`／`categories` 的欄位與複合 Ref | 已檢查 owner_id、trip_id、固定 owner role、穩定 member_id、category_id、currency_code、保存的 minor_unit、非空不重複分攤集合及歷史成員關聯；不新增或改動欄位、FK、唯一鍵及生命週期。 | 既有來源已能區分帳號授權與成員消費歸屬，並支援未分類、分類改名、旅行外日期與停用成員的歷史統計。 |
| NOOP | `specs/truth/data/data-model.dbml` -> `expenses`／`expense_shares`／`trip_members`／`categories` 既有索引及 migration 責任 | 本輪不新增分類彙總表、materialized view、分析快取、預設索引或 migration；先沿用 owner／trip、expense／member 及分類關聯索引，實作後按真實查詢以 EXPLAIN ANALYZE／BUFFERS 量測再決定是否另行增索引。 | 現有資料邊界可正確計算，尚無容量或查詢計畫證據支持提前增加寫入成本；效能驗證仍是後續工作。 |
| NOOP | `specs/truth/data/data-model.dbdiagram` -> 既有資料表節點與關聯版面 | 已檢查圖檔；本輪只有 DBML Project Note 新增衍生讀取語意，沒有表、欄位或 Ref 變更，因此不調整圖檔。 | 圖檔表示既有 schema 版面，無新增實體可呈現。 |

## /dsl-refine

| 動作 | Truth 規格 | 改動摘要 | 原因 |
| --- | --- | --- | --- |
| ADD | `specs/truth/features/backend/expenses/分類花費精確統計.feature` -> B01–B14、B29–B30 | 新增完整旅行分類查詢的個人份額、共同原額、全日期／幣別、未分類、零值、精確有理數、歷史尺度、唯讀及共同消費狀態規則。 | 將分類花費的權威計算、來源與回應邊界拆成可獨立執行的後端規則。 |
| ADD | `specs/truth/features/backend/expenses/分類分析資料修正.feature` -> B15–B22 | 新增金額／分攤／刪除／幣別／分類／成員變更後重查，以及固定 owner 成員身分規則。 | 驗證已保存來源修正立即反映在新分析，不以顯示名稱或舊分類作歸屬。 |
| ADD | `specs/truth/features/backend/expenses/分類分析存取邊界.feature` -> B23–B28 | 新增未登入、同名其他帳號、垃圾桶、永久刪除、他人探查及復原後的讀取規則。 | 新唯讀端點須沿用 owner 隔離與旅行生命週期。 |
| ADD | `specs/truth/features/frontend/expenses/分類分析入口與數值.feature` -> F01–F21 | 新增帳本入口、兩圖／分類明細／總額／比例、完整旅行與幣別切換、未分類、零值及無共同消費呈現規則。 | 承接 007 的主要花費分析 Journey 與已批准的桌機／手機分析頁。 |
| ADD | `specs/truth/features/frontend/expenses/分類分析修正後重看.feature` -> F22–F29 | 新增已保存支出、分類及成員修正後重新查看兩圖與切換新舊幣別的規則。 | 畫面不得顯示過期分類、金額或份額，並需保留完整兩圖驗證。 |
| ADD | `specs/truth/features/frontend/expenses/分類圖表互動.feature` -> F30–F41、F57–F59 | 新增 hover、手機點按、鍵盤選取／關閉、焦點、常駐明細、同分類配色、完整圓環、極小值、長內容及顯示取整規則。 | 讓分類資訊在已批准的提示框／資訊卡及常駐明細中可讀、可操作。 |
| ADD | `specs/truth/features/frontend/expenses/分類分析讀取與範圍狀態.feature` -> F42–F50 | 新增初載、失敗／重試、背景更新／失敗、離線及跨旅行遲到結果隔離規則。 | 讀取狀態不可冒充真零或將舊旅行、舊快照標為新結果。 |
| ADD | `specs/truth/features/frontend/expenses/分類分析權限與生命週期.feature` -> F51–F56 | 新增登出、他人帳號、垃圾桶／復原／永久刪除的畫面保護及返回原帳本規則。 | 舊快取與資訊卡不能繞過帳本存取邊界；導覽須維持原旅行。 |
| ADD | `specs/truth/features/backend/expenses/dsl.md` -> 007 資料種子與精確查詢句型（29 列） | 新增後端分類分析專屬 Given／When／Then，定義完整 DB 來源、獨立 BigInt 有理數 oracle、ExactAmount、全幣別回應、修正及 401／404／409 不洩漏驗證；未改既有列。 | 讓 B01–B30 可直接實作且不以受測聚合函式或 response 自證正確。 |
| ADD | `specs/truth/features/frontend/expenses/dsl.md` -> 007 資料與保存修正句型（74 列中的資料群） | 新增隔離旅行／分類種子、前序已保存變更、舊分析快照、幣別選擇與合法長名稱等安排契約。 | 各 Example 獨立建立權威狀態，將 acceptance Journey 的前序操作轉為 Given。 |
| ADD | `specs/truth/features/frontend/expenses/dsl.md` -> 007 導覽與分類數值句型（74 列中的導覽／數值群） | 新增從帳本進分析、返回帳本、切幣別、兩圖完整明細／總額／比例、零值及無共同消費的操作與斷言契約。 | 把 UI 位置固定在已批准的帳本入口及 `/trips/:id/analysis`，以真 API／DB 核對顯示值。 |
| ADD | `specs/truth/features/frontend/expenses/dsl.md` -> 007 圖表互動與可及句型（74 列中的互動群） | 新增滑鼠、觸控、鍵盤分類資訊、關閉回焦、常駐明細、同色、極小比例及取整說明的實作語意。 | 提示框不是唯一資訊來源；手機與鍵盤可取得相同的精確分類資訊。 |
| ADD | `specs/truth/features/frontend/expenses/dsl.md` -> 007 讀取狀態與授權句型（74 列中的狀態／存取群） | 新增受控真請求延遲／失敗、背景更新、離線、晚到結果、登入／旅行生命週期與快取不洩漏的操作及 oracle。 | 將不同讀取狀態與 owner／active 邊界落成可觀察且不假造空資料的測試契約。 |
| NOOP | `specs/truth/features/{backend,frontend}/dsl.md` -> 介面根共用句型 | 已檢查根 DSL；007 新句型只屬 expenses 模組，無完整相同的跨模組契約須上提。 | 維持唯一權威位置，不擴大共用詞彙。 |
| NOOP | `specs/truth/features/{backend,frontend}/expenses/**` -> 007 以外既有 feature 與 DSL rows | 已核對既有 expenses feature／DSL 前段保持原文，沒有改寫原支出、分攤或總額驗收。 | 新分類分析規則以新增檔案與模組 DSL 追加區段承接。 |
| NOOP | `specs/truth/features/{backend,frontend}/**` -> expenses 以外既有模組 Rules | 已檢查相依語意；本輪不重寫既有帳號、幣別、分類、CRUD、totals、還款、結清、成員、旅行管理或設計系統規則。 | 圖表只讀已保存帳務並沿用原權限與生命週期。 |
