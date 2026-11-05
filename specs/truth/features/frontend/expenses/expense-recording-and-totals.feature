Feature: 支出記錄與統計

  Rule: 新增支出時日期預設為裝置當地日期
    Example: 三月十一日開始記帳
      Given 裝置當地日期為 "2027-03-11" 且使用者已有旅行
      When 使用者開啟新增支出表單
      Then 支出日期預設為 "2027-03-11" 且可修改

  Rule: 支出日期可以手動修改
    Example: 改為旅行開始前的機票日期
      Given 支出表單日期預設為 "2027-03-11"
      When 使用者將支出日期改為 "2027-01-15"
      Then 表單日期顯示 "2027-01-15"

  Rule: 可依代碼搜尋並選擇幣別
    Example: 搜尋 JPY
      Given 使用者已開啟新增支出表單且幣別目錄可用
      When 使用者搜尋並選擇 "JPY" 幣別
      Then 表單幣別顯示 "JPY" 且金額只接受整數
    Example: 搜尋 USD
      Given 使用者已開啟新增支出表單且幣別目錄可用
      When 使用者搜尋並選擇 "USD" 幣別
      Then 表單幣別顯示 "USD" 且金額最多兩位小數

  Rule: 零小數幣別立即阻擋小數點
    Example: JPY 100 嘗試輸入小數
      Given 使用者在新增支出表單選擇 JPY 且金額為 100
      When 使用者嘗試輸入小數點
      Then 金額仍為 100 且沒有小數點

  Rule: 金額欄位立即阻擋負號
    Example: JPY 100 嘗試輸入負號
      Given 使用者在新增支出表單選擇 JPY 且金額為 100
      When 使用者嘗試輸入負號
      Then 金額仍為 100 且沒有負號

  Rule: 兩位小數幣別阻擋第三位小數
    Example: USD 12.50 嘗試輸入第三位
      Given 使用者在新增支出表單選擇 USD 且金額為 12.50
      When 使用者嘗試輸入第三位小數
      Then 金額仍為 12.50

  Rule: 零金額不得保存
    Example: 午餐金額為零
      Given 使用者已填妥午餐支出且金額為 0
      When 使用者保存支出
      Then 畫面提示正數金額且午餐支出未新增

  Rule: 支出以原始金額與幣別呈現
    Example: JPY 午餐
      Given 使用者已填妥午餐支出且金額為 JPY 1200
      When 使用者保存支出
      Then 帳本顯示午餐為 JPY 1200
    Example: USD 飲料
      Given 使用者已填妥飲料支出且金額為 USD 12.50
      When 使用者保存支出
      Then 帳本顯示飲料為 USD 12.50

  Rule: 帳本依幣別顯示權威總額
    Example: TWD 與 JPY 並存
      Given "日本旅行" 已有 TWD 8000、JPY 15000 與 JPY 2000 支出
      When 使用者查看 "日本旅行" 帳本
      Then 畫面分別顯示 TWD 8000 與 JPY 17000 總額

  Rule: 修改金額後更新所屬幣別總額
    Example: 餐費改為 JPY 2500
      Given "日本旅行" 的 JPY 總額為 17000 且餐費為 JPY 2000
      When 使用者將餐費修改為 JPY 2500
      Then 畫面顯示 JPY 總額為 17500

  Rule: 修改幣別後從原幣別總額移除
    Example: 機票從 TWD 改為 JPY
      Given "日本旅行" 有 TWD 8000 機票且 JPY 總額為 17500
      When 使用者將機票修改為 JPY 8000
      Then 畫面顯示 JPY 總額為 25500

  Rule: 修改幣別後原幣別不再包含該支出
    Example: 機票從 TWD 改為 JPY
      Given "日本旅行" 有 TWD 8000 機票且 JPY 總額為 17500
      When 使用者將機票修改為 JPY 8000
      Then 畫面顯示 TWD 總額不再包含機票

  Rule: 刪除支出後更新清單
    Example: 刪除住宿
      Given "日本旅行" 有 JPY 15000 住宿且 JPY 總額為 25500
      When 使用者刪除住宿支出
      Then 帳本不再顯示住宿

  Rule: 刪除支出後更新所屬幣別總額
    Example: 刪除住宿
      Given "日本旅行" 有 JPY 15000 住宿且 JPY 總額為 25500
      When 使用者刪除住宿支出
      Then 畫面顯示 JPY 總額為 10500

  Rule: 另一裝置可看到已保存支出與總額
    Example: 電腦查看手機記錄
      Given 同一 Google 帳號已在手機保存旅行支出
      When 使用者在電腦查看該旅行帳本
      Then 使用者看到已保存支出與分幣別總額

  Rule: 離線時支出不顯示為已保存
    Example: 斷線嘗試記帳
      Given 使用者已填妥支出且裝置離線
      When 使用者保存支出
      Then 畫面保留草稿並告知支出尚未保存
