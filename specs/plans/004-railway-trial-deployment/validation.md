# Railway 試用部署驗證

## T001 — 工具鏈與依賴

- Node 24.22.2：使用本機 nvm 已安裝版本；pnpm 11.25.0。
- API 新增鎖定 @fastify/static 10.1.10；依官方相容表支援 Fastify 5：https://github.com/fastify/fastify-static。
- `pnpm install --frozen-lockfile` 成功。
- 備份工具採既有 PostgreSQL 18 Docker 容器內 pg_dump／pg_restore（18.3），無需另裝主機套件。
- 尚不需 CLI 部署；後續採已登入平台或再配置 CLI。
- 增補 backups/、*.dump ignore；保留既有環境檔規則。

## T002 — Smoke

臨時 Fastify app + @fastify/static 提供臨時文字檔，200 與內容斷言通過；已關閉 app 並清理檔案。

## T003 — 隔離測試基礎

部署 fixture 自測 1/1 通過；新增檔案 targeted TypeScript 檢查通過。全域 tests typecheck 發現既有 ui-quality.spec.ts:233 三處 undefined，待 T007 修正／驗證。

## T004 — 正式入口

Frozen install、workspace build 通過；正式編譯入口從空 schema 完成 migrations、currencies 回 200、SIGTERM 正常退出；部署測試 2/2 通過。shared 改用 dist 執行期匯出，types 保留來源，dev 入口先建置 shared。

## T005 — 就緒檢查

部署測試 5/5 通過；涵蓋免登入 204／無本文、migration checksum 失敗及 DB 不可連線時無成功就緒。

## T006 — 靜態與 SPA 路由

正式產物部署測試 6/6 通過。驗證頁面直接進入、CSS/JS content-type、缺失資源／未知 API 404、非 GET 不回首頁；既有 /api/me 未登入仍為 401。

## T007 — 完整回歸

- typecheck、tests TypeScript、lint、format:check、build 全通過。
- test:deployment 6/6；test:support 17/17；test:api 40/40；test:web Chromium 52/52；test:unit 17/17。
- 既有 UI 測試 RGB channel undefined 型別錯誤已補長度防護；Google login contrast targeted test 1/1 通過。
- macOS 14.8.1 WebKit 的 frozen build 無法支援 PushAPIEnabled，重裝後仍在 newPage 前失敗；不視為產品回歸失敗。
- 改用官方 mcr.microsoft.com/playwright:v1.64.1-noble（sha256:2f05f8a734509a7b3f26a912639488ee08f58a7b292d14d62271bcff9038768f），容器內 Node 24.22.2、pnpm 11.25.0、frozen install 後 WebKit 52/52 通過。隔離資料庫透過 host.docker.internal:54330 使用原安全 fixture；無本機 .env／真實 secret。
- Linux 測試日誌：忽略的 .cache/deployment-webkit-linux.log。真實手機／Google／線上試用仍未驗證。

## T008 — 設定與備份程序預演

railway.json 可解析，RAILPACK/build/start/healthcheck 對應正式產物；格式與 diff 檢查通過。runbook.md 已含私有 DB、環境變數、OAuth、路由、失敗處置及到期程序。

PostgreSQL 18.3 本機隔離預演：建立新 source/target DB，migrate source，建立測試 user/trip/USD 1250 minor expense；custom pg_dump 匯出，再以 pg_restore --exit-on-error 還原空 target。user 擁有者關聯、旅行／支出 ID、金額／幣別及 currencies/migrations/業務筆數一致。兩個臨時 DB 均已清理。

忽略的 backups/local-preflight.dump SHA256：c469da5b4e5396d5ec52271cec65229bf4e4028ce727baab5eb77baceed0fd5c。此為本機預演，並非 T013 的 Railway 資料還原驗收。

## T009 — 試用前置查核（完成）

