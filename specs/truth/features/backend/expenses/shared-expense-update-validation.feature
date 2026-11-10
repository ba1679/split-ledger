Feature: 修改共同支出的成員驗證

  Rule: 修改支出必須使用有效分攤成員
    Example: 無分攤者
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 晚餐 | JPY | 300 | Alice | Alice、Amy、Bob |
      And 支出驗證用的停用與跨旅行成員已建立
      When owner 嘗試以 "無分攤者" 修改既有共同支出
      Then 支出修改被拒絕且舊分攤與安排完全保留

    Example: 重複分攤者
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 晚餐 | JPY | 300 | Alice | Alice、Amy、Bob |
      And 支出驗證用的停用與跨旅行成員已建立
      When owner 嘗試以 "重複分攤者" 修改既有共同支出
      Then 支出修改被拒絕且舊分攤與安排完全保留

    Example: 停用付款人
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 晚餐 | JPY | 300 | Alice | Alice、Amy、Bob |
      And 支出驗證用的停用與跨旅行成員已建立
      When owner 嘗試以 "停用付款人" 修改既有共同支出
      Then 支出修改被拒絕且舊分攤與安排完全保留

    Example: 停用分攤者
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 晚餐 | JPY | 300 | Alice | Alice、Amy、Bob |
      And 支出驗證用的停用與跨旅行成員已建立
      When owner 嘗試以 "停用分攤者" 修改既有共同支出
      Then 支出修改被拒絕且舊分攤與安排完全保留

    Example: 跨旅行付款人
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 晚餐 | JPY | 300 | Alice | Alice、Amy、Bob |
      And 支出驗證用的停用與跨旅行成員已建立
      When owner 嘗試以 "跨旅行付款人" 修改既有共同支出
      Then 支出修改被拒絕且舊分攤與安排完全保留

    Example: 跨旅行分攤者
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 晚餐 | JPY | 300 | Alice | Alice、Amy、Bob |
      And 支出驗證用的停用與跨旅行成員已建立
      When owner 嘗試以 "跨旅行分攤者" 修改既有共同支出
      Then 支出修改被拒絕且舊分攤與安排完全保留

