---
name: tasks
description: 根據 plan package、truth-delta 與 truth 產出可直接執行的 tasks.md。先寫 Setup 與 Foundational，按可驗證範圍安排測試對齊、獨立審查及產品實作波次；亦支援純重構回歸、工程交付與明確的使用者確認關卡。
disable-model-invocation: true
---

# Tasks Skill

`tasks` 是 plan-side execution planner。它不修改 truth，只把本次 plan、truth-delta 與目前 truth 轉成 `/implement` 可逐步執行的 `tasks.md`。本輪新增技術先寫 Setup；再寫 Foundational；測試層保留在 Phase 3，按明列依賴與對應 Feature phases 交錯執行。規劃時盤點既有自動化測試以決定 BDD 對齊與重構回歸範圍；盤點本身不得輸出成 implement task。

# SOP

## Phase 1 -- 收斂 plan package、truth-delta 與本輪 DSL 清單

1. READ 讀取使用者需求、目標 plan package 的 `spec.md`、`plan.md`、`research.md`、適用的 `ui/**`、`truth-delta.md`，以及受影響模組的 truth feature、模組 DSL、truth-delta 實際引用的介面根共用 DSL rows、相關 contracts/data 與 `specs/truth/techstack.md`。
2. READ 讀取 `.agents/constitution/CONSTITUTION.md` 與 `.agents/constitution/shared.md`，並將其中規則視為高於本地 artifact 規範的約束。
3. READ 讀取 `rules/TruthDelta影響盤點與任務型態判準.md`，確認 ADD / MODIFY / DELETE / NOOP 如何拆到 Phase 3 測試層與 Feature 產品層，以及 Setup、Foundational 與 Test Alignment 的邊界。
4. READ 讀取 `rules/acceptance-classification-and-delivery-gates.md`，分類每項驗收及其證據、依賴與來源；混合要求分別承接，不得以非 BDD 任務掩蓋產品行為缺口。
5. READ 讀取 `../shared/low-memory-execution.md`、`../shared/session-handoff.md`、`../shared/test-evidence.md` 與 `../shared/ui-delivery.md`，核對分流、相應依據、測試證據與適用確認；只列實際受阻依賴與前置，不輸出未解決決策所阻擋的可執行任務。
6. THINK 盤點本輪 Feature 用到的全部 DSL 句：含 truth-delta 有改的句，以及本輪 Feature 用到、尚無 stepdef 的句。若有 `MODIFY` 或 `DELETE`，同時盤點既有 stepdef、helper、fixture 與產品分支，只用來寫後續 task，不輸出獨立 phase。若任一句沒有唯一 DSL 定義，停止受影響範圍並回交 `/dsl-refine`。

## Phase 2 -- 產生 Setup 與 Foundational

1. THINK 若本輪有新增技術，建立 Phase 1 `Setup`：寫清套件名、配置、技術環境與最後的 smoke-test；不寫 DSL 語意、不寫產品行為。
2. THINK 若本輪沒有新增技術，省略 Setup；不得把 helper、fixture 或落點骨架塞進 Setup。
3. THINK 建立 Phase 2 `Foundational`：只建立後續實作程式、測試共用元件、入口、fixture、helper 與落點骨架；每則寫「只做／不做」。
4. THINK Setup 與 Foundational 不得偷做 Phase 3 測試層或 Feature Green。

## Phase 3 -- 建立 Test Alignment & Implementation

1. READ 讀取 `templates/tasks.md` 與 `templates/tasks.example.md`，確認 Phase 3 固定章節：`DSL 參照`、`Markers`、`Shared Must Read`、`Boundary`、`Parallel Hint`。
2. THINK 若沒有需對齊的 DSL 句，省略 Phase 3 並記錄原因及既有回歸範圍；否則依已載入規則安排可驗證波次，為每句標 `[BDD-ALIGN]`、`[BDD-REMOVE]` 或 `[BDD-RED]`，維持一條 DSL 一個 `[P]` task、各波精確 Test Scope 與獨立 review。
3. THINK 寫入 `DSL 參照`（每句的權威 `dsl.md` 與讀 `StepDef 實作語意` 的方法）、`Markers`、本輪要讀的句、`Boundary` 與 `Parallel Hint`；Hint 宣告可平行範圍與 review 邊界，實際排程依資源契約，不要求每句新建 agent。
4. THINK 寫明各波前置、首條正式測試路徑與 review 解鎖的 Feature tasks；核對無循環依賴且首波 Green 不等待無關後波。Phase 3 不安排產品碼任務。

