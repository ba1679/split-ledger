# 共用設計基準與可選 Prototype：Skill Chain 交接

## 交接狀態與下一步

- 日期：2026-11-13，Asia/Taipei。
- 專案：`ba1679/split-ledger`。來源工作區：`/Users/render.hh.lai/Desktop/render/split-ledger`；另一台電腦請使用自己的 checkout 路徑。
- 本分支：`codex/ui-design-baseline-handoff`，起點為 `297305e`。
- 本次僅交付此 handoff。未修改 skills、產品碼、truth、設計稿或 prototype，也尚未建立共用設計基準。
- 使用者已確認本文的 skill chain 修改方向與範圍；最新指示是先推送 handoff，讓另一台電腦接手。接手後先讀取本文、核對工作區，再依使用者的接續指示執行，不把本次 handoff 當作 skills 已完成修改。
- 下一個工作範圍是依已確認方案調整 skill chain；不是接續 006 的 DSL、tasks 或產品實作，也不是立即製作共用設計稿。

## 使用者已確認的目標與根因

使用者觀察到 006 prototype 製作偏久，而先前即使已有新設計，實作仍容易沿用既有產品版面。已確認：增加設計細節或重建完整 prototype，不能取代實作遵循設計與逐畫面比對。

現有流程把「設計稿 → 確認 → prototype 全面同步 → 前端 DSL／tasks → 實作」寫成強制順序。`/ui-plan` 的規則要求至少一個可操作 HTML、完整主流程；共用契約與下游 skills 又把 prototype 同步當成前置。只修改 `/ui-plan` 不足以解除下游阻擋。

另一個缺口是尚未定義共用現況設計的引用、版本與驗收後回填方式，容易讓每個 plan 重建自己的畫面與 prototype。

本次確認的改動層級：重寫 `/ui-plan` 主流程，並同步調整共用契約與上下游交接。保留適用的設計確認、產品畫面驗收、獨立審查與回歸要求。

## 核心決策

1. 先判斷 UI 影響，`/ui-plan` 不是所有需求的必經關卡。
2. 共用設計稿以已實作、已核對的現況為基準，作為新需求延伸的起點。
3. 有 UI 設計變更時，設計稿是主要交付與畫面驗收依據。
4. Prototype 是可選步驟，只回答需要體驗才能判斷的問題。
5. Plan 階段不預設用 React 或 HTML 重建完整頁面、響應式切版、假後端或帳務引擎。
6. 設計確認後才實作；先核對一組代表性桌機／手機畫面，再展開其他相關畫面。
7. 產品驗收完成後，才將本次變更更新回共用基準。

## 三種 UI 分流

| 分流 | 判斷依據 | 必要流程 |
| --- | --- | --- |
| A：沒有 UI 影響 | 不改變使用者可見資訊、操作或呈現，例如純後端效能改善 | 記錄不適用；跳過 `/ui-plan`、設計稿及 UI 驗收，仍完成適用的工程驗證 |
| B：影響既有畫面資料或行為，沒有設計變更 | 沿用既有資訊位置、元件及操作規則，例如修正計算結果 | 引用既有畫面與行為依據；不新增設計稿，驗證受影響行為，必要時比對畫面 |
| C：有 UI 設計變更 | 新增或改變排列、資訊位置、導覽、操作入口或可見狀態 | 進入 `/ui-plan`，交付受影響設計並取得確認；prototype 可選 |

- 依使用者可見影響判斷，不以修改的是前端還是後端檔案分類。例如後端新增錯誤碼若需要新增錯誤介面，可能屬 C。
- `/system-analysis` 在 `plan.md` 首次記錄分流、理由、受影響畫面／行為、設計依據與是否委派 `/ui-plan`。
- 同一 plan 可混合 A、B、C；只阻擋依賴待決設計或互動決策的範圍，其他工作可繼續。
- `/tasks` 與實作端核對實際範圍；單獨呼叫 `/bdd` 或 `/implement` 也要能判斷，不能因沒有 `ui/` 就一律停止。
- 若 B 的實作實際需要改變設計，將相關範圍升為 C，保留其他已驗證進度。

