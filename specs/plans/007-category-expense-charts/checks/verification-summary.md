# 007 驗證摘要

更新：2026-11-21。此文件整理最後已完成的驗證，不代表整個 plan 已交付。T001–T131 已完成；T132–T135 尚未完成，任務勾選不因證據歸檔而變動。

## 適用版本與限制

- 分支 `feat/007-category-expense-charts`，基礎 commit `37e5968fc17d28aa925370c31cebdc52d84abaf4`，當時產品與測試尚未提交；後續提交分支為 `codex/007-category-expense-charts`。
- T130–T132 完整回歸屬於 2026-11-20 的當時工作區版本。當時來源與圖像 hash、原始結果及可取回的 source snapshot 已封存至本機；不能將它們當成目前工作區的全回歸結果。
- 2026-11-21 使用者要求：花費分析入口取消預設選取樣式；移除「整趟旅行・不含還款與結清」及金額／占比取整說明。已同步 F59 的 feature／DSL／StepDef，保留 UI 33.33、API 100/3 及原始分攤不變的驗證。帳務演算法未改。
- 上述畫面修正後僅執行 web typecheck、BDD 生成、相關檔案格式與 whitespace 檢查，以及 Chromium F59 定向回歸 1/1 PASS。完整矩陣未在此版重跑；既有截圖也不是此版視覺驗收。

## 已完成的自動驗證

以下為 T130–T132 歷史版本結果，失敗與跳過皆為 0。

| 範圍 | 結果 |
| --- | --- |
| T130 單元測試 | 30 PASS |
| T130 完整後端 truth | 378 PASS |
| T130 API support | 396 PASS |
| T131 根目錄 typecheck／lint／format／build | 全部通過 |
| T131 smoke | 4 PASS |
| T131 console／可及性結構／長內容診斷 | 8 PASS；不等同人工 VoiceOver 驗收 |
| T132 完整前端 truth | Chromium 416、WebKit 416 PASS |
| T132 前端補充矩陣 | 各瀏覽器 78 PASS |
| T132 web support | 各瀏覽器 367 PASS |
| T132 UI quality | 各瀏覽器 5 PASS |
| T132 最後畫面捕捉 | 84 PASS，產生 108 張當時版本截圖 |

新增語意案例：後端 30、前端 59；前端展開 274 次執行，無漏 ID／重複組合，涵蓋原規劃 13 個驗收旅程。完整前端回歸亦包含 714 次既有案例執行。這些是歷史執行矩陣，並非要求今後每次修改都重跑全部組合。

## 效能與工程結論

- PostgreSQL 18.3、Node 24.22.2、pnpm 11.25.0，單 worker，正式 migrations 建立的隔離測試資料庫。
- 分析在同一 readonly Repeatable Read 交易讀取。當時實作為 4 個分析 SELECT，加上 BEGIN／COMMIT 與 2 次既有驗證查詢，共 8 個 SQL statements。未新增 schema、index 或 migration。
- 500 筆支出樣本約 18–27 ms；5,000 筆、67,035 筆 shares 樣本約 96–107 ms，回應 12,902 bytes。這是本機固定樣本，非 SLO 或任意資料量保證。原始 SQL、EXPLAIN、記憶體與失敗策略試驗留本機。
- T131 建置 main JS 500.38 kB（原 497.25 kB），analysis lazy chunk 374.97 kB；main 無 Recharts 模組，React core 單份。保留 Vite 超過 500 kB 的提醒，未調高警告門檻。

## 人工與獨立審查狀態

- 原生桌機操作已確認幣別同步、分類資訊開啟、Space 啟用及 Escape 回焦。
- 390×844 瀏覽器觸控模擬已記錄可信任 touchstart／touchend，確認分類列、圖環、關閉與幣別切換；不是實體手機驗證。
- 實際 VoiceOver 驗收未完成。使用者已同意桌機完整排版、鍵盤／焦點／VoiceOver 等由使用者集中人工驗收，不再要求代理操作旁白作為所有獨立工作的共同前置。政策批准不等於產品已驗收。
- T133 獨立 UI gate、T134 baseline 正式回填及 T135 獨立回填核對未完成。既有設計批准有效；使用者最新兩項畫面修正優先於舊截圖。
- 依使用者授權準備 commit／draft PR 供審閱；未 merge 或部署，不代表 plan 已交付。

## 原始證據保存

599 個原始／中間驗證產物已從 plan checks 移到 repository-root 相對路徑 `.cache/007-validation-archive/checks/`，約 35.6 MB。原始 validation／handoff 另以 `pre-cleanup-*.md` 保存；`archive-manifest.json` 記錄原路徑、本機路徑、大小及 SHA-256。移動後逐檔比對 hash，沒有丟棄原件。

這是被 `.gitignore` 排除的本機封存，不會隨 clone 提供；本摘要不依賴該目錄才能理解驗證結論。本機可於 repository root 讀取 `.cache/007-validation-archive/archive-manifest.json` 查找舊 `checks/Txxx-*` 引用。執行日誌仍在已忽略的 `.cache/007-implement/`。

可重跑腳本與規劃期已追蹤檢查保留，見 [checks 說明](README.md)。

## 2026-11-21 提交前定向驗證

最新畫面修正後重新執行：根目錄 typecheck／lint／format:check／build 全部通過；unit 30/30、兩端 BDD 生成通過；007 API 30/30；Chromium 前端語意案例 59/59（桌機 56＋固定手機 3），smoke 4/4。這次沒有重跑歷史 274 次前端矩陣或整份既有產品回歸，不將歷史結果混算成最新結果。日誌本機保存於 `.cache/007-pr/`。

結算開關 WebKit 定向回歸 6/6 PASS，保護本次保留的原生點擊焦點修正。
