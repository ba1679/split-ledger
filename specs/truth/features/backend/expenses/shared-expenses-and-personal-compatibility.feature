Feature: 共同支出的平均份額與個人支出相容

  Rule: 平均份額保留數學除法結果
    Example: 一百日圓三人分攤
      Given owner 的分帳旅行已建立成員
      When owner 記錄平均分攤支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 點心 | JPY | 100 | Alice | Alice、Amy、Bob |
      Then 該支出的分攤份額為：
        | 成員 | 幣別 | 份額 |
        | Alice | JPY | 100/3 |
        | Amy | JPY | 100/3 |
        | Bob | JPY | 100/3 |

  Rule: 付款人可以不參與分攤
    Example: Alice 替 Amy 與 Bob 付款
      Given owner 的分帳旅行已建立成員
      When owner 記錄平均分攤支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 點心 | JPY | 100 | Alice | Amy、Bob |
      Then 該支出的分攤份額為：
        | 成員 | 幣別 | 份額 |
        | Alice | JPY | 0 |
        | Amy | JPY | 50 |
        | Bob | JPY | 50 |

  Rule: owner 單人分攤沿用個人支出
    Example: 只選 Alice
      Given owner 的分帳旅行已建立成員
      When owner 記錄平均分攤支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 點心 | JPY | 100 | Alice | Alice |
      Then 該支出的分攤份額為：
        | 成員 | 幣別 | 份額 |
        | Alice | JPY | 100 |

  Rule: 舊版建立欄位相容個人支出
    Example: 舊請求沒有分帳欄位
      Given owner 的分帳旅行已建立成員
      When owner 以舊版個人支出欄位記錄機票
      Then 機票保留原始欄位且僅由 owner 付款分攤

  Rule: 既有個人支出遷移保持原始資料
    Example: 既有機票回填owner
      Given 舊版機票支出已完成分帳資料遷移
      When owner 讀取遷移後的機票支出
      Then 機票保留原始欄位且僅由 owner 付款分攤

  Rule: 無效分帳成員不得保存
    Example: 只有付款人
      Given owner 的分帳旅行已建立成員
      And 支出驗證用的停用與跨旅行成員已建立
      When owner 嘗試以 "只有付款人" 保存共同支出
      Then 這次分帳操作被拒絕為 "VALIDATION_ERROR"

    Example: 只有分攤者
      Given owner 的分帳旅行已建立成員
      And 支出驗證用的停用與跨旅行成員已建立
      When owner 嘗試以 "只有分攤者" 保存共同支出
      Then 這次分帳操作被拒絕為 "VALIDATION_ERROR"

    Example: 無分攤者
      Given owner 的分帳旅行已建立成員
      And 支出驗證用的停用與跨旅行成員已建立
      When owner 嘗試以 "無分攤者" 保存共同支出
      Then 這次分帳操作被拒絕為 "VALIDATION_ERROR"

    Example: 重複分攤者
      Given owner 的分帳旅行已建立成員
      And 支出驗證用的停用與跨旅行成員已建立
      When owner 嘗試以 "重複分攤者" 保存共同支出
      Then 這次分帳操作被拒絕為 "VALIDATION_ERROR"

    Example: 停用付款人
      Given owner 的分帳旅行已建立成員
      And 支出驗證用的停用與跨旅行成員已建立
      When owner 嘗試以 "停用付款人" 保存共同支出
      Then 這次分帳操作被拒絕為 "VALIDATION_ERROR"

    Example: 停用分攤者
      Given owner 的分帳旅行已建立成員
      And 支出驗證用的停用與跨旅行成員已建立
      When owner 嘗試以 "停用分攤者" 保存共同支出
      Then 這次分帳操作被拒絕為 "VALIDATION_ERROR"

    Example: 跨旅行付款人
      Given owner 的分帳旅行已建立成員
      And 支出驗證用的停用與跨旅行成員已建立
      When owner 嘗試以 "跨旅行付款人" 保存共同支出
      Then 這次分帳操作被拒絕為 "NOT_FOUND"

    Example: 跨旅行分攤者
      Given owner 的分帳旅行已建立成員
      And 支出驗證用的停用與跨旅行成員已建立
      When owner 嘗試以 "跨旅行分攤者" 保存共同支出
      Then 這次分帳操作被拒絕為 "NOT_FOUND"