- 2026-11-09：使用既有已登入 Chrome Railway workspace 的 Plans 頁查核；顯示 Trial、已驗證帳號、US$5.00／30 days left、code and database deployments、2 vCPU／0.5 GB RAM 每服務。平台實際 RAM 與文件部分描述不同，以帳號頁面為準。
- Railway 頁面有外部網路存取事件告示；是否影響部署／OAuth 仍需實測。
- Google Cloud 已能存取 split-ledger 專案 Credentials 頁，有現存 Web OAuth client；本輪未修改或建立憑證、未複製 secrets。試用專用 OAuth 的實際設定尚未完成。
- 使用者已明確確認可於驗收時親自操作兩個 Google 帳號及一次實際手機登入／記帳；T009 完成，解鎖 T010。
- 本輪未建立 Railway 服務、未部署、未升級付費。已保留 Railway／Google 設定頁供接續操作。

## T010 — 部署進行中

- 已配置官方 Railway CLI 5.71.0；本機尚未登入，已啟動官方 device activation 流程。
- 上傳來源預計為目前本機工作區（包含尚未提交的部署變更），不自動 commit。
- 等待使用者確認新的 CLI 帳號存取授權；尚未送出 device activation、建立雲端服務或上傳來源。T010 保持未完成。

## T010 — Railway 部署完成

- 使用者已同意 CLI 授權，限制於現有試用 workspace；專案 split-ledger-trial 建立完成。使用者改判沿用既有 Google Web OAuth client，並自行完成 callback／環境變數與部署。
- Project：26fa1fc6-2770-4181-ad4f-4e9ecd8d643e；app：64b58bce-fedb-4c58-b0b2-ecb2abc6797a；Postgres：329846ae-0dd8-4458-9311-2463d6fe0831。
- 公開網址：https://app-production-ca12.up.railway.app 。2026-11-09 查核 app SUCCESS（b76c5fcc-c415-41c1-81eb-49b6537b142f）；Postgres SUCCESS（官方 postgres-ssl:18），持久 volume 500 MB。應用變數只檢查已設定狀態，未輸出秘密；DATABASE_URL 使用 railway.internal。
- HTTP 驗證：/healthz 204 無本文；/ 和 /trips 200 HTML；產物 JS/CSS 200 正確 MIME；/api/me 401 JSON；/api/unknown 和缺失資源 404 JSON。TLS 以 Node 標準驗證成功；主機 Python 的本地 CA 設定失敗，沒有停用憑證驗證。
- 上傳為本機未提交版本，初次 deployment 9f20d3e4-d274-4e83-b383-b5d264400cd1；使用者補上 OAuth 變數後產生上述成功部署。未自動 commit 或升級付費。
- CLI build 警告現有 Config as Code 於 2026-12-01 後停用；本次已成功套用，後續長期部署／該日之後重新發布須先規劃遷移，不宣稱永久相容。
- T011 真實 Google／兩帳號／實機手機尚待操作；T010 成功不代表這些驗收已完成。

## T011 — 真實登入與手機（使用者驗收）

使用者於 2026-11-09 回報「兩個帳號跟手機都測試通過了」，承接上一輪登入、分別建立旅行／支出、刷新保存、換帳號隔離與手機記帳驗收指引。線上路由／MIME／401/404 由 T010 HTTP 證據及本機既有隔離回歸補強。Secure／HttpOnly 由既有正式 auth 配置與 HTTPS 部署核對；尚未擷取實際瀏覽器 session cookie，也沒有獨立線上跨帳號 API trace。使用者補充實機環境為 iOS 27.0.1／Safari（未提供硬體型號）；不可將此項宣稱為 agent 實機測試。

## T012 — 重新部署保存驗證

