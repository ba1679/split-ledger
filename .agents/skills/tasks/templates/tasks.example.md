# 任務規劃: 房間聊天規格調整

**Plan package**: `specs/plans/004-room-chat-adjustment`
**核心輸入**: `spec.md`, `plan.md`, `research.md`, `truth-delta.md`, `specs/truth/techstack.md`, `specs/truth/contracts/**`, `specs/truth/data/**`, `specs/truth/features/backend/**`, `specs/truth/features/frontend/**`, 適用的 `ui/**`

## 任務綁定契約

- 產品行為開發任務對應 `truth-delta.md` 的語意；重構、工程交付與確認任務追溯 spec / plan，並引用相關 truth 或 NOOP（若有）。
- Phase 1 `Setup` 只做本輪新增技術的基礎建設、技術環境與最後的 smoke-test；不寫 DSL 語意、不寫產品行為。
- Phase 2 `Foundational` 只建立後續實作程式、測試共用元件、入口、fixture、helper 與落點骨架。
- 無需對齊 DSL 時省略 Phase 3，記錄原因與既有回歸範圍。
- Phase 3 `Test Alignment & Implementation` 按實作波次對齊受影響 DSL；各波對應產品碼開始前，該波測試須對齊最新版 truth 並完成獨立 review。
- Truth 參照必須使用 `specs/truth/**` 路徑；plan 參照才使用當前 plan package 內相對路徑。
- Feature `Shared Must Read` 除 feature、同模組 DSL、對應 `truth-delta` 列外，還必須列入按分流回追到的適用產物或既有呈現／行為依據。

## UI 分流、資源模式與 session checkpoints

- 資源契約：low-memory-16gb：主代理實作、一個固定 reviewer；workers=1，瀏覽器逐一執行；呼叫 skill 不代表新增 agent；完整測試矩陣維持，依序排程。
- 分流與理由、受影響畫面／行為：C，新增 room/main、room/error 與 navigation；下方完整任務以 C 為主。A／B 分支見後述對照。
- 既有呈現／固定基準＋本次設計與行為依據：ui/ui-plan.md 記錄必要現況與 design-v1；業務行為依 feature／DSL。
- 適用設計確認與未決依賴：示例假設 design-v1 已確認並記錄實際雜湊／原回覆；正式產出必須查證，不能複製本例作批准。
- Prototype 選用與相關決策：不製作；設計與操作註記足以交接，無原型版本或同步前置。
- 基準回填範圍或不適用理由：room/main、room/error 與 navigation；相關產品驗收後回填並獨立核對。

| Checkpoint      | 完成條件／驗證                  | 下一範圍與交接位置     |
| --------------- | ------------------------------- | ---------------------- |
| 首波測試層 T030 | 拒絕流程 DSL 就緒且獨立 review 通過 | T016 green；handoff.md |

<!-- 依範圍列出測試 review、後端 feature 組、代表畫面桌機／手機比對、其餘前端及最終整合等適用交接點。待確認只產出阻礙與前置關卡，只阻擋依賴未決事項的任務；A／B 缺 ui/ 或不製作 prototype 不算未完成。 -->

- 後端交接：T021 回歸完成後，下一範圍 T022。
- 第一個代表畫面：T022 完成桌機／手機與相關狀態比對，T023 完成後交接；後續共用版型的畫面必須依賴此比對，若無後續畫面則註明不適用。
- 最終整合：T024 獨立 UI gate；適用完整回歸及其他產品驗收完成後才解鎖 T028，T029 核對回填後交付，不宣稱未跑矩陣已完成。

- 分波與補驗：先讓空白拒絕的正式流程取得回饋，再展開對話與清空及前端；不等待全站 DSL。每波保留精確 Test Scope 與獨立 review，不宣告未執行範圍已完成。
- 舊 tasks 更新：保留既有 ID／歷史證據及不受影響的 `[X]`；缺適用批准／比對者才重開或新增補驗，阻擋相應最終 gate；新增 ID 不得重複。

## 實作波次與依賴

| 實作波次／成果 | 前置 task／共同依賴 | Feature／DSL 範圍與測試層 tasks | Test Scope 與獨立 review | 解鎖的產品 tasks |
| --- | --- | --- | --- | --- |
| 首波：空白拒絕 | T001–T007 | 單人等待與空白訊息拒絕；T011–T013 | 該 feature 全部 Examples；T030 | T016；其 Green 完成才解鎖 T017 |
| 次波：對話與清空 | T017 | 雙方在場寫入、離開清空；T008–T010、T014 | 兩份 feature 全部 Examples；T015 | T018–T021 |
| 前端波：操作與回饋 | T021、有效 design-v1 確認 | 登入與送訊畫面；本例假設全數 DSL 已有同語意 stepdef，引用既有落點 | 前端 feature 全部 Examples；T031 | T022、T023 |

