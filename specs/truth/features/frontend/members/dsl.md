# 同行者 DSL

## 005 新增契約

以下每列以既有 Playwright BDD fixture、page object 與真實 API/隔離資料庫實作。固定場景常數即句內明示值；所有 Then 不執行新的受測操作，API 再讀屬只讀權威查核。MoneyAmount 以字串解析，ExactAmount 用 BigInt 有理數，不用浮點或畫面值重算。fixture 所有名稱映射到同旅行穩定 UUID；未標示的可選值為 null，不自行擴張業務。

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | Playwright BDD 實作語意 |
| --- | --- | --- | --- | --- |
| `同行者名單有 owner Alice、啟用 Amy 與停用 Bob` | 無 | 不支援 | 旅行=日本旅行；無初始支出。 | Given：owner fixture 建立旅行與三位成員，以 GET members 確認 role/isActive/name；保存基準 ID 與所有帳務快照。開啟同行者頁等待查詢完成。 |
| `另一旅行有 Amy 而目前旅行只有 owner Alice` | 無 | 不支援 | 無 | Given：同 owner fixture 建立兩趟旅行，僅另一旅行建立 Amy；開啟目前旅行同行者頁，記錄兩旅行成員集合。 |
| `小美已被三人 JPY 300 午餐及 JPY 20 還款引用` | 無 | 不支援 | spentOn=2027-03-11；paidOn=2027-03-12。 | Given：建立 Alice、小美、Bob；Alice 付款三人分攤午餐300，小美獨立還款20給Alice；GET expenses/repayments/settlement核對並記錄小美 UUID、份額100及淨額-80；開啟同行者頁。 |
| `已被支出引用的 "{成員}" 已停用` | 成員:string 名稱 | 不支援 | 無 | Given：fixture 建立 Alice 付300由Alice、成員、Bob分攤後 PATCH 成員 isActive=false，GET members 核對；保存 UUID 及原帳務。開啟同行者頁。 |
| `已新增未被引用的同行者 Carol` | 無 | 不支援 | 無 | Given：以當前 owner API 建立 Carol；確認沒有支出/還款/結清/調整引用，刷新同行者 query。 |
| `未引用的 Amy 刪除確認已開啟但另一裝置剛引用 Amy` | 無 | 不支援 | 無 | Given：fixture 建立未引用 Amy，頁面開啟刪除確認；另一 owner context 新增Alice替Amy付100的支出，使確認前提過期；保留畫面舊狀態與權威快照。 |
| `同行者新增表單填入 Carol 且保存回應遺失與查證暫不可用` | 無 | 不支援 | 無 | Given：建立owner旅行並開表單輸入Carol；代理僅丟棄目標 POST members 成功回應，阻斷此預留ID GET查證；記錄實際成功寫入，不改真實後端資料。 |
| `owner 新增同行者 "{名稱}"` | 名稱:string 保留輸入空白 | 不支援 | 無 | When：在已開啟的新增表單輸入名稱並提交一次；等待成功、驗證或結果未明狀態；記錄前端預留ID及寫入請求。 |
| `owner 將同行者 "{舊名}" 改名為 "{新名}"` | 舊名/新名:string 名稱 | 不支援 | 無 | When：由穩定ID定位成員列，開改名表單填新名提交一次，等待PATCH結果；儲存回應與原ID。 |
| `owner 停用同行者 "{成員}"` | 成員:string 名稱 | 不支援 | 無 | When：在該成員的停用確認中確認一次，等待PATCH isActive=false完成。保存回應與預期成員ID。 |
| `owner 重新啟用同行者 "{成員}"` | 成員:string 名稱 | 不支援 | 無 | When：點重新啟用一次，等待PATCH isActive=true完成。保存回應與預期成員ID。 |
| `owner 刪除同行者 "{成員}"` | 成員:string 名稱 | 不支援 | 無 | When：開刪除確認並確認一次，等待DELETE結果。保存回應與預期成員ID。 |
| `owner 確認刪除同行者 "{成員}"` | 成員:string 名稱 | 不支援 | 無 | When：在已開啟確認點刪除一次，等待409 MEMBER_IN_USE。保存回應與預期成員ID。 |
| `owner 開啟新支出的成員選項` | 無 | 不支援 | 無 | When：只開啟新支出表單的成員目錄，等待members查詢完成；不開其他表單且不提交寫入。 |
| `owner 開啟獨立還款的成員選項` | 無 | 不支援 | 無 | When：只開啟獨立還款表單的成員目錄，等待members查詢完成；不開其他表單且不提交寫入。 |
| `owner 查看同行者管理` | 無 | 不支援 | 無 | When：開啟同行者頁，等待GET members完成。 |
| `同行者名單顯示啟用中的 "{名稱}" 且可作為付款人及分攤者` | 名稱:string trim後名稱 | 不支援 | 無 | Then：核對清單名稱trim、isActive=true及API穩定ID；若重新啟用必須同原ID，若新增只能多一筆。透過成員picker page object確認付款/分攤選項對應此ID；未填寫或保存任何支出。 |
| `同行者欄位提示名稱已使用且既有成員與帳務不變` | 無 | 不支援 | 無 | Then：檢查欄位錯誤可被輔助工具讀取、保留輸入；本地或MEMBER_NAME_CONFLICT都可映射；GET members/expenses/repayments/settlement與初始快照相等，無新增/改名。 |
| `午餐與還款顯示 "{名稱}" 且仍關聯原成員身分` | 名稱:string 新名 | 不支援 | 無 | Then：刷新後的成員/帳務展示以新名標示；GET member ID不變、expense payer/shares與repayment兩端/日期/金額不變、份額100與淨額-80不變；不以姓名重新配對。 |
| `"{成員}" 的歷史分攤及還款仍保留` | 成員:string 名稱 | 不支援 | 無 | Then：GET member isActive=false且ID不變；原支出份額、還款及settlement淨額逐項等於初始快照，畫面停用文字與歷史成員名仍可辨識。 |
| `新支出不可選取 "{成員}"` | 成員:string 名稱 | 不支援 | 無 | Then：新支出的付款/分攤控制不可選此ID，鍵盤也無法選入；本次無寫入。GET member仍保留停用、ID與原歷史，API帳務快照不變。 |
| `獨立還款不可選取 "{成員}"` | 成員:string 名稱 | 不支援 | 無 | Then：獨立還款的付款/收款控制不可選此ID，鍵盤也無法選入；本次無寫入。GET member仍保留停用、ID與原歷史，API帳務快照不變。 |
| `同行者名單及新紀錄選項不含 "{成員}"` | 成員:string 名稱 | 不支援 | 無 | Then：DELETE成功，GET member=404、list無該ID；清單及picker不含此ID，其他成員與帳務不變。 |
| `畫面提示成員已被使用並提供停用而未刪除 Amy` | 無 | 不支援 | 無 | Then：核對409 MEMBER_IN_USE映射可理解訊息；有停用入口但此Then不操作。API Amy仍在且引用與帳務未變。 |
| `owner Alice 不提供停用與刪除操作` | 無 | 不支援 | 無 | Then：owner列不可操作停用/刪除，鍵盤無入口且不會送出相應請求；GET owner role/isActive維持owner/true。 |
| `同行者畫面保留 Carol 並提示保存結果尚未確認` | 無 | 不支援 | 無 | Then：無成功提示；Carol草稿與原UUID保留，查證原ID且不以新ID重送，網路記錄POST僅一次；後端成員僅一筆Carol，畫面不將未知結果當確定成功。 |
| `owner 的手機已保存目前分帳資料` | 無 | 不支援 | 無 | Given：以375px手機context載入owner旅行並確認目前fixture已保存成員/支出；記錄穩定ID與share/settlement快照，關閉context；此步不測跨裝置讀取。 |
| `目前瀏覽器已改為另一個登入帳號` | 無 | 不支援 | 無 | Given：啟用完全隔離的另一session context，不沿用owner cookie/cache；保留owner側權威資料供安全斷言。 |
| `目前瀏覽器未登入且僅知道同行者 Amy 的資料` | 無 | 不支援 | 無 | Given：用無session全新context，只提供旅行路徑及同行者名稱/ID作已知資料，不建立同行者登入或權限。 |
| `owner 在電腦開啟目前旅行分帳` | 無 | 不支援 | 無 | When：用同owner帳號、全新1280px context開目前旅行分帳，等待真實GET members/expenses/settlement完成。 |
| `使用者直達目前旅行分帳` | 無 | 不支援 | 無 | When：以Given準備的非owner或未登入context直達owner分帳頁一次，等待401/404及登入/拒絕狀態；不透過owner API回填畫面。 |
| `電腦顯示同一份同行者、支出與分攤結果` | 無 | 不支援 | 無 | Then：畫面成員/名稱/ID/付款人/分攤及金額均對應手機快照；GET權威資料完整相等，無依裝置重建新成員或新支出；API與UI保持JPY100三份100/3/33.33。 |
| `畫面不洩漏同行者或帳務且不提供編輯能力` | 無 | 不支援 | 無 | Then：受測context得到401或404，畫面/accessibility tree/已取得payload不含保護成員姓名、金額、支出；無可用新增/編輯/還款/結清入口，鍵盤無法提交寫入，owner fixture再查原資料未變。不把隱藏按鈕當後端授權證據。 |
