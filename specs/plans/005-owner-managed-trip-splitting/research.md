# Phase 0 研究：Owner 管理的旅行分帳與結算

研究日期：2026-11-10。承接本 plan 的 spec 與四份 acceptance；本文件記錄已選定、尚未實作的 Phase 1B 技術方向，不宣稱已完成 migration、效能或正式服務驗證。

## 決策 1：延續既有前後端與分端 BDD E2E

- **Decision**: 沿用 React/Vite/TanStack Query 前端、Fastify/TypeBox 後端、PostgreSQL 18/Drizzle/node-postgres，以及 packages/shared。前端 Gherkin 使用 Playwright Test + playwright-bdd 執行瀏覽器到真實 API/隔離資料庫的 E2E；後端使用同 runner 加 APIRequestContext 執行獨立 API/權威資料 E2E。Vitest 補充純函式不變量驗證。
- **Rationale**: 既有 techstack truth 已明列各端、runner 與 E2E 策略，本輪沒有改判，因此符合必問題的已回答條件，不重問。package.json 與現有 expenses module 確認相同邊界；不需升級或新增執行期框架。technical-research 專屬憲法檔不存在，依根憲法及 shared.md。
- **Alternatives considered**:
  - 新增獨立分帳服務：增加跨服務交易成本，現有單一 owner 旅行邊界無此需求。
  - 僅測純函式：無法驗證持久化、權限、確認流程與資料遷移。

## 決策 2：以 BigInt 有理數表示公平份額及淨額

