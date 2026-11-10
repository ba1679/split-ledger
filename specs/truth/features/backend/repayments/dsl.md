# 後端介面 DSL

## Phase 1B 旅行分帳

所有 Given 以隔離資料建立權威狀態；When 只有一次受測命令或查詢，寫入前擷取完整帳務快照，記錄回應與資源 ID，寫入成功才讀取落地資料；失敗保持來源。Then 依各列驗 DB 與 API，再讀僅作確認，不是第二個 Act。有理數 oracle 不共用受測計算函式；金額均依歷史 minorUnit 作 BigInt 交叉相乘，不使用浮點近似。

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | StepDef 實作語意 |
| --- | --- | --- | --- | --- |
| `owner 記錄 Amy 向 Alice 的 JPY "{金額}" 獨立還款` | 金額:string，原樣傳入供正數/精度驗證。 | 不支援 | paidOn=2027-01-20；新預留UUID；無overpaymentConfirmation。 | When：owner session+可信Origin一次POST /repayments，payer=Amy/payee=Alice/amount=句中原字串/currency=JPY；保存before/reply/id。201須先DB落地；409警告不寫入。此命令不關閉指定安排或產生結清調整，不模擬付款金流。 |
| `獨立還款已以 JPY "{金額}" 保存` | 金額:string 正數預期。 | 不支援 | 無 | Then：201 response與DB同預留id、payer/payee、JPY minorUnit0、amount、paidOn2027-01-20；kind=independent/settlementId=null；GET清單與單筆一致。沒有新增settlement或adjustment，revision遞增一次；不能只有前端成功訊息。 |
| `獨立還款後的付款安排如下：` | 無 | 必填多列；付款人/收款人:string、幣別:ISO code、金額:精確大單位有理數 string。 | 無 | Then：GET settlement完整arrangements集合精確等於表格，根據DB支出/份額/實付/調整獨立計算，兩端/幣別/金額無額外安排；同revision再讀一致。此案例不同幣別也列入完整預期，不可忽略未列非零安排。 |
| `先前還款與其他幣別來源保持不變` | 無 | 不支援 | 無 | Then：Act前所有既有repayments逐欄不變，其他幣別expense/share/實付/調整與前快照相同；GET settlement其他幣別的兩端及amount仍等於oracle；只有當次實付幣別餘額可變，不因簡化設定改實付事實。 |
| `超額還款尚未保存並回傳 JPY 100 的反向應付警告` | 無 | 不支援 | 無 | Then：409 OVERPAYMENT_CONFIRMATION_REQUIRED，confirmation含本revision、excessAmount精確100、reverseDebtor=Alice/reverseCreditor=Amy及非空token；message說明700比600超100。DB無此預留repayment、無settlement/adjustment且revision不變，GET原安排仍Amy→Alice600；不能以UI提醒代替後端不寫入。 |
| `Amy 應付 JPY 600 且 owner 已取得 JPY 700 的超額警告` | 無 | 不支援 | 無 | Given：建立Alice支付且僅Amy分攤的JPY600支出；以受控fixture準備真實伺服器簽發、尚未保存的超額警告快照/token（可用Arrange呼叫POST取得409），保存同一預留id/實付內容/revision；檢查DB無還款與來源一致。警告請求為前序準備，不是本案例受測確認Act。 |
| `owner 明確確認同一筆 JPY 700 的超額還款` | 無 | 不支援 | 無 | When：只一次POST /repayments，沿用Given預留id及原實付欄位、完整伺服器confirmation快照/token。owner session+可信Origin；伺服器應在旅行鎖內重核revision/超額/兩端後成功寫入，保存reply/DB狀態；不以客戶端布林值代替確認。 |
| `超額警告後旅行已有新的帳務版本` | 無 | 不支援 | 無 | Given：另一已完成交易新增Alice個人JPY10支出並遞增revision，保持原警告token/快照供Act；capture現行before；不預先替owner接受新警告。 |
| `owner 以變造的確認資料送出超額還款` | 無 | 不支援 | 無 | When：沿用預留id與原JPY700，將token字元修改為伺服器未簽發的值而保持格式合法；僅一次POST /repayments，保存before/reply；不得信任客戶端snapshot而寫入。 |
| `變造確認未獲接受且沒有保存還款` | 無 | 不支援 | 無 | Then：API回4xx且不為201；契約未固定偽造token為哪個code，不擅自規定400或409。DB預留還款不存在、所有來源及revision等於Act前，GET原JPY600安排不變；不可把任意500當作正確拒絕。 |
| `還款驗證用的停用與跨旅行成員已建立` | 無 | 不支援 | 無 | Given：Carol設為停用、同owner另一旅行建立David，保存memberId對照；不修改原JPY600來源與既有還款。 |
| `owner 嘗試記錄 "{問題}" 的獨立還款` | 問題:enum 本人付本人/非正數/無效幣別/無效日期/停用付款人/停用收款人/跨旅行付款人/跨旅行收款人。 | 不支援 | JPY100、Amy→Alice、2027-01-20，只有對應問題欄位改變。 | When：僅一次POST /repayments，問題分別為payee=Amy、amount=0、currency=ZZZ、paidOn=2027-02-30、payer或payee=Carol、payer或payee=另一旅行David。owner session+可信Origin，保存before/reply，失敗不可留下部分還款；跨旅行404，其餘400。 |
| `owner 查詢旅行實際還款紀錄` | 無 | 不支援 | 無 | When：owner session GET /repayments，只讀一次，保存reply；不更改kind/金額/兩端/日期。 |
| `實際還款保留各次付款事實` | 無 | 不支援 | 無 | Then：200 items與DB全部既有repayments逐筆一致，包含id、kind、settlementId、兩端、幣別、minorUnit、金額與paidOn，依paidOn/id新到舊；本案例兩筆400/600均存在且沒有合併成1000；GET單筆再讀同一事實。 |
