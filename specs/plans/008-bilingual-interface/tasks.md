# 任務規劃：繁中文案調整與英文介面

**Plan package** `specs/plans/008-bilingual-interface`

**核心輸入** `spec.md`、`plan.md`、`research.md`、`truth-delta.md`、`dsl-refine-review.md`、`ui/ui-plan.md`、`specs/truth/techstack.md`、`specs/truth/contracts/**`、`specs/truth/data/data-model.dbml` 與下列介面 feature／DSL。

## 分流、資源與交接

- IF-02 結算查詢可獨立進行。IF-03 沿用既有帳務來源與同源瀏覽器儲存，依 `truth-delta.md` 的資料 NOOP 執行。
- IF-01 B 類沿用 `plan.md` 的固定產品 `228109265ddc3384853745b1083edb1f94ce3579` 與基準 `8fc9f94134c66ffd29918014b950894b1007aa86`。未列入共用基準的畫面比照固定產品元件與既有畫面。原位置文案與行為做同尺寸畫面回歸。
- IF-01 C 類為語言切換入口及跨頁／待確認操作。[Pencil d1](ui/ui-plan.md) 已獲使用者確認，直接納入下方增量波次。B 類人工驗收仍依 T084。
- 資源採 standard（規劃環境 RAM 18 GiB），主代理執行、測試層設一名未參與改動的獨立審查者。單一重型命令、workers=1、Chromium 後跑 WebKit。每個 checkpoint 於 `handoff.md` 記錄 HEAD、工作區差異、完成項及下一個可執行項目。命令、版本、測試結果、證據路徑與程序起迄記在 `validation.md`，入口和重型工作前重查資源，工作結束清理本輪程序。

| Checkpoint | 完成條件 | 下一範圍 |
| --- | --- | --- |
| CP1 API 測試對齊 | T085 獨立審查完成，API 目標 feature 無 undefined | T070 結算 API |
| CP2A 後端 | Phase 4A 全綠與舊 API 回歸 | 解鎖 T067–T068 |
| CP2B 前端測試對齊 | T069 獨立審查完成，五份 Web 目標 feature 無 undefined | T072 與後續 B 類 |
| CP3 代表畫面 | Phase 4B 首屏登入與帳本代表畫面在 1440×900、390×844 完成比對 | 繼續既有畫面文案與狀態 |
| CP4 B 類交付 | 所有列入範圍的產品、回歸與人工項有對應證據 | 入口依正式設計及 DSL 前置另行增量 |

## 驗證範圍與責任

- API 使用 Playwright BDD 的 `api` project、真測試 PostgreSQL 與既有 session fixture。Web 主線用 Chromium 390×844，指定 desktop 1440×900 與 WebKit 代表案例另跑。先用 `pnpm exec bddgen -c apps/{api或web}/playwright.config.ts`，再用 `pnpm exec playwright test -c apps/{api或web}/playwright.config.ts '<模組>/<檔名>.feature.spec.js' --project=<api|chromium|webkit> --workers=1`。花括號範例依實際 app 替換，使用 list 核對實際包含的案例。
- 瀏覽器 viewport 由 fixture 設定，避免把預設桌機 project 誤當手機。沿用隔離的真 API、測試資料庫與現有 network barrier。語言自動判定使用明確 locale 與手動值 fixture，歷史繁中文案案例由其 context 明設繁中，保留無偏好案例的真判定。
- Vitest 聚焦首選與有效偏好、兩語資源鍵及插值、錯誤映射與精度，重用具同等證據的既有測試。工程證據包含 build、typecheck 與打包大小差異。B 類人工驗收獨立記錄固定產品版本、手機與桌機文案及排版，無障礙與 VoiceOver 驗證依使用者指示延後。
- 新 DSL 每句重用其目標 feature 的驗證。另加 support spec 須對應 feature 無法覆蓋的獨有失敗模式。

## Phase 1: Setup

