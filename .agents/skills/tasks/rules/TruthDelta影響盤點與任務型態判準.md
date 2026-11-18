# Rule 1 - 盤點用於測試對齊與回歸規劃，不得輸出 Impact Audit phase

- Level: `MUST`
- 當 `truth-delta.md` 包含 `MODIFY` 或 `DELETE` 的 feature / DSL row，寫 Phase 3 前必須盤點受影響的 truth feature/dsl、既有 step definitions、fixtures、helpers、focused tests、產品分支與回歸測試面。
- 這份盤點只發生在 `/tasks` 收斂與寫 task 時，用來決定 ALIGN / REMOVE / RED、Foundational 的 `Read`，以及 Feature 的產品碼落點。
- 不得把盤點寫成 `Truth Delta Impact Audit` phase，也不得輸出給 `/implement` 做的 T00x。
- Phase 1 `Setup` 只在本輪有新增技術時建立：寫清套件名、配置、技術環境與最後的 smoke-test；不寫 DSL 語意、不寫產品行為。
- 本輪沒有新增技術就省略 Setup；不得把 helper、fixture 或落點骨架塞進 Setup。
- Phase 2 `Foundational` 只建立後續實作程式、測試共用元件、入口、fixture、helper 與落點骨架；每則必須寫「只做／不做」。
- Setup 與 Foundational 不得偷做 Phase 3 測試層或 Feature Green。

## Good Example

- 這個例子是好的，因為盤點留在寫 task 時，輸出從 Setup 開始，且套件名寫死。

```md
寫 Phase 3 前先盤點既有 `操作與斷言.py`，用來標 `[BDD-ALIGN]`。
`tasks.md` 第一個 phase 是 Setup：

- [ ] T001 加入 `websockets` 套件與測試用連線設定
```

## Bad Example

- 這個例子是壞的，因為把盤點寫成 implement 要做的 phase。

```md
## Phase 1: Truth Delta Impact Audit

- [ ] T001 盤點聊天 MODIFY / DELETE 對既有自動化測試與產品碼的影響
```

# Rule 2 - 測試層按波列於 Phase 3，Feature phase 只留產品碼任務

- Level: `MUST`
- `ADD` 的句，或本輪 Feature 用到、尚無 stepdef 的句：Phase 3 用 `[BDD-RED]`；對應 Feature phase 只留 `[BDD-GREEN] -> [BDD-REFACTOR]`。
- `MODIFY` 的句：Phase 3 用 `[BDD-ALIGN]`；對應 Feature phase 只留 `[BDD-GREEN] -> [BDD-REFACTOR]`。
- `DELETE` 的句：Phase 3 用 `[BDD-REMOVE]`；對應 Feature phase 只留 `[CODE-REMOVE] -> [REGRESSION]`。
- DSL row 僅搬移唯一權威位置且語意不變時仍屬 `MODIFY`；Phase 3 只對齊精確參照與既有測試入口，不得拆成 `[BDD-REMOVE]` 與 `[BDD-RED]`。
- 不得把 `[BDD-RED]`、`[BDD-ALIGN]`、`[BDD-REMOVE]` 寫進 Feature phase。
- 不得把 DELETE 硬塞成新增式 RED，也不得把 MODIFY 當作完全新的 feature file。

## Good Example

- 這個例子是好的，因為測試層在 Phase 3，Feature 只留 Green。

```md
## Phase 3: Test Alignment & Implementation

- [ ] T008 [P] [BDD-ALIGN] `When: "{玩家}" 送出訊息 "{內容}"`

## Phase 4B: MODIFY Feature File - backend/房間聊天/雙方在場寫入房間對話.feature

- [ ] T018 [BDD-GREEN] 讓 Test Scope 全綠
- [ ] T019 [BDD-REFACTOR] 在綠燈下整理聊天寫入與再讀確認共用邏輯
```

## Bad Example

- 這個例子是壞的，因為 ALIGN 仍綁在 Feature phase 裡。

```md
## Phase 4B: MODIFY Feature File - backend/房間聊天/雙方在場寫入房間對話.feature

- [ ] T010 [BDD-ALIGN] 先把既有測試改成新版 DSL 語意
- [ ] T011 [BDD-GREEN] 寫新功能
```

# Rule 3 - Phase 3 必須列出本輪 Feature 用到的全部待處理 DSL

