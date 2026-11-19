# Phase 0 研究：旅行分類花費圓餅圖

**日期**：2026-11-19
**Plan Package**：`specs/plans/007-category-expense-charts`
**依據**：本 package 的 `spec.md`、`truth-delta.md`、現有 `specs/truth/techstack.md` 與下列程式邊界。
**狀態**：研究決策完成；圖表、統計入口及新增驗收尚未實作。本輪沒有安裝套件、修改 runtime、API truth 或 data truth。

## 前置 gate 與現況證據

既有 techstack 已明定前端 React webapp、後端 Fastify API、PostgreSQL，前端與後端各使用 Playwright Test + playwright-bdd 跑 Gherkin E2E，後端另用 APIRequestContext 查 HTTP 與權威資料；本輪未改判。依 skill 的「既有 techstack 已寫明」條款，三項必問題均已回答，不重問。產品選項沿用使用者 `1A／2B／3A`；沒有高影響 MODIFY／DELETE 或需新增的研究 clarify。

已讀根憲法與 shared.md；`.agents/constitution/skills/technical-research/research.md` 及 `techstack.md` 不存在，依根憲法不推定額外規則。

| 程式證據 | 對本輪的意義 |
| --- | --- |
| `apps/api/src/modules/expenses/index.ts` | `totals?scope=personal` 在 REPEATABLE READ read-only 交易取得 owner 成員及完整支出，預設 totals 仍是全旅行總額；清單另有分頁。分類 join 包含 owner 條件；分攤以子查詢取得成員集合。 |
| `apps/api/src/modules/expenses/personal-totals.ts` | 個人消費已按成員份額使用 BigInt 有理數累加，同幣別不同歷史 minorUnit 先對齊精度。尚無分類分組或團體共同支出統計。 |
| `packages/shared/src/rational.ts`、`splitting.ts` | 已有約分有理數及 ExactAmount 字串傳輸結構，無需另引入十進位套件。 |
| `apps/web/src/features/expenses/ExpenseShares.tsx` | 既有顯示用整數四捨五入，不把金額轉成 Number；圖表可抽出並共用 formatter，而不依賴 React 元件模組處理金額。 |
| `apps/web/src/features/trips/TripLedger.tsx` | 支出使用 infinite query，頁面有個人 totals、成員及 settlement 多個獨立查詢；不可用已載入 rows 充當完整圖表來源。 |
| `ExpenseForm.tsx`、`categories/Categories.tsx` | 保存支出會失效既有資源；分類修改只失效 categories／expense／expenses，新增統計須補入兩種路徑。 |
| `apps/api/src/modules/splitting/trip-scope.ts`、旅行 management 模組及 API manifest | owner／active gate、垃圾桶、縮圖相關 runtime 與直接依賴已存在；舊 techstack「尚未實作、未加入 manifest」描述已過期，但本次未重新跑產品驗收或部署。 |
| `apps/api/playwright.config.ts`、`apps/web/playwright.config.ts`、根 `package.json` | 兩端 BDD 已有獨立設定與 scripts；前端含 Chromium／WebKit，另有 support 與 UI quality 檢查。 |

## 決策 1：後端同快照產生完整分類統計

