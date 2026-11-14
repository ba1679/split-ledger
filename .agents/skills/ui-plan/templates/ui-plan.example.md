# UI 設計與畫面交接

## 介面範圍與模式

- 模式與寫入範圍：一般需求，僅 specs/plans/007-trip-dialog/ui/**。
- 目標系統介面與需求來源：我的旅行與新增旅行 dialog；示例 spec FR-001。
- 上游依據與 UI 分流：plan.md 判定 C，新增 dialog 的操作與可見狀態。
- 受影響範圍與待決依賴：trips/main、trips/create；設計待確認，只阻擋依賴該設計的前端工作。

## 固定基準與本次差異

- 基準 commit、檔案、畫面／狀態 ID、同版預覽：示例 commit 0123456 的 specs/ui-baseline/split-ledger.pen，trips/main 桌機／手機 frames；同 commit 的 previews/trips-desktop.png、trips-mobile.png。本例路徑與 commit 僅示範結構，不聲稱已存在，執行時核對實際版本。
- 固定產品版本與現況核對：示例產品 commit 0123456，沿用旅行卡片與新增入口；實際工作須附視覺核對證據。
- 未涵蓋範圍與替代依據：dialog 尚未納入基準，從固定現況與本次需求延伸；不等待其他產品頁完成基準。
- 沿用與改動的設計意圖：主列表沿用基準；新增 dialog，保存／取消位置與錯誤回饋以本次 frame 為準。
- 業務行為 spec／truth 來源：spec.md FR-001 與對應 trip-management 契約；設計不另決定必填及儲存規則。

## 設計交付與確認

- 設計檔、版本與 commit／內容雜湊：ui/trip.pen，design-v1；本例尚未產生真實內容雜湊，正式交付必須補實值。
- 桌機／手機尺寸與可見預覽：1440×900、390×844；ui/design-previews/trips-desktop.png、trips-mobile.png、create-desktop.png、create-mobile.png。
- 確認狀態：pending。
- 確認者、日期、原回覆／引用及範圍：尚未收到，不能複製本例作為確認證據。
- 本次確認、沿用確認與受阻範圍：主列表基準的有效確認只在核對後引用；新增 dialog 及相關入口設計待確認。

<!-- 確認狀態為 pending／changes-requested／approved；沒有回覆保留待確認，不填造證據。 -->

## 畫面交接索引

| 畫面／狀態 ID | 資訊責任與區塊順序 | 基準／差異 frame、預覽、尺寸與資料 | 正式路由／元件 | Feature／tasks | 固定版本與比對狀態 |
| --- | --- | --- | --- | --- | --- |
| trips/main | 標題、入口、旅行卡片 | 基準 trips/main，新增入口由 trip.pen trips-desktop／trips-mobile 交接；對應同名預覽；3 筆固定旅行 | /trips；TripsPage | 旅行建立 feature，tasks 待綁定 | 基準 0123456＋design-v1；產品尚未產出，pending |
| trips/create | 標題、欄位、回饋、保存／取消 | trip.pen create-desktop／create-mobile 及 invalid 元件狀態；對應預覽 | /trips；CreateTripDialog | 同上 | design-v1；產品尚未產出，pending |

- 共用元件、跨模組導航及影響：沿用 AppShell、Button、Input、FormDialog；新增入口不改其他頁導覽。
- 字體／顏色／間距與視覺層級：沿用固定基準的品牌樣式；主次操作依本次設計。
- Responsive 與 accessibility：桌機 dialog 居中、手機按設計適配；鍵盤開啟／取消、焦點返回入口及欄位標籤須可用。
- 空白／載入／錯誤／長內容／確認／結果未明的覆蓋及共用／不適用理由：列表既有狀態引用基準；dialog 欄位錯誤、長名稱、保存中與失敗回饋以元件狀態及註記覆蓋；取消直接返回，無額外二次確認。結果未明依契約保留輸入並提示查證，不假設保存成功。
- AI 適配與需重新確認的邊界：自然換行與高度可按規則適配；改保存／取消位置、入口或生效時機須重新確認。

## 行為與畫面註記

### 新增旅行 dialog

- 畫面／狀態 ID 與設計 frame：trips/create；create-desktop、create-mobile 及 invalid 元件狀態。
- 主要目的、進入條件與資訊揭露：從我的旅行新增入口開啟，顯示建立所需欄位。
- 主要操作、成功流轉與取消語意：保存成功回列表並顯示新旅行；取消關閉且焦點返回入口。
- 輸入驗證、失敗回饋、狀態衝突與保留內容：驗證依 spec／truth；失敗保留輸入並顯示可理解回饋。
- 角色／權限差異與隱藏資訊：只顯示本人可建立的旅行資訊，不以畫面隱藏代替權限檢查。

<!-- 依必要畫面增減；重複狀態引用共用規則。流程註記不要求每頁另做 HTML。 -->

## Prototype 選用與問題決策

- 選用方式與理由：不製作；設計與保存／取消註記已足以交接，沒有需體驗才能決定的問題。
- 待確認問題與涵蓋互動／畫面 ID：無原型問題；設計批准仍 pending。
- 決策結果、確認證據與受阻依賴：無互動決策前置；設計確認後可直接交前端 DSL／tasks。

<!-- 不製作是合法完成狀態，以下選用欄位省略或明寫不適用，不填 pending。選用時逐互動填寫，不要求完整頁面。 -->

- 選用互動狀態、入口、固定版本與對應設計：不適用，不製作。
- 已操作輸入／回饋、尺寸／資料及證據：不適用，未宣稱互動已操作。
- 模擬限制、工具能力限制與替代方式：不適用；產品行為在實作端驗證。

## 實作與驗收交接

- 頁面／元件切分與 API 依賴：TripsPage 組合 CreateTripDialog，保存依 trip-management 契約。
- 第一組代表性桌機／手機畫面及後續依賴：先完成 trips/create 桌機／手機比對，再展開共用 dialog 版型的後續畫面；無其他畫面則註明不適用。
- 同尺寸比對資料、截圖與差異清單位置：1440×900、390×844，固定 3 筆旅行與相同欄位；validation.md 保留預期／實際／差異／處理與版本。
- 基準回填範圍、產品驗收與獨立核對依賴：產品驗收與 UI gate／要求回歸後，回填 trips/create 與入口，保留其他 plan 成果；獨立核對後才完成。
- 舊版本處理與未完成限制：本例只是交付格式，設計及產品驗證證據都須在正式工作中取得；不把 pending 當通過。
- 下一入口、已就緒／受阻範圍與續跑紀錄：展示 design-v1 等待確認，handoff.md 保存版本與依賴；獨立後端依明列 Wave 可先進行。