## Phase 4 -- 建立 Feature phases

1. THINK 對 `ADD` 的 truth interface feature file，建立 `[BDD-GREEN] -> [BDD-REFACTOR]`，並宣告 `Test Scope`。
2. THINK 對 `MODIFY` 的 truth interface feature file，建立 `[BDD-GREEN] -> [BDD-REFACTOR]`，並宣告 `Test Scope`。
3. THINK 對 `DELETE` 的 truth interface feature file、Rule、Example 或 DSL 句型，建立 `[CODE-REMOVE] -> [REGRESSION]`，並宣告 `Test Scope`。
4. READ 讀取 `rules/Feature約束從plan介面回追.md`，確認 Feature `Shared Must Read` 如何從 `truth-delta` 列回追 `plan.md` 介面與 planner 產物，以及 plan-side quality gate 何時出現。
5. THINK 為每個 Feature phase 填入 `Shared Must Read`、`Boundary` 與 `Test Scope`：先寫 feature、同模組 DSL、該 `/dsl-refine` 列，再依已載入規則補上該介面產物或既有依據；未使用介面根共用 DSL row 時省略根 DSL。truth 參照使用 `specs/truth/**`；plan-side 參照使用 plan package 相對路徑。若回追點名的適用依據不存在，停止其依賴並回交相應 owner。
6. THINK 按已載入契約將所有實際受影響畫面／狀態、路由、共享導航／元件綁定分流對應的依據與證據；C 類指定代表性桌機／手機比對 checkpoint 及後續依賴，僅選用互動綁定原型入口與決策。
7. THINK 依已載入規則判定適用產物家族，在最後一個消費者後安排一次 quality gate，明列範圍、參照與證據。
8. THINK 若產品介面行為的驗收無法被現有 truth feature、同模組 DSL 與相關共用 DSL rows 唯一承接，停止受影響範圍並回交 `/dsl-refine`。
9. THINK 依驗收分類建立獨立重構、工程交付與確認任務，記錄來源、範圍、驗證證據與依賴；純重構引用既有受影響的回歸測試，缺少適當測試時明列補足或其他驗證與限制。確認關卡後的受阻任務不得提前解鎖。
10. THINK 依分流安排適用的確認關卡與 session checkpoints，引用既有有效證據；依共用契約安排驗收後基準回填及獨立核對任務，明列產品驗收依賴、寫入範圍、版本整合與完成條件，不適用則記錄理由。

## Phase 5 -- 輸出並驗證 tasks.md

1. WRITE 先讀取 `templates/tasks.md` 與 `templates/tasks.example.md`，再依骨架複製結構、參考範例改寫填位符號與具體內容，輸出 `specs/plans/NNN-<slug>/tasks.md`；增量／舊 plan 補驗依已載入規則保留 ID 與歷史證據，只重開受影響項目或新增補驗依賴。
2. READ 回頭檢查：新增任務皆為 `- [ ] T###`、既有狀態與補驗有依據、truth-delta 已納入核心輸入、沒有 Impact Audit phase、有新增技術時 Setup 寫清套件名與 smoke-test、Foundational 每則有「只做／不做」、有待處理 DSL 時 Phase 3 已按波列全 ALIGN / REMOVE / RED，否則記錄省略原因；每波前置／review／Green 依賴無循環、首波能先取得真實訊號、共用測試改動的消費者已涵蓋；每項驗收均有來源與證據、確認關卡依賴明確、Feature phase 不含 `[BDD-RED]` / `[BDD-ALIGN]` / `[BDD-REMOVE]`、每個 Feature phase 有 `Test Scope`、Feature `Shared Must Read` 含回追產物、每個適用產物家族在最後一個消費者之後有 quality gate、truth 參照指向 `specs/truth/**`、plan-side 參照用於回追產物及交付任務需求來源；若不符合，立即修正。
3. READ 核對模板與輸出未要求無上限派工；UI 分流與條件前置、跨模組參照、代表畫面依賴、適用差異證據、驗收後回填及 session checkpoints 均可執行；若有缺漏，修正後才交付。
