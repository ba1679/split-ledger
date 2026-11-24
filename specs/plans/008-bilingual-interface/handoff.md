# 008 實作交接

2026-11-24 於 `main`、HEAD `228109265ddc3384853745b1083edb1f94ce3579`。B 類已完成 T069、T072–T083 的實作與整合回歸，T084 等使用者核對 [B 類驗收包](acceptance-evidence.md)。C 類 Pencil d1 已確認並完成實作。使用者確認 T091 的三張實作畫面，T119、T120 已完成 [Pencil 基準回填及獨立核對](../../ui-baseline/language-selector-baseline.md)。進度以 [tasks.md](tasks.md) 為準。

## 已通過的前端前置條件

- T031–T034 使用既有支出項目 `item`，真實 API 記錄「晚餐先代墊」與 100/3 精確份額。
- T067–T068 從真實結算 API 核對三種結算說明與原帳務。T086 的重名案例在 Given 先開既有表單，When 單次提交，共用既有驗證。
- T069 例行重跑採 Chromium 390×844。已驗證 44 案的 PASS 與預期產品差異，獨立審查建議已補到英文語意、彈窗範圍、份額及淨額方向。

## 資源與工作樹

- Standard 模式，18 GiB RAM。Node 24.22.2、pnpm 11.25.0、Playwright 1.64.1。使用單一重型工作及一個測試 worker。聚焦 PostgreSQL 真 API 與 Chromium 的測試結果、命令來源及 log 見 [validation.md](validation.md)。完整回歸與代表性 WebKit 通過。macOS 14 的測試驅動使用暫時相容 preload，詳細環境見驗證紀錄。人工驗收待確認；無障礙驗證依先前指示延後。
- 本輪修改 `apps/web/package.json`、`pnpm-lock.yaml`、`apps/web/src/i18n/types.ts` 和 `apps/web/src/features/settlement/types.ts`，加上雙語套件及型別。作為測試接縫，首屏測試採用 `split-ledger.interface-language` 當瀏覽器儲存鍵，正式首屏初始化已使用同一值。
- 本輪產品改動位於 `apps/api/src/modules/settlement/read.ts`。原結算查詢可選 `include=explanationDetails`，在原唯讀交易中回傳說明分支與精確直接安排。既有 API 測試改動位於 `apps/api/tests/support/splitting/read-settlement-command.ts`、`apps/api/tests/steps/settlement/explanation-details.ts`。Web 測試增加 `apps/web/tests/steps/{design-system/{interface-language,english-screen-copy,english-screen-status},expenses/taiwanese-copy,members/taiwanese-copy,repayments/taiwanese-status,settlement/taiwanese-copy}.ts`、`apps/web/tests/support/browser-languages.ts`、`apps/web/tests/support/splitting/{taiwanese-fixture,repayment-status-008}.ts`，並更新 `apps/web/tests/support/expense-helpers.ts` 和 `apps/web/tests/support/splitting/member-balances-screen-result.ts`。既有未提交內容含 008 計畫、API 合約、技術決策與六份 truth feature／DSL，詳細路徑以 `git status --short` 為準。
- 本輪 API、Vite、Chromium 測試程序均已退出，暫時 runner 設定及控制測試已清理。既有 PostgreSQL 容器及其他測試伺服器由其原工作管理。

## UI 範圍

- [驗收包](acceptance-evidence.md) 的產品來源指紋檔 SHA256 為 `851808b9e148193fbd6750c1adba8f1a60ca99416def4bcb687554ff9ae65450`。T083 的測試紀錄涵蓋新 44 個 Web 案例、61 個 API 案例及既有主要回歸。

- IF-01 B 類以固定產品 `2281092` 與 UI baseline `8fc9f94134c66ffd29918014b950894b1007aa86` 為呈現基準，行為來自本計畫與目前工作樹的 truth。正式畫面的同尺寸比對已完成，集中驗收待確認。
- IF-01 C 類依已確認的 [Pencil d1](ui/ui-plan.md)，加入登入頁、桌機側欄及手機頂列語言選單。以同一瀏覽器偏好保存繁中／英文，包含支出驗證及還款待確認的原狀態保留。使用者對 d1 的回覆記在設計交接。
- 實作版截圖存於工作區 `.cache/008-language/evidence/`。核對範圍為 1440×900、390×844、320×844 的入口、選單及還款待確認；詳細結果見 [驗證紀錄](validation.md)。
