Feature: 共同支出修正後的分攤與歷史

  Rule: 修改分攤以完整新集合取代舊集合
    Example: 三人改兩人並換付款人
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 晚餐 | JPY | 300 | Alice | Alice、Amy、Bob |
      When owner 將晚餐改為由 Amy 付款並由 Amy 與 Bob 分攤 JPY 200
      Then 晚餐的新份額為 Amy 與 Bob 各 JPY 100

  Rule: 修改後付款安排僅反映最新支出
    Example: 三人改兩人後Bob付Amy
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 晚餐 | JPY | 300 | Alice | Alice、Amy、Bob |
      When owner 將晚餐改為由 Amy 付款並由 Amy 與 Bob 分攤 JPY 200
      Then 該旅行的付款安排為：
        | 付款人 | 收款人 | 幣別 | 金額 |
        | Bob | Amy | JPY | 100 |

  Rule: 刪除共同支出移除其帳務貢獻
    Example: 晚餐是唯一支出
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 晚餐 | JPY | 300 | Alice | Alice、Amy、Bob |
      When owner 刪除共同晚餐支出
      Then 晚餐已不再影響帳本與結算

  Rule: 既有還款不隨來源修正被改寫
    Example: 一千改八百且已還四百
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 晚餐 | JPY | 1000 | Alice | Amy |
      And owner 的分帳旅行已有下列獨立還款：
        | 付款人 | 收款人 | 幣別 | 金額 | 日期 |
        | Amy | Alice | JPY | 400 | 2027-01-20 |
      When owner 將原支出金額改為 JPY 800
      Then 已記錄還款保持原事實

  Rule: 來源修正後重新計算剩餘應付
    Example: 一千改八百且已還四百
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 晚餐 | JPY | 1000 | Alice | Amy |
      And owner 的分帳旅行已有下列獨立還款：
        | 付款人 | 收款人 | 幣別 | 金額 | 日期 |
        | Amy | Alice | JPY | 400 | 2027-01-20 |
      When owner 將原支出金額改為 JPY 800
      Then 該旅行的付款安排為：
        | 付款人 | 收款人 | 幣別 | 金額 |
        | Amy | Alice | JPY | 400 |

  Rule: 僅修改項目可保留停用成員歷史引用
    Example: Carol停用後更正項目
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 晚餐 | JPY | 100 | Alice | Carol |
      And 支出驗證用的停用與跨旅行成員已建立
      When owner 僅修改既有含停用分攤者支出的項目
      Then 既有停用成員的分攤集合保持原值

