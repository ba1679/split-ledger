# 任務規劃: {{FEATURE_NAME}}

**Plan package**: `{{PLAN_PACKAGE}}`
**核心輸入**: `spec.md`, `plan.md`, `research.md`, `truth-delta.md`, `specs/truth/techstack.md`, `specs/truth/contracts/**`, `specs/truth/data/**`, `specs/truth/features/backend/**`, `specs/truth/features/frontend/**`, 適用的 `ui/**`

## 任務綁定契約

- 產品行為開發任務對應 `truth-delta.md` 的語意；重構、工程交付與確認任務追溯 spec / plan，並引用相關 truth 或 NOOP（若有）。
- Phase 1 `Setup` 只做本輪新增技術的基礎建設、技術環境與最後的 smoke-test；不寫 DSL 語意、不寫產品行為。
- Phase 2 `Foundational` 只建立後續實作程式、測試共用元件、入口、fixture、helper 與落點骨架。
- 無需對齊 DSL 時省略 Phase 3，記錄原因與既有回歸範圍。
- Phase 3 `Test Alignment & Implementation` 的目的：在寫產品碼之前，先把本輪所有受影響 DSL 的自動化測試對齊最新版 truth。
- Truth 參照必須使用 `specs/truth/**` 路徑；plan 參照才使用當前 plan package 內相對路徑。
- Feature `Shared Must Read` 除 feature、同模組 DSL、對應 `truth-delta` 列外，還必須列入按分流回追到的適用產物或既有呈現／行為依據。

## UI 分流、資源模式與 session checkpoints

- 資源契約：{{RESOURCE_CONTRACT}}；呼叫 skill 不代表新增 agent；按風險選定的自動化範圍依序排程；集中人工驗收另列責任與依賴。
- 分流與理由、受影響畫面／行為：{{UI_CLASSIFICATION_AND_SCOPE}}。
- 既有呈現／固定基準＋本次設計與行為依據：{{PRESENTATION_AND_BEHAVIOR_REFERENCES}}。
- 適用設計確認與未決依賴：{{APPLICABLE_APPROVAL_AND_BLOCKERS}}。
- Prototype 選用與相關決策：{{PROTOTYPE_SELECTION_AND_DECISIONS}}。
- 基準回填範圍或不適用理由：{{BASELINE_BACKFILL_SCOPE}}。

| Checkpoint                | 完成條件／驗證                  | 下一範圍與交接位置                 |
| ------------------------- | ------------------------------- | ---------------------------------- |
| {{SESSION_CHECKPOINT_ID}} | {{SESSION_CHECKPOINT_CRITERIA}} | {{SESSION_NEXT_SCOPE}}；handoff.md |

<!-- 依範圍列出測試 review、後端 feature 組、代表畫面自查及集中人工驗收、其餘前端及最終整合等適用交接點。待確認只產出阻礙與前置關卡，只阻擋依賴未決事項的任務；A／B 缺 ui/ 或不製作 prototype 不算未完成。 -->

- 分波與補驗：預設全批測試對齊後 review；UI 受阻時可明列本波僅獨立 backend 的 feature／DSL／Test Scope 與 review 依賴。前端後補時增量加入其對齊與 review，不宣告全 plan 已就緒。
- 舊 tasks 更新：保留既有 ID／歷史證據及不受影響的 `[X]`；缺適用批准／比對者才重開或新增補驗，阻擋相應最終 gate；新增 ID 不得重複。

## 驗證範圍與責任

- 政策來源與既有契約衝突處理：{{TEST_POLICY_SOURCE_AND_CONFLICTS}}。

| 範圍／案例 | 驗證層與環境／輸入 | 獨有風險或重用依據 | 入口／證據與完成責任 |
| --- | --- | --- | --- |
| {{TEST_SCOPE_OR_CASES}} | {{TEST_LAYER_AND_ENVIRONMENT}} | {{RISK_OR_REUSED_COVERAGE}} | {{TEST_ENTRY_EVIDENCE_AND_OWNER}} |

- 新 support 測試或合併候選只記獨有前置／斷言／替代覆蓋／理由；未新增獨立失敗模式時重用 feature，不逐 DSL 新寫 spec。
- 工程實驗：{{ENGINEERING_COMMANDS_TRIGGERS_AND_GATES}}。
- 集中人工驗收：{{MANUAL_SCOPE_VERSION_PACKAGE_AND_DEPENDENCIES}}；自動通過／待人工／使用者已確認分開記錄。

