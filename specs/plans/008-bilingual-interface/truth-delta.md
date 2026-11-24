# Truth Delta: 008-bilingual-interface

**Plan Package**: `specs/plans/008-bilingual-interface`
**Truth Root**: `specs/truth`

本檔由 `/specify` 初始化。繁中文案調整與英文介面共用一份規格，各自有獨立的使用者故事。

本輪 `/clarify` 確認英文涵蓋旅帳自有 Web 介面全站。沒有手動偏好時，瀏覽器偏好為中文顯示繁中，其餘顯示英文。手動選擇優先，並由同一瀏覽器記住。Spec 將瀏覽器偏好解讀為順位最高的語言。

## /technical-research

| 動作 | Truth 規格 | 改動摘要 | 原因 |
| --- | --- | --- | --- |
| MODIFY | `specs/truth/techstack.md` → 技術狀態導言 | 補上 2026-11-23 的雙語選型及待實作狀態。 | 區分技術採納與產品交付。 |
| MODIFY | `specs/truth/techstack.md` → 前端／裝置偏好 | 補上既有幣別偏好與規劃中的瀏覽器語言偏好。 | 語言從登入前就生效，同一瀏覽器跨登入狀態沿用設定。 |
| MODIFY | `specs/truth/techstack.md` → Phase 1B 分帳技術／安排說明 | 保留既有確定性模板，規劃同快照結構化投影供 Web 翻譯。 | 現有計數與選定安排無法完整表達原付款關係，雙語須保留既有呈現語意。 |
| ADD | `specs/truth/techstack.md` → 雙語介面／Web 訊息與語言偏好 | 採 i18next、react-i18next、Vite 打包資源與瀏覽器首選語言；同步 HTML 語言。 | 讓登入前後採同一選擇規則，切換能保留頁面及操作狀態。 |
| ADD | `specs/truth/techstack.md` → 雙語介面／後端回應與前端呈現、結果待確認 | 規劃前端錯誤碼映射及在呈現層套用語系，基於瀏覽器離線訊號提示，沿用原操作查證。 | 保留帳務精度與資料語意，區分確認失敗、結果未知及可辨識的離線情境。 |
| ADD | `specs/truth/techstack.md` → 測試與驗證／雙語介面驗證 | 新增語系資源與判定、同快照投影與相容測試、瀏覽器高風險案例及集中人工驗收分工；無障礙驗證延後。 | 雙語橫跨登入、帳本與錯誤呈現。使用者指示先延後無障礙驗證。 |
| NOOP | `specs/truth/techstack.md` → 前後端 BDD runner、帳務資料與精確運算、部署模式 | 沿用兩端既有 runner、精確帳務和同源部署。 | 本次變更集中於訊息呈現及既有結算的唯讀資訊。 |

## /api-plan

| 動作 | Truth 規格 | 改動摘要 | 原因 |
| --- | --- | --- | --- |
| ADD | `specs/truth/contracts/components/parameters.yaml` -> `SettlementExplanationInclude` | 新增可選 `include=explanationDetails`，省略時維持既有結算回應。 | 讓雙語 Web 明確取得結構化資訊，既有客戶端的預設回應欄位集合維持一致。 |
| ADD | `specs/truth/contracts/components/schemas/settlement.yaml` -> `SettlementExplanationArrangement`、`SettlementExplanationDetails`、`SettlementViewWithExplanationDetails` | 新增直接付款關係的成員 ID／幣別／精確金額、說明分支及獨立擴充回應 schema。 | 前端在同一帳務快照中翻譯直接關係、無需調整與調整後安排，並保留原文成員名稱。 |
| MODIFY | `specs/truth/contracts/groups/settlement.yaml` -> `GET /api/trips/{tripId}/settlement` | 增加明確 opt-in 的擴充回應及非法 include 的 400，預設仍回原欄位與繁中 `explanation`，owner／生命週期拒絕語意沿用。 | 008 的雙語結算說明需要完整直接關係，且要保護現有消費者。 |
| MODIFY | `specs/truth/contracts/components/schemas/shared.yaml` -> `ApiError.message` 描述 | 說明既有繁中 message 供舊客戶端，雙語 Web 以 code／field／操作情境決定所選語言文案。 | 錯誤碼與既有錯誤回應足以支援本地化，避免新語系直接顯示繁中。 |
| MODIFY | `specs/truth/contracts/components/schemas/settlement.yaml` -> `MemberBalance` 零淨額描述 | 描述零為淨額零；介面須依同幣別是否有涉及該成員的待付款安排決定「已結清」。 | 與使用者確認的繁中文案及多邊抵銷案例一致，不改金額語意。 |
| MODIFY | `specs/truth/contracts/openapi.yaml` -> `info.version/description` 與結算參數、schema 引用 | 文件版更新至 0.5.0，掛載 opt-in 結算參數與擴充回應 schema，標明仍待實作驗收。 | 根契約可追蹤本輪可選回應並保持單一權威入口。 |
| NOOP | `specs/truth/contracts/groups/{settlement,repayments,trips,members,expenses}.yaml` -> 既有寫入、權限及結果查證操作 | 已檢查現有 code／field、owner gate、401／404／409、還款／結清查證及精確帳務回應，本輪不新增錯誤碼或改寫入語意。 | 語言與文案切換由 Web 呈現，原操作結果仍沿原 ID 查證。 |

