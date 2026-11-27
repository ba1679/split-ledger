Feature: 旅行管理與確認

  # Acceptance: trip-thumbnail-lifecycle／旅行卡片右上角開啟選單
  @F006-034
  Rule: 旅行卡片直接展開操作選單

    Example: owner 的旅行管理畫面為 "旅行清單"
      Given owner 的旅行管理畫面為 "旅行清單"
      When owner 選擇旅行操作 "管理旅行"
      Then 管理選單列出日期、縮圖與移入入口而不遮罩旅行清單

  # Acceptance: trip-thumbnail-lifecycle／管理選單進入各項操作
  @F006-035
  Rule: 管理選單導向縮圖編輯

    Example: owner 的旅行管理畫面為 "旅行清單"；管理旅行選單已展開
      Given owner 的旅行管理畫面為 "旅行清單"
      And 管理旅行選單已展開
      When owner 選擇旅行操作 "自訂旅行縮圖"
      Then 畫面進入縮圖編輯且尚未保存

  # Acceptance: trip-thumbnail-lifecycle／管理選單進入各項操作
  @F006-036
  Rule: 管理選單導向移入確認

    Example: owner 的旅行管理畫面為 "旅行清單"；管理旅行選單已展開
      Given owner 的旅行管理畫面為 "旅行清單"
      And 管理旅行選單已展開
      When owner 選擇旅行操作 "移至垃圾桶"
      Then 畫面進入移入確認且尚未保存

  # Acceptance: trip-thumbnail-lifecycle／管理選單Escape
  @F006-037
  Rule: 關閉管理選單回到原觸發點

    Example: owner 的旅行管理畫面為 "旅行清單"；管理旅行選單已展開
      Given owner 的旅行管理畫面為 "旅行清單"
      And 管理旅行選單已展開
      When owner 按 Escape 關閉管理選單
      Then 選單關閉且焦點返回管理旅行

  # Acceptance: trip-trash-and-restoration／另一次確認永久刪除
  @F006-038
  Rule: 永久刪除有獨立且明確的確認

    Example: owner 的旅行管理畫面為 "垃圾桶"
      Given owner 的旅行管理畫面為 "垃圾桶"
      When owner 選擇旅行操作 "永久刪除"
      Then 確認內容說明 "永久刪除不可復原"

  # Acceptance: trip-trash-and-restoration／取消與未確認關閉
  @F006-039
  Rule: 未明確確認的關閉不執行旅行刪除

    Scenario Outline: <編輯>／<方式> 的資料組合
      Given owner 的旅行管理畫面為 "<編輯>"
      When owner 以 "<方式>" 關閉 "<編輯>"
      Then 關閉未確認操作不改變旅行資料

      Examples:
        | 編輯 | 方式 |
        | 移入確認 | 取消 |
        | 移入確認 | X |
        | 移入確認 | Escape |
        | 永久刪除確認 | 取消 |
        | 永久刪除確認 | X |
        | 永久刪除確認 | Escape |

  # Acceptance: trip-trash-and-restoration／移入成功返回清單
  @F006-040
  Rule: 移入成功更新清單與帳本入口

    Example: owner 的旅行管理畫面為 "移入確認"
      Given owner 的旅行管理畫面為 "移入確認"
      When owner 選擇旅行操作 "確認移入"
      Then 移入成功回到一般清單並更新相關入口

  # Acceptance: trip-trash-and-restoration／另一裝置完整復原
  @F006-041
  Rule: 復原更新兩份清單而不重建帳務

    Example: owner 的旅行管理畫面為 "垃圾桶"
      Given owner 的旅行管理畫面為 "垃圾桶"
      When owner 選擇旅行操作 "復原"
      Then 復原後原旅行重新可開啟且垃圾桶移除該項

  # Acceptance: trip-trash-and-restoration／清除完成才回報成功
  @F006-042
  Rule: 永久刪除成功清除垃圾桶項目

    Example: owner 的旅行管理畫面為 "永久刪除確認"
      Given owner 的旅行管理畫面為 "永久刪除確認"
      When owner 選擇旅行操作 "確認永久刪除"
      Then 完成整趟清除後才顯示永久刪除成功

  # Acceptance: trip-trash-and-restoration／垃圾桶可到達；plan Wave3導航保護
  @F006-043
  Rule: 從旅行清單頁首進入垃圾桶

    Scenario Outline: <裝置> 的資料組合
      Given owner 的旅行管理畫面為 "旅行清單"
      When owner 從 "<裝置>" 的我的旅行導覽進入垃圾桶
      Then 垃圾桶導覽可達且不冒用旅行內導覽

      Examples:
        | 裝置 |
        | 手機 |
        | 桌面電腦 |

  # Acceptance: trip-trash-and-restoration／兩種空狀態
  @F006-044
  Rule: 成功讀取空清單才顯示對應空狀態

    Scenario Outline: <清單> 的資料組合
      Given 目前 "<清單>" 已成功確認沒有旅行
      When owner 開啟 "<清單>"
      Then 畫面呈現 "<清單>" 的真正空狀態

      Examples:
        | 清單 |
        | 一般清單 |
        | 垃圾桶 |
