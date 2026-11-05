# Phase 1A 資料模型與落地規則

[data-model.dbml](data-model.dbml) 是目前完整的資料關聯圖。本文件補充 DBML 無法精確表達的 PostgreSQL 約束、查詢與交易行為。它是 migration 設計依據；目前尚未建立資料庫或執行 migration。

## 表與資料生命週期

| 表 | 誰管理 | 保存甚麼 | 刪除規則 |
| --- | --- | --- | --- |
| `auth.user`、`auth.session`、`auth.account`、`auth.verification` | Better Auth + 對應 Drizzle migration | Google 身分、登入 session 及框架暫時驗證資料 | Session/Account 由框架處理；本期不提供刪除帳號 |
| `trips` | 應用 | 本人旅行、各自可空的起迄日 | 本期無旅行刪除 API；被支出引用時禁止刪除 |
| `categories` | 應用 | 本人跨旅行共用的分類名稱 | 有任何支出引用時禁止刪除；改名保留同一 id |
| `expenses` | 應用 | 本人某趟旅行的原幣別金額與日期 | 可修改或刪除；不保留舊版快照 |
| `currencies` | 應用封存的 SIX List One | 可選代碼、名稱、目前位數及來源日期 | 被支出引用的代碼不得刪除；退役可標成不可選 |

