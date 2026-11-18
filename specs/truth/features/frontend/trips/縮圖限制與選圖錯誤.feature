Feature: 縮圖限制與選圖錯誤

  # Acceptance: thumbnail-format-and-size-boundaries／格式與限制可見
  @F006-098
  Rule: 選圖前清楚揭露全部格式與容量條件

    Scenario Outline: <裝置> 的資料組合
      Given owner 已在 "<裝置>" 開啟旅行選圖介面
      When owner 查看可選圖片條件
      Then 選圖介面揭露靜態單張格式與全部上限

      Examples:
        | 裝置 |
        | 手機 |
        | 桌面電腦 |

  # Acceptance: thumbnail-format-and-size-boundaries／全部不合法輸入與超限回饋
  @F006-099
  Rule: 選圖拒絕說明原因且不損壞已保存縮圖

    Scenario Outline: <原因> 的資料組合
      Given owner 已在 "手機" 開啟旅行選圖介面
      And 待選圖片不合規原因為 "<原因>"
      When owner 嘗試保存這次不合規選圖
      Then 畫面說明 "<原因>" 並保留原已保存資料

      Examples:
        | 原因 |
        | HEIC |
        | HEIF |
        | AVIF |
        | 靜態GIF |
        | 動態GIF |
        | SVG |
        | 多頁TIFF |
        | PDF |
        | APNG動畫 |
        | WebP動畫 |
        | HEIC偽裝JPEG |
        | 文字偽裝PNG |
        | 截斷JPEG |
        | 零寬 |
        | 零高 |
        | 空檔 |
        | 超過10MiB |
        | 超過25000000像素 |
        | 寬超16384 |
        | 高超16384 |
        | 一次兩張 |

  # Acceptance: thumbnail-format-and-size-boundaries／16不合法內容與雙檔改選重試；site-wide-loading／中斷重試
  @F006-100
  Rule: 拒絕後改選合法圖片可完成保存

    Scenario Outline: <原因> 的資料組合
      Given 前次選圖已因 "<原因>" 被拒絕且現在備有合法JPEG
      When owner 改選合法JPEG並保存縮圖
      Then 合法新圖可讀取且錯誤與等待已結束

      Examples:
        | 原因 |
        | HEIC |
        | HEIF |
        | AVIF |
        | 靜態GIF |
        | 動態GIF |
        | SVG |
        | 多頁TIFF |
        | PDF |
        | APNG動畫 |
        | WebP動畫 |
        | HEIC偽裝JPEG |
        | 文字偽裝PNG |
        | 截斷JPEG |
        | 零寬 |
        | 零高 |
        | 空檔 |
        | 超過10MiB |
        | 超過25000000像素 |
        | 寬超16384 |
        | 高超16384 |
        | 一次兩張 |

  # Acceptance: thumbnail-format-and-size-boundaries／4種格式裝置組合
  @F006-101
  Rule: 手機與桌面選圖保存後另一裝置可讀

    Scenario Outline: <裝置>／<格式> 的資料組合
      Given owner 在 "<裝置>" 備有合法 "<格式>" 照片
      When owner 選圖預覽後保存該照片
      Then 另一裝置可讀相同旅行的已保存縮圖

      Examples:
        | 裝置 | 格式 |
        | 手機 | JPEG .jpg |
        | 桌面電腦 | JPEG .jpeg |
        | 手機 | PNG |
        | 桌面電腦 | WebP |
