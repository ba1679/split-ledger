Feature: 鍵盤與減少動態效果

  # Acceptance: site-wide-loading-and-operation-feedback／鍵盤確認
  @F006-096
  Rule: 確認流程有清楚後果與安全焦點

    Scenario Outline: <裝置> 的資料組合
      Given owner 使用 "<裝置>" 與鍵盤讀屏且偏好減少動態效果
      When owner 以鍵盤開啟移至垃圾桶確認
      Then 確認的名稱後果與安全焦點可辨識

      Examples:
        | 裝置 |
        | 手機 |
        | 桌面電腦 |

  # Acceptance: site-wide-loading-and-operation-feedback／reduced-motion與完成焦點
  @F006-097
  Rule: 減少動態效果仍能理解等待與完成

    Scenario Outline: <裝置>／<結果> 的資料組合
      Given owner 使用 "<裝置>" 與鍵盤讀屏且偏好減少動態效果
      And 日期保存已送出且即將 "<結果>"
      When 日期保存進入本例指定狀態
      Then 可理解 "<結果>" 且焦點未無故移走

      Examples:
        | 裝置 | 結果 |
        | 手機 | 延遲 |
        | 手機 | 成功 |
        | 桌面電腦 | 延遲 |
        | 桌面電腦 | 成功 |