## Phase 1: Setup

**Goal**: {{SETUP_GOAL}}

- [ ] T{{SETUP_PACKAGE_TASK_ID}} {{SETUP_PACKAGE_TASK_TITLE}}
  - Read:
    - `specs/truth/techstack.md` -> {{SETUP_PACKAGE_TECHSTACK_SECTION}}
  - {{SETUP_PACKAGE_DEPENDENCY_ACTION}}
  - {{SETUP_PACKAGE_CONFIG_ACTION}}

- [ ] T{{SETUP_ENV_TASK_ID}} {{SETUP_ENV_TASK_TITLE}}
  - Read:
    - `specs/truth/techstack.md` -> {{SETUP_ENV_TECHSTACK_SECTION}}
    - `{{SETUP_ENV_APP_PATH}}` -> {{SETUP_ENV_MOUNT_POINT}}
  - {{SETUP_ENV_ENABLE_ACTION}}
  - {{SETUP_ENV_BOUNDARY}}

- [ ] T{{SETUP_SMOKE_TASK_ID}} {{SETUP_SMOKE_TASK_TITLE}}
  - Read:
    - `specs/truth/techstack.md` -> {{SETUP_SMOKE_TECHSTACK_SECTION}}
  - {{SETUP_SMOKE_VERIFY_ACTION}}
  - {{SETUP_SMOKE_BOUNDARY}}

## Phase 2: Foundational

**Goal**: {{FOUNDATIONAL_GOAL}}

- [ ] T{{FOUNDATIONAL_HELPER_TASK_ID}} {{FOUNDATIONAL_HELPER_TASK_TITLE}}
  - Read:
    - `truth-delta.md` -> {{FOUNDATIONAL_HELPER_TRUTH_DELTA_ROWS}}
    - `{{FOUNDATIONAL_HELPER_PATH}}`
  - 只做：{{FOUNDATIONAL_HELPER_DO}}
  - 不做：{{FOUNDATIONAL_HELPER_DONT}}

- [ ] T{{FOUNDATIONAL_CONNECTION_TASK_ID}} {{FOUNDATIONAL_CONNECTION_TASK_TITLE}}
  - Read:
    - `specs/truth/techstack.md` -> {{FOUNDATIONAL_CONNECTION_TECHSTACK_SECTION}}
    - `{{FOUNDATIONAL_CONNECTION_HELPER_PATH}}`
  - 只做：{{FOUNDATIONAL_CONNECTION_DO}}
  - 不做：{{FOUNDATIONAL_CONNECTION_DONT}}

- [ ] T{{FOUNDATIONAL_LANDING_TASK_ID}} {{FOUNDATIONAL_LANDING_TASK_TITLE}}
  - Read:
    - `{{FOUNDATIONAL_LANDING_PATH}}`
  - 只做：{{FOUNDATIONAL_LANDING_DO}}
  - 不做：{{FOUNDATIONAL_LANDING_DONT}}

- [ ] T{{FOUNDATIONAL_FIXTURE_TASK_ID}} {{FOUNDATIONAL_FIXTURE_TASK_TITLE}}
  - Read:
    - `{{FOUNDATIONAL_FIXTURE_DATA_PATH}}` -> {{FOUNDATIONAL_FIXTURE_DATA_SECTION}}
    - `{{FOUNDATIONAL_FIXTURE_HELPER_PATH}}`
  - 只做：{{FOUNDATIONAL_FIXTURE_DO}}
  - 不做：{{FOUNDATIONAL_FIXTURE_DONT}}

## Phase 3: Test Alignment & Implementation

**Goal**: 把本輪 Feature 用到的 DSL 自動化測試對齊最新版 truth；含 truth-delta 有改的句，以及本輪 Feature 用到、尚無 stepdef 的句。不寫產品行為。

**DSL 參照**:

- 每一句只屬於一個權威 `dsl.md`：同模組 `specs/truth/features/{介面}/{模組}/dsl.md`，或介面根 `specs/truth/features/{介面}/dsl.md`。不得掃其他模組。
- 本輪各句都在同模組 `specs/truth/features/{{INTERFACE_KIND}}/{{MODULE}}/dsl.md`。{{PHASE3_ROOT_DSL_STATUS}}
- 讀法：用 task title 的句型對到該檔那一列，以 `StepDef 實作語意` 當作測試程式碼語意。Given / When 讀 `怎麼做`、`權威狀態落地`、`回寫`；Then 讀 `必查`（`呈現結果`、`權威狀態`、`再讀確認`）。
- `truth-delta.md` 只告訴這句是 ADD / MODIFY / DELETE。語意以 `dsl.md` 那一列為準，不得用 feature 措辭或舊 stepdef 自行發明。

