# 獨立還款 DSL

## 005 新增契約

以下每列以既有 Playwright BDD fixture、page object 與真實 API/隔離資料庫實作。固定場景常數即句內明示值；所有 Then 不執行新的受測操作，API 再讀屬只讀權威查核。MoneyAmount 以字串解析，ExactAmount 用 BigInt 有理數，不用浮點或畫面值重算。fixture 所有名稱映射到同旅行穩定 UUID；未標示的可選值為 null，不自行擴張業務。

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | Playwright BDD 實作語意 |
| --- | --- | --- | --- | --- |
| `owner 已填 Amy 支付 {收款人} JPY {金額} 的獨立還款` | 收款人:string Alice或Amy；金額:string 整數大單位，0為驗證案例 | 不支援 | paidOn=2027-03-12。 | Given：開獨立還款表單，選Amy及收款人並填金額、JPY、日期，保存前的repayments/settlement快照；預留repayment UUID，未送出。 |
| `JPY 700 的超額 JPY 100 警告已呈現且尚未保存` | 無 | 不支援 | 無 | Given：fixture已安排應付600；開表單輸入Amy→Alice700送出並取得真實409 OVERPAYMENT_CONFIRMATION_REQUIRED；停在待確認畫面，保存原UUID、完全相同payload、confirmationToken、revision、excess及reverse兩端；查GET repayments確定無新實付。前序Act僅Arrange，本案例受測為確認或取消。 |
| `另一裝置已將代付由 JPY 1000 改成 JPY 900` | 無 | 不支援 | 無 | Given：另一owner context PATCH原代付900，GET settlement確認Amy剩餘500且revision變動，本表單警告仍舊100；保留來源新值快照。 |
| `其他旅行的 Carol 不屬於本旅行` | 無 | 不支援 | 無 | Given：同owner另建旅行及Carol，保存其ID；本旅行僅Alice/Amy，不把外旅行成員加入本表單資料。 |
| `獨立還款成功回應遺失但原結果可查證` | 無 | 不支援 | 無 | Given：丟棄目標POST repayments成功回應，GET原UUID仍可查真實結果。 |
| `獨立還款成功回應遺失且原結果暫不可查證` | 無 | 不支援 | 無 | Given：丟棄目標POST成功回應且原UUID GET暫時404；真實後端成功且不能重送。 |
| `owner 保存獨立還款` | 無 | 不支援 | 無 | When：按保存一次，payload為原UUID、兩端成員ID、JPY amount及paidOn；不傳settlement key或虛構確認；等待201/409或未明狀態。 |
| `owner 取消超額還款` | 無 | 不支援 | 無 | When：在已呈現警告點取消一次，關閉確認；不得POST確認或換新UUID送出。 |
| `owner 明確確認超額還款` | 無 | 不支援 | 無 | When：點警告的明確確認一次，以同一UUID、完全相同原付款內容及伺服器簽發overpaymentConfirmation重送；不得用bool代替token或擅改snapshot；等待成功或新版本警告。 |
| `owner 開啟獨立還款成員選單` | 無 | 不支援 | 無 | When：開本旅行獨立還款表單付款人/收款人目錄，等待members查詢；無寫入。 |
| `已保存 JPY 400 實付且 Amy 剩餘應付 Alice JPY 600、TWD 300` | 無 | 不支援 | 無 | Then：UI成功及剩餘安排與GET settlement一致；GET repayment原ID恰Amy→Alice400、paidOn不變、kind=independent、settlementId=null；JPY從1000降600、TWD雙方±300及其來源完全不變，無settlement record/adjustments。 |
| `JPY 已結清且保留 JPY 400 與 JPY 600 兩筆獨立實付` | 無 | 不支援 | 無 | Then：GET repayments恰兩筆independent原ID/兩端/日期/金額400與600；settlement兩人JPY淨額0且無JPY安排，UI已結清；TWD±300不變，無指定安排結清快照/調整。 |
| `提示超額 JPY 100 將使 Alice 應付 Amy JPY 100 且尚未保存` | 無 | 不支援 | 無 | Then：可見警告完整描述excess100及反向Alice→Amy100，有確認與取消；核對API警告snapshot/revision，GET repayments無原預留ID，settlement仍Amy→Alice600，來源與實付快照不變。 |
| `沒有新增還款且 Amy 仍應付 Alice JPY 600` | 無 | 不支援 | 無 | Then：確認取消後無成功提示，網路紀錄除前序警告POST無新POST；GET原repayment=404，list及settlement維持基準，Amy→Alice600與TWD300。 |
| `已保存 JPY 700 獨立實付且 Alice 改為應付 Amy JPY 100` | 無 | 不支援 | 無 | Then：UI成功，GET原repayment700且kind=independent、settlementId=null、日期兩端不變；settlement完整JPY安排Alice→Amy100，TWD300不變；不得新增結清調整來吸收超額。 |
| `顯示新的超額 JPY 200 警告且未保存舊確認` | 無 | 不支援 | 無 | Then：原確認收到ACCOUNTING_REVISION_CONFLICT；UI刷新權威餘額500並顯示新超額200與Alice→Amy200，要求再次明確確認，不能自動接受；GET原repayment仍404，無結清/調整。若契約回衝突後需新警告，允許相同未確認內容重新取得409，不得含舊確認繞過；這些是錯誤恢復非新增受測Act。 |
| `還款欄提示付款人與收款人不可相同且帳務不變` | 無 | 不支援 | 無 | Then：檢查欄位可讀錯誤與草稿保留，無成功提示；GET repayments及settlement等於保存前快照，無原預留ID或新結清調整；本地阻擋或API拒絕均不得保存。 |
| `還款欄提示正數金額且帳務不變` | 無 | 不支援 | 無 | Then：檢查欄位可讀錯誤與草稿保留，無成功提示；GET repayments及settlement等於保存前快照，無原預留ID或新結清調整；本地阻擋或API拒絕均不得保存。 |
| `本旅行還款選單不可選取 Carol` | 無 | 不支援 | 無 | Then：付款/收款目錄不存在外旅行Carol ID，鍵盤也不能選取；沒有寫入請求，本旅行與另一旅行資料均未變。後端跨旅行偽造拒絕由backend介面驗證。 |
| `畫面查證原還款成功且不重複新增` | 無 | 不支援 | 無 | Then：觀察GET原repaymentId查證成功，POST只一次且ID未變；UI採權威實付顯示成功，GET list只一筆400、settlement剩JPY600/TWD300。 |
| `保留還款草稿與原識別並提示結果尚未確認` | 無 | 不支援 | 無 | Then：保留Amy/Alice/JPY400/paidOn與原UUID、可用查證入口；無成功或已確認新餘額，暫404不宣稱未寫入且不自動重送；POST一次，真實後端僅一筆400。 |
| `owner 已開啟還款日期日曆且焦點在 2027-03-11` | 無 | 不支援 | viewport以桌面與375px手機各跑；沿用DateField，不以原生日期對話框代替。 | Given：使用owner fixture建立合法旅行與Alice/Amy成員，開還款表單，DateField填2027-03-11並開自訂日曆，焦點定位當日；確認沒有提交寫入。 |
