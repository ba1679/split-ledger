# 006 目前交接

- 日期：2026-11-14；分支：`codex/006-trip-management-planning`。
- 規劃快照已於 `d683158` commit；本次精簡另以Git commit保存，未push。產品碼、migration與測試實作尚未開始。
- 狀態：需求、研究、API/data分析、design-v7確認、DSL細化與tasks規劃完成。全部292筆任務待執行，無待重新澄清或設計批准事項。
- 下一步：`/implement`從T001開始，完成T001–T008的Setup/Foundation checkpoint後保存交接。任務順序、逐句測試入口、依賴與38個畫面到任務的對照均見[tasks.md](tasks.md)。

## 權威文件

- 業務/API/data/介面規格：`spec.md`、`research.md`、`truth-delta.md`與`specs/truth/**`。
- 驗收到介面規則、畫面資訊位置：[dsl-refine-review.md](dsl-refine-review.md)。保留47模板對照，Rule直接用feature內tag定位。
- 設計版本、原批准、畫面索引與適配：[ui/ui-plan.md](ui/ui-plan.md)。design-v7 `.pen` SHA-256 `6c33bce25da872057d253a44bd0e59dec1f0e41f974873fb6db0dfe10b6c1abc`；38frame、32份共用PNG。
- 固定現況整合起點仍為`8fc9f94134c66ffd29918014b950894b1007aa86`的`specs/ui-baseline/**`。未改現況基準或design-v7；prototype不製作，規劃期截圖比對省略。

## 執行與驗證關卡

| 範圍      | 完成條件／下一步                                                                        |
| --------- | --------------------------------------------------------------------------------------- |
| T001–T008 | 新套件/環境smoke與共用骨架；不提前產品Green                                             |
| T009–T239 | 230 RED＋1 ALIGN；各句task內有代表feature/Rule入口，產品前序受阻者保留runtime待驗       |
| T240–T241 | 全批binding/測試碼審查只先解鎖正式schema slice；其runtime複核及本scope全Green後才續T242 |
| T257      | 新增後端功能組與完整後端回歸checkpoint                                                  |
| T258–T259 | 管理旅行、U02/U06/S01兩尺寸代表比對後才套用後續共用樣式                                 |
| T283      | 其餘前端功能組完成；共20新增feature＋1受修改DSL影響的既有scope                          |
| T284–T288 | Linux、資源、備份、真機/讀屏與完整自動回歸；T288可獨立於人工T287執行                    |
| T289–T292 | 一次UI家族審查→驗收後基準回填→獨立核對→交付                                             |

規格稽核曾通過：20新增feature／114 Rules／410展開案例，兩端DSL拓樸0警告；審查摘要見dsl-refine-review.md。這些不是已通過的產品測試。API、Chromium/WebKit、兩尺寸、真機、輔助工具、故障競爭、Linux、資源及備份還原矩陣仍待實作階段完成。

## 資源與精簡範圍

沿用`low-memory-16gb`（已觀測16GiB），主代理加最多一位既有審查者；同時重型工作1、worker=1，瀏覽器依序。每次重型工作前量測壓力與受管PID，不以swap單點或代理完成推定OS回收；不關閉使用者程序。目前沒有本輪常駐產品服務或測試runner。

本次把必要RED入口與驗證摘要合併回上述文件，移除3份生成JSON及獨立UI交接、6張共用狀態PNG，刪去可由feature tag取得的重複Rule索引。任務ID/依賴、驗收、truth及.pen保持；後續只在此文件維護目前進度。
