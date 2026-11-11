# 後端介面 DSL

## Phase 1B 旅行分帳

所有 Given 以隔離資料建立權威狀態；When 只有一次受測命令或查詢，寫入前擷取完整帳務快照，記錄回應與資源 ID，寫入成功才讀取落地資料；不足額時只新增獨立實付並保留欠款，不建立結清/差額；失敗保持來源。Then 依各列驗 DB 與 API，再讀僅作確認，不是第二個 Act。有理數 oracle 不共用受測計算函式；金額均依歷史 minorUnit 作 BigInt 交叉相乘，不使用浮點近似。

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | StepDef 實作語意 |
| --- | --- | --- | --- | --- |
| `owner 查詢旅行分帳結算` | 無 | 不支援 | 無 | When：owner session GET /api/trips/{tripId}/settlement，保存200回應、accountingRevision及安排key；只一查詢，DB不改寫。比對時用獨立有理數oracle；不必操作UI。 |
| `成員的分幣別精確淨額如下：` | 無 | 必填多列；成員:string、幣別:ISO code、淨額:有號大單位有理數 string。 | 無 | Then：200 balances對每個表格幣別/成員依ExactAmount minorUnit精確比較；未列成員同該幣別必為0，回應可省略或回傳零，不能有未列非零值。獨立依DB支出支付−份額+送出還款−收到還款+有號調整計算oracle，全部來源同revision；再讀一致且來源不變。 |
| `各幣別淨額精確總和為零` | 無 | 不支援 | 無 | Then：逐幣別以BigInt約分所有balances後精確加總為0，對照DB來源oracle；不可用各成員顯示小數加總或跨幣別相抵，GET再讀同revision亦零。 |
| `結算付款安排如下：` | 無 | 必填多列；付款人/收款人:string、幣別:ISO code、金額:正數大單位有理數 string。 | 無 | Then：完整arrangements集合與表格相同；key非空且可供當次模式/revision結清，兩端ID同旅行且不相同。依DB來源重建oracle，精確比對各筆amount/minorUnit、直接/建議筆數，不能只匹配其中一筆或自行忽略額外安排；來源未變，再讀相同排列與金額。 |
| `旅行的簡化付款已為 "{模式}"` | 模式:enum 開啟/關閉。 | 不支援 | 無 | Given：DB設定simplify_debts為true/false，來源依既有Given保持；回寫模式、revision與完整來源/精確淨額快照，不執行受測PATCH。 |
| `owner 將簡化付款切換為 "{模式}"` | 模式:enum 開啟/關閉。 | 不支援 | 無 | When：owner session+可信Origin僅PATCH /trips/{tripId} simplifyDebts=true/false；保存before/reply；成功先DB落地、回寫revision。Then讀settlement是只讀驗證而非第二個受測命令。 |
| `簡化付款設定已保存為 "{模式}"` | 模式:enum 開啟/關閉。 | 不支援 | 無 | Then：PATCH200/DB/GET trip一致為指定simplifyDebts，revision遞增；GET settlement同最新revision採該模式；新的同owner session再讀設定仍在，不能僅驗client切換。 |
| `簡化前後每位成員的精確淨額不變` | 無 | 不支援 | 無 | Then：以切換前DB來源oracle與切換後GET settlement比較每個成員/幣別ExactAmount；來源expenses/shares/repayments/settlements/adjustments不變，總和各幣別為0；只允許trip模式/revision改變，不混用版本。 |
| `簡化建議的付款筆數不多於直接安排` | 無 | 不支援 | 無 | Then：GET settlement suggestedArrangementCount<=directArrangementCount，actual安排數等於本模式計數，獨立用同revision DB來源重建直接圖與淨額候選，確認回退保障不是只宣稱計數；沒有丟棄任何成員非零淨額。 |
| `結算說明以三句內描述付款對象與筆數變化` | 無 | 不支援 | 無 | Then：GET settlement explanation非空，至多三句自然中文；依本案例Alice→Bob→Carol改為Alice→Carol兩筆變一筆，說明各人應收應付總額及原始紀錄不變；不得用改道、精確、公平等可見術語。核對說明實際對應DB oracle/回應安排，不能只數句號。 |
| `結算說明指出付款安排無需調整` | 無 | 不支援 | 無 | Then：explanation至多三句，語意為目前付款安排已無需調整；依DB/GET安排仍Amy→Alice JPY500、筆數=1；來源及淨額不變，不要求字串完全相等。 |
| `結算中沒有任何待付款安排` | 無 | 不支援 | 無 | Then：200 arrangements空、direct/suggested counts為0，所有非零淨額不存在；依DB來源精確重建為0，再讀一致；不得把不足最小單位的非零值誤判為0。 |
| `相同資料的結算安排可重現` | 無 | 不支援 | 無 | Then：用10個只讀GET作穩定性斷言，對照唯一Act回應；同revision/mode的balances、arrangements金額/端點/key與排序、計數及explanation逐欄相同；DB來源與revision未改。這些再讀只驗確定性，不進行第二命令。 |
| `owner 已取得 Amy 向 Alice 的目前付款安排` | 無 | 不支援 | 無 | Given：從前序Given來源取得一次有效settlement快照，回寫Amy→Alice的arrangementKey、accountingRevision、debtor/creditor/currency/expectedAmount原始有理數；保存來源快照及預留settlementId/repaymentId。不輸入實付，不預先執行結清。 |
| `owner 以 JPY "{實付}" 結清 Amy 向 Alice 的安排` | 實付:string，原樣送出，允許無效字串供拒絕案例。 | 不支援 | paidOn=2027-01-20；使用Given保留的結清與實付UUID。 | When：owner session+可信Origin一次POST /trips/{tripId}/settlements，送Given所見key/revision/兩端/currency/完整expectedAmount及paidAmount=實付；不得以33.33取代100/3快照或傳取整策略。保存before/reply及兩ID；成功應settlement/repayment/2adjustments原子落地，失敗均不寫入。 |
| `該安排已由正數實付關閉` | 無 | 不支援 | 無 | Then：201 SettlementRecord與DB一致，arrangement_key/source_revision/obligation保留Given快照，repayment為kind=settlement與該settlementId一對一；GET record/repayment再讀實付金額、兩端、幣別、paidOn一致。最新settlement不再包含該筆精確未付或反向差額；其他安排仍按來源重建，僅足額、超額或不足一個最小單位的尾差可關閉；可支付的欠款不得吸收。 |
| `結清差額的兩位成員調整為：` | 無 | 必填恰兩列；成員:string、幣別:ISO code、調整:有號大單位有理數 string。 | 無 | Then：201 record.adjustments與DB settlement_adjustments恰兩筆，分別對應兩端、同幣別、值符合表格且精確相反總和0。獨立計算債務人=obligation−paid，債權人取負；一筆實付與一份settlement同交易落地，GET record再讀相同，不得用近似顯示值算差額。 |
| `結清紀錄沒有取整方式欄位` | 無 | 不支援 | 無 | Then：201 response、DB schema/該settlement與repayment保存欄位及GET record沒有roundingMethod等策略資料；只保留obligation/實付/成對調整。不能以文字不顯示代替未持久化。 |
| `該安排沒有反向付款或殘餘尾差` | 無 | 不支援 | 無 | Then：GET settlement指定兩端與幣別的本來源貢獻已歸零，不含原安排或由本次差額產生的反向安排；用DB實付+兩調整交叉相乘證明淨額歸零，不以JPY顯示0四捨五入掩蓋尾差；來源支出/原份額不變。 |
| `舊付款安排取得後帳本已有新的支出` | 無 | 不支援 | 無 | Given：在取得快照後以另一已完成交易新增JPY10的Alice個人支出並遞增revision，保留舊key/revision與expectedAmount作受測輸入；capture失敗前現行來源，不把此寫入當Act。 |
| `owner 查證先前已保存的結清紀錄` | 無 | 不支援 | 無 | When：僅GET /trips/{tripId}/settlements/{預留settlementId}，使用owner session；不重送POST、不修改來源，保存response。 |
| `Amy 的安排已以 JPY 33 結清但保存回應曾遺失` | 無 | 不支援 | 無 | Given：依正式DB模型準備obligation100/3、repayment33與兩調整(+1/3,-1/3)原子落地的快照與預留ID，revision已增加；模擬caller沒拿到成功回應。不在Act重演結清。 |
| `查證取得同一份結清與實付紀錄` | 無 | 不支援 | 無 | Then：200與DB原settlementId/repaymentId、兩端、JPY33、paidOn、精確obligation及兩調整一致；查證前後筆數/內容完全不變，GET repayment同事實，不能新建第二筆。 |
| `結清後原支出與分攤集合保持不變` | 無 | 不支援 | 無 | Then：DB/GET expenses逐欄仍同Act前的原始金額、幣別、日期、分類、付款人與share集合，份額仍每人100/3、和100；允許本次新增settlement/repayment/兩調整及revision變更，不以重寫支出抹差額。 |

