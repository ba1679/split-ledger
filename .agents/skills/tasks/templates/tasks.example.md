# Tasks: 房間聊天規格調整

**Plan Package**: `specs/plans/004-room-chat-adjustment`
**Core Inputs**: `spec.md`, `plan.md`, `research.md`, `truth-delta.md`, `specs/truth/techstack.md`, `specs/truth/contracts/**`, `specs/truth/data/**`, `specs/truth/features/backend/**`, `specs/truth/features/frontend/**`, `ui/**`

## Task Binding Contract

- 產品行為開發任務對應 `truth-delta.md` 的語意；重構、工程交付與確認任務追溯 spec / plan，並引用相關 truth 或 NOOP（若有）。
- Phase 1 `Setup` 只做本輪新增技術的基礎建設、技術環境與最後的 smoke-test；不寫 DSL 語意、不寫產品行為。
- Phase 2 `Foundational` 只建立後續實作程式、測試共用元件、入口、fixture、helper 與落點骨架。
- 無需對齊 DSL 時省略 Phase 3，記錄原因與既有回歸範圍。
- Phase 3 `Test Alignment & Implementation` 的目的：在寫產品碼之前，先把本輪所有受影響 DSL 的自動化測試對齊最新版 truth。
- Truth 參照必須使用 `specs/truth/**` 路徑；plan 參照才使用當前 plan package 內相對路徑。
- Feature `Shared Must Read` 除 feature、同模組 DSL、對應 `truth-delta` 列外，還必須列入回追到的 planner 產物。

## 設計前置、資源模式與 session checkpoints

- 資源契約：low-memory-16gb：主代理實作、一個固定 reviewer；workers=1，瀏覽器逐一執行；呼叫 skill 不代表新增 agent；完整測試矩陣維持，依序排程。
- 設計前置：示例假設 ui/ui-plan.md 記錄 design-v1 已獲開發者明確確認並固定檔案雜湊／原回覆；實際產出時必須查證，不得複製本例當批准。pending 時先回交 ui-plan，依賴它的前端工作不解鎖；已批准則引用原證據，不重複詢問。
- 畫面索引與同步：ui/ui-plan.md 的 room/main、room/error、navigation；prototype p1 對應 design-v1 且 synced（示例前提）。

| Checkpoint      | 完成條件／驗證                  | 下一範圍與交接位置     |
| --------------- | ------------------------------- | ---------------------- |
| 測試層完成 T015 | 全部 DSL 就緒且獨立 review 通過 | T016 green；handoff.md |

<!-- 依範圍列出測試 review、後端 feature 組、代表畫面桌機／手機比對、其餘前端及最終整合等適用交接點。待確認只產出阻礙與前置關卡，不把尚未同步的前端任務交給 implement。 -->

- 後端交接：T021 回歸完成後，下一範圍 T022。
- 第一個代表畫面：T022 完成桌機／手機與相關狀態比對，T023 完成後交接；後續共用版型的畫面必須依賴此比對，若無後續畫面則註明不適用。
- 最終整合：T024 獨立 UI gate，之後依適用交付範圍驗證並交接，不宣稱未跑矩陣已完成。

- 分波與補驗：預設全批測試對齊後 review；UI 受阻時可明列本波僅獨立 backend 的 feature／DSL／Test Scope 與 review 依賴。前端後補時增量加入其對齊與 review，不宣告全 plan 已就緒。
- 舊 tasks 更新：保留既有 ID／歷史證據及不受影響的 `[X]`；缺批准／比對者重開或新增補驗，阻擋相應最終 gate；新增 ID 不得重複。

## Phase 1: Setup

**Goal**: 本輪聊天要新增 websocket。後端用 FastAPI 內建 `WebSocket` 掛端點，測試端用 `websockets` 連線。先把套件與連線配置備好，最後用 smoke-test 確認測得到一條 websocket。不寫聊天 DSL 語意，不寫送訊產品行為。

- [ ] T001 加入 `websockets` 套件與測試用連線設定
  - Read:
    - `specs/truth/techstack.md` -> 後端與測試與驗證
  - 後端測試依賴加入 `websockets`。
  - 測試設定寫清 websocket URL（例如 `ws://127.0.0.1:{port}/ws`），給後續測試讀，不寫送訊語意。

- [ ] T002 對齊後端 FastAPI websocket 技術環境
  - Read:
    - `specs/truth/techstack.md` -> 後端測試入口
    - `backend/` -> FastAPI app 與測試 server 掛載點
  - FastAPI 掛一個 `WebSocket` 端點（例如 `/ws`），讓測試 server 能接受 `websockets` 連線。
  - 只開連線；不實作送訊、清空或拒絕規則。