**Markers**:

- `[BDD-ALIGN]`：`MODIFY`。既有 stepdef 還在，但語意是舊 truth。依 `dsl.md` 該列改測試，讓它表達最新版 `StepDef 實作語意`。
- `[BDD-REMOVE]`：`DELETE`。此句已不是 truth。移除或改寫仍綁這句的 stepdef / assertion，不得留下保護舊行為的測試。
- `[BDD-RED]`：`ADD`，或本輪 Feature 用到、尚無 stepdef 的句。依 `dsl.md` 該列寫出 stepdef。完成時這句可被跑到，失敗只能是 assertion 或產品行為，不能是 undefined step。
- 三個 marker 都只動測試層，不寫產品碼。

**Shared Must Read**:

- `specs/truth/features/{{INTERFACE_KIND}}/{{MODULE}}/dsl.md`
  -> `{{PHASE3_MODULE_DSL_SENTENCE}}`
{{OPTIONAL_PHASE3_ROOT_DSL_SHARED_MUST_READ}}
- `truth-delta.md` -> `/dsl-refine` 有對應 ADD / MODIFY / DELETE 的句
- `{{PHASE3_EXISTING_STEPDEF_PATH}}`

**Boundary**:

- 一條 DSL 一個 task；每筆引用適當既有驗證或說明新增測試的獨立失敗模式，不等於逐句另寫 support spec。
- 只改該句的 stepdef / assertion / 直接依賴的 helper。
- 不寫產品碼。
- review 交給未參與實作的既有審查者，依共同資源預算安排；本波明列的 Test Scope（未明確分波時為本輪所有 Test Scope）不得再有 undefined step，失敗只能是 assertion 或產品行為。有 issues 就修正再 review；通過只解鎖明列依賴此 review 的 Feature phases。

**Parallel Hint**:

- T{{PHASE3_FIRST_DSL_TASK}}–T{{PHASE3_LAST_DSL_TASK}} 是可平行範圍；low-memory-16gb 逐筆驗證回寫，standard 在有限預算內分波；T{{PHASE3_REVIEW_TASK}} 等全批完成後由既有獨立審查者 review。

- [ ] T{{ALIGN_TASK_ID}} [P] [BDD-ALIGN] `{{ALIGN_DSL_SENTENCE}}`
  - Read: `{{ALIGN_EXISTING_STEPDEF_PATH}}`

- [ ] T{{REMOVE_TASK_ID}} [P] [BDD-REMOVE] `{{REMOVE_DSL_SENTENCE}}`
  - Read: `{{REMOVE_EXISTING_STEPDEF_PATH}}`

- [ ] T{{RED_TASK_ID}} [P] [BDD-RED] `{{RED_DSL_SENTENCE}}`

- [ ] T{{PHASE3_REVIEW_TASK}} subagent review (phase quality gate)

## Phase 4A: ADD Feature File - {{INTERFACE_KIND}}/{{MODULE}}/{{ADDED_FEATURE_FILE_NAME}}.feature

**Goal**: {{ADD_FEATURE_PHASE_GOAL}}

**Shared Must Read**:

- `specs/truth/features/{{INTERFACE_KIND}}/{{MODULE}}/{{ADDED_FEATURE_FILE_NAME}}.feature` -> `Feature: {{ADDED_FEATURE_TITLE}}`
- `specs/truth/features/{{INTERFACE_KIND}}/{{MODULE}}/dsl.md` -> `{{ADDED_DSL_REQUIRED_SECTIONS}}`
- `truth-delta.md` -> `{{ADD_TRUTH_DELTA_ROWS}}`
{{FEATURE_CHASED_ARTIFACTS}}

**受影響畫面與完成證據**（無 UI 則註明不適用）：

- {{AFFECTED_SCREEN_IDS_ROUTES_COMPONENTS}}
- {{CLASSIFIED_PRESENTATION_AND_BEHAVIOR_BINDINGS}}
- {{SCREEN_COMPARISON_COMPLETION_EVIDENCE}}
- {{REPRESENTATIVE_SCREEN_CHECKPOINT_DEPENDENCIES}}

**Boundary**:

- {{ADD_BOUNDARY_RULE}}

**Test Scope**:

