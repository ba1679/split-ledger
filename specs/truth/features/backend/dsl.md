# 後端介面 DSL

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | 後端實作語意 |
| --- | --- | --- | --- | --- |
| `使用者"甲"已登入` | 無 | 不支援 | 無 | 以隔離測試資料庫建立句中帳號、有效 session 與指定業務資料；檢查擁有者關聯和已落地狀態；回寫業務識別供唯一 Act 使用，不必由 API 重演前序操作。 |

## Phase 1B 旅行分帳

所有 Given 以隔離資料建立權威狀態；When 只有一次受測命令或查詢，寫入前擷取完整帳務快照，記錄回應與資源 ID，寫入成功才讀取落地資料；失敗保持來源。Then 依各列驗 DB 與 API，再讀僅作確認，不是第二個 Act。有理數 oracle 不共用受測計算函式；金額均依歷史 minorUnit 作 BigInt 交叉相乘，不使用浮點近似。

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | StepDef 實作語意 |
| --- | --- | --- | --- | --- |
| `owner 的分帳旅行已建立成員` | 無 | 不支援 | 旅行=日本旅行；owner 顯示名=Alice；Amy、Bob、Carol 為啟用同行者；簡化付款=false；日期=2027-01-20。 | Given：在隔離 DB 建立 owner 帳號、有效 session、旅行與四個成員；依 data truth 保存穩定 ID/role/nameKey，不為同行者建立授權。檢查 DB 落地並回寫 tripId、ownerId、各 memberId 與初始 revision；不必透過受測 API 重演建立。 |
| `owner 的分帳旅行已有下列支出：` | 無 | 必填多列；項目:string、幣別:ISO code、金額:正數大單位十進位 string、付款人:string 成員別名、分攤者:string 以「、」分隔的成員集合。 | 沿用成員基準；spentOn=2027-01-20；categoryId=null；無既有還款或結清。 | Given：依表格在隔離 DB 建立 expenses 與 expense_shares，金額用歷史 minorUnit 轉 BigInt，不保存近似份額；owner/Amy/Bob/Carol 別名映射穩定 memberId。依原始支出及集合獨立算出有理數 oracle；檢查來源已落地，回寫 expenseIds 與來源快照；不呼叫受測新增支出命令。 |
| `owner 的分帳旅行已有下列獨立還款：` | 無 | 必填多列；付款人/收款人:string 成員別名、幣別:ISO code、金額:正數十進位 string、日期:YYYY-MM-DD。 | 追加到前序 Given 的旅行；kind=independent；settlementId=null。 | Given：以正式模型在隔離 DB 建立實付事實，保持表格日期及歷史 minorUnit；不做超額命令確認，fixture 必須符合既定可用狀態。回寫 repaymentIds、原始欄位與獨立有理數淨額 oracle；不必 UI 重演還款。 |
| `這次分帳操作被拒絕為 "{錯誤}"` | 錯誤:string，限 VALIDATION_ERROR/MEMBER_NAME_CONFLICT/MEMBER_IN_USE/NOT_FOUND/UNAUTHENTICATED/ACCOUNTING_REVISION_CONFLICT/ARRANGEMENT_NOT_FOUND/ID_CONFLICT。 | 不支援 | 無 | Then：驗最後唯一命令回應 code 與契約 HTTP 狀態：驗證400、未登入401、找不到404、名稱/引用/版本/安排/ID衝突409；錯誤不得含其他 owner 的 ID、名稱、金額或 session。另比較 DB 來源與 revision 未變並 owner 再讀確定；不以 response 代替權威狀態。 |
