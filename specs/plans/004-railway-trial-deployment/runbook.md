# Railway 免費試用操作手冊

查核日期：2026-11-09。此手冊是部署程序，成功紀錄另見 validation.md；尚未取得平台驗證結果的步驟不能視為完成。

## 免費範圍與前置

- 僅以兩個 Google 帳號和測試帳本驗證，不使用正式帳本、不啟用付費。
- 開始前到 Workspace 的 Plans／Usage 確認 Trial、完整或受限試用、餘額、到期時間、RAM 和 volume 限制，記錄實際值及當日官方文件。
- 官方試用頁目前說明一次 US$5、最多 30 天，先到先結束；試用卷在額度到期後 30 天有刪除風險。試用結束轉 Free 的可用性及資料保留應以當時帳號頁面確認，不假定永久保存。
- 若需要付費、額度不足或受限網路無法 Google 登入，停止受影響操作、先備份並交由使用者決定；不自行升級。
- 本機使用 .node-version 的 Node 24.22.2 與 packageManager 的 pnpm 11.25.0。`pnpm install --frozen-lockfile && pnpm build && pnpm test:deployment` 應先通過。macOS 14 frozen WebKit 有協定限制，Linux WebKit 結果與實機驗證分別記錄。

## 建立服務

1. 在獨立 Railway project 中新增單一應用服務，來源使用本 repo 根目錄；不要依 monorepo 自動匯入結果額外建立 web/api 兩個公開服務。若上傳本機程式，用 Railway CLI 或來源分支，只包含預期檔案，不上傳 .env、備份、測試結果。
2. 另新增官方 PostgreSQL 服務，確認 image 主版本為 18、持久 volume 掛載符合該 image（不可照搬舊版 mount）；記錄 image、volume 大小與狀態。若平台無相容 image，保持未完成，不自行降版。
3. 應用 Root Directory 保留 `/`；部署設定使用 `.railway/railway.ts`，不要再設定舊 Railway Config File 路徑。先以 `pnpm install --frozen-lockfile` 安裝包含 Railway SDK 的依賴，再執行 `pnpm dlx @railway/cli config plan --environment production`；確認只有預期 app 設定變更後，執行 `pnpm dlx @railway/cli config apply --environment production`。設定使用 Railpack，Node 24.22.2、pnpm 11.25.0，確認 build log 版本。若自動版本選擇不同，依 Railpack 現行設定修正並重建；不略過 engines。
4. 由應用服務引用資料庫服務的私有 `DATABASE_URL`（如 Railway reference variable），避免手動複製公開 URL。應用與 DB 放同一 project/environment，選共同可用區域；先記錄帳號實際可選範圍。
5. 為應用 Generate Domain，取得 HTTPS 網址。HTTPS 由 Railway 管理；資料庫不建立常設公開端點。

## 應用設定與 Google 登入

| 設定名稱 | 來源／用途 |
| --- | --- |
| NODE_ENV | production |
| PORT | 由 Railway 注入，不硬編碼；server 正式模式監聽 0.0.0.0 |
| DATABASE_URL | Railway PostgreSQL 私有連線 reference |
| APP_ORIGIN | 應用 HTTPS origin，不含尾斜線／路徑 |
| BETTER_AUTH_SECRET | 為試用獨立產生至少 32 字元隨機秘密，只存 Railway secrets／安全保存位置 |
| GOOGLE_CLIENT_ID | 沿用既有 Web application OAuth client（使用者決策） |
| GOOGLE_CLIENT_SECRET | 該 client 的 secret，僅存平台 |

本次依使用者指示沿用既有 `web` OAuth client，保留本機網址並新增 Railway origin／callback，不必另建 client；若使用 Testing audience，確認這兩個帳號可授權。Authorized JavaScript origin 設為 APP_ORIGIN（如 client 需要），Authorized redirect URI 精確設為 `APP_ORIGIN/api/auth/callback/google`。換網域時同步更新兩邊，再重新部署。不要在文件貼 secret、cookie 或 callback query 中的 code/state。

先把必要值填齊再部署；server 在 production 不讀本地 .env，缺少必要變數或非 HTTPS origin 會停止。Build 會產生 shared、API 和 Vite dist，正式 Start 為 `node apps/api/dist/server.js`。

## 部署與驗證

