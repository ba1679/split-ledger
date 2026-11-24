Feature: 台灣繁中記帳用詞

  Rule: 帳本以分帳稱呼整體記帳流程
    Example: 小安開啟旅行帳本
      Given 繁中旅行已有小安與小宇的共同晚餐 TWD 600
      When owner 查看旅行帳本
      Then 帳本以「分帳」及「記一筆」標示整體流程與新增支出入口

  Rule: 支出以分攤稱呼每位成員的份額
    Example: 兩人均分六百元晚餐
      Given 繁中旅行已有小安與小宇的共同晚餐 TWD 600
      When owner 查看晚餐支出詳情
      Then 支出明細以「支出金額」與「分攤」標示原額及兩人各 TWD 300
