Feature: 支出修正與分帳重算

  Rule: 修改或刪除共同支出後必須完整移除舊分攤並重建最新結果

    Example: 三人支出改為兩人分攤並更換付款人，最後刪除支出
      Given owner 已記錄 JPY 300 的 "晚餐"，付款人為 owner，分攤者為 owner、Amy、Bob
      Then 晚餐產生以下淨額：
        | 成員  | JPY 淨額 |
        | owner | 200      |
        | Amy   | -100     |
        | Bob   | -100     |
      When owner 將晚餐改為 JPY 200、付款人改為 Amy、分攤者改為 Amy 與 Bob
      Then 舊的三人份額與 owner 應收完全不再計入
      And 最新精確公平份額如下：
        | 成員  | 份額    |
        | Amy   | JPY 100 |
        | Bob   | JPY 100 |
      And 最新淨額如下：
        | 成員  | JPY 淨額 |
        | owner | 0        |
        | Amy   | 100      |
        | Bob   | -100     |
      When owner 刪除晚餐支出
      Then 晚餐不再列於帳本
      And owner、Amy、Bob 不再有晚餐造成的份額、淨額或付款安排

  Rule: 支出修正後既有還款保持為實際事實並參與最新重算

    Example: Amy 已部分還款後，支出金額降低但仍未造成超額
      Given owner 替 Amy 支付 JPY 1000 且該筆支出只由 Amy 分攤
      And Amy 已實際支付 owner JPY 400，owner 也已記錄還款
      Then Amy 仍應付 owner JPY 600
      When owner 將原支出金額由 JPY 1000 修改為 JPY 800
      Then 原本 JPY 1000 的分攤貢獻完全移除
      And 最新支出只產生 Amy 應付 owner JPY 800
      And 已發生的 JPY 400 還款仍保持原付款人、收款人、幣別、金額與日期
      And 最新剩餘付款安排為 Amy 支付 owner JPY 400
      When owner 分別查看簡化與未簡化安排
      Then 兩種安排都以最新 JPY 800 支出及既有 JPY 400 還款重建

  Rule: 保存失敗或結果未確認時不得顯示已完成重算

    Example: owner 修改共同支出但保存結果尚未確認
      Given owner 正在修改一筆已影響三人餘額的共同支出
      And 保存結果回應遺失且暫時無法查證
      When owner 送出修改
      Then 系統不會宣稱支出與分帳已成功更新
      And 畫面保留 owner 的修改內容並提示保存結果尚未確認
      And 權威餘額與付款安排不會顯示成已確認的新結果
