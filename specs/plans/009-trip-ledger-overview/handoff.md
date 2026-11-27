# 旅行帳本總覽交接

v2 已完成前端實作、前端 truth／DSL 對齊、自動回歸及獨立唯讀審查。使用者已確認 v2 產品驗收，UI baseline 回填待 Pencil 用量恢復。設計版本與原確認回覆見 [設計索引](ui/ui-plan.md)，產品版本指紋、雙端截圖及已知畫面差異見 [驗收紀錄](validation.md)。

## 交付清單

- [x] 確認手機與桌機的設計及操作入口，保存 Pencil 雜湊、frame ID 與預覽。
- [x] 實作旅行帳本總覽、固定記帳、旅行清單卡片選單、垃圾桶入口與首頁全站設定，同步受影響的前端 truth／DSL 和既有測試。
- [x] 完成 Chromium 74 例及 Linux WebKit 10 例定向回歸、型別檢查、變更範圍 ESLint、React Doctor、正式建置與獨立唯讀 UI 核對。瀏覽器測試使用隔離 PostgreSQL 與正式 API，單 worker 依序執行。專用 WebKit 容器已停止，測試資料庫已清除。
- [x] 使用者於 2026-11-27 確認 [v2 產品驗收](validation.md#v2-產品驗收通過)。已記錄確認回覆、範圍、差異及工作樹版本指紋。
- [ ] 依使用者指示，2026-12-01（Asia/Taipei）再檢查 Pencil 用量。2026-11-27 官方 CLI 回報用量已達上限，且本機 0.3.14 不支援現行 baseline 的 `2.25` 格式。恢復時使用支援該格式的官方工具，核對產品 commit 與已驗收版本指紋，再更新 [UI baseline](../../ui-baseline/README.md) 的帳本、旅行清單與共用導覽 frames、同版預覽及版本索引。
- [ ] 由未參與基準回填的審查者核對產品 commit、frames、預覽及索引，記下核對結果。

## Git 交接

- 實作與測試基於 `38daddb2de7e49a05d079fa1868ec89ef1bbdb21`。依使用者確認，從本機 `main` 建立 `codex/009-trip-ledger-overview`，包含 `38daddb chore: install shadcn AI skills`。
- 已驗收的產品 commit 為 `bc887714be69aea9e2bdbffc7109313623d9e3d3`，包含前端、測試及前端 truth。續跑基準回填時，以該 commit 和 [驗收紀錄](validation.md) 為依據。
