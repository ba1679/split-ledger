# 006 DSL 細化與審查交接

日期：2026-11-14。`/dsl-refine`審查已完成；本文件保存驗收與畫面對照，最新規劃/實作進度統一見 [handoff.md](handoff.md)。

## 輸入與有效設計

承接 spec.md、research.md、plan.md、truth-delta.md、5份 acceptance（47模板／121展開旅程）、techstack、contracts、data及既有前後端feature/DSL。業務規則由spec/truth決定，呈現由已確認設計決定；現有程式只用來定位模組及重用。

UI分類為C：旅行管理、新增選填縮圖、垃圾桶及全站新增可見等待狀態均由design-v7承接。既有帳務金額與日期規則保留；後端交易與私有媒體權限細節不需要新增畫面。固定設計 `ui/split-ledger-006.pen` SHA-256 `6c33bce25da872057d253a44bd0e59dec1f0e41f974873fb6db0dfe10b6c1abc`（本輪已重算一致），38個frame／32個共用PNG，完整索引及frame ID在 [ui/ui-plan.md](ui/ui-plan.md)。確認者為使用者、日期2026-11-13、範圍完整38frame，原回覆：「確認 design-v7，我覺得這次不用 prototype 了，截圖的一些驗證也幫我拿掉，我之後會再更新 skill，讓前期規劃以設計稿為主就好」。

Prototype選用：不製作，已完成決策；不恢復規劃期截圖比對或額外viewport關卡。正式產品功能、響應式、鍵盤、讀屏及圖片上傳驗收仍待實作，設計提案未升為產品現況基準。無新設計意圖或待澄清項目。

## 介面責任與畫面對照

每列都同時包含feature與其模組dsl.md；DSL row到Rule的關係由步驟唯一匹配稽核確保。Rule直接以feature內的既有tag定位；畫面引用design-v7索引與32份共用預覽，原.pen的38個frame保持不變。

