# 旅行帳本現況基準

## 版本與確認

- 已確認版本：`baseline-v0.2`，建立於 2026-11-13，確認於 2026-11-14（Asia/Taipei），`approved`。
- 新版 `/ui-plan` 的明確建立基準模式；只修改 `specs/ui-baseline/**`，不修改產品、truth 或 skill。
- 固定產品來源：`6bb68a5023d43aa6beadaee4453676c30ba635f7`。
- 沿用同 commit 的 `baseline-v0.1` 已確認範圍；原確認持續有效，本次新增旅行帳本亦已取得明確確認。
- 可編輯設計：[split-ledger.pen](split-ledger.pen)，批准提交時 SHA256：`698307d170a2c4900b689ba58b9ee4c601b884fbaafe883fe45ec585bb8d0a67`；2026-11-14 三區整理版本（f9698f9）SHA256：`2f3f89c639551e354e04fe765b57f6ece6dab7372aee15bb47406382edac7085`。
- 有效確認範圍：以下四張旅行帳本視窗、空帳本元件、旅行內導覽變體與已揭露差異；不涵蓋未收錄畫面或未驗證狀態。
- 確認者：本 chat 使用者；2026-11-14 原回覆：「可以，這版旅行帳本 baseline 我確認，請把設計稿、預覽與相關文件一起 commit。」
- 畫布標記同步限制：本次嘗試更新說明與 frame context 時，Pen 官方工具因帳戶本期用量限制拒絕執行，未寫入變更。當時 .pen 保留交付時的 pending 標記；2026-11-14 使用者切換帳號後工具恢復，本次已透過正式設計工具同步批准標記。畫面內容與已確認預覽不變。
- 基準 Git 版本：由本次提交固定；使用 `git log -1 --format=%H -- specs/ui-baseline/ledger-baseline.md` 取得實際 commit，後續引用須記下該 commit＋路徑＋畫面 ID＋同版預覽。

## 畫面索引

正式路由 `/trips/:id`。初始視窗與支出區視窗是同一頁的兩個捲動位置，不是不同產品頁。

| 穩定畫面／狀態 ID | frame ID | 尺寸／來源捲動 | 設計預覽 | 產品證據 |
| --- | --- | --- | --- | --- |
| `ledger/main/desktop` | `K4fUl` | 1440×900，scrollY=0 | [桌機](previews/ledger-desktop.png) | [產品](evidence/ledger-desktop-product.jpg) |
| `ledger/main/mobile` | `j4FlQR` | 390×844，scrollY=0 | [手機](previews/ledger-mobile.png) | [產品](evidence/ledger-mobile-product.jpg) |
| `ledger/expenses/desktop` | `vQfME` | 1440×900，scrollY=312 | [桌機支出區](previews/ledger-expenses-desktop.png) | [產品](evidence/ledger-expenses-desktop-product.jpg) |
| `ledger/expenses/mobile` | `pwPFO` | 390×844，scrollY=552 | [手機支出區](previews/ledger-expenses-mobile.png) | [產品](evidence/ledger-expenses-mobile-product.jpg) |
| `ledger/empty/mobile` | `lP9Nj` reusable | 350×322.78 區塊 | [空帳本元件](previews/ledger-empty-mobile-component.png) | 實際 DOM／文案觀察，見 checks；未另保存產品截圖 |

四張視窗保留完整可編輯內容，再由 viewport frame 裁切；支出區視窗保持側欄／底部導覽固定。手機長內容不縮小塞進一屏。畫布說明 `s98ddy` 與原版說明分開。

## 現況與共用元件

