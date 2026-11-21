# 系統分析規劃：旅行分類花費圓餅圖

**日期**：2026-11-19；**狀態**：系統分析、API/data、approved design-v1及介面DSL細化已完成；本輪 `/tasks` 已產出135項執行規劃，全部未執行，可從 `/implement` T001開始；產品尚未實作或驗收。

## 專案結構

### 文件結構（本功能）

```text
specs/plans/007-category-expense-charts/
├── spec.md
├── research.md
├── plan.md
├── truth-delta.md
├── checklists/requirements.md
├── features/acceptance/        # 已有四份、13 條 Journey
├── ui/                        # 本輪 C 類差異設計與確認交接
│   └── ui-plan.md
└── handoff.md                 # 本輪 checkpoint 與續跑狀態
```

`tasks.md` 已由對應skill建立；interface feature／DSL位於唯一truth root，細化對照在`dsl-refine-review.md`、檢查證據在`checks/`；不建立package-local contracts或第二份data truth。

### 原始碼結構（儲存庫根目錄）

```text
apps/api/src/modules/expenses/       # 現有支出、totals；新增分類分析責任落此邊界
apps/api/src/modules/splitting/      # 現有 owner／active gate、精確來源與 revision
apps/api/src/db/                     # schema、正式 migrations
apps/web/src/features/trips/         # TripLedger 與旅行生命週期
apps/web/src/features/expenses/      # 分類分析、既有金額 formatter／支出修正
apps/web/src/features/categories/    # 分類改名、解除關聯後的分析失效責任
apps/web/src/components/             # shadcn Chart、waiting、共用設計元件
packages/shared/src/                # ExactAmount 與 BigInt 有理數
specs/truth/contracts/              # API owner 的唯一契約來源
specs/truth/data/                   # data owner 的唯一模型來源
```

**結構決策**：延伸既有 monorepo，不增加服務、第三方分析 API、匯率來源或共編系統。Recharts 是前端依賴，不是獨立外部系統介面。圖表以已保存支出衍生，不將還款／結清調整轉成消費。

## 分析流程規劃

### 系統介面的盤點

本次需求共盤點出 `3` 個系統介面。

1. **IF-01 旅行分類花費與互動檢視**
   - 端點類型：前端 webapp 端點。
   - 主要介面：帳本內分析入口／區塊、個人與團體兩圖、共享幣別選擇、分類明細、hover／手機點按／鍵盤選取、初載／空／失敗／背景更新、旅行／帳號切換。
   - 需求原文依據：「透過分類清楚得知整體花費」、「個人花費圖＋團體花費圖」及使用者補充 UI 舒服、hover 更多資訊；FR-001、005、008～013、NFR-002；四份 acceptance。
   - owner：`/ui-plan`；程式落點與 feature 的畫面對應由 UI handoff 交付。
2. **IF-02 完整旅行分類分析讀取契約**
   - 端點類型：後端 HTTP API 端點。
   - 主要介面：同快照取得全部幣別、個人份額與團體原始消費的分類精確金額、總額、旅行共同支出存在資訊；沿用 session／owner／active／錯誤模型；不改既有 totals 預設語意。
   - 需求原文依據：「個人花費包含分帳後消費」、使用者 `1A／2B／3A`；FR-002～007、009～010、014；research 決策 1、2、6。
   - owner：`/api-plan`；具體 operation／schema 不在此預先編造。
3. **IF-03 分類分析的權威來源與資料關聯**
   - 端點類型：既有 PostgreSQL 資料端點。
   - 主要介面：expenses、expense_shares、trip_members、categories、trips 的穩定身分、歷史 minorUnit、未分類與停用成員關聯、完整旅行來源查詢與生命週期；盤點是否需要模型或索引改動。
   - 需求原文依據：FR-002～004、006～007、010、012、014 與關鍵實體；research 指定即時計算、不新增彙總狀態。
   - owner：`/data-plan`；即使判定不新增表或 migration，也需寫明 NOOP 範圍與原因。

### UI 影響分流與交接依據

固定產品 HEAD：`d00f8b066ccb37645eb5b12ba16731a012c5d928`。基準檔與文件固定 commit：`8fc9f94134c66ffd29918014b950894b1007aa86`，採其 `specs/ui-baseline/split-ledger.pen`、`ledger-baseline.md`、同版 `previews/ledger-desktop.png`／`ledger-mobile.png`／`ledger-expenses-desktop.png`／`ledger-expenses-mobile.png`。baseline-v0.2 帳本批准範圍維持，不把新增圖表當成已批准。產品與基準有時間差，UI owner 須核對目前相關頁面，記錄差異，不重建全站基準。

