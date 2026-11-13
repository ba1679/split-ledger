# 006 旅行管理、縮圖與等待 UI 規劃｜design-v7 已確認

## 介面範圍與權威來源

- 本輪使用者要求「管理旅行是一個 dropdown action button，展開 menu list，不另開管理 dialog」，並讓新增旅行可選填縮圖。
- 已澄清的失敗策略原文：「選 1，保留已建立的旅行，圖片保存失敗時用預設圖並提供重新上傳。」日期 2026-11-13。需求決策與 design-v7 皆已獲使用者明確確認。
- 依據：`spec.md` US2／FR-009～013、NFR-003、`research.md`、`plan.md`、`truth-delta.md`、既有 contracts／data truth，以及 5 份 acceptance（47 模板／121 展開案例）。後端沿用 createTrip＋thumbnail POST，無新增 API／資料表。
- 本輪依使用者明確指示，以已確認的設計稿完成 UI 規劃；省略 prototype 與規劃期截圖比對驗證。舊 prototype 已移至 `history/design-v6/`，不作為本輪交付依據。

## 設計交付與確認關卡

| 欄位           | 目前狀態                                                                                                                                                                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 設計檔         | `ui/split-ledger-006.pen`，真正 Pencil execute／Export／save 儲存；005 未改。                                                                                                                                                                     |
| 版本與 SHA-256 | `design-v7`；`6c33bce25da872057d253a44bd0e59dec1f0e41f974873fb6db0dfe10b6c1abc`；526,282 bytes。歷史 design-v6 SHA `8b3c05c895e98e42257d47070d61c585b72f05c419413ae85395322c86158f27`，其 30 PNG 已封存 `history/design-v6/approved-design-v6/`。 |
| 範圍           | 38 個實際 frame／38 PNG：原 30 畫面（U02 D/M 更新）＋新增 U06／U07／U08／S10 各 D/M。                                                                                                                                                             |
| 尺寸           | 桌機 1440×900；手機 390×844，以 .pen 與匯出預覽交付。                                                                                                                                                                                             |
| 確認           | design-v7 `approved`；確認者：使用者；日期：2026-11-13；範圍：完整 38 個 frame 與其桌機／手機設計。原回覆見下方紀錄。                                                                                                                             |
| 本輪交付範圍   | 使用者明確省略 prototype 與截圖比對驗證；UI 規劃已完成。正式產品實作未開始，功能／無障礙／響應式驗收由後續實作承接。                                                                                                                              |

## 視覺方向與共用規則

沿用正式設計系統：底色 `#f6f6f0`、主綠 `#245c49`、墨色 `#192e29`、白卡、淡綠底、12px 卡片圓角、7px 按鈕圓角、Georgia／Noto Serif TC 標題與現有無襯線內文。保留側欄／手機底部導覽、旅行卡片風景區、分幣別個人總花費與簡潔支出列。新增縮圖應替換卡片風景區的視覺內容，不覆蓋名稱、日期、支出筆數或操作。縮圖載入先佔定高度，失敗回預設風景；只有圖片區改變。

主要內容寬度沿現有 shell；桌機以 2–3 欄卡片，手機單欄，操作置於可觸及區且互不擠壓。長旅行名稱允許自然換行，按鈕與日期下移，不裁去識別文字。所有互動目標至少 44×44px；次要文字與狀態文字對比至少 4.5:1。裝飾骨架／spinner 不可聚焦；有 spinner 的區域不疊加可見 loading 文案，讀屏以 `aria-label` 或 visually-hidden 動詞與對象說明。焦點環沿用現有 `--focus`，減少動態效果時停用 shimmer／旋轉動畫但保留形狀與語意。`ui-ux-pro-max` 本輪查得確認對話框、成功回饋、對比及等待穩定版面規則；採用和本產品相符的部分，不重新設計品牌。

