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

## 007 分類花費分析：模組專屬契約

本節只承接 expenses 模組的新句型；不修改既有 DSL 或上提到介面根。前端與後端 row 分別在各介面權威檔，不共用 StepDef。

- 前端Arrange位置：初次建立旅行/支出資料的Given以真API或隔離DB fixture落地後，開同旅行帳本並等待ledger ready，尚不讀分析；追加/修改保存後停在原旅行帳本並保留已確認分析快取。已明寫分析頁/已確認內容的Given依各row覆寫導航起點。生命週期Given透過既有管理完成操作：復原後回同旅行帳本，trash/purge保留原分析連結，未授權Given不手工清舊快取。後端沒有瀏覽器導航。
- 資料語意：Alice 是目前帳本 owner 對應的穩定成員，不是任意付款者或登入 user ID；所有列是已保存支出，份額以不同 share member 集合等分。未分類=null，不新建分類。名稱變更沿用 ID，停用成員保留歷史 shares。
- 精確 oracle：從 DB 的完整旅行 expense、expense_shares、categories、owner member 獨立計算；個人只加 owner 在 shares 的 A/N，團體只加 N>=2 的 A 一次，日期不過濾、分頁不截斷、還款與實付排除。按幣別全部歷史支出的最大 minor_unit 對齊，BigInt 分數求和後約分；不得浮點或逐筆格式化後相加，不調整任何人的份額。
- ExactAmount 真實大單位=numerator/denominator/10^minorUnit；分子/分母為整數字串、分母正且最簡、零為0/1，各圖及分類尺度等於外層。API categories 只有正額，null先列再按 category.id 升序。所有成功回應核對 tripId 與固定 ownerMemberId。
- 每例隔離，不借前例結果；Given 落地後回寫 IDs、credential 與權威快照。讀取前後 DB 來源不變是所有讀取 Then 的最低 oracle；不呼叫產品同一聚合函式產生期望。前端對真 API/DB 的驗證不以 mock response 或只看文字取代。
- 文字百分比按各圖精確分類額/總額計算，最多2位、四捨五入去尾零，正值<0.01% 顯示「小於0.01%」；零總額無占比。不從顯示百分比重算扇形。金額依既有最多兩位、半入去尾零規則；尾差只影響顯示。

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | 後端實作語意 |
| --- | --- | --- | --- | --- |
| `分類分析旅行已有以下支出：` | 無 | 必填多列表：項目 string（旅行內唯一）、分類 string（未分類表示 null）、幣別 string、金額正十進位 string（大單位）、付款人 string、分攤者以頓號分隔的非空不重複成員集合 | 表格是該旅行完整支出；不是追加；預設值見本節 | 建立隔離帳號 Alice、有效 session、正常台南旅行（2027-04-03～05）及 owner 成員 Alice、同行者 Amy／Bob；同名分類在旅行內共用穩定 ID；預設消費日期2027-04-03，歷史精度依保存幣別。將表格支出、付款及分攤關聯寫入 DB，確認所有列落地；回寫帳號、session、trip/member/category/expense ID 及來源快照，不必先讀分析。不得用分析 response 當種子。 |
| `分類分析旅行已新增以下支出：` | 無 | 必填多列表：項目 string（旅行內唯一）、分類 string（未分類表示 null）、幣別 string、金額正十進位 string（大單位）、付款人 string、分攤者以頓號分隔的非空不重複成員集合 | 沿用目前旅行及分類/成員映射 | 在已存在旅行透過正式保存流程追加表格支出，確認 DB 支出與份額保存；回寫新 ID 與當前來源快照，不覆寫舊支出、不替換既有分析快取，不必先讀分析。 |
| `分類分析旅行尚無支出` | 無 | 不支援 | 台南旅行、Alice owner、正常狀態 | 建立隔離帳號 Alice、有效 session、正常台南旅行（2027-04-03～05）及 owner 成員 Alice、同行者 Amy／Bob；同名分類在旅行內共用穩定 ID；預設消費日期2027-04-03，歷史精度依保存幣別。確認 DB 此旅行支出為空，回寫目前旅行與來源快照，不必先讀分析。 |
| `分類分析旅行有 {筆數} 筆各 "{幣別}" {餐費} 的單人餐飲及旅行前 "{機票幣別}" {票價} 的機票` | 筆數 integer >0；幣別/機票幣別 currency code；餐費/票價正十進位大單位金額 | 不支援 | 日本旅行2027-03-10～15；餐飲2027-03-11；機票2027-01-15 | 建立 Alice 的日本旅行，按筆數寫不同項目餐飲及交通分類機票，全部 Alice 付款且僅 Alice 分攤；DB 確認含旅行外日期、完整筆數與保存金額。回寫本旅行 ID、分類 ID 及來源快照，不必讀分析或載入清單。 |
| `另一分類分析旅行有 "{幣別}" {金額} 的單人餐飲` | 幣別 currency code；金額正十進位大單位金額 | 不支援 | 同一 Alice 的另一台南旅行 | 在另一 trip 寫入 Alice 付款且單人分攤的餐飲，核對 DB 隔離；回寫另一旅行 ID，維持目前分析旅行不變，不必先讀分析。 |
| `分類分析旅行已有 Amy 還款 "{還款幣別}" {還款} 及 Bob 實付結清 "{實付幣別}" {實付}` | 還款幣別/實付幣別 currency code；還款/實付正十進位大單位金額 | 不支援 | Amy→Alice 獨立還款、Bob→Alice settlement payment，日期2027-04-03 | 沿用既有獨立還款與結清正式保存流程，在目前旅行保存指定兩筆付款並完成結清狀態；DB 確認 repayment/payment 及來源 expense_shares 均存在，回寫 ID、來源快照，不改 expense 金額與分攤，不必先讀分析。 |
| `分類分析支出 "{項目}" 已保存金額為 "{幣別}" {金額}` | 項目目前旅行唯一既有項目；幣別 currency code；金額正十進位大單位金額 | 不支援 | 同幣別為改金額；不同幣別為改幣別及金額 | 透過既有支出編輯保存流程更新該筆金額/幣別，保留其他欄位；確認 DB amount_minor、currency_code、minor_unit 及 shares 已保存，回寫最新來源快照，不能預先讀新分析或清除前端舊快取。 |
| `分類分析支出 "{項目}" 已保存分攤者為 "{分攤者}"` | 項目 string；分攤者頓號分隔非空不同成員名稱 | 不支援 | 其他支出欄位不變 | 透過既有支出更新保存完整分攤集合，DB 核對 expense_shares 精確成員 ID 集合、原付款者與金額；回寫最新來源快照，不必讀分析，不預先清除前端舊快取。 |
| `分類分析支出 "{項目}" 已刪除` | 項目 string，先前存在於目前旅行 | 不支援 | 沿用既有刪除流程 | 完成該支出的正式刪除，確認 DB 與子 shares 已刪除並保留其他支出；回寫刪除前 ID 及最新來源快照，不必讀分析、不清除前端已確認內容。 |
| `分類分析的分類 "{舊名}" 已改名為 "{新名}"` | 舊名/新名 string；舊名映射既有穩定 ID | 不支援 | 只改目前旅行引用的既有分類名稱 | 完成分類改名保存；確認 DB 同一 ID 的 current name 已更新且 expense.category_id 不變，回寫名稱映射及來源快照，不必讀分析、不先改畫面期望。 |
| `分類分析支出 "{項目}" 已清除分類` | 項目 string | 不支援 | 沒有建立名為未分類的分類 row | 完成支出編輯清除 categoryId，確認 DB category_id=null 且金額及分攤未變；回寫最新來源快照，不必讀分析。 |
| `分類分析成員 "{舊名}" 已改名為 "{新名}" 並停用` | 舊名/新名 string；映射同一 stable member ID | 不支援 | 歷史支出保留該成員 | 完成既有成員改名及停用安排，DB 確認同一 ID、新顯示名稱、inactive 與歷史 shares 不變；回寫名稱映射及快照，不必讀分析。 |
| `分類分析旅行狀態為 "{狀態}"` | 狀態 enum：正常、垃圾桶、永久刪除、已復原 | 不支援 | 沿用目前旅行，維持原 trip ID | 使用既有旅行管理流程安排指定狀態；正常不改、垃圾桶先軟刪、永久刪除必須先 trash 再確認 purge、已復原先 trash 再 restore。DB 確認 trips 狀態及 purge 級聯；回寫原 ID 與狀態快照，保留可重開的舊 URL，不必讀分析。 |
| `分類分析查看者為 "{身分}"` | 身分 enum：擁有者、未登入、同名其他帳號 | 不支援 | 其他帳號顯示名稱 Amy、沒有目前旅行權限 | 擁有者沿用 Alice session；未登入完成登出/失效 session；其他帳號建立獨立 user ID 並登入，顯示名 Amy 不連結 owner member。確認 auth/DB 權威身分後回寫目前 credential；前端保留先前已載入狀態直到被測路由/guard 處理，不手工清 DOM，不必讀分析。 |
| `擁有者讀取分類分析` | 無 | 不支援 | 目前旅行、Alice session | 唯一 Act：以 Alice session 呼叫一次 GET /api/trips/{tripId}/expense-analysis，無幣別/member/page query；保存 response 及請求前後 DB 快照。唯讀，不寫入來源資料；不再呼叫第二次受測查詢，Then 以原回應及獨立 DB oracle 驗證。 |
| `目前查看者讀取分類分析` | 無 | 不支援 | 目前安排的 credential 與原 trip ID | 唯一 Act：以目前 credential 呼叫一次同上分析 GET；保存 status/body 及請求前後 DB 快照，失敗也不得改任何權威帳務，不必查第二次分析。 |
| `分類分析回傳 "{圖別}" 在 "{幣別}" 的完整分類金額：` | 圖別 enum：個人、團體；幣別 currency code | 必填多列表：分類 string（未分類=null）、金額非負精確大單位十進位或分數 string | 分類列比對集合；API 順序另按契約驗 | 驗200及指定圖 categories 的完整 ID/name/amount 集合，無多餘舊名/分類；ExactAmount 符合本節換算與約分、順序規約。以請求前 DB 的 expense/share/category/member 關聯獨立算個人固定 owner 份額或 group >=2 原額一次，核對表格及回應；請求後來源快照不變。不用同一產品聚合函式產生期望。 |
| `分類分析回傳的完整總額如下：` | 無 | 必填多列表：幣別 currency code、個人/團體精確非負大單位十進位或分數 string | 幣別集合必須完全一致 | 驗200、currencies 完整集合、各圖 total 的精確值與 categories 精確和；獨立 DB oracle 按幣別全來源核對，零值亦驗尺度/約分，來源不變。不得使用畫面格式化值作期望。 |
| `分類分析回傳的幣別依序為 "{幣別清單}"` | 幣別清單以頓號分隔 code，順序有意義 | 不支援 | 所有存在支出的幣別，包括兩圖皆零者 | 驗200及 currencies 的完整順序恰為清單；DB 全旅行 distinct currency_code 升序核對，來源不變，不能依合資格 categories 反推幣別。 |
| `分類分析的 "{圖別}" 在 "{幣別}" 沒有分類且總額為零` | 圖別 enum：個人、團體；幣別 currency code | 不支援 | zero numerator="0"、denominator="1" | 驗200、指定圖 categories=[]、total 0/1 且 minorUnit=外層尺度；由 DB 證明該幣別有支出但此圖沒有合資格金額，來源不變。 |
| `分類分析回傳共同消費狀態為 "{狀態}"` | 狀態 enum：有、無 | 不支援 | 跨整個旅行所有幣別 | 驗200及 hasSharedExpenses 對應 true/false；DB 對所有支出以 distinct share member 數>=2 計算，無 owner 參與條件，核對無來源變更。 |
| `分類分析成功且沒有任何支出幣別` | 無 | 不支援 | 空旅行不是查詢失敗 | 驗200、正確 tripId/ownerMemberId、hasSharedExpenses=false、currencies=[]；DB 確認 owner、active、expense_count=0，前後來源不變。 |
| `分類分析旅行有歷史精度 {舊精度} 的 "{幣別}" {舊金額} 及精度 {新精度} 的 "{新幣別}" {新金額}，皆由 Alice 與 Amy 分攤` | 舊精度/新精度 integer 0..4；幣別/新幣別 currency code；舊金額/新金額正十進位大單位 string | 不支援 | 兩筆餐飲，Alice 付款；此例以 DB fixture 保留真實歷史尺度 | 在隔離旅行 DB 寫入合法歷史 expense rows，amount_minor=大單位×10^該列歷史尺度、兩人 shares；不經目前貨幣表覆寫舊 minor_unit。確認 DB 精度及成員關聯，回寫 IDs/快照，不必查分析。 |
| `分類分析的 "{幣別}" 計算精度為 {精度}` | 幣別 currency code；精度 integer 0..4 | 不支援 | 該幣別所有來源支出的最大 minor_unit | 驗外層與所有圖/分類 ExactAmount 的 minorUnit 一致並等於指定精度；DB 全來源最大尺度核對，不能只取符合 owner 的 rows，來源不變。 |
| `分類分析查詢前後的來源帳務完全相同` | 無 | 不支援 | 包含旅行、成員、分類、支出、shares、還款及實付 | 驗200；以穩定欄位全快照比較查詢前後 DB，不新增衍生紀錄、不改來源金額、分攤或結清狀態；回應與 DB oracle 的當前旅行範圍一致。 |
| `分類分析另有與同行者 "{成員}" 同名的獨立帳號` | 成員 string，已存在同行者 | 不支援 | 不切換目前 Alice session | 建立不同 user ID 的帳號，其顯示名與指定 member 一致；DB 確認沒有該 trip ownership 或認領關聯，回寫帳號 ID，不必讀分析。 |
| `分類分析的個人對象為 Alice 的擁有者成員` | 無 | 不支援 | member ID 與 user ID 分離 | 驗200及 ownerMemberId 恰為 DB 此 trip owner-role 成員 ID，非 user ID、付款人或同名帳號；personal categories 以該 member 歷史份額獨立核對，來源不變。 |
| `分類分析支出 "{項目}" 仍保留原本三個成員的歷史分攤` | 項目 string | 不支援 | Alice、原 Amy 的穩定 ID、Bob | 驗 response 中受影響 personal/group 金額與停用前獨立期望相同；DB expense_shares 仍是三個原 ID，原 Amy 名稱/active 改動未刪除歷史關聯；查詢未修改來源。 |
| `分類分析讀取被拒絕為 "{原因}"` | 原因 enum：未登入、不存在、垃圾桶 | 不支援 | 未登入=401 UNAUTHENTICATED；不存在=404 NOT_FOUND；本人垃圾桶=409 TRIP_TRASHED | 驗 status 及 ApiError code；body 不含 analysis/expense/member/category/amount payload，404 不區分他人/未知/purged。DB 證明 credential/ownership/lifecycle 與預期相符，前後帳務及 auth 狀態不因失敗查詢改變；purged 維持不存在、不可重建或洩漏。 |
