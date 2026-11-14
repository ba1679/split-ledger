Feature: 縮圖格式與容量邊界

  # Acceptance: thumbnail-format-and-size-boundaries／JPEG、PNG與WebP單張靜態
  @B006-024
  Rule: 靜態JPEG與PNG及WebP可保存

    Scenario Outline: <格式>／<大小>／<寬>／<高> 的資料組合
      Given 旅行生命週期基準為 "一般可用"
      And 待保存圖片為 "<格式>"、<大小> bytes、<寬> x <高> px
      When owner 保存待選圖片為旅行縮圖
      Then 有效圖片保存為唯一目前縮圖

      Examples:
        | 格式 | 大小 | 寬 | 高 |
        | JPEG .jpg | 1048576 | 4000 | 3000 |
        | JPEG .jpeg | 1048576 | 4000 | 3000 |
        | PNG | 1048576 | 4000 | 3000 |
        | WebP | 1048576 | 4000 | 3000 |

  # Acceptance: thumbnail-format-and-size-boundaries／7組合法邊界
  @B006-025
  Rule: 全部圖片上限同時成立時接受邊界值

    Scenario Outline: <大小>／<寬>／<高> 的資料組合
      Given 旅行生命週期基準為 "一般可用"
      And 待保存圖片為 "PNG"、<大小> bytes、<寬> x <高> px
      When owner 保存待選圖片為旅行縮圖
      Then 有效圖片保存為唯一目前縮圖

      Examples:
        | 大小 | 寬 | 高 |
        | 10485759 | 4000 | 3000 |
        | 10485760 | 4000 | 3000 |
        | 1048576 | 5000 | 5000 |
        | 10485760 | 5000 | 5000 |
        | 65536 | 16384 | 1 |
        | 65536 | 1 | 16384 |
        | 256 | 1 | 1 |

  # Acceptance: thumbnail-format-and-size-boundaries／4組任一限制超出
  @B006-026
  Rule: 任一圖片上限超出即拒絕

    Scenario Outline: <大小>／<寬>／<高>／<原因> 的資料組合
      Given 旅行生命週期基準為 "一般可用"
      And 待保存圖片為 "PNG"、<大小> bytes、<寬> x <高> px
      When owner 保存待選圖片為旅行縮圖
      Then 圖片拒絕為 "<原因>" 且保留原縮圖

      Examples:
        | 大小 | 寬 | 高 | 原因 |
        | 10485761 | 4000 | 3000 | 超過10MiB |
        | 1048576 | 5001 | 5000 | 超過25000000像素 |
        | 65536 | 16385 | 1 | 超過單邊16384px |
        | 65536 | 1 | 16385 | 超過單邊16384px |

  # Acceptance: thumbnail-format-and-size-boundaries／16種不合法內容
  @B006-027
  Rule: 實際內容不合法不能冒充靜態縮圖

    Scenario Outline: <內容>／<原因> 的資料組合
      Given 旅行生命週期基準為 "一般可用"
      And 待保存檔案內容為 "<內容>"
      When owner 保存待選圖片為旅行縮圖
      Then 圖片拒絕為 "<原因>" 且保留原縮圖

      Examples:
        | 內容 | 原因 |
        | HEIC | 不支援格式 |
        | HEIF | 不支援格式 |
        | AVIF | 不支援格式 |
        | 靜態GIF | 不支援格式 |
        | 動態GIF | 不支援格式 |
        | SVG | 不支援格式 |
        | 多頁TIFF | 不支援格式 |
        | PDF | 不支援格式 |
        | APNG | 動畫 |
        | 動態WebP | 動畫 |
        | HEIC偽裝JPEG | 不支援格式 |
        | 文字偽裝PNG | 內容損壞 |
        | 截斷JPEG | 內容損壞 |
        | 零寬PNG | 非法尺寸 |
        | 零高PNG | 非法尺寸 |
        | 零bytesJPEG | 空檔 |

  # Acceptance: thumbnail-format-and-size-boundaries／一次兩張
  @B006-028
  Rule: 一次多張圖片不得只保存第一張

    Example: 旅行生命週期基準為 "一般可用"；本次保存包含兩張各自合法圖片
      Given 旅行生命週期基準為 "一般可用"
      And 本次保存包含兩張各自合法圖片
      When owner 保存待選圖片為旅行縮圖
      Then 圖片拒絕為 "多張圖片" 且保留原縮圖
