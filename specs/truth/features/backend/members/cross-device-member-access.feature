Feature: 同owner跨裝置取得同行者

  Rule: 同帳號另一工作階段能讀取相同成員
    Example: 手機既有資料在電腦讀取
      Given owner 的分帳旅行已建立成員
      When owner 以另一裝置工作階段讀取旅行成員
      Then 兩個裝置看到同一組穩定成員

