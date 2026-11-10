Feature: 分幣別餘額與債務簡化

  Rule: 每個幣別必須獨立計算應收應付與付款安排

    Example: 同一批成員同時有日幣與台幣債務時不換算也不互抵
      Given owner 已在 "日本旅行" 記錄以下共同支出：
        | 項目     | 金額    | 付款人 | 分攤者 |
        | 日幣車票 | JPY 600 | owner  | Amy    |
        | 台幣機票 | TWD 900 | Amy    | owner  |
      When owner 查看每位成員的結算餘額
      Then 結算餘額分別為：
        | 成員  | 幣別 | 淨額    | 意義 |
        | owner | JPY  | 600     | 應收 |
        | Amy   | JPY  | -600    | 應付 |
        | owner | TWD  | -900    | 應付 |
        | Amy   | TWD  | 900     | 應收 |
      And JPY 與 TWD 不會相加、換算或互相抵扣
      And 每個幣別所有成員的精確淨額總和都是 0

  Rule: Simplify Debts 只重新安排付款對象且不得改變任何人的淨額

    Example: Alice 經 Bob 間接欠 Carol 的兩筆付款被簡化為一筆
      Given owner 已在 "日本旅行" 記錄以下共同支出：
        | 項目       | 金額   | 付款人 | 分攤者 |
        | Alice 車票 | JPY 60 | Bob    | Alice  |
        | Bob 門票   | JPY 60 | Carol  | Bob    |
      And "日本旅行" 的 Simplify Debts 已關閉
      When owner 查看未簡化的付款安排
      Then 未簡化的付款安排如下：
        | 付款人 | 收款人 | 金額   |
        | Alice  | Bob    | JPY 60 |
        | Bob    | Carol  | JPY 60 |
      And 成員淨額如下：
        | 成員  | JPY 淨額 |
        | Alice | -60      |
        | Bob   | 0        |
        | Carol | 60       |
      When owner 開啟 Simplify Debts
      Then 簡化後的付款安排如下：
        | 付款人 | 收款人 | 金額   |
        | Alice  | Carol  | JPY 60 |
      And Alice、Bob、Carol 的 JPY 淨額與簡化前完全相同
      And 原始支出、付款人、分攤者與既有還款都沒有被修改
      And 本次安排以不超過三句話說明：
        """
        Alice 原本經 Bob 間接支付 Carol。
        本次改為 Alice 直接支付 Carol JPY 60，少一筆轉帳。
        三人的淨應收應付不變，原始支出與還款紀錄也沒有修改。
        """
      When owner 離開後重新開啟 "日本旅行" 的結算
      Then Simplify Debts 仍為開啟
      And 相同資料再次產生同一筆 Alice 支付 Carol JPY 60 的安排

    Example: 沒有可減少的付款時維持原安排並清楚說明
      Given "日本旅行" 只有 Amy 應付 owner JPY 500 的一筆付款安排
      When owner 開啟 Simplify Debts
      Then 付款安排仍為 Amy 支付 owner JPY 500
      And 建議付款筆數沒有增加
      And 系統以不超過三句話說明本次沒有需要改道的付款
