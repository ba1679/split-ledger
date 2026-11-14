Feature: 旅行生命週期下的刪除查證

  # Acceptance: trip-state-conflicts-and-access／垃圾桶普通讀取拒絕；plan Wave2 save-outcome.ts查證保護
  @F006-103
  Rule: 支出刪除查證先區分旅行生命週期

    Scenario Outline: <狀態>／<結果> 的資料組合
      Given 原支出刪除結果未知且旅行目前為 "<狀態>"
      When owner 查證原次支出刪除
      Then 支出刪除查證呈現 "<結果>"

      Examples:
        | 狀態 | 結果 |
        | 一般可用且支出已刪 | 原支出已刪 |
        | 垃圾桶 | 旅行在垃圾桶 |
        | 已永久刪除 | 旅行已永久刪除 |

  # Acceptance: trip-state-conflicts-and-access／電腦舊表單手機移入
  @F006-110
  Rule: 舊表單保存遵守最新垃圾桶狀態

    Example: 支出草稿未提交且另一裝置已將旅行移入垃圾桶
      Given 支出草稿未提交且另一裝置已將旅行移入垃圾桶
      When owner 從舊表單保存點心
      Then 舊表單說明垃圾桶狀態並提供復原下一步
