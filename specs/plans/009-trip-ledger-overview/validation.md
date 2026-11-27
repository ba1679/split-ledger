# 旅行帳本總覽產品驗收

## v2 產品驗收通過

產品以 `38daddb2de7e49a05d079fa1868ec89ef1bbdb21` 為起點，前端與 truth 的工作樹 diff（含新增的 `use-trip-list-management.tsx`）SHA-256 為 `0a0aa94489a94fd718920168b08233b3b16e619acd85a013a807f5b904e0f231`。固定 UI baseline、已確認的設計雜湊、frame ID 與設計圖見 [設計索引](ui/ui-plan.md)。

使用者於 2026-11-27（Asia/Taipei）確認「產品驗收 ok，請幫我回填 ui baseline」。確認範圍為下列手機／桌機的實際產品畫面、操作入口與已揭露差異。已驗收的產品 commit 為 `bc887714be69aea9e2bdbffc7109313623d9e3d3`，提交前已核對上方工作樹版本指紋。

產品證據使用 Chromium、隔離 PostgreSQL、正式 API 與 Vite。手機為 390 × 844，桌機為 1440 × 900。日本春日旅行有 12 筆支出及兩位同行者，幣別為 JPY／TWD。第二張樣本卡片是台南的慢週末，有 0 筆支出，順序依 API 回傳。

| 畫面 ID 與範圍 | 實際產品 | 對照結果與差異 |
| --- | --- | --- |
| `trips/main` | [手機](ui/evidence/v2/mobile-home.png) · [桌機](ui/evidence/v2/desktop-home.png) | Logo、垃圾桶與新增按鈕、卡片鉛筆位置、齒輪入口符合設計。產品沿用卡片原有封面、字距與留白，手機第二張卡片下緣需捲動。 |
| `trips/edit` | [手機](ui/evidence/v2/mobile-trip-settings.png) · [桌機](ui/evidence/v2/desktop-trip-settings.png) | 鉛筆下拉包含日期、縮圖與移至垃圾桶，附鍵盤焦點框。手機空間不足時，選單展開於按鈕上方。 |
| `settings/global/home` | [手機](ui/evidence/v2/mobile-app-settings.png) · [桌機](ui/evidence/v2/desktop-app-settings.png) | 手機從底部導覽開啟底部面板，桌機從側欄底部開啟置中面板。間距與高度來自共用對話框。 |
| `settings/global/home` 語系展開 | [手機](ui/evidence/v2/mobile-language-options.png) · [桌機](ui/evidence/v2/desktop-language-options.png) | 實作補充狀態。原面板內展開繁體中文和 English，勾選目前語言，選擇後立即套用並收合。 |
| `ledger/overview` | [手機](ui/evidence/v2/mobile-overview.png) · [桌機](ui/evidence/v2/desktop-overview.png) | 手機恢復 Logo Header，底部「我的旅行」直達清單。旅行設定已移至卡片。摘要、花費分析與支出欄位依現有資料呈現。 |
| `ledger/expenses` | [手機](ui/evidence/v2/mobile-scroll.png) · [桌機](ui/evidence/v2/desktop-scroll.png) | 手機最後一筆可捲入可視範圍，右下角保留浮動「記一筆」。桌機固定頁首繼續提供記帳操作。 |

### v2 測試

- Chromium 與 Linux WebKit 各通過 4 例瀏覽器 UI 測試。涵蓋手機與桌機、兩張卡片各自開啟與選擇、日期焦點還原、垃圾桶入口、設定、語系、登出、分析和捲動後新增。
- 定向 BDD 以 Chromium 通過 70 例，Linux WebKit 通過 6 例。範圍包括分析、旅行建立與管理、日期與鍵盤操作、語系與表單草稿、縮圖保存及帳號隔離。macOS 內建 WebKit 有 `PushAPIEnabled` 協議相容問題，本輪使用同版 Playwright 的 Linux WebKit。
- Web 型別檢查、Vite 正式建置、變更範圍 ESLint、React Doctor 變更掃描與 `git diff --check` 通過。Vite 回報主 bundle 超過預設大小提示。
- 獨立唯讀審查核對首頁限定設定、雙端旅行管理、手機導覽與主要驗證證據。
- 鍵盤互動已有瀏覽器測試證據。使用者確認本版產品，實體手機及 VoiceOver 個別操作未附驗證紀錄。UI baseline 回填與獨立核對進度見 [交接清單](handoff.md#交付清單)。
