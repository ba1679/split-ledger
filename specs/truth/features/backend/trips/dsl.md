# 後端介面 DSL

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | 後端實作語意 |
| --- | --- | --- | --- | --- |
| `使用者"甲"建立未填日期的"日本旅行"` | 無 | 不支援 | 無 | 以甲的有效 session 和可信 Origin 呼叫 POST /api/trips；按句中名稱與日期送出，記錄回應；成功確認資料庫旅行，失敗確認原值未變。 |
| `"日本旅行"已保存且兩端日期皆未填` | 無 | 不支援 | 無 | 201；回應與資料庫旅行 owner=甲、name=日本旅行、start_date=null、end_date=null；再讀相同。 |
| `使用者"甲"建立開始日為"2027-03-10"的"日本旅行"` | 無 | 不支援 | 無 | 以甲的有效 session 和可信 Origin 呼叫 POST /api/trips；按句中名稱與日期送出，記錄回應；成功確認資料庫旅行，失敗確認原值未變。 |
| `"日本旅行"已保存且結束日未填` | 無 | 不支援 | 無 | 201；回應與資料庫 start_date=2027-03-10、end_date=null；再讀相同。 |
| `使用者"甲"建立結束日為"2027-04-05"的"台南旅行"` | 無 | 不支援 | 無 | 以甲的有效 session 和可信 Origin 呼叫 POST /api/trips；按句中名稱與日期送出，記錄回應；成功確認資料庫旅行，失敗確認原值未變。 |
| `"台南旅行"已保存且開始日未填` | 無 | 不支援 | 無 | 201；回應與資料庫 start_date=null、end_date=2027-04-05；再讀相同。 |
| `使用者"甲"的"日本旅行"開始日為"2027-03-10"且結束日未填` | 無 | 不支援 | 無 | 以隔離測試資料庫建立句中帳號、有效 session 與指定業務資料；檢查擁有者關聯和已落地狀態；回寫業務識別供唯一 Act 使用，不必由 API 重演前序操作。 |
| `使用者"甲"將"日本旅行"結束日改為"2027-03-09"` | 無 | 不支援 | 無 | 以甲的有效 session 和可信 Origin 呼叫 PATCH /api/trips/{tripId}；按句中名稱與日期送出，記錄回應；成功確認資料庫旅行，失敗確認原值未變。 |
| `日期更新被拒絕且"日本旅行"日期維持不變` | 無 | 不支援 | 無 | 400 VALIDATION_ERROR；資料庫 start_date=2027-03-10、end_date=null，GET 旅行再讀相同。 |
| `使用者"甲"將"日本旅行"結束日改為"2027-03-15"` | 無 | 不支援 | 無 | 以甲的有效 session 和可信 Origin 呼叫 PATCH /api/trips/{tripId}；按句中名稱與日期送出，記錄回應；成功確認資料庫旅行，失敗確認原值未變。 |
| `"日本旅行"期間為"2027-03-10"至"2027-03-15"` | 無 | 不支援 | 無 | 200；回應與資料庫 start_date=2027-03-10、end_date=2027-03-15；GET 旅行再讀相同。 |

## Phase 1B 旅行分帳

所有 Given 以隔離資料建立權威狀態；When 只有一次受測命令或查詢，寫入前擷取完整帳務快照，記錄回應與資源 ID，寫入成功才讀取落地資料；失敗保持來源。Then 依各列驗 DB 與 API，再讀僅作確認，不是第二個 Act。有理數 oracle 不共用受測計算函式；金額均依歷史 minorUnit 作 BigInt 交叉相乘，不使用浮點近似。

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | StepDef 實作語意 |
| --- | --- | --- | --- | --- |
| `新旅行同時具有唯一固定 owner 成員` | 無 | 不支援 | 無 | Then：201 Trip.ownerMemberId與DB同owner/trip的trip_members一致，role=owner/isActive=true/name來自該帳號、恰一位；trip.simplifyDebts=false、accountingRevision為非負十進位；GET trip與members再讀一致。不能先建travel再由client補member以掩蓋非原子建立。 |
