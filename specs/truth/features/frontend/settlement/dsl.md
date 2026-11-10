# 分帳結算與實付結清 DSL

## 005 新增契約

以下每列以既有 Playwright BDD fixture、page object 與真實 API/隔離資料庫實作。固定場景常數即句內明示值；所有 Then 不執行新的受測操作，API 再讀屬只讀權威查核。MoneyAmount 以字串解析，ExactAmount 用 BigInt 有理數，不用浮點或畫面值重算。fixture 所有名稱映射到同旅行穩定 UUID；未標示的可選值為 null，不自行擴張業務。

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | Playwright BDD 實作語意 |
| --- | --- | --- | --- | --- |
| `owner 已開啟關閉簡化付款的結算畫面` | 無 | 不支援 | 無 | Given：fixture確保trip.simplifyDebts=false；開settlement頁等待GET trip/settlement同revision，保存已確認arrangements、balances及來源快照。 |
| `該旅行已保存簡化付款開啟` | 無 | 不支援 | 無 | Given：API fixture PATCH trip simplifyDebts=true，讀trip/settlement確認保存並記錄revision與確定安排；不透過本案例受測切換控制操作。 |
| `owner 已開啟簡化付款的結算畫面` | 無 | 不支援 | 無 | Given：開settlement頁等待GET trip/settlement皆simplifyDebts=true且revision一致，記錄舊畫面及來源快照。 |
| `本次簡化付款保存明確失敗` | 無 | 不支援 | 無 | Given：代理目標PATCH trip在寫入前回明確失敗，權威trip仍false；保留舊revision與兩筆安排，不模擬已成功未確認。 |
| `owner 查看分帳結算` | 無 | 不支援 | 無 | When：開結算頁等待GET settlement完成，資料來自真實後端；保存mode/revision/ExactAmount與畫面快照。 |
| `owner 開啟簡化付款` | 無 | 不支援 | 無 | When：操作有可讀名稱「簡化付款」的switch一次，等待PATCH trip及其後GET settlement同revision；保存payload與確認結果，不能僅改本地模式。 |
| `owner 關閉簡化付款` | 無 | 不支援 | 無 | When：操作有可讀名稱「簡化付款」的switch一次，等待PATCH trip及其後GET settlement同revision；保存payload與確認結果，不能僅改本地模式。 |
| `三句內說明 Alice 改付 Carol、兩筆變一筆與淨額及來源紀錄不變` | 無 | 不支援 | 無 | Then：核對visible及accessible switch名稱「簡化付款」，說明至多三句且涵蓋Alice原付Bob/Bob原付Carol、現Alice付Carol、2→1、每人淨額及原始支出/還款不變；無「改道」「精確」「公平」「Simplify Debts」。核對API directArrangementCount=2、suggestedArrangementCount=1及balances不變，不能僅驗字串。 |
| `仍為 Amy 支付 Alice JPY 500 並提示目前的付款安排已無需調整` | 無 | 不支援 | 無 | Then：API與畫面arrangements集合恰Amy→Alice JPY500，direct/suggested均1，說明含「目前的付款安排已無需調整」且<=3句，無改道術語；來源不變。 |
| `簡化付款仍開啟且重現 Alice 支付 Carol JPY 60` | 無 | 不支援 | 無 | Then：trip與settlement simplifyDebts=true、switch checked；API/畫面完整安排與fixture已保存快照一致且僅Alice→Carol60，不重設為false；有理數淨額與來源不變。 |
| `保留關閉模式的已確認兩筆安排並提供重試` | 無 | 不支援 | 無 | Then：錯誤狀態可讀且有重試入口（本Then不操作）；switch及arrangements保持已確認false、Alice→Bob60與Bob→Carol60；GET trip/settlement仍舊revision，不顯示新建議成功。 |
| `owner 已開啟 {付款人} 支付 Alice 的實付結清表單` | 付款人:string Amy或Bob | 不支援 | paidOn=2027-03-12；結清ID與repaymentId於送出前預留。 | Given：以已建立資料讀GET settlement，取指定付款人→Alice的安排key/revision/ExactAmount原樣記錄並打開其結清表單，等待載入。實付欄保持空白。 |
| `另一裝置已修改點心而目前結清表單仍為舊安排` | 無 | 不支援 | 無 | Given：表單開啟後另一context PATCH點心金額200，確認revision增加；保留本context原key/revision/100/3，禁止fixture先刷新本表單。 |
| `結清成功回應遺失但原結果可查證` | 無 | 不支援 | 無 | Given：代理僅丟棄本次POST settlements成功回應；原預留settlementId的GET仍可達真實後端。 |
| `結清成功回應遺失且原結果暫不可查證` | 無 | 不支援 | 無 | Given：代理丟棄本次POST成功回應且使原ID GET暫時404/失敗；後端仍真實成功；記錄已落地結果避免把404當未寫入。 |
| `owner 輸入實付 JPY {金額} 並結清` | 金額:string 整數大單位，0用於失敗 | 不支援 | 無 | When：輸入實付後按結清一次；記錄POST request，必須原樣傳arrangementKey、accountingRevision、兩端、currencyCode與expectedAmount（不可33.33替代100/3）；paidAmount依JPY整數、paidOn沿用；等待成功/衝突/結果不明。 |
| `owner 開啟 Amy 支付 Alice 的實付結清表單` | 無 | 不支援 | 無 | When：開最新Amy→Alice安排表單一次，等待資料與應付標示，不輸入實付或保存。 |
| `{付款人} 的安排已關閉且保存實付 JPY {實付} 與原應付 JPY {應付}` | 付款人:string Amy；實付:string 正整數；應付:string 正有理數 | 不支援 | 無 | Then：畫面成功摘要含應付格式與實付；GET原settlementId的record obligation精確等於應付、repayment等於實付且kind=settlement；adjustments恰兩筆，付款人=應付−實付、收款人相反，精確和0。GET最新settlement無指定安排及因本次超付產生的反向安排，其他安排僅合法重算；來源shares不變，payload及資料皆無取整方式。 |
| `三人已平衡且保留兩筆實付與原始份額` | 無 | 不支援 | 無 | Then：GET settlement三人JPY淨額精確0且無安排；GET repayments恰33與34的settlement實付、各有不可變record與兩筆零和調整；原JPY100份額各100/3且原支出不變。UI已結清，不出現次最小單位尾差或反向付款。 |
| `應付顯示 JPY 33.33 而實付留空且沒有取整方式選擇` | 無 | 不支援 | 無 | Then：應付可見/accessible文字JPY33.33，實付input值空；不存在取整、四捨五入、向上/向下策略控制；未發寫入，GET安排ExactAmount仍100/3。 |
| `實付欄提示正數且安排未結清` | 無 | 不支援 | 無 | Then：有可讀欄位錯誤並保留0；無成功提示。GET settlement仍原key及應付100/3，repayments/settlements/adjustments無新增。 |
| `提示安排已更新並要求刷新且沒有本次實付或結清` | 無 | 不支援 | 無 | Then：核對ACCOUNTING_REVISION_CONFLICT或ARRANGEMENT_NOT_FOUND映射到過期狀態與刷新入口；禁止自動以新key送出，POST至多一次；GET原預留settlement/repayment不存在，來源維持另一裝置新值，新安排不得偽顯已結清。 |
| `畫面查證原結清成功且不重複記錄` | 無 | 不支援 | 無 | Then：網路記錄顯示GET原settlementId查證成功、POST僅一次且未換新ID；畫面成功以查證record為準；DB/GET確認一筆record、一筆repayment、兩筆零和adjustments，指定安排已關閉。 |
| `畫面保留實付草稿並提示結清結果尚未確認` | 無 | 不支援 | 無 | Then：保留33與paidOn及原結清/還款ID；無成功訊息或已確認關閉；提供查證結果入口但Then不觸發；暫404不自動重送，監聽POST一次，後端只原record/repayment/兩調整。 |
| `owner 已開啟結清日期日曆且焦點在 2027-03-11` | 無 | 不支援 | viewport以桌面與375px手機各跑；沿用DateField，不以原生日期對話框代替。 | Given：使用owner fixture建立合法旅行與Amy→Alice JPY100安排，開結清表單，DateField填2027-03-11並開自訂日曆，焦點定位當日；確認沒有提交寫入。 |
| `分帳畫面只列出以下付款安排：` | 無 | 必填多列；付款人/收款人:string 成員；幣別:string；金額:string 正有理數；顯示:string。 | 無 | Then：等待相關結算 query 完成，畫面安排集合必須與 GET settlement 的完整 arrangements 一致；按穩定成員 ID、幣別及精確數值核對，顯示採四捨五入最多兩位去尾零。集合精確相等，禁止額外自付、跨幣別、反向或殘留舊安排。記錄本次 revision/arrangement key 供後續 fixture 參照。 |
