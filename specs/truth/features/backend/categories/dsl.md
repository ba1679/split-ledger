# 後端介面 DSL

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | 後端實作語意 |
| --- | --- | --- | --- | --- |
| `使用者"甲"的"日本旅行"有歸入"吃喝"的午餐` | 無 | 不支援 | 無 | 在隔離資料庫建立甲的有效 session、旅行、分類及引用該分類的午餐支出；回寫支出識別，確認 owner 與關聯已落地。 |
| `使用者"甲"清除午餐的分類` | 無 | 不支援 | 無 | 以甲的 session 與可信 Origin 對該支出呼叫 PATCH /api/trips/{tripId}/expenses/{expenseId}，送 categoryId=null；記錄回應並確認資料庫 category_id 已清空。 |
| `午餐仍在"日本旅行"且沒有分類` | 無 | 不支援 | 無 | 檢查更新回應、資料庫及重新讀取支出；識別、旅行、項目與金額均保留，分類為 null。 |
| `使用者"甲"將"餐飲"改名為 31 個餐字` | 無 | 不支援 | 無 | 以甲的 session 與可信 Origin 呼叫 PATCH /api/categories/{categoryId}，名稱為 31 個 Unicode 餐字；記錄驗證錯誤，資料庫原值不變。 |
| `分類改名被拒絕且原分類不變` | 無 | 不支援 | 無 | 檢查 400 驗證錯誤、資料庫原分類識別與名稱及重新讀取結果；支出關聯不變。 |
| `使用者"甲"將"餐飲"改名為只有空白` | 無 | 不支援 | 無 | 以甲的 session 與可信 Origin 呼叫 PATCH /api/categories/{categoryId}，名稱只有空白；記錄驗證錯誤，資料庫原值不變。 |
| `使用者"甲"有"日本旅行"及"台南旅行"且擁有"餐飲"分類` | 無 | 不支援 | 無 | 以隔離測試資料庫建立句中帳號、有效 session 與指定業務資料；檢查擁有者關聯和已落地狀態；回寫業務識別供唯一 Act 使用，不必由 API 重演前序操作。 |
| `使用者"甲"查詢分類"餐飲"` | 無 | 不支援 | 無 | 以甲的有效 session 與寫入時可信 Origin 呼叫 GET /api/categories/{categoryId}；記錄回應，核對資料庫分類與關聯，不透過前端操作。 |
| `分類"餐飲"的使用筆數為 2 且兩筆支出屬於不同旅行` | 無 | 不支援 | 無 | 200；usageCount=2；資料庫兩筆 expenses 指向同一 category_id、不同 trip_id，owner 均為甲。 |
| `使用者"甲"的"餐飲"分類已有兩筆跨旅行支出` | 無 | 不支援 | 無 | 以隔離測試資料庫建立句中帳號、有效 session 與指定業務資料；檢查擁有者關聯和已落地狀態；回寫業務識別供唯一 Act 使用，不必由 API 重演前序操作。 |
| `使用者"甲"將"餐飲"分類改名為"吃喝"` | 無 | 不支援 | 無 | 以甲的有效 session 與寫入時可信 Origin 呼叫 PATCH /api/categories/{categoryId}；記錄回應，核對資料庫分類與關聯，不透過前端操作。 |
| `兩筆支出顯示"吃喝"且仍關聯原分類` | 無 | 不支援 | 無 | 200；分類 id 不變、name=吃喝，資料庫兩筆 expenses 的 category_id 不變；GET 支出都顯示新名。 |
| `使用者"甲"的"吃喝"分類仍被兩筆支出使用` | 無 | 不支援 | 無 | 以隔離測試資料庫建立句中帳號、有效 session 與指定業務資料；檢查擁有者關聯和已落地狀態；回寫業務識別供唯一 Act 使用，不必由 API 重演前序操作。 |
| `使用者"甲"刪除"吃喝"分類` | 無 | 不支援 | 無 | 以甲的有效 session 與寫入時可信 Origin 呼叫 DELETE /api/categories/{categoryId}；記錄回應，核對資料庫分類與關聯，不透過前端操作。 |
| `分類刪除被拒絕且分類與兩筆支出維持不變` | 無 | 不支援 | 無 | 409 CATEGORY_IN_USE；資料庫分類 row 與兩筆 expense.category_id 均不變；再讀仍存在。 |
| `使用者"甲"的"吃喝"分類沒有支出引用` | 無 | 不支援 | 無 | 以隔離測試資料庫建立句中帳號、有效 session 與指定業務資料；檢查擁有者關聯和已落地狀態；回寫業務識別供唯一 Act 使用，不必由 API 重演前序操作。 |
| `"吃喝"不再可選且既有支出仍存在` | 無 | 不支援 | 無 | 204；資料庫吃喝分類 row 已刪，兩筆已解除關聯的支出仍存在；GET 分類清單不含該 id。 |
| `使用者"甲"已有"餐飲"分類` | 無 | 不支援 | 無 | 以隔離測試資料庫建立句中帳號、有效 session 與指定業務資料；檢查擁有者關聯和已落地狀態；回寫業務識別供唯一 Act 使用，不必由 API 重演前序操作。 |
| `使用者"甲"建立名稱為" 餐飲 "的分類` | 無 | 不支援 | 無 | 以甲的有效 session 與寫入時可信 Origin 呼叫 POST /api/categories；記錄回應，核對資料庫分類與關聯，不透過前端操作。 |
| `分類建立因重名被拒絕且原分類不變` | 無 | 不支援 | 無 | 409 CATEGORY_NAME_CONFLICT；trim 後的名稱鍵與餐飲相同，資料庫未新增分類且原 id/name 不變。 |
| `使用者"甲"已有"餐飲"及"Food"分類` | 無 | 不支援 | 無 | 以隔離測試資料庫建立句中帳號、有效 session 與指定業務資料；檢查擁有者關聯和已落地狀態；回寫業務識別供唯一 Act 使用，不必由 API 重演前序操作。 |
| `使用者"甲"將"餐飲"改名為"food"` | 無 | 不支援 | 無 | 以甲的有效 session 與寫入時可信 Origin 呼叫 PATCH /api/categories/{categoryId}；記錄回應，核對資料庫分類與關聯，不透過前端操作。 |
| `分類改名因重名被拒絕且原分類與關聯不變` | 無 | 不支援 | 無 | 409 CATEGORY_NAME_CONFLICT；food 與 Food 的 ASCII 大小寫折疊鍵相同；資料庫餐飲、Food 名稱與引用皆不變。 |
| `使用者"甲"將"餐飲"改名為"餐飲"` | 無 | 不支援 | 無 | 以甲的有效 session 與寫入時可信 Origin 呼叫 PATCH /api/categories/{categoryId}；記錄回應，核對資料庫分類與關聯，不透過前端操作。 |
| `分類保存成功且識別不變` | 無 | 不支援 | 無 | 200；回應 id 與原分類相同，資料庫沒有新分類且既有支出 category_id 不變。 |
| `使用者"甲"建立 30 個餐字的分類` | 無 | 不支援 | 無 | 以甲的有效 session 與寫入時可信 Origin 呼叫 POST /api/categories；記錄回應，核對資料庫分類與關聯，不透過前端操作。 |
| `30 字分類已保存` | 無 | 不支援 | 無 | 201；資料庫名稱為 30 個 Unicode 餐字，owner=甲；再讀相同。 |
| `使用者"甲"建立 31 個餐字的分類` | 無 | 不支援 | 無 | 以甲的有效 session 與寫入時可信 Origin 呼叫 POST /api/categories；記錄回應，核對資料庫分類與關聯，不透過前端操作。 |
| `分類保存被拒絕且沒有新增分類` | 無 | 不支援 | 無 | 400 VALIDATION_ERROR；資料庫甲的分類筆數與名稱集合不變；再讀清單相同。 |
| `使用者"甲"建立只有空白的分類` | 無 | 不支援 | 無 | 以甲的有效 session 與寫入時可信 Origin 呼叫 POST /api/categories；記錄回應，核對資料庫分類與關聯，不透過前端操作。 |
| `使用者"乙"已有"交通"分類且使用者"甲"已登入` | 無 | 不支援 | 無 | 以隔離測試資料庫建立句中帳號、有效 session 與指定業務資料；檢查擁有者關聯和已落地狀態；回寫業務識別供唯一 Act 使用，不必由 API 重演前序操作。 |
| `使用者"甲"建立"交通"分類` | 無 | 不支援 | 無 | 以甲的有效 session 與寫入時可信 Origin 呼叫 POST /api/categories；記錄回應，核對資料庫分類與關聯，不透過前端操作。 |
| `"交通"分類屬於使用者"甲"` | 無 | 不支援 | 無 | 201；資料庫另有乙的同名分類，但新 category.owner_id=甲 且 id 不同；甲再讀可見。 |

