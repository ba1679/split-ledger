---
name: bdd
description: 承接 /dsl-refine 之後已存在的介面 feature files 與 dsl.md，在使用者指定的單一介面 feature file 或其明確區塊內，以 red、green、refactor 三個入口推進 BDD/TDD 實作。它不負責產 feature files；若規格缺口影響驗收意圖或 DSL 邊界，必須停止並回交上游。
disable-model-invocation: true
---

# BDD

把 `/dsl-refine` 已交付的介面 `feature files` 與 `dsl.md`，轉成可執行的 step definitions、測試實作與產品碼變更：

- `feature file` 與 `dsl.md` 是本 skill 的上游單一溯源。
- `/bdd` 只在使用者指定的單一介面 `feature file` 或其明確區塊內推進工作。
- `/bdd` 有 `red`、`green`、`refactor` 三個入口；每次只進入其中一個入口。
- 同一次 invocation 可以在指定範疇內 sequentially 推進多個 slices，但同一時刻只處理一個 slice。
- 若 `/bdd` 是由 `/implement` 的單一 task 委派，必須服從該 task 的單一 `slice`、單一 `requested step` 與當前 scope，不能順手吞掉後續 task。
- 若發現 `feature file` 或 `dsl.md` 有高影響缺口，必須停止並回交 `/dsl-refine` 或使用者指定的上游流程。
- 呼叫本 skill 可在目前 agent 中執行；獨立審查與測試執行各自依資源契約安排。

# SOP

## Phase 1 -- 對齊上游交付、測試入口與本輪範疇

1. READ 讀取使用者需求、指定的介面 `feature file` 或其明確區塊、同模組 `dsl.md`、該 feature 實際使用的介面根共用 `dsl.md` rows、相關測試程式與產品碼，確認本輪入口是 `red`、`green` 或 `refactor`，以及使用者圈定的範疇；若由 `/implement` 委派，額外確認當前 task 只授權單一 `slice` 與單一 `requested step`。
2. READ 讀取 `../shared/low-memory-execution.md`，承接上游資源契約；單獨使用時選定模式並記錄基線、可用回收能力與資源檢查點。
3. READ 若需要確認模組化 truth 的承接方式或專案既有 symlink 策略，讀取 `rules/模組化Truth按需承接與Symlink判準.md`。
4. READ 若需要確認本 skill 可承接的上游交付物、何時必須停止，或何種缺口應回交上游，讀取 `rules/上游交付承接與回交判準.md`。
5. THINK 若本輪範疇、已載入 DSL、介面邊界或上游交付物仍有高影響缺口，先收斂最小必要澄清點。
6. DELEGATE 若仍有會改變 slice 邊界、驗收結果或 DSL 承接方式的高影響缺口，呼叫 `/clarify` 並停止受影響範圍；若缺口來自 `feature file` 或任一層 DSL 本身，改為回交 `/dsl-refine` 或使用者指定的上游流程，不自行補寫規格。
7. READ 若需要確認 focused rerun、Given 建態入口、既有 helper / fixture / abstraction 是否可沿用，讀取 `rules/專案測試入口與既有抽象盤點判準.md`。
8. THINK 依本次已載入資訊與規則，收斂本輪可推進的範疇、最窄測試入口與候選 slices。

## Phase 2 -- 啟動指定入口與選定推進順序

1. THINK 若需要判斷指定範疇內應先推進哪個 slice、何時可繼續下一個 slice、Scenario Outline 應如何維持可驗證粒度，或何時算完成當前 slice，先讀取 `rules/範疇內slice選取與推進順序判準.md`，再依使用者指定入口與本輪範疇選出下一個可推進的 slice。
2. READ 若本輪入口是 `red`，讀取 `rules/red-失敗訊號建立判準.md`。
3. READ 若本輪入口是 `green`，讀取 `rules/green-最小補碼轉綠判準.md`。
4. READ 若本輪入口是 `refactor`，讀取 `rules/refactor-綠燈保護重構判準.md`。
5. THINK 依已載入規則，收斂本輪在該入口下要逐一推進的 slice 順序、停止條件與預計觸及的測試或實作落點。

## Phase 3 -- 在指定範疇內推進 slices

1. WRITE 依指定入口先處理當前 slice：`red` 先建立有效失敗訊號，`green` 只補目前 failure 所需的最小程式，`refactor` 只在綠燈保護下整理既有結構。
2. THINK 啟動測試前核對資源檢查點，依資源契約選定測試 worker、瀏覽器順序與既有 runner 命令。
3. DELEGATE 直接透過工具執行對應的 focused tests 或最小代表性測試集合，觀察訊號並修正當前 slice 至達成該入口完成條件；低記憶體模式不為測試另建 agent。
4. WRITE 完成測試程序回收，記錄案例範圍、結果與資源檢查點；本輪完成前補跑指定的完整 `Test Scope`，保留全部要求的瀏覽器與回歸範圍。
5. THINK 當前 slice 完成且資源檢查通過後，若仍有下一個同入口 slice，回到本 phase 的 step 1；若範疇、上游規格、測試回饋或資源受阻，保存未完成位置並回報。

## Phase 4 -- 回報結果與下一步

1. WRITE 回報本輪 slices、產品碼落點、測試與資源檢查結果、上游缺口及續跑入口；若上游要求獨立審查，交付可重演的 diff 與證據並等待未參與實作的審查者核對，不以自行執行測試代替審查。
