# 系統分析規劃：旅行垃圾桶、自訂縮圖與全站等待回饋

**建立日期**: 2026-11-13  
**Plan Package**: `specs/plans/006-trip-management-and-loading`  
**Truth Root**: `specs/truth`  
**Truth Delta**: `specs/plans/006-trip-management-and-loading/truth-delta.md`

## 專案結構

### 文件結構（本功能）

```text
specs/plans/006-trip-management-and-loading/
├── spec.md
├── research.md
├── checklists/requirements.md
├── features/acceptance/        # 5 份、47 組旅程模板、121 個展開案例
├── truth-delta.md
├── plan.md
├── ui/                        # Wave 3：UI plan、.pen、預覽及確認關卡
│   ├── ui-plan.md
│   └── handoff.md
└── tasks.md                   # 後續 /tasks，尚未建立
specs/truth/
├── techstack.md               # 技術研究已更新，新增方向尚未實作
├── contracts/                 # Wave 2：/api-plan 唯一 API truth
├── data/                      # Wave 1：/data-plan 唯一資料模型 truth
└── features/                  # 後續 /dsl-refine；本輪不改介面 feature/DSL
```

### 原始碼結構（儲存庫根目錄）

```text
apps/api/
├── src/app.ts                 # Origin、JSON gate、錯誤、SPA fallback 整合邊界
├── src/modules/
│   ├── trips/
│   ├── splitting/trip-scope.ts
│   ├── expenses/
│   ├── members/
│   ├── repayments/
│   ├── settlement/
│   └── categories/
├── src/db/                    # schema、migration 執行器
├── drizzle/                   # 既有 SQL migrations 不回寫；未來以新 migration 演進
└── tests/                     # 後端 Gherkin E2E 與支援檢查
apps/web/
├── src/app/                   # 路由與登入狀態
├── src/features/              # 旅行、支出、分類、同行者、還款與結清
├── src/components/            # QueryState、FormDialog、Button 與設計系統
├── src/api/                   # JSON 請求與未來圖片上傳／查證整合
└── tests/                     # 前端 Gherkin E2E 與 UI 品質檢查
packages/shared/               # 既有精確帳務；不因垃圾桶或換圖改算式
```

**結構決策**: 延續既有 Web、HTTP API、PostgreSQL 與 shared workspace。圖片採研究已選定的有界 WebP／bytea，不新增外部儲存、媒體服務、原生手機端或排程端；Google 登入與 Railway 為既有環境依賴，不另拆為本次分析介面。產品程式、migration、依賴安裝及測試實作皆不在本輪 planner 寫入範圍。

## 分析流程規劃

### 系統介面的盤點

本次需求共盤點出 `3` 個系統介面；每個介面由一個 planner 承接，同 planner 的相關需求合併交接。

1. `旅行生命週期、縮圖與操作結果持久化介面`
   - 端點類型：資料庫端點。
   - 主要介面：一般／垃圾桶旅行狀態、復原與整趟清除、旅行專屬帳務及縮圖關聯、最小操作查證與去重、既有歷史保護的受控例外、備份邊界。
   - 需求原文依據：使用者選擇 `1B`「移至垃圾桶，可復原」、`2A`「上傳自己的圖片」；FR-002～008、FR-010～013、FR-017～018、NFR-004 及 spec 的關鍵實體。
   - 委派：`/data-plan`，唯一寫入範圍為 `specs/truth/data/**`，另交 `/truth-delta` 記錄 data owner 區段。

2. `旅行垃圾桶、縮圖與結果查證 API 介面`
   - 端點類型：後端端點。
   - 主要介面：旅行清單與單筆狀態、移入／復原／永久刪除、圖片上傳／更換／恢復預設及私有讀取、結果查證；旅行底下全部業務讀寫的 active scope、錯誤與權限語意。
   - 需求原文依據：FR-001～018、SC-001～005；確認後操作、跨裝置保存、圖片格式與大小限制、結果未明與不重複送出皆需權威契約支撐。
   - 委派：`/api-plan`，唯一寫入範圍為 `specs/truth/contracts/**`，另交 `/truth-delta` 記錄 API owner 區段。

3. `旅行管理、自訂縮圖與全站等待回饋介面`
   - 端點類型：前端端點；手機與桌面為同一 Web 介面的適配尺寸。
   - 主要介面：旅行清單與帳本入口、垃圾桶與確認／取消、圖片選擇與預覽、等待／空白／失敗／衝突／結果未明，以及全站既有表單、分頁、身分及查證回饋。
   - 需求原文依據：使用者要求「確認 dialog 進行防呆」、`2A` 與 `3A`「全站資料載入與操作等待」；US1～3、FR-001、FR-009～017、NFR-001～004、SC-006。
   - 委派：`/ui-plan`，只寫本 package `ui/**`；設計確認與 prototype 同步依 skill 明確關卡執行，不直接改產品 UI 或 truth。