| Truth範圍                                                                | 畫面／狀態 ID與資訊位置                                                       | 路由／元件及責任                                                                                                                        |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| frontend/trips/旅行管理與確認.feature                                    | U01、U02、U03、S01、S02、S04，各D/M；旅行名稱日期筆數留卡片，確認含目標與後果 | /trips、/trips/:tripId、/trips/trash；Trips/TripLedger/AppShell；dropdown旁展開、不先開管理dialog，垃圾桶我的旅行次層                   |
| frontend/trips/新增旅行與選填縮圖.feature                                | U06、U07、U08、S10、S05，各D/M；表單預覽、建立結果、同trip重新上傳            | TripForm；先create確認再image，不因圖失敗重建，不在帳本加新資料區                                                                       |
| frontend/trips/縮圖預覽與保存.feature                                    | U04、S03、S09、S05，各D/M；檔名旁相鄰文字工具列、預覽與保存分開               | TripLedger縮圖dialog；照片／預設皆草稿，保存才POST/DELETE，提交後關閉不撤回                                                             |
| frontend/trips/縮圖限制與選圖錯誤.feature                                | U04、U07、S03，各D/M；格式容量說明、錯誤與改選入口                            | 新增選圖及縮圖dialog；單張靜態JPG/PNG/WebP限制、拒絕後可改選                                                                            |
| frontend/trips/旅行結果查證與舊連結.feature                              | S05、S06，各D/M；unknown、衝突與owner可採取下一步                             | /trips/:tripId/*、operation結果；原收據結果/currentState分開，查證耗盡停止busy                                                          |
| frontend/trips/縮圖讀取與帳號清理.feature                                | U01、U02、U03、S07，各D/M；圖片區占位，不遮名稱日期筆數/開帳本                | Trips、TripLedger、AppShell；default fallback、換帳清cache/object URL/舊in-flight，不要求遠端清離線裝置                                 |
| frontend/expenses/旅行生命週期下的刪除查證.feature及既有晚餐刪除Then     | S05、S06、S08，各D/M；原表單/查證區                                           | ExpenseForm/save-outcome；先trip state再active子資源，trash/purge普通404不能推論單筆DELETE成功                                          |
| frontend/design-system/全站初讀與局部等待.feature                        | S04、S08，各D/M；各頁對應內容骨架、身分/選項局部等待                          | /、/trips、trash、帳本總額/支出、支出詳情/編輯、categories、members、settlement、repayment/settlement表單；12初讀、必要選項及paused恢復 |
| frontend/design-system/全站操作忙碌與防重複.feature                      | S03、S08、S10，各D/M；原操作按鈕/區域                                         | 共用Button/QueryState/FormDialog及22種操作；spinner-only、穩定尺寸、名稱保留、請求實際只有一次                                          |
| frontend/design-system/背景更新與分頁等待.feature                        | S04、S08，各D/M；原列表及尾端／局部刷新                                       | TripLedger/QueryState；20+5筆、背景保留內容，不替換初載骨架、不重複追加                                                                 |
| frontend/design-system/操作失敗與未知結果.feature                        | S05、S08，各D/M；原表單草稿/查證出口                                          | ExpenseForm、SettleArrangement及既有付款查證；明確失敗與unknown分開                                                                     |
| frontend/design-system/鍵盤與減少動態效果.feature                        | S01、S02、S08，各D/M；安全初始焦點及原trigger                                 | FormDialog/日期保存；Escape回焦、reduced-motion保留語意、無反覆動畫播報                                                                 |
| backend/trips的7份新增feature及backend/categories/垃圾桶分類引用.feature | A（直接驗證無新增呈現）；對應UI成果由上列C規格承接                            | API/DB權威：生命週期、purge與歷史保護、收據/版本/競爭、全子資源權限、圖片與分類引用；不把SQL限制寫成產品文案                            |

支出摘要與個人總額留帳本；單筆份額留支出詳情，成員淨額／付款安排留分帳畫面。跨裝置資料查核不推定同頁顯示全部帳務。

## 驗證及獨立審查

- 20份新增feature、114個原子Rule／單Act模板、410個展開案例；這是分端規格數，不是新增121個旅程，也不是已執行410個產品測試。
- `uv run .agents/skills/gherkin-and-dsl/scripts/audit_feature_dsl_topology.py --root specs/truth/features/backend`：全介面27 features／5 root rows／249 module rows／682 steps，PASSED，0 warnings。
- 同命令改frontend：全介面28 features／10 root rows／411 module rows／721 steps，PASSED，0 warnings。
- 歷次規格驗證使用Python 3.12.12／gherkin-official 43.0.0 Parser/Compiler：新增20檔語法及案例展開成功。另核對每例恰一When、其後直接Then、無動作型And、無殘留花括號、Outline欄位完整與表格等寬、Example不重複Rule標題。後端與前端的相同字句分屬介面語意，不上提跨介面共用DSL。
- 獨立審查者 `/root/review_006` 使用 `/gherkin-and-dsl`：逐項核對47模板／121旅程結果、DSL可落地性與UI責任；修正enum、錯誤狀態、複雜圖成功要求、第二Act、日期觀察器、資料初態、Outline參數及建立unknown／舊表單／查證耗盡覆蓋。最終無開放阻塞finding。
- 本輪無產品伺服器、migration、BDD runner、瀏覽器或E2E執行；Linux binary/RSS/CPU、真機選圖、備份還原、全產品回歸、正式UI驗收均待tasks安排。未用規格稽核替代產品證據。

## Acceptance逐模板覆蓋

下表編號依每個來源檔的Example／Scenario Outline出現順序；每列的輸入表全部展開值均由對應Rule的Examples、明確DSL fixture契約或同一旅程跨介面拆解承接。前序When轉成可獨立建立的Given，不讓某案例依賴前一案例執行。

| Acceptance來源與模板                                                                                              | 分端Rule tags                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `site-wide-loading-and-operation-feedback.feature` #1：<畫面>的<內容>先顯示等待骨架，再顯示真正內容               | `F006-073`, `F006-074`                                                                                                             |
| `site-wide-loading-and-operation-feedback.feature` #2：第一次讀取垃圾桶成功但沒有資料，才顯示真正空狀態           | `F006-075`                                                                                                                         |
| `site-wide-loading-and-operation-feedback.feature` #3：身分確認與表單選項等待不誤導成未登入、空選項或可立即保存   | `F006-076`, `F006-077`, `F006-111`                                                                                                 |
| `site-wide-loading-and-operation-feedback.feature` #4：<操作>等待結束後只有一個已確認結果                         | `F006-078`, `F006-079`                                                                                                             |
| `site-wide-loading-and-operation-feedback.feature` #5：站內登入操作有進行中回饋且不重複開啟登入流程               | `F006-080`, `F006-081`                                                                                                             |
| `site-wide-loading-and-operation-feedback.feature` #6：查看已載入支出、載入更多，再遇到背景更新失敗               | `F006-082`, `F006-083`, `F006-084`, `F006-085`, `F006-086`                                                                         |
| `site-wide-loading-and-operation-feedback.feature` #7：第一次讀取失敗可重試，保存明確失敗則保留草稿               | `F006-087`, `F006-088`, `F006-089`, `F006-090`                                                                                     |
| `site-wide-loading-and-operation-feedback.feature` #8：實付結果一度未知，停止無出口的等待並查證原結果             | `F006-091`, `F006-092`, `F006-093`                                                                                                 |
| `site-wide-loading-and-operation-feedback.feature` #9：連線暫停或上傳中斷後能了解狀況並恢復操作                   | `F006-094`, `F006-112`, `F006-095`, `F006-113`                                                                                     |
| `site-wide-loading-and-operation-feedback.feature` #10：使用鍵盤取消旅行刪除後在減少動態效果模式完成保存          | `F006-096`, `F006-039`, `F006-097`                                                                                                 |
| `site-wide-loading-and-operation-feedback.feature` #11：<裝置>完成含選圖、記帳及垃圾桶復原的主要旅程              | `F006-052`, `F006-053`, `F006-101`, `F006-071`, `F006-040`, `F006-041`, `F006-078`, `F006-079`                                     |
| `thumbnail-format-and-size-boundaries.feature` #1：從<裝置>選取<格式>並於另一裝置確認保存結果                     | `B006-024`, `F006-098`, `F006-101`                                                                                                 |
| `thumbnail-format-and-size-boundaries.feature` #2：合法邊界圖片可取代原縮圖並跨裝置讀回：<邊界情境>               | `B006-025`, `F006-101`                                                                                                             |
| `thumbnail-format-and-size-boundaries.feature` #3：大小<檔案bytes>與尺寸<寬px>x<高px>超過其中一項限制仍保留原縮圖 | `B006-026`, `F006-099`                                                                                                             |
| `thumbnail-format-and-size-boundaries.feature` #4：<不合法內容>被拒絕後仍能改選合法圖片完成保存                   | `B006-027`, `F006-099`, `F006-100`                                                                                                 |
| `thumbnail-format-and-size-boundaries.feature` #5：一次送入兩張有效照片也不能只保存第一張                         | `B006-028`, `F006-099`, `F006-100`                                                                                                 |
| `thumbnail-format-and-size-boundaries.feature` #6：直拍照片與複雜照片均保存為有界縮圖，不留下原始位置資訊         | `B006-029`                                                                                                                         |
| `trip-state-conflicts-and-access.feature` #1：電腦仍停在舊表單，手機已將旅行移入垃圾桶                            | `B006-014`, `B006-015`, `B006-004`, `F006-067`, `F006-110`, `F006-103`                                                             |
| `trip-state-conflicts-and-access.feature` #2：<操作>在處理途中明確失敗，之後仍能重新完成                          | `B006-012`, `B006-013`, `F006-068`                                                                                                 |
| `trip-state-conflicts-and-access.feature` #3：<先完成操作>先成功時復原旅行保留正確內容                            | `B006-021`, `B006-022`, `B006-004`                                                                                                 |
| `trip-state-conflicts-and-access.feature` #4：圖片尚在處理時旅行先完成<狀態操作>                                  | `B006-023`                                                                                                                         |
| `trip-state-conflicts-and-access.feature` #5：移入結果一度未知，查證成功後復原，再遇到舊移入操作重送              | `B006-017`, `B006-018`, `B006-019`, `F006-062`, `F006-065`, `F006-108`                                                             |
| `trip-state-conflicts-and-access.feature` #6：永久刪除已成功但回應遺失，另一裝置仍嘗試復原與保存                  | `B006-007`, `B006-009`, `B006-010`, `F006-062`, `F006-065`, `F006-067`, `F006-103`                                                 |
| `trip-state-conflicts-and-access.feature` #7：<存取者>不能存取<旅行狀態>的他人旅行或圖片                          | `B006-016`, `B006-031`                                                                                                             |
| `trip-state-conflicts-and-access.feature` #8：登出並換帳號後不沿用前一帳號的縮圖、垃圾桶或草稿                    | `F006-072`, `B006-016`                                                                                                             |
| `trip-thumbnail-lifecycle.feature` #1：在新增表單選照片後取消，再不選圖建立旅行                                   | `F006-054`, `F006-052`                                                                                                             |
| `trip-thumbnail-lifecycle.feature` #2：新增旅行時選擇合法照片並完成建立與縮圖保存                                 | `F006-055`, `F006-053`                                                                                                             |
| `trip-thumbnail-lifecycle.feature` #3：新增成功但圖片保存失敗，保留旅行並重新上傳同趟旅行的圖片                   | `F006-060`, `F006-061`                                                                                                             |
| `trip-thumbnail-lifecycle.feature` #4：旅行建立明確失敗，修正資料後沿用所選照片完成建立                           | `F006-058`, `F006-059`                                                                                                             |
| `trip-thumbnail-lifecycle.feature` #5：新增後圖片結果未知，先查證圖片而不重建旅行                                 | `F006-064`, `F006-065`, `F006-108`                                                                                                 |
| `trip-thumbnail-lifecycle.feature` #6：新增表單拒絕不合法選圖，移除圖片後仍可建立旅行                             | `F006-056`, `F006-057`, `F006-105`, `F006-052`                                                                                     |
| `trip-thumbnail-lifecycle.feature` #7：展開管理選單後取消，再進入縮圖與移入確認                                   | `F006-034`, `F006-035`, `F006-036`, `F006-037`, `F006-039`                                                                         |
| `trip-thumbnail-lifecycle.feature` #8：新旅行先用預設縮圖，再從手機保存照片、跨裝置更換並恢復預設                 | `F006-052`, `F006-045`, `F006-049`, `F006-101`, `B006-030`, `B006-031`                                                             |
| `trip-thumbnail-lifecycle.feature` #9：選圖後取消，再取消檔案選擇，原縮圖保持                                     | `F006-046`, `F006-048`                                                                                                             |
| `trip-thumbnail-lifecycle.feature` #10：預覽預設圖後以<關閉方式>放棄編輯，重新開啟仍為已保存照片                  | `F006-045`, `F006-046`, `F006-047`, `B006-031`                                                                                     |
| `trip-thumbnail-lifecycle.feature` #11：預設圖與照片來回切換，取消選檔後最後只保存所選照片                        | `F006-048`, `F006-045`, `F006-049`                                                                                                 |
| `trip-thumbnail-lifecycle.feature` #12：預覽<目標縮圖>後保存失敗，保留草稿並可重試                                | `F006-050`, `F006-051`                                                                                                             |
| `trip-thumbnail-lifecycle.feature` #13：保存預設圖已成功但回應遺失，關閉編輯不撤銷且先查證原次保存                | `F006-063`, `F006-066`, `F006-109`, `F006-065`, `F006-108`                                                                         |
| `trip-thumbnail-lifecycle.feature` #14：神社已保存但回應遺失，稍後的新縮圖不被舊保存操作覆蓋                      | `F006-063`, `F006-065`, `F006-102`, `B006-017`, `B006-018`, `B006-020`                                                             |
| `trip-thumbnail-lifecycle.feature` #15：自訂照片隨原旅行復原，確認永久刪除後圖片也無法再取得                      | `B006-002`, `B006-004`, `B006-007`, `B006-031`, `F006-040`, `F006-041`, `F006-042`                                                 |
| `trip-thumbnail-lifecycle.feature` #16：縮圖延遲再讀取失敗時保留版面，仍可開啟帳本記帳                            | `F006-069`, `F006-070`, `F006-071`                                                                                                 |
| `trip-trash-and-restoration.feature` #1：尚有欠款與停用同行者的旅行取消一次後移入垃圾桶，再於另一裝置完整復原     | `F006-036`, `F006-039`, `F006-040`, `F006-041`, `F006-043`, `B006-001`, `B006-002`, `B006-003`, `B006-004`, `B006-005`, `B006-006` |
| `trip-trash-and-restoration.feature` #2：未明確確認就以不同方式關閉刪除 dialog                                    | `F006-039`                                                                                                                         |
| `trip-trash-and-restoration.feature` #3：先拒絕略過垃圾桶，再取消永久刪除，最後整趟永久清除                       | `B006-008`, `F006-038`, `F006-039`, `F006-042`, `B006-007`, `B006-010`, `F006-067`                                                 |
| `trip-trash-and-restoration.feature` #4：旅行在垃圾桶時分類仍受引用保護，復原後分類連結保持                       | `B006-032`, `B006-033`, `B006-004`                                                                                                 |
| `trip-trash-and-restoration.feature` #5：帳號最後一趟旅行移入垃圾桶，再復原使垃圾桶變空                           | `F006-044`, `B006-005`, `B006-006`                                                                                                 |
| `trip-trash-and-restoration.feature` #6：多次重新登入後仍可手動復原垃圾桶旅行                                     | `B006-011`, `B006-004`                                                                                                             |

補充契約來源：B006-104承接研究與已定稿multipart契約；B006-114驗purge例外未放寬一般歷史保護；F006-103承接plan對舊支出404查證風險；F006-106/107承接design-v7的create未知→原state→同trip續存圖，不增加新API或新決策。

## 後續使用

`tasks.md`已產生，Phase 3逐句列出權威DSL及代表RED入口。驗收表中的Rule tags直接對照truth feature；畫面版本/批准與共用預覽只以 `ui/ui-plan.md` 為準，續跑與任務狀態只以 `handoff.md` 為準。此處的規格檢查不代表產品BDD/E2E通過。
