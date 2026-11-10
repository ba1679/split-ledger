Feature: 實付結清與保存結果

  Rule: 正數實付可結清未整除安排
    Example: Amy 實付 JPY 33
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 點心 | JPY | 100 | Alice | Alice、Amy、Bob |
      And owner 已開啟 Amy 支付 Alice 的實付結清表單
      When owner 輸入實付 JPY 33 並結清
      Then Amy 的安排已關閉且保存實付 JPY 33 與原應付 JPY 100/3

    Example: Amy 實付 JPY 34
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 點心 | JPY | 100 | Alice | Alice、Amy、Bob |
      And owner 已開啟 Amy 支付 Alice 的實付結清表單
      When owner 輸入實付 JPY 34 並結清
      Then Amy 的安排已關閉且保存實付 JPY 34 與原應付 JPY 100/3

  Rule: 兩筆未整除安排可分別結清
    Example: Amy 先付33而 Bob 再付34
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 點心 | JPY | 100 | Alice | Alice、Amy、Bob |
      And Amy 支付 Alice JPY 33 的安排已結清
      And owner 已開啟 Bob 支付 Alice 的實付結清表單
      When owner 輸入實付 JPY 34 並結清
      Then 三人已平衡且保留兩筆實付與原始份額

  Rule: 結清超付不產生反向安排
    Example: 應付600實付700
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 代付 | JPY | 600 | Alice | Amy |
      And owner 已開啟 Amy 支付 Alice 的實付結清表單
      When owner 輸入實付 JPY 700 並結清
      Then Amy 的安排已關閉且保存實付 JPY 700 與原應付 JPY 600

  Rule: 結清表單不替付款人決定實付
    Example: 未填實付金額
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 點心 | JPY | 100 | Alice | Alice、Amy、Bob |
      When owner 開啟 Amy 支付 Alice 的實付結清表單
      Then 應付顯示 JPY 33.33 而實付留空且沒有取整方式選擇

  Rule: 結清非正數不得保存
    Example: 實付零元
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 點心 | JPY | 100 | Alice | Alice、Amy、Bob |
      And owner 已開啟 Amy 支付 Alice 的實付結清表單
      When owner 輸入實付 JPY 0 並結清
      Then 實付欄提示正數且安排未結清

  Rule: 過期結清不能沿用舊安排
    Example: 另一裝置剛修改支出
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 點心 | JPY | 100 | Alice | Alice、Amy、Bob |
      And owner 已開啟 Amy 支付 Alice 的實付結清表單
      And 另一裝置已修改點心而目前結清表單仍為舊安排
      When owner 輸入實付 JPY 33 並結清
      Then 提示安排已更新並要求刷新且沒有本次實付或結清

  Rule: 遺失結清回應時查證原結果
    Example: 已成功而成功回應遺失
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 點心 | JPY | 100 | Alice | Alice、Amy、Bob |
      And owner 已開啟 Amy 支付 Alice 的實付結清表單
      And 結清成功回應遺失但原結果可查證
      When owner 輸入實付 JPY 33 並結清
      Then 畫面查證原結清成功且不重複記錄

  Rule: 無法查證結清時保留未確認狀態
    Example: 回應與查證都不可用
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 點心 | JPY | 100 | Alice | Alice、Amy、Bob |
      And owner 已開啟 Amy 支付 Alice 的實付結清表單
      And 結清成功回應遺失且原結果暫不可查證
      When owner 輸入實付 JPY 33 並結清
      Then 畫面保留實付草稿並提示結清結果尚未確認
