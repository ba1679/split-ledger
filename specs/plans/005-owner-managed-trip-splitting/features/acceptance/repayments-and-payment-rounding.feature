Feature: 實際還款與付款安排結清

  Rule: 獨立還款只更新同幣別餘額並支援分次還款

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

  Rule: 付款安排顯示精確公平金額，實付後由 owner 記錄金額並結清

    Example: 同一筆三人平均支出的兩筆安排以不同實付金額結清
      Given owner 支付 JPY 100 並由 owner、Amy、Bob 三人平均分攤
      And 三人的精確公平份額各為 JPY "100/3"
      And Amy 與 Bob 各有一筆向 owner 支付 JPY "100/3" 的精確付款安排
      And 畫面顯示兩筆精確公平應付且不提供取整方式選擇
      When Amy 實際支付 owner JPY 33，owner 輸入實付 JPY 33 並按結清
      Then Amy 的該筆付款安排以 JPY 33 結清
      And 系統保留 JPY 33 實付事實與成對、總和為零的 JPY "1/3" 差額調整
      When Bob 實際支付 owner JPY 34，owner 輸入實付 JPY 34 並按結清
      Then Bob 的該筆付款安排以 JPY 34 結清
      And 系統保留 JPY 34 實付事實與成對、總和為零的 JPY "2/3" 差額調整
      And owner、Amy、Bob 都沒有不可支付的次最小單位尾差
      And 原始 JPY 100 支出與三人的精確公平份額都沒有被改寫
      And 系統沒有記錄 Amy 或 Bob 的取整方式

    Example: 實付超過精確應付後按結清不產生反向安排
      Given Amy 有一筆向 owner 支付 JPY 600 的付款安排
      When Amy 實際支付 owner JPY 700，owner 輸入實付 JPY 700 並按結清
      Then 該筆付款安排關閉
      And 系統保留 JPY 700 實付事實與成對、總和為零的 JPY 100 差額調整
      And 不產生 owner 向 Amy 支付 JPY 100 的反向安排

  Rule: 無效還款必須被拒絕且獨立超額還款必須有明確結果

    Example: owner 修正無效還款，並確認超額轉帳造成的反向債權
      Given Amy 目前應付 owner JPY 600
      When owner 嘗試記錄以下無效還款：
        | 付款人       | 收款人       | 金額    | 問題             |
        | Amy          | Amy          | JPY 100 | 付款人與收款人相同 |
        | Amy          | owner        | JPY 0   | 金額不是正數       |
        | 另一趟旅行成員 | owner        | JPY 100 | 付款人不屬於本旅行 |
      Then 這些還款都被拒絕且原餘額維持不變
      When owner 嘗試透過獨立還款流程記錄 Amy 支付 owner JPY 700，且未按結清
      Then 系統尚未保存還款
      And 系統警告超額 JPY 100 將使 owner 改為應付 Amy JPY 100
      When owner 取消這次超額還款
      Then Amy 仍應付 owner JPY 600 且沒有新增還款
      When owner 再次透過獨立還款流程記錄 Amy 支付 owner JPY 700 並明確確認債權反轉
      Then 系統保存 Amy 實際支付 owner JPY 700 的還款
      And 最新付款安排為 owner 支付 Amy JPY 100
      And 原始支出與先前還款紀錄都沒有被改寫
