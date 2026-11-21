# 測試政策 skill 修正驗證

驗證日期：2026-11-21（Asia/Taipei）。本次只變更 skill 指令與必要文件，以下是文件走查及機械檢查，不能當作產品已通過測試或人工驗收。

## 工作區與範圍

- 新分支：`codex/skill-risk-based-testing`；新 worktree：`/Users/hsinhui/Desktop/Render-stuff/split-ledger-skill-risk-based-testing`。
- 起點 HEAD：`37e5968fc17d28aa925370c31cebdc52d84abaf4`。
- 原工作區仍為 `feat/007-category-expense-charts`；本次未在原工作區切分支、stash、stage、reset、clean 或寫入產品／測試。初版未 commit／PR／merge；後續依使用者同步 README 並開 PR 的指示提交與推送，不執行 merge。
- 變更僅 `.agents/skills/**` 與 `docs/skill-engineering/**`；不改 007／truth／產品／測試／runner。交接文件由原工作區單檔複製；全域 tdd 不變。

## 機械檢查

- 使用既有 `/Users/hsinhui/.codex/skills/skill-engineering/scripts/analyze_skill_references.py`，對 tasks、implement、bdd、technical-research、dsl-refine、ui-plan 六個 skills 在修改前後盤點：missing skill refs、missing artifact refs、unreferenced artifacts 皆為零。
- 額外檢查共用契約路徑存在、被五個相關主 SOP 明確載入；UI owner 透過既有 ui-delivery 契約及成對模板承接人工分工。
- 改動文件 fenced code blocks 成對、Rule 編號／Level／正反例完整；修改的主 SOP Phase 順序連續；templates 骨架／範例成對。
- tasks 範例任務 ID 為 T001–T030，唯一且連續，所有引用 ID 均存在；T024 人工確認 → T025 獨立 UI gate → T029 回填 → T030 獨立核對。T022 自動化完成不冒充 T024 確認。
- `git diff --check` 通過。專案 Prettier 明確忽略 `.agents/**` 與所有 Markdown，因此另做結構檢查，不把忽略結果稱作 Markdown 格式通過；新增政策／實作／驗證文件另以既有 Prettier 明確檢查。
- 掃描相關鏈條，原本「預設都是 E2E」的有效要求與樣板提示已移除；保留的「完整回歸」指已規劃範圍，未跑、skip、舊版本片段仍不能充當通過。

## 代表情境走查

| 情境與輸入                        | 新流程預期與走查結果                                                                                                    | 保留的保障／待辦                                                |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 一般手機：修改金額後重新看分析    | research／tasks 指定主要手機核心旅程；API／單元保護帳務，feature focused run 可驗相關 DSL，不另重演相同 helper 成功測試 | 真保存／更新與數值正確；桌機完整集中人工                        |
| 已知 WebKit 焦點／觸控缺陷        | 新契約保留曾抓缺陷的環境／輸入組合；少量 smoke 明記風險及入口，不把所有帳務案例乘第二瀏覽器                             | row／sector、回焦及接續鍵盤的必要回歸；有替代覆蓋前不刪         |
| 手機自動全綠，等待桌機／VoiceOver | 自動 task 可完成；人工確認 task 保留 pending，附可取回版本、入口、步驟、預期與差異；獨立 API／工程可續跑                | 最終 UI／baseline 等實際人工確認，設計批准及政策同意均不能代替  |
| oracle／barrier 的測試可信度      | 用錯金額、漏項、錯 scope 等獨立錯誤驗證拒絕／攔截；普通正確回應重演不構成新增理由                                       | 同快照、取消、敏感資料清除依實際斷言保留，不按 support 目錄刪除 |
| 修改聚合 SQL／只改 UI 間距        | 前者觸發既有 cost config，後者不重跑資料負載實驗；正確性仍阻擋，四查詢策略失敗先評估                                    | `10^12` 可留 math 契約，不要求各產品層固定相同內部表示          |

以上皆為閱讀規則、模板及其依賴的走查，未啟動瀏覽器或執行產品測試。

## 007 回放與邊界

- 舊結果：59 個前端語意 ID、274 次矩陣執行；103 條 DSL 任務不等於 103 個額外 support E2E 的必要性。
- 按新政策規劃時，先選主要手機核心案例，再列具體風險 smoke／輸入變體與人工清單；不再由 59 自動乘出 274。沒有在本次估算或宣稱最終可刪數量。
- 原 007 已明訂的 Test Scope、固定裝置 Given、未完成人工條件及執行證據不自動豁免；未來若獲授權調整，由 tasks／DSL owner 增量對齊，保留歷史證據。本 worktree 不修改它們。

## 限制與交付

這次驗證能證明規則入口、責任與範例一致，不能證明未來 agent 一定不會增加冗餘測試。下一次新 plan 應檢查範圍表中的風險理由及重用證據，再決定是否需要進一步調整。初版以未提交變更交付；後續依使用者指示同步 README，將本次變更提交為以 main 為目標的 PR，排除原 007 規格 commit。
