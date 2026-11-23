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
3. READ 依序讀取 `.agents/constitution/CONSTITUTION.md` 與 `.agents/constitution/shared.md`。產出或更新 `ui-plan.md` 時，再讀取 `.agents/constitution/skills/ui-plan/ui-plan.md`，作為交接文件的約束。
4. THINK 核對 UI 分流與寫入範圍，定位固定基準／預覽、現況及需求差異；A／B 回報既有依據與適用驗證，交回呼叫者，不製作無關設計。
5. DELEGATE 缺口影響畫面責任、操作意圖或 truth 對齊時呼叫 `/clarify`，只停止受影響範圍。

## Phase 2 -- 交付必要設計並取得確認

1. READ 讀取 `templates/ui-plan.md` 與 `templates/ui-plan.example.md`，收斂本次設計與畫面索引；基準建立時將適用欄位記於基準 README。
2. THINK 依已載入契約收斂必要桌機／手機畫面、狀態、共用元件、行為與適配註記，判定是否存在需要體驗的互動問題。
3. WRITE 建立或增補基準時，依下方「基準畫布區隔」整理同一份 `.pen` 的三個具名區域，將區域與內容 ID 記於基準 README；一般需求模式沿用 plan-side 交付範圍。
4. WRITE 以支援格式的設計工具建立、檢查並儲存必要 `.pen` 與預覽；一般模式只寫 `specs/plans/NNN-<slug>/ui/**`，明確基準建立模式才寫 `specs/ui-baseline/**` 並對照固定產品版本。基準交付前核對區域邊界、索引、元件引用與頂層重疊；工具受阻時分別記錄已完成文件與尚未執行的畫布整理。
5. WRITE 展示可編輯設計、預覽、版本、核對差異與確認範圍，保存待確認紀錄及續跑點，停止依賴工作。
6. READ 承接明確回覆，要求修改時更新並重新展示；確認有效後保存原回覆與範圍，解鎖其依賴。

## Phase 3 -- 完成選用互動與畫面交接

1. THINK 記錄 prototype 選用方式與問題；設計及註記足夠時選不製作，直接準備交接。
2. READ 選用互動時讀取 `rules/局部互動原型選用與交付判準.md`，確認該問題的最小交付範圍。
3. WRITE 若選用，完成指定連線或局部程式原型、實際操作與同版設計核對，保存問題決策及限制；改設計意圖時回到上一 phase，業務矛盾回交 owner。
4. WRITE 依已載入憲法更新交接文件的索引、有效確認、互動決策、版本與各受阻依賴。
5. READ 交付前核對產物是否符合已載入的適用憲法，有缺漏即修正。
6. WRITE 交付已就緒範圍給 `/dsl-refine`／`/tasks`；基準模式回報現況核對與涵蓋範圍，不宣稱未執行的產品驗收已完成。

## 基準畫布區隔

- 同一份 `specs/ui-baseline/split-ledger.pen` 維持三個有可見標題、圖層名稱及清楚邊界的獨立區域：`00 / 版本與索引`、`01 / 共用元件庫`、`02 / 既有產品畫面`。可用具名容器或區域標頭與留白實現；只靠元件在上、畫面在下的位置區別不足以完成整理。
- 版本與索引區提供產品來源 commit、基準版本、有效確認範圍與狀態，並以名稱／ID 對應共用元件與產品畫面；README 保留可定位的區域／標頭 ID、元件 ID、穩定畫面／狀態 ID、frame ID 及同版預覽。新增 baseline 同步更新兩處索引，舊確認仍按原範圍保留。
- 共用元件庫集中 reusable components、變體與共用狀態；既有產品畫面按功能具名分組，組內區分桌機／手機、主畫面與必要狀態／捲動視窗，透過實例引用元件庫。新增項目先定位所屬區域；重用或擴充現有元件，保留現有節點 ID 與引用關係。未實作提案仍放 plan-side `ui/**`。
- 純整理只改畫布組織、位置與索引，保留畫面內部尺寸、相對排列與已確認設計意圖；完成後檢查區域與頂層內容無重疊、元件引用有效、索引可定位，並核對既有畫面預覽沒有視覺變動。記錄新雜湊與整理證據，沿用未改意圖的有效確認。
