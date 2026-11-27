# 旅行 DSL

每列為可直接綁定的完整句型；測試資料中的具體值由句型本身提供。

## Given 句型

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | Playwright BDD 實作語意 |
| --- | --- | --- | --- | --- |
| `使用者已登入且在旅行清單` | 無；句型中的具體值為案例固定資料 | 不支援 | 無 | 使用隔離測試帳號與 API fixture 建立所述旅行、分類或支出權威資料；開啟目標頁並等待初始查詢完成。以 GET /api/trips 與 GET /api/trips/{tripId} 核對保存日期與擁有者資料。 |
| `"日本旅行" 已有開始日 "2027-03-10" 且未填結束日` | 無；句型中的具體值為案例固定資料 | 不支援 | 無 | 使用隔離測試帳號與 API fixture 建立所述旅行、分類或支出權威資料；開啟目標頁並等待初始查詢完成。以 GET /api/trips 與 GET /api/trips/{tripId} 核對保存日期與擁有者資料。 |
| `同一 Google 帳號已在手機建立 "日本旅行"` | 無；句型中的具體值為案例固定資料 | 不支援 | 無 | 使用隔離測試帳號與 API fixture 建立所述旅行、分類或支出權威資料；開啟目標頁並等待初始查詢完成。以 GET /api/trips 與 GET /api/trips/{tripId} 核對保存日期與擁有者資料。 |

## When 句型

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | Playwright BDD 實作語意 |
| --- | --- | --- | --- | --- |
| `使用者建立名稱為 "日本旅行" 且未填日期的旅行` | 無；句型中的具體值為案例固定資料 | 不支援 | 無 | 在已安排的表單或清單完成此唯一操作，等待請求結果及相關查詢更新；保留成功或失敗回應供斷言。以 GET /api/trips 與 GET /api/trips/{tripId} 核對保存日期與擁有者資料。 |
| `使用者建立名稱為 "日本旅行"、開始日為 "2027-03-10" 且未填結束日的旅行` | 無；句型中的具體值為案例固定資料 | 不支援 | 無 | 在已安排的表單或清單完成此唯一操作，等待請求結果及相關查詢更新；保留成功或失敗回應供斷言。以 GET /api/trips 與 GET /api/trips/{tripId} 核對保存日期與擁有者資料。 |
| `使用者建立名稱為 "台南旅行"、未填開始日且結束日為 "2027-04-05" 的旅行` | 無；句型中的具體值為案例固定資料 | 不支援 | 無 | 在已安排的表單或清單完成此唯一操作，等待請求結果及相關查詢更新；保留成功或失敗回應供斷言。以 GET /api/trips 與 GET /api/trips/{tripId} 核對保存日期與擁有者資料。 |
| `使用者將結束日 "2027-03-09" 保存到 "日本旅行"` | 無；句型中的具體值為案例固定資料 | 不支援 | 無 | 在已安排的表單或清單完成此唯一操作，等待請求結果及相關查詢更新；保留成功或失敗回應供斷言。以 GET /api/trips 與 GET /api/trips/{tripId} 核對保存日期與擁有者資料。 |
| `使用者將結束日 "2027-03-15" 保存到 "日本旅行"` | 無；句型中的具體值為案例固定資料 | 不支援 | 無 | 在已安排的表單或清單完成此唯一操作，等待請求結果及相關查詢更新；保留成功或失敗回應供斷言。以 GET /api/trips 與 GET /api/trips/{tripId} 核對保存日期與擁有者資料。 |
| `使用者在電腦查看旅行清單` | 無；句型中的具體值為案例固定資料 | 不支援 | 無 | 以指定帳號與裝置開啟目標畫面，等待資料查詢完成；以使用者可見操作完成唯一 Act。以 GET /api/trips 與 GET /api/trips/{tripId} 核對保存日期與擁有者資料。 |