## Phase 1B 旅行分帳

所有 Given 以隔離資料建立權威狀態；When 只有一次受測命令或查詢，寫入前擷取完整帳務快照，記錄回應與資源 ID，寫入成功才讀取落地資料；不足額時只新增獨立實付並保留欠款，不建立結清/差額；失敗保持來源。Then 依各列驗 DB 與 API，再讀僅作確認，不是第二個 Act。有理數 oracle 不共用受測計算函式；金額均依歷史 minorUnit 作 BigInt 交叉相乘，不使用浮點近似。

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | StepDef 實作語意 |
| --- | --- | --- | --- | --- |
| `Amy 已以 JPY 33 結清點心安排且 Bob 的安排仍未結清` | 無 | 不支援 | 無 | Given：正式模型建立JPY100三人均分、Amy結清obligation100/3/paid33/adjustments Amy+1/3 Alice−1/3；保存DB歷史及Bob目前key/revision/obligation100/3、預留新settlement/repayment UUID。重建oracle為Bob−100/3、Alice+100/3、Amy0；不先結清Bob。 |
| `owner 以 JPY 34 結清 Bob 向 Alice 的剩餘安排` | 無 | 不支援 | 無 | When：僅一次owner session+可信Origin POST /settlements，使用Bob當前精確100/3與key/revision，paidAmount34、paidOn2027-01-20及預留兩UUID；保存before/reply；不得重送Amy結清。 |
| `點心所有安排結清且全體沒有尾差` | 無 | 不支援 | 無 | Then：201與DB新增Bob結清一筆實付34、兩調整Bob−2/3 Alice+2/3；原Amy實付33及調整完全不變。GET settlement三人JPY淨額均精確0、安排空，非將零點幾顯示0；原支出100/三份100/3保持，GET repayment清單恰含33與34兩事實且沒有取整策略。 |

