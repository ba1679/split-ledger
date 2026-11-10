Feature: 新旅行的固定分帳身分

  Rule: 建立旅行同時建立固定owner成員
    Example: 不填日期的新旅行
      Given 使用者"甲"已登入
      When 使用者"甲"建立未填日期的"日本旅行"
      Then 新旅行同時具有唯一固定 owner 成員

