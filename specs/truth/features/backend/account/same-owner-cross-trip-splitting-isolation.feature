Feature: 同owner不同旅行的子資源隔離

  Rule: 子資源必須屬於路徑指定旅行
    Example: 讀成員真實存在於另一趟旅行
      Given 同一owner的另一趟旅行有可讀寫分帳子資源
      When owner 以目前旅行路徑 "讀成員" 另一旅行子資源
      Then 跨旅行子資源存取被拒絕且來源不變

    Example: 改成員真實存在於另一趟旅行
      Given 同一owner的另一趟旅行有可讀寫分帳子資源
      When owner 以目前旅行路徑 "改成員" 另一旅行子資源
      Then 跨旅行子資源存取被拒絕且來源不變

    Example: 刪成員真實存在於另一趟旅行
      Given 同一owner的另一趟旅行有可讀寫分帳子資源
      When owner 以目前旅行路徑 "刪成員" 另一旅行子資源
      Then 跨旅行子資源存取被拒絕且來源不變

    Example: 讀支出真實存在於另一趟旅行
      Given 同一owner的另一趟旅行有可讀寫分帳子資源
      When owner 以目前旅行路徑 "讀支出" 另一旅行子資源
      Then 跨旅行子資源存取被拒絕且來源不變

    Example: 改支出真實存在於另一趟旅行
      Given 同一owner的另一趟旅行有可讀寫分帳子資源
      When owner 以目前旅行路徑 "改支出" 另一旅行子資源
      Then 跨旅行子資源存取被拒絕且來源不變

    Example: 刪支出真實存在於另一趟旅行
      Given 同一owner的另一趟旅行有可讀寫分帳子資源
      When owner 以目前旅行路徑 "刪支出" 另一旅行子資源
      Then 跨旅行子資源存取被拒絕且來源不變

    Example: 讀還款真實存在於另一趟旅行
      Given 同一owner的另一趟旅行有可讀寫分帳子資源
      When owner 以目前旅行路徑 "讀還款" 另一旅行子資源
      Then 跨旅行子資源存取被拒絕且來源不變

    Example: 讀結清真實存在於另一趟旅行
      Given 同一owner的另一趟旅行有可讀寫分帳子資源
      When owner 以目前旅行路徑 "讀結清" 另一旅行子資源
      Then 跨旅行子資源存取被拒絕且來源不變