- [X] T001 在 `apps/web` 固定與目前 React 相容的 `i18next`、`react-i18next` 及 lockfile，依 `research.md` 決策 1。使用 repo 指定 Node 24.22.2 與 pnpm 11.25.0。
- [X] T002 技術 smoke，依賴 T001。以隔離 harness 確認套件能初始化與渲染最小本地資源，執行 `pnpm --filter @split-ledger/web typecheck` 與 `pnpm --filter @split-ledger/web build`，記錄 build 大小及版本。產品初始化交給 Feature phase。

## Phase 2: Foundational

- [X] T003 準備既有測試架構的共用接縫，依賴 T002。只做：在 `apps/{api,web}/tests/support/fixtures.ts` 與既有 support／world 責任下，準備可重用的 locale、測試帳務快照、單次操作查證及隔離資料設定。不得複製既有 fixture。非本項範圍：新增 DSL 綁定與產品邏輯。
- [X] T004 建立 Web 訊息與結算契約的共用型別／檔案落點，依賴 T002。只做：預留按功能分組的訊息資源及型別接縫，沿用既有 API schema、ExactAmount 及前端 client 型別的責任。非本項範圍：啟動判定、翻譯、UI、HTTP 行為或資料庫遷移。

## Phase 3: Test Alignment & Implementation

**DSL 參照**在每組列出唯一權威檔。以句型查表，依其 StepDef 實作語意建立 Given、單一 When 及 Then 的畫面／權威資料斷言。

**Markers** `[BDD-RED]` 補未綁定新句。 `[BDD-ALIGN]` 更新既有淨額斷言。本輪沒有刪除 DSL。

**Shared Must Read** `truth-delta.md` 的 /dsl-refine、`dsl-refine-review.md`、各組權威 DSL，以及兩端 runner config 與既有 steps/support。綁定盤點使用 repo 的 Node 24.22.2，現有 bddgen 報 12 個後端、51 個前端缺綁定，另有一個既有綁定待修正。

**Boundary** 本 phase 的任務依賴 T003、T004，只處理測試層。RED 必須能在有效 fixture 中執行並以產品差異失敗。Generated suite 應能列出所有目標案例。不得以 undefined step、空 assertion 或缺服務作為 RED。

**Parallel Hint** 各句可隔離處理，共用 fixture 或檔案先序列化。測試依資源設定依序執行。API 與 Web 分別在其波次所有綁定到位後獨立審查。

### `specs/truth/features/backend/settlement/dsl.md`

- [X] T005 [P] [BDD-RED] `owner 查詢可翻譯的結算說明`
- [X] T006 [P] [BDD-RED] `owner 查詢不支援的結算說明選項`
- [X] T007 [P] [BDD-RED] `分帳旅行已有擁有者但查詢者未登入`
- [X] T008 [P] [BDD-RED] `分帳旅行已有擁有者且查詢者是其他帳號`
- [X] T009 [P] [BDD-RED] `擁有者的分帳旅行已在垃圾桶`
- [X] T010 [P] [BDD-RED] `查詢者要求可翻譯的結算說明`
- [X] T011 [P] [BDD-RED] `可翻譯結算查詢被拒絕為 "{錯誤}"`
- [X] T012 [P] [BDD-RED] `結算維持原有欄位及繁中說明`
- [X] T013 [P] [BDD-RED] `結算說明資料的類型為 "{類型}"`
- [X] T014 [P] [BDD-RED] `說明中的原付款關係如下：`
- [X] T015 [P] [BDD-RED] `付款筆數相同但說明資料的類型為 "{類型}"`
- [X] T016 [P] [BDD-RED] `可翻譯說明與結算安排來自同一帳務版本`
- [X] T085 API 測試對齊獨立審查。依賴 T005–T016。審查 `specs/truth/features/backend/settlement/結算說明可翻譯資料.feature` 的 11 案，核對唯一綁定、有效 RED、共用 step 的既有消費者與 Phase 4A Test Scope 執行清單，保存結果與適用複核。通過後解鎖 T070。

