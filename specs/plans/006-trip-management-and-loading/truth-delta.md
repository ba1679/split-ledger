# Truth Delta: 006-trip-management-and-loading

**Plan Package**: `specs/plans/006-trip-management-and-loading`
**Truth Root**: `specs/truth`

本檔由 `/specify` 初始化；`/technical-research`、`/data-plan` 與 `/api-plan` 已依使用者 `1B／2A／3A` 及本輪圖片研究授權記錄各自的 truth 變更；`/dsl-refine` 已於 2026-11-14 承接已確認 design-v7 與 UI handoff，完成本輪 interface feature／DSL 細化及獨立規格審查，變更記錄見對應 owner 表。這些是權威規劃契約，並不代表 006 產品 migration、API 或介面 feature 已實作或通過 E2E。UI 為 plan-side 交付，不寫入 truth delta。

## /technical-research

| 動作 | Truth 規格 | 改動摘要 | 原因 |
| --- | --- | --- | --- |
| MODIFY | `specs/truth/techstack.md` -> 文件現況日期與 Phase 1B 分帳技術狀態 | 日期更新為 2026-11-13；把「已選定、尚未實作」修正為既有程式已落地，並區分 006 新方向仍未實作；未宣稱新部署或 E2E 驗收。 | 已讀現有分帳模組、migration 與兩端測試設定，避免 techstack 對已存在的程式仍標成未實作。 |
| ADD | `specs/truth/techstack.md` -> 旅行生命週期、圖片與等待回饋／旅行垃圾桶、生命週期寫入 | 新增 nullable 刪除時間／版本、active／trash owner scope、旅行列鎖序與提交前重驗；不自動到期清除。 | 使用者 `1B` 決定先移至垃圾桶且可復原；跨裝置帳務寫入需與旅行狀態一致。 |
| ADD | `specs/truth/techstack.md` -> 旅行生命週期、圖片與等待回饋／整趟永久刪除 | 新增單交易 purge routine、owner/trip context、精確 trigger DELETE 例外與失敗回滾方向，保留一般歷史不可變保護。 | 使用者 `1B` 要有另行永久刪除；既有 FK RESTRICT 與 immutable triggers 阻擋直接刪除。 |
| ADD | `specs/truth/techstack.md` -> 旅行生命週期、圖片與等待回饋／結果查證與去重 | 新增持久 operation UUID、預期版本、最小操作收據與已刪旅行 ID tombstone；不存被刪旅行內容。 | 回應遺失及過期重送不得再次移入、覆蓋復原或讓舊建立重試復活旅行。 |
| ADD | `specs/truth/techstack.md` -> 旅行生命週期、圖片與等待回饋／圖片上傳 | 選定 `@fastify/multipart 10.1.8` 與單一 image part、完整 parts／truncated／abort、總量與時間限制；沿用 Origin/session/owner。 | 使用者 `2A` 要上傳自己的圖片；現有 JSON gate 不解析檔案，multipart 的 bodyLimit 不代表整請求上限。 |
| ADD | `specs/truth/techstack.md` -> 旅行生命週期、圖片與等待回饋／圖片輸入政策 | 接受靜態 JPEG／PNG／WebP，最多 10,485,760 bytes、25,000,000 px、每邊 16,384 px；拒絕動畫及列明的不支援格式，實際解碼驗證。 | 使用者本輪明確授權研究格式與限制；需有可驗收的輸入與資源邊界，且預編譯 sharp 無法直接承諾 HEIC。 |
| ADD | `specs/truth/techstack.md` -> 旅行生命週期、圖片與等待回饋／圖片處理 | 選定 `sharp 0.35.5` 預編譯 binary、方向校正、sRGB、metadata 移除、有界 WebP 轉碼及每 instance 單工作／有限 timeout。 | 避免保存原圖與位置資訊，縮圖最多 512 KiB；本地噪點圖實驗證明單一固定品質可能超限。 |
| ADD | `specs/truth/techstack.md` -> 旅行生命週期、圖片與等待回饋／圖片保存 | 新增獨立一對一 PostgreSQL bytea 與 Drizzle Buffer 映射，僅存目前縮圖，DB 限 524,288 bytes，同交易更換／清除／purge。 | 與既有 PostgreSQL 帳務共用交易及備份邊界，復原保留圖片，永久刪除不需外部補償清理。 |
| ADD | `specs/truth/techstack.md` -> 旅行生命週期、圖片與等待回饋／私有圖片讀取 | 選定同 origin session 驗證的 binary API、owner/旅行狀態檢查、版本、private no-store 與 nosniff。 | 縮圖屬 owner 私有旅行資料，垃圾桶／永久刪除需符合存取生命週期。 |
| ADD | `specs/truth/techstack.md` -> 旅行生命週期、圖片與等待回饋／等待與確認 UI、快取與恢復 | 延伸既有共用元件及 TanStack Query，區分初次載入、背景更新、分頁、mutation、結果查證、unknown 與 paused；移入/purge 清除舊旅行快取。 | 使用者 `3A` 指定全站資料與操作等待，不能只改單一頁的文字；舊快取不得讓垃圾桶旅行看似可操作。 |
| ADD | `specs/truth/techstack.md` -> 測試與驗證／旅行、圖片與等待驗證 | 新增沿用兩端 BDD E2E 的 006 覆蓋：真 PostgreSQL 故障／競爭、圖片格式／權限、全站等待、Linux binary／RSS、含 bytea 備份還原；標為待執行。 | 把新技術選型的驗證與尚未取得的產品證據清楚區分。 |
| ADD | `specs/truth/techstack.md` -> 本次開發不引入的技術／006 圖片、等待與垃圾桶排除項 | 明確排除外部媒體服務、S3/CDN、本機永久圖片、原圖保存、HEIC codec、動畫套件、假進度及自動清除排程。 | 固定本輪採 PostgreSQL 有界縮圖、既有元件及手動垃圾桶的交付邊界。 |
| NOOP | `specs/truth/techstack.md` -> 專案與執行環境、前端、後端、資料與幣別處理的既有採用技術 | 已檢查 React/Vite/TanStack Query、Fastify/Better Auth、PostgreSQL/Drizzle、金額及幣別技術；本輪延伸其上，未換堆疊或改帳務精度。 | 新圖片與垃圾桶功能可沿用既有前後端與權威資料庫。 |
| NOOP | `specs/truth/techstack.md` -> 測試與驗證／前端 BDD techstack、後端 BDD techstack及原有 E2E 策略 | 已檢查兩端 runner、配置與用途；006 增加案例與環境驗證，不更換 Gherkin runner 或把 E2E 降為單元測試。 | 既有 techstack 已明定各端與 E2E 策略，本輪無改判。 |
| NOOP | `specs/truth/techstack.md` -> 試用部署／2026-11-09 歷史部署與還原證據 | 保留原有 Railway 單服務、PostgreSQL 及當時 9 張表還原描述；新 bytea 與 purge 另列待驗證。 | 既有試用驗證不能被誤寫成已覆蓋本輪新資料及套件。 |