- 首條正式驗證路徑：以「單人等待與空白訊息拒絕」正式測試先驗證資料建態、連線、送出與拒絕斷言；先 focused RED，再完成首波對齊／review／Green，不另加 smoke。既有持久化前置在本例已成立；若未成立，需先排可獨立驗證的產品前置波，不能塞入 T001–T007。
- 共用測試消費者與重驗邊界：chat_helpers.py 為三波共用；後波修改時核對前波消費者並重驗受影響案例。前端若缺少或需調整 DSL 綁定，須逐句新增對齊 tasks 後才能進 T031，不能照抄本例的沿用假設。
- 最終完整回歸與工程／人工驗收依賴：完成所有指定 feature、瀏覽器與專案檢查後才能宣告交付；設計與基準回填仍依下方關卡。

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

**Goal**: 按上述波次把本輪 Feature 用到的 DSL 自動化測試對齊最新版 truth；含 truth-delta 有改的句，以及本輪 Feature 用到、尚無 stepdef 的句。不寫產品行為。

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

- 目標被環境／產品前置遮蔽時保持待驗，依共用測試證據判準引用首次阻塞，不把相同 exit=1 當作有效產品 RED。

### 首波：空白拒絕

**Dependencies**: T001–T007
**Test Scope**: `specs/truth/features/backend/房間聊天/單人等待與空白訊息拒絕.feature`

**Parallel Hint**:

- T011–T013 為本波範圍；low-memory-16gb 逐筆驗證回寫；T030 等本波完成才 review，不等待次波。

- [ ] T011 [P] [BDD-RED] `Given: "{玩家}" 在房間內單人等待`
- [ ] T012 [P] [BDD-RED] `When: "{玩家}" 嘗試送出空白訊息`
- [ ] T013 [P] [BDD-RED] `Then: 這次聊天送出被拒絕`
- [ ] T030 subagent review (首波測試層 quality gate)
  - Dependencies: T011–T013
  - 核對首波正式測試可執行、訊號可歸因、無 undefined step 與未決 issues；通過只解鎖 T016。

### 次波：對話與清空

**Dependencies**: T017；不以章節順序要求本波在首波 Green 前完成
**Test Scope**: `specs/truth/features/backend/房間聊天/雙方在場寫入房間對話.feature`、`specs/truth/features/backend/房間聊天/離開後清空與他房隔離.feature`

**Parallel Hint**:

- T008–T010、T014 為本波範圍；low-memory-16gb 逐筆驗證回寫；T015 等本波全部完成後 review。

- [ ] T008 [P] [BDD-ALIGN] `When: "{玩家}" 送出訊息 "{內容}"`
  - Read: `backend/features/steps/modules/房間聊天/操作與斷言.py`
- [ ] T009 [P] [BDD-ALIGN] `Then: "{玩家}" 與 "{玩家}" 都看得到以下聊天內容：`
  - Read: `backend/features/steps/modules/房間聊天/操作與斷言.py`
- [ ] T010 [P] [BDD-REMOVE] `Then: 對手仍看得到離房前訊息`
  - Read: `backend/features/steps/modules/房間聊天/操作與斷言.py`
- [ ] T014 [P] [BDD-RED] `Then: "{玩家}" 看不到先前的聊天訊息`
- [ ] T015 subagent review (次波測試層 quality gate)
  - Dependencies: T008–T010、T014
  - 核對本波完整 Test Scope 及共用 helper 的首波消費者；通過解鎖 T018、T020。

### 前端波：操作與回饋

**Dependencies**: T021、有效 design-v1 確認
**Test Scope**: `specs/truth/features/frontend/房間對戰/登入與送訊畫面.feature`

- 沿用 `frontend/features/steps/modules/房間對戰/操作與斷言.ts` 的既有同語意 DSL 綁定；正式產出先查證全部 Given／When／Then，缺少則逐句新增對齊 task。這裡示範無新 DSL，仍核對就緒範圍，不虛構對齊項。
- [ ] T031 subagent review (前端測試就緒 quality gate)
  - Dependencies: T021、有效 design-v1 確認
  - 核對上述既有綁定與實際執行證據；前端 Test Scope 無 undefined step，RED 可歸因至新版產品行為，無未決 issues 才解鎖 T022。缺證據或需改測試時回交對齊，不由 reviewer 修自己的受審測試。

## Phase 4A: ADD Feature File - backend/房間聊天/單人等待與空白訊息拒絕.feature

**Goal**: 以最小送訊拒絕邏輯讓此 feature file 全綠。

**Dependencies**: T030；不依賴次波 T015

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
  - Dependencies: T016

## Phase 4B: MODIFY Feature File - backend/房間聊天/雙方在場寫入房間對話.feature

**Goal**: 調整送訊實作與快照投影，讓更新後測試全綠。

**Dependencies**: T015

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
  - Dependencies: T018

## Phase 4C: DELETE Feature / DSL Truth - 離房後仍可看到舊訊息

**Goal**: 移除產品碼中保留離房訊息的過期分支，並確認新版 truth 仍成立。

**Dependencies**: T015、T019

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
  - Dependencies: T020

## Phase 4D: ADD Feature File - frontend/房間對戰/登入與送訊畫面.feature

**Goal**: 以最小產品行為讓此 feature file 全綠。