### `specs/truth/features/frontend/design-system/dsl.md`

- [X] T017 [P] [BDD-RED] `瀏覽器沒有有效的旅帳手動語言偏好且首選語言為 "{首選}"`
- [X] T018 [P] [BDD-RED] `使用者已登入且瀏覽器首選日文、次選中文，沒有有效手動語言偏好`
- [X] T019 [P] [BDD-RED] `瀏覽器首選 "{首選}" 且已儲存手動選擇的 "{手動語言}"`
- [X] T020 [P] [BDD-RED] `使用者開啟旅帳登入頁`
- [X] T021 [P] [BDD-RED] `使用者直接開啟自己的旅行帳本`
- [X] T022 [P] [BDD-RED] `使用者再次開啟旅帳登入頁`
- [X] T023 [P] [BDD-RED] `旅帳首屏以 "{介面語言}" 呈現`
- [X] T024 [P] [BDD-RED] `旅帳首屏以英文呈現原帳本`
- [X] T025 [P] [BDD-RED] `使用者以英文介面登入且 "{畫面}" 已有可查看的資料`
- [X] T026 [P] [BDD-RED] `使用者開啟 "{畫面}"`
- [X] T027 [P] [BDD-RED] `"{畫面}" 的旅帳自有可見文字以英文呈現`
- [X] T028 [P] [BDD-RED] `使用者以英文介面開啟 "{畫面}" 且目前為 "{狀態}"`
- [X] T029 [P] [BDD-RED] `使用者查看目前畫面`
- [X] T030 [P] [BDD-RED] `旅帳自有的 "{狀態}" 文字與可採取的下一步以英文呈現`
- [X] T031 [P] [BDD-RED] `英文帳本已有中文旅行名稱、成員名稱、分類名稱和支出項目，以及未分類支出、多幣別與循環小數分攤`
- [X] T032 [P] [BDD-RED] `使用者查看原帳本`
- [X] T033 [P] [BDD-RED] `使用者輸入的四種文字維持原文且未分類標籤顯示英文`
- [X] T034 [P] [BDD-RED] `幣別、原始金額、分攤與結算精確結果與權威帳務一致`

### `specs/truth/features/frontend/dsl.md`

- [X] T035 [P] [BDD-ALIGN] `分帳畫面顯示以下成員淨額：`
  - 更新 `apps/web/tests/steps/shared/phase-1b/T110.ts` 所用的 `apps/web/tests/support/splitting/member-balances-screen-result.ts` 及其 support 回歸。以真安排和成員／幣別決定零淨額呈現，並保留精確金額與資料核對。重跑所有引用該句的 settlement、expenses feature。

### `specs/truth/features/frontend/expenses/dsl.md`

- [X] T036 [P] [BDD-RED] `繁中旅行已有小安與小宇的共同晚餐 TWD 600`
- [X] T037 [P] [BDD-RED] `owner 查看旅行帳本`
- [X] T038 [P] [BDD-RED] `owner 查看晚餐支出詳情`
- [X] T039 [P] [BDD-RED] `帳本以「分帳」及「記一筆」標示整體流程與新增支出入口`
- [X] T040 [P] [BDD-RED] `支出明細以「支出金額」與「分攤」標示原額及兩人各 TWD 300`

### `specs/truth/features/frontend/members/dsl.md`

- [X] T041 [P] [BDD-RED] `繁中旅行已經有同行者小宇`
- [X] T042 [P] [BDD-RED] `同行者頁省略兩段常駐說明並保留名稱欄`
- [X] T086 [P] [BDD-RED] `繁中旅行已經有同行者小宇且新增表單已開啟`

### `specs/truth/features/frontend/repayments/dsl.md`

