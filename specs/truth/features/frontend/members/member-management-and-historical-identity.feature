Feature: 同行者管理與歷史身分

  Rule: 新增同行者後可用同一身分選取
    Example: 去除 Amy 名稱前後空白
      Given 同行者名單有 owner Alice、啟用 Amy 與停用 Bob
      When owner 新增同行者 " Carol "
      Then 同行者名單顯示啟用中的 "Carol" 且可作為付款人及分攤者

  Rule: 同旅行成員名稱不可重複
    Example: 新增與 owner 同名
      Given 同行者名單有 owner Alice、啟用 Amy 與停用 Bob
      When owner 新增同行者 " alice "
      Then 同行者欄位提示名稱已使用且既有成員與帳務不變

    Example: 新增與啟用成員同名
      Given 同行者名單有 owner Alice、啟用 Amy 與停用 Bob
      When owner 新增同行者 "AMY"
      Then 同行者欄位提示名稱已使用且既有成員與帳務不變

    Example: 新增與停用成員同名
      Given 同行者名單有 owner Alice、啟用 Amy 與停用 Bob
      When owner 新增同行者 "Bob"
      Then 同行者欄位提示名稱已使用且既有成員與帳務不變

  Rule: 改名不可佔用其他成員名稱
    Example: Amy 改成停用的 Bob
      Given 同行者名單有 owner Alice、啟用 Amy 與停用 Bob
      When owner 將同行者 "Amy" 改名為 " bob "
      Then 同行者欄位提示名稱已使用且既有成員與帳務不變

  Rule: 名稱唯一性只限制同一旅行
    Example: 另一旅行已有 Amy
      Given 另一旅行有 Amy 而目前旅行只有 owner Alice
      When owner 新增同行者 "Amy"
      Then 同行者名單顯示啟用中的 "Amy" 且可作為付款人及分攤者

  Rule: 改名保留既有帳務身分
    Example: 小美改為 Amy
      Given 小美已被三人 JPY 300 午餐及 JPY 20 還款引用
      When owner 將同行者 "小美" 改名為 "Amy"
      Then 午餐與還款顯示 "Amy" 且仍關聯原成員身分

  Rule: 停用不移除歷史引用
    Example: 已有支出與還款的 Amy
      Given 小美已被三人 JPY 300 午餐及 JPY 20 還款引用
      When owner 停用同行者 "小美"
      Then "小美" 的歷史分攤及還款仍保留

  Rule: 停用成員不可加入新支出
    Example: 停用的小美
      Given 已被支出引用的 "小美" 已停用
      When owner 開啟新支出的成員選項
      Then 新支出不可選取 "小美"

  Rule: 停用成員不可加入新還款
    Example: 停用的小美
      Given 已被支出引用的 "小美" 已停用
      When owner 開啟獨立還款的成員選項
      Then 獨立還款不可選取 "小美"

  Rule: 重新啟用恢復同一身分的可選狀態
    Example: 重新啟用小美
      Given 已被支出引用的 "小美" 已停用
      When owner 重新啟用同行者 "小美"
      Then 同行者名單顯示啟用中的 "小美" 且可作為付款人及分攤者

  Rule: 未被引用同行者可刪除
    Example: 未有帳務的 Carol
      Given 同行者名單有 owner Alice、啟用 Amy 與停用 Bob
      And 已新增未被引用的同行者 Carol
      When owner 刪除同行者 "Carol"
      Then 同行者名單及新紀錄選項不含 "Carol"

  Rule: 已引用同行者的刪除要求引導停用
    Example: Amy 剛被另一裝置的支出引用
      Given 未引用的 Amy 刪除確認已開啟但另一裝置剛引用 Amy
      When owner 確認刪除同行者 "Amy"
      Then 畫面提示成員已被使用並提供停用而未刪除 Amy

  Rule: owner 在同行者管理中不可停用或刪除
    Example: 固定的 Alice
      Given 同行者名單有 owner Alice、啟用 Amy 與停用 Bob
      When owner 查看同行者管理
      Then owner Alice 不提供停用與刪除操作

  Rule: 同行者新增結果未明時不得誤報成功
    Example: 回應遺失且查證暫不可用
      Given 同行者新增表單填入 Carol 且保存回應遺失與查證暫不可用
      When owner 新增同行者 "Carol"
      Then 同行者畫面保留 Carol 並提示保存結果尚未確認
