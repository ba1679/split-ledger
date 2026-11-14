---
name: implement
description: 根據 plan package 的 tasks.md 逐筆驗證、回寫並續跑至交付；支援 16GB 低記憶體模式，保留獨立審查與完整回歸。
disable-model-invocation: true
---

# Implement

`implement` 將 `tasks.md` 視為唯一執行控制平面，但執行上下文必須包含 plan package 與 `truth-delta.md`。它負責交付 plan，不負責重新定義 truth；若發現 truth 與 tasks 明顯矛盾，應停止受影響 task 並回報需要上游修正。

## Operating Principles

- 預設持續推進已授權範圍直到交付；One-Shot 保留逐筆驗證回寫，但到指定 session checkpoint 應交接，不要求同一 chat 完成整個 plan。
- One-Shot 的一輪任務集依資源模式與 Dependencies 收斂；低記憶體模式逐筆處理 `Parallel Hint` 內的 task，保留整批 review 關卡。
- 做完一個任務集就驗證，立刻回寫 `tasks.md` 的 `[X]`，再重算下一筆。未回寫不得開下一個任務集。
- 嚴格執行不能跳步驟。`don't stop until deliver` 不是跳步驟的許可。
- Feature phase 仍序列。`[BDD-GREEN]`、`[BDD-REFACTOR]` 才委派 `/bdd`，並把該 phase 的 `Test Scope` 當範疇。
- Phase 3 的 `[BDD-ALIGN]`、`[BDD-REMOVE]`、`[BDD-RED]` 不委派 `/bdd`；實作者讀 `dsl.md` 該列的 `StepDef 實作語意` 寫測試層。
- Phase 3 review 通過前，不得進入依賴該 review 的 Feature Green；只有 tasks 明確分波時按波解鎖，未分波仍按原全批關卡。
- 全部 tasks `[X]` 後詢問是否 git commit；不得自動 commit。

# SOP

## Phase 1 -- 對齊 plan 並啟動 One-Shot

1. READ 讀取使用者需求、目標 plan package、`tasks.md`、`truth-delta.md` 與目前 task 完成狀態，確認指定範圍（若有）與 One-Shot 起點。
2. READ 讀取 `../shared/low-memory-execution.md`，選定資源模式、記錄基線與可用回收能力，建立傳給下游的資源契約。
3. READ 讀取 `../shared/session-handoff.md` 與 `../shared/ui-delivery.md`，恢復時核對 handoff 與實際範圍的分流、呈現／行為依據及適用前置；單獨呼叫也承接或補記分流，舊 tasks 只對不符合適用條件的範圍回交 `/tasks` 或相應 owner，不因缺無關產物推翻有效進度。
4. READ 讀取 `rules/任務選取與連續續跑判準.md`，確認已解鎖 task 的選取、One-Shot 與停止條件。
5. READ 讀取 `rules/TruthDelta測試對齊與BDD委派判準.md`，確認 ADD / MODIFY / DELETE 的執行策略，以及哪些 marker 才委派 `/bdd`。
6. THINK 依已讀任務、資源契約與判準收斂 One-Shot 起點、是否命中 `Parallel Hint`、所屬 phase 與本次 session checkpoint；只選前置關卡已通過的工作。

## Phase 2 -- 補強 repo hygiene 與執行前置

1. READ 讀取 `rules/repo-hygiene-與-ignore-補強判準.md`，確認本次需要檢查哪些 ignore surfaces、哪些只可增補不可覆寫。
2. THINK 依目前 repo、工具鏈、plan package、truth-delta 與 `specs/truth/techstack.md` 收斂本輪必做的最小 hygiene 補強。
3. WRITE 只在實際相關且確有缺口時建立或增補 ignore 設定，避免擴張到無關工具鏈。

## Phase 3 -- 收斂本輪任務集（不能跳步驟）