- 重新部署前以既有登入帳號從 /api/me 核對同一 user ID，讀取測試旅行及支出 API；沒有產生或偽造登入 session。
- 原部署 b76c5fcc-c415-41c1-81eb-49b6537b142f；重新部署 8352e625-7531-40b8-a7ec-167d1d5efc33 成功，原部署移除。只 redeploy app，Postgres volume 未替換。
- 新部署成功後再讀 /api/me 仍是原帳號；同一 trip ID、expense ID、amount 50.00、TWD、日期及 createdAt/updatedAt 一致。帳本仍顯示原旅行、一筆支出及 TWD 50.00 總額。未重建或重新寫入測試資料。
- 新 app 完成帶 checksum／history 的啟動 migrations 並通過就緒；未直接查驗 migration table（資料庫網路受限）。此為目前可讀測試帳本的 API／畫面前後比對，不宣稱全資料庫逐列驗證。
- 證據截圖：忽略的 .cache/railway-persistence.png。

## T013 — 備份還原受阻

- Railway SSH（ssh.railway.com:22）連線逾時；為此註冊的專用 SSH key 已撤銷。
- 依 runbook 暫時建立 PostgreSQL TCP Proxy，以 PostgreSQL 18 工具和 sslmode=require 嘗試讀取；公開 endpoint:23094 同樣連線逾時。未取得資料庫 dump，也未執行來源資料寫入／刪除。
- 臨時 proxy a5fc16f9-7e57-4e8d-b6df-bc64f5cac6c9 已刪除；不保留公開 DB 入口。包含來源憑證的臨時 env 與本輪 SSH 私鑰均已清理。
- 需要可連線至 Railway SSH 或資料庫 TCP 的網路（例如電腦改用手機熱點）後重試；T013 及其依賴任務維持未完成。本機 T008 預演不算 Railway 備份還原通過。

## T013 — 熱點重試、備份與隔離還原完成

- 使用者切換熱點後，以 PostgreSQL 18.3、sslmode=require 加密連線成功。臨時 TCP Proxy f7e96835-b827-4dd9-bb62-05258dbb4e74 只用於本次驗證，完成後已刪除。
- Railway 資料匯出為 custom-format 備份，存於受保護的忽略目錄 backups/railway-trial-20261109.dump，檔案權限 600，24418 bytes。SHA256：cfd8b794e138ba7c072e89a10173da27868928abb0a76400615a9c5383a9b182。
- 還原至全新本機 PostgreSQL 18 隔離 DB；pg_restore --exit-on-error 成功。逐表 UTC 正規化與排序後比較完整內容（不只筆數），9 張表全部相等；還原時外鍵／唯一限制成功建立，涵蓋帳號擁有者關聯、旅行／支出 ID、精確金額與幣別。
- 比對筆數：auth.account 2、auth.session 2、auth.user 2、auth.verification 0、migrations 2、categories 2、currencies 165、expenses 2、trips 3。
- 比對 manifest 在 backups/railway-trial-20261109-manifest.json（權限 600，僅存摘要）；未將備份／原始帳號資料放進 git、聊天或公開日誌。
- 隔離 DB 已刪除，來源 DB 未被寫入或覆蓋；來源憑證 env 已清除。前一輪 SSH key 已撤銷，無新增持續 SSH 權限。

## T014 — 費用與交付對照

2026-11-09 透過 Railway 官方 CLI／GraphQL 查核：isTrialing=true、trialDaysRemaining=30、creditBalance=5、remainingUsageCreditBalance=4.998141105176481；Usage 累計 0.0018588948235185184 美元。用量有延遲，不外推月費；未啟用付費。期限以平台相對天數記錄，約 2026-12-09 為推算而非平台承諾日期；額度用盡可能提早結束。

SC 對照：SC-001 使用者兩帳號＋iOS 27.0.1 Safari 驗收與 T010 線上檢查／T007 回歸；SC-002 T012 重部署前後同帳號/API/畫面比對及 T013 9 表完整還原；SC-003 runbook.md 及 README 入口；SC-004 實際 Trial／餘額查核。原始 session cookie 及獨立線上跨帳號 API trace 未擷取，未作超出現有證據的主張。

