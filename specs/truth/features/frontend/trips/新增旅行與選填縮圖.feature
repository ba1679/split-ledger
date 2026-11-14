Feature: 新增旅行與選填縮圖

  # Acceptance: trip-thumbnail-lifecycle／新增旅行未選圖
  @F006-052
  Rule: 未選縮圖仍可建立旅行

    Example: owner 的旅行管理畫面為 "新增表單"；新增旅行草稿的照片為 "無"
      Given owner 的旅行管理畫面為 "新增表單"
      And 新增旅行草稿的照片為 "無"
      When owner 送出新增旅行
      Then 新旅行只建立一次並使用 "預設"

  # Acceptance: trip-thumbnail-lifecycle／新增合法照片完整保存
  @F006-053
  Rule: 選填縮圖在旅行建立後保存

    Example: owner 的旅行管理畫面為 "新增表單"；新增旅行草稿的照片為 "合法神社"
      Given owner 的旅行管理畫面為 "新增表單"
      And 新增旅行草稿的照片為 "合法神社"
      When owner 送出新增旅行
      Then 新旅行只建立一次並使用 "神社"

  # Acceptance: trip-thumbnail-lifecycle／新增選圖後取消
  @F006-054
  Rule: 取消新增不建立旅行或保存圖片

    Scenario Outline: <方式> 的資料組合
      Given owner 的旅行管理畫面為 "新增表單"
      And 新增旅行草稿的照片為 "合法神社"
      When owner 以 "<方式>" 關閉 "新增表單"
      Then 新增表單及選圖草稿已放棄且旅行不存在

      Examples:
        | 方式 |
        | 取消 |
        | X |
        | Escape |

  # Acceptance: trip-thumbnail-lifecycle／新增送出前只預覽
  @F006-055
  Rule: 新增表單選圖先預覽而不持久化

    Example: owner 的旅行管理畫面為 "新增表單"
      Given owner 的旅行管理畫面為 "新增表單"
      When owner 在新增表單選擇 "合法神社"
      Then 新增表單顯示尚未保存預覽且沒有旅行資料

  # Acceptance: trip-thumbnail-lifecycle／新增表單拒絕不合法選圖
  @F006-056
  Rule: 新增表單不把無效圖片悄悄忽略

    Example: owner 的旅行管理畫面為 "新增表單"
      Given owner 的旅行管理畫面為 "新增表單"
      When owner 在新增表單選擇 "不合法HEIC"
      Then 新增表單說明選圖錯誤並阻止帶錯誤直接建立

  # Acceptance: trip-thumbnail-lifecycle／移除不合法選圖再建立
  @F006-057
  Rule: 移除無效選圖後可繼續無圖建立

    Example: owner 的旅行管理畫面為 "新增表單"；新增旅行草稿的照片為 "不合法HEIC"
      Given owner 的旅行管理畫面為 "新增表單"
      And 新增旅行草稿的照片為 "不合法HEIC"
      When owner 移除新增表單的選圖
      Then 新增草稿不含照片且建立入口可用

  # Acceptance: trip-thumbnail-lifecycle／旅行建立明確失敗
  @F006-058
  Rule: 建立失敗保留表單和照片且不保存圖片

    Example: 新增旅行草稿的照片為 "合法神社"；旅行建立將明確失敗
      Given owner 的旅行管理畫面為 "新增表單"
      And 新增旅行草稿的照片為 "合法神社"
      And 旅行建立將明確失敗
      When owner 送出新增旅行
      Then 旅行未建立且可修正草稿保持

  # Acceptance: trip-thumbnail-lifecycle／修正建立問題重新送出
  @F006-059
  Rule: 修正建立失敗後沿用照片完成建立

    Example: 新增旅行草稿的照片為 "合法神社"；前次建立明確失敗已解除且照片草稿保留
      Given owner 的旅行管理畫面為 "新增表單"
      And 新增旅行草稿的照片為 "合法神社"
      And 前次建立明確失敗已解除且照片草稿保留
      When owner 送出新增旅行
      Then 新旅行只建立一次並使用 "神社"

  # Acceptance: trip-thumbnail-lifecycle／建立成功但圖片失敗
  @F006-060
  Rule: 圖片失敗仍保留已建立旅行

    Example: 新增旅行草稿的照片為 "合法神社"；本次圖片保存將明確失敗且確定未提交
      Given owner 的旅行管理畫面為 "新增表單"
      And 新增旅行草稿的照片為 "合法神社"
      And 本次圖片保存將明確失敗且確定未提交
      When owner 送出新增旅行
      Then 旅行已建立但圖片未保存且可同旅行重傳

  # Acceptance: trip-thumbnail-lifecycle／同trip重新上傳沒有第二趟
  @F006-061
  Rule: 圖片重傳沿用同一趟已建立旅行

    Example: 旅行已建立但圖片失敗且可重新上傳
      Given 旅行已建立但圖片失敗且可重新上傳
      When owner 重新上傳已建立旅行的圖片
      Then 新旅行只建立一次並使用 "神社"

  # Acceptance: trip-thumbnail-lifecycle／新增圖片未知先查證
  @F006-064
  Rule: 新增後圖片結果未知不重建旅行

    Example: 新增旅行草稿的照片為 "合法神社"；本次 "新增附圖" 已提交但回應將遺失且暫不可查證
      Given owner 的旅行管理畫面為 "新增表單"
      And 新增旅行草稿的照片為 "合法神社"
      And 本次 "新增附圖" 已提交但回應將遺失且暫不可查證
      When owner 送出新增旅行
      Then 結果未確認並保留原操作的查證出口

  # Acceptance: trip-thumbnail-lifecycle／新增拒絕不合法選圖
  @F006-105
  Rule: 無效選圖不能被送出動作悄悄忽略

    Example: 不合法選圖仍留在新增旅行草稿
      Given 不合法選圖仍留在新增旅行草稿
      When owner 嘗試提交仍有選圖錯誤的新增旅行
      Then 選圖錯誤阻止建立且保留可修正內容

  # Acceptance: UI design-v7／建立結果未知；FR-009／兩階段
  @F006-106
  Rule: 建立回應遺失先查原旅行而不保存圖片

    Example: 建立旅行已送出但原次建立結果尚未確認
      Given 建立旅行已送出但原次建立結果尚未確認
      When 站內處理原次建立的遺失回應
      Then 建立結果未知保留表單照片且只查原旅行

  # Acceptance: UI design-v7／先確認建立再保存同trip圖片
  @F006-107
  Rule: 確認原旅行後接續保存照片

    Example: 原次建立結果未知且現在狀態可確認為一般可用
      Given 原次建立結果未知且現在狀態可確認為一般可用
      When owner 再次查證原次旅行建立
      Then 原旅行確認後才續存同旅行照片