## 共用設計基準與存放責任

以下是已確認採用的方案位置；目錄尚未建立。

| 位置（相對 repo 根目錄） | 責任 |
| --- | --- |
| `specs/ui-baseline/split-ledger.pen` | 現行產品設計、共用元件與桌機／手機畫面 |
| `specs/ui-baseline/README.md` | 產品 commit、基準版本、穩定畫面 ID、涵蓋範圍、已知差異、更新紀錄 |
| `specs/ui-baseline/previews/` | 對應版本的預覽 |
| `specs/plans/NNN-*/ui/` | 單次需求設計、差異說明與有選用才建立的 prototype |

- 基準只描述已驗收現況，未實作提案留在 plan package。
- 新需求由對應 frame 延伸；未修改部分引用固定基準版本，修改部分保留足夠審查上下文，不複製全部產品畫面。
- 實作依據為「引用的基準＋本次已確認設計」；業務規則仍由 spec／truth owner 決定。現有產品不能自動覆蓋已確認的新設計。
- 基準可逐步建立，不必先完成全產品。C 類缺少基準時先核對並補必要範圍；B 類可先引用程式、既有驗收或現況截圖，不強迫補整套設計。
- `/ui-plan` 可在明確指定的「建立基準」模式承接首次建立；一般需求規劃仍只寫 plan-side `ui/**`。須同步修正現有 skill 的寫入邊界，不能默默擴權。
- `/tasks` 安排驗收後回填任務，實作者更新、審查者核對，只更新本次相關部分；Git 保存歷史。
- 暫不新增獨立基準 skill，不建立共用 React prototype 專案。
- 基準既有有效確認不必逐次重問；本次新增或改變的設計意圖仍需確認。

## `/ui-plan` 的目標流程

僅對 C 類及明確指定的基準建立工作執行：

1. 讀取需求、UI 分流、相關 truth 與固定基準版本。
2. 定位受影響畫面，整理現況與需求差異。
3. 建立必要的 `.pen`、桌機／手機預覽及行為註記。
4. 展示並取得本次設計版本的確認，保留版本、範圍與回覆證據。
5. 若選用 prototype，完成指定互動與決策確認。
6. 交付畫面索引，交給 `/dsl-refine`、`/tasks`。

畫面需足以交接資訊位置、排列、操作與關鍵狀態；重複狀態可引用共用元件，不要求每頁重畫。設計意圖改變時，只重開受影響範圍的確認與下游依賴。

## Prototype 的選用與完成條件

在 `ui-plan.md` 用最小區塊記錄：選用方式、待確認問題、涵蓋的互動／畫面 ID、確認結果與模擬限制。

- 選用方式：不製作／設計工具點擊連線／局部程式原型。
- 設計稿與註記足以回答時，不製作。
- 導覽、dialog、步驟轉換優先用設計工具連線；動態輸入、拖曳或即時變化確實影響決策時，才局部寫程式。
- 不要求完整主流程、所有 frame 的可操作版本或全套響應式切版。
- 「不製作」是合法完成狀態，須與「選用但尚未完成」區分，不能把前者當成 pending／缺交付。
- 選用的 prototype 若有影響實作的未決問題，只阻擋相關範圍；檢查也僅限選用互動，不要求全部畫面三方同步。
- 產品視覺驗收以設計稿為依據；prototype 補互動證據，不取代設計與規格。

## 預計修改的 Skill Chain

下列路徑皆相對 `.agents/skills/`。修改時需實讀當前檔案，不只依本文摘要替換文字。

