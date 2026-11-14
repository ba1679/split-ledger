# 新增支出現況基準

## 版本與確認

- 已確認版本：`baseline-v0.3`，2026-11-14（Asia/Taipei），`approved`。
- 確認者：本 chat 使用者；原回覆：「可以，這版新增支出 baseline 我確認，請把設計稿、預覽與相關文件一起 commit。」
- 模式：新版 `/ui-plan` 的明確建立基準模式；只寫 `specs/ui-baseline/**`，不修改產品、truth 或 skill。
- 固定產品與沿用基準版本：`f9698f91ba5a64827fe8e6801bb48207c59502d8`。原有 v0.1／v0.2 的確認按其範圍持續有效。
- 設計：[split-ledger.pen](split-ledger.pen)，批准後檔案 SHA256：`144a81b3086885bf57f5a694a78ed75f089f032730f91767088598ed1572a3d3`。
- 有效確認範圍：本文件的 6 張新增支出視窗、6 個新增元件／狀態及已揭露差異；不包含編輯／刪除支出、未收錄狀態或完整產品驗收。

## 三區位置與畫面索引

- `00 / 版本與索引`：`QBbzP`，本批索引 `q6E9p`。保留原確認紀錄，保存 v0.3 approved 的來源、畫面與元件 ID。
- `01 / 共用元件庫`：`OKWYQ`，新增成員控制群組 `zzzM8`、必填錯誤 `EdUtG`、幣別搜尋 `m8QTD`，均已隨本版取得確認。
- `02 / 既有產品畫面`：`nObqJ`，新增功能分組 `shRbo`；左桌機、右手機，依初始／共同支出／捲動操作區分三列。為容納索引而向下移動後兩個區域、延長產品區，保留原節點 ID 與區域間距。
- 同版總覽：[版本與索引](previews/baseline-index.png)、[共用元件庫](previews/baseline-components.png)、[既有產品畫面](previews/baseline-screens.png)。

正式路由 `/trips/:tripId/expenses/new`，是獨立頁面。捲動操作區與主視窗屬於同一份表單，不是另開頁面或 dialog。

| 穩定畫面／狀態 ID | frame ID | 尺寸／scrollY | 設計預覽 | 產品證據 |
| --- | --- | --- | --- | --- |
| `expenses/create/default/desktop` | `DYqPD` | 1440×900／0 | [初始桌機](previews/expense-create-default-desktop.png) | [產品](evidence/expense-create-default-desktop-product.png) |
| `expenses/create/default/mobile` | `fpiar` | 390×844／0 | [初始手機](previews/expense-create-default-mobile.png) | [產品](evidence/expense-create-default-mobile-product.png) |
| `expenses/create/shared/desktop` | `XKz6N` | 1440×900／0 | [共同支出桌機](previews/expense-create-shared-desktop.png) | [產品](evidence/expense-create-shared-desktop-product.png) |
| `expenses/create/shared/mobile` | `c01mB` | 390×844／0 | [共同支出手機](previews/expense-create-shared-mobile.png) | [產品](evidence/expense-create-shared-mobile-product.png) |
| `expenses/create/shared-actions/desktop` | `zQocB` | 1440×900／274.5 | [桌機操作區](previews/expense-create-shared-actions-desktop.png) | [產品](evidence/expense-create-shared-actions-desktop-product.png) |
| `expenses/create/shared-actions/mobile` | `A6z1TP` | 390×844／550 | [手機操作區](previews/expense-create-shared-actions-mobile.png) | [產品](evidence/expense-create-shared-actions-mobile-product.png) |

保留完整可編輯長內容，由 viewport frame 裁切；桌機側欄與手機 65px 底部導覽固定，沒有縮表單來塞進一屏。

## 元件沿用與新增元件

- 沿用已確認 AppShell `NUK7c`／`KOhJt` 及旅行內導覽覆寫；Input `tQ46c`、取消 `xefkP`、主要按鈕 `rRThD` 透過實例覆寫文字、寬高與金額字級。
- 支出日期沿用 DateField `yVUqP`／`BsK5x`，實例覆寫為必填標籤及已填值的日期控制。日期與分類於桌機並排，手機上下；手機金額與幣別仍並排，依現有產品呈現。
- 原有 16 個 reusable component 的完整節點資料前後一致；原有 8 張產品畫面重新匯出 PNG 與已確認預覽的 SHA256 全數相同。
- 新增 4 個 18×18 成員控制：radio 已選 `e1vLxv`／未選 `Z9AAg`，checkbox 已選 `ut9P0`／未選 `eB3kh`。集中於 `zzzM8` 並在新畫面以實例引用，見 [成員控制預覽](previews/expense-create-member-controls.png)。
- 新增狀態：支出項目必填錯誤 `EdUtG`，見 [錯誤元件](previews/expense-create-required-item-component.png)；幣別輸入 USD、單一搜尋結果 `m8QTD`，見 [搜尋元件](previews/expense-create-currency-search-component.png)。它們保存可編輯狀態，不要求每個畫面重畫。

## 現況、資料與行為核對