| 範圍／介面 | A／B／C 與理由 | 畫面／狀態 ID、路由／行為 | 固定基準或既有呈現依據 | 本次行為來源 | 委派／驗證責任與依賴 |
| --- | --- | --- | --- | --- | --- |
| IF-01 新分類分析 | C：新增資訊、控制、提示框與狀態 | 既有 `/trips/:id`、`ledger/main/desktop` K4fUl、`ledger/main/mobile` j4FlQR；本次 `analysis/main/{desktop,mobile}`、`analysis/detail`、`analysis/states` 等穩定 ID 由 UI 索引綁 frame | 上述固定基準＋同版預覽；1440×900、390×844，中間寬度按現有 responsive 規則適配 | spec US1／US2、FR-001～014、NFR-001～002、acceptance；使用者已於 2026-11-19 明確批准 design-v1；有效版本／原回覆見 ui/ui-plan.md | `/ui-plan` 交付可編輯 .pen、同版預覽、差異、確認範圍；設計確認已有效，可接續前端 DSL；tasks 尚待介面 feature／DSL |
| IF-02／IF-03 分析資料 | C 的行為依賴：支援新增圖表，不能以只改後端判為 A | 同上兩圖與空狀態；API 不決定圖表位置／圓餅圓環外觀 | 同一 UI handoff；金額以 spec／truth 為權威，截圖不證明帳務正確 | spec 計算定義、research 同快照／精確字串、既有 totals／權限／生命週期 | data／API owner 可先完成明確的資料與授權契約；不依賴設計待定的排列／占比顯示位數 |
| 既有 totals、支出／分類保存、旅行管理 | B：沿用呈現，只增加分析更新責任 | 帳本、ExpenseForm、Categories、旅行管理；既有入口與忙碌／錯誤狀態沿用 | 固定產品 HEAD 的 TripLedger.tsx、ExpenseForm.tsx、Categories.tsx、trip management 與既有等待 truth；基準帳本／支出視窗 | FR-012～014；既有 expenses／categories／trips／design-system truth | 驗總額相容、分類改名跨旅行失效、帳號與生命週期快取；若增加新入口或重新排列則納入上列 C，不自行擴大 B |

### 分析流程的安排

#### Wave 1 — 資料來源核對與 UI 差異設計

- 可平行分析介面：IF-03 資料來源；IF-01 設計。資源模式下實際使用主代理與一名既有輔助代理，不另建代理。
- 分析重點：data owner 確認來源、minorUnit、歷史成員、分類與索引；UI owner 延伸固定帳本 frame，設計兩圖排列、共享幣別、明細／提示框、手機／鍵盤及必要空／載入／錯誤／背景狀態，解決 spec 的低風險呈現待定項。
- 安排理由：產品計算定義已確認，資料來源盤點不依賴視覺布局；UI 以已確認語意與示例設計，不必等待具體 JSON 欄名。
- 就緒／受阻：資料檢查完成即可供 Wave 2 使用；UI 獨立交付後須使用者確認，未確認只阻擋依賴該版設計的範圍，不宣稱整個 Wave 已完成。

#### Wave 2 — 分類分析 API 契約與跨 owner 核對

- 分析介面：IF-02。
- 分析重點：新增唯讀契約；回傳全部已有支出幣別、兩圖精確分類／總額、未分類、零值及共同支出存在語意；owner／active gate；同快照與不分頁；保留既有 totals 及錯誤語意。
- 安排理由：API 需以 Wave 1 的資料 owner 結論為來源；視覺設計的排列、占比格式及 tooltip 位置不改精確來源或授權，故該子範圍可在 UI 等待確認期間繼續。
- 決策依賴：spec `1A／2B／3A`、research 決策 1～2／4～6、data delta；若 UI 新增需求超出既定分類資訊則回交 owner，不猜新欄位。
- 完成後：後端獨立範圍可交 `/dsl-refine`；全 plan 的前端細化與 `/tasks` 仍需適用 UI 有效確認及相應 feature／DSL，不能直接開始實作。

## Planner handoff 與資源契約

