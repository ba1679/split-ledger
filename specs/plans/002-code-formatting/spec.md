# 維護規格：統一程式碼排版

**建立日期**：2026-11-06

**Plan ID**：`002-code-formatting`

**輸入**：本次對話已確認的三題 A，以及使用者確認分類 API、分類表單示範後指示繼續套用。本文整理已確認需求，作為 `/technical-research` 輸入；不回寫 001 的歷史規劃。

## 目標與範圍

作為維護者，我希望前端、後端、共用程式、測試與設定有一致的排版，並能透過固定指令整理與檢查，方便閱讀驗證、資料處理及回傳等步驟。

- 採用示範檔案已確認的風格：2 格縮排、單引號、分號、100 字元目標行寬；函式與邏輯階段之間使用單一空行，相關宣告集中。
- 使用 Prettier 整理排版；保留 ESLint 基本品質檢查，補上 imports 與主體之間、函式之間、回傳之前的空行規則。
- 將試行擴大至全專案手寫程式、測試與設定，提供 `pnpm lint:fix`、`pnpm format`、`pnpm format:check`。
- 排除歷史 plan、BDD/DSL/API/data truth、skills、Markdown 文件、幣別來源快照、SQL migrations、lockfile 與產生檔的批次排版；README 與 techstack 依本輪決策作必要文字更新。
- 功能、資料模型、API、驗收語意與既有測試策略維持相同；本輪不新增功能故事或行為測試，不擴充 React Hooks 等品質規則。

## 驗收條件

1. 全專案格式與 ESLint 檢查通過，再次執行整理指令不會持續產生差異。
2. 工作區與測試型別檢查、建置、既有單元及前後端回歸測試通過；無法執行的項目需明確記錄原因。
3. 整理前後的 TypeScript/JavaScript 編譯後語法樹，在忽略排版、註解與多餘括號後一致；若有差異，先確認並修正後再交付。
4. `research.md` 保存選型理由，`specs/truth/techstack.md` 保存現行完整堆疊，`truth-delta.md` 記錄本輪 techstack 變更。

## 已確認前提與限制

- 系統為 React webapp、獨立 TypeScript API 與 PostgreSQL；前端以 Playwright Test + playwright-bdd 操作畫面，後端以相同 runner 直接驗 API 與資料庫。沿用已存在的 techstack truth，不需重問。
- 專案不存在 `.agents/constitution/`；依現有 skills 與本次使用者決策執行，不自行建立憲法或新增通用維護流程。
- 詳細技術決策見 [research.md](research.md)；實際驗證證據見 [validation.md](validation.md)。
