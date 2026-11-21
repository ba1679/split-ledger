# Skill 工程編排與實作紀錄

## 任務資訊

- 處理路徑：`optimize`。
- 改動範圍：跨 skill 的 `step rewrite` 與共用契約抽取，保留 phase 拓樸。
- 目標 Skills：tasks、implement、bdd；僅同步會重新注入舊政策的 technical-research、dsl-refine、ui-plan 及共享文件。
- 授權：[原交接](risk-based-testing-handoff.md)。根因、方向及另開分支實作已確認，不重問相同閘門。
- 分支：`codex/skill-risk-based-testing`；worktree：`/Users/hsinhui/Desktop/Render-stuff/split-ledger-skill-risk-based-testing`；起點：`37e5968fc17d28aa925370c31cebdc52d84abaf4`。

## 預期、現況與根因

預期以主要手機旅程及 API／單元保護核心風險，桌機／第二瀏覽器選少量必要 smoke，桌機完整及無障礙由使用者集中人工驗收。保留真資料、帳務、權限、同快照與競態保障。

現況重演：007 的 103 條 DSL 分別成為 task，逐筆驗證延伸為許多 helper E2E；59 個前端語意案例展開 274 次。逐筆驗證沒有明文要求每句另寫 support spec，實作者選擇及缺少重用判準共同造成重複。上游 research 規則與模板另有「預設都是 E2E」，會重新推高範圍。

落差是驗證層、環境與人工責任未分清，不是全批 RED 的順序必然錯誤。候選清理項是上游全面 E2E 預設、每層重複的矩陣暗示與強制逐畫面人工確認；本次不刪產品測試，不重建 RED／GREEN 拓樸。

## 控制平面重建

- tasks 在拆任務前載入共用測試契約，按風險指定案例／環境／入口，分開自動 task 與集中人工確認。
- implement 在續跑時承接分工，逐筆重用適當驗證；bdd 執行已約定 Test Scope，保留原 Phase 3 review、GREEN／REFACTOR 與資源排程。
- research 在策略決策前載入同一政策；DSL 只在 plan-side 交接選取與人工映射，不為矩陣複製 truth。

## 來源能力保留策略

- 測試選取、helper 獨立失敗模式、工程策略與人工責任集中在 [testing-delivery.md](../../.agents/skills/shared/testing-delivery.md)，保留具體分類、風險理由與正反例，避免縮成「少寫測試」。
- 原 UI 分流、設計批准、可取回版本、差異紀錄、獨立審查及驗收後 baseline 保存在原共享契約；只改自查與集中人工的責任交接。
- 原精確計算、真 API／資料庫、權限、競態、RED 有效訊號及完整已約定回歸保留；低記憶體只影響排程。
- 全域 tdd、007 產品／測試／truth／tasks 狀態保持原樣；新政策不能自動豁免舊 plan 的既定責任。

## 步驟決策

| 原步驟／範圍                               | 決策                                 | 落點與完成條件                                             |
| ------------------------------------------ | ------------------------------------ | ---------------------------------------------------------- |
| tasks P1.5、P3.3、P4.6、P5.2               | rewrite                              | 載入共用契約，任務引用重用證據與明確驗證分工               |
| implement P1.3、P4.6、P5.2                 | rewrite                              | 接收案例／環境／人工責任，完成定義不再暗示逐 task 新增 E2E |
| bdd P1.3、P3.5–6                           | rewrite                              | 依已規劃 Test Scope 執行、自查與交付人工包                 |
| 跨 skill 測試判準                          | derive-rule／skill-form-rule         | 共用 testing-delivery 四條規則，主 SOP 回掛讀取時機        |
| tasks 範圍／集中人工輸出骨架               | derive-template／skill-form-template | 更新 tasks 骨架與完整範例，人工確認有真正依賴              |
| research 策略必問與預設、模板              | rewrite／delete                      | 有效政策直接承接，刪全面 E2E 預設及模板暗示                |
| UI／session／低記憶體契約                  | rewrite                              | 自查先推進、集中人工另列、完成全部已約定責任才交付         |
| Phase 3 全批 review、產品綠燈、既有 runner | keep-inline                          | 不改執行拓樸，不新增管理系統或測試 runner                  |

## 檔案動作

### 新增／更新

新增共用 testing-delivery 契約及本次交接／實作驗證紀錄。更新上述 SOP、直接相關規則與模板雙檔；引用盤點涵蓋六個 skills。

### 刪除

刪除全面 E2E 預設與相應誤導範例，改寫矩陣／人工驗收責任。沒有整檔刪除或被淘汰的孤兒模組。

## 驗證方式

修改前後執行既有 analyze_skill_references 腳本；另檢查共用指標、規則／SOP 結構、模板配對與範例任務依賴。以 007 及一般手機、WebKit 已知缺陷、待人工確認三情境文件走查，結果見 [驗證紀錄](risk-based-testing-validation.md)。僅文件改動，不跑產品全套。

## 實作閘門

交接已載明使用者明確授權實作，初版保持未提交供審閱。使用者後續要求同步 README 並開 PR 回 main，已授權本次提交、推送與建立 PR；不執行 merge，不修改原工作區未提交內容。PR 分支將本次變更移到 origin/main 基底，排除 007 文件 commit。
