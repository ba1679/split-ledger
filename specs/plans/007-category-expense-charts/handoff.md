# 007 實作交接

更新：2026-11-21。提交分支 `codex/007-category-expense-charts`（由 `feat/007-category-expense-charts` 建立），基礎 HEAD `37e5968fc17d28aa925370c31cebdc52d84abaf4`；本輪以獨立提交與 draft PR 提供產品、測試及必要文件，提交識別由分支歷史取回。不得清除或夾帶其他工作的變更。

## 目前狀態

- T001–T131 已完成；T132–T135 尚未完成。任務順序與完成狀態以 [tasks](tasks.md) 為準，不能因本輪整理證據或政策批准宣稱全部交付。
- 原完整自動回歸已通過，確切範圍與版本限制見 [驗證摘要](checks/verification-summary.md)。最近取消分析入口預設選取樣式、移除兩段說明文字後，只跑過 web typecheck／BDD 生成／格式檢查與 Chromium F59 1/1；尚無此版完整回歸或最新 UI 驗收。
- 使用者已同意桌機完整排版、鍵盤／焦點／VoiceOver 由使用者集中人工驗收，自動化集中主要手機旅程與高風險案例。這是政策決定，不是人工驗收 PASS；不要再要求啟動 VoiceOver 才能推進所有獨立工作。
- T133 獨立 UI gate、T134 正式 baseline 回填、T135 獨立回填核對仍待。既有 design-v1 批准保留；使用者新畫面決定優先於舊預覽，後續審查／基準須承接新決定。

## Skill 修正另案

已交給 chat「檢視 007 計畫的測試範圍」（`01a1fc1c-f7b0-7a42-a2cb-1d2dcd076def`），在獨立分支 `codex/skill-risk-based-testing`、worktree `/Users/hsinhui/Desktop/Render-stuff/split-ledger-skill-risk-based-testing` 執行 skill 修正。範圍與授權已交給[該 chat](codex://threads/01a1fc1c-f7b0-7a42-a2cb-1d2dcd076def)，skill 文件不併入本次 007 提交。不將另案進度當作本 plan 已修正所有測試／tasks 的證據。

## 證據保存與引用

- Git 只保留精簡結論與可重跑原始碼；[checks README](checks/README.md) 列出入口及輸出規則。
- 599 個原始產物已封存到 repository-root 相對路徑 `.cache/007-validation-archive/checks/`。本機 `archive-manifest.json` 提供原路徑、保存位置、大小與 hash，逐檔內容驗證一致。
- 整理前完整 handoff／validation 另存同一封存目錄的 `pre-cleanup-handoff.md`／`pre-cleanup-validation.md`；歷史測試輸出仍可查，但舊來源／截圖不能當成目前驗收。
- `.cache/007-implement/` 日誌仍保留且已 ignore；封存不隨 Git clone 提供。不要以廣泛 ignore 排除產品、測試或整個 checks。

## 續作注意

runtime 使用專案 Node 24.22.2／pnpm 11.25.0。驗證只用隔離資料庫／帳號；不終止歸屬未知的既有程序。先核對需要重跑的來源與風險，再按最新政策選必要驗證；人工驗收集中提供固定版本、步驟、預期與待確認項目，不把政策同意代替實際確認。

後續已依使用者授權準備 007 commit／draft PR；未 merge 或部署，未將 T132–T135 改記完成。