共用狀態元件概念：`PageSkeleton`（按對應版面保留標題／卡片／列表結構）、`SectionSkeleton`（總額／選項局部）、`InlineRefresh`（已有資料仍可見）、`LoadMoreBusy`（只在列表尾）、`ActionBusy`（按鈕保持尺寸、只顯示置中 spinner，鎖同一操作）、`VerifyOutcome`（spinner-only 查證中／仍未確認／再查證）、`PausedNotice`（連線暫停與下一步）、`InlineError`（保留資料及草稿）、`SuccessNotice`（短暫可讀）。不顯示假百分比；圖片上傳 spinner 對讀屏命名「正在上傳與處理圖片」，畫面不顯示這句文字。不因 `isFetching` 把整頁替換骨架，也不因 `isPending` 永遠轉圈。

## 本輪互動與失敗回饋

1. **管理旅行**：在原按鈕加 chevron，直接於下方靠右展開 menu list，帳本不加遮罩。不先開管理 dialog；選「自訂旅行縮圖」才開既有縮圖編輯，選「移至垃圾桶」才開既有確認。
   - menu item ≥44px；Enter／Space 開啟，方向鍵移動、Home／End 到首尾，Escape 或點擊外部關閉，回焦原觸發按鈕；在小 viewport 避免超出右界。menu 使用適當 expanded／haspopup／controls／menuitem 語意，由後續實作與驗收確認鍵盤及無障礙行為。
2. **新增旅行**：名稱必填；起迄日與旅行縮圖選填。無圖仍可建立；選擇照片只改本地預覽，明列尚未保存，提供 14px primary「重新選圖」與中性「移除選圖」。移除只清本次選圖；取消／X／Escape 在提交前放棄表單及照片草稿。
   - 格式／大小／像素限制共用 FR-011；無效選圖提示改選或移除，不能悄悄忽略。手機限制文字以獨立三行呈現；取消／建立相鄰成組，取消左、建立右。
3. **建立與圖片分階段**：先確認旅行建立；未選圖即顯示預設圖，有圖再保存至同一 trip。
   - 旅行建立明確失敗：不保存圖片，保留可修正表單與草稿；建立結果未知則先查原旅行，不能另建一趟。
   - 圖片明確失敗：保留已建立旅行及預設圖，提示「旅行已建立，但圖片未保存」，提供同旅行「重新上傳」，保留本次可用的照片草稿；沒有再次建立按鈕。
   - 圖片結果未知：保留原次意圖並查證，不提前宣稱失敗或強制顯示預設；另一裝置有新圖片／狀態時刷新當前權威狀態，不回退覆蓋。
4. 既有縮圖 dialog、預設圖先預覽再保存、spinner-only、移入／purge 確認及 My Trips 垃圾桶導覽維持。讀屏名稱、鍵盤焦點與成功／錯誤訊息仍保留。

## 畫面與狀態索引

下表為使用者已確認的 design-v7 完整 38 個 frame；Pencil 已匯出桌機／手機預覽，作為後續 UI 實作依據。

