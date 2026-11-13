# 系統分析規劃

## 專案結構

### 文件結構（本功能）

```text
specs/plans/{{PLAN_PACKAGE_NAME}}/
├── plan.md
├── {{ARTIFACT_FILE_1}}
├── {{ARTIFACT_FILE_2}}
├── {{ARTIFACT_FILE_3}}
├── contracts/
│   └── {{CONTRACT_FILE_NAME}}
└── tasks.md
```

### 原始碼結構（儲存庫根目錄）

```text
{{SOURCE_ROOT_1}}/
├── {{SOURCE_ROOT_1_DIR_1}}/
│   ├── {{SOURCE_ROOT_1_FILE_1}}
│   ├── {{SOURCE_ROOT_1_DIR_2}}/
│   ├── {{SOURCE_ROOT_1_DIR_3}}/
│   └── {{SOURCE_ROOT_1_DIR_4}}/
├── {{SOURCE_ROOT_1_DIR_5}}/
│   ├── {{SOURCE_ROOT_1_FILE_2}}
│   └── {{SOURCE_ROOT_1_DIR_6}}/
└── {{SOURCE_ROOT_1_DIR_7}}/

{{SOURCE_ROOT_2}}/
├── {{SOURCE_ROOT_2_FILE_1}}
├── {{SOURCE_ROOT_2_DIR_1}}/
│   ├── {{SOURCE_ROOT_2_FILE_2}}
│   ├── {{SOURCE_ROOT_2_DIR_2}}/
│   ├── {{SOURCE_ROOT_2_DIR_3}}/
│   └── {{SOURCE_ROOT_2_DIR_4}}/
└── {{SOURCE_ROOT_2_DIR_5}}/
```

**結構決策**: {{STRUCTURE_DECISION}}

## 分析流程規劃

### 系統介面的盤點

本次需求共盤點出 `{{SYSTEM_INTERFACE_COUNT}}` 個系統介面。

1. `{{SYSTEM_INTERFACE_1_NAME}}`
   - 端點類型：`{{SYSTEM_INTERFACE_1_ENDPOINT_TYPE}}`
   - 主要介面：`{{SYSTEM_INTERFACE_1_PRIMARY_INTERFACE}}`
   - 需求原文依據：`{{SYSTEM_INTERFACE_1_REQUIREMENT_EVIDENCE}}`

2. `{{SYSTEM_INTERFACE_2_NAME}}`
   - 端點類型：`{{SYSTEM_INTERFACE_2_ENDPOINT_TYPE}}`
   - 主要介面：`{{SYSTEM_INTERFACE_2_PRIMARY_INTERFACE}}`
   - 需求原文依據：`{{SYSTEM_INTERFACE_2_REQUIREMENT_EVIDENCE}}`

3. `{{SYSTEM_INTERFACE_3_NAME}}`
   - 端點類型：`{{SYSTEM_INTERFACE_3_ENDPOINT_TYPE}}`
   - 主要介面：`{{SYSTEM_INTERFACE_3_PRIMARY_INTERFACE}}`
   - 需求原文依據：`{{SYSTEM_INTERFACE_3_REQUIREMENT_EVIDENCE}}`

<!--
  依需求實際涉及的技術端點增減條目。
  每個條目都必須能對回需求原文，不可憑空新增未被需求觸及的系統介面。
  若同一個系統介面同時承載多個使用者可感知責任，應在「主要介面」欄位中一起交代清楚。
-->

### UI 影響分流與交接依據

| 範圍／介面 | A／B／C 與理由 | 畫面／狀態 ID、路由／行為 | 固定基準或既有呈現依據 | 本次 spec／truth 行為來源 | 委派／驗證責任與待決依賴 |
| --- | --- | --- | --- | --- | --- |
| {{UI_SCOPE_INTERFACE}} | {{UI_CLASSIFICATION_AND_REASON}} | {{AFFECTED_SCREENS_AND_BEHAVIORS}} | {{FIXED_PRESENTATION_REFERENCES}} | {{BEHAVIOR_AUTHORITY}} | {{UI_DELEGATION_AND_DEPENDENCIES}} |

<!-- A 記不適用理由；B 不強制建立 ui/，仍綁呈現與本次行為依據；C 才委派設計。共用基準引用 repo commit＋路徑＋畫面 ID＋同版預覽；不足範圍記錄現況核對。 -->

### 分析流程的安排

#### Wave 1

- 平行分析介面：
  - `{{WAVE_1_INTERFACE_1}}`
  - `{{WAVE_1_INTERFACE_2}}`
- 分析重點：
  - `{{WAVE_1_ANALYSIS_FOCUS_1}}`
  - `{{WAVE_1_ANALYSIS_FOCUS_2}}`
- 安排理由：`{{WAVE_1_PLANNING_RATIONALE}}`
- 決策依賴、來源與就緒／受阻範圍：{{WAVE_1_DECISION_DEPENDENCIES}}

#### Wave 2

- 平行分析介面：
  - `{{WAVE_2_INTERFACE_1}}`
  - `{{WAVE_2_INTERFACE_2}}`
- 分析重點：
  - `{{WAVE_2_ANALYSIS_FOCUS_1}}`
  - `{{WAVE_2_ANALYSIS_FOCUS_2}}`
- 安排理由：`{{WAVE_2_PLANNING_RATIONALE}}`
- 決策依賴、來源與就緒／受阻範圍：{{WAVE_2_DECISION_DEPENDENCIES}}

<!--
  規劃時必須遵守：
  1. 每一個已盤點的系統介面，至少都要在某一個 Wave 中出現一次。
  2. 同一個 Wave 內，只放可以平行分析的一到多個介面。
  3. 每個 Wave 都必須交代該波段真正要分析的重點，而不是只列介面名稱。
  4. Wave 之間的順序必須反映需求依賴關係；越後面的 Wave，表示越依賴前面波段的分析結果，不可任意分組。
  5. 本區塊只規劃分析順序、分波與每波分析焦點，不在此處展開各介面的實際分析產出。
  6. 前序有待確認項時，只有已明列且無該依賴、自身前置已完成的範圍可繼續；記錄理由，不宣稱整波完成。
  7. 若需求涉及更多端點介面或更長依賴鏈，可延續 `#### Wave N` 骨架往下新增。
-->