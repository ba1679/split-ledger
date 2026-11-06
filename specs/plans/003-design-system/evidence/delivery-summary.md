# 003 交付摘要

更新：2026-11-09。本檔為本計畫唯一保留的交付證據摘要，不代表整個計畫已結案。

## 已實作
- 引入 Tailwind Vite 整合、Lucide 與以 shadcn registry 為基礎的 Button/Input。
- 一般按鈕、文字操作與連結按鈕統一 Button API；Input 及套件圖示接入各頁。
- 品牌設計值位於 apps/web/src/design-system.css；頁面與共用樣式拆分至各維護位置，主入口不再載入舊 styles.css。
- Google 登入按鈕改用 outline variant，修正深色 hover 背景與文字對比不足；保留真實瀏覽器對比回歸。
- 無引用 DesignButton 已依使用者指示刪除。
- 元件選用遵循專案共用規範：共用且容易客製化時用 shadcn；商業邏輯或大量客製化時可自製，記錄理由。

## 本次測試與證據精簡
使用者明確同意不維護視覺回歸，只保留有價值的行為測試及本摘要。
- 移除86張PNG、圖片比較 helper、基準設定、專用預覽程式及對照HTML。
- 移除逐輪執行log與審查紀錄；原始測試輸出僅存於忽略的 .cache/，不作版本化證據。
- 13個分散的 step 檔合併成 apps/web/tests/steps/design-system/interface.steps.ts；同步 feature/DSL/truth-delta。
- 保留載入提示、失敗/重試及權威資料不變、桌面/手機鍵盤開啟/關閉表單與焦點還原。
- 將 support 中重複的載入/錯誤/重試與鍵盤案例合併至 feature；support 保留不存在旅行回返、跨寬度可用性、長內容、保存狀態及 Google 登入按鈕對比。
- 移除靜態雛形擷取與純截圖測試。一般畫面品質測試只檢查可見性、操作與水平溢出，不再產生截圖。

## 最新驗證
Node 24.22.2、pnpm 11.25.0：
- pnpm test:web --project=chromium：52 passed (25.9s)，無 undefined steps。
- pnpm test:web-support --project=chromium：14 passed (9.4s)。
- pnpm test:ui-quality --project=chromium：5 passed (9.4s)。
- pnpm typecheck、pnpm lint、pnpm format:check、git diff --check：通過。
- 前端 feature/DSL 拓樸稽核：PASSED。
先前產品變更的建置已通過；本次未更動產品程式碼，只精簡測試、規格及證據。

## 未完成與限制
- WebKit 先前環境啟動停滯，未有本輪通過證據；實際手機及完整輔助工具人工檢查未完成。
- T026–T030 保留原任務狀態，未因本次精簡自動勾選或宣稱全站交付。
- FormDialog、DateField、SearchCombo 保留自製互動：巢狀原生 modal/焦點契約、日期輸入與月份/鍵盤網格、受控搜尋與選取。應依最新用途/客製化成本標準評估，不再一律當作必須換成 shadcn 的暫時例外。
- styles.css 雖已不載入，舊檔及模組內未使用規則的完整清理仍屬 T028，並未在本次順帶執行。
