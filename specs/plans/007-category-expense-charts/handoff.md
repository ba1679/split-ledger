# 007 接續交接

- Plan：`specs/plans/007-category-expense-charts`；checkpoint：`/tasks` 執行規劃完成，下一入口 **`/implement`，T001**。
- 規劃起點 HEAD：`d00f8b066ccb37645eb5b12ba16731a012c5d928`（main）；文件分支：`feat/007-category-expense-charts`。使用者已要求將目前文件commit至新分支，文件commit識別以該分支Git紀錄為準。使用者本輪要求 `$tasks`，本輪只產出執行計畫，尚未開始產品實作。
- 已完成鏈：specify → technical-research → spec-by-example（4檔、13旅程）→ system-analysis（3介面、2waves）→ API/data owners → approved UI → dsl-refine → tasks。

## 最新 tasks 交付

- `tasks.md` 已產出135項，T001–T135全部未完成；Setup3、Foundational4、Phase3逐句RED103＋獨立review1、8份feature各GREEN/REFACTOR、代表畫面checkpoint、工程/完整回歸、唯一UI家族gate及baseline回填/獨立核對。
- 新DSL盤點BE29/FE74共103句，尚無既有StepDef，皆BDD-RED；無ALIGN/REMOVE。BE追加種子有1句尚未被本輪feature使用，已明記直接fixture/support測試，不新增truth驗收。既有runner的unit/web-support收錄與workers覆寫責任已排入T006。
- `checks/tasks-validation.json`綁定tasks hash：135唯一連續ID/全未勾選、103 DSL逐句唯一承接、8組GREEN/REFACTOR、依賴無向後引用、10份truth feature/DSL hash未變；Markdown格式與git whitespace檢查通過。沒有安裝套件、實作StepDef/產品或執行產品測試。
- gate：T111全批StepDef獨立審查；T112–117後端組；T118–120代表桌機/手機畫面；T121–128其餘前端；T129–133最終工程/完整矩陣/唯一UI gate；T134–135產品驗收後基準回填及獨立核對。
- 實作首個session從T001開始，依資源契約每輪一個已解鎖task，第一個正常交接點CP1=T111完成；資源不足可提早保存尚未完成範圍。UI批准持續有效，沒有新增重複確認前置。

## 前序 dsl-refine 交付與驗證

- 在既有 expenses 模組新增後端3份、前端5份繁中 feature；30個後端與59個前端 Rule/Example，合計89個獨立案例、418個新steps，每例恰一When。
- 兩模組 `dsl.md` 只追加007句型：BE29列、FE74列；既有DSL原文前綴、既有feature與介面根DSL維持原義。個人固定owner-member份額，團體只計兩人以上原額一次；未新增多帳號共編、換匯、成員代看或新寫入流程。
- 詳細驗收13旅程→Rule、Rule→truth檔案、UI frame／資訊位置與導航對照，以及獨立審查修正紀錄，見 `dsl-refine-review.md`。
- 已跑：Cucumber39.1.0解析8檔、89個唯一ID、單一Act檢查；全介面拓樸BE30檔/813steps、FE33檔/1008steps，兩側0 errors、0 warnings；既有DSL原文保留；Markdown格式與git whitespace檢查。
- 獨立 `/gherkin-and-dsl` 審查者：既有helper `/root/record_truth_delta`，唯讀檢查全部acceptance結果、DSL oracle、原子性及批准UI位置。合法長名稱種子、刪除/停用後兩圖完整分類缺口已修並複審通過，無阻塞問題。同一helper已完成 `/truth-delta`：ADD13、NOOP3、MODIFY/DELETE0，其他owner表保留，無需clarify；不改truth正文。
- 可持久取回證據：`checks/dsl-refine-validation.json`（HEAD、環境、解析結果、10個truth檔案SHA256）、兩份 `checks/dsl-refine-*-topology.log`；重跑命令見review。暫存基線log `/tmp/007-dsl-{backend,frontend}-before.log`。
- 本機文件檢查環境Node22.20.0、pnpm11.25.0、Python3.14.0；專案產品要求Node24.22.2。未安裝Recharts、未新增StepDef、未跑產品RED/GREEN、產品E2E、WebKit、真機或人工輔助科技驗證，不把文件檢查當成產品通過。

