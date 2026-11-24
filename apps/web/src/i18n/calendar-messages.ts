import { registerInterfaceMessages } from './runtime.js';

registerInterfaceMessages('calendar', {
  choose: ['選擇{{label}}', 'Choose {{label}}'],
  close: ['關閉日期選擇器', 'Close calendar'],
  selectMonthYear: ['選擇年份與月份', 'Choose a month and year'],
  returnToDays: ['返回日期選擇', 'Back to the calendar'],
  previousMonth: ['上一個月', 'Previous month'],
  previousYear: ['上一年', 'Previous year'],
  nextMonth: ['下一個月', 'Next month'],
  nextYear: ['下一年', 'Next year'],
  selectMonth: ['選擇月份', 'Choose a month'],
  today: ['回到今天', 'Go to today'],
  todayDate: ['{{date}}，今天', '{{date}}, today'],
  clear: ['清除{{label}}', 'Clear {{label}}'],
  entryHelp: [
    '以 YYYY/MM/DD 輸入日期，或按向下鍵開啟日曆。',
    'Enter a date as YYYY/MM/DD, or press the down arrow to open the calendar.',
  ],
  invalid: ['請輸入有效日期，例如 2027/03/11。', 'Enter a valid date, such as 2027/03/11.'],
});
