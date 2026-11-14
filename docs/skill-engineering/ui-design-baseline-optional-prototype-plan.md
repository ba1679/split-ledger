# Skill 工程編排提案

## 任務資訊

- 日期：2026-11-13，Asia/Taipei。
- 處理路徑：`optimize`。
- 改動範圍：`chain rewrite`；重寫 UI 控制平面，同步上下游前置與交接。
- 目標 Skills：`system-analysis`、`ui-plan`、`dsl-refine`、`tasks`、`bdd`、`implement`，共 6 個；另含 `shared/ui-delivery.md`、`shared/session-handoff.md`。
- 需求依據：commit `8458791` 的 [交接文件](ui-design-baseline-optional-prototype-handoff.md)。
- 根因確認：使用者在本 chat 回覆「同意，請用 skill-engineering」，承接上一輪評估及其四項補強。沿用既有確認，不重開根因訪談。
- 預期結果：依 UI 影響選擇必要交付，設計確認後可直接進下游；以實際產品畫面比對維持設計落實。
- 本提案狀態：已確認進入實作。使用者在本 chat 確認先改 skills、再建基準的順序後回覆「OK GO」；實際驗證結果另見同目錄 validation 文件。

### 已確認的現況與根因

現行共用契約與 ui-plan 強制設計確認後製作完整 prototype；dsl-refine、tasks、bdd、implement 再以同步 prototype 作為前置。缺少基準引用與回填責任，使 plan 重複建置畫面。根因涉及控制平面及跨 skill handoff，單點修改無法解除下游阻擋。

已唯讀盤點目前 6 個 skills 的 SOP 與引用關係。引用分析工具回報各 skill 的 missingSkillRefs、missingArtifactRefs、unreferencedArtifacts 均為空。這只證明引用完整，不代表流程語意正確；共用契約與跨 skill 語意仍需人工核對。

## 控制平面重建

### 分流與責任

UI 分流、版本、有效確認、互動選用及驗收判準統一由 `shared/ui-delivery.md` 定義。各 skill 只保留讀取時機、分流判斷、交付與回交動作，不複製判準。

| 分流 | 首次紀錄與下游依據 | 必要完成證據 |
| --- | --- | --- |
| A：沒有 UI 影響 | plan.md 的不適用理由與範圍 | 適用工程驗證 |
| B：既有呈現，資料或行為改變 | plan.md 的畫面／狀態 ID、路由、既有呈現依據、本次 spec／truth 行為依據 | 受影響行為驗證及適用畫面回歸；無須新增 ui/ |
| C：有設計變更 | 固定基準版本＋plan-side 已確認設計及畫面索引 | 有效確認、代表畫面 checkpoint、逐畫面差異、最終獨立 UI 審查 |

B 類的程式或現況截圖只證明既有呈現，正確業務行為仍由 spec／truth owner 決定。單獨呼叫 bdd／implement 時可在 plan-side 紀錄補充分流與理由；若缺口影響驗收意圖則回交對應 owner，不能自行補規格。B 升 C 時只重開受影響依賴。

### 最小 SOP 主幹草案

以下為待確認的控制平面；正式 skill 保留未受影響的既有步驟。步驟格式依 skill-form-sop，細部判準留在被讀取資源。

#### system-analysis：盤點 → 分流與依賴 → 條件委派

1. READ 讀取 plan、truth 與共用 UI 契約，核對既有分流紀錄。
2. THINK 依受影響範圍判定 A／B／C，盤點必要基準與缺口。
3. WRITE 在 plan.md 記錄分流、依據、畫面／行為與決策依賴，安排 Wave。
4. DELEGATE 將 API／data 責任交既有 owner，僅將 C 類設計責任交 ui-plan，傳入固定基準與受影響範圍。
5. WRITE 分別回報已就緒與受阻範圍及下一入口。

Wave 保留依賴排序；將需要不同決策的範圍拆成可追蹤介面或子範圍。前序某項待確認時，只有已明列、不依賴該項決策且前置完成的範圍可以繼續；不能把整個前序 Wave 宣稱完成，也不能任意跳過真實依賴。

#### ui-plan：定位 → 設計與確認 → 可選互動 → 交接

