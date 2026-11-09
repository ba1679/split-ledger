# 003 交付摘要

2026-11-09：依使用者確認後調整的驗證範圍完成結案。WebKit、實際手機與完整人工可存取性檢查另行追蹤，未記為通過。本檔是本計畫唯一保留的交付證據摘要。

## 範圍與選型

| 範圍 | 最終實作 |
| --- | --- |
| 登入 | shadcn Button；outline修正Google登入hover對比，保留對比回歸 |
| 旅行清單/帳本 | Button、asChild連結、Lucide；產品卡片與摘要自行組合 |
| 支出/分類 | Button/Input及Lucide；業務表單、保存狀態與權限契約不變 |
| 導覽/狀態 | 共用Button文字操作、Lucide、status/alert與重試 |
| FormDialog/DateField | 正式自製選型：巢狀原生modal、日期解析/月年切換、鍵盤網格、桌面定位及手機布局需要大量核心客製；內部Input與圖示共用 |
| SearchCombo | 正式自製選型：受控搜尋/選取/清空及焦點契約需要大量互動接線；內部Input與Lucide共用 |
| 樣式 | design-system.css為品牌值權威，styles/index.css載入各頁/元件CSS；保留必要布局、日期網格、modal/backdrop與裝飾CSS |

選型依 .agents/constitution/shared.md：共用且容易客製化時採shadcn；商業邏輯或大量客製化可自製，記錄理由，不要求未來一律替換。
維護文件：docs/development/design-system.md，含設計值命名/修改、Button/Input API、圖示使用及驗證入口。

## 驗收對照

對照 spec.md SC-001–SC-004 與 features/acceptance/design-system-migration.feature：

| 驗收 | 對應證據 |
| --- | --- |
| SC-001：先示範確認再擴大 | 先完成旅行清單/新增表單示範、獨立審查；使用者回覆「可以，沒問題」，再確認shadcn修正方向後擴大 |
| SC-002：全站盤點與一致選型 | 上表涵蓋登入、旅行、支出、分類及共用元件；FormDialog/DateField/SearchCombo依2026-11-09確認的用途/客製成本規範採自製 |
| SC-003：保護既有流程與響應式操作 | Chromium前端52、補充14、可用性5通過；涵蓋375/768/1440、鍵盤/焦點、載入/錯誤/重試、保存及隔離資料；未驗證項目依使用者同意另追蹤 |
| SC-004：可找到並修改共用值，影響兩處 | 維護文件可查；實際清單新增按鈕與表單建立按鈕同步變色且還原，見下段 |

共用值驗證：暫時在隔離瀏覽器把 --green 從 #245c49（rgb36,92,73）改為 #123456（rgb18,52,86），
清單「新增旅行」及對話框「建立旅行」兩處同步改變；finally移除覆寫，兩處均回復原值。
1 passed (3.3s)；暫時測試已移除，產品及正式測試檔沒有殘留。

## 清理結果

- 刪除未載入的860行styles.css、模組內無引用的.btn主/次/危險規則、重複.text-btn及原生input樣式。
- 刪除無引用DesignButton、未用Icon check/calendar映射及空目錄佔位；src無手繪SVG/path。
- 依使用者決議移除86張PNG、圖片比對、專用預覽與對照HTML；不維護視覺回歸。
- 13個step檔合併為單一interface.steps.ts，同步feature/DSL；保留狀態/重試/資料不變及桌面/手機鍵盤焦點測試。
- support保留不存在旅行回返、各寬度可用性、長內容、保存狀態及Google登入對比；不再擷取截圖。
- 逐輪紀錄不版本化；原始執行輸出只在忽略的.cache/。

## 最新驗證

Node24.22.2、pnpm11.25.0：
- pnpm test:web --project=chromium：52 passed (22.7s)，無undefined steps。
- pnpm test:web-support --project=chromium：14 passed (8.9s)。
- pnpm test:ui-quality --project=chromium：5 passed (9.7s)。
- pnpm typecheck、pnpm lint、pnpm format:check、production build、git diff --check：通過。
- 前端feature/DSL拓樸稽核：PASSED。
- React Doctor：85/100；only-export-components建議指向既有shadcn buttonVariants匯出，保留標準API，未抑制規則或為工具建議改寫介面。

## 使用者確認與後續追蹤

使用者於2026-11-09對「將未驗證項目列為後續追蹤，以目前已通過範圍結案」明確回覆「同意」。
因此T029依調整後範圍完成，T030完成驗收對照；這不代表以下項目已通過：

| 後續項目 | 現況及完成方式 |
| --- | --- |
| WebKit回歸 | 最小launch仍停滯，已終止診斷；環境修復後跑web、web-support、ui-quality的WebKit專案 |
| 實際手機 | 尚無可操作裝置；在實機檢查登入、旅行、支出、分類及日期/搜尋互動，模擬viewport不能替代 |
| 完整人工可存取性 | 自動化已查名稱/焦點/狀態/對比；仍需實際輔助工具及人工主要流程檢查 |

以上只記於此摘要，不建立自動化追蹤、不新增截圖或逐輪證據檔。
