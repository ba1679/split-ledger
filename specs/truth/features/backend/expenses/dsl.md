# 後端介面 DSL

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | 後端實作語意 |
| --- | --- | --- | --- | --- |
| `使用者"甲"記錄"午餐"為 JPY -100，日期"2027-03-11"` | 無 | 不支援 | 無 | 以甲的 session 對本人旅行送 POST /api/trips/{tripId}/expenses，item=午餐、amount=-100、currencyCode=JPY、spentOn=2027-03-11；記錄 400 VALIDATION_ERROR，資料庫不得新增支出。 |
| `使用者"甲"記錄項目空白的 JPY 100 支出` | 無 | 不支援 | spentOn=2027-03-11 | 以甲的 session 對本人旅行送 POST /api/trips/{tripId}/expenses，item 為空白、amount=100、currencyCode=JPY；記錄 400 VALIDATION_ERROR，資料庫不得新增支出。 |
| `支出保存被拒絕且帳本沒有新增支出` | 無 | 不支援 | 無 | 驗 400 VALIDATION_ERROR，資料庫此旅行支出筆數未增加，GET /api/trips/{tripId}/expenses 與 totals 均維持原值。 |
| `使用者"甲"的"日本旅行"期間為"2027-03-10"至"2027-03-15"` | 無 | 不支援 | 無 | 以隔離測試資料庫建立句中帳號、有效 session 與指定業務資料；檢查擁有者關聯和已落地狀態；回寫業務識別供唯一 Act 使用，不必由 API 重演前序操作。 |
| `使用者"甲"在"日本旅行"記錄"機票"為 TWD 8000，日期"2027-01-15"` | 無 | 不支援 | 無 | 以甲的有效 session 與可信 Origin 呼叫 POST /api/trips/{tripId}/expenses；使用句中金額、幣別及日期，其他必要欄位由既定有效資料補齊；記錄回應，成功或失敗均核對資料庫權威支出。 |
| `"機票"以 TWD 8000 及"2027-01-15"保存` | 無 | 不支援 | 無 | 201；回應與 expenses row 的 item=機票、currency_code=TWD、amount_minor=800000、minor_unit=2、spent_on=2027-01-15 一致；GET 單筆再讀相同。 |
| `使用者"甲"的"日本旅行"有 TWD 8000、JPY 15000 與 JPY 2000 的已保存支出` | 無 | 不支援 | 無 | 以隔離測試資料庫建立句中帳號、有效 session 與指定業務資料；檢查擁有者關聯和已落地狀態；回寫業務識別供唯一 Act 使用，不必由 API 重演前序操作。 |
| `使用者"甲"查詢"日本旅行"總額` | 無 | 不支援 | 無 | 以甲的有效 session 呼叫 GET /api/trips/{tripId}/totals；記錄回應，查詢不修改資料。 |
| `"日本旅行"總額為 TWD 8000 與 JPY 17000` | 無 | 不支援 | 無 | 200；totals 僅有 TWD=8000、JPY=17000 兩組；由資料庫各已保存支出精確加總，再讀 totals 一致。 |
| `使用者"甲"的"日本旅行"有 JPY 15000 的住宿與 JPY 2000 的餐費` | 無 | 不支援 | 無 | 以隔離測試資料庫建立句中帳號、有效 session 與指定業務資料；檢查擁有者關聯和已落地狀態；回寫業務識別供唯一 Act 使用，不必由 API 重演前序操作。 |
| `使用者"甲"將餐費改為 JPY 2500` | 無 | 不支援 | 無 | 以甲的有效 session 與可信 Origin 呼叫 PATCH /api/trips/{tripId}/expenses/{expenseId}；使用句中金額、幣別及日期，其他必要欄位由既定有效資料補齊；記錄回應，成功或失敗均核對資料庫權威支出。 |
| `"日本旅行"日幣總額為 17500` | 無 | 不支援 | 無 | 200 更新回應與資料庫餐費 amount_minor=2500；GET totals 的 JPY=17500，按資料庫住宿 15000 加餐費 2500 核對。 |
| `使用者"甲"的"日本旅行"有 TWD 8000 的機票與 JPY 17500 的其他支出` | 無 | 不支援 | 無 | 以隔離測試資料庫建立句中帳號、有效 session 與指定業務資料；檢查擁有者關聯和已落地狀態；回寫業務識別供唯一 Act 使用，不必由 API 重演前序操作。 |
| `使用者"甲"將機票改為 JPY 8000` | 無 | 不支援 | 無 | 以甲的有效 session 與可信 Origin 呼叫 PATCH /api/trips/{tripId}/expenses/{expenseId}；使用句中金額、幣別及日期，其他必要欄位由既定有效資料補齊；記錄回應，成功或失敗均核對資料庫權威支出。 |
| `"日本旅行"總額只有 JPY 25500` | 無 | 不支援 | 無 | 200 更新回應與資料庫機票 currency_code=JPY、amount_minor=8000；GET totals 僅 JPY=25500，TWD 不存在。 |
| `使用者"甲"的"日本旅行"有"住宿"支出` | 無 | 不支援 | 無 | 以隔離測試資料庫建立句中帳號、有效 session 與指定業務資料；檢查擁有者關聯和已落地狀態；回寫業務識別供唯一 Act 使用，不必由 API 重演前序操作。 |
| `使用者"甲"刪除"住宿"支出` | 無 | 不支援 | 無 | 以甲的有效 session 與可信 Origin 呼叫 DELETE /api/trips/{tripId}/expenses/{expenseId}；使用句中金額、幣別及日期，其他必要欄位由既定有效資料補齊；記錄回應，成功或失敗均核對資料庫權威支出。 |
| `"日本旅行"不再含"住宿"支出` | 無 | 不支援 | 無 | 204 無本文；資料庫住宿 row 不存在，GET 支出清單不含該 id，單筆 GET 為 404。 |
| `使用者"甲"的"日本旅行"有 JPY 15000 的住宿與 JPY 10500 的其他支出` | 無 | 不支援 | 無 | 以隔離測試資料庫建立句中帳號、有效 session 與指定業務資料；檢查擁有者關聯和已落地狀態；回寫業務識別供唯一 Act 使用，不必由 API 重演前序操作。 |
| `"日本旅行"日幣總額為 10500` | 無 | 不支援 | 無 | 204 刪除成功；資料庫不含 JPY 15000 住宿，GET totals 的 JPY=10500。 |
| `使用者"甲"擁有"日本旅行"` | 無 | 不支援 | 無 | 以隔離測試資料庫建立句中帳號、有效 session 與指定業務資料；檢查擁有者關聯和已落地狀態；回寫業務識別供唯一 Act 使用，不必由 API 重演前序操作。 |
| `使用者"甲"記錄"午餐"為 JPY 0，日期"2027-03-11"` | 無 | 不支援 | 無 | 以甲的有效 session 與可信 Origin 呼叫 POST /api/trips/{tripId}/expenses；使用句中金額、幣別及日期，其他必要欄位由既定有效資料補齊；記錄回應，成功或失敗均核對資料庫權威支出。 |
| `支出保存被拒絕且帳本沒有"午餐"` | 無 | 不支援 | 無 | 400 VALIDATION_ERROR；資料庫沒有新午餐 row、旅行支出筆數及 totals 不變；再讀清單不含午餐。 |
| `使用者"甲"記錄"午餐"為 JPY 100.5，日期"2027-03-11"` | 無 | 不支援 | 無 | 以甲的有效 session 與可信 Origin 呼叫 POST /api/trips/{tripId}/expenses；使用句中金額、幣別及日期，其他必要欄位由既定有效資料補齊；記錄回應，成功或失敗均核對資料庫權威支出。 |
| `使用者"甲"記錄"飲料"為 USD 12.50，日期"2027-03-11"` | 無 | 不支援 | 無 | 以甲的有效 session 與可信 Origin 呼叫 POST /api/trips/{tripId}/expenses；使用句中金額、幣別及日期，其他必要欄位由既定有效資料補齊；記錄回應，成功或失敗均核對資料庫權威支出。 |
| `"飲料"以 USD 12.50 保存` | 無 | 不支援 | 無 | 201；回應與資料庫 item=飲料、currency_code=USD、amount_minor=1250、minor_unit=2、spent_on=2027-03-11；再讀相同。 |
| `使用者"甲"記錄未分類的"午餐"支出` | 無 | 不支援 | 無 | 以甲的有效 session 與可信 Origin 呼叫 POST /api/trips/{tripId}/expenses；使用句中金額、幣別及日期，其他必要欄位由既定有效資料補齊；記錄回應，成功或失敗均核對資料庫權威支出。 |
| `"午餐"已保存且沒有分類` | 無 | 不支援 | 無 | 201；回應與資料庫午餐 row 的 category_id=null，item 與 owner/trip 不變；再讀相同。 |
| `使用者"甲"在手機工作階段已保存"日本旅行"的 JPY 1200 午餐` | 無 | 不支援 | 無 | 以隔離測試資料庫建立句中帳號、有效 session 與指定業務資料；檢查擁有者關聯和已落地狀態；回寫業務識別供唯一 Act 使用，不必由 API 重演前序操作。 |
| `使用者"甲"在電腦工作階段查詢"日本旅行"支出` | 無 | 不支援 | 無 | 以甲的有效 session 呼叫 GET /api/trips/{tripId}/expenses；記錄回應，查詢不修改資料。 |
| `支出清單包含 JPY 1200 的"午餐"` | 無 | 不支援 | 無 | 200；電腦 session 回應包含與手機已存相同 id、JPY minor_unit=0、amount_minor=1200 的午餐；核對資料庫 owner 為甲。 |
| `使用者"甲"記錄"午餐"為 TWD 100.50，日期"2027-03-11"` | 無 | 不支援 | 無 | 使用甲的 session 與可信 Origin 呼叫 POST /api/trips/{tripId}/expenses，送入 item=午餐、amount="100.50"、currencyCode=TWD、spentOn=2027-03-11；記錄回應，不變更權威資料。 |