## Then 句型

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | Playwright BDD 實作語意 |
| --- | --- | --- | --- | --- |
| `使用者看到 "日本旅行" 的空帳本與未定日期` | 無；句型中的具體值為案例固定資料 | 不支援 | 無 | 檢查畫面內容與相應 API 再讀結果一致；支出、總額與分類關聯以後端權威資料為準，不以本頁快取自行推算。以 GET /api/trips 與 GET /api/trips/{tripId} 核對保存日期與擁有者資料。 |
| `使用者看到 "日本旅行" 的開始日與未定結束日` | 無；句型中的具體值為案例固定資料 | 不支援 | 無 | 檢查畫面內容與相應 API 再讀結果一致；支出、總額與分類關聯以後端權威資料為準，不以本頁快取自行推算。以 GET /api/trips 與 GET /api/trips/{tripId} 核對保存日期與擁有者資料。 |
| `使用者看到 "台南旅行" 的未定開始日與結束日` | 無；句型中的具體值為案例固定資料 | 不支援 | 無 | 檢查畫面內容與相應 API 再讀結果一致；支出、總額與分類關聯以後端權威資料為準，不以本頁快取自行推算。以 GET /api/trips 與 GET /api/trips/{tripId} 核對保存日期與擁有者資料。 |
| `畫面提示日期順序錯誤且原旅行日期維持不變` | 無；句型中的具體值為案例固定資料 | 不支援 | 無 | 同時檢查可見提示或清單、最新讀取結果與後端權威資料；拒絕與離線情況不得產生新資料或改壞原資料。以 GET /api/trips 與 GET /api/trips/{tripId} 核對保存日期與擁有者資料。 |
| `畫面顯示旅行期間為 "2027-03-10" 至 "2027-03-15"` | 無；句型中的具體值為案例固定資料 | 不支援 | 無 | 檢查畫面內容與相應 API 再讀結果一致；支出、總額與分類關聯以後端權威資料為準，不以本頁快取自行推算。以 GET /api/trips 與 GET /api/trips/{tripId} 核對保存日期與擁有者資料。 |
| `使用者看到已保存的 "日本旅行"` | 無；句型中的具體值為案例固定資料 | 不支援 | 無 | 檢查畫面內容與相應 API 再讀結果一致；支出、總額與分類關聯以後端權威資料為準，不以本頁快取自行推算。以 GET /api/trips 與 GET /api/trips/{tripId} 核對保存日期與擁有者資料。 |


## 006 旅行管理與等待契約

