# Rule 1 - 先分類失敗，再擴大測試範圍

- Level: `MUST`
- `/implement` 的測試對齊與 `/bdd` 的各入口共用本判準。先用當前正式 scope 的最窄有效測試辨認：產品行為失敗、測試實作／工具錯誤、環境／前置受阻，或通過。命令退出非零本身不是產品 RED。
- 產品 RED 必須可歸因到目標行為；已有 stepdef 卻卡在 Given 的缺欄位、登入／啟動、fixture 失敗，不能證明後續 When／Then。目標本身驗收 migration 或缺欄位行為時，該失敗可作有效 RED，但不得借給其他未到達的行為。
- 工具錯誤先修 helper、fixture 或 runner；前置受阻記錄首個失敗位置、環境／相關版本、阻塞原因、受影響 task／scope、解除依賴及 log。後續相同原因引用該紀錄，不為每句 DSL、尺寸或瀏覽器重跑相同阻塞；不同環境或版本是否相同須有依據。
- 未到達目標者保持待驗，不能勾選完成、當作綠燈或解鎖依賴其通過的 review／Green。前置變更後先重跑 focused test，取得有效訊號再展開既定矩陣。未變更但有新診斷目的時可重跑，記明目的。
- 若 schema 等產品前置尚未實作，交 `/tasks` 排出可獨立 RED → review → Green 的前置波次；不在測試層偷偷補產品碼，也不要求後續受阻測試先完成才能實作該前置。

## Good Example

```md
未知結果 Then 尚未執行；Given 因 trips.deleted_at 不存在受阻。
validation.md 記錄首次 log、schema 版本與受影響清單；其他相同阻塞引用此項，維持待驗。
/tasks 排出具有效 migration RED 的資料前置波；該波獨立 review／Green 後再驗未知結果。
```

## Bad Example

```md
同一缺欄位錯誤重跑桌機／手機與兩種瀏覽器，四個 exit=1 就當作目標 RED 完成。
或為解除阻塞，在 Phase 3 直接加入產品 migration 再勾選。
```

# Rule 2 - 依變更影響選回歸並綁定有效版本

- Level: `MUST`
- 開發迴圈先跑 focused tests；Green 完成仍覆蓋 task 指定的完整 Test Scope。每次新增產品／測試變更後，以 diff、共用 helper／fixture／元件的消費者及環境變動判定失效範圍，受影響部分重驗，無法判定時跑完整相關 scope。
- 重構若實際有變更，驗證實際受影響範圍與共用消費者，保留 task 指定的額外驗證。不得只因 task 名稱是重構就重跑未失效的全矩陣，也不能因未改業務意圖就跳過共享風險。
- NOOP 重構須記錄已檢視的 source 版本、範圍與無需變更理由，沿用同一有效版本的 Green 證據；無產品／測試／環境差異且來源證據完整時不新增 E2E。NOOP 仍須完成既定獨立審查。
- 每筆證據保存 scope、來源版本（HEAD 加未提交 diff 或內容雜湊）、環境、命令、退出狀態、案例結果與 log；沿用時列原證據及相對最終版本的影響判斷，不累加不同版本的部分成功冒充同版全綠。
- 最終交付仍執行 plan／專案要求、綁定最終版本的完整回歸、瀏覽器與品質關卡；本規則不授權更改驗收意圖、降低測試層級或縮減最終矩陣。測試策略變更須回交相應 owner 並更新計畫。

## Good Example

```md
重構只改共用成員選擇 helper：重驗全部已知消費者，其餘沿用有版本依據的 Green log。
下一筆 NOOP：無新增 diff，引用同版 Green 與獨立 review，0 次新增 E2E。
交付前仍在最終來源版本跑 plan 要求的完整矩陣。
```

## Bad Example

```md
shared fixture 已改，卻只驗一個畫面並沿用其他消費者舊 log。
或把數次不同版本的局部成功加總，宣稱最終完整回歸已通過。
```
