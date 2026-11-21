# 007 驗證檔案

Git 保留可重跑的腳本／設定、規劃期已追蹤檢查，以及 [驗證摘要](verification-summary.md)。不把每次執行的截圖、完整清單、逐任務 hash 或 source snapshot 當成原始碼提交。

## 可重跑的入口

從 repository root 執行，使用專案 Node 24.22.2／pnpm 11.25.0；需已可用的測試 PostgreSQL。各入口自行建立隔離帳號、資料與服務，不操作真實帳本。

| 用途 | 入口 |
| --- | --- |
| 畫面捕捉／設計比對證據 | `ANALYSIS_CAPTURE_PREFIX=T132 pnpm exec playwright test -c specs/plans/007-category-expense-charts/checks/visual.config.ts --workers=1` |
| Console／結構／長內容診斷 | `pnpm exec playwright test -c specs/plans/007-category-expense-charts/checks/quality.config.ts --workers=1` |
| 分析 SQL／效能實驗 | `pnpm exec playwright test -c specs/plans/007-category-expense-charts/checks/cost.config.ts --workers=1` |
| 隔離原生人工操作 fixture | `pnpm exec playwright test -c specs/plans/007-category-expense-charts/checks/manual.config.ts --workers=1` |
| Bundle 模組證據 | `pnpm --dir apps/web exec vite build --config ../../specs/plans/007-category-expense-charts/checks/bundle.config.mjs` |

人工 fixture 會等待操作者及 `.cache/007-implement/T132-manual-command.json` 指令，不是無人值守的產品回歸；使用前閱讀 `manual-analysis.spec.ts`。只在需要時執行對應入口，不因這份列表要求每輪全跑。

## 輸出與歸檔規則

腳本仍可在 checks 寫出 `T*.json`、`T*.txt`、`T*.md`、`T*.tar.gz`、`screens/`，但它們已明確 ignore。`source-versions/` 也僅為本機試驗備份。不要手動 force-add 這些原始輸出；需要長期保存的結論整理進 verification-summary.md。

既有已追蹤的 `dsl-refine-validation.json`、`tasks-validation.json` 及兩份拓樸 log 保留原狀，記錄規劃起點，不代表目前產品驗收結果。

2026-11-21 前的原始輸出已封存到 repository-root 相對路徑 `.cache/007-validation-archive/checks/`；檔名及 hash 對照在同目錄上一層的 `archive-manifest.json`。歷史文件中的 `checks/Txxx-*` 可依此映射查找；封存不隨 Git clone 提供。