- 引用原版桌機 AppShell `NUK7c`、手機 AppShell `KOhJt`、主要按鈕 `O4hvR`。記一筆按鈕透過實例覆寫標籤與尺寸；手機沿用產品緊縮 padding。
- 旅行內導覽由 AppShell 實例覆寫加入同行者、分帳結算。另收錄桌機 `i6fhCJ`、手機 `UVQRm` 導覽元件，保留原版導覽元件。手機五個入口維持 65px 高的底部列。
- 原版 13 個 reusable component 的完整節點資料在本輪前後逐一比較，均未變更。色彩與字型變數沿用原版，沒有重新定義共用 token。
- 新增內容以 Pen 官方 CLI 從真實產品匯入可編輯圖層；修正匯入的垂直對齊、保留間距、手機結餘面板高度及固定導覽位置。所有頂層 frame／元件兩兩檢查，重疊數為 0。
- 延續已揭露字型限制：產品為 macOS 系統字型／Georgia，畫布使用 Noto Sans TC／Noto Serif TC；字形、粗細與行盒有細差，不宣稱逐像素相同。沒有因此修改產品 CSS。
- 頁面目前同時顯示個人花費與成員結餘；忠實保留來源位置，不在 baseline 工作重新設計資訊架構。

## 來源與資料

- 主畫面：`apps/web/src/features/trips/TripLedger.tsx`。
- 樣式：`features/expenses/ledger.css`、`features/settlement/settlement.css`，以及 AppShell、responsive、base、design-system 樣式。
- 業務依據：`specs/truth/features/frontend/**` 中 expenses、splitting、trips 與 `specs/truth/contracts/**` 的 totals、members、settlement、expenses 介面；本次不改業務規則。
- 真實 React/Vite、Fastify、正式 migrations 與現有 seed helpers；隔離測試 session 使用虛構使用者小旅人，沒有驗證真實 Google OAuth。
- 日本春日旅行：2027-03-10—15；小旅人與小安兩名成員。支出為往返機票 TWD 8,000、京都町家住宿 JPY 15,000、共同拉麵 JPY 2,000。
- 個人總花費為 JPY 16,000、TWD 8,000.00。共同拉麵個人分攤 JPY 1,000，不能將整筆 JPY 2,000 全算入個人花費。JPY 淨額小旅人 +1,000、小安 -1,000，TWD 均為 0。
- 另一空旅行「下一趟旅行」未定日期、零支出，顯示既有空狀態文案與記錄第一筆支出入口。
- [環境與資料](evidence/ledger-runtime.json)、[focused checks](evidence/ledger-checks.json)，不保存 session cookie。

## 核對與限制

- 1440×900、390×844：比對真實產品、畫布 screenshot 與同尺寸輸出；核對雙幣別摘要、成員結餘、三筆支出與明細連結、固定導覽及捲動位置。
- 768×900：文件寬度 768、側欄 190、三筆支出，未見水平溢出；沒有另建中間寬度 frame。
- 旅行日期：實際開啟 dialog，核對兩個已填日期欄位與取消／儲存日期；取消後關閉且焦點回到旅行日期，原日期不變。日期 dialog 本輪未另收錄為畫面，沿用既有 FormDialog／DateField。
- 空帳本：實際載入並檢查文案、未定日期及新增入口。空狀態以手機寬度元件收錄，桌機完整空畫面未另交付。
- 未實際送出日期或新增支出；載入／網路錯誤、更多頁資料、長文案、保存中、完整鍵盤與輔助科技流程不在本次驗證範圍。產品證據採整合 Chromium、DPR=1，非實體手機或 WebKit 驗證。
- Prototype：不製作。這次直接操作現有產品，沒有需要另建原型決策的新互動問題。

## 資源與續跑

- `low-memory-16gb`，主代理直接執行，未啟用子代理／測試 workers。沿用 Node 24.21.0 現有環境；不安裝新依賴。
- 本輪 runtime PID 44454，web 44191、API 65062 已正常 teardown，exit=0、輸出 `BASELINE_CLOSED`。獨立 database `ledger_test_44454_902` 已確認不存在；既有 Docker 容器保留。
- 設計已儲存；原版預覽與 evidence 不覆寫。設計稿、同版預覽、證據與確認文件隨本次提交固定。
- 下一入口：後續 plan 可引用本次已確認旅行帳本範圍。本次三區整理已同步畫布說明與 context 的批准標記；畫面位於 `nObqJ` 內的旅行帳本分組 `Bf22k`，元件位於 `OKWYQ`，版本索引位於 `QBbzP`。組織調整保留有效確認，詳見 README 的整理證據。