| 畫面／狀態                               | 介面／驗收責任                                        | .pen frame／預覽／尺寸                                   |
| ---------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------- |
| `U01-D` 旅行清單                         | Trips／AppShell；trash、thumbnail、loading acceptance | `qOVYr` · [預覽](design-previews/qOVYr.png) · 1440×900   |
| `U01-M` 旅行清單                         | Trips／AppShell；trash、thumbnail、loading acceptance | `uBMYs` · [預覽](design-previews/uBMYs.png) · 390×844    |
| `U02-D` 旅行帳本・管理 dropdown 觸發按鈕 | TripLedger／AppShell；dropdown、trash、loading        | `nh4JN` · [預覽](design-previews/nh4JN.png) · 1440×900   |
| `U02-M` 旅行帳本・管理 dropdown 觸發按鈕 | TripLedger／AppShell；dropdown、trash、loading        | `c5e28` · [預覽](design-previews/c5e28.png) · 390×844    |
| `U03-D` 垃圾桶                           | /trips/trash；trash acceptance                        | `WLw0N` · [預覽](design-previews/WLw0N.png) · 1440×900   |
| `U03-M` 垃圾桶                           | /trips/trash；trash acceptance                        | `VtNXn` · [預覽](design-previews/VtNXn.png) · 390×844    |
| `U04-D` 縮圖編輯                         | TripLedger 縮圖 dialog；thumbnail lifecycle／format   | `Wd1Pq` · [預覽](design-previews/Wd1Pq.png) · 1440×900   |
| `U04-M` 縮圖編輯                         | TripLedger 縮圖 dialog；thumbnail lifecycle／format   | `A0kb5` · [預覽](design-previews/A0kb5.png) · 390×844    |
| `S01-D` 移至垃圾桶確認                   | TripLedger 管理選單→確認；trash                       | `k5UPcL` · [預覽](design-previews/k5UPcL.png) · 1440×900 |
| `S01-M` 移至垃圾桶確認                   | TripLedger 管理選單→確認；trash                       | `vkszC` · [預覽](design-previews/vkszC.png) · 390×844    |
| `S02-D` 永久刪除確認                     | 垃圾桶永久刪除；trash                                 | `G7HrKo` · [預覽](design-previews/G7HrKo.png) · 1440×900 |
| `S02-M` 永久刪除確認                     | 垃圾桶永久刪除；trash                                 | `rHv6p` · [預覽](design-previews/rHv6p.png) · 390×844    |
| `S03-D` 縮圖預覽／錯誤／忙碌／保存後成功 | 縮圖共用狀態；thumbnail lifecycle／format             | `ybPvI` · [預覽](design-previews/ybPvI.png) · 1440×900   |
| `S03-M` 縮圖預覽／錯誤／忙碌／保存後成功 | 縮圖共用狀態；thumbnail lifecycle／format             | `DECWg` · [預覽](design-previews/DECWg.png) · 390×844    |
| `S04-D` 初載／空白／錯誤／暫停           | 全站讀取元件；loading                                 | `g1Pexm` · [預覽](design-previews/g1Pexm.png) · 1440×900 |
| `S04-M` 初載／空白／錯誤／暫停           | 全站讀取元件；loading                                 | `U2nnu` · [預覽](design-previews/U2nnu.png) · 390×844    |
| `S05-D` 查證／結果未知／衝突             | operation outcome／state；conflict／loading           | `M6LRw` · [預覽](design-previews/M6LRw.png) · 1440×900   |
| `S05-M` 查證／結果未知／衝突             | operation outcome／state；conflict／loading           | `kMwFM` · [預覽](design-previews/kMwFM.png) · 390×844    |
| `S06-D` 舊連結存取                       | /trips/:tripId/* 存取邊界；conflict                   | `ddFff` · [預覽](design-previews/ddFff.png) · 1440×900   |
| `S06-M` 舊連結存取                       | /trips/:tripId/* 存取邊界；conflict                   | `hmwlx` · [預覽](design-previews/hmwlx.png) · 390×844    |
| `S07-D` 長名稱／圖片 fallback            | Trips／TripLedger／垃圾桶；thumbnail fallback         | `vCf8Y` · [預覽](design-previews/vCf8Y.png) · 1440×900   |
| `S07-M` 長名稱／圖片 fallback            | Trips／TripLedger／垃圾桶；thumbnail fallback         | `quiiR` · [預覽](design-previews/quiiR.png) · 390×844    |
| `S09-D` 預設圖尚未保存                   | 縮圖本地草稿／保存；thumbnail lifecycle               | `s8IowS` · [預覽](design-previews/s8IowS.png) · 1440×900 |
| `S09-M` 預設圖尚未保存                   | 縮圖本地草稿／保存；thumbnail lifecycle               | `tI380` · [預覽](design-previews/tI380.png) · 390×844    |
| `U05-M1` 我的旅行次級選單                | AppShell 我的旅行導覽；trash                          | `FTGvi` · [預覽](design-previews/FTGvi.png) · 390×844    |
| `U05-M2` 我的旅行次級選單                | AppShell 我的旅行導覽；trash                          | `skr2f` · [預覽](design-previews/skr2f.png) · 390×844    |
| `U05-M3` 我的旅行次級選單                | AppShell 我的旅行導覽；trash                          | `K7sv4E` · [預覽](design-previews/K7sv4E.png) · 390×844  |
| `S08-D` 全站等待狀態                     | 全站表單／付款／分類／成員等待；loading               | `Z6aGfB` · [預覽](design-previews/Z6aGfB.png) · 1440×900 |
| `S08-M1` 全站等待狀態                    | 全站表單／付款／分類／成員等待；loading               | `lEany` · [預覽](design-previews/lEany.png) · 390×844    |
| `S08-M2` 全站等待狀態                    | 全站表單／付款／分類／成員等待；loading               | `l3jVE` · [預覽](design-previews/l3jVE.png) · 390×844    |
| `U06-D` 管理旅行選單展開                 | TripLedger anchored menu；thumbnail／trash            | `ZMoXS` · [預覽](design-previews/ZMoXS.png) · 1440×900   |
| `U06-M` 管理旅行選單展開                 | TripLedger anchored menu；thumbnail／trash            | `xsZKA` · [預覽](design-previews/xsZKA.png) · 390×844    |
| `U07-D` 新增旅行・未選圖片               | Trips／TripForm；新增旅行無圖與取消                   | `Dsq2D` · [預覽](design-previews/Dsq2D.png) · 1440×900   |
| `U07-M` 新增旅行・未選圖片               | Trips／TripForm；新增旅行無圖與取消                   | `kOFc3` · [預覽](design-previews/kOFc3.png) · 390×844    |
| `U08-D` 新增旅行・已選圖片預覽           | Trips／TripForm；新增旅行選填縮圖與草稿               | `GfuLl` · [預覽](design-previews/GfuLl.png) · 1440×900   |
| `U08-M` 新增旅行・已選圖片預覽           | Trips／TripForm；新增旅行選填縮圖與草稿               | `eSFbG` · [預覽](design-previews/eSFbG.png) · 390×844    |
| `S10-D` 旅行建立成功但圖片保存失敗       | 建立結果→同 trip 縮圖重傳；thumbnail lifecycle        | `s825M` · [預覽](design-previews/s825M.png) · 1440×900   |
| `S10-M` 旅行建立成功但圖片保存失敗       | 建立結果→同 trip 縮圖重傳；thumbnail lifecycle        | `F1Hwk` · [預覽](design-previews/F1Hwk.png) · 390×844    |

### 全站覆蓋對照（設計時必須落入 `S08-D/M`）

| 正式頁面／元件 | 初次無資料 | 已有資料更新／載入更多 | 提交／查證／失敗 |
| ----------------------------------------- | ---------------------------------------- | ------------------------------------------------------ |
| `/`、登入身分與 `AppShell` | 身分確認局部指示、不可先閃登出或他帳資料 | 切帳清除前帳快取，不套旅行骨架 | 登入／登出忙碌、401 回登入與可理解說明 |
| `/trips`、`Trips`／`TripForm` | `U01` 卡片骨架 | 保留卡片、局部「更新中」 | 建立／修改保留草稿；結果未知先 state 查證 |
| `/trips/:tripId`、`TripLedger` | 帳本標題、個人總花費、支出列表分層骨架 | 保留現有列；更多只在尾端示 busy；totals 局部更新 | 移入、表單保存、縮圖失敗保留帳本；trash/purged 改 `S06` |
| 支出詳情／新增表單、幣別／分類／成員選項 | 表單欄位輪廓與局部選項狀態，不顯示假零 | 既有輸入與已載入選項保持 | 保存／刪除鎖同一意圖；未知先查 trip state，再按 active 子資源查證，不能把 purge 後 404 當單筆成功 |
| `/categories`、分類表單 | 列表骨架、真空才空態 | 保留分類列表 | 保存／刪除忙碌與錯誤；usageCount 含垃圾桶引用，保留分類引用保護說明 |
| `/trips/:tripId/members` | 成員列骨架 | 保留成員列 | 新增／更名／停用／啟用忙碌、失敗保留原列；trash 顯 `S06` |
| `/trips/:tripId/settlement`、簡化付款切換 | 付款安排骨架 | 保留上次確認安排，切換僅局部忙碌，不插入造成跳動的文字 | revision 衝突更新安排；trash 顯 `S06`，不改既有精確分帳 |
| 獨立還款與結清表單 | 表單／建議局部骨架 | 保留已填實付和選定幣別 | 提交／警告／查證分開；既有部分還款、尾差與自動帶入未付額依 005 最新回饋，不用舊實付示例 |

## 互動、錯誤與查證文字

- `S01/S02` 使用原生 `<dialog>` 的焦點限制與 Escape 取消。取消在左、主要動作在右，兩鍵緊鄰成組；取消常態為中性樣式，開啟時先聚焦取消並顯示一致的鍵盤 focus 樣式。右上 44×44 X 與取消同義；關閉回原入口，入口因旅行移入而消失時回主標題或可用導航。忙碌時同一命令不得重複按，取消與提交後離開不得被解讀為後端撤回。
- 命令 UI 持有同一意圖的 operationId 與兩種版本（僅內部）；同 op 查收據比照 API `result` 與 `currentState`。若結果為「移入已完成，但旅行後來已復原」，顯示原操作已確認與目前旅行狀態，不能把後者覆蓋前者。從 `TRIP_STATE_CHANGED`／`THUMBNAIL_UPDATED` 先刷新；`TRIP_TRASHED` 引導垃圾桶；`TRIP_PURGED` 回旅行清單。未知收據 404 仍可能在處理，不宣告失敗。
- 縮圖選圖前與錯誤後顯示「支援單張 JPG、PNG、WebP；最大 10 MiB。手機 HEIC 請先轉成上述格式。」尺寸錯誤補充「最長邊不可超過 16,384 像素，總像素不可超過 2,500 萬」。無效、取消與明確保存失敗維持已保存舊圖；忙碌或結果未知只展示最後已確認畫面，不宣稱遠端舊圖仍存在。本地預覽明確標示「尚未保存」。「重新選圖」與「使用預設圖」只更新本地草稿；選圖按保存才提交 POST，預設圖按保存才提交 DELETE。取消／X／Escape 在提交前放棄草稿，已保存縮圖及其他裝置保持不變；結果未知先查收據與目前狀態，不重送。
- 所有產品文案使用繁中行動語句；不顯示 UUID、HTTP status、資料庫名稱、圖片 bytea、revision 或內部錯誤碼。錯誤映射到「原因＋下一步」，並區分失敗與結果未確認。不可用單純一般清單缺旅行推斷永久刪除成功。
- spinner 不搭配可見 loading 動詞；以 `aria-label`／visually-hidden 提供讀屏所需動詞與對象，配合 `aria-busy` 對應區域、適度 `role=status`／`role=alert`；已載入內容不被 skeleton 蓋住，避免反覆 live 播報；查證超時有「再查證」入口。圖片為選用，讀圖失敗不擋開帳本。

## 確認紀錄與交付範圍

- 確認者：使用者；日期：2026-11-13；版本：design-v7；SHA-256 `6c33bce25da872057d253a44bd0e59dec1f0e41f974873fb6db0dfe10b6c1abc`。
- 使用者原回覆：「確認 design-v7，我覺得這次不用 prototype 了，截圖的一些驗證也幫我拿掉，我之後會再更新 skill，讓前期規劃以設計稿為主就好」。
- 本輪以可編輯 `.pen`、38 個畫面索引、桌機／手機設計預覽及互動規格完成交接。依使用者指示，取消 prototype 製作、瀏覽器截圖比對、額外 viewport 矩陣及其規劃期驗證關卡，不再列為待辦。
- 原型截圖／對照圖、驗證腳本／結果及舊驗證報告已移除；舊原型與 v6 設計僅封存至 `history/design-v6/`，不作為最新實作依據。
- 需求與驗收情境不因流程精簡而刪減：5 份 feature、47 模板／121 展開案例。正式產品的功能、響應式、鍵盤、無障礙及圖片上傳驗收仍由後續實作承接。
- 本次只調整 006 的交付方式；skill 檔案留待使用者另行更新。

## 下游交接

UI 規劃關卡已完成，可依 `spec.md`、`research.md`、acceptance、API／data truth 與此版設計接續 `/dsl-refine`、`/tasks`。本輪未執行這兩個下游 skill，也未開始正式產品實作。

續跑見 [handoff.md](handoff.md)。