## 006 旅行管理與等待契約

所有 Given 由隔離 PostgreSQL fixture 建立且確認權威資料已落地；保留穩定 owner/trip/member/record ID、版本與前態快照，不重演目標 Act。所有 When 只有一次命令或查詢；記錄請求、回應、原 operationId 與版本，非同步競爭由 Given 的屏障安排。Then 的再讀屬只讀驗證，不推進業務。精確帳務用獨立 BigInt 有理數 oracle。

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | StepDef 實作語意 |
| --- | --- | --- | --- | --- |
| `餐飲分類僅被垃圾桶旅行的一筆支出引用` | 無 | 不支援 | 無 | Given：隔離DB建立Alice、日本旅行trash及一筆餐飲支出，分類無其他引用；保留category與trip/expense穩定ID及前態。回寫session；不先刪分類。 |
| `owner 查詢垃圾桶旅行使用的分類` | 無 | 不支援 | 無 | When：一次GET /api/categories，記錄category usageCount，不寫資料。 |
| `分類使用筆數仍為 1` | 無 | 不支援 | 無 | Then：response指定category usageCount=1且DB expenses含trash引用；只讀再查一致，分類與帳務未變。 |
| `owner 刪除垃圾桶旅行使用的分類` | 無 | 不支援 | 無 | When：一次DELETE category，使用owner session及可信Origin；記錄回應，等待交易結束。 |
| `分類因仍被使用而拒絕刪除` | 無 | 不支援 | 無 | Then：409 CATEGORY_IN_USE（依categories契約），DB category與expense FK未變、usage=1；owner再讀分類存在，恢復旅行後仍為同分類ID，不另送復原Act。 |