## Phase 1B 旅行分帳

所有 Given 以隔離資料建立權威狀態；When 只有一次受測命令或查詢，寫入前擷取完整帳務快照，記錄回應與資源 ID，寫入成功才讀取落地資料；失敗保持來源。Then 依各列驗 DB 與 API，再讀僅作確認，不是第二個 Act。有理數 oracle 不共用受測計算函式；金額均依歷史 minorUnit 作 BigInt 交叉相乘，不使用浮點近似。

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | StepDef 實作語意 |
| --- | --- | --- | --- | --- |
| `owner 記錄平均分攤支出：` | 無 | 必填恰一列；項目:string、幣別:ISO code、金額:十進位 string、付款人:string 成員別名、分攤者:「、」分隔集合。 | spentOn=2027-01-20；categoryId=null；建立前保留 UUID。 | When：owner session+可信 Origin POST /expenses，member 別名轉 payerMemberId/shareMemberIds；原樣傳金額，不在測試 client 提前取整。保存 before/reply/expenseId；成功 expenses/shares 原子落地，失敗來源不變。 |
| `該支出的分攤份額為：` | 無 | 必填多列；成員:string、幣別:ISO code、份額:精確大單位有理數 string（整數或分子/分母）。 | 無 | Then：201 response shares 與 DB 分攤成員集合恰等於表格非零份額者；以 BigInt 根據 amount_minor/n 獨立計算、換 minorUnit 並交叉相乘驗 ExactAmount。未分攤成員可列零但不得持久化零份額；所有份額和精確等於支出。GET 單筆再讀一致，不允許34/33/33分餘數。 |
| `該旅行的付款安排為：` | 無 | 必填多列；付款人/收款人:string、幣別:ISO code、金額:精確大單位有理數 string。 | 無 | Then：依本案例來源獨立重建直接安排，GET settlement 的 arrangements 作不含 key 的完整集合比較，金額依 minorUnit 精確比較；核對 DB 支出/分攤/還款/調整，不得只看 response。表格為完整集合，不得含自付、額外安排或舊貢獻。 |
| `owner 以舊版個人支出欄位記錄機票` | 無 | 不支援 | item=機票、amount=8000、currencyCode=TWD、spentOn=2027-01-15、categoryId=null；省略 payerMemberId/shareMemberIds。 | When：owner session+可信 Origin POST /expenses，只送 Phase1A 必要欄位及預留 UUID；檢查 source 已落地並保存 response/expenseId；不先在 client 補分帳欄位。 |
| `機票保留原始欄位且僅由 owner 付款分攤` | 無 | 不支援 | 無 | Then：201 或讀取案例200；response/DB item=機票,TWD amount_minor=800000/minorUnit=2,spentOn=2027-01-15,category=null；付款人=ownerMemberId、分攤集合恰owner，份額8000；GET單筆、totals TWD8000.00再讀一致；GET settlement 所有淨額零且無安排，不改原支出顯示契約。 |
| `舊版機票支出已完成分帳資料遷移` | 無 | 不支援 | 遷移前 fixture 為 owner 的機票 TWD8000、2027-01-15、無分類。 | Given：以遷移前 schema 建立真正舊資料，再套正式新增 migration（不能只把已更新資料標成舊版）；保存遷移前原始欄位/統計快照，驗 owner 成員與單人 share 回填已落地，回寫 expenseId；Act 為之後讀取，不將 migration 當 API命令。 |
| `owner 讀取遷移後的機票支出` | 無 | 不支援 | 無 | When：owner session GET /expenses/{expenseId}，保存回應；不修改 DB，也不重新跑 migration。 |
| `owner 嘗試以 "{問題}" 保存共同支出` | 問題:enum 只有付款人/只有分攤者/無分攤者/重複分攤者/停用付款人/停用分攤者/跨旅行付款人/跨旅行分攤者。 | 不支援 | item=點心、JPY100、spentOn=2027-01-20；Given已建立停用Carol與別趟David。 | When：僅一次 POST /expenses：只有付款人省shareMemberIds，只有分攤者省payerMemberId；無分攤者=[]；重複=[Amy,Amy]；停用或跨旅行分別指定對應ID。保存before/reply，不讓client先阻擋。非跨旅行預期400，跨旅行404；不得新增部分支出或分享列。 |
| `支出驗證用的停用與跨旅行成員已建立` | 無 | 不支援 | 無 | Given：在基準成員將Carol停用，並在同owner另一旅行建立David；回寫正確ID。此為驗證輸入fixture，不操作受測寫入。 |
| `owner 將晚餐改為由 Amy 付款並由 Amy 與 Bob 分攤 JPY 200` | 無 | 不支援 | 無 | When：owner session+可信 Origin PATCH 晚餐的expenseId，amount=200/payerMemberId=Amy/shareMemberIds=[Amy,Bob]；只一命令，保存before/reply；支出與集合須在同交易完整替換，成功後保存新revision。 |
| `晚餐的新份額為 Amy 與 Bob 各 JPY 100` | 無 | 不支援 | 無 | Then：200 response/DB/GET晚餐付款人Amy、金額200、share集合恰[Amy,Bob]；兩者ExactAmount各100，owner舊share不存在；其餘欄位及其他支出不被覆寫。 |
| `owner 刪除共同晚餐支出` | 無 | 不支援 | 無 | When：owner session+可信 Origin DELETE /expenses/{晚餐id} 無body，保存before/reply；成功只移除此支出與share，不改歷史實付。 |
| `晚餐已不再影響帳本與結算` | 無 | 不支援 | 無 | Then：204、DB無晚餐及其share，GET單筆404、清單排除；GET settlement原晚餐貢獻完全消失，無其他來源時淨額全0/安排空；不得留下原物件作快取權威。 |
| `owner 將原支出金額改為 JPY 800` | 無 | 不支援 | 無 | When：僅PATCH該原支出的amount=800；保留payer/share，owner session+可信 Origin，保存before/reply/expenseId；不得透過刪除重建支出實作測試命令。 |
| `已記錄還款保持原事實` | 無 | 不支援 | 無 | Then：核對所有既有repayments的id、兩端、amount/minorUnit/currency、paidOn、kind/settlementId逐欄與Act前相同；GET清單及單筆再讀一致；有歷史settlement/adjustments時亦不可刪改。 |
| `owner 僅修改既有含停用分攤者支出的項目` | 無 | 不支援 | 新item=車票修正；不提供payerMemberId/shareMemberIds。 | When：owner session+可信 Origin PATCH原支出，只送item；保存before/reply，不新添停用成員ID。 |
| `既有停用成員的分攤集合保持原值` | 無 | 不支援 | 無 | Then：200、DB/GET項目改為車票修正，payer與share集合與Act前相同，Carol的歷史份額繼續參與settlement；無新成員引用。 |

