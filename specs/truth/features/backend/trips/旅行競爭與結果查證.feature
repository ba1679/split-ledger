Feature: 旅行競爭與結果查證

  # Acceptance: trip-state-conflicts-and-access／明確失敗不留下部分變更
  @B006-012
  Rule: 生命週期命令中途失敗維持完整前態

    Scenario Outline: <原狀態>／<操作> 的資料組合
      Given 旅行生命週期基準為 "<原狀態>"
      And 下一次 "<操作>" 在交易中途會明確失敗
      When owner 執行旅行命令 "<操作>"
      Then 交易失敗回報錯誤且全部權威資料回滾

      Examples:
        | 原狀態 | 操作 |
        | 一般可用 | 移至垃圾桶 |
        | 垃圾桶 | 復原 |
        | 垃圾桶 | 永久刪除 |

  # Acceptance: trip-state-conflicts-and-access／失敗之後重新完成
  @B006-013
  Rule: 明確失敗解除後可重新完成命令

    Scenario Outline: <原狀態>／<操作> 的資料組合
      Given 旅行生命週期基準為 "<原狀態>"
      And 前次 "<操作>" 已明確失敗且故障已解除
      When owner 執行旅行命令 "<操作>"
      Then 本次 "<操作>" 完整成功而沒有重複資料

      Examples:
        | 原狀態 | 操作 |
        | 一般可用 | 移至垃圾桶 |
        | 垃圾桶 | 復原 |
        | 垃圾桶 | 永久刪除 |

  # Acceptance: trip-state-conflicts-and-access／遺失回應查證；trip-thumbnail-lifecycle／保存結果未知
  @B006-017
  Rule: 收據查證區分原結果與目前狀態

    Scenario Outline: <原操作>／<目前狀態> 的資料組合
      Given 原次 "<原操作>" 已成功但回應遺失，目前為 "<目前狀態>"
      When owner 查證同一次原旅行操作
      Then 查證分別回傳原操作結果與目前權威狀態

      Examples:
        | 原操作 | 目前狀態 |
        | 移至垃圾桶 | 垃圾桶 |
        | 移至垃圾桶 | 一般可用 |
        | 永久刪除 | 已永久刪除 |
        | 保存神社 | 海邊縮圖 |
        | 保存預設圖 | 預設圖 |

  # Acceptance: trip-state-conflicts-and-access／舊移入重送；trip-thumbnail-lifecycle／神社保存不覆蓋海邊
  @B006-018
  Rule: 過期原操作重送不覆寫較新意圖

    Scenario Outline: <原操作>／<目前狀態> 的資料組合
      Given 原次 "<原操作>" 已成功但回應遺失，目前為 "<目前狀態>"
      When owner 重送同一次原旅行操作
      Then 原收據重播而較新意圖保持不變

      Examples:
        | 原操作 | 目前狀態 |
        | 移至垃圾桶 | 垃圾桶 |
        | 移至垃圾桶 | 一般可用 |
        | 永久刪除 | 已永久刪除 |
        | 保存神社 | 海邊縮圖 |
        | 保存預設圖 | 預設圖 |

  # Acceptance: trip-state-conflicts-and-access／回應遺失先查證
  @B006-019
  Rule: 尚無收據不宣告原操作失敗

    Example: 旅行生命週期基準為 "一般可用"；原旅行操作尚無可讀取收據
      Given 旅行生命週期基準為 "一般可用"
      And 原旅行操作尚無可讀取收據
      When owner 查證同一次原旅行操作
      Then 查無收據不等於命令失敗

  # Acceptance: trip-state-conflicts-and-access／較新意圖不被過期操作覆寫
  @B006-020
  Rule: 過期的新命令不能覆寫當前版本

    Scenario Outline: <衝突>／<錯誤> 的資料組合
      Given 旅行生命週期基準為 "一般可用"
      And 本次旅行命令使用 "<衝突>"
      When owner 執行旅行命令 "保存神社"
      Then 命令拒絕為 "<錯誤>" 且沒有部分變更

      Examples:
        | 衝突 | 錯誤 |
        | 舊生命週期版本 | TRIP_STATE_CHANGED |
        | 舊縮圖版本 | THUMBNAIL_UPDATED |
        | 同操作識別不同內容 | OPERATION_ID_CONFLICT |

  # Acceptance: trip-state-conflicts-and-access／保存與移入競爭：移入先完成
  @B006-021
  Rule: 旅行先移入後拒絕舊表單保存

    Example: 旅行生命週期基準為 "一般可用"；另一裝置的 "移至垃圾桶" 已先取得旅行寫入順序
      Given 旅行生命週期基準為 "一般可用"
      And 另一裝置的 "移至垃圾桶" 已先取得旅行寫入順序
      When owner 保存 JPY 500 的點心支出
      Then 點心保存結果為 "拒絕"

  # Acceptance: trip-state-conflicts-and-access／保存與移入競爭：保存先完成
  @B006-022
  Rule: 已成功的支出隨旅行完整保留

    Example: 旅行生命週期基準為 "一般可用"；另一裝置的 "保存點心" 已先取得旅行寫入順序
      Given 旅行生命週期基準為 "一般可用"
      And 另一裝置的 "保存點心" 已先取得旅行寫入順序
      When owner 執行旅行命令 "移至垃圾桶"
      Then 垃圾桶中恰有一筆點心且其餘帳務保持

  # Acceptance: trip-state-conflicts-and-access／圖片處理不能越過已生效旅行狀態
  @B006-023
  Rule: 圖片處理完成不得越過已生效的旅行狀態

    Scenario Outline: <先完成> 的資料組合
      Given 旅行生命週期基準為 "一般可用"
      And 本次新圖片已開始處理但尚未提交
      And 另一裝置的 "<先完成>" 已先取得旅行寫入順序
      When 原次圖片處理完成並嘗試保存
      Then 新圖片未落地且已生效的旅行狀態保持

      Examples:
        | 先完成 |
        | 移至垃圾桶 |
        | 永久刪除 |
