# 007 介面 Gherkin／DSL 細化審查

目前範圍：`/dsl-refine`；只交付 interface truth 與交接，不代表 StepDef、API、圖表或產品測試已實作。沿用 expenses 模組；新增後端3份、前端5份 feature，兩個模組 DSL 只追加007句型，既有 feature 與根 DSL 保持原義。

## 輸入及有效確認

- 需求：本 plan `spec.md`、`research.md`、四份 acceptance（13個 Journey examples）、`plan.md`、`truth-delta.md`、API/data/techstack truth。個人固定 owner 成員份額，團體只計至少兩人共同消費；未新增多帳號共編。
- C 類呈現：`ui/ui-plan.md` design-v1；使用者2026-11-19原回覆「UI 確認 ok」。交付 `.pen` SHA256 `d74e31d53c59f19ab2b4e5991808673fd599020b81dd0667a186f98ded8f3968`；確認時 `5337ee04327ee2e2e3076ae6055cf6c72a99d38435f0af4f874faa9bcbd45665`，僅批准索引註記變動，八張產品預覽未變。
- 固定現況：commit `8fc9f94134c66ffd29918014b950894b1007aa86`、`specs/ui-baseline/split-ledger.pen` hash `144a81b3086885bf57f5a694a78ed75f089f032730f91767088598ed1572a3d3`。prototype **不製作**，沒有原型前置缺口。
- spec/acceptance 原文仍保留規劃時的 UI 待定註記；位置、初始幣別、百分比位數與無共同支出呈現，以已批准的 UI 索引及本對照收斂，不把那段歷史註記解讀為仍受阻。

## Acceptance 結果分派

Journey代號依下表定義，順序是語意索引而非 feature 檔名排序。每個介面案例可獨立安排前序已保存狀態；不照抄多 When 旅程。

| Journey／原檔例子 | 結果及不變條件 | 介面 Rule ID |
| --- | --- | --- |
| A1 分類花費與幣別／混合個人、墊款、代付 | 個人300+300=600；團體900+600=1500；各自分母、圖形、範圍 | B01–03；F01–08、F56 |
| A2 分類花費與幣別／分頁與旅行前機票 | 全日期、25筆、排除另一旅行；載入20或25筆結果相同 | B04；F09–10 |
| A3 分類花費與幣別／三幣別及未分類 | 台幣100/300、日圓500/600與null分類；美元兩圖零、追加他人共同20；切回台幣 | B05–07、B10–12、B29；F11–16、F19–21 |
| A4 分類花費與幣別／精確份額及付款 | 三次100/3先加為100；團體300；還款和結清不變 | B08–09、B14、B30；F17–18、F59 |
| A5 修正消費與分類／改金額、改分攤、刪除 | 初始500/1500，金額變600/1800與2/3、1/3，移除晚餐及刪除後200/600 | B15–17；F22–24（初始Given真分析亦核對DB） |
| A6 修正消費與分類／車票改幣別 | JPY只剩餐飲200/600，新USD交通10/30；不得殘留舊貢獻 | B18；F25、F29 |
| A7 修正消費與分類／改名、解除、停用 | ID不變的分類改名、不留舊名；null不漏算；停用不刪三人歷史 | B19–21；F26–28 |
| A8 圖表互動與讀取狀態／滑鼠手機鍵盤 | 個人60/40/100；團體餐飲120/60%；同色；常駐可讀；離開資訊卡繼續選幣別 | F30–38、F57–58（補批准互動）；B01–03提供數據oracle |
| A9 圖表互動與讀取狀態／初讀失敗及第一筆 | pending不假零；失敗可重試不假空；真空無幣別；首筆100%完整圈 | B12；F39、F42–44 |
| A10 圖表互動與讀取狀態／背景更新 | 舊100/200全圖/明細保留，pending/失敗/重試分開；新150/300與100% | F45–48 |
| A11 圖表互動與讀取狀態／切旅行競態 | 台南pending不冒充日本；晚到日本不覆蓋台南交通200 | F49–50 |
| A12 分析存取與旅行生命週期／登出及同名帳號 | owner100/200，未登入/他人皆不能取得；快取及資訊卡不可洩漏 | B22–24；F51–52（owner初始Given核對） |
| A13 分析存取與旅行生命週期／trash、restore、purge | 本人trash可理解/既有管理，restore100/200；purged舊連結無資料 | B25–28；F53–55 |

