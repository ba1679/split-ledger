Feature: 旅行結果查證與舊連結

  # Acceptance: trip-state-conflicts-and-access／移入與purge結果未知
  @F006-062
  Rule: 生命週期回應遺失先查證原操作

    Scenario Outline: <畫面>／<操作>／<動作> 的資料組合
      Given owner 的旅行管理畫面為 "<畫面>"
      And 本次 "<操作>" 已提交但回應將遺失且暫不可查證
      When owner 選擇旅行操作 "<動作>"
      Then 結果未確認並保留原操作的查證出口

      Examples:
        | 畫面 | 操作 | 動作 |
        | 移入確認 | 移至垃圾桶 | 確認移入 |
        | 永久刪除確認 | 永久刪除 | 確認永久刪除 |

  # Acceptance: trip-state-conflicts-and-access／原結果與較新意圖；trip-thumbnail-lifecycle／圖片未知再次查證
  @F006-065
  Rule: 再次查證不覆寫後續已確認狀態

    Scenario Outline: <操作> 的資料組合
      Given 原次 "<操作>" 結果未知且現在可查證
      When owner 再次查證原旅行操作
      Then 畫面分別顯示原次結果與目前旅行狀態

      Examples:
        | 操作 |
        | 移入後已復原 |
        | 圖片後已換海邊 |
        | 永久刪除 |
        | 保存預設圖 |
        | 新增附圖 |

  # Acceptance: trip-state-conflicts-and-access／舊連結拒絕；purge後無法重建
  @F006-067
  Rule: 舊帳本入口遵守最新旅行生命週期

    Scenario Outline: <狀態> 的資料組合
      Given 旅行已在另一裝置成為 "<狀態>" 且本裝置保留舊帳本
      When owner 開啟原旅行舊連結
      Then 舊連結只提供 "<狀態>" 的下一步而不顯示帳務

      Examples:
        | 狀態 |
        | 垃圾桶 |
        | 已永久刪除 |

  # Acceptance: trip-state-conflicts-and-access／明確失敗回饋
  @F006-068
  Rule: 生命週期明確失敗結束等待並保留前態

    Scenario Outline: <畫面>／<操作>／<動作> 的資料組合
      Given owner 的旅行管理畫面為 "<畫面>"
      And 本次旅行 "<操作>" 將明確失敗
      When owner 選擇旅行操作 "<動作>"
      Then 旅行操作失敗可重試且沒有成功假象

      Examples:
        | 畫面 | 操作 | 動作 |
        | 移入確認 | 移至垃圾桶 | 確認移入 |
        | 垃圾桶 | 復原 | 復原 |
        | 永久刪除確認 | 永久刪除 | 確認永久刪除 |

  # Acceptance: trip-state-conflicts-and-access／新意圖保護；UI S05衝突
  @F006-102
  Rule: 圖片版本衝突先讀取目前狀態

    Scenario Outline: <衝突> 的資料組合
      Given 其他裝置已使縮圖提交的 "<衝突>" 過期
      When owner 提交目前圖片草稿
      Then 畫面說明衝突並保留目前權威狀態

      Examples:
        | 衝突 |
        | 圖片版本 |
        | 旅行版本 |

  # Acceptance: site-wide-loading／結果未知出口；trip-state-conflicts-and-access／先查證
  @F006-108
  Rule: 旅行操作查證未果有可執行出口

    Scenario Outline: <操作> 的資料組合
      Given 原旅行命令 "<操作>" 查證中且本輪無法確認
      When 本輪旅行操作查證結束仍未知
      Then 旅行操作停止忙碌且保留原次查證入口

      Examples:
        | 操作 |
        | 移入 |
        | purge |
        | 神社保存 |
        | 預設保存 |
        | 新增附圖 |
