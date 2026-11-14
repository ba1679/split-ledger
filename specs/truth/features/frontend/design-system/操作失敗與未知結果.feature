Feature: 操作失敗與未知結果

  # Acceptance: site-wide-loading-and-operation-feedback／保存明確失敗
  @F006-089
  Rule: 明確保存失敗保留修改草稿與原帳務

    Example: 支出編輯草稿已修改且本次保存將明確失敗
      Given 支出編輯草稿已修改且本次保存將明確失敗
      When owner 保存目前支出編輯草稿
      Then 保存等待結束且原帳務與修改草稿均保留

  # Acceptance: site-wide-loading-and-operation-feedback／支出重試成功
  @F006-090
  Rule: 保留的支出草稿可重新保存

    Example: 前次支出保存明確失敗已解除且草稿保留
      Given 前次支出保存明確失敗已解除且草稿保留
      When owner 保存目前支出編輯草稿
      Then 原支出恰更新一次且呈現已確認結果

  # Acceptance: site-wide-loading-and-operation-feedback／實付結果未知
  @F006-091
  Rule: 付款結果未知不宣告成功或失敗

    Example: 實付結清已填合法草稿且保存會成功但回應遺失
      Given 實付結清已填合法草稿且保存會成功但回應遺失
      When owner 保存本次實付結清
      Then 實付結果尚未確認且不能重複新增

  # Acceptance: site-wide-loading-and-operation-feedback／查證結束仍未知
  @F006-092
  Rule: 查證未果停止無出口的忙碌

    Example: 原次實付正在查證但本輪仍無法確認
      Given 原次實付正在查證但本輪仍無法確認
      When 本輪結果查證結束仍未知
      Then 停止持續動畫並保留再次查證入口及草稿

  # Acceptance: site-wide-loading-and-operation-feedback／恢復連線再次查證付款
  @F006-093
  Rule: 再次查證只確認原實付而不重新付款

    Example: 原次實付結果未知且現在可查證
      Given 原次實付結果未知且現在可查證
      When owner 再次查證原實付
      Then 原實付已確認且恰有一筆付款事實