1. READ 讀取需求、分流、相關 truth、固定基準及共用交付契約，核對入口模式。
2. THINK 定位現況與本次差異，收斂受影響畫面及需要體驗才能決定的問題。
3. WRITE 依 ui-plan 模板產出必要 .pen、桌機／手機預覽及行為註記。
4. WRITE 展示本次設計並保存待確認版本、範圍與續跑點。
5. READ 承接明確確認或修改要求，維護有效批准證據。
6. READ 若選用 prototype，讀取局部互動規則；依選用結果製作、操作並記錄決策與限制。
7. WRITE 交付畫面索引、版本及受阻依賴；依模式寫入准許的位置。

一般模式只寫 plan-side ui/**；明確的基準建立模式可寫 specs/ui-baseline/**，需指定固定產品版本並實際核對現況。這次只建立模式規則，不執行基準建立。

Prototype 選用方式與執行狀態分開記錄：方式為不製作／設計工具連線／局部程式原型；選用後才追蹤 pending／completed／stale 與相關決策。合法的不製作不進入 pending。設計工具無所需能力時，記錄限制，只針對問題選擇局部替代方式。

#### dsl-refine：分流前置 → 行為細化 → truth 交付

1. READ 讀取 acceptance、plan 及相關 truth；按共用契約核對該範圍分流與交接依據。
2. THINK 將旅程對應畫面、資訊位置與行為來源，判定可細化或須回交的範圍。
3. WRITE 沿用既有原子化與唯一 DSL 歸屬流程更新 truth。
4. DELEGATE 沿用 gherkin-and-dsl 檢查與 truth-delta 記錄。
5. WRITE 將畫面／行為依據、版本與未決依賴留在 plan-side handoff。

A／B 不因缺 ui/ 而停止；C 核對有效設計確認及選用互動的相關決策。像素、.pen 版本仍留在 plan-side。

#### tasks：核對範圍 → 規劃實作與驗收 → 回填交付

1. READ 讀取 plan、truth-delta、受影響 truth 與共用契約，核對各範圍可執行性。
2. THINK 沿用既有 Setup、Foundational、Phase 3 與 Feature 任務語意。
3. THINK 按分流綁定精確依據與完成證據；對 C 安排代表畫面、後續依賴及最終 UI 審查。
4. THINK 對需更新基準的變更安排驗收後回填與審查任務，宣告寫入邊界與依賴。
5. WRITE 依模板輸出 tasks，保留舊 ID、有效證據與未受影響進度。
6. READ 核對分流、條件交付、依賴及基準回填均能執行。

#### bdd：核對單一範圍 → red／green／refactor → 回報證據

1. READ 讀取 requested step、feature／DSL 與精確參照，依共用契約承接或補記分流。
2. THINK 確認行為、呈現依據與實際修改範圍一致，處理相關回交。
3. WRITE 沿用既有 red／green／refactor 規則執行指定入口。
4. WRITE 按分流完成本輪適用的畫面比對，回報仍未完成的範圍與版本。

#### implement：恢復 → 選取已解鎖任務 → 驗證與交接

1. READ 恢復 tasks、handoff、資源狀態；按共用契約核對實際範圍分流。
2. THINK 沿用既有 task 選取、資源預算、Phase 3 與獨立審查排程。
3. READ 載入 task 的精確依據；C 類核對有效確認與相關未決互動。
4. DELEGATE 依既有規則執行 BDD 或直接完成工程／基準回填任務。
5. READ 核對對應驗證、代表畫面依賴與適用的獨立審查。
6. WRITE 回寫 task 與 handoff；基準回填及審查仍未完成時，維持 plan 未完成。

### 基準版本與回填

- 固定引用包含 repo commit、檔案路徑、穩定畫面／狀態 ID 與同版預覽；可另附雜湊。尚未提交的提案使用內容雜湊固定，不杜撰 commit。
- 舊 plan 繼續使用其固定版本；從該 commit 取得對應 .pen／預覽供比對，不改指向最新檔案。必要時取回到獨立檢視位置，不覆蓋目前基準。
- 回填順序：受影響產品驗收通過 → 核對最新基準與本次起點差異 → 更新相關 frame／預覽／README → 未參與該回填實作的審查者核對 → 完成回填任務。
- 不同 plan 更新同一基準時，保留已驗收的其他變更。非重疊範圍整合後重驗受影響部分；同畫面或共享元件衝突回交決策，不以整檔舊快照覆蓋。
- 回填只是將已驗收成果記入現況；若回填改變設計意圖，回到相關設計確認與產品驗證。
- 本輪不新增獨立基準 skill、不建立 React prototype 專案、不建立實際 specs/ui-baseline/。

## 來源能力保留策略

| 來源能力 | 保留位置 | 保留粒度與安全刪減 |
| --- | --- | --- |
| ui-delivery 的狀態覆蓋、確認與來源衝突判準 | shared/ui-delivery.md | 保留空白／載入／錯誤／長內容／確認／結果未明、AI 適配邊界、批准失效與回交條件；改為按分流適用 |
| 逐畫面驗收與版本追溯 | shared/ui-delivery.md、tasks 證據欄位 | 保留同尺寸／可比資料、區塊／密度／導覽／排列／字體／顏色／間距／操作檢查、差異處理及獨立 UI gate；移除無條件三方同步 |
| 原型的互動證據與產品邊界 | ui-plan 的局部互動規則及模板 | 保留指定問題、可操作證據、模擬限制、工程說明留在交接文件；刪除完整主流程與每頁 HTML 要求 |
| 跨模組影響與精確讀取 | tasks 回追規則、implement 技術參照規則 | 保留所有實際受影響畫面、導航與元件；B 可回追 plan.md 的既有依據，C 回追設計索引 |
| 舊 plan／跨 chat 續跑與獨立介面分波 | shared/session-handoff.md | 保留 task ID、歷史證據、受阻範圍與完整回歸；新增分流、固定基準及選用結果 |
| BDD／truth owner／低記憶體執行 | 既有未受影響規則 | 保留測試語意、資源限制與排程；只調整 UI 交接條件 |

上述覆蓋與驗收清單屬高指導面積來源，不能縮成「遵循設計」一句話。歷史工程文件維持歷史原貌。

## 步驟決策

| 既有步驟／資源 | 決策 | 落點 |
| --- | --- | --- |
| system-analysis P2 介面盤點、P3 Wave、P4 委派 | rewrite | 主 SOP 保留分流與委派動作；判準集中共用契約，Wave 規則處理決策依賴 |
| ui-plan P1 入口與前置 | rewrite | 加入一般／基準建立模式及基準定位 |
| ui-plan P2 設計、展示與確認 | keep-inline／rewrite | 保留必要控制步驟，細節引用共用契約 |
| ui-plan P3 全面 prototype 與全部同步 | delete／rewrite | 刪除固定階段，替換成條件式局部互動與交接 |
| UI 分流、基準、確認、驗收 | derive-rule | 重寫既有共用契約，維持單一溯源 |
| ui-plan 兩份原型規則 | derive-rule | 合併重建為一份局部互動規則，移除舊引用 |
| plan、ui-plan、tasks 骨架與範例 | derive-template | 同步條件欄位、依據回追與具體情境 |
| dsl-refine P1／P2／P3／P4 UI 交接步驟 | rewrite | 以分流及行為／呈現依據取代必備 prototype |
| tasks P1 前置、P4 回追與關卡、P5 核對 | rewrite | 保留原測試任務順序，加入條件驗收及回填依賴 |
| bdd 入口、畫面比對及交付步驟 | rewrite | 單獨呼叫也判定分流；保留原三入口語意 |
| implement 恢復、精確讀取、委派與完成條件 | rewrite | 按分流檢查，承接回填任務與審查 |
| session-handoff UI 版本與補驗例子 | rewrite | 保存條件交付，避免舊完成證據被全面推翻 |
| 完整頁面 HTML 模板 | delete | 移除四份模板及所有有效引用 |
| 引用機械檢查 | keep-inline | 使用既有分析工具；不新增 scripts |

實作時以目前 skill 的完整 SOP 為底逐步套用；未列出的非 UI 步驟保持原責任。派用 deriver 表示載入對應 skill 執行，不預設建立 sub-agent。

## 檔案動作

下列路徑相對 `.agents/skills/`；文件提案及驗證紀錄位於 docs/skill-engineering/。

### 新增 / 更新

- 更新 `shared/ui-delivery.md`、`shared/session-handoff.md`。
- 更新 6 個目標 skills 的 `SKILL.md`；ui-plan 的 description 與寫入邊界同步修改。
- 更新 `system-analysis/templates/plan.md`、`plan.example.md`。
- 更新 `system-analysis/rules/分析介面委派與planner對應判準.md`、`Wave依賴排序與平行分組判準.md`。
- 更新 `ui-plan/templates/ui-plan.md`、`ui-plan.example.md`。
- 新增 `ui-plan/rules/局部互動原型選用與交付判準.md`，承接兩份舊原型規則仍適用的能力；主 SOP 在選用時載入。
- 更新 `tasks/rules/Feature約束從plan介面回追.md`、`acceptance-classification-and-delivery-gates.md`。
- 更新 `tasks/templates/tasks.md`、`tasks.example.md`，範例明示 A／B／C 與不製作 prototype 的合法完成方式。
- 更新 `implement/rules/技術參照載入與最小上下文判準.md`；執行前再次搜尋其餘規則，只有實際含舊 UI 阻擋條件者才同步修改並列入驗證紀錄。
- 本提案確認落地後，另增 `docs/skill-engineering/ui-design-baseline-optional-prototype-validation.md`，記錄實際 diff、引用與情境驗證。

### 刪除

- `ui-plan/templates/prototype-entry.html`
- `ui-plan/templates/prototype-entry.example.html`
- `ui-plan/templates/prototype-screen.html`
- `ui-plan/templates/prototype-screen.example.html`
- `ui-plan/rules/高保真靜態頁面切分與Flow覆蓋判準.md`
- `ui-plan/rules/靜態網站雛形與實作計畫邊界判準.md`

兩份舊規則於有效能力移入新規則後刪除。不刪舊 plan 已交付的 prototype，不改寫歷史工程記錄，不修改產品碼、truth、006 package 或現有設計產物。

## 驗證方式

1. 引用檢查：使用 skill-engineering 已提供的 analyze_skill_references.py，對 6 個目標 skills 重新盤點，與本輪零缺失基線比較；人工補查 shared 引用及刪除檔名殘留。
2. 格式檢查：依 skill-form-sop 核對 Phase／Step、資源讀取時機；依相應 deriver／form skill 核對規則及模板配對。模板標題、說明與註解以繁體中文為主。
3. 語意檢查：搜尋 prototype、雛形、ui/index.html、全部同步、強制前置等舊條件，逐筆確認只在選用範圍成立；保留必要能力，不只清空關鍵字。
4. 情境推演：以下每項記錄入口、所讀依據、可繼續範圍、阻擋及完成條件；不能只宣告 PASS。

| 情境 | 必須成立的結果 |
| --- | --- |
| A 純後端 | 缺 ui/ 仍可完成適用驗證 |
| B 計算修正 | 引用既有呈現與新行為依據，驗證修正，不新增設計稿 |
| C 無互動疑問 | 確認設計後直接細化／排任務，prototype 不製作不受阻 |
| C 單一互動疑問 | 只製作局部原型，只阻擋依賴該決策的工作 |
| 混合 A／B／C 與前序 Wave 待確認 | 獨立工作依明列依賴繼續，不能宣稱整個 Wave／plan 就緒 |
| 缺少基準畫面 | C 按需核對必要範圍；B 可引用現況證據 |
| 單獨 bdd／implement | 能補記分流；缺 ui/ 不一律停止，也不自行補業務規格 |
| 設計改版與舊 tasks | 只重開受影響依賴，保留有效歷史證據與 ID |
| 產品已驗收但未回填 | 回填與審查保持未完成，plan 不提前交付 |
| 兩個 plan 回填同一基準 | 比較最新基準，保留非重疊成果，同範圍衝突回交 |
| 基準更新後恢復舊 plan | 取回固定 commit 的設計與預覽，不漂移到最新版本 |
| 歷史 plan 已批准與已完成原型 | 沿用有效範圍，無須全面重生或重新批准 |

5. 差異檢查：git diff --check、檔案清單及保留能力對照；本輪流程文件改動不新增或執行無關產品測試，不宣稱產品視覺驗收已執行。

## 實作閘門

- 根因與方向已確認；本文件將其收斂為可審查的控制平面、檔案動作與驗證方案。
- 依 skill-engineering Phase 3 Step 4，取得本編排提案的確認後，才進入 Phase 4 修改目標 skills。
- 確認後載入 skill-form-sop、skill-derive-rule／skill-form-rule、skill-derive-template／skill-form-template 與 writing-for-agents 完成對應改動；本次不需要新增 script。
- 實作完成後回報實際檔案、驗證結果與限制；Git commit 不屬本次提案自動執行範圍。
