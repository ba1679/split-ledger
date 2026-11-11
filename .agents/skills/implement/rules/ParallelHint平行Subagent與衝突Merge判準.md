# Rule 1 - Hint 保留批次邊界，資源契約決定派工

- Level: `MUST`
- `Parallel Hint` 指定可平行的 task 集合與後續 review 邊界，不授權超過已選資源契約。
- 低記憶體模式按 Dependencies 選第一個已解鎖 task，由同一實作者逐筆完成、驗證、回寫；不把整批交成一次任務，也不因每筆 task 新建代理。
- 其他模式可由預算內工作者分波處理 Hint；每個工作者本輪只領明確 task，所有已完成項目仍逐筆回寫。
- review task 等 Hint 內全部 task 完成後才啟動，不得與尚未完成的實作平行；review 通過前不解鎖 Green。

## Good Example

```md
低記憶體模式：Hint T008–T014，各筆完成即回寫；全部完成才 review。
標準模式：在既定預算內分波派工，保留同一個整批 review 關卡。
```

## Bad Example

```md
Hint 有七筆，所以不管資源狀態都新建七個代理，再讓每個代理新增測試代理。
```

# Rule 2 - 工作者 handoff 指向單筆任務與共用資源契約

- Level: `MUST`
- 需要工作者時，prompt 包含 plan 的 `tasks.md`、該筆 task ID、限定職責與目前資源契約；既有工作者接下一筆時必須重新讀取目前 task。
- 若目標檔已被修改，先讀最新內容再 merge 自己這筆 DSL 改動。
- task 與 Phase `Shared Must Read` 已承擔 DSL／Why／Read，不在 handoff 或 tasks.md 重貼另一份完整規格。
- 同一工作者的重用只節省執行環境，不合併 task 驗證或完成狀態。

## Good Example

```md
既有實作者讀取 plan 的 T009 與目前資源契約，只處理本筆。
若共用 helper 已更新，先讀最新檔再整合，驗證完成後回寫 T009。
```

## Bad Example

```md
重用工作者等於一次領取 T009–T040，最後一起打勾。
```

# Rule 3 - 寫入端處理共享檔案，review 不負責合併

- Level: `MUST`
- 低記憶體模式序列寫入共享檔案；每筆開始前核對最新內容。
- 標準模式在預算允許下平行寫同檔時，後寫入者先讀最新版本再 merge 自己的改動。
- review task 只做審查，不合併 patch 或直接修補受審內容；finding 交回實作者處理。

## Good Example

```md
T009 發現 helper 已由 T008 更新，先讀最新檔再整合 T009。
reviewer 只回報問題，實作者修正後再交回檢查。
```

## Bad Example

```md
所有工作者只交衝突 patch，要求 reviewer 幫忙合併、修正，再獨立審查自己的結果。
```

# Rule 4 - 保留不同作者的 review 迴圈並重用審查者

- Level: `MUST`
- Phase 3 review 交給沒有實作受審改動的另一個代理；每輪讀取最新 diff、DSL、測試證據，確認沒有 open findings。
- 有 issues 時由實作者修正，再交回符合獨立性要求的既有審查者；不因每輪 review 重跑就新增代理。
- 整輪所有 Feature phase 的 `Test Scope` 跑起來不得有 undefined step；失敗只能是 assertion 或產品行為。
- 若預算內無可用的獨立審查者，依資源契約處理回收與續跑，不用自審或略過 review 解鎖 Green。

## Good Example

```md
主代理寫 T008–T014；固定 reviewer 找出問題。
主代理修正，原 reviewer 重新核對直到 zero open findings，才解鎖 Green。
```

## Bad Example

```md
因為無法釋放舊代理，就自行宣布 review 通過，或繼續累積新的 review 環境。
```