- [X] T043 [P] [BDD-RED] `繁中還款已保存但回覆遺失，原結果暫時無法查證且瀏覽器偵測離線`
- [X] T044 [P] [BDD-RED] `繁中還款已保存但回覆遺失，原結果暫時無法查證且瀏覽器未偵測離線`
- [X] T045 [P] [BDD-RED] `繁中還款結果待確認且原還款可查證`
- [X] T046 [P] [BDD-RED] `原次還款結果查證結束仍未知`
- [X] T047 [P] [BDD-RED] `owner 查看原還款結果`
- [X] T048 [P] [BDD-RED] `畫面提示「儲存結果待確認」及離線後的查看步驟`
- [X] T049 [P] [BDD-RED] `畫面提示「儲存結果待確認」和「查看結果」而無檢查網路提示`
- [X] T050 [P] [BDD-RED] `原還款確認成功且只記錄一次`
- [X] T051 [P] [BDD-RED] `繁中還款草稿將收到明確儲存失敗`
- [X] T052 [P] [BDD-RED] `owner 儲存還款草稿`
- [X] T053 [P] [BDD-RED] `還款畫面說明明確失敗原因及可採取的下一步`

### `specs/truth/features/frontend/settlement/dsl.md`

- [X] T054 [P] [BDD-RED] `繁中旅行的 TWD 成員淨額全為零且無 TWD 付款安排，JPY 仍有待付款`
- [X] T055 [P] [BDD-RED] `繁中旅行關閉簡化付款且小宇應收小安 TWD 100、應付小美 TWD 100`
- [X] T056 [P] [BDD-RED] `繁中旅行的 TWD 沒有付款安排而 JPY 仍有待付款`
- [X] T057 [P] [BDD-RED] `繁中旅行所有幣別都沒有付款安排`
- [X] T058 [P] [BDD-RED] `繁中旅行有小宇應付小安 TWD 300 且已記錄實付 TWD 100`
- [X] T059 [P] [BDD-RED] `owner 查看旅行帳本淨額`
- [X] T060 [P] [BDD-RED] `帳本的 TWD 零淨額成員顯示「已結清」`
- [X] T061 [P] [BDD-RED] `結算的 TWD 零淨額成員顯示「已結清」`
- [X] T062 [P] [BDD-RED] `帳本中小宇的 TWD 淨額顯示「淨額為零」`
- [X] T063 [P] [BDD-RED] `結算中小宇的 TWD 淨額顯示「淨額為零」且兩筆原付款安排仍可見`
- [X] T064 [P] [BDD-RED] `「待付款」區顯示「TWD 無待付款項」和 JPY 待付款明細`
- [X] T065 [P] [BDD-RED] `「待付款」區只顯示一次「目前沒有待付款項。」`
- [X] T066 [P] [BDD-RED] `畫面以「應付金額」及「已付金額」區分 TWD 200 待付與 TWD 100 實付`
- [X] T067 [P] [BDD-RED] `英文旅行的付款模式及安排屬於 "{結果}"`。依賴 T071，使用真實結算 API。
- [X] T068 [P] [BDD-RED] `英文結算說明符合 "{結果}" 且來源帳務不變`。依賴 T067。

- [X] T069 Web 測試對齊獨立審查。依賴 T017–T068、T086。審查者核對 Phase 4B–4G 引用的五份 Web feature 的 step 唯一性、有效 RED、根句型的既有消費者與 Test Scope 執行清單。重跑同行者重名案例及重用句型的既有消費者。保存修正與複核結果，通過後解鎖 B 類產品實作。

## Phase 4A: 結算說明可翻譯資料

**Shared Must Read** `specs/truth/features/backend/settlement/結算說明可翻譯資料.feature`、`specs/truth/features/backend/settlement/dsl.md`、`truth-delta.md` 的對應 /dsl-refine 列、`plan.md` 的 IF-02。`specs/truth/contracts/groups/settlement.yaml`、`specs/truth/contracts/components/schemas/settlement.yaml`、`specs/truth/data/data-model.dbml`。

