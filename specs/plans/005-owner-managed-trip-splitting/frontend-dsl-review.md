# 005 前端 interface Gherkin / DSL review

日期：2026-11-10。依 `/dsl-refine` 委派執行 `/gherkin-and-dsl` 的建立及檢查 lane。上游 acceptance 保持 Journey，前端 truth 拆成可獨立 Arrange、單一 Act 的 Rule / Example。未修改產品程式、API/data truth、HTML prototype 或 pen 設計稿。

## 來源與邊界

已對照 `spec.md`、四份 `features/acceptance/*.feature`、`plan.md` Wave 3、`research.md`、`truth-delta.md`、`ui/ui-plan.md` prototype review 決策及 `ui/design-review.md`，並依憲法、原子化規則與 DSL 唯一歸屬規則檢查。契約以 `specs/truth/contracts/groups/{members,expenses,settlement,repayments,trips}.yaml` 及其 schemas、`specs/truth/data/data-model.dbml`、`specs/truth/techstack.md` 為權威。

前端驗 UI 操作、狀態與權威 API 投影，拒絕時再讀確認沒有改壞資料；後端負責完整的輸入排列、鎖、交易、遷移與偽造存取。fixture 透過隔離資料庫與真實 API 建立穩定身分，遺失回應僅由代理丟棄傳輸，不假造後端結果。所有金額 oracle 使用 BigInt 有理數與 API ExactAmount，無浮點或顯示值重算。

## 語意單元與 truth 變更

| 動作 | Truth 檔案 | 語意單元 |
| --- | --- | --- |
| ADD | `specs/truth/features/frontend/members/member-management-and-historical-identity.feature` | trim/ASCII 重名含 owner 與停用者、跨旅行同名、改名保留 ID、停用歷史、重新啟用、新支出/還款選項排除停用者、未引用刪除、使用中刪除競爭、owner 不可管理刪除/停用、新增未確認結果。13 Rules / 15 Examples。 |
| ADD | `specs/truth/features/frontend/members/splitting-access-and-cross-device.feature` | 同 owner 手機→電腦、其他登入帳號及未登入同行者不取得資料/編輯能力。3 / 3。 |
| ADD | `specs/truth/features/frontend/members/dsl.md` | 33 rows，members 專用 Arrange/操作/權威與不變量斷言。 |
| ADD | `specs/truth/features/frontend/expenses/shared-expenses-and-share-display.feature` | 100/3、200/3、100/2 顯示；共同支出保存、付款人不參與分攤、必選付款/分攤者、Phase 1A 相容。8 / 8。 |
| ADD | `specs/truth/features/frontend/expenses/shared-expense-corrections-and-recalculation.feature` | 更換金額/付款/集合、刪除來源、部分實付保留、未確認修改、修改/刪除已結清來源保留不可變歷史及重建正確淨額。8 / 8。 |
| MODIFY | `specs/truth/features/frontend/expenses/dsl.md` | 增補24 rows；既有52 rows語意不變。新增共同支出、顯示、修改/刪除、保存狀態、歷史結清保護、支出日期Arrange契約。 |
| ADD | `specs/truth/features/frontend/settlement/currency-balances-and-payment-simplification.feature` | 分幣別、直接/簡化/切回安排、來源/淨額不變、三句中性說明、無變化、持久設定、切換失敗、新份額格式、包含最新實付重建。12 / 12。 |
| ADD | `specs/truth/features/frontend/settlement/settlement-payments-and-save-outcomes.feature` | Amy實付33或34均可結清100/3、兩筆安排依序結清、600實付700不反向、實付留空與不選取整、零元拒絕、版本過期、可查證/不可查證遺失結果。8 / 9。 |
| ADD | `specs/truth/features/frontend/settlement/dsl.md` | 26 rows，包含 arrangement key/revision/expectedAmount 原樣回傳、不可變快照、一實付兩零和調整、未知結果不重送。 |
| ADD | `specs/truth/features/frontend/repayments/independent-repayments-and-overpayment-confirmation.feature` | 部分/多次實付、超額警告/取消/確認反轉、舊確認衝突、相同成員/零額/異旅行選取、遺失結果。11 / 11。 |
| ADD | `specs/truth/features/frontend/repayments/dsl.md` | 22 rows；確認沿用原 UUID/實付內容與伺服器 token/snapshot；獨立實付不建立 settlement/adjustments。 |
| ADD | `specs/truth/features/frontend/{expenses,settlement,repayments}/date-selection-and-focus.feature` | 每檔2 Rules / 2 Examples：鍵盤選日、Escape 關閉還原焦點，三種表單在桌面與375px手機各跑。 |
| MODIFY | `specs/truth/features/frontend/dsl.md` | 增補9 rows；既有新增支出表單row語意不變。跨模組共用支出Arrange、淨額、既有實付、來源不變、已完成Amy33結清Arrange及日期行為契約。 |
| NOOP | 既有 auth、trips、categories、design-system feature/dsl；expenses 的兩份既有feature | 保留登入/隔離、日期/分類、原始金額、總額、分頁、離線與建立查證等回歸。沒有削弱或刪除既有驗收，沒有現有 DSL row 的權威位置搬移。 |

