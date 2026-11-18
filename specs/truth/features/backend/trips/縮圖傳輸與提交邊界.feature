Feature: 縮圖傳輸與提交邊界

  # Acceptance: research決策5與API multipart contract；site-wide-loading／上傳中斷
  @B006-104
  Rule: 圖片傳輸違規不能留下部分保存

    Scenario Outline: <條件>／<錯誤> 的資料組合
      Given 縮圖傳輸條件為 "<條件>"
      When 送出本次縮圖傳輸
      Then 縮圖傳輸拒絕為 "<錯誤>" 且沒有提交

      Examples:
        | 條件 | 錯誤 |
        | 來源不可信 | REQUEST_ORIGIN_REJECTED |
        | 沒有登入 | UNAUTHENTICATED |
        | 其他owner | NOT_FOUND |
        | 缺少圖片 | VALIDATION_ERROR |
        | 多餘文字欄位 | VALIDATION_ERROR |
        | 多餘part | IMAGE_TOO_LARGE |
        | 缺少版本header | VALIDATION_ERROR |
        | 截斷傳輸 | UPLOAD_INCOMPLETE |
        | 請求總量超限 | IMAGE_TOO_LARGE |
        | 上傳逾時 | UPLOAD_TIMEOUT |
        | 處理逾時 | UPLOAD_TIMEOUT |
        | 圖片工作忙碌 | UPLOAD_BUSY |