## /data-plan

| 動作 | Truth 規格 | 改動摘要 | 原因 |
| --- | --- | --- | --- |
| NOOP | `specs/truth/data/data-model.dbml` -> `auth.user`／`auth.session`、旅行／分類／成員名稱及 `expenses.item` | 語言偏好由同源瀏覽器保存。帳本沿用現有名稱與支出項目來源。 | FR-004～007 以現有資料支援偏好與原文保留。使用者確認支出文字沿用既有欄位。 |
| NOOP | `specs/truth/data/data-model.dbml` -> `trips` 結算讀取 Note、`expenses`／`expense_shares`／`trip_members`／`repayments`／`settlement_adjustments` | 已核對既有來源、owner scope、active gate、帳務 revision 與 REPEATABLE READ 唯讀快照。結算說明可直接從現有資料衍生。 | API owner 擴充唯讀投影。既有帳務已提供原付款關係與淨額所需資訊。 |

## /dsl-refine

| 動作 | Truth 規格 | 改動摘要 | 原因 |
| --- | --- | --- | --- |
| ADD | `specs/truth/features/backend/settlement/結算說明可翻譯資料.feature` 及 settlement DSL | 補同快照說明分支、原始關係、舊格式、參數驗證與權限案例。 | 承接 IF-02 的可選擴充 API 契約。 |
| ADD | `specs/truth/features/frontend/design-system/首次語言與全站英文.feature` 及模組 DSL | 補首次語言判定、現有畫面的英文覆蓋，以及英文版保留使用者輸入的原文與精確帳務。原文案例的支出項目對應現有 `item`。 | 承接 IF-01 的 B 類語言行為。依使用者確認，FR-006 沿用現有支出項目。 |
| ADD | `specs/truth/features/frontend/expenses/台灣繁中記帳用詞.feature`、`members/同行者說明精簡.feature` 及各模組 DSL | 補記帳詞彙、同行者說明移除及原有名稱驗證。重名案例安排既有新增表單已開啟，再提交名稱。 | 對應使用者確認的台灣繁中文案，讓重名測試在既有表單驗證。 |
| ADD | `specs/truth/features/frontend/settlement/台灣繁中結算文案.feature`、`repayments/繁中還款結果查證.feature` 及各模組 DSL | 補兩頁零淨額、待付款狀態與還款失敗／查證案例。 | 覆蓋結清語意、離線提示與保留原操作查證。 |
| MODIFY | `specs/truth/features/frontend/design-system/首次語言與全站英文.feature` 及模組 DSL | 增補從花費分析空畫面直接開啟同一趟旅行的新增支出表單。 | 使用者確認以 Add an expense 統一操作文案，按鈕目的地與文案一致。 |
| MODIFY | `specs/truth/features/frontend/dsl.md` -> 成員淨額句型 | 同步更新零淨額的顯示契約。 | 區分已結清與仍有付款安排的淨額為零。 |
| NOOP | `specs/truth/features/backend/dsl.md` -> 介面根共用 DSL | 沿用既有共用句型，新增結算詞彙歸屬 settlement。 | 避免跨模組重複定義。 |
| ADD | `specs/truth/features/frontend/design-system/手動語言切換.feature` | 登入前後切換、偏好持久化、還款待確認期間的原操作保留及表單驗證訊息隨語言更新。 | 承接 FR-005、語言選擇驗收與已確認的 Pencil d1。 |
| ADD | `specs/truth/features/frontend/design-system/dsl.md` → 008 手動語言切換 | 共用選單的入口、單次語言選擇及原畫面與查證的測試語意。 | C 類新增 UI 由真 API 的既有登入與結算 fixture 驗證。 |
