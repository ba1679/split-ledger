# 前端 / UI 設計與可操作雛形規劃

## 介面範圍

- 目標系統介面：`前端商品瀏覽、購物車與結帳介面`
- 需求來源：`使用者故事 1 至 4、FR-002、FR-005、FR-011、FR-014 與 NFR-003`
- 上游依據：`spec.md、research.md、techstack.md、plan.md Wave 1`
- 產出順序：`UI plan → shop.pen 與預覽 → 開發者確認 design-v1 → prototype 與同步檢查 → 下游。`

## 設計交付與開發者確認

- 設計檔與固定版本：`ui/shop.pen；design-v1；實際交付時填入檔案 SHA256 或固定 commit`
- 桌機／手機尺寸及預覽：`1280×900、375×812；ui/design-previews/ 下各主畫面與關鍵狀態`
- 確認狀態：`pending`
- 確認者、日期、原回覆或引用與範圍：`尚未取得；本例為交付設計等待確認的狀態，不能視為已批准`
- 重大待決事項及受阻下游：`prototype、依賴這批設計的前端 DSL／tasks／實作均待確認；以下雛形路徑是規劃，尚未產出`

<!-- 狀態使用 pending／changes-requested／approved；沒有回覆時不填造確認證據。只有批准有效後才製作 prototype。 -->

## 畫面交接索引與同步狀態

| 畫面／狀態 ID        | 資訊責任與區塊順序                               | .pen frame／預覽／尺寸與資料                                                                             | Prototype 路徑／狀態入口                 | 正式路由／元件                    | Feature／tasks                 | 設計／prototype／實作版本與同步狀態    |
| -------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | ---------------------------------------- | --------------------------------- | ------------------------------ | -------------------------------------- |
| catalog/normal       | 搜尋 → 分類 → 商品卡；完整規格與配送資訊在詳情頁 | shop.pen：catalog-desktop、catalog-mobile；預覽 catalog-desktop.png、catalog-mobile.png；同一組 8 件商品 | 規劃 ui/index.html?state=normal          | 規劃 /products；CatalogPage       | 商品瀏覽 feature；tasks 待綁定 | design-v1／尚未產出／尚未產出；pending |
| product/normal       | 商品圖片 → 價格 → 規格 → 加入購物車              | shop.pen：product-desktop、product-mobile；預覽同名 PNG；1280px／375px、同一組商品                       | 規劃 ui/product-detail.html?state=normal | 規劃 /products/:id；ProductDetail | 對應 feature；tasks 待綁定     | design-v1／尚未產出／尚未產出；pending |
| checkout/normal      | 購物車 → 配送 → 付款 → 訂單金額 → 送出           | shop.pen：checkout-desktop、checkout-mobile；預覽同名 PNG；1280px／375px、同一組商品                     | 規劃 ui/checkout.html?state=normal       | 規劃 /checkout；Checkout          | 對應 feature；tasks 待綁定     | design-v1／尚未產出／尚未產出；pending |
| order/success        | 成功狀態 → 訂單摘要 → 查詢／繼續購物             | shop.pen：success-desktop、success-mobile；預覽同名 PNG；1280px／375px、同一組商品                       | 規劃 ui/order-success.html?state=success | 規劃 /orders/:id；OrderResult     | 對應 feature；tasks 待綁定     | design-v1／尚未產出／尚未產出；pending |
| catalog/empty        | 保留搜尋與清除條件入口，顯示無結果               | shop.pen：catalog-empty-desktop、catalog-empty-mobile；預覽同名 PNG；1280px／375px、同一組商品           | 規劃 ui/index.html?state=empty           | 規劃 /products；CatalogPage       | 對應 feature；tasks 待綁定     | design-v1／尚未產出／尚未產出；pending |
| catalog/loading      | 商品卡共用載入元件，保留列表結構                 | shop.pen：catalog-loading-component；預覽同名 PNG；1280px／375px、同一組商品                             | 規劃 ui/index.html?state=loading         | 規劃 /products；CatalogPage       | 對應 feature；tasks 待綁定     | design-v1／尚未產出／尚未產出；pending |
| catalog/error        | 保留搜尋、顯示讀取錯誤與重試                     | shop.pen：catalog-error-desktop、catalog-error-mobile；預覽同名 PNG；1280px／375px、同一組商品           | 規劃 ui/index.html?state=error           | 規劃 /products；CatalogPage       | 對應 feature；tasks 待綁定     | design-v1／尚未產出／尚未產出；pending |
| catalog/long-name    | 長名稱自然換行，商品價格與入口可讀               | shop.pen：catalog-long-desktop、catalog-long-mobile；預覽同名 PNG；1280px／375px、同一組商品             | 規劃 ui/index.html?state=long-name       | 規劃 /products；CatalogPage       | 對應 feature；tasks 待綁定     | design-v1／尚未產出／尚未產出；pending |
| checkout/invalid     | 欄位就近錯誤並保留輸入                           | shop.pen：checkout-invalid-desktop、checkout-invalid-mobile；預覽同名 PNG；1280px／375px、同一組商品     | 規劃 ui/checkout.html?state=invalid      | 規劃 /checkout；Checkout          | 對應 feature；tasks 待綁定     | design-v1／尚未產出／尚未產出；pending |
| checkout/confirm     | 確認訂單摘要並可取消返回                         | shop.pen：checkout-confirm-desktop、checkout-confirm-mobile；預覽同名 PNG；1280px／375px、同一組商品     | 規劃 ui/checkout.html?state=confirm      | 規劃 /checkout；Checkout          | 對應 feature；tasks 待綁定     | design-v1／尚未產出／尚未產出；pending |
| checkout/unconfirmed | 保留訂單意圖，顯示查證入口                       | shop.pen：checkout-unknown-desktop、checkout-unknown-mobile；預覽同名 PNG；1280px／375px、同一組商品     | 規劃 ui/checkout.html?state=unconfirmed  | 規劃 /checkout；Checkout          | 對應 feature；tasks 待綁定     | design-v1／尚未產出／尚未產出；pending |

