# UI 設計與畫面交接：旅行分類花費分析

## 介面範圍與模式

- C 類一般需求，只寫 `specs/plans/007-category-expense-charts/ui/**`，不修改產品、truth 或現況 baseline。
- 對應 plan IF-01、spec US1／US2、FR-001～014、NFR-001～002，以及四份 acceptance。使用者已同意 shadcn/ui Chart＋Recharts 與 hover／手機／鍵盤方向。
- 2026-11-19 使用者表示「pen 我換帳號了，可以再試試看」，後續回覆「continue」。桌面正式設計工具已恢復可用，完成本版設計；兩則回覆均非本版視覺批准。
- 目前 **design-v1，approved**。使用者於 2026-11-19（Asia/Taipei）明確回覆「UI 確認 ok」，本版設計依賴已解除，可接續前端細化；產品尚未實作或驗收。

## 固定基準與本次差異

- 固定基準 commit：`8fc9f94134c66ffd29918014b950894b1007aa86`；`specs/ui-baseline/split-ledger.pen`、`ledger-baseline.md` 與同版 ledger 桌機／手機／支出區預覽。
- 固定產品 HEAD：`d00f8b066ccb37645eb5b12ba16731a012c5d928`；已讀 TripLedger、AppShell、design-system 與等待規則。本輪未啟動真實產品，不宣稱完成目前產品視覺驗收。
- 官方工具對來源 2.22 檔的桌面讀取呈空畫布；本輪唯讀取用來源圖層與變數，透過 Pen 正式 Insert／Copy／Update 匯入相關元件、重接實例，再從帳本 frame 延伸，沒有手工生成或修改 .pen。
- 來源對照：基準桌機 K4fUl／手機 j4FlQR 在本檔映射為 NfzGn／Ds2n2；sidebar NUK7c→QGH1n、mobile navigation KOhJt→E5raRQ、primary button O4hvR→rTB5i、desktop trip navigation i6fhCJ→CzPkd。對照框與既有實例供重用，不擴大原批准範圍。
- 已以官方 Export 取得匯入後桌機來源，視覺核對側欄、標題、totals、結餘與列表位置，與既有預覽一致；沒有以像素百分比宣稱完全相同。畫布仍採已揭露的 Noto Sans TC／Noto Serif TC 字型替代。
- 原始 baseline SHA256 保持 `144a81b3086885bf57f5a694a78ed75f089f032730f91767088598ed1572a3d3`，本輪未覆寫。
- 新設計：從帳本新增「花費分析」入口，已確認獨立頁 `/trips/:id/analysis`；保留原帳本資訊與記帳流程。桌機兩卡並排，手機上下堆疊，兩圖共用幣別控制，常駐明細搭配 hover／點按資訊。

## 設計交付與確認

- 可編輯設計：[split-ledger-007.pen](split-ledger-007.pen)，**design-v1**。
- 使用者確認時的設計 SHA256：`5337ee04327ee2e2e3076ae6055cf6c72a99d38435f0af4f874faa9bcbd45665`。批准標記與索引更新後，官方 save 的交付 SHA256 為 `d74e31d53c59f19ab2b4e5991808673fd599020b81dd0667a186f98ded8f3968`；只更新索引文字／顏色與 frame context，八張產品畫面／狀態預覽未變，沿用本次確認。檔案由桌面工具儲存為其支援的 2.21 格式；不是手工降版來源檔。
- 確認狀態：**approved**。確認者：本 chat 使用者；日期：2026-11-19（Asia/Taipei）；原回覆：「UI 確認 ok」。對應前一輪已展示的 design-v1 設計檔、桌機／手機與互動預覽。
- 有效確認範圍：新增入口、獨立分析頁、兩圖排列與圓環外觀、共享幣別、提示框／手機資訊卡、共用狀態及下列呈現規則。舊基準的既有有效確認不重問。
- 交付共 9 張 PNG，包含兩張入口局部、兩張主視窗、手機捲動、兩張互動狀態、一張狀態總表及一張版本索引。這些是靜態設計，不是已實作產品或可操作原型。

## 畫面交接索引

全部新設計固定為上列 design-v1 交付 hash。表末為設計確認狀態；產品比對仍 pending，設計批准不等於產品驗收。

