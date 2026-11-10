# 系統分析規劃：Owner 管理的旅行分帳與結算

## 專案結構

### 文件結構（本功能）

```text
specs/plans/005-owner-managed-trip-splitting/
├── spec.md
├── research.md
├── truth-delta.md
├── features/acceptance/
├── plan.md
├── ui/                    # 後續 ui-plan
└── tasks.md               # 後續 tasks
specs/truth/
├── techstack.md
├── contracts/             # api-plan 權威契約
├── data/                  # data-plan 權威模型
└── features/              # 後續 dsl-refine
```

### 原始碼結構（儲存庫根目錄）

```text
apps/web/                  # owner 互動與狀態
apps/api/                  # 權威 API、登入與 PostgreSQL 存取
packages/shared/           # 共用精確計算
```

**結構決策**: 沿用既有 Web、API、PostgreSQL 與 shared workspace；實際端點與資料模型由各 owner 分析。Google 登入沿用既有整合，本輪沒有新金流或其他外部服務，實際支付在線下進行。

## 分析流程規劃

### 系統介面的盤點

本次共盤點出 3 個系統介面。

1. `旅行分帳持久化介面`
   - 端點類型：資料庫端點。
   - 主要介面：旅行成員、既有支出分攤、還款與結清、精確差額、設定與帳務一致性。
   - 需求原文依據：FR-001–017、FR-019–020、FR-026–038；成員穩定識別、歷史保留、分幣別精確計算及舊支出相容。
   - 委派：`/data-plan`。

2. `旅行分帳 API 介面`
   - 端點類型：後端端點。
   - 主要介面：owner 的成員與支出管理、餘額與簡化建議、實付紀錄、結清與保存結果。
   - 需求原文依據：FR-007–041，含 owner 隔離、實付與結清、超額及並行一致性。
   - 委派：`/api-plan`。

3. `owner 分帳與結算介面`
   - 端點類型：前端端點。
   - 主要介面：同行者管理、共同支出、精確分攤、簡化開關、實付與結清、手機/鍵盤與錯誤狀態。
   - 需求原文依據：使用者故事 1–5、NFR-001–004；使用者要求不在 UI 選擇或記錄取整方式。
   - 委派：`/ui-plan`。

### 分析流程的安排

#### Wave 1：資料責任

- 介面：`旅行分帳持久化介面`，委派 `/data-plan`。
- 分析重點：精確份額與成對調整、結清及實付的歷史生命週期、穩定身分與名稱唯一性、舊資料回填、owner 隔離、revision 與交易一致性。
- 安排理由：先收斂帳務狀態與相互關係，API 的確認、重算與錯誤語意依賴此邊界。

#### Wave 2：API 契約

- 介面：`旅行分帳 API 介面`，委派 `/api-plan`。
- 分析重點：沿用既有支出契約、成員及餘額操作、實付與結清邊界、獨立部分還款、有效性與過期確認、精確數值及錯誤。
- 安排理由：以前一波持久化生命週期和最新 spec 為基礎，避免 API 和資料持有方式各自假設。

#### Wave 3：UI 流程

- 介面：`owner 分帳與結算介面`，委派 `/ui-plan`。
- 分析重點：平均份額的最多兩位小數顯示與內部精度分離、簡化付款 三句說明、記錄實付與結清、部分還款、手機與鍵盤、載入/失敗/結果不明狀態；不提供取整選擇。
- 安排理由：以更新後 API/data truth 為依據設計完整操作與靜態雛形，避免 UI 假設未被契約支援。

### 共通 handoff

- Plan package：`specs/plans/005-owner-managed-trip-splitting/`；truth root：`specs/truth/`；truth delta：`specs/plans/005-owner-managed-trip-splitting/truth-delta.md`。
- 後續 owner 必須先讀更新後的 spec、research、acceptance 及 truth-delta。各 owner 僅修改自身 truth 範圍並委派 truth-delta 記錄。
- 一筆實付後結清不要求取整方式；部分還款與超額規則須與結清明確區分，若既有描述仍有矛盾先停止並回交。
- `/dsl-refine` 在 API、data、UI 已對齊後進行；`/tasks` 應等待 system-analysis 與相關 truth／UI handoff 完成。

## Prototype review 後的開發依據（2026-11-10）

- 採用最新 `spec.md` FR-012、FR-026 及介面文案與表單要求，並遵守 `ui/ui-plan.md` 的回饋決策。
- HTML prototype 保留為流程示意；若示意與上述文件不一致，以文件為準。日期沿用正式程式既有 `DateField`，不依 prototype 的原生日期欄位重建。
- 後續 `/dsl-refine` 與 `/tasks` 須納入名稱「簡化付款」、中性文案、金額顯示格式、選項間距與日期元件回歸檢查。API/data 的精確數值及技術欄位名稱不因顯示名稱改變。