### 分析流程的安排

#### Wave 1：資料生命週期與原子邊界

- 分析介面：`旅行生命週期、縮圖與操作結果持久化介面`。
- 委派：一次 `/data-plan`，合併垃圾桶、圖片與去重資料，避免三份相互矛盾的模型。
- 分析重點：
  - 以 spec 及 research 的既定業務邊界，收斂旅行狀態與版本、完整保留／復原及永久刪除範圍；不改成封存副本或另建一趟旅行。
  - 盤點現有 RESTRICT 關聯、owner 與還款／結清 immutable triggers、deferred checks，定義整趟清除的精確例外，保留一般單筆帳務保護。
  - 收斂目前縮圖的一對一關聯、格式／尺寸／容量驗證責任、垃圾桶保留與清除完成邊界、原始照片不持久化。
  - 收斂回應遺失時的最小操作結果與防重複資料、較新意圖不被過期重送覆蓋、已刪旅行識別不能被原建立重試復活；不得保留可復原的帳務或圖片內容充作 tombstone。
  - 盤點跨裝置與圖片處理競爭、owner 隔離、同旅行鎖序、共用分類仍受引用保護，為 API 提供可實現的生命週期及查證資訊。
- 安排理由：API 的成功、衝突、可重試與永久刪除完成語意依賴這些狀態與交易責任。已有完整 spec 與旅程，不需等待 UI 選擇按鈕位置才能先收斂資料。
- 交付完成條件：data truth 完整更新及可解析，data owner 的 delta 已記錄；不能把 DBML 規劃當成 SQL migration 已執行。

#### Wave 2：權威契約與全部旅行存取邊界

- 分析介面：`旅行垃圾桶、縮圖與結果查證 API 介面`。
- 前置條件：Wave 1 data truth 與 delta 完成，沒有未解的資料生命週期衝突。
- 委派：一次 `/api-plan`，生命週期、multipart、binary 圖片與既有子資源一起分析。
- 分析重點：
  - 定義一般清單與垃圾桶、必要辨識投影、狀態轉移及查證介面；對外投影只提供 owner 可用資訊，不把內部資料庫欄位直接當公用契約。
  - 明確區分已成功、已失敗、查證中／未確認、過期意圖、重複原操作及永久刪除結果；只見一般清單缺少旅行或單筆 404 不足以證明特定 purge 成功。
  - 定稿靜態 JPEG／PNG／WebP、10,485,760 bytes、25,000,000 px、單邊 16,384 px、動畫／多頁拒絕、單張與實際內容驗證，以及 512 KiB WebP 保存結果對外如何揭露。
  - 明確限定 multipart 為既有 JSON 規則的上傳例外；延續 Origin、session、owner、額外欄位拒絕；盤點總量／時間／斷線／繁忙及二進位錯誤回覆。
  - 逐一承接 trips、expenses/totals、members、repayments、settlement 與圖片普通讀取／寫入的垃圾桶限制；共用分類與幣別仍按原契約運作，不將分類的垃圾桶引用誤算為可刪。
  - 特別檢查 `apps/web/src/features/expenses/save-outcome.ts`：現有刪除查證將單筆 404 視為已刪除。owner 的垃圾桶拒絕必須能與資源真正不存在區分，不能因隱藏帳本而錯認單筆刪除完成；未知結果的草稿與查證下一步仍需保留。
  - 保留既有日期、精確帳務、部分還款、超額確認及查證語意；新能力的變更以使用者 `1B／2A／3A` 為授權，不藉此刪除無關契約。
- 安排理由：使用 Wave 1 已收斂的狀態與資料關聯定義可支援的對外契約；先取得明確錯誤／查證結果，再交 UI 設計文案與下一步。
- 交付完成條件：唯一 API truth 完整可解析、引用有效且與 data truth 一致，API owner delta 完成；契約完成不等於服務實作或 E2E 通過。

#### Wave 3：UI 設計、可見預覽與開發者確認