| 畫面／狀態 ID | 資訊責任與區塊順序 | frame／預覽／尺寸與資料 | 正式路由／元件 | Feature／tasks | 狀態 |
| --- | --- | --- | --- | --- | --- |
| ledger/analysis-entry/desktop | 既有標題、記一筆、同行者／結算後新增分析入口 | O24TBs；[桌機入口](design-previews/O24TBs.png)；1440×360 局部；沿用日本旅行基準資料 | `/trips/:id`；TripLedger 的旅行導覽 | 四份 acceptance 的開啟分析；tasks 未建立 | approved |
| ledger/analysis-entry/mobile | 原導覽後下一列全寬分析入口，不擠入底部第六個入口 | zS1cF；[手機入口](design-previews/zS1cF.png)；390×500 局部；沿用基準資料 | 同上 | 同上 | approved |
| analysis/main/desktop | 返回帳本、標題、共用幣別、範圍、兩圖與明細 | z7pOeL；[桌機分析](design-previews/z7pOeL.png)；1440×900；台南旅行混合消費示例 | 已確認 `/trips/:id/analysis`；分析容器與 Chart cards | 分類花費與幣別.feature | approved |
| analysis/main/mobile | 同資訊，上下排列兩圖，保留固定原底部導覽 | vrPz0；[手機分析](design-previews/vrPz0.png)；390×844；同資料 | 同上 | 同上 | approved |
| analysis/group/mobile-scroll | 同一頁 scrollY=480，展示團體圖完整內容 | vjeyS；[手機團體圖](design-previews/vjeyS.png)；390×844；不是另一條路由 | 同一分析頁捲動位置 | 同上 | approved |
| analysis/detail/desktop | 個人餐飲 hover 提示，常駐資料不消失 | ZAxvn；[桌機 hover](design-previews/ZAxvn.png)；1440×900；TWD 300／50% | ChartTooltip／分類控制 | 圖表互動與讀取狀態.feature | approved |
| analysis/detail/mobile | 點按或鍵盤選取後的資訊卡及 44px 關閉操作 | Lj8SI；[手機資訊卡](design-previews/Lj8SI.png)；390×844；TWD 300／50% | 同頁資訊卡，不是分類支出詳情頁 | 同上 | approved |
| analysis/states | 初載、空、失敗、單圖零值、背景更新／失敗、離線、無共同消費、長內容 | GS7hF；[九種狀態](design-previews/GS7hF.png)；1440×1450 元件審查總表；標號不屬於產品文案 | QueryState／waiting／分析卡片，按下列註記適配手機 | 同上及 FR-011～013 | approved |
| design/index | 版本、來源、資料與批准範圍索引 | S1EcWx；[設計索引](design-previews/S1EcWx.png)；frame 800×660，含外框 PNG 801×661 | 僅設計交接，不出現在產品 | 不適用 | approved |

### 示範資料與共用元件

- 主分析頁採 acceptance 混合消費示例：三人分攤餐飲 900、只有同行者分攤的交通 600、自己購物 200、他人代付給自己的購物 100、他人單人餐飲 100；全部 TWD。個人 600＝餐飲300＋購物300；團體1500＝餐飲900＋交通600。
- 入口局部沿用日本旅行原基準資料，只表示入口新增的位置，不把該資料與台南分析頁視為同一條原型操作證據。實作比對時須準備同一旅行與同一資料，不能拿此示例差異當作產品通過證據。
- 分析卡片 reusable：bUkC4／asucC（桌機個人／團體）、LXG8m／e7STwc（手機個人／團體）。主視窗以實例引用；原 AppShell 與 Button 基礎沿用來源元件。
- 色彩：暖白 `#f6f6f0`、白色卡片、ink `#192e29`、muted `#5b6b64`、line `#dce3dc`；餐飲 `#2D6A57`、購物 `#BC8063`、交通 `#A58B42`。同一分類在兩圖同色，文字明細不依賴顏色辨識。
- 桌機主內容沿用側欄228、左右56、上48；卡片間距16、圓角12、內距24。手機左右20、卡片內距20、間距16；沿用700px 左右既有 AppShell breakpoint，中間寬度卡片自然單欄，不增加水平捲動。
- 主標桌機36／手機28、卡片標題18、內文14、補充12～13；數字沿用 serif 層級。長分類自然換行、明細列隨內容增高，金額不可裁切；多分類全部列出，不自動併成「其他」。

## 行為與畫面註記

### 入口、幣別與統計範圍

- 「花費分析」前往已確認 `/trips/:id/analysis`；返回帳本維持目前旅行。側欄與手機底部列沿用既有旅行內入口，不增加第六個底部導航。
- 幣別來源為 API 的全部已有支出幣別。已確認呈現規則：同頁保持使用者仍有效的選擇，首次或原幣別消失時選 currencyCode 升序的第一項；無任何支出時隱藏幣別選擇，不要求先選不存在的幣別。只有一種幣別仍清楚顯示其代碼。
- 兩圖共用同一幣別，但分母各自獨立。個人為實際份額，團體為至少兩人分攤的原金額一次；圈心為各圖總額，不是付款額或淨額。
- 圓環為圓餅圖的呈現變體，保留占比，中央顯示總額；不改計算規則。不新增鑽取、支出清單或未定義的統計指標。
- 占比最多兩位小數、末位四捨五入並去尾零；極小正數顯示「小於0.01%」避免誤認完全沒有消費。繪圖仍使用研究定義的精確來源近似權重，不從顯示占比重算。分類與總額顯示尾差依既有 formatter，不調整份額。
- 全旅行無共同支出時，不畫團體空圓餅，以「這趟旅行目前沒有共同消費。」取代團體卡片；仍有其他幣別的共同支出時，所選幣別的團體零值則保留該卡的無符合支出狀態。兩種情況不混用。

### Hover、手機與鍵盤

