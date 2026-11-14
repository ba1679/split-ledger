Feature: 縮圖保存與私有讀取

  # Acceptance: thumbnail-format-and-size-boundaries／方向、隱私、複雜照片容量
  @B006-029
  Rule: 圖片正規化僅保存有界縮圖

    Scenario Outline: <內容> 的資料組合
      Given 旅行生命週期基準為 "一般可用"
      And 待保存照片含方向與位置資訊且內容為 "<內容>"
      When owner 保存待選圖片為旅行縮圖
      Then 保存結果為去除原始資訊的有界縮圖

      Examples:
        | 內容 |
        | 直拍照片 |
        | 複雜照片 |
        | 小圖 |

  # Acceptance: trip-thumbnail-lifecycle／保存預設圖
  @B006-030
  Rule: 保存預設圖清除目前自訂縮圖

    Example: 旅行生命週期基準為 "一般可用"
      Given 旅行生命週期基準為 "一般可用"
      When owner 執行旅行命令 "保存預設圖"
      Then 旅行使用預設圖且舊自訂圖不可再取得

  # Acceptance: trip-thumbnail-lifecycle／垃圾桶保留縮圖、更換清理；trip-state-conflicts-and-access／私有存取
  @B006-031
  Rule: 私有圖片按狀態與目前版本讀取

    Scenario Outline: <狀態>／<路徑>／<結果> 的資料組合
      Given 旅行生命週期基準為 "<狀態>"
      When owner 讀取 "<路徑>" 的縮圖
      Then 圖片讀取符合 "<結果>" 的私有契約

      Examples:
        | 狀態 | 路徑 | 結果 |
        | 一般可用 | 一般目前 | 可讀 |
        | 垃圾桶 | 垃圾桶目前 | 可讀 |
        | 垃圾桶 | 一般目前 | 垃圾桶拒絕 |
        | 一般可用 | 舊版本 | 不存在 |
        | 已永久刪除 | 已刪舊連結 | 不存在 |