- 開始時先記錄來源 commit SHA／未提交 patch 的識別、查核時間、額度及 trial 狀態。若使用 GitHub 自動部署，確認選到包含本輪變更的來源；本機未提交修改不會自動出現在遠端。
- 首次啟動套用既有 SQL migration，檢查幣別目錄；完成才監聽並使 `/healthz` 回 204 無本文。Railway healthcheck path 設為 `/healthz`，須通過後再看頁面。這只驗證部署初始化，不是持續 DB 監控。
- 開啟 `/`、登入、旅行清單、帳本、支出與分類頁；直接開啟與刷新內頁應載入。JS/CSS MIME 正確；不存在資源及未知 API 應 404 而非首頁 200。
- 兩帳號各建立測試旅行／支出，核對幣別、金額與總額。用另一帳號讀取對方的旅行／支出識別應被拒絕。測試取消登入、登出與換帳號，不共用 session。
- 至少一次實際手機完成登入與記帳；保存脫敏的裝置、瀏覽器、操作與結果。自動測試控制 Google 外部回應，不能代替此項。
- 重部署應用，保持同一 DB／volume，核對同一旅行／支出識別、擁有者及總額仍存在；不要刪 volume 模擬重部署。

## 備份與隔離還原

備份包含 auth session／OAuth 欄位，需視為秘密資料。使用受保護的卷外位置，例如本機忽略的 `backups/` 目錄，權限 700／檔案 600，不上傳 git；正式長期儲存策略另行規劃。

1. 先識別來源 DB，建立測試資料比對清單（旅行／支出 ID、owner 對應、幣別、amount_minor 字串、總額及筆數）；不在公開文件列出 token。
2. 備份使用 PostgreSQL 18 工具。優先透過可用的安全連線／tunnel；若試用需暫時開啟資料庫 TCP Proxy，僅在備份時建立，驗證 SSL 設定並在完成後關閉。確認服務是測試 DB，記錄臨時入口的開關狀態。
3. 在 `backups/source.env` 填好 PGHOST、PGPORT、PGUSER、PGPASSWORD、PGDATABASE、PGSSLMODE，權限 600；依實際端點確認 SSL，不使用私有位址從本機直連。不要把此 env 檔或內容貼到聊天／日誌。
4. 以下 Docker 工具指令讀取 env 檔，匯出到主機；執行前先在受保護的終端設定 `umask 077`，並確認檔名不會覆蓋要保留的備份。

```sh
mkdir -p backups
chmod 700 backups
umask 077
docker run --rm --env-file backups/source.env postgres:18.3 pg_dump --format=custom --no-owner --no-privileges > backups/trial.dump
docker run --rm -i postgres:18.3 pg_restore --list < backups/trial.dump > backups/trial.list
shasum -a 256 backups/trial.dump
```

5. 準備全新且隔離的本機 PostgreSQL 18 目標，名稱如 `ledger_restore_日期`；確認目標不是來源、開發帳本或正在使用的測試 DB。以 `createdb` 建立空 DB。不可向現有重要 DB 執行 drop／clean。
6. 以下使用專用還原容器內已建立的空目標（將 container/name 換成經核對的目標；密碼留在安全設定），還原前再次確認 `current_database()`。不使用 `--clean`。

```sh
docker exec RESTORE_CONTAINER psql -U RESTORE_USER -d RESTORE_DATABASE -c 'SELECT current_database()'
docker exec -i RESTORE_CONTAINER pg_restore -U RESTORE_USER -d RESTORE_DATABASE --exit-on-error --no-owner --no-privileges < backups/trial.dump
```

7. 比對所有相關資料表筆數、旅行與支出識別／owner、auth 關聯、幣別／精確金額和 migrations；必要時啟動隔離應用再讀。記錄結果而非完整資料庫內容。這證明備份可還原，不只證明匯出指令成功。
8. 關閉臨時公開入口、清除 source.env 或移到安全儲存；保留受保護的備份及 checksum。完成後只清除本次隔離還原資源，勿碰來源。

## 失敗處置與回復

