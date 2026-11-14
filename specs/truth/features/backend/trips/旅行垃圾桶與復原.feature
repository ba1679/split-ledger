Feature: 旅行垃圾桶與復原

  # Acceptance: trip-trash-and-restoration／移至垃圾桶必須明確確認並保留整趟旅行供復原
  @B006-001
  Rule: 移至垃圾桶只改旅行生命週期

    Example: 旅行生命週期基準為 "一般可用"
      Given 旅行生命週期基準為 "一般可用"
      When owner 執行旅行命令 "移至垃圾桶"
      Then 旅行以同一身分成為垃圾桶

  # Acceptance: trip-trash-and-restoration／完整復原；trip-thumbnail-lifecycle／垃圾桶保留原縮圖
  @B006-002
  Rule: 移至垃圾桶保留原帳務與縮圖

    Example: 旅行生命週期基準為 "一般可用"；其他旅行與共用資料保持原狀
      Given 旅行生命週期基準為 "一般可用"
      When owner 執行旅行命令 "移至垃圾桶"
      Then 旅行專屬資料與帳務對照完全一致
      And 其他旅行與共用資料保持原狀

  # Acceptance: trip-trash-and-restoration／移至垃圾桶必須明確確認並保留整趟旅行供復原
  @B006-003
  Rule: 復原只改旅行生命週期

    Example: 旅行生命週期基準為 "垃圾桶"
      Given 旅行生命週期基準為 "垃圾桶"
      When owner 執行旅行命令 "復原"
      Then 旅行以同一身分成為一般可用

  # Acceptance: trip-trash-and-restoration／完整復原；trip-thumbnail-lifecycle／垃圾桶保留原縮圖
  @B006-004
  Rule: 復原保留原帳務與縮圖

    Example: 旅行生命週期基準為 "垃圾桶"；其他旅行與共用資料保持原狀
      Given 旅行生命週期基準為 "垃圾桶"
      When owner 執行旅行命令 "復原"
      Then 旅行專屬資料與帳務對照完全一致
      And 其他旅行與共用資料保持原狀

  # Acceptance: trip-trash-and-restoration／清單與垃圾桶；trip-state-conflicts-and-access／垃圾桶旅行禁止一般帳本
  @B006-005
  Rule: 一般清單按旅行狀態隔離

    Example: 旅行生命週期基準為 "垃圾桶"
      Given 旅行生命週期基準為 "垃圾桶"
      When owner 讀取 "一般" 旅行清單
      Then 清單只包含 "一般可用" 的本人旅行

  # Acceptance: trip-trash-and-restoration／清單與垃圾桶；trip-state-conflicts-and-access／垃圾桶旅行禁止一般帳本
  @B006-006
  Rule: 垃圾桶清單按旅行狀態隔離

    Example: 旅行生命週期基準為 "垃圾桶"
      Given 旅行生命週期基準為 "垃圾桶"
      When owner 讀取 "垃圾桶" 旅行清單
      Then 清單只包含 "垃圾桶" 的本人旅行

  # Acceptance: trip-trash-and-restoration／保留中的旅行不因時間自動永久刪除
  @B006-011
  Rule: 經過時間不會自動永久刪除

    Example: 垃圾桶旅行已保留 180 天且期間未要求永久刪除；旅行專屬資料與帳務對照完全一致
      Given 旅行生命週期基準為 "垃圾桶"
      And 垃圾桶旅行已保留 180 天且期間未要求永久刪除
      When owner 讀取 "垃圾桶" 旅行清單
      Then 清單只包含 "垃圾桶" 的本人旅行
      And 旅行專屬資料與帳務對照完全一致
