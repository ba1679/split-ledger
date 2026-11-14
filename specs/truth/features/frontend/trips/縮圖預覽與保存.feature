Feature: 縮圖預覽與保存

  # Acceptance: trip-thumbnail-lifecycle／選圖與使用預設圖都只改預覽
  @F006-045
  Rule: 選圖與使用預設圖都只改本地草稿

    Scenario Outline: <草稿> 的資料組合
      Given owner 的旅行管理畫面為 "縮圖編輯"
      When owner 將縮圖預覽切為 "<草稿>"
      Then 畫面預覽 "<草稿>" 並清楚標示尚未保存

      Examples:
        | 草稿 |
        | 神社照片 |
        | 預設圖 |

  # Acceptance: trip-thumbnail-lifecycle／保存前取消X與Escape
  @F006-046
  Rule: 預覽後取消放棄圖片草稿

    Scenario Outline: <草稿>／<方式> 的資料組合
      Given owner 的旅行管理畫面為 "縮圖編輯"
      And 目前縮圖草稿為 "<草稿>" 且尚未保存
      When owner 以 "<方式>" 關閉 "縮圖編輯"
      Then 關閉未確認操作不改變旅行資料

      Examples:
        | 草稿 | 方式 |
        | 神社照片 | 取消 |
        | 神社照片 | X |
        | 神社照片 | Escape |
        | 預設圖 | 取消 |
        | 預設圖 | X |
        | 預設圖 | Escape |

  # Acceptance: trip-thumbnail-lifecycle／關閉後重新開啟
  @F006-047
  Rule: 重新開啟只顯示目前已保存縮圖

    Example: 前次縮圖草稿已取消且原縮圖為富士山；管理旅行選單已展開
      Given owner 的旅行管理畫面為 "帳本"
      And 前次縮圖草稿已取消且原縮圖為富士山
      And 管理旅行選單已展開
      When owner 選擇旅行操作 "自訂旅行縮圖"
      Then 縮圖編輯顯示富士山而非已放棄草稿

  # Acceptance: trip-thumbnail-lifecycle／取消選檔；預設圖來回切換
  @F006-048
  Rule: 取消選檔保留既有預覽意圖

    Scenario Outline: <草稿> 的資料組合
      Given owner 的旅行管理畫面為 "縮圖編輯"
      And 目前縮圖草稿為 "<草稿>" 且尚未保存
      When owner 取消檔案選擇
      Then 縮圖草稿仍為 "<草稿>" 且遠端未變

      Examples:
        | 草稿 |
        | 富士山 |
        | 預設圖 |

  # Acceptance: trip-thumbnail-lifecycle／最後選定的預覽保存
  @F006-049
  Rule: 保存只提交最後選定的縮圖意圖

    Scenario Outline: <草稿> 的資料組合
      Given owner 的旅行管理畫面為 "縮圖編輯"
      And 目前縮圖草稿為 "<草稿>" 且尚未保存
      When owner 選擇旅行操作 "保存圖片"
      Then 最後預覽的 "<草稿>" 成為已保存縮圖

      Examples:
        | 草稿 |
        | 神社照片 |
        | 預設圖 |

  # Acceptance: trip-thumbnail-lifecycle／明確保存失敗保留草稿
  @F006-050
  Rule: 圖片保存明確失敗保留原圖與可重試草稿

    Scenario Outline: <草稿> 的資料組合
      Given owner 的旅行管理畫面為 "縮圖編輯"
      And 目前縮圖草稿為 "<草稿>" 且尚未保存
      And 本次圖片保存將明確失敗且確定未提交
      When owner 選擇旅行操作 "保存圖片"
      Then 圖片失敗有下一步且草稿仍為 "<草稿>"

      Examples:
        | 草稿 |
        | 神社照片 |
        | 預設圖 |

  # Acceptance: trip-thumbnail-lifecycle／問題解除後重試成功
  @F006-051
  Rule: 失敗解除可保存保留的縮圖草稿

    Scenario Outline: <草稿> 的資料組合
      Given owner 的旅行管理畫面為 "縮圖編輯"
      And 目前縮圖草稿為 "<草稿>" 且尚未保存
      And 前次圖片明確失敗已解除且草稿仍可用
      When owner 選擇旅行操作 "保存圖片"
      Then 最後預覽的 "<草稿>" 成為已保存縮圖

      Examples:
        | 草稿 |
        | 神社照片 |
        | 預設圖 |

  # Acceptance: trip-thumbnail-lifecycle／神社或預設圖保存結果未知
  @F006-063
  Rule: 圖片回應遺失保留草稿並查證原保存

    Scenario Outline: <草稿> 的資料組合
      Given owner 的旅行管理畫面為 "縮圖編輯"
      And 目前縮圖草稿為 "<草稿>" 且尚未保存
      And 本次 "保存圖片" 已提交但回應將遺失且暫不可查證
      When owner 選擇旅行操作 "保存圖片"
      Then 結果未確認並保留原操作的查證出口

      Examples:
        | 草稿 |
        | 神社照片 |
        | 預設圖 |

  # Acceptance: trip-thumbnail-lifecycle／關閉不等於撤銷保存
  @F006-066
  Rule: 提交後關閉不撤銷原圖片保存

    Example: owner 的旅行管理畫面為 "縮圖編輯"；預設縮圖保存已送出且查證結束仍未知
      Given owner 的旅行管理畫面為 "縮圖編輯"
      And 預設縮圖保存已送出且查證結束仍未知
      When owner 以 "X" 關閉 "縮圖編輯"
      Then 關閉後原圖片操作仍可查證且沒有撤銷命令

  # Acceptance: site-wide-loading-and-operation-feedback／上傳中斷
  @F006-095
  Rule: 上傳確定中斷提供重新嘗試

    Example: 目前縮圖草稿為 "神社照片" 且尚未保存；新縮圖上傳會在提交前中斷且確定未保存
      Given owner 的旅行管理畫面為 "縮圖編輯"
      And 目前縮圖草稿為 "神社照片" 且尚未保存
      And 新縮圖上傳會在提交前中斷且確定未保存
      When owner 選擇旅行操作 "保存圖片"
      Then 上傳等待結束且原縮圖與帳務維持

  # Acceptance: trip-thumbnail-lifecycle／關閉再返回原次查證
  @F006-109
  Rule: 關閉返回仍可查證原預設圖保存

    Example: 原次預設圖片結果未知且編輯曾關閉再返回
      Given 原次預設圖片結果未知且編輯曾關閉再返回
      When owner 查證返回後的原次圖片保存
      Then 返回後仍確認同一次預設圖片保存

  # Acceptance: site-wide-loading-and-operation-feedback／中斷後重新選圖保存成功
  @F006-113
  Rule: 提交前中斷恢復後可保存圖片

    Example: 前次圖片上傳在提交前中斷且現已恢復連線
      Given 前次圖片上傳在提交前中斷且現已恢復連線
      When owner 重試中斷後的圖片保存
      Then 重試圖片保存成功且沒有殘留等待
