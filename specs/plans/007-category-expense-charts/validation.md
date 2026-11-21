# 007 實作驗證

目前可分享的驗證結論、適用版本、已知限制與待驗收項目，集中於 [驗證摘要](checks/verification-summary.md)。可重跑入口與產物規則見 [checks 說明](checks/README.md)。

## 2026-11-21 產物整理

依使用者授權，將 599 個原始執行產物（約 35.6 MB）移到 repository-root 相對路徑 `.cache/007-validation-archive/checks/`；涵蓋 343 張 PNG、230 個 JSON、中間報告、列舉清單、試驗原始碼與 source snapshot。每個移動檔案皆以 SHA-256 驗證內容未變。

舊版本文件與 handoff 全文已另存 `.cache/007-validation-archive/pre-cleanup-validation.md` 與 `pre-cleanup-handoff.md`，移動對照及 hash 在 `archive-manifest.json`。歷史 `checks/Txxx-*` 引用現在由本機封存提供，不是遺失檔案；封存不隨 clone 提供。此文件保留必要結論的入口，不再提交逐任務原始執行帳。

Git 保留產品／測試原始碼、9 個 checks 腳本／設定、4 個既有已追蹤規劃檢查、README 與驗證摘要。新增窄範圍 ignore，防止原始產物重跑後再次列入未追蹤檔案；沒有忽略整個 checks。

這次僅整理證據與文件，未刪產品／測試原始碼、未調整任務完成狀態，亦未執行或宣稱新的產品全回歸。T130–T132 舊結果與 2026-11-21 畫面修正後的定向結果分開記錄於摘要。

尚未 commit、PR、merge 或部署。

整理驗證：封存的 599 個移動檔案與 2 份原文件備份共 601 份 hash 全部一致；摘要／handoff 的 Markdown 檔案連結皆可解析；git check-ignore 確認封存與重跑輸出被忽略，腳本及摘要未被忽略；相關 Markdown 格式及 git diff --check 通過。未提交檔案由 789 降至 193；staging area 仍空白。

## 2026-11-21 提交前驗證

依使用者最新授權建立 `codex/007-category-expense-charts`，納入 007 產品、測試與必要文件；另案 skill 交接不納入。typecheck／lint／format／build、unit 30、API 30、前端 Chromium 59、smoke 4、結算開關 WebKit 回歸 6 全部通過。範圍與限制見 checks/verification-summary.md；保留 T132–T135 未完成狀態，以 draft PR 供審閱，不 merge 或部署。
