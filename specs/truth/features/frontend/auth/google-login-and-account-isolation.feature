Feature: Google 登入與帳號隔離

  Rule: 完成 Google 登入後才顯示自己的旅行
    Example: 手機登入成功
      Given 使用者尚未登入
      When 使用者完成 Google 登入
      Then 使用者看到自己的旅行清單

  Rule: 登入未完成時不能看到帳本
    Example: Google 登入取消
      Given 使用者尚未登入
      When 使用者取消 Google 登入
      Then 使用者仍停留在登入入口且看不到帳本資料

  Rule: 換帳號後只顯示新帳號資料
    Example: 另一帳號登入同一裝置
      Given 裝置曾顯示第一個帳號的旅行與分類
      When 第二個帳號完成 Google 登入
      Then 畫面只顯示第二個帳號的旅行與分類
