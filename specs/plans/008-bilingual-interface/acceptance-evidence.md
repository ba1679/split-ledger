# 008 中英文介面驗收包

本機驗收使用 2026-11-24 的 `main` 工作樹，以 `228109265ddc3384853745b1083edb1f94ce3579` 為起點。畫面與自動驗證對應同一份 [產品來源指紋](evidence/source-sha256.txt)。帳本沿用 [已確認的桌機基準](../../ui-baseline/previews/ledger-desktop.png) 與 [手機基準](../../ui-baseline/previews/ledger-mobile.png) 的資訊位置。

這組截圖記錄 T083 當時的版本。最新語言入口與定稿英文字樣的代表畫面見 [Pencil 基準 v0.4](../../ui-baseline/language-selector-baseline.md)。

## 代表畫面

[手機對照圖](evidence/comparison-390.png) · [桌機對照圖](evidence/comparison-1440.png)。對照圖左欄繁中、右欄英文，上方登入、下方結算。

| 畫面 | 手機繁中 390×844 | 手機英文 390×844 | 桌機繁中 1440×900 | 桌機英文 1440×900 |
| --- | --- | --- | --- | --- |
| 登入 | [檢視](evidence/login-390-zh-TW.png) | [檢視](evidence/login-390-en.png) | [檢視](evidence/login-1440-zh-TW.png) | [檢視](evidence/login-1440-en.png) |
| 旅行帳本 | [檢視](evidence/ledger-390-zh-TW.png) | [檢視](evidence/ledger-390-en.png) | [檢視](evidence/ledger-1440-zh-TW.png) | [檢視](evidence/ledger-1440-en.png) |
| 新增支出日曆 | [檢視](evidence/calendar-390-zh-TW.png) | [檢視](evidence/calendar-390-en.png) | [檢視](evidence/calendar-1440-zh-TW.png) | [檢視](evidence/calendar-1440-en.png) |
| 結算 | [檢視](evidence/settlement-390-zh-TW.png) | [檢視](evidence/settlement-390-en.png) | [檢視](evidence/settlement-1440-zh-TW.png) | [檢視](evidence/settlement-1440-en.png) |

- 登入與直接開啟帳本。瀏覽器第一順位中文顯示繁中，其餘顯示英文。已有有效手動值時依該值呈現。
- 旅行帳本與支出。核對繁中「記一筆」和「支出金額」，以及英文欄名、未分類標籤、日曆和相同的原始金額與分攤。旅行、成員、分類及支出項目仍顯示使用者輸入原文。
- 結算。核對「待付款」、兩種零淨額狀態與應付／已付金額。英文依同次 API 回應說明原始安排、無需調整或簡化後安排。
- 還款。核對「儲存結果待確認」與「查看結果」，以及僅偵測離線時出現的連線提示。[在線畫面](evidence/repayment-pending-online-390-zh-TW.png) · [離線畫面](evidence/repayment-pending-offline-390-zh-TW.png)

## 自動驗證

[驗證紀錄](validation.md) 收錄個案清單、結果與工具版本。Chromium 的代表畫面在同一測試資料和尺寸下比較了繁中與英文。重點核對英文長句換行、繁中幣別名稱、按鈕可見，以及 390×844 與 1440×900 無橫向溢出。

## 待使用者確認

T084 的範圍為本包所示的繁中與英文文案，以及手機和桌機排版。語言切換入口屬另一設計範圍，進度見 [語言入口設計](ui/ui-plan.md)。無障礙驗證依先前決定延後。
