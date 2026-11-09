# Phase 0 研究：Railway 免費試用部署

研究日期：2026-11-09。範圍為兩人、測試資料、免費試用，不代表已部署或核准付費。下列平台限制須於實際建立資源時再次確認。

## 決策 1：試用部署與同 origin

- **Decision**: 採 Railway 免費試用，規劃一個 Node.js/Fastify 應用服務同時提供 Vite 靜態產物與 `/api`，搭配獨立 Railway PostgreSQL 18 服務及持久化 volume；公開應用使用 Railway HTTPS 網址，資料庫使用專案私有網路。靜態服務整合的實際套件與路由順序交由系統規劃與實作驗證。
- **Rationale**: 沿用現有 React、Fastify、PostgreSQL 與同 origin 登入設計，減少服務數與跨來源認證調整。SPA fallback 僅適用頁面導覽，未知 `/api` 與缺失靜態資源不得回傳首頁成功；須測試路由衝突與內容型別。服務組合及免費試用資格尚未實測。Railway 提供 HTTPS 網址與專案私有網路（[公開網路](https://docs.railway.com/networking/public-networking)、[私有網路](https://docs.railway.com/networking/private-networking/how-it-works)）。
- **Alternatives considered**:
  - 前後端分為不同公開服務並由代理整合同 origin：職責獨立，但增加代理、設定和用量。
  - 分離來源並修改 CORS、cookie 與驗證：增加安全與回歸範圍，不符合本次最小變更。

## 決策 2：建置、啟動與 migrations

- **Decision**: 優先以 Railway Railpack 從 workspace 根目錄安裝與建置，明確設定 Node 24、pnpm 版本、建置與正式啟動指令；依 Railway `PORT` 及 `0.0.0.0` 監聽。保留現有啟動時帶交易及 advisory lock 的 migrations，確保 SQL、幣別資料與所有執行期依賴包含在產物中；加入就緒檢查並在 migrations 成功後才宣告可用。
- **Rationale**: 現在 `server.ts` 只監聽 `127.0.0.1`／`API_PORT`，API 沒有正式 start script，`packages/shared` 的 exports 指向 TypeScript 原始碼，單純執行編譯後 JS 的相容性不可假設；`migrate.ts` 依相對位置載入 SQL。需實際驗證產物、依賴解析及空資料庫首次啟動和重啟。失敗時不得切換為就緒；啟動 migration 不代表舊版程式一定能搭配新版 schema 回滾。[Railway monorepo](https://docs.railway.com/deployments/monorepo)、[監聽設定](https://docs.railway.com/networking/troubleshooting/application-failed-to-respond)、[部署健康檢查](https://docs.railway.com/deployments/healthchecks)。
- **Alternatives considered**:
  - Dockerfile：明確控制多階段建置，但先驗證 Railpack，若版本或產物處理不符需求再改用。
  - 獨立 migration job：有利部署控制，但需額外協調、驗證免費試用功能與失敗復原，本次先保留現有機制。

## 決策 3：驗證與 BDD 技術

- **Decision**: 沿用 truth 中前端 Playwright Test + playwright-bdd 瀏覽器 E2E，後端 Playwright Test + playwright-bdd + APIRequestContext API／資料權威狀態 E2E；執行受影響的既有回歸、建置與型別檢查。部署後另以測試資料驗證真實 Google OAuth、兩帳號隔離、手機、內頁重新整理、重新部署持久化與隔離還原。
- **Rationale**: 既有 techstack 已分端明定 runner 與 E2E 策略，本輪無改判；自動測試替代外部 Google 回應，不能證明真實 OAuth。部署試用驗證獨立記錄通過與未驗證項，避免對正式資料或可用性作超出範圍的主張。
- **Alternatives considered**:
  - 只手動測試部署：不足以保護既有前後端行為。
  - 新增整套 Gherkin：本輪未新增業務語意，先沿用既有 feature；若分析發現介面行為改變再回交相應流程。

## 決策 4：資料、備份及到期

- **Decision**: PostgreSQL 使用持久 volume，試用資料與本地／正式資料隔離；建立使用 PostgreSQL 工具匯出備份並在隔離的 PostgreSQL 環境還原與核對的程序，備份保存在 Railway volume 以外的受保護位置。平台 volume backup 只作可選補充，先確認試用可用性及費用。
- **Rationale**: volume 跨應用重新部署保存，但不等於獨立備份。Railway volume 備份還原限同 project + environment，清除 volume 會刪其備份，故不能單靠它證明隔離還原或異地保護；實作時確定 PostgreSQL 18 相容的備份工具、連線路徑、憑證保護及還原步驟，勿暴露資料庫。試用只用測試資料，不要求正式環境備份 SLA。[備份限制](https://docs.railway.com/volumes/backups)、[volume](https://docs.railway.com/volumes/reference)。
- **Alternatives considered**:
  - 僅使用平台 volume snapshot：操作方便，但不滿足獨立隔離還原的證明。
  - 全面啟用高可用與 PITR：增加資源與設定，本次兩人免費試用不需要。

## 決策 5：登入、憑證及費用邊界

- **Decision**: 使用 Railway 提供的 HTTPS 網址配置 `APP_ORIGIN`、獨立 Google OAuth client/callback、隨機 `BETTER_AUTH_SECRET` 與私有 `DATABASE_URL`；環境變數在平台管理，不放入文件或版本庫。建立前確認 trial 類型與限制，紀錄到期日、餘額和資源用量；不啟用付費方案。
- **Rationale**: 現有 auth 使用固定 origin、HTTPS secure cookie 與 `/api/auth/callback/google`。試用可能受限於帳號驗證及對外連線，必須實測 Google token 交換與兩個 Google 帳號；Google OAuth consent 狀態和測試帳號亦須核對。Railway 試用給一次 US$5、最多 30 天（先到為準），試用卷資料在額度到期後 30 天可能刪除；免費額度不保證服務持續一個月。試用後如何轉 Free 的官方資訊存在差異，屆時以帳號介面與官方政策確認，不假定不中斷或資料自動保留。[試用](https://docs.railway.com/pricing/free-trial)、[用量價格](https://docs.railway.com/pricing/plans)。
- **Alternatives considered**:
  - 直接升級 Hobby：增加可用資源，但違反本輪不付費範圍。
  - 公開資料庫或將 secret 放入倉庫：增加曝露風險，不採用。

## 後續驗證與交接

- 確認部署 artifact 的 Node 24 與 pnpm 版本、shared 來源或編譯輸出、SQL／幣別資料路徑、啟動與優雅停止。
- 驗證 `/api` 錯誤不落入 SPA fallback、靜態資源 404、登入 cookie、真實 OAuth 與兩個帳號隔離。
- 確認服務可在 trial 的資源、0.5 GB volume 與 US$5 額度內完成驗收；實測 RAM、CPU、用量及備份大小，不能保證一定不超額。
- 在獨立目標資料庫還原備份，核對旅行及支出；確認試用額度和資料保留政策。需要外部存放備份時採受保護的測試資料位置。
- Railway 部署 healthcheck 只在部署切流期間使用，不能取代持續監控；試用到正式環境需另行規劃。
