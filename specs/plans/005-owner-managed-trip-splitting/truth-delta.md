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
| ADD | `specs/truth/techstack.md` -> Phase 1B 分帳決策／結清實付與差額 | 正數實付金額與精確公平金額的差額由成對調整吸收，還款與調整原子寫入；不保存取整方式。 | 付款人自行決定實付額；介面顯示公平份額，任意正數實付結清後不因差額反轉債務，保留全體零和。 |
| ADD | `specs/truth/techstack.md` -> Phase 1B 分帳決策／寫入一致性 | 旅行列鎖、READ COMMITTED 與帳務 revision 保護結清版本核對，以及獨立部分還款的超額確認。 | 避免多裝置競爭、結清錯誤安排及超額確認後資料變動。 |
| ADD | `specs/truth/techstack.md` -> Phase 1B 分帳決策／結算讀取 | 用 REPEATABLE READ 唯讀快照重建兩種付款安排。 | 同次結算讀取須來自一致來源。 |
| ADD | `specs/truth/techstack.md` -> Phase 1B 分帳決策／成員名稱 | 旅行內 owner 與同行者共用命名空間及 ASCII 不分大小寫唯一鍵。 | 同一旅行不可同名，停用者名稱仍保留。 |
| ADD | `specs/truth/techstack.md` -> Phase 1B 分帳決策／資料演進 | 新增 SQL migration 回填 owner 成員及既有單人分攤，沿用 checksum 與 migration lock。 | 舊支出視為 owner 個人支出且原始金額不變。 |
| ADD | `specs/truth/techstack.md` -> 本次開發不引入的技術／Phase 1B | 排除浮點或有限小數作權威分攤、全域最少轉帳求解器及生成式 AI 說明服務。 | 保持精確、確定性及既有架構邊界。 |
| MODIFY | `specs/truth/techstack.md` -> 前端／局部狀態與樣式、對外組成；前端設計系統 | 依 003 交付與 004 後續驗證，改為已完成樣式遷移及共用元件、客製元件與套件圖示現況，更新同 origin 部署組成。 | 使用者要求清除過時未實作描述；保留人工無障礙驗證限制。 |
| MODIFY | `specs/truth/techstack.md` -> 試用部署／應用、IaC、資料庫、備份還原與驗收狀態 | 依 004 validation 記錄已完成部署、IaC 遷移、重部署保存及 9 表還原比對，區分使用者實機回報與 agent 驗證。 | 原文仍標待實作／待驗證；改為有日期的交付狀態，不宣稱重新查核目前線上或長期營運。 |
| MODIFY | `specs/truth/techstack.md` -> 專案與執行環境／版本管理；資料與幣別處理／快照基準 | 更新工具版本及幣別快照已鎖定／封存的描述。 | 移除已完成 Setup 的未來式文字。 |
| NOOP | `specs/truth/techstack.md` -> 前端、後端、測試與驗證／分端 BDD E2E、登入 | 已檢查既有 React/Fastify、各端 Playwright BDD E2E 與 Better Auth，本輪沿用。 | Phase 1B 沒有改判既有端、runner 或登入技術。 |

## /api-plan

