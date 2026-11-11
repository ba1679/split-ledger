# 005 Interface feature / DSL handoff

日期：2026-11-10。Plan package：`specs/plans/005-owner-managed-trip-splitting`；truth root：`specs/truth`。

## 結論與邊界

本輪完成 `/dsl-refine`，把四份 plan acceptance Journey 分派至前後端原子規則；acceptance 本身不改寫。現有個人記帳、登入、日期、分類、幣別、分頁與離線回歸仍保留。沒有修改產品程式、step definitions、API/data/techstack truth、HTML prototype 或 pen 設計稿；尚未執行產品 E2E。

新的 truth 已具備對應的唯一 DSL 定義，可以交給 `/tasks` 盤點測試層與產品實作。沒有新增需使用者決定的高影響需求缺口。獨立部分還款保留、按結清不反轉、獨立超額需確認等既有決策均沿用；最新 UI review 的名稱、兩位小數、簡化文案與日期元件決策優先。原技術描述提到「精確」是內部計算契約，不作使用者可見文案。

## 介面與模組

- 後端沿用 `expenses`、`account`、`trips`：新增共同支出/修改/來源刪除、分帳資源隔離及新旅行固定 owner 成員的規則；既有英文 feature 不變。
- 後端新增 `members`：名稱唯一性、穩定身分、歷史保留、停用/啟用/刪除及同 owner 跨裝置讀取。新增 `settlement`：有理數淨額、直接/簡化安排、實付結清、歷史調整與交易一致性。新增 `repayments`：獨立實付、部分/多次、超額警告/確認及有效性。這三項能力都不屬於原個人支出 CRUD 或分類/登入模組。
- 前端沿用 `expenses`，新增 `members`、`settlement`、`repayments`，分別承接可見狀態與可操作結果；詳細逐列 mapping 見 `frontend-dsl-review.md`。
- 根 DSL 僅放實際跨模組使用且完整契約相同的句型。後端共用成員/支出/還款 Arrange 與失敗驗證，前端共用支出 Arrange、精確權威投影、歷史實付及日期操作。模組專屬來源保護保留於 settlement DSL，沒有既有 row 的權威位置搬移或語意刪除。

## Acceptance 結果的後端承接

以下路徑相對 `specs/truth/features/backend/`；前端的11條 acceptance Rule 對照見 `frontend-dsl-review.md`。

| Plan acceptance 的規則／結果 | 後端 feature 與驗證範圍 |
| --- | --- |
| 同行者名稱可辨識、改名/停用保留身分 | `members/trip-member-lifecycle.feature`：trim、owner/啟用/停用名稱ASCII不分大小寫拒絕、另一旅行同名可存；改名沿用ID/歷史關聯、停用後歷史仍計算、啟用、未引用刪除、引用拒刪、固定owner不可改名/停用/刪除。 |
| 個人與共同支出同一模型、精確平均 | `expenses/shared-expenses-and-personal-compatibility.feature`：100/3精確份額/總和、付款人不分攤、owner個人、舊版請求相容、正式migration前資料回填；`trips/trip-splitting-initial-state.feature`建立唯一owner成員。畫面33.33由前端承接。 |
| 同行者不取得存取權及同owner跨裝置 | `account/splitting-data-access-isolation.feature`逐讀寫資源拒絕非owner、未登入不取得資料；`account/same-owner-cross-trip-splitting-isolation.feature`真實childId不能混旅行；`members/cross-device-member-access.feature`及既有跨工作階段支出回歸。 |
| 幣別獨立、全體精確零和 | `settlement/currency-balances-and-payment-simplification.feature`：JPY/TWD淨額獨立、零和，不相加換算互抵；DB獨立BigInt oracle。 |
| 直接與簡化安排、來源不變、持久開關、說明與無變化 | 同檔拆開直接關係、改付款對象、淨額不變、來源不變、筆數不增、設定持久、三句說明、切回、無變化、無債務、確定性10次再讀、自付份額不產生安排；`settlement/payment-history-reconstruction-and-transaction-consistency.feature`以實付及調整存在的fixture驗兩模式。 |
| 修改或刪除完整移除舊貢獻 | `expenses/shared-expense-corrections-and-recalculation.feature`：300三人改200兩人且換付款人、新集合/份額與新安排各別驗證；刪除無殘留；`expenses/shared-expense-update-validation.feature`覆蓋PATCH無效成員/空集合/重複/停用/跨旅行，失敗舊狀態完整不變。 |
| 修正來源保留既有還款並重算 | `expenses/expense-source-corrections-and-payment-history.feature`：刪來源保留400實付及反轉、金額1000降300反轉100、TWD來源改JPY但保留原TWD實付；修改/刪除包含真實結清快照/實付/兩調整之fixture，逐欄不變、不重新套用。 |
| 保存回應遺失不可宣稱已重算 | 前端 `expenses/shared-expense-corrections-and-recalculation.feature`保留草稿及確認狀態；後端查證與來源驗證不將傳輸失敗當資料庫未寫入。 |
| 獨立部分/多次實付、幣別不變 | `repayments/independent-repayments-and-overpayment-confirmation.feature`：400剩600、Given已有400再還600、實付各次事實不合併、TWD300不變，kind=independent且不新建結清調整。 |
| 任意正數實付結清、差額及無取整策略 | `settlement/settlement-payments-and-adjustments.feature`：100/3以33/34/1/100皆可結清，差額兩端正負各1/3或2/3、來源不變、無策略欄位、600實付700無反向、無效拒絕、舊版本拒絕、遺失結果查證。 |
| 兩筆安排先後結清後全體無尾差 | `settlement/balance-after-sequential-settlements.feature`：Given Amy33已結清，When Bob34結清，Then原100/3份額、兩筆實付與精確全體零和、安排空。 |
| 無效還款、獨立超額警告/取消/確認反轉 | `repayments/independent-repayments-and-overpayment-confirmation.feature`：本人付本人、非正數、幣別/日期、停用及跨旅行兩端；700對600先409且DB不寫、同UUID/內容/伺服器快照明確確認後反向100、舊revision/變造token不得保存。取消沒有後端命令，由前端取消案例核對DB不變。 |