- 共通 handoff：plan package `specs/plans/007-category-expense-charts`；truth root `specs/truth`；delta `specs/plans/007-category-expense-charts/truth-delta.md`；本文件的 IF／UI 分流／固定基準／wave 及 acceptance 為共同輸入。只允許各 owner 寫其授權範圍。
- `/data-plan`：IF-03，優先執行，完成後以 delta 交 API owner；無新 schema 仍盤點 NOOP，不建立分析彙總表或多人協作模型。
- `/ui-plan`：IF-01，C 類一般模式，只寫本 package `ui/**`，不修改 baseline 或 truth；使用正式支援 .pen 的工具，不以 HTML／PNG 假充設計檔。prototype 依互動問題選用，不預設做整站 prototype。
- `/api-plan`：IF-02，data 完成後執行；維護全系統唯一 contract，並透過 `/truth-delta` 更新自己的表。
- 主代理 `/root`：orchestration、plan 與 UI；既有輔助代理 `/root/record_truth_delta` 順序承接 data／API owner，不新增子代理；同時重型工作上限 1、測試 worker 上限 1；本輪不啟動產品測試／瀏覽器 server。
- `profile=low-memory-16gb`：實體 RAM／swap 因 sysctl 權限受限而未知，不宣稱記憶體穩定。既有 Pen CLI 可用；開啟 session 後記錄其 ID 及退出，無法對應工具 OS PID 時明列未知。依序進行必要設計工具操作，未啟動的環境不虛構 teardown。

## 交付狀態

| 介面／範圍 | 實際結果 | 後續就緒與依賴 |
| --- | --- | --- |
| IF-03 | `/data-plan` 完成，DBML Project Note 補分類分析來源；無新增表、欄位、migration 或索引。delta ADD 1／NOOP 3 | 可供 API／後端 feature 細化使用；查詢效能仍待實作量測 |
| IF-02 | `/api-plan` 完成，新增 `GET /api/trips/{tripId}/expense-analysis` 與四個 schema，保留既有 totals；delta ADD 6／MODIFY 1／NOOP 2 | API／後端獨立範圍可交 `/dsl-refine`，不是已實作 API；contract 版本 0.4.0 是文件版本 |
| IF-01 | `/ui-plan` 已恢復，正式工具儲存 design-v1、9 張預覽及畫面／行為索引；使用者已回覆「UI 確認 ok」 | 見 `ui/ui-plan.md`；本版設計依賴解除，可交前端 `/dsl-refine`，tasks／實作仍依後續關卡 |

- Wave 1 的資料子範圍完成，UI 子範圍已交付並取得有效確認；Wave 2 已依明列的獨立依賴完成。三個介面規劃現已就緒；設計批准只解除本版設計依賴，不代表產品已驗收。
- `/dsl-refine` 已完成完整前後端介面細化：新增後端3檔／前端5檔、89條原子Rule/Example，expenses DSL新增後端29列／前端74列，保留既有feature與DSL語意。13旅程覆蓋、批准UI位置、解析/拓樸及獨立審查證據見 `dsl-refine-review.md` 與 `checks/dsl-refine-*`。可進 `/tasks`；尚未建立tasks、安裝Recharts、寫StepDef或實作產品。
- Session checkpoint：已完成介面細化與獨立審查；已保存 `handoff.md`、`dsl-refine-review.md`、`checks/dsl-refine-*` 及 `ui/ui-plan.md`。`ui/split-ledger-007.pen` 現為正式工具儲存的 design-v1，SHA256 與有效範圍見 UI 索引；原先只有來源副本的狀態已被本版取代。
- Pen CLI 0.3.14 headless 不支援來源 2.22；桌面連線曾建立但未載入設計。使用暫存安裝的官方 0.3.16 後可啟動，首次讀取即被本期額度阻擋；沒有繞過限制或手工修改 .pen。三個 interactive sessions 41455／85306／60142 均已正常 exit=0，失敗連線 81907 exit=1。Pen 桌面 app 保留，未代關使用者應用程式。

- UI 恢復補充：使用者切換 Pen 桌面帳號後，主代理已透過正式工具匯入相關來源圖層並延伸；原始 baseline hash 不變。提案新增 `/trips/:id/analysis` 與帳本入口；不增加系統介面數量。批准須綁定 design-v1，不把換帳號／continue 當成設計批准。

- 2026-11-19 確認完成：本 chat 使用者原回覆「UI 確認 ok」；批准依據與註記更新後交付 hash 見 ui/ui-plan.md。未修改產品／truth／baseline，不要求使用者重新確認已批准範圍。

- 2026-11-19 `/dsl-refine`：所有新增Example恰一When；兩介面拓樸零錯誤、零警告，文件解析不代表產品測試通過。truth-delta由對應skill記錄；後續tasks須保留Phase3測試層獨立review、代表桌機/手機比對、最終UI家族審查與baseline回填/獨立核對。

- 2026-11-19 `/tasks` 完成：`tasks.md`含T001–T135，Setup/Foundational/103條DSL RED與全批review/8份Feature GREEN→REFACTOR/代表比對/最終完整回歸及唯一UI gate/驗收後baseline回填與獨立核對。所有任務未勾選，下一入口`/implement` T001；tasks靜態驗證見`checks/tasks-validation.json`。本輪只改plan-side，未修改truth、安裝依賴或實作產品。