- Hover 顯示當前圖的分類、幣別金額與占比，提示框不承擔唯一資訊來源；離開時關閉。
- 手機點按扇形或常駐分類明細，顯示同一資訊卡；點選其他分類切換，關閉按鈕或 Escape 關閉，焦點返回原分類控制。提示可在 viewport 邊界內調整位置，不遮住固定底部導覽。
- 鍵盤可聚焦分類明細控制，以 Enter／Space 取得同資訊，再移動或關閉；focus ring 保持可見。手機關閉框44×44，分類列操作高度至少44。
- 這些是本版已確認的設計交接規則，尚未建立可操作原型或執行瀏覽器鍵盤／觸控驗證。產品端仍需按既有 BDD E2E 落地。

### 狀態、權限與恢復

- 初載只有 skeleton，不顯示假零；背景更新保留已確認圖與明細，以小型圖形 busy 回饋並有輔助名稱，延續006的等待規則，不加可見的 loading 字樣。
- 初讀失敗有重試；背景失敗明示上次資料並可重新更新；paused／離線停止無限動畫、保留已確認內容。狀態總表只展示必要組件，不要求用小圓環取代正式主圖尺寸。
- 真空、單圖零值、單分類100%、極小分類與長內容的規則分開：零值不畫代表消費的扇形，正數但顯示取整為零的分類不從明細遺漏；單分類使用完整圓環。
- 未登入、他人、trash／purged 沿用既有 TripAccessState／權限與生命週期流程；不因保留快取而洩漏帳務。切換旅行／帳號或遲到結果不得冒充新範圍。
- 分析為唯讀，不另創保存確認或結果未明 dialog；帳務 mutation 的 unknown 及旅行管理仍依既有流程。

## Prototype 選用與問題決策

- **不製作**。本版以可編輯 frame、各操作狀態與明確註記交接；尚無須另做程式原型才能回答的獨立問題。不建立整站 prototype 或假帳務引擎。
- 沒有 prototype 版本、入口、已操作證據或待同步前置。若設計 review 提出需體驗的具體問題，再依 skill 規則限縮選用。

## 核對、工具與資源

- 官方工具完成 Insert／Copy／Update／Export／save；已逐張查看桌機主畫面、手機主畫面、團體捲動、手機資訊卡、入口與狀態總表，修正複製側欄引用、導航位置、按鈕尺寸與狀態總表取整溢出。
- 最後工具檢查：19個頂層 frame／元件，頂層互相重疊0、缺失 ref 0；桌機主畫面／hover、狀態總表、索引的內部 clipping 檢查為空。
- 手機長頁 content 被844px viewport 裁切，另提供scrollY=480；入口為360／500px局部，底部導覽或原帳目不在局部範圍。這些是明確的視窗裁切，不把所有 clipping 訊號一概當零或自行刪除內容。
- profile=low-memory-16gb；RAM／swap 入口權限未知，不宣稱已證明記憶體穩定。本輪由主代理直接設計，未新增代理／產品server／test worker。
- CLI headless 仍引用原帳戶並回報額度上限；改用使用者已切換帳號的桌面正式工具後可用，未繞過帳戶限制。官方 CLI 0.3.16 僅暫存安裝；薄 relay 只傳遞 CLI 官方命令，未修改設計格式。
- 中斷前／恢復的 CLI sessions 與資源退出資訊見 handoff。本輪新 .pen 由官方 save 保存；尚未做產品 E2E、WebKit、真機操作、套件安裝或完整人工輔助工具驗證。

## 實作與驗收交接

- 正式資料依據：`GET /api/trips/{tripId}/expense-analysis`，一次回 currencies、ownerMemberId、hasSharedExpenses、兩圖精確分類／總額；UI 不擴張資料範圍或成員代看權限。
- 前端切分建議：TripExpenseAnalysis 容器、SharedCurrencySelector、CategorySpendingCard、CategoryDetails、CategoryInfo；共用 Chart 使用 shadcn/ui＋Recharts，沿用 QueryState／waiting。名稱是落地建議，不是已新增檔案。
- 第一組代表性比對為 analysis/main 的1440×900與390×844；完成固定設計／同資料比對後，再展開同卡片的互動與狀態。未來 validation 記錄預期／實際／差異／版本與處理證據，保留最終獨立 UI 家族審查。
- 產品驗收通過後，tasks 須安排新增分析頁、入口與必要共用卡片的 baseline 回填及獨立核對。一般 ui-plan 不提前修改 baseline。
- **下一步**：本版確認與原回覆已保存，完整前後端 `/dsl-refine` 已完成並經獨立審查；介面feature／DSL與本索引的對照見 `../dsl-refine-review.md`。可交 `/tasks`；尚未實作或驗收產品，本版設計與原確認範圍不變。

## 確認紀錄

| 日期 | 設計版本／範圍 | 確認者與原回覆 | 結果 |
| --- | --- | --- | --- |
| 2026-11-19 | design-v1；上述九個索引範圍及呈現／互動註記；確認時 hash 5337ee04… | 本 chat 使用者：「UI 確認 ok」 | approved；正式工具同步批准標記，產品畫面／狀態預覽未變；交付 hash d74e31d5… |
