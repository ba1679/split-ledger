Feature: 台灣繁中結算文案

  Rule: 零淨額且無相關待付款時顯示已結清
    Example: 帳本中台幣已無待付款，日圓仍有安排
      Given 繁中旅行的 TWD 成員淨額全為零且無 TWD 付款安排，JPY 仍有待付款
      When owner 查看旅行帳本淨額
      Then 帳本的 TWD 零淨額成員顯示「已結清」

    Example: 結算中台幣已無待付款，日圓仍有安排
      Given 繁中旅行的 TWD 成員淨額全為零且無 TWD 付款安排，JPY 仍有待付款
      When owner 查看分帳結算
      Then 結算的 TWD 零淨額成員顯示「已結清」

  Rule: 零淨額但仍涉及待付款時顯示淨額為零
    Example: 帳本中小宇兩筆台幣付款互抵
      Given 繁中旅行關閉簡化付款且小宇應收小安 TWD 100、應付小美 TWD 100
      When owner 查看旅行帳本淨額
      Then 帳本中小宇的 TWD 淨額顯示「淨額為零」

    Example: 結算中小宇兩筆台幣付款互抵
      Given 繁中旅行關閉簡化付款且小宇應收小安 TWD 100、應付小美 TWD 100
      When owner 查看分帳結算
      Then 結算中小宇的 TWD 淨額顯示「淨額為零」且兩筆原付款安排仍可見

  Rule: 部分幣別無安排時只在該幣別提示
    Example: 台幣空而日圓有待付款
      Given 繁中旅行的 TWD 沒有付款安排而 JPY 仍有待付款
      When owner 查看分帳結算
      Then 「待付款」區顯示「TWD 無待付款項」和 JPY 待付款明細

  Rule: 全旅行無安排時只顯示一次全空提示
    Example: 台幣及日圓均無待付款
      Given 繁中旅行所有幣別都沒有付款安排
      When owner 查看分帳結算
      Then 「待付款」區只顯示一次「目前沒有待付款項。」

  Rule: 帳務欄位明確區分應付與已付
    Example: 小宇已還一百且仍應付兩百
      Given 繁中旅行有小宇應付小安 TWD 300 且已記錄實付 TWD 100
      When owner 查看分帳結算
      Then 畫面以「應付金額」及「已付金額」區分 TWD 200 待付與 TWD 100 實付

  Rule: 結算說明依同快照資料顯示目前模式
    Scenario Outline: 簡化付款的三種結果
      Given 英文旅行的付款模式及安排屬於 "<結果>"
      When owner 查看分帳結算
      Then 英文結算說明符合 "<結果>" 且來源帳務不變

      Examples:
        | 結果 |
        | 未開啟簡化 |
        | 開啟後安排相同 |
        | 開啟後安排改變 |