沿用真實 API 與隔離資料庫、Playwright BDD 與 page object；延遲／失敗／回應遺失使用可控制屏障，不以任意 sleep 判定。Given 準備已完成前序與畫面狀態；When 為唯一操作；Then 等待指定結果並對應真實 API／DB 權威資料，請求監測確認不該送出的命令為零。只讀再查核不是第二個受測動作。

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | StepDef 實作語意 |
| --- | --- | --- | --- | --- |
| `owner 的旅行管理畫面為 "{狀態}"` | 狀態:string，旅行清單／帳本／垃圾桶／移入確認／永久刪除確認／縮圖編輯／新增表單 | 不支援 | 無 | Given：以真實API/DB fixture建立Alice與日本旅行、台南旅行及完整005帳務基準（停用Bob、未清TWD300、還款/結清/差額、分類、富士山縮圖）；保存ID與精確帳務快照。按狀態開啟清單／帳本／垃圾桶／移入確認／永久刪除確認／縮圖編輯／新增表單；垃圾桶僅識別投影。初始查詢完成後才放行Act；回寫page/session/trip/原焦點。 |
| `owner 選擇旅行操作 "{操作}"` | 操作:string，管理旅行／自訂旅行縮圖／移至垃圾桶／永久刪除／確認移入／復原／確認永久刪除／保存圖片 | 不支援 | 無 | When：以可辨識名稱完成一次操作：管理旅行開啟選單，自訂旅行縮圖對應「更換縮圖」，移至垃圾桶為已開選單項目，永久刪除為trash card；確認移入／復原／確認永久刪除為相應button，按保存圖片提交最後草稿。記錄請求、導航與焦點；不得額外刷新／重送。 |
| `管理選單列出日期、縮圖與移入入口而不遮罩旅行清單` | 無 | 不支援 | 無 | Then：trigger 旁顯示編輯旅行日期、更換縮圖與移至垃圾桶選單項目，旅行清單未被對話框或遮罩取代；沒有寫入請求，API/DB旅行保持。鍵盤expanded/haspopup與menu語意可辨識。 |
| `管理旅行選單已展開` | 無 | 不支援 | 無 | Given：只在Arrange開啟管理選單，保留trigger焦點；資料仍為active，不執行任何管理命令。 |
| `畫面進入縮圖編輯且尚未保存` | 無 | 不支援 | 無 | Then：顯示該旅行縮圖編輯dialog及正確名稱／後果，無命令請求；API/DB旅行與圖片維持原態，focus在dialog且破壞性確認非預設。 |
| `畫面進入移入確認且尚未保存` | 無 | 不支援 | 無 | Then：顯示該旅行移入確認dialog及正確名稱／後果，無命令請求；API/DB旅行與圖片維持原態，focus在dialog且破壞性確認非預設。 |
| `owner 按 Escape 關閉管理選單` | 無 | 不支援 | 無 | When：已開選單按Escape一次，等待menu關閉；不開啟dialog、不送命令。 |
| `選單關閉且焦點返回管理旅行` | 無 | 不支援 | 無 | Then：menu不可見、focus回管理旅行，帳本可操作且API/DB與原快照相同；命令請求數零。 |
| `確認內容說明 "{後果}"` | 後果:string，移入可復原／永久刪除不可復原 | 不支援 | 無 | Then：dialog accessible name/description包含日本旅行與後果：移入可復原；永久刪除整趟資料且無法復原。取消中性且和主要操作相鄰、X等同取消；無寫入請求，DB尚未變更。 |
| `owner 以 "{方式}" 關閉 "{編輯}"` | 方式:string，取消／X／Escape；編輯:string，上述4種dialog | 不支援 | 無 | When：只點取消／X或按Escape一次，編輯=移入確認／永久刪除確認／縮圖編輯／新增表單。未提交時放棄本地草稿；已提交時只能關閉，不撤回遠端命令。記錄請求與focus；不接著重開。 |
| `關閉未確認操作不改變旅行資料` | 無 | 不支援 | 無 | Then：dialog關閉、focus回合理原trigger，所有旅行/帳務/圖片與API/DB快照一致，未發trash/purge/create/thumbnail命令；原狀態仍可辨識及操作。 |
| `移入成功回到一般清單並更新相關入口` | 無 | 不支援 | 無 | Then：等待POST trash200與權威state=trash；回/trips、一般清單及一般旅行選單無該trip、台南仍在，成功通知可讀；取消in-flight／清除該trip普通帳本cache使舊內容不可操作，不以缺項推論purge。API垃圾桶可辨識且原ID/帳務/圖保持。 |
| `復原後原旅行重新可開啟且垃圾桶移除該項` | 無 | 不支援 | 無 | Then：restore200且state=active，一般清單同一tripID且垃圾桶不含；只讀API/DB比對日期／成員ID與停用／shares／還款／結清／差額／simplifyDebts／原圖及精確淨額完全相同，不重建紀錄；另一browser context讀取同狀態。 |
| `完成整趟清除後才顯示永久刪除成功` | 無 | 不支援 | 無 | Then：等purge200收據及state=purged，成功通知、兩清單無該ID；DB無專屬資料/圖且舊URL不可取，其他旅行/共用分類/帳號同前態，無可復原入口；回應未確認時不得走此成功分支。 |
| `owner 從 "{裝置}" 的我的旅行導覽進入垃圾桶` | 裝置:string，手機／桌面電腦 | 不支援 | 無 | When：手機與桌機都直接前往我的旅行清單，從頁首進入垃圾桶，唯一導航到/trips/trash；不把trash當trip UUID。不另點復原。 |
| `垃圾桶導覽可達且不冒用旅行內導覽` | 無 | 不支援 | 無 | Then：頁面顯示本人垃圾桶、僅一active項；trash不被解析成tripId，無同行者／分帳結算子導覽、無/api/trips/trash當單筆錯誤請求。其他active trip桌機同行者/分帳為我的旅行下縮排，手機保留三項旅行內底部導覽與目前區塊標示。API項目同owner投影。 |
| `目前 "{清單}" 已成功確認沒有旅行` | 清單:string，一般清單／垃圾桶 | 不支援 | 無 | Given：一般清單空=最後旅行已移入trash；垃圾桶空=最後trash已復原active。兩清單fixture狀態與API一致，初始無cache；本次請求成功空集，不是pending。 |
| `owner 開啟 "{清單}"` | 清單:string，一般清單／垃圾桶 | 不支援 | 無 | When：一次進入/trips或/trips/trash並等待本次查詢結果，不發mutation。 |
| `畫面呈現 "{清單}" 的真正空狀態` | 清單:string，一般清單／垃圾桶 | 不支援 | 無 | Then：對應無旅行／沒有已刪旅行文案且無spinner/skeleton；API該scope items空，另一scope仍有原trip且可辨識，不以兩者共用空文字掩蓋資料。 |
| `目前縮圖草稿為 "{草稿}" 且尚未保存` | 草稿:string，神社照片／預設圖／富士山 | 不支援 | 無 | Given：已保存富士山，編輯本地草稿=神社照片／預設圖／富士山；神社可由前序選圖、預設可由神社再切預設建立。保留File與原bytea快照、draft意圖；無thumbnail命令送出。 |
| `owner 將縮圖預覽切為 "{草稿}"` | 草稿:string，神社照片／預設圖 | 不支援 | 無 | When：神社照片用檔案選擇器一次選有效神社PNG，預設圖點使用預設圖；只改本地草稿，等待預覽，不提交保存。 |
| `畫面預覽 "{草稿}" 並清楚標示尚未保存` | 草稿:string，神社照片／預設圖 | 不支援 | 無 | Then：預覽對應最後選定照片/預設，顯示尚未保存；GET Trip與另一context列表仍富士山，原binary可讀、DB原bytea/帳務不變、無POST/DELETE thumbnail。檔名旁重新選圖及使用預設圖相鄰，手機不足寬整組換行、操作不遮住預覽。 |
| `前次縮圖草稿已取消且原縮圖為富士山` | 無 | 不支援 | 無 | Given：前次神社/預設草稿已被取消、dialog關閉，真實API仍富士山，該次preview object URL已釋放；不保存任何草稿為遠端圖。 |
| `縮圖編輯顯示富士山而非已放棄草稿` | 無 | 不支援 | 無 | Then：預覽與當前API/DB富士山一致，不顯示神社或未保存預設，無寫入；帳務同前態。 |
| `owner 取消檔案選擇` | 無 | 不支援 | 無 | When：已開選檔器以cancel結束單次選取；page object觀察chooser取消而非填空File，返回當前編輯，不關閉dialog或保存。 |
| `縮圖草稿仍為 "{草稿}" 且遠端未變` | 草稿:string，富士山／預設圖 | 不支援 | 無 | Then：選檔取消後draft類型與File引用保持Given值，無誤換神社、無遠端命令；API/DB仍富士山及原帳務。 |
| `最後預覽的 "{草稿}" 成為已保存縮圖` | 草稿:string，神社照片／預設圖 | 不支援 | 無 | Then：神社POST、預設DELETE，各只送一次且用該次operationId/兩版本；等待200/收據，API/DB目前圖與最後草稿相同，舊富士山URL404；另一context重新讀亦一致，無中途草稿提交，原帳務及他圖不變。 |
| `本次圖片保存將明確失敗且確定未提交` | 無 | 不支援 | 無 | Given：對POST/DELETE設正式可控拒絕，確認無receipt/無DB變更；保留合法File或reset意圖，與response遺失分開。 |
| `圖片失敗有下一步且草稿仍為 "{草稿}"` | 草稿:string，神社照片／預設圖 | 不支援 | 無 | Then：spinner結束、顯示失敗原因和可保存重試入口，draft File/reset意圖仍可用；不顯示成功。API/DB原富士山與帳務不變、原URL可讀，其他trip不受影響。 |
| `前次圖片明確失敗已解除且草稿仍可用` | 無 | 不支援 | 無 | Given：Arrange已失敗後UI，保留File/reset草稿；移除拒絕屏障，建立新保存意圖但沿用同trip，API仍富士山。 |
| `新增旅行草稿的照片為 "{照片}"` | 照片:string，無／合法神社／不合法HEIC | 不支援 | 無 | Given：京都賞楓尚無trip，name填妥、日期optional；照片=無／合法神社／不合法HEIC。合法者保留File與本地預覽，無圖為default；HEIC有驗證錯誤不得靜默忽略。無create/thumbnail命令已送出。 |
| `owner 送出新增旅行` | 無 | 不支援 | 無 | When：按建立旅行一次；先POST trips使用原生成UUID，成功確認trip才對同ID依選圖發一次POST thumbnail；無圖不發thumbnail。記錄階段／IDs，不另建trip。 |
| `新旅行只建立一次並使用 "{圖片}"` | 圖片:string，預設／神社 | 不支援 | 無 | Then：API/DB京都賞楓恰一trip及唯一owner成員，name/date正確；圖片=預設時無圖，神社時當前bytes一致；UI清單與另一context同一trip/圖，命令順序create確認在先、thumbnail在後且無重複。 |
| `新增表單及選圖草稿已放棄且旅行不存在` | 無 | 不支援 | 無 | Then：dialog關閉，無create/thumbnail請求，API/DB無京都賞楓或該照片；object URL釋放、舊旅行未變。 |
| `owner 在新增表單選擇 "{照片}"` | 照片:string，合法神社／不合法HEIC | 不支援 | 無 | When：一次選檔操作，合法神社為PNG，HEIC為真實不支援檔；等待本地驗證結果，不按建立。 |
| `新增表單顯示尚未保存預覽且沒有旅行資料` | 無 | 不支援 | 無 | Then：神社可預覽且標尚未保存；DB/API無京都賞楓與thumbnail，POST數零；名稱日期及操作仍可用。 |
| `新增表單說明選圖錯誤並阻止帶錯誤直接建立` | 無 | 不支援 | 無 | Then：HEIC錯誤、可接受格式與改選/移除入口可讀；不能當合法預覽；建立控制處於不可提交狀態（本句不點擊，實際觸發另由獨立案例驗證），保留name/date，DB無旅行。 |
| `owner 移除新增表單的選圖` | 無 | 不支援 | 無 | When：一次點移除選圖，清掉File/驗證錯誤及object URL，保留name/date；不建立旅行。 |
| `新增草稿不含照片且建立入口可用` | 無 | 不支援 | 無 | Then：不再顯示無效預覽或選圖錯誤，name/date原值保持，建立可用；無命令且DB無旅行。無圖送出結果另由未選圖案例驗證。 |
| `旅行建立將明確失敗` | 無 | 不支援 | 無 | Given：POST trips正式拒絕且DB未建立，thumbnail不應發送；保存表單name/date/File及ID供核對。 |
| `旅行未建立且可修正草稿保持` | 無 | 不支援 | 無 | Then：結束busy、明確未建立原因與下一步，name/date/File預覽保留；DB無trip/thumbnail、thumbnail POST零、不顯示成功。 |
| `前次建立明確失敗已解除且照片草稿保留` | 無 | 不支援 | 無 | Given：準備失敗後可修正表單，合法名稱日期/File，DB無原trip；移除拒絕，沿用本次trip UUID而不產生第二個。 |
| `旅行已建立但圖片未保存且可同旅行重傳` | 無 | 不支援 | 無 | Then：DB有且僅有原trip、預設圖，UI明示旅行已建立但圖片未保存、重新上傳，File保留；不宣告整趟失敗、不提供再次建立動作。GET同ID與API狀態一致。 |
| `旅行已建立但圖片失敗且可重新上傳` | 無 | 不支援 | 無 | Given：京都賞楓已active default、原create成功，File神社仍保留且縮圖拒絕已解除；開該次失敗結果。保存trip UUID及create請求計數。 |
| `owner 重新上傳已建立旅行的圖片` | 無 | 不支援 | 無 | When：點重新上傳一次，只對已知trip UUID保存神社，不發POST trips；等待縮圖命令結果。 |
| `本次 "{操作}" 已提交但回應將遺失且暫不可查證` | 操作:string，上述4種操作 | 不支援 | 無 | Given：真實後端提交命令後丟失response，阻擋receipt/state查證回覆；操作=移至垃圾桶／永久刪除／保存圖片／新增附圖。新增附圖create已確認而image response遺失；圖片草稿由前序Given提供，保留operationId／trip UUID／版本。不得用單純500等同unknown。 |
| `結果未確認並保留原操作的查證出口` | 無 | 不支援 | 無 | Then：顯示結果尚未確認與查證中相應指示，不誤報失敗/成功，不以清單缺項或404宣稱purge成功；保存原operationId/trip/draft、阻止同操作再次提交，命令監測確認無自動mutation retry。新增附圖明示旅行已建立但圖片未知且不重建／回退預設。API/DB提交事實保留。 |
| `原次 "{操作}" 結果未知且現在可查證` | 操作:string，移入後已復原／圖片後已換海邊／永久刪除／保存預設圖／新增附圖 | 不支援 | 無 | Given：建立已提交命令、UI未知狀態及原ID；解除查證屏障，receipt回原結果、currentState回當前。移入已成功後復原為active、圖片已保存神社後另裝置海邊、purge為purged、預設為default、新增附圖為同trip神社。讀取真實DB，不重送命令。 |
| `owner 再次查證原旅行操作` | 無 | 不支援 | 無 | When：點再次查證，只讀原operationId收據與必要state/當前投影，不重送任何create/trash/purge/thumbnail；等待權威結果。 |
| `畫面分別顯示原次結果與目前旅行狀態` | 無 | 不支援 | 無 | Then：查證busy結束，原操作成功與currentState分開展示；已復原保持active、海邊保持新圖、purged無帳務或圖片、預設無舊圖、新增附圖同一trip神社；API/DB與UI一致、命令數未增加，不能以舊receipt版本回退cache。 |
| `預設縮圖保存已送出且查證結束仍未知` | 無 | 不支援 | 無 | Given：原DELETE已提交、response遺失，查證讀取失敗已結束；File/reset意圖與原operationId保留在本帳號可續查狀態，不再busy；DB已default。 |
| `關閉後原圖片操作仍可查證且沒有撤銷命令` | 無 | 不支援 | 無 | Then：dialog關閉但同帳號原operationId/reset意圖保留，頁面保有可續查原結果入口；無逆向POST、無新的DELETE，DB已default不復活富士山。重新進入的Arrange另供查證案例驗證，不在Then操作。 |
| `旅行已在另一裝置成為 "{狀態}" 且本裝置保留舊帳本` | 狀態:string，垃圾桶／已永久刪除 | 不支援 | 無 | Given：本context曾讀active及未保存支出草稿，另一context已提交trash或purge；保留舊路由/草稿與前態快照。API/DB為最新狀態，舊cache可存在但不可繼續提供帳務操作。 |
| `owner 開啟原旅行舊連結` | 無 | 不支援 | 無 | When：一次導航舊trip路由，等最新trip/state結果，不嘗試復原或另保存。 |
| `舊連結只提供 "{狀態}" 的下一步而不顯示帳務` | 狀態:string，垃圾桶／已永久刪除 | 不支援 | 無 | Then：trash顯示已在垃圾桶與前往復原入口，purged顯示不存在及返回清單；普通帳本/支出/成員/還款/結清/付款安排不可讀或操作、舊cache清除且in-flight回應不得還原舊內容；API state/DB一致，保留適用未提交草稿但不顯示他owner內容。 |
| `本次旅行 "{操作}" 將明確失敗` | 操作:string，移至垃圾桶／復原／永久刪除 | 不支援 | 無 | Given：準備目標dialog/restore入口，後端fault使transaction回滾且明確錯誤；保存原state/帳務/圖快照。不以timeout或收據404表示明確失敗。 |
| `旅行操作失敗可重試且沒有成功假象` | 無 | 不支援 | 無 | Then：busy結束、有原因與下一步、不宣告成功；API/DB原狀態及全部帳務/圖快照保持，入口可重新操作，不留下半套旅行。 |
| `旅行縮圖的讀取將 "{結果}"` | 結果:string，延遲／明確失敗 | 不支援 | 無 | Given：active旅行有富士山且欄位資料已成功取得；binary GET屏障=延遲／明確失敗，保留卡片名稱日期筆數與bbox。不延遲整份旅行資料代替讀圖。 |
| `owner 查看旅行卡片` | 無 | 不支援 | 無 | When：開啟/trips取得卡片後，維持binary指定狀態，等待該狀態可觀測；不開帳本。 |
| `縮圖區域保留位置且旅行識別與入口可用` | 無 | 不支援 | 無 | Then：圖片區固定占位及spinner-only/非聚焦狀態語意；name/date/expenseCount與API一致，開啟帳本入口未遮住、無意外位移，長名稱可換行；DB無變更。 |
| `縮圖使用預設呈現且等待已結束` | 無 | 不支援 | 無 | Then：default視覺fallback、無殘留spinner，name/date/count/開帳本操作可見且可用；後端已保存圖片和帳務不因讀取失敗被DELETE或改寫，其他圖同前態。 |
| `圖片讀取已失敗且owner已開啟原旅行帳本` | 無 | 不支援 | 無 | Given：旅行active、binary讀失敗但帳本真實資料載入成功，支出草稿早餐TWD100合法；保留前態oracle，不先新增。 |
| `owner 保存 TWD 100 的早餐支出` | 無 | 不支援 | 無 | When：在既有支出表單以可見操作保存一次早餐TWD100；用真API，等待寫入確認，不修圖片。 |
| `早餐成功保存且圖片失敗沒有改壞帳務` | 無 | 不支援 | 無 | Then：UI顯示成功，API/DB恰一TWD100早餐與精確份額、總額oracle一致；其他帳務未變、圖片原資料保留，無重複命令。 |
| `Alice 已查看私人旅行與垃圾桶且有未保存照片預覽` | 無 | 不支援 | 無 | Given：同browser載入Alice active/trash圖與draft object URL、保存in-flight查詢，再備Carol獨立帳號無同旅行授權；保留兩者資料集及舊URL。 |
| `Alice 登出並切換為 Carol 帳號` | 無 | 不支援 | 無 | When：一次帳號切換流程，實際本地session結束並建立Carol session；等待Carol身份確認。延遲Alice舊請求再返回以驗污染防護，不額外開舊連結。 |
| `Carol 畫面只含自己的資料且舊預覽已釋放` | 無 | 不支援 | 無 | Then：畫面/可存取cache無Alice旅行、trash、圖片或草稿，object URL釋放、舊in-flight結果不重填；Carol API只回自己項目，持Alice舊binary/state/帳本URL只讀驗404且無內容，DB Alice原資料未被刪除。 |
| `新縮圖上傳會在提交前中斷且確定未保存` | 無 | 不支援 | 無 | Given：有神社draft，傳輸中止屏障在完整body前，DB/receipt確無提交；與提交後response遺失區分。 |
| `上傳等待結束且原縮圖與帳務維持` | 無 | 不支援 | 無 | Then：明示上傳未保存及重試入口、busy結束，File草稿可用；API/DB富士山/versions/帳務保持，無新receipt；若無法確知未提交則必須走unknown，不能套此斷言。 |

