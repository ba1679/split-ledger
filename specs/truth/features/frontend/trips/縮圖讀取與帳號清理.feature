Feature: 縮圖讀取與帳號清理

  # Acceptance: trip-thumbnail-lifecycle／圖片延遲保留版面
  @F006-069
  Rule: 圖片等待保留卡片空間與必要入口

    Example: 旅行縮圖的讀取將 "延遲"
      Given 旅行縮圖的讀取將 "延遲"
      When owner 查看旅行卡片
      Then 縮圖區域保留位置且旅行識別與入口可用

  # Acceptance: trip-thumbnail-lifecycle／圖片失敗fallback
  @F006-070
  Rule: 圖片失敗回到預設呈現而不阻擋卡片

    Example: 旅行縮圖的讀取將 "明確失敗"
      Given 旅行縮圖的讀取將 "明確失敗"
      When owner 查看旅行卡片
      Then 縮圖使用預設呈現且等待已結束

  # Acceptance: trip-thumbnail-lifecycle／圖片失敗仍可記帳
  @F006-071
  Rule: 圖片失敗不妨礙記帳

    Example: 圖片讀取已失敗且owner已開啟原旅行帳本
      Given 圖片讀取已失敗且owner已開啟原旅行帳本
      When owner 保存 TWD 100 的早餐支出
      Then 早餐成功保存且圖片失敗沒有改壞帳務

  # Acceptance: trip-state-conflicts-and-access／登出換帳號清理及舊連結
  @F006-072
  Rule: 換帳號清理前一帳號的圖片與草稿

    Example: Alice 已查看私人旅行與垃圾桶且有未保存照片預覽
      Given Alice 已查看私人旅行與垃圾桶且有未保存照片預覽
      When Alice 登出並切換為 Carol 帳號
      Then Carol 畫面只含自己的資料且舊預覽已釋放