- **Decision**: 既有支出及實付金額繼續用最小單位整數；新增約分有理數值物件，以有號 BigInt 分子與正 BigInt 分母表示，零正規化為 0/1。加減、比較、取整均以整數運算實作，跨歷史 minorUnit 先精確換尺度。共用純函式置於 packages/shared，後端為權威計算端，前端僅格式化或預覽。API 分子分母採十進位字串；持久化的結算調整分子分母採 PostgreSQL 無固定 scale 的 NUMERIC 存整數並限制分母為正，禁止把分數先除成 SQL 小數。
- **Rationale**: packages/shared/src/index.ts 目前只接受正整數金額，formatMoney 不支援負數，必須新增獨立介面而不破壞既有解析器。ECMAScript BigInt 除法會截去小數，因此 `100n/3n` 不能代表公平份額；分子分母可精確表達。PostgreSQL NUMERIC 仍是有限精度十進位，不能直接存循環小數。此選型由規格精確性要求推導；[BigInt 規範](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-bigint-type)、[PostgreSQL 數值型別](https://www.postgresql.org/docs/18/datatype-numeric.html) 支持底層型別性質。
- **Alternatives considered**:
  - decimal.js 或固定 NUMERIC scale：方便十進位計算，但任意有限 scale 都不能精確表示 1/3。
  - fraction.js：可替代自有有理數介面，但本輪只需要少量 BigInt 運算，先不新增依賴；仍須以獨立不變量測試保障正確性。

## 決策 3：公平顯示與實付取整分開，尾差調整和還款原子保存

- **Decision**: 份額由原始金額及分攤成員集合重建，不保存四捨五入的每人份額。有限小數精確顯示；循環或過長數值顯示小數前綴、未取整標示及可取得的精確分數。實付時由付款人選方式，owner 代記；對正數 q=n/d，無條件進位用整數商與餘數，四捨五入以 `2×餘數 >= 分母` 判斷。還款與對應成對結算調整同一交易寫入，綁定當次精確安排及版本，不隨日後支出編輯重新套用。
- **Rationale**: Amy 欠 owner 100/3 且支付 33 時，Amy 調整 +1/3、owner 調整 -1/3；支付 34 時，Amy 調整 -2/3、owner 調整 +2/3。依 spec 淨額公式兩者都結清，調整總和為零，原始份額不變。原始帳務單位使用歷史 minorUnit，實際支付的幣別單位來自既有目錄；TWD 支出整數輸入限制不應被誤作分攤精度限制。付款取整不是收款人的持久偏好。
- **Alternatives considered**:
  - 改寫原始支出份額：失去公平與追溯來源。
  - 只存實付且忽略尾差：淨額會留下不可支付餘額。

## 決策 4：直接債務圖與確定性淨額配對，保留筆數保護

- **Decision**: 逐幣別建立有向直接債務圖：分攤者欠付款人其份額，自付份額不建邊；同對反向邊淨額化。還款及成對調整作反向邊貢獻，讓關閉簡化時可重建直接關係。開啟時以最終淨額分出債務人與債權人，按剩餘絕對金額降序、穩定成員 ID 升序打破平手，每次配對兩邊最小金額並消耗至少一方。比較候選與直接安排筆數，只採不多於直接安排的結果，否則沿用直接安排。固定排序及演算法版本，不宣稱全域最少筆數。
- **Rationale**: 淨額配對每一步保留各人的總淨額，最多產生非零淨額成員數減一筆；但一般貪婪法不保證比任意直接圖更少，故另加筆數比較保障 FR-023。此為本專案推導的演算法，不宣稱複製 Splitwise 內部實作。後端由相同資料產出建議與最多三句的模板說明，不需 LLM；無改道則明說未變。直接圖即使成員淨額為零仍可有中介或循環邊，不能用淨額取代關閉模式的來源。
- **Alternatives considered**:
  - 僅用淨額計算所有模式：無法保留 Alice→Bob→Carol 的直接關係。
  - 枚舉全域最少轉帳方案：規格只要求不增加筆數，無需引入組合搜尋成本。

## 決策 5：旅行交易鎖、一致性讀取與版本化確認

- **Decision**: 所有影響分帳的寫入（含既有支出修改/刪除）先驗證 owner 並在 READ COMMITTED 交易取得旅行列 FOR UPDATE，再讀來源、驗證、寫入及增加旅行帳務 revision。所有路徑採旅行→子資源的一致鎖序；分帳多查詢讀取用 REPEATABLE READ read-only snapshot。超額警告及取整預覽攜帶 revision、成員、幣別與精確金額；明確確認在寫入交易中重算比對，版本改變須刷新結果並重新確認，不能用客戶端布林值繞過警告。還款沿用建立前穩定識別與結果查證，避免回應遺失後盲目重送。
- **Rationale**: 同 owner 多裝置仍可能競爭。現有 expense POST 只取旅行 KEY SHARE，PATCH 鎖支出、DELETE 直接刪除，不能保護跨支出還款計算，實作時須一起調整。PostgreSQL [列鎖](https://www.postgresql.org/docs/18/explicit-locking.html) 與 [交易隔離](https://www.postgresql.org/docs/18/transaction-iso.html) 說明鎖衝突及不同讀取快照性質；旅行鎖有效的前提是所有寫入路徑遵守此協定。
- **Alternatives considered**:
  - 只相信前端快取餘額與確認旗標：可能保存使用者未看過的反轉結果。
  - 全面 SERIALIZABLE：可行但需處理重試；旅行級短交易更符合本輪範圍。

## 決策 6：owner 也使用旅行成員識別並以資料庫約束名稱唯一

- **Decision**: owner 與同行者納入同一旅行成員命名空間，owner 成員記錄保存旅行內顯示名稱，不以每次 Google profile 名稱作動態關聯；穩定 ID 與角色分離。名稱鍵沿用現有分類的 trim 與 ASCII A-Z 不分大小寫策略，唯一鍵涵蓋整趟旅行且不過濾停用者。改名保存原名不與自己衝突，所有選取與關聯採 ID。詳細表與約束由 data-plan 定義。
- **Rationale**: 同一個唯一鍵可保護 owner、啟用及停用同行者間的衝突與競爭；現有 categories 已用 translate/生成名稱鍵，可保持一致。Google profile 後續改名不應繞過旅行唯一性限制。跨旅行名稱各自獨立。
- **Alternatives considered**:
  - 只有前端檢查：兩個裝置可能同時建立重名。
  - owner 名稱每次取 Google profile：外部改名可能產生旅行內衝突。

## 決策 7：以新增 migration 回填既有個人支出

- **Decision**: 延續 apps/api/src/db/migrate.ts 的 checksum、單一交易及 migration advisory lock；新增 SQL migration，不改已套用檔。每趟旅行建立唯一 owner 成員，既有 expenses 回填其付款人與單一 owner 分攤關聯，再補 NOT NULL、唯一鍵、owner/trip 複合外鍵。啟用新程式前完成 migration；上線時停止舊程式寫入，避免舊版新增缺少分攤關聯。不變動 auth schema 或原始 amount_minor、minor_unit、日期、分類。
- **Rationale**: 回填後每筆舊支出的付款與負擔相等，不產生債務；驗證逐筆原值、幣別總額與支出筆數一致。正式執行前需隔離還原驗證及備份；本輪沒有執行任何 migration。過程可能持鎖，所需時間待以資料量量測。
- **Alternatives considered**:
  - 永久缺省解讀 owner：舊新資料存在兩套語意與查詢分支。
  - 重寫初始 migration：破壞現有 checksum 與已部署資料庫的演進歷史。

## 決策 8：以不變量與端到端旅程驗證研究方向

- **Decision**: Vitest 驗有理數正規化、加減比較、取整及隨機生成零和資料；驗每筆份額和等於支出、每幣別淨額和為零、簡化前後淨額一致且筆數不增、排序可重現。後端 E2E 驗真實持久化、競爭重名、確認版本過期、還款加調整原子性、隔離與回填；前端 E2E 驗手機/桌機、鍵盤、精確顯示、三句說明及超額確認/取消。
- **Rationale**: 驗收已有 JPY 100/3、兩種取整與超額反轉的明確 oracle，可驗結果而不綁演算法細節。實作階段另量測多種互質分母的 BigInt 增長、整趟旅行讀取與 migration 時間；目前沒有證據可宣稱效能上限或已完成端到端驗證。
- **Alternatives considered**:
  - 僅跑四份 acceptance 的 happy path：不足以保障分數累積與競爭。
  - 以畫面截圖當帳務 oracle：不能證明精確數值與權威狀態。

## Handoff 與殘餘風險

可進入 system-analysis；API/data owner 接續細化 revision、確認契約、分數字串邊界、成對調整與來源識別，不在本輪改 API/data truth。UI owner 定義循環小數展開及付款預覽。極小餘額四捨五入可能為零，而目前還款必須為正數：不能偽造零元還款，需由後續規格澄清是否允許單獨尾差結清；這是已識別的業務邊界，尚不宣稱研究已覆蓋其正式驗收。實作前須補該案例。其他剩餘驗證為效能、遷移時間及競爭 E2E，均未在本輪執行。
