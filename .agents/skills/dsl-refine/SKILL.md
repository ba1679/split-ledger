---
name: dsl-refine
description: Truth owner skill。承接 plan package 的 acceptance Gherkin 與 system-analysis 產物，將業務 Journey 拆成 interface-level executable feature files 與 DSL，並更新 `specs/truth/features/backend/**`、`specs/truth/features/frontend/**`。完成後委派 `/truth-delta` 記錄 feature/dsl truth 改動。
disable-model-invocation: true
---

# DSL Refine

`dsl-refine` 是 interface feature 與 DSL 的 truth owner。Acceptance Gherkin 留在 plan package；拆解後可執行的前後端介面 feature/dsl 則寫入 `specs/truth/features/**`，代表目前系統測試規格真相。

# SOP

## Phase 1 -- 對齊 acceptance、系統介面與 feature truth

1. READ 讀取使用者要求、目標 plan package 的 `features/acceptance/**`、`plan.md`、`truth-delta.md`、`specs/truth/techstack.md`、按範圍適用的 UI 依據，以及受影響介面的既有功能模組、feature、模組 DSL 與介面根共用 DSL。
2. READ 讀取 `../shared/ui-delivery.md` 與 `../shared/session-handoff.md`，按分流核對 plan 的呈現／行為依據或 C 類畫面索引、有效確認及選用互動決策；只停止依賴缺口的細化，不因 A／B 缺 ui/ 或不製作 prototype 而停止。
3. THINK 從 `plan.md`、truth-delta 與現有 feature truth 辨識本次涉及的前端、後端或其他系統介面，以及各介面既有 feature/dsl 是否需要 ADD / MODIFY / DELETE。
4. WRITE 向使用者回報本輪辨識出的介面、預計新增/修改/刪除的 truth feature files 與 DSL 範圍。

## Phase 2 -- 分派 acceptance 規則並處理高影響變更

1. READ 讀取 `rules/介面Gherkin原子化與單一Act判準.md`，確認介面 Gherkin 原子化與單一 Act 邊界。
2. THINK 逐一盤點 acceptance 的 Rule、Example、關鍵 Given / When / Then 與 `# [need clarification]`，分派到相關介面，確認每條 acceptance 規則至少由一個 interface truth 承接。
3. THINK 將前端旅程對應到畫面／狀態 ID、導覽與資訊位置；總覽、詳情及結算的斷言分別落在已確認位置，不為測試方便新增區塊。跨裝置驗證沿用同一旅程，不把必須取得資料推定為同頁顯示全部資料；B 類依據不足回交 `/system-analysis` 補記，實際需改設計則升 C 回交 `/ui-plan`；行為矛盾回交規格 owner。
4. DELEGATE 若高影響 MODIFY / DELETE 會改寫既有 interface 行為、移除既有驗收或削弱 DSL 驗證契約，且尚未有明確使用者決策，呼叫 `/clarify`；未收斂前停止。

## Phase 3 -- 更新 interface feature truth

1. READ 讀取 `../gherkin-and-dsl/SKILL.md` 與 `../gherkin-and-dsl/STANDARDS.md`，承接其已掛載的 Gherkin、DSL 與唯一歸屬判準。
2. WRITE 依已載入規則在唯一權威位置建立、修改、移動或刪除受影響的 interface feature 與 DSL rows。
3. DELEGATE 呼叫 `/gherkin-and-dsl` 檢查受影響介面，取得拓樸機械稽核、DSL 唯一歸屬、acceptance 覆蓋與 Gherkin 結構結果；另核對 DSL 的導航／資訊位置與分流對應的呈現依據一致，UI 路徑參照留在 plan-side handoff，不把像素值或 `.pen` 版本寫入業務 Gherkin；若不符合，修正或回交 owner。
4. THINK 將 feature/dsl truth 改動整理為語意單元層級的 ADD / MODIFY / DELETE / NOOP 列。

## Phase 4 -- 更新 truth-delta 並交付

1. DELEGATE 呼叫 `/truth-delta`，傳入 plan package、truth root、owner `/dsl-refine`、受影響模組、feature、模組 DSL、相關共用 DSL rows 與本輪 truth 改動列；DSL row 僅搬移權威位置而未改語意時，明示舊位置、新位置與「語意不變」。
2. WRITE 向使用者回報更新的 interface feature/dsl truth、truth-delta 更新結果與剩餘缺口；在 plan-side handoff（可用 `dsl-refine-review.md`）保留 feature／DSL 到畫面 ID、資訊位置、分流、固定基準／設計或既有依據與選用互動決策的對照，更新續跑點，確認是否可交給 `/tasks` 或 `/bdd`。
