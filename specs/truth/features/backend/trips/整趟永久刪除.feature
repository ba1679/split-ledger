Feature: 整趟永久刪除

  # Acceptance: trip-trash-and-restoration／只有垃圾桶中的旅行能經另一次確認而永久刪除；trip-thumbnail-lifecycle／永久刪除圖片
  @B006-007
  Rule: 永久刪除清除全部旅行專屬資料

    Example: 旅行生命週期基準為 "垃圾桶"；其他旅行與共用資料保持原狀
      Given 旅行生命週期基準為 "垃圾桶"
      When owner 執行旅行命令 "永久刪除"
      Then 整趟旅行清除後才提交永久刪除結果
      And 其他旅行與共用資料保持原狀

  # Acceptance: trip-trash-and-restoration／拒絕直接永久刪除
  @B006-008
  Rule: 一般旅行不能略過垃圾桶永久刪除

    Example: 旅行生命週期基準為 "一般可用"
      Given 旅行生命週期基準為 "一般可用"
      When owner 執行旅行命令 "永久刪除"
      Then 命令拒絕為 "TRIP_NOT_TRASHED" 且沒有部分變更

  # Acceptance: trip-state-conflicts-and-access／永久刪除回應遺失後重送原建立
  @B006-009
  Rule: 永久刪除不能由舊建立重試復活旅行

    Example: 旅行生命週期基準為 "已永久刪除"
      Given 旅行生命週期基準為 "已永久刪除"
      When owner 執行旅行命令 "新建原旅行"
      Then 命令拒絕為 "ID_CONFLICT" 且沒有部分變更

  # Acceptance: trip-state-conflicts-and-access／永久刪除後另一裝置復原
  @B006-010
  Rule: 已刪旅行不再接受復原

    Example: 旅行生命週期基準為 "已永久刪除"
      Given 旅行生命週期基準為 "已永久刪除"
      When owner 執行旅行命令 "復原"
      Then 命令拒絕為 "TRIP_PURGED" 且沒有部分變更

  # Acceptance: FR-006／單筆歷史保護維持；research決策8
  @B006-114
  Rule: 整趟清除例外不放寬一般歷史保護

    Scenario Outline:  的資料組合
      Given 一般旅行的不可變歷史與owner成員已存在
      When 嘗試一般 "<歷史操作>"
      Then 一般歷史保護仍拒絕且資料完全不變

      Examples:
        | 歷史操作 |
        | 刪除owner成員 |
        | 刪除還款 |
        | 改寫還款 |
        | 刪除結清 |
        | 改寫結清 |
        | 刪除調整 |
        | 改寫調整 |
