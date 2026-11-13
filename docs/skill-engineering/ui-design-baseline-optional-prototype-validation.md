# 共用設計基準與可選 Prototype：實作驗證

## 範圍與確認依據

- 日期：2026-11-13，Asia/Taipei。
- 起點：`8458791`；原始方向見 [交接文件](ui-design-baseline-optional-prototype-handoff.md)，具體範圍見 [已確認編排提案](ui-design-baseline-optional-prototype-plan.md)。
- 使用者先確認評估與補強方向，再確認先完成 skill 改版、後建立 baseline，最後回覆「OK GO」授權落地。
- 本輪交付 6 個 skills、2 份共用契約及受影響規則／模板。未建立實際基準、未修改產品碼或 truth、未處理 006、未建立完整 prototype，亦未執行產品視覺驗收。
- 本文件記錄流程文件檢查與人工情境推演；不代表已實際執行每個產品工作流程，也不是獨立產品 UI review 的證據。

## 實際檔案與能力落點

| 類別 | 實際改動 |
| --- | --- |
| 共用契約 | shared/ui-delivery.md 定義分流、固定版本、設計確認、選用原型、差異處理、產品驗收、回填；session-handoff.md 保存條件交付與有效歷史證據 |
| system-analysis | 主 SOP、plan 雙檔、planner 對應及 Wave 規則；記錄依據，按決策依賴放行 |
| ui-plan | 重建主 SOP／description、ui-plan 雙檔；分開一般與基準模式，原型條件式執行 |
| 局部原型規則 | 新增 rules/局部互動原型選用與交付判準.md；承接必要操作、問題決策、模擬限制與產品內容邊界 |
| dsl-refine／bdd | 按分流承接依據，保留業務／測試語意與範圍回交 |
| tasks | 主 SOP、回追與驗收分類規則、tasks 雙檔；加入條件驗收與基準回填／審查依賴 |
| implement | 主 SOP 及精確讀取規則；承接分流、條件依據與回填，維持既有排程 |
| 刪除 | 四份 prototype HTML 模板與兩份強制完整原型規則，已清理有效 skills 內引用 |

高指導面積能力逐項核對：空白／載入／錯誤／長內容／確認／結果未明、資訊位置與跨模組導航、AI 適配邊界、批准失效、同尺寸／可比資料、字體／顏色／間距／密度／操作檢查、逐項差異處理及最終獨立審查，均保留於共用契約及對應輸出欄位。完整產品旅程仍要驗收，但不要求先製作完整原型。BDD 三入口、truth owner 與低記憶體共用規則未改責任。

## 機械檢查結果

- 使用既有 `analyze_skill_references.py` 對 system-analysis、ui-plan、dsl-refine、tasks、bdd、implement 盤點；前後皆為缺失 skill 引用 0、缺失資源引用 0、未引用本地資源 0。
- 驗證 6 份主 SOP 的 Phase 從 1 連續編號、各 phase Step 連續編號且使用 READ／THINK／WRITE／DELEGATE，均有共用 UI 契約讀取點。
- 核對本輪修改規則的 Rule 編號、Level、Good／Bad Example 順序與 fenced code block。
- 3 組模板（plan、ui-plan、tasks）均有骨架與範例；填位符號使用 UPPER_SNAKE_CASE，範例無未填填位符號。原有任務固定識別 token 與 BDD 標記保留。
- 搜尋有效 `.agents/skills/**/*.md`：無已刪除的六個模板／規則檔名引用。prototype／雛形殘留逐筆檢查，皆屬選用條件、說明或錯誤示例，沒有至少一頁 HTML／每頁可操作／無條件三方同步前置。
- `git diff --check` 通過；新增 Markdown 另檢查行尾空白與填位符號。
- 差異範圍只含 `.agents/skills/**` 與本次工程文件；產品、truth、實際 baseline、歷史 handoff 及 shared/low-memory-execution.md 無改動。
- 檢查使用本機暫存腳本；未新增 skill scripts 或產品測試。

可重演的引用檢查命令（工具安裝路徑按接手機器調整）：

```sh
python3 /Users/hsinhui/.codex/skills/skill-engineering/scripts/analyze_skill_references.py \
  --skill .agents/skills/system-analysis \
  --skill .agents/skills/ui-plan \
  --skill .agents/skills/dsl-refine \
  --skill .agents/skills/tasks \
  --skill .agents/skills/bdd \
  --skill .agents/skills/implement

git diff --check
```

## 人工情境推演

以下以指定假設走讀新 SOP 與對應規則，核對下一步、阻擋及完成條件；結果為文件邏輯核對通過，不宣稱實際產品操作成功。