## 006 旅行管理與等待契約

沿用真實 API 與隔離資料庫、Playwright BDD 與 page object；延遲／失敗／回應遺失使用可控制屏障，不以任意 sleep 判定。Given 準備已完成前序與畫面狀態；When 為唯一操作；Then 等待指定結果並對應真實 API／DB 權威資料，請求監測確認不該送出的命令為零。只讀再查核不是第二個受測動作。

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | StepDef 實作語意 |
| --- | --- | --- | --- | --- |
| `owner 已在 "{裝置}" 開啟旅行選圖介面` | 裝置:string，手機／桌面電腦 | 不支援 | 無 | Given：手機390x844／桌面1440x900真browser context、Alice active旅行已有富士山；開縮圖dialog，保存DB原態，不選檔。 |
| `owner 查看可選圖片條件` | 無 | 不支援 | 無 | When：檢視已開選圖區一次，不開系統相簿或保存。 |
| `選圖介面揭露靜態單張格式與全部上限` | 無 | 不支援 | 無 | Then：可見單張靜態JPEG含jpg/jpeg、PNG、WebP，最大10MiB、25000000像素、單邊16384px及HEIC轉檔方式；與API policy一致，名稱/日期/筆數/開帳本仍可用、不顯示技術錯誤碼，無命令寫入。 |
| `待選圖片不合規原因為 "{原因}"` | 原因:string，Examples列舉原因 | 不支援 | 無 | Given：真實檔案為HEIC/HEIF/AVIF/GIF/SVG/TIFF/PDF、動畫APNG/WebP、偽造MIME/副檔名、損壞、零尺寸、空檔、超檔案/像素/單邊或雙檔，依原因fixture帶真bytes；原富士山/帳務存在。前端可預檢，但通過預檢的無效內容須由後端拒絕，不能靠假toast當驗證。 |
| `owner 嘗試保存這次不合規選圖` | 無 | 不支援 | 無 | When：在已開編輯選指定輸入並一次按保存（若本地拒絕則提交guard拒絕，不繞過UI）形成一次選圖保存業務Act；雙檔由選擇器支援的注入測試輸入，後端雙檔獨立case已覆蓋。記錄拒絕來源。 |
| `畫面說明 "{原因}" 並保留原已保存資料` | 原因:string，Examples原因 | 不支援 | 無 | Then：明示對應不支援/動畫/損壞/尺寸/容量/單檔原因、JPEG/PNG/WebP條件與縮小/轉檔/改選下一步，busy結束且無成功；API/DB仍原富士山、所有帳務/versions一致。能本地拒絕者無POST，需server判斷者拒絕後無新receipt，不把不合法草稿當已保存圖。 |
| `前次選圖已因 "{原因}" 被拒絕且現在備有合法JPEG` | 原因:string，上述21種原因 | 不支援 | 無 | Given：建立上例錯誤後UI，富士山與帳務原態，錯誤草稿未保存；準備靜態4000x3000、1MiB JPEG，不變更trip。 |
| `owner 改選合法JPEG並保存縮圖` | 無 | 不支援 | 無 | When：以已開編輯改選合法檔並按保存一次，目標Act為一次更換保存，不重建trip；等待server確認。 |
| `合法新圖可讀取且錯誤與等待已結束` | 無 | 不支援 | 無 | Then：API/DB同trip恰一新WebP、當前版本可讀且舊版不可讀；UI顯示已確認圖，不殘留前次錯誤/spinner，帳務與他圖不變，create請求零。 |
| `owner 在 "{裝置}" 備有合法 "{格式}" 照片` | 裝置:string，手機／桌面電腦；格式:string，JPEG .jpg／JPEG .jpeg／PNG／WebP | 不支援 | 無 | Given：手機或桌面viewport的真browser context，active旅行default；4000x3000/1MiB真靜態格式檔，兩個context共享同owner有效登入；保留原帳務與其他trip快照。 |
| `owner 選圖預覽後保存該照片` | 無 | 不支援 | 無 | When：已開編輯選指定檔、一次保存，等待真POST成功，不另讀另一裝置作第二Act。 |
| `另一裝置可讀相同旅行的已保存縮圖` | 無 | 不支援 | 無 | Then：UI與獨立context只讀載入/trips取得當前WebP，與API/DB同trip目前圖及hash對應；原帳務/他圖無變。跨視角讀取只為斷言、不再保存或改圖。 |
| `其他裝置已使縮圖提交的 "{衝突}" 過期` | 衝突:string，圖片版本／旅行版本 | 不支援 | 無 | Given：本地神社draft與舊兩版本，另一context已合法更換海邊或移入再復原；當前DB新狀態已提交，本地尚未更新，保留新圖hash與原operationId。 |
| `owner 提交目前圖片草稿` | 無 | 不支援 | 無 | When：一次保存原神社draft與舊版本，等待正式409及必要只讀state刷新，不自動用新版本重送。 |
| `畫面說明衝突並保留目前權威狀態` | 無 | 不支援 | 無 | Then：THUMBNAIL_UPDATED/TRIP_STATE_CHANGED映為可讀說明與下一步，不顯示UUID/code；刷新state/目前圖，不能以draft或舊receipt覆蓋較新圖；保留可用draft由使用者決定、無自動重送，DB前後不變。 |

