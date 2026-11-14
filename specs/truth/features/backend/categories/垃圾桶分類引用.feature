Feature: 垃圾桶分類引用

  # Acceptance: trip-trash-and-restoration／垃圾桶保留帳務引用
  @B006-032
  Rule: 垃圾桶引用仍計入分類使用筆數

    Example: 餐飲分類僅被垃圾桶旅行的一筆支出引用
      Given 餐飲分類僅被垃圾桶旅行的一筆支出引用
      When owner 查詢垃圾桶旅行使用的分類
      Then 分類使用筆數仍為 1

  # Acceptance: trip-trash-and-restoration／分類引用刪除保護
  @B006-033
  Rule: 垃圾桶引用仍阻止刪除共用分類

    Example: 餐飲分類僅被垃圾桶旅行的一筆支出引用
      Given 餐飲分類僅被垃圾桶旅行的一筆支出引用
      When owner 刪除垃圾桶旅行使用的分類
      Then 分類因仍被使用而拒絕刪除
