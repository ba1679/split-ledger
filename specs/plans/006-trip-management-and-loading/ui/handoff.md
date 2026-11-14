# 006 UI 交接｜design-v7 已確認

- 狀態：UI 規劃完成；使用者於 2026-11-13 確認 design-v7，範圍為完整38個frame與桌機／手機設計。設計與確認紀錄見 [ui-plan.md](ui-plan.md)。
- 原回覆：「確認 design-v7，我覺得這次不用 prototype 了，截圖的一些驗證也幫我拿掉，我之後會再更新 skill，讓前期規劃以設計稿為主就好」。此明確指示優先於本輪 ui-plan skill 的 prototype／截圖同步步驟；skill 檔案未修改。
- 設計：`split-ledger-006.pen`，SHA-256 `6c33bce25da872057d253a44bd0e59dec1f0e41f974873fb6db0dfe10b6c1abc`；38 frame／38設計PNG，桌機1440×900、手機390×844。
- 功能：管理旅行dropdown；新增旅行選填縮圖；先確認建立旅行再保存圖片，圖片明確失敗保留旅行／預設圖與同trip重新上傳，結果未知先查證、不重建。
- 交付精簡：本輪不製作prototype、不執行瀏覽器截圖比對或額外viewport矩陣；相關驗證腳本／結果、截圖／對照圖與舊驗證報告已移除。設計預覽保留供檢視，舊v6原型僅封存於 `history/design-v6/`，不是最新需求依據。
- 下游：UI關卡已完成，可接續 `/dsl-refine`／`/tasks`；本輪尚未執行下游skill或正式產品實作。功能／響應式／鍵盤／無障礙驗收留待實作，不因本輪交付精簡而刪減。
- 規格：spec／research／5份acceptance保留47模板、121展開案例；沒有未決澄清。API／data truth與產品程式未因本輪變更。
- Git：保留既有truth dirty及未追蹤006；未commit或push。資源維持low-memory-16gb，這次未啟動新瀏覽器或建置，也未委派新代理。

下一步依plan與已確認設計承接下游規劃；不要再把prototype或截圖比對列為006的先決條件。

2026-11-14下游更新：`/dsl-refine`已完成，設計與本文件的原批准保持有效。續跑點改為`/tasks`，詳[../dsl-refine-review.md](../dsl-refine-review.md)及[../handoff.md](../handoff.md)。

2026-11-14 `/tasks` 檔案核對：原索引38份PNG當時不在工作區；已從本文件同hash design-v7用Pen desktop `Export(..., {scale:1})`重新匯出至原 `ui/design-previews/` 路徑，全部PNG header與尺寸1440×900／390×844核對通過。沒有儲存或修改.pen、沒有新設計意圖，原批准有效。匯出為設計預覽恢復，不是產品截圖比對或prototype。見[../tasks.md](../tasks.md)、[../tasks-validation.json](../tasks-validation.json)。
