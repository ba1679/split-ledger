# 前端共用 DSL

每列為可直接綁定的完整句型；測試資料中的具體值由句型本身提供。

## Given 句型

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | Playwright BDD 實作語意 |
| --- | --- | --- | --- | --- |

## When 句型

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | Playwright BDD 實作語意 |
| --- | --- | --- | --- | --- |
| `使用者開啟新增支出表單` | 無；句型中的具體值為案例固定資料 | 不支援 | 無 | 以指定帳號與裝置開啟目標畫面，等待資料查詢完成；以使用者可見操作完成唯一 Act。 |

## Then 句型

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | Playwright BDD 實作語意 |
| --- | --- | --- | --- | --- |


## 005 跨模組共用契約

以下每列以既有 Playwright BDD fixture、page object 與真實 API/隔離資料庫實作。固定場景常數即句內明示值；所有 Then 不執行新的受測操作，API 再讀屬只讀權威查核。MoneyAmount 以字串解析，ExactAmount 用 BigInt 有理數，不用浮點或畫面值重算。fixture 所有名稱映射到同旅行穩定 UUID；未標示的可選值為 null，不自行擴張業務。

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | Playwright BDD 實作語意 |
| --- | --- | --- | --- | --- |
| `分帳旅行已有以下支出：` | 無 | 必填多列；項目:string 非空；幣別:string 三碼；金額:string 合法大單位；付款人:string 成員名；分攤者:string 以「、」分隔且不重複。 | 旅行=日本旅行；成員皆啟用；支出日期=2027-03-11；分類=null；simplifyDebts=false。 | Given：使用 owner session 與真實 API/隔離資料庫 fixture 建立日本旅行，建立表內所有成員的穩定 UUID（Alice 為 owner），以既有支出寫入來源並 GET expenses、settlement 核對；保存支出、成員 ID、初始 revision、還款及總額快照於 scenario context。此步不開啟受測頁。 |
| `分帳畫面顯示以下成員淨額：` | 無 | 必填多列；成員:string；幣別:string；淨額:string 有號大單位有理數（可為100/3）；顯示:string 最多兩位小數含幣別。 | 無 | Then：等待本次權威 settlement 完成，按 memberId/currencyCode 核對畫面與 API ExactAmount；表內是該測試指定幣別的完整成員集合，正負號對應應收/應付，零顯示已平衡；以有理數核對各幣別總和為零，不以顯示值相加。不得有跨幣別合計或換算。 |
| `分帳旅行已有 Amy 支付 Alice JPY {金額} 的獨立還款` | 金額:string 正整數大單位 | 不支援 | paidOn=2027-03-12。 | Given：透過 owner API fixture 新增合法未超額還款；GET repayments 與 settlement 核對實付與餘額，保存還款 UUID、paidOn 與完整欄位快照。不得用畫面快取代替資料落地。 |
| `來源支出與先前實付紀錄保持不變` | 無 | 不支援 | 無 | Then：使用 scenario 初始快照，比對 GET expenses 所有原始欄位、付款人、shares 成員及有理數和 GET repayments 原實付欄位逐筆相等；僅允許當次命令明示新增的實付，不得改寫原資料。 |
| `owner 以鍵盤選擇日期 2027-03-12` | 無 | 不支援 | 無 | When：在已開啟DateField日曆以ArrowRight到12日再Enter選日，這是一次日期選擇Act；等待日曆關閉及焦點還原。不得保存表單。 |
| `owner 按 Escape 關閉日期日曆` | 無 | 不支援 | 無 | When：已開啟日曆按Escape一次；等待關閉。不輸入日期或保存表單。 |
| `日期欄顯示 2027-03-12 且日曆關閉並返回日期觸發點` | 無 | 不支援 | 無 | Then：驗證日期input實際value、日曆hidden且焦點回原觸發點；無寫入請求、API帳務未變。桌面/手機皆有可讀日期控制；手機底部日曆不橫向溢出。 |
| `日期欄仍為 2027-03-11 且焦點返回日期觸發點` | 無 | 不支援 | 無 | Then：驗證原日期value未改、日曆關閉且焦點返回；無寫入請求、API帳務未變。 |
| `Amy 支付 Alice JPY 33 的安排已結清` | 無 | 不支援 | 無 | Given：API fixture從最新settlement取Amy安排，以實付33送出POST settlements，GET record/repayments核對；保存第一筆實付與兩筆調整快照。 |