- 共用元件與響應式規則：`商品卡採共用字級／間距；桌機多欄、手機單欄，中間寬度依可用寬度換欄`
- 關鍵狀態覆蓋及可共用／不適用理由：`四個主畫面各有桌機／手機 frame；catalog 的空白、載入／讀取錯誤、長商品名，以及 checkout 的欄位錯誤、確認、結果未明以補充 frame 呈現；重複 loading 使用同元件規則`
- 需要明確確認的設計變更與 AI 可自主適配範圍：`AI 可適配換行與高度；改商品區塊順序或結帳 CTA 位置須更新設計並重新確認`
- 舊產物／未同步項目與處理：`尚未製作 prototype；舊示意如存在須標歷史版本並移除下游參照`

## 視覺方向

- 風格來源：`需求未自帶視覺規範時，先透過 clarify 收斂品牌氣質、色彩層級與商品展示方式。`
- 本次風格結論：`明亮、清爽、偏現代生活風格的電商介面，商品資訊與 CTA 需要容易掃讀。`
- 視覺重點：`大尺寸商品卡、清楚價格層級、可快速理解的購物車摘要，以及不打斷結帳的信任感設計。`
- 審美原則：`畫面必須像真實產品，不使用說明文件口吻，不把分析備註直接寫進 HTML 畫面。`

## 畫面與流程

### 1. `商品列表入口畫面`

- 對應雛形檔案：`ui/index.html`
- 主要目的：`讓使用者快速搜尋或瀏覽商品清單，作為整個選購流程的入口。`
- 進入條件：`使用者首次進入商店首頁，尚未選擇任何商品。`
- 主要操作：`輸入搜尋關鍵字、查看商品卡、切換主打分類與點擊進入商品詳情。`
- 成功流轉：`選擇商品後，導向商品詳情畫面。`
- 失敗回饋：`搜尋條件為空、查無結果或資料暫時載入失敗時，在原畫面顯示可重試訊息。`

### 2. `商品詳情畫面`

- 對應雛形檔案：`ui/product-detail.html`
- 主要目的：`讓使用者查看商品圖文、價格、規格與配送資訊，並決定是否加入購物車。`
- 進入條件：`使用者從商品列表或推薦區點入特定商品。`
- 主要操作：`切換商品圖片、選擇規格、調整數量、查看配送承諾並加入購物車。`
- 成功流轉：`成功加入購物車後，導向購物車與結帳畫面。`
- 失敗回饋：`缺貨、規格未選或加入購物車失敗時，需顯示清楚狀態提示。`

### 3. `購物車與結帳畫面`

- 對應雛形檔案：`ui/checkout.html`
- 主要目的：`讓使用者確認購物車內容、配送方式、付款資訊與訂單金額。`
- 進入條件：`使用者已加入至少一件商品至購物車。`
- 主要操作：`調整品項數量、套用優惠、填寫收件資料、選擇付款方式並送出訂單。`
- 成功流轉：`訂單送出成功後，導向訂單成功畫面。`
- 失敗回饋：`欄位未填、付款失敗或庫存更新時，需保留目前表單上下文並顯示可理解提示。`

