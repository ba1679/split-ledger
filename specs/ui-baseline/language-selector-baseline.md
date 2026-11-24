# 語言切換 UI 基準 v0.4

2026-11-24，Asia/Taipei。回填 Plan 008 的 IF-01 C 類語言入口。產品來源為 Git 起點 `228109265ddc3384853745b1083edb1f94ce3579` 加上 [實作原始碼指紋](evidence/language-product-source-sha256.txt)，指紋清單 SHA256 為 `a1ab54e69453343a15a3469ad3170d7bd35f9a1c5413ca5b4f8d8622e7cce5b7`。這批實作仍在工作樹，應以指紋辨識已驗收產品版本。

- 設計檔為 [split-ledger.pen](split-ledger.pen)，由 Pen CLI 0.3.18 儲存，格式 2.25。SHA256 為 `ab8d439c84e177774d165aa96c1ab47ccd6e3c3ad810c19bc8fb612d6fae9f3d`。
- 狀態 `approved`。使用者先確認 [Pencil d1](../plans/008-bilingual-interface/ui/ui-plan.md)，再針對下表三張最新版實作畫面回覆「包含」。產品畫面確認記錄於 [T091](../plans/008-bilingual-interface/tasks.md) 及 [驗證紀錄](../plans/008-bilingual-interface/validation.md)。
- 現況基準回填涵蓋語言選單、三張代表畫面的入口與同畫面狀態。全站中英文文案與排版另由 T084 驗收。

## 畫面索引

三張產品畫面均於 Chromium 取得。Pencil 預覽採相同 viewport，登入、帳本、待確認畫面依本次真實產品資料建立可編輯圖層。Pencil 沿用 Noto Sans TC 與 Noto Serif TC，瀏覽器使用實作的系統字型及 Georgia，因此字形與部分間距可能有細差。

| 穩定畫面 ID | Frame | 尺寸與狀態 | 同版 Pencil 預覽 | 已確認實作畫面 |
| --- | --- | --- | --- | --- |
| `login/language/mobile` | `pqjS7` | 390×844，登入區右上，繁體中文選單展開 | [Pencil 預覽](previews/language-login-mobile.png) | [手機登入](evidence/language-login-mobile-product.png) |
| `shell/language/desktop` | `p3HrQ` | 1440×900，帳本側欄底部，English 選單向上展開 | [Pencil 預覽](previews/language-ledger-desktop.png) | [桌機帳本](evidence/language-ledger-desktop-product.png) |
| `shell/language/mobile/pending` | `IdwIn` | 390×844，已捲至還款待確認區，頂列仍可切換，English 選單收合 | [Pencil 預覽](previews/language-repayment-mobile.png) | [手機還款待確認](evidence/language-repayment-mobile-product.png) |

## 共用元件與開發落點

- 版本索引 `t3WCVr` 位於 `QBbzP`，共用選單元件庫 `lHqw6` 位於 `OKWYQ`，產品畫面分組 `qkUqv` 位於 `nObqJ`。可查看同版 [索引](previews/baseline-index.png)、[元件庫](previews/baseline-components.png) 和 [產品畫面](previews/baseline-screens.png)。
- `LanguageMenu` 使用 142×44 px 的 outline 按鈕、174 px 浮層與 48 px 選項。展開時箭頭反轉，選中的語言以淡綠底和勾號呈現。手機登入與頁內頂列向下展開，桌機側欄向上展開。手機待確認頁的黏附頂列保留底部導覽與查證動作。
- 實作位於 `apps/web/src/components/LanguageMenu.tsx`、`language-menu.css`、`AppShell.tsx`、`Login.tsx`、`TripLedger.tsx`、`IndependentRepayment.tsx`，以及 `i18n/runtime.ts`。手動偏好與保留草稿／查證行為以 [前端 truth](../truth/features/frontend/design-system/手動語言切換.feature) 為準。

| 選單狀態 | 共用元件 ID |
| --- | --- |
| 繁體中文收合／展開 | `EgGH0`／`nF4ry` |
| English 收合／展開 | `efbBF`／`p8Ma8J` |
| 繁體中文選中／English 選中 | `u0fOX`／`KT3Z1` |

## 整合核對

保留 1,504 個既有圖層 ID 與階層。Pen 格式升級將 12 個圖層的字重預設明確寫為 `normal`。以同一版本的 Pen 重新匯出 14 張既有畫面，回填前後的 PNG 位元組完全相同。三個畫布區域與新增畫面無重疊，全部元件引用可解析。詳見 [回填機械核對](evidence/language-backfill-checks.json)。
