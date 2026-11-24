# 008 實作驗證

- T001（2026-11-24）Node 24.22.2、pnpm 11.25.0。固定 i18next 27.2.4、react-i18next 18.0.3；npm peer 範圍涵蓋 React 19.3.1、TypeScript 5.9.3，安裝 exit 0，manifest、lockfile 與已安裝套件一致。採符合套件發布時間政策的版本，pnpm workspace 政策沿用原設定。
- T002（2026-11-24）隔離 React SSR harness 以 I18nextProvider 與 useTranslation 成功渲染本機訊息。Web typecheck、Vite build exit 0。主 JS 500.38 kB／gzip 153.55 kB，分類分析 JS 374.33 kB／gzip 109.13 kB；Vite 對主 JS 發出 500 kB 大小提醒。產品尚未載入語言資源，此數據用於後續比較。
- T003（2026-11-24）新增 browser-languages 測試接縫，Chromium 實跑核對日文首選／中文次選及無語言資訊兩組。延用既有 LedgerWorld、測試 DB worker、分帳快照與還款 response proxy。Compose 的測試資料庫已健康，屬原有程序。
- T004（2026-11-24）新增按介面語言組織資源的型別，以及沿用既有安排與精確金額的擴充回應型別。Web typecheck exit 0；無執行期接線。
- T005（2026-11-24）沿用既有結算讀取 helper，新增結構化查詢 step。隔離 PostgreSQL／真 API probe 確認只送一次且帶 explanationDetails，保留回應、revision 與原始快照；既有預設查詢 support 回歸一起通過，共 3 案。暫時 probe 已清理，完整產品 RED 待其 Then 綁定完成。
- T006（2026-11-24）以原 feature 的單一 Rule 生成隔離 BDD，用真 API/測試資料庫得到預期 RED：查詢未知 include 預期 400，現版回 200。唯一案例執行到既有 Then，無缺綁定；log 為 /private/tmp/sl008-t006-red.txt。
- T007–T011（2026-11-24）隔離 BDD 授權／垃圾桶範圍 3/3 通過。各 Given 真正落地，沿原 session 發出單次擴充查詢，驗證 401／404／409、錯誤資訊與權威快照及適用的 owner 再查。完整 log 為 /private/tmp/sl008-t007-t011.txt。
- T012–T016（2026-11-24）完整後端 bddgen 成功，11 案均執行。4 案通過，7 案以產品差異進入 RED，其中 6 案缺 explanationDetails、1 案未知選項目前回 200。斷言重用獨立來源 oracle 並以原回應核對。完整 log 為 /private/tmp/sl008-backend-red.txt。測試全域 tsc 另回報既有分類分析 Vitest 兩檔的 ImportMeta.glob 型別缺口。
- T017–T024（2026-11-24）聚焦兩條首屏 Rule，以 Chromium 390×844、真 API 與測試資料庫執行 8 案。3 案通過，5 案在預期 en 而現況仍為 zh-Hant 的斷言出現 RED，已包括直接開原帳本及反向手動偏好。未發生 undefined step；log 為 /private/tmp/sl008-first-language-red.txt。
- T035（2026-11-24）共用淨額步驟使用真回應內同成員與同幣別的待付款判斷零淨額字樣。既有 helper/真產品 support 跑 2/2 通過，新增零淨額案例由對應結算 feature 核對。
- T036–T042（2026-11-24）Chromium 390×844 聚焦記帳與同行者案例。新綁定均執行：帳本 1 案通過，支出金額與常駐說明各 1 案在預期文案差異 RED。另有一個既有重名 step 因 Given 沒有開啟同行者頁，在執行前置條件時失敗；見 handoff 的 DSL 回交項目。log 為 /private/tmp/sl008-t036-t042.txt。
- T054–T066（2026-11-24）以 Chromium 390×844 跑繁中結算 7 案，所有 Given／When 執行成功，7 案均因現有零淨額、待付款或應付／實付文案差異出現 RED。log 為 /private/tmp/sl008-t054-t066.txt。
- T025–T027（2026-11-24）英文畫面清單的 11 案均在資料到位後進入可見文字斷言，11 案因現版有中文介面文字而出現 RED。log 為 /private/tmp/sl008-t025-t027.txt。
- T043–T049、T051–T053（2026-11-24）繁中還款 4 案的前置狀態均落地。明確拒絕、離線與仍在線各在文案斷言出現 RED。恢復案因現版按鈕叫「查證結果」，在新名稱「查看結果」斷言出現 RED。已保存案例透過真資料庫確認原 POST 成功並只保留一筆。log 為 /private/tmp/sl008-t043-t053.txt。
- T028–T030（2026-11-24）英文狀態 6 案均執行到 Then。5 案因現版仍顯示中文而 RED，分類分析的受控讀取等待因骨架缺少可見狀態文案而 RED。log 為 /private/tmp/sl008-t028-t030.txt。
- T050（2026-11-24）以暫時控制測試定位現版「查證結果」按鈕來單獨驗證結果回讀。1/1 通過，畫面顯示成功，只對原 UUID 送出兩次 GET，POST 共一次，權威快照一致。控制測試已移除，正式 step 使用「查看結果」。log 為 /private/tmp/sl008-t050-control.txt。
- T025–T027 桌機補驗（2026-11-24）Chromium 1440×900 的 11 案全部執行到同一可見文字斷言，均因現版系統介面有中文而 RED。log 為 /private/tmp/sl008-t025-t027-desktop.txt。
- T085（2026-11-24）由未實作後端測試的審查者獨立審查。找到 T016 舊繁中說明只查筆數的不足，已重用同快照 projection 並斷言原本兩條與簡化後一條的實際付款對象。複核通過。正式 API runner 全量 bddgen exit 0，settlement 清單 46 案含新 11 案（/private/tmp/sl008-api-list.txt）。新 11 案重跑仍為 4 通過、7 項有效產品 RED，T016 已通過舊說明斷言並在缺 explanationDetails 時 RED（/private/tmp/sl008-backend-red.txt）。既有結算及帳務權限 50/50 通過（/private/tmp/sl008-api-legacy.txt），既有無參數查詢 support 2/2 通過（/private/tmp/sl008-api-support.txt）。
- T070（2026-11-24）結算讀取以可選 include 取得同快照的解釋分支與精確直接安排。先以單一 BDD 試案例驗證未知選項回 400，接著 API typecheck、正式 bddgen 通過。61 案 BDD 全數通過，含新增 11 案及既有結算／帳務權限 50 案；共用無參數查詢 support 2/2 通過。執行清單與結果為 /private/tmp/sl008-t070-{list,api,support}.txt。
- T071（2026-11-24）同一分支判定同時產生既有繁中說明與結構化 kind，兩種安排 schema 共用付款欄位。API typecheck、變更檔 ESLint 和 Prettier 通過。相同 Test Scope 在 PostgreSQL 18.3 與單一 worker 重跑為 BDD 61/61、無參數查詢 support 2/2。結果為 /private/tmp/sl008-t071-{api,support}.txt。測試程序已退出。
- T031–T034、T086（2026-11-24）Chromium 390×844。重名案例已先開表單，通過重名欄位與來源資料不變斷言。原文案例由真 API 建立兩幣別、分類項目與 100/3 份額，以 DB 獨立 oracle 驗帳務；中文原文通過，僅未分類尚無英文標籤出現有效 RED。紀錄 /private/tmp/sl008-web-original-member-red.txt、/private/tmp/sl008-web-original-red.txt。
- T067–T068（2026-11-24）正式 Web bddgen 成功。英文結算的三個 Chromium 案例都從真 API 取得正確結構化資料；Then 因產品 Web 尚未帶 include 而出現有效 RED。log /private/tmp/sl008-t067-red.txt。
- T069（2026-11-24）獨立審查發現英文關鍵詞及數值方向覆蓋不足，已補 11 個畫面的重點語意、圖表明細對話框、三筆循環小數份額及負淨額斷言，複核條件已滿足。Chromium 390×844 五份 feature 共 44 案，5 PASS、39 有效產品 RED；修正後 12 案補跑均為有效 RED。紀錄 /private/tmp/sl008-web-{red-list,full-red,review-retest}.txt。
- T072（2026-11-24）React 掛載前已完成首選／手動偏好解析。Chromium 手機 8/8，桌機 16/16（含同名生成探針），WebKit 8/8。macOS 14 的 WebKit 2251 不支援 Playwright 1.64.1 的 PushAPIEnabled 設定，使用本機暫時 preload 只忽略該明確錯誤，其餘仍使用真 WebKit。390×844 與 1440×900 登入／帳本繁中英文比對 4/4，檔案 .cache/008-implement/screens/，帳本未移植的英文文案於 4G 完成。Web typecheck 通過。
- T073–T074（2026-11-24）改支出金額欄名及既有 Playwright 選取器。Chromium 手機目標 2/2，舊支出修正與份額 14/16。兩案只因共用 T035 要求「已結清」而 RED，保留相同斷言移至 T077 的相依回歸。已對齊的標籤與測試落點無需重構。紀錄 /private/tmp/sl008-t073-{focused,regression}.txt。
- T075–T076（2026-11-24）移除同行者常駐兩段說明和欄位對已刪提示的引用，保留錯誤引用。手機目標兩案與既有名稱／生命週期回歸通過；無重構必要。紀錄 /private/tmp/sl008-t075-{focused,regression}.txt。
- T077–T078（2026-11-24）同幣別依成員及付款安排判斷零淨額狀態；英文結算讀取同快照擴充、繁中沿用原有查詢。手機 10/10、舊結算及支出修正 20/20（含 4C 延至本階段的兩案）、桌機英文說明 3/3，Web typecheck 通過。兩頁已共用餘額判定，無額外重構。紀錄 /private/tmp/sl008-t077-{focused,regression,desktop}.txt。
- T079–T080（2026-11-24）新增明確版本衝突的原因與下一步，及依瀏覽器連線狀態出現的待確認提示。原 UUID 的查證流程與寫入次數沿用。手機 4/4，舊獨立還款 10/11；更新舊共用文案定位後第 11 案通過。沒有額外重構。紀錄 /private/tmp/sl008-t079-{focused,regression,unknown}.txt。
- T081–T082（2026-11-24）依功能分組保存語意鍵、中英資源、具名插值及各語言單複數。已核對受測 11 個畫面、6 種狀態及原文帳務。Chromium 390×844 與 1440×900 各 26/26；WebKit 首屏 8/8、英文日曆 1/1（沿用 macOS 14 驅動相容 preload）；語言／資源／錯誤映射 Vitest 9/9。已整理資源鍵與共用留白，未增設第二套渲染路徑。紀錄 /private/tmp/sl008-t081-{final-mobile,desktop,webkit,webkit-dates,unit}.txt。
- T083（2026-11-24）正式 API/Web bddgen 通過。六份新 feature 為 Web 44/44、API 11/11。API 合計 61/61 與無參數 support 2/2；Web 舊回歸 54/54（53 案整批通過，替代掛載入口補相同語言初始化後付款人空白 1/1），支出與幣別追加回歸 19/19。Vitest 全部 39/39。四組尺寸與語言驗收畫面，加上在線與離線情境，共 6/6。工作區 lint、typecheck、build 與 git diff --check 通過。Vite 主 JS 610.40 kB／gzip 190.03 kB，較 T002 增 110.02 kB／gzip 36.48 kB，仍有大於 500 kB 提示；分類分析 JS 374.89 kB／gzip 108.66 kB。紀錄 /private/tmp/sl008-t083-*.txt，畫面與來源指紋見 acceptance-evidence.md。