**受影響畫面與完成證據** 無獨立 UI。

**Boundary** 結算 API 只在 opt-in 回結構化說明。實作同一唯讀快照、三種分類、初始付款關係與既有授權。 範圍依該 feature 及既有畫面。

**Test Scope** 使用「驗證範圍與責任」的 runner，聚焦 `specs/truth/features/backend/settlement/結算說明可翻譯資料.feature`，api project 全部 11 案。回歸由同 runner 執行既有 `settlement/` 與 `account/splitting-data-access-isolation.feature.spec.js`。共用讀取以 `pnpm test:support read-settlement-command.spec.ts` 核對既有無參數查詢。

- [X] T070 [BDD-GREEN] 依賴 T085。使本 phase Test Scope 通過，保存執行清單與結果。
- [X] T071 [BDD-REFACTOR] 依賴 T070。在相同 Test Scope 保持全綠，整理實作接縫並回歸各用例所依賴的既有行為。若無必要重構，記錄判斷及驗證結果。

## Phase 4B: 首次語言與全站英文（首屏）

**Shared Must Read** `specs/truth/features/frontend/design-system/首次語言與全站英文.feature`、同模組 `specs/truth/features/frontend/design-system/dsl.md`、`truth-delta.md` 對應 /dsl-refine 列、`plan.md` IF-01 B 與 `research.md` 決策 1、2。

**受影響畫面與完成證據** 登入及帳本首屏，保存 1440×900、390×844 比對與第一個畫面語系證據。

**Boundary** 建立產品實際使用的初始化、語言判定、有效手動值載入及首屏文案。以既有畫面順序完成首屏。登入後的完整英文畫面與狀態在 Phase 4G 完成。

**Test Scope** 在 `首次語言與全站英文.feature` 中執行「沒有有效手動偏好時只採瀏覽器首選語言」及「同一瀏覽器已儲存的手動偏好優先於瀏覽器語言」兩個 Rule 的完整案例。以 generated test list 核對名稱選取，Chromium 390×844 為主。桌機及 WebKit 跑代表性的預設判定及手動值優先案例。

- [X] T072 [BDD-GREEN] 依賴 T069。使首屏 Test Scope 通過並保存代表畫面比對，解鎖依賴真實語言初始化的 B 類案例。

## Phase 4C: 台灣繁中記帳用詞

**Shared Must Read** `specs/truth/features/frontend/expenses/台灣繁中記帳用詞.feature`、`specs/truth/features/frontend/expenses/dsl.md`、`truth-delta.md` 的對應 /dsl-refine 列、`plan.md` 的 IF-01 B。`specs/truth/features/frontend/dsl.md`、`spec.md` FR-001、`plan.md` 的既有帳本基準。

**受影響畫面與完成證據** 帳本 ledger/main 與支出明細，核對同尺寸文案。

**Boundary** 依台灣繁中規格更新帳本入口及支出明細。 範圍依該 feature 及既有畫面。

**Test Scope** 使用「驗證範圍與責任」的 runner，聚焦 `specs/truth/features/frontend/expenses/台灣繁中記帳用詞.feature`。Chromium 手機跑全部案例，回歸支出修正及份額。支出修正中兩個共用零淨額新文案的案例由 4E 一併回歸。

- [X] T073 [BDD-GREEN] 依賴 T069, T072。使本 phase Test Scope 通過，保存執行清單、結果與適用畫面證據。
- [X] T074 [BDD-REFACTOR] 依賴 T073。在相同 Test Scope 保持全綠，整理實作接縫並回歸各用例所依賴的既有行為。若無必要重構，記錄判斷及驗證結果。

## Phase 4D: 同行者說明精簡

