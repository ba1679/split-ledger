Feature: 旅行同行者與平均分攤支出

  Rule: 同行者名稱在同一旅行內必須可辨識，改名或停用後仍保留同一身分

    Example: owner 建立同行者、記錄支出、改名並停用後仍保留原分攤
      Given owner 已登入並擁有 "日本旅行"
      And "日本旅行" 有啟用中的同行者 "小美" 與 "Bob"
      When owner 記錄以下共同支出：
        | 項目 | 金額    | 付款人 | 分攤者              |
        | 午餐 | JPY 300 | owner  | owner、小美、Bob     |
      Then 午餐的精確公平份額如下：
        | 成員  | 份額    |
        | owner | JPY 100 |
        | 小美  | JPY 100 |
        | Bob   | JPY 100 |
      When owner 將同行者 "小美" 改名為 "Amy"
      Then 午餐仍關聯改名前的同一位同行者並顯示 "Amy"
      And "Amy" 的公平份額仍為 JPY 100
      When owner 停用同行者 "Amy"
      Then 午餐與既有餘額仍保留 "Amy" 的分攤
      And 新支出的付款人與分攤者不再提供 "Amy" 選用
      When owner 重新啟用同行者 "Amy"
      Then 新支出的付款人與分攤者再次提供同一位 "Amy" 選用

    Example: owner、啟用同行者與停用同行者的名稱都不得重複
      Given "日本旅行" 的 owner 顯示名稱為 "Alice"
      And "日本旅行" 有啟用同行者 "Amy" 與停用同行者 "Bob"
      When owner 嘗試新增以下同行者：
        | 輸入名稱  | 衝突對象     |
        | " alice " | owner Alice  |
        | "AMY"     | 啟用中的 Amy |
        | "Bob"     | 停用中的 Bob |
      Then 系統去除名稱前後空白並以英文不分大小寫比較
      And 三次新增都被拒絕
      And owner、Amy、Bob 與既有帳務紀錄維持不變
      When owner 嘗試將 "Amy" 改名為 " bob "
      Then 改名被拒絕且 "Amy" 仍為原名
      Given 另一趟 "台南旅行" 沒有名為 "Amy" 的成員
      When owner 在 "台南旅行" 新增同行者 "Amy"
      Then 新同行者保存成功，因為名稱唯一性只限制同一趟旅行

  Rule: 個人與共同支出使用同一套紀錄且共同支出先保留精確平均值

    Example: Phase 1A 個人支出保持不變，再新增不能整除的三人共同支出
      Given owner 的 "日本旅行" 已有以下 Phase 1A 個人支出：
        | 項目 | 金額     | 幣別 | 日期       |
        | 機票 | 8000     | TWD  | 2027-01-15 |
      And "日本旅行" 有同行者 "Amy" 與 "Bob"
      When owner 在 Phase 1B 查看既有機票支出
      Then 機票仍為 owner 付款且只由 owner 分攤
      And 機票仍顯示 TWD 8000 且不產生成員間債務
      When owner 記錄 JPY 100 的 "點心"，付款人為 owner，分攤者為 owner、Amy、Bob
      Then 三人的精確公平份額完全相等且各為 JPY "100/3"
      And 三人的份額都顯示為 "JPY 33.333…（100 ÷ 3）" 或等價的未取整表示
      And 三份精確公平份額的總和為 JPY 100
      And 系統尚未把份額改成 JPY 34、JPY 33、JPY 33

    Example: 付款人不參與分攤時仍保有完整應收
      Given owner 已登入 "日本旅行"
      And "日本旅行" 有同行者 "Amy" 與 "Bob"
      When owner 記錄 JPY 100 的 "雙人門票"，付款人為 owner，分攤者只有 Amy、Bob
      Then 雙人門票的精確公平份額如下：
        | 成員  | 份額   |
        | owner | JPY 0  |
        | Amy   | JPY 50 |
        | Bob   | JPY 50 |
      And owner 因雙人門票應收 JPY 100
      And 付款安排不包含 owner 支付給自己

  Rule: 同行者不因被加入旅行而取得查看或編輯權限

    Example: owner 可跨裝置查看分帳，但同行者與其他帳號都不能存取
      Given owner 已在手機登入並保存 "日本旅行" 的同行者與共同支出
      When owner 以相同 Google 帳號在電腦查看 "日本旅行"
      Then owner 可以看到同一份同行者、共同支出與分攤結果
      When 同行者 "Amy" 嘗試以同行者身分查看 "日本旅行"
      Then "Amy" 不會取得登入、查看或編輯能力
      When 另一個已登入帳號嘗試查看或修改 "日本旅行" 的分帳資料
      Then 系統不提供該旅行資料且原始紀錄維持不變
