# Rule 1 - 在明確 checkpoint 交接，不必等到資源失敗

- Level: `MUST`
- 適用於這條 skill chain 的規劃、設計、測試、實作及驗收。持續交付不要求同一 chat 做完整 plan；使用者指定範圍、plan 的 session checkpoint、設計待確認或資源受阻，都是合法交接點。
- tasks 至少辨識測試層 review、後端完整 feature 組、第一個代表性畫面比對、其餘前端畫面組及最終整合的適用邊界。每個 checkpoint 指明完成條件、待跑驗證與下一個範圍，不用固定時間或任意 task 數切斷未保存的工作。
- 到達指定 session checkpoint 後保存交接並結束本輪，回報下一範圍；不自行建立使用者的新 chat、不把交接當作請求重新批准已授權工作。若宿主提供已授權的續跑協調能力可交接；否則提供在新 chat 可直接使用的續跑指示。
- 資源不足可在 task／slice 中途保存；未完成或未驗證項目保持未完成。開發者批准與獨立 review 不能因換 chat 被略過。

## Good Example

```md
第一個代表畫面桌機／手機比對完成，達到 tasks 指定 checkpoint；保存交接並回報下一組畫面。
```

## Bad Example

```md
機器尚未 OOM，所以即使已到指定交接點也繼續把整個 plan 塞進同一 chat。
```

# Rule 2 - 一份精簡交接連到完整證據

- Level: `MUST`
- 在 plan 的 `handoff.md` 維護目前交接，不重貼整份 tasks／truth／歷史 log；詳細驗證保留在既有檔案。至少包含 plan 路徑、checkpoint、task／slice／requested step、目前 HEAD／branch、dirty 與未追蹤檔案清單及 diff 摘要、未完成工作與下一個已解鎖範圍。
- 記錄資源契約、環境／工具版本、受管服務／session／PID（若可觀測）及用途、退出與未知狀態、完整待跑／已跑矩陣和 log 路徑、review findings。通過證據綁定程式版本／環境；內容變更後依影響範圍重驗，不混加不同版本的結果。
- UI 交接按共用 UI 契約保存分流與理由、畫面／狀態 ID、呈現／行為依據、固定基準與設計／實作版本、適用確認原回覆及範圍、比對與未決差異；prototype 保存選用方式，選用時才保存版本、狀態、問題與決策。另列受阻依賴及基準回填／審查進度；只保存進度，不擴大 task 寫入權限。
- 新 session 先核對 Git 及未提交內容、檔案與證據仍存在、環境與受管程序、版本與關卡，再接續指定入口。缺少證據時標記待驗證，不盲信前一 chat 的完成宣告；不清除其他人的變更或任意終止程序。
- 正常回報只提供成果、阻礙、交接檔路徑與下一步。沿用現有資源契約；工具環境無法回收時明列未知，不為換 context 持續累積代理。
- `tasks.md` 是任務狀態權威；既有驗證紀錄保存詳細證據，`handoff.md` 只保存當前入口及連結。task 回寫時同步頂部若有的計數／下一步，不另建平行進度帳。相同阻塞、NOOP 與沿用結果引用原紀錄，只補新差異；不以完成 task 百分比代表剩餘工時。

## Good Example

```md
handoff.md：T031 green 已完成，完整 scope 與證據連至 validation.md；下一筆 T032 refactor。
validation.md：每列含 task、scope、來源版本／環境、命令、結果與 log；handoff 不重貼各列。
若 T032 為 NOOP，引用同版 Green 與無變更理由；不重跑 E2E 或重貼整份矩陣。
C 類設計 d2 已批准，固定基準 commit 與預覽已引用；prototype 不製作。
待跑 WebKit 仍未完成，不勾選相關 task；驗收後尚待基準回填及獨立核對。
```

## Bad Example

```md
交接只說「之前全綠，繼續」，沒有版本、未提交變更、待跑範圍或設計確認紀錄。
```

# Rule 3 - 交付分波與舊任務補驗必須保留依賴及證據

- Level: `MUST`
- 舊 plan 先核對實際分流、有效原確認及完成證據，不因新流程自動推翻歷史交付。缺少適用設計批准或畫面比對時，由 `/tasks` 盤點受影響 tasks、後繼 UI gate／回歸與其版本；保留歷史驗證紀錄和不受影響的 `[X]`，只將不符合新完成條件的 tasks／關卡重開為 `[ ]` 並註記原因，或新增明確依賴的補驗 tasks。不能重生整份清單而丟失已確認進度。
- 後補批准不能自動恢復 UI 完成狀態。逐畫面比對通過後才重新勾選；有效的原 BDD 證據可沿用，產品／環境／規格改變時依影響範圍重驗，不能把過期的 review 或回歸當成最新版通過。
- `/tasks` 依可獨立驗證的範圍安排交付波次，不限於 UI 受阻；各波明列 feature／DSL／Test Scope、共同依賴、Phase 3 review 與對應 GREEN。某 UI 範圍待確認時，只有不依賴該決策且前置就緒的範圍可入波；受阻範圍不宣稱已對齊或全 plan 已就緒。
- 每波所有需對齊 DSL 都完成且本波獨立 Phase 3 review 通過後，只解鎖明列依賴此 review 的 feature。未明確分波時仍遵守原全批 review，不由 implement 自行縮小範圍。
- 各波可交錯執行 Phase 3 與相應 Feature phases；物理章節順序不是額外全批前置。首波先用正式測試路徑驗證真實前置及目標行為，再擴到相依波次；共用測試變更使舊證據失效時補驗受影響消費者。
- 受阻範圍的適用設計確認與選用互動決策完成後，重新執行 `/dsl-refine`／`/tasks` 增量加入其 DSL 對齊、review 與後續 feature，新增 tasks 使用未使用的 ID，保留既有 ID、完成狀態及證據；共用 DSL 改變時重開受影響舊測試／review。最終完整回歸仍覆蓋全 plan，UI gate 覆蓋適用設計範圍。

## Good Example

```md
backend wave：T010–T020 測試對齊 → T021 review → 對應 backend GREEN。
frontend 的 C 類範圍等 d1 批准後增量排 T040 起的測試與獨立 review；prototype 不製作。
舊帳本 T030 缺畫面比對：保留功能測試 log，新增 T050 補驗並阻擋最終 UI gate。
```

## Bad Example

```md
前端尚未規劃卻宣告全 plan Phase 3 通過；後補設計批准就直接保留全部舊 UI [X] 交付。
```
