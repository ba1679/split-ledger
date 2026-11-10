Feature: 獨立還款與超額確認

  Rule: 獨立部分還款只更新同幣別餘額
    Example: 先還JPY400保留TWD300
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 代付 | JPY | 1000 | Alice | Amy |
        | 台幣代付 | TWD | 300 | Alice | Amy |
      And owner 已填 Amy 支付 Alice JPY 400 的獨立還款
      When owner 保存獨立還款
      Then 已保存 JPY 400 實付且 Amy 剩餘應付 Alice JPY 600、TWD 300

  Rule: 多次獨立還款可還清同幣別餘額
    Example: 再還JPY600
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 代付 | JPY | 1000 | Alice | Amy |
        | 台幣代付 | TWD | 300 | Alice | Amy |
      And 分帳旅行已有 Amy 支付 Alice JPY 400 的獨立還款
      And owner 已填 Amy 支付 Alice JPY 600 的獨立還款
      When owner 保存獨立還款
      Then JPY 已結清且保留 JPY 400 與 JPY 600 兩筆獨立實付

  Rule: 獨立超額還款需先警告後保存
    Example: 應付600輸入700
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 代付 | JPY | 1000 | Alice | Amy |
        | 台幣代付 | TWD | 300 | Alice | Amy |
      And 分帳旅行已有 Amy 支付 Alice JPY 400 的獨立還款
      And owner 已填 Amy 支付 Alice JPY 700 的獨立還款
      When owner 保存獨立還款
      Then 提示超額 JPY 100 將使 Alice 應付 Amy JPY 100 且尚未保存

  Rule: 取消超額確認不新增實付
    Example: 取消700的超付
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 代付 | JPY | 1000 | Alice | Amy |
        | 台幣代付 | TWD | 300 | Alice | Amy |
      And 分帳旅行已有 Amy 支付 Alice JPY 400 的獨立還款
      And JPY 700 的超額 JPY 100 警告已呈現且尚未保存
      When owner 取消超額還款
      Then 沒有新增還款且 Amy 仍應付 Alice JPY 600

  Rule: 明確確認超額後可形成反向債權
    Example: 確認實付700
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 代付 | JPY | 1000 | Alice | Amy |
        | 台幣代付 | TWD | 300 | Alice | Amy |
      And 分帳旅行已有 Amy 支付 Alice JPY 400 的獨立還款
      And JPY 700 的超額 JPY 100 警告已呈現且尚未保存
      When owner 明確確認超額還款
      Then 已保存 JPY 700 獨立實付且 Alice 改為應付 Amy JPY 100
      And 來源支出與先前實付紀錄保持不變

  Rule: 警告版本改變後不可沿用舊確認
    Example: 確認前另一裝置降低原支出
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 代付 | JPY | 1000 | Alice | Amy |
        | 台幣代付 | TWD | 300 | Alice | Amy |
      And 分帳旅行已有 Amy 支付 Alice JPY 400 的獨立還款
      And JPY 700 的超額 JPY 100 警告已呈現且尚未保存
      And 另一裝置已將代付由 JPY 1000 改成 JPY 900
      When owner 明確確認超額還款
      Then 顯示新的超額 JPY 200 警告且未保存舊確認

  Rule: 付款人與收款人不得相同
    Example: Amy還給自己
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 代付 | JPY | 1000 | Alice | Amy |
        | 台幣代付 | TWD | 300 | Alice | Amy |
      And owner 已填 Amy 支付 Amy JPY 100 的獨立還款
      When owner 保存獨立還款
      Then 還款欄提示付款人與收款人不可相同且帳務不變

  Rule: 獨立還款必須是正數
    Example: JPY零元
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 代付 | JPY | 1000 | Alice | Amy |
        | 台幣代付 | TWD | 300 | Alice | Amy |
      And owner 已填 Amy 支付 Alice JPY 0 的獨立還款
      When owner 保存獨立還款
      Then 還款欄提示正數金額且帳務不變

  Rule: 獨立還款不可選其他旅行成員
    Example: 另一旅行的Carol
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 代付 | JPY | 1000 | Alice | Amy |
        | 台幣代付 | TWD | 300 | Alice | Amy |
      And 其他旅行的 Carol 不屬於本旅行
      When owner 開啟獨立還款成員選單
      Then 本旅行還款選單不可選取 Carol

  Rule: 獨立還款遺失回應可查證已保存結果
    Example: JPY400成功回應遺失
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 代付 | JPY | 1000 | Alice | Amy |
        | 台幣代付 | TWD | 300 | Alice | Amy |
      And owner 已填 Amy 支付 Alice JPY 400 的獨立還款
      And 獨立還款成功回應遺失但原結果可查證
      When owner 保存獨立還款
      Then 畫面查證原還款成功且不重複新增

  Rule: 獨立還款結果未明不自動重送
    Example: JPY400查證暫404
      Given 分帳旅行已有以下支出：
        | 項目 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 代付 | JPY | 1000 | Alice | Amy |
        | 台幣代付 | TWD | 300 | Alice | Amy |
      And owner 已填 Amy 支付 Alice JPY 400 的獨立還款
      And 獨立還款成功回應遺失且原結果暫不可查證
      When owner 保存獨立還款
      Then 保留還款草稿與原識別並提示結果尚未確認
