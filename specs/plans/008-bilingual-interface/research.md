# Phase 0 研究：繁中文案調整與英文介面

2026-11-23。依 008 規格及既有程式選定技術方向。前端 React/Vite SPA、後端 Fastify 及兩端 BDD runner 已有明確決策，驗證分工沿用專案共用測試政策。本次查閱程式、契約與官方文件，套件安裝、瀏覽器驗證與產品交付留待實作。

## 決策 1：前端打包繁中及英文訊息

- **Decision** — 採用 i18next 與 react-i18next，兩套按功能分組的 TypeScript 訊息隨 Vite 打包，React 掛載前初始化。以語意鍵、完整句、具名參數與語言各自的單複數型態管理訊息，涵蓋可見文案、文件標題、輔助工具名稱及狀態。頁面切換語言時在同一 React 樹更新，保留當前路由、草稿與操作狀態。
- **Rationale** — 這是全站遷移，結算筆數、圖表提示及驗證訊息需要多處重用並正確重排、插值。打包兩套訊息讓切換不依賴第二次網路請求，離線時也能讀到提示。型別檢查搭配資源測試核對語意鍵、必要的語言複數形式與插值欄位。計畫用兩套資源的完整性檢查防止缺字或混用語言，英文作為首次語言選擇的預設。使用者文字由 React 以文字呈現。套件版本由實作時核對 React 19 peer 範圍後固定，另檢查前端產物大小與是否有首屏語言閃動。[React 整合](https://react.i18next.com/getting-started) · [i18next TypeScript](https://www.i18next.com/overview/typescript) · [複數規則](https://www.i18next.com/translation-function/plurals)
- **Alternatives considered**
  - 自建 React Context 與字典查詢。依賴較少，需要自行維護插值、英文複數與資源檢查。
  - FormatJS React Intl。ICU 訊息與擷取管線適合已有翻譯交接需求的產品，本輪兩套本機資源可用較直接的 i18next 整合。[FormatJS React Intl](https://formatjs.github.io/docs/react-intl/)

## 決策 2：在 SPA 啟動時解析語言，手動選擇存於同源瀏覽器

- **Decision** — 以一個獨立於帳號的 `localStorage` 鍵存手動偏好，只接受 `zh-Hant` 與 `en`。沒有有效手動值時讀取瀏覽器第一順位，第一順位資料缺失時可取 `navigator.language`；辨識語言主標籤 `zh`，包含簡中及不同地區的標籤，其餘或無法辨識時採 `en`。自動判定不寫入偏好。第一次顯示與手動切換均更新根元素 `lang`，包括直接載入內頁及登入前畫面。
- **Rationale** — 既有的分類與幣別偏好已有同源儲存模式，語言偏好需在身份載入前可讀，也需跨登入及登出。此優先序直接表達 FR-004／005，避免語言偵測工具沿順位表逐個比對而誤選第二順位。儲存受限時以當次介面狀態維持可用，跨次造訪則依瀏覽器重新判定。[HTML 語言偏好](https://html.spec.whatwg.org/multipage/system-state.html#language-preferences) · [HTML Web Storage](https://html.spec.whatwg.org/multipage/webstorage.html#the-localstorage-attribute)
- **Alternatives considered**
  - 通用語言偵測外掛。現成來源與快取設定較廣，須額外限制偵測順序和快取來源才能符合本案固定規則。
  - URL 前綴與帳號欄位。前者牽動現有連結與 OAuth 返回路徑，後者要新增後端同步，且首次登入仍需要獨立的語言判定。

## 決策 3：以結構化結果呈現語系文案

- **Decision** — Web 依穩定的 API 錯誤代碼、欄位與操作情境選本機訊息，未識別錯誤使用同語言的通用提示。保留原錯誤內容供診斷及既有消費者使用。結算仍由後端計算，新增向後相容的同快照結構化說明投影供 Web 翻譯。投影需分辨原付款關係、已無需調整、確有調整，並提供調整時現有欄位未帶的原付款關係。Web 沿用既有選定安排、筆數及原文成員名稱生成說明。確切 schema、相容方式與回歸交由 API owner。
- **Rationale** — 旅行頁層目前有 API 中文錯誤直接呈現的路徑，結算頁也直接顯示 `explanation`。現有計數和選定安排無法完整還原同一快照的原付款關係，既有後端還以關係及精確金額判定是否有調整。補齊這個唯讀投影保留既有三種說明及三句內的內容承諾，也讓使用者切換語言時沿用同一份資料。沿用 `explanation` 及原始回應語意供舊客戶端相容。[結算現況](../../../apps/api/src/modules/settlement/read.ts) · [既有結算契約](../../truth/contracts/components/schemas/settlement.yaml)
- **Alternatives considered**
  - API 依請求語言產生完整句子。需跟著 UI 切換處理重新請求、離線及語言變體快取，前端和後端各需維護一套訊息來源。
  - 前端從既有中文說明剖析關係，或只從計數組合摘要。成員名稱可含標點，解析不穩定，計數也不足以保留關係與精確金額的判定。

## 決策 4：只在顯示層處理格式與離線提示

- **Decision** — 日曆與數字呈現沿用可帶入語系的瀏覽器 `Intl` 及既有 formatter，保留原先日期字串、幣別、固定輸入語法、BigInt、有理數與顯示取整規則。日期、百分比、金額的具體樣式交由 UI 設計。回應逾時或遺失時沿用原操作的結果查詢與防重複機制。當瀏覽器報告離線時加上同語系的檢查連線提示。此訊號用來選文案，由既有結果查詢確認原寫入結果。
- **Rationale** — 語言變更的影響在介面呈現。保留精確數值及原日期語意可避免日期跨日、輸入誤解、精度降低或歷史幣別位數被改寫。瀏覽器顯示在線時仍可能無法連到服務。把離線當成輔助訊號，可在沒有明確原因時保留中立的「儲存結果待確認」，並讓使用者接續查看同一筆結果。[ECMA-402](https://tc39.es/ecma402/) · [HTML 瀏覽器連線狀態](https://html.spec.whatwg.org/multipage/system-state.html#browser-state)
- **Alternatives considered**
  - 依介面語系改寫輸入解析或金額運算。會擴大到帳務與日期輸入行為，超出本次呈現範圍。
  - 所有網路請求錯誤一律提示檢查網路。逾時、伺服器異常或遺失回覆都可能造成同樣症狀，使用者仍需要知道原操作結果待確認。

## 決策 5：依語系錯誤的風險分配驗證層

- **Decision** — Vitest 驗語言順位與容錯、資源完整性、錯誤選字及格式／精度邊界。前端沿用 Playwright Test＋playwright-bdd，主線採手機 viewport 的 Chromium，涵蓋首次語言、登入前後偏好、代表性記帳和單筆結果查詢。桌機 Chromium 聚焦語言切換及長英文控制項，WebKit 選首次判定、偏好與日曆等跨引擎高風險案例。後端沿用 Playwright Test＋playwright-bdd＋APIRequestContext 及測試 PostgreSQL，補驗結算說明投影、快照與舊欄位相容，並重用既有帳務和權限斷言。
- **Rationale** — 採專案既有按風險分層的分工。主要流程能確認文字與狀態接上真實帳本，字典、語言變種與極值適合在較快的測試層擴充。集中提供同版手機、桌機與多語畫面證據，交使用者驗收語氣與排版。依使用者指示，008 暫緩無障礙自動與人工驗證，包含鍵盤／焦點、輔助工具語言與 VoiceOver。NFR-001 保留，驗證狀態記為延後。
- **Alternatives considered**
  - 將全部語言與流程在每種瀏覽器、尺寸全面交叉。重複大部分斷言，優先用有風險差異的代表案例。
  - 只驗字典完整度。無法覆蓋切換時的草稿及待確認操作、畫面長文或輔助工具呈現。
