# 旅行帳本總覽設計

## 範圍與基準

C 類設計變更，涵蓋旅行帳本 `/trips/:tripId`、旅行清單 `/trips` 和共用導覽。完整需求見 [spec.md](../spec.md)。沿用旅帳的綠色操作色、淺底白卡、圓角及 Lucide 圖示。

固定基準為 `8fc9f94134c66ffd29918014b950894b1007aa86` 的 [帳本基準](../../../ui-baseline/ledger-baseline.md) 及 [基準 .pen](../../../ui-baseline/split-ledger.pen)。手機首屏／支出區 frame 為 `j4FlQR`／`pwPFO`，桌機為 `K4fUl`／`vQfME`。同版預覽見 [手機](../../../ui-baseline/previews/ledger-mobile.png)、[手機支出區](../../../ui-baseline/previews/ledger-expenses-mobile.png)、[桌機](../../../ui-baseline/previews/ledger-desktop.png)及[桌機支出區](../../../ui-baseline/previews/ledger-expenses-desktop.png)。基準產品版本為 `6bb68a5023d43aa6beadaee4453676c30ba635f7`，本次實作版本與驗證證據見 [產品驗收](../validation.md)。

同一固定基準的旅行清單 frame 為手機 `i1wuXl`、桌機 `GlUDZ`，對應 [手機清單](../../../ui-baseline/previews/trips-mobile.png)及[桌機清單](../../../ui-baseline/previews/trips-desktop.png)。

## 設計 v2 · 已確認，可實作

[可編輯 .pen](trip-ledger-overview.pen) 的 SHA-256 為 `c76a0e6ab9a7f1c2216ca02150f0a477790e3005f0cfcc5faed3f94f2e17f44f`。使用者在卡片編輯入口統一後回覆「ok，動工修改」，確認下列十張畫面的入口配置並授權實作。資料沿用日本春日旅行、JPY／TWD、兩位同行者及 12 筆支出，清單另示意第二趟旅行。

| 畫面 ID | Frame | 尺寸 | 預覽 |
| --- | --- | --- | --- |
| ledger/overview/mobile | `n7BJoG` | 390 × 844 | [手機總覽](previews/v2/mobile-overview.png) |
| ledger/expenses/mobile | `ia2R6` | 390 × 844 | [手機捲動](previews/v2/mobile-scroll.png) |
| settings/global/home/mobile | `II15c` | 390 × 844 | [手機全站設定](previews/v2/mobile-settings.png) |
| trips/main/mobile | `yfJ6r` | 390 × 844 | [手機旅行清單](previews/v2/mobile-trips.png) |
| trips/edit/mobile | `rQQjn` | 390 × 844 | [手機旅行卡片下拉選單](previews/v2/mobile-trip-edit.png) |
| ledger/overview/desktop | `HQIqx` | 1440 × 900 | [桌機總覽](previews/v2/desktop-overview.png) |
| ledger/expenses/desktop | `i9l4Hu` | 1440 × 900 | [桌機捲動](previews/v2/desktop-scroll.png) |
| trips/edit/desktop | `twjOd` | 1440 × 900 | [桌機旅行卡片下拉選單](previews/v2/desktop-trip-settings.png) |
| trips/main/desktop | `IFwC2` | 1440 × 900 | [桌機旅行清單](previews/v2/desktop-trips.png) |
| settings/global/home/desktop | `lj0kA` | 1440 × 900 | [桌機全站設定](previews/v2/desktop-settings.png) |

## 行為與適配

- 手機頂部顯示旅帳 Logo Header，隨頁面捲動。固定底部「我的旅行」直接開啟清單。旅行總覽的底部繼續提供同行者、分帳結算與獨立浮動「記一筆」，首頁清單提供「我的旅行」和全站設定兩項。
- 手機和桌機都從旅行清單卡片右上角的鉛筆按鈕開啟該旅行的下拉選單。按鈕只有圖示，觸控區為 44 × 44 CSS px，無障礙名稱為「編輯」加旅行名稱。選單對齊觸發鈕右緣，空間不足時調整方向以留在視窗內。編輯按鈕與「開啟帳本」為獨立操作。選單提供編輯旅行日期、更換縮圖與移至垃圾桶。
- 查看垃圾桶的入口在旅行清單頁上方，作為「新增旅行」旁的次要操作。垃圾桶清單與還原流程沿用既有版型。「移至垃圾桶」繼續使用既有的確認與結果處理。
- 全站設定的齒輪只出現在「我的旅行」首頁（`/trips`）。手機從首頁底部導覽開啟底部面板，桌機從首頁側欄底部開啟置中面板。設定集中支出分類、語系和登出，語系列顯示目前語言。實作採原設定面板內展開兩個語言選項，選擇後立即套用並收合。進入旅行頁後，從「我的旅行」可直接回到首頁設定。
- 窄手機保持各觸控入口至少 44 × 44 CSS px。長旅行名稱可自然換行，卡片編輯入口保持可讀。開啟和關閉選單或面板時管理鍵盤焦點，關閉後回到觸發點。浮動新增與底部導覽保留安全區，末筆仍可完整捲入。
- 旅行帳本的摘要與固定記帳方式見 [規格](../spec.md)，空白、載入及錯誤沿用共用狀態。原型採不製作，以畫面及行為註記交接。

## 實作交接

v2 已確認兩端入口和主要畫面，已交付 [實際產品畫面與驗證](../validation.md#v2-產品驗收通過)。驗收涵蓋手機「我的旅行」直達、兩端卡片編輯指向正確旅行、垃圾桶清單、兩端首頁全站設定的顯示範圍、語系與登出、長標題及捲動操作。產品已驗收，旅行清單、帳本和共用導覽的 UI baseline 回填進度見 [交接](../handoff.md#交付清單)。
