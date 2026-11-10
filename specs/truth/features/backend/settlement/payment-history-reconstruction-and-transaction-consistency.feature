Feature: 結算來源與結清交易一致性

  Rule: 每種模式依最新實付與歷史差額重建
    Example: 最新實付後模式開啟
      Given 旅行有既有實付與結清調整的分帳來源
      When owner 將簡化付款切換為 "開啟"
      Then 最新實付後的直接與簡化安排皆依來源重建

    Example: 最新實付後模式關閉
      Given 旅行有既有實付與結清調整的分帳來源
      When owner 將簡化付款切換為 "關閉"
      Then 最新實付後的直接與簡化安排皆依來源重建

  Rule: 切換模式不能改寫既有實付與調整
    Example: 來源包含獨立與結清實付
      Given 旅行有既有實付與結清調整的分帳來源
      When owner 將簡化付款切換為 "開啟"
      Then 分帳來源紀錄維持操作前內容

  Rule: 同時結清以單筆完整成功序列化
    Example: 兩個裝置依同一安排分別輸入33與34
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 午餐 | JPY | 100 | Alice | Amy |
      And owner 已取得 Amy 向 Alice 的目前付款安排
      When 兩個裝置同時結清 Amy 向 Alice 的同一安排
      Then 同一安排最多只保存一次完整結清

  Rule: 結清實付與成對調整必須原子保存
    Example: 寫完第一筆調整後故障
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 午餐 | JPY | 100 | Alice | Amy |
      And owner 已取得 Amy 向 Alice 的目前付款安排
      And 結清交易在寫入部分調整後將發生錯誤
      When owner 以 JPY "33" 結清 Amy 向 Alice 的安排
      Then 結清失敗不留下任何部分帳務紀錄