## 模式切換來源保護

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | StepDef 實作語意 |
| --- | --- | --- | --- | --- |
| `分帳來源紀錄維持操作前內容` | 無 | 不支援 | 無 | Then：核對 Act 前後支出（含付款人/金額/幣別/日期/分類）、分攤集合、歷史實付、結清與成對調整逐欄相等，並 owner 再讀來源資源驗證；允許本案例明定的 member 名稱/狀態或 simplifyDebts/revision 變更，不要求技術時間戳不變。 |

## Phase 1B 旅行分帳

所有 Given 以隔離資料建立權威狀態；When 只有一次受測命令或查詢，寫入前擷取完整帳務快照，記錄回應與資源 ID，寫入成功才讀取落地資料；不足額時只新增獨立實付並保留欠款，不建立結清/差額；失敗保持來源。Then 依各列驗 DB 與 API，再讀僅作確認，不是第二個 Act。有理數 oracle 不共用受測計算函式；金額均依歷史 minorUnit 作 BigInt 交叉相乘，不使用浮點近似。

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | StepDef 實作語意 |
| --- | --- | --- | --- | --- |
| `旅行有既有實付與結清調整的分帳來源` | 無 | 不支援 | 無 | Given：建立JPY100由Alice付款、Alice/Amy/Bob均分，Amy已以33結清（obligation100/3、調整Amy+1/3 Alice−1/3），Bob另獨立還Alice10；另TWD300由Alice支付且只Bob分攤，無其他來源。DB確認兩實付、一結清、兩調整及原支出/份額已落地，保存完整不可變來源快照與獨立精確oracle。模式先關閉。 |
| `最新實付後的直接與簡化安排皆依來源重建` | 無 | 不支援 | 無 | Then：PATCH200且GETsettlement為剛設定模式/同revision；JPY只Bob→Alice70/3、TWD只Bob→Alice300，Amy淨額精確0。依DB含實付/歷史兩調整重建；兩模式各案例用同source oracle（不在Then切模式）。原repayment/settlement/adjustment欄位不變，不可重新套用或忽略歷史差額。 |
| `兩個裝置同時結清 Amy 向 Alice 的同一安排` | 無 | 不支援 | JPY33由Alice支付且只Amy分攤；兩個同owner有效session；同一key/revision/obligation，分別實付33與34，兩組不同預留UUID；paidOn=2027-01-20。 | When：一次並行結清事件，以Promise.all對POST /settlements送兩命令，不串接第二次業務流程；本列為後端受控整合測試；fixture內部同步屏障讓兩請求基於同revision在旅行列鎖競爭，記錄兩response/ID與before。不得事先挑勝者或更新落敗者輸入，不使用無界重試。 |
| `同一安排最多只保存一次完整結清` | 無 | 不支援 | 無 | Then：恰一個201，另一個409 ACCOUNTING_REVISION_CONFLICT或ARRANGEMENT_NOT_FOUND；DB只一settlement、一kind=settlement實付及兩精確相反adjustments，對應勝者UUID/paid。revision只增加一筆成功影響，落敗UUID無任何部分列；GET record/repayment/settlement一致且無未付/反向尾差，既有來源不變。 |
| `結清交易在寫入部分調整後將發生錯誤` | 無 | 不支援 | 無 | Given：Given為後端整合測試專用：在隔離測試環境透過依賴注入的repository/transaction故障點，於settlement及repayment和第一筆adjustment寫入後拋出內部錯誤；不可新增正式環境公開故障端點、不能只mock成功回應。保存完整DB快照及相同有效安排輸入；不先執行受測結清。 |
| `結清失敗不留下任何部分帳務紀錄` | 無 | 不支援 | 無 | Then：500 INTERNAL_ERROR不洩漏敏感欄位；DB交易回滾，預留settlementId/repaymentId及兩adjustments均不存在，revision與完整來源before一致。GETsettlement原精確應付仍在、GET record/repayment404；不得因第一筆調整落地而破壞零和。 |

## 不足額實付

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | StepDef 實作語意 |
| --- | --- | --- | --- | --- |
| `該安排只記錄部分還款且剩餘應付為 JPY "{金額}"` | 金額:string，正整數或正分數 n/d，單位JPY | 不支援 | 應付/付款安排由前置Given提供 | Then：201回應kind=partial；以獨立BigInt有理數核對remainingAmount；DB恰增加一筆independent實付且使用預留repaymentId，原支出/分攤、既有settlement/adjustments逐欄不變，不能新建任何免除差額調整。GET settlement仍有Amy→Alice的指定剩餘應付；GET原repaymentId與回應實付逐欄相同。 |
