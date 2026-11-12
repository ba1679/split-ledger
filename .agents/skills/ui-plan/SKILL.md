---
name: ui-plan
description: 根據 plan package 與 truth，先交付 .pen 設計並取得開發者確認，再產出同步的可操作 prototype 與畫面交接索引；只寫 plan-side ui/**，不修改 truth。
disable-model-invocation: true
---

# UI Plan

`ui-plan` 依序交付 UI plan、`.pen`、開發者確認、prototype 與同步檢查。UI artifact 留在 plan package；業務規則仍由 spec 與 truth owner 管理。`.pen` 交付後必須等待開發者明確確認，才可繼續 prototype 與依賴該設計的下游流程。

# SOP

## Phase 1 -- 對齊 plan、truth-delta 與 UI 範圍

1. READ 讀取使用者需求、呼叫者 handoff、plan package 的 `spec.md`、`research.md`、`plan.md`、`truth-delta.md`、既有 `ui/**`，以及與 UI 有關的 `specs/truth/contracts/**`、`specs/truth/features/**`。
2. READ 讀取 `../shared/ui-delivery.md`、`../shared/session-handoff.md`、`../shared/low-memory-execution.md`、`templates/ui-plan.md` 與 `templates/ui-plan.example.md`，確認設計細緻度、開發者確認、同步與續跑契約，承接或建立資源預算；恢復工作時先核對既有版本與關卡。
3. DELEGATE 若缺口會改變使用者可見流程、畫面責任、互動入口、錯誤狀態或與 truth 的對齊方式，呼叫 `/clarify`；未收斂前停止。

## Phase 2 -- 交付 .pen 與開發者確認

1. THINK 依需求、truth-delta 與現有 truth 收斂畫面範圍、狀態、主要 flow、可見回饋、錯誤處理、accessibility 與 responsive 行為。
2. WRITE 將 UI 規劃與畫面交接索引寫入 `specs/plans/NNN-<slug>/ui/ui-plan.md`，以可用的 Pencil 工具建立、檢查及儲存可編輯 `.pen`，匯出桌機／手機與關鍵狀態預覽；工具不可用時保存缺口並回報，不以 HTML 代替設計交付。
3. WRITE 展示 `.pen` 路徑、可見預覽、設計版本、畫面／狀態範圍及待決事項，請開發者確認；將關卡記為待確認，保存續跑點並停止依賴流程。未收到對此版的明確確認，不執行下一 phase。
4. READ 讀取開發者回覆；要求修改時修正並重新展示，明確確認後記錄確認者、回覆依據、日期及版本，才解鎖 prototype。

## Phase 3 -- 製作並同步 prototype

1. READ 讀取 `templates/prototype-entry.html`、`templates/prototype-entry.example.html`、`templates/prototype-screen.html`、`templates/prototype-screen.example.html`、`rules/高保真靜態頁面切分與Flow覆蓋判準.md` 與 `rules/靜態網站雛形與實作計畫邊界判準.md`，確認可操作雛形的覆蓋與產品邊界。
2. WRITE 依已確認設計產出或更新 `ui/*.html` 與必要資源，串起主流程及關鍵回饋，記錄模擬限制；不得寫入 `specs/truth/**`。
3. READ 實際操作 prototype，在對應資料、狀態與尺寸下比對設計預覽並逐項記錄差異；若改變設計意圖，返回上一 phase 更新設計並重新確認；業務規則衝突回交 owner。
4. WRITE 更新畫面索引的版本、同步狀態與證據；只有全部受影響畫面同步、確認有效且無未決重大差異時，才交付 `/dsl-refine`、`/tasks` 或實作，並回報檔案、限制與下一個 checkpoint。
