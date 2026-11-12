# UI 交付與跨 session 執行規則修正

## 任務資訊

- 處理路徑：優化既有 skill chain。
- 目標：`ui-plan`、`dsl-refine`、`tasks`、`bdd`、`implement` 及其實際引用規則／模板。
- 來源：low-memory 分支的 skill commit `f69fffdb9379485191322d6b5fe07925bfca9a66`，只移植 `.agents/skills/**` 改動，未合併該分支的產品變更。
- 分支整合：後續將 `origin/codex/low-memory-skill-mode` 合併回 main，保留已整合補強的 skills 與 main 完整 005 產品版本，避免分支內較早的中間實作回退；另保留遠端 `low-memory-execution-plan.md` 作原始工程紀錄。合併後核對產品／測試／spec 檔案相對合併前 HEAD 無差異。

## 根因與已確認決策

005 旅行帳本由多個 feature 修改，任務主要按模組提供設計參照，未完整帶入帳本與共享導航；驗收雖有截圖與 PASS，沒有逐項交代資訊區塊及手機排列差異。大量逐句派工與單一 chat 持續續跑也提高資源累積風險，但未證實工具內部記憶體問題的根因。

使用者已在本 chat 確認：先 `.pen`、再 prototype；主畫面桌機／手機與關鍵狀態；按設計實作，AI 可做不改設計意圖的細節適配。使用者明確要求實作五個 skills，並強制 `.pen` 交付後先給開發者確認才進下游。本次不重複要求批准修改 skills。

## 控制平面重建

UI plan／畫面索引 → `.pen`／預覽 → 開發者明確確認 → 可操作 prototype／同步 → 前端 DSL／tasks → 依畫面實作與比對 → 獨立 UI 整合驗收。純後端且不依賴 UI 決策的工作可獨立進行。

畫面交付規則、session 交接與低記憶體限制各由一份共用文件管理，主 SOP 只在需要時載入。確認綁定版本／範圍；改變設計意圖須重新確認，prototype 與下游同步失效後不得繼續。完整矩陣與獨立審查維持原要求。

## 來源能力保留策略與步驟決策

| 位置                    | 決策與保留能力                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------- |
| ui-plan 規劃入口        | 保留 spec／truth 對齊；載入共用 UI 契約與精簡交接                                  |
| ui-plan 原直接產出 HTML | 重寫為先 `.pen` 與可見預覽，明確確認後才做 prototype                               |
| ui-plan 模板            | 展開設計批准、畫面／狀態索引、三方版本／同步與差異證據；骨架與範例成對更新         |
| dsl-refine 分派與檢查   | 保留原子化、唯一 DSL、truth-delta；補導航／資訊位置與設計對照，對照留在 plan-side  |
| tasks 任務規劃          | 保留一 DSL 一 task、Setup／Foundational／測試／GREEN 分界；Hint 改為資源預算內排程 |
| tasks 畫面交接          | 依實際修改面綁定設計，含跨模組與共享元件；補代表畫面與正常 session checkpoints     |
| bdd 入口與執行          | 保留單一 scope／requested step；承接資源與 UI 前置，新增逐畫面比對及衝突回交       |
| implement 執行迴圈      | 移植 low-memory 並補正常交接；不要求同一 chat 做完整 plan；完成條件包含 UI 證據    |
| 共用文件                | 維持單一溯源，不新增常駐監控或額外可執行 skill                                     |
| 舊規則與示例            | 替換無條件每句開代理、只按模組挑設計、HTML 先交付等衝突指示；同檔寫入改單一寫入者  |

## 檔案動作

- 新增 `shared/ui-delivery.md`、`shared/session-handoff.md`，移植並補強 `shared/low-memory-execution.md`。
- 更新五份 `SKILL.md`、相關 implement／tasks／ui-plan 規則，以及 ui-plan／tasks 的成對模板。
- 無整檔刪除；舊指示在原位置替換，無新增 Python 工具或產品測試。

## 驗證方式與界限

- 檢查五份 skills 的引用、SOP／Rule 結構、模板配對、格式與 diff。
- 由一名未參與實作的獨立審查者推演待確認、新版設計、獨立後端、舊 tasks、16GB 跨 session、跨模組畫面修改情境；由主代理修正後回交複查。
- 本輪是流程文件驗證，不宣稱實測修復 16GB 記憶體峰值，也沒有生成新的產品 `.pen` 或驗收 005 畫面。

## 驗證結果

- 五份 skills 的引用分析：無缺失 skill／規則／模板引用，無孤立本地資源；另核對三份共用文件的相對路徑均存在。
- SOP phase／step 編號、Rule 結構、模板配對、範例無未替換填位符號及 task ID 唯一性檢查通過。
- 25 份新增／修改 Markdown 的 Prettier 格式檢查通過，`git diff --check` 通過。完整檢查輸出位於 ignored `.cache/ui-delivery-skill-validation/`。
- 獨立審查者 `/root/review_delivery_skills` 唯讀推演六種情境，首輪指出舊 `[X]` 補驗、後端分波與範例索引覆蓋三項缺口；主代理補強後，複查另修正表格中斷及舊全局 Phase 4 禁令。最後複查全部關閉，沒有剩餘 findings。
- 舊任務狀態與 backend／frontend 分波續接由共用交接規則統一管理；不丟失未受影響的完成證據，也不把後補批准當作舊畫面自動通過。