## /api-plan

| 動作 | Truth 規格 | 改動摘要 | 原因 |
| --- | --- | --- | --- |
| MODIFY | `specs/truth/contracts/components/schemas/shared.yaml` -> `ApiError.code.enum`（T268 runtime 回交） | 補入既已由本 plan 的 trip-management group 定義的 13 個旅行生命週期、收據與圖片錯誤碼；僅同步共享枚舉，不新增錯誤行為或改動 response shape。 | T268 首次 runtime 發現共用 schema 未同步既定 006 code；group description、backend/frontend DSL 與產品語意已一致，屬低風險契約同步，沿用原需求批准，無新產品決策。 |
| NOOP | `specs/truth/contracts/groups/trip-management.yaml` -> 圖片版本衝突 `409 ApiError` 與 `GET /api/trips/{tripId}/state` | 保留 409 的 code/message 錯誤形狀；不加入 currentState，前端另 GET state 取得最新權威狀態。 | T149 測試曾額外期待 409.currentState，與既有契約不符；修正測試 oracle，不以擴張 API response 遷就測試。 |
| MODIFY | `specs/truth/contracts/openapi.yaml` -> `info.title/version/description` | 契約標題由 Phase 1B 改為整體旅帳 API、規劃文件版本升至 0.3.0；修正「整體尚未實作」為既有帳務程式已存在、006 新契約待實作。 | 006 擴充同一權威契約；契約版本不是產品發布或驗收宣告。 |
| MODIFY | `specs/truth/contracts/openapi.yaml` -> 寫入 Origin／Content-Type 與未確認結果規則 | 精確 Origin 檢查沿用，新增唯一 multipart POST 例外；旅行建立改用專用 state 查證，生命週期與圖片命令以持久收據去重、查原結果與目前狀態；單筆刪除未知結果先查 trip state，purged/trash 的普通子資源 404 不得誤判成功。 | 使用者 `1B／2A` 要可復原、永久清除與上傳；舊 `verifiedDelete` 對任何 404 推斷刪除完成，必須有可區分查證契約。 |
| ADD | `specs/truth/contracts/groups/trip-management.yaml` -> `GET /api/trips/trash`、`GET /api/trips/{tripId}/state` | 新增 owner scoped 分頁垃圾桶與 active/trash/purged 狀態投影；purged 僅從本人 UUID reservation 得知，不回帳務或圖片內容。 | 垃圾桶須可辨識及復原，且 purge 後仍可與未知／他人 404 分辨。 |
| ADD | `specs/truth/contracts/groups/trip-management.yaml` -> `POST /api/trips/{tripId}/{trash,restore,purge}`、`GET /api/trips/{tripId}/operations/{operationId}` | JSON 命令使用 operationId 與 expectedLifecycleRevision；同指紋收據優先重播、版本／狀態衝突拒絕；結果與目前狀態分開，purge 後仍可查收據。 | 使用者 `1B` 的兩段刪除與復原需抵抗回應遺失、併行、過期重送及舊 create UUID 復活。 |
| ADD | `specs/truth/contracts/groups/trip-management.yaml` -> `POST/DELETE /api/trips/{tripId}/thumbnail` | 單檔 multipart POST 用必填 header 傳 operationId 與兩版本，DELETE 無本文；只接受完整靜態 JPEG／PNG／WebP，限制 10,485,760 bytes、25 MP、單邊 16,384 px，輸出不超過 524,288 bytes WebP；定義中止、截斷、超量、忙碌、格式與版本錯誤。 | 使用者 `2A` 與授權研究定下圖片格式、大小及 PostgreSQL 有界縮圖政策。 |
| ADD | `specs/truth/contracts/groups/trip-management.yaml` -> active／trash 縮圖版本 binary GET | 分別提供本人 active 與垃圾桶圖片的私有 WebP bytes；URL 無 token，驗證 session/owner/目前版本，回 `private, no-store` 與 `nosniff`，purge 後不可讀。 | 自訂縮圖需跨裝置顯示且符合旅行生命週期與私有存取界線。 |
| ADD | `specs/truth/contracts/components/schemas/trips.yaml`、`components/parameters.yaml` -> `TrashTripList`／`TripState`／`TripOperationOutcome`／`ThumbnailUpload` 與版本／operation 參數 | 新增無帳務垃圾桶投影、目前狀態、五種持久命令原結果、multipart 單檔形狀及 decimal string 版本；收據欄位與 data truth 的結果版本／thumbnailPresent 對齊。 | UI 與後端可按同一 schema 實作狀態、查證、縮圖快取及精確版本比較，不用 JS Number。 |
| MODIFY | `specs/truth/contracts/components/schemas/trips.yaml`、`groups/trips.yaml` -> `Trip`、一般清單、建立 UUID 衝突 | active Trip 增 lifecycleRevision、thumbnailRevision、hasThumbnail；一般清單排除 trash，建立 ID 與 purge reservation 撞號統一 `ID_CONFLICT`。 | 使用者 `1B／2A` 要版本與縮圖投影；永久刪除後舊建立請求不得復活旅行。 |
| MODIFY | `specs/truth/contracts/groups/{trips,expenses,members,settlement,repayments}.yaml` -> 普通旅行與全部子資源 `409 TRIP_TRASHED` | 本人垃圾桶旅行的帳本、支出、統計、同行者、結算、還款及各紀錄讀寫統一明示 409；未知／他人仍為 404，先查旅行生命週期再查子資源。 | 垃圾桶不得操作帳務，且普通 404 不可使單筆刪除查證誤報成功。 |
| MODIFY | `specs/truth/contracts/groups/categories.yaml`、`components/schemas/categories.yaml` -> `usageCount` | 明示 active 與垃圾桶旅行引用均計入、purge 後才移除引用；分類刪除既有引用保護不變。 | 使用者 `1B` 要垃圾桶復原保留分類連結。 |
| NOOP | `specs/truth/contracts/groups/{account,currencies,health}.yaml` 與既有帳務金額／幣別／權限 schema | 已檢查登入、幣別、健康檢查及精確帳務字串；006 沿用既有 contract，不改它們的 operation 或金額精度。 | 新需求只擴充旅行生命週期、縮圖及查證邊界。 |

