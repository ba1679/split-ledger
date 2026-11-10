Feature: 實際還款與付款取整

  Rule: 實際還款只更新同幣別餘額並支援分次結清

    Example: Amy 分兩次還清日幣而台幣餘額保持不變
      Given "日本旅行" 的結算餘額如下：
        | 成員  | 幣別 | 淨額  | 意義 |
        | owner | JPY  | 1000  | 應收 |
        | Amy   | JPY  | -1000 | 應付 |
        | owner | TWD  | 300   | 應收 |
        | Amy   | TWD  | -300  | 應付 |
      When Amy 實際支付 owner JPY 400，且 owner 記錄這筆還款
      Then JPY 的剩餘付款安排為 Amy 支付 owner JPY 600
      And owner 與 Amy 的 TWD 300 應收應付完全不變
      When Amy 再實際支付 owner JPY 600，且 owner 記錄這筆還款
      Then owner 與 Amy 的 JPY 淨額都為 0
      And JPY 付款安排顯示已結清
      And 兩筆實際還款都保留原付款人、收款人、幣別、金額與日期

  Rule: 無法以最小貨幣單位支付時由實際付款人決定取整

    Example: 同一筆三人平均支出由兩位付款人分別選擇少付與多付
      Given owner 支付 JPY 100 並由 owner、Amy、Bob 三人平均分攤
      And 三人的精確公平份額各為 JPY "100/3"
      And Amy 與 Bob 各有一筆向 owner 支付 JPY "100/3" 的精確付款安排
      When Amy 決定四捨五入為 JPY 33 並實際支付 owner，且 owner 代為記錄
      Then Amy 的該筆付款安排以 JPY 33 結清
      And 少付的 JPY "1/3" 記為 owner 放棄
      When Bob 決定無條件進位為 JPY 34 並實際支付 owner，且 owner 代為記錄
      Then Bob 的該筆付款安排以 JPY 34 結清
      And 多付的 JPY "2/3" 記為 Bob 自願承擔
      And owner、Amy、Bob 都沒有不可支付的次最小單位尾差
      And 原始 JPY 100 支出與三人的精確公平份額都沒有被改寫

  Rule: 無效還款必須被拒絕且其他超額還款必須有明確結果

    Example: owner 修正無效還款，並確認超額轉帳造成的反向債權
      Given Amy 目前應付 owner JPY 600
      When owner 嘗試記錄以下無效還款：
        | 付款人       | 收款人       | 金額    | 問題             |
        | Amy          | Amy          | JPY 100 | 付款人與收款人相同 |
        | Amy          | owner        | JPY 0   | 金額不是正數       |
        | 另一趟旅行成員 | owner        | JPY 100 | 付款人不屬於本旅行 |
      Then 這些還款都被拒絕且原餘額維持不變
      When owner 嘗試記錄 Amy 支付 owner JPY 700
      Then 系統尚未保存還款
      And 系統警告超額 JPY 100 將使 owner 改為應付 Amy JPY 100
      When owner 取消這次超額還款
      Then Amy 仍應付 owner JPY 600 且沒有新增還款
      When owner 再次記錄 Amy 支付 owner JPY 700 並明確確認債權反轉
      Then 系統保存 Amy 實際支付 owner JPY 700 的還款
      And 最新付款安排為 owner 支付 Amy JPY 100
      And 原始支出與先前還款紀錄都沒有被改寫
