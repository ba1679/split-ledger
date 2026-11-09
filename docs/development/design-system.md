# 前端設計基礎

## 選用元件
遵循 .agents/constitution/shared.md：共用且容易客製化時用 shadcn/ui；
商業邏輯元件、需要大量樣式或核心互動客製時自行撰寫，記錄實際原因。
FormDialog/DateField 的巢狀 modal、日期解析/月年/鍵盤/手機布局，及 SearchCombo 的
受控搜尋/選取/清空/焦點契約採自製；其內部 Input 與圖示仍共用。

## 設計值
權威位置：apps/web/src/design-system.css 的 :root。
- --bg/--panel：頁面/面板；--ink/--muted：主/次文字。
- --green/--green-hover：主要操作及hover；--soft：淺色互動底。
- --line/--danger/--focus：邊框、錯誤、鍵盤焦點。
- --serif：裝飾字體；--ds-card-*、--ds-button-radius、--ds-label-size：共用尺寸。

以用途命名；優先重用語意值，再依實際重複需求新增。Tailwind的journey theme映射同一批變數。
修改共用值前搜尋 var(--名稱) 的使用位置，確認正常、hover、focus、disabled及手機版面；
勿另在頁面重新定義同名root值。改動若影響對比，跑Google登入對比及相關狀態測試。
顏色變更不會自動決定hover色：需要一起檢查 --green-hover。

## 共用元件
Button：apps/web/src/components/ui/button.tsx，源自shadcn new-york registry。
保持 variant、size、asChild、ref 與原生button事件介面，不另包DesignButton。
- 主要操作：預設variant；次操作/Google登入：outline；文字操作：ghost配產品文字操作class。
- 危險操作：destructive；按鈕連結：Button asChild包React Router Link，保持link語意。
- 表單內非提交按鈕必須指定 type="button"；disabled/busy由產品狀態控制。
- custom className由cn合併，產品樣式放所屬頁面或元件CSS。

Input：apps/web/src/components/ui/input.tsx，保留原生input props/ref；仍需label與錯誤訊息。
產品卡片、帳本摘要及業務表單自行組合，不把帳務或權限規則塞進基本元件。

## 圖示與樣式
直接具名引入lucide-react，或使用components/Icon.tsx的語意映射。
裝飾SVG設aria-hidden；只有圖示的控制項需可存取名稱。不要自行維護SVG path。
styles/index.css只負責載入；base、responsive及頁面/元件CSS各自維護布局。
日期網格、錨點定位、原生dialog backdrop與裝飾圖形保留CSS，並遵循共用色彩與焦點值。
Tailwind透過Vite plugin在正式建置及Playwright fixture啟用；目前未載入Preflight。

## 驗證入口
pnpm typecheck、pnpm lint、pnpm format:check、pnpm --filter @split-ledger/web build。
行為回歸：pnpm test:web、pnpm test:web-support、pnpm test:ui-quality。
日常可篩Chromium；完整交付仍需WebKit與實機驗證。畫面測試檢查操作/狀態/溢出，
不維護截圖基準。已知環境限制及交付結果只記在003的evidence/delivery-summary.md。
