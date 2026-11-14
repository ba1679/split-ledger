Feature: 背景更新與分頁等待

  # Acceptance: site-wide-loading-and-operation-feedback／局部分頁保留內容
  @F006-082
  Rule: 載入更多只在列表尾端等待

    Example: 支出已有 20 筆與確認總額且另有 5 筆未顯示
      Given 支出已有 20 筆與確認總額且另有 5 筆未顯示
      When owner 選擇載入更多支出
      Then 原有支出與總額保持可見且只有尾端忙碌

  # Acceptance: site-wide-loading-and-operation-feedback／分頁完成與防重複
  @F006-083
  Rule: 分頁處理中重複觸發不重複追加

    Example: 第二頁支出正在讀取且原次回應可完成
      Given 第二頁支出正在讀取且原次回應可完成
      When owner 在等待中連續再次觸發相同操作
      Then 列表恰有 25 筆不同支出且總額保持

  # Acceptance: site-wide-loading-and-operation-feedback／背景更新保留內容
  @F006-084
  Rule: 背景更新期間保留已確認內容

    Example: 已載入 25 筆支出且背景更新將 "延遲"
      Given 已載入 25 筆支出且背景更新將 "延遲"
      When 系統進行本次背景資料更新
      Then 更新僅顯示局部等待而保留全部已載入資料

  # Acceptance: site-wide-loading-and-operation-feedback／背景失敗
  @F006-085
  Rule: 背景更新失敗保留資料並提供下一步

    Example: 已載入 25 筆支出且背景更新將 "明確失敗"
      Given 已載入 25 筆支出且背景更新將 "明確失敗"
      When 系統進行本次背景資料更新
      Then 舊內容保持且局部等待結束並可重試

  # Acceptance: site-wide-loading-and-operation-feedback／重試背景更新
  @F006-086
  Rule: 背景重試成功顯示最新資料不重複追加

    Example: 背景更新已失敗且連線恢復
      Given 背景更新已失敗且連線恢復
      When owner 重試本次讀取
      Then 最新已保存資料完整顯示且沒有重複
