# Truth Delta: 002-code-formatting

**Plan Package**: `specs/plans/002-code-formatting`

**Truth Root**: `specs/truth`

## /technical-research

| 動作 | Truth 規格 | 改動摘要 | 原因 |
| --- | --- | --- | --- |
| ADD | `specs/truth/techstack.md` -> `測試與驗證/程式碼排版` | 採用 Prettier、根設定與忽略清單，統一手寫程式、測試及設定的排版。 | 使用者確認兩個示範後，同意依相同風格整理全專案。 |
| ADD | `specs/truth/techstack.md` -> `測試與驗證/空行與整合` | 採用 ESLint Stylistic padding 固定 imports、函式與回傳前的空行，並以 eslint-config-prettier 關閉排版衝突規則。 | 對齊使用者選定的邏輯分段及基本 lint 加排版範圍。 |
| MODIFY | `specs/truth/techstack.md` -> `本地環境/開發入口` | pnpm scripts 增列 `lint:fix`、`format`、`format:check` 的修正、整理與檢查用途。 | 為全專案排版提供固定的執行入口。 |
| MODIFY | `specs/truth/techstack.md` -> `技術堆疊文件狀態` | 將 2026-11-04 設計階段的採用決策說明更新為截至 2026-11-06 已在工作區實作的堆疊現況，並明示不代表正式部署。 | techstack truth 應反映現行實作狀態。 |
| MODIFY | `specs/truth/techstack.md` -> `測試與驗證/耗時管理` | 將「實作後建立基準；目前沒有實測時間」更新為各輪實測結果與耗時保存於開發驗證紀錄，效能主張須獨立量測。 | 移除與已實作、已驗證狀態不符的敘述。 |

## /api-plan

| 動作 | Truth 規格 | 改動摘要 | 原因 |
| --- | --- | --- | --- |

本輪未呼叫此 owner；無 API truth 變更，不宣稱已完成 owner 檢查或記錄 NOOP。

## /data-plan

| 動作 | Truth 規格 | 改動摘要 | 原因 |
| --- | --- | --- | --- |

本輪未呼叫此 owner；無 data truth 變更，不宣稱已完成 owner 檢查或記錄 NOOP。

## /dsl-refine

| 動作 | Truth 規格 | 改動摘要 | 原因 |
| --- | --- | --- | --- |

本輪未呼叫此 owner；無 feature 或 DSL truth 變更，不宣稱已完成 owner 檢查或記錄 NOOP。