- 本 feature 的案例／環境／入口及人工分工：{{FEATURE_VERIFICATION_BINDING}}（回指「驗證範圍與責任」，不自行展開矩陣）。
- `specs/truth/features/{{INTERFACE_KIND}}/{{MODULE}}/{{ADDED_FEATURE_FILE_NAME}}.feature`

- [ ] T{{ADD_GREEN_TASK_ID}} [BDD-GREEN] 讓 Test Scope 全綠
- [ ] T{{ADD_REFACTOR_TASK_ID}} [BDD-REFACTOR] {{ADD_REFACTOR_TASK_TITLE}}

## Phase 4B: MODIFY Feature File - {{INTERFACE_KIND}}/{{MODULE}}/{{MODIFIED_FEATURE_FILE_NAME}}.feature

**Goal**: {{MODIFY_FEATURE_PHASE_GOAL}}

**Shared Must Read**:

- `specs/truth/features/{{INTERFACE_KIND}}/{{MODULE}}/{{MODIFIED_FEATURE_FILE_NAME}}.feature` -> `Feature: {{MODIFIED_FEATURE_TITLE}}`
- `specs/truth/features/{{INTERFACE_KIND}}/{{MODULE}}/dsl.md` -> `{{MODIFIED_DSL_REQUIRED_SECTIONS}}`
- `truth-delta.md` -> `{{MODIFY_TRUTH_DELTA_ROWS}}`
{{FEATURE_CHASED_ARTIFACTS}}

**受影響畫面與完成證據**（無 UI 則註明不適用）：

- {{AFFECTED_SCREEN_IDS_ROUTES_COMPONENTS}}
- {{CLASSIFIED_PRESENTATION_AND_BEHAVIOR_BINDINGS}}
- {{SCREEN_COMPARISON_COMPLETION_EVIDENCE}}
- {{REPRESENTATIVE_SCREEN_CHECKPOINT_DEPENDENCIES}}

**Boundary**:

- {{MODIFY_BOUNDARY_RULE}}

**Test Scope**:

- 本 feature 的案例／環境／入口及人工分工：{{FEATURE_VERIFICATION_BINDING}}（回指「驗證範圍與責任」，不自行展開矩陣）。
- `specs/truth/features/{{INTERFACE_KIND}}/{{MODULE}}/{{MODIFIED_FEATURE_FILE_NAME}}.feature`

- [ ] T{{MODIFY_GREEN_TASK_ID}} [BDD-GREEN] 讓 Test Scope 全綠
- [ ] T{{MODIFY_REFACTOR_TASK_ID}} [BDD-REFACTOR] {{MODIFY_REFACTOR_TASK_TITLE}}

## Phase 4C: DELETE Feature / DSL Truth - {{DELETED_TRUTH_UNIT}}

**Goal**: {{DELETE_PHASE_GOAL}}

**Shared Must Read**:

- `specs/truth/features/{{INTERFACE_KIND}}/{{MODULE}}/{{DELETED_FEATURE_FILE_NAME}}.feature` -> `Feature: {{DELETED_FEATURE_TITLE}}`
- `specs/truth/features/{{INTERFACE_KIND}}/{{MODULE}}/dsl.md` -> `{{DELETE_DSL_SECTIONS}}`
- `truth-delta.md` -> `{{DELETE_TRUTH_DELTA_ROWS}}`
{{FEATURE_CHASED_ARTIFACTS}}

**受影響畫面與完成證據**（無 UI 則註明不適用）：

- {{AFFECTED_SCREEN_IDS_ROUTES_COMPONENTS}}
- {{CLASSIFIED_PRESENTATION_AND_BEHAVIOR_BINDINGS}}
- {{SCREEN_COMPARISON_COMPLETION_EVIDENCE}}
- {{REPRESENTATIVE_SCREEN_CHECKPOINT_DEPENDENCIES}}
- `{{OBSOLETE_PRODUCT_CODE_PATH}}` -> {{OBSOLETE_PRODUCT_BEHAVIOR}}

**Boundary**:

- {{DELETE_BOUNDARY_RULE}}

**Test Scope**:

- 本 feature 的案例／環境／入口及人工分工：{{FEATURE_VERIFICATION_BINDING}}（回指「驗證範圍與責任」，不自行展開矩陣）。
- `specs/truth/features/{{INTERFACE_KIND}}/{{MODULE}}/{{DELETED_FEATURE_FILE_NAME}}.feature`

