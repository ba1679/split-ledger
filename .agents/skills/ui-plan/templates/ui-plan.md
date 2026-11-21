# UI 設計與畫面交接

## 介面範圍與模式

- 模式與寫入範圍：{{UI_MODE_AND_WRITE_SCOPE}}
- 目標系統介面與需求來源：{{UI_INTERFACE_AND_REQUIREMENTS}}
- 上游依據與 UI 分流：{{UPSTREAM_AND_UI_CLASSIFICATION}}
- 受影響範圍與待決依賴：{{AFFECTED_AND_BLOCKED_SCOPE}}

## 固定基準與本次差異

- 基準 commit、檔案、畫面／狀態 ID、同版預覽：{{BASELINE_FIXED_REFERENCES}}
- 固定產品版本與現況核對：{{PRODUCT_VERSION_AND_CURRENT_CHECK}}
- 未涵蓋範圍與替代依據：{{BASELINE_GAPS_AND_EVIDENCE}}
- 沿用與改動的設計意圖：{{DESIGN_DELTA}}
- 業務行為 spec／truth 來源：{{BEHAVIOR_AUTHORITY}}

<!-- 無基準時填必要現況核對與涵蓋限制，不強迫先建全產品基準。一般模式只寫 plan-side ui/**；基準模式的適用紀錄可放 README，不強制建立 plan package。 -->

## 設計交付與確認

- 設計檔、版本與 commit／內容雜湊：{{DESIGN_FIXED_VERSION}}
- 桌機／手機尺寸與可見預覽：{{VIEWPORTS_AND_PREVIEWS}}
- 確認狀態：{{DESIGN_APPROVAL_STATUS}}
- 確認者、日期、原回覆／引用及範圍：{{DESIGN_APPROVAL_EVIDENCE}}
- 本次確認、沿用確認與受阻範圍：{{APPROVAL_SCOPE_AND_DEPENDENCIES}}

<!-- 確認狀態為 pending／changes-requested／approved；沒有回覆保留待確認，不填造證據。 -->

## 畫面交接索引

| 畫面／狀態 ID | 資訊責任與區塊順序 | 基準／差異 frame、預覽、尺寸與資料 | 正式路由／元件 | Feature／tasks | 固定版本與比對狀態 |
| --- | --- | --- | --- | --- | --- |
| {{SCREEN_STATE_ID}} | {{SCREEN_INFORMATION_LAYOUT}} | {{SCREEN_DESIGN_REFERENCES}} | {{PRODUCT_SCREEN_TARGET}} | {{FEATURE_TASK_BINDINGS}} | {{SCREEN_VERSION_COMPARISON_STATUS}} |

- 共用元件、跨模組導航及影響：{{SHARED_COMPONENT_IMPACT}}
- 字體／顏色／間距與視覺層級：{{VISUAL_RULES}}
- Responsive 與 accessibility：{{RESPONSIVE_ACCESSIBILITY_RULES}}
- 空白／載入／錯誤／長內容／確認／結果未明的覆蓋及共用／不適用理由：{{STATE_COVERAGE}}
- AI 適配與需重新確認的邊界：{{DESIGN_CHANGE_BOUNDARY}}

## 行為與畫面註記

### {{SCREEN_NAME}}

- 畫面／狀態 ID 與設計 frame：{{SCREEN_NOTE_REFERENCE}}
- 主要目的、進入條件與資訊揭露：{{SCREEN_GOAL_ENTRY_AND_DISCLOSURE}}
- 主要操作、成功流轉與取消語意：{{SCREEN_ACTIONS_AND_TRANSITIONS}}
- 輸入驗證、失敗回饋、狀態衝突與保留內容：{{SCREEN_VALIDATION_AND_ERRORS}}
- 角色／權限差異與隱藏資訊：{{SCREEN_ROLE_AND_PRIVACY_RULES}}

<!-- 依必要畫面增減；重複狀態引用共用規則。流程註記不要求每頁另做 HTML。 -->

## Prototype 選用與問題決策

- 選用方式與理由：{{PROTOTYPE_SELECTION_AND_REASON}}
- 待確認問題與涵蓋互動／畫面 ID：{{PROTOTYPE_QUESTIONS_AND_SCOPE}}
- 決策結果、確認證據與受阻依賴：{{INTERACTION_DECISIONS_AND_DEPENDENCIES}}

<!-- 不製作是合法完成狀態，以下選用欄位省略或明寫不適用，不填 pending。選用時逐互動填寫，不要求完整頁面。 -->

- 選用互動狀態、入口、固定版本與對應設計：{{SELECTED_INTERACTION_STATUS_AND_VERSION}}
- 已操作輸入／回饋、尺寸／資料及證據：{{SELECTED_INTERACTION_EVIDENCE}}
- 模擬限制、工具能力限制與替代方式：{{PROTOTYPE_LIMITATIONS}}

## 實作與驗收交接

- 頁面／元件切分與 API 依賴：{{IMPLEMENTATION_SEAMS_AND_API_DEPENDENCIES}}
- 代表畫面自查、集中人工驗收及後續依賴：{{REPRESENTATIVE_SCREEN_CHECKPOINT}}
- 測試政策及使用者桌機／無障礙驗收包責任：{{TEST_POLICY_AND_MANUAL_ACCEPTANCE_HANDOFF}}
- 同尺寸比對資料、截圖與差異清單位置：{{SCREEN_COMPARISON_PLAN}}
- 基準回填範圍、產品驗收與獨立核對依賴：{{BASELINE_BACKFILL_HANDOFF}}
- 舊版本處理與未完成限制：{{STALE_ARTIFACT_DISPOSITION}}
- 下一入口、已就緒／受阻範圍與續跑紀錄：{{NEXT_SCOPE_AND_HANDOFF}}