| 情境與入口 | 所讀依據／流程落點 | 可繼續與受阻範圍 | 完成條件核對 |
| --- | --- | --- | --- |
| 1. A 純後端效能改善，system-analysis → tasks → implement | ui-delivery Rule 1；plan.md 不適用紀錄；tasks 分類與回追 | 無 ui/ 可繼續工程驗證，不排 UI gate | 適用工程／既有行為驗證完成，沒有無關 UI 前置 |
| 2. B 修正計算結果，dsl-refine → tasks → bdd | plan.md 的畫面／路由與現況依據＋新版 spec／truth；BDD 同模組 DSL | 不新增 .pen／原型，可寫及執行受影響行為測試 | 計算規則與適用手機長金額回歸；現況錯值不能反過來作正確規則 |
| 3. C 新畫面無互動疑問，ui-plan P2 → P3 | 有效設計批准、索引及 prototype 不製作紀錄 | 取得設計確認即可交 DSL／tasks；沒有原型 pending | 實作端仍需代表畫面、逐畫面比對及獨立 UI gate |
| 4. C 單一互動需體驗，ui-plan P3 | 局部互動規則、畫面 ID、指定問題及模擬限制 | 只建該互動，不建完整網站；未選用畫面可按依賴交接 | 指定操作有證據、問題已決策確認、對應設計有效才 completed |
| 5. 選用互動未決，tasks／implement | ui-delivery Rule 4、plan 的精確決策依賴 | 只停依賴該問題的 task；不宣稱整個 UI 就緒 | 原型做完但決策未確認仍 pending；其他已明列獨立範圍可完成 |
| 6. 混合 A／B／C 且前序 Wave 待確認 | system-analysis 兩份 Wave／委派規則與 plan 分流表 | 無該依賴且自身前置完成的子範圍可先分析／排程 | 記錄放行理由與未完成部分，不宣稱整波／全 plan 完成 |
| 7. 基準缺某畫面，ui-plan P1／P2 | ui-delivery Rule 2、固定產品版本與必要現況核對 | C 可先在 plan-side 核對必要範圍；B 引用現況；不等待全產品基準 | 設計交接足夠且有有效確認；只有明確基準模式可直接寫基準 |
| 8. 單獨 bdd／implement | 兩 skill 的 P1 及共用契約 Rule 1 | 補記最小 plan-side 分流，A／B 缺 ui/ 不停止；缺業務規格回交 | 呈現與行為依據可追溯，仍服從既有 Test Scope／task 邊界 |
| 9. 設計改版、舊 tasks 與換 chat | ui-delivery Rule 5、session-handoff Rule 2／3 | 受影響設計及依賴 stale／changes-requested；其他 ID、批准與驗證保留 | 只重開相關確認與驗證；換 chat 不清除或推翻有效證據 |
| 10. 產品已驗收但未回填 | ui-delivery Rule 7、tasks 回填 phase、implement P5 | 回填 task 依產品驗收／UI gate／完整回歸解鎖，審查依回填完成解鎖 | 回填更新＋自查完成後可勾該 task；審查另勾，兩項完成前 plan 未完成 |
| 11. 兩個 plan 回填同一基準 | 固定起點＋最新基準 diff，Rule 7 | 非重疊部分保留並整合；同畫面／元件衝突回交 | 重驗受影響範圍、預覽／README 一致並獨立核對；不能整檔覆蓋 |
| 12. 基準更新後恢復舊 plan | Rule 2 的固定 repo commit＋路徑＋ID＋同版預覽、handoff | 從固定 commit 取回獨立檢視，不修改現行基準或改讀最新 | 舊批准在其範圍有效；若實際整合衝突按影響處理，歷史原型可保留 |

額外反例：B 的修改若需要新增錯誤 dialog，升 C 而不以後端檔案判成 A；原型不製作的欄位不進入 pending；工具無點擊連線能力時只選問題必要的替代方式；未實作的 006 設計不能直接進基準。

## 檢查中修正的問題

1. Wave 委派規則仍有「前一整個 Wave 完成」舊句，已改為等待實際依賴的資訊及適用確認。
2. tasks 的泛用產物家族 gate 敘述可能讓 B 類僅引用現況也被要求新增 UI gate，已改為按適用分類與產物責任安排。
3. 回填實作與獨立核對原先可能互相等待，已分開 task 完成條件：實作更新／自查後完成，解鎖核對；plan 等兩者完成。

## 後續實際驗證範圍

本輪 skill 文件實作與檢查已完成。下一個獨立工作是用新版基準建立模式，固定實際產品 commit，先核對「我的旅行＋新增旅行 dialog」桌機／手機；確認後建立必要現況基準。這將是新版流程的首次實際設計工具／產品演練，仍需取得真實預覽與核對證據，本輪未執行。
