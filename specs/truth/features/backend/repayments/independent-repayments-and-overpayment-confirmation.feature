Feature: 分次還款及超額確認

  Rule: 部分還款保存為獨立實付事實
    Example: 日圓一千先還四百並保留台幣三百
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 午餐 | JPY | 1000 | Alice | Amy |
        | 車票 | TWD | 300 | Alice | Amy |
      When owner 記錄 Amy 向 Alice 的 JPY "400" 獨立還款
      Then 獨立還款已以 JPY "400" 保存

  Rule: 部分還款更新原幣別剩餘應付
    Example: 日圓一千先還四百並保留台幣三百
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 午餐 | JPY | 1000 | Alice | Amy |
        | 車票 | TWD | 300 | Alice | Amy |
      When owner 記錄 Amy 向 Alice 的 JPY "400" 獨立還款
      Then 獨立還款後的付款安排如下：
        | 付款人 | 收款人 | 幣別 | 金額 |
        | Amy | Alice | JPY | 600 |
        | Amy | Alice | TWD | 300 |

  Rule: 部分還款不影響其他幣別
    Example: 日圓一千先還四百並保留台幣三百
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 午餐 | JPY | 1000 | Alice | Amy |
        | 車票 | TWD | 300 | Alice | Amy |
      When owner 記錄 Amy 向 Alice 的 JPY "400" 獨立還款
      Then 先前還款與其他幣別來源保持不變

  Rule: 第二次還款按最新剩餘額重算
    Example: 先前已還四百再還六百
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 午餐 | JPY | 1000 | Alice | Amy |
        | 車票 | TWD | 300 | Alice | Amy |
      And owner 的分帳旅行已有下列獨立還款：
        | 付款人 | 收款人 | 幣別 | 金額 | 日期 |
        | Amy | Alice | JPY | 400 | 2027-01-19 |
      When owner 記錄 Amy 向 Alice 的 JPY "600" 獨立還款
      Then 獨立還款後的付款安排如下：
        | 付款人 | 收款人 | 幣別 | 金額 |
        | Amy | Alice | TWD | 300 |

  Rule: 分次還款紀錄不被合併或改寫
    Example: 四百加六百是兩筆
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 午餐 | JPY | 1000 | Alice | Amy |
        | 車票 | TWD | 300 | Alice | Amy |
      And owner 的分帳旅行已有下列獨立還款：
        | 付款人 | 收款人 | 幣別 | 金額 | 日期 |
        | Amy | Alice | JPY | 400 | 2027-01-19 |
        | Amy | Alice | JPY | 600 | 2027-01-20 |
      When owner 查詢旅行實際還款紀錄
      Then 實際還款保留各次付款事實

  Rule: 獨立超額還款必須先警告且不寫入
    Example: 六百應付卻記七百
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 午餐 | JPY | 600 | Alice | Amy |
      When owner 記錄 Amy 向 Alice 的 JPY "700" 獨立還款
      Then 超額還款尚未保存並回傳 JPY 100 的反向應付警告

  Rule: 再次確認後才保存超額還款
    Example: 同一筆實付確認
      Given Amy 應付 JPY 600 且 owner 已取得 JPY 700 的超額警告
      When owner 明確確認同一筆 JPY 700 的超額還款
      Then 獨立還款已以 JPY "700" 保存

  Rule: 確認超額後保留反向應收
    Example: 同一筆實付確認
      Given Amy 應付 JPY 600 且 owner 已取得 JPY 700 的超額警告
      When owner 明確確認同一筆 JPY 700 的超額還款
      Then 獨立還款後的付款安排如下：
        | 付款人 | 收款人 | 幣別 | 金額 |
        | Alice | Amy | JPY | 100 |

  Rule: 警告過期不得沿用確認
    Example: 別裝置已更新帳務
      Given Amy 應付 JPY 600 且 owner 已取得 JPY 700 的超額警告
      And 超額警告後旅行已有新的帳務版本
      When owner 明確確認同一筆 JPY 700 的超額還款
      Then 這次分帳操作被拒絕為 "ACCOUNTING_REVISION_CONFLICT"

  Rule: 確認資料必須由伺服器簽發
    Example: token被變造
      Given Amy 應付 JPY 600 且 owner 已取得 JPY 700 的超額警告
      When owner 以變造的確認資料送出超額還款
      Then 變造確認未獲接受且沒有保存還款

  Rule: 無效實付不得新增還款
    Example: 本人付本人
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 午餐 | JPY | 600 | Alice | Amy |
      And 還款驗證用的停用與跨旅行成員已建立
      When owner 嘗試記錄 "本人付本人" 的獨立還款
      Then 這次分帳操作被拒絕為 "VALIDATION_ERROR"

    Example: 非正數
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 午餐 | JPY | 600 | Alice | Amy |
      And 還款驗證用的停用與跨旅行成員已建立
      When owner 嘗試記錄 "非正數" 的獨立還款
      Then 這次分帳操作被拒絕為 "VALIDATION_ERROR"

    Example: 無效幣別
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 午餐 | JPY | 600 | Alice | Amy |
      And 還款驗證用的停用與跨旅行成員已建立
      When owner 嘗試記錄 "無效幣別" 的獨立還款
      Then 這次分帳操作被拒絕為 "VALIDATION_ERROR"

    Example: 無效日期
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 午餐 | JPY | 600 | Alice | Amy |
      And 還款驗證用的停用與跨旅行成員已建立
      When owner 嘗試記錄 "無效日期" 的獨立還款
      Then 這次分帳操作被拒絕為 "VALIDATION_ERROR"

    Example: 停用付款人
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 午餐 | JPY | 600 | Alice | Amy |
      And 還款驗證用的停用與跨旅行成員已建立
      When owner 嘗試記錄 "停用付款人" 的獨立還款
      Then 這次分帳操作被拒絕為 "VALIDATION_ERROR"

    Example: 停用收款人
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 午餐 | JPY | 600 | Alice | Amy |
      And 還款驗證用的停用與跨旅行成員已建立
      When owner 嘗試記錄 "停用收款人" 的獨立還款
      Then 這次分帳操作被拒絕為 "VALIDATION_ERROR"

    Example: 跨旅行付款人
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 午餐 | JPY | 600 | Alice | Amy |
      And 還款驗證用的停用與跨旅行成員已建立
      When owner 嘗試記錄 "跨旅行付款人" 的獨立還款
      Then 這次分帳操作被拒絕為 "NOT_FOUND"

    Example: 跨旅行收款人
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 午餐 | JPY | 600 | Alice | Amy |
      And 還款驗證用的停用與跨旅行成員已建立
      When owner 嘗試記錄 "跨旅行收款人" 的獨立還款
      Then 這次分帳操作被拒絕為 "NOT_FOUND"