- 分析介面：`旅行管理、自訂縮圖與全站等待回饋介面`。
- 前置條件：Wave 1／2 的 data、API truth 與 delta 完成。
- 委派：一次 `/ui-plan`，合併新旅行操作與全站共用等待狀態，避免只畫新增垃圾桶而漏掉既有全站流程。
- 分析重點：
  - 延續現有旅帳設計語言及可重用元件；先閱讀既有 005 設計、當前正式 UI 與樣式，舊版確認不作為 006 已批准的依據。
  - 定義旅行操作與垃圾桶入口、兩種不同後果的確認 dialog、取消／關閉、成功後去向與焦點、衝突／失敗／結果未明的下一步。
  - 2026-11-13 使用者確認調整 A：垃圾桶納入「我的旅行」導覽，桌機為側欄次層、手機為次級選單；dialog 右上 X 與取消同義，取消採中性樣式，取消與主要操作緊鄰成組；「記一筆／管理旅行」並排同高，所有按鈕內容水平／垂直置中。這是對 design-v1 的修改要求，不是批准新版設計。
  - 同日使用者對 design-v2 再要求：「重新選圖／恢復預設圖」相鄰分組；有 spinner 的等待狀態不搭配可見 loading 文字。busy 按鈕維持原尺寸並置中 spinner，操作名稱與等待語意透過無障礙名稱／隱藏狀態文字提供；錯誤、結果未確認與下一步仍保留可見說明。
  - 同日針對 design-v3 的縮圖操作再完成 `/clarify`，使用者回覆「1 -2、2 - 2」：重新選圖使用淡綠底，恢復預設圖使用中性外框；整組在檔名同列靠右，手機不足寬時整組換到下一列。此回覆授權 design-v4 修訂，並非對修訂後畫面的批准。
  - 使用者認為 design-v4 兩鍵仍過於突出，後續選擇「低調的文字工具列」：小字、中性灰、無常態底色／外框，兩個入口相鄰；hover／focus 提供回饋，保留足夠點擊範圍。桌機檔名右側同列、手機整組換行；此為 design-v5 修訂依據。
  - 使用者後續選定統一「先預覽、按保存才生效」：重新選圖用 primary 文字色、使用預設圖用中性色，兩項 14px。兩個入口只改本地草稿；提交前取消／X／Escape 放棄，保存才依照片／預設意圖提交既有 POST／DELETE，保存後關閉不等於撤回。Spec、research 與 acceptance 已依此同步；API／data truth 的命令與持久化語意維持，無新增 endpoint 或資料表。
  - 定義圖片選擇、限制揭露、預覽／取消、更換／恢復預設、上傳處理中、拒絕與 fallback，圖片不能遮蔽旅行名稱、日期、筆數及記帳入口。
  - 覆蓋 spec 全站表的登入身分、旅行／垃圾桶／總額、支出及選項、分類、成員、付款安排、還款與結清；區分初次骨架、局部／背景更新、分頁、busy、paused、空資料與查證／unknown，禁止假百分比或假零金額。
  - 提供桌面、手機及關鍵狀態設計／預覽，建立穩定畫面 ID、共享狀態覆蓋對照、版本與雜湊、真實預覽證據及待確認續跑點。
  - 保護既有 AppShell 的旅行內導覽：桌機在「我的旅行」下縮排同行者／分帳結算，手機保留同底列五項與唯一 active。垃圾桶不是有效 tripId，新增靜態路由不得被一般旅行匹配誤認而顯示錯誤子導覽。
- 安排理由：UI 依已確認 API/data 來源設計可實現的操作與狀態。此波的視覺確認是獨立交付關卡，不倒過來阻擋已完成且不依賴視覺的後端分析。
- 交付完成條件：交付 UI plan、可編輯 `.pen` 與桌機／手機可見預覽，取得本版開發者明確確認。2026-11-13 使用者已確認 design-v7，並明確省略本次 prototype 與截圖比對驗證；本輪以前期設計稿完成 UI 規劃關卡，可交接前端 DSL／tasks。正式產品的驗收需求保留至實作階段。

### 驗收情境與分析責任追蹤

| Plan-side acceptance                               | 主要驗收責任                                                                          | 承接介面／Wave                                                         |
| -------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `trip-trash-and-restoration.feature`               | 確認／取消、完整復原、整趟永久刪除、分類引用、清單空狀態、無自動清除                  | 資料 Wave 1；契約 Wave 2；入口及確認／空狀態 Wave 3                    |
| `trip-state-conflicts-and-access.feature`          | 垃圾桶業務拒絕、失敗原子性、寫入／上傳競爭、過期重送、結果未明、跨帳號與登出清理      | 資料 Wave 1；權威存取與查證 Wave 2；可見回饋 Wave 3                    |
| `trip-thumbnail-lifecycle.feature`                 | 預覽／取消、跨裝置保存、更換／恢復預設、原圖清除及垃圾桶生命週期、fallback            | 圖片資料 Wave 1；上傳／讀取／查證 Wave 2；圖片互動 Wave 3              |
| `thumbnail-format-and-size-boundaries.feature`     | 支援格式、10 MiB／25 MP／單邊剛好與超限、偽造／動畫／損壞／多檔、方向與隱私、輸出預算 | 保存限制 Wave 1；輸入驗證與錯誤 Wave 2；限制及轉檔提示 Wave 3          |
| `site-wide-loading-and-operation-feedback.feature` | 全站等待、防重複、草稿與內容保留、查證出口、手機／鍵盤／輔助工具                      | 新命令一致性 Wave 1／2；既有狀態語意 Wave 2；全站畫面與共享狀態 Wave 3 |

