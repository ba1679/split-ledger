import { useTranslation } from 'react-i18next';
import { interfaceI18n, registerInterfaceMessages } from '../../i18n/runtime.js';

registerInterfaceMessages('trips', {
  brand: ['旅帳', 'Travel Ledger'],
  editNamedTrip: ['編輯 {{name}}', 'Edit {{name}}'],
  myTrips: ['我的旅行', 'My trips'],
  tripList: ['旅行清單', 'Trip list'],
  tripDetails: ['旅行資料', 'Trip details'],
  overview: ['旅行總覽', 'Trip overview'],
  everyTripHasAStory: ['每一趟，都有故事。', 'Every trip has a story.'],
  listSubtitle: [
    '把沿途的小花費，留在各自的旅行裡。',
    'Keep every little expense with the trip it belongs to.',
  ],
  newTrip: ['新增旅行', 'New trip'],
  loadingYourTrips: ['正在整理你的旅程…', 'Loading your trips…'],
  tripDatesNotSet: ['旅行日期未定', 'Trip dates not set'],
  startDateNotSet: ['開始日未定', 'Start date not set'],
  endDateNotSet: ['結束日未定', 'End date not set'],
  expenseCount: ['{{count}} 筆支出', '{{count}} expenses'],
  expenseCount_one: ['{{count}} 筆支出', '{{count}} expense'],
  expenseCount_other: ['{{count}} 筆支出', '{{count}} expenses'],
  openTripLedger: ['開啟旅行帳本', 'Open trip ledger'],
  startYourJourneyWithATripLedger: [
    '旅程，從第一本帳本開始。',
    'Start your journey with a trip ledger.',
  ],
  createATripAndAddYourFirstExpense: [
    '建立一趟旅行，記下你的第一筆支出。',
    'Create a trip and add your first expense.',
  ],
  listCurrencyNote: [
    '不同幣別各自統計，保留每筆支出原本的樣子。',
    'Totals stay separate by currency, and each expense keeps its original value.',
  ],
  trash: ['垃圾桶', 'Trash'],
  trashIntro: [
    '旅行會保留在這裡，直到你選擇復原或永久刪除。',
    'Trips stay here until you restore or permanently delete them.',
  ],
  deletedTripCount: ['{{count}} 趟已刪旅行', '{{count}} trips in Trash'],
  deletedTripCount_one: ['{{count}} 趟已刪旅行', '{{count}} trip in Trash'],
  deletedTripCount_other: ['{{count}} 趟已刪旅行', '{{count}} trips in Trash'],
  tripsInTrash: ['已移入垃圾桶的旅行', 'Trips in Trash'],
  movingATripToTrashDoesNotSettle: [
    '移入垃圾桶不會結清欠款，也不會變更旅行帳務。',
    'Moving a trip to Trash does not settle debts or change its ledger.',
  ],
  noTripsInTrash: ['沒有已刪旅行', 'No trips in Trash'],
  trashEmptyDescription: [
    '移至垃圾桶的旅行會保留在這裡，直到你選擇復原或永久刪除。',
    'Trips moved to Trash remain here until you restore or permanently delete them.',
  ],
  movedToTrashDate: ['移入垃圾桶：{{date}}', 'Moved to Trash: {{date}}'],
  restoreTrip: ['復原旅行', 'Restore trip'],
  permanentlyDelete: ['永久刪除', 'Permanently delete'],
  tripRestoredYouCanOpenItFromMy: [
    '旅行已復原，可以從我的旅行重新開啟。',
    'Trip restored. You can open it from My trips.',
  ],
  tripPermanentlyDeleted: ['旅行已永久刪除。', 'Trip permanently deleted.'],
  theRestoreResultForNameIsUnconfirmedCheck: [
    '「{{name}}」復原結果尚未確認，請先查證原次操作。',
    'The restore result for “{{name}}” is unconfirmed. Select Check status to verify.',
  ],
  checkingTripRestore: ['正在查證旅行復原', 'Checking trip restore'],
  tripDates: ['旅行日期', 'Trip dates'],
  tripNavigation: ['旅行內導覽', 'Trip navigation'],
  totalsByCurrency: ['分幣別總額', 'Totals by currency'],
  myTotalExpensesByCurrency: ['個人總花費 · 依幣別分開統計', 'My share by currency'],
  memberBalances: ['成員淨額', 'Member balances'],
  personalSpending: ['個人花費', 'My spending'],
  personalSpendingSummary: ['個人花費摘要', 'Personal spending summary'],
  separateByCurrency: ['依幣別分開統計', 'Totals are separate by currency'],
  noPersonalSpending: ['目前沒有個人花費。', 'No personal spending yet.'],
  viewAnalysis: ['看分析', 'Spending analysis'],
  balancesDue: ['應收應付', 'Amounts owed'],
  balanceSummary: ['應收應付摘要', 'Balance summary'],
  noBalances: ['目前沒有應收應付。', 'No balances due.'],
  balancedCurrency: ['{{currency}} 已平衡', '{{currency}} settled'],
  expenseList: ['支出清單', 'Expense list'],
  aBlankPageForYourJourney: ['旅程還有很多空白，真好。', 'A blank page for your journey.'],
  startWithAFlightTicketOrTodayS: [
    '先記下一筆機票，或今天的一杯咖啡。',
    'Start with a flight ticket or today’s coffee.',
  ],
  addYourFirstExpense: ['記錄第一筆支出', 'Add your first expense'],
  expensesAlongTheWay: ['沿途的花費', 'Expenses along the way'],
  recordCount: ['{{count}} 筆紀錄', '{{count}} expenses'],
  recordCount_one: ['{{count}} 筆紀錄', '{{count}} expense'],
  recordCount_other: ['{{count}} 筆紀錄', '{{count}} expenses'],
  updatingExpenseList: ['正在更新支出清單', 'Updating expense list'],
  couldNotUpdateTheExpenseListLoadedRecords: [
    '暫時無法更新支出清單，已載入的紀錄仍保留。',
    'Could not update the expense list. Loaded expenses are still available.',
  ],
  updateListAgain: ['重新更新清單', 'Reload expenses'],
  uncategorized: ['未分類', 'Uncategorized'],
  loadMore: ['載入更多', 'Load more'],
  loadingMoreExpenses: ['正在讀取更多支出', 'Loading more expenses'],
  manageTrip: ['管理旅行', 'Manage trip'],
  editTripDates: ['編輯旅行日期', 'Edit trip dates'],
  changeTripCover: ['更換縮圖', 'Change cover'],
  customizeTripThumbnail: ['自訂旅行縮圖', 'Edit cover'],
  moveToTrash: ['移至垃圾桶', 'Move to Trash'],
  movingToTrash: ['正在移至垃圾桶', 'Moving to Trash'],
  permanentlyDeletingTrip: ['正在永久刪除旅行', 'Permanently deleting trip'],
  theTripWillLeaveMyTripsWhileIts: [
    '旅行會先從我的旅行清單移除，保留完整帳務與照片。之後可以從垃圾桶復原。',
    'The trip will leave My trips, while its ledger and cover stay intact. You can restore it from Trash.',
  ],
  movingToTrashDoesNotSettleDebtsOr: [
    '移入垃圾桶不會結清欠款或更改帳務。',
    'Moving to Trash does not settle debts or change the ledger.',
  ],
  purgeDescriptionDesktop: [
    '這會永久刪除整趟旅行、同行者、支出、還款、結清紀錄及自訂縮圖，無法復原。',
    'This permanently deletes the trip, companions, expenses, payments, settlement records, and custom cover. It cannot be undone.',
  ],
  purgeDescriptionMobile: [
    '整趟旅行的同行者、支出、還款、結清與縮圖將永久刪除，無法復原。',
    'Companions, expenses, payments, settlements, and the cover will be permanently deleted.',
  ],
  youWillNoLongerBeAbleToOpen: [
    '永久刪除後，不能再開啟這趟旅行。',
    'You will no longer be able to open this trip.',
  ],
  theResultForNameIsUnconfirmedCheckThe: [
    '「{{name}}」操作結果尚未確認，請查證原次操作。',
    'The result for “{{name}}” is unconfirmed. Select Check status to verify.',
  ],
  checkingTripOperation: ['正在查證旅行操作', 'Checking trip operation'],
  moveNameToTrash: ['將「{{name}}」移至垃圾桶？', 'Move “{{name}}” to Trash?'],
  permanentlyDeleteName: ['永久刪除「{{name}}」？', 'Permanently delete “{{name}}”?'],
  closeDialog: ['關閉視窗', 'Close dialog'],
  cancel: ['取消', 'Cancel'],
  theOperationWasSentWaitForItsResult: [
    '操作已送出，請等待查證結果；關閉不會撤回操作。',
    'The operation was sent. Wait for its result; closing will not undo it.',
  ],
  closingOnlyDismissesThisDialogTheOriginalOperation: [
    '關閉只會收起視窗，原次操作仍須查證。',
    'Closing only dismisses this dialog. The original operation still needs checking.',
  ],
  pressEscToCancel: ['按 Esc 也可取消', 'Press Esc to cancel'],
  cancelingOrClosingWillNotChangeTheTrip: [
    '取消或關閉不會更改旅行',
    'Canceling or closing will not change the trip',
  ],
  checkAgain: ['再次查證', 'Check status'],
  checkingOriginalOperation: ['正在查證原次操作', 'Checking original operation'],
  tripIsInTrash: ['旅行已在垃圾桶', 'Trip is in Trash'],
  tripNotFound: ['找不到這趟旅行', 'Trip not found'],
  restoreItFromTrashBeforeContinuingToRecord: [
    '請先從垃圾桶復原，再繼續記帳。',
    'Restore it from Trash before continuing to record expenses.',
  ],
  thisTripWasPermanentlyDeletedItsLedgerCan: [
    '旅行已永久刪除，無法再開啟帳本。',
    'This trip was permanently deleted. Its ledger can no longer be opened.',
  ],
  goToTrashToRestore: ['前往垃圾桶復原', 'Go to Trash to restore'],
  backToTripList: ['返回旅行清單', 'Back to trips'],
  unsavedExpenseDraft: ['尚未保存的支出草稿', 'Unsaved expense draft'],
  tripThumbnailOptional: ['旅行縮圖（選填）', 'Trip cover (optional)'],
  previewOfUnsavedTripThumbnail: ['尚未保存的旅行縮圖預覽', 'Preview of unsaved cover'],
  defaultTripThumbnail: ['預設旅行縮圖', 'Default cover'],
  notSavedYet: ['尚未保存', 'Not saved yet'],
  usingTheDefaultLandscape: ['目前使用預設風景', 'Using the default landscape'],
  chooseAnotherImage: ['重新選圖', 'Choose another image'],
  chooseAPhoto: ['選擇照片', 'Choose a photo'],
  removeSelectedPhoto: ['移除選圖', 'Remove selected photo'],
  thePhotoIsPreviewedLocallyAndSavedAfter: [
    '照片先在本機預覽；建立旅行後才保存。',
    'The photo is previewed locally and saved after the trip is created.',
  ],
  youCanCreateATripWithoutAPhoto: [
    '不選照片也可以建立旅行，之後仍能自訂縮圖。',
    'You can create a trip without a photo and edit its cover later.',
  ],
  stillJPGPNGOrWebPOneImageUp: [
    '靜態 JPG、PNG、WebP；單張最大 10 MiB，2,500 萬像素內。',
    'Still JPG, PNG, or WebP; one image up to 10 MiB and 25 million pixels.',
  ],
  longestSide16384PixelsConvertHEICFirst: [
    '最長邊 16,384 像素；HEIC 請先轉檔。',
    'Longest side: 16,384 pixels. Convert HEIC first.',
  ],
  imageFailedToLoadShowingDefault: [
    '圖片載入失敗・已顯示預設圖',
    'Cover could not load. Showing the default cover.',
  ],
  loadingTripThumbnail: ['正在讀取旅行縮圖', 'Loading trip cover'],
  tripCreated: ['旅行已建立', 'Trip created'],
  youCanStartAddingExpensesToName: [
    '{{name}}已可以開始記帳。',
    'You can start adding expenses to {{name}}.',
  ],
  tripCreatedImageResultUnconfirmed: [
    '旅行已建立，圖片結果尚未確認',
    'Trip created. Cover save unconfirmed',
  ],
  tripCreatedButTheImageWasNotSaved: [
    '旅行已建立，但圖片未保存',
    'Trip created, but the cover was not saved',
  ],
  checkTheOriginalImageOperationDoNotResend: [
    '請查證原次圖片操作；等候確認時不重新送出，也不重新建立旅行。',
    'Select Check status to see whether the cover was saved. Wait before uploading again or creating another trip.',
  ],
  yourTripAndLedgerAreSavedButThe: [
    '行程和帳務已保留，目前圖片暫時無法讀取。可重新上傳縮圖，不必再建立一次。',
    'Your trip and ledger are saved, but the cover is temporarily unavailable. You can upload a new photo without recreating the trip.',
  ],
  yourTripLedgerAndCurrentImageAreSaved: [
    '行程和帳務與目前圖片已保留，本次圖片未保存。可重新上傳縮圖，不必再建立一次。',
    'Your trip, ledger, and current cover are saved. The new photo was not saved; you can upload it again without recreating the trip.',
  ],
  yourTripAndLedgerAreSavedTheDefault: [
    '行程與帳務保留，現在顯示預設風景。可重新上傳。',
    'Your trip and ledger are saved. The default cover is shown; you can upload another image.',
  ],
  noNeedToCreateTheTripAgain: ['不必再建立一次。', 'No need to create the trip again.'],
  photoDraftNameAwaitingVerification: [
    '照片草稿：{{name}}（待查證）',
    'Photo draft: {{name}} (awaiting verification)',
  ],
  uploadAgain: ['重新上傳', 'Upload again'],
  checkingImageSave: ['正在查證圖片保存', 'Checking cover save'],
  uploadingImageAgain: ['正在重新上傳圖片', 'Uploading image again'],
  createdTrip: ['已建立的旅行', 'Created trip'],
  imageSaveResultUnconfirmed: ['圖片保存結果尚未確認', 'Cover save unconfirmed'],
  currentImageTemporarilyUnavailable: [
    '目前圖片暫時無法讀取',
    'Current cover temporarily unavailable',
  ],
  imageResultUnconfirmed: ['圖片結果尚未確認', 'Cover save unconfirmed'],
  thumbnailForName: ['{{name}}旅行縮圖', 'Cover for {{name}}'],
  saveResultUnconfirmedCheckAgain: [
    '保存結果尚未確認，請再次查證。',
    'Save status unconfirmed. Select Check status to verify.',
  ],
  heicPhotosAreNotSupportedConvertToJPG: [
    'HEIC 照片目前不支援，請先轉成 JPG、PNG 或 WebP，或移除選圖。',
    'HEIC photos are not supported. Convert to JPG, PNG, or WebP, or remove the selected photo.',
  ],
  tripNameAndDatesUpdated: ['旅行名稱與日期已更新。', 'Trip name and dates updated.'],
  currentTripNameAndDatesConfirmed: [
    '已確認目前的旅行名稱與日期。',
    'Current trip name and dates confirmed.',
  ],
  currentDataDoesNotYetMatchThisChange: [
    '目前資料尚未與本次變更一致，仍無法確認保存結果。請稍後再次查證，或關閉視窗查看目前旅行。',
    'Current data does not yet match this change, so the save cannot be confirmed. Check again later or close this dialog to view the current trip.',
  ],
  tripDataIsUnavailableCheckAgainLaterYour: [
    '目前無法取得旅行資料，請稍後再查證。本次草稿仍保留。',
    'Trip data is unavailable. Check again later. Your draft is still here.',
  ],
  enterATripName: ['請填寫旅行名稱。', 'Enter a trip name.'],
  enterAValidDateForExample202703: [
    '請輸入有效日期，例如 2027/03/11。',
    'Enter a valid date, for example 2027/03/11.',
  ],
  endDateCannotBeBeforeStartDate: [
    '結束日不能早於開始日。',
    'End date cannot be before start date.',
  ],
  tripNameAndDates: ['旅行名稱與日期', 'Trip name and dates'],
  theTripNameAndDatesWillBeSaved: [
    '旅行名稱與日期會一併保存。',
    'The trip name and dates will be saved together.',
  ],
  tripNameIsRequiredYouCanSetDates: [
    '旅行名稱為必填；日期和縮圖可稍後設定。',
    'Trip name is required. You can set dates and edit the cover later.',
  ],
  tripName: ['旅行名稱', 'Trip name'],
  forExampleAutumnInKyoto: ['例如：京都賞楓', 'For example: Autumn in Kyoto'],
  startDate: ['開始日', 'Start date'],
  endDate: ['結束日', 'End date'],
  yearMonthDay: ['年 / 月 / 日', 'Year / Month / Day'],
  tripCreationIsUnconfirmedCheckTheOriginalRequest: [
    '旅行建立結果尚未確認；請查證原次建立。照片尚未送出。',
    'Trip creation is unconfirmed. Select Check status to verify. The photo has not been uploaded.',
  ],
  checkingTripCreation: ['正在查證旅行建立', 'Checking trip creation'],
  checkTripChanges: ['旅行變更查證', 'Check status'],
  yourDraftIsRetainedCheckingAgainOnlyReads: [
    '本次草稿已保留。再次查證只讀取這趟旅行，不會重送保存。',
    'Your draft is still here. Check status only reads the trip. It does not resend the save.',
  ],
  closingDismissesThisDialogItDoesNotUndo: [
    '關閉只會收起視窗，不會撤回已送出的保存。',
    'Closing dismisses this dialog; it does not undo the save already sent.',
  ],
  checkingTripChanges: ['正在查證旅行變更', 'Checking trip changes'],
  saveChanges: ['儲存變更', 'Save changes'],
  createTrip: ['建立旅行', 'Create trip'],
  savingTripImage: ['正在保存旅行圖片', 'Saving trip cover'],
  creatingTrip: ['正在建立旅行', 'Creating trip'],
  tripMovedToTrashYouCanRestoreIt: [
    '旅行已移至垃圾桶，可從垃圾桶復原。',
    'Trip moved to Trash. You can restore it there.',
  ],
  chooseOneImageAtATimeSelectAnother: [
    '一次只能選擇一張圖片，請重新選圖。',
    'Choose one image at a time. Select another image.',
  ],
  thisImageFileIsEmptyChooseAValid: [
    '圖片檔案沒有內容，請重新選擇有效的 JPG、PNG 或 WebP。',
    'This image file is empty. Choose a valid JPG, PNG, or WebP.',
  ],
  theImageExceeds10MiBReduceItsSize: [
    '圖片容量超過 10 MiB，請縮小後重新選圖。',
    'The image exceeds 10 MiB. Reduce its size and choose it again.',
  ],
  thisFormatIsNotSupportedConvertItTo: [
    '不支援這種圖片格式，請轉成單張靜態 JPG、PNG 或 WebP 後重新選圖。',
    'This format is not supported. Convert it to a single still JPG, PNG, or WebP and choose it again.',
  ],
  theImageChangedOnAnotherDeviceCheckThe: [
    '其他裝置已更新圖片，請確認目前圖片後再保存。',
    'The cover changed on another device. Check the current cover before saving.',
  ],
  theTripStatusChangedCheckItsCurrentStatus: [
    '旅行狀態已更新，請確認目前狀態後再保存。',
    'The trip status changed. Check its current status before saving.',
  ],
  thisFormatOrAnimationIsNotSupportedConvert: [
    '格式或動畫內容不支援，請轉成單張靜態 JPG、PNG 或 WebP 後重新選圖。',
    'This format or animation is not supported. Convert it to a single still JPG, PNG, or WebP.',
  ],
  theImageIsDamagedOrItsDimensionsAre: [
    '圖片內容損壞或尺寸無效，請重新選擇有效的 JPG、PNG 或 WebP。',
    'The image is damaged or its dimensions are invalid. Choose a valid JPG, PNG, or WebP.',
  ],
  theImageExceedsTheLimits10MiB25: [
    '圖片超過上限（10 MiB、總像素 2,500 萬、最長邊 16,384 像素），請縮小後重新選圖。',
    'The image exceeds the limits (10 MiB, 25 million pixels, or 16,384 pixels on its longest side). Reduce its size and choose it again.',
  ],
  thumbnailSaveVerifiedTripInTrash: [
    '原次圖片保存已確認成功。目前旅行已在垃圾桶，可前往復原。',
    'The cover was saved. The trip is now in Trash and can be restored.',
  ],
  thumbnailSaveVerifiedTripPurged: [
    '原次圖片保存已確認成功。目前旅行已永久刪除。',
    'The cover was saved. The trip has since been permanently deleted.',
  ],
  thumbnailSaveVerifiedCurrentImage: [
    '原次圖片保存已確認成功。目前縮圖已保存，以目前圖片為準。',
    'The cover was saved. The current cover is available.',
  ],
  thumbnailSaveVerifiedDefaultImage: [
    '原次圖片保存已確認成功。目前縮圖使用預設圖。',
    'The cover was saved. The trip now uses the default cover.',
  ],
  imageSavedTheOriginalOperationIsConfirmed: ['圖片已保存，原次操作已確認。', 'Cover saved.'],
  imageNotSavedReason: ['圖片未保存：{{reason}}', 'Cover not saved: {{reason}}'],
  imageSaveResultUnconfirmedCheckTheOriginalOperation: [
    '圖片保存結果尚未確認，請查證原次操作。關閉不會撤回已送出的保存。',
    'Cover save unconfirmed. Select Check status to verify. Closing will not undo the save already sent.',
  ],
  theImageSaveResultForNameIsUnconfirmed: [
    '「{{name}}」圖片保存結果尚未確認，請查證原次保存。',
    'The cover save for “{{name}}” is unconfirmed. Select Check status to verify.',
  ],
  theDefaultLandscapeIsSelectedLocallyForName: [
    '為「{{name}}」已在本機選用預設風景，按「保存圖片」才會套用。',
    'The default cover is selected for “{{name}}”. Select Save cover to apply it.',
  ],
  chooseAPhotoForNameToMakeThe: [
    '為「{{name}}」選一張照片，讓旅程更容易辨識。',
    'Choose a photo for “{{name}}” to make the trip easier to recognize.',
  ],
  defaultLandscapeSelectedForNameSaveToApply: [
    '「{{name}}」已選預設風景；保存後才套用。',
    'Default cover selected for “{{name}}”. Select Save cover to apply it.',
  ],
  chooseAPhotoForName: ['為「{{name}}」選一張照片。', 'Choose a photo for “{{name}}”.'],
  thisTripSThumbnailCannotBeEditedNow: [
    '旅行目前無法編輯縮圖',
    'This trip’s cover cannot be edited now',
  ],
  thumbnailPreviewForName: ['{{name}}旅行縮圖預覽', 'Cover preview for {{name}}'],
  cannotPreviewThisPhotoChooseAnotherImage: [
    '無法預覽這張照片，請重新選圖。',
    'Cannot preview this photo. Choose another image.',
  ],
  lastConfirmedImagePreviewUnavailable: [
    '最後確認的圖片預覽暫不可用',
    'Last confirmed cover preview unavailable',
  ],
  resultUnconfirmed: ['結果尚未確認', 'Result unconfirmed'],
  lastConfirmedThumbnail: ['最後確認的縮圖', 'Last confirmed cover'],
  currentTripThumbnail: ['目前旅行縮圖', 'Current cover'],
  useDefaultImage: ['使用預設圖', 'Use default cover'],
  oneStillJPGJpgJpegPNGOrWebP: [
    '支援單張靜態 JPG（.jpg、.jpeg）、PNG、WebP，最大 10 MiB。',
    'One still JPG (.jpg, .jpeg), PNG, or WebP is supported, up to 10 MiB.',
  ],
  longestSide16384PixelsTotalUpTo: [
    '最長邊 16,384 像素、總像素 2,500 萬以內。',
    'Longest side: 16,384 pixels; total: up to 25 million pixels.',
  ],
  convertHEICPhotosFromYourPhoneToJPG: [
    '手機 HEIC 照片請先轉成 JPG、PNG 或 WebP。',
    'Convert HEIC photos from your phone to JPG, PNG, or WebP first.',
  ],
  convertHEICToJPGPNGOrWebPFirst: [
    'HEIC 請先轉成 JPG、PNG 或 WebP。',
    'Convert HEIC to JPG, PNG, or WebP first.',
  ],
  reloadCurrentStatus: ['重新讀取目前狀態', 'Reload current status'],
  reloadingCurrentStatus: ['正在重新讀取目前狀態', 'Reloading current status'],
  tripIsInTrashYourPhotoDraftIs: [
    '旅行已在垃圾桶。照片草稿保留，復原後可重新讀取狀態再保存。',
    'Trip is in Trash. Your photo draft is still here. Restore the trip, then reload its status before saving.',
  ],
  thisTripWasPermanentlyDeletedThePhotoCannot: [
    '旅行已永久刪除，這張照片無法再保存到原旅行。',
    'This trip was permanently deleted. The photo cannot be saved to it.',
  ],
  saveImage: ['保存圖片', 'Save cover'],
  savingImage: ['正在保存圖片', 'Saving cover'],
  lifecycleTrashActive: [
    '原次移入已確認成功。目前旅行一般可用。',
    'Moving to Trash was confirmed. The trip is currently active.',
  ],
  lifecycleTrashInTrash: [
    '原次移入已確認成功。目前旅行已在垃圾桶，可前往復原。',
    'Moving to Trash was confirmed. The trip is in Trash and can be restored.',
  ],
  lifecycleTrashPurged: [
    '原次移入已確認成功。目前旅行已永久刪除，無法再開啟。',
    'Moving to Trash was confirmed. The trip was permanently deleted and cannot be opened.',
  ],
  lifecycleRestoreActive: [
    '原次復原已確認成功。目前旅行一般可用。',
    'Restoring was confirmed. The trip is currently active.',
  ],
  lifecycleRestoreInTrash: [
    '原次復原已確認成功。目前旅行已在垃圾桶，可前往復原。',
    'Restoring was confirmed. The trip is now in Trash and can be restored.',
  ],
  lifecycleRestorePurged: [
    '原次復原已確認成功。目前旅行已永久刪除，無法再開啟。',
    'Restoring was confirmed. The trip was permanently deleted and cannot be opened.',
  ],
  lifecyclePurgeActive: [
    '原次永久刪除已確認成功。目前旅行一般可用。',
    'Permanent deletion was confirmed. The trip is currently active.',
  ],
  lifecyclePurgeInTrash: [
    '原次永久刪除已確認成功。目前旅行已在垃圾桶，可前往復原。',
    'Permanent deletion was confirmed. The trip is now in Trash and can be restored.',
  ],
  lifecyclePurgePurged: [
    '原次永久刪除已確認成功。目前旅行已永久刪除，無法再開啟。',
    'Permanent deletion was confirmed. The trip was permanently deleted and cannot be opened.',
  ],
});

export function tripText(key: string, values?: Record<string, string | number>): string {
  return interfaceI18n.t(`trips.${key}`, values ?? {});
}

export function useTripText() {
  useTranslation();

  return tripText;
}
