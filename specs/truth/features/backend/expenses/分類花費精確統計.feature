Feature: 完整旅行的精確分類花費查詢

  # 007；每例獨立建立旅行，Alice 是帳本擁有者及固定個人統計成員。
  # 分攤者為等額分攤；未分類代表沒有分類關聯。

  @F007-B01
  Rule: 個人分類金額只計擁有者的實際分攤份額

    Example: 自己消費與他人代付都算份額，僅墊款不算自己的消費
      Given 分類分析旅行已有以下支出：
        | 項目 | 分類 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 晚餐 | 餐飲 | TWD | 900 | Amy | Alice、Amy、Bob |
        | 計程車 | 交通 | TWD | 600 | Alice | Amy、Bob |
        | 伴手禮 | 購物 | TWD | 200 | Alice | Alice |
        | 代買品 | 購物 | TWD | 100 | Bob | Alice |
        | 咖啡 | 餐飲 | TWD | 100 | Bob | Bob |
      When 擁有者讀取分類分析
      Then 分類分析回傳 "個人" 在 "TWD" 的完整分類金額：
        | 分類 | 金額 |
        | 餐飲 | 300 |
        | 購物 | 300 |

  @F007-B02
  Rule: 團體分類金額只將兩人以上共同消費計入一次

    Example: 包含擁有者未參與的共同車資，排除他人單人消費
      Given 分類分析旅行已有以下支出：
        | 項目 | 分類 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 晚餐 | 餐飲 | TWD | 900 | Amy | Alice、Amy、Bob |
        | 計程車 | 交通 | TWD | 600 | Alice | Amy、Bob |
        | 伴手禮 | 購物 | TWD | 200 | Alice | Alice |
        | 代買品 | 購物 | TWD | 100 | Bob | Alice |
        | 咖啡 | 餐飲 | TWD | 100 | Bob | Bob |
      When 擁有者讀取分類分析
      Then 分類分析回傳 "團體" 在 "TWD" 的完整分類金額：
        | 分類 | 金額 |
        | 餐飲 | 900 |
        | 交通 | 600 |

  @F007-B03
  Rule: 各圖總額等於各自全部分類的精確總和

    Example: 同幣別個人與團體採不同統計範圍
      Given 分類分析旅行已有以下支出：
        | 項目 | 分類 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 晚餐 | 餐飲 | TWD | 900 | Amy | Alice、Amy、Bob |
        | 計程車 | 交通 | TWD | 600 | Alice | Amy、Bob |
        | 伴手禮 | 購物 | TWD | 200 | Alice | Alice |
        | 代買品 | 購物 | TWD | 100 | Bob | Alice |
        | 咖啡 | 餐飲 | TWD | 100 | Bob | Bob |
      When 擁有者讀取分類分析
      Then 分類分析回傳的完整總額如下：
        | 幣別 | 個人 | 團體 |
        | TWD | 600 | 1500 |

  @F007-B04
  Rule: 分析來源包含全部日期與完整旅行支出

    Example: 二十四筆餐點、旅行前機票及另一旅行不受清單分頁影響
      Given 分類分析旅行有 24 筆各 "TWD" 10 的單人餐飲及旅行前 "TWD" 60 的機票
      And 另一分類分析旅行有 "TWD" 900 的單人餐飲
      When 擁有者讀取分類分析
      Then 分類分析回傳 "個人" 在 "TWD" 的完整分類金額：
        | 分類 | 金額 |
        | 餐飲 | 240 |
        | 交通 | 60 |
      And 分類分析回傳的完整總額如下：
        | 幣別 | 個人 | 團體 |
        | TWD | 300 | 0 |

  @F007-B05
  Rule: 不同幣別的分類金額保持分離

    Example: 日圓保留未分類但不納入台幣與美元
      Given 分類分析旅行已有以下支出：
        | 項目 | 分類 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 車票 | 交通 | TWD | 300 | Alice | Alice、Amy、Bob |
        | 午餐 | 餐飲 | JPY | 600 | Amy | Alice、Amy、Bob |
        | 點心 | 未分類 | JPY | 300 | Alice | Alice |
        | 飲料 | 餐飲 | USD | 10 | Bob | Bob |
      When 擁有者讀取分類分析
      Then 分類分析回傳 "個人" 在 "JPY" 的完整分類金額：
        | 分類 | 金額 |
        | 餐飲 | 200 |
        | 未分類 | 300 |

  @F007-B06
  Rule: 已有支出的幣別即使兩圖皆零也要回傳

    Example: 美元只有其他成員單人消費
      Given 分類分析旅行已有以下支出：
        | 項目 | 分類 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 車票 | 交通 | TWD | 300 | Alice | Alice、Amy、Bob |
        | 午餐 | 餐飲 | JPY | 600 | Amy | Alice、Amy、Bob |
        | 點心 | 未分類 | JPY | 300 | Alice | Alice |
        | 飲料 | 餐飲 | USD | 10 | Bob | Bob |
      When 擁有者讀取分類分析
      Then 分類分析回傳的幣別依序為 "JPY、TWD、USD"

  @F007-B07
  Rule: 零值圖不產生正數分類

    Example: 擁有者與團體都不符合美元飲料資格
      Given 分類分析旅行已有以下支出：
        | 項目 | 分類 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 車票 | 交通 | TWD | 300 | Alice | Alice、Amy、Bob |
        | 午餐 | 餐飲 | JPY | 600 | Amy | Alice、Amy、Bob |
        | 點心 | 未分類 | JPY | 300 | Alice | Alice |
        | 飲料 | 餐飲 | USD | 10 | Bob | Bob |
      When 擁有者讀取分類分析
      Then 分類分析的 "個人" 在 "USD" 沒有分類且總額為零
      And 分類分析的 "團體" 在 "USD" 沒有分類且總額為零

  @F007-B08
  Rule: 多筆循環小數份額先精確相加

    Example: 三次三人均分一百日圓
      Given 分類分析旅行已有以下支出：
        | 項目 | 分類 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 點心1 | 餐飲 | JPY | 100 | Alice | Alice、Amy、Bob |
        | 點心2 | 餐飲 | JPY | 100 | Alice | Alice、Amy、Bob |
        | 點心3 | 餐飲 | JPY | 100 | Alice | Alice、Amy、Bob |
      When 擁有者讀取分類分析
      Then 分類分析回傳的完整總額如下：
        | 幣別 | 個人 | 團體 |
        | JPY | 100 | 300 |
      And 分類分析回傳 "個人" 在 "JPY" 的完整分類金額：
        | 分類 | 金額 |
        | 餐飲 | 100 |

  @F007-B09
  Rule: 還款與實付結清不計入消費分類

    Example: 三筆點心外已有 Amy 還款及 Bob 實付結清
      Given 分類分析旅行已有以下支出：
        | 項目 | 分類 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 點心1 | 餐飲 | JPY | 100 | Alice | Alice、Amy、Bob |
        | 點心2 | 餐飲 | JPY | 100 | Alice | Alice、Amy、Bob |
        | 點心3 | 餐飲 | JPY | 100 | Alice | Alice、Amy、Bob |
      And 分類分析旅行已有 Amy 還款 "JPY" 100 及 Bob 實付結清 "JPY" 100
      When 擁有者讀取分類分析
      Then 分類分析回傳的完整總額如下：
        | 幣別 | 個人 | 團體 |
        | JPY | 100 | 300 |
      And 分類分析回傳 "團體" 在 "JPY" 的完整分類金額：
        | 分類 | 金額 |
        | 餐飲 | 300 |

  @F007-B10
  Rule: 共同消費狀態跨幣別判定且不要求擁有者參與

    Example: 只有美元有 Amy 與 Bob 的共同宵夜
      Given 分類分析旅行已有以下支出：
        | 項目 | 分類 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 飲料 | 餐飲 | TWD | 10 | Bob | Bob |
        | 宵夜 | 餐飲 | USD | 20 | Bob | Amy、Bob |
      When 擁有者讀取分類分析
      Then 分類分析回傳共同消費狀態為 "有"

  @F007-B11
  Rule: 整趟旅行沒有多人分攤時不是共同消費

    Example: 付款者替別人單人代付
      Given 分類分析旅行已有以下支出：
        | 項目 | 分類 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 代買 | 購物 | TWD | 100 | Bob | Alice |
      When 擁有者讀取分類分析
      Then 分類分析回傳共同消費狀態為 "無"

  @F007-B12
  Rule: 沒有支出時回傳成功的空分析

    Example: 已建立旅行但尚未記帳
      Given 分類分析旅行尚無支出
      When 擁有者讀取分類分析
      Then 分類分析成功且沒有任何支出幣別

  @F007-B13
  Rule: 歷史幣別精度對齊後仍保留原始份額

    Example: 同幣別歷史精度不同
      Given 分類分析旅行有歷史精度 2 的 "TWD" 1.01 及精度 3 的 "TWD" 0.001，皆由 Alice 與 Amy 分攤
      When 擁有者讀取分類分析
      Then 分類分析的 "TWD" 計算精度為 3
      And 分類分析回傳的完整總額如下：
        | 幣別 | 個人 | 團體 |
        | TWD | 0.5055 | 1.011 |

  @F007-B14
  Rule: 查詢不修改帳務來源

    Example: 三筆點心與還款均存在
      Given 分類分析旅行已有以下支出：
        | 項目 | 分類 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 點心1 | 餐飲 | JPY | 100 | Alice | Alice、Amy、Bob |
        | 點心2 | 餐飲 | JPY | 100 | Alice | Alice、Amy、Bob |
        | 點心3 | 餐飲 | JPY | 100 | Alice | Alice、Amy、Bob |
      And 分類分析旅行已有 Amy 還款 "JPY" 100 及 Bob 實付結清 "JPY" 100
      When 擁有者讀取分類分析
      Then 分類分析查詢前後的來源帳務完全相同

  @F007-B29
  Rule: 各幣別總額不得跨幣加總

    Example: 日圓、台幣及美元都有來源支出
      Given 分類分析旅行已有以下支出：
        | 項目 | 分類 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 車票 | 交通 | TWD | 300 | Alice | Alice、Amy、Bob |
        | 午餐 | 餐飲 | JPY | 600 | Amy | Alice、Amy、Bob |
        | 點心 | 未分類 | JPY | 300 | Alice | Alice |
        | 飲料 | 餐飲 | USD | 10 | Bob | Bob |
      When 擁有者讀取分類分析
      Then 分類分析回傳的完整總額如下：
        | 幣別 | 個人 | 團體 |
        | JPY | 500 | 600 |
        | TWD | 100 | 300 |
        | USD | 0 | 0 |

  @F007-B30
  Rule: 單筆不可整除份額維持精確有理數

    Example: 一百日圓三人均分
      Given 分類分析旅行已有以下支出：
        | 項目 | 分類 | 幣別 | 金額 | 付款人 | 分攤者 |
        | 點心1 | 餐飲 | JPY | 100 | Alice | Alice、Amy、Bob |
      When 擁有者讀取分類分析
      Then 分類分析回傳 "個人" 在 "JPY" 的完整分類金額：
        | 分類 | 金額 |
        | 餐飲 | 100/3 |
