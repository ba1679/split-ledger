Feature: 共同支出與分攤顯示

  Rule: 共同支出均分金額以最多兩位小數顯示
    Example: 三人分攤 JPY 100
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 點心 | JPY | 100 | Alice | Alice、Amy、Bob |
      When owner 查看支出 "點心" 的分攤
      Then 點心各成員分攤金額皆顯示 "JPY 33.33" 且不附算式

  Rule: 共同支出顯示末位四捨五入
    Example: 三人分攤 JPY 200
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 點心 | JPY | 200 | Alice | Alice、Amy、Bob |
      When owner 查看支出 "點心" 的分攤
      Then 點心各成員分攤金額皆顯示 "JPY 66.67" 且不附算式

  Rule: 共同支出顯示不補多餘的零
    Example: 兩人分攤 JPY 100
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 點心 | JPY | 100 | Alice | Amy、Bob |
      When owner 查看支出 "點心" 的分攤
      Then 點心各成員分攤金額皆顯示 "JPY 50" 且不附算式

  Rule: 共同支出保存後呈現權威分攤
    Example: Alice 付點心三人分攤
      Given owner 已填共同支出點心 JPY 100、付款 Alice、分攤 Alice、Amy、Bob
      When owner 保存共同支出
      Then 點心已保存且三人各分攤 JPY 100/3

  Rule: 付款人可以不負擔支出
    Example: Alice 替 Amy 與 Bob 付點心
      Given owner 已填共同支出點心 JPY 100、付款 Alice、分攤 Amy、Bob
      When owner 保存共同支出
      Then 點心只有 Amy 與 Bob 各分攤 JPY 50 且 Alice 應收 JPY 100

  Rule: 未選分攤者不得保存
    Example: 取消全部分攤者
      Given owner 已填共同支出點心但未選任何分攤者
      When owner 保存共同支出
      Then 分攤欄提示至少選一人且帳務不變

  Rule: 未選付款人不得保存
    Example: 付款人空白
      Given owner 已填共同支出點心但未選付款人
      When owner 保存共同支出
      Then 付款欄提示選擇付款人且帳務不變

  Rule: 舊個人支出顯示保持相容
    Example: 原有 TWD 8000 機票
      Given Phase 1A 已有 2027-01-15 的 TWD 8000 機票
      When owner 查看支出 "機票" 的分攤
      Then 機票仍由 Alice 付款且只由 Alice 分攤並保留原始內容與統計