- [ ] T{{CODE_REMOVE_TASK_ID}} [CODE-REMOVE] {{CODE_REMOVE_TASK_TITLE}}
- [ ] T{{REGRESSION_TASK_ID}} [REGRESSION] 跑 Test Scope，確認新版 truth 成立

## Phase {{MANUAL_ACCEPTANCE_PHASE}}: 集中人工驗收（適用時）

- [ ] T{{MANUAL_ACCEPTANCE_TASK_ID}} [USER-CONFIRM] {{MANUAL_ACCEPTANCE_SCOPE}}
  - 前置：{{MANUAL_READY_DEPENDENCIES}}；確認對象：使用者。
  - 驗收包：{{RETRIEVABLE_PRODUCT_VERSION_ENVIRONMENT_STEPS_EXPECTATIONS_AND_DIFFERENCES}}。
  - 通過條件：{{MANUAL_CONFIRMATION_CRITERIA_AND_EVIDENCE}}。
  - 真正受阻依賴：{{MANUAL_BLOCKED_GATES}}；其他已解鎖獨立工作可續跑。

## Phase 4{{PLAN_SIDE_GATE_LETTER}}: {{PLAN_SIDE_ARTIFACT_FAMILY}} quality gate

**Goal**: 產品對齊本輪回追到的 plan-side 產物。`Test Scope` 全綠不能代替本題。

**Read**:

- {{PLAN_SIDE_GATE_READS}}

**Boundary**:

- 不改 truth、不加 feature、不重跑 GREEN 當通過條件。
- 本輪沒有 plan-side 產物時省略整個 phase。

- [ ] T{{PLAN_SIDE_GATE_TASK_ID}} subagent review ({{PLAN_SIDE_GATE_NAME}} quality gate)
  - Evidence: {{PLAN_SIDE_GATE_EVIDENCE}}；C 類 UI 須核對固定基準／設計／產品版本、代表畫面自查、集中人工驗收的實際確認與逐項差異收斂；僅選用互動附其證據，不以功能綠燈或無溢出代替。

## Phase {{DELIVERY_PHASE}}: 工程交付與確認（依需求選用）

**來源**: `spec.md` -> {{DELIVERY_REQUIREMENT}}
**Dependencies**: {{DELIVERY_DEPENDENCIES}}

- [ ] T{{REFACTOR_TASK_ID}} {{REFACTOR_ACTION}}
  - 既有回歸範圍與入口：{{REGRESSION_SCOPE}}
  - 工程檢查及證據：{{ENGINEERING_EVIDENCE}}
- [ ] T{{CONFIRM_TASK_ID}} [USER-CONFIRM] {{CONFIRM_DELIVERABLE}}
  - 前置：T{{REFACTOR_TASK_ID}}；確認對象：{{CONFIRMER}}；通過條件：{{CONFIRM_CRITERIA}}
- [ ] T{{REMAINING_TASK_ID}} {{REMAINING_ACTION}}
  - Dependencies: T{{CONFIRM_TASK_ID}}

## Phase {{BASELINE_PHASE}}: 驗收後基準回填（有設計內容需回填時）

**來源**: plan.md／ui/ui-plan.md -> {{BASELINE_BACKFILL_REQUIREMENT}}
**Dependencies**: {{PRODUCT_ACCEPTANCE_UI_GATE_AND_REGRESSION_TASKS}}；包含適用的集中人工確認，不以自動化全綠替代。

- [ ] T{{BASELINE_UPDATE_TASK_ID}} 回填本次已驗收的共用基準
  - Read: {{BASELINE_START_AND_LATEST_REFERENCES}}；{{ACCEPTED_PRODUCT_AND_DESIGN_EVIDENCE}}
  - 寫入範圍：{{BASELINE_WRITE_SCOPE}}
  - 更新相關 frame／元件、同版預覽、README 的產品 commit、涵蓋範圍、差異與更新紀錄；比較最新基準並保留其他 plan 成果，同範圍衝突回交。
- [ ] T{{BASELINE_REVIEW_TASK_ID}} subagent review (baseline backfill)
  - Dependencies: T{{BASELINE_UPDATE_TASK_ID}}
  - Read: 本次基準 diff、產品驗收、預覽及 README。
  - 完成證據：{{BASELINE_REVIEW_EVIDENCE}}；由未實作本次回填的審查者核對，通過才可完成 plan。

<!-- 無設計內容需回填時省略本 phase 並記錄理由。產品 UI gate 與回填核對責任不同，不新增第二次產品 UI 家族 gate。 -->
