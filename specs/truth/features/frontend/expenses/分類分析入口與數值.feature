Feature: 從帳本查看分類花費與幣別

  # 007；每例獨立建立旅行，Alice 是帳本擁有者及固定個人統計成員。
  # 分攤者為等額分攤；未分類代表沒有分類關聯。

  @F007-F01
  Rule: 帳本入口前往目前旅行的分析頁

    Example: 桌機帳本已有混合消費
      Given 分類分析旅行已有以下支出：
        | 項目 | 分類 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 晚餐 | 餐飲 | TWD | 900 | Amy | Alice、Amy、Bob |
        | 計程車 | 交通 | TWD | 600 | Alice | Amy、Bob |
        | 伴手禮 | 購物 | TWD | 200 | Alice | Alice |
        | 代買品 | 購物 | TWD | 100 | Bob | Alice |
        | 咖啡 | 餐飲 | TWD | 100 | Bob | Bob |
      And 分類分析使用裝置為 "桌機"
      When 從帳本開啟分類分析
      Then 分類分析頁屬於目前旅行且可返回原帳本

  @F007-F02
  Rule: 手機帳本從個人花費摘要進入分析

    Example: 手機總覽提供分析及浮動記帳入口
      Given 分類分析旅行已有以下支出：
        | 項目 | 分類 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 晚餐 | 餐飲 | TWD | 900 | Amy | Alice、Amy、Bob |
        | 計程車 | 交通 | TWD | 600 | Alice | Amy、Bob |
        | 伴手禮 | 購物 | TWD | 200 | Alice | Alice |
        | 代買品 | 購物 | TWD | 100 | Bob | Alice |
        | 咖啡 | 餐飲 | TWD | 100 | Bob | Bob |
      And 分類分析使用裝置為 "手機"
      When 從帳本開啟分類分析
      Then 手機帳本的個人花費摘要提供分析入口且記一筆獨立於三項底部導覽

  @F007-F03
  Rule: 分析頁依裝置排列個人與團體圖

    Example: 手機與桌機皆可閱讀兩圖
      Given 分類分析旅行已有以下支出：
        | 項目 | 分類 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 晚餐 | 餐飲 | TWD | 900 | Amy | Alice、Amy、Bob |
        | 計程車 | 交通 | TWD | 600 | Alice | Amy、Bob |
        | 伴手禮 | 購物 | TWD | 200 | Alice | Alice |
        | 代買品 | 購物 | TWD | 100 | Bob | Alice |
        | 咖啡 | 餐飲 | TWD | 100 | Bob | Bob |
      When 從帳本開啟分類分析
      Then 分類分析兩圖在桌機並排、手機依個人再團體排列

  @F007-F04
  Rule: 個人圖呈現實際分攤的分類金額與占比

    Example: 自己消費、代付及墊款混合
      Given 分類分析旅行已有以下支出：
        | 項目 | 分類 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 晚餐 | 餐飲 | TWD | 900 | Amy | Alice、Amy、Bob |
        | 計程車 | 交通 | TWD | 600 | Alice | Amy、Bob |
        | 伴手禮 | 購物 | TWD | 200 | Alice | Alice |
        | 代買品 | 購物 | TWD | 100 | Bob | Alice |
        | 咖啡 | 餐飲 | TWD | 100 | Bob | Bob |
      When 從帳本開啟分類分析
      Then 分類分析頁的 "個人" 在 "TWD" 顯示完整分類明細：
        | 分類 | 金額 | 占比 |
        | 餐飲 | 300 | 50% |
        | 購物 | 300 | 50% |

  @F007-F05
  Rule: 團體圖呈現共同消費分類金額與占比

    Example: 包括擁有者沒有參與的計程車
      Given 分類分析旅行已有以下支出：
        | 項目 | 分類 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 晚餐 | 餐飲 | TWD | 900 | Amy | Alice、Amy、Bob |
        | 計程車 | 交通 | TWD | 600 | Alice | Amy、Bob |
        | 伴手禮 | 購物 | TWD | 200 | Alice | Alice |
        | 代買品 | 購物 | TWD | 100 | Bob | Alice |
        | 咖啡 | 餐飲 | TWD | 100 | Bob | Bob |
      When 從帳本開啟分類分析
      Then 分類分析頁的 "團體" 在 "TWD" 顯示完整分類明細：
        | 分類 | 金額 | 占比 |
        | 餐飲 | 900 | 60% |
        | 交通 | 600 | 40% |

  @F007-F06
  Rule: 圓環中心顯示各圖自己的總額

    Example: 個人與團體總額不同
      Given 分類分析旅行已有以下支出：
        | 項目 | 分類 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 晚餐 | 餐飲 | TWD | 900 | Amy | Alice、Amy、Bob |
        | 計程車 | 交通 | TWD | 600 | Alice | Amy、Bob |
        | 伴手禮 | 購物 | TWD | 200 | Alice | Alice |
        | 代買品 | 購物 | TWD | 100 | Bob | Alice |
        | 咖啡 | 餐飲 | TWD | 100 | Bob | Bob |
      When 從帳本開啟分類分析
      Then 分類分析頁在 "TWD" 的個人總額為 "600"、團體總額為 "1500"

  @F007-F07
  Rule: 扇形按各圖精確分類比例繪製

    Example: 共同消費及個人消費的分母不同
      Given 分類分析旅行已有以下支出：
        | 項目 | 分類 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 晚餐 | 餐飲 | TWD | 900 | Amy | Alice、Amy、Bob |
        | 計程車 | 交通 | TWD | 600 | Alice | Amy、Bob |
        | 伴手禮 | 購物 | TWD | 200 | Alice | Alice |
        | 代買品 | 購物 | TWD | 100 | Bob | Alice |
        | 咖啡 | 餐飲 | TWD | 100 | Bob | Bob |
      When 從帳本開啟分類分析
      Then 分類分析扇形與各圖精確分類比例一致

  @F007-F08
  Rule: 團體圖清楚說明共同消費範圍

    Example: 團體包含兩人以上的原始消費
      Given 分類分析旅行已有以下支出：
        | 項目 | 分類 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 晚餐 | 餐飲 | TWD | 900 | Amy | Alice、Amy、Bob |
        | 計程車 | 交通 | TWD | 600 | Alice | Amy、Bob |
        | 伴手禮 | 購物 | TWD | 200 | Alice | Alice |
        | 代買品 | 購物 | TWD | 100 | Bob | Alice |
        | 咖啡 | 餐飲 | TWD | 100 | Bob | Bob |
      When 從帳本開啟分類分析
      Then 分類分析團體區塊說明只計至少兩人分攤的共同消費

  @F007-F09
  Rule: 清單載入範圍不影響完整旅行分析

    Example: 旅行支出清單已載入 20 筆
      Given 分類分析旅行有 24 筆各 "TWD" 10 的單人餐飲及旅行前 "TWD" 60 的機票
      And 另一分類分析旅行有 "TWD" 900 的單人餐飲
      And 分類分析旅行的支出清單已載入 20 筆
      When 從帳本開啟分類分析
      Then 分類分析頁的 "個人" 在 "TWD" 顯示完整分類明細：
        | 分類 | 金額 | 占比 |
        | 餐飲 | 240 | 80% |
        | 交通 | 60 | 20% |
      And 分類分析的 "個人" 在 "TWD" 顯示總額 "300"

  @F007-F10
  Rule: 載入全部清單後分析金額保持完整

    Example: 旅行支出清單已載入 25 筆
      Given 分類分析旅行有 24 筆各 "TWD" 10 的單人餐飲及旅行前 "TWD" 60 的機票
      And 另一分類分析旅行有 "TWD" 900 的單人餐飲
      And 分類分析旅行的支出清單已載入 25 筆
      When 從帳本開啟分類分析
      Then 分類分析頁的 "個人" 在 "TWD" 顯示完整分類明細：
        | 分類 | 金額 | 占比 |
        | 餐飲 | 240 | 80% |
        | 交通 | 60 | 20% |
      And 分類分析的 "個人" 在 "TWD" 顯示總額 "300"

  @F007-F11
  Rule: 第一次分析依代碼順序選取幣別

    Example: 旅行同時有日圓、台幣與美元
      Given 分類分析旅行已有以下支出：
        | 項目 | 分類 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 車票 | 交通 | TWD | 300 | Alice | Alice、Amy、Bob |
        | 午餐 | 餐飲 | JPY | 600 | Amy | Alice、Amy、Bob |
        | 點心 | 未分類 | JPY | 300 | Alice | Alice |
        | 飲料 | 餐飲 | USD | 10 | Bob | Bob |
      When 從帳本開啟分類分析
      Then 分類分析目前幣別為 "JPY" 且選項依序為 "JPY、TWD、USD"

  @F007-F12
  Rule: 切換幣別同步更新兩圖且不混幣

    Example: 從日圓切換台幣
      Given 分類分析旅行已有以下支出：
        | 項目 | 分類 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 車票 | 交通 | TWD | 300 | Alice | Alice、Amy、Bob |
        | 午餐 | 餐飲 | JPY | 600 | Amy | Alice、Amy、Bob |
        | 點心 | 未分類 | JPY | 300 | Alice | Alice |
        | 飲料 | 餐飲 | USD | 10 | Bob | Bob |
      And 分類分析頁已選擇 "JPY"
      When 在分類分析選擇幣別 "TWD"
      Then 分類分析頁的 "個人" 在 "TWD" 顯示完整分類明細：
        | 分類 | 金額 | 占比 |
        | 交通 | 100 | 100% |
      And 分類分析頁的 "團體" 在 "TWD" 顯示完整分類明細：
        | 分類 | 金額 | 占比 |
        | 交通 | 300 | 100% |

  @F007-F13
  Rule: 切回幣別仍呈現原來正確分類

    Example: 台幣已查看後目前停在日圓
      Given 分類分析旅行已有以下支出：
        | 項目 | 分類 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 車票 | 交通 | TWD | 300 | Alice | Alice、Amy、Bob |
        | 午餐 | 餐飲 | JPY | 600 | Amy | Alice、Amy、Bob |
        | 點心 | 未分類 | JPY | 300 | Alice | Alice |
        | 飲料 | 餐飲 | USD | 10 | Bob | Bob |
      And 分類分析頁已先查看 "TWD" 再選擇 "JPY"
      When 在分類分析選擇幣別 "TWD"
      Then 分類分析頁在 "TWD" 的個人總額為 "100"、團體總額為 "300"
      And 分類分析頁的 "個人" 在 "TWD" 顯示完整分類明細：
        | 分類 | 金額 | 占比 |
        | 交通 | 100 | 100% |
      And 分類分析頁的 "團體" 在 "TWD" 顯示完整分類明細：
        | 分類 | 金額 | 占比 |
        | 交通 | 300 | 100% |

  @F007-F14
  Rule: 未分類消費有獨立常駐明細

    Example: 日圓點心尚無分類
      Given 分類分析旅行已有以下支出：
        | 項目 | 分類 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 車票 | 交通 | TWD | 300 | Alice | Alice、Amy、Bob |
        | 午餐 | 餐飲 | JPY | 600 | Amy | Alice、Amy、Bob |
        | 點心 | 未分類 | JPY | 300 | Alice | Alice |
        | 飲料 | 餐飲 | USD | 10 | Bob | Bob |
      And 分類分析頁已選擇 "TWD"
      When 在分類分析選擇幣別 "JPY"
      Then 分類分析頁的 "個人" 在 "JPY" 顯示完整分類明細：
        | 分類 | 金額 | 占比 |
        | 餐飲 | 200 | 40% |
        | 未分類 | 300 | 60% |
      And 分類分析頁的 "團體" 在 "JPY" 顯示完整分類明細：
        | 分類 | 金額 | 占比 |
        | 餐飲 | 600 | 100% |

  @F007-F15
  Rule: 有其他幣別共同消費時零值圖保留空狀態

    Example: 美元只有 Bob 單人飲料
      Given 分類分析旅行已有以下支出：
        | 項目 | 分類 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 車票 | 交通 | TWD | 300 | Alice | Alice、Amy、Bob |
        | 午餐 | 餐飲 | JPY | 600 | Amy | Alice、Amy、Bob |
        | 點心 | 未分類 | JPY | 300 | Alice | Alice |
        | 飲料 | 餐飲 | USD | 10 | Bob | Bob |
      And 分類分析頁已選擇 "JPY"
      When 在分類分析選擇幣別 "USD"
      Then 分類分析的 "個人" 顯示 "USD" 零值且沒有消費扇形或占比
      And 分類分析的 "團體" 顯示 "USD" 零值且沒有消費扇形或占比

  @F007-F16
  Rule: 新增他人共同消費只更新團體資格

    Example: 美元宵夜由 Amy 與 Bob 分攤
      Given 分類分析旅行已有以下支出：
        | 項目 | 分類 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 車票 | 交通 | TWD | 300 | Alice | Alice、Amy、Bob |
        | 午餐 | 餐飲 | JPY | 600 | Amy | Alice、Amy、Bob |
        | 點心 | 未分類 | JPY | 300 | Alice | Alice |
        | 飲料 | 餐飲 | USD | 10 | Bob | Bob |
      And 分類分析保留選擇為 "USD"
      And 分類分析先前內容已確認
      And 分類分析旅行已新增以下支出：
        | 項目 | 分類 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 宵夜 | 餐飲 | USD | 20 | Bob | Amy、Bob |
      When 從帳本開啟分類分析
      Then 分類分析的 "個人" 顯示 "USD" 零值且沒有消費扇形或占比
      And 分類分析頁的 "團體" 在 "USD" 顯示完整分類明細：
        | 分類 | 金額 | 占比 |
        | 餐飲 | 20 | 100% |

  @F007-F17
  Rule: 循環小數先相加再格式化為個人花費

    Example: 三筆各一百日圓由三人分攤
      Given 分類分析旅行已有以下支出：
        | 項目 | 分類 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 點心1 | 餐飲 | JPY | 100 | Alice | Alice、Amy、Bob |
        | 點心2 | 餐飲 | JPY | 100 | Alice | Alice、Amy、Bob |
        | 點心3 | 餐飲 | JPY | 100 | Alice | Alice、Amy、Bob |
      When 從帳本開啟分類分析
      Then 分類分析頁在 "JPY" 的個人總額為 "100"、團體總額為 "300"
      And 分類分析頁的 "個人" 在 "JPY" 顯示完整分類明細：
        | 分類 | 金額 | 占比 |
        | 餐飲 | 100 | 100% |

  @F007-F18
  Rule: 還款與結清後分析的消費及占比不變

    Example: 三筆點心已有已查看的分析
      Given 分類分析旅行已有以下支出：
        | 項目 | 分類 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 點心1 | 餐飲 | JPY | 100 | Alice | Alice、Amy、Bob |
        | 點心2 | 餐飲 | JPY | 100 | Alice | Alice、Amy、Bob |
        | 點心3 | 餐飲 | JPY | 100 | Alice | Alice、Amy、Bob |
      And 分類分析先前內容已確認
      And 分類分析旅行已有 Amy 還款 "JPY" 100 及 Bob 實付結清 "JPY" 100
      When 從帳本開啟分類分析
      Then 分類分析頁在 "JPY" 的個人總額為 "100"、團體總額為 "300"
      And 分類分析頁的 "個人" 在 "JPY" 顯示完整分類明細：
        | 分類 | 金額 | 占比 |
        | 餐飲 | 100 | 100% |
      And 分類分析頁的 "團體" 在 "JPY" 顯示完整分類明細：
        | 分類 | 金額 | 占比 |
        | 餐飲 | 300 | 100% |

  @F007-F19
  Rule: 再次查看保留仍存在的幣別選擇

    Example: 已選台幣而日圓仍是第一個代碼
      Given 分類分析旅行已有以下支出：
        | 項目 | 分類 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 車票 | 交通 | TWD | 300 | Alice | Alice、Amy、Bob |
        | 午餐 | 餐飲 | JPY | 600 | Amy | Alice、Amy、Bob |
        | 點心 | 未分類 | JPY | 300 | Alice | Alice |
        | 飲料 | 餐飲 | USD | 10 | Bob | Bob |
      And 分類分析保留選擇為 "TWD"
      When 從帳本開啟分類分析
      Then 分類分析目前幣別為 "TWD" 且選項依序為 "JPY、TWD、USD"

  @F007-F20
  Rule: 先前幣別消失時改選代碼第一項

    Example: 美元最後一筆支出已刪除
      Given 分類分析旅行已有以下支出：
        | 項目 | 分類 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 車票 | 交通 | TWD | 300 | Alice | Alice、Amy、Bob |
        | 午餐 | 餐飲 | JPY | 600 | Amy | Alice、Amy、Bob |
        | 點心 | 未分類 | JPY | 300 | Alice | Alice |
        | 飲料 | 餐飲 | USD | 10 | Bob | Bob |
      And 分類分析先前內容已確認
      And 分類分析保留選擇為 "USD"
      And 分類分析支出 "飲料" 已刪除
      When 從帳本開啟分類分析
      Then 分類分析目前幣別為 "JPY" 且選項依序為 "JPY、TWD"

  @F007-F21
  Rule: 全旅行無共同消費以說明取代團體圖

    Example: 只有擁有者的單人餐飲
      Given 分類分析旅行已有以下支出：
        | 項目 | 分類 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 餐點 | 餐飲 | TWD | 100 | Alice | Alice |
      When 從帳本開啟分類分析
      Then 分類分析團體區塊顯示全旅行沒有共同消費的說明
