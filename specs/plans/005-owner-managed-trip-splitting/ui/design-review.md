# 005 pen.dev 設計稿與檢查紀錄

日期：2026-11-10。可編輯檔案：[split-ledger-005.pen](split-ledger-005.pen)。

沿用旅帳既有米白、深綠、白色表面、Noto Sans TC 內文與 Noto Serif TC 標題。畫布依序排列：設計基礎、兩排桌面畫面、一排手機畫面、狀態與日期元件。

## 畫面索引

| 畫面 | 桌面預覽 | 手機預覽 |
| --- | --- | --- |
| 旅行帳本 | [桌面](design-previews/01-desktop-ledger.png) | [手機](design-previews/07-mobile-ledger.png) |
| 同行者 | [桌面](design-previews/02-desktop-members.png) | [手機](design-previews/08-mobile-members.png) |
| 記共同支出 | [桌面](design-previews/03-desktop-expense.png) | [手機](design-previews/09-mobile-expense.png) |
| 分帳結算 | [桌面](design-previews/04-desktop-settlement.png) | [手機](design-previews/10-mobile-settlement.png) |
| 實付結清 | [桌面](design-previews/05-desktop-settle.png) | [手機](design-previews/11-mobile-settle.png) |
| 獨立還款 | [桌面](design-previews/06-desktop-repayment.png) | [手機](design-previews/12-mobile-repayment.png) |

[簡化付款與關鍵狀態](design-previews/13-states.png)涵蓋前後付款對象對照、超額還款確認、結清結果、成員改名／停用／刪除、讀取失敗、全部結清、保存結果未確認、安排已更新、部分還款結果。

[日期與表單狀態](design-previews/14-calendar.png)包含桌面日曆、手機底部日曆、日期輸入、同名提示、停用選項、未選分攤者與載入骨架。

## Review checklist

- [x] 全部 15 個頂層設計區塊已完成，沒有 placeholder 留存。
- [x] pen.dev 結構檢查沒有 partially clipped／fully clipped 問題。
- [x] 已逐段截圖確認表單、結算、同行者、狀態與日曆的視覺與排版。
- [x] 橫向畫面使用側欄，375px 手機採單欄與底部導覽；完整長頁供檢閱。
- [x] 下拉箭頭有內縮留白；radio／checkbox 各選項獨立、控制項與文字保有間距。
- [x] 功能名稱使用「簡化付款」，說明直接描述付款對象與筆數變化。
- [x] 金額最多顯示兩位小數，不出現循環小數、括號算式或強調精確、公平的可見文案。
- [x] JPY 與 TWD 的餘額及付款安排分開呈現。
- [x] 日期畫面採既有自訂日曆視覺，正式實作沿用 DateField。
- [x] 檢查深綠／白色及內文／米白的文字對比、元件對齊與留白；停用狀態同時提供文字。
- [x] 設計稿已透過 pen.dev 儲存，並匯出 14 張 PNG。

本次未修改 HTML prototype 或正式程式。設計稿不包含可執行事件、真實資料與 API；正式實作仍須驗證鍵盤、焦點、響應式及動態狀態。獨立還款的 JPY 600／400／700 為另一組情境，不與點心 JPY 100 範例混算。
