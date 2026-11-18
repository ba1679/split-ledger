# Phase 0 研究：旅行垃圾桶、自訂縮圖與全站等待回饋

**研究日期**: 2026-11-13  
**Plan Package**: `specs/plans/006-trip-management-and-loading`  
**狀態**: 技術方向已選定，尚未安裝專案依賴、修改產品程式或執行產品驗收。

## 研究邊界與依據

本輪承接 `spec.md` 及使用者 `1B、2A、3A`：旅行先進垃圾桶，可復原並另行永久刪除；上傳自己的圖片；全站載入與操作等待一致化。使用者另外明確委託研究圖片格式、大小與儲存方式。本文數值是本輪工程選型，不宣稱為平台硬限制或使用者先前指定的數字。

既有 techstack 已明定 webapp＋HTTP API，以及兩端獨立的 Gherkin E2E runner 與測試策略，本輪無改判，依 skill 的「既有 truth 已寫明」規則不重問。根憲法及 shared 規則適用；`skills/technical-research/research.md` 與 `techstack.md` 特定憲法檔不存在，沒有推定額外規則。

主要本地證據：

| 邊界           | 讀取位置與發現                                                                                                                                                                    |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API 與上傳整合 | `apps/api/src/app.ts`：既有 POST／PATCH 強制 JSON；Origin 檢查及一般錯誤處理集中於此，目前沒有 multipart plugin；新增上傳不能只加一條路由。                                       |
| 旅行查詢       | `apps/api/src/modules/trips/index.ts`：清單、詳情、PATCH 各自查詢，清單採 createdAt/id 游標；尚無垃圾桶狀態及縮圖投影。                                                           |
| 同旅行寫入     | `apps/api/src/modules/splitting/trip-scope.ts` 的 `requireOwnedTrip(..., true)` 已提供 owner scoped `FOR UPDATE`；部分讀取路由仍直接查 trips，須逐條補 scope，不能只改 helper。   |
| 歷史保護       | `apps/api/drizzle/0003_trip_splitting.sql`：`app_protect_owner` 及 `app_immutable_payment` 阻擋 owner、還款、結清與調整刪除；相關 FK 為 RESTRICT，單純 CASCADE 不足以實現 purge。 |
| 共用分類       | `apps/api/src/modules/categories/index.ts`：usageCount 計入引用分類的全部支出；垃圾桶仍保留支出，引用保護應延續。                                                                 |
| UI 狀態與請求  | `QueryState.tsx` 僅文字 pending；`FormDialog.tsx` 已用原生 dialog 並恢復開啟者焦點；`apiRequest` 預期 JSON 成功回應，圖片二進位不應交給此 helper 解析。                           |
| 部署與工具     | `.railway/railway.ts`：單一 app replica、既有 PostgreSQL；`pnpm-workspace.yaml` 有 allowBuilds；`.node-version` 及本機忽略目錄內工具鏈為 Node 24.22.2。                           |

## 決策 1：延續既有架構與分端 BDD E2E

- **Decision**: 延續 React＋Vite＋TanStack Query、Fastify、Drizzle/node-postgres 及 PostgreSQL 18；前端 Gherkin 使用 Playwright Test＋playwright-bdd 跑瀏覽器→真 API→測試 PostgreSQL；後端 Gherkin 使用獨立 Playwright Test＋playwright-bdd＋APIRequestContext 驗 API 與權威資料。既有 Vitest 純規則測試仍保留，不取代兩端 E2E。
- **Rationale**: 已有 truth 及 `apps/{web,api}/playwright.config.ts` 明確指定 runner，006 的生命週期、圖片與等待都能在原架構落地。沒有新增服務端、行動原生端或第三方媒體平台的必要。
- **Alternatives considered**:
  - 只補元件／單元測試：無法證明圖片權限、垃圾桶寫入阻擋與真實交易回滾。
  - 新增獨立媒體服務或全站改用 Suspense：擴大部署與錯誤狀態遷移，無助於本輪必要驗收。

## 決策 2：接受靜態 JPEG、PNG、WebP，輸入上限 10 MiB／25 MP

