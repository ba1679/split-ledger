# 系統分析規劃：繁中文案調整與英文介面

## 專案結構

```text
specs/plans/008-bilingual-interface/
├── spec.md
├── research.md
├── plan.md
├── truth-delta.md
├── features/acceptance/
├── ui/                        # /ui-plan 的差異設計與預覽
└── tasks.md                   # 後續 /tasks

apps/web/src/
├── main.tsx                   # SPA 語言初始化
├── app/App.tsx                # 公開和登入後路由
├── components/               # AppShell、表單、日曆、等待與錯誤呈現
├── features/                 # 登入、旅行、支出、成員、分類、分析、結算與還款
└── api/                       # Web 消費 API 結果與穩定錯誤代碼
apps/api/src/modules/settlement/ # 現有同快照結算查詢
specs/truth/
├── contracts/                 # /api-plan 的 API truth
├── data/                      # /data-plan 的資料 truth
└── features/                  # /dsl-refine 的介面驗收 truth
```

語言由 Web 啟動與入口決定，手動選擇由同源瀏覽器保存。帳務與角色授權仍以後端為權威；結算查詢提供可本地化的同快照說明資訊。指定文案以 spec FR-008／009 為準。這輪延後執行無障礙驗證，NFR-001 仍是行為與設計依據。

## 分析流程規劃

### 系統介面的盤點

本輪共 **3 個系統介面**。

| ID／名稱 | 端點類型 | 主要介面 | 需求依據／分析責任 |
| --- | --- | --- | --- |
| IF-01 Web 語言與帳務介面 | Web 前端 | 登入前與登入後入口，SPA 首屏、語言切換、全站雙語文案，帳本／結算及同行者精簡 | FR-001～006、FR-008／009、NFR-001。/ui-plan 承接新增入口的 C 類，B 類按既有畫面細化 |
| IF-02 結算快照與錯誤語意 | HTTP API | 現有 `GET /api/trips/{tripId}/settlement` 的結構化說明，及 Web 依穩定代碼辨認既有操作錯誤 | FR-003／007，research 決策 3。/api-plan 核對相容性並規劃結構化資訊，保留舊回應與錯誤語意 |
| IF-03 語言偏好及帳務來源 | 同源瀏覽器儲存／資料讀取邊界 | 瀏覽器手動值的持有與生命週期，原文資料與結算同快照既有來源 | FR-004～007，research 決策 2／3。/data-plan 核對既有資料模型能否支撐唯讀投影，預期 PostgreSQL 為 NOOP 並記錄原因 |

Google 登入供應商畫面是既有外部依賴。旅帳自己的登入頁與狀態屬 IF-01，Google OAuth 協定與帳號同步沒有新增分析端點。

### UI 影響分流與交接依據

固定產品觀察來源為 `228109265ddc3384853745b1083edb1f94ce3579`。已確認設計基準取自 `8fc9f94134c66ffd29918014b950894b1007aa86` 的 [基準索引](../../ui-baseline/README.md)及 `specs/ui-baseline/split-ledger.pen`。基準未涵蓋的路由以該產品 commit 核對當前元件與必要畫面，現況證據留在 plan-side。

分類分析的既有呈現依據另見 `37e5968fc17d28aa925370c31cebdc52d84abaf4` 的 [007 設計索引](../007-category-expense-charts/ui/ui-plan.md)、`split-ledger-007.pen` 的 `analysis/main/desktop` z7pOeL、`analysis/main/mobile` vrPz0 及 `analysis/states` GS7hF，預覽位於同版 `design-previews/`。

