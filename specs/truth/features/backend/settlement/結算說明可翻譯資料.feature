Feature: 結算說明的可翻譯資料

  Rule: 未要求可翻譯資料時維持原有結算回應
    Example: 兩筆直接關係可簡化為一筆
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 車票 | JPY | 60 | Bob | Alice |
        | 門票 | JPY | 60 | Carol | Bob |
      And 旅行的簡化付款已為 "開啟"
      When owner 查詢旅行分帳結算
      Then 結算維持原有欄位及繁中說明

  Rule: 關閉簡化時說明資料保留直接付款關係
    Example: Alice 付 Bob 且 Bob 付 Carol
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 車票 | JPY | 60 | Bob | Alice |
        | 門票 | JPY | 60 | Carol | Bob |
      When owner 查詢可翻譯的結算說明
      Then 結算說明資料的類型為 "direct"

  Rule: 簡化未改變安排時說明資料仍保留直接關係
    Example: Amy 只需付 Alice 一筆
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 午餐 | JPY | 500 | Alice | Amy |
      And 旅行的簡化付款已為 "開啟"
      When owner 查詢可翻譯的結算說明
      Then 結算說明資料的類型為 "unchanged"

  Rule: 簡化改變安排時說明資料指出原付款關係
    Example: 兩筆直接關係變成一筆
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 車票 | JPY | 60 | Bob | Alice |
        | 門票 | JPY | 60 | Carol | Bob |
      And 旅行的簡化付款已為 "開啟"
      When owner 查詢可翻譯的結算說明
      Then 結算說明資料的類型為 "changed"

  Rule: 可翻譯資料完整列出簡化前付款關係
    Example: 簡化後仍能取得原本兩筆付款
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 車票 | JPY | 60 | Bob | Alice |
        | 門票 | JPY | 60 | Carol | Bob |
      And 旅行的簡化付款已為 "開啟"
      When owner 查詢可翻譯的結算說明
      Then 說明中的原付款關係如下：
        | 付款人 | 收款人 | 幣別 | 金額 |
        | Alice | Bob | JPY | 60 |
        | Bob | Carol | JPY | 60 |

  Rule: 付款筆數相同仍須比較付款對象與金額
    Example: 兩筆直接關係仍為兩筆但付款對象改變
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 車票 | JPY | 60 | Bob | Alice |
        | 門票 | JPY | 40 | Carol | Bob |
      And 旅行的簡化付款已為 "開啟"
      When owner 查詢可翻譯的結算說明
      Then 付款筆數相同但說明資料的類型為 "changed"

  Rule: 可翻譯資料與既有結算結果來自同一帳務快照
    Example: 簡化後兩筆付款變一筆
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 車票 | JPY | 60 | Bob | Alice |
        | 門票 | JPY | 60 | Carol | Bob |
      And 旅行的簡化付款已為 "開啟"
      When owner 查詢可翻譯的結算說明
      Then 可翻譯說明與結算安排來自同一帳務版本

  Rule: 不支援的結算說明選項不得改變帳本
    Example: 查詢未知的說明資料
      Given owner 的分帳旅行已建立成員
      When owner 查詢不支援的結算說明選項
      Then 這次分帳操作被拒絕為 "VALIDATION_ERROR"

  Rule: 可翻譯結算資料只供登入的旅行擁有者查看
    Example: 未登入者要求旅行結算說明
      Given 分帳旅行已有擁有者但查詢者未登入
      When 查詢者要求可翻譯的結算說明
      Then 可翻譯結算查詢被拒絕為 "UNAUTHENTICATED"

    Example: 其他帳號要求旅行結算說明
      Given 分帳旅行已有擁有者且查詢者是其他帳號
      When 查詢者要求可翻譯的結算說明
      Then 可翻譯結算查詢被拒絕為 "NOT_FOUND"

  Rule: 垃圾桶內的本人旅行不可查詢可翻譯結算資料
    Example: 擁有者查詢已移入垃圾桶的旅行
      Given 擁有者的分帳旅行已在垃圾桶
      When 查詢者要求可翻譯的結算說明
      Then 可翻譯結算查詢被拒絕為 "TRIP_TRASHED"