已更新 runbook 的既有 OAuth client 決策、實際備份、免費限制、到期選項及 2026-12-01 平台設定格式遷移風險。沒有執行到期演練。清理後 tcp-proxy list 為空，專用 SSH key 已移除，備份仍保持本機權限 600／git ignored。

## T015 — UI quality gate

獨立 subagent 唯讀審查通過；產品 UI 無變更，既有路由／登入及回歸與 UI plan 一致。使用者實機回報和 agent 自動化證據已區分；未擷取原始 session cookie／獨立線上跨帳號 API trace 的限制保留，不宣稱完成該兩項獨立查證。

## T016 — Research quality gate

獨立 subagent 審查通過，無阻塞。研究、code/config 與 runbook／validation 一致；既有 OAuth client 為使用者後續明確改判。長期 RAM／CPU 量測與月費預估尚未完成，不以本次平台容量或短時間用量取代。12/1 設定格式與實際到期未驗證的限制保留。

## 後續 — Railway IaC 遷移完成（2026-11-09）

- 使用者先執行 CLI 格式遷移，後授權補齊、預覽、套用與驗證。根目錄新增精確版本 railway 3.16.0 開發依賴與 lockfile；`.railway/railway.ts` 保留 app partial、建置／啟動／健康檢查設定，補上失敗重啟最多 3 次，移除舊 railway.json。
- CLI 5.71.0 預覽僅兩筆 safe resource.update：app buildCommand，以及 app startCommand／healthcheckPath／healthcheckTimeout／restartPolicyType／restartPolicyMaxRetries。沒有建立或刪除服務、變數、資料庫、volume 或網域。先保存 pinned plan，再以該 plan 套用，結果 status=applied、diagnostics=[]。
- 套用觸發 app deployment `7dd1e3d0-d7ee-460e-b657-473073ce79da`，最終 SUCCESS。部署 manifest 確認 build／start／healthcheck、ON_FAILURE／3 次、sfo 單一 replica、sleepApplication=false。Postgres deployment 仍為原 `5eb0ad4b-717a-45a8-8120-67cd3be5ea7d`，未重新部署。
- 平台將預設 ON_FAILURE 正規化為 null；新檔使用 null 保留預設，避免每次 plan 都重複提示差異。另以區域變數傳遞 project configuration，保留 CLI 的 variables.managed=false；SDK 3.16.0 的 project 參數型別未列出該欄位。最終新檔獨立 TypeScript 檢查通過，CLI plan changes=[]、diagnostics=[]、variablePolicy.managed=false；app partial 管理權僅含 service.app。
- 比對套用前後環境設定：完整 Postgres 設定、volumes、app 變數及 networking 均相等，不在紀錄暴露值。
- 本機 lint、format:check、typecheck、build 通過，既有 deployment 測試 6/6 通過。新檔另以 tsc --noEmit（NodeNext）檢查。
- 部署後 HTTPS 檢查：/healthz 204 空本文；首頁與 /trips（Accept: text/html）200；JS／CSS 200 且 MIME 正確；未登入 /api/me 401；未知 API 及缺失 JS 404。本輪未重做兩帳號／手機互動或備份還原，先前驗收紀錄仍保留。
- 已解除上段 T017 記錄中的舊設定格式限制；試用到期、長期容量與月費的限制仍存在。操作手冊已改成 IaC plan/apply 流程。沒有啟用付費、提交 git 或上傳任何憑證。

## T017 — Plan quality gate

獨立 subagent 唯讀審查通過，無阻塞。四介面與 FR-001～008／NFR-001～002／SC-001～004 均有交付與證據對應。原網路阻礙已透過熱點解決。保留真實操作由使用者回報、cookie／獨立線上API trace、T012比對範圍、到期／長期費用及12/1設定格式的限制；本次試用完成不等於正式營運準備完成。T001–T017 全部完成。
