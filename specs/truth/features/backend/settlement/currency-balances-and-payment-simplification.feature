Feature: 結算淨額與付款安排

  Rule: 各幣別獨立建立成員淨額
    Example: 同時有日圓與台幣
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 車票 | JPY | 600 | Alice | Amy |
        | 機票 | TWD | 900 | Amy | Alice |
      When owner 查詢旅行分帳結算
      Then 成員的分幣別精確淨額如下：
        | 成員 | 幣別 | 淨額 |
        | Alice | JPY | 600 |
        | Amy | JPY | -600 |
        | Alice | TWD | -900 |
        | Amy | TWD | 900 |

  Rule: 各幣別所有成員淨額精確零和
    Example: 同時有日圓與台幣
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 車票 | JPY | 600 | Alice | Amy |
        | 機票 | TWD | 900 | Amy | Alice |
      When owner 查詢旅行分帳結算
      Then 各幣別淨額精確總和為零

  Rule: 未簡化時保留直接付款對象
    Example: Alice付Bob且Bob付Carol
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | Alice車票 | JPY | 60 | Bob | Alice |
        | Bob門票 | JPY | 60 | Carol | Bob |
      When owner 查詢旅行分帳結算
      Then 結算付款安排如下：
        | 付款人 | 收款人 | 幣別 | 金額 |
        | Alice | Bob | JPY | 60 |
        | Bob | Carol | JPY | 60 |

  Rule: 開啟簡化依淨額調整付款對象
    Example: 兩筆直接關係可簡化為一筆
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | Alice車票 | JPY | 60 | Bob | Alice |
        | Bob門票 | JPY | 60 | Carol | Bob |
      When owner 將簡化付款切換為 "開啟"
      Then 結算付款安排如下：
        | 付款人 | 收款人 | 幣別 | 金額 |
        | Alice | Carol | JPY | 60 |

  Rule: 簡化付款不改變成員淨額
    Example: 兩筆直接關係可簡化為一筆
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | Alice車票 | JPY | 60 | Bob | Alice |
        | Bob門票 | JPY | 60 | Carol | Bob |
      When owner 將簡化付款切換為 "開啟"
      Then 簡化前後每位成員的精確淨額不變

  Rule: 簡化付款不改寫原始來源
    Example: 兩筆直接關係可簡化為一筆
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | Alice車票 | JPY | 60 | Bob | Alice |
        | Bob門票 | JPY | 60 | Carol | Bob |
      When owner 將簡化付款切換為 "開啟"
      Then 分帳來源紀錄維持操作前內容

  Rule: 簡化付款筆數不得增加
    Example: 兩筆直接關係可簡化為一筆
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | Alice車票 | JPY | 60 | Bob | Alice |
        | Bob門票 | JPY | 60 | Carol | Bob |
      When owner 將簡化付款切換為 "開啟"
      Then 簡化建議的付款筆數不多於直接安排

  Rule: 簡化付款設定持久保存
    Example: 兩筆直接關係可簡化為一筆
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | Alice車票 | JPY | 60 | Bob | Alice |
        | Bob門票 | JPY | 60 | Carol | Bob |
      When owner 將簡化付款切換為 "開啟"
      Then 簡化付款設定已保存為 "開啟"

  Rule: 簡化結果提供三句內的說明
    Example: 兩筆直接關係可簡化為一筆
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | Alice車票 | JPY | 60 | Bob | Alice |
        | Bob門票 | JPY | 60 | Carol | Bob |
      When owner 將簡化付款切換為 "開啟"
      Then 結算說明以三句內描述付款對象與筆數變化

  Rule: 切回關閉模式可還原直接付款關係
    Example: 簡化設定已開啟
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | Alice車票 | JPY | 60 | Bob | Alice |
        | Bob門票 | JPY | 60 | Carol | Bob |
      And 旅行的簡化付款已為 "開啟"
      When owner 將簡化付款切換為 "關閉"
      Then 結算付款安排如下：
        | 付款人 | 收款人 | 幣別 | 金額 |
        | Alice | Bob | JPY | 60 |
        | Bob | Carol | JPY | 60 |

  Rule: 無可簡化時清楚說明安排無需調整
    Example: 單筆應付五百
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 午餐 | JPY | 500 | Alice | Amy |
      When owner 將簡化付款切換為 "開啟"
      Then 結算說明指出付款安排無需調整

  Rule: 沒有債務時沒有付款安排
    Example: 只有成員沒有支出
      Given owner 的分帳旅行已建立成員
      When owner 查詢旅行分帳結算
      Then 結算中沒有任何待付款安排

  Rule: 相同資料生成確定性安排
    Example: 已開啟的兩筆直接債務
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | Alice車票 | JPY | 60 | Bob | Alice |
        | Bob門票 | JPY | 60 | Carol | Bob |
      And 旅行的簡化付款已為 "開啟"
      When owner 查詢旅行分帳結算
      Then 相同資料的結算安排可重現

  Rule: 付款人自己的份額不產生自付安排
    Example: Amy付款三人均分
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 午餐 | JPY | 300 | Amy | Alice、Amy、Bob |
      When owner 查詢旅行分帳結算
      Then 結算付款安排如下：
        | 付款人 | 收款人 | 幣別 | 金額 |
        | Alice | Amy | JPY | 100 |
        | Bob | Amy | JPY | 100 |

