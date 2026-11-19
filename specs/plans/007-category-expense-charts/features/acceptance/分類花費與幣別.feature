Feature: 當前旅行的個人與團體分類花費

  # US1、US2；FR-001～010；NFR-001；SC-001～003。
  # 每例表格列出該旅行的全部支出，另有說明者除外；分攤者均為等額分攤。
  # 占比欄為數學比例，不固定畫面顯示的小數位數；分數不是要求畫面顯示算式。

  Rule: 個人依實際負擔份額統計，團體僅計至少兩人分攤的原始消費

    Example: 三人旅行同時有自己的消費、替人墊款與別人代付
      Given Alice 已登入並擁有「台南旅行」，同行者為 Amy 與 Bob
      And 「台南旅行」已有以下支出：
        | 項目   | 分類 | 幣別 | 金額 | 付款人 | 分攤者          |
        | 晚餐   | 餐飲 | TWD  | 900  | Amy    | Alice、Amy、Bob |
        | 計程車 | 交通 | TWD  | 600  | Alice  | Amy、Bob        |
        | 伴手禮 | 購物 | TWD  | 200  | Alice  | Alice           |
        | 代買品 | 購物 | TWD  | 100  | Bob    | Alice           |
        | 咖啡   | 餐飲 | TWD  | 100  | Bob    | Bob             |
      When Alice 查看「台南旅行」的花費分析並選擇 TWD
      Then 可同時查看個人與團體兩張分類花費圖
      And 個人圖的分類明細恰為：
        | 分類 | 金額 | 占比 |
        | 餐飲 | 300  | 50%  |
        | 購物 | 300  | 50%  |
      And 個人圖總額為 TWD 600
      And 團體圖的分類明細恰為：
        | 分類 | 金額 | 占比 |
        | 餐飲 | 900  | 60%  |
        | 交通 | 600  | 40%  |
      And 團體圖總額為 TWD 1500
      And 圓餅各分類比例與各自明細的占比一致
      And 團體圖清楚說明只計至少兩人分攤的共同消費

  Rule: 花費分析涵蓋當前旅行全部日期與全部已保存支出

    Example: 尚未載入全部紀錄時也包含旅行前購買的機票
      Given Alice 已登入並擁有期間為「2027-03-10」至「2027-03-15」的「日本旅行」
      And 「日本旅行」已有 24 筆各 TWD 10 的餐飲支出，全部由 Alice 付款且僅 Alice 分攤
      And 「日本旅行」另有日期為「2027-01-15」的交通支出「機票」TWD 60，由 Alice 付款且僅 Alice 分攤
      And Alice 另一趟「台南旅行」有餐飲 TWD 900，由 Alice 付款且僅 Alice 分攤
      And 「日本旅行」支出清單目前只顯示其中 20 筆餐飲
      When Alice 查看「日本旅行」的花費分析並選擇 TWD
      Then 個人圖的分類明細恰為：
        | 分類 | 金額 | 占比 |
        | 餐飲 | 240  | 80%  |
        | 交通 | 60   | 20%  |
      And 個人圖總額為 TWD 300
      When Alice 載入「日本旅行」其餘支出後再次查看分析
      Then 個人圖的分類金額、占比與總額不變

  Rule: 幣別各自統計且未分類支出不可遺漏

    Example: 從台幣切換日幣，再查看只有別人單人消費的美元
      Given Alice 已登入並擁有「日本旅行」，同行者為 Amy 與 Bob
      And 「日本旅行」已有以下支出：
        | 項目 | 分類   | 幣別 | 金額 | 付款人 | 分攤者          |
        | 車票 | 交通   | TWD  | 300  | Alice  | Alice、Amy、Bob |
        | 午餐 | 餐飲   | JPY  | 600  | Amy    | Alice、Amy、Bob |
        | 點心 | 未分類 | JPY  | 300  | Alice  | Alice           |
        | 飲料 | 餐飲   | USD  | 10   | Bob    | Bob             |
      When Alice 查看花費分析並選擇 TWD
      Then 個人圖為交通 TWD 100、團體圖為交通 TWD 300，兩圖交通占比均為 100%
      When Alice 切換為 JPY
      Then 兩張圖均清楚標示 JPY 且不混入 TWD 或 USD
      And 個人圖的分類明細恰為：
        | 分類   | 金額 | 占比 |
        | 餐飲   | 200  | 40%  |
        | 未分類 | 300  | 60%  |
      And 個人圖總額為 JPY 500
      And 團體圖只有餐飲 JPY 600，占比為 100%
      When Alice 切換為 USD
      Then 個人與團體總額均為 USD 0，兩圖各自呈現沒有符合支出的狀態
      And 不顯示代表已消費的扇形或占比
      When Alice 新增餐飲「宵夜」USD 20、由 Bob 付款且由 Amy、Bob 分攤並保存成功後再次查看 USD 分析
      Then 個人圖仍為 USD 0 且呈現沒有符合支出的狀態
      And 團體圖只有餐飲 USD 20，占比為 100%
      When Alice 切回 TWD
      Then 個人圖仍為交通 TWD 100，團體圖仍為交通 TWD 300

  Rule: 份額先精確加總，還款及結清不改變已發生的消費

    Example: 三次三人均分的點心在還款與結清前後維持一百日圓個人花費
      Given Alice 已登入並擁有「日本旅行」，同行者為 Amy 與 Bob
      And 「日本旅行」有三筆各 JPY 100 的餐飲支出，全部由 Alice 付款並由 Alice、Amy、Bob 分攤
      When Alice 查看個人圖並選擇 JPY
      Then 個人餐飲總額為 JPY 100 而非 JPY 99.99，占比為 100%
      And 團體餐飲總額為 JPY 300，占比為 100%
      When Alice 記錄 Amy 向 Alice 還款 JPY 100
      And Alice 記錄 Bob 向 Alice 實付 JPY 100 並完成結清
      And Alice 再次查看花費分析
      Then 個人餐飲總額仍為 JPY 100，團體餐飲總額仍為 JPY 300
      And 兩張圖的分類占比不變