新前端 feature 共10檔、69 Rules、72 Examples。增補114 rows：根9、members33、expenses24、settlement26、repayments22。新列各有參數型別、DataTable支援與欄位、預設值、fixture/頁面操作/等待/回寫或權威斷言。無raw selector、無raw storage key。

根DSL只保留實際跨模組且完整契約相同的row；付款安排集合斷言僅 settlement 使用，放在 settlement/dsl.md。舊feature的句型與DSL保留不變。

## Acceptance 對照

表內路徑相對 `specs/truth/features/frontend/`；條列 Rule 名為可定位的實際對應，未將後端權責宣稱為前端操作能力。

| Acceptance source / Rule | 前端責任與 Rule 對應 | 其餘介面責任 |
| --- | --- | --- |
| `trip-members-and-shared-expenses.feature`：名稱可辨識、改名/停用保留身分 | `members/member-management-and-historical-identity.feature`：新增、重名三例及改名衝突、跨旅行重名、改名保留身分、停用保留歷史、停用者分別不可加入新支出/新還款、重新啟用 | 後端名稱唯一鍵/同時競爭與完整歷史外鍵。 |
| 同檔：個人與共同支出同套紀錄、平均值 | `expenses/shared-expenses-and-share-display.feature`：舊機票相容、點心100三人保存/顯示、200/3四捨五入、100/2去尾零、付款人不分攤；DSL核對原ExactAmount及原統計不變 | 後端全數精度、不合法成員矩陣與遷移。 |
| 同檔：同行者不取得權限 | `members/splitting-access-and-cross-device.feature`：同owner跨裝置、其他登入帳號、無owner登入之Amy直達皆隔離 | 後端逐讀寫端點授權、偽造成員與不可寫。 |
| `currency-balances-and-debt-simplification.feature`：幣別獨立 | `settlement/currency-balances-and-payment-simplification.feature`：「每個幣別獨立呈現淨額」；共用淨額Then驗獨立集合、精確零和、不得跨幣別合計 | 後端所有幣別運算及歷史minorUnit升尺度。 |
| 同檔：簡化只改對象、淨額不變 | 同檔：關閉保留直接關係、開啟對象調整、來源不變、淨額不變分開Rule；三句說明、無變化、持久開關、切回、最新實付重建 | 後端確定排序、筆數保護回退、10次重現oracle；前端核對API筆數及完整安排。 |
| `expense-corrections-and-balance-recalculation.feature`：完整移除舊貢獻 | `expenses/shared-expense-corrections-and-recalculation.feature`：「修改共同支出後不殘留舊分攤」「刪除共同支出後移除其付款安排」；淨額明示Alice0/Amy100/Bob-100 | 後端修改幣別等完整欄位組合及原子替代。 |
| 同檔：修正保留實際還款 | 同檔：「支出修改保留已發生實付」，1000→800及已付400→剩400，兩模式依新來源；另外四Rule驗修改/刪除來源後結清歷史與調整不可變，以及精確最新淨額 | 後端永久保留實付/結清/調整及不重新套用。 |
| 同檔：保存未確認不得宣稱重算成功 | 同檔：「修改結果未明不得呈現已完成重算」，保留200草稿、舊確認狀態、不盲目重送 | 後端權威結果及查證契約。 |
| `repayments-and-payment-rounding.feature`：分次獨立還款同幣別 | `repayments/independent-repayments-and-overpayment-confirmation.feature`：先400→剩600/TWD300；Given先400再When600→JPY平衡，兩筆原實付保留 | 後端還款貢獻完整重建。 |
| 同檔：實付後按結清、無取整選擇 | `settlement/settlement-payments-and-save-outcomes.feature`：33及34各獨立例；Given Amy33已結清、When Bob34、Then三人零餘額且原100/3份額不變；600付700亦不反向；實付留空及不選取整 | 後端一實付兩調整原子性、不可變快照；前端Then亦讀record核對差額+1/3或-2/3及相反對端。 |
| 同檔：無效與獨立超額結果 | `repayments/independent-repayments-and-overpayment-confirmation.feature`：本人付本人、零元、外旅行不可選；700超100警告、取消不保存、明確確認反向100各獨立Rule | 後端偽造跨旅行成員、各種無效payload、token簽發與驗證；前端追加舊版本確認不可保存與新警告。 |

