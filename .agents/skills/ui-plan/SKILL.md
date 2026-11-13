---
name: ui-plan
description: 承接受影響的 UI 設計範圍，引用固定現況基準，交付 .pen、預覽與設計確認；prototype 按互動問題選用。一般模式只寫 plan-side ui/**，明確指定的基準建立模式可寫 specs/ui-baseline/**；不修改 truth。
disable-model-invocation: true
---

# UI Plan

承接 C 類設計變更或明確指定的基準建立工作。一般模式交付本次設計差異與畫面索引；建立基準模式核對已驗收產品現況。業務規則由 spec／truth owner 管理。

# SOP

## Phase 1 -- 定位模式、基準與需求差異

1. READ 讀取使用者要求、呼叫者 handoff、plan package 的 `spec.md`、`research.md`、`plan.md`、`truth-delta.md`、既有 `ui/**` 及相關 truth；基準建立工作讀取指定產品 commit 與範圍，無 plan package 時使用基準 README 保存交接。
2. READ 讀取 `../shared/ui-delivery.md`、`../shared/session-handoff.md` 與 `../shared/low-memory-execution.md`，承接或建立資源契約，恢復時核對模式、版本及有效確認。
3. THINK 核對 UI 分流與寫入範圍，定位固定基準／預覽、現況及需求差異；A／B 回報既有依據與適用驗證，交回呼叫者，不製作無關設計。
4. DELEGATE 缺口影響畫面責任、操作意圖或 truth 對齊時呼叫 `/clarify`，只停止受影響範圍。

## Phase 2 -- 交付必要設計並取得確認

1. READ 讀取 `templates/ui-plan.md` 與 `templates/ui-plan.example.md`，收斂本次設計與畫面索引；基準建立時將適用欄位記於基準 README。
2. THINK 依已載入契約收斂必要桌機／手機畫面、狀態、共用元件、行為與適配註記，判定是否存在需要體驗的互動問題。
3. WRITE 以支援格式的設計工具建立、檢查並儲存必要 `.pen` 與預覽；一般模式只寫 `specs/plans/NNN-<slug>/ui/**`，明確基準建立模式才寫 `specs/ui-baseline/**` 並對照固定產品版本。
4. WRITE 展示可編輯設計、預覽、版本、核對差異與確認範圍，保存待確認紀錄及續跑點，停止依賴工作。
5. READ 承接明確回覆，要求修改時更新並重新展示；確認有效後保存原回覆與範圍，解鎖其依賴。

## Phase 3 -- 完成選用互動與畫面交接

1. THINK 記錄 prototype 選用方式與問題；設計及註記足夠時選不製作，直接準備交接。
2. READ 選用互動時讀取 `rules/局部互動原型選用與交付判準.md`，確認該問題的最小交付範圍。
3. WRITE 若選用，完成指定連線或局部程式原型、實際操作與同版設計核對，保存問題決策及限制；改設計意圖時回到上一 phase，業務矛盾回交 owner。
4. WRITE 更新索引、有效確認、版本與各受阻依賴，交付已就緒範圍給 `/dsl-refine`／`/tasks`；基準模式回報現況核對與涵蓋範圍，不宣稱未執行的產品驗收已完成。
