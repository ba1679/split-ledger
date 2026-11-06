# Phase 0 研究：統一程式碼排版

研究日期：2026-11-06。Plan：`002-code-formatting`。

## 已確認的前提

- 使用者選擇依邏輯分段、基本 ESLint 加空行規則、先少量示範；本輪已確認兩個示範並同意繼續套用。
- 既有 techstack 已寫明 React webapp、獨立 TypeScript API、前後端 Playwright Test + playwright-bdd E2E 與 Vitest 規則測試；本輪不改判，必問條件均有既有 truth 依據。
- `.agents/constitution/` 不存在，無其他憲法約束可讀取。001 規劃保留歷史，002 保存本輪維護需求與研究。

## 決策 1：以 Prettier 統一全專案排版

- **Decision**: 採用已試行安裝的 Prettier 3.9.10；2 格縮排、單引號、分號、100 字元目標行寬、支援位置保留尾逗號。提供 `pnpm format` 與 `pnpm format:check`，共用根設定與忽略清單。
- **Rationale**: 兩個代表檔案已獲使用者確認，沿用相同設定可統一手寫程式、測試與設定檔。`--write` 與 `--check` 分別提供整理與唯讀檢查入口；忽略清單將歷史規格、來源快照及 migration 排除。[Prettier CLI](https://prettier.io/docs/cli)。
- **Alternatives considered**:
  - 只手動排版：可表達邏輯分段，但難以持續維持全專案縮排與換行一致。
  - 換成另一套 formatter/linter：需要重新選型與驗證，已確認的 Prettier 示範沒有此需求。

## 決策 2：ESLint 管固定空行，人工判斷邏輯分段

- **Decision**: 保留 ESLint 10.14.0 與 typescript-eslint 8.72.1 基本規則，使用 @stylistic/eslint-plugin 5.10.0 的 `padding-line-between-statements`，要求 imports 與主體之間、函式之間、回傳之前留空行。其他驗證、查詢、保存步驟依上下文分段，不逐行加空行。
- **Rationale**: Prettier 主要保留原有空行，無法自動判斷業務階段；有限的語法規則加上有意義的分段符合示範的閱讀節奏。保留相鄰相關宣告，避免機械地拉長每個變數。[Prettier 空行處理](https://prettier.io/docs/rationale#empty-lines)、[Stylistic padding 規則](https://eslint.style/rules/padding-line-between-statements)。安裝的套件 peer 範圍已確認支援 ESLint 10。
- **Alternatives considered**:
  - 只執行 Prettier：能整理縮排，無法持續要求缺少的固定空行。
  - 強制每個宣告或每個判斷之間加空行：會拆散相關語句，超過使用者確認的留白密度。

## 決策 3：分開執行 formatter 與 linter

- **Decision**: 使用 eslint-config-prettier 10.1.8 作為 ESLint 最後一個設定，關閉排版衝突；`pnpm lint:fix` 後執行 `pnpm format`，再以 `pnpm lint` 與 `pnpm format:check` 驗證。保留既有基本品質範圍，不新增更嚴格的功能或 React 規則，也不加入 commit hooks 或 CI 流程。
- **Rationale**: 排版與程式品質各有獨立指令，方便閱讀錯誤與使用編輯器。這也符合官方將 Prettier 與 lint 分開執行的整合方式。[Prettier 整合說明](https://prettier.io/docs/integrating-with-linters)。版本沿用已驗證的試行依賴並固定在 package/lockfile。
- **Alternatives considered**:
  - eslint-plugin-prettier：把 formatter 放進 lint 執行，多一層整合，本案沒有需要。
  - 同時引入 Hooks、非同步安全、commit hooks 與 CI gate：超過本輪已選定的基本檢查範圍。

## 決策 4：沿用各端 BDD 與既有測試策略驗證回歸

- **Decision**: 前端維持 Playwright Test + playwright-bdd 瀏覽器 E2E；後端維持 Playwright Test + playwright-bdd + APIRequestContext API/資料庫 E2E。執行既有型別、建置、單元與前後端回歸，並額外比對整理前後的編譯後語法樹（忽略排版、註解及多餘括號）、檢查格式化冪等性。
- **Rationale**: 本輪只改可讀性與工具規範，既有 acceptance、interface feature、DSL、API 與 data truth 無需新增語意。編譯輸出一致可直接補強純排版的驗證證據；既有 E2E 繼續驗證畫面與 API 的實際行為。驗證結果與環境限制如實寫入 validation.md。
- **Alternatives considered**:
  - 新增排版專用 Gherkin：語法工具已有直接檢查入口，新增業務案例會重複工具責任。
  - 僅以格式檢查當作功能驗證：無法涵蓋既有應用與測試的相容性，因此保留回歸策略。

## 殘餘限制

空行工具僅理解語法，不保證每個業務階段都被最佳分段；後續維護仍依 README 的閱讀原則判斷。React Doctor 從 81/15 個提醒變成 80/17 個提醒；新增兩項是格式化展開行數後的元件長度提醒，對應編譯後語法一致，未藉此修改元件架構或壓抑規則。WebKit 在本機 mac14-arm64 的凍結版本無法建立 page，出現 `Unknown setting: PushAPIEnabled`，本輪無法宣稱完成 WebKit 回歸；詳見 validation.md。
