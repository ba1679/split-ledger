# 旅帳 Phase 1A API 契約說明

`openapi.yaml` 是業務 API 的單一入口：路徑在 `groups/`，請求、回應與參數在 `components/`。Phase 1A 僅有個人帳本；所有受保護端點從已驗證 session 取得 user id，任何請求都不得傳入或採信 owner id。正式契約要求 Better Auth 的 `advanced.cookies.session_token.name` 明確設成 `travelledger_session`，與 OpenAPI `BetterAuthSession` cookie scheme 一致；`x-session-required: true` 也標示需要登入的 operation。`GET /api/currencies` 為公開目錄。cookie 必須 HttpOnly、SameSite=Lax，正式 HTTPS 環境另設 Secure；採自訂名稱後仍須在 Setup 實際確認 Better Auth 不加不同的 Secure 前綴、反向代理完整轉送所有 Set-Cookie，且文件名稱與實際 cookie 一致。客戶端在同 origin 夾帶 cookie，生成 SDK 時也須保留 credentials。[Better Auth cookies](https://better-auth.com/docs/concepts/cookies)。

Google 登入、取消、callback、session 續期與登出由固定版本的 Better Auth Google provider 接手，掛在 `/api/auth/*`，不是本專案自行維護的業務 JSON operation。前端使用 Better Auth client 的 `signIn.social({ provider: "google" })`、`getSession` / `useSession`、`signOut`；`GET /api/me` 是為業務畫面及快取隔離提供的穩定最小投影。Google OAuth callback URL、trusted origins、HTTPS/Secure cookie、Fastify handler 所有 `Set-Cookie` 轉送及資料庫 session 都須在 Setup 驗證。[Better Auth Google](https://better-auth.com/docs/authentication/google)、[Fastify integration](https://better-auth.com/docs/integrations/fastify)、[Session management](https://better-auth.com/docs/concepts/session-management)、[Drizzle adapter](https://better-auth.com/docs/adapters/drizzle)。自動測試只控制外部 Google 身分回應，仍驗證真實本地 session 與權限；實際 Google 串接另測。

使用 cookie 的業務寫入操作也需要 CSRF 防護：`POST`、`PATCH` 只接受 `application/json`（可帶 charset），拒絕表單與 `text/plain` 等簡單 content type；`DELETE` 不帶 body。這三種方法都由 API 在進入業務處理前，比對 `Origin` 與設定的對外同 origin / 明確允許的 trusted origin，完整比對 scheme、host、port；缺少 `Origin`、`Origin: null` 或不符者均回 `403 REQUEST_ORIGIN_REJECTED`，短訊息不含 cookie、token 或其他敏感內容。不依賴可由客戶端偽造的 `Host` 或未受信任的轉送標頭。`POST`/`PATCH` 的 content type 不符或 `DELETE` 帶 body 回 `400 VALIDATION_ERROR`。來源檢查先於本文驗證；受控的 HTTP E2E 測試需明確送入測試環境允許的 `Origin`，同時測試缺少或不符 `Origin` 不能寫入；瀏覽器流程沿用實際頁面的同 origin。這是業務 API 自身的檢查，Better Auth 對 `/api/auth/*` 的保護不會自動涵蓋它；CORS 只限制瀏覽器跨來源讀取回應，不能代替權限或 CSRF 驗證，SameSite=Lax 也不是唯一防線。[OWASP CSRF 防護建議](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)、[Better Auth security](https://better-auth.com/docs/reference/security)。

## 欄位與一致性

- `id`：三種建立請求都由客戶端先產生 UUID 並保存至該次操作完成。伺服器驗證格式和唯一性，資料的 owner 仍由 session 決定。這提供查證不確定回應的識別，不代表伺服器自動實作 idempotency 或可以無條件重送。
- `name` / `item`：移除前後空白後拒絕空值。分類名稱另須在**去空白後**長度為 1–30 個 Unicode code points，以 PostgreSQL `char_length` / JS `Array.from` 一致計數；不可先用 raw request 的 `maxLength: 30` 拒絕「空白 + 30 字 + 空白」。同帳號分類名稱唯一，canonical key 只把 ASCII `A–Z` 轉小寫，不摺疊內部空白、重音或其他 Unicode 字形；異帳號可以同名，改名成自己現有名稱可成功。資料庫須用 `owner_id + canonical_name` 唯一約束保護併發建立/改名。
- 金額：API 傳十進位**大單位字串**，例如 `"12.50"`，回應依該筆記錄保存的 `minorUnit` 補足位數。金額必須大於 0，選定幣別必須存在固定 SIX List One 快照，位數不得超過當筆適用 `minorUnit`；轉最小單位後不超過 `9223372036854775807`，不做浮點、截斷、四捨五入或換匯。前端在輸入時擋負號與超出位數的字元/整筆貼上，後端仍獨立驗證。變更幣別時，原大單位數值只在新幣別規則容許時保留；不合規須使用者手動修正。單改項目、日期或分類不得重解讀歷史金額；單改金額但幣別未變，使用該筆保存的 `minorUnit`；幣別實際改變時使用新幣別目前快照的位數。
- 歷史幣別位數：每筆支出保存 `currencyCode`、最小單位整數與適用 `minorUnit`。快照更新不能重算舊紀錄。同一代碼若有不同歷史位數，總額先精確升到該組**最大** `minorUnit` 再加總，回傳該位數；例如位數 1 的 `12.3` 加位數 2 的 `1.23` 為 `13.53`。PostgreSQL `SUM(bigint)` 可能回傳 NUMERIC，必須以精確整數/十進位字串接住；不能轉 JS Number。每筆金額仍受 BIGINT 範圍約束，群組總額可以超過單筆 BIGINT 範圍，不應在資料庫聚合時溢位。
- 日期：請求與回應為真實的 Gregorian `YYYY-MM-DD` 日曆日期，不帶時區；支出預設日期由裝置本地時計算後送出，伺服器不猜裝置日期。旅行日期可各自為 null，有兩端時需 `endDate >= startDate`。支出日期不受旅行日期區間限制。
- 所有 JSON object 只接受列出的欄位。Fastify/TypeBox 的 JSON body 驗證須關閉 `removeAdditional` 與可能把非法輸入變成合法值的 `coerceTypes`；名稱去空白為明示的業務正規化，金額不可自動修正。HTTP query 本來是字串，`limit` 先以完整十進位正整數字串（例如 `50`）嚴格解析，再驗證 1–100；`50abc`、浮點和空字串拒絕，不能依賴寬鬆的數字轉型。路徑/查詢參數錯誤、額外欄位、非法日期與金額回 `400 VALIDATION_ERROR`。Setup 需以真實 Fastify request 驗證 body 與 query 的不同解析路徑。

## 查詢、錯誤及未知結果

- 本人資源以 session 的 user id 過濾；不存在、他人所有、或 expense 不在指定 trip，一律回相同 `404 NOT_FOUND`，不得洩漏別人 id 或資料。未登入回 `401 UNAUTHENTICATED`。分類被支出引用時 `409 CATEGORY_IN_USE`，名稱重複時 `409 CATEGORY_NAME_CONFLICT`。建立 UUID 撞號時 `409 ID_CONFLICT`，不回衝突紀錄。其他伺服器失敗為 `500 INTERNAL_ERROR`；訊息不包含 cookie、token 或完整私人支出資料。網路斷線/逾時是客戶端未收到結果，**不等同**上述 HTTP 錯誤碼。
- 分頁預設 50、最多 100，cursor 不透明且綁定帳號與排序條件，不可用另一帳號的 cursor。Trip 依 `createdAt,id` 降序，Expense 依 `spentOn,id` 降序。`Trip.expenseCount` 和 `ExpenseList.totalCount` 是整趟旅行的目前總筆數，不是目前載入的頁數；資料修改後前端應重新查詢清單、總額及筆數。分類 `usageCount` 是本人所有旅行目前引用筆數，改分類或刪支出後會更新。
- 對 `POST` 建立請求若逾時或回應遺失，前端保留該次 UUID，先使用 `GET /api/trips/{id}`、`GET /api/trips/{tripId}/expenses/{id}` 或 `GET /api/categories/{id}` 查證；若查到即按已保存處理。暫時 `404` 仍可能是原請求尚在處理，畫面需顯示「結果未確認」並提供重新整理/人工核對入口，不盲目產生新 UUID 重送；mutation 不自動重試。這不是 exactly-once 保證。`PATCH` 或 `DELETE` 的網路結果不明時也應重新讀取資源及統計，不先宣稱保存成功或失敗。
- 分類刪除的權威判斷在資料庫關聯上；不能只看先前取得的 `usageCount`。分類改名後，支出回應由關聯查目前名稱。刪除未使用分類成功後，裝置 localStorage 保存的舊 id 由前端在下次表單載入與本人分類清單比對，找不到便不預選；localStorage 偏好須按帳號分隔，不存 secret。

此契約是規劃產物，尚未安裝套件、運行服務或完成 Google 真實登入；實作時需讓同一 TypeBox/JSON Schema 契約驅動驗證與 OpenAPI 輸出，避免文件與 runtime 分歧。
