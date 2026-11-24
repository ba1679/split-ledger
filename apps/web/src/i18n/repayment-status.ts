const en = {
  'repayment.revisionConflict':
    'Payment arrangements have changed. Reload them and review the amount before saving again.',
  'repayment.unconfirmedResult': 'Payment status unconfirmed',
  'repayment.unknownResult': 'Repayment status unknown',
  'repayment.pendingHelp': 'Check whether this payment was recorded. Your draft is still here.',
  'repayment.offlineHelp':
    'Check your internet connection, then select Check status once you are back online.',
  'repayment.checkResult': 'Check status',
} as const;

const zh: Record<keyof typeof en, string> = {
  'repayment.revisionConflict': '付款安排已更新，請重新載入後再確認。',
  'repayment.unconfirmedResult': '儲存結果待確認',
  'repayment.unknownResult': '儲存結果待確認',
  'repayment.pendingHelp': '請先查看這筆還款是否已儲存。你的輸入仍會保留。',
  'repayment.offlineHelp': '請檢查網路連線，連線後再查看結果',
  'repayment.checkResult': '查看結果',
};

export const repaymentStatusMessages = { en, 'zh-Hant': zh };
