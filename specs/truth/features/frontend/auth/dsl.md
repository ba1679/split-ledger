# 登入 DSL

每列為可直接綁定的完整句型；測試資料中的具體值由句型本身提供。

## Given 句型

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | Playwright BDD 實作語意 |
| --- | --- | --- | --- | --- |
| `使用者尚未登入` | 無；句型中的具體值為案例固定資料 | 不支援 | 無 | 使用隔離測試帳號與 API fixture 建立所述旅行、分類或支出權威資料；開啟目標頁並等待初始查詢完成。以 GET /api/me 核對當前 session，GET /api/trips 與 /api/categories 核對僅顯示登入帳號資料。 |
| `裝置曾顯示第一個帳號的旅行與分類` | 無；句型中的具體值為案例固定資料 | 不支援 | 無 | 使用 fixture 設定裝置時區、連線與帳號偏好，並建立所述後端資料；在頁面開啟前確認安排狀態。以 GET /api/me 核對當前 session，GET /api/trips 與 /api/categories 核對僅顯示登入帳號資料。 |

## When 句型

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | Playwright BDD 實作語意 |
| --- | --- | --- | --- | --- |
| `使用者完成 Google 登入` | 無；句型中的具體值為案例固定資料 | 不支援 | 無 | 透過可控的 Google 身分測試替身完成或取消登入；等待 session 與導頁結果，不直接偽造畫面已登入狀態。以 GET /api/me 核對當前 session，GET /api/trips 與 /api/categories 核對僅顯示登入帳號資料。 |
| `使用者取消 Google 登入` | 無；句型中的具體值為案例固定資料 | 不支援 | 無 | 透過可控的 Google 身分測試替身完成或取消登入；等待 session 與導頁結果，不直接偽造畫面已登入狀態。以 GET /api/me 核對當前 session，GET /api/trips 與 /api/categories 核對僅顯示登入帳號資料。 |
| `第二個帳號完成 Google 登入` | 無；句型中的具體值為案例固定資料 | 不支援 | 無 | 透過可控的 Google 身分測試替身完成或取消登入；等待 session 與導頁結果，不直接偽造畫面已登入狀態。以 GET /api/me 核對當前 session，GET /api/trips 與 /api/categories 核對僅顯示登入帳號資料。 |

## Then 句型

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | Playwright BDD 實作語意 |
| --- | --- | --- | --- | --- |
| `使用者看到自己的旅行清單` | 無；句型中的具體值為案例固定資料 | 不支援 | 無 | 檢查畫面內容與相應 API 再讀結果一致；支出、總額與分類關聯以後端權威資料為準，不以本頁快取自行推算。以 GET /api/me 核對當前 session，GET /api/trips 與 /api/categories 核對僅顯示登入帳號資料。 |
| `使用者仍停留在登入入口且看不到帳本資料` | 無；句型中的具體值為案例固定資料 | 不支援 | 無 | 檢查可見結果、互動狀態及相關後端權威資料一致。以 GET /api/me 核對當前 session，GET /api/trips 與 /api/categories 核對僅顯示登入帳號資料。 |
| `畫面只顯示第二個帳號的旅行與分類` | 無；句型中的具體值為案例固定資料 | 不支援 | 無 | 檢查畫面內容與相應 API 再讀結果一致；支出、總額與分類關聯以後端權威資料為準，不以本頁快取自行推算。以 GET /api/me 核對當前 session，GET /api/trips 與 /api/categories 核對僅顯示登入帳號資料。 |

