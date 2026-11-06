# Truth Delta: 003-design-system

**Plan Package**: `specs/plans/003-design-system`
**Truth Root**: `specs/truth`

## /technical-research

| 動作 | Truth 規格 | 改動摘要 | 原因 |
| --- | --- | --- | --- |
| ADD | `specs/truth/techstack.md` -> `前端樣式遷移決策/樣式與設計值` | 記錄 Tailwind CSS、CSS 自訂屬性及 Vite 為尚未實作的遷移方向。 | 支援集中管理設計值與逐步遷移。 |
| ADD | `specs/truth/techstack.md` -> `前端樣式遷移決策/共用元件` | 記錄按需使用 shadcn/ui 為尚未實作的方向。 | 建立可維護的共用元件並維持現有體驗。 |
| ADD | `specs/truth/techstack.md` -> `前端樣式遷移決策/圖示` | 記錄 lucide-react 為尚未實作的方向。 | 減少自製圖示的維護。 |
| NOOP | `specs/truth/techstack.md` -> `測試與驗證/前後端 BDD techstack` | 已檢查，沿用既有各端 E2E 與 runner。 | 本輪未改判測試策略。 |

## /api-plan

| 動作 | Truth 規格 | 改動摘要 | 原因 |
| --- | --- | --- | --- |

尚未執行 owner 檢查。

## /data-plan

| 動作 | Truth 規格 | 改動摘要 | 原因 |
| --- | --- | --- | --- |

尚未執行 owner 檢查。

## /dsl-refine

| 動作 | Truth 規格 | 改動摘要 | 原因 |
| --- | --- | --- | --- |
| ADD | `specs/truth/features/frontend/design-system/interface-regression.feature` -> `旅行清單在桌面和手機保留原有版面` | 新增桌面與手機視覺對照案例。 | 為示範範圍保留原有外觀提供可驗證基準。 |
| ADD | `specs/truth/features/frontend/design-system/interface-regression.feature` -> `載入旅行時明確告知目前狀態` | 新增載入提示案例。 | 遷移時保護可理解的載入狀態。 |
| ADD | `specs/truth/features/frontend/design-system/interface-regression.feature` -> `旅行清單無法讀取時提供可理解的重試入口` | 新增讀取失敗及重試入口案例。 | 保護錯誤回饋及既有資料。 |
| ADD | `specs/truth/features/frontend/design-system/interface-regression.feature` -> `新增旅行對話框保留鍵盤與輔助工具可理解的操作` | 新增鍵盤開啟、焦點與可存取名稱案例。 | 保護示範介面操作及基本無障礙。 |
| ADD | `specs/truth/features/frontend/design-system/dsl.md` -> `Given / When / Then 句型` | 新增上述案例的專屬句型與 Playwright 實作語意。 | 提供唯一權威位置供後續測試實作。 |
| NOOP | `specs/truth/features/frontend/trips/trip-creation-and-dates.feature` -> `旅行建立與日期` | 已檢查，保留現有旅行建立與日期規格。 | 遷移不改變既有業務行為。 |

示範確認、設計值及圖示盤點、文件與舊樣式清理屬交付檢查；其餘介面的外觀及可存取性仍須於遷移任務逐項驗證，不以本次示範案例宣稱全站已覆蓋。視覺基準尚待遷移前建立並審查；新增 DSL 尚未實作成測試。
