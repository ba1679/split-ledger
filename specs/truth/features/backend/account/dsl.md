# 後端介面 DSL

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | 後端實作語意 |
| --- | --- | --- | --- | --- |
| `使用者"甲"的"日本旅行"開始日為"2027-03-10"且使用者"乙"已登入` | 無 | 不支援 | 無 | 在隔離資料庫建立甲擁有的旅行，startDate=2027-03-10，並建立乙的有效 session；回寫甲的 tripId，核對 owner_id 為甲。 |
| `使用者"乙"將"日本旅行"開始日改為"2027-03-11"` | 無 | 不支援 | 無 | 以乙的 session 與可信 Origin 對甲的 tripId 送 PATCH /api/trips/{tripId}，startDate=2027-03-11；記錄 404 NOT_FOUND，資料庫不得更新。 |
| `旅行修改回覆找不到且原日期維持不變` | 無 | 不支援 | 無 | 驗 404 NOT_FOUND 且回應不含甲的旅行資料；資料庫仍由甲擁有，start_date=2027-03-10；甲再讀仍為原日期。 |
| `使用者"甲"已有有效登入工作階段` | 無 | 不支援 | 無 | 以隔離測試資料庫建立句中帳號、有效 session 與指定業務資料；檢查擁有者關聯和已落地狀態；回寫業務識別供唯一 Act 使用，不必由 API 重演前序操作。 |
| `使用者"甲"查詢目前帳號` | 無 | 不支援 | 無 | 以指定有效或缺失 session 呼叫 GET /api/me；記錄狀態與回應；不改動帳號資料。 |
| `回傳使用者"甲"的帳號身分` | 無 | 不支援 | 無 | 200；回應 user id 是甲且與有效 session 的 user_id 一致，不含乙資料。 |
| `使用者尚未完成登入` | 無 | 不支援 | 無 | 以隔離測試資料庫建立句中帳號、有效 session 與指定業務資料；檢查擁有者關聯和已落地狀態；回寫業務識別供唯一 Act 使用，不必由 API 重演前序操作。 |
| `使用者查詢目前帳號` | 無 | 不支援 | 無 | 以指定有效或缺失 session 呼叫 GET /api/me；記錄狀態與回應；不改動帳號資料。 |
| `帳號查詢回覆未登入` | 無 | 不支援 | 無 | 401；回應不含 user id，資料庫沒有由此查詢建立的新 session 或帳本。 |
| `使用者"甲"擁有"日本旅行"且使用者"乙"已登入` | 無 | 不支援 | 無 | 以隔離測試資料庫建立句中帳號、有效 session 與指定業務資料；檢查擁有者關聯和已落地狀態；回寫業務識別供唯一 Act 使用，不必由 API 重演前序操作。 |
| `使用者"乙"查詢"日本旅行"` | 無 | 不支援 | 無 | 以乙的 session 呼叫 GET /api/trips/{tripId}，識別指向甲的旅行；記錄回應；不修改資料。 |
| `旅行查詢回覆找不到且不揭露甲的資料` | 無 | 不支援 | 無 | 404 NOT_FOUND；回應不含甲的名稱與識別，資料庫甲的旅行仍存在且 owner_id 不變。 |
| `使用者"甲"擁有"餐飲"分類且使用者"乙"已登入` | 無 | 不支援 | 無 | 以隔離測試資料庫建立句中帳號、有效 session 與指定業務資料；檢查擁有者關聯和已落地狀態；回寫業務識別供唯一 Act 使用，不必由 API 重演前序操作。 |
| `使用者"乙"查詢"餐飲"分類` | 無 | 不支援 | 無 | 以乙的 session 呼叫 GET /api/categories/{categoryId}，識別指向甲的分類；記錄回應；不修改資料。 |
| `分類查詢回覆找不到且不揭露甲的資料` | 無 | 不支援 | 無 | 404 NOT_FOUND；回應不含甲的分類名稱與識別，資料庫分類 owner_id 仍為甲。 |
| `使用者"甲"在手機工作階段擁有"日本旅行"` | 無 | 不支援 | 無 | 以隔離測試資料庫建立句中帳號、有效 session 與指定業務資料；檢查擁有者關聯和已落地狀態；回寫業務識別供唯一 Act 使用，不必由 API 重演前序操作。 |
| `使用者"甲"在電腦工作階段查詢旅行清單` | 無 | 不支援 | 無 | 以甲的另一有效 session 呼叫 GET /api/trips；記錄回應；不修改資料。 |
| `旅行清單包含"日本旅行"` | 無 | 不支援 | 無 | 200；甲的電腦 session 回應包含手機已存的同一 trip id；資料庫 owner_id 為甲。 |

