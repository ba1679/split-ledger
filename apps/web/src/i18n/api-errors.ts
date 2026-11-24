import { interfaceI18n, registerInterfaceMessages } from './runtime.js';

registerInterfaceMessages('apiError', {
  generic: ['暫時無法取得資料，請稍後再試。', 'Could not complete the request. Please try again.'],
  UNAUTHENTICATED: ['請先登入。', 'Please sign in and try again.'],
  NOT_FOUND: ['找不到這筆資料。', 'This record could not be found.'],
  TRIP_TRASHED: ['這趟旅行已移到垃圾桶。', 'This trip is in Trash. Restore it to make changes.'],
  TRIP_NOT_TRASHED: ['這趟旅行不在垃圾桶。', 'This trip is no longer in Trash. Refresh the list.'],
  ACCOUNTING_REVISION_CONFLICT: [
    '帳務已更新，請重新確認。',
    'The ledger has changed. Reload it and review your changes before trying again.',
  ],
  ARRANGEMENT_NOT_FOUND: [
    '找不到付款安排。',
    'This payment arrangement is no longer available. Reload the settlement.',
  ],
  ID_CONFLICT: [
    '這筆資料已存在。',
    'This record already exists. Check the current data before retrying.',
  ],
  OPERATION_ID_CONFLICT: [
    '此操作識別已使用。',
    'This operation ID has already been used. Check the current result.',
  ],
  OPERATION_NOT_FOUND: [
    '找不到原操作。',
    'The original operation could not be found. Check its result again later.',
  ],
  CATEGORY_NAME_CONFLICT: [
    '此分類名稱已使用。',
    'This category name is already in use. Choose a different name.',
  ],
  CATEGORY_IN_USE: [
    '此分類仍有支出使用。',
    'Expenses still use this category. Move them to another category before deleting it.',
  ],
  MEMBER_NAME_CONFLICT: [
    '此同行者名稱已使用。',
    'This companion name is already in use. Choose a different name.',
  ],
  MEMBER_IN_USE: [
    '此同行者仍有帳務紀錄。',
    'This companion has accounting records and cannot be removed.',
  ],
  INVALID_IMAGE: [
    '圖片格式不正確。',
    'This image could not be opened. Choose a supported image and try again.',
  ],
  REQUEST_ORIGIN_REJECTED: ['請重新整理頁面後再試。', 'Refresh this page and try again.'],
  VALIDATION_ERROR: ['輸入資料格式不正確。', 'Check the entered information and try again.'],
  amount: ['請輸入有效金額。', 'Enter a valid amount for the selected currency.'],
  item: ['請填寫支出項目。', 'Enter an expense item.'],
  name: ['請填寫名稱。', 'Enter a valid name.'],
  currencyCode: ['請選擇可用幣別。', 'Select an available currency.'],
  date: ['請輸入有效日期。', 'Enter a valid date.'],
  payerMemberId: ['請確認付款人。', 'Select an active payer from this trip.'],
  payeeMemberId: ['請確認收款人。', 'Select an active recipient from this trip.'],
  shareMemberIds: ['請確認分攤者。', 'Select at least one active person to share this expense.'],
});

const fieldKeys: Record<string, string> = {
  amount: 'amount',
  paidAmount: 'amount',
  item: 'item',
  name: 'name',
  currencyCode: 'currencyCode',
  date: 'date',
  spentOn: 'date',
  paidOn: 'date',
  startDate: 'date',
  endDate: 'date',
  payerMemberId: 'payerMemberId',
  payeeMemberId: 'payeeMemberId',
  shareMemberIds: 'shareMemberIds',
};

export function localizeApiError(code: string, field: string | undefined, original?: string) {
  if (interfaceI18n.resolvedLanguage !== 'en') return original ?? '暫時無法取得資料，請稍後再試。';

  const fieldKey = code === 'VALIDATION_ERROR' && field ? fieldKeys[field] : undefined;
  const key = `apiError.${fieldKey ?? code}`;

  return interfaceI18n.t([key, 'apiError.generic']);
}
