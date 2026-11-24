const en = {
  'app.title': 'Travel Ledger',
  'app.signingOut': 'Signing out',
  'app.checkingSession': 'Checking your session',
  'login.storyFirst': 'Enjoy the journey.',
  'login.eyebrow': 'LESS CALCULATING. MORE EXPLORING.',
  'login.stampFirst': "LET'S",
  'login.stampSecond': 'GO PLACES',
  'login.storyFooter': 'YOUR JOURNEY, IN LITTLE DETAILS.',
  'login.welcome': 'WELCOME TO TRAVEL LEDGER',
  'login.storySecond': 'Remember every expense.',
  'login.storyBody':
    'From your flight to a coffee on the road. Keep track of what you spend and enjoy the view.',
  'login.headingFirst': 'Your next trip',
  'login.headingSecond': 'starts here.',
  'login.intro': 'Sign in to your travel ledger and record expenses as you go.',
  'login.google': 'Sign in with Google',
  'login.googlePending': 'Signing in with Google',
  'login.retry': 'Sign-in could not be completed. Please try again.',
  'login.connection': 'Could not connect to sign in. Please try again.',
  'login.private': 'Your ledger is private.',
  'login.sync': 'After you sign in, you can see the same records on your phone or computer.',
  'ledger.addExpense': 'Add an expense',
  'ledger.settlement': 'Settle up',
} as const;

type FirstScreenKeys = keyof typeof en;

const zh: Record<FirstScreenKeys, string> = {
  'app.title': '旅帳',
  'app.signingOut': '正在登出',
  'app.checkingSession': '正在確認身分',
  'login.storyFirst': '好好旅行，',
  'login.eyebrow': '少算一點，多玩一點。',
  'login.stampFirst': '走吧',
  'login.stampSecond': '出發去旅行',
  'login.storyFooter': '記下旅途中的每個小片段。',
  'login.welcome': '歡迎使用旅帳',
  'login.storySecond': '每一筆都記得。',
  'login.storyBody': '從出發前的機票，到路邊的一杯咖啡。把花費放好，把時間留給風景。',
  'login.headingFirst': '下一趟旅行，',
  'login.headingSecond': '從這裡開始。',
  'login.intro': '登入你的個人旅行帳本，隨手記下沿途的花費。',
  'login.google': '使用 Google 帳號登入',
  'login.googlePending': '正在進行 Google 登入',
  'login.retry': '登入尚未完成，請重新嘗試。',
  'login.connection': '目前無法連線，登入尚未完成。請重新嘗試。',
  'login.private': '你的帳本只屬於你。',
  'login.sync': '登入後，可在手機與電腦查看同一份紀錄。',
  'ledger.addExpense': '記一筆',
  'ledger.settlement': '分帳結算',
};

export const firstScreenMessages = { en, 'zh-Hant': zh };