- 使用固定 commit 的真實 React／Vite、Fastify API、正式 migrations 與既有 seed helpers；重用 test-db 容器，另外建立隔離 worker database。測試帳號小旅人與同行者小安均為虛構資料，不讀寫開發帳本。
- 初始表單：項目／金額空白，金額的 0 為 placeholder；JPY、未分類、支出日期 2026/11/14（裝置當地日期），付款與分攤預選小旅人。幣別／分類有裝置偏好時依現有規則，本輪使用新隔離帳號。
- 共同支出草稿：夜市點心、JPY 2000、2027/03/11、餐飲；小旅人付款、小旅人與小安共同分攤，即時顯示每人 JPY 1000。此草稿未保存。
- 空白送出：實際顯示「請填寫支出項目。」與正數金額錯誤，焦點回到支出項目；收錄第一個錯誤欄位狀態，沒有發出有效新增。
- 幣別搜尋 USD：實際只列出 `USD · US Dollar`；點選後選單關閉、顯示 USD 及最多兩位小數提示。金額 12.50、兩人分攤時預覽 USD 6.25；嘗試第三位小數後保留 12.50 並提示位數錯誤。
- 曾以 CDP Enter 嘗試選取幣別，但觀察到選單仍開啟，未計為鍵盤驗證通過；上述成功選取是直接點選選項的結果。
- 取消：實際返回該旅行帳本，API 查詢仍只有原先三筆支出，沒有新增夜市點心。
- 1440×900／390×844 取得產品證據與同尺寸設計預覽；額外 768×900 核對文件寬度 768、側欄 190，未見水平溢出，不另建第三組裝置 frame。
- [環境與資料](evidence/expense-create-runtime.json)、[操作及畫布核對](evidence/expense-create-checks.json)。檔案不保存 session cookie。

## 對照、修正與限制

| 產品現況／預期 | 設計處理與結果 |
| --- | --- |
| 主內容桌機 x=228，左右 padding 56；手機左右 padding 20 | 由真實 DOM 匯入，沿用已確認 AppShell，修正標頭匯入對齊及保留間距 |
| 金額／幣別等高 68px；日期 52px；一般輸入約 51.59px | 使用 Input／DateField 實例，按來源尺寸與字級覆寫 |
| 分類 label 與選填標籤字級不同 | 拆回 14px／600 的分類與 12px muted 選填，間距 7px |
| radio／checkbox 必須能辨識選取狀態 | 匯入缺少原生控制圖形，新增可編輯 18px 元件補回；瀏覽器原生邊緣與反鋸齒仍有細差，屬本次使用者已確認的已知差異 |
| 幣別搜尋結果浮在欄位下方 | 修正匯入的 popup 容器高度、寬度與裁切，保留單一搜尋結果及陰影 |
| 已確認元件與既有畫面 | 未修改原元件定義，8 張既有畫面匯出不變；三區與功能分組、元件標籤無重疊，引用有效 |
| 系統字型／Georgia | 延續 Noto Sans TC／Noto Serif TC 替代字型限制；字形、粗細、行盒有細差，不宣稱逐像素相同 |

日期以文字輸入核對；日曆展開／清除、完整鍵盤與輔助科技流程未列為本輪通過項目。未執行有效保存、保存中、離線／結果未明、目錄讀取失敗、停用成員、長名稱、大量成員、編輯與刪除流程。整合 Chromium／DPR=1 的核對不等同實體手機、WebKit 或完整 BDD 回歸。

## 來源、資源與續跑

- 主畫面：`apps/web/src/features/expenses/ExpenseForm.tsx`；共用來源包括 `SearchCombo.tsx`、`DateField.tsx`、`ExpenseShares.tsx`、Input／Button／AppShell 與既有樣式。
- 業務依據：`specs/truth/features/frontend/expenses/expense-recording-and-totals.feature`、`shared-expenses-and-share-display.feature`、`date-selection-and-focus.feature`、`pagination-and-save-outcomes.feature`、同模組 `dsl.md` 與 expenses／members／currencies／categories 契約。現況採樣不重新定義業務規則。
- Prototype 選用：不製作。直接操作真實產品，沒有待原型回答的新互動決策。
- profile=`low-memory-16gb`，RAM=16GiB；主代理直接執行，未建立輔助代理／測試 worker；沿用 Node 24.21.0，不安裝依賴。入口 swap 已有使用量，不據此宣稱壓力失敗或記憶體穩定。
- runtime PID 38019，web 44191／API 57999 已正常 teardown，exit=0 並輸出 `BASELINE_CLOSED`；`ledger_test_38019_903` 已核對不存在。原有容器保留。
- 設計、同版預覽、證據與確認文件隨本次提交固定；已同步畫布批准標記，6 張畫面重新匯出與確認前預覽完全相同。
- 基準 Git 版本：可用 `git log -1 --format=%H -- specs/ui-baseline/expense-create-baseline.md` 取得本次實際 commit；後續引用保存該 commit＋路徑＋畫面 ID＋同版預覽。
- 下一入口：後續 plan 可引用本次已確認的新增支出範圍；未收錄狀態仍依其需求補充設計與驗證，不擴大本次確認。
