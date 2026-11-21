Feature: 修正帳目後取得一致的分類花費

  # FR-002、006～007、010、012～013；SC-004。
  # 各例資料表為該旅行全部支出；分攤者均為等額分攤。

  Rule: 支出修正後，兩張圖反映最新保存的金額與分攤資格

    Example: 調高晚餐金額後改由別人單人負擔，再刪除該筆支出
      Given Alice 已登入並擁有「台南旅行」，同行者為 Amy 與 Bob
      And 「台南旅行」已有以下支出：
        | 項目 | 分類 | 幣別 | 金額 | 付款人 | 分攤者          |
        | 晚餐 | 餐飲 | TWD  | 900  | Alice  | Alice、Amy、Bob |
        | 車票 | 交通 | TWD  | 600  | Amy    | Alice、Amy、Bob |
      When Alice 查看 TWD 花費分析
      Then 個人圖總額為 TWD 500，團體圖總額為 TWD 1500
      When Alice 將「晚餐」金額改為 TWD 1200 並保存成功後再次查看分析
      Then 個人圖餐飲為 TWD 400、交通為 TWD 200、總額為 TWD 600
      And 團體圖餐飲為 TWD 1200、交通為 TWD 600、總額為 TWD 1800
      And 兩圖餐飲與交通的占比分別為 2/3 與 1/3
      When Alice 將「晚餐」分攤者改為只有 Bob 並保存成功後再次查看分析
      Then 兩圖都只剩交通分類，占比均為 100%
      And 個人圖總額為 TWD 200，團體圖總額為 TWD 600
      When Alice 刪除「晚餐」成功後再次查看分析
      Then 兩圖仍只有交通，個人總額為 TWD 200，團體總額為 TWD 600

  Rule: 支出改幣別後，分類金額從舊幣別移至新幣別

    Example: 將日幣車票修正為美元後在兩個幣別之間核對
      Given Alice 已登入並擁有「日本旅行」，同行者為 Amy 與 Bob
      And 「日本旅行」已有以下支出：
        | 項目 | 分類 | 幣別 | 金額 | 付款人 | 分攤者          |
        | 車票 | 交通 | JPY  | 300  | Alice  | Alice、Amy、Bob |
        | 午餐 | 餐飲 | JPY  | 600  | Amy    | Alice、Amy、Bob |
      When Alice 將「車票」修正為 USD 30 並保存成功後查看 JPY 分析
      Then JPY 個人圖只含餐飲 200，團體圖只含餐飲 600，占比均為 100%
      When Alice 切換為 USD
      Then USD 個人圖只含交通 10，團體圖只含交通 30，占比均為 100%
      And 圖表未保留原車票 JPY 300 的分類貢獻

  Rule: 分類改名或解除關聯不遺失消費，成員改名或停用不改變歷史份額

    Example: 餐飲改名後移到未分類，再停用一位同行者
      Given Alice 已登入並擁有「台南旅行」，同行者為 Amy 與 Bob
      And 「台南旅行」只有一筆餐飲「午餐」TWD 900，由 Amy 付款並由 Alice、Amy、Bob 分攤
      When Alice 將分類「餐飲」改名為「吃喝」並保存成功後查看分析
      Then 個人與團體分類名稱都改為「吃喝」，沒有另外留下「餐飲」分類
      And 個人圖總額為 TWD 300，團體圖總額為 TWD 900
      When Alice 清除「午餐」的分類並保存成功後查看分析
      Then 兩圖都只含「未分類」，占比為 100%，兩圖總額不變
      When Alice 將 Amy 改名為「小美」並停用該同行者後再次查看分析
      Then 個人圖仍為未分類 TWD 300，團體圖仍為未分類 TWD 900
      And 「午餐」仍保留三人分攤的歷史關聯
