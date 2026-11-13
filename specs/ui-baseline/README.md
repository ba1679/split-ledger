# 旅帳 UI 現況基準

## 版本與確認狀態

- 已確認基準版本：`baseline-v0.1`，2026-11-13，Asia/Taipei。
- 模式：新版 `/ui-plan` 的明確「建立基準」模式；本次只寫 `specs/ui-baseline/**`。
- 固定產品 commit：`29f420a43707fe1707fc36bba914fb361bc0a229`。該 commit 提交 skill chain 改版，產品碼沿用原現況。
- 設計檔：[split-ledger.pen](split-ledger.pen)。由 Pen 官方 CLI 的設計工具建立、匯入為可編輯圖層、檢查並儲存，非截圖包裝或假副檔名。
- v0.1 已批准版本設計檔 SHA256（取自 `6bb68a5`）：`fcf567aa8ee35bd20bcc0d5df4071f35fd821387584e96fa57729ebcc4916331`。
- 確認狀態：`approved`。確認者為本 chat 使用者，日期 2026-11-13（Asia/Taipei）；在 DateField 排版修正交付後，使用者原回覆：「可以，這版 baseline 我確認，請把設計稿、預覽與相關文件一起 commit。」
- 有效確認範圍：本版四張主畫面、名稱錯誤狀態、13 個共用元件與 DateField 元件區位置修正，包含文件已揭露的替代字型差異；不涵蓋尚未收錄的產品畫面或未驗證狀態。
- 目前已批准基準：`baseline-v0.1`；對應本節設計檔雜湊與本次有效確認範圍。
- 已批准基準 Git 版本：`6bb68a5023d43aa6beadaee4453676c30ba635f7`。後續 plan 記下該實際 commit＋路徑＋畫面 ID＋同版預覽，不以可變的 HEAD 或版本別名代替。

目前工作檔另含 `baseline-v0.2` 的旅行帳本範圍，已於 2026-11-14 取得使用者確認，狀態為 `approved`；詳見 [旅行帳本版本、預覽與核對](ledger-baseline.md)。本節 v0.1 的原確認持續有效；新增旅行帳本的確認原文與範圍另記於該文件。原版 13 個共用元件本輪均未變更；目前整份工作檔的雜湊另記於旅行帳本文件，未涵蓋畫面與狀態仍不在批准範圍。Pen 用量限制使畫布仍保留旅行帳本的 pending 標記，正式確認以文件紀錄為準。

## 範圍與畫面索引

本次採樣「我的旅行＋新增旅行 dialog」的桌機／手機；延伸自實際產品，沒有套用尚未實作的 006 設計或另提新版面。正式路由皆為 `/trips`。

| 穩定畫面／狀態 ID | .pen frame ID | 尺寸 | 設計預覽 | 產品證據 |
| --- | --- | --- | --- | --- |
| `trips/main/desktop` | `GlUDZ` | 1440×900 | [我的旅行・桌機](previews/trips-desktop.png) | [產品桌機](evidence/trips-desktop-product.jpg) |
| `trips/create/desktop` | `o337R` | 1440×900 | [新增旅行・桌機](previews/trips-create-desktop.png) | [產品桌機 dialog](evidence/trips-create-desktop-product.jpg) |
| `trips/main/mobile` | `i1wuXl` | 390×844 | [我的旅行・手機](previews/trips-mobile.png) | [產品手機](evidence/trips-mobile-product.jpg) |
| `trips/create/mobile` | `UfWmt` | 390×844 | [新增旅行・手機](previews/trips-create-mobile.png) | [產品手機 dialog](evidence/trips-create-mobile-product.jpg) |
| `trips/create/empty-name` | `BJnXv`，共用狀態元件 | dialog 352×548.18；元件匯出含陰影為 652×849 | [名稱錯誤元件](previews/trips-create-empty-name-component.png) | [產品手機錯誤狀態](evidence/trips-create-empty-name-mobile.jpg) |

