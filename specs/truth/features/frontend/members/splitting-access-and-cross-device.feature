Feature: 分帳存取與跨裝置

  Rule: owner 同帳號跨裝置可讀相同分帳
    Example: 電腦查看手機已保存內容
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 點心 | JPY | 100 | Alice | Alice、Amy、Bob |
      And owner 的手機已保存目前分帳資料
      When owner 在電腦開啟目前旅行分帳
      Then 電腦顯示同一份同行者、支出與分攤結果

  Rule: 其他登入帳號不可存取分帳
    Example: 另一帳號直達旅行
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 點心 | JPY | 100 | Alice | Alice、Amy、Bob |
      And 目前瀏覽器已改為另一個登入帳號
      When 使用者直達目前旅行分帳
      Then 畫面不洩漏同行者或帳務且不提供編輯能力

  Rule: 同行者身分不授予查看能力
    Example: 沒有owner登入的Amy
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 點心 | JPY | 100 | Alice | Alice、Amy、Bob |
      And 目前瀏覽器未登入且僅知道同行者 Amy 的資料
      When 使用者直達目前旅行分帳
      Then 畫面不洩漏同行者或帳務且不提供編輯能力
