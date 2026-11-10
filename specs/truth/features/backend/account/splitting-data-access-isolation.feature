Feature: 分帳權限仍由帳本owner持有

  Rule: 非owner不得列成員旅行分帳資料
    Example: 乙的名字與同行者相同仍無權限
      Given 分帳旅行另有未獲授權的登入帳號
      When 非 owner 帳號嘗試 "列成員" 分帳資源
      Then 分帳資源拒絕存取且不揭露帳務

  Rule: 非owner不得讀成員旅行分帳資料
    Example: 乙的名字與同行者相同仍無權限
      Given 分帳旅行另有未獲授權的登入帳號
      When 非 owner 帳號嘗試 "讀成員" 分帳資源
      Then 分帳資源拒絕存取且不揭露帳務

  Rule: 非owner不得新增成員旅行分帳資料
    Example: 乙的名字與同行者相同仍無權限
      Given 分帳旅行另有未獲授權的登入帳號
      When 非 owner 帳號嘗試 "新增成員" 分帳資源
      Then 分帳資源拒絕存取且不揭露帳務

  Rule: 非owner不得改成員旅行分帳資料
    Example: 乙的名字與同行者相同仍無權限
      Given 分帳旅行另有未獲授權的登入帳號
      When 非 owner 帳號嘗試 "改成員" 分帳資源
      Then 分帳資源拒絕存取且不揭露帳務

  Rule: 非owner不得刪成員旅行分帳資料
    Example: 乙的名字與同行者相同仍無權限
      Given 分帳旅行另有未獲授權的登入帳號
      When 非 owner 帳號嘗試 "刪成員" 分帳資源
      Then 分帳資源拒絕存取且不揭露帳務

  Rule: 非owner不得讀共同支出旅行分帳資料
    Example: 乙的名字與同行者相同仍無權限
      Given 分帳旅行另有未獲授權的登入帳號
      When 非 owner 帳號嘗試 "讀共同支出" 分帳資源
      Then 分帳資源拒絕存取且不揭露帳務

  Rule: 非owner不得改共同支出旅行分帳資料
    Example: 乙的名字與同行者相同仍無權限
      Given 分帳旅行另有未獲授權的登入帳號
      When 非 owner 帳號嘗試 "改共同支出" 分帳資源
      Then 分帳資源拒絕存取且不揭露帳務

  Rule: 非owner不得刪共同支出旅行分帳資料
    Example: 乙的名字與同行者相同仍無權限
      Given 分帳旅行另有未獲授權的登入帳號
      When 非 owner 帳號嘗試 "刪共同支出" 分帳資源
      Then 分帳資源拒絕存取且不揭露帳務

  Rule: 非owner不得讀結算旅行分帳資料
    Example: 乙的名字與同行者相同仍無權限
      Given 分帳旅行另有未獲授權的登入帳號
      When 非 owner 帳號嘗試 "讀結算" 分帳資源
      Then 分帳資源拒絕存取且不揭露帳務

  Rule: 非owner不得切換簡化旅行分帳資料
    Example: 乙的名字與同行者相同仍無權限
      Given 分帳旅行另有未獲授權的登入帳號
      When 非 owner 帳號嘗試 "切換簡化" 分帳資源
      Then 分帳資源拒絕存取且不揭露帳務

  Rule: 非owner不得讀還款旅行分帳資料
    Example: 乙的名字與同行者相同仍無權限
      Given 分帳旅行另有未獲授權的登入帳號
      When 非 owner 帳號嘗試 "讀還款" 分帳資源
      Then 分帳資源拒絕存取且不揭露帳務

  Rule: 非owner不得新增還款旅行分帳資料
    Example: 乙的名字與同行者相同仍無權限
      Given 分帳旅行另有未獲授權的登入帳號
      When 非 owner 帳號嘗試 "新增還款" 分帳資源
      Then 分帳資源拒絕存取且不揭露帳務

  Rule: 非owner不得讀結清旅行分帳資料
    Example: 乙的名字與同行者相同仍無權限
      Given 分帳旅行另有未獲授權的登入帳號
      When 非 owner 帳號嘗試 "讀結清" 分帳資源
      Then 分帳資源拒絕存取且不揭露帳務

  Rule: 非owner不得新增結清旅行分帳資料
    Example: 乙的名字與同行者相同仍無權限
      Given 分帳旅行另有未獲授權的登入帳號
      When 非 owner 帳號嘗試 "新增結清" 分帳資源
      Then 分帳資源拒絕存取且不揭露帳務

  Rule: 沒有owner登入不取得分帳能力
    Example: 僅有同行者身分沒有session
      Given owner 的分帳旅行已建立成員
      When 未登入者嘗試讀取分帳結算
      Then 分帳結算回覆未登入且不揭露帳務