圖層命名包含穩定畫面 ID；主 frame 的 context 保存版本、產品 commit 與 approved 日期。畫布上方放共用元件，下方為桌機兩張與手機兩張；說明區與產品畫面分開。

- 正式落點：`apps/web/src/features/trips/Trips.tsx`、`TripForm.tsx`。
- 共用落點：`AppShell.tsx`、`FormDialog.tsx`、`DateField.tsx`、`components/ui/button.tsx`、`components/ui/input.tsx`。
- 樣式來源：`apps/web/src/design-system.css`、`styles/base.css`、`styles/responsive.css`、`components/app-shell.css`、`components/ui/forms.css`、`components/date-picker.css`、`features/trips/journeys.css`。
- 業務依據：`specs/truth/features/frontend/trips/trip-creation-and-dates.feature` 與同模組 `dsl.md`、`specs/truth/contracts/groups/trips.yaml` 及 `components/schemas/trips.yaml`。本基準不重新定義業務規則。

## 資料與執行環境

- 使用固定 commit 的真實 React／Vite 前端與 Fastify API、正式 migrations 及既有 seed helpers；沒有重建 HTML prototype 或假後端。
- 重用本機既有 `test-db:54330` 容器，另建立本輪獨立 worker database；不讀寫開發資料庫或使用者帳本。登入以測試 session 及虛構使用者「小旅人」準備，不驗證真實 Google OAuth。
- 固定列表順序：台南的慢週末（2027-04-03—2027-04-05，0 筆支出），日本春日旅行（2027-03-10—2027-03-15，1 筆支出）。資料定義及環境見 [runtime.json](evidence/runtime.json)，不保存 session cookie。
- 執行使用 Node 24.21.0、現有依賴；repo 宣告 Node 24.22.2，本輪未安裝或變更版本。shared 的舊本機 dist 缺少現行 export，已用現有 TypeScript 重建忽略的 dist 後啟動；產品原始碼未修改。
- 視覺核對在 Pen 桌面整合 Chromium 的 CSS viewport 進行，DPR=1；不是實體手機、WebKit、完整 BDD 回歸或輔助科技驗證。
- 證據 JPG 為 Pen 瀏覽器工具輸出，壓縮與顯示銳利度不同於畫布 PNG；不以逐像素相似百分比判定一致性。

## 共用元件與樣式

| 元件 | .pen ID | 用途／範圍 |
| --- | --- | --- |
| Button / primary / add | `O4hvR` | 桌機新增入口；手機另保留產品的緊縮 padding |
| Button / primary / create | `rRThD` | 建立旅行 |
| Button / secondary / cancel | `xefkP` | 取消 |
| Input / trip name | `tQ46c` | 名稱 placeholder 與外框 |
| AppShell / desktop sidebar | `NUK7c` | 228px 側欄、品牌、導覽、帳號頁尾 |
| AppShell / mobile navigation | `KOhJt` | 65px 固定底部導覽 |
| TripCard / desktop / green | `LPt9p` | 桌機卡片 538×343.79 |
| TripCard / mobile / green | `n03N67` | 手機卡片 350×318.79 |
| FormDialog / desktop / default | `ZQg47` | 桌機 480×414.98 panel |
| FormDialog / mobile / default | `EXIer` | 手機 352×521.38 panel |
| FormDialog / mobile / empty-name error | `BJnXv` | 名稱錯誤，動態增高 |
| DateField / desktop / optional | `yVUqP` | 桌機 200px 日期欄位 |
| DateField / mobile / optional | `BsK5x` | 手機 290px 日期欄位 |

共 13 個 reusable components，畫面及複合元件包含 20 個實例引用；暖色卡片保留獨立可編輯圖層。這是設計元件整理，產品碼沒有因此抽換或重構。

- 色彩變數：bg `#f6f6f0`、panel `#ffffff`、ink `#192e29`、muted `#5b6b64`、green `#245c49`、line `#dce3dc`、danger `#a83232`。
- 產品卡片圓角 12px、內容 padding 24px；按鈕圓角 7px；名稱輸入外框 `#bccac0`。
- 畫布使用 Noto Sans TC 與 Noto Serif TC 作為可編輯替代字型；產品本身仍使用原 CSS 系統字型及 Georgia。差異見下節。

