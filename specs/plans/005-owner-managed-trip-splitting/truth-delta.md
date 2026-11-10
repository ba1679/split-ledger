# Truth Delta: 005-owner-managed-trip-splitting

**Plan Package**: `specs/plans/005-owner-managed-trip-splitting`
**Truth Root**: `specs/truth`

## /technical-research

| 動作 | Truth 規格 | 改動摘要 | 原因 |
| --- | --- | --- | --- |
| MODIFY | `specs/truth/techstack.md` -> 資料與幣別處理／原始與實付金額 | 將既有「金額」列明確命名為原始與實付金額，保留最小單位整數、BigInt、BIGINT 與十進位字串語意。 | 區分既有實付金額與新增的精確分攤份額；既有金額行為不變。 |
| ADD | `specs/truth/techstack.md` -> Phase 1B 分帳決策／精確分攤 | 採 TypeScript BigInt 約分有理數，在共用套件計算精確份額與有號淨額。 | JPY 100/3 不得提前取整或用浮點近似。 |
| ADD | `specs/truth/techstack.md` -> Phase 1B 分帳決策／分數持久化與傳輸 | 結算調整以 PostgreSQL NUMERIC 整數分子分母保存，傳輸採十進位字串；份額由支出與成員重建。 | 保留循環分數的精確值與可重現計算。 |
| ADD | `specs/truth/techstack.md` -> Phase 1B 分帳決策／債務簡化 | 採直接債務圖、確定性淨額配對與筆數比較回退。 | Simplify Debts 須維持每人淨額且付款筆數不增加。 |
| ADD | `specs/truth/techstack.md` -> Phase 1B 分帳決策／安排說明 | 採後端確定性文字模板生成三句內說明。 | 讓 owner 理解本次改道與付款筆數變化。 |
| ADD | `specs/truth/techstack.md` -> Phase 1B 分帳決策／付款取整 | BigInt 商餘數計算，還款與成對結算調整原子寫入。 | 付款人當次決定實付金額，保留公平份額及零和。 |
| ADD | `specs/truth/techstack.md` -> Phase 1B 分帳決策／寫入一致性 | 旅行列鎖、READ COMMITTED 與帳務 revision 保護分帳寫入及確認。 | 避免多裝置競爭與超額還款確認後資料變動。 |
| ADD | `specs/truth/techstack.md` -> Phase 1B 分帳決策／結算讀取 | 用 REPEATABLE READ 唯讀快照重建兩種付款安排。 | 同次結算讀取須來自一致來源。 |
| ADD | `specs/truth/techstack.md` -> Phase 1B 分帳決策／成員名稱 | 旅行內 owner 與同行者共用命名空間及 ASCII 不分大小寫唯一鍵。 | 同一旅行不可同名，停用者名稱仍保留。 |
| ADD | `specs/truth/techstack.md` -> Phase 1B 分帳決策／資料演進 | 新增 SQL migration 回填 owner 成員及既有單人分攤，沿用 checksum 與 migration lock。 | 舊支出視為 owner 個人支出且原始金額不變。 |
| ADD | `specs/truth/techstack.md` -> 本次開發不引入的技術／Phase 1B | 排除浮點或有限小數作權威分攤、全域最少轉帳求解器及生成式 AI 說明服務。 | 保持精確、確定性及既有架構邊界。 |
| NOOP | `specs/truth/techstack.md` -> 前端、後端、測試與驗證／分端 BDD E2E、登入、樣式及試用部署 | 已檢查既有 React/Fastify、各端 Playwright BDD E2E、Better Auth 與樣式及部署方向，本輪沿用。 | Phase 1B 沒有改判既有端、runner、登入或部署技術。 |

## /api-plan

| 動作 | Truth 規格 | 改動摘要 | 原因 |
| --- | --- | --- | --- |
| 待後續評估 | `待後續評估` | 待後續評估 | 待後續評估 |

## /data-plan

| 動作 | Truth 規格 | 改動摘要 | 原因 |
| --- | --- | --- | --- |
| 待後續評估 | `待後續評估` | 待後續評估 | 待後續評估 |

## /dsl-refine

| 動作 | Truth 規格 | 改動摘要 | 原因 |
| --- | --- | --- | --- |
| 待後續評估 | `待後續評估` | 待後續評估 | 待後續評估 |
