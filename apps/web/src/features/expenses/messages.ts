import { interfaceI18n, registerInterfaceMessages } from '../../i18n/runtime.js';

const messages: Record<string, readonly [string, string]> = {
  backLedger: ['返回旅行帳本', 'Back to trip ledger'],
  formRegion: ['支出詳情與支出表單', 'Expense details and form'],
  savedCurrency: ['已保存幣別', 'Saved currency'],
  saveSuccess: ['支出已保存', 'Expense saved'],
  deleteSuccess: ['支出已刪除', 'Expense deleted'],
  uncategorized: ['未分類', 'Uncategorized'],
  tripReady: [
    '旅行目前可用，請確認保留的草稿後再保存。',
    'The trip is available. Review the retained draft before saving again.',
  ],
  tripStateUnknown: [
    '目前無法確認旅行狀態，請稍後再查證。',
    'The trip status could not be confirmed. Check again later.',
  ],
  itemRequired: ['請填寫支出項目。', 'Enter an expense item.'],
  currencyRequired: ['請從可用目錄選擇幣別。', 'Choose a currency from the available list.'],
  amountRequired: [
    '請輸入符合幣別位數且大於零的正數金額。',
    'Enter an amount greater than zero with the allowed decimal places.',
  ],
  payerRequired: ['請選擇付款人。', 'Choose who paid.'],
  sharesRequired: ['請至少選擇一位分攤者。', 'Choose at least one person to share this expense.'],
  dateInvalid: [
    '請輸入有效的支出日期，例如 2027/03/11。',
    'Enter a valid expense date, such as 2027/03/11.',
  ],
  offlineSave: [
    '目前無法連線，這筆支出尚未保存。請保留畫面並在連線後再試。',
    'You are offline. This expense has not been saved. Keep this page open and try again when connected.',
  ],
  editTitle: ['編輯這筆花費', 'Edit expense'],
  newTitle: ['記下這筆花費', 'Add an expense'],
  editDescription: ['修正紀錄，讓帳本更準確。', 'Update this record to keep the ledger accurate.'],
  newDescription: [
    '先記錄誰付了錢，再選這筆要由誰平均分攤。',
    'Record who paid, then choose who shares this expense equally.',
  ],
  stateCheckFirst: [
    '目前無法確認旅行狀態，草稿保留，請先查證。',
    'The trip status is unknown. Your draft is still here. Select Check status to verify.',
  ],
  operationUnknown: [
    '原次操作結果仍未確認，這裡不會重送原次操作。',
    'The original operation is still unconfirmed. It will not be sent again here.',
  ],
  draftKept: [
    '這筆支出尚未保存，草稿已保留。',
    'This expense has not been saved. Your draft is still here.',
  ],
  restoreTrip: ['前往垃圾桶復原', 'Go to Trash to restore'],
  backTrips: ['返回旅行清單', 'Back to trips'],
  recheckTrip: ['重新讀取旅行狀態', 'Check status'],
  checkingTrip: ['正在查證旅行狀態', 'Checking trip status'],
  readUpdateFailed: [
    '暫時無法更新已保存資料，請保留草稿後再試。',
    'Saved data could not be refreshed. Keep your draft and try again.',
  ],
  item: ['支出項目', 'Expense item'],
  itemPlaceholder: ['例如：巷口的拉麵店', 'For example: ramen shop'],
  amount: ['支出金額', 'Amount'],
  amountNewCurrency: [
    '目前金額不符合新幣別的小數位數，請手動修正。',
    'The amount does not fit the new currency’s decimal places. Edit it manually.',
  ],
  amountPositive: [
    '請輸入符合幣別位數的正數金額。',
    'Enter a positive amount with the allowed decimal places.',
  ],
  pastedAmountInvalid: [
    '貼上的金額不符合幣別位數，已保留原值。',
    'The pasted amount has too many decimal places. The previous value was kept.',
  ],
  chooseCurrencyFirst: ['請先選擇幣別。', 'Choose a currency first.'],
  maxDecimals: [
    '{{currency}} 最多 {{digits}} 位小數',
    '{{currency}} allows up to {{digits}} decimal places',
  ],
  wholeAmount: ['{{currency}} 使用整數金額', '{{currency}} uses whole-number amounts'],
  currency: ['幣別', 'Currency'],
  currencyLoadFailed: [
    '無法取得幣別目錄，請保留草稿。',
    'Currencies could not be loaded. Keep your draft.',
  ],
  retryCurrencies: ['重新取得幣別', 'Reload currencies'],
  expenseDate: ['支出日期', 'Expense date'],
  category: ['分類', 'Category'],
  categoryLoadFailed: ['暫時無法取得分類。', 'Categories could not be loaded.'],
  retryCategories: ['重新取得分類', 'Reload categories'],
  sharingMembers: ['分攤成員', 'People sharing the expense'],
  whoPaid: ['誰付款？', 'Who paid?'],
  whoShares: ['誰一起平均分攤？', 'Who shares this expense equally?'],
  payerMayNotShare: ['付款人可以不參與分攤。', 'The payer does not have to share this expense.'],
  eachShare: ['每人分攤', 'Share per person'],
  nameSeparator: ['、', ', '],
  readingMembers: ['正在讀取分攤成員', 'Loading people sharing the expense'],
  checkAgain: ['重新查證', 'Check status'],
  checkingOperation: ['正在查證原次支出操作', 'Checking the original expense operation'],
  deleteExpense: ['刪除支出', 'Delete expense'],
  cancel: ['取消', 'Cancel'],
  saveExpense: ['儲存支出', 'Save expense'],
  deleteTitle: ['刪除這筆支出？', 'Delete this expense?'],
  deleteDescription: [
    '確定刪除「{{item}}」{{currency}} {{amount}}？此操作無法復原。',
    'Delete “{{item}}” for {{currency}} {{amount}}? This cannot be undone.',
  ],
  confirmDelete: ['確認刪除', 'Confirm deletion'],
  payerLine: ['{{name}} 付款', '{{name}} paid'],
  sharingList: ['支出分攤', 'Expense shares'],
  shareHeader: ['分攤', 'Share'],
  unconfirmedSave: [
    '保存結果尚未確認，請重新整理確認。',
    'Save status unconfirmed. Select Check status to verify.',
  ],
  unconfirmedDelete: [
    '刪除結果尚未確認，請重新整理確認。',
    'Deletion status unconfirmed. Select Check status to verify.',
  ],
  offlineDelete: [
    '目前無法連線，這筆支出尚未刪除。請保留畫面並在連線後再試。',
    'You are offline. This expense has not been deleted. Keep this page open and try again when connected.',
  ],
  tripTrashed: [
    '旅行已在垃圾桶，請先復原旅行再繼續記帳。',
    'This trip is in Trash. Restore it before recording expenses.',
  ],
  tripPurged: [
    '旅行已永久刪除，無法再使用原帳本。',
    'This trip was permanently deleted. Its ledger is no longer available.',
  ],
  saveStateUnknown: [
    '這次支出未保存，目前無法確認旅行狀態，請重新讀取後再試。',
    'This expense was not saved. The trip status could not be confirmed. Reload it and try again.',
  ],
  analysisBack: ['‹ {{trip}}帳本', '‹ {{trip}} ledger'],
  tripFallback: ['旅行', 'Trip'],
  analysisDescription: ['每一筆消費，都有它的位置。', 'See where your spending goes.'],
  analysisCurrency: ['統計幣別', 'Analysis currency'],
  analysisUpdating: ['正在更新花費分析', 'Updating spending analysis'],
  analysisOffline: [
    '已離線，恢復連線後再更新。',
    'You are offline. The analysis will update when you reconnect.',
  ],
  analysisUpdateFailed: [
    '更新失敗，暫時顯示上次資料。',
    'The update failed. Showing the last available data.',
  ],
  analysisRetryUpdate: ['重新更新', 'Reload'],
  analysisNoShared: ['這趟旅行目前沒有共同消費。', 'This trip has no shared expenses yet.'],
  analysisHint: [
    '將滑鼠移至圖表，或選取分類查看金額與占比。',
    'Hover over the chart or select a category to see its amount and share.',
  ],
  analysisEmptyTitle: ['還沒有花費可以分析', 'No spending to analyze yet'],
  analysisEmptyDescription: [
    '記下第一筆支出，分類分布就會出現在這裡。',
    'Add your first expense to see spending by category.',
  ],
  recordOne: ['記一筆', 'Add an expense'],
  analysisLoadFailed: ['暫時無法載入分析', 'Spending analysis could not be loaded'],
  analysisReadFailed: [
    '無法取得資料，請稍後重試。',
    'The data could not be loaded. Try again later.',
  ],
  analysisRetry: ['重新載入', 'Reload'],
  analysisLoading: ['正在載入花費分析', 'Loading spending analysis'],
  personalTitle: ['個人花費', 'My share by category'],
  groupTitle: ['團體花費', 'Group spending'],
  personalDescription: [
    '自己的消費，加上共同支出中你負擔的份額',
    'Your own expenses plus your share of shared expenses',
  ],
  groupDescription: [
    '僅包含至少兩人分攤的共同消費',
    'Only shared expenses split between at least two people',
  ],
  personalChart: ['個人分類比例圖', 'My share by category chart'],
  groupChart: ['團體分類比例圖', 'Group spending by category chart'],
  personalTotal: ['個人總額', 'My share'],
  groupTotal: ['團體總額', 'Group total'],
  analysisAmountShare: ['金額・占比', 'Amount · Share'],
  personalNoSpending: [
    '這個幣別沒有你負擔的支出。',
    'You have no share of expenses in this currency.',
  ],
  groupNoSpending: [
    '這個幣別沒有符合的共同消費。',
    'There are no shared expenses in this currency.',
  ],
  analysisSwitchCurrency: ['可切換幣別查看其他花費。', 'Switch currencies to see other spending.'],
  categoryInfo: ['分類資訊', 'Category details'],
  closeCategoryInfo: ['關閉分類資訊', 'Close category details'],
  personalPercent: ['占個人花費 {{percent}}', '{{percent}} of my share'],
  groupPercent: ['占團體花費 {{percent}}', '{{percent}} of group spending'],
  tinyPercent: ['小於0.01%', 'Less than 0.01%'],
};

registerInterfaceMessages('expenses', messages);

export function expenseMessage(key: string, values?: Record<string, string | number>): string {
  if (interfaceI18n.isInitialized) return interfaceI18n.t(`expenses.${key}`, values ?? {});
  const template = messages[key]?.[0] ?? key;

  return template.replace(/\{\{\s*(\w+)\s*\}\}/gu, (_match, name: string) =>
    String(values?.[name] ?? ''),
  );
}
