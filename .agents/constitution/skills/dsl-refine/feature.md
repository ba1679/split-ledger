# 介面 Feature 規則

Applies To: `/dsl-refine` 維護的 `specs/truth/features/backend/**` 與 `specs/truth/features/frontend/**` 下的 `.feature` 檔。

## Rule 1 - 拆解後的驗收承諾須可追溯

- Level: `MUST`
- 原始 acceptance 中每項受影響的業務結果，以及失敗時必須維持的條件，須能追溯到至少一個負責驗證該結果的介面案例。
- 結果橫跨多個介面時，各案例須驗證該介面能觀察到的結果，相關案例合起來須涵蓋原始驗收承諾。

### Good Example

```md
- 原始驗收「付款已提交但回應遺失」要求介面顯示待確認、提供再次查證，並保證原付款只記錄一筆。
- 前端案例承接待確認提示與再次查證入口。
- 後端案例承接原付款查證與只有一筆付款紀錄的條件。
```

### Bad Example

```md
- 原始驗收要求付款結果可查證且不重複入帳。拆解後只有前端顯示逾時訊息的案例。
```