- **Decision**: 第一版採以下完整輸入政策；前端顯示限制並預檢，後端以實際位元組、檔案結構與成功解碼作權威判斷。

  | 項目       | 採用值                                                                                    |
  | ---------- | ----------------------------------------------------------------------------------------- |
  | 張數       | 每次一張、每趟最多一張目前縮圖                                                            |
  | 格式       | 靜態 JPEG（`.jpg`／`.jpeg`）、PNG、WebP                                                   |
  | 單檔大小   | `1..10,485,760` bytes，含上限；UI 標示「最大 10 MiB（約 10.5 MB）」                       |
  | 解碼尺寸   | 寬高皆為正整數、每邊不超過 `16,384` px，且寬×高不超過 `25,000,000` px；不另設畫質最低尺寸 |
  | 動態／多頁 | 拒絕 APNG、animated WebP 與其他多幀／多頁圖片；不默默取首幀                               |
  | 不接受     | HEIC／HEIF、AVIF、GIF、SVG、TIFF、PDF；顯示可接受格式及轉成 JPEG／PNG／WebP 的下一步      |

- **Rationale**: 10 MiB 容許常見壓縮旅行照片；25 MP 可涵蓋約 12／24 MP 圖片，但不承諾接受未縮小的 48 MP 手機原照。每邊與像素限制共同排除過長圖與過大解碼工作。這是縮圖用途與現有單一服務的保守工程預設，非已量測的最大容量。sharp 可設定輸入像素上限，`metadata()` 可讀取格式及頁數；仍須執行完整轉碼才能確認像素可解碼。APNG 另檢查 PNG `acTL` chunk、WebP 檢查動畫結構，不能假設所有動畫都能由 `pages` 一欄辨識。[sharp constructor](https://sharp.pixelplumbing.com/api-constructor/)、[metadata](https://sharp.pixelplumbing.com/api-input/)。
  - 採預編譯 sharp，避免為 HEIC 額外自建 libvips/HEVC codec。官方文件列出的預編譯格式不包含 HEIC，HEVC 支援需自建相關依賴。iOS 選圖若實際交付 JPEG，按 JPEG 驗證；不依賴瀏覽器一定自動轉檔。[安裝支援](https://sharp.pixelplumbing.com/install/)、[HEIF／HEIC 條件](https://sharp.pixelplumbing.com/api-output/#heif)。
- **Alternatives considered**:
  - 5 MiB／12 MP：更省資源，但容易拒絕手機正常尺寸照片。
  - 20 MiB／50 MP 並加入 HEIC／AVIF：較接近原照全收，但增加解碼資源及部署相容負擔，本輪沒有原圖保存需求。

## 決策 3：sharp 正規化，僅保留有界 WebP 縮圖

- **Decision**: 新增後端 `sharp@0.35.5`。先按實際內容辨識格式白名單及動畫結構，再以 `failOn: 'warning'`、`limitInputPixels: 25_000_000` 解碼，依 EXIF 自動校正方向、轉 sRGB、移除 EXIF／GPS 等原始 metadata，保留透明度，按原比例縮小、不放大、不破壞性裁切，輸出單張 WebP。原始檔只在本次請求的有界記憶體內使用，不寫入永久儲存。
  - 最大輸出邊長從 `1200` px、quality `80` 開始；如超過 `512 KiB = 524,288 bytes`，依序嘗試最大邊 `960`／quality `75`、`640`／quality `70`，採第一個符合預算的結果。仍不合規則回報圖片處理失敗並保留原縮圖，不無限重試或宣稱固定 quality 能保證檔案大小。
  - 每個 app instance 同時只接納 1 個上傳／轉碼工作，採非排隊 admission slot，超量回可重試結果；所有結束路徑釋放 slot。各次 sharp 轉碼設 10 秒處理 timeout；另有整個請求的時間與斷線清理，不能用 Promise.race 假裝已取消 native 工作。
- **Rationale**: 方向修正後再縮圖可避免手機照片倒轉；不保留原圖簡化資料清理與備份。sharp 預設不保留 metadata，resize 可限制放大；官方 timeout 不計等待工作執行緒的時間，因此仍需要 admission 與請求邊界。[resize](https://sharp.pixelplumbing.com/api-resize/)、[metadata 輸出與 timeout](https://sharp.pixelplumbing.com/api-output/)。
  - 本地噪點圖實驗顯示 1200／quality80 產物為 620,562 bytes，超過 512 KiB；960／quality75 為 315,432 bytes，佐證有界降級的必要。此為合成圖，不能當真實相片品質量測。
  - 25 MP 的 RGBA 單一像素平面約 100 MB（十進位）；實際還有解碼器、暫存與 runtime 記憶體，不能把此估算當服務所需 RAM。部署前須量測尖峰 RSS、CPU 及連續上傳。
- **Alternatives considered**:
  - 只靠瀏覽器壓縮：無法成為權威驗證，且不同瀏覽器轉碼／方向支援可能不同。
  - 保存原圖與多種縮圖：增加容量與清理複雜度，本輪旅行卡片沒有必要。

## 決策 4：縮圖存 PostgreSQL bytea，使用獨立一對一資料邊界

- **Decision**: 只將最終 WebP 與格式、長度、尺寸、版本中繼資料存到獨立的旅行縮圖關聯（一趟 0 或 1 筆，owner＋trip scope），二進位欄位採 PostgreSQL `bytea`，DB 驗證 `octet_length <= 524288`；Drizzle 若無內建映射，使用 `customType` 映射 node-postgres `Buffer`。清單只選縮圖版本／存在資訊，不 SELECT bytes，也不把 base64 塞進旅行 JSON。
  - 更換以同交易原子取代舊 bytes；恢復預設在使用者明確保存後刪除該筆；移至垃圾桶保留；永久刪除在整趟交易內一併移除。全部使用既有 PostgreSQL 備份／還原邊界，無需媒體 bucket、額外 app volume 或清理佇列。
  - 2026-11-13 使用者確認縮圖編輯採統一草稿：重新選圖與「使用預設圖」都只改本地預覽，不上傳、不刪除既存圖片，也不建立持久操作收據；預設圖預覽標「尚未保存」。只有按「保存圖片」才依最後選定意圖提交既有 POST（照片）或 DELETE（預設圖）。提交前取消／X／Escape 放棄草稿，取消檔案選擇保留當前預覽；提交後關閉不等於撤回命令。
  - 明確保存失敗保留原持久縮圖與待保存草稿，結果未知保留原次 operationId／意圖並先查證，不能把本地預覽當成遠端成功。無需增加 API、資料表或 server-side draft；現有版本、收據與 DELETE 的原子刪圖語意不變。讀取時的圖片 fallback 也不等於使用者選擇預設圖，不得藉此提交刪圖。
  - 新增旅行可選填縮圖；使用者於 2026-11-13 選擇「保留已建立的旅行，圖片保存失敗時用預設圖並提供重新上傳」。沿用既有兩階段能力：先以原 JSON 建立旅行並取得確認的 tripId／版本，未選圖即結束；有圖才提交現有 thumbnail POST。旅行建立明確失敗不送圖片；建立結果未知先沿既有建立查證流程確認同一 ID，不能為圖片重試產生另一趟旅行。
  - 圖片明確失敗時保留已建立旅行及預設圖，顯示「旅行已建立，但圖片未保存」並導向同一 trip 的重新上傳；本次 File／選圖草稿保留供重試，離開或登出依既有草稿清理邊界。圖片結果未知則保留原次 operationId 並查收據／狀態，不先宣稱上傳失敗，也不重建旅行。遇到另一裝置較新圖片／旅行狀態則依既有版本衝突規則刷新，不盲目清回預設圖。
  - 此決策不把旅行建立與媒體保存包成一筆新交易，不擴張 CreateTripRequest 為 multipart，也不新增資料表／API；API 與 data truth 為 NOOP，前端負責分階段結果與重試入口。選圖格式／大小／像素限制共用 FR-011，無效選圖提示改選或移除，不能靜默降級為無圖建立。
- **Rationale**: PostgreSQL 支援 bytea，較大變長值可由 TOAST 處理；資料庫存在這項能力不等於任意圖片規模都適合放 DB。[binary types](https://www.postgresql.org/docs/18/datatype-binary.html)、[TOAST](https://www.postgresql.org/docs/18/storage-toast.html)。本案每趟最多 512 KiB、沒有原照保存、目前採試用部署，交易一致性優先。1,000 趟各滿額圖片的純 payload 上限為 500 MiB，未含索引、TOAST、WAL、死列及備份副本；正式容量／費用仍需量測。
- **Alternatives considered**:
  - 私有 S3 相容物件儲存：較適合大量圖片，但需另選供應商、權限、費用及 DB／object 清理補償；本輪不新增外部帳號或服務。
  - app 本機檔案／volume：與 DB 的提交、刪除及備份無法自然原子化，另須解決重新部署與多 replica 存取。
  - 將 bytes 直接加到 trips：雖可用，獨立關聯更容易避免清單意外讀取大型欄位。

## 決策 5：受限 multipart 上傳，沿用同 origin session

- **Decision**: 新增 `@fastify/multipart@10.1.8`，只在指定圖片上傳邊界接收 `multipart/form-data`；只接受 1 個名為 `image` 的 file part，`files=1`、`fields=0`、`parts=1`、`fileSize=10_485_760`，限制 header 數／欄名長度及總請求 bytes（檔案上限＋64 KiB framing 預算），完整迭代檢查所有 parts 與 truncated／abort，拒絕額外檔案與欄位；驗證失敗不寫 DB。請求 upload deadline 初值 60 秒；它是工程設定，非操作必須在 60 秒內成功的產品承諾。
  - 保留現有 Origin 檢查、session 與 owner 驗證；必須在讀取大型 body 前完成認證及 admission，處理失敗要消耗／終止剩餘 stream 並釋放資源。調整 `app.ts` 的 JSON gate，僅允許精確上傳路由例外，不放寬所有 POST／PATCH。
  - 瀏覽器使用 `FormData`＋fetch，讓瀏覽器產生 boundary，不手設 multipart Content-Type；單獨的上傳 helper 共用錯誤及 401 處理，JSON helper 維持原用途。依後續 UI 回覆，上傳時 spinner 不搭配可見 loading 文字，以無障礙名稱傳達操作，不展示捏造的百分比。
  - API owner 後續定稿大小超限、格式不支援、損壞／尺寸不符、繁忙與狀態衝突的 error code；HTTP 候選為 413、415、400、503、409。現有 error handler 將 415 轉成一般 400、未專門處理 413，需同步修改並明確寫入契約。
- **Rationale**: Fastify multipart 需要獨立的檔案與 parts 限制，不能假設 route bodyLimit 會限制整個 multipart；完整迭代防止只讀首檔而忽略額外 part。[官方 multipart 說明](https://github.com/fastify/fastify-multipart)。FormData 的 boundary 由瀏覽器管理。[FormData](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest_API/Using_FormData_Objects)。
- **Alternatives considered**:
  - JSON base64：保留 JSON gate 較容易，但放大傳輸／記憶體並混淆檔案與 JSON 上限。
  - 預簽 URL 直傳 bucket：適合物件儲存方案，與本輪 bytea 選型不符。

## 決策 6：圖片透過受權限保護的 API 讀取，不提供公開資產 URL

- **Decision**: 同 origin 圖片端點每次驗證 session、owner、旅行狀態及目前縮圖版本，回 `image/webp`、`X-Content-Type-Options: nosniff` 與 `Cache-Control: private, no-store`，包括失敗回應。URL 帶不可重用的縮圖版本以觸發更換後重新顯示，但版本不能作授權憑證；舊版本不得繼續提供舊 bytes。垃圾桶只能經專用 scope 提供辨識用資訊／縮圖，普通帳本與圖片路徑拒絕垃圾桶狀態。
  - 預覽以本地 object URL，離開／取消／換圖後 revoke；不在 localStorage 或 Service Worker 保留圖片。登出／換帳號清除圖片 UI、object URL 與 account-scoped Query 快取。API 回覆及路由形狀由 `/api-plan` 定稿。
- **Rationale**: 既有 cookie session 可供同 origin 圖片請求使用，避免建立另一套媒體 token。`no-store` 限制快取儲存，但不能收回已交付的圖片或清除歷史備份，不作遠端抹除承諾。[HTTP caching RFC 9111](https://www.rfc-editor.org/rfc/rfc9111.html#section-5.2.2.5)。此處使用規範作技術依據，不代表圖片公開發布。
- **Alternatives considered**:
  - 公開 CDN／長效簽名 URL：讀取便宜，但存取撤銷及帳號隔離需額外處理。
  - private max-age／ETag 快取：可減少流量，但會增加刪除後保留快取的驗收邊界；小規模先選 no-store。

## 決策 7：垃圾桶作旅行狀態；沿用旅行列鎖序列化全部寫入

- **Decision**: 新增 nullable 刪除時間及單調遞增的生命週期版本；一般列表、詳情、子資源讀寫與旅行選單只接受 active，垃圾桶另用 owner scoped 查詢。移入／復原／永久刪除及縮圖提交與現有帳務 writer 一樣先鎖旅行列 `FOR UPDATE` 再檢查最新狀態；圖片解碼放在 DB 交易外，提交前重新鎖列及查狀態／版本，避免持鎖等待上傳或 native 轉碼。
  - 普通讀取延續適用的同快照讀取策略；旅行 scope 檢查與子資料讀取必須處於同交易／一致 snapshot，不能只先查 active 再用另一個 snapshot 讀子資料。已開始且先於移入的讀取可依原 snapshot 完成，不承諾取消已在網路上的回應。
  - `/system-analysis` 必須盤點 trips、expenses、members、repayments、settlement 所有直接查詢、修改入口及查證路徑；單改 `requireOwnedTrip` 不足。新增垃圾桶 SPA route 同時更新前端 router 與 `app.ts` 允許 fallback 的路徑白名單，驗證重整／直接進入。
  - 垃圾桶支出仍引用共用分類，category usageCount 與刪除限制維持全部實際引用；不因旅行隱藏而允許破壞復原所需分類。
- **Rationale**: 沿用目前旅行列為同旅行寫入鎖點，能在跨裝置寫入／移入競爭時決定完整先後順序；PostgreSQL row lock 的互斥效果需搭配所有 writer 遵守同一規約。[PostgreSQL row locking](https://www.postgresql.org/docs/18/explicit-locking.html)。不靠前端按鈕禁用維持資料正確性。
- **Alternatives considered**:
  - 把資料搬到另一組 archive 表：復原需重建關聯，放大帳務風險。
  - 只在旅行清單過濾或只用前端隱藏：舊表單及子資源 API 仍能操作垃圾桶旅行。

## 決策 8：永久刪除是受控整趟交易，精確例外保留歷史保護

- **Decision**: 使用新 migration 調整 immutable triggers，新增只供整趟 purge 使用的資料庫 routine（預設 SECURITY INVOKER）。先 owner scope 鎖定垃圾桶旅行、建立 transaction-local 的 owner＋trip purge context；trigger 只有在 `DELETE`、該筆所屬 owner＋trip 完全吻合 context，且同交易中的旅行仍為垃圾桶時允許通過。其他刪除、所有歷史 UPDATE 與 active owner 變更繼續拒絕，不關閉 trigger、不設定 session_replication_role、不整體鬆綁 FK。
  - routine 依關聯順序刪除 `settlement_adjustments → repayments → settlements → expense_shares → expenses → trip_members → thumbnail → trips`，保留共用 categories、currencies 與 auth。最後寫入最小 purge receipt，交易提交後才回報成功；中途任一步失敗全部回滾。順序由 `/data-plan` 對全部 FK／deferred checks 再校驗。
  - purge context 只由這個後端使用的 routine 建立，完成後還原；這是應用 DB 操作邊界，不能宣稱自訂 GUC 能隔離擁有任意 SQL 權限的惡意 DB 使用者。需要獨立 DB 角色強隔離時另行設計權限，不在本輪偽造此保證。
  - `app_check_trip_owner` 及份額／結清 deferred checks 在母資料已刪除時已有跳過條件，仍需 migration E2E 證明整趟 purge 可提交、單筆歷史刪除仍被擋。bytea 與旅行同交易刪除，沒有等待外部圖片清理的中間成功狀態。
- **Rationale**: 現有保護 trigger 必須有精確例外才能達成使用者選擇的永久刪除；一般記帳的 immutable 保護維持。刪除後 DB 死列、WAL 與既有備份可能仍含歷史 bytes，完成定義為 live application 的資料及存取移除，不宣稱磁碟安全覆寫或追溯清除既有備份；還原舊備份需另按營運程序處理，不能當正常產品復原功能。
- **Alternatives considered**:
  - 只把 FK 改 CASCADE：仍被 immutable trigger 阻擋。
  - 全部取消歷史不可變規則：會削弱現有單筆帳務保護。
  - 外部圖片非同步清理：需另有 pending deletion、補償與失敗重試，bytea 已避免此必要。

## 決策 9：以版本與最小操作收據處理回應遺失，避免過期重送

- **Decision**: 新生命週期與縮圖命令使用 client operation UUID＋預期版本，與結果同交易保存 owner-scoped 最小操作收據；同 UUID／同內容重送回原結果，不重新執行。同 UUID／不同內容拒絕，過期的新命令回狀態衝突。帳務 revision 的既有用途不變，另外保存生命週期／縮圖版本，不能因換圖改變分攤結果。
  - 收據只保留查證與去重所需的 ID、命令種類、請求摘要及結果版本，不含名稱、原照、縮圖 bytes 或帳務內容，不提供使用者操作歷程。purge 收據與被清除資料沒有會阻擋 purge 的 trip FK；保留已清除 trip ID 的最小 tombstone，`POST /trips` 亦檢查 ID 不得重用，避免舊建立重試復活旅行。初版不自動到期刪除此 tombstone，未將其視為可復原的旅行資料。
  - 查證先讀操作結果，再讀目前狀態；若原命令已成功後又有較新命令，以目前狀態顯示並指出原結果已確認，不能把較新狀態蓋回舊回應。僅見一般清單缺少旅行不足以證明 purge 成功；純 404 不可宣稱特定 purge 已完成。未知結果提供查證出口，不能直接重送相反狀態命令。
- **Rationale**: 「已移入→復原→舊移入重試」會把使用者復原結果再次覆蓋；單純把 delete／restore 設成無條件更新並不具備所需去重。持久收據也能在重新部署後查證，與 spec FR-007、FR-017 及不復活已刪旅行的驗收一致。這是技術去重資料，非新增使用者操作追蹤功能。
- **Alternatives considered**:
  - 只靠 disabled 按鈕或記憶體 request map：不能涵蓋跨裝置、重新部署及遺失回應。
  - 每次 timeout 都重新送出：無法分辨沒提交或已成功，可能覆蓋較新意圖。

## 決策 10：共用等待元件，業務結果與視覺狀態分開

- **Decision**: 延伸現有 Button、QueryState、FormDialog 與 lucide-react，新增共用 skeleton／局部 status／按鈕 busy 呈現；不加動畫套件或全站全螢幕遮罩。依用途採用本地 shadcn/ui 風格的簡單骨架，品牌值在既有設計系統集中；客製 dialog 延續原生 `<dialog>`，補 description、取消優先焦點及 opener 消失後的合理焦點位置。
  - 初次資料未就緒時顯示對應結構 skeleton；有資料且 isFetching 時保留內容並局部標示更新；isFetchingNextPage 僅標示載入更多區；依使用者後續回覆，mutation pending／查證 busy 只顯示 spinner、不附可見 loading 文字，按鈕維持原尺寸。`fetchStatus=paused` 顯示等待連線與下一步，不能僅因 isPending 持續轉圈。業務結果 `unknown` 不可只由 mutation.error 推導為失敗。
  - Spinner 的操作名稱及狀態以 accessible name／visually-hidden status 提供；裝飾 skeleton／spinner 圖形隱藏於輔助工具。對應區域用 aria-busy，完成／錯誤採適度 live announcement，CSS 採 prefers-reduced-motion。錯誤、結果未確認及下一步保留可見文字；保留已載入資料及表單草稿，主動取消查詢不等於後端寫入已撤銷。
  - Query keys 保持 account scope；移入／purge 後先取消相關 in-flight 查詢再清除該 trip 子資源快取，更新一般／垃圾桶清單及共享分類使用數；復原重新讀取，不用舊快取拼回帳本。新縮圖版本使新圖片重新讀取。用有限請求 timeout 及顯式查證出口處理等待，不無限 spinner／自動 mutation retry。
- **Rationale**: TanStack Query 的資料狀態與 fetchStatus 是不同維度，能區分已有資料背景更新與連線暫停；不能用同一個 isPending 或全局 loading boolean 判斷所有情境。[Queries](https://tanstack.com/query/latest/docs/framework/react/guides/queries)、[Network Mode](https://tanstack.com/query/latest/docs/framework/react/guides/network-mode)。既有商業查證流程留在 feature 層，呈現元件只接收已判定狀態。
- **Alternatives considered**:
  - 僅替換 QueryState 的文字：漏掉表單、分頁、圖片、付款與查證狀態。
  - 增加固定等待時間或假的進度百分比：掩蓋完成時機，沒有證明真實進度。

## 已執行的有限技術實驗

在專案外暫存目錄安裝固定版本 `sharp 0.35.5`、`@fastify/multipart 10.1.8`、`Fastify 5.12.8`；使用專案現有 Node **24.22.2**（預設 shell 是 Node22，因此明確選用本機工具鏈），於 macOS arm64 執行合成圖與 `Fastify.inject` 實驗。沒有修改 package manifest 或 lockfile。

| 檢查                   | 實測結果與限制                                                                                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| JPEG／PNG／WebP → WebP | 三種 1600×1000、EXIF orientation6 合成圖均轉為方向正確的 750×1200 輸出，各 1,682 bytes；讀回不含 EXIF。                                               |
| 像素上限與損壞輸入     | 5001×5000（25,005,000 px）的 PNG 被 25 MP 上限拒絕；非圖片 bytes 被拒絕。未實測所有壓縮炸彈或截斷種類。                                               |
| 複雜圖片輸出預算       | 隨機噪點 1600×1200：1200／80 為 620,562 bytes；960／75 為 315,432 bytes；640／70 為 105,482 bytes。只證明固定 quality 不保證大小，不證明照片觀感。    |
| Multipart 單檔邊界     | 完整單檔 10,485,760 bytes 回 200；10,485,761 bytes 回 413；兩個 file parts 回 413。此為獨立 parser，不含產品 auth、全請求總長限制與 abort／deadline。 |

這些實驗不等於 006 產品 E2E、Linux 部署相容驗證、真機選圖或效能測試；尚未執行新 migration、DB purge routine 或圖片權限端點。

## 後續驗證與交接

1. **部署 spike**：在目標 Linux/Railpack 環境以 frozen lockfile 安裝 sharp／optional binary，檢查 Node24、pnpm allowBuilds／supportedArchitectures 行為；僅在套件必要時加最小 build allowlist，不一律放行所有腳本。量測 25 MP、10 MiB 上傳及連續轉碼的 RSS／CPU／時間；若超出實際服務容量，先調整 admission 或影像工作限制並同步規格，不直接宣布支援已通過。
2. **後端 E2E**：旅行及每個子資源的垃圾桶拒絕、外帳號／未登入、PNG/WebP 動畫、偽造 MIME／副檔名、損壞與截斷、多檔、多欄位、零檔、10 MiB／25 MP／單邊邊界、abort、timeout、繁忙；單筆歷史 DELETE／UPDATE 拒絕、整趟 purge 成功／故障原子回滾、跨交易鎖競爭、收據去重與已刪 ID 重用拒絕。
3. **前端 E2E 與品質**：真 API 選圖保存／預覽取消／fallback／更換／恢復預設／跨裝置，旅行確認取消／移入／復原／purge，spec 全站覆蓋表逐項驗等待與錯誤／未知結果。Chromium＋WebKit、手機 viewport、鍵盤、減少動態效果及手動 iOS／Android 選圖；人工核對縮圖觀感與輔助工具，不以合成圖或 viewport 取代真機。
4. **備份驗證**：含 bytea、垃圾桶及最小去重資料的 pg_dump／pg_restore 隔離還原；確認圖片可讀、metadata 與 checksum 一致，將原有「9 張表」歷史部署驗證當成歷史，不當新 schema 的驗證結果。
5. **Owner handoff**：`/system-analysis` 產 plan，委派 `/api-plan` 定稿 lifecycle／receipt 查證／multipart／binary 契約與錯誤；`/data-plan` 定稿新增欄位、版本、bytea 限制、operation receipt／tombstone、purge routine／trigger 與索引；`/ui-plan` 做垃圾桶、圖片與全站等待設計；`/dsl-refine` 承接分端 feature／DSL。本文路由及表名是研究候選，並非已寫入 API／data truth。

本輪沒有新的使用者決策阻塞；圖片格式／大小缺口已按使用者授權研究收斂並回寫 spec。尚未驗證項目作為後續技術與交付 gate，不能誤報為產品驗收通過。
