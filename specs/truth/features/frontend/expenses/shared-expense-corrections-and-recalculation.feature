Feature: 共同支出修正與重算

  Rule: 修改共同支出後不殘留舊分攤
    Example: 晚餐改由 Amy 付款且兩人分攤
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 晚餐 | JPY | 300 | Alice | Alice、Amy、Bob |
      When owner 將晚餐改為 JPY 200、付款 Amy、分攤 Amy、Bob
      Then 分帳畫面顯示以下成員淨額：
        | 成員 | 幣別 | 淨額 | 顯示 |
        | Alice | JPY | 0 | JPY 0 |
        | Amy | JPY | 100 | JPY 100 |
        | Bob | JPY | -100 | JPY -100 |

  Rule: 刪除共同支出後移除其付款安排
    Example: 刪除唯一晚餐
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 晚餐 | JPY | 200 | Amy | Amy、Bob |
      When owner 刪除共同支出晚餐
      Then 晚餐不再出現且沒有晚餐造成的分攤與付款安排

  Rule: 支出修改保留已發生實付
    Example: 代付降低而 Amy 已還400
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 代付 | JPY | 1000 | Alice | Amy |
        | 台幣代付 | TWD | 300 | Alice | Amy |
      And 分帳旅行已有 Amy 支付 Alice JPY 400 的獨立還款
      When owner 將代付金額改為 JPY 800
      Then 已保存的 JPY 400 還款仍存在且 Amy 剩餘應付 Alice JPY 400

  Rule: 修改結果未明不得呈現已完成重算
    Example: 晚餐修改回應遺失
      Given 共同支出晚餐修改已填 JPY 200 且保存回應遺失與查證暫不可用
      When owner 保存共同支出修改
      Then 修改草稿保留且未宣稱支出與分帳已更新

  Rule: 修正支出不重寫既有結清快照或差額調整
    Example: 點心一百結清 Amy 三十三後改成兩百
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 點心 | JPY | 100 | Alice | Alice、Amy、Bob |
      And Amy 支付 Alice JPY 33 的安排已結清
      When owner 將點心金額改為 JPY 200
      Then 原結清與差額調整仍保留原值且實付仍顯示 JPY 33


  Rule: 修正已結清來源後重建最新淨額
    Example: 點心兩百仍納入原三十三實付及三分之一調整
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 點心 | JPY | 100 | Alice | Alice、Amy、Bob |
      And Amy 支付 Alice JPY 33 的安排已結清
      When owner 將點心金額改為 JPY 200
      Then 分帳畫面顯示以下成員淨額：
        | 成員 | 幣別 | 淨額 | 顯示 |
        | Alice | JPY | 100 | JPY 100 |
        | Amy | JPY | -100/3 | JPY -33.33 |
        | Bob | JPY | -200/3 | JPY -66.67 |


  Rule: 刪除來源支出不移除既有實付與結清調整
    Example: 刪除已結清 Amy 份額的點心
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 點心 | JPY | 100 | Alice | Alice、Amy、Bob |
      And Amy 支付 Alice JPY 33 的安排已結清
      When owner 刪除共同支出點心
      Then 原結清與差額調整仍保留原值且實付仍顯示 JPY 33


  Rule: 刪除已結清來源後仍計入歷史實付與調整
    Example: 刪除點心後保留三分之一調整的帳務效果
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 點心 | JPY | 100 | Alice | Alice、Amy、Bob |
      And Amy 支付 Alice JPY 33 的安排已結清
      When owner 刪除共同支出點心
      Then 分帳畫面顯示以下成員淨額：
        | 成員 | 幣別 | 淨額 | 顯示 |
        | Alice | JPY | -100/3 | JPY -33.33 |
        | Amy | JPY | 100/3 | JPY 33.33 |
        | Bob | JPY | 0 | JPY 0 |