- **Decision**: 在既有 expenses 業務邊界增加唯讀分析查詢，由單次 REPEATABLE READ read-only 交易完成 owner／active 檢查、統計對象解析、完整支出與分攤集合／分類名稱讀取，產生個人與團體結果；不依賴清單 cursor、日期範圍或逐頁拉取。一次回傳全部已有支出的幣別及各幣別兩圖資料，前端切換幣別只選擇同一結果的投影。具體 operation 與 schema 交由 `/api-plan`。
- **Rationale**: 支援 FR-005、009、012。PostgreSQL REPEATABLE READ 在同一交易的連續查詢使用一致快照，避免分類、分攤與金額取自不同提交版本。此為讀取當時的一致結果，不保證回應後沒有新寫入；後續重取才取得新結果。[PostgreSQL 18 transaction isolation](https://www.postgresql.org/docs/18/transaction-iso.html)
- **Alternatives considered**:
  - 前端拉完全部支出再加總：增加傳輸與多頁快照不一致風險，且與已載入清單狀態耦合。
  - 個人與團體各發一個查詢：容易各自正確卻取自不同時間，並重複來源讀取。
  - SQL 直接除法聚合：有限 numeric 精度不適合循環份額的權威結果；只讓 SQL 讀取來源與成員集合，再用既有有理數加總。

來源查詢須避免 expense JOIN shares 後把同一筆團體原金額重複累加；沿用每支出一列＋分攤成員集合的形狀。幣別清單來自全部旅行支出，即使該幣別只有他人單人消費、兩圖均零也可選。另提供旅行全幣別的「是否有共同支出」資訊，不能只由目前幣別的非零分類推斷團體圖資格。無共同支出時的實際呈現交 `/ui-plan`。

## 決策 2：重用精確份額，分類統計不新增持久化狀態

- **Decision**: 沿用 `packages/shared` 的 BigInt 約分有理數、ExactAmount 及既有支出／分攤／分類資料。純計算接收來源與明確的統計 memberId，按 currencyCode 與穩定 categoryId 分組；未分類採 null 分組。每幣別先取所有來源的最大保存 minorUnit，將金額提升至共同尺度，再計算份額與分類總額；兩圖在相同幣別使用相同尺度。團體資格為不同分攤成員至少二人，原始金額只計一次，包含已停用歷史成員。還款與結算調整不進來源集合。
- **Rationale**: 支援 FR-002～004、006～007、010 及 NFR-001。現有 personalTotals 已處理不同歷史 minorUnit，分類版本不能退回依現行幣別精度重解讀舊值。分類統計是衍生值，現階段不需新表、migration 或資料快取服務；由 data owner 最終盤點 schema NOOP。共用僅抽取確實重複的尺度與累加規則，保留 totals 原 response 與預設 scope。
- **Alternatives considered**:
  - 逐筆取兩位小數再加總：三筆 JPY 100/3 會得到 99.99，違反精確加總。
  - 儲存預先彙總表或 materialized view：新增編輯、分類改名與刪除的一致性維護，現階段無量測需求。

資料完整性由既有非空且不重複的 shares 約束維護；讀到不合法資料不能以零或空圖掩蓋。分類名稱只是顯示標籤，不作 group key。正數但顯示取整為零的分類保留明細，不視為沒有消費。

## 決策 3：採 shadcn/ui Chart＋Recharts 與常駐文字明細

- **Decision**: 使用 shadcn/ui 本地 Chart 元件搭配 Recharts 3 系列的 PieChart／Pie／Tooltip／響應式容器，統一 CSS tokens、分類色彩與提示框外觀。滑鼠 hover 顯示該分類名稱、選定幣別金額及占比；金額取自精確 payload 的 formatter，不使用圖表的近似權重作金額。手機以點按分類明細或圖形取得相同資訊，鍵盤提供可聚焦的分類控制與可讀明細；常駐 HTML 明細保留，hover 不作唯一資訊來源。選取狀態以 categoryId 管理，兩圖同分類用一致色彩，不自行合併「其他」。
- **Rationale**: 使用者補充希望 UI 舒服、可 hover 顯示更多資訊，原先「只有靜態圖」的解讀過窄。提示框、響應式及互動狀態持續演進時，採用現成組件比自行維護路徑、定位及事件更符合本案成本。shadcn Chart 以 Recharts 組合，提供 ChartTooltip／ChartTooltipContent 與 CSS 變數設定，容器須給定高度或 aspect ratio。依專案憲法，這屬可沿用並以品牌樣式客製的共用元件；美觀仍須由 UI 設計決定，不把安裝套件當成已達成視覺品質。[shadcn/ui Chart](https://ui.shadcn.com/docs/components/chart)
- **Alternatives considered**:
  - 自製 React SVG：適合穩定的靜態圖，能做好看；新增 tooltip、觸控、焦點、尺寸與動畫後，需自行維護更多行為，本案不再採用。Recharts 也使用 SVG，差別在維護責任，而非繪圖格式。
  - 直接使用 Recharts、不引入本地 Chart 組件：可行，但仍須自行整合品牌提示框、圖例與容器；沿用 shadcn 組成較符合現有設計系統。
  - Canvas 圖表引擎：本案無大量圖形吞吐需求，且需另整合 React 與可及明細，暫無採用理由。

此為使用者補充方向後的選型修正；未增加分類鑽取、支出明細清單或其他尚未定義的 tooltip 資料。圖表位置、圓餅或圓環外觀、手機排列、預設幣別、占比小數位及互動視覺細節交 `/ui-plan` 確認。選取狀態與提示框的手機／鍵盤行為須列入後續 UI handoff 與驗收，不能只驗證桌面 hover。

套件採 Recharts 3 系列，實作時確認穩定版 patch 並固定直接依賴與 lockfile；官方安裝說明另要求 react-is 與已安裝 React 版本一致，本專案 React 是 19.3.1，須核對對應 react-is 可用性與所選 Recharts 的 peer dependencies。shadcn Chart 為匯入並維護的本地元件，不是另一個獨立圖表引擎；僅加入需要的組件，不為圖表更換整站 UI primitive。未安裝、未跑 typecheck／build 或量測 bundle，不宣稱版本組合已驗證。[Recharts 官方安裝說明](https://github.com/recharts/recharts#installation)

## 決策 4：金額維持精確，僅在繪圖邊界轉成有界比例

- **Decision**: HTTP 金額維持 ExactAmount 的十進位整數字串分子、分母與 minorUnit。金額格式化重用既有 BigInt formatter；顯示占比也以有理數做定點取整，不回寫金額。累積占比先在 BigInt 中縮放至 `10^12` 個單位、整數除法後，再以相鄰累積值之差取得 Recharts 的非負權重；最後累積終點固定為完整尺度。只將有界權重轉成 Number 供圖表算角度，不把原始金額傳作數值權重。固定尺度只屬繪圖近似，不是帳務精度或顯示占比位數。極小分類可能小於一像素，保留常駐文字，不強加最小扇形扭曲比例。
- **Rationale**: 不把原始分子分母直接 Number 化，可避免超出安全整數或兩端皆 Infinity。JSON 不直接序列化 BigInt，沿用既有字串契約。BigInt 除法會截斷，故必須先縮放，且格式化四捨五入與幾何量化分開。[MDN BigInt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt)
- **Alternatives considered**:
  - `Number(numerator) / Number(denominator)`：巨大值可能溢位，且易將繪圖近似滲入帳務。
  - 使用已顯示的百分比作扇形權重：會把尾差與顯示取整變成幾何誤差。

2026-11-19 以 Python Fraction 做獨立算術可行性實驗：三份 100/3 精確總額為 100，累積終點 0.333333333333／0.666666666666／1；混合 123.45 與 100 的共同尺度結果為 223.45；含 401 位數金額仍產生有限、單調且終點為 1 的繪圖比例；1 對 10^30 的極小分類可能量化為零。此為有界比例演算法研究實驗，不是已實作 TypeScript、Recharts adapter 或瀏覽器驗收證據。

## 決策 5：帳號範圍快取與完整失效路徑

- **Decision**: 沿用 TanStack Query＋fetch，分析 query key 建議 `['account', accountId, 'expense-analysis', tripId]`；本輪一次讀取全部幣別，因此 currency 是本地選擇、不增加 query key。若 API owner 改為按幣別查詢，key 必須同步加入 currencyCode。支出保存／刪除及分類改名／清除關聯成功後失效 analysis；分類屬帳號級，可先失效該帳號全部 analysis，避免漏掉其他旅行引用。同帳號跨裝置沿用重新進入／refocus 等既有重取機制，不新增即時推送。
- **Rationale**: Query key 須包含實際影響讀取的變數；目前修改流程的固定資源列表不會自動涵蓋新 query。旅行移入垃圾桶／purge、切換帳號與登出需沿用取消 in-flight 及移除舊快取；背景更新保留同範圍舊資料並標示狀態，切換旅行不可顯示前一旅行資料。[TanStack Query keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)
- **Alternatives considered**:
  - 直接從現有 expenses query 推導：只有已載入頁，且分類改名失效的範圍不足以保障新分析。
  - localStorage 永久保存分析或 WebSocket 即時同步：前者新增過期與帳號隔離責任，後者超出目前單 owner 功能。

如果當前幣別隨支出刪除或改幣別而消失，選擇必須與新 payload 的幣別集合對齊，不能保留一張冒充最新結果的舊圖；具體 fallback 排序留待 UI 設計。背景失敗、paused、重試延續既有 QueryState／waiting 模組。

## 決策 6：以成員歸屬保留協作擴充邊界

- **Decision**: HTTP 層先驗登入帳號對旅行的 owner 權限，再以固定 owner memberId 呼叫純統計計算；不提供任意 memberId 的對外切換，不新增帳號認領表、角色模型、邀請 token 或通用 ACL。分析計算不依賴 session、顯示名稱或付款人。
- **Rationale**: 滿足 FR-004、014，未來帳號與同行者的對應可以在授權／對象解析層處理，分類與份額計算可沿用；不保證協作功能可零修改導入。未來仍需獨立規劃認領、可見範圍與衝突策略。
- **Alternatives considered**:
  - 將 session userId 當分攤成員 ID：目前兩者是不同實體，會混淆消費歸屬與授權。
  - 現在先建多帳號共編資料模型：產品決策尚未形成，增加沒有驗收意圖的流程與 schema。

## 決策 7：兩端維持 Gherkin E2E，補算術與幾何單元驗證

- **Decision**: 前端 Playwright Test＋playwright-bdd 驗瀏覽器→真 API→測試 PostgreSQL；後端以獨立 Playwright Test＋playwright-bdd＋APIRequestContext 驗 HTTP 與權威來源。沿用正式 migrations、既有 fixtures／隔離策略。Vitest 只補精確分類 reducer、格式化與幾何邊界，不替代主驗收 E2E。
- **Rationale**: techstack 已拍板且本輪未改判。兩端 E2E 能涵蓋完整支出來源、隔離、失效及圖表呈現；純函式層適合覆蓋大分子、循環份額、共同尺度與有限角度。預期值由獨立 fixture 與分數 oracle 計算，不呼叫產品 reducer 當 oracle。
- **Alternatives considered**:
  - 僅單元測試＋手動查看：不能驗證查詢是否漏頁、權限拒絕或分類修改後失效。
  - 截圖快照作主驗收：不符合現有無截圖式回歸策略，也不能證明帳務正確。

後續驗證矩陣：

| 範圍 | 必要驗證 |
| --- | --- |
| 個人／團體 | 自己單人、他人代付、僅墊款、付款人不參與、其他成員單人、兩人／三人分攤、歷史成員停用；團體無重複加總。 |
| 金額 | 三筆 100/3、同幣別不同歷史 minorUnit、巨大字串、單分類全圓、零總額、正數但取整為零、極小比例；讀取與顯示不改資料。 |
| 範圍 | 超過一頁、旅行外日期、其他旅行／帳號、未分類、只有他人單人消費的幣別、共同支出存在但當前幣別無共同消費。 |
| 更新 | 金額／幣別／分類／分攤者修改、刪除、分類改名、最後共同支出消失；還款與結算不影響消費。 |
| 一致性與權限 | 控制讀取／寫入交錯，確認兩圖同來源快照；未登入、他人、trash／purged 依既有規則拒絕；切換帳號與舊 in-flight 不洩漏。 |
| 前端狀態與可及性 | 初載、空、失敗重試、背景失敗保留、paused、切換旅行／幣別；手機與桌面、Chromium／WebKit、hover tooltip、點按／鍵盤選取及提示關閉、無 hover 完整數值、減少動態效果。 |

## 殘餘風險與 handoff

- 查詢與有理數加總成本隨旅行支出及分攤數增加；目前未量測查詢計畫、最大分母、記憶體、payload 或延遲，不宣稱任何容量／毫秒保證。實作以真 PostgreSQL 的多頁與較大資料集量測，若瓶頸出現再比較批次／查詢最佳化，不直接引入 Redis 或彙總表。
- Recharts 的全圓、零值、極小權重、長分類名稱、大量分類、tooltip 邊界與手機／鍵盤選取須在瀏覽器驗證；圖表動畫須遵循 reduced-motion。未做套件安裝、bundle 比較或完整人工螢幕閱讀器驗證，不宣稱已通過。
- `/system-analysis` 承接分析介面與 wave；`/api-plan` 確認同快照結果、全幣別列表、個人／團體零值與共同支出存在資訊的正式 schema；`/data-plan` 檢查既有來源與索引是否足夠；`/dsl-refine` 承接已確認驗收意圖。上述 owner 尚未執行，本文件不替它們修改 truth。
- `spec.md` 兩項不阻塞的呈現缺口仍交 `/ui-plan`；本輪沒有進入 UI 設計確認或多人協作設計。
- techstack 僅同步 006 程式與依賴已存在的工作區事實，保留歷史研究及待驗證範圍，不把本次讀碼當部署或測試證據。