| 位置 | 已確認的修改方向 |
| --- | --- |
| `shared/ui-delivery.md` | 作為單一共用契約，定義分流、基準／提案責任、可選 prototype、適用的確認與驗收條件 |
| `system-analysis/SKILL.md`、`templates/plan.md`、`templates/plan.example.md`、`rules/分析介面委派與planner對應判準.md` | 加 UI 影響分流與條件委派；handoff 包含基準及受影響範圍 |
| `ui-plan/SKILL.md` | 更新 description、主流程與寫入邊界，移除固定 prototype 階段，加入基準定位與選用判斷 |
| `ui-plan/templates/ui-plan.md`、`ui-plan.example.md` | 以基準引用、設計差異、畫面索引與行為註記為主；prototype 區塊改條件式 |
| `ui-plan/rules/高保真靜態頁面切分與Flow覆蓋判準.md`、`靜態網站雛形與實作計畫邊界判準.md` | 替換強制 HTML、高保真與完整流程要求，改成必要互動選用與範圍判準；檔名可依新責任整理並修正引用 |
| `ui-plan/templates/prototype-entry.html`、`prototype-entry.example.html`、`prototype-screen.html`、`prototype-screen.example.html` | 候選刪除：完整頁面樣板易引導提前切版；刪除時清理所有引用 |
| `dsl-refine/SKILL.md` | 依分流檢查前置；A、B 不因缺 UI plan／prototype 停止；C 要有效設計確認，行為語意仍依 spec／truth |
| `tasks/SKILL.md`、`rules/Feature約束從plan介面回追.md`、`rules/acceptance-classification-and-delivery-gates.md`、`templates/tasks.md`、`tasks.example.md` | 依分流產生任務與證據；C 綁設計、B 綁既有依據；按需加入互動證據、UI 驗收及基準回填 |
| `bdd/SKILL.md` | 單獨呼叫也識別分流；移除強制 prototype 前置，保留行為驗證、畫面比對與衝突回交 |
| `implement/SKILL.md`、`rules/技術參照載入與最小上下文判準.md` 等實際受影響規則 | 按分流核對前置，不因不需要的產物缺失停止；承接畫面驗收與基準回填 |
| `shared/session-handoff.md` | 保存分流、基準／設計版本、prototype 選用結果及受阻範圍；更正強制 prototype 同步的舊例子 |

UI 規則集中於共用契約，其他 skills 只在適當時機讀取、核對與交接，避免多份獨立定義。

### 移除或取代的要求

- 每個需求至少一個 HTML prototype。
- Prototype 必須覆蓋完整主流程、每個受影響畫面都必須有入口。
- 無條件的設計／prototype／產品三方同步。
- 模板預設的多頁 HTML 與假資料應用建置。

### 保留的要求

- C 類可編輯設計、桌機／手機預覽、明確確認與版本追溯。
- 跨模組、共享導航及元件的影響盤點。
- C 類第一組代表性桌機／手機畫面先比對，再展開後續實作。
- 適用的逐畫面差異紀錄、獨立審查、既定回歸；功能全綠不等於視覺驗收完成。
- A、B 仍完成適用的工程與行為驗證，不縮減產品測試矩陣。
- API／data truth owner、BDD 測試語意及低記憶體排程不在本次修改範圍。

## 現況產品盤點與之後的基準建立

本輪已唯讀檢查來源程式，尚未啟動產品逐畫面檢視，也未核對線上部署版本。首次建立基準需固定 commit 並補視覺核對。