## UI review 七點的承接

| 已確認要求 | 測試或交付證據 |
| --- | --- |
| 最多兩位小數、不附算式 | 支出100/3、200/3、100/2；結算淨額與安排表；結清應付與accessible name同格式；API ExactAmount不變。 |
| 下拉箭頭不貼框 | 非業務語意，不製造selector或像素Gherkin。`/tasks` 須依 `ui/ui-plan.md` 在共用選單驗16px箭頭內縮、右側≥44px，幣別/分類/成員一致；桌面及375px截圖/元件量測。 |
| radio/checkbox不擠 | 非BDD UI quality gate：選項padding≥12px、控制與文字/選項間距≥12px、label可點及≥44px、不套一般input寬高padding；375px可讀且不溢出。 |
| 名稱簡化付款 | 可見及輔助工具名稱、switch checked及旅行持久設定由結算DSL核對。 |
| 不用改道 | 三句說明Then驗付款對象與筆數、原始資料不變，明確排除改道術語。 |
| 減少精確/公平字眼 | 分攤顯示與簡化說明Then排除可見及accessible術語，保留技術精確oracle；不要求移除技術文件/欄位名稱。 |
| 正式日期元件 | 三表單鍵盤選日及Escape焦點回復共6例；`/tasks` 尚須做DateField選型/組成review，沿用手動輸入、年月切換、今天與手機底部日曆；prototype保持示意。 |

UI quality gate 來源為 `ui/ui-plan.md` 的「Prototype review 決策與實作驗收」及 `ui/design-review.md`；不宣稱這些視覺/互動品質已由靜態規格檢查驗證。手機/鍵盤完成主流程、loading/error/空狀態、桌面與375px、元件DateField沿用及所有間距，須由 `/tasks` 排入適合的產品介面與UI quality gate。

## 機械與語意檢查

- `uv run .agents/skills/gherkin-and-dsl/scripts/audit_feature_dsl_topology.py --root specs/truth/features/frontend`：PASSED；16 features、8模組、10根rows、232模組rows、428 steps；0 errors、0 warnings。該工具接受單一介面root，不接受同時含backend/frontend的上層作其模組根。
- 新增10份feature使用專案既有 `@cucumber/gherkin` parser：可解析；72 Examples各恰一個When；When之後動作型And為0。舊feature中原有多When不在本次變更範圍，未聲稱其已原子化。
- Rule分離來源不變/淨額不變/安排對象/文案；已完成前序行為皆以可獨立fixture建立的Given承接。日期選取以鍵盤操作的一次使用者意圖為Act，不保存帳務。
- 沒有要求同行者登入/自行支付操作，所有記錄均owner執行；線下實付由fixture或輸入描述承接。
- 沒有執行產品BDD：目前為truth規格，新的step definitions及產品尚待 `/tasks` → `/implement`。此輪機械檢查不代表E2E已通過。

沒有新發現會改變需求決策的阻塞。若 `/tasks` 需要具體UI與非BDD驗收證據，以上quality gate與UI原文須一起承接，不可只採新增features當全部交付清單。
