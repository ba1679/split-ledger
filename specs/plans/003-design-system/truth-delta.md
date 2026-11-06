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
| DELETE | specs/truth/features/frontend/design-system/interface-regression.feature -> 旅行清單在桌面和手機保留原有版面 | 移除圖片比較 Rule 及專屬資料/開頁/視覺 Then 句型。 | 使用者2026-11-09明確要求不維護視覺回歸、移除截圖。 |
| ADD | specs/truth/features/frontend/design-system/interface-regression.feature -> 載入旅行時明確告知目前狀態 | 保留可見且可宣告的載入提示。 | 持續保護行為，不依賴截圖。 |
| ADD | specs/truth/features/frontend/design-system/interface-regression.feature -> 旅行清單讀取失敗後可重試，且保留既有資料 | 失敗提示、真實再讀及權威資料不變。 | 合併重複 support 案例。 |
| ADD | specs/truth/features/frontend/design-system/interface-regression.feature -> 新增旅行表單支援鍵盤開啟與焦點還原 | 桌面/手機共用鍵盤案例，含 Escape 與焦點還原。 | 合併 feature 與遷移專用 support 檢查。 |
| MODIFY | specs/truth/features/frontend/design-system/dsl.md -> Given / When / Then 句型 | 移除圖片句型，保留狀態與鍵盤，補重試、關閉及焦點還原契約。 | 使用者已確認精簡，不移除有價值的行為覆蓋。 |
| NOOP | specs/truth/features/frontend/trips/trip-creation-and-dates.feature -> 旅行建立與日期 | 維持原契約。 | 精簡不改業務行為。 |

2026-11-09 使用者確認精簡測試與證據；行為步驟合併為單一 interface.steps.ts。
交付紀錄只留 evidence/delivery-summary.md；不保留圖片基準、逐輪log或預覽工具。