- 路由來源：`apps/web/src/app/App.tsx`。
- 主要畫面：登入、我的旅行、旅行帳本、新增／編輯支出、同行者、分帳結算、記錄實付、獨立還款、支出分類。
- 現有共用能力：AppShell、Button、Input、Select、Icon、DateField、SearchCombo、FormDialog、QueryState。
- 業務區塊含旅行卡片、支出列、幣別總額、成員淨額、付款安排與分攤選擇，但並非全部已抽成獨立元件；不因本次流程工作全面重構產品。
- 樣式來源：`apps/web/src/design-system.css`、`apps/web/src/styles/**` 與各功能 CSS。手機主要切換點 700px，另有 1000px／1500px 調整。
- 未來建立基準先做「我的旅行＋新增旅行 dialog」桌機／手機核對，再展開主要頁面；記錄實付、獨立還款與特殊狀態可第二批補齊。
- 固定對照尺寸建議 1440×900、390×844，中間寬度按適配規則檢查，不逐尺寸重畫全套。
- 主要區塊順序、資訊位置、卡片排列、操作入口、主次層級、品牌樣式及保存／取消語意需遵循確認設計；真實資料換行、高度、中間寬度與字型細差依規則適配。改主要操作、導覽或生效時機需重新討論。驗收使用差異清單與同尺寸對照，不用相似百分比。

## 既有 Plan、006 與本機未提交資料

- 舊 plan 不全面重生，不因新規則自動推翻批准與完成證據；按實際影響增量處理。
- 已完成 prototype 留作歷史交付；仍需使用的互動才維持有效參照。
- 006 的 `design-v6` 已獲使用者確認，`prototype-v1` 已完成桌機／手機同步；正式產品尚未實作，不能當作現行基準。
- 006 的資料原位於 `specs/plans/006-trip-management-and-loading/ui/`，相關紀錄是 `ui-plan.md`、`handoff.md`、`validation.md`。截至本次交接，整個 006 package 在來源工作區是未追蹤檔，未納入此分支，另一台電腦可能不存在；本次 skill chain 修改不應依賴它。
- 來源工作區另有未提交的 `specs/truth/contracts/**`、`specs/truth/data/**`、`specs/truth/techstack.md` 及未追蹤 `specs/truth/contracts/groups/trip-management.yaml`。本分支從乾淨 HEAD 建立獨立 worktree，只提交此文件，未攜帶、重設、清理或覆蓋上述資料。
- 歷史工程紀錄：`docs/skill-engineering/ui-delivery-and-session-handoff.md`。保留它的歷史脈絡，不改寫成當時已採新流程；可另留新變更紀錄說明取代關係。

## 接手與驗證清單

在另一台電腦的 checkout，先檢查未提交變更，再取得分支；不執行 reset 或 clean：

```sh
git status --short
git fetch origin
git switch --track origin/codex/ui-design-baseline-handoff
```

若本地已存在該分支，改用 `git switch codex/ui-design-baseline-handoff` 並核對遠端差異。若目前 checkout 有其他工作，使用獨立 worktree。

接手 agent 應讀取本文件、當前 skills 與適用技能工程規則。使用者已確認問題、根因與方案方向，引用這份確認脈絡，不重複從需求訪談開始；實際修改 SOP、rules、templates 時仍載入相應的 skill 工程與格式規則。

修改後以情境推演、引用檢查、模板配對與 diff 檢查驗證，不為流程文件改動新增產品測試：

| 情境 | 預期結果 |
| --- | --- |
| A：純後端改善 | 沒有 `ui/` 也可完成 |
| B：修正計算結果 | 不新增設計稿，完成行為與適用的畫面回歸 |
| C：新增畫面且無互動疑問 | 設計確認後直接進下游 |
| C：只有一個互動需要體驗 | 只製作局部 prototype，其餘畫面不被迫製作 |
| 選用互動仍有未決問題 | 只阻擋依賴該問題的範圍 |
| 同一 plan 混合 A／B／C | 不以全 plan UI gate 阻擋獨立工作 |
| 基準未涵蓋某畫面 | 按需補必要範圍，不等待全產品基準 |
| 設計改版、舊 tasks 或跨 chat 續跑 | 正確追蹤有效批准、版本及受影響依賴，保留未受影響進度 |
| 產品驗收完成 | 有明確任務回填受影響共用基準 |

最後核對：主 SOP、共用契約、下游規則與範例不存在強制 prototype 殘留；刪除樣板後無缺失引用；不把合法的「不製作」判成未完成；不宣稱尚未執行的產品驗收或基準建立已完成。