## /data-plan

| 動作 | Truth 規格 | 改動摘要 | 原因 |
| --- | --- | --- | --- |
| MODIFY | `specs/truth/data/data-model.dbml` -> `trips.deleted_at/lifecycle_revision/thumbnail_revision`、一般與垃圾桶生命週期 Note／清單索引 | 新增 nullable 垃圾桶時間與獨立生命週期／縮圖版本；一般查詢僅 active，垃圾桶專用 owner 查證，移入與復原不重建帳務；普通子資源同快照／同旅行鎖拒絕 trash。原「本版無刪除旅行 API」改為受控兩段刪除語意。 | 使用者 clarify `1B` 決定可復原垃圾桶與另行永久刪除，`2A` 決定上傳圖片；版本阻止舊請求覆蓋新意圖，並讓普通 404 不被誤判為已永久刪除。 |
| ADD | `specs/truth/data/data-model.dbml` -> `trip_id_reservations`、`trips BEFORE INSERT reservation trigger` 規劃 | 新增全系統 UUID 保留與 owner scoped 最小 tombstone，migration 回填現存旅行，INSERT 同交易保留 ID，purge 同交易只標 `purged_at`；保留 UUID＋owner＋時間，不存可復原內容。 | 永久刪除後旅行列消失；既有 client UUID 建立重試不得重新插入同 ID，且 owner 能區分 trash 與 purged。 |
| ADD | `specs/truth/data/data-model.dbml` -> `trip_operation_kind`、`trip_operation_result_state`、`trip_operation_receipts` | 新增五種命令、active／trash／purged 提交結果與 owner＋operation UUID 唯一收據；記 32-byte 請求指紋及提交後生命週期／縮圖版本，原結果與目前狀態分讀，不設 trip FK，收據不可改刪。 | 使用者 `1B／2A` 操作需在回應遺失、跨裝置及過期重送時可查證且不重複提交；purge 後不可保留圖片／帳務作查證。 |
| ADD | `specs/truth/data/data-model.dbml` -> `trip_thumbnails`、`Ref trip_thumbnails.(owner_id, trip_id)` | 新增每趟至多一筆當前 WebP bytea，DB 長度 1..524288 bytes、尺寸各 1..1200 px，和旅行同 owner 的 RESTRICT FK；換圖／恢復預設同交易更新，垃圾桶保留，purge 同交易刪除。 | 使用者 `2A` 要跨裝置自訂、可更換與恢復預設；圖片研究選定只存正規化有界縮圖，不保存原圖或外部儲存。 |
| ADD | `specs/truth/data/data-model.dbml` -> `Ref trip_id_reservations.owner_id`、`Ref trip_operation_receipts.owner_id` | 兩項最小查證資料皆歸屬 auth user，刻意不設對 trips 的刪除型 FK；所有查證仍以 owner 限定。 | purge 後仍需查證及防旅行 ID 復活，同時維持跨帳號隔離且不阻擋整趟清除。 |
| MODIFY | `specs/truth/data/data-model.dbml` -> `trip_members` owner 不可刪 Note、`settlements/repayments/settlement_adjustments` immutable Note | 一般單筆歷史 UPDATE／DELETE 與 owner 成員刪除仍拒絕；只在本人已在垃圾桶的旅行、受控整趟 purge 下放行相符 DELETE。 | 使用者 `1B` 的永久刪除需清掉整趟資料；既有不可變 trigger 與 FK RESTRICT 不能全域取消或當作新功能已實作。 |
| MODIFY | `specs/truth/data/data-model.dbml` -> `Migration 補充／006 purge context、順序與 deferred checks` | 規劃 READ COMMITTED 旅行列鎖、一次性 transaction-local owner/trip context、依 FK 順序刪調整／還款／結清／份額／支出／成員／縮圖／旅行，與 reservation 標記及 receipt 同交易提交；失敗全回滾。 | `1B` 永久刪除必須一次完整完成，現有 `app_protect_owner`、`app_immutable_payment`、延遲檢查及引用限制需要精確例外。 |
| MODIFY | `specs/truth/data/data-model.dbml` -> `Project travel_ledger_trip_lifecycle` 概述 | 更新完整資料模型註記，區分帳務持久化、可復原垃圾桶、正規化縮圖及不含可復原內容的最小收據／識別保留；標明規劃不等於已執行 migration。 | 避免沿用 Phase 1B 文件標題與「旅行不可刪」語意誤導後續 owner。 |
| NOOP | `specs/truth/data/data-model.dbml` -> `categories` 共用與 `expenses/expense_shares` 金額、分類／分攤語意 | 已檢查分類 usageCount 仍包含垃圾桶支出，FK RESTRICT 保護復原連結；原始金額、幣別、精確份額與單筆支出規則未改。 | 垃圾桶為旅行生命週期，並非清帳或改算式；使用者 `1B` 要完整復原。 |
| NOOP | `specs/truth/data/data-model.dbdiagram` -> JSON 視圖中繼資料 | 已檢查仍為有效 JSON metadata；本輪沒有可需更新的實體佈局，不把它當 DBML 或改寫為不同格式。 | 保留現有圖形檢視設定；權威資料模型語意在 DBML。 |

