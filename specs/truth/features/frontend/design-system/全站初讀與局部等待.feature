Feature: 全站初讀與局部等待

  # Acceptance: site-wide-loading-and-operation-feedback／12種初載
  @F006-073
  Rule: 各主要內容初讀等待使用骨架

    Scenario Outline: <畫面>／<內容> 的資料組合
      Given 全站 "<畫面>" 的 "<內容>" 初讀為 "延遲"
      When owner 開啟全站 "<畫面>"
      Then 指定內容顯示結構骨架且不提前顯示空值

      Examples:
        | 畫面 | 內容 |
        | 旅行清單 | 一般旅行 |
        | 垃圾桶 | 已移入垃圾桶的旅行 |
        | 旅行帳本 | 旅行資料 |
        | 旅行帳本 | 各幣別總額 |
        | 旅行帳本 | 支出清單 |
        | 既有支出詳情 | 該筆支出與分攤 |
        | 支出編輯表單 | 既有支出表單資料 |
        | 分類管理 | 分類清單 |
        | 同行者管理 | 同行者清單 |
        | 分帳畫面 | 付款安排 |
        | 獨立還款表單 | 還款所需旅行與成員資料 |
        | 實付結清表單 | 目前待結清安排 |

  # Acceptance: site-wide-loading-and-operation-feedback／12種初讀完成
  @F006-074
  Rule: 初讀完成後以真實內容取代骨架

    Scenario Outline: <畫面>／<內容> 的資料組合
      Given 全站 "<畫面>" 的 "<內容>" 初讀為 "成功"
      And 該內容已在等待且本次讀取即將成功
      When 原次資料讀取完成
      Then 畫面顯示 "<內容>" 的權威資料且骨架結束

      Examples:
        | 畫面 | 內容 |
        | 旅行清單 | 一般旅行 |
        | 垃圾桶 | 已移入垃圾桶的旅行 |
        | 旅行帳本 | 旅行資料 |
        | 旅行帳本 | 各幣別總額 |
        | 旅行帳本 | 支出清單 |
        | 既有支出詳情 | 該筆支出與分攤 |
        | 支出編輯表單 | 既有支出表單資料 |
        | 分類管理 | 分類清單 |
        | 同行者管理 | 同行者清單 |
        | 分帳畫面 | 付款安排 |
        | 獨立還款表單 | 還款所需旅行與成員資料 |
        | 實付結清表單 | 目前待結清安排 |

  # Acceptance: site-wide-loading-and-operation-feedback／垃圾桶先等待後真空狀態
  @F006-075
  Rule: 垃圾桶空結果在成功後才顯示

    Example: 全站 "垃圾桶" 的 "已移入垃圾桶的旅行" 初讀為 "成功空"；該內容已在等待且本次讀取即將成功
      Given 全站 "垃圾桶" 的 "已移入垃圾桶的旅行" 初讀為 "成功空"
      And 該內容已在等待且本次讀取即將成功
      When 原次資料讀取完成
      Then 垃圾桶顯示已確認空狀態且沒有等待

  # Acceptance: site-wide-loading-and-operation-feedback／身分確認
  @F006-076
  Rule: 身分確認等待不誤報登出

    Example: 站內身分確認尚未完成
      Given 站內身分確認尚未完成
      When 使用者開啟網站
      Then 身分確認有圖形與輔助語意且不洩漏私人內容

  # Acceptance: site-wide-loading-and-operation-feedback／表單選項等待
  @F006-077
  Rule: 必要選項等待不誤報空資料或允許缺項保存

    Scenario Outline: <選項> 的資料組合
      Given 新增支出必要選項 "<選項>" 尚在讀取
      When owner 檢視新增支出選項
      Then 局部選項等待且必要內容未齊不能保存

      Examples:
        | 選項 |
        | 幣別 |
        | 分類 |
        | 分攤成員 |

  # Acceptance: site-wide-loading-and-operation-feedback／第一次讀取失敗
  @F006-087
  Rule: 初讀失敗不誤報空資料

    Example: 全站 "旅行清單" 的 "一般旅行" 初讀為 "明確失敗"
      Given 全站 "旅行清單" 的 "一般旅行" 初讀為 "明確失敗"
      When owner 開啟全站 "旅行清單"
      Then 初讀等待結束並顯示讀取錯誤與重試

  # Acceptance: site-wide-loading-and-operation-feedback／初讀重新嘗試
  @F006-088
  Rule: 初讀失敗可由重試恢復

    Example: 旅行初讀已失敗且現在可成功取得清單
      Given 旅行初讀已失敗且現在可成功取得清單
      When owner 重試本次讀取
      Then 畫面顯示 "一般旅行" 的權威資料且骨架結束

  # Acceptance: site-wide-loading-and-operation-feedback／連線暫停
  @F006-094
  Rule: 無網路時清楚表示等待連線

    Example: 全站 "旅行清單" 的 "一般旅行" 初讀為 "無網路"
      Given 全站 "旅行清單" 的 "一般旅行" 初讀為 "無網路"
      When owner 開啟全站 "旅行清單"
      Then 畫面顯示等待連線而非無限處理中

  # Acceptance: site-wide-loading-and-operation-feedback／所有必要選項成功取得
  @F006-111
  Rule: 必要選項取得後可正常完成支出

    Example: 所有必要支出選項已由等待恢復成功
      Given 所有必要支出選項已由等待恢復成功
      When owner 保存選項恢復後的支出
      Then 選項等待結束且支出正常保存

  # Acceptance: site-wide-loading-and-operation-feedback／連線恢復取得清單
  @F006-112
  Rule: 恢復連線接續原次讀取

    Example: 旅行清單正在等待連線且網路即將恢復
      Given 旅行清單正在等待連線且網路即將恢復
      When 網路恢復並完成原次旅行讀取
      Then 連線等待結束且旅行資料可正常使用