Better Auth 官方目前列出四張核心表，`user.id`、`session.userId`、`account.userId` 都是字串，OAuth account 另以 `(providerId, accountId)` 辨識外部身分；Drizzle adapter 支援 PostgreSQL `schemaName`。本模型把四表置於 `auth` schema，並把 Drizzle property 對應到 snake_case SQL 欄名。**固定相容套件版本後**，Setup 須執行 Better Auth 的 schema generate，對照四表所有必填欄位與索引，再用 Drizzle Kit 產生及檢閱 SQL migration；不能把這份 DBML 當成已驗證過的 auth migration。若套件生成結果不同，先調整映射和本模型再執行 migration。[Better Auth 核心資料庫結構](https://better-auth.com/docs/concepts/database)、[Drizzle adapter](https://better-auth.com/docs/adapters/drizzle)。

本版只開 Google provider；`auth.account.password` 是框架核心可空欄位，不代表開放密碼登入。OAuth token、session token 與 verification.value 僅由 auth 模組及受限資料庫權限處理，不進入業務 API、日誌或測試快照。`trips` 和 `categories` 對 `auth.user` 用 `ON DELETE RESTRICT`，因此本期不啟用 Better Auth 的 `deleteUser`。未來若要刪除帳號，需先另定資料清除與備份政策，不能直接刪 auth row。[Better Auth user/account 說明](https://better-auth.com/docs/concepts/users-accounts)。

## 可由資料庫保證的條件

- 業務 `id` 用客戶端產生的 UUID primary key；`owner_id` 用已驗證 session 的 Better Auth `user.id`，型別為 text。API 不接受 owner 欄位。UUID 撞號由 PK 唯一違反轉成 `409 ID_CONFLICT`，不暴露另一帳號的紀錄。
- `trips`、`categories` 各有 `(owner_id, id)` 唯一鍵，供 `expenses` 的 `(owner_id, trip_id)`、`(owner_id, category_id)` 複合外鍵引用。`category_id` 為 null 時採 PostgreSQL 預設 `MATCH SIMPLE`，表示未分類；有值時，兩個複合外鍵同時禁止把自己的支出連到別人的旅行或分類。外鍵是**關聯完整性**；所有讀寫查詢仍須依 session `owner_id` 篩選，不能把外鍵誤當讀取授權。
- `expenses.category_id` 外鍵採 `ON DELETE RESTRICT`，不是 `SET NULL` 或 `CASCADE`。分類刪除與新支出同時發生時，外鍵鎖與約束決定結果；刪除若碰到使用中分類，以該外鍵名稱辨識 `23503`，回 `409 CATEGORY_IN_USE`。不能只根據先前畫面顯示的 `usageCount` 作決策。支出移除分類後才可刪除該分類。
- `trips.start_date` 與 `end_date` 各自 nullable，`CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date)`。`expenses.spent_on` 非空，使用 DATE；不對照旅行日期範圍。API 自裝置送來 `YYYY-MM-DD`，不經時區轉換。伺服器先驗證實際存在的 Gregorian 日期。
- `expenses.amount_minor` 是正整數 BIGINT，`CHECK (amount_minor > 0)`；`minor_unit` 為歷史位數，`CHECK (minor_unit BETWEEN 0 AND 4)`。`currencies.minor_unit` 同樣 0–4、`code` 是三碼大寫。新建/改幣別時，API 先從固定快照取得可選代碼與位數，再用 BigInt 把十進位**大單位字串**轉成最小單位，拒絕零、負數、超位數和超過 `9223372036854775807`。資料庫外鍵只保證代碼存在；`is_selectable` 和該筆位數必須由 API 在寫入時檢查。
- `created_at` / `updated_at` 為 `timestamptz`，記錄事件時間；旅行/支出日為 `date`，記錄日曆日期。新增使用資料庫時鐘；修改時由業務 SQL 同次更新 `updated_at`。列表排序採 `(created_at,id)` 或 `(spent_on,id)`，避免時間相同時頁面不穩定。

分類的「最多 30 個字」採 Unicode code point 計數，對應 PostgreSQL UTF-8 的 `char_length` 與 JS `Array.from(name).length`。先移除名稱前後空白，再計長；只含空白會成為空字串。與 API 一致，重名比較**只**把 ASCII `A–Z` 轉小寫，其他 Unicode 字形、重音和內部空白保持原樣；不同 owner 可同名。資料庫的 generated `name_key` 與 `(owner_id,name_key)` 唯一鍵阻止兩個請求同時建立/改成相同名稱；自己保留原名不衝突。對應 `23505` 回 `409 CATEGORY_NAME_CONFLICT`。

以下是 migration 應實現的核心 SQL 語意片段，**不是已執行的 migration**；實際執行順序與生成 DDL 由 Setup 驗證。`app_trim` 的字符集合對應 ECMAScript `String.trim()` 在本案支援的 Node 版本；包含常見空白、NBSP、全形空白及 BOM，不能只用 PostgreSQL 預設 `btrim(name)`（它只移除一般空格）：

```sql
CREATE FUNCTION app_trim(text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT btrim($1, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')
$$;

-- categories.name_key 由資料庫產生，業務程式不能自行寫入。
name_key text COLLATE "C" GENERATED ALWAYS AS (
  translate(name, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')
) STORED,
CONSTRAINT categories_name_valid CHECK (
  name = app_trim(name) AND char_length(name) BETWEEN 1 AND 30
),
CONSTRAINT categories_owner_name_key_uq UNIQUE (owner_id, name_key)

-- 其他表的關鍵 CHECK / FK 語意；具體 ALTER TABLE 由 migration 產生。
CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date)
CHECK (amount_minor > 0)
CHECK (minor_unit BETWEEN 0 AND 4)
FOREIGN KEY (owner_id, trip_id) REFERENCES trips (owner_id, id) ON DELETE RESTRICT
FOREIGN KEY (owner_id, category_id) REFERENCES categories (owner_id, id) ON DELETE RESTRICT
```

`trips.name`、`expenses.item` 也要求 `value = app_trim(value)` 且非空；API 在送到資料庫前先 trim，再按正規化後值驗證。`name_key` 用確定性 `C` collation，避免資料庫 locale 改變重名判定；不用 locale 敏感的 `lower()` 或 `citext`。資料庫與 JavaScript 對各種空白、emoji code point、ASCII 大小寫及 Unicode 相似字要有同一組邊界測試。[PostgreSQL 字串函式](https://www.postgresql.org/docs/current/functions-string.html)、[約束](https://www.postgresql.org/docs/current/ddl-constraints.html)、[生成欄](https://www.postgresql.org/docs/current/ddl-generated-columns.html)。

## 查詢、交易與索引

- `Trip.expenseCount`、`ExpenseList.totalCount`、`Category.usageCount` 由目前 `expenses` 權威資料計算，不在其他表維護快取欄位。旅行列表先以 owner 和 `(created_at,id)` 取得一頁，再對該頁旅行批次計數；分類列表一次 LEFT JOIN 或子查詢按分類計數，避免每列另發一個 SQL。支出清單的 page 與 totalCount 應在同一 SQL statement 或同一一致性 snapshot 取得，避免兩個查詢之間有新寫入時數字和頁面互相矛盾。
- 支出列表依 `owner_id,trip_id` 篩選，按 `spent_on,id` 降序；索引 `(owner_id,trip_id,spent_on,id)` 承接查詢/游標。旅行列表用 `(owner_id,created_at,id)`；分類列表依 API 的名稱與 id 升序，採 `(owner_id,name,id)`。`expenses(owner_id,category_id)` 支援分類使用筆數與 FK 刪除檢查。165 項幣別目錄直接掃描並排序，無額外布林索引。實作後以 `EXPLAIN (ANALYZE, BUFFERS)` 對真實量級確認索引效益，不預先建立每欄索引。
- PATCH 旅行日期時，在交易中 `SELECT ... FOR UPDATE` 鎖定該筆本人旅行，合併省略/清除/新值後檢查完整起迄日，再一次更新；日期 CHECK 仍是最終保護，違反約束的 `23514` 映射 `400 VALIDATION_ERROR`，原日期不變。建立或 PATCH 支出時，先檢查 owner 的旅行與可選分類；PATCH 若需合併既有金額、幣別與位數，也在交易中鎖定本人支出，計算合併後規則，再一次更新。分類改名由唯一鍵防競爭；刪除由 `RESTRICT` 外鍵防競爭。金額及 count 不另存摘要，故成功修改/刪除一筆支出後下一次查詢直接反映結果。
- 某幣別的每筆紀錄保留寫入時 `minor_unit`。若封存幣別資料之後更新，既有紀錄不重算；只改項目、日期或分類不重解讀金額，只改金額仍採該筆舊位數，真正改幣別才採新快照位數。統計按 `currency_code,minor_unit` 在 PostgreSQL `SUM(bigint)` 成 NUMERIC，驅動程式以**十進位整數字串**接收；每個 currency 至多五種位數，在後端用 BigInt 升到該組最大位數後加總。群組總額可超過 BIGINT 單筆範圍，仍以十進位字串回應，不轉成 JS Number，也不對不同幣別相加。幣別更新須在單一交易中封存新來源、更新可選條目並把退役代碼標不可選；本版只有初始快照，尚無自動更新工作。

## 實作前驗證

Setup 要固定 Better Auth、Drizzle 與 PostgreSQL 版本；生成 auth schema/migration 後核對 `auth.user` 參照、session/token 欄位和 ORM 欄位映射。正式與隔離測試資料庫使用**同一套**已檢閱的 migrations；建庫、回復及分類刪除/併發重名/跨 owner 外鍵/多幣別加總須在 PostgreSQL 上驗證。SIX 清單的發布日期 `2026-09-17`、來源檔 SHA-256 `33139b438657d1cee116ba737807ea71d19d6de4b90f799a09c56f0cc6a1b0ff` 與 165 個可選條目須與技術研究一致；`GET /api/currencies` 的 `snapshotDate` 由可選條目的共同 `snapshot_date` 取得，若匯入後不一致，啟動/資料驗證應失敗。[SIX List One](https://www.six-group.com/dam/download/financial-information/data-center/iso-currrency/lists/list-one.xml)。
