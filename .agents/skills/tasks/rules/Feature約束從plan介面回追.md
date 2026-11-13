# Rule 1 - Feature Shared Must Read 從 plan 介面回追實際依據

- Level: `MUST`
- 每個 Feature phase 除 feature、同模組 `dsl.md` 與 `/dsl-refine` 列外，還要列入約束該 feature 的實際產物及具體部位；不掃全部 Core Inputs 或依技術名稱猜檔。
- 回追順序：由 `/dsl-refine` truth 路徑取得介面／模組 → 在 `plan.md` 定位介面與 UI 分流 → 定位 owner 產物或既有依據 → 列出約束此模組的內容 → 綁定所有實際受影響畫面及共享導航／元件。
- A 只綁適用工程／行為依據；B 綁 `plan.md` 的既有呈現、本次 spec／truth 行為來源及必要回歸；C 綁固定基準＋已確認設計、frame／預覽及有效批准證據，僅選用互動才綁入口／決策。細部前置依主 SOP 已載入的共用契約，不要求所有 frontend 都有 ui/。
- truth 產物由同份 `truth-delta.md` 的 API／data／techstack owner 列定位，使用 `specs/truth/**` 路徑；plan-side 引用 plan package 相對位置，共用基準使用 repo 路徑及固定 commit。基準不是 truth 或每個 plan 都重建的副本。
- 跨模組呈現依據全部綁定，但不將無關 UI／API／data 塞入每個 phase。Foundational 仍只建骨架，不用其空白條件取代 Feature 完成條件。

## Good Example

```md
frontend/結算 feature → plan.md 的 B 類 settlement/main。
Shared Must Read：feature、同模組 DSL、truth-delta、plan.md 的既有畫面與新版計算規則引用。
C 類新增入口則另綁 ui/ui-plan.md 的 approved frame、預覽、固定基準；prototype 不製作。
```

## Bad Example

```md
只綁 feature／DSL／truth-delta，忽略已確認的導航位置；或 B 類也要求 ui/index.html。
```

# Rule 2 - 缺少適用依據時只停止其依賴

- Level: `MUST`
- 缺少回追點名且確實適用的檔案、介面對應、呈現／行為依據或有效確認時，停止相關 Feature 範圍並回交 owner，不降低 Goal 讓 GREEN 通過。
- 缺分流或 B 類呈現依據回交 `/system-analysis`；實際需改設計升 C 回交 `/ui-plan`；缺業務行為回交規格 owner／`/dsl-refine`；缺契約、data、techstack 分別回交其 owner。
- C 的設計缺口或選用互動未決只阻擋依賴範圍；A／B 缺 ui/ 或合法不製作 prototype 不算缺交付。選用互動的證據缺漏才按其範圍回交。

## Good Example

```md
只缺 split/input 選用互動的決策：停止其 Feature，其他已明列且獨立的 B 類修正可排程。
```

## Bad Example

```md
C 類沒有已確認設計，把 Goal 改為「畫面可空白」後仍輸出 BDD-GREEN。
```

# Rule 3 - 品質關卡依適用產物安排，基準回填排在產品驗收之後

- Level: `MUST`
- truth 產物以該 Feature 的 Test Scope 全綠為 gate，不另加產物家族 review；回追到的 plan-side 設計或其他需獨立驗收的產物，在最後一個消費它的 Feature 後剛好加一題 `subagent review (<產物名> quality gate)`，同家族只一題。
- B 類僅引用既有依據不因此新增設計產物家族 gate，仍完成適用行為與畫面回歸；A 不排 UI gate。C 的 UI gate 包含固定基準＋本次設計對照，不能因基準位於 plan 外而省略。
- UI gate 讀本輪相關設計／預覽、有效確認、產品與差異證據，選用互動才讀其證據；通過條件依已載入共用契約。Test Scope 全綠不能替代設計比對；gate 不改 truth、不加 feature、不以重跑 GREEN 代替。
- 逐畫面比對與代表畫面 checkpoint 放在對應 task 完成條件，後續同版型任務明列依賴，不按每個 feature 加家族 gate。
- 需回填基準時，在適用產品驗收、最終 UI gate 與要求的回歸完成後另排回填及獨立核對任務，列寫入範圍與版本整合依據；回填的審查屬該任務完成證據，不再新增第二個產品 UI 家族 gate。

## Good Example

```md
三個 C 類 frontend Feature → 一次 UI gate＋適用完整回歸 → 相關基準回填 → 獨立核對。
B 類計算修正沿用既有畫面，完成行為與適用畫面回歸，無設計回填則記不適用。
```

## Bad Example

```md
每個 frontend Feature 都加一次 UI gate；或在產品尚未驗收前就把提案回填現況基準。
```