**Dependencies**: T031

**Shared Must Read**:

- `specs/truth/features/frontend/房間對戰/登入與送訊畫面.feature` -> `Feature: 登入與送訊畫面`
- `specs/truth/features/frontend/房間對戰/dsl.md` -> 本檔 Given／When／Then 全部列
- `truth-delta.md` -> `/dsl-refine` ADD `frontend/房間對戰/登入與送訊畫面.feature`
- `ui/ui-plan.md` -> 房間對戰畫面的視覺方向、畫面與流程
- `ui/room.pen` -> room-desktop、room-mobile、room-error、navigation frames，design-v1
- `ui/design-previews/room-desktop.png`、`ui/design-previews/room-mobile.png`、`ui/design-previews/room-error.png` -> 同資料預覽
- `ui/ui-plan.md` -> 設計批准原回覆／雜湊、資訊位置與共享導航索引

**Boundary**:

- 只讓此 Test Scope 全綠；依 design-v1 與固定現況依據 完成 room/main、room/error 與 navigation，不能以既有版面覆蓋設計。

**Test Scope**:

- `specs/truth/features/frontend/房間對戰/登入與送訊畫面.feature`

**受影響畫面與完成證據**：

- room/main、room/error、navigation；正式 /rooms/:id 與共享 AppShell。
- 同假資料在 1280px／375px 比對固定設計／產品，validation.md 留版本、截圖與「預期／實際／差異／處理」。
- 先在 T022 focused 開發迴圈核對適用的 busy、error、unknown、恢復入口、焦點及固定導航遮擋，再展開完整矩陣；無該狀態時記不適用，不新增需求。
- T022 為代表畫面比對 checkpoint；任何後續套用同版型的畫面任務須依賴其通過，重大變更回交開發者確認。

- [ ] T022 [BDD-GREEN] 讓 Test Scope 全綠並完成代表畫面比對
- [ ] T023 [BDD-REFACTOR] 在綠燈下整理此 feature 的產品碼與測試 helper
  - Dependencies: T022

## Phase 4E: ui quality gate

**Goal**: 產品對齊本輪回追到的 plan-side 產物。`Test Scope` 全綠不能代替本題。

**Read**:

- `ui/ui-plan.md` -> 視覺方向
- `ui/room.pen` 與對應桌機／手機預覽
- `validation.md` -> 固定版本、逐畫面差異及處理證據
- `frontend/src/pages/`

**Boundary**:

- 不改 truth、不加 feature、不重跑 GREEN 當通過條件。

- [ ] T024 subagent review (ui quality gate)
  - Evidence: 獨立核對桌機／手機、主旅程、關鍵狀態與固定基準／設計／產品版本；本例不製作原型，逐項差異已修正或有開發者接受依據；不能只寫 PASS。

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

## Phase 6: 驗收後基準回填（有設計內容需回填時）

**來源**: plan.md／ui/ui-plan.md -> 將已驗收 room/main、room/error 與 navigation 納入現況基準
**Dependencies**: T022、T023、T024、相關產品任務及要求的完整回歸已通過；若 Phase 5 遷移也影響同一畫面，T027 與其驗收亦為前置

- [ ] T028 回填本次已驗收的共用基準
  - Read: ui/ui-plan.md 的固定起點、validation.md 的產品版本與驗收證據、最新基準及其與起點的差異。
  - 寫入範圍：specs/ui-baseline/split-ledger.pen 的 room 與 navigation、相關 previews/、README.md。
  - 更新相關 frame／元件、同版預覽、README 的產品 commit、涵蓋範圍、差異與更新紀錄；比較最新基準並保留其他 plan 成果，同範圍衝突回交。
- [ ] T029 subagent review (baseline backfill)
  - Dependencies: T028
  - Read: 本次基準 diff、產品驗收、預覽及 README。
  - 完成證據：未實作回填的 reviewer 核對上述內容一致，記錄實際版本與發現；通過才可完成 plan。

<!-- 無設計內容需回填時省略本 phase 並記錄理由。產品 UI gate 與回填核對責任不同，不新增第二次產品 UI 家族 gate。 -->

## UI 分流對照（獨立示例，依實際需求採用）

| 分流 | 任務依據與驗證 | 交付／阻擋結果 |
| --- | --- | --- |
| A：純後端索引效能改善 | plan.md 記不適用，沿用既有隔離／行為回歸及效能驗證 | 無 ui/ 仍可完成，無 UI gate／設計回填 |
| B：修正訊息筆數 | plan.md 記 room/main 的既有呈現及新版計數 truth，驗證筆數與必要手機長文字回歸 | 不新增 .pen，不製作 prototype，無設計回填則記不適用 |
| C：本例新增入口 | 已確認 design-v1、代表畫面與逐項差異、一次最終 UI gate | 原型不製作是合法狀態；產品驗收後回填 |
| C：只有拖曳互動待決 | 局部原型只驗證 drag/order，尚 pending | 只阻擋該互動依賴；已明列獨立 A／B 範圍可繼續 |
