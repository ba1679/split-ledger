Feature: 分幣別結算與簡化付款

  Rule: 每個幣別獨立呈現淨額
    Example: 日幣600與台幣900反方向
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 車票 | JPY | 600 | Alice | Amy |
        | 機票 | TWD | 900 | Amy | Alice |
      When owner 查看分帳結算
      Then 分帳畫面顯示以下成員淨額：
        | 成員 | 幣別 | 淨額 | 顯示 |
        | Alice | JPY | 600 | JPY 600 |
        | Amy | JPY | -600 | JPY -600 |
        | Alice | TWD | -900 | TWD -900 |
        | Amy | TWD | 900 | TWD 900 |

  Rule: 關閉簡化付款保留直接關係
    Example: Alice 經 Bob 付款給 Carol
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 車票 | JPY | 60 | Bob | Alice |
        | 門票 | JPY | 60 | Carol | Bob |
      When owner 查看分帳結算
      Then 分帳畫面只列出以下付款安排：
        | 付款人 | 收款人 | 幣別 | 金額 | 顯示 |
        | Alice | Bob | JPY | 60 | JPY 60 |
        | Bob | Carol | JPY | 60 | JPY 60 |

  Rule: 開啟簡化付款調整付款對象
    Example: 兩筆安排合為一筆
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 車票 | JPY | 60 | Bob | Alice |
        | 門票 | JPY | 60 | Carol | Bob |
      And owner 已開啟關閉簡化付款的結算畫面
      When owner 開啟簡化付款
      Then 分帳畫面只列出以下付款安排：
        | 付款人 | 收款人 | 幣別 | 金額 | 顯示 |
        | Alice | Carol | JPY | 60 | JPY 60 |

  Rule: 切換簡化付款不改變來源帳務
    Example: 保留支出與實付
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 車票 | JPY | 60 | Bob | Alice |
        | 門票 | JPY | 60 | Carol | Bob |
      And owner 已開啟關閉簡化付款的結算畫面
      When owner 開啟簡化付款
      Then 來源支出與先前實付紀錄保持不變

  Rule: 切換簡化付款不改變成員淨額
    Example: 中間人 Bob 淨額仍為零
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 車票 | JPY | 60 | Bob | Alice |
        | 門票 | JPY | 60 | Carol | Bob |
      And owner 已開啟關閉簡化付款的結算畫面
      When owner 開啟簡化付款
      Then 分帳畫面顯示以下成員淨額：
        | 成員 | 幣別 | 淨額 | 顯示 |
        | Alice | JPY | -60 | JPY -60 |
        | Bob | JPY | 0 | JPY 0 |
        | Carol | JPY | 60 | JPY 60 |

  Rule: 簡化說明使用三句內的易懂文案
    Example: 兩筆改一筆
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 車票 | JPY | 60 | Bob | Alice |
        | 門票 | JPY | 60 | Carol | Bob |
      And owner 已開啟關閉簡化付款的結算畫面
      When owner 開啟簡化付款
      Then 三句內說明 Alice 改付 Carol、兩筆變一筆與淨額及來源紀錄不變

  Rule: 沒有可減少安排時明確說明無需調整
    Example: Amy 付 Alice 五百
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 代付 | JPY | 500 | Alice | Amy |
      And owner 已開啟關閉簡化付款的結算畫面
      When owner 開啟簡化付款
      Then 仍為 Amy 支付 Alice JPY 500 並提示目前的付款安排已無需調整

  Rule: 旅行保存最後的簡化付款設定
    Example: 重新進入已開啟模式
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 車票 | JPY | 60 | Bob | Alice |
        | 門票 | JPY | 60 | Carol | Bob |
      And 該旅行已保存簡化付款開啟
      When owner 查看分帳結算
      Then 簡化付款仍開啟且重現 Alice 支付 Carol JPY 60

  Rule: 切回未簡化模式可重建直接關係
    Example: 由一筆回到兩筆
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 車票 | JPY | 60 | Bob | Alice |
        | 門票 | JPY | 60 | Carol | Bob |
      And 該旅行已保存簡化付款開啟
      And owner 已開啟簡化付款的結算畫面
      When owner 關閉簡化付款
      Then 分帳畫面只列出以下付款安排：
        | 付款人 | 收款人 | 幣別 | 金額 | 顯示 |
        | Alice | Bob | JPY | 60 | JPY 60 |
        | Bob | Carol | JPY | 60 | JPY 60 |

  Rule: 切換保存失敗保留上次已確認安排
    Example: 無法保存開關
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 車票 | JPY | 60 | Bob | Alice |
        | 門票 | JPY | 60 | Carol | Bob |
      And owner 已開啟關閉簡化付款的結算畫面
      And 本次簡化付款保存明確失敗
      When owner 開啟簡化付款
      Then 保留關閉模式的已確認兩筆安排並提供重試

  Rule: 結算淨額與安排顯示相同精度
    Example: 三人一百分攤
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 點心 | JPY | 100 | Alice | Alice、Amy、Bob |
      When owner 查看分帳結算
      Then 分帳畫面顯示以下成員淨額：
        | 成員 | 幣別 | 淨額 | 顯示 |
        | Alice | JPY | 200/3 | JPY 66.67 |
        | Amy | JPY | -100/3 | JPY -33.33 |
        | Bob | JPY | -100/3 | JPY -33.33 |
      And 分帳畫面只列出以下付款安排：
        | 付款人 | 收款人 | 幣別 | 金額 | 顯示 |
        | Amy | Alice | JPY | 100/3 | JPY 33.33 |
        | Bob | Alice | JPY | 100/3 | JPY 33.33 |

  Rule: 簡化付款以最新支出與實付重建安排
    Example: Amy 已還日幣四百後開啟簡化
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 代付 | JPY | 1000 | Alice | Amy |
        | 台幣代付 | TWD | 300 | Alice | Amy |
      And 分帳旅行已有 Amy 支付 Alice JPY 400 的獨立還款
      And owner 已開啟關閉簡化付款的結算畫面
      When owner 開啟簡化付款
      Then 分帳畫面只列出以下付款安排：
        | 付款人 | 收款人 | 幣別 | 金額 | 顯示 |
        | Amy | Alice | JPY | 600 | JPY 600 |
        | Amy | Alice | TWD | 300 | TWD 300 |
      And 來源支出與先前實付紀錄保持不變
