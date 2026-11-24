# 008 DSL 細化交接

前端 B 類依 `plan.md` 的固定產品 commit 228109265ddc3384853745b1083edb1f94ce3579 與 baseline commit 8fc9f94134c66ffd29918014b950894b1007aa86。入口 C 類以 `ui/ui-plan.md` 已獲使用者確認的 Pencil d1 為依據。

| Feature | 畫面／資訊位置與分流 |
| --- | --- |
| frontend/design-system/首次語言與全站英文.feature | IF-01 B，既有登入、旅行與各功能頁原有位置。首次語言依瀏覽器偏好；切換入口與跨入口操作由下列 C 類 feature 承接。 |
| frontend/design-system/手動語言切換.feature | IF-01 C，d1 的登入、共用框架、原帳本、手機還款待確認。包含偏好持久化與原操作保留。 |
| frontend/expenses/台灣繁中記帳用詞.feature | IF-01 B，ledger/main、支出表單與明細原位置；帳本桌機 K4fUl、手機 j4FlQR。 |
| frontend/members/同行者說明精簡.feature | IF-01 B，旅行同行者頁與既有表單。 |
| frontend/settlement/台灣繁中結算文案.feature | IF-01 B，ledger/main 與結算淨額列、待付款原區塊。 |
| frontend/repayments/繁中還款結果查證.feature | IF-01 B，還款表單既有結果與查證區。 |
| backend/settlement/結算說明可翻譯資料.feature | IF-02 API，承接可選擴充、同快照與舊回應相容。 |

手機 Chromium 主旅程、桌機與 WebKit 風險案例依 research 及測試交付契約安排。桌機完整排版與文案採集中人工驗收。使用者要求延後無障礙驗證。入口位置及操作已由 HTML 原型確認，正式樣式以 Pencil d1 為準。

後端與已列 B 類可交 `/tasks` 或指定 feature 的 `/bdd`。C 類入口及其跨頁／待確認操作已補前端 truth 與 DSL，由增量 Phase 3C、4H 承接。

FR-006 原文案例已依使用者確認採用既有支出項目 `item`，在帳本的既有支出位置核對「晚餐先代墊」，在既有支出／分析位置核對未分類的英文標籤。前端 feature／DSL 拓樸稽核通過，涵蓋 38 份 feature、1,075 個步驟。T031–T034 可接續對齊測試。