### 4. `訂單成功畫面`

- 對應雛形檔案：`ui/order-success.html`
- 主要目的：`顯示下單成功狀態、訂單摘要與後續追蹤 CTA。`
- 進入條件：`使用者完成付款或成功送出貨到付款訂單。`
- 主要操作：`查看訂單編號、收件摘要、配送時程與返回繼續購物或查看訂單。`
- 成功流轉：`可回到商品列表，或前往訂單查詢流程。`
- 失敗回饋：`若訂單資料尚未同步完成，需顯示載入中或重試提示，而不是空白成功頁。`

## 互動與假資料原則

- 假資料策略：`可使用商品名稱、售價、折扣、配送方式、收件資訊摘要與訂單編號等假資料，幫助使用者直接感受產品流程。`
- 互動原則：`HTML 雛形中的按鈕、切頁、表單與狀態切換都應能操作，用來模擬真實產品節奏。`
- 內容原則：`畫面文字只放產品真的會顯示給使用者的內容，不把分析說明、元件樹或實作備註寫進畫面。`

## 狀態與資訊揭露

- 使用者可見資訊：`商品圖片、規格、價格、優惠金額、購物車品項、配送方式、付款摘要與訂單結果。`
- 必須隱藏資訊：`未授權的內部庫存邏輯、完整支付憑證，以及任何不應直接暴露的伺服器內部判定資訊。`
- 主要 UI 狀態：`首頁瀏覽、商品載入中、可加入購物車、購物車編輯中、送單中、訂單成功、錯誤提示。`
- 角色或權限差異：`一般訪客可瀏覽與加入購物車；登入會員可帶入既有地址、查看訂單與使用會員優惠。`

## 驗證與錯誤回饋

- 輸入驗證：`搜尋欄、規格選擇、收件資料與付款資訊都需在畫面上提供即時驗證。`
- 狀態衝突處理：`若使用者操作與目前商品或訂單狀態不一致，保留畫面上下文並顯示不可操作原因。`
- 使用者可理解錯誤訊息：`錯誤訊息應說明原因、目前狀態與建議下一步，例如重新搜尋、重新選規格、稍後再試或改用其他付款方式。`

## 靜態雛形輸出規劃

- 多頁入口：`若本 feature 需要跨頁 flow，固定以 ui/index.html 作為雛形入口頁。`
- 預計輸出檔案：`ui/index.html`、`ui/product-detail.html`、`ui/checkout.html`、`ui/order-success.html`
- 換頁原則：`只有在真實產品流程本來就會切換畫面時才換頁；否則優先留在同頁內切換狀態。`
- Review 目標：`讓使用者不看 Markdown 也能直接點擊、切頁並感受產品操作節奏。`

## 前端實作切分建議

- 頁面 / 容器切分：`至少拆成商品列表、商品詳情、購物車 / 結帳、訂單成功四類畫面。`
- 共用元件或區塊：`商品卡、價格資訊區、購物車摘要、錯誤提示區與結帳表單。`
- 對後端契約的依賴：`商品列表查詢、商品詳情、庫存狀態、購物車同步、優惠試算、訂單送出與付款錯誤事件。`
- 驗收重點：`從瀏覽商品到完成一次下單的流程必須連續且可理解，且不得暴露不必要的付款或後端內部資訊。`

## 同步檢查、差異與交接

- 本例進度：design-v1 已交付、pending；等待開發者確認，prototype 尚未製作。
- 確認後操作計畫：商品列表 → 詳情 → 結帳 → 結果；另演示取消、欄位錯誤與結果未明；使用假資料，不驗證真實扣款。
- 比對計畫：同一組商品與金額、1280px／375px，各畫面及關鍵狀態；證據連至 validation.md。

| 畫面／版本               | 設計預期       | 實際呈現／截圖   | 差異與影響 | 處理結果／確認依據           |
| ------------------------ | -------------- | ---------------- | ---------- | ---------------------------- |
| catalog/normal design-v1 | 手機單欄商品卡 | prototype 未產出 | 待比對     | 批准後製作並驗證，不宣告同步 |

- 下一 checkpoint：收到 design-v1 明確確認後製作 prototype；同步通過再交付前端 DSL。
- 續跑資訊：handoff.md 記錄版本、批准、受阻範圍與下一入口。
