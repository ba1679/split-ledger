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

## 006 旅行管理與等待契約

所有 Given 由隔離 PostgreSQL fixture 建立且確認權威資料已落地；保留穩定 owner/trip/member/record ID、版本與前態快照，不重演目標 Act。所有 When 只有一次命令或查詢；記錄請求、回應、原 operationId 與版本，非同步競爭由 Given 的屏障安排。Then 的再讀屬只讀驗證，不推進業務。精確帳務用獨立 BigInt 有理數 oracle。

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | StepDef 實作語意 |
| --- | --- | --- | --- | --- |
| `旅行生命週期基準為 "{狀態}"` | 狀態:string，一般可用／垃圾桶／已永久刪除 | 不支援 | 無 | Given：建立 Alice owner、日本旅行及台南旅行，依狀態設 deleted_at 或以 purge fixture 建立無內容 reservation。一般可用／垃圾桶旅行都有日期2027-03-10..15、simplifyDebts=true、Alice owner/Amy active/Bob inactive；JPY3000三人晚餐、JPY2000 Amy付兩人住宿、TWD600 Alice付兩人車資，Bob停用前付Alice JPY200獨立還款與800結清及一對差額。JPY平衡、TWD Amy欠Alice300。保存全部原始欄位、關聯、BigInt oracle、目前富士山WebP與版本及其他旅行／分類／幣別／帳號快照；purged僅有最小reservation與收據，無帳務／圖。回寫識別；不必查UI。 |
| `owner 執行旅行命令 "{操作}"` | 操作:string，移至垃圾桶／復原／永久刪除／保存預設圖／保存神社／新建原旅行 | 不支援 | 無 | When：用有效session及可信Origin，最新lifecycle revision與新的operation UUID，移至垃圾桶／復原／永久刪除分別POST trips/{id}/trash、restore、purge；保存預設圖為DELETE thumbnail，保存神社為POST multipart thumbnail且帶兩版本。新建原旅行為POST trips且沿用原trip UUID。記錄回應與識別；成功等待transaction提交，失敗不得有部分寫入；不必UI確認。 |
| `旅行專屬資料與帳務對照完全一致` | 無 | 不支援 | 無 | Then：DB按穩定ID逐欄比對trips業務欄位、members含停用／owner、expenses/shares、repayments、settlements/adjustments與bytea；僅允許明示生命週期欄位及成功收據變化。用獨立oracle核對每幣別淨額與原始紀錄數，未新增付款或重建ID；可用時以owner普通GET再讀，trash則專用state與DB驗，不繞過垃圾桶公開內容。 |
| `其他旅行與共用資料保持原狀` | 無 | 不支援 | 無 | Then：DB逐欄比對台南旅行、其圖片／帳務、categories、currencies、auth user與前態完全一致；分類usage允許只因purge移除目標引用，分類本身不得刪。owner再讀其他旅行相同。 |
| `命令拒絕為 "{錯誤}" 且沒有部分變更` | 錯誤:string，列舉依本列code | 不支援 | 無 | Then：比對OpenAPI狀態及code：NOT_FOUND404、UNAUTHENTICATED401、REQUEST_ORIGIN_REJECTED403、VALIDATION_ERROR400、TRIP_NOT_TRASHED/TRIP_TRASHED/TRIP_PURGED/TRIP_STATE_CHANGED/THUMBNAIL_UPDATED/OPERATION_ID_CONFLICT/ID_CONFLICT409。DB與前態完全一致，無新receipt、reservation或圖片殘留（已成功原操作的receipt保留）；owner查state及可讀資源相同；錯誤無他人資料。 |
| `旅行以同一身分成為垃圾桶` | 無 | 不支援 | 無 | Then：200 result.kind對應命令、result.state及currentState分別為trash；DB deleted_at與狀態一致，lifecycle_revision恰加1且thumbnail/accounting版本不變；同交易恰一收據，GET state與清單再讀一致，原ID保留。 |
| `旅行以同一身分成為一般可用` | 無 | 不支援 | 無 | Then：200 result.kind對應命令、result.state及currentState分別為active；DB deleted_at與狀態一致，lifecycle_revision恰加1且thumbnail/accounting版本不變；同交易恰一收據，GET state與清單再讀一致，原ID保留。 |
| `owner 讀取 "{清單}" 旅行清單` | 清單:string，一般／垃圾桶 | 不支援 | 無 | When：一次GET /api/trips或/api/trips/trash，使用owner session；記錄分頁items與cursor，不寫DB。 |
| `清單只包含 "{狀態}" 的本人旅行` | 狀態:string，一般可用／垃圾桶 | 不支援 | 無 | Then：response items與DB owner＋active/trash篩選完整對照，遍歷只讀分頁不漏不重且不包含另一owner；一般旅行選單資料源不含trash；trash僅識別投影無帳務明細。查前後DB無變。 |
| `整趟旅行清除後才提交永久刪除結果` | 無 | 不支援 | 無 | Then：200 purge result.state=purged；DB無trip、members、expenses、shares、repayments、settlements、adjustments、thumbnail，原bytea不可再取得；同交易最小reservation標purged及一筆purge receipt存在且無名稱帳務照片；state=purged、兩清單無該ID、圖片舊URL404、復原不可用。沒有提前發成功。 |
| `垃圾桶旅行已保留 180 天且期間未要求永久刪除` | 無 | 不支援 | 無 | Given：以可控時鐘建立180天前deleted_at，重新建立有效登入；保留內容快照，不執行排程清除。回寫時鐘與ID；不查UI。 |
| `下一次 "{操作}" 在交易中途會明確失敗` | 操作:string，移至垃圾桶／復原／永久刪除 | 不支援 | 無 | Given：對正式transaction內的寫入／purge刪除中段設可控fault，保證命令進入交易後拋錯；保存前態含receipt/reservation。不以mock成功服務替代；不先執行目標命令。 |
| `交易失敗回報錯誤且全部權威資料回滾` | 無 | 不支援 | 無 | Then：命令非2xx並按既有錯誤契約回覆；DB含deleted_at、versions、全部子表、bytea、reservation與receipts完全等於前態。再讀state一致；不留下部分清除或成功收據。 |
| `前次 "{操作}" 已明確失敗且故障已解除` | 操作:string，移至垃圾桶／復原／永久刪除 | 不支援 | 無 | Given：建立該次失敗後原狀態及完整快照、沒有成功receipt，移除fault；新使用者重試意圖用新operationId及當前版本。不先執行重試。 |
| `本次 "{操作}" 完整成功而沒有重複資料` | 操作:string，移至垃圾桶／復原／永久刪除 | 不支援 | 無 | Then：依命令驗200＋DB原子狀態／完整purge及恰一成功receipt，原資料僅有命令允許的變更；GET state、清單或purge tombstone一致。以IDs與原始帳務快照驗沒有重建、重複或範圍外改動。 |
| `owner 讀取垃圾桶旅行的 "{資源}"` | 資源:string，表內業務資源 | 不支援 | 無 | When：按資源選一次普通GET：旅行／支出清單／單筆支出／總額／同行者／還款清單／單筆還款／付款安排／結清紀錄／普通縮圖；資源ID於Given落地，另以不存在子ID案例確認先查trip。不使用trash專用投影繞過普通限制。 |
| `owner 對垃圾桶旅行送出 "{寫入}"` | 寫入:string，表內業務命令 | 不支援 | 無 | When：用先前有效表單資料、最新revision送出一次真實命令；名稱日期PATCH trip，簡化PATCH trip，支出POST/PATCH/DELETE，成員POST/PATCH/DELETE，還款POST、結清POST、縮圖POST/DELETE；body依各group contract有效，唯trip已trash。不先由UI阻止取代權限測試。記錄回應與前後DB。 |
| `旅行請求的存取者為 "{存取者}"` | 存取者:string，Carol／訪客／Amy | 不支援 | 無 | Given：Carol為另一有效帳號；訪客無session；Amy有自己帳號但僅為Alice帳務同行者，不獲owner授權。均持有Alice真實trip/record/thumbnail/operation UUID及版本；另建未知UUID作錯誤對照，前態落地。 |
| `該存取者嘗試 "{存取}"` | 存取:string，表內讀取或命令 | 不支援 | 無 | When：依Examples一次讀state、trash list、普通帳本、private thumbnail、receipt，或trash/restore/purge/thumbnail POST/DELETE；採有效輸入及持有ID，不因invalid body短路owner驗證。記錄回應及前態；不寫第二命令。 |
| `請求不洩漏他人旅行且資料不變` | 無 | 不支援 | 無 | Then：訪客401，登入非owner對具體資源404 NOT_FOUND且與未知ID形狀一致；trash list200只含自己項目、不含Alice；無圖片bytes、名稱、帳務、存在與否或版本洩漏；DB及owner再讀與前態一致，無新receipt。 |
| `原次 "{原操作}" 已成功但回應遺失，目前為 "{目前狀態}"` | 原操作:string，移至垃圾桶／永久刪除／保存神社／保存預設圖；目前狀態:string，垃圾桶／一般可用／海邊縮圖／預設圖／已永久刪除 | 不支援 | 無 | Given：依data truth建立已提交命令及不可變receipt、原請求指紋／operation UUID／提交版本，再安排合法後續意圖形成目前狀態。移入後復原保持active；神社後海邊保持海邊；purge僅最小tombstone。留存原結果與最新資料兩份快照，不在When重演前序。 |
| `owner 查證同一次原旅行操作` | 無 | 不支援 | 無 | When：一次GET trips/{tripId}/operations/{operationId}，有效owner；保留response.result與currentState各自值；不重送命令，不更新帳務。 |
| `查證分別回傳原操作結果與目前權威狀態` | 無 | 不支援 | 無 | Then：200 result逐欄等於原receipt含kind、resultState、lifecycleRevision、thumbnailRevision、thumbnailPresent；currentState等於現在DB或本人purged reservation，不能以原結果覆寫目前。前後DB與receipt不變，跨owner不能讀取。 |
| `owner 重送同一次原旅行操作` | 無 | 不支援 | 無 | When：送一次與原operation UUID、kind、tripId、完整欄位／預期版本及圖片原bytes完全相同的請求；記錄200結果，不能改用新意圖ID或最新版本；等待處理結束。 |
| `原收據重播而較新意圖保持不變` | 無 | 不支援 | 無 | Then：200 result等於原receipt且currentState反映目前；DB最新狀態與圖片bytes、所有revision、receipt數量及內容完全不變。對海邊不覆蓋、已復原不再移入、purged不復活；只讀state與目前圖片確認。 |
| `原旅行操作尚無可讀取收據` | 無 | 不支援 | 無 | Given：有效owner的旅行存在，operation UUID已送達但提交屏障未釋放，或結果仍未知；DB無對應receipt。記錄UUID及前態，不假設命令失敗。 |
| `查無收據不等於命令失敗` | 無 | 不支援 | 無 | Then：404 OPERATION_NOT_FOUND而不是成功或確定失敗；DB與前態不變；測試不得把旅行清單缺項或普通404當成purge成功證據。 |
| `本次旅行命令使用 "{衝突}"` | 衝突:string，舊生命週期版本／舊縮圖版本／同操作識別不同內容 | 不支援 | 無 | Given：舊生命週期版本由另裝置移入復原產生，舊縮圖版本由另裝置保存新圖產生；同operation不同內容則建立原receipt後改kind／body／tripId／bytes但沿用ID。保存前態及原ID；不提交目標Act。 |
| `另一裝置的 "{先完成}" 已先取得旅行寫入順序` | 先完成:string，保存點心／移至垃圾桶／永久刪除 | 不支援 | 無 | Given：兩有效owner session；用DB交易屏障安排先完成操作持鎖，先完整提交後釋放本次Act。保存點心先完成則已落地恰一JPY500點心；移至垃圾桶先完成則deleted_at已提交；purge先完成則reservation已標purged。記錄各自結果與oracle，不用時間猜測順序。 |
| `owner 保存 JPY 500 的點心支出` | 無 | 不支援 | 無 | When：一次POST expenses，用已開表單的UUID／成員資料；trip scope與寫入同交易序列化，記錄成功或TRIP_TRASHED；不自行復原。 |
| `點心保存結果為 "{結果}"` | 結果:string，成功／拒絕 | 不支援 | 無 | Then：成功時201且DB恰一JPY500點心與精確shares、淨額oracle一致；拒絕時409 TRIP_TRASHED且無點心／其帳務影響。其他原始紀錄前後一致。以DB及允許的查詢核對；不為驗證另送復原命令。 |
| `垃圾桶中恰有一筆點心且其餘帳務保持` | 無 | 不支援 | 無 | Then：200移入成功，DB trash中保留恰一JPY500點心與shares；精確帳務對照加入點心後oracle、無遺失／重複，所有原ID不變。 |
| `本次新圖片已開始處理但尚未提交` | 無 | 不支援 | 無 | Given：建立有效完整圖片上傳，控制正式decoder完成與commit之間屏障；先取得原兩版本，另一裝置依Given先完成操作；只在When釋放一次待提交命令。回寫上傳ID／前態；不先提交圖片。 |
| `原次圖片處理完成並嘗試保存` | 無 | 不支援 | 無 | When：釋放唯一待提交POST thumbnail，讓正式transaction重新驗owner／狀態／兩版本；記錄回應；不重送或復原。 |
| `新圖片未落地且已生效的旅行狀態保持` | 無 | 不支援 | 無 | Then：依truth狀態／版本優先順序回409 TRIP_TRASHED/TRIP_STATE_CHANGED/TRIP_PURGED；DB無新bytea或成功收據。trash仍保留富士山，purged無任何圖片，其他帳務與先完成快照相同，舊URL權限符合狀態。 |
| `待保存圖片為 "{格式}"、{大小} bytes、{寬} x {高} px` | 格式:string JPEG .jpg／JPEG .jpeg／PNG／WebP；大小/寬/高:int，實際bytes與px | 不支援 | 無 | Given：生成真實完整可解碼單張指定格式檔，實際byte長度以合法padding達指定值且assert header/decoder一致；邊界不是mock metadata。保留原檔hash、尺寸及bytes供POST；回寫fixture路徑。預設無動畫／多頁，非零寬高。 |
| `owner 保存待選圖片為旅行縮圖` | 無 | 不支援 | 無 | When：一次POST thumbnail，multipart恰一image part，用新operation UUID與兩個當前版本；記錄完整回應，成功等待DB提交。不將本地預覽當保存。 |
| `有效圖片保存為唯一目前縮圖` | 無 | 不支援 | 無 | Then：200 save_thumbnail receipt與currentState兩版本一致，thumbnail_revision恰加1、lifecycle/accounting不變；DB恰一WebP與同owner/trip，GET當前binary可讀且與DB bytes相等；舊revision URL404，其他旅行／原帳務完全不變。 |
| `圖片拒絕為 "{原因}" 且保留原縮圖` | 原因:string，超過10MiB／超過25000000像素／超過單邊16384px／不支援格式／動畫／內容損壞／非法尺寸／空檔／多張圖片 | 不支援 | 無 | Then：超檔案／像素／單邊／雙檔413 IMAGE_TOO_LARGE；不支援實際格式（含HEIC偽裝JPEG）或動畫415 UNSUPPORTED_IMAGE_TYPE；文字偽裝PNG與截斷JPEG依解碼失敗422 INVALID_IMAGE；空檔400 VALIDATION_ERROR、非法尺寸422 INVALID_IMAGE；錯誤含可映射原因。DB原圖bytes、versions、所有帳務完全一致，沒有原圖／新圖／成功receipt，GET原revision bytes相同。 |
| `待保存檔案內容為 "{內容}"` | 內容:string，Examples列舉的16種輸入 | 不支援 | 無 | Given：使用對應真實bytes fixture，HEIC偽裝JPEG同時改名與MIME、文字偽裝PNG亦然；截斷檔僅保留開頭、零尺寸檔須保持可到尺寸驗證的結構；其餘動畫／多頁具真實多frame。檔案<=10MiB。回寫檔與hash，不假造decoder輸出。 |
| `本次保存包含兩張各自合法圖片` | 無 | 不支援 | 無 | Given：生成兩張有效靜態JPEG各不超界，以同一multipart兩個檔案part送出；保留兩檔hash及原圖快照，不只用不合法file input測UI。 |
| `待保存照片含方向與位置資訊且內容為 "{內容}"` | 內容:string，直拍照片／複雜照片／小圖 | 不支援 | 無 | Given：方向照片含EXIF orientation/GPS/ICC及可辨識四角，預期方向由fixture獨立定義；複雜照片為符合輸入限制的高熵噪點；小圖1x1。保存原bytes／hash與獨立expected矩陣。不mock sharp。 |
| `保存結果為去除原始資訊的有界縮圖` | 無 | 不支援 | 無 | Then：DB及GET bytes可解碼WebP，1..524288bytes、各邊<=1200、sRGB、無EXIF/GPS/原始metadata；依fixture角落驗方向正確、contain不永久裁切且不放大小圖；DB只有當前縮圖，不存原始bytes/副本／歷史圖片；複雜圖fixture選定能在1200/80、960/75、640/70有界流程內成功的高熵照片，必須成功且符合容量；逾時或輸出超預算拒絕另由傳輸案例驗證。原始帳務與他圖不變。 |
| `旅行使用預設圖且舊自訂圖不可再取得` | 無 | 不支援 | 無 | Then：200 reset_thumbnail結果thumbnailPresent=false，DB無trip_thumbnails，thumbnail_revision恰+1，GET Trip hasThumbnail=false與新版本一致；舊圖片URL404，原帳務及他旅行前後一致。 |
| `owner 讀取 "{路徑}" 的縮圖` | 路徑:string，一般目前／垃圾桶目前／舊版本／已刪舊連結 | 不支援 | 無 | When：一次GET active thumbnail或trash thumbnail，使用目前version；舊版本明確用更換前revision；purged沿用舊URL。記錄binary或JSON錯誤，不修改DB。 |
| `圖片讀取符合 "{結果}" 的私有契約` | 結果:string，可讀／不存在／垃圾桶拒絕 | 不支援 | 無 | Then：可讀時200 image/webp且bytes與DB目前圖相同，Cache-Control=private, no-store、X-Content-Type-Options=nosniff，URL無token；舊版本／purged404 NOT_FOUND無內容；普通trash路徑409 TRIP_TRASHED。DB與receipt前後不變。 |

