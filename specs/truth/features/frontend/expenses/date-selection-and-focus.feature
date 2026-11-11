Feature: 支出日期選擇與焦點

  Rule: 日期選擇器支援鍵盤選日
    Example: 支出日期選2027-03-12
      Given owner 已開啟支出日期日曆且焦點在 2027-03-11
      When owner 以鍵盤選擇日期 2027-03-12
      Then 日期欄顯示 2027-03-12 且日曆關閉並返回日期觸發點

  Rule: 日期選擇器可取消並還原焦點
    Example: 支出日期按Escape
      Given owner 已開啟支出日期日曆且焦點在 2027-03-11
      When owner 按 Escape 關閉日期日曆
      Then 日期欄仍為 2027-03-11 且焦點返回日期觸發點