| 動作 | Truth 規格 | 改動摘要 | 原因 |
| --- | --- | --- | --- |
| MODIFY | `specs/truth/contracts/openapi.yaml` -> API 根檔版本、tags、paths 與分帳共通語意 | 將目前完整 API 標為 Phase 1B，掛接成員、結算、結清及還款 group/component；列明 owner 隔離、精確分數與 revision。 | 本 plan 的 system-analysis Wave 2 指定擴充唯一 API truth；FR-039–041。 |
| ADD | `specs/truth/contracts/groups/members.yaml` -> `GET/POST /api/trips/{tripId}/members`、`GET/PATCH/DELETE /api/trips/{tripId}/members/{memberId}` | 新增僅 owner 可用的同行者清單、建立、查證、改名、停用/啟用及未引用刪除；重名及引用衝突用專用 409 code。 | FR-001–006、FR-016 明定穩定身分、同旅行含 owner/停用者名稱唯一與歷史保留；使用者已明確確認同名須阻擋。 |
| ADD | `specs/truth/contracts/components/schemas/members.yaml` -> `TripMember`、`CreateMemberRequest`、`UpdateMemberRequest`、`MemberList` | 定義穩定成員 ID、owner/companion 角色、顯示名稱及啟用狀態；停用者仍可讀取以辨識歷史。 | 分帳關聯不能以名稱作鍵，同行者沒有登入或帳本權限；FR-002–004、FR-039。 |
| MODIFY | `specs/truth/contracts/components/schemas/trips.yaml` -> `Trip.ownerMemberId/simplifyDebts/accountingRevision`、`UpdateTripRequest.simplifyDebts` | 旅行回應增加固定 owner 帳務成員、持久簡化開關及十進位字串 revision；既有 PATCH 可切換簡化設定。 | FR-006、FR-022–025 與研究決策 5 要求保存開關及防止過期安排結清；不改寫原始來源。 |
| MODIFY | `specs/truth/contracts/groups/trips.yaml` -> `POST /api/trips`、`PATCH /api/trips/{tripId}` | 建立旅行時同步建立 owner 成員；PATCH 切換簡化設定只重建建議並遞增 revision。 | Wave 1 data truth 的旅行成員生命週期及 FR-022；既有日期/名稱能力延續。 |
| MODIFY | `specs/truth/contracts/components/schemas/expenses.yaml` -> `Expense.payerMemberId/shares`、`CreateExpenseRequest`、`UpdateExpenseRequest` | 支出回傳付款人與各分攤者的精確份額；共同支出明確選一位付款人及至少一位分攤者，PATCH 省略時保留舊集合。新建請求兩欄均省略時仍解讀 owner 個人支出。 | FR-007–017、FR-034–038 要求精確平均、舊支出相容及修正後重算；使用者已確認 owner 可付款及分攤。 |
| MODIFY | `specs/truth/contracts/groups/expenses.yaml` -> `POST/PATCH/DELETE /api/trips/{tripId}/expenses{/{expenseId}}` | 在既有支出操作加入同旅行有效成員驗證、完整取代分攤貢獻、帳務 revision 遞增及刪除後重算；保留已發生還款與結清。 | FR-017、FR-034–038，且 Wave 1 data truth 不允許歷史實付隨來源刪除。 |
| ADD | `specs/truth/contracts/components/schemas/shared.yaml` -> `ExactAmount` 與 `ApiError` 分帳衝突 codes | 精確值用約分的有號十進位分子、正分母及 minorUnit 傳輸；新增成員重名/使用中、帳務版本、安排變動及超額確認 code。 | JPY 100/3、零和淨額與多裝置競態不得由浮點或模糊錯誤處理；FR-010–012、FR-026–027。 |
| ADD | `specs/truth/contracts/groups/settlement.yaml` -> `GET /api/trips/{tripId}/settlement` | 新增 owner 專用的一致性結算讀取，分幣別重建精確淨額、直接或簡化安排、筆數與至多三句確定性說明。 | FR-018–025、FR-040–041；簡化只改建議且筆數不增加。 |
| ADD | `specs/truth/contracts/groups/settlement.yaml` -> `POST /api/trips/{tripId}/settlements`、`GET /api/trips/{tripId}/settlements/{settlementId}` | 結清命令核對安排 key、revision、兩端及精確應付，接受任意有效正數實付，原子保存不可變結清、實付及成對差額；查證結果未明的結清。 | 使用者已明確決定畫面維持公平金額、付款人私下決定實付，不選或記錄取整方式；FR-026–027。 |
| ADD | `specs/truth/contracts/components/schemas/settlement.yaml` -> `SettlementView`、`PaymentArrangement`、`SettleArrangementRequest`、`SettlementRecord` | 回傳精確安排與 revision，結清保存當時精確快照、一筆實付及兩筆零和差額，過期安排回 409 並要求刷新。 | Wave 1 data truth 的 settlements/adjustments 生命週期與研究決策 3、5；避免結清錯誤安排及超付反向債權。 |
| ADD | `specs/truth/contracts/groups/repayments.yaml` -> `GET/POST /api/trips/{tripId}/repayments`、`GET /api/trips/{tripId}/repayments/{repaymentId}` | 獨立還款可分次；超額先回 409 警告，owner 明確確認相同 revision/結果後才保存，且可形成反向債權；單筆 GET 查證未明結果。 | FR-028–033 明定獨立還款與按結清不同，超付確認不可用單一布林值繞過。 |
| ADD | `specs/truth/contracts/components/schemas/repayments.yaml` -> `Repayment`、`CreateRepaymentRequest`、`OverpaymentWarning/Confirmation` | 區分 independent 與 settlement 實付；保存原幣別、歷史位數、成員 ID 與日期；警告快照含 revision、超額、反向關係及綁定請求的短效確認 token。 | FR-028–033 與研究決策 5 要保留實付事實及防止確認前帳務變動，不能以布林欄位跳過警告。 |
| ADD | `specs/truth/contracts/components/parameters.yaml` -> `MemberId`、`SettlementId`、`RepaymentId` | 新資源使用旅行範圍內 UUID 路徑識別，跨旅行或非本人資源回一致 404。 | FR-039 的 owner 隔離，以及未確認結果可用事前 UUID 單筆查證。 |
| NOOP | `specs/truth/contracts/groups/account.yaml`、`categories.yaml`、`currencies.yaml`、`health.yaml` -> 既有操作 | 已檢查登入投影、分類、幣別目錄及健康檢查，維持原有操作與回應契約。 | Phase 1B 沿用 Better Auth owner session、跨旅行分類、固定幣別目錄及部署就緒邊界。 |