## 006 旅行管理與等待契約

所有 Given 由隔離 PostgreSQL fixture 建立且確認權威資料已落地；保留穩定 owner/trip/member/record ID、版本與前態快照，不重演目標 Act。所有 When 只有一次命令或查詢；記錄請求、回應、原 operationId 與版本，非同步競爭由 Given 的屏障安排。Then 的再讀屬只讀驗證，不推進業務。精確帳務用獨立 BigInt 有理數 oracle。

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | StepDef 實作語意 |
| --- | --- | --- | --- | --- |
| `縮圖傳輸條件為 "{條件}"` | 條件:string，Examples列舉傳輸違規 | 不支援 | 無 | Given：隔離Alice active旅行含富士山與帳務，準備真multipart。條件含可信Origin/session/owner變體、缺少image/額外文字或part、truncated、body超10551296、deadline60s、decoder10s、instance已有一工作；採可控clock/stream/decoder屏障但正式parser/transaction不mock，記錄DB/receipt前態。 |
| `送出本次縮圖傳輸` | 無 | 不支援 | 無 | When：一次POST thumbnail，必填operationId/兩版本headers正確（除目標header違規）；完整讀stream或觸發受控timeout/abort。記錄HTTP或連線終止與receipt；不另重試。 |
| `縮圖傳輸拒絕為 "{錯誤}" 且沒有提交` | 錯誤:string，Examples代碼 | 不支援 | 無 | Then：依API contract exact code/status：Origin403、未登入401、非owner404、驗證400、IMAGE_TOO_LARGE413、UPLOAD_INCOMPLETE400、UPLOAD_TIMEOUT408、UPLOAD_BUSY503；已斷線可能無response但DB/receipt證明未提交。原圖bytes、帳務、兩版本與快照一致，無部分圖/成功receipt。 |

