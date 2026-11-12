# 前端 / UI 設計與可操作雛形規劃

## 介面範圍

- 目標系統介面：`{{UI_INTERFACE_NAME}}`
- 需求來源：`{{REQUIREMENT_SCOPE}}`
- 上游依據：`{{UPSTREAM_ARTIFACTS}}`
- 產出順序：UI plan → `.pen` 與預覽 → 開發者明確確認 → prototype 與同步檢查 → 下游。

## 設計交付與開發者確認

- 設計檔與固定版本：`{{DESIGN_PATH_AND_VERSION}}`
- 桌機／手機尺寸及預覽：`{{VIEWPORTS_AND_PREVIEWS}}`
- 確認狀態：`{{DESIGN_APPROVAL_STATUS}}`
- 確認者、日期、原回覆或引用與範圍：`{{DESIGN_APPROVAL_EVIDENCE}}`
- 重大待決事項及受阻下游：`{{BLOCKED_UI_SCOPE}}`

<!-- 狀態使用 pending／changes-requested／approved；沒有回覆時不填造確認證據。只有批准有效後才製作 prototype。 -->

## 畫面交接索引與同步狀態

| 畫面／狀態 ID       | 資訊責任與區塊順序            | .pen frame／預覽／尺寸與資料 | Prototype 路徑／狀態入口  | 正式路由／元件            | Feature／tasks            | 設計／prototype／實作版本與同步狀態 |
| ------------------- | ----------------------------- | ---------------------------- | ------------------------- | ------------------------- | ------------------------- | ----------------------------------- |
| {{SCREEN_STATE_ID}} | {{SCREEN_INFORMATION_LAYOUT}} | {{DESIGN_FRAME_REFERENCE}}   | {{PROTOTYPE_STATE_ENTRY}} | {{PRODUCT_SCREEN_TARGET}} | {{FEATURE_TASK_BINDINGS}} | {{UI_VERSION_SYNC_STATUS}}          |

- 共用元件與響應式規則：`{{SHARED_VISUAL_RESPONSIVE_RULES}}`
- 關鍵狀態覆蓋及可共用／不適用理由：`{{STATE_COVERAGE}}`
- 需要明確確認的設計變更與 AI 可自主適配範圍：`{{DESIGN_CHANGE_BOUNDARY}}`
- 舊產物／未同步項目與處理：`{{STALE_ARTIFACT_DISPOSITION}}`

## 視覺方向

- 風格來源：`{{STYLE_SOURCE}}`
- 本次風格結論：`{{STYLE_CONCLUSION}}`
- 視覺重點：`{{VISUAL_FOCUS}}`
- 審美原則：`{{AESTHETIC_PRINCIPLES}}`

## 畫面與流程

### 1. `{{SCREEN_1_NAME}}`

- 對應雛形檔案：`{{SCREEN_1_FILE}}`
- 主要目的：`{{SCREEN_1_GOAL}}`
- 進入條件：`{{SCREEN_1_ENTRY_CONDITION}}`
- 主要操作：`{{SCREEN_1_PRIMARY_ACTIONS}}`
- 成功流轉：`{{SCREEN_1_SUCCESS_TRANSITIONS}}`
- 失敗回饋：`{{SCREEN_1_ERROR_FEEDBACK}}`

### 2. `{{SCREEN_2_NAME}}`

- 對應雛形檔案：`{{SCREEN_2_FILE}}`
- 主要目的：`{{SCREEN_2_GOAL}}`
- 進入條件：`{{SCREEN_2_ENTRY_CONDITION}}`
- 主要操作：`{{SCREEN_2_PRIMARY_ACTIONS}}`
- 成功流轉：`{{SCREEN_2_SUCCESS_TRANSITIONS}}`
- 失敗回饋：`{{SCREEN_2_ERROR_FEEDBACK}}`

### 3. `{{SCREEN_3_NAME}}`

- 對應雛形檔案：`{{SCREEN_3_FILE}}`
- 主要目的：`{{SCREEN_3_GOAL}}`
- 進入條件：`{{SCREEN_3_ENTRY_CONDITION}}`
- 主要操作：`{{SCREEN_3_PRIMARY_ACTIONS}}`
- 成功流轉：`{{SCREEN_3_SUCCESS_TRANSITIONS}}`
- 失敗回饋：`{{SCREEN_3_ERROR_FEEDBACK}}`

### 4. `{{SCREEN_4_NAME}}`

- 對應雛形檔案：`{{SCREEN_4_FILE}}`
- 主要目的：`{{SCREEN_4_GOAL}}`
- 進入條件：`{{SCREEN_4_ENTRY_CONDITION}}`
- 主要操作：`{{SCREEN_4_PRIMARY_ACTIONS}}`
- 成功流轉：`{{SCREEN_4_SUCCESS_TRANSITIONS}}`
- 失敗回饋：`{{SCREEN_4_ERROR_FEEDBACK}}`

<!--
  依實際畫面數量增減區塊。
  每個畫面都應對回真實產品流程，並先在這份 plan 中定義清楚，後續再落地成對應 HTML 雛形。
-->

## 互動與假資料原則

- 假資料策略：`{{FAKE_DATA_STRATEGY}}`
- 互動原則：`{{INTERACTION_PRINCIPLES}}`
- 內容原則：`{{CONTENT_PRINCIPLES}}`

## 狀態與資訊揭露

- 使用者可見資訊：`{{VISIBLE_INFORMATION}}`
- 必須隱藏資訊：`{{HIDDEN_INFORMATION}}`
- 主要 UI 狀態：`{{UI_STATES}}`
- 角色或權限差異：`{{ROLE_DIFFERENCES}}`

## 驗證與錯誤回饋

- 輸入驗證：`{{INPUT_VALIDATION}}`
- 狀態衝突處理：`{{STATE_CONFLICT_HANDLING}}`
- 使用者可理解錯誤訊息：`{{ERROR_MESSAGE_STRATEGY}}`

## 靜態雛形輸出規劃

- 多頁入口：`{{MULTI_PAGE_ENTRY_STRATEGY}}`
- 預計輸出檔案：`{{PLANNED_HTML_OUTPUTS}}`
- 換頁原則：`{{PAGE_TRANSITION_PRINCIPLES}}`
- Review 目標：`{{REVIEW_GOAL}}`

## 前端實作切分建議

- 頁面 / 容器切分：`{{PAGE_SPLIT_PLAN}}`
- 共用元件或區塊：`{{SHARED_COMPONENTS}}`
- 對後端契約的依賴：`{{API_DEPENDENCIES}}`
- 驗收重點：`{{ACCEPTANCE_FOCUS}}`

## 同步檢查、差異與交接

- 已操作旅程與模擬限制：`{{PROTOTYPE_FLOW_EVIDENCE}}`
- 比對版本、資料、尺寸與證據位置：`{{UI_COMPARISON_EVIDENCE}}`

| 畫面／版本                    | 設計預期               | 實際呈現／截圖             | 差異與影響            | 處理結果／確認依據        |
| ----------------------------- | ---------------------- | -------------------------- | --------------------- | ------------------------- |
| {{COMPARISON_SCREEN_VERSION}} | {{DESIGN_EXPECTATION}} | {{ACTUAL_SCREEN_EVIDENCE}} | {{DIFFERENCE_IMPACT}} | {{DIFFERENCE_RESOLUTION}} |

- 下一 checkpoint 與受阻依賴：`{{NEXT_UI_CHECKPOINT}}`
- 續跑資訊：`handoff.md`，記錄版本、批准、受阻範圍與下一入口。