## /dsl-refine

| 動作 | Truth 規格 | 改動摘要 | 原因 |
| --- | --- | --- | --- |
| ADD | `specs/truth/features/backend/trips/旅行垃圾桶與復原.feature` -> `Feature: 旅行垃圾桶與復原` | 新增移入／復原的同身分狀態轉移、帳務及縮圖保留、一般／垃圾桶清單隔離與 180 天無自動清除的原子規則。 | 承接 FR-002～004、FR-008 與 trash/restoration acceptance；完整復原不新增帳務。 |
| ADD | `specs/truth/features/backend/trips/整趟永久刪除.feature` -> `Feature: 整趟永久刪除` | 新增垃圾桶限定整趟原子清除、一般旅行拒絕直接 purge、已刪 UUID 不復活、復原拒絕與一般不可變歷史保護規則。 | 承接 FR-005～007；受控 purge 例外不得放寬 owner 成員及一般還款／結清／調整保護。 |
| ADD | `specs/truth/features/backend/trips/垃圾桶存取與擁有者隔離.feature` -> `Feature: 垃圾桶存取與擁有者隔離` | 新增普通旅行及子資源讀寫的 TRIP_TRASHED 拒絕，以及 Carol／訪客／僅同行者 Amy 對旅行、圖片、收據及命令的隔離規則。 | 承接 FR-003、FR-018 與跨帳號 acceptance；不能只靠 UI 隱藏。 |
| ADD | `specs/truth/features/backend/trips/旅行競爭與結果查證.feature` -> `Feature: 旅行競爭與結果查證` | 新增命令回滾／故障解除重試、收據原結果與目前狀態分讀、原請求重播、版本／指紋衝突、支出與移入序列化及圖片提交前重驗規則。 | 承接 FR-007、FR-017 與跨裝置競爭／回應遺失 acceptance；舊操作不得覆寫較新意圖。 |
| ADD | `specs/truth/features/backend/trips/縮圖格式與容量邊界.feature` -> `Feature: 縮圖格式與容量邊界` | 新增 4 格式、7 合法邊界、4 超限、16 不合法內容及雙檔拒絕案例，保存／拒絕皆核對原圖、版本與帳務權威狀態。 | 承接 FR-011 與圖片邊界 acceptance；以實際完整 bytes／解碼驗證格式及全部限制。 |
| ADD | `specs/truth/features/backend/trips/縮圖保存與私有讀取.feature` -> `Feature: 縮圖保存與私有讀取` | 新增方向／metadata／容量正規化、保存預設圖清除舊圖，以及 active／trash／舊版本／purged 圖片私有讀取規則。 | 承接 FR-010～013 與圖片生命週期 acceptance；只保存目前有界 WebP。 |
| ADD | `specs/truth/features/backend/trips/縮圖傳輸與提交邊界.feature` -> `Feature: 縮圖傳輸與提交邊界` | 新增來源、身分、owner、multipart part／header、截斷、請求總量、逾時及忙碌拒絕的單 Act 案例，確認沒有部分提交。 | 承接 research 決策 5、既定 multipart API 契約及提交前上傳中斷的原子性責任。 |
| ADD | `specs/truth/features/backend/categories/垃圾桶分類引用.feature` -> `Feature: 垃圾桶分類引用` | 新增垃圾桶支出仍計入 usageCount 及阻止刪除被引用分類的兩個獨立規則。 | 承接 FR-003～004 與 trash/restoration 分類引用 acceptance，確保復原關聯完整。 |
| ADD | `specs/truth/features/frontend/trips/旅行管理與確認.feature` -> `Feature: 旅行管理與確認` | 新增 anchored 管理選單、進入縮圖／移入確認、Escape 回焦、兩段刪除確認／取消、成功後入口與清單更新、垃圾桶次級導覽及真正空狀態規則。 | 承接 design-v7 U01～U06／S01～S02 與 FR-001～008；不另開管理 dialog。 |
| ADD | `specs/truth/features/frontend/trips/新增旅行與選填縮圖.feature` -> `Feature: 新增旅行與選填縮圖` | 新增無圖／有圖建立、未保存預覽與取消、無效選圖阻擋／移除、建立失敗保留草稿、已建立旅行的圖片失敗重傳，以及建立／圖片未知結果分階段查證規則。 | 承接已確認 design-v7 U07／U08／S10 與 FR-009；先確認建立，同 trip 保存圖片，不因圖片失敗重建旅行。 |
| ADD | `specs/truth/features/frontend/trips/縮圖預覽與保存.feature` -> `Feature: 縮圖預覽與保存` | 新增照片／預設圖本地草稿、取消／X／Escape、重開已保存圖、取消選檔、最後意圖保存、明確失敗重試、未知結果／關閉續查及上傳中斷恢復規則。 | 承接 FR-009～010、design-v7 U04／S03／S09 與已確認先預覽、按保存才生效的決策。 |
| ADD | `specs/truth/features/frontend/trips/旅行結果查證與舊連結.feature` -> `Feature: 旅行結果查證與舊連結` | 新增生命週期 unknown、原結果與目前狀態分開呈現、垃圾桶／purged 舊連結、明確失敗、圖片版本衝突與有界查證後再次查證出口規則。 | 承接 FR-003、FR-007～008、FR-017 與 design-v7 S05／S06；查無收據或清單缺項不得誤判成功／失敗。 |
| ADD | `specs/truth/features/frontend/trips/縮圖讀取與帳號清理.feature` -> `Feature: 縮圖讀取與帳號清理` | 新增縮圖等待占位、失敗 fallback、圖片失敗仍可記帳與換帳後圖片／草稿／在途回應清理規則。 | 承接 FR-012、FR-018 與 design-v7 S07；圖片不能遮住識別或阻擋帳本。 |
| ADD | `specs/truth/features/frontend/trips/縮圖限制與選圖錯誤.feature` -> `Feature: 縮圖限制與選圖錯誤` | 新增手機／桌面限制揭露、21 種不合規選圖原因與改選恢復，以及 4 格式裝置組合跨裝置讀回規則。 | 承接 FR-011、圖片邊界 acceptance 與 design-v7 U04／S03；錯誤需可理解且原資料保持。 |
| ADD | `specs/truth/features/frontend/expenses/旅行生命週期下的刪除查證.feature` -> `Feature: 旅行生命週期下的刪除查證` | 新增原支出刪除 unknown 先查 trip state、只在 active 子資源 404 時確認單筆刪除，以及另一裝置移入後舊支出草稿保存拒絕的 UI 規則。 | 承接 FR-003、FR-017 與 plan Wave 2 的 save-outcome.ts 查證修正；trash／purged 不證明原 DELETE 成功。 |
| ADD | `specs/truth/features/frontend/design-system/全站初讀與局部等待.feature` -> `Feature: 全站初讀與局部等待` | 新增 12 種內容初讀骨架及權威內容完成、真空狀態、身分／必要選項等待、初讀失敗重試、paused 及選項／連線恢復規則。 | 承接 FR-014、FR-016～017、design-v7 S04／S08 與 loading acceptance 全站表。 |
| ADD | `specs/truth/features/frontend/design-system/全站操作忙碌與防重複.feature` -> `Feature: 全站操作忙碌與防重複` | 新增 22 種操作等待及防重複結果、Google 登入等待／防重複規則；等待只呈現圖形並保留操作可及名稱與按鈕尺寸。 | 承接 FR-015、NFR-001～002、spinner-only 明確決策及 design-v7 S08。 |
| ADD | `specs/truth/features/frontend/design-system/背景更新與分頁等待.feature` -> `Feature: 背景更新與分頁等待` | 新增 20＋5 筆支出的尾端等待／去重、背景更新保留內容、背景失敗與重試規則。 | 承接 FR-016～017 與 loading acceptance；不得把已確認內容替換成初載骨架或假零。 |
| ADD | `specs/truth/features/frontend/design-system/操作失敗與未知結果.feature` -> `Feature: 操作失敗與未知結果` | 新增支出明確失敗保留草稿／恢復保存，以及付款 unknown、查證未果停止動畫及原次付款再查證規則。 | 承接 FR-017 與既有付款查證語意；明確失敗與結果未知必須可區分。 |
| ADD | `specs/truth/features/frontend/design-system/鍵盤與減少動態效果.feature` -> `Feature: 鍵盤與減少動態效果` | 新增手機／桌面鍵盤確認的安全焦點、名稱後果與 reduced-motion 日期保存等待／完成通知規則。 | 承接 NFR-002～003 與 loading acceptance；不以動畫或顏色作唯一訊號。 |
| ADD | `specs/truth/features/backend/trips/dsl.md` -> 006 DSL 句群：旅行生命週期基準、旅行命令、完整對照、收據／版本／競爭、圖片格式／正規化／私有讀取／傳輸及一般歷史保護 | 新增各 Given 的 DB 落地及穩定識別、單次命令／查詢／SQL Act、response＋DB＋只讀再查核契約，圖片錯誤碼與 save_thumbnail／reset_thumbnail enum 對齊既定 API。 | 支援本輪 trips 原子規則；保留獨立有理數 oracle 與失敗無部分變更。 |
| ADD | `specs/truth/features/backend/categories/dsl.md` -> 006 DSL 句群：垃圾桶分類引用的建立、查詢、刪除及不變斷言 | 新增垃圾桶單筆分類引用 fixture、usageCount=1 與 CATEGORY_IN_USE 拒絕的權威資料核對。 | 支援分類引用保護，與既有模組同一權威位置。 |
| ADD | `specs/truth/features/frontend/trips/dsl.md` -> 006 DSL 句群：旅行管理／確認、預覽／保存、新增兩階段、未知／續查、圖片限制／恢復及帳號清理 | 新增真實 API／DB fixture、可見操作、請求計數、權威結果與跨裝置核對，明定草稿／原次意圖保存及桌機手機行為矩陣；呈現版本索引留在 plan-side handoff。 | 支援 design-v7 已確認操作及全部 trips 前端規則，不把像素／設計版本寫入業務 Gherkin。 |
| ADD | `specs/truth/features/frontend/expenses/dsl.md` -> 006 DSL 句群：原支出刪除結果未知、生命周期查證及舊表單垃圾桶拒絕 | 新增 state-first 查證與 active／trash／purged 分支、保留原刪除意圖／草稿，以及 TRIP_TRASHED 後停止忙碌與復原下一步的契約。 | 支援本輪刪除查證與舊表單規則；不重送原命令、不由普通 404 推斷成功。 |
| ADD | `specs/truth/features/frontend/design-system/dsl.md` -> 006 DSL 句群：初讀／局部／分頁／背景／paused、22 操作等待與結果、付款查證及鍵盤狀態 | 新增各屏障、頁面操作、等待條件與權威斷言，提供 22 操作具體合法輸入／命令／oracle 對照及桌機手機執行範圍。 | 全站共享元件責任由既有 design-system 模組承接；不搬移或重複根 DSL rows。 |
| MODIFY | `specs/truth/features/frontend/expenses/dsl.md` -> `晚餐不再出現且沒有晚餐造成的分攤與付款安排` | 保留原刪除與精確帳務驗證，補充先確認 trip state=active 才能以 expense 404 確認單筆刪除；trash／purged 不可據普通 404 推論原 DELETE 成功。 | 依使用者已確認 006 FR-003／FR-017 與 plan Wave 2 明列 save-outcome.ts 查證修正；是收斂既有成功判定，未削弱原驗收或更改帳務結果，無新增待澄清決策。 |
| NOOP | `specs/truth/features/backend/**/*.feature`、`specs/truth/features/frontend/**/*.feature` -> 本輪新增檔案以外的既有日期／帳務／分類／成員／還款／結算／隔離與介面回歸規則 | 已檢查受影響既有 feature 與本輪責任分派；既有 feature 內容保留，不移除原驗收。 | 006 新行為由新增原子 feature 承接；既有帳務與日期規則仍為後續完整回歸範圍。 |
| NOOP | `specs/truth/features/backend/dsl.md`、`specs/truth/features/frontend/dsl.md` -> 全部既有介面根共用 DSL rows；各模組 DSL -> 除上述 ADD／MODIFY 外的既有句型 | 已檢查共用／模組唯一歸屬與適用契約，沒有 row 搬移、重複權威位置或 DELETE。 | 新增句群均屬既有模組責任；沒有跨模組完整契約一致而需上提的新句型。 |