- Level: `MUST`
- 有待處理 DSL 時，Phase 3 清單必須包含 truth-delta 的 `ADD` / `MODIFY` / `DELETE` 句，以及本輪 Feature 用到、尚無 stepdef 的句。
- 一條 DSL 一個 `[P]` task；語意沒變且 stepdef 已在的句不列。
- `[BDD-ALIGN]` 只改既有測試，讓它表達最新版 `StepDef 實作語意`，不寫產品碼。
- `[BDD-REMOVE]` 只移除或改寫仍保護舊 truth 的測試，不寫產品碼。
- `[BDD-RED]` 依 `dsl.md` 該列寫出 stepdef；完成時這句可被跑到，失敗只能是 assertion 或產品行為。
- Phase 3 列全本輪 DSL 不代表必須先執行全批；實際先後依明列波次、review 與 Feature 依賴判斷。

## Good Example

- 這個例子是好的，因為本輪 Feature 用到、但不在 truth-delta 的句也進了 Phase 3。

```md
- [ ] T011 [P] [BDD-RED] `Given: "{玩家}" 在房間內單人等待`
- [ ] T012 [P] [BDD-RED] `When: "{玩家}" 嘗試送出空白訊息`
```

## Bad Example

- 這個例子是壞的，因為只列 truth-delta 改過的句，Green 會卡在沒寫的 Given。

```md
Phase 3 只列 `When: "{玩家}" 嘗試送出空白訊息`。
`單人等待與空白訊息拒絕.feature` 用到的 Given 沒有 stepdef，也沒有 task。
```

# Rule 4 - DELETE 的產品行為留在 Feature phase

- Level: `MUST`
- `[BDD-REMOVE]` 在 Phase 3 完成測試層清理。
- `[CODE-REMOVE]` 在 Feature phase 移除或關閉支援舊 truth 的產品分支、API 投影、資料欄位或 UI 行為。
- `[REGRESSION]` 必須跑該 phase 的 `Test Scope`，證明新版 truth 成立且舊行為沒有被測試繼續保護。

## Good Example

- 這個例子是好的，因為測試與產品行為分開、順序正確。

```md
Phase 3: [BDD-REMOVE] `Then: 對手仍看得到離房前訊息`
Phase 4C: [CODE-REMOVE] 移除產品碼中保留離房訊息的分支
Phase 4C: [REGRESSION] 跑 Test Scope
```

## Bad Example

- 這個例子是壞的，因為只刪產品碼，留下過期測試。

```md
- [ ] T020 [CODE-REMOVE] 移除舊功能
```

# Rule 5 - 依可驗證範圍分波，先取得一條真實流程的回饋

- Level: `MUST`
- 新 tasks 先判斷可獨立驗證的交付範圍；多個範圍依真實依賴分波，單一小功能可只用一波，不為形式新增 phase 或確認關卡。分析 Wave 不自動等於實作波次。
- 各波列 feature／明確 Rule 或 Example 範圍、所有使用的 DSL、共用前置、測試層 task IDs、獨立 review ID、解鎖的 Green／Refactor IDs 及 Test Scope。首波 review 與 Green 不等待無關後波測試；後波依賴已明列的前波成果，不依 task 編號推定全部前序完成。
- 第一波選一條正式驗收測試，讓所需資料／schema、API、fixture、行為斷言與適用 runner／瀏覽器能實際接起來；先 focused RED、該波測試對齊與 review、Green，再擴到相依波次。以既有正式測試取得證據，不新增一套額外 smoke 或人工審批。RED 不要求預先全綠，Green 才完成該波 Test Scope。
- 若目標卡在產品前置，將前置規劃成能獨立取得有效 RED 的早期產品波次；其產品 migration／API 實作不能放 Setup／Foundational，也不能依賴尚被它阻塞的後續 review。前置語意無法由現有 truth 承接時回交 owner。
- 一句 DSL 仍只有一個對齊 task；共用句由最早需要的波次建立，後續明列依賴與消費者。修改共用語意、helper 或 fixture 後重開受影響已完成的測試／review，不把同一路徑換個 wave 名稱就視為獨立。
- UI 首次可呈現時先核對代表性桌機／手機的適用 busy、error、unknown 與恢復入口、焦點及遮擋，再展開共用畫面。此比對併入正式 feature 驗證，不取代最終 UI gate 或完整回歸。
- 舊 plan 未分波時仍服從原關卡；只有 `/tasks` 增量明列新依賴後才能分波，保留既有 ID、歷史證據與有效狀態，不由 `/implement` 臨時縮小 scope。

## Good Example

```md
首波：schema/API 正式驗收的 DSL 對齊 → 獨立 review → 前置產品 Green。
次波：依賴首波，讓結果未知的一條正式流程取得有效 RED → review → Green。
共用 Given 只建立一次；後波引用其 task 與已成立的前置，不重複建置。
前端首個未知畫面先查手機恢復按鈕是否被底部導航擋住，再擴到同類操作。
```

## Bad Example

```md
先完成全站數百句 DSL 與全批 review，才首次嘗試真實 API／fixture。
或 schema 前置 Green 必須等待依賴該 schema 的後波 review，形成循環。
```