## 006 旅行管理與等待契約

所有 Given 由隔離 PostgreSQL fixture 建立且確認權威資料已落地；保留穩定 owner/trip/member/record ID、版本與前態快照，不重演目標 Act。所有 When 只有一次命令或查詢；記錄請求、回應、原 operationId 與版本，非同步競爭由 Given 的屏障安排。Then 的再讀屬只讀驗證，不推進業務。精確帳務用獨立 BigInt 有理數 oracle。

| DSL 句型 | Gherkin 參數 | Data Table 參數 | 預設參數 | StepDef 實作語意 |
| --- | --- | --- | --- | --- |
| `一般旅行的不可變歷史與owner成員已存在` | 無 | 不支援 | 無 | Given：隔離DB建立合法005結清/還款/一對差額與固定owner，保存完整快照。沒有purge context，transaction-local owner/trip權限未啟用。 |
| `嘗試一般 "{歷史操作}"` | 歷史操作:string，刪除owner成員／刪除還款／改寫還款／刪除結清／改寫結清／刪除調整／改寫調整 | 不支援 | 無 | When：在一般交易直接執行一次目標DB UPDATE或DELETE以驗既有trigger；每例只一種動作，不另呼叫API受測命令（API保護沿用既有成員feature），capture SQL error/rowcount，不建立purge授權。 |
| `一般歷史保護仍拒絕且資料完全不變` | 無 | 不支援 | 無 | Then：DB trigger拒絕、transaction回滾，owner/repayment/settlement/adjustment全部原值與ID不變；普通GET再讀一致，purge例外沒有全域鬆綁。 |