## 比對、差異與處理

| 對照項目 | 產品現況／預期 | 畫布處理與結果 |
| --- | --- | --- |
| 桌機主結構 | 228px 側欄；主區從 x=228 起、左右 padding 56；兩欄卡片 | 依實際 DOM 匯入並核對，同版區塊與資訊位置保留 |
| 手機主結構 | 390px；左右 padding 20；主標自然換行；單欄卡片；底部 nav y=779、高 65 | 修正匯入後的卡片列高及 nav 高度；frame 固定 390×844，保留正常滾動範圍 |
| 桌機 dialog | x=480、y≈242.51、480×414.98；日期雙欄；取消／建立靠右 | 依產品量測放置，背景遮罩 `#12251d66`，動作與欄位位置一致 |
| 手機 dialog | x=19、y≈161.30、352×521.38；日期單欄；未使用滿版抽屜 | 依產品量測匯入；不改成其他版型 |
| 選填標籤 | 日期 label 14px／600；選填 12px／400、muted，間距 7 | 匯入會合併樣式，已拆回獨立可編輯文字與間距 |
| 品牌標記 | 圓內 t. 置中 | 修正匯入對齊，保留原有品牌結構 |
| 字型與字形 | macOS 系統字型＋Georgia；JOURNEY 字面與筆畫依 Georgia | Pen 回報 Georgia 無效，採 Noto Serif TC；中文用 Noto Sans TC。字形、粗細、行盒有細差，屬本版使用者已確認的已知差異；不宣稱像素相同，不反向修改產品 CSS |
| 邊框與裝飾 | 側欄右線、操作區頂線、景觀圓弧溢出裁切 | 匯入有多邊框色簡化警告，已按來源顏色／邊保留；裝飾圓弧裁切為產品既有呈現 |
| 手機下方第二張卡片 | 844px 初始視窗未完整展示第二張卡，內容可向下捲動 | 可編輯內容仍保留在 frame 內並裁切；不縮卡片或移動底部導覽來塞滿畫面 |
| 元件預覽陰影 | dialog 有外陰影 | 狀態元件單獨匯出包含陰影邊界，不能拿 652×849 當產品 dialog 尺寸 |

目前沒有自行接受或修改的新設計意圖；上述字型替代已隨本版獲使用者確認。若要求精確 Georgia 字形，需另決定設計工具的可用字型／向量策略，不能把目前替代字型當成產品改版要求。

## 行為與狀態交接

- 我的旅行：顯示旅行名稱、起迄日與已保存支出總筆數；卡片進入 `/trips/:id`。日期未定時顯示既有 fallback 文案，仍依 truth。
- 新增旅行：從「新增旅行」按鈕開啟 modal；旅行名稱必填，開始日與結束日各自選填。日期可文字輸入或由既有日曆控制選擇；本輪只收錄日期欄位，日曆展開畫面留下一批。
- 名稱空白：實際操作顯示「請填寫旅行名稱。」、focus 回到名稱欄位；錯誤 panel 有可編輯狀態元件及產品證據。
- 日期順序：實際輸入開始 2027/03/10、結束 2027/03/09，送出顯示「結束日不能早於開始日。」，三個輸入值保留，沒有建立旅行。
- 取消：實際操作關閉 dialog、焦點返回「新增旅行」，列表仍為兩筆；本輪未新增任何產品旅行。草稿隨表單關閉而清除，這項由現有元件狀態生命週期判讀。
- 成功保存：現有程式會更新快取、關閉 dialog 並導向新旅行帳本 `/trips/:id`，不是只返回列表。本輪未實際送出有效建立，不將程式閱讀當成成功保存驗證。
- 保存中：來源程式顯示「儲存中…」，停用提交／取消且 busy 時不允許 Esc／外部點擊關閉；本輪未操作保存中狀態。
- 保存結果未明：來源程式用原 UUID 查證，無法確認時保留草稿並顯示既有訊息；本輪未執行網路故障／查證流程。
- 空白列表、載入、讀取錯誤、長名稱與日曆展開：未納入本批視覺驗收；沿用 `QueryState`、既有 feature／DSL 與元件規則，後續碰觸時補必要 frame／驗證，不宣稱本版已覆蓋全產品。
- 基本鍵盤、Esc／外部點擊及權限語意仍依原元件／truth；本次只驗證上列焦點與取消，不宣稱已完成全部無障礙驗收。