### 共通 handoff 與權責

每次委派均傳入以下路徑、介面名稱、該 Wave 的分析重點與前置成果：

- Plan package：`specs/plans/006-trip-management-and-loading`。
- Truth root：`specs/truth`。
- Truth delta：`specs/plans/006-trip-management-and-loading/truth-delta.md`。
- 上游：本 package 的 `spec.md`、`research.md`、`features/acceptance/*.feature`、本 `plan.md` 及既有 techstack／contracts／data／feature truth。
- 下游 owner 只在自己的範圍寫入；data／API 各完成後承接 `/truth-delta` 更新自己的表，保留 technical-research 與其他 owner 記錄。UI 不寫 truth／delta。
- 121 個展開案例是驗收規格，不是產品測試執行證據。技術研究的合成圖片／parser 實驗亦不能替代產品 E2E、Linux binary、真機選圖、RSS 或含 bytea 的備份還原驗證。
- `/system-analysis` 只維護本 plan 與編排／狀態；不自行編造 API schema、DBML 或設計 frame 取代下游 owner。

### 資源契約

- `profile=low-memory-16gb`：本機觀測 RAM 為 18 GiB，已有高 swap 使用量，採保守上限；swap 數字本身不當作壓力故障證據。
- 主代理 `/root` 負責 plan 與整合；沿用唯一輔助代理 `/root/record_006_truth_delta` 依序承接 data、API、UI；不新增或累積代理，輔助代理不再 spawn 子代理。角色重用不宣稱為獨立審查。
- planner 各自載入對應 skill，truth-delta 以同一代理內接續執行，維持一份全域預算。最多一個重型工作；若後續需產品測試，worker=1、Chromium 與 WebKit 依序，規劃期不啟動產品伺服器或完整測試矩陣。
- 受管命令／設計工具與版本的續跑資訊由 UI 交接記錄；工具環境 PID 對應與回收若無證據則記未知，不將代理回覆完成當成 OS 資源已回收。不得關閉使用者既有工具。

### 執行狀態與下游關卡

| 階段                    | 狀態             | 交付與下一步                                                                                                         |
| ----------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| 系統介面盤點與分析順序  | 已完成           | 3 介面、3 個依序 Wave；本 plan 為 planner handoff 依據                                                               |
| Wave 1 `/data-plan`     | 已完成           | DBML parser 通過：16 tables／26 refs／4 enums；data delta 4 ADD／4 MODIFY／2 NOOP；未執行 migration                  |
| Wave 2 `/api-plan`      | 已完成           | OpenAPI 0.3.0、39 operations；Redocly valid（3 個既有警告），引用／唯一性檢查通過；API delta 5 ADD／5 MODIFY／1 NOOP |
| Wave 3 `/ui-plan`       | 已完成           | design-v7 已由使用者於 2026-11-13 確認；38 frame／PNG，索引與 hash 見 ui/ui-plan.md。                                |
| UI prototype／截圖比對  | 本輪省略         | 依使用者明確指示移除必做關卡與驗證產物；以前期設計稿為主。                                                           |
| `/dsl-refine`／`/tasks` | 可接續，尚未執行 | UI 設計已確認且本輪交付完成；承接 spec、acceptance、truth 與 design-v7。                                             |

目前沒有需要新增 `/clarify` 的系統介面或責任邊界缺口；若下游發現改變業務結果的真實衝突，回交規格 owner，不自行削弱驗收。

**目前 checkpoint**: design-v7 已由使用者於 2026-11-13 明確確認，SHA-256 `6c33bce25da872057d253a44bd0e59dec1f0e41f974873fb6db0dfe10b6c1abc`，共38 frame／PNG。使用者同時要求本次省略 prototype 與截圖驗證，前期規劃以設計稿為主；已移除原型截圖／對照、驗證腳本／結果與舊驗證報告，既有 v6 原型移至歷史目錄。UI 規劃關卡完成，可依 ui/handoff.md 接續前端 DSL／tasks，本輪未執行下游 skill。規格與47模板／121展開驗收案例保留，包含管理旅行dropdown、建立時optional縮圖，以及保留已建立旅行與同trip圖片重傳。Skill檔案由使用者後續另行更新。