另由契約承接：B13歷史尺度、B14唯讀、B27他人trash不探查、B30非整除精確分數；由批准UI承接：F19–21幣別保留/fallback/全旅行無共同、F40–41極小值/長內容、F48離線、F57–59關閉/替換提示及取整說明。未擴大帳務寫入、成員代看、換匯或協作權限。

## UI 位置、導航及測試矩陣

以下只在 plan-side 保存版本與 frame，feature 句子不含像素或設計工具版本。API/data是本次C類功能的行為依賴，不另創畫面；前端依C類批准範圍。

| UI索引／frame與預覽 | 介面規則／DSL責任 | 正式位置與操作 |
| --- | --- | --- |
| ledger/analysis-entry/desktop O24TBs；mobile zS1cF | F01–02；從帳本開啟分類分析 | `/trips/:id` 原旅行導覽加入口；手機下一列全寬、底部仍五項；不在ledger塞兩圖 |
| analysis/main/desktop z7pOeL；mobile vrPz0 | F03–29、F39–41、F55；明細/總額/幣別DSL | `/trips/:id/analysis`，返回同旅行帳本；桌機並排、手機上下；明細常駐、兩圖共幣別而分母獨立 |
| analysis/group/mobile-scroll vjeyS | F03、F05–08、F12–16 | 同一路由向下捲動到團體圖，不另外開詳情頁；允許垂直捲動，禁止為同屏塞內容而改資訊位置 |
| analysis/detail/desktop ZAxvn | F30–31、F35、F57 | 同頁hover，離開關閉；團體/個人用各自數據、同分類同色 |
| analysis/detail/mobile Lj8SI | F32–38、F58 | 同頁資訊卡，點扇形或常駐列；Enter/Space皆可、Escape/關閉按鈕回焦，之後可選幣別；不鑽取支出 |
| analysis/states GS7hF | F15、F20–21、F39–50、F51–55 | 初載/空/失敗/零圖/背景/離線/無共同/長內容；錯誤權限沿用TripAccessState，未新增保存/unknown dialog |
| 固定 ledger baseline | F56 | 返回 `/trips/:id`，原總額、成員結餘、支出位置維持；這些資訊不推定同時存在分析頁 |
| design/index S1EcWx | 僅版本及確認索引 | 非產品畫面、不新增可操作路由 |

- 桌機1440×900與手機390×844，以每個案例獨立context/同種子覆蓋；不是在同一Example的Then重開或切裝置。首組產品畫面比對為F03–08同混合消費，需先通過代表畫面比對才展開同元件後續任務。入口是局部設計，產品應另核完整ledger上下文。
- 語意與狀態案例至少Chromium桌機/手機；觸控覆蓋扇形及常駐列，鍵盤Enter/Space、Escape、Tab可達及可見focus；視覺邊界/長內容/離線/reduced motion有各自狀態。完整瀏覽器、WebKit及人工輔助工具矩陣由/tasks列適用檢查，這裡未執行產品測試。
- 89個Rule/Example＝後端30、前端59；每例一個When；Given前序狀態均可獨立建立。Then只觀察、不隱藏刷新/導航/第二次受測命令。雙裝置或按鍵變體以同一Rule獨立參數執行，不新增多Act。

## 規則索引