**Shared Must Read** `specs/truth/features/frontend/members/同行者說明精簡.feature`、`specs/truth/features/frontend/members/dsl.md`、`truth-delta.md` 的對應 /dsl-refine 列、`plan.md` 的 IF-01 B。`spec.md` FR-009、`plan.md`、固定產品的 TripMembers。

**受影響畫面與完成證據** 同行者管理及既有名稱表單，核對常駐提示和欄位錯誤位置。

**Boundary** 移除兩段常駐說明，保留欄位及重名驗證。 範圍依該 feature 及既有畫面。

**Test Scope** 使用「驗證範圍與責任」的 runner，聚焦 `specs/truth/features/frontend/members/同行者說明精簡.feature`。Chromium 手機跑全部案例，回歸既有同行者名稱與驗證流程。

- [X] T075 [BDD-GREEN] 依賴 T069, T072。使本 phase Test Scope 通過，保存執行清單、結果與適用畫面證據。
- [X] T076 [BDD-REFACTOR] 依賴 T075。在相同 Test Scope 保持全綠，整理實作接縫並回歸各用例所依賴的既有行為。若無必要重構，記錄判斷及驗證結果。

## Phase 4E: 台灣繁中結算文案

**Shared Must Read** `specs/truth/features/frontend/settlement/台灣繁中結算文案.feature`、`specs/truth/features/frontend/settlement/dsl.md`、`truth-delta.md` 的對應 /dsl-refine 列、`plan.md` 的 IF-01 B／IF-02。`specs/truth/features/frontend/dsl.md`、`specs/truth/contracts/groups/settlement.yaml`、`spec.md` FR-008、`plan.md` 固定帳本基準及既有結算 UI。

**受影響畫面與完成證據** 帳本原淨額列及結算的淨額、待付、說明欄。保存代表案例前後比對。

**Boundary** 更新帳本和結算的兩種零淨額、待付款提示及同快照的本地化說明。 範圍依該 feature 及既有畫面。

**Test Scope** 使用「驗證範圍與責任」的 runner，聚焦 `specs/truth/features/frontend/settlement/台灣繁中結算文案.feature`。Chromium 手機跑全部案例及既有簡化付款和使用共用淨額句型的回歸，含 4C 的支出修正兩個零淨額案例。桌機核對長英文說明。

- [X] T077 [BDD-GREEN] 依賴 T069, T072, T071。使本 phase Test Scope 通過，保存執行清單、結果與適用畫面證據。
- [X] T078 [BDD-REFACTOR] 依賴 T077。在相同 Test Scope 保持全綠，整理實作接縫並回歸各用例所依賴的既有行為。若無必要重構，記錄判斷及驗證結果。

## Phase 4F: 繁中還款結果查證

**Shared Must Read** `specs/truth/features/frontend/repayments/繁中還款結果查證.feature`、`specs/truth/features/frontend/repayments/dsl.md`、`truth-delta.md` 的對應 /dsl-refine 列、`plan.md` 的 IF-01 B。`spec.md` FR-002、`research.md` 決策 3、4，`plan.md` 及既有 IndependentRepayment。

**受影響畫面與完成證據** 還款表單原結果與查證區，核對在線及離線的畫面證據。

**Boundary** 本地化明確失敗與結果待確認提示，同一筆付款結果僅透過既有查證流程。 範圍依該 feature 及既有畫面。

**Test Scope** 使用「驗證範圍與責任」的 runner，聚焦 `specs/truth/features/frontend/repayments/繁中還款結果查證.feature`。Chromium 手機跑全部案例及既有獨立還款回歸。遺失回覆以既有 barrier 建態並核對原記錄只寫一次。

- [X] T079 [BDD-GREEN] 依賴 T069, T072。使本 phase Test Scope 通過，保存執行清單、結果與適用畫面證據。
- [X] T080 [BDD-REFACTOR] 依賴 T079。在相同 Test Scope 保持全綠，整理實作接縫並回歸各用例所依賴的既有行為。若無必要重構，記錄判斷及驗證結果。

