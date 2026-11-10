Feature: 旅行同行者的名稱與歷史身分

  Rule: 新增同行者保存旅行內穩定身分
    Example: 名稱前後有空白
      Given owner 的分帳旅行已建立成員
      When owner 新增同行者 "  小美  "
      Then 新增同行者以名稱 "小美" 保存

  Rule: owner 名稱不能重複使用
    Example: owner 名稱比較忽略 ASCII 大小寫
      Given owner 的分帳旅行已建立成員
      And 同行者 "Bob" 已停用
      When owner 新增同行者 " alice "
      Then 這次分帳操作被拒絕為 "MEMBER_NAME_CONFLICT"

  Rule: 啟用名稱不能重複使用
    Example: 啟用名稱比較忽略 ASCII 大小寫
      Given owner 的分帳旅行已建立成員
      And 同行者 "Bob" 已停用
      When owner 新增同行者 "AMY"
      Then 這次分帳操作被拒絕為 "MEMBER_NAME_CONFLICT"

  Rule: 停用名稱不能重複使用
    Example: 停用名稱比較忽略 ASCII 大小寫
      Given owner 的分帳旅行已建立成員
      And 同行者 "Bob" 已停用
      When owner 新增同行者 " bob "
      Then 這次分帳操作被拒絕為 "MEMBER_NAME_CONFLICT"

  Rule: 空白同行者名稱不能保存
    Example: 名稱只有空白
      Given owner 的分帳旅行已建立成員
      When owner 新增同行者 "   "
      Then 這次分帳操作被拒絕為 "VALIDATION_ERROR"

  Rule: 名稱唯一性僅限同一旅行
    Example: 別趟旅行已有小美
      Given owner 的分帳旅行已建立成員
      And 另一趟旅行已有同行者 "小美"
      When owner 新增同行者 "小美"
      Then 新增同行者以名稱 "小美" 保存

  Rule: 改名維持歷史成員關聯
    Example: Amy 改名小美且曾參與分攤與還款
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 午餐 | JPY | 300 | Alice | Alice、Amy、Bob |
      And owner 的分帳旅行已有下列獨立還款：
        | 付款人 | 收款人 | 幣別 | 金額 | 日期 |
        | Amy | Alice | JPY | 40 | 2027-01-20 |
      When owner 將同行者 "Amy" 改名為 "小美"
      Then 改名後 "小美" 仍沿用原成員身分

  Rule: 改名不能占用停用者名稱
    Example: Amy 改為 Bob
      Given owner 的分帳旅行已建立成員
      And 同行者 "Bob" 已停用
      When owner 將同行者 "Amy" 改名為 " bob "
      Then 這次分帳操作被拒絕為 "MEMBER_NAME_CONFLICT"

  Rule: 同行者可以停用且保留歷史身分
    Example: Amy 停用
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 午餐 | JPY | 300 | Alice | Alice、Amy、Bob |
      When owner 將同行者 "Amy" 設為 "停用"
      Then 同行者 "Amy" 的狀態為 "停用"

  Rule: 同行者可以啟用且保留歷史身分
    Example: Amy 啟用
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 午餐 | JPY | 300 | Alice | Alice、Amy、Bob |
      And 同行者 "Amy" 已停用
      When owner 將同行者 "Amy" 設為 "啟用"
      Then 同行者 "Amy" 的狀態為 "啟用"

  Rule: 未引用同行者可刪除
    Example: Carol 沒有任何紀錄
      Given owner 的分帳旅行已建立成員
      When owner 刪除同行者 "Carol"
      Then 同行者 "Carol" 已從旅行移除

  Rule: 已引用同行者不能刪除
    Example: Amy 有支出分攤
      Given owner 的分帳旅行已有下列支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 車票 | JPY | 60 | Alice | Amy |
      When owner 刪除同行者 "Amy"
      Then 這次分帳操作被拒絕為 "MEMBER_IN_USE"

  Rule: 固定 owner 成員不得改名
    Example: owner 保持可用
      Given owner 的分帳旅行已建立成員
      When owner 嘗試對自己的固定成員執行 "改名"
      Then 這次分帳操作被拒絕為 "VALIDATION_ERROR"

  Rule: 固定 owner 成員不得停用
    Example: owner 保持可用
      Given owner 的分帳旅行已建立成員
      When owner 嘗試對自己的固定成員執行 "停用"
      Then 這次分帳操作被拒絕為 "VALIDATION_ERROR"

  Rule: 固定 owner 成員不得刪除
    Example: owner 保持可用
      Given owner 的分帳旅行已建立成員
      When owner 嘗試對自己的固定成員執行 "刪除"
      Then 這次分帳操作被拒絕為 "VALIDATION_ERROR"

  Rule: 改名不能占用owner名稱
    Example: Amy 改為含空白的小寫 Alice
      Given owner 的分帳旅行已建立成員
      When owner 將同行者 "Amy" 改名為 " alice "
      Then 這次分帳操作被拒絕為 "MEMBER_NAME_CONFLICT"

  Rule: 改名不能占用其他啟用者名稱
    Example: Amy 改為啟用中的 Carol
      Given owner 的分帳旅行已建立成員
      When owner 將同行者 "Amy" 改名為 "CAROL"
      Then 這次分帳操作被拒絕為 "MEMBER_NAME_CONFLICT"

