# Truth Delta: 004-railway-trial-deployment

**Plan Package**: `specs/plans/004-railway-trial-deployment`
**Truth Root**: `specs/truth`

## /technical-research

| 動作 | Truth 規格 | 改動摘要 | 原因 |
| --- | --- | --- | --- |
| ADD | `specs/truth/techstack.md` -> 試用部署決策／試用平台 | 採 Railway 免費試用及 Railway HTTPS 網址，限兩人測試資料驗證，尚未實作。 | 記錄本輪試用平台與公開入口決策。 |
| ADD | `specs/truth/techstack.md` -> 試用部署決策／應用部署 | 規劃 Node.js 24、Fastify 單一公開服務提供 Vite 靜態產物與同 origin `/api`，待實作驗證。 | 延續既有同 origin 登入設計並降低試用服務數。 |
| ADD | `specs/truth/techstack.md` -> 試用部署決策／試用資料庫 | 規劃 Railway PostgreSQL 18、持久 volume 與私有連線，待實作驗證。 | 保存兩人測試帳本資料並維持既有 PostgreSQL 架構。 |
| ADD | `specs/truth/techstack.md` -> 試用部署決策／試用資料還原 | 規劃 PostgreSQL 邏輯備份與隔離還原驗證，待實作驗證。 | 證明測試資料可恢復，且不依賴同環境 volume 快照。 |
| MODIFY | `specs/truth/techstack.md` -> 部署供應商與正式使用前提 | 區分已選定的 Railway 試用平台與尚未選定的正式部署供應商；保留正式使用前檢查。 | 本輪決策僅涵蓋免費試用，不改寫正式營運選型。 |
| NOOP | `specs/truth/techstack.md` -> 測試與驗證／前端與後端 BDD techstack、測試策略 | 已檢查既有前端 Playwright Test + playwright-bdd E2E、後端 Playwright Test + playwright-bdd + APIRequestContext E2E；本輪不改。 | 部署驗證沿用既有分端測試策略。 |

## /api-plan

| 動作 | Truth 規格 | 改動摘要 | 原因 |
| --- | --- | --- | --- |
| ADD | `specs/truth/contracts/openapi.yaml` -> `GET /healthz` 與 health tag | 掛入免登入的部署就緒操作。 | Railway 切流需可檢查應用完成啟動。 |
| ADD | `specs/truth/contracts/groups/health.yaml` -> `GET /healthz` | 成功回 204、無本文；僅於啟動 migrations 與幣別檢查通過後可回應，未宣稱持續資料庫監控。 | 定義最小就緒契約，不暴露敏感資訊。 |
| NOOP | `specs/truth/contracts/openapi.yaml` -> 既有業務 paths、`/api/auth/*` 說明與安全語意 | 已核對帳號、旅行、支出、分類、幣別及 Google auth；本輪不改請求、回應或錯誤碼。 | 試用部署沿用現有產品行為與同 origin 契約。 |

## /data-plan

| 動作 | Truth 規格 | 改動摘要 | 原因 |
| --- | --- | --- | --- |
| NOOP | `specs/truth/data/data-model.dbml` -> `Project travel_ledger_phase_1a` 與既有 auth／業務 tables、refs、生命週期註記；`specs/truth/data/data-model.dbdiagram` -> 現有資料模型視圖 | 已檢查資料模型；Railway 試用沿用 PostgreSQL 18 與既有 migrations，沒有新增或修改業務資料語意。 | 持久 volume、邏輯備份與隔離還原屬部署及資料操作，不需要新增表、欄位或關聯。 |

## /dsl-refine

| 動作 | Truth 規格 | 改動摘要 | 原因 |
| --- | --- | --- | --- |
| 待後續評估 | `待後續評估` | 待後續評估 | 待後續評估 |
