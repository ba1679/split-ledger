# 後端介面 DSL

## Phase 1B 旅行分帳

所有 Given 以隔離資料建立權威狀態；When 只有一次受測命令或查詢，寫入前擷取完整帳務快照，記錄回應與資源 ID，寫入成功才讀取落地資料；失敗保持來源。Then 依各列驗 DB 與 API，再讀僅作確認，不是第二個 Act。有理數 oracle 不共用受測計算函式；金額均依歷史 minorUnit 作 BigInt 交叉相乘，不使用浮點近似。

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | StepDef 實作語意 |
| --- | --- | --- | --- | --- |
| `owner 新增同行者 "{名稱}"` | 名稱:string，原樣保留首尾空白供伺服器 trim。 | 不支援 | 無 | When：產生並保留 UUID，owner session+可信 Origin POST /api/trips/{tripId}/members，body id/name；保存 before DB 快照及回應、預留 ID。成功資料須先落地，再回寫 memberId；失敗來源不變；不必驗支出表單。 |
| `新增同行者以名稱 "{名稱}" 保存` | 名稱:string，預期 trim 後名稱。 | 不支援 | 無 | Then：201 回應 id 等於預留 UUID、role=companion/isActive=true/name=指定值；DB 同 trip/owner 且 nameKey 正規化正確，revision 增加；GET 單筆及清單重讀一致；不得授予 companion 帳號存取權。 |
| `同行者 "{成員}" 已停用` | 成員:string，既有別名。 | 不支援 | 無 | Given：在基準成員 DB 將 is_active=false，保持 id/nameKey 與歷史關聯，回寫停用前後 oracle；非受測命令，不必呼叫 PATCH。 |
| `owner 將同行者 "{原名}" 改名為 "{新名}"` | 原名/新名:string，原名定位 memberId，新名原樣送出。 | 不支援 | 無 | When：owner session+可信 Origin PATCH /members/{memberId}，只送 name，保存 before 快照與回應；成功落地名稱，不更換 ID；失敗不能改來源。 |
| `改名後 "{名稱}" 仍沿用原成員身分` | 名稱:string，預期顯示名稱。 | 不支援 | 無 | Then：200 response/DB/GET member 的 id、tripId、role 不變且名稱更新；expenses.payer_member_id、expense_shares、repayments 兩端、settlements/adjustments memberId 仍指向原 ID；重讀支出成員解析顯示新名，分攤與 settlement 淨額等同修改前有理數 oracle。 |
| `owner 將同行者 "{成員}" 設為 "{狀態}"` | 成員:string；狀態:enum 停用/啟用。 | 不支援 | 無 | When：只送 PATCH /members/{id} isActive=false/true；owner session+可信 Origin，保存 before/reply；成功 DB 落地後回寫狀態，不重演其他動作。 |
| `同行者 "{成員}" 的狀態為 "{狀態}"` | 成員:string；狀態:enum 停用/啟用。 | 不支援 | 無 | Then：200/DB/GET 清單與單筆 isActive 一致且 id 不變；歷史支出份額、還款及淨額依同 ID 重建不變；成功 revision 增加。新寫入是否可選由支出/還款驗證案例另驗，不把 UI 行為當後端結果。 |
| `owner 刪除同行者 "{成員}"` | 成員:string。 | 不支援 | 無 | When：以 owner session+可信 Origin 對 /members/{id} DELETE，不帶 body；保留 before 快照與回應，失敗不得刪任何引用。 |
| `同行者 "{成員}" 已從旅行移除` | 成員:string。 | 不支援 | 無 | Then：204 無本文；DB 該 companion 不存在、其他成員仍在，GET 單筆404/清單排除該 ID；無支出或歷史被連帶刪除，revision 增加。 |
| `另一趟旅行已有同行者 "{名稱}"` | 名稱:string。 | 不支援 | 無 | Given：同 owner 另一趟台南旅行建立同名 companion，與目前旅行 ID 不同；回寫另一 trip/memberId；不修改本旅行成員集合。 |
| `owner 嘗試對自己的固定成員執行 "{操作}"` | 操作:enum 改名/停用/刪除。 | 不支援 | 無 | When：對 ownerMemberId 執行 PATCH name=新的名稱、PATCH isActive=false 或 DELETE，三者依參數只選一個命令；owner session+可信 Origin，保存 before/reply，不重演前序狀態。 |

## Phase 1B 旅行分帳

所有 Given 以隔離資料建立權威狀態；When 只有一次受測命令或查詢，寫入前擷取完整帳務快照，記錄回應與資源 ID，寫入成功才讀取落地資料；失敗保持來源。Then 依各列驗 DB 與 API，再讀僅作確認，不是第二個 Act。有理數 oracle 不共用受測計算函式；金額均依歷史 minorUnit 作 BigInt 交叉相乘，不使用浮點近似。

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | StepDef 實作語意 |
| --- | --- | --- | --- | --- |
| `owner 以另一裝置工作階段讀取旅行成員` | 無 | 不支援 | 無 | When：建立相同auth.user的另一有效session/APIRequestContext，僅GET /members；不能沿用先前前端快取或body。保存response，DB不變。 |
| `兩個裝置看到同一組穩定成員` | 無 | 不支援 | 無 | Then：200 items與DB該旅行owner/Amy/Bob/Carol的id/role/name/isActive集合完全一致；session使用同ownerId，新裝置沒有額外建立成員，owner身份仍唯一。 |