## Phase 1B 旅行分帳

所有 Given 以隔離資料建立權威狀態；When 只有一次受測命令或查詢，寫入前擷取完整帳務快照，記錄回應與資源 ID，寫入成功才讀取落地資料；失敗保持來源。Then 依各列驗 DB 與 API，再讀僅作確認，不是第二個 Act。有理數 oracle 不共用受測計算函式；金額均依歷史 minorUnit 作 BigInt 交叉相乘，不使用浮點近似。

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | StepDef 實作語意 |
| --- | --- | --- | --- | --- |
| `分帳旅行另有未獲授權的登入帳號` | 無 | 不支援 | 無 | Given：先建完整Alice owner的分帳旅行、成員、支出/還款/結清fixture，另建不同ownerId的已登入使用者乙；其顯示名可同Amy但不建立帳號配對。回寫兩個session與目標資源ID、所有來源快照，不授予同行者登入權。 |
| `非 owner 帳號嘗試 "{操作}" 分帳資源` | 操作:enum 列成員/讀成員/新增成員/改成員/刪成員/讀共同支出/改共同支出/刪共同支出/讀結算/切換簡化/讀還款/新增還款/讀結清/新增結清。 | 不支援 | 無 | When：使用乙session對Alice旅行下單一契約端點送一次請求。列/讀GET；新增POST（成員/還款/結清）；修改PATCH（成員/支出/trip.simplifyDebts）；刪除DELETE（成員/支出）。給合法格式與真實存在資源ID，結清使用owner已取得的有效安排快照；寫入使用可信Origin避免被來源檢查短路。保存before/reply；拒絕不能改任何來源。 |
| `分帳資源拒絕存取且不揭露帳務` | 無 | 不支援 | 無 | Then：404 NOT_FOUND與查詢不存在資源的回應結構/訊息一致；body不含owner/member私人欄位、分攤/還款/安排內容。DB兩owner各帳務來源與revision均未變；使用owner session再讀原資源完整，不能只驗UI隱藏。 |
| `未登入者嘗試讀取分帳結算` | 無 | 不支援 | 無 | When：無cookie的APIRequestContext GET Alice旅行settlement；記錄response；不更動DB、不以同行者名字充作登入憑證。 |
| `分帳結算回覆未登入且不揭露帳務` | 無 | 不支援 | 無 | Then：401 UNAUTHENTICATED，不含member/balances/arrangements或個資；DB及owner再讀資料維持原值；加入同行者不產生auth.user/session/ACL或存取token。 |

## Phase 1B 旅行分帳

所有 Given 以隔離資料建立權威狀態；When 只有一次受測命令或查詢，寫入前擷取完整帳務快照，記錄回應與資源 ID，寫入成功才讀取落地資料；失敗保持來源。Then 依各列驗 DB 與 API，再讀僅作確認，不是第二個 Act。有理數 oracle 不共用受測計算函式；金額均依歷史 minorUnit 作 BigInt 交叉相乘，不使用浮點近似。

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | StepDef 實作語意 |
| --- | --- | --- | --- | --- |
| `同一owner的另一趟旅行有可讀寫分帳子資源` | 無 | 不支援 | 無 | Given：同owner建立日本旅行與台南旅行；在台南建立owner Alice及Amy，Alice付JPY1000且只Amy分攤、Amy已獨立還400、剩餘600已以實付600結清（保存obligation600、一實付及兩筆零調整），回寫每種真實子資源ID。日本也有合法基準資料。capture兩旅行完整來源快照。Act將用日本tripId搭配台南childId，確保不是跨owner或不存在ID造成404。 |
| `owner 以目前旅行路徑 "{操作}" 另一旅行子資源` | 操作:enum 讀成員/改成員/刪成員/讀支出/改支出/刪支出/讀還款/讀結清。 | 不支援 | 無 | When：以owner有效session送單次日本tripId路徑並帶台南childId，依參數GET/PATCH/DELETE /members/{id}、GET/PATCH/DELETE /expenses/{id}、GET /repayments/{id}或GET /settlements/{id}；PATCH給合法name或item，寫入可信Origin；保存before/reply，不能先以client替換tripId。 |
| `跨旅行子資源存取被拒絕且來源不變` | 無 | 不支援 | 無 | Then：404 NOT_FOUND與不存在資源同回應且不洩漏台南資料。DB兩旅行的成員/expense/share/repay/settle/adjustments與revision逐欄等於before；以各自正確tripId owner GET原子資源仍存在且內容相同，不能只驗找不到字樣。 |