- [ ] T003 smoke-test 確認 `websockets` 能連上 FastAPI `/ws`
  - Read:
    - `specs/truth/techstack.md` -> 測試與驗證
  - 用 `websockets.connect` 打 T001 的 URL，確認連得上就停。
  - 不跑本輪 Feature，不寫 stepdef 語意。

## Phase 2: Foundational

**Goal**: 只建立後續實作程式、測試共用元件、入口、fixture、helper 與落點骨架，讓後續 Phase 3 不各自重開檔、不各自發明連線方式。語意對齊不放這裡。

- [ ] T004 建立聊天測試共用 helper 入口與骨架
  - Read:
    - `truth-delta.md` -> `/dsl-refine` 的聊天 ADD / MODIFY / DELETE rows
    - `backend/features/steps/shared/chat_helpers.py`
  - 只做：固定 helper 落在 `backend/features/steps/shared/chat_helpers.py`，留出後續 stepdef 會呼叫的函式殼。
  - 不做：不寫各句 StepDef 實作語意，不寫送訊、清空或拒絕規則。

- [ ] T005 建立 websocket 連線 helper
  - Read:
    - `specs/truth/techstack.md` -> 測試與驗證
    - `backend/features/steps/shared/chat_helpers.py`
  - 只做：用 `websockets.connect` 包開線／關線；context 記「玩家名 → 連線」；scenario 結束要關線。
  - 不做：不送聊天內容，不斷言誰看得到什麼。

- [ ] T006 預留房間聊天 stepdef 落點
  - Read:
    - `backend/features/steps/modules/房間聊天/操作與斷言.py`
  - 只做：確認 Phase 3 只寫進這個檔，必要時建空殼。
  - 不做：不寫 ALIGN / REMOVE / RED 語意。

- [ ] T007 建立雙玩家房間測試 fixture 入口
  - Read:
    - `specs/truth/data/**` -> 房間／玩家相關實體
    - `backend/features/steps/shared/chat_helpers.py`
  - 只做：能開兩個玩家的 websocket 連線，並對到同一房間的測試入口。
  - 不做：不寫「單人等待」「送出訊息」或空白拒絕的 DSL。

## Phase 3: Test Alignment & Implementation

**Goal**: 把本輪 Feature 用到的 DSL 自動化測試對齊最新版 truth；含 truth-delta 有改的句，以及本輪 Feature 用到、尚無 stepdef 的句。不寫產品行為。

**DSL 參照**:

- 每一句只屬於一個權威 `dsl.md`：同模組 `specs/truth/features/{介面}/{模組}/dsl.md`，或介面根 `specs/truth/features/{介面}/dsl.md`。不得掃其他模組。
- 本輪各句都在同模組 `specs/truth/features/backend/房間聊天/dsl.md`。本輪沒有介面根 `specs/truth/features/backend/dsl.md` 的句。
- 讀法：用 task title 的句型對到該檔那一列，以 `StepDef 實作語意` 當作測試程式碼語意。Given / When 讀 `怎麼做`、`權威狀態落地`、`回寫`；Then 讀 `必查`（`呈現結果`、`權威狀態`、`再讀確認`）。
- `truth-delta.md` 只告訴這句是 ADD / MODIFY / DELETE。語意以 `dsl.md` 那一列為準，不得用 feature 措辭或舊 stepdef 自行發明。

**Markers**:

- `[BDD-ALIGN]`：`MODIFY`。既有 stepdef 還在，但語意是舊 truth。依 `dsl.md` 該列改測試，讓它表達最新版 `StepDef 實作語意`。
- `[BDD-REMOVE]`：`DELETE`。此句已不是 truth。移除或改寫仍綁這句的 stepdef / assertion，不得留下保護舊行為的測試。
- `[BDD-RED]`：`ADD`，或本輪 Feature 用到、尚無 stepdef 的句。依 `dsl.md` 該列寫出 stepdef。完成時這句可被跑到，失敗只能是 assertion 或產品行為，不能是 undefined step。
- 三個 marker 都只動測試層，不寫產品碼。

**Shared Must Read**:

