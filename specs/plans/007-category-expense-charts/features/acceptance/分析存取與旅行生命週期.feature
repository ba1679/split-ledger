Feature: 花費分析延續帳本存取邊界

  # FR-004、014；SC-006。沿用目前僅擁有者登入操作的模式，不新增同行者帳號共編。

  Rule: 同行者名稱不會授予其他帳號查看擁有者分析的權限

    Example: Alice 登出後，與同行者同名的帳號仍不能看見原旅行花費
      Given Alice 已登入並擁有「台南旅行」，同行者為 Amy
      And 「台南旅行」只有餐飲 TWD 200，由 Alice 付款並由 Alice、Amy 分攤
      And 另一個獨立登入帳號顯示名稱也為 Amy，且沒有這趟旅行的存取權限
      When Alice 查看花費分析
      Then 個人餐飲為 TWD 100，團體餐飲為 TWD 200
      When Alice 登出後嘗試重新開啟原旅行分析
      Then 未登入者不能取得該旅行的圖表、分類明細或金額
      When 帳號 Amy 登入並嘗試開啟 Alice 的旅行分析
      Then Amy 不能取得該旅行的圖表、分類明細或金額
      And 不保留可見的 Alice 舊分析內容

  Rule: 垃圾桶與永久刪除旅行不得透過花費分析存取帳務

    Example: 有共同支出的旅行移入垃圾桶、復原再永久刪除
      Given Alice 已登入並擁有「台南旅行」，同行者為 Amy
      And 「台南旅行」只有餐飲 TWD 200，由 Alice 付款並由 Alice、Amy 分攤
      And Alice 已查看個人餐飲 TWD 100 與團體餐飲 TWD 200 的分析
      When Alice 將「台南旅行」移入垃圾桶成功後嘗試重新開啟分析
      Then 不能取得或繼續顯示可操作的該旅行帳務分析
      And 可辨識旅行已在垃圾桶並依既有旅行管理方式處理
      When Alice 復原該旅行成功後重新開啟分析
      Then 個人餐飲仍為 TWD 100，團體餐飲仍為 TWD 200
      When Alice 再次將該旅行移入垃圾桶並另行確認永久刪除成功
      And Alice 嘗試透過原連結開啟分析
      Then 不能取得該旅行的圖表、分類明細或金額