| 範圍／介面 | 分流與理由 | 畫面／路由與行為 | 固定基準或呈現依據 | 本次來源及責任 |
| --- | --- | --- | --- | --- |
| IF-01 語言切換入口 | **C**。公開登入與登入後共用框架新增操作入口，有桌手機位置與長文字適配決策 | `/` 的 Login，登入後 AppShell，含從 `/trips/:tripId` 切換仍在同帳本及待確認狀態 | 登入未收錄，先核對固定產品的 `Login.tsx` 與登入樣式。登入後參照 `trips/main/desktop` GlUDZ、`trips/main/mobile` i1wuXl，[桌機](../../ui-baseline/previews/trips-desktop.png)／[手機](../../ui-baseline/previews/trips-mobile.png)；框架元件 NUK7c／KOhJt。[帳本桌機](../../ui-baseline/previews/ledger-desktop.png) K4fUl／[帳本手機](../../ui-baseline/previews/ledger-mobile.png) j4FlQR 供跨頁核對 | FR-004／005、NFR-001、首次語言驗收。/ui-plan 應交付帶長英文的 1440×900、390×844 代表畫面與可編輯提案。有效確認後方細化依賴位置的 UI 操作 |
| IF-01 原畫面文字、欄名與格式 | **B**。資訊位置及操作沿用，涵蓋日期、圖表與長英文 | 登入、旅行／垃圾桶、帳本、支出、成員、分類、分類分析、結算／還款及 QueryState、DateField 等狀態 | 既有基準的旅行、帳本、支出；其餘由固定產品 commit 的路由及共享元件定位。分類分析參照 007 已確認設計與固定現況各自的適用範圍 | FR-001～003／006／007。驗可見訊息、原文保留與精度；桌機／手機同尺寸補長文字及錯誤狀態畫面 |
| IF-01 結算／同行者文案與還款回饋 | **B**。沿用既有淨額列、待付款區、同行者表單及結果待確認區，調整同位置的標籤、空狀態及提示 | `/trips/:tripId`、`/settlement`、`/members`、`/repayments/new`，後三者為同旅行路由後綴 | 基準帳本 K4fUl／j4FlQR；其餘依固定產品的 TripSettlement、TripMembers、IndependentRepayment 及既有 feature | FR-002／007～009。驗「已結清／淨額為零」、跨幣別及全空、兩則同行者說明移除與原名稱驗證，以及離線時查原還款。結算說明細化依 IF-02；其餘子範圍可先細化 |
| IF-02 結算 HTTP 投影 | **B 的行為依賴**。同一說明區使用結構化來源 | 帳本／結算讀取，共用錯誤語意 | 原 `SettlementView`、既有結算 UI 和 truth | /api-plan 的相容、同快照與權限驗證，供 B 類前端說明與後端 DSL |
| IF-03 資料責任 | **A（資料層）**。同源儲存與查詢來源本身無額外畫面 | 語言選擇的儲存、讀取既有帳務 | research 決策 2／3、`specs/truth/data/data-model.dbml` | /data-plan 核對來源與儲存邊界；語言切換操作另見 IF-01 |

B 類若在設計時確認必須搬動資訊或改操作入口，僅相應畫面範圍回到 C 類。後端與前端驗證沿用 research 的分層方案。鍵盤、焦點、輔助科技與 VoiceOver 驗證依使用者指示延後。

### 分析流程的安排

#### Wave 1：獨立確認契約、資料責任與切換設計

- **IF-02 → /api-plan**。由 research 已定的「前端翻譯、同快照、向後相容」展開。以目前付款安排與直接安排的關係區分三個說明分支。共同狀態依既有 API 的 code／field 與操作情境，避免把中文錯誤字串當作 Web 契約。
- **IF-03 → /data-plan**。核對瀏覽器偏好與帳號資料隔離、原文、帳務精度、來源關聯和同快照。現有 schema 為預期來源。
- **IF-01 C → /ui-plan**。以固定來源檢查登入、桌機側欄、手機框架及代表性帳本，設計語言入口與保留當前頁面／操作的呈現。切換的呈現可先設計，結算投影欄位可獨立定義。英文長文適配僅納入有交互影響的代表畫面。

#### Wave 2：依 Wave 1 個別結果交接 `/dsl-refine`／`/tasks`

- **IF-01 B／IF-02 銜接**。核對從結算來源呈現三類本地化說明，重驗同幣別原付款關係、筆數及無精度差異；後端與依賴該投影的前端 DSL 依 API／data handoff。
- **IF-01 C**。語言入口位置及操作細節依已確認設計，確認前先保留該區的 DSL／tasks 依賴。**可先細化的 B 類**包括瀏覽器首選與手動值優先的規則、既有文案、結算零淨額判斷、同行者說明移除與還款查證。這些範圍沿用現有畫面與 API，不依新入口位置；全旅程跨入口驗收留待整合。
- **/tasks**。按各 truth owner 與設計就緒範圍拆分，最終 C 類驗證及適用的基準回填依共同 UI 交付契約。這一波是依賴及產出順序，實際 DSL／tasks 各由相應 skill 承接。

### Planner handoff

共同輸入為 `specs/plans/008-bilingual-interface/`、`specs/truth/` 與 [truth-delta.md](truth-delta.md)。以上 IF 編號、分流、固定依據與依賴隨 handoff 傳入。API owner 寫 API truth，data owner 負責資料 truth 或記錄 NOOP，UI owner 只寫 plan-side C 類設計及確認紀錄。

### 委派狀態

| 介面 | 交接狀態 | 後續依賴 |
| --- | --- | --- |
| IF-01 C | [Pencil d1 設計與同版預覽](ui/ui-plan.md)已確認 | 補上前端 DSL、tasks，依設計實作及驗證 |
| IF-01 B | 固定現況與行為依據已列 | 文案、空狀態、名稱錯誤及還款查證可接續細化。結算說明以 IF-02 契約為依據 |
| IF-02 | /api-plan 已交付[結算 API 契約](../../truth/contracts/groups/settlement.yaml)。既有 GET 透過明確查詢選項取得結構化說明，省略選項時沿用原回應 | 後端及 B 類結算說明可依 API truth 細化 |
| IF-03 | /data-plan 已確認既有來源足以支撐，語言偏好由 Web Storage 持有 | 既有資料契約足以支撐下游細化 |