- `specs/truth/features/backend/房間聊天/dsl.md`
  -> `When: "{玩家}" 送出訊息 "{內容}"`
  -> `Then: "{玩家}" 與 "{玩家}" 都看得到以下聊天內容：`
  -> `Then: 對手仍看得到離房前訊息`
  -> `Given: "{玩家}" 在房間內單人等待`
  -> `When: "{玩家}" 嘗試送出空白訊息`
  -> `Then: 這次聊天送出被拒絕`
  -> `Then: "{玩家}" 看不到先前的聊天訊息`
- `truth-delta.md` -> `/dsl-refine` 有對應 ADD / MODIFY / DELETE 的句
- `backend/features/steps/modules/房間聊天/操作與斷言.py`

**Boundary**:

- 一條 DSL 一個 task。
- 只改該句的 stepdef / assertion / 直接依賴的 helper。
- 不寫產品碼。
- review 交給未參與實作的既有審查者，依共同資源預算安排；本波明列的 Test Scope（未明確分波時為本輪所有 Test Scope）不得再有 undefined step，失敗只能是 assertion 或產品行為。有 issues 就修正再 review；通過只解鎖明列依賴此 review 的 Feature phases。

**Parallel Hint**:

- T008–T014 是可平行範圍；low-memory-16gb 逐筆驗證回寫，standard 依有限預算分波；T015 等全批完成後由既有獨立審查者 review。

- [ ] T008 [P] [BDD-ALIGN] `When: "{玩家}" 送出訊息 "{內容}"`
  - Read: `backend/features/steps/modules/房間聊天/操作與斷言.py`

- [ ] T009 [P] [BDD-ALIGN] `Then: "{玩家}" 與 "{玩家}" 都看得到以下聊天內容：`
  - Read: `backend/features/steps/modules/房間聊天/操作與斷言.py`

- [ ] T010 [P] [BDD-REMOVE] `Then: 對手仍看得到離房前訊息`
  - Read: `backend/features/steps/modules/房間聊天/操作與斷言.py`

- [ ] T011 [P] [BDD-RED] `Given: "{玩家}" 在房間內單人等待`

- [ ] T012 [P] [BDD-RED] `When: "{玩家}" 嘗試送出空白訊息`

- [ ] T013 [P] [BDD-RED] `Then: 這次聊天送出被拒絕`

- [ ] T014 [P] [BDD-RED] `Then: "{玩家}" 看不到先前的聊天訊息`

- [ ] T015 subagent review (phase quality gate)

## Phase 4A: ADD Feature File - backend/房間聊天/單人等待與空白訊息拒絕.feature

**Goal**: 以最小送訊拒絕邏輯讓此 feature file 全綠。

**Shared Must Read**:

- `specs/truth/features/backend/房間聊天/單人等待與空白訊息拒絕.feature` -> `Feature: 單人等待與空白訊息拒絕`
- `specs/truth/features/backend/房間聊天/dsl.md` -> `Given: "{玩家}" 在房間內單人等待`, `When: "{玩家}" 嘗試送出空白訊息`, `Then: 這次聊天送出被拒絕`
- `truth-delta.md` -> `/dsl-refine` ADD 單人等待與空白訊息拒絕
- `specs/truth/contracts/groups/房間聊天.yaml` -> `sendMessage` 空白拒絕

**Boundary**:

- 只處理單人等待與空白拒絕，不處理開局延續或離開清空。

**Test Scope**:

- `specs/truth/features/backend/房間聊天/單人等待與空白訊息拒絕.feature`

- [ ] T016 [BDD-GREEN] 讓 Test Scope 全綠
- [ ] T017 [BDD-REFACTOR] 在綠燈下整理拒絕訊息與測試 helper

## Phase 4B: MODIFY Feature File - backend/房間聊天/雙方在場寫入房間對話.feature

**Goal**: 調整送訊實作與快照投影，讓更新後測試全綠。

**Shared Must Read**:

- `specs/truth/features/backend/房間聊天/雙方在場寫入房間對話.feature` -> `Feature: 雙方在場寫入房間對話`
- `specs/truth/features/backend/房間聊天/dsl.md` -> `When: "{玩家}" 送出訊息 "{內容}"`, `Then: "{玩家}" 與 "{玩家}" 都看得到以下聊天內容：`
- `truth-delta.md` -> `/dsl-refine` MODIFY `When: "{玩家}" 送出訊息 "{內容}"`

**Boundary**:

- 不新增無關聊天場景。

**Test Scope**:

- `specs/truth/features/backend/房間聊天/雙方在場寫入房間對話.feature`

- [ ] T018 [BDD-GREEN] 讓 Test Scope 全綠
- [ ] T019 [BDD-REFACTOR] 在綠燈下整理聊天寫入與再讀確認共用邏輯