## 006 旅行管理與等待契約

沿用真實 API 與隔離資料庫、Playwright BDD 與 page object；延遲／失敗／回應遺失使用可控制屏障，不以任意 sleep 判定。Given 準備已完成前序與畫面狀態；When 為唯一操作；Then 等待指定結果並對應真實 API／DB 權威資料，請求監測確認不該送出的命令為零。只讀再查核不是第二個受測動作。

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | StepDef 實作語意 |
| --- | --- | --- | --- | --- |
| `不合法選圖仍留在新增旅行草稿` | 無 | 不支援 | 無 | Given：已填京都賞楓name/date但HEIC被拒絕，錯誤與改選/移除入口顯示；DB尚無trip/thumbnail。保留POST計數。 |
| `owner 嘗試提交仍有選圖錯誤的新增旅行` | 無 | 不支援 | 無 | When：以鍵盤Enter/表單submit嘗試一次建立，保留驗證錯誤，不移除照片或另改資料。 |
| `選圖錯誤阻止建立且保留可修正內容` | 無 | 不支援 | 無 | Then：無POST trips/thumbnail、DB仍無京都賞楓，錯誤與name/date保留，不悄悄丟圖建立或顯示成功；原旅行未變。 |
| `建立旅行已送出但原次建立結果尚未確認` | 無 | 不支援 | 無 | Given：真POST trips已成功但回應遺失，原UUID/name/date/神社File保留；阻擋GET state，不提供create成功給UI，無thumbnail提交。 |
| `站內處理原次建立的遺失回應` | 無 | 不支援 | 無 | When：讓原POST的transport rejection到達UI，開始僅原UUID的state查證；不重送POST，不讀列表缺項作失敗。 |
| `建立結果未知保留表單照片且只查原旅行` | 無 | 不支援 | 無 | Then：unknown可見、原UUID/name/date/File保持，POST trips恰1且thumbnail0；無建立失敗或成功假象、不可新建第二趟。查證耗盡結束spinner且可再次查原state，DB原trip存在。 |
| `原次建立結果未知且現在狀態可確認為一般可用` | 無 | 不支援 | 無 | Given：京都賞楓真DB已存在原UUID且default，UI保留原File/name/date，恢復GET state active與Trip投影；尚未提交thumbnail。不在Arrange先續存。 |
| `owner 再次查證原次旅行建立` | 無 | 不支援 | 無 | When：點原建立查證，先讀state與原Trip確認UUID/名稱日期，確認active後僅對該ID續存原照片；不POST trips。 |
| `原旅行確認後才續存同旅行照片` | 無 | 不支援 | 無 | Then：create全程恰1，thumbnail僅確認後1次；UI與API/DB同一京都賞楓/神社，沒有第二trip、無殘留unknown/busy，其他旅行不變。 |
| `原旅行命令 "{操作}" 查證中且本輪無法確認` | 操作:string，上述5種命令 | 不支援 | 無 | Given：原命令已送一次、response遺失，保留UUID/trip/draft，API receipt/state暫不可用；操作=移入／purge／神社保存／預設保存／新增附圖，create部分已確認者不得回退。準備有界查證終點。 |
| `本輪旅行操作查證結束仍未知` | 無 | 不支援 | 無 | When：釋放最後一次查證失敗/未找到收據回覆到狀態機終點；不重送原命令、不關閉編輯。 |
| `旅行操作停止忙碌且保留原次查證入口` | 無 | 不支援 | 無 | Then：spinner停止，可見結果尚未確認與再次查證，原operationId/trip/draft保留、原命令數仍1；不以OPERATION_NOT_FOUND或列表缺項宣告失敗，不開放重複新增；遠端已提交結果保持。 |
| `原次預設圖片結果未知且編輯曾關閉再返回` | 無 | 不支援 | 無 | Given：原DELETE已提交default、response遺失，dialog已關閉再回到縮圖編輯；保留同owner原operationId/reset意圖，恢復receipt/state可讀。沒有逆向保存或第二DELETE。 |
| `owner 查證返回後的原次圖片保存` | 無 | 不支援 | 無 | When：點續查原次保存，只讀原receipt與目前state，不新送圖片命令。 |
| `返回後仍確認同一次預設圖片保存` | 無 | 不支援 | 無 | Then：UI確認原reset成功且目前default，另一context只讀亦default、富士山舊URL404，原帳務不變；全程DELETE一次，關閉沒有撤回。 |
| `前次圖片上傳在提交前中斷且現已恢復連線` | 無 | 不支援 | 無 | Given：原富士山/帳務保持，UI明確未保存、神社File保留且可改選，無成功receipt；恢復正常upload，使用同trip新保存意圖。 |
| `owner 重試中斷後的圖片保存` | 無 | 不支援 | 無 | When：重新選合法神社並保存一次，按當前兩版本提交新operation；不POST trips、不自動重送舊stream。 |
| `重試圖片保存成功且沒有殘留等待` | 無 | 不支援 | 無 | Then：同trip神社WebP可讀，UI與API/DB一致、舊富士山不可讀；沒有重複receipt/圖片/旅行，等待與舊錯誤結束、帳務與他圖未變。 |

本輪新增 trips feature 除 Examples 明示裝置外，皆在1440×900桌機與390×844手機依序執行；由 fixture 確保同一條建立／選圖／記帳／移入／復原行為在兩尺寸可完成。精確呈現來源保留在006 plan-side handoff，不把畫面版本寫進業務Gherkin。
