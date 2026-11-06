# Phase 0 研究：前端設計系統與樣式遷移

研究日期：2026-11-06。決策是本計畫的實作方向，尚未安裝或完成示範；版本與相容性須在實作時驗證。既有 BDD、測試策略與前後端邊界已載於 techstack truth，本輪沿用。

## 決策 1：Tailwind CSS 與語意設計值

- **Decision**: 採用 Tailwind CSS 與 Vite 整合，將共用顏色、字體、間距、圓角及焦點等設計決策以 CSS 自訂屬性與 Tailwind theme 對應；保留少量必要的基礎或特殊 CSS。以現有視覺值為初始基準。
- **Rationale**: 既有 CSS 已有部分 root 變數，但仍有集中式規則與硬編碼值。Tailwind 的 theme 可生成工具類並與 CSS 變數互用，利於逐步遷移和共同維護。[官方 theme 文件](https://tailwindcss.com/docs/theme)、[Vite 整合](https://tailwindcss.com/docs/installation/using-vite)。Preflight 會影響全域元素，示範階段應評估暫緩或分層引入，並驗證新舊規則的 cascade；[官方 Preflight 文件](https://tailwindcss.com/docs/preflight)。避免機械式替換造成冗長 class，以共用元件承載重複模式。
- **Alternatives considered**:
  - CSS Modules 搭配 CSS 變數：可隔離樣式且依賴較少，但需自行建立共用元件和樣式慣例。
  - 僅整理現有 CSS：改動較小，但對共用元件及後續樣式一致性支援較少。

## 決策 2：按需採用 shadcn/ui 元件

- **Decision**: 使用 shadcn/ui 作為本地可維護的共用元件起點，按需求引入及調整，而非一次替換所有元件；互動元件的底層選擇及行為需逐項驗證。示範以既有介面為基準，使用者確認後再遷移其餘介面。
- **Rationale**: shadcn/ui 提供可修改的元件程式與語意 CSS 變數，可適應既有視覺，並支援現有 Vite 專案。[介紹](https://ui.shadcn.com/docs)、[Vite 安裝](https://ui.shadcn.com/docs/installation/vite)、[主題](https://ui.shadcn.com/docs/theming)。程式進入專案後維護與升級責任由專案承擔；不得假設任何預設元件自動符合現有互動。既有原生 dialog 的關閉、忙碌、焦點還原及日期選擇器等行為應逐項保留和測試。
- **Alternatives considered**:
  - 僅使用 Tailwind 並自行建立元件：依賴較少，但互動與共用模式需自行持續維護。
  - 完整預設外觀的元件庫：可快速組裝，但覆寫視覺與維持現有行為的成本較難控制。

## 決策 3：圖示套件

- **Decision**: 採用 `lucide-react`，逐項將現有手繪圖示對應至語意相符圖示，統一尺寸、線寬與無障礙使用方式。
- **Rationale**: 提供獨立 React 圖示元件與可調整樣式，適合取代現有 `Icon.tsx` 的手繪圖形；圖示實際相似度與命名須在示範中核對。[Lucide React](https://lucide.dev/guide/react/)。裝飾性圖示隱藏於輔助技術，只有圖示的操作控制項需有可辨識名稱。
- **Alternatives considered**:
  - `react-icons`：集合多個來源，但一致風格與套件邊界需要額外管理。
  - 保留自行繪製 SVG：可完全控制外觀，但無法達成減少自行維護圖示的目標。

## 決策 4：遷移與驗證

- **Decision**: 先盤點頁面、互動狀態與圖示；選含共用元件及圖示的代表性完整區塊作示範，保留遷移前桌面與行動視覺基準並展示供使用者確認。獲確認後一次處理其餘遷移，最後清除無用舊規則。既有前端與後端 Gherkin 仍由 Playwright Test + playwright-bdd 執行，前端為瀏覽器到 API 的 E2E，後端以 APIRequestContext 驗 API 與權威狀態；Vitest 繼續覆蓋純規則。
- **Rationale**: 與已確認的兩階段交付一致，並以既有測試加畫面對照、鍵盤、焦點、欄位及錯誤訊息的無障礙語意，以及載入、成功、失敗狀態與失敗後操作的檢查控制回歸；截圖基準需在相同環境、字型、資料與 viewport 下比較，避免將環境差異當成變更。[Playwright 視覺比較](https://playwright.dev/docs/test-snapshots)。保留 Chromium、WebKit、行動 viewport 與手動手機驗證；示範範圍、圖示映射和可接受的小差異須在實際展示時確認。未驗證 bundle、實際瀏覽器相容性及可存取性，須於實作驗證。
- **Alternatives considered**:
  - 一次全站遷移後再確認：違反使用者指定的先示範確認節點。
  - 僅靠截圖比對：不能證明鍵盤、焦點、資料與互動行為維持正常。