## IF-01 C 類手動語言入口

- T087、T092–T118、T088。前端 DSL 拓樸與 bddgen 通過，涵蓋 39 份 feature、1,111 個 Gherkin steps。實作前的登入與還款待確認探針均因沒有語言入口出現預期 RED。兩輪獨立審查後，將導覽、重訪、重新登入與查證拆成單一 Act，補齊還款可見文案、原 UUID、唯一次寫入與真帳務快照。審查發現的旅行成功回饋改用語意鍵，於畫面依目前語言翻譯。
- T089。手動切換 12 案在 Chromium 390×844、Chromium 1440×900 與 WebKit 390×844 各全數通過。WebKit 沿用 macOS 14 的相容 preload，重訪案例使用同一 browser context 的新分頁，避免版本間關閉原 Playwright page 時干擾新分頁。320×844 通過登入、原帳本與還款待確認 3 案。最後的登入排版微調後補跑 390×844 全 12 案及 320×844 登入案。
- T090。Chromium 整合 102/102，含手動偏好、首屏英文化、繁中文案、還款、Google 登入／帳號隔離與旅行管理及查證。Vitest 39/39。工作區 `pnpm typecheck`、`pnpm lint`、`pnpm build`、`git diff --check` 通過。React Doctor 未對語言選單報告診斷，工作區仍有 6 則維護性與效能提示，Vite 仍有主 bundle 超過 500 kB 提示。另行執行的測試專用 `tsconfig.tests.json` 仍有既有 fixtures 與 ImportMeta 型別問題。
- 實作畫面保存在工作區 `.cache/008-language/evidence/`，包括登入桌機與手機、帳本桌機與手機、還款待確認手機選單展開及 320px 窄幅。與 Pencil d1 核對選單位置、尺寸、展開方向、選取提示、登出與查證可見性。實作畫面使用真測試資料與現行帳本內容。日誌在 `/private/tmp/sl008-c-*.log`。
- T091 的實作版確認及 T119／T120 的基準回填與獨立核對見下方紀錄。B 類集中人工文案驗收 T084 另行保留。

- T091 最新驗收畫面以英文用詞統一後的工作樹重新擷取。Chromium 在 390×844 與 1440×900 各通過登入切換、帳本切換、還款待確認三案。實作版畫面與 [來源指紋](../../ui-baseline/evidence/language-product-source-sha256.txt) 同批保留，清單 SHA256 為 `a1ab54e69453343a15a3469ad3170d7bd35f9a1c5413ca5b4f8d8622e7cce5b7`。[手機登入選單](../../ui-baseline/evidence/language-login-mobile-product.png) · [桌機帳本選單](../../ui-baseline/evidence/language-ledger-desktop-product.png) · [手機還款待確認](../../ui-baseline/evidence/language-repayment-mobile-product.png)。

- T091 使用者對最新手機登入、桌機帳本、手機還款待確認三張畫面回覆「包含」。T119 回填 [基準 v0.4](../../ui-baseline/language-selector-baseline.md)，T120 獨立審查核對畫布與文件索引、三張原產品截圖及新預覽、全部可重用元件引用，以及 14 張既有畫面重匯完全相同。Pen CLI 重新開啟正式基準成功，169 個產品檔案指紋比對成功。