## 有效 UI 與既有契約

- 使用者2026-11-19原回覆「UI 確認 ok」，批准 design-v1；正式工具儲存 `ui/split-ledger-007.pen` 交付SHA256：`d74e31d53c59f19ab2b4e5991808673fd599020b81dd0667a186f98ded8f3968`。確認時hash `5337ee04327ee2e2e3076ae6055cf6c72a99d38435f0af4f874faa9bcbd45665`，之後只改批准索引註記，八張產品預覽不變。
- `.pen`、9張預覽與有效範圍見 `ui/ui-plan.md`；入口O24TBs/zS1cF、主畫面z7pOeL/vrPz0、手機團體vjeyS、hover ZAxvn、資訊卡Lj8SI、狀態GS7hF、索引S1EcWx。
- C類前端：帳本新增花費分析入口，獨立 `/trips/:id/analysis`，返回同旅行；桌機並排、手機上下，兩圖共幣別、常駐明細、hover/觸控/鍵盤。API/data為該C類功能的行為依賴，不另創畫面。prototype **不製作**，沒有原型前置缺口，不重問相同批准範圍。
- 固定baseline commit `8fc9f94134c66ffd29918014b950894b1007aa86`；原始 `specs/ui-baseline/split-ledger.pen` hash `144a81b3086885bf57f5a694a78ed75f089f032730f91767088598ed1572a3d3` 本輪重核未變。尚未產品驗收，不回填baseline。
- API truth：`GET /api/trips/{tripId}/expense-analysis`，四個schema、文件版本0.4.0；owner/active、完整旅行同快照、分幣別精確金額；保留舊totals。Data無新表/欄位/migration/預設索引，DBML只加衍生來源Note。以上尚未實作。

## 工作區與資源

- 本次文件commit範圍（原dirty）：`specs/truth/techstack.md`、contracts的openapi/groups/expenses/components/schemas/expenses、data/data-model.dbml；本輪再改兩份expenses/dsl.md。包含整個007 package（tasks.md及checks/tasks-validation.json、plan/handoff）及新增8份truth feature；另納入兩份原被*.log忽略的拓樸檢查證據。沒有改產品或其他plan；不得清除先前變更。
- profile=low-memory-16gb；主代理＋既有helper，未新增代理、產品server、瀏覽器或重型test worker，同時重型工作上限1。RAM/swap狀態未知，不宣稱記憶體穩定。
- 本輪只跑已退出的文件檢查，未新開長駐服務。前次Pen恢復的官方CLI已save並退出；桌面app保留。歷史session27046 OS退出狀態未知，未嘗試終止無法確認歸屬的程序；其他工具內部程序回收亦未獨立觀測。Pen工具相容性/來源匯入詳見UI文件，未手工改.pen。

## 下一範圍

1. 執行 `$implement`，從`tasks.md`的T001開始；先核對Git/dirty、tasks及truth hash、環境/資源基線、有效design-v1與本交接。全部135項目前未執行，不能把前序文件審查或設計批准當成實作任務完成。
2. 依序Setup→Foundational→103條DSL測試→T111獨立全批審查；本輪未拆獨立測試wave，不能先寫後端或前端GREEN。
3. 達到T111/後端組/代表畫面/其餘前端/最終整合等checkpoint保存證據並交接；以tasks明列依賴解鎖，不重問已授權工作。
4. 完整測試/瀏覽器/裝置/變體矩陣及產品驗收仍待執行；T133通過後才回填baseline，T135獨立核對通過才可宣告plan交付。文件已獲使用者授權commit至新分支；尚未PR/部署。
