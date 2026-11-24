# UI 設計交接：旅帳語言切換入口

## 介面範圍與模式

- 一般需求模式，只承接 plan.md 的 IF-01 C 類語言切換入口，寫入 008 的 ui 目錄。
- 需求依據為 spec.md FR-004／005 及登入前後在同一瀏覽器保存手動語言偏好的驗收旅程。繁中文案精簡與全站原位置翻譯屬 IF-01 B 類。
- 使用者要求暫緩 008 的無障礙驗證，NFR-001 仍保留。

## 固定基準與本次差異

- 固定產品版本 228109265ddc3384853745b1083edb1f94ce3579。登入由 apps/web/src/features/auth/Login.tsx 及樣式提供；登入頁尚未收入已確認 UI baseline。
- 固定 UI baseline commit 8fc9f94134c66ffd29918014b950894b1007aa86，設計檔 specs/ui-baseline/split-ledger.pen。已確認我的旅行桌機 trips/main/desktop／GlUDZ 與手機 trips/main/mobile／i1wuXl，同版預覽為 specs/ui-baseline/previews/trips-desktop.png、trips-mobile.png。
- 旅行帳本桌機 ledger/main/desktop／K4fUl、手機 ledger/main/mobile／j4FlQR，預覽為同目錄的 ledger-desktop.png、ledger-mobile.png。登入後共用框架由 apps/web/src/components/AppShell.tsx 提供。
- 新設計在登入前及登入後共用框架提供繁中／英文選擇，使用者在旅行帳本及還款待確認時也可切換。登入入口在登入區右上，桌機共用入口在側欄底部、登出上方，手機共用入口在內容頂部右側。手機底部導覽沿用既有操作。

## 設計交付與確認

- 2026-11-24 以 Pen CLI 0.3.18 開啟固定基準並儲存 [可編輯設計 d1](split-ledger-008.pen)，格式 2.25，SHA256 `f9724285231d04b939f674e43ce7bc42d30c99579c0285521500d2f800621e25`。下表為同版 2× PNG。
- 設計確認狀態為 `approved`。2026-11-24，使用者對前述 SHA256 與五張預覽回覆「確認沒問題，請繼續實作」。確認涵蓋 d1 的登入前後入口位置、選單收合與選中樣式，以及手機還款待確認時的呈現。

## 畫面交接索引

| 畫面／狀態 ID | 資訊與行為 | 固定依據與正式元件 | 尺寸 | d1 frame 與預覽 |
| --- | --- | --- | --- | --- |
| login/language/desktop | 英文選中、選單向下展開 | 固定產品 `Login` | 1440×900 | `vywUT` [登入桌機](design-previews/pen-login-desktop.png) |
| login/language/mobile | 語言按鈕位於導言下方、登入區右上 | 固定產品 `Login` | 390×844 | `XfIPF` [登入手機](design-previews/pen-login-mobile.png) |
| shell/language/desktop | 側欄語言選單向上展開，登出保持可操作 | `AppShell`、基準帳本 `K4fUl` | 1440×900 | `jKNPw` [帳本桌機](design-previews/pen-ledger-desktop.png) |
| shell/language/mobile | 內容頂部右側保留獨立語言入口與原有底部導航 | `AppShell`、基準帳本 `j4FlQR` | 390×844 | `tO5Rr` [帳本手機](design-previews/pen-ledger-mobile.png) |
| shell/language/mobile/pending | 還款頁捲到待確認區時，選單仍可從黏附頂列展開，查證動作可見 | `AppShell`、`IndependentRepayment`、`/trips/:tripId/repayments/new` | 390×844 | `pm634` [還款待確認](design-previews/pen-repayment-pending-mobile.png) |

共用元件位於 `J0U1L`。依現有 `TripManagementMenu`、`management.css` 與 outline Button 使用白底、綠色圖示、44px 按鈕、48px 選項及浮層陰影。展開時反轉箭頭，並以淡綠底與勾號標出目前語言。選項固定顯示「繁體中文」與「English」。

手機按鈕對齊內容右緣，選單向下展開並限制於視窗內。頂列左側保留返回入口的空間，窄幅時允許長文字截短或在可用空間換行，語言按鈕本身維持一行。桌機側欄浮層可暫時蓋住帳戶說明，與登出按鈕分開。鍵盤開啟、選擇、Escape 關閉與焦點回到按鈕沿用既有選單行為。依使用者指示暫緩無障礙驗證。

選擇後關閉選單並套用偏好。登入前後共用一份瀏覽器偏好，當前路由、旅行資料、表單草稿與操作狀態繼續保留。錯誤、等待與查證待確認沿用同一操作入口。英文登入桌機與繁中代表畫面已檢查靜態排版，實作後核對窄幅、長英文與鍵盤操作。

## Prototype 與後續交接

- 2026-11-24 依使用者指示，曾交付局部網頁原型，版次 SHA256 為 `9da3f9bf962f8725cfaa76d04bd1a32e2086593d7f50c18a28411fb437fe4304`。使用者可據此確認入口的可見性、位置，以及切換語言後是否容易繼續原本的操作。
- 使用者回覆「原型 ok，但是我希望在正式版的設計能夠考量 UI 更多，例如下拉選單不要用 html 原型，需要再更符合目前設計」。d1 沿用原型的位置與操作，以現有按鈕與浮層樣式製作。
- 原型已由同頁上方的正式 Pencil 設計與預覽接手，原型確認紀錄保留在本節。
- 在 Chromium 1440×900 與 390×844 驗證繁中切英文、進入示範帳本、查看還款待確認、原頁切回繁中、重整與模擬登出後保留語言偏好。另以日文瀏覽器偏好驗證預設英文。登入、帳務及查證結果均為示意。
- d1 確認後，接續 IF-01 C 類的 `/dsl-refine`、`/tasks` 與實作。入口由 `Login` 與 `AppShell` 共用，使用現有介面語系與瀏覽器偏好機制，再按代表畫面核對排版與操作，並於驗收後回填適用的 UI 基準。

- T091 已獲使用者確認，並完成 T119／T120 的現況回填與獨立核對。三張確認畫面及共用選單見 [語言切換基準 v0.4](../../../ui-baseline/language-selector-baseline.md)。