## Phase 1B 旅行分帳

所有 Given 以隔離資料建立權威狀態；When 只有一次受測命令或查詢，寫入前擷取完整帳務快照，記錄回應與資源 ID，寫入成功才讀取落地資料；失敗保持來源。Then 依各列驗 DB 與 API，再讀僅作確認，不是第二個 Act。有理數 oracle 不共用受測計算函式；金額均依歷史 minorUnit 作 BigInt 交叉相乘，不使用浮點近似。

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | StepDef 實作語意 |
| --- | --- | --- | --- | --- |
| `owner 刪除已有還款的原支出` | 無 | 不支援 | 無 | When：owner session+可信Origin DELETE /expenses/{原支出id}，無body，只一命令；保存before/reply；成功刪expenses及shares，但不得CASCADE實付/settlement/adjustments。 |
| `原支出已以 Amy 實付 JPY 33 結清` | 無 | 不支援 | 無 | Given：建立Alice付款JPY100、只Amy分攤的原支出及依其obligation100/1、paid33結清的不可變settlement/repayment/兩調整（Amy+67,Alice−67），revision已增加；回寫原expenseId與歷史快照，無其他來源。該fixture是任意正數可結清的已完成狀態，不在Act結清。 |
| `原支出修正後的歷史結清快照保持不變` | 無 | 不支援 | 無 | Then：PATCH200或DELETE204依唯一Act決定；DB/GET settlementRecord/repayment的IDs、sourceRevision、obligation100、paid33、兩端、幣別、paidOn與兩調整±67逐欄等於Act前；不可因來源修正重套/改寫差額，最新settlement由現在來源與保留的歷史資料重建，不要求仍零。 |