## 檢查與證據

- 新增後端14份 feature：92 Rules、125 Examples；前端10份：69 Rules、72 Examples，共24份／197 Examples。
- 新增全部24份檔案通過專案現有 `@cucumber/gherkin` parser；197 Examples各恰1個When，沒有When後動作型And。單一並行結清案例是一個受測競爭事件，以兩請求並行觸發，不串成兩段旅程。
- 後端拓樸：`uv run .agents/skills/gherkin-and-dsl/scripts/audit_feature_dsl_topology.py --root specs/truth/features/backend`，19 features／8模組／5根DSL rows／191模組rows／553 steps，PASSED、0 errors／warnings。
- 前端拓樸：相同腳本 `--root specs/truth/features/frontend`，16 features／8模組／10根DSL rows／232模組rows／428 steps，PASSED、0 errors／warnings。
- 腳本的root是單一介面，不使用同時含前後端的 `specs/truth/features` 作模組根。
- 子代理 `/gherkin-and-dsl` 後端兩輪唯讀review找到的順序結清、歷史fixture、PATCH驗證、並行/回滾、停用改名及同owner跨旅行缺口已補；數值fixture及資料隔離複查通過。
- 全部truth檔案可解析；既有前端 `design-system/interface-regression.feature` 的兩個多When案例為本輪未變更的既有規格，沒有宣稱本輪將其原子化，也沒有刪掉既有回歸。
- `git diff --check`通過。機械與規格review不是產品BDD執行，不能據此標產品已實作或E2E已綠。

## 交給 tasks 的限制與驗收分工

- 本輪不新增產品技術套件；Setup是否需新增由tasks依research及目前程式判定。測試fixture/helper/stepdef須在Foundational與Phase3依skill邊界安排，不在本輪先實作。
- 新增DSL的參數、DataTable與預設值及StepDef實作語意為測試實作依據。使用預留ID與真實DB/GET查證，不以畫面/response單通道當完整事實；近似顯示不可回灌expectedAmount或計算差額。
- 並行與故障回滾案例為隔離後端整合測試，需內部barrier與repository/transaction故障注入，不能新增正式環境公開測試端點、無界重試或以mock response取代權威狀態。
- UI名稱、金額格式、三句中性說明、日期鍵盤/焦點有前端BDD承接。下拉箭頭16px內縮/右側44px、radio與checkbox的12px間距及44px可點區、DateField共用選型與手機底部日曆、桌面與375px外觀由UI quality gate承接；來源為 `ui/ui-plan.md` 與 `ui/design-review.md`，不能以非BDD工作取代缺少的產品行為測試。
- `spec.md` NFR-002只清除與已確認UI決策矛盾的舊「精確未取整提示」用詞，改為金額及結算狀態可理解，鍵盤及輔助工具要求完整保留。沒有重新訪談或新增產品限制。
- `/truth-delta`只更新本plan `/dsl-refine` section；既有API/data/technical-research紀錄為歷史改動，沒有藉本次DSL工作改寫其他owner真相。
