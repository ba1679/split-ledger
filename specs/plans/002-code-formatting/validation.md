# 排版維護驗證

日期：2026-11-06。執行環境：Node 24.22.2、pnpm 11.25.0；沿用既有 PostgreSQL 測試服務（54330）與隔離 worker 資料庫。

## 已完成檢查

| 項目 | 結果 |
| --- | --- |
| `pnpm format:check` | 通過全專案適用檔案的格式檢查 |
| `pnpm lint` | 通過既有基本規則與全專案空行規則 |
| `pnpm exec eslint-config-prettier apps/api/src/app.ts apps/web/src/features/trips/TripLedger.tsx` | 未發現衝突規則 |
| `pnpm typecheck` | shared、API、web 型別檢查通過 |
| `pnpm exec tsc -p tsconfig.tests.json` | 測試型別檢查通過 |
| `pnpm build` | shared、API、web 建置通過；最終 JSX 調整後重建通過 |
| `pnpm test:unit` | 17/17 通過 |
| `pnpm test:api` | 後端 BDD 40/40 通過（3.3s） |
| `pnpm test:web` | Chromium 48/48 通過；WebKit 在建立 page 時失敗，因重複環境錯誤中止，未完成 WebKit 驗證 |
| `pnpm test:support` | 後端支援測試 17/17 通過（3.7s） |
| `pnpm test:web-support --project chromium` | 前端支援測試 14/14 通過（8.6s） |
| `pnpm test:ui-quality --project chromium` | UI 品質測試 5/5 通過（8.9s），包含手機、平板與桌面寬度 |
| `pnpm test:smoke` | Chromium 2/2 通過；WebKit 2/2 在 page 建立階段失敗（整輪 32.6s），包含不載入應用的 browser runtime 案例 |
| 編譯後語法比較 | 292 個 TypeScript/TSX/JavaScript/MJS 檔與 HEAD 比較，在忽略排版、註解與多餘括號後一致；有意變更的 eslint.config.js 排除 |
| 重複整理 | 對 525 個 Git 追蹤或未忽略的新檔記錄雜湊，重跑 lint:fix、format、format:check、lint 後無檔案差異 |
| `git diff --check` | 通過 |

## 格式化相容性處理

- API fixture 的 `eslint-disable-next-line no-empty-pattern` 隨函式換行移到正確位置，保留原有 Playwright 必要的空物件參數。
- 旅行清單的日期與分類分隔符改以 `{' · '}` 表達，確保 JSX 換行後仍產生原本單一字串，編譯後語法比較一致。
- API/data/features/DSL truth、001 plan、skills、幣別資料快照與 SQL migrations 均無差異；techstack 僅更新本輪工具與現況敘述。

## 既有診斷與環境限制

React Doctor 使用 `npx --yes react-doctor@latest --verbose --scope changed`。本對話前一輪已對原版驗證出 81 分、15 個提醒；全面格式化後為 80 分、17 個提醒。新增項目為 DateField 與 ExpenseForm 的 `no-giant-component`，對應函式的編譯後語法相同，差異來自展開的原始碼行數。未變更診斷設定或抑制規則，也未為行數評分擴大重構範圍。其餘既有提醒仍存在。

WebKit trace 在使用應用畫面前的 page fixture 回報：`browserContext.newPage: Protocol error (Page.overrideSetting): Unknown setting: PushAPIEnabled`。不載入應用的 `browser runtime` smoke 案例也得到相同錯誤，因此判斷為本機瀏覽器與測試工具相容性限制。執行 `pnpm exec playwright install webkit` 顯示 mac14-arm64 使用不再更新的 frozen WebKit；本次環境無法完成該引擎驗證。保留 WebKit 測試設定與案例，不降級套件或改成跳過測試。

詳細執行日誌在忽略的 `.cache/format-validation/`；WebKit trace 位於 Playwright 的 test-results 產生目錄，不納入規格或版本管理。以上耗時僅是本機本輪測試結果，不是效能承諾。