| 現象 | 查核／處理 |
| --- | --- |
| Build 失敗 | Node/pnpm 是否吻合，root 是否 workspace，shared export／dist 是否建立，frozen lockfile 是否一致 |
| 啟動失敗／healthcheck 不通 | 必要環境變數、PORT、0.0.0.0、私有 DB DNS、volume、SQL checksum 與 currencies；失敗不代表已服務流量 |
| OAuth redirect_uri_mismatch | APP_ORIGIN 與 Google 登記的 callback 逐字比對；確認 trial 外連與兩帳號 consent 資格 |
| 內頁 404／資源回 HTML | 確認 web dist 已被包含、路由版本及靜態資源存在，未知 API 不走 SPA fallback |
| 登入或寫入被拒絕 | 確認 HTTPS、固定 origin、Secure／HttpOnly cookie 與反向代理；不要放寬跨帳號授權解決問題 |
| DB／migration 錯誤 | 先保全備份，不修改已套用 SQL checksum，不刪 volume；修正失敗原因後重部署 |

程式回復：選擇已知良好來源重新部署，確認設定與 DB schema 相容；平台 image rollback 有保存期限，過期可能需重新建置。資料庫回復是另一步驟，程式 rollback 不會自動還原 schema 或資料。先隔離還原和驗證，再決定切換；不得直接覆寫重要來源 DB。

## 用量與到期

在 Railway Usage／Metrics 檢視 RAM、CPU、volume、流量、剩餘 credit 和預估用量，記錄查核時間；沒流量也可能有資源耗用。試用只涵蓋額度內使用，不保證可連續使用整月。定期由操作人檢查，沒有在此建立提醒或自動化。

到期或額度即將耗盡前先匯出並驗證備份、保存操作紀錄；再由使用者選擇停止、符合限制的 Free 或另案付費。不保證 Free 不休眠或不中斷，不把平台同環境 snapshot 當作唯一備份。若已停止而無法備份，記錄可恢復期限並使用平台支援路徑，勿假設資料仍在。

官方來源（部署時再次確認）：[試用](https://docs.railway.com/pricing/free-trial)、[Config as Code](https://docs.railway.com/config-as-code/reference)、[Volume](https://docs.railway.com/volumes/reference)、[備份](https://docs.railway.com/volumes/backups)、[Healthcheck](https://docs.railway.com/deployments/healthchecks)、[Google OAuth](https://developers.google.com/identity/protocols/oauth2/web-server)。

## 本次實際部署與驗收

- 網址：https://app-production-ca12.up.railway.app/ 。專案 split-ledger-trial，單一 app 與官方 PostgreSQL 18，持久 volume 500 MB；app 使用私有資料庫連線。CLI 由使用者授權，僅存取原試用 workspace。
- 來源是本機工作區上傳，尚未 commit；成功重部署 ID 8352e625-7531-40b8-a7ec-167d1d5efc33。資料保存與完整還原證據見 validation.md T012／T013。
- 已驗證 9 張表還原內容相等。受保護備份在本機 backups/railway-trial-20261109.dump；包含帳號/session/OAuth 資料，不可分享或提交。hash 及筆數見 validation.md，目標隔離 DB 已清理。
- 當前網路若阻擋 SSH／資料庫 TCP，可由使用者切換可連線網路再驗證。本次手機熱點可連，原網路逾時。臨時 TCP Proxy 僅備份期間開啟，兩次嘗試後皆已刪除；無遺留 SSH key，來源憑證 env 已清除。
- 2026-11-09 平台查核：仍為 Trial，剩餘 30 天；原始 credit US$5，剩餘用量 credit 約 US$4.99814。Usage 查詢累計約 US$0.00186，資料可能延遲，不以短時間的預估值外推月費。餘額會隨 CPU／記憶體／流量／volume 持續改變。
- 以當日 30 天粗估最晚約 2026-12-09，但精確期限以平台顯示為準，額度可能更早用完；本次沒有驗證實際到期行為，也未升級付費。到期前由使用者決定保全備份並停止／轉 Free／另案付費。
- 2026-11-09 已將舊 railway.json 遷移至 `.railway/railway.ts` 並套用，舊檔已移除。`app` partial 僅管理 app，環境變數維持平台管理；Postgres 與 volume 不納入本設定的變更範圍。IaC 透過 CLI plan/apply 套用，修改設定檔後不應只上傳原始碼便假定設定已更新。失敗重啟採平台預設 ON_FAILURE、最多 3 次；平台將預設 policy 正規化為 null，因此檔案使用 null，實際部署 manifest 已驗證為 ON_FAILURE。