| ID | Truth feature | 單一驗證面向 |
| --- | --- | --- |
| F007-B01 | `specs/truth/features/backend/expenses/分類花費精確統計.feature` | 個人分類金額只計擁有者的實際分攤份額 |
| F007-B02 | `specs/truth/features/backend/expenses/分類花費精確統計.feature` | 團體分類金額只將兩人以上共同消費計入一次 |
| F007-B03 | `specs/truth/features/backend/expenses/分類花費精確統計.feature` | 各圖總額等於各自全部分類的精確總和 |
| F007-B04 | `specs/truth/features/backend/expenses/分類花費精確統計.feature` | 分析來源包含全部日期與完整旅行支出 |
| F007-B05 | `specs/truth/features/backend/expenses/分類花費精確統計.feature` | 不同幣別的分類金額保持分離 |
| F007-B06 | `specs/truth/features/backend/expenses/分類花費精確統計.feature` | 已有支出的幣別即使兩圖皆零也要回傳 |
| F007-B07 | `specs/truth/features/backend/expenses/分類花費精確統計.feature` | 零值圖不產生正數分類 |
| F007-B08 | `specs/truth/features/backend/expenses/分類花費精確統計.feature` | 多筆循環小數份額先精確相加 |
| F007-B09 | `specs/truth/features/backend/expenses/分類花費精確統計.feature` | 還款與實付結清不計入消費分類 |
| F007-B10 | `specs/truth/features/backend/expenses/分類花費精確統計.feature` | 共同消費狀態跨幣別判定且不要求擁有者參與 |
| F007-B11 | `specs/truth/features/backend/expenses/分類花費精確統計.feature` | 整趟旅行沒有多人分攤時不是共同消費 |
| F007-B12 | `specs/truth/features/backend/expenses/分類花費精確統計.feature` | 沒有支出時回傳成功的空分析 |
| F007-B13 | `specs/truth/features/backend/expenses/分類花費精確統計.feature` | 歷史幣別精度對齊後仍保留原始份額 |
| F007-B14 | `specs/truth/features/backend/expenses/分類花費精確統計.feature` | 查詢不修改帳務來源 |
| F007-B15 | `specs/truth/features/backend/expenses/分類分析資料修正.feature` | 金額修正後查詢採最新保存金額 |
| F007-B16 | `specs/truth/features/backend/expenses/分類分析資料修正.feature` | 分攤資格修正後從不符合的圖移除貢獻 |
| F007-B17 | `specs/truth/features/backend/expenses/分類分析資料修正.feature` | 刪除支出後不再有該筆分類貢獻 |
| F007-B18 | `specs/truth/features/backend/expenses/分類分析資料修正.feature` | 幣別修正後貢獻只存在於新幣別 |
| F007-B19 | `specs/truth/features/backend/expenses/分類分析資料修正.feature` | 分類改名沿用同一分類身分 |
| F007-B20 | `specs/truth/features/backend/expenses/分類分析資料修正.feature` | 解除分類後歸入未分類且不改消費金額 |
| F007-B21 | `specs/truth/features/backend/expenses/分類分析資料修正.feature` | 成員改名及停用不改歷史分攤資格 |
| F007-B22 | `specs/truth/features/backend/expenses/分類分析資料修正.feature` | 個人對象固定為帳本擁有者的成員身分 |
| F007-B23 | `specs/truth/features/backend/expenses/分類分析存取邊界.feature` | 未登入不能取得分類分析 |
| F007-B24 | `specs/truth/features/backend/expenses/分類分析存取邊界.feature` | 與同行者同名不授予帳本存取權 |
| F007-B25 | `specs/truth/features/backend/expenses/分類分析存取邊界.feature` | 垃圾桶中的旅行拒絕分析讀取 |
| F007-B26 | `specs/truth/features/backend/expenses/分類分析存取邊界.feature` | 永久刪除的旅行沒有可讀分析 |
| F007-B27 | `specs/truth/features/backend/expenses/分類分析存取邊界.feature` | 他人不可藉垃圾桶狀態探查旅行 |
| F007-B28 | `specs/truth/features/backend/expenses/分類分析存取邊界.feature` | 復原旅行後可重新取得原消費分析 |
| F007-F01 | `specs/truth/features/frontend/expenses/分類分析入口與數值.feature` | 帳本入口前往目前旅行的分析頁 |
| F007-F02 | `specs/truth/features/frontend/expenses/分類分析入口與數值.feature` | 手機帳本提供獨立的分析入口 |
| F007-F03 | `specs/truth/features/frontend/expenses/分類分析入口與數值.feature` | 分析頁依裝置排列個人與團體圖 |
| F007-F04 | `specs/truth/features/frontend/expenses/分類分析入口與數值.feature` | 個人圖呈現實際分攤的分類金額與占比 |
| F007-F05 | `specs/truth/features/frontend/expenses/分類分析入口與數值.feature` | 團體圖呈現共同消費分類金額與占比 |
| F007-F06 | `specs/truth/features/frontend/expenses/分類分析入口與數值.feature` | 圓環中心顯示各圖自己的總額 |
| F007-F07 | `specs/truth/features/frontend/expenses/分類分析入口與數值.feature` | 扇形按各圖精確分類比例繪製 |
| F007-F08 | `specs/truth/features/frontend/expenses/分類分析入口與數值.feature` | 團體圖清楚說明共同消費範圍 |
| F007-F09 | `specs/truth/features/frontend/expenses/分類分析入口與數值.feature` | 清單載入範圍不影響完整旅行分析 |
| F007-F10 | `specs/truth/features/frontend/expenses/分類分析入口與數值.feature` | 載入全部清單後分析金額保持完整 |
| F007-F11 | `specs/truth/features/frontend/expenses/分類分析入口與數值.feature` | 第一次分析依代碼順序選取幣別 |
| F007-F12 | `specs/truth/features/frontend/expenses/分類分析入口與數值.feature` | 切換幣別同步更新兩圖且不混幣 |
| F007-F13 | `specs/truth/features/frontend/expenses/分類分析入口與數值.feature` | 切回幣別仍呈現原來正確分類 |
| F007-F14 | `specs/truth/features/frontend/expenses/分類分析入口與數值.feature` | 未分類消費有獨立常駐明細 |
| F007-F15 | `specs/truth/features/frontend/expenses/分類分析入口與數值.feature` | 有其他幣別共同消費時零值圖保留空狀態 |
| F007-F16 | `specs/truth/features/frontend/expenses/分類分析入口與數值.feature` | 新增他人共同消費只更新團體資格 |
| F007-F17 | `specs/truth/features/frontend/expenses/分類分析入口與數值.feature` | 循環小數先相加再格式化為個人花費 |
| F007-F18 | `specs/truth/features/frontend/expenses/分類分析入口與數值.feature` | 還款與結清後分析的消費及占比不變 |
| F007-F19 | `specs/truth/features/frontend/expenses/分類分析入口與數值.feature` | 再次查看保留仍存在的幣別選擇 |
| F007-F20 | `specs/truth/features/frontend/expenses/分類分析入口與數值.feature` | 先前幣別消失時改選代碼第一項 |
| F007-F21 | `specs/truth/features/frontend/expenses/分類分析入口與數值.feature` | 全旅行無共同消費以說明取代團體圖 |
| F007-F22 | `specs/truth/features/frontend/expenses/分類分析修正後重看.feature` | 金額修正後再次查看更新兩圖 |
| F007-F23 | `specs/truth/features/frontend/expenses/分類分析修正後重看.feature` | 分攤者修正後再次查看移除不符合分類 |
| F007-F24 | `specs/truth/features/frontend/expenses/分類分析修正後重看.feature` | 刪除支出後再次查看不保留舊分類 |
| F007-F25 | `specs/truth/features/frontend/expenses/分類分析修正後重看.feature` | 修正幣別後舊幣別不殘留貢獻 |
| F007-F26 | `specs/truth/features/frontend/expenses/分類分析修正後重看.feature` | 分類改名後不留下舊名分組 |
| F007-F27 | `specs/truth/features/frontend/expenses/分類分析修正後重看.feature` | 清除分類後以未分類保留金額 |
| F007-F28 | `specs/truth/features/frontend/expenses/分類分析修正後重看.feature` | 成員改名停用後重看不改歷史份額 |
| F007-F29 | `specs/truth/features/frontend/expenses/分類分析修正後重看.feature` | 修正幣別後切換可查看新幣別貢獻 |
| F007-F30 | `specs/truth/features/frontend/expenses/分類圖表互動.feature` | 滑鼠移入個人分類可取得該圖資訊 |
| F007-F31 | `specs/truth/features/frontend/expenses/分類圖表互動.feature` | 滑鼠移入團體分類可取得該圖資訊 |
| F007-F32 | `specs/truth/features/frontend/expenses/分類圖表互動.feature` | 點按個人分類可取得該圖資訊 |
| F007-F33 | `specs/truth/features/frontend/expenses/分類圖表互動.feature` | 鍵盤選取個人分類可取得該圖資訊 |
| F007-F34 | `specs/truth/features/frontend/expenses/分類圖表互動.feature` | 常駐分類資訊在沒有提示時仍完整可讀 |
| F007-F35 | `specs/truth/features/frontend/expenses/分類圖表互動.feature` | 相同分類在兩圖使用相同色彩 |
| F007-F36 | `specs/truth/features/frontend/expenses/分類圖表互動.feature` | Escape可關閉分類資訊並回復焦點 |
| F007-F37 | `specs/truth/features/frontend/expenses/分類圖表互動.feature` | 關閉按鈕可關閉分類資訊並回復焦點 |
| F007-F38 | `specs/truth/features/frontend/expenses/分類圖表互動.feature` | 離開分類資訊後鍵盤能繼續選擇幣別 |
| F007-F39 | `specs/truth/features/frontend/expenses/分類圖表互動.feature` | 單一正數分類顯示完整圓環 |
| F007-F40 | `specs/truth/features/frontend/expenses/分類圖表互動.feature` | 極小正數分類不被當成零或遺漏 |
| F007-F41 | `specs/truth/features/frontend/expenses/分類圖表互動.feature` | 長名稱與多分類仍逐項完整可讀 |
| F007-F42 | `specs/truth/features/frontend/expenses/分類分析讀取與範圍狀態.feature` | 初次讀取期間不假裝已取得零花費 |
| F007-F43 | `specs/truth/features/frontend/expenses/分類分析讀取與範圍狀態.feature` | 初次讀取失敗提供重試而非無支出 |
| F007-F44 | `specs/truth/features/frontend/expenses/分類分析讀取與範圍狀態.feature` | 初讀失敗後重試可確認旅行尚無支出 |
| F007-F45 | `specs/truth/features/frontend/expenses/分類分析讀取與範圍狀態.feature` | 背景更新期間完整保留已確認圖表與明細 |
| F007-F46 | `specs/truth/features/frontend/expenses/分類分析讀取與範圍狀態.feature` | 背景更新失敗不將舊內容標示為最新 |
| F007-F47 | `specs/truth/features/frontend/expenses/分類分析讀取與範圍狀態.feature` | 背景失敗後重試成功替換為最新消費 |
| F007-F48 | `specs/truth/features/frontend/expenses/分類分析讀取與範圍狀態.feature` | 離線暫停更新時不持續無限動畫 |
| F007-F49 | `specs/truth/features/frontend/expenses/分類分析讀取與範圍狀態.feature` | 切換旅行讀取中不得沿用前旅行數值 |
| F007-F50 | `specs/truth/features/frontend/expenses/分類分析讀取與範圍狀態.feature` | 遲到的其他旅行結果不覆蓋目前分析 |
| F007-F51 | `specs/truth/features/frontend/expenses/分類分析權限與生命週期.feature` | 登出後不能重新取得舊分析 |
| F007-F52 | `specs/truth/features/frontend/expenses/分類分析權限與生命週期.feature` | 同名同行者帳號不可見舊擁有者分析 |
| F007-F53 | `specs/truth/features/frontend/expenses/分類分析權限與生命週期.feature` | 垃圾桶旅行不繼續顯示可操作分析 |
| F007-F54 | `specs/truth/features/frontend/expenses/分類分析權限與生命週期.feature` | 永久刪除後舊分析連結無法讀取 |
| F007-F55 | `specs/truth/features/frontend/expenses/分類分析權限與生命週期.feature` | 復原後重看仍保留原始消費 |
| F007-F56 | `specs/truth/features/frontend/expenses/分類分析權限與生命週期.feature` | 返回帳本維持同一旅行 |
| F007-B29 | `specs/truth/features/backend/expenses/分類花費精確統計.feature` | 各幣別總額不得跨幣加總 |
| F007-B30 | `specs/truth/features/backend/expenses/分類花費精確統計.feature` | 單筆不可整除份額維持精確有理數 |
| F007-F57 | `specs/truth/features/frontend/expenses/分類圖表互動.feature` | 離開滑鼠分類時關閉懸浮提示 |
| F007-F58 | `specs/truth/features/frontend/expenses/分類圖表互動.feature` | 手機改選分類時資訊卡對應新分類 |
| F007-F59 | `specs/truth/features/frontend/expenses/分類圖表互動.feature` | 不可整除份額的顯示取整不改寫分攤 |