## Phase 4C: DELETE Feature / DSL Truth - 離房後仍可看到舊訊息

**Goal**: 移除產品碼中保留離房訊息的過期分支，並確認新版 truth 仍成立。

**Shared Must Read**:

- `specs/truth/features/backend/房間聊天/離開後清空與他房隔離.feature` -> `Feature: 離開後清空與他房隔離`
- `specs/truth/features/backend/房間聊天/dsl.md` -> `Then: "{玩家}" 看不到先前的聊天訊息`
- `truth-delta.md` -> `/dsl-refine` DELETE `Then: 對手仍看得到離房前訊息`
- `backend/app/store.py` -> 可能仍保留離房訊息的產品分支

**Boundary**:

- 只移除離房後保留舊訊息的過期語意，不移除雙方在場時的聊天歷史。

**Test Scope**:

- `specs/truth/features/backend/房間聊天/離開後清空與他房隔離.feature`

- [ ] T020 [CODE-REMOVE] 移除產品碼中保留離房訊息的過期分支
- [ ] T021 [REGRESSION] 跑 Test Scope，確認新版 truth 成立

## Phase 4D: ADD Feature File - frontend/房間對戰/登入與送訊畫面.feature

**Goal**: 以最小產品行為讓此 feature file 全綠。

**Shared Must Read**:

- `specs/truth/features/frontend/房間對戰/登入與送訊畫面.feature` -> `Feature: 登入與送訊畫面`
- `specs/truth/features/frontend/房間對戰/dsl.md` -> 本檔 Given／When／Then 全部列
- `truth-delta.md` -> `/dsl-refine` ADD `frontend/房間對戰/登入與送訊畫面.feature`
- `ui/ui-plan.md` -> 房間對戰畫面的視覺方向、畫面與流程
- `ui/index.html` -> 同步的 room/main、room/error prototype p1
- `ui/room.pen` -> room-desktop、room-mobile、room-error、navigation frames，design-v1
- `ui/design-previews/room-desktop.png`、`ui/design-previews/room-mobile.png`、`ui/design-previews/room-error.png` -> 同資料預覽
- `ui/ui-plan.md` -> 設計批准原回覆／雜湊、資訊位置與共享導航索引

**Boundary**:

- 只讓此 Test Scope 全綠；依 design-v1／prototype p1 完成 room/main、room/error 與 navigation，不能以既有版面覆蓋設計。

**Test Scope**:

- `specs/truth/features/frontend/房間對戰/登入與送訊畫面.feature`

**受影響畫面與完成證據**：

- room/main、room/error、navigation；正式 /rooms/:id 與共享 AppShell。
- 同假資料在 1280px／375px 比對設計／prototype／產品，validation.md 留版本、截圖與「預期／實際／差異／處理」。
- T022 為代表畫面比對 checkpoint；任何後續套用同版型的畫面任務須依賴其通過，重大變更回交開發者確認。

- [ ] T022 [BDD-GREEN] 讓 Test Scope 全綠並完成代表畫面比對
- [ ] T023 [BDD-REFACTOR] 在綠燈下整理此 feature 的產品碼與測試 helper

## Phase 4E: ui quality gate

**Goal**: 產品對齊本輪回追到的 plan-side 產物。`Test Scope` 全綠不能代替本題。

**Read**:

- `ui/ui-plan.md` -> 視覺方向
- `ui/index.html`
- `frontend/src/pages/`

**Boundary**:

- 不改 truth、不加 feature、不重跑 GREEN 當通過條件。

- [ ] T024 subagent review (ui quality gate)
  - Evidence: 獨立核對桌機／手機、主旅程、關鍵狀態與三方版本，逐項差異已修正或有開發者接受依據；不能只寫 PASS。

## Phase 5: 示範遷移與確認（示意：依需求選用）

**來源**: `spec.md` -> 先示範並取得確認，再完成其餘遷移
**Dependencies**: 前置環境與相關測試對齊完成

- [ ] T025 遷移示範表單
  - 既有回歸範圍與入口：執行表單既有 feature。
  - 工程檢查及證據：對照遷移前後畫面，檢查共用設計值與圖示來源。
- [ ] T026 [USER-CONFIRM] 展示示範表單與對照結果
  - 前置：T025；確認對象：使用者；通過條件：使用者明確確認可繼續。
- [ ] T027 遷移其餘介面並檢查無用舊樣式
  - Dependencies: T026