## /data-plan

| 動作 | Truth 規格 | 改動摘要 | 原因 |
| --- | --- | --- | --- |
| MODIFY | `specs/truth/data/data-model.dbml` -> `Project travel_ledger_phase_1b`／來源與精度責任 | 將完整模型擴為旅行分帳；公平份額、淨額與安排由權威來源重建，不保存取整份額。 | 使用者確認畫面保留精確平均數，實付另行記錄；FR-010–012、FR-040。 |
| MODIFY | `specs/truth/data/data-model.dbml` -> `Table trips.simplify_debts, accounting_revision`／交易生命週期 | 新增旅行層級簡化開關及帳務版本，規定旅行列鎖、寫入遞增與一致性快照。 | FR-022–024；研究決策 5 要防止過期安排被結清。 |
| ADD | `specs/truth/data/data-model.dbml` -> `Enum trip_member_role`、`Table trip_members` | owner 與同行者共享穩定成員 ID；旅行內名稱含停用者採 ASCII 不分大小寫唯一鍵；owner 唯一且不可停用。 | 使用者明確要求同旅行不得同名；FR-001–006、FR-016。 |
| MODIFY | `specs/truth/data/data-model.dbml` -> `Table expenses.payer_member_id`／支出生命週期 | 每筆支出加入同旅行單一付款人，修改時完整取代舊分攤貢獻，刪除不動已發生的還款與結清。 | FR-007–017、FR-034–038；付款人可不參與分攤。 |
| ADD | `specs/truth/data/data-model.dbml` -> `Table expense_shares` | 以同旅行成員集合保存分攤者，不保存取整份額；每筆存活支出至少一人。 | 公平份額必須由原始金額除以人數精確重建；FR-010–012。 |
| ADD | `specs/truth/data/data-model.dbml` -> `Table settlements` | 保存已結清安排的精確應付快照、安排識別、模式與來源 revision；結清後不隨來源修正重新套用。 | 使用者確認正數實付即可按結清且不產生反向債權；FR-026–027。 |
| ADD | `specs/truth/data/data-model.dbml` -> `Enum payment_record_kind`、`Table repayments` | 保存獨立還款或與結清一對一的實付事實，保留原始幣別、歷史位數與日期；獨立超額保留警告確認及反轉語意。 | FR-026–033 區分實付結清與獨立部分還款，並保留歷史事實。 |
| ADD | `specs/truth/data/data-model.dbml` -> `Table settlement_adjustments` | 每次結清原子保存兩筆有號分數調整，精確相反、總和為零；不存取整方式。 | 使用者明確決定不在 UI 選擇或記錄取整；FR-027、FR-019–020。 |
| ADD | `specs/truth/data/data-model.dbml` -> 成員／支出／還款／結清的複合 Ref 與歷史完整性 | 以 owner、trip、member 複合外鍵防止跨旅行引用；刪除僅限未引用同行者，已發生付款與調整不可連帶刪除。 | FR-004–005、FR-029、FR-038–041 的資料隔離與歷史保留。 |
| MODIFY | `specs/truth/data/data-model.dbml` -> migration 與歷史幣別註記 | 新 migration 為既有旅行建立 owner 成員，舊支出回填 owner 付款及唯一 owner 分攤；原始金額與歷史 minor_unit 不變。 | FR-014–015 與研究決策 7；既有個人支出不得產生新債務。 |
| NOOP | `specs/truth/data/data-model.dbml` -> `auth.*`、`categories`、`currencies` 基本結構；`specs/truth/data/data-model.dbdiagram` -> layout state | 已檢查登入、分類、幣別目錄及圖面配置，不改其既有基本結構或布局狀態。 | Phase 1B 沿用原登入與分類邊界；資料圖配置檔無表結構內容。 |

## /dsl-refine

| 動作 | Truth 規格 | 改動摘要 | 原因 |
| --- | --- | --- | --- |
| 待後續評估 | `待後續評估` | 待後續評估 | 待後續評估 |
