Feature: 指定付款安排的實付結清

  Rule: 任意合法正數實付可結清安排
    Example: 應付100/3且實付33
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 點心 | JPY | 100 | Alice | Alice、Amy、Bob |
      And owner 已取得 Amy 向 Alice 的目前付款安排
      When owner 以 JPY "33" 結清 Amy 向 Alice 的安排
      Then 該安排已由正數實付關閉

    Example: 應付100/3且實付34
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 點心 | JPY | 100 | Alice | Alice、Amy、Bob |
      And owner 已取得 Amy 向 Alice 的目前付款安排
      When owner 以 JPY "34" 結清 Amy 向 Alice 的安排
      Then 該安排已由正數實付關閉

    Example: 應付100/3且實付1
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 點心 | JPY | 100 | Alice | Alice、Amy、Bob |
      And owner 已取得 Amy 向 Alice 的目前付款安排
      When owner 以 JPY "1" 結清 Amy 向 Alice 的安排
      Then 該安排已由正數實付關閉

    Example: 應付100/3且實付100
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 點心 | JPY | 100 | Alice | Alice、Amy、Bob |
      And owner 已取得 Amy 向 Alice 的目前付款安排
      When owner 以 JPY "100" 結清 Amy 向 Alice 的安排
      Then 該安排已由正數實付關閉

  Rule: 結清差額以成對零和調整吸收
    Example: 實付33的差額方向
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 點心 | JPY | 100 | Alice | Alice、Amy、Bob |
      And owner 已取得 Amy 向 Alice 的目前付款安排
      When owner 以 JPY "33" 結清 Amy 向 Alice 的安排
      Then 結清差額的兩位成員調整為：
        | 成員 | 幣別 | 調整 |
        | Amy | JPY | 1/3 |
        | Alice | JPY | -1/3 |

    Example: 實付34的差額方向
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 點心 | JPY | 100 | Alice | Alice、Amy、Bob |
      And owner 已取得 Amy 向 Alice 的目前付款安排
      When owner 以 JPY "34" 結清 Amy 向 Alice 的安排
      Then 結清差額的兩位成員調整為：
        | 成員 | 幣別 | 調整 |
        | Amy | JPY | -2/3 |
        | Alice | JPY | 2/3 |

  Rule: 結清不得新增取整策略紀錄
    Example: 三人點心實付33
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 點心 | JPY | 100 | Alice | Alice、Amy、Bob |
      And owner 已取得 Amy 向 Alice 的目前付款安排
      When owner 以 JPY "33" 結清 Amy 向 Alice 的安排
      Then 結清紀錄沒有取整方式欄位

  Rule: 結清不改寫原始支出份額
    Example: 三人點心實付33
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 點心 | JPY | 100 | Alice | Alice、Amy、Bob |
      And owner 已取得 Amy 向 Alice 的目前付款安排
      When owner 以 JPY "33" 結清 Amy 向 Alice 的安排
      Then 結清後原支出與分攤集合保持不變

  Rule: 結清超付不產生反向債權
    Example: 應付600實付700
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 午餐 | JPY | 600 | Alice | Amy |
      And owner 已取得 Amy 向 Alice 的目前付款安排
      When owner 以 JPY "700" 結清 Amy 向 Alice 的安排
      Then 該安排沒有反向付款或殘餘尾差

  Rule: 無效實付不能結清安排
    Example: 日圓實付0
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 點心 | JPY | 100 | Alice | Alice、Amy、Bob |
      And owner 已取得 Amy 向 Alice 的目前付款安排
      When owner 以 JPY "0" 結清 Amy 向 Alice 的安排
      Then 這次分帳操作被拒絕為 "VALIDATION_ERROR"

    Example: 日圓實付-1
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 點心 | JPY | 100 | Alice | Alice、Amy、Bob |
      And owner 已取得 Amy 向 Alice 的目前付款安排
      When owner 以 JPY "-1" 結清 Amy 向 Alice 的安排
      Then 這次分帳操作被拒絕為 "VALIDATION_ERROR"

    Example: 日圓實付33.5
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 點心 | JPY | 100 | Alice | Alice、Amy、Bob |
      And owner 已取得 Amy 向 Alice 的目前付款安排
      When owner 以 JPY "33.5" 結清 Amy 向 Alice 的安排
      Then 這次分帳操作被拒絕為 "VALIDATION_ERROR"

  Rule: 舊版本不得結清目前安排
    Example: 另一裝置新增個人支出
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 點心 | JPY | 100 | Alice | Alice、Amy、Bob |
      And owner 已取得 Amy 向 Alice 的目前付款安排
      And 舊付款安排取得後帳本已有新的支出
      When owner 以 JPY "33" 結清 Amy 向 Alice 的安排
      Then 這次分帳操作被拒絕為 "ACCOUNTING_REVISION_CONFLICT"

  Rule: 結清結果可依預留識別查證
    Example: 成功回應遺失
      Given Amy 的安排已以 JPY 33 結清但保存回應曾遺失
      When owner 查證先前已保存的結清紀錄
      Then 查證取得同一份結清與實付紀錄