## Phase 4G: 首次語言與全站英文

**Shared Must Read** `specs/truth/features/frontend/design-system/首次語言與全站英文.feature`、`specs/truth/features/frontend/design-system/dsl.md`、`truth-delta.md` 的對應 /dsl-refine 列、`plan.md` 的 IF-01 B。`specs/truth/techstack.md`、`research.md` 決策 1、2、4、5。

**受影響畫面與完成證據** 登入、帳本、垃圾桶、成員、分類、分析及表單既有位置。固定基準畫面見 `plan.md`，代表登入與帳本各存桌機、手機截圖，抽查長英文和首屏語言。

**Boundary** 實作 SPA 啟動本地化、載入既有手動值、各既有畫面英文及原文帳務保留。結算說明連接 Phase 4A 結果，各既有畫面的語系行為與結算及還款細節整合驗證。 範圍依該 feature 及既有畫面。

**Test Scope** 使用「驗證範圍與責任」的 runner，聚焦 `specs/truth/features/frontend/design-system/首次語言與全站英文.feature`。Chromium 手機跑所有案例。桌機重跑登入與帳本首屏，WebKit 重跑首次判定、已儲存偏好與含日期欄位的代表畫面。Vitest 補資源及語系邊界。

- [X] T081 [BDD-GREEN] 依賴 T069, T072, T071, T074, T076, T078, T080。使本 phase Test Scope 通過，保存執行清單、結果與適用畫面證據。
- [X] T082 [BDD-REFACTOR] 依賴 T081。在相同 Test Scope 保持全綠，整理實作接縫並回歸各用例所依賴的既有行為。若無必要重構，記錄判斷及驗證結果。

## Phase 5: B 類整合回歸與集中人工驗收

- [X] T083 整合回歸及驗收包。依賴全部 Phase 4 REFACTOR。執行全文六檔、指定既有 API/畫面回歸與相關單元測試，記錄 typecheck、lint、build 和 build 大小差異。驗收包記錄固定版本、入口、操作及預期，附同尺寸畫面比較、差異與結果。分開記錄自動通過與待人工。
- [ ] T084 [USER-CONFIRM] 使用者集中確認可取回版本的 B 類中英文文案與桌機、手機排版。依賴 T083。對照 `spec.md` 及 `plan.md` 的 B 類範圍並記錄使用者確認及待修項。其結果只影響本波 B 類驗收完成狀態。

本波依既有呈現驗收 B 類，未消費已確認的新 UI 設計，故無獨立的 C 類設計家族 quality gate 或基準回填任務。C 類前置與後續範圍見上方交接。

## Phase 3C: IF-01 C 類測試對齊

**Shared Must Read** [設計 d1](ui/ui-plan.md)、本 plan 的 `truth-delta.md`、`specs/truth/features/frontend/design-system/手動語言切換.feature` 與同模組 DSL。

**Boundary** 本波沿用既有真登入、帳本與還款 fixtures。產品改動在 Phase 4H。測試對齊由獨立審查者核對場景、oracle 與唯一歸屬。

**DSL 參照** `specs/truth/features/frontend/design-system/dsl.md` 的「008 手動語言切換」及每列 StepDef 實作語意。
**Markers** `[BDD-RED]` 補相應 Given、When 或 Then。
**Parallel Hint** 共享 stepdef 路徑由單一實作者處理，審查與實作分開。