## Responsive 核對

- 1440×900：桌機兩欄與側欄，實際取得產品證據與同尺寸設計預覽。
- 390×844：單欄、手機字級、固定底部導覽、日期單欄；文件寬度 390，未觀察到水平溢出。
- 768×900：額外實測文件寬度 768、側欄寬 190、卡片雙欄各 247，沒有水平溢出；不另重畫一組設計。
- 產品切換點為 700px；1000px 以下縮側欄／主區 padding，1500px 以上調整主區 padding。中間寬度、真實資料換行與高度按原規則適配；主要資訊位置、入口或生效時機變更需重新確認。
- 操作觀察原始結果：[checks.json](evidence/checks.json)。這是本次 focused UI 核對，不替代既定完整產品回歸。

## Prototype 選用

- 選用方式：不製作。
- 理由：本次記錄既有現況，已直接操作真實產品；沒有待原型解答的新互動決策。
- 原型版本、執行狀態與入口：不適用；不製作是合法完成狀態，沒有原型待辦或同步關卡。

## 資源與續跑

- profile=`low-memory-16gb`，可觀測 RAM=16GiB。主代理直接執行，未建立輔助代理；同時重型工作上限 1，無測試 worker。
- 量測見本輪工具紀錄；入口 swap 已有使用量，未以 swap 非零宣稱壓力失敗或記憶體穩定。
- 本輪啟動的 web `127.0.0.1:44191`、API `127.0.0.1:62803`（runtime PID 29746）已正常關閉，命令 exit=0 並輸出 BASELINE_CLOSED；獨立 worker database 隨 teardown 移除。原有 Docker 容器維持運行。
- Pen headless 與桌面 CLI sessions 均已退出；使用者的 Pen 桌面程式保留開啟本 .pen，工具環境 OS 記憶體回收未另作推定。
- 下一入口：後續 plan 可引用本版已確認範圍；若新增需求改變設計意圖，另外取得該變更範圍的確認。下一批基準可按需增補其他主要產品頁。
- 不將本次確認擴大為整套產品、未涵蓋狀態或 006 設計的批准。

## 更新紀錄

| 日期 | 版本 | 變更 | 狀態 |
| --- | --- | --- | --- |
| 2026-11-13 | baseline-v0.1 | 固定 29f420a 現況，交付我的旅行／新增旅行桌機手機 4 張、名稱錯誤元件、共用元件與核對證據 | pending，待使用者確認 |
| 2026-11-13 | baseline-v0.1 排版修正 | DateField 桌機元件移至 (300, 300)、手機元件移至 (560, 300)，兩者間隔 60px；工具檢查所有頂層畫面／元件無重疊，畫面內容與元件實例維持原樣 | pending，原確認範圍不變 |
| 2026-11-13 | baseline-v0.1 確認 | 使用者確認 DateField 排版修正後的本版基準，記錄原回覆、有效範圍及最終設計雜湊；設計說明與 frame context 改為 approved | approved |
| 2026-11-13 | baseline-v0.2 旅行帳本 | 沿用已確認共用元件，新增桌機／手機主視窗與支出區捲動視窗、空帳本元件、旅行內導覽；詳見 ledger-baseline.md | pending，僅新增範圍待確認 |
| 2026-11-14 | baseline-v0.2 確認 | 使用者確認旅行帳本；保存原回覆與有效範圍，設計稿、預覽及文件一起提交。Pen 用量限制導致畫布批准標記尚未同步 | approved，標記同步限制見 ledger-baseline.md |
