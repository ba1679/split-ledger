Feature: 支出來源修正後的歷史實付保留

  Rule: 刪除支出後保留獨立實付事實
    Example: 原支出一千且Amy已還四百
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 午餐 | JPY | 1000 | Alice | Amy |
      And owner 的分帳旅行已有下列獨立還款：
        | 付款人 | 收款人 | 幣別 | 金額 | 日期 |
        | Amy | Alice | JPY | 400 | 2027-01-20 |
      When owner 刪除已有還款的原支出
      Then 已記錄還款保持原事實

  Rule: 刪除支出後既有實付可形成反向餘額
    Example: 原支出一千且Amy已還四百
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 午餐 | JPY | 1000 | Alice | Amy |
      And owner 的分帳旅行已有下列獨立還款：
        | 付款人 | 收款人 | 幣別 | 金額 | 日期 |
        | Amy | Alice | JPY | 400 | 2027-01-20 |
      When owner 刪除已有還款的原支出
      Then 該旅行的付款安排為：
        | 付款人 | 收款人 | 幣別 | 金額 |
        | Alice | Amy | JPY | 400 |

  Rule: 來源修改不能改寫歷史結清
    Example: 已結清後金額改為八百
      Given 原支出已以 Amy 實付 JPY 33 結清
      When owner 將原支出金額改為 JPY 800
      Then 原支出修正後的歷史結清快照保持不變

  Rule: 來源刪除不能刪除歷史結清
    Example: 已結清後刪除來源
      Given 原支出已以 Amy 實付 JPY 33 結清
      When owner 刪除已有還款的原支出
      Then 原支出修正後的歷史結清快照保持不變

  Rule: 來源金額降低後保留超出的既有還款
    Example: 一千支出降為三百且Amy已還四百
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 午餐 | JPY | 1000 | Alice | Amy |
      And owner 的分帳旅行已有下列獨立還款：
        | 付款人 | 收款人 | 幣別 | 金額 | 日期 |
        | Amy | Alice | JPY | 400 | 2027-01-20 |
      When owner 將原支出金額改為 JPY 300
      Then 該旅行的付款安排為：
        | 付款人 | 收款人 | 幣別 | 金額 |
        | Alice | Amy | JPY | 100 |

  Rule: 修改支出幣別重建新幣別貢獻
    Example: 台幣三百改日圓兩百且既有台幣還款保留
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 晚餐 | TWD | 300 | Alice | Amy |
      And owner 的分帳旅行已有下列獨立還款：
        | 付款人 | 收款人 | 幣別 | 金額 | 日期 |
        | Amy | Alice | TWD | 100 | 2027-01-20 |
      When owner 將原支出改為 JPY 200
      Then 該旅行的付款安排為：
        | 付款人 | 收款人 | 幣別 | 金額 |
        | Alice | Amy | TWD | 100 |
        | Amy | Alice | JPY | 200 |