1. READ 讀取 `rules/嚴格禁止跳步驟判準.md` 與 `rules/平行執行與檔案衝突判準.md`，確認本輪任務集邊界。
2. READ 若 `tasks.md` 當前 phase 含 `Parallel Hint`，讀取 `rules/ParallelHint平行Subagent與衝突Merge判準.md`。
3. READ 若遇到 `[USER-CONFIRM]`，讀取 `rules/user-confirmation-gate.md`；關卡未通過時依賴它的任務不得解鎖。
4. THINK 依資源契約收斂本輪任務集：低記憶體模式恰好 1 個已解鎖 task；其他模式才在預算內收取 `Parallel Hint` 批次。
5. THINK 收斂執行模式與實作者／審查者：Setup 與 Foundational 直接實作並停在該則「只做／不做」；Phase 3 的 ALIGN / REMOVE / RED 僅寫測試層；review 交由未實作受審改動的審查者；`[BDD-GREEN]` / `[BDD-REFACTOR]` 呼叫 `/bdd`；`[CODE-REMOVE]`、`[REGRESSION]` 直接實作或直接驗證。
6. THINK 在派工或啟動測試前核對資源檢查點，確認沒有未回收程序、壓力告警或超出預算的工作。

## Phase 4 -- 載入精確參照並執行

1. READ 讀取 `rules/技術參照載入與最小上下文判準.md`，確認 `Read`、phase-level `Shared Must Read`、`Extra Read`、truth-delta rows 與相鄰 task / artifact 的載入邊界。
2. READ 依當前任務集的精確參照載入必要 plan artifacts、truth feature、同模組 DSL、實際列出的介面根共用 DSL rows 與既有自動化測試落點；不得掃描或預讀其他模組 DSL。
3. READ 若本輪修改受憲法治理的 artifact 或與 truth specs 發生衝突，讀取 `.agents/constitution/CONSTITUTION.md`、`.agents/constitution/shared.md` 與對應憲法檔。
4. READ 讀取 `rules/自主決策與阻塞處理判準.md`，確認規格缺口、局部矛盾或環境阻礙時的決策優先序。
5. WRITE 若本輪是 Phase 3 測試層 task，依已選派工方式直接實作或交給既有工作者；每筆驗證、回寫後才處理下一筆，整批完成後執行獨立 review 迴圈。
6. DELEGATE 若本輪是 `[BDD-GREEN]` 或 `[BDD-REFACTOR]`，在目前 agent 載入 `/bdd` 或交給預算內的既有工作者執行單一 requested step，傳入 `Test Scope`、action、truth rows、模組 DSL、實際使用的共用 DSL rows、資源契約，以及分流、呈現／行為依據、適用批准／比對版本、選用互動決策與 checkpoint；呼叫 skill 不代表建立新 agent。
7. WRITE 若 task 為 `[USER-CONFIRM]`，依關卡規則展示並等待明確確認；否則若 task 不帶上述 marker，依 task marker 完成本輪所需的程式、設定、文件、基準回填或測試變更；回填只寫 task 明列的基準範圍；不得越出本輪任務與 phase boundary。

## Phase 5 -- 驗證、回寫、繼續 One-Shot 直到交付

1. READ 讀取 `rules/完成定義-驗證與回寫判準.md`，確認 task 完成條件與回寫條件。
2. THINK 依 task 類型收斂最直接的驗證方式。
3. READ 按分流核對 task 的行為／畫面證據、有效版本與相關 checkpoint；基準回填實作 task 核對產品驗收依賴、最新基準整合與自查，完成後才解鎖回填審查 task；審查 task 另核對獨立審查結果，各自按證據回寫。
4. WRITE 在本輪任務集的實作與驗證都完成後，立即將對應 task 改寫為 `[X]`，並保留其他 task 狀態不變。
5. WRITE 完成本輪程序回收與資源檢查點，更新驗證證據與 `handoff.md`；到指定 session checkpoint、開發者待確認或資源受阻時保存進度、回報續跑指示並結束本輪，未驗證項目維持 `[ ]`。
6. THINK 未到交接點且資源檢查通過時，重新計算下一個已解鎖 task；若有，返回 Phase 3。整批 review、適用 UI 批准／比對／差異收斂、選用互動決策、基準回填／審查及交付完整回歸尚未通過時，不得宣稱 plan 完成。
7. WRITE 若目標 plan package 全部 tasks 已 `[X]` 且要求的完整回歸通過，向使用者回報本次 plan 已交付，並詢問是否用 git commit deliver；未取得使用者同意前不得 commit。