- [X] T087 [P] [BDD-RED] 使用者從語言選單選擇 "{語言}"。
- [X] T092 [P] [BDD-RED] `首選中文的瀏覽器開啟繁中登入頁`。
- [X] T093 [P] [BDD-RED] `首選中文的瀏覽器已在登入頁手動選英文`。
- [X] T094 [P] [BDD-RED] `首選英文的瀏覽器已登入並開啟英文帳本`。
- [X] T095 [P] [BDD-RED] `首選英文的瀏覽器已在帳本手動選繁中`。
- [X] T096 [P] [BDD-RED] `同一登入頁以英文呈現`。
- [X] T097 [P] [BDD-RED] `使用者透過 Google 登入旅帳`。
- [X] T098 [P] [BDD-RED] `登入後的旅行清單沿用英文`。
- [X] T099 [P] [BDD-RED] `原帳本以繁中呈現且帳務保持一致`。
- [X] T100 [P] [BDD-RED] `使用者重整帳本頁面`。
- [X] T101 [P] [BDD-RED] `原帳本仍使用繁中`。
- [X] T102 [P] [BDD-RED] `使用者登出旅帳`。
- [X] T103 [P] [BDD-RED] `登出後回到繁中登入頁`。
- [X] T104 [P] [BDD-RED] `使用者清除旅帳手動語言偏好後重開登入頁`。
- [X] T105 [P] [BDD-RED] `同一登入頁恢復以繁中呈現`。
- [X] T106 [P] [BDD-RED] `原還款結果待確認且保留草稿`。
- [X] T107 [P] [BDD-RED] `英文查證畫面保留原草稿及還款識別`。
- [X] T108 [P] [BDD-RED] `使用者已從英文登入頁登入且旅行清單為英文`。
- [X] T109 [P] [BDD-RED] `使用者開啟清單上的旅行`。
- [X] T110 [P] [BDD-RED] `帳本沿用登入前所選的英文`。
- [X] T111 [P] [BDD-RED] `使用者從新分頁再次開啟原帳本`。
- [X] T112 [P] [BDD-RED] `使用者已登出並回到手動選擇的繁中登入頁`。
- [X] T113 [P] [BDD-RED] `登入後的旅行清單沿用繁中`。
- [X] T114 [P] [BDD-RED] `原還款待確認畫面已切換英文且可重新查證`。
- [X] T115 [P] [BDD-RED] `使用者查看原還款結果`。
- [X] T116 [P] [BDD-RED] `查證原還款成功且只寫入一次`。
- [X] T117 [P] [BDD-RED] `繁中支出草稿已有名稱且金額驗證未通過`。
- [X] T118 [P] [BDD-RED] `同一支出表單以英文顯示原驗證訊息並保留草稿`。
- [X] T088 審查 T087、T092–T118 的案例、step 綁定、原草稿與帳務 oracle。已拆分額外操作並補齊查證可見性及成功訊息。

## Phase 4H: 手動語言切換入口

**Shared Must Read** Phase 3C 的 truth、DSL、truth-delta，以及 [Pencil d1](ui/ui-plan.md)、`plan.md` IF-01。

**Boundary** 共用語言選單、位置與瀏覽器偏好。API 與資料模型沿用現有契約。

**Test Scope** Chromium 和 WebKit 執行手動語言切換完整 feature。Chromium 加跑既有首屏英文、還款查證、登入／登出回歸。對照 d1 的 1440×900 與 390×844 版面，額外核對 320px 手機窄幅。使用者指定暫緩無障礙驗證。

- [X] T089 [BDD-GREEN] 依賴 T088。登入、共用框架與待確認頁面接上相同的語言偏好，再執行手動切換案例。
- [X] T090 [BDD-REFACTOR] 檢查共用元件及既有行為，保存瀏覽器與同尺寸截圖證據，跑 typecheck、lint、build。
- [X] T091 [USER-CONFIRM] 使用者確認含最新手機登入選單、桌機帳本選單及手機還款待確認三張實作畫面，原回覆「包含」。證據與來源版本見 `validation.md`。
- [X] T119 依賴 T091。已回填 [語言選單基準 v0.4](../../ui-baseline/language-selector-baseline.md)，14 張既有畫面以同一工具重匯前後完全相同。
- [X] T120 依賴 T119。獨立唯讀核對通過，涵蓋實作來源、三張已確認畫面、14 張既有匯出、全部元件引用及畫布／文件索引。
