Feature: 兩筆安排以不同實付結清後的平衡

  Rule: 先後結清後不得殘留任何次最小單位尾差
    Example: Amy33已結清後Bob實付34
      Given Amy 已以 JPY 33 結清點心安排且 Bob 的安排仍未結清
      When owner 以 JPY 34 結清 Bob 向 Alice 的剩餘安排
      Then 點心所有安排結清且全體沒有尾差