## 檢查與續跑

- 基線拓樸：backend27feature/682steps、frontend28feature/721steps；兩者0 errors、0 warnings。
- 本輪拓樸：backend30feature/813steps、frontend33feature/1008steps；兩者0 errors、0 warnings。每個step合併根與模組DSL恰命中一個row。新增模組DSL後端29列、前端74列；既有DSL原文保留。
- 已保存本輪機械log：`checks/dsl-refine-backend-topology.log`、`checks/dsl-refine-frontend-topology.log`；解析／單一Act／既有DSL原文不變與10個truth檔案SHA256見`checks/dsl-refine-validation.json`。基線log仍在`/tmp/007-dsl-{backend,frontend}-before.log`；完整可再現命令：`python3 .agents/skills/gherkin-and-dsl/scripts/audit_feature_dsl_topology.py --root specs/truth/features/backend`，frontend同理。
- Gherkin解析：8檔、89 Rules、89 Examples、418 steps及89個唯一ID；每例恰一When，When後動作型And=0。使用既有@cucumber/gherkin39.1.0；本機Node22.20.0僅跑文件檢查，產品要求的Node24環境與產品測試仍待後續任務。
- 獨立`/gherkin-and-dsl`：既有輔助代理`/root/record_truth_delta`唯讀核對全部13旅程、原子性、精確DB oracle、DSL唯一歸屬及批准UI位置。曾找到F41非法40字種子、B17/F24刪除後團體分類未完整驗證、F28團體未分類缺口；已修合法30字與兩圖完整集合，並經同一審查者重核通過，無剩餘阻塞項。F16選USD改為mutation前完成，避免Given先刷新新分析。獨立重跑兩介面拓樸亦通過。
- `/truth-delta`：已委派並完成，`/dsl-refine` section為ADD13／MODIFY0／DELETE0／NOOP3，其他三owner表保留，無需clarify。
- 下游入口已就緒：`/tasks`。尚未寫StepDef或跑RED/GREEN，不可把本文件當作產品測試通過；Phase3測試對齊及獨立review、後端完整feature組、代表畫面、其餘畫面、整合回歸及baseline回填/獨立核對均留待tasks。
- 資源：low-memory-16gb；主代理＋既有record_truth_delta一位helper，不新增代理/服務，重型worker上限1。