## Phase 1B 旅行分帳

所有 Given 以隔離資料建立權威狀態；When 只有一次受測命令或查詢，寫入前擷取完整帳務快照，記錄回應與資源 ID，寫入成功才讀取落地資料；失敗保持來源。Then 依各列驗 DB 與 API，再讀僅作確認，不是第二個 Act。有理數 oracle 不共用受測計算函式；金額均依歷史 minorUnit 作 BigInt 交叉相乘，不使用浮點近似。

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | StepDef 實作語意 |
| --- | --- | --- | --- | --- |
| `owner 嘗試以 "{問題}" 修改既有共同支出` | 問題:enum 無分攤者/重複分攤者/停用付款人/停用分攤者/跨旅行付款人/跨旅行分攤者。 | 不支援 | 無 | When：僅PATCH既有expenseId，針對問題只送shareMemberIds=[]、[Amy,Amy]、payer=Carol、shares=[Carol]、payer=另一旅行David或shares=[David]；其他欄位省略保留原值。owner session+可信Origin，保存完整before/reply，跨旅行404其他400；不得沿用POST缺配對欄位限制。 |
| `支出修改被拒絕且舊分攤與安排完全保留` | 無 | 不支援 | 無 | Then：回應400 VALIDATION_ERROR或跨旅行404 NOT_FOUND依Given/When指定問題決定；DB expense原始欄位、share集合、全部歷史實付/調整與trip revision不變。GET單筆、清單、settlement及totals仍等於before精確oracle，無部分替換或新增引用。 |

## 來源更正的幣別與反轉

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | StepDef 實作語意 |
| --- | --- | --- | --- | --- |
| `owner 將原支出金額改為 JPY 300` | 無 | 不支援 | 只送 amount=300。 | When：以owner session/可信Origin對Given expenseId做一次PATCH，保留付款人及分攤集合；保存before/reply，成功後權威金額先落地再供結算斷言，失敗來源不變；不必重演原始還款。 |
| `owner 將原支出改為 JPY 200` | 無 | 不支援 | currencyCode=JPY、amount=200；其餘欄位省略。 | When：一次PATCH Given expenseId，同owner session/可信Origin；金額與歷史minorUnit依實際新幣別更新，完整替換舊貢獻但保留已發生TWD還款，不進行匯率換算。保存before/reply與新expenseId快照，成功才落地；失敗來源不變。 |
