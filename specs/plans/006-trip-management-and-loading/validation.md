# 006 實作驗證

## 執行契約與版本

- 日期：2026-11-14（Asia/Taipei）；起點 HEAD `7c1c35e67574e9d0bd29125592232735cabefb48`，分支 `codex/006-trip-management-planning`，入口 working tree clean。
- `profile=low-memory-16gb`；RAM 17,179,869,184 bytes。主代理 `/root` 實作，本 checkpoint 不需輔助代理；未恢復前一 chat 的 `/root/review_006`。保留上限主代理＋1審查者，重型工作1、test worker1、Chromium→WebKit。
- Node v24.22.2、pnpm11.25.0；所有命令經 `./scripts/pnpm.sh`。macOS arm64。入口 memory_pressure -Q free45%；swap used11961.50MiB，非壓力告警，持續比較趨勢。
- 程序登記：套件安裝 exec session25864；無本輪常駐服務。短命令正常退出為回收證據，工具環境到OS PID映射未知；exec可輪詢/中斷自己的session，未關閉使用者程序。
- 本輪 checkpoint=T001–T008 Setup/Foundation；下一範圍T009起。A類技術／骨架無可見UI變更；後續C類沿用tasks的design-v7批准、prototype不製作，畫面比對待產品實作。
- Hygiene：已核對git/docker/railway/eslint/prettier ignore，依賴、快取、環境檔、測試產物均已有涵蓋，本輪無必要增補。

## Setup

### T001 — PASS

- `apps/api/package.json`固定`@fastify/multipart@10.1.8`、`sharp@0.35.5`，lockfile含integrity與平台optional依賴。兩套件均無install script，未增加allowBuilds。
- npm官方registry連線timeout，原安裝session25864中斷exit130；以單次`--registry=https://registry.npmmirror.com --fetch-retries=0 --fetch-timeout=20000`成功安裝exit0，未變更repo/global registry設定；lockfile未寫mirror URL。
- 命令：`./scripts/pnpm.sh --filter @split-ledger/api add @fastify/multipart@10.1.8 sharp@0.35.5`（以上單次registry覆寫）；完整log `.cache/implement-006/t001-install.log`。
- manifest/安裝版本核對exit0：`.cache/implement-006/t001-versions.log`；`git diff --check` exit0。第一次用sharp/package.json export查版本被exports拒絕，改直接讀已安裝manifest成功。
- 安裝session82659已退出0，無本輪常駐服務；memory free33%，沒有壓力告警。變更版本=起點HEAD＋此task manifest/lockfile工作樹。

## 待跑矩陣

本輪各task的精確驗證見下方完成記錄；T009–T292所有DSL RED、獨立review、產品Green、兩瀏覽器／尺寸、Linux、資源、備份、人工與交付完整矩陣均待執行，不能用Setup smoke取代。

### T002 — PASS

- pnpm supportedArchitectures明列current＋Linux、current CPU＋x64、current libc＋glibc；macOS arm64與Linux glibc x64/arm64 optional套件可用。兩端BDD預設worker改1，仍可CLI `--workers=1`；不改測試project/案例矩陣。
- `./scripts/pnpm.sh install --frozen-lockfile --registry=https://registry.npmmirror.com --fetch-retries=0 --fetch-timeout=20000` exit0，log `.cache/implement-006/t002-install.log`；沒有變更部署或安裝腳本allowlist。
- 環境檢查入口 `./scripts/pnpm.sh --filter @split-ledger/api exec tsx tests/tools/image-environment.ts` exit0；log `.cache/implement-006/t002-environment.log`。確認三個平台的native套件可resolve、本機Chromium/WebKit executable存在；隔離worker DB以正式runner跑3個既有migration並finally刪除DB／關閉pool。不新增006 schema。
- 瀏覽器安裝入口 `./scripts/pnpm.sh exec playwright install chromium webkit`；已以`--dry-run`核對（log `.cache/implement-006/t002-browsers.log`），無須重新下載已安裝browser。
- focused ESLint exit0（`.cache/implement-006/t002-lint.log`）。配置可重現不代表Linux binary已實跑；Linux/Railpack實驗保留T284。
- sessions51276/49867/77114皆退出0，DB teardown完成；memory free39%，swap11849.50MiB低於入口，無本輪常駐runner。版本=前項工作樹＋本task設定／環境probe。

### T003 — PASS

- 新技術smoke入口：`./scripts/pnpm.sh --filter @split-ledger/api exec tsx tests/tools/image-smoke.ts` exit0，2項檢查均通過、無skip；完整log `.cache/implement-006/t003-smoke.log`。
- 真sharp將32×24 PNG135bytes轉WebP74bytes，讀回format/webp及32×24；macOS arm64 Node24.22.2、sharp0.35.5/libvips8.18.7。Fastify5.12.8註冊multipart10.1.8解析單檔，bytes完全一致、inject200；finally close測試實例。
- ESLint exit0，log `.cache/implement-006/t003-lint.log`。此為獨立parser/codec smoke，未註冊產品endpoint，不證明產品大小／安全／E2E或Linux可運行。
- session32887 exit0；無服務/fixture遺留，memory free40%。版本=前項工作樹＋`tests/tools/image-smoke.ts`。

## Foundational

### T004 — PASS

- 新增`apps/api/src/modules/trips/management/{lifecycle,thumbnail,receipts,dependencies}.ts`，僅內部型別與注入介面。版本用bigint，保留DB/clock/image processor/hooks邊界；既有routes、schema與app接線不變，無SQL／轉碼策略／purge。
- `./scripts/pnpm.sh --filter @split-ledger/api typecheck` exit0，log `.cache/implement-006/t004-typecheck.log`；focused ESLint exit0，log `.cache/implement-006/t004-lint.log`。檢查0錯誤，非產品BDD。
- session83676退出0；memory free39%，本輪無常駐服務。版本=前項工作樹＋management四個檔案。

### T005 — PASS

- API world新增tripManagement context：穩定trip/operation ID maps、bigint版本、帳務／縮圖／收據／保留ID／分類snapshot型別，可控clock/stream/transaction barrier介面；不實作Given或Then，不建表、不fake收據。fixture finally清理context且即使cleanup失敗仍dispose API。
- `./scripts/pnpm.sh exec playwright test -c playwright.support.config.ts apps/api/tests/support/trips.spec.ts --workers=1`：3/3 passed、0 skipped、exit0（`.cache/implement-006/t005-fixture.log`），既有真API／DB fixture回歸。
- 獨立cleanup故障probe：失敗時仍呼叫其他cleanup、清空registry、重複dispose安全，exit0（`.cache/implement-006/t005-cleanup.log`）。根目錄未提供tsx，改用API workspace的既有tsx入口。
- focused ESLint與`tsc --noEmit --strict --target ES2024 --module NodeNext --moduleResolution NodeNext --skipLibCheck apps/api/tests/support/trip-management/context.ts` exit0；logs `t005-lint.log`／`t005-typecheck.log`。
- sessions28833/19464/82098已退出0；測試worker PID34596已不存在，memory free38%。版本=前項工作樹＋context/world/fixtures變更。

### T006 — PASS

- 建立images資產目錄與來源／授權／checksum約定；新增原始檔SHA256／byteLength、真sharp metadata型別及可注入格式／exact-byte generator介面。實際格式／合法padding／動畫／方向fixture留給各RED task，沒有假Given結果。
- `withImageAssets`隔離mkdtemp，原始bytes只寫隔離檔，finally遞迴移除；hash probe核對原始bytes，成功與拋錯兩路徑均證明目錄不存在，exit0（`.cache/implement-006/t006-assets.log`，API workspace `exec tsx -e`）。
- focused ESLint與strict tsc（相同T005參數、入口改image-assets.ts）exit0，logs `t006-lint.log`／`t006-typecheck.log`。不是完整decode/boundary驗證。
- session66107退出0，暫存目錄已刪；memory free39%。版本=前項工作樹＋images/README、image-assets.ts。

### T007 — PASS

- 建立trips/management-page、thumbnail/editor-page、loading/observations邊界；頁面Locator、request/operation觀測、object URL created/revoked與response barrier為待用介面，保留正式UI Act。viewport契約1440×900／390×844，未改案例矩陣。
- `withResponseBarrier` finally release再dispose，可控回應而非sleep增加timeout；各DSL RED才實作真正攔截器／page actions，沒有假後端結果／步驟綁定／完整產品流程。
- focused ESLint與strict tsc（T005參數，入口上述3檔）exit0；logs `t007-lint.log`／`t007-typecheck.log`。失敗斷言probe確認release→dispose，exit0，log `.cache/implement-006/t007-barrier.log`。
- session15812退出0；本task未啟瀏覽器或server，memory free34%。版本=前項工作樹＋上述三個web test support檔。

### T008 — PASS

- 新增共用waiting phase與busy/skeleton/verify/paused props，以及圖片API upload/read輸入型別邊界（decimal string版本、File與AbortSignal）；皆為待用型別，既有QueryState/FormDialog/Button/API exports不變，未新增renderer、query接線、路由或查證實作。
- `./scripts/pnpm.sh --filter @split-ledger/web typecheck` exit0，log `.cache/implement-006/t008-typecheck.log`；focused ESLint exit0，log `.cache/implement-006/t008-lint.log`。非UI畫面或產品BDD驗收。
- session72667退出0，memory free36%、swap11927.44MiB低於入口；本輪無常駐產品服務。版本=前項工作樹＋waiting/types.ts及api/thumbnail.ts。

## Setup/Foundation checkpoint

- T001–T008均完成，T009–T292未勾選。產品schema/route/等待UI/DSL step尚未實作，所有後續完整矩陣保持待跑。
- 21個程式／測試／配置檔的固定內容索引：`.cache/implement-006/checkpoint-files.sha256`，索引本身SHA256 `576f59e5e2565f383859bdcfdf4e5e4d1cd4edf4c6ec596e60bf3cf072487487`。全部結果綁定HEAD `7c1c35e67574e9d0bd29125592232735cabefb48`＋該索引內容；未commit。
- 最後`prettier --check`覆蓋本輪新增/修改TS/JSON/YAML（lockfile沿用既有ignore）exit0，log `.cache/implement-006/checkpoint-format.log`；`git diff --check` exit0。
- 資源結束檢查memory free39%，未見壓力告警；測試worker34596已退出。受管安裝／測試／typecheck sessions全部已結束，無本輪常駐服務；瀏覽器僅核對安裝，沒有啟動瀏覽器。工具環境與代理到OS PID對應仍未知，不宣稱工具環境已回收。
- 本checkpoint沒有獨立review任務或findings；T240全批測試層獨立review仍待執行，不以Setup驗證取代。

## Phase 3 續跑（T009起）

- 入口復核21檔hash全部一致，HEAD未變；既有T001–T008證據保留。RAM16GiB、memory free36%、swap11478.25MiB，沿用主代理＋最多1審查者／重型1／worker1。沒有新增常駐程序或代理。
- ADD測試層逐句實作，不改truth/schema/routes/UI；Phase 3全批review關卡仍未解鎖。

### T009 — binding完成；產品schema RED／後續runtime待驗

- 精確Given綁定與完整baseline helper已寫入：Alice、日本/台南/Carol旅行、3成員含停用Bob、3支出7shares、200獨立還款＋800結清付款＋2個合法零差額、獨立BigInt oracle、真WebP、原始欄位/其他資料快照。purged安排透過真purge命令，不偽造收據或新增產品表。
- targeted ESLint及strict tsc exit0，logs `.cache/implement-006/t009-{lint,typecheck}.log`。
- focused逐句入口 `.cache/implement-006/red/T009.config.ts`＋T009.feature，僅測本句3種state的完整Given；不是原feature已通過。bddgen exit0無missing/ambiguous；runner exit1，3/3皆以 `Product migration must provide trips.deleted_at` 的權威斷言RED，無undefined/fixture SQL exception/skip。log `t009-bddgen.log`／`t009-red.log`。
- 尚未到達的真DB seed/oracle/purge分支均保留runtime待驗，須在T241/schema後複核，不能以同一schema斷言宣稱已驗後續語意。
- sessions82495/20725/30466/96977/42174/89175均結束（runner預期exit1）；memory free34%，fixture finally關閉server/pool/worker DB。

### T010 — binding完成；產品前序schema受阻／runtime待驗

- 精確When與commands.ts對六種操作建立一次真API請求：三個lifecycle POST、無本文DELETE、單檔multipart POST、新建原UUID；有效session/Origin、最新DB版本、全新operation UUID與完整請求均保存。沒有成功假回覆或產品碼。
- ESLint/strict tsc exit0；focused六操作scope的bddgen exit0、無missing/ambiguous；runner exit1，6個案例皆停在T009的權威schema斷言（trips.deleted_at），T010各分支尚未到達，不能稱產品命令RED或Green。logs `.cache/implement-006/t010-{lint,typecheck,bddgen,red}.log`；範圍配置與fixture在red/T010.*。
- sessions48636/87332已結束；memory free40%，單worker，無本輪常駐服務。T241與各Feature Green須複核全部命令實際執行與正式斷言。

### T011 — binding完成；產品前序schema受阻／runtime待驗

- 完整保存斷言比較原trip業務欄、全部子表/bytea/ID、原receipt、獨立有理數各成員各幣別餘額及DB數量；僅允許生命週期欄位與當次成功receipt改變。active普通GET/state及trash專用state皆做只讀再驗，未重演Act。
- ESLint/strict tsc/bddgen exit0。focused移入/復原2案例runner exit1，皆停T009 schema斷言；本句斷言尚未可達，T241與Green須runtime複核。logs `.cache/implement-006/t011-{lint,typecheck,bddgen,red}.log`，red/T011.*保存逐句測試閉包；未稱原feature已全綠。
- sessions51290/11124已退出（runner1），無本輪常駐服務。

### T012 — binding完成；產品前序schema受阻／runtime待驗

- 台南及Carol旅行的全部帳務、圖片、reservation/receipt與categories/auth.user/currencies逐欄完整比較；兩owner真GET再讀投影核對，最後DB不變。分類本體不刪，計算usageCount的合法purge引用減少不會被誤判資料列改動。
- ESLint/strict tsc/bddgen exit0；focused移入/復原/purge3案例runner exit1，均在T009產品schema斷言，本句runtime尚未可達。logs `.cache/implement-006/t012-{lint,typecheck,bddgen,red}.log`；沒有將前置RED算成此句斷言實跑。
- sessions31238/80118已結束，測試fixture finally回收；本輪無新增常駐服務。

### T013 — binding完成；產品前序schema受阻／runtime待驗

- 明列11種錯誤狀態/code對照；拒絕後全部DB/bytea/receipt/reservation與共享快照完整相等，owner專用state與可讀trip再查一致，錯誤不得含他帳號旅行識別/名稱。
- ESLint/strict tsc/bddgen exit0；已備妥前置的3種原feature消費（非trash purge、已purged重建/復原）focused runner exit1，皆因T009 schema guard。其他衝突/認證/Origin消費隨各Given及Green整檔複核，沒有改寫成不存在的測試前態。logs `.cache/implement-006/t013-{lint,typecheck,bddgen,red}.log`。
- sessions22376/9008已退出，runtime所有正式拒絕斷言仍待schema與產品前序，不宣告已跑到。

### T014 — binding完成；產品前序schema受阻／runtime待驗

- 同UUID移入trash：200的result/currentState精確比對、deleted_at、lifecycle恰+1、thumbnail/accounting不變、恰一不可重複收據及32-byte fingerprint；owner state及一般/垃圾桶limit1完整分頁再讀，query前後DB不變。
- ESLint/strict tsc/bddgen exit0；focused原B006-001閉包1案例runner exit1，停T009缺deleted_at斷言。此Then及分頁helper runtime待T241/Green；沒有用來源schema錯誤冒充已執行結果斷言。logs `.cache/implement-006/t014-{lint,typecheck,bddgen,red}.log`。
- sessions7030/26376已結束，無常駐服務；本筆只寫移入trash分支。

### T015 — binding完成；產品前序schema受阻／runtime待驗

- 新增復原Then，與T014共享精確transition helper：trash→active、deleted_at清空、原ID、revision+1、不可變版本與收據、state/兩清單再讀。為本句加入active分支，並保留T014 trash責任。
- ESLint/strict tsc/bddgen exit0；focused復原＋受影響T014共2案例runner exit1，皆在T009 schema guard；T014/T015正式transition runtime待T241與Green。logs `.cache/implement-006/t015-{lint,typecheck,bddgen,red}.log`。
- session35415退出，無本輪常駐server/worker。

### T016 — binding完成；產品前序schema受阻／runtime待驗

- 精確When依enum只送一次owner普通/trash GET，保存items/cursor與前態，不執行任何寫入或命令。
- ESLint/strict tsc/bddgen exit0；兩種清單focused runner exit1，均停T009 schema guard，本次GET runtime待T241/Green。logs `.cache/implement-006/t016-{lint,typecheck,bddgen,red}.log`。
- session43146已退出，無常駐服務。

### T017 — binding完成；產品前序schema受阻／runtime待驗

- Then以真DB owner+deleted_at篩選及游標排序推導完整投影，核對原GET預設50與limit1全頁，ID不重複/不遺漏、無外帳號；trash exact shape不得帶帳務，普通選單同一active資料源排除trash，前後DB/共享快照不變。
- ESLint/strict tsc/bddgen exit0；兩種狀態focused runner exit1，仍是T009缺deleted_at的正式斷言。logs `.cache/implement-006/t017-{lint,typecheck,bddgen,red}.log`；全分頁與投影runtime待T241/Green。
- session48545已退出，無本輪常駐服務。

### T018 — binding完成；產品前序schema受阻／runtime待驗

- purge200後全部8組專屬資料必已commit刪除，最小reservation/receipt精確欄位白名單，next lifecycle版本與結果/state分開，舊圖片/帳本404、兩清單無目標、收據再查一致且不寫入。復原拒絕由已綁定B006-010另一次When證明，本Then只讀不偷送復原命令。
- ESLint/strict tsc/bddgen exit0；focused原B006-007閉包1案例runner exit1，停T009 schema guard；purge、圖片讀取與整體斷言runtime待各產品前序及Green。logs `.cache/implement-006/t018-{lint,typecheck,bddgen,red}.log`。
- session24186已退出，fixture finally回收，無常駐服務。

### T019 — binding完成；原feature全檔生成／產品schema RED

- Given由DB時間建立可控clock、精確180天前deleted_at與新有效session；只安排歷史，不跑清除排程或目標操作，原內容逐欄不變並更新前態快照。
- ESLint/strict tsc exit0；直接引用truth原始`旅行垃圾桶與復原.feature`整檔bddgen exit0，全部7個Example有綁定、0missing/ambiguous；runner exit1、7/7在T009 schema guard，0skip。logs `.cache/implement-006/t019-{lint,typecheck,bddgen,red}.log`，配置red/T019.config.ts。
- 第一版focused config的featuresRoot不含truth路徑，被bddgen拒絕；已改正root並重跑，未把No tests found當驗證通過。T009–T019全檔runtime仍須T241/Green複核，schema斷言不是產品成功。
- sessions16474/38893已退出（首輪配置失敗、末輪預期RED1）；無常駐服務。

### T020 — binding完成；故障機制真DB通過／完整前序runtime待驗

- Given對trip UPDATE寫入後或purge expenses DELETE中段設owner/trip限定的測試fault；未執行目標Act。既有完整性trigger不禁用、不建產品表，非交易sequence只觀測是否真進入fault，所有測試DDL由scenario cleanup刪除。
- `playwright test -c playwright.support.config.ts apps/api/tests/support/trip-management/transaction-fault.spec.ts --workers=1` exit0、1/1passed、0skip：真既有expense/shares刪除中途P0001且rollback完全，sequence證明fault已觸發；dispose重複安全。log `.cache/implement-006/t020-mechanism.log`。
- ESLint/strict tsc/bddgen exit0；完整Given閉包3案例runner exit1，仍停T009 schema guard，三種產品命令fault可達性待T241/各Green。logs `t020-{lint,typecheck,bddgen,red}.log`。
- sessions56686/78925結束；mechanism worker61563已不存在；memory free40%，無常駐服務。測試fault不是產品schema或purge實作。

### T021 — binding完成；產品前序schema受阻／runtime待驗

- Then先以sequence證明正式交易確已進入故障點；404/早期拒絕不能冒充中途失敗。按既有app契約驗500 INTERNAL_ERROR且不洩漏SQL/fault資訊；全DB/bytea/版本/reservation/receipt與共享資料逐欄回滾，state只讀一致。
- ESLint/strict tsc/bddgen exit0；原B006-012完整句型閉包3案例runner exit1，皆停T009schema guard，三命令的真fault路徑待Green複核。logs `.cache/implement-006/t021-{lint,typecheck,bddgen,red}.log`。
- session38596已退出，單worker無本輪常駐服務。

### T022 — binding完成；產品前序schema受阻／runtime待驗

- Given以真fault與真前次命令安排已失敗狀態，核對交易rollback後finally移除故障；保存前次operationId、完整快照與無成功receipt，新重試只留給When，不在Given預先重試。
- ESLint/strict tsc/bddgen exit0；三種前次失敗focused案例runner exit1，仍停T009schema guard，失敗安排/故障解除完整路徑待Green複核。logs `.cache/implement-006/t022-{lint,typecheck,bddgen,red}.log`。
- session18121已退出，無本輪常駐服務。

### T023 — binding完成；產品前序schema受阻／runtime待驗

- 新重試成功Then驗新operationId與kind，重用已逐句建立的state/receipt、帳務保留或完整purge斷言及共享資料不變；前次失敗不可有receipt，當次僅一receipt，不重建/重複資料。
- ESLint/strict tsc/bddgen exit0；原B006-013完整閉包3案例runner exit1，停T009schema guard；前次失敗→當次成功完整路徑待Green。logs `.cache/implement-006/t023-{lint,typecheck,bddgen,red}.log`。
- session74096已退出，無本輪常駐服務。

### T024 — binding完成；產品前序schema受阻／runtime待驗

- 11種普通旅行/子資源GET逐一對應契約路徑，使用Given真實支出/還款/結清/縮圖ID；新增Given保留且DB確認不存在的expense UUID，用於先驗trip狀態案例。單次owner GET不繞trash投影，保存精確前態。
- ESLint/strict tsc/bddgen exit0；從原truth擷取完整B006-014 Rule（不刪步驟）生成11例，runner exit1且全部在T009schema guard，runtime待Green。logs `.cache/implement-006/t024-{lint,typecheck,bddgen,red}.log`。
- session49544已退出，無本輪常駐服務；T009基準新增只讀未知ID安排，沒有改產品schema。

### T025 — binding完成；產品前序schema受阻／runtime待驗

- 14種寫入皆為有效schema/body：expense/member/trip PATCH或POST/DELETE、部分還款、真先前付款安排快照、真PNG與完整圖片命令headers。只送一次目標Act，不以UI阻擋代替後端驗證。
- 為取得「先前有效表單」，基準在安排trash前讀真settlement view並用獨立oracle確認TWD300，保存不透明key/版本；增設無引用的Charlie供合法成員DELETE，原Alice/Amy/Bob三人晚餐、停用Bob、完整帳務與7shares不變。這是測試資料擴充，既有3成員基準的歷史執行證據不代表此版已走完seed。
- ESLint/strict tsc/bddgen exit0；原B006-015完整14例runner exit1，均停T009schema guard（無undefined/ambiguous），全部寫入/表單實際可達性仍待schema與Green。logs `.cache/implement-006/t025-{lint,typecheck,bddgen,red}.log`。
- sessions70333/71287退出，單worker、無常駐服務；受影響T009基準的語意與版本變更已明記，後續全檔需以此最新版重驗。

### T026 — binding完成；產品前序schema受阻／runtime待驗

- Given準備Carol有效另一帳號、訪客無session、Amy自己的auth帳號但仍僅Alice同行者。用真owner移入/復原產生已提交收據並保留原active/trash狀態，不製造fake receipt；保留真trip/record/thumbnail/operation與兩版本及DB已確認的未知UUID對照，更新前態快照。
- ESLint/strict tsc/bddgen exit0；active/trash×3actor六案例runner exit1，均在T009schema guard，actor/receipt安排runtime待Green。logs `.cache/implement-006/t026-{lint,typecheck,bddgen,red}.log`。
- session94184已退出，無本輪常駐服務。

### T027 — binding完成；產品前序schema受阻／runtime待驗

- 10種讀取/命令依已安排actor session、真ID/receipt與目前兩版本送一次請求；生命週期JSON、真完整PNG multipart、DELETE無本文都符合契約，可信Origin不短路owner驗證，trash圖片採其正式私有路徑。
- ESLint/strict tsc/bddgen exit0；十種操作focused runner exit1，停T009schema guard；各actor×state全量由T028整檔收集，實際owner隔離仍待Green。logs `.cache/implement-006/t027-{lint,typecheck,bddgen,red}.log`。
- session68219已退出，無本輪常駐服務。

### T028 — binding完成；原隔離feature全85例schema RED／runtime待驗

- Then驗guest401、登入非owner404且與未知ID只讀對照回應完全一致，trash list只含actor本人投影；錯誤只允許code/message、不洩漏Alice UUID/名稱/receipt/版本/圖片bytes。DB/所有receipt與owner專用state/圖片再讀完全一致。對拒絕寫入的未知ID控制採只讀state查詢，Then不另送第二命令。
- 修正actor headers的TS union問題，並使guest明確空Cookie不沿用API context登入；補足分頁shape正式斷言。最新ESLint/strict tsc exit0，logs `.cache/implement-006/t028-{lint,typecheck}.log`。
- 直接引用truth原始`垃圾桶存取與擁有者隔離.feature`整檔：bddgen/list exit0，85個唯一展開案例（11讀取＋14寫入＋60隔離）無missing/ambiguous。完整單worker runner exit1，85/85全在 `Product migration must provide trips.deleted_at` 正式斷言，0skip；不是產品權限已通過。log `t028-red.log`，`t028-list.log`與red/T028.config.ts。
- 首輪因發現型別錯誤中止exit130，不計入矩陣；log `t028-red-interrupted.log`。全部該輪受管worker PID已退出、對應隔離DB無殘留（`t028-interrupt-{processes,databases}.log`）。修正後完整85例從頭重跑，不混加不同版本結果。
- sessions40646/55648/79135均已結束，最後memory free40%；尚未到達的actor/命令/Then完整runtime仍待T241與各Feature Green。版本索引 `.cache/implement-006/phase3-t028-files.sha256`，57個實作檔，索引SHA256 `c81aaae802a60e39d164e48da3c773829c0decaa22a242514bfa92e1e57de12f`。

### T029 — binding完成；產品前序schema受阻／runtime待驗

- Given五種組合均由正式命令產生已提交原receipt與完整原請求/bytes，後續真復原或保存海邊形成較新狀態；海邊實際像素/版本驗證、purged無可復原資料，原receipt逐欄不變。場景丟棄原回應，測試保留DB權威證據，不製造成功receipt、不在When重演前序。
- ESLint/strict tsc/bddgen exit0；五組focused runner exit1，皆停T009schema guard，各Given/API/圖片/purge前序仍runtime待驗。logs `.cache/implement-006/t029-{lint,typecheck,bddgen,red}.log`。
- session31258已退出，無常駐服務。

### T030 — binding完成；產品前序schema受阻／runtime待驗

- When僅以原trip/operation UUID讀一次owner收據端點，result/currentState分欄保存，不重送命令、不重建ID。保存當下完整前態供Then驗證。
- ESLint/strict tsc/bddgen exit0；五組原次/目前狀態focused runner exit1，皆停T009schema guard，本次查證runtime待Green。logs `.cache/implement-006/t030-{lint,typecheck,bddgen,red}.log`。
- session17452已退出，無本輪常駐服務。

### T031 — binding完成；產品前序schema受阻／runtime待驗

- Then以原DB receipt逐欄推導result，以目前DB/reservation推導currentState，驗原receipt與全部資料不變、owner state一致及Carol讀原operation404且無識別/內容洩漏，沒有重演命令。
- ESLint/strict tsc/bddgen exit0；原B006-017完整五組runner exit1，全部停T009schema guard；原結果/較新狀態正式比對runtime待Green。logs `.cache/implement-006/t031-{lint,typecheck,bddgen,red}.log`。
- sessions52955/56378已結束，無常駐服務。

### T032 — binding完成；產品前序schema受阻／runtime待驗

- When只重送一次原method/path、operation UUID、完整body/預期版本與原圖片bytes；保留原意圖，不改用當前版本或新operationId，等待完整response。
- ESLint/strict tsc/bddgen exit0；五組focused runner exit1、5個trips.deleted_at schema斷言，本次重播runtime待Green。logs `.cache/implement-006/t032-{lint,typecheck,bddgen,red}.log`。
- session69085已退出，無常駐服務。

### T033 — binding完成；產品前序schema受阻／runtime待驗

- 原receipt replay後驗result/目前狀態、DB全部來源/bytes/revision/receipt數量完全不變；只讀目前私有圖等於較新DB bytes、過期revision/已刪兩種圖路徑404，不復活purged或重新移入已復原旅行。
- ESLint/strict tsc/bddgen exit0；原B006-018完整五組runner exit1，5個T009schema guard；正式重播與圖片查證runtime待Green。logs `.cache/implement-006/t033-{lint,typecheck,bddgen,red}.log`。
- session27476已退出，無常駐服務。

### T034 — binding完成；真row-lock機制通過／完整產品前序待驗

- Given用真trip row lock攔住已送達的正式trash POST；pg_blocking_pids證明命令已進DB等待、receipt尚不可讀。保留原operation/版本與前態，finally釋放鎖、等待原請求、關閉response/client；不製造空收據假象、不用sleep猜時序。
- `playwright test -c playwright.support.config.ts apps/api/tests/support/trip-management/row-lock.spec.ts --workers=1`：1/1passed、0skip、exit0，真既有PATCH writer被擋、釋放後200且DB名稱更新；log `.cache/implement-006/t034-mechanism.log`。故障路徑也在finally等待/釋放response，無懸掛promise。
- 修正prefer-const報告；最新ESLint/strict tsc/format/bddgen exit0。Given focused1例runner exit1，停T009schema guard；正式trash等待→收據查證全鏈仍待Green。logs `t034-{lint,typecheck,format,bddgen,red}.log`。
- sessions80042/21188/48584已退出，單worker無常駐服務；row-lock支援不改產品schema或routes。

### T035 — binding完成；產品前序schema受阻／runtime待驗

- 收據lookup必為404 OPERATION_NOT_FOUND且只有錯誤資訊，原請求仍真被trip lock擋住、原trip為active，DB/receipt與共享資料無變化；不看清單缺項/普通404、不推論命令失敗。teardown才釋放原命令並驗可提交200。
- ESLint/strict tsc/bddgen exit0；原B006-019完整1例runner exit1，停T009schema guard；原POST等待→GET404→原POST提交整鏈runtime仍待Green。logs `.cache/implement-006/t035-{lint,typecheck,bddgen,red}.log`。
- session18318已退出，無本輪常駐服務。

### T036 — binding完成；產品前序schema受阻／runtime待驗

- Given以另一真session完成移入/復原或保存圖片後，保留舊版本；同ID異內容案例先取得真receipt，再沿用原ID/原預期版本並改真圖片bytes。目標Act僅由When送出，測試側一次性override保留精確過期意圖，不修改產品碼。
- ESLint/strict tsc/bddgen exit0；原B006-020完整3案例runner exit1，皆停T009schema guard；版本/指紋衝突判定仍runtime待Green。logs `.cache/implement-006/t036-{lint,typecheck,bddgen,red}.log`。
- session75741已退出；T010共用helper新增可選另一session與明示override（預設仍最新版本/新UUID），未受影響呼叫仍採原規則。

### T037 — binding完成；產品前序schema受阻／runtime待驗

- Given以第二owner session、真trip row lock與pg_blocking_pids安排先完成操作，釋放屏障並等真201/200提交後才返回目標Act；點心真落地/兩shares/獨立JPY oracle、trash版本或完整purge均核對。原已開表單UUID與前態保留，不用sleep猜順序。
- ESLint/strict tsc/bddgen exit0；保存點心/移入/purge三組focused runner exit1，皆停T009schema guard，正式各writer路徑待Green。logs `.cache/implement-006/t037-{lint,typecheck,bddgen,red}.log`。
- session47537已退出；所有安排路徑finally release並await原pending，無本輪常駐服務。

### T038 — binding完成；產品前序schema受阻／runtime待驗

- When用先前表單UUID與固定Alice/Amy資料一次POST JPY500點心，保留兩裝置先後前態，不因trash自行復原或換ID。
- ESLint/strict tsc/bddgen exit0；focused1例runner exit1，停T009schema guard，實際expense writer串行化待Green。logs `.cache/implement-006/t038-{lint,typecheck,bddgen,red}.log`。
- session57232已退出，無常駐服務。

### T039 — binding完成；產品前序schema受阻／runtime待驗

- Then拒絕分支驗409 TRIP_TRASHED、無點心/shares或任一來源改動；成功分支完整驗201、唯一JPY500/日期/分類/兩shares、原來源ID逐欄保留、獨立多幣別有理數oracle及單次accounting revision，owner再讀一致。
- ESLint/strict tsc/bddgen exit0；原B006-021完整1例runner exit1，停T009schema guard。DSL定義的成功分支亦已實作，但目前此句truth僅消費拒絕值，不另虛構案例或冒稱成功分支已實跑。logs `.cache/implement-006/t039-{lint,typecheck,bddgen,red}.log`。
- sessions62270/54576已退出，無常駐服務。

### T040 — binding完成；產品前序schema受阻／runtime待驗

- 點心先201提交後移入trash，Then驗移入200/result/receipt、恰一點心與兩shares，從原無點心快照獨立算oracle、完整原始IDs/帳務/圖片保留、accounting與lifecycle各恰+1、只有一個新receipt。
- ESLint/strict tsc/bddgen exit0；原B006-022完整1例runner exit1，停T009schema guard，兩writer先後完整runtime待Green。logs `.cache/implement-006/t040-{lint,typecheck,bddgen,red}.log`。
- session2928已退出，無常駐服務。

## T009–T040 目前進度保存

- 共32個ADD DSL row已逐筆完成binding/測試語意、驗證與tasks回寫；加Setup/Foundation合計40/292，下一筆T041。Phase 3全批T240獨立review仍未解鎖，未進Green，不宣告plan交付。
- 最終全部新step/helper（含兩個support spec）ESLint、Prettier、strict tsc均exit0；logs `.cache/implement-006/t009-t040-final-{lint,format,typecheck}.log`。`git diff --check` exit0。
- 最新共用命令helper版重收已完成競爭Rules B006-012/013/017/018/019/020/021/022：8個完整原Rule、22個展開案例，bddgen/list exit0，runner exit1；22/22都明確缺trips.deleted_at，沒有undefined/ambiguous/skip。logs `t009-t040-competition-{bddgen,list,red}.log`，入口red/T009-T040-competition.config.ts。未取用尚未實作的B006-023，也不把這個subset當整份competition feature或Phase 3 review完成。
- 原生命週期7例在T025新版基準後重生成/重跑，7個相同schema斷言（`t009-t028-lifecycle-{bddgen,red}.log`）。隔離85例的執行證據屬T028當時固定版；後續新version不能混加這些RED當產品Green或最終矩陣。
- 78個程式/測試/配置檔固定內容索引：`.cache/implement-006/phase3-t040-files.sha256`，索引SHA256 `0a6690dd0600e86d45c910fe23f74e1bf9a446bb2becbbc465e64fde7bd201d7`。起點仍HEAD `7c1c35e67574e9d0bd29125592232735cabefb48`＋此未提交索引內容。Setup的21檔hash全部一致，Phase 3未改產品碼；truth diff為空。
- 全部已保存log中272個受管worker PID盤點均不存在，所有對應`ledger_test_<pid>_<任意worker編號>` DB均無殘留；logs `final-managed-processes.log`／`final-managed-databases.log`。修正先前T028中止盤點只查worker0的侷限，此次依PID prefix涵蓋所有worker index。
- 所有本輪exec sessions均結束，包括預期RED runner1與首輪T028中止130；無本輪常駐API/browser/DB client。最後memory free45%、swap12230.75MiB（較上一量測12254.75下降24MiB；較入口增加，未見壓力告警），不以此宣稱整個系統或未知工具環境已回收/穩定。未建立輔助代理，未處理使用者程序。
- 下一範圍T041–T043圖片處理/commit屏障，再T044起其餘DSL；所有真seed、命令、Then在schema/API前序後仍須逐句runtime複核。各Feature Green、全量API/Web/品質、兩瀏覽器/兩尺寸、Linux/資源/備份/人工/UI與基準回填矩陣維持待跑。沒有commit/push/部署。

### T041 — binding完成；產品前序schema RED／runtime待驗

- Given以完整真PNG、原兩版本與新operation UUID啟動唯一正式multipart POST；測試在真sharp WebP原生輸出完成後延遲交付，未替換decoder或bytes，證明DB尚未提交。finally release/restore prototype並await/dispose原請求。
- native-image-gate support機制測試1/1passed、exit0：Promise與callback兩種真native結果hash不變、釋放前不交付、原prototype恢復。log t041-mechanism.log。新圖片正式HTTP鏈因產品schema前序受阻仍待驗，不宣稱native單測等於產品Green。
- 2026-11-15恢復78檔fingerprint全部一致；RAM16GiB、入口free42%/swap12250.12MiB，沿用low-memory主代理/單重型/單worker。依使用者「不要停」持續推進，不以小組任務數作停止點。

- ESLint/strict tsc/bddgen/list exit0；runner exit1、1/1皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t041-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t041-files.sha256`，索引SHA256 `2be106e636141417417e3582008fa9db357d1b93d7ec68dfc83f2f20b597f4d4`；命令均結束，單worker，無刻意保留服務。

### T042 — binding完成；產品前序schema RED／runtime待驗

- When只釋放已在Given送達且完成真native轉碼的唯一POST，等待其正式transaction重驗原版本/狀態後回應；不重送圖片、不復原旅行，保存先完成意圖的前態供Then比對。

- ESLint/strict tsc/bddgen/list exit0；runner exit1、2/2皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t042-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t042-files.sha256`，索引SHA256 `de0b5a6d0db241e46f4e05396d4f10dca3b58fc44104654a95cf1afe7df549fc`；命令均結束，單worker，無刻意保留服務。

### T043 — binding完成；產品前序schema RED／runtime待驗

- Then依目前trash/purged/過期active狀態驗正確409 code，整個DB/版本/bytea/收據保持另一意圖已提交的快照；本圖片operation無成功receipt，trash保留原富士山，purged無任何圖，兩路舊URL與普通trash權限均真GET核對。

- ESLint/strict tsc/bddgen/list exit0；runner exit1、2/2皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t043-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t043-files.sha256`，索引SHA256 `3c63ead9908ad92a8a3b44e6460b423ccbfd1b5dfc45869ce53e1fc1a66c1347`；命令均結束，單worker，無刻意保留服務。

### T044 — binding完成；產品前序schema RED／runtime待驗

- Given生成真靜態JPEG/PNG/WebP，以JPEG COM、合法PNG ancillary chunk及CRC、RIFF JUNK chunk達指定精確bytes；核對header/真metadata並全native decode（stats），不mock尺寸。原檔hash、檔案路徑/bytes保存於scenario臨時目錄，finally清理。
- 15個原truth格式/容量/像素邊界機制案例全部通過（含10MiB±1、25MP±超界、單邊16384/16385及1px）；另成功/失敗暫存生命週期1例，共16/16 support passed、exit0，log t044-mechanism.log。這些證明fixture有效，不是產品接受政策已通過。

- ESLint/strict tsc/bddgen/list exit0；runner exit1、15/15皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t044-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t044-files.sha256`，索引SHA256 `c2dbb8ebaf73b5115e95b1828154e9568da82f68b5f830bb8710ef3f20ac1b80`；命令均結束，單worker，無刻意保留服務。

### T045 — binding完成；產品前序schema RED／runtime待驗

- When核對原始檔/bytes/hash一致，記錄新operation UUID與目前兩版本，單次正式POST送真multipart原檔（保留所有選定part，不忽略第二檔），有效session/Origin不mock後端回覆；保存前態及原hash供Then查證。

- ESLint/strict tsc/bddgen/list exit0；runner exit1、15/15皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t045-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t045-files.sha256`，索引SHA256 `bf4fc16fbca2d13ede6e6beaab699a373a21d4b650c3758eb3fb752a1d84ca93`；命令均結束，單worker，無刻意保留服務。

### T046 — binding完成；產品前序schema RED／runtime待驗

- Then完整驗200 save_thumbnail原結果/目前狀態、恰一DB WebP可真解碼、metadata/bytea與binary GET相等、新thumbnail revision恰+1及唯一收據；原lifecycle/accounting/全部帳務與其他旅行不變，舊revision404，私有headers與Trip hasThumbnail/version再讀一致。

- ESLint/strict tsc/bddgen/list exit0；runner exit1、11/11皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t046-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t046-files.sha256`，索引SHA256 `764d7df5815484e38cebc4a3a824c0b0175252b576f6aad090f0e7db892bb96c`；命令均結束，單worker，無刻意保留服務。

### T047 — binding完成；產品前序schema RED／runtime待驗

- Then按DSL九種原因映射精確HTTP/code，要求非空可理解訊息；全DB/原bytea/版本/所有帳務與其他旅行完全不變、無新成功receipt，真GET原revision bytes與private headers/state仍一致。錯誤原因使用既定API code family映射，不另發明reason欄位或限定UI文案。

- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t047-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t047-files.sha256`，索引SHA256 `67dc652f2e704dfb973d6bd312b22af6f72d582486509f649a15bfc76d7fecbd`；命令均結束，單worker，無刻意保留服務。

### T048 — binding完成；產品前序schema RED／runtime待驗

- Given涵蓋16種真內容：固定系統原生編碼HEIC/HEIF（authoring已解碼驗證、SHA記assets README）、真AVIF/GIF/動畫WebP/兩頁TIFF/SVG/PDF、兩個實際影格的APNG；偽裝只改檔名/MIME，零尺寸PNG仍有有效CRC，截斷/文字/空檔明確不合法。原始bytes/hash/檔案皆保存且scenario finally清理，不fake decoder metadata。
- support機制16/16passed、exit0（t048-mechanism.log），核對多幀/多頁、獨立解碼APNG兩影格與格式/CRC/容器。修正空Buffer的同步constructor錯誤需由Promise拒絕斷言捕捉，不把機制失敗計為通過。格式參照W3C PNG3與IANA image/heif，連結與來源/hash記於assets README。

- ESLint/strict tsc/bddgen/list exit0；runner exit1、16/16皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t048-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t048-files.sha256`，索引SHA256 `8e73b3f986dae0bf637435526a3d60362e551f18e1ab2357a7279eadce3a709f`；命令均結束，單worker，無刻意保留服務。

### T049 — binding完成；產品前序schema RED／runtime待驗

- Given兩張各自真解碼的靜態JPEG（各65536bytes、不同尺寸/hash）均保留至同一multipart，重複image part名稱，沒有只取第一檔或用壞file input替代。
- 獨立真Fastify multipart parser機制1/1passed、exit0，兩個part名稱/filename/MIME/完整bytes逐一一致，log t049-mechanism.log。完整truth圖片格式與容量feature現在32例可生成，本次整檔收集/RED，不把parser單測當產品拒絕已通過。

- ESLint/strict tsc/bddgen/list exit0；runner exit1、32/32皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t049-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t049-files.sha256`，索引SHA256 `f49fcaf2bb1116ed69afa47f938329423292d4b1ac56ccbe414c08cd49666726`；命令均結束，單worker，無刻意保留服務。

### T050 — binding完成；產品前序schema RED／runtime待驗

- Given生成真Exif orientation/GPS TIFF rational及ICC資訊，直拍照片具獨立90°方向後角落座標/48×80 oracle；複雜1600×1200固定種子噪點真JPEG且確認首個candidate超512KiB、次個能成功；小圖為1×1半透明PNG並保留metadata，驗不放大/透明度。
- 三種photo fixture support 3/3passed、exit0，實際解析GPS/ICC/方向及raw像素、hash與隔離檔保存；log t050-mechanism.log。Tag來源CIPA與說明記assets README，未mock sharp或替產品宣告正規化已通過。

- ESLint/strict tsc/bddgen/list exit0；runner exit1、3/3皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t050-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t050-files.sha256`，索引SHA256 `2f29b57fa286baeb8973c979fceae654bdd05da9e208c95e1a876246577044b7`；命令均結束，單worker，無刻意保留服務。

### T051 — binding完成；產品前序schema RED／runtime待驗

- Then驗唯一可真解碼WebP/<=512KiB、sRGB、無原EXIF/GPS/ICC/XMP/IPTC/方向標記，DB只含當前縮圖欄位；真bytea/binary GET相等、原帳務與其他圖不變。獨立角落/48×80驗方向與不裁切、固定噪點應960×720成功而非timeout，小圖1×1不放大且alpha128/原色未被flatten或錯誤premultiply。

- ESLint/strict tsc/bddgen/list exit0；runner exit1、3/3皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t051-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t051-files.sha256`，索引SHA256 `800098c8ea9dd5cac2329e366f2bb7cc8c917534bf7914e1cfe35b624afb875c`；命令均結束，單worker，無刻意保留服務。

### T052 — binding完成；產品前序schema RED／runtime待驗

- Then驗reset_thumbnail 200、DB無縮圖、thumbnail revision恰+1、唯一false收據及currentState/Trip hasThumbnail=false；舊與新自訂圖URL皆404、原帳務/其他圖與lifecycle/accounting不變，所有再讀不寫入。

- ESLint/strict tsc/bddgen/list exit0；runner exit1、1/1皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t052-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t052-files.sha256`，索引SHA256 `3fb5cf0b5162938a16aa0b186c3987264a767602db137fa180f64644bf4b5213`；命令均結束，單worker，無刻意保留服務。

### T053 — binding完成；產品前序schema RED／runtime待驗

- owner僅送一次實際私有圖片GET，保留binary/JSON；舊版本來自基準已提交的真實縮圖revision1，基準第二個SQL transaction更換為富士山revision2，沒有虛構receipt或在When更換圖片。purged沿用刪除前垃圾桶URL。
- 基準版本由1改2，其他測試動態讀版本；這是test fixture安排，沒有產品程式變更。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、5/5皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t053-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t053-files.sha256`，索引SHA256 `c097371511d9081a45643c9e85e2b165d6b7cbb1d746a2d7e2c10b53272ad48d`；命令均結束，單worker，無刻意保留服務。

### T054 — binding完成；產品前序schema RED／runtime待驗

- 私有GET驗證實際WebP bytes完全等於DB目前圖、private no-store/nosniff、無query/token。舊版/purged回404 NOT_FOUND JSON且不含圖片；普通垃圾桶路徑409 TRIP_TRASHED。完整DB與receipt/shared快照不變。
- 原保存與私有讀取feature的9個案例整體binding驗證。

- ESLint/strict tsc/bddgen/list exit0；runner exit1、9/9皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t054-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t054-files.sha256`，索引SHA256 `343ec63dbf8501420200d030c150b88da21a1edf1eddd5cff47816de56e6d64c`；命令均結束，單worker，無刻意保留服務。

### T055 — binding完成；產品前序schema RED／runtime待驗

- 12種傳輸條件使用真實multipart/HTTP socket；前置Alice富士山帳務基準，所有正常headers真實版本，逐項僅改目標違規。總量10551297含合法preamble+10MiB圖；截斷multipart與未end串流分開。
- decoder/忙碌用原生Sharp輸出屏障，忙碌Given送第一筆真request並等原生處理到達；無mock parser/transaction。timeout沿用正式60s/10s設定，Green的此feature測試需至少95s測試預算，機制不以縮短產品期限代替。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、12/12皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t055-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t055-files.sha256`，索引SHA256 `2f0cc16266d68d7ad197ce6ae43e5c19d66b93ec3e3a3d60d5517f55d888f0d1`；命令均結束，單worker，無刻意保留服務。

### T056 — binding完成；產品前序schema RED／runtime待驗

- When僅送一次真實POST，保留完整HTTP/連線中止結果，未結束串流等正式deadline、native屏障等正式decoder timeout；不另重試。fixture safety timeout95s不能當產品timeout成功。
- raw-upload獨立真HTTP server機制測試驗證binary/held chunked/end/abort與finally回收。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、12/12皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t056-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t056-files.sha256`，索引SHA256 `58e60d818bb11fee996a079297f0351fdfc598eea48190a046bc0d9f2403dde7`；命令均結束，單worker，無刻意保留服務。

### T057 — binding完成；產品前序schema RED／runtime待驗

- 精確status/code驗證全部12傳輸結果，只有截斷/逾時可接受真實ECONNRESET/EPIPE無response；fixture95s safety錯誤不得算成功。忙碌另等Given第一筆真job的正式10s處理timeout後回收，不提交測試用第一筆。
- 釋放原生屏障並drain event loop後，驗證完整帳務/圖片bytes/版本/receipts與shared快照相同，兩個operationId均無成功receipt。完整傳輸feature12case binding。

- ESLint/strict tsc/bddgen/list exit0；runner exit1、12/12皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t057-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t057-files.sha256`，索引SHA256 `05b3a3b206aee6142ec75dae7a7957125a209a0f0caf2ae4d57e7388faa4a35f`；命令均結束，單worker，無刻意保留服務。

### T058 — binding完成；產品前序schema RED／runtime待驗

- 使用已合法提交的005還款/結清/一對差額與固定owner基準，驗證一般旅行、owner1、repayment2、settlement1、adjustments2，保存完整快照。沒有purge context或授權。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、7/7皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t058-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t058-files.sha256`，索引SHA256 `22764ed432b836847fee9b585804fca497074696cb1fc0a0522522d12d6e7781`；命令均結束，單worker，無刻意保留服務。

### T059 — binding完成；產品前序schema RED／runtime待驗

- 每例普通BEGIN僅一次目標UPDATE/DELETE，使用真實owner或immutable歷史ID；capture SQLSTATE/message/where/rowCount並finally回滾，沒有purge授權或API Act。
- 同時修正T055 fixture JPEG標籤為既有generator正式支援的JPEG .jpg；此誤用被前序schema guard遮蔽，未聲稱其runtime通過。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、7/7皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t059-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t059-files.sha256`，索引SHA256 `648111eec1230492988155bf8d735994e035fb49dab2cc70d7dc10f69da3e13e`；命令均結束，單worker，無刻意保留服務。

### T060 — binding完成；產品前序schema RED／runtime待驗

- 7種一般歷史修改都須由正式owner/payment trigger拋出23514 immutable，不能將FK/其他拒絕當作通過；交易回滾後完整資料/ID/快照不變。
- Given加記原生members、兩筆repayment、settlement單筆與付款安排GET前態，Then逐一精確比對普通GET，不重演purge；T059回滾finally保證client釋放。
- 原整趟永久刪除feature共11例binding/RED驗證。

- ESLint/strict tsc/bddgen/list exit0；runner exit1、11/11皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t060-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t060-files.sha256`，索引SHA256 `e6ffdff21d0798c6e6e6b50e37dad382cca48794ead261592d9f2e0ce3ecd4a8`；命令均結束，單worker，無刻意保留服務。

### T061 — binding完成；產品前序schema RED／runtime待驗

- 隔離Alice session、日本旅行trash、餐飲與單一午餐引用；真實DB確認只有一筆引用、expense FK及deleted_at。沿用正式005owner/share constraints，不先刪分類。保存trip/category/expense穩定ID與完整帳務前態。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、1/1皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t061-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t061-files.sha256`，索引SHA256 `87a8753f7c28d9eba7947305db0eb477ad462f91ae6a20505c8826d1247f0201`；命令均結束，單worker，無刻意保留服務。

### T062 — binding完成；產品前序schema RED／runtime待驗

- owner session一次GET /api/categories，保留原始response；不改DB、不以普通旅行GET繞過trash查詢。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、1/1皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t062-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t062-files.sha256`，索引SHA256 `69acf897dec31ae73b69e8726d6440ca317d4637ceddd640fbca03ae03a70fc1`；命令均結束，單worker，無刻意保留服務。

### T063 — binding完成；產品前序schema RED／runtime待驗

- response指定category恰一次、usageCount=1；真DB全部引用恰單筆且trip trash/FK/ID一致，普通GET category精確等於清單項。完整category/trip/expense/share/帳務版本/receipt快照不變。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、1/1皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t063-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t063-files.sha256`，索引SHA256 `a9d5f800ab3c3fc39c6630181a825d7cb362a2f7ddb9bb73fb6214dc21e8de99`；命令均結束，單worker，無刻意保留服務。

### T064 — binding完成；產品前序schema RED／runtime待驗

- Alice owner session與可信Origin，一次不帶body的真DELETE分類，等待HTTP完成；不刪expense或復原旅行來繞過保護。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、1/1皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t064-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t064-files.sha256`，索引SHA256 `3bc6b8e90973b76c675a757c605a1ddb82feeae206519cfe1732649efd125088`；命令均結束，單worker，無刻意保留服務。

### T065 — binding完成；產品前序schema RED／runtime待驗

- DELETE確切409 CATEGORY_IN_USE，完整DB快照/FK不變；只讀清單+單筆GET均保留相同category ID與usageCount1，trash支出連結未清空，因此沒有破壞復原時分類關聯；不另送復原Act。原feature2例binding/RED。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、2/2皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t065-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t065-files.sha256`，索引SHA256 `2c23d0342bd79a68104f80713accba8c8d7d44d7d7ef10a3d30d8efd9305184c`；命令均結束，單worker，無刻意保留服務。

### T066 — binding完成；產品前序schema RED／runtime待驗

- 共用前態採真Alice session/API/DB完整005帳務與富士山基準，依狀態用可見UI導航、展開選單/確認/縮圖/新增；不mock回應。不帶未解鎖產品變更。
- 初讀完成後以權威內容/讀取inflight歸零放行Act；記錄page、原焦點、URL、實際所有API GET與寫入請求；Given開啟過程不得提交命令。桌機/手機兩尺寸×Chromium/WebKit依序執行。

- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、1/1皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t066-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t066-files.sha256`，索引SHA256 `a6a589d79d186470d6fbc5767fe22f61d6c4daf6e15a8128feee38f9f755a19d`；命令均結束，單worker，無刻意保留服務。

### T067 — binding完成；產品前序schema RED／runtime待驗

- 單一可見操作，menuitem/trigger/對應dialog button使用已批准design-v7的實際名稱；確認移入→移至垃圾桶、確認永久刪除→永久刪除、復原→復原旅行。保存圖片送出當下草稿，不刷新/重送。記錄navigation/focus，真HTTP由page observer保留。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、1/1皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t067-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t067-files.sha256`，索引SHA256 `7a5b6b469bd6b7d986a699cd9e499ffc7e637f71417293ea0a580bc331e1bdad`；命令均結束，單worker，無刻意保留服務。

### T068 — binding完成；產品前序schema RED／runtime待驗

- anchored menu具有expanded/haspopup/controls/menuitem，位於原trigger下方；無dialog，帳本保留，以trial click證明記一筆未被遮罩阻擋，不導覽/提交。
- 真API state/Trip/圖片bytes與全帳務/shared快照精確不變，任何API寫入請求均零。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、1/1皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t068-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t068-files.sha256`，索引SHA256 `4d30e711aed6d867aa82a0ff2ec79ed6e40e685b0c8af996bfd41c3c19a0c9c2`；命令均結束，單worker，無刻意保留服務。

### T065後資源檢查點

- `.cache/implement-006/t065-resource-db.log`：457個本輪logger PID對應的全部worker index資料庫均已回收，ownedResidualDatabases=[]。先前PID inventory僅命中一個作業系統PID重用（siriknowledged），非本輪程序，不終止。
- 瀏覽器依序Chromium再WebKit、桌機與手機，單worker且每個命令完成後才開始下一個；memory_pressure無壓力告警、可用比例43%。沒有保留額外服務或agent。

### T069 — binding完成；產品前序schema RED／runtime待驗

- Arrange僅由真實trigger打開menu，保存原trigger locator供Escape回焦驗證；active與全快照未變、沒有命令請求。沒有呼叫任何管理API。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、1/1皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t069-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t069-files.sha256`，索引SHA256 `375119de5ce06b4cb08ded571dd0d6fc0e4649a4ea36ddf55e5094bdd8bd1a36`；命令均結束，單worker，無刻意保留服務。

### T070 — binding完成；產品前序schema RED／runtime待驗

- 縮圖dialog可見且accessible name/description識別旅行與編輯用途，保存/取消可見、focus在dialog內，無破壞性確認；沒有寫入請求。API目前圖bytes、版本與完整帳務/shared快照均不變。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、1/1皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t070-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t070-files.sha256`，索引SHA256 `44205cc9fbc9bd17ca9b1aebd7b68dfd085182452a5a657ab7da1bb0a80b229d`；命令均結束，單worker，無刻意保留服務。

### T071 — binding完成；產品前序schema RED／runtime待驗

- 移入dialog的accessible name含日本旅行，description包含保留帳務/可復原/不結清欠款；破壞性確認不是預設焦點，焦點在dialog且取消可見。零寫入請求，真API/DB圖片與帳務均原態。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、1/1皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t071-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t071-files.sha256`，索引SHA256 `ff24c70716d8d57e9e4a995e35ad885b1a4cfc9ec93fe519895dbf6aecd0b2ee`；命令均結束，單worker，無刻意保留服務。

### T072 — binding完成；產品前序schema RED／runtime待驗

- 對已開啟真實管理menu按一次Escape並等待隱藏；不開dialog、不額外點擊/導航/送命令。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、1/1皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t072-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t072-files.sha256`，索引SHA256 `8183eecbc818f59e5ee69a8e3aa6863618e93c870d1d24589351dc09a5cdedaa`；命令均結束，單worker，無刻意保留服務。

### T073 — binding完成；產品前序schema RED／runtime待驗

- Escape後menu隱藏、aria-expanded=false、管理旅行實際focused；未開dialog，帳本記一筆可操作。零API寫入，Trip/state/current image與完整帳務/shared快照精確保留。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、1/1皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t073-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t073-files.sha256`，索引SHA256 `9bb3c272669d0684a9471c9070a7d4f1f3a0a9d5fdbc7933cd686437950fb02f`；命令均結束，單worker，無刻意保留服務。

### T074 — binding完成；產品前序schema RED／runtime待驗

- 兩種後果都驗accessible name/description識別日本旅行；永久刪除明列整趟/同行者/支出/還款/結清/圖及無法復原，移入明列保留/復原。主操作非預設焦點，取消中性且相鄰、X存在；未送命令且資料不變。
- 原F006-038＋DSL明定移入可復原的focused補充，共2pickles×4browser/size執行組合。X實際不變行為由隨後T075/T076矩陣驗證，不在Then額外Act。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共8個執行組合；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、2/2皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t074-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t074-files.sha256`，索引SHA256 `3f6c1fb37d76c602126924fc165a4046defa4d58ecb5cdf5957170509f840850`；命令均結束，單worker，無刻意保留服務。

### T075 — binding完成；產品前序schema RED／runtime待驗

- 一次取消/X/Escape關閉對應dialog，記錄URL與實際focus，不重開、不重送、不撤銷/abort原命令；如已提交也僅關閉UI。兩個confirmation×三方式6pickles，其他兩種editor同一正式DSL方法覆蓋，後續所屬feature再整檔驗證。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共24個執行組合；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、6/6皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t075-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t075-files.sha256`，索引SHA256 `1083dd4ab3324a5161c3928718bdf10ce5a65012a0e4da323f987bc7dd3f872a`；命令均結束，單worker，無刻意保留服務。

### T076 — binding完成；產品前序schema RED／runtime待驗

- 關閉後dialog消失、URL保留、焦點回合理原trigger（管理旅行/永久刪除/新增旅行），原帳本或垃圾桶項仍可操作，以trial驗證不額外Act。
- 任何trash/purge/create/thumbnail及其他API寫入均零；state/Trip/圖片bytes/完整帳務/shared原值精確保留。原6例＋DSL另外2種editor的6例，共12pickles×4組合；後續有草稿/已提交情境仍由各feature完整驗收。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共48個執行組合；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、12/12皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t076-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t076-files.sha256`，索引SHA256 `96f8f11a1e9443ee399776956188d8beecaf820ceb2744d0cc2beb3fa7c348d1`；命令均結束，單worker，無刻意保留服務。

### T077 — binding完成；產品前序schema RED／runtime待驗

- 從真browser request/response擷取唯一POST trash（原operationId/版本/Origin），不重送API；共用backend完整transition/receipt/state/pagination/業務保留/有理數oracle斷言，response以結構化只讀介面注入，保留API舊預設呼叫。
- 回/trips，日本旅行從普通入口消失、台南保留、成功status可讀；API垃圾桶同ID/原圖bytes。唯讀back/forward與MutationObserver確認舊ledger的記一筆入口沒有cache曝光，不提交任何第二命令；其他帳務/分類/帳號不變。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、1/1皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t077-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t077-files.sha256`，索引SHA256 `dfad92c4e6660918991d9ea90e6f5d65a3882c4d44eae2488f394d4afab8b1d3`；命令均結束，單worker，無刻意保留服務。

### T078 — binding完成；產品前序schema RED／runtime待驗

- 實際唯一restore200、收據/state=active，原ID/日期/停用成員/shares/還款/結清/差額/simplifyDebts/圖片和獨立精確帳務全部保存，沒有重建。
- 原垃圾桶UI移除日本旅行且成功status；另外全新browser context（複製合法owner session，無原帳號query/image cache）只讀兩清單/state/原帳本/圖片bytes，確認同一trip恢復可開。finally關閉context；非第二次restore。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、1/1皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t078-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t078-files.sha256`，索引SHA256 `770077f63f19bc7932b1f723f4a6af1e9b3b72fce253c92123afec52da505af9`；命令均結束，單worker，無刻意保留服務。

### T079 — binding完成；產品前序schema RED／runtime待驗

- 唯一真purge POST200之後驗完整DB專屬資料/圖已清除、精確已提交收據與權威state=purged、兩清單無原ID、普通/垃圾桶舊URL404。共用原backend purge斷言，增加只讀response參數保留舊API呼叫。
- 垃圾桶UI清項/dialog關閉、無復原入口及可讀永久刪除成功status；未確認回應不能通過這個success分支，沒有第二命令。其他旅行/分類/帳號/幣別/圖片不變。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、1/1皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t079-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t079-files.sha256`，索引SHA256 `e9aa43e611fb5deabc63a0fb39dd9545422059e56b34bd95f086450ffc210eb4`；命令均結束，單worker，無刻意保留服務。

### T080 — binding完成；產品前序schema RED／runtime待驗

- F006-043依官方Examples在Given導航前決定viewport，不在Act偷偷改裝置。桌機由主要導覽次層垃圾桶link、手機由行動導覽我的旅行button展開次級入口，再唯一導航/trips/trash；不點復原。
- 保留原sidebar/bottom-nav可見語意；當前僅測試新行為，未修改AppShell。明列裝置2pickles×2browser共4組，避免將同一裝置再乘桌機/手機算虛增覆蓋。
- Chromium/WebKit依序×Examples明列裝置（不額外倍增尺寸），共4個執行組合；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、2/2皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t080-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t080-files.sha256`，索引SHA256 `557e7ff30af767da83f8f4f9a6d53028f5740129b56a15987a018295794b38dc`；命令均結束，單worker，無刻意保留服務。

### T081 — binding完成；產品前序schema RED／runtime待驗

- F043前態另安排Alice台南與Carol私人旅行trash，日本active；可見垃圾桶只含本人投影，GET collection200/items精確等owner SQL且不能將trash當UUID發members/settlement等錯誤子請求。唯一active、不顯示trip內子導覽。
- 另一page只讀active日本同行者：桌機仍在我的旅行下縮排，手機底列同五項且唯一active。完整API寫入零，所有帳務與shared資料不變，finally關閉page；表列裝置×browser共4組。
- Chromium/WebKit依序×Examples明列裝置（不額外倍增尺寸），共4個執行組合；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、2/2皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t081-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t081-files.sha256`，索引SHA256 `5449b6cf052fdaa7bde6c6bc80ca06632d40a25cac3f6eb4b964cb526ec5d0fc`；命令均結束，單worker，無刻意保留服務。

### T082 — binding完成；產品前序schema RED／runtime待驗

- 單一Alice日本旅行：一般空由正式trash200歷史建立；垃圾桶空由正式trash→restore200建立，實際receipt1/2，不假造成功。兩清單API確認選定scope空、另一scope恰原tripID。
- browser保持about:blank/未曾載入帳號cache，登入後才由When導航；紀錄前態。抽取相同真request observer供原管理與空清單共用，不變更產品。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共8個執行組合；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、2/2皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t082-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t082-files.sha256`，索引SHA256 `0ed0de9970801060ac37d427b68eda20de0f33f1a249716ffe22c968d79467ab`；命令均結束，單worker，無刻意保留服務。

### T083 — binding完成；產品前序schema RED／runtime待驗

- 單次page.goto指定清單，listener在導航前建立並保留本次真正GET query response，等待其body及本次初讀結束；無mutation、不以Given的先前API空集代替本次UI查詢成功。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共8個執行組合；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、2/2皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t083-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t083-files.sha256`，索引SHA256 `c10bae2885ee262ea870ae6a2e58fefb8bb5c5c502875dd4a57e5af91b1aeb68`；命令均結束，單worker，無刻意保留服務。

### T084 — binding完成；產品前序schema RED／runtime待驗

- 本次browser collection GET200且items=[]後，才顯示該scope真正空文案；一般/垃圾桶不能共用空文字掩蓋資料，沒有spinner/skeleton/busy。另一scopeAPI仍恰原日本tripID，原資料/收據與零browser寫入一致。
- 原truth旅行管理與確認整檔18pickles全部已閉包，無missing/ambiguous；16個無裝置案例×2size×2browser，加2個明列裝置案例×2browser，共68個唯一執行組合。mobile輪grep-invert F006-043只排除已按明列裝置完整執行的案例，沒有未跑矩陣或skip。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共68個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、68/68皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t084-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t084-files.sha256`，索引SHA256 `965c26e47e4ada7377f134daeb14f5365a3c1eab11b70b80d34e74e05b0f7139`；命令均結束，單worker，無刻意保留服務。

### T084 — binding完成；產品前序schema RED／runtime待驗

- 本次browser collection GET200且items=[]後，才顯示該scope真正空文案；一般/垃圾桶不能共用空文字掩蓋資料，沒有spinner/skeleton/busy。另一scopeAPI仍恰原日本tripID，原資料/收據與零browser寫入一致。
- 原truth旅行管理與確認整檔18pickles全部已閉包，無missing/ambiguous；16個無裝置案例×2size×2browser，加2個明列裝置案例×2browser，共68個唯一執行組合。mobile輪grep-invert F006-043只排除已按明列裝置完整執行的案例，沒有未跑矩陣或skip。
- 自查將一般空文字比對加整句邊界，避免未來垃圾桶文案包含「沒有旅行」時被誤辨為一般空狀態。原68組schema RED後，此測試碼更新重新全68組驗證，不累計舊程式版本。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共68個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、68/68皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t084-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t084-files.sha256`，索引SHA256 `14a76747beeae24f170e657d811806159d901fbb62d5f53af2c7719b69c59e88`；命令均結束，單worker，無刻意保留服務。

### T085 — binding完成；產品前序schema RED／runtime待驗

- Given透過真正file chooser選64×48有效PNG神社、保存實際File bytes/hash/tempasset及草稿save/reset/keep意圖；預設由神社再切建立，原富士山bytea不改，browser命令零。
- 原生Blob URL僅pass-through觀察create/revoke，不替換bytes/decoder。取消Then加驗草稿URL實際被native revoke且fetch失效；真browser機制測試先驗PNG完整bytes/解碼及原函式還原，兩browser依序執行。
- 原F046完整6例含取消/X/Escape，24組schema RED，runtime待Green。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共24個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、24/24皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t085-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t085-files.sha256`，索引SHA256 `8b550cd94ce22d2d2d20e546de02aaf905d2a5f0242c14357fa1e2eb8cc1ae06`；命令均結束，單worker，無刻意保留服務。

### T086 — binding完成；產品前序schema RED／runtime待驗

- 神社以真實file chooser一次選有效PNG並等待native Blob預覽，預設圖一次點使用預設圖；只變更本地save/reset草稿，不點保存、不刷新、不另送命令。共享與Given相同真選圖流程但不先切換其他意圖。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共8個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、8/8皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t086-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t086-files.sha256`，索引SHA256 `093d83b11f18f5ede27806cf273b9f1555be802b0f3eb2efab01a7f4e2a99713`；命令均結束，單worker，無刻意保留服務。

### T086後資源檢查點

- `.cache/implement-006/t086-resource-db.log`：705個已記錄worker PID的全部index資料庫均無殘留。T084實際登記的3個程序同PID/command檢查均已退出，沒有誤殺PID重用；memory_pressure可用44%，無刻意保留服務/agent。

### T087 — binding完成；產品前序schema RED／runtime待驗

- 神社預覽native decode/canvas像素與輸入PNG一致、Blob fetch完整bytes相同；預設預覽標識/圖區存在且無神社Blob。尚未保存可見，檔名和相鄰控制組位於預覽下、不重疊/溢出，小尺寸允許整組換行。
- 新context讀真清單/原版image bytes並實際渲染旅行卡，仍是64×48富士山原色；全DB/帳務/圖片/shared與API state保留、任何browser寫入零。原生rendered-image機制兩browser先驗，focused F045兩例8組。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共8個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、8/8皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t087-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t087-files.sha256`，索引SHA256 `2ff62f332dbf5cd1ec59027bfacb448099d3c59473a8f91922d9663f165cd7ea`；命令均結束，單worker，無刻意保留服務。

### T088 — binding完成；產品前序schema RED／runtime待驗

- Arrange前次編輯由真神社File切預設後取消，dialog關閉且本次object URLs經真native revoke/fetch不可讀；支援useEffect cleanup以poll等待，不靠固定sleep。完整API/DB仍富士山及原帳務，無任何thumbnail命令。
- 只安排已放棄歷史及下一次Act前已開menu；目標重新進編輯When未在此實作，保留單一Act。Blob機制兩browser針對poll變更重驗。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t088-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t088-files.sha256`，索引SHA256 `00db70e1b32921e7ad6d94fdd859a6e5aa8a026b0189f313a312b88e108705bb`；命令均結束，單worker，無刻意保留服務。

### T089 — binding完成；產品前序schema RED／runtime待驗

- 重新開啟的實際img經native decoder/canvas呈64×48富士山原色，src fetch完整bytes恰原API/DB WebP；不顯示已放棄神社檔名/預設/尚未保存標記。沒有假設伺服器保存原filename。
- 只讀API state/Trip/原圖及完整DB/shared/accounting相同，任何browser寫入零。原F047整例含取消歷史、menu Given與唯一重新開啟When，4組驗證。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t089-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t089-files.sha256`，索引SHA256 `2114d42b555c46a909a838b4aa0af4dbdb0cea7f59f7c1bd8ce8e61ead677183`；命令均結束，單worker，無刻意保留服務。

### T090 — binding完成；產品前序schema RED／runtime待驗

- 開啟真正攔截的file chooser，在該實際input觀察cancel後結束此選取；沒有setFiles([])、空File、input/change，也不關閉editor/保存。cancel前後原File物件===及全部metadata一致，保留原preview src供Then查。
- Playwright無FileChooser.cancel且setFiles([])明定為清空：https://playwright.dev/docs/api/class-filechooser 。採Puppeteer官方cancel相同受控DOM event做法：https://github.com/puppeteer/puppeteer/blob/main/packages/puppeteer-core/src/common/FileChooser.ts 。不是實體OS picker證據，該工程矩陣仍待真機關卡。
- 兩browser機制測試原File identity/cancel-only及下一次chooser仍可用，再跑F048兩case共8組schema RED。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共8個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、8/8皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t090-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t090-files.sha256`，索引SHA256 `56c14cc9e3fc8350019cab8eefb005ebbc5e62e933cccb00ed350b200c1fea5b`；命令均結束，單worker，無刻意保留服務。

### T091 — binding完成；產品前序schema RED／runtime待驗

- 取消chooser後File物件identity/metadata和預覽src序列都保持，不關dialog、不變神社；富士山native pixels/full bytes仍原圖，預設仍是未保存reset意圖/可辨識預覽。
- API state/Trip/原圖、完整DB/shared/帳務均前態，browser寫入零；不是把清空FileList當取消的測試。原F048兩例8組，runtime待產品Green。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共8個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、8/8皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t091-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t091-files.sha256`，索引SHA256 `12f4685c44bfebd7249e4c3b8290c2054d42162edc38bfd185fcb7e36dca85d8`；命令均結束，單worker，無刻意保留服務。

### T092 — binding完成；產品前序schema RED／runtime待驗

- 真browser POST/DELETE各一次，operation UUID/兩版本/Origin/multipart或無body正確；僅提交最後草稿。觀察實際request/response，沒有重送API或虛構收據。
- 共用backend保存/預設完整DB/版本+1/WebP/receipt/普通GET/舊圖404/帳務保留斷言，抽取T052 reset及可選只讀HTTP response，API原呼叫不變；收據GET精確等200 outcome。
- 另一全新context讀Trip/圖片與實際旅行卡，神社pixels一致或default無自訂圖，其他帳務/圖不變。預留failed-write checkpoint供後續F051復用，標準F049無前次write。2例8組。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共8個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、8/8皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t092-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t092-files.sha256`，索引SHA256 `9f53225bd1fede47da916d15b89d4e36250de69fc339b007c4556186e3d4fb12`；命令均結束，單worker，無刻意保留服務。

### T093 — binding完成；產品前序schema RED／runtime待驗

- 正式POST/DELETE parser/decoder/transaction保持真實；只在隔離worker DB目標owner/trip的trip_thumbnails實際AFTER write拋23514，正式API映射400 VALIDATION_ERROR，交易必須回滾。沒有route.fulfill偽造失敗或假收據。
- 非transactional sequence計數能證明目標INSERT/UPDATE/DELETE真正到達；Given先確認0次/完整DB未變並保留合法File/reset。Then另驗400、counter及未提交，不與丟回應混淆。
- 機制測試用既有正式expenses表驗實際UPDATE/DELETE回滾與他trip可寫，無006產品schema造假；DDL終止時清除、未停用既有trigger。F050兩例8組。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共8個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、8/8皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t093-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t093-files.sha256`，索引SHA256 `21d72a6e783d0f08bd8cb0dab8c90425688a531c022ba752d9d571ac6f4a891d`；命令均結束，單worker，無刻意保留服務。

### T094 — binding完成；產品前序schema RED／runtime待驗

- 明確失敗必須實際thumbnail AFTER write counter=1、400 VALIDATION_ERROR、無receipt，完整DB回滾，原富士山binary可讀；404未綁route/早期無效multipart不能冒充正式故障。
- UI失敗原因alert、保存重試入口enabled、無spinner/成功，合法File完整bytes/native預覽或reset意圖保留；只允許已觀察這一次失敗write，其他資料和API state不變。記錄failed operation ID供明確新意圖重試。
- 共用不變斷言改接受明確allowed-write數，舊取消/預覽呼叫仍預設零，無削弱帳務/圖片比對。原F050兩例8組。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共8個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、8/8皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t094-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t094-files.sha256`，索引SHA256 `fdfbe483fb63d2413ec91d813f56e814715dd230b790186e5afab796e5cfe46f`；命令均結束，單worker，無刻意保留服務。

### T095 — binding完成；產品前序schema RED／runtime待驗

- Arrange由真UI保存一次前次意圖，實際counter=1/400/rollback/無receipt與保留草稿全部成立後，移除scoped PG拒絕trigger/function/sequence；不重建旅行、不刷新，不把回應遺失當明確失敗。
- 保存checkpoint在前次write之後，目標When僅新一次保存；T092驗新operationId不同於failed ID、同trip/原兩版本、唯一新receipt及最後意圖，另一context一致，舊alert/busy結束。F050明確失敗也不可呈現unknown/查證中。
- 共享fixture抽取後F050/F051兩個完整Rule共4case×4組=16；機制核心SQL沿用T093已通過版本，不重跑無變更support。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共16個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、16/16皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t095-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t095-files.sha256`，索引SHA256 `fa6750b47d834994e680d7cbf8a24e160064c55474daf7f28530f897d9fe6b44`；命令均結束，單worker，無刻意保留服務。

### T096 — binding完成；產品前序schema RED／runtime待驗

- 京都賞楓尚無trip，填名稱、optional日期留null；無圖、真神社PNG File/本地預覽、真HEIC選檔後明確錯誤/不能直接建立三種前態。HEIC由既有真HEVC資產，不以文字或副檔名偽造。
- 保留File metadata/hash與原owner tripIDs；任何create/thumbnail命令零，原旅行/API/DB/shared完全不變。抽取相同native Blob觀察器給兩類表單共用。三選項12組focused schema RED。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共12個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、12/12皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t096-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t096-files.sha256`，索引SHA256 `2f1cb3a60effe04d25522e55bd30d2145f7201c5cdf1db8e2d0025432209a2b2`；命令均結束，單worker，無刻意保留服務。

### T097 — binding完成；產品前序schema RED／runtime待驗

- 建立旅行只按一次，記錄實際POST JSON UUID/name/optional日期、response/失敗與image各階段；create201且有合法照片才等同ID image POST，無圖不製造image。
- 原始image request以route.fallback觀察、確認create201或原ID GET查證200已完整完成，再讀真DB新trip前態；不fake response、不替換parser/transaction、不額外create。保留每個image的before快照，舊日本帳務mapping不改。
- 支援記錄原回應丟失而非把它當失敗；deferred新form fault僅有上游fixture旗標時綁實際新trip。F052/F053兩例8組。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共8個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、8/8皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t097-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t097-files.sha256`，索引SHA256 `911d2d7b1f208c637fe65face0e638a2bc869d86353aef72f15c272d16ec3fbb`；命令均結束，單worker，無刻意保留服務。

### T098 — binding完成；產品前序schema RED／runtime待驗

- 京都賞楓owner範圍恰一trip、唯一固定owner、原name/optional日期、accounting/lifecycle0及單一reservation；所有create嘗試同原UUID、成功201一次。owner集合恰舊ID+新ID，無重建或中途圖片提交。
- 無圖0 thumbnail命令/row/receipt；有圖create確認在先、同ID唯一新image200在後、完整WebP/版本/收據與native像素，另一乾淨context清單/卡圖同trip。同時保持所有原日本與他旅行帳務/圖片，未將日本mapping偷換為京都。
- 保存helper依request.tripId及可選新trip前態比對，API/既有UI舊呼叫預設相同；日期request允許合法省略optional或null，不強制serializer細節。F052/F053兩例8組。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共8個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、8/8皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t098-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t098-files.sha256`，索引SHA256 `76d68efcdae10ccc0ff9da3bed631d0d6416a9b7bd20f9db6cc174801fd9e301`；命令均結束，單worker，無刻意保留服務。

### T099 — binding完成；產品前序schema RED／runtime待驗

- 取消/X/Escape後dialog關閉、URL保留與焦點回新增旅行；任何write=0，京都賞楓不存在，owner tripIDs與永久reservation集合均原值，沒有照片造成的幽靈旅行/識別。
- 神社filename移出DOM，至少一個真草稿object URL確實native revoke且fetch失效；全部舊旅行/API/DB/圖片/帳務/shared保持。原F054完整3例12組。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共12個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、12/12皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t099-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t099-files.sha256`，索引SHA256 `9305593e0134184b07a5a7f0936d607b0f7e03d35edda0a86f5f11a54ca85eb2`；命令均結束，單worker，無刻意保留服務。

### T100 — binding完成；產品前序schema RED／runtime待驗

- 一次真file chooser選神社PNG或真HEIC，等待native本地預覽或明確驗證錯誤；不按建立、不順便填名稱或改日期。讀取既有欄位/owner trip IDs作原值，避免以額外UI操作造前態。
- HEIC錯誤定位其本身alert，允許其他合法欄位驗證alert同時存在，不將整表單錯誤誤當HEIC。F055/F056完整Given+When閉包兩例8組，Then分筆續補。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共8個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、8/8皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t100-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t100-files.sha256`，索引SHA256 `f870735e8b0e81e4e144c1d8bfbc74abe957479d767254b0dadfa40343f8bc3b`；命令均結束，單worker，無刻意保留服務。

### T101 — binding完成；產品前序schema RED／runtime待驗

- 新增合法圖只呈尚未保存，native decode/canvas PNG像素及Blob完整bytes與選擇File相同；名稱日期保持，欄位、改選/移除/取消仍可用，不在Then按建立。
- 真DB/API雙清單沒有京都賞楓，owner trip/reservation集合精確原值、舊旅行/照片/帳務/shared未變，任何write零。因此不是僅無顯示新card而實際先建幽靈trip。F055原例4組。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t101-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t101-files.sha256`，索引SHA256 `95ca78bd652b16d1cd14498acf3dd0fbeb8eb5683a6f3ea5cd26745ed2878652`；命令均結束，單worker，無刻意保留服務。

### T102 — binding完成；產品前序schema RED／runtime待驗

- 真image/heic選圖有可讀HEIC原因、JPG/PNG/WebP及轉換/改選下一步，改選與移除入口可用；不當合法Blob預覽，建立處於不可提交狀態。沒有在Then偷按建立，實際觸發由後續獨立Rule驗證。
- 原name/date保持，零create/thumbnail與其他write，DB/API owner trip/reservation集合不變且無京都賞楓，舊帳務/圖不變。F056原例4組。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t102-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t102-files.sha256`，索引SHA256 `e2cea803e0cf67c5ed2e6f16deeb0765c36bc395c09443ad1811696b8f574db5`；命令均結束，單worker，無刻意保留服務。

### T103 — binding完成；產品前序schema RED／runtime待驗

- 只點移除選圖一次，觀察native file inputs已沒有File（清空或移除input都可）及已配置object URLs真正釋放；不以fixture直接改UI state或另按建立。
- 保存先前metadata/fields供Then查，測試意圖切無圖但不修改DOM欄位；名稱日期保留與無ghost trip由下一筆Then完整核對。F057原例4組。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t103-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t103-files.sha256`，索引SHA256 `8b8836230c5ae11a4772f9eb0ff175190628f1e07369d8c5f56964d4fc646355`；命令均結束，單worker，無刻意保留服務。

### T104 — binding完成；產品前序schema RED／runtime待驗

- 移除後沒有File/原filename/Blob預覽或非空選圖錯誤，先前name/date保持；建立按鈕enabled且trial可操作，不在Then真正送create。
- native object URL釋放、DB/API京都仍不存在，owner trip/reservation及完整原帳務/圖/shared不變、任何write零；無圖實際建立結果由F052獨立驗收。F057原例4組。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t104-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t104-files.sha256`，索引SHA256 `f8e75f01a4d04eefa6339e4eb4ef2bb03467e5b9432804810d76f74f77e1c3e9`；命令均結束，單worker，無刻意保留服務。

### T105 — binding完成；產品前序schema RED／runtime待驗

- 保留原表單/File/UUID，scoped route只將本次wire name改空，真API schema validator拒絕400且尚未進DB；不是fulfill偽造錯誤或丟已提交回應。原始client body與wire body分開明記，WeakMap只觀察原值、不改生成UUID。
- 機制測試實際browser→Vite proxy→正式API驗400、無trip/owner，移除拒絕後同一UUID/原name真正201及唯一owner；兩browser依序，既有005 schema即可證明，沒有補006假schema。
- 當前Given不送建立；保留拒絕供唯一When送出，F058原例4組。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t105-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t105-files.sha256`，索引SHA256 `69d744f768d9aa715b1c0460b517bde88ae724eeedb7032d65320dcaffa2dd1b`；命令均結束，單worker，無刻意保留服務。

### T106 — binding完成；產品前序schema RED／runtime待驗

- 原UUID真400 VALIDATION_ERROR，wire拒絕與client原值分開核對；沒有trip/reservation/owner/thumbnail，沒有任何image POST。不是只看表單還開著便算未建立。
- UI結束busy、有可讀原因與可建立/改選入口，沒有成功或unknown誤訊；原name/date及PNG File完整bytes/native預覽保留。完整舊資料與owner集合不變，只觀察一次失敗create。F058原例4組。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t106-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t106-files.sha256`，索引SHA256 `61682bb65cf2e48a668833812b7c592b3c754fa4dafe443646e46cd0c6beb1cc`；命令均結束，單worker，無刻意保留服務。

### T107 — binding完成；產品前序schema RED／runtime待驗

- Arrange實際前次create被正式validator400拒絕且未建立，File/fields/UUID仍可用；只移除該拒絕route、不重開表單或先發目標retry。
- 下一個When仍唯一按建立；共用成功Then明確核對同failed UUID、只有一次201及唯一trip/owner、同ID保存原File，舊錯誤/busy退出。原F058/F059完整兩Rule2例8組，保持新舊兩條閉包無undefined。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共8個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、8/8皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t107-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t107-files.sha256`，索引SHA256 `35fbb2ada4f564dfa19c28f0e5d8f9099521ba1b1d2ba4589517744c7757507f`；命令均結束，單worker，無刻意保留服務。

### T108 — binding完成；產品前序schema RED／runtime待驗

- 新form的共用圖片拒絕改延後綁定：先確認真create201，再在原image request送達前只對實際新UUID裝同PG拒絕；不錯擋舊日本旅行，也不fake400。既有編輯器F050/F051維持即時綁定。
- 圖片400/counter1、無receipt且新trip完整等image前態（active default/唯一owner/原create），原ID保留與DB/API一致；UI明示旅行已建立但圖片未保存、預設風景、重新上傳，沒有再次建立或整趟失敗誤訊。第二context卡片同default。
- 保留原File輸入紀錄，實際沿用檔案重傳由F061下一組驗證；舊旅行與所有帳務/圖不變。F060原例4組。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t108-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t108-files.sha256`，索引SHA256 `22e98041e5f7b40d8ff067788afbf38ef522a6efaf7e11b6e7fbb1c1f3919ee2`；命令均結束，單worker，無刻意保留服務。

### T109 — binding完成；產品前序schema RED／runtime待驗

- Arrange由真UI完成原create201與其image400/rollback，已知京都UUID active default、原File仍為最初選取；移除實際新UUID的PG拒絕，保留失敗結果畫面及重傳入口。
- 保存create計數與trip UUID，解除後DB完全同前態，沒有重新選檔、重建trip或先執行目標重傳；下一筆When僅點重傳。F061前態4組。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t109-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t109-files.sha256`，索引SHA256 `aaba146d5f2aab45aa44bce7852f678cca088b88e7425b84d2110cbc100a67ab`；命令均結束，單worker，無刻意保留服務。

### T110 — binding完成；產品前序schema RED／runtime待驗

- 只按重新上傳一次，使用已確認原Kyoto UUID發image POST，前後create計數不增加；不重新選File、不送第二次POST trips，等待真命令結果。
- 既有成功Then驗新operationId不同於failed image、同trip/原版本、唯一新receipt、File相同神社內容/native像素及第二context一致；舊alert/busy消失、所有原帳務/圖保持。F061完整原例4組。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t110-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t110-files.sha256`，索引SHA256 `1014403c72cd09cbe6bafd34a84eaf155860636ef14dc73cfdd26f38203987dc`；命令均結束，單worker，無刻意保留服務。

### T110後資源檢查點

- `.cache/implement-006/t110-resource-db.log`：872個已記錄worker PID的全部worker index資料庫均無殘留；memory_pressure可用46%，無另留服務或agent。後續T111透明response代理單機制與正常Vite轉送皆依序測兩browser，未平行runner。

### T111 — binding完成；產品前序schema RED／runtime待驗

- 四種DSL操作真native request提交：移入/purge/保存神社或預設/新增已確認trip附圖。透明Vite代理原始stream不改檔案/不重送，後端真200後讀DB+真receipt完整語意確認，再截斷其真正response body。read-only adapter只讀原始captured status/bytes，沒有假成功或假receipt。
- WebKit route.fetch曾實測把File變0 bytes，故拒用重發方案；零response bytes又觸發Chromium原生POST重送，改先送真headers與真首byte再截斷。兩browser原生multipart/parser機制證明64KiB完整bytes/cookie/單次接受/回應本文遺失均成立；舊Vite正常API拒絕→201轉送機制兩browser亦通過，strict proxy typecheck exit0。
- Browser receipt/state/目標資料查證暫以transport abort阻擋，不造500/404；記錄原operationId/trip/版本/after與所有mutation/lookup，Node權威讀取直達API不受阻。解除查證與清理不撤銷命令。
- F063/F062/F064完整Given+When閉包5例20組；Then下一筆，所有產品runtime仍schema待驗。logs另有t111-forwarding.log與proxy-typecheck.log。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共20個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、20/20皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t111-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t111-files.sha256`，索引SHA256 `17f2b0bfa2a8bad3f79164b8fd7f8f42af28b5e2f98742829a15282086c0e964`；命令均結束，單worker，無刻意保留服務。

### T112 — binding完成；產品前序schema RED／runtime待驗

- 真提交/response本文丟失後顯示尚未確認及可用再次查證出口，原操作不能再次送出，沒有自動mutation retry或確定失敗/成功誤訊。實際receipt/state讀取保留原trip/operation ID，不能只查列表推論。
- 新增附圖create/image各一次，明示旅行已建但圖片未知，不重建或宣告預設風景/圖片失敗；權威DB仍原提交事實與其他帳務不變，UI不顯示內部UUID。
- 原寫入若在確認上游commit前斷線，fixture明記failure並結束，不能以未提交充當此Given；相應listeners在cleanup移除。F063/F062/F064完整5例20組。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共20個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、20/20皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t112-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t112-files.sha256`，索引SHA256 `5635a05c16d94db20459887befa4f5f1f0fe8f98db33b4f5e58d487dc45a4e01`；命令均結束，單worker，無刻意保留服務。

### T113 — binding完成；產品前序schema RED／runtime待驗

- 建立五種真實已提交但瀏覽器未知的原操作；解除查證屏障前，以獨立owner API實際復原或保存海邊圖片。原receipt保持不變，查詢回傳原result與最新DB currentState；不重送原命令、不偽造回應。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共20個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、20/20皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t113-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t113-files.sha256`，索引SHA256 `1a9d6a02d797c5f55be22aea82a89e0778a658d4ecf6b66c5229b8ef8d460820`；命令均結束，單worker，無刻意保留服務。

### T114 — binding完成；產品前序schema RED／runtime待驗

- 單次點擊可見再次查證，等待同trip／operationId的真實GET收據200與完成；保存瀏覽器收到的權威內容供Then檢查，GET結束後命令數不增，禁止重建或重送原操作。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共20個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、20/20皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t114-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t114-files.sha256`，索引SHA256 `17e0117c3217238fa57d61074bb5935574e5b39e61758817be8290fb7b6452fe`；命令均結束，單worker，無刻意保留服務。

### T115 — binding完成；產品前序schema RED／runtime待驗

- 原次成功與目前狀態各自有可見訊息，busy消失；瀏覽器真GET與owner權威收據精確等於immutable result＋最新currentState。檢查primary海邊版本無回退、purged無帳務、default無舊圖；新context同trip卡片與原生解碼像素一致，完整DB/其他旅行不變、命令不增。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共20個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、20/20皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t115-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t115-files.sha256`，索引SHA256 `26ad7bb2ab25f7848b527bea4ecabc300225bb8b8a9646f2e6b60f8e6de8776a`；命令均結束，單worker，無刻意保留服務。

### T116 — binding完成；產品前序schema RED／runtime待驗

- 真實DELETE提交default後截斷回應、阻擋GET查證；UI查證結束仍未知且可關閉，DB確實無thumbnail，原reset operationId/trip與意圖保存。沒有新DELETE或逆向POST。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t116-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t116-files.sha256`，索引SHA256 `bea83f720601c9eb4c7c99a87e5824becb45fbf12bbf3bbf5293c3dcb801d500`；命令均結束，單worker，無刻意保留服務。

### T117 — binding完成；產品前序schema RED／runtime待驗

- X關閉後只檢查頁面再次查證入口可見、可用與可觸及，不在Then重開或查證；真權威收據保留原reset意圖，Trip/DB仍default、完整快照不變、無新DELETE/逆向POST；本地object URL釋放，其他旅行保持。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t117-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t117-files.sha256`，索引SHA256 `2342365f734fb70362b05d54dba17003dfb9a20aee7c89ef5f2a47ecfcbfa9e2`；命令均結束，單worker，無刻意保留服務。

### T118 — binding完成；產品前序schema RED／runtime待驗

- 本context先真讀active帳本、打開記一筆並填未保存草稿；獨立BrowserContext以相同owner認證實際提交trash／purge，保存舊Trip/草稿/最新完整DB快照。真state對DB且本context零寫入，無偽造cache或收據。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共8個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、8/8皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t118-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t118-files.sha256`，索引SHA256 `b9ca657ffb6773c5f15920cd19ed382ae422156f75b577dffbd279e2462a59bf`；命令均結束，單worker，無刻意保留服務。

### T119 — binding完成；產品前序schema RED／runtime待驗

- 一次點擊現有返回舊帳本連結、沿用SPA及query cache，等待真實Trip/state GET；不reload摧毀cache、不復原/保存。原生MutationObserver記錄切回舊路由時是否短暫露出成員淨額或記一筆，供Then核對；所有命令零。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共8個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、8/8皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t119-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t119-files.sha256`，索引SHA256 `bcda9e39084e2a3e0a3eb63fe6096aefa71a27af7f746c513f65efa0a5a57df4`；命令均結束，單worker，無刻意保留服務。

### T120 — binding完成；產品前序schema RED／runtime待驗

- trash提供垃圾桶復原連結、purged提供返回清單；讀取過程不得閃現舊成員淨額/記一筆，帳務與其他owner內容不可見。若顯示保留草稿，值不得改且不能提交。真state/Trip拒絕與完整DB快照一致；零命令，Then不導航或復原。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共8個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、8/8皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t120-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t120-files.sha256`，索引SHA256 `813dfb6a4444b57bdcbd529a3cdbca70112589dcb60087c6dd478860884e8f15`；命令均結束，單worker，無刻意保留服務。

### T121 — binding完成；產品前序schema RED／runtime待驗

- owner/trip隔離的真PG BEFORE UPDATE/DELETE拒絕（trip需早於現有固定owner/FK保護）用於trash/restore/purge，操作前不提交命令；正式約束與receipt機制不被替換。support機制另外實跑trip寫入及前序業務刪除rollback（保留原RESTRICT約束）、其他trip仍可寫，UI目標仍schema前序待驗。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共12個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、12/12皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t121-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t121-files.sha256`，索引SHA256 `fc75deb78e8a2a1a82a062bd472e3ecc1df268b07146a398b24849573b2f4b64`；命令均結束，單worker，無刻意保留服務。

### T122 — binding完成；產品前序schema RED／runtime待驗

- 每種真UI生命週期命令恰一次、真23514拒絕已觸及且API正式400而非timeout/假500；UI有可理解原因、busy結束、原入口可重試，不顯示成功或未知。原receipt不存在、完整DB/帳務/圖片/版本與其他旅行保持原狀。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共12個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、12/12皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t122-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t122-files.sha256`，索引SHA256 `65888eb10cd44ef81362f36b19917ffc9b38e30cd27eba7452fc5590f37afd87`；命令均結束，單worker，無刻意保留服務。

### T123 — binding完成；產品前序schema RED／runtime待驗

- 真實active/富士山/長名稱旅行先完整載入並保存卡片與圖片bbox、API欄位與筆數，再僅對binary GET建立延遲或abort屏障；旅行資料GET不攔截，未改圖片DB，cleanup可釋放等待並等待handler結束。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共8個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、8/8皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t123-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t123-files.sha256`，索引SHA256 `d0661fe4303a1c6bb91ca8c186ea37d6240cc6f537decfa5cef78c22c93370f3`；命令均結束，單worker，無刻意保留服務。

### T124 — binding完成；產品前序schema RED／runtime待驗

- 一次開/trips，只等待DOMContentLoaded及真旅行清單GET，不被延遲圖片拖住load；核對原trip欄位與可見長名稱，等binary屏障真的觸及、保持延遲或明確失敗，未開帳本且零寫入。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共8個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、8/8皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t124-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t124-files.sha256`，索引SHA256 `beac71ac530e4ad9eae940f48751243fcd3b8cb94998f98bcab7c29673d61c19`；命令均結束，單worker，無刻意保留服務。

### T125 — binding完成；產品前序schema RED／runtime待驗

- 延遲中的spinner-only狀態有圖片讀取accessible name且不可聚焦、位於原圖bbox；卡片bbox不移動，完整長名稱換行不裁切，日期/支出筆數/可觸及帳本連結對真API。僅忽略刻意held binary pending，其他資料已完成；真DB/圖片內容/其他旅行不變、零命令。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t125-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t125-files.sha256`，索引SHA256 `1dda5c67b86df5a8d906978fbb4c8c127ed54ed5b77e8a87ad00e8c8eca767ad`；命令均結束，單worker，無刻意保留服務。

### T126 — binding完成；產品前序schema RED／runtime待驗

- 真binary GET失敗後顯示固定空間的預設視覺，圖片spinner/progress/busy全部結束、不露broken image；卡片識別/完整長名稱/日期/筆數與可觸及帳本入口保留。源圖片仍在真DB/API，完整帳務和其他旅行不變，無刪圖或其他命令。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t126-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t126-files.sha256`，索引SHA256 `b8f6692b3f3acf51b8f45982a661708b9e0105d0725089e2c31837980ebcbde9`；命令均結束，單worker，無刻意保留服務。

### T127 — binding完成；產品前序schema RED／runtime待驗

- 真圖片GET失敗/fallback後從同卡片開原帳本，核對晚餐及成員淨額真資料，再以可見表單填早餐TWD100、Alice付款與Alice/Amy平均分攤。保存日期/穩定member IDs及原DB oracle，尚未儲存、零寫入、源圖片仍在。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t127-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t127-files.sha256`，索引SHA256 `d8bdefb9157033f73b6e5fbfb7d727d9273165ac12196e8fa994672fbde76e52`；命令均結束，單worker，無刻意保留服務。

### T128 — binding完成；產品前序schema RED／runtime待驗

- 可見儲存支出單次點擊，等待真POST expenses 201及body完成；核對原UUID、早餐/TWD100/日期/Alice付款/Alice+Amy分攤，整個UI恰一命令、不重試保存或修圖片。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t128-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t128-files.sha256`，索引SHA256 `53bd6d5422afb748dc6f537074c03c871f6ba5643ec6874ddc955680db019324`；命令均結束，單worker，無刻意保留服務。

### T129 — binding完成；產品前序schema RED／runtime待驗

- UI成功與早餐列可見；真DB恰一10000 minor TWD早餐、Alice/Amy各50精確份額、總額JPY5000/TWD700；獨立fraction oracle核對Alice+350/Amy-350及其他零淨額。會計版本只加1、所有舊帳務/圖片/收據/其他旅行保持；真GET重讀與單命令計數一致。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t129-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t129-files.sha256`，索引SHA256 `83e5d1917a5e7a373f511990db3394b4223126f73fcf8f1c0f808385eece05b1`；命令均結束，單worker，無刻意保留服務。

### T130 — binding完成；產品前序schema RED／runtime待驗

- 同SPA真載入Alice active/trash binary及欄位、Carol獨立資料集；重開cached帳本時僅hold真實upstream trip GET，原owner內容不偽造。原生神社File/object URL仍未保存、查詢in-flight，保存三trip完整DB快照與舊URL，cleanup解除及移除controller。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t130-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t130-files.sha256`，索引SHA256 `64e45f42f117ab49836e9df8443264267a55b2bed72955eeef6ed077bd313576`；命令均結束，單worker，無刻意保留服務。

### T131 — binding完成；產品前序schema RED／runtime待驗

- 先Escape放棄未提交modal以觸及真帳號控制，再實際sign-out並驗/api/me401；在OAuth換頁前保存native URL revoke/可讀性邊界證據。走現有mockGoogle外部授權替身、真Better Auth callback/session登入Carol；確認me身份後才放回Alice原生upstream回應，未改認證cookie充當登出。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t131-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t131-files.sha256`，索引SHA256 `f9edff85738846aa49fc427480b041e925196d1142201234ac909823ff16b252`；命令均結束，單worker，無刻意保留服務。

### T132 — binding完成；產品前序schema RED／runtime待驗

- 非空URL觀測證明OAuth換頁前已revoke且原生fetch不可讀，延遲Alice真回應釋放後畫面仍僅Carol卡片/圖片/資料。以Carol瀏覽器原生fetch（含現有HTTP cache）讀Alice舊binary/Trip/state皆404無內容；兩帳號三trip完整DB快照保持，零旅行寫入，不在Then開舊路由。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t132-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t132-files.sha256`，索引SHA256 `5aeeacb7f30f321c14613ca03f9acb6ea0962f41dbcd4344db41cb530621a1f8`；命令均結束，單worker，無刻意保留服務。

### T132 — binding完成；產品前序schema RED／runtime待驗

- 非空URL觀測證明OAuth換頁前已revoke且原生fetch不可讀，延遲Alice真回應釋放後畫面仍僅Carol卡片/圖片/資料。以Carol瀏覽器原生fetch（含現有HTTP cache）讀Alice舊binary/Trip/state皆404無內容；兩帳號三trip完整DB快照保持，零旅行寫入，不在Then開舊路由。
- 自查修正：既有Carol fixture為active/default，並沒有自訂brown圖；改為核對Carol真DB與default視覺，未擴張fixture或產品。舊T132記錄由本輪同名logs/manifest覆寫取代，不混加兩輪矩陣。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t132-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t132-files.sha256`，索引SHA256 `95fcf1a18dfde4c537cf972470159b5537232828543c5d13bda5237170b0a5c6`；命令均結束，單worker，無刻意保留服務。

### T133 — binding完成；產品前序schema RED／runtime待驗

- 僅截短真multipart wire body，在file payload/footer前結束，保留原headers/operationId並將原request轉送正式API；不fulfill、不製造HTTP500/收據。native Fastify parser＋兩瀏覽器support另驗真400拒絕、未接受檔案、同原生File解除屏障後可完整上傳；產品正式拒絕/DB未提交由後續Then檢查。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t133-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t133-files.sha256`，索引SHA256 `aa2f28061e17fc5c44daa5d5846df0d9e614f08e756a5b9ba7d1f9b074f24515`；命令均結束，單worker，無刻意保留服務。

### T134 — binding完成；產品前序schema RED／runtime待驗

- 只接受正式API400 VALIDATION_ERROR為已知未保存，不能把timeout/收據404單獨當未提交；原operationId一次、wire payload確實未完整、DB無receipt與全快照保持。UI明示上傳未保存並結束busy，File完整bytes/像素與預覽保留、保存/改選可用，無成功假象。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t134-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t134-files.sha256`，索引SHA256 `496b5512bad9ca4540ae310b202353a9992589670a0ada4fd4434bdce9094932`；命令均結束，單worker，無刻意保留服務。

### T135 — binding完成；產品前序schema RED／runtime待驗

- 導航前依明列裝置設定真viewport手機390×844／桌面1440×900，建立Alice富士山active原態並開縮圖dialog；未選檔、無Blob草稿與命令，真API/DB圖片及帳務原態保存。Examples裝置不額外倍增尺寸。
- Chromium/WebKit依序×Examples明列裝置（不額外倍增尺寸），共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t135-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t135-files.sha256`，索引SHA256 `6197f050fe061b3b870a821afa011dd3c5c9c4bf2f64647f66f0e64f3163dfdf`；命令均結束，單worker，無刻意保留服務。

### T136 — binding完成；產品前序schema RED／runtime待驗

- 只檢視已開dialog的可見支援條件，scroll到說明並focus選圖控制，讀取真DOM文字與裝置；不點選圖、不開原生選擇器或保存，無寫入。
- Chromium/WebKit依序×Examples明列裝置（不額外倍增尺寸），共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t136-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t136-files.sha256`，索引SHA256 `823bbb3c59bc56574e5e4979dbe22582ffba722d6ba7b57776be4f8ecf9bd2b3`；命令均結束，單worker，無刻意保留服務。

### T137 — binding完成；產品前序schema RED／runtime待驗

- 真DOM可見單張靜態JPEG/JPG、PNG、WebP、10MiB、25000000像素、16384單邊與HEIC轉檔；原生accept僅允許政策格式且JPEG同時涵蓋jpg/jpeg、禁multiple，不露技術錯誤碼。第二只讀context核對同trip卡片名稱/日期/筆數及帳本入口，主dialog不關閉，完整API/DB保持零寫入。
- Chromium/WebKit依序×Examples明列裝置（不額外倍增尺寸），共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t137-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t137-files.sha256`，索引SHA256 `3ac85788934761d254fbe44bad6aa70577bf02b1fca7b30ca733cbb8ac8fc5a9`；命令均結束，單worker，無刻意保留服務。

### T138 — binding完成；產品前序schema RED／runtime待驗

- 21原因完整準備真bytes：16種原格式/動畫/偽裝/損壞/零維度/空檔，及10MiB+1、5001×5000、16385×1、1×16385與兩個合法JPEG；沿用native decoder/hash資產工具，不假metadata。Given未選檔或保存，原富士山/完整帳務不變。此Rule明列Given手機，實際390×844依兩瀏覽器各一次，避免重複同viewport冒充桌機覆蓋。
- Chromium/WebKit依序×DSL明列裝置（不額外倍增尺寸），共42個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、42/42皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t138-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t138-files.sha256`，索引SHA256 `cf248980bbe6003641daad8e4478d5bdfe38b05d9b1d1dfc44d034d0cab53d12`；命令均結束，單worker，無刻意保留服務。

### T139 — binding完成；產品前序schema RED／runtime待驗

- 真filechooser選檔後，只在保存可用時單次點擊，否則保留本地拒絕guard；紀錄local/server拒絕來源與真request/operationId/response，不能繞過UI。雙檔按DSL明許以native DataTransfer/FileList注入，single input的multiple屬性不變；兩瀏覽器support證明兩個實際File的全bytes/hash/metadata及change事件皆正確。全部21例完整生成/收集，schema前序相同的RED選HEIC與偽裝PNG代表；完整案例仍待Feature Green。
- 所有21個focused pickles完整bddgen/list；本筆RED依代表入口僅執行正規式(?:HEIC|文字偽裝PNG) 的資料組合（每project 2例），其餘案例未執行、runtime待schema/完整Feature Green；不算skip或已通過。
- Chromium/WebKit依序×DSL明列裝置（不額外倍增尺寸），共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t139-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t139-files.sha256`，索引SHA256 `b248687308272a2869affa83b4f1e1742506633a957da07db23f31dafa3fa8e3`；命令均結束，單worker，無刻意保留服務。

### T140 — binding完成；產品前序schema RED／runtime待驗

- 分原因檢查可理解的格式/動畫/損壞/尺寸/容量/單檔錯誤及改選入口；顯然由File metadata可拒絕者零POST，server路徑正式413/415/422/400與對應code、原operation無receipt。busy結束/無成功/不露error code，無效預覽明列未保存；完整DB富士山/versions/帳務/其他旅行保持。21例全量收集；代表RED不替代所有原因的首次runtime複核。
- 所有21個focused pickles完整bddgen/list；本筆RED依代表入口僅執行正規式(?:HEIC|文字偽裝PNG) 的資料組合（每project 2例），其餘案例未執行、runtime待schema/完整Feature Green；不算skip或已通過。
- Chromium/WebKit依序×DSL明列裝置（不額外倍增尺寸），共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t140-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t140-files.sha256`，索引SHA256 `85c11f7bb892ac8d3fff0e334218adfab77f0b59b9978e47f635ec099b295f85`；命令均結束，單worker，無刻意保留服務。

### T141 — binding完成；產品前序schema RED／runtime待驗

- 由真UI完成對應21原因的前次拒絕並檢查原富士山/完整帳務保持；另外只準備真4000×3000、1MiB靜態JPEG，尚未改選/保存。沿用原trip/versions，保存前次server operationId與write基線供新意圖辨識；全部21例完整生成，桌機/手機代表RED與完整Feature Green分列。
- 所有21個focused pickles完整bddgen/list；本筆RED依代表入口僅執行正規式(?:HEIC|文字偽裝PNG) 的資料組合（每project 2例），其餘案例未執行、runtime待schema/完整Feature Green；不算skip或已通過。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共8個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、8/8皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t141-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t141-files.sha256`，索引SHA256 `a797b98e7a87098aff0ba34b2aa07f8ad94bd14d993c4c11cfae8055a8dd970f`；命令均結束，單worker，無刻意保留服務。

### T142 — binding完成；產品前序schema RED／runtime待驗

- 真filechooser改選已備JPEG，原生decode預覽及瀏覽器SHA256比對完整File，前次非空錯誤清除、未保存標示可見，再單次保存；真200、同trip/expected versions/新operationId與原write基線由request observer核對。未重建trip或補發其他命令。
- 所有21個focused pickles完整bddgen/list；本筆RED依代表入口僅執行正規式(?:HEIC|文字偽裝PNG) 的資料組合（每project 2例），其餘案例未執行、runtime待schema/完整Feature Green；不算skip或已通過。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共8個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、8/8皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t142-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t142-files.sha256`，索引SHA256 `a569ab5d8691bd024e0b3deb2ac2bbcd9e62a7bdb1bb74309392e1c5a599e531`；命令均結束，單worker，無刻意保留服務。

### T143 — binding完成；產品前序schema RED／runtime待驗

- 真DB/GET唯一新WebP、版本+1與收據，舊版本404；沿用完整後端圖片/帳務不變驗證。主畫面非空錯誤及busy消失、廢棄Blob釋放；另一尺寸context真GET同bytes及卡片原生decode像素/4:3有界尺寸一致，無create、僅新增一圖片命令、其他旅行保持。
- 所有21個focused pickles完整bddgen/list；本筆RED依代表入口僅執行正規式(?:HEIC|文字偽裝PNG) 的資料組合（每project 2例），其餘案例未執行、runtime待schema/完整Feature Green；不算skip或已通過。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共8個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、8/8皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t143-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t143-files.sha256`，索引SHA256 `926ab892207c32d5021ae5c2c4ae8bedbc99dee091c042a5bfa49e1e0b1f9642`；命令均結束，單worker，無刻意保留服務。

### T144 — binding完成；產品前序schema RED／runtime待驗

- 明列viewport建立Alice active/default，fixture正式tx刪原圖並推進版本、重新讀取後開editor；不偽造default API回應或receipt。準備4000×3000/1MiB真jpg/jpeg/PNG/WebP，另建相反尺寸context共享同owner有效session並真me確認；尚未選檔/寫入，原帳務與其他trip完整快照保持。
- Chromium/WebKit依序×DSL明列裝置（不額外倍增尺寸），共8個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、8/8皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t144-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t144-files.sha256`，索引SHA256 `9f50f492e17a54ab2be70a7f25e4ce712f20ecc39bab1e646363b88a5122148f`；命令均結束，單worker，無刻意保留服務。

### T145 — binding完成；產品前序schema RED／runtime待驗

- 四種格式沿用真filechooser/原生decode/SHA256完整預覽與一次保存工具；等待原生multipart POST正式200，保存同trip/expected versions/opID與response。When不讀另一context、不重建trip或再保存。
- Chromium/WebKit依序×DSL明列裝置（不額外倍增尺寸），共8個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、8/8皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t145-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t145-files.sha256`，索引SHA256 `4ad85adf0395fdfdf9927b96ddf1cb1e0bb521ae9e3cf0c71aa01bc8ea507a08`；命令均結束，單worker，無刻意保留服務。

### T146 — binding完成；產品前序schema RED／runtime待驗

- 使用Given既有的相反viewport/同owner獨立context，只讀取得當前API binary與/trips卡片；對DB同bytes、版本與原生decode像素/尺寸，沒有第二次保存。沿用完整新WebP/收據/舊版404/帳務及他圖不變斷言；主UI清除舊錯誤與busy、無create，existingcontext由fixture cleanup關閉。
- Chromium/WebKit依序×DSL明列裝置（不額外倍增尺寸），共8個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、8/8皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t146-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t146-files.sha256`，索引SHA256 `7b7253ca361ef1d5a5f90eea01c98c235d9c06b1c44db8b24c2d484e36dc06d8`；命令均結束，單worker，無刻意保留服務。

### T147 — binding完成；產品前序schema RED／runtime待驗

- 本地保留原神社File/舊兩版本；另一真BrowserContext共享owner session後實際保存海邊，或依序trash→restore。真DB/receipt/state確認較新權威狀態與版本，原帳務/其他trip保持、本地零寫入；不預先改本地版本或偽造衝突。原提交UUID留待When從真正client request觀測。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共8個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、8/8皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t147-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t147-files.sha256`，索引SHA256 `ade2aaae5dcfaa6b84943e2462cd5260f0cf48cc268d176e33d1dcc1911acee6`；命令均結束，單worker，無刻意保留服務。

### T148 — binding完成；產品前序schema RED／runtime待驗

- 可見保存一次，真request observer核對原trip與舊lifecycle/thumbnail版本，client生成UUID與其他裝置意圖不同；等待正式409而非silent採新版本重送，保存原request/opID/response供Then核對權威刷新。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共8個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、8/8皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t148-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t148-files.sha256`，索引SHA256 `54af25b6e7da392591591238fbe555b6e683a60aa0a447ff31881d01cb5d2dd3`；命令均結束，單worker，無刻意保留服務。

### T149 — binding完成；產品前序schema RED／runtime待驗

- 正式409 code/currentState與真瀏覽器GET state刷新對DB；衝突映可讀原因/下一步、不露UUID/code，原神社草稿完整native像素/hash可用，busy結束。另一尺寸只讀卡片保持海邊或復原後富士山，原次無receipt/不自動重送；會計版本與全部非版本trip欄位保持、完整權威快照未再改動。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共8個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、8/8皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t149-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t149-files.sha256`，索引SHA256 `02f8a29fd247246815bcfafb02decc1d16c860a32444a9080c6517b9b835f7dd`；命令均結束，單worker，無刻意保留服務。

### T150 — binding完成；產品前序schema RED／runtime待驗

- 真新增表單京都賞楓/原日期，以實際HEIC檔觸發本地拒絕；錯誤與改選/移除控制可用，name/date仍可修正；保留POST監測與原owner trip/reservation集合，真DB/API無新旅行/圖片。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t150-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t150-files.sha256`，索引SHA256 `46dcd3a5fcc9a1ed74721d61eb241416e7b872729378d79aed904ddb8b13a09b`；命令均結束，單worker，無刻意保留服務。

### T151 — binding完成；產品前序schema RED／runtime待驗

- 從真DOM保存name/date與write基線，只在名稱input發一次原生Enter作表單提交嘗試；不dispatch偽submit、不移除/改選照片或修改欄位，不繞過disabled建立控制。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t151-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t151-files.sha256`，索引SHA256 `a510beac8f40f8aeaedab214a842da6fb8cdacef808a574ae55171d7df156e1f`；命令均結束，單worker，無刻意保留服務。

### T152 — binding完成；產品前序schema RED／runtime待驗

- Enter後HEIC錯誤/轉檔與改選/移除入口保持、建立disabled，真DOM name/date與Act前相同且可修正；busy結束、不顯示成功。所有POST為零，owner trip/reservation集合與真API兩scope不變、無京都賞楓/圖片，原完整旅行帳務保持。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t152-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t152-files.sha256`，索引SHA256 `6ff3e551247a7c06d2087cd4b607496cbe2acc619791590e528592617d68843e`；命令均結束，單worker，無刻意保留服務。

### T153 — binding完成；產品前序schema RED／runtime待驗

- 可見建立一次，真upstream201已提交但完整回應保留至When；用原client UUID核對DB唯一京都賞楓、active/default、owner/保留ID/零帳務/零縮圖及原旅行不變，不先把成功交給UI。阻擋原UUID state/Trip與清單查證，神社File/表單仍在、thumbnail零；只控制真正回應流，不製造錯誤結果。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t153-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t153-files.sha256`，索引SHA256 `1972fb7342889bbc9109e48102da24f0070303c084be562a8e8720e7ba24c155`；命令均結束，單worker，無刻意保留服務。

### T154 — binding完成；產品前序schema RED／runtime待驗

- 只釋放原POST的真201回應截斷屏障，等待原native transport/body failure確實到達；UI須開始GET原UUID state，不重送POST trips或提前thumbnail。沒有額外使用者建立/保存動作，原client UUID及File未改。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t154-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t154-files.sha256`，索引SHA256 `a0662fe9f9ff11c7aa12226ac6f0b8e0a80605f9456cf55ae172b9b9255268e7`；命令均結束，單worker，無刻意保留服務。

### T155 — binding完成；產品前序schema RED／runtime待驗

- unknown可見且有界查證結束、再次查證可用而建立鎖住；原name/date/神社File完整native hash與像素保持。只查原UUID、不以清單缺項判失敗，create1/thumbnail0、無成功或失敗假象；真DB原UUID唯一存在active/default，原旅行/其他資料完整保持。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t155-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t155-files.sha256`，索引SHA256 `8d4a3f475500ffa2d5aae8fa9f253ce6aa25a0f5279c4ce683a5a668e545ed34`；命令均結束，單worker，無刻意保留服務。

### T156 — binding完成；產品前序schema RED／runtime待驗

- 真UI建立回應遺失→有界unknown，原File/name/date保持、create1/image0；真owner state/Trip讀取確認同原UUID為active/default/版本0且DB快照相同，再僅解除GET查證屏障。Arrange不再次查證UI或先提交圖片，續存留待When。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t156-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t156-files.sha256`，索引SHA256 `74ebed12d750618fd595fbef26d200a3296b532f43f83b38fac24bcb86efec9f`；命令均結束，單worker，無刻意保留服務。

### T157 — binding完成；產品前序schema RED／runtime待驗

- 再次查證單次點擊，先真GET原UUID state/Trip200、核對active/名稱日期，再僅原ID一個thumbnail POST200，create仍1。修正observer不再優先使用failed201：僅完整201或完整真Trip lookup可作確認。nativefetch/json pass-through觀測在image fetch開始時鎖定確認來源，避免測試屏障替錯誤client補順序；兩瀏覽器support另證未讀201標頭不是確認、完成JSON/active-state+Trip才是，原multipart全hash及cookie保持。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t157-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t157-files.sha256`，索引SHA256 `56d18ca61d9bb42e05e430e62ecfb534c02555a2148a3c426d02d1814f740ee5`；命令均結束，單worker，無刻意保留服務。

### T158 — binding完成；產品前序schema RED／runtime待驗

- 全程create1、原201失敗事實保留，native client確認來源lookup先於image fetch，真Trip GET後同UUID僅一圖片命令；beforeImage等於已建立default快照，正式新WebP/版本1/收據及精確圖片驗證通過條件齊全。owner trip/reservation集合只增加原UUID、Kyoto唯一；primary無unknown/busy，另一尺寸原生卡片神社64×48，原Japan/其他資料保持。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t158-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t158-files.sha256`，索引SHA256 `9641841421237daf25166bfdea180d02d01f1d5eac204ecbf52781e3448c3475`；命令均結束，單worker，無刻意保留服務。

- T158補驗：原truth整份`新增旅行與選填縮圖.feature`完整複本bddgen/list exit0，Total: 32 tests in 1 file；無missing/ambiguous。這是整檔binding/收集證據，未執行整檔runtime；新creation-audit機制兩瀏覽器單獨support通過，不能替代產品Feature Green。logs `.cache/implement-006/t158-full-{bddgen,list}.log`。

### T159 — binding完成；產品前序schema RED／runtime待驗

- 五種原命令真提交/持久收據已驗、原回應截斷；保留真UUID/File/版本，將正在等待的receipt/state查證失敗停在可釋放gate（其後查證仍失敗），不假造500/404結果。新增附圖create已完整確認且只有圖片未知。Given等真查證in-flight、保持一原命令，不先跑完有界unknown；cleanup釋放所有held handler並等歸零。五例全量生成/收集，代表RED與完整runtime分列。
- 所有5個focused pickles完整bddgen/list；本筆RED依代表入口僅執行正規式(?:移入|新增附圖) 的資料組合（每project 2例），其餘案例未執行、runtime待schema/完整Feature Green；不算skip或已通過。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共8個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、8/8皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t159-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t159-files.sha256`，索引SHA256 `90371751056a7de951af89714ec99a28f2cfad646c38d24b22771b75304eb380`；命令均結束，單worker，無刻意保留服務。

### T160 — binding完成；產品前序schema RED／runtime待驗

- 釋放目前真正in-flight查證失敗回覆，後續GET仍不可用，不改遠端權威事實；等待pending gate歸零與有界終點再次查證可用。命令數不增，不關閉編輯或重送；controller非關頁錯誤顯式記錄供斷言，避免未處理route exception掩蓋原因。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共20個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、20/20皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t160-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t160-files.sha256`，索引SHA256 `5c12f3d56ca24d2e13876816e24d1870afcb0b6d2d637ce3ff52fdd1b39fff7f`；命令均結束，單worker，無刻意保留服務。

### T161 — binding完成；產品前序schema RED／runtime待驗

- 五種unknown在有界終點清除busy/progress/查證spinner而再次查證可用；原trip/opID與精確命令計數保持，圖片draft用nativeBlob hash核對、reset意圖仍可見，新增附圖不回退已確認create。完整遠端提交結果/收據/DB與其他旅行保持。gate限定receipt/state，避免把普通binary/list pending誤當查證。
- 所有5個focused pickles完整bddgen/list；本筆RED依代表入口僅執行正規式(?:移入|新增附圖) 的資料組合（每project 2例），其餘案例未執行、runtime待schema/完整Feature Green；不算skip或已通過。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共8個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、8/8皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t161-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t161-files.sha256`，索引SHA256 `bdae8df8b102adddfd38989de76bbcaaee506af64df39bb46a3a65506a8b533c`；命令均結束，單worker，無刻意保留服務。

### T162 — binding完成；產品前序schema RED／runtime待驗

- 真reset提交default/回應遺失/有界unknown後，X關閉再經管理選單返回同editor，保留同owner原trip/opID/reset意圖。返回仍只讀原receipt且未知，DB未撤回，整個Given僅原DELETE一次；最後才解除GET屏障，未提前查證成功或新送圖片命令。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t162-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t162-files.sha256`，索引SHA256 `be80963a9e694ca535cf27ad2509b5490c350e8b02dc47db0cf93581a30e3769`；命令均結束，單worker，無刻意保留服務。

### T163 — binding完成；產品前序schema RED／runtime待驗

- 返回後單次再次查證，只讀原trip/opID的真receipt200（內含currentState）並等body/必要讀取完成；保留瀏覽器實際內容供Then，整程仍僅原DELETE一次，無新圖片命令或重建。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t163-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t163-files.sha256`，索引SHA256 `6ef605110425141707a8e7d6d2da506b358e9a9cc211e3d451e748da438a9f4d`；命令均結束，單worker，無刻意保留服務。

### T164 — binding完成；產品前序schema RED／runtime待驗

- 真browser receipt等於原reset outcome，原op與最新default分清；UI確認並結束unknown/busy，另一尺寸context只讀卡片/Trip亦default、富士山舊URL404。讀取只查原IDs，DB完整等於原reset後快照、全程DELETE1/其他POST0，關閉沒有撤回且帳務/其他旅行保持。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t164-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t164-files.sha256`，索引SHA256 `6f4615b8122ab13ed36e0df034c23717f43f79c2375776e429e5fe646120a018`；命令均結束，單worker，無刻意保留服務。

### T165 — binding完成；產品前序schema RED／runtime待驗

- 真UI原次multipart未完整/正式400與DB無提交、神社File原生bytes仍可用；抽出既有T134斷言原義不變供Arrange重用。移除wire截斷恢復正常upload、真state/圖片可讀，保存前次opID及writeStart1供新意圖；不在Given先重送、原帳務/圖完整不變。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t165-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t165-files.sha256`，索引SHA256 `bcc494062d6dcc033012ea6134dec59b08a6a400396c817d943c34c617fd8603`；命令均結束，單worker，無刻意保留服務。

### T166 — binding完成；產品前序schema RED／runtime待驗

- 在原editor重新選真合法神社PNG，原生預覽/decode/hash核對後一次保存；按當前兩版本與client新operationId提交，與前次中斷op不同，等待正式200。直接沿用保存工具與writeStart1；不POST trips、不自動重播舊stream。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t166-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t166-files.sha256`，索引SHA256 `006b4cc2ee47e399b2fecc343b8bb44e10668e1fddde7fa9256060a89721fec8`；命令均結束，單worker，無刻意保留服務。

### T167 — binding完成；產品前序schema RED／runtime待驗

- 同trip新神社WebP/唯一receipt/版本+1/舊富士山URL404與另一尺寸native卡片一致；僅前次失敗＋新成功兩個圖片命令、無create或重複資料。舊錯誤與busy清除、被替換Blob透過可等待原生cleanup釋放；完整帳務/其他trip不變。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t167-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t167-files.sha256`，索引SHA256 `18beab4394c3add54b8f5d3ef35f578426809d0cec0773d2101d430b8e5ea583`；命令均結束，單worker，無刻意保留服務。

- T167補驗：整份原truth `縮圖預覽與保存.feature` bddgen/list exit0，Total: 46 tests in 1 file；無missing/ambiguous。僅binding/全案例收集，runtime/完整Green未跑；logs `.cache/implement-006/t167-preview-full-{bddgen,list}.log`。

- T167補驗：整份原truth `縮圖限制與選圖錯誤.feature` bddgen/list exit0，Total: 96 tests in 1 file；無missing/ambiguous。僅binding/全案例收集，runtime/完整Green未跑；logs `.cache/implement-006/t167-policy-full-{bddgen,list}.log`。

### T168 — binding完成；產品前序schema RED／runtime待驗

- 既有T178 binding沿用；Then先正式schema能力斷言與真owner GET trip state200/active並對DB兩版本/hasThumbnail，再讀原expense UUID404。trash/purged不能誤當單筆DELETE成功；既有sole-dinner source/shares/付款安排/精確零淨額/會計版本及再讀斷言完整保留。前序When真UI DELETE204與projection仍實跑，runtime進到Then正式schema RED；另跑原pure projection防退化測試。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t168-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t168-files.sha256`，索引SHA256 `1248446a56d02e0474d2c3d191c80052eeedc32f36629334cb748abc83960c65`；命令均結束，單worker，無刻意保留服務。

### T169 — binding完成；產品前序schema RED／runtime待驗

- 真原expense完整草稿/UUID與豐富原帳務；active原DELETE204真刪支出/份額，trash在其他context移入後原DELETE409保留支出，purged由其他context整趟清除後原DELETE404。bodyless route.fetch(maxRetries0/maxRedirects0)只送一次真DELETE，捕捉真HTTP/DB結果後abort瀏覽器delivery，阻擋初次GET查證維持unknown；不fake500/404或預認單筆成功。native兩瀏覽器另驗真204/emptybody、原Cookie及server/browser各一次。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共12個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、12/12皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t169-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t169-files.sha256`，索引SHA256 `ab37fb8b50db9935591e788f9169ec313931e0473d08e8823d65d24723f3dee0`；命令均結束，單worker，無刻意保留服務。

### T170 — binding完成；產品前序schema RED／runtime待驗

- 原意圖查證可見控制單次點擊，第一個protocol GET必須原trip state200且對真DB；僅active等原expense404，不重送DELETE/POST/復原。另加nativefetch/json read audit，記住expense fetch開始時是否已真正讀完state JSON，防平行請求僅靠發送順序假裝state-first；兩瀏覽器support驗未讀標頭不算、active不會殘留到trash/purged、Cookie保持。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共12個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、12/12皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t170-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t170-files.sha256`，索引SHA256 `a2edecf808b078a32d2e84dfd72f6c7bd2ccc531e6bb268bc9e14915449dd8a2`；命令均結束，單worker，無刻意保留服務。

### T171 — binding完成；產品前序schema RED／runtime待驗

- active＋真正讀完state JSON後expense404才顯單筆刪除，保留全部既有實付並由獨立有理數oracle驗重算淨額；trash顯垃圾桶/復原下一步且原支出/份額保留；purged顯整趟消失不歸因原DELETE。初次state不可用不得偷查expense404、非active全程零expense probe；查證只讀、原DELETE1、完整DB/圖片/其他旅行不變，無busy/可用普通帳務控制。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共12個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、12/12皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t171-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t171-files.sha256`，索引SHA256 `b61924d2f3ed627ff2beb73c0d4613cbf6309cd63340504a517ff227261ec111`；命令均結束，單worker，無刻意保留服務。

### T172 — binding完成；產品前序schema RED／runtime待驗

桌機原生新增表單填點心JPY500、Alice付款與Alice/Amy分攤；獨立手機context同owner真trash。保存完整草稿欄位、生命週期前後DB快照，確認帳務、縮圖、保留名不變、receipt僅加一，原表單未送任何寫入。兩裝置尺寸由DSL固定，未假造HTTP回應。
- Chromium/WebKit依序×DSL明列裝置（不額外倍增尺寸），共2個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、2/2皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t172-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t172-files.sha256`，索引SHA256 `e0346e1b72a8ca1b373071eede962765b6a707b7c7b0be84f0d2b90b8563cb42`；命令均結束，單worker，無刻意保留服務。

### T173 — binding完成；產品前序schema RED／runtime待驗

舊表單只點儲存一次，觀測真POST409 TRIP_TRASHED與原草稿payload；後續只容許GET正式trip state且與DB垃圾桶版本一致，不容許child reads、自動復原或重送，DB完整等於trash後快照。
- Chromium/WebKit依序×DSL明列裝置（不額外倍增尺寸），共2個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、2/2皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t173-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t173-files.sha256`，索引SHA256 `470162e5bbf4852a5b08090498eb38b1b70af259b90134a889abcbe2a4fe37c6`；命令均結束，單worker，無刻意保留服務。

### T174 — binding完成；產品前序schema RED／runtime待驗

驗證垃圾桶狀態與可操作的垃圾桶復原連結、busy結束、無保存成功宣告；正向保留點心全部草稿欄位而鎖住普通支出操作。DB整份快照與trash後相等，無點心或份額/付款/會計版號變更、其他旅行與共用資料不變；原POST僅一次、後續僅state GET。
- Chromium/WebKit依序×DSL明列裝置（不額外倍增尺寸），共2個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、2/2皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t174-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t174-files.sha256`，索引SHA256 `81cb45d39c5fe3cca03c8de973ae76e314f8d545e85190f2eed9a7df7588bc5a`；命令均結束，單worker，無刻意保留服務。

### T175 — binding完成；產品前序schema RED／runtime待驗

12種truth頁面/內容映射正式路由與精確query；隔離owner豐富非空DB，先以實際owner API與獨立精確淨額oracle核對。瀏覽器尚未導航、query cache空；原生Vite response proxy只hold指定query實際200 bytes，其餘API正常流過，清理必釋放。結清表單使用真實非空arrangement key。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共48個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、48/48皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t175-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t175-files.sha256`，索引SHA256 `a7135f843df8f6add9d730308af82a30df398b04b6ef19d4827e6cbc5ce312db`；命令均結束，單worker，無刻意保留服務。

### T176 — binding完成；產品前序schema RED／runtime待驗

一次導航正式頁面，DOMContentLoaded後等指定真upstream query到達屏障，斷言未release/未完成且無錯；不以load/networkidle等待held response、不提交mutation。全12例bddgen/list；代表RED只取旅行清單確認相同正式schema缺口，其他11例runtime待Green完整矩陣。
- 所有12個focused pickles完整bddgen/list；本筆RED依代表入口僅執行正規式旅行清單／一般旅行 的資料組合（每project 1例），其餘案例未執行、runtime待schema/完整Feature Green；不算skip或已通過。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t176-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t176-files.sha256`，索引SHA256 `bb3e26d6c80e6cbb66ed930ee74c1d50b64815ee3be4c01d7dc5751e5a6d60d1`；命令均結束，單worker，無刻意保留服務。

### T177 — binding完成；產品前序schema RED／runtime待驗

以指定內容的accessible region/form定位結構骨架，必須busy、唯一可讀status、至少兩個可見跨列圖形且無可focus操作；不能只有文字/空白、不能提早空值/錯誤。帳本局部query保持已完成標題與兄弟內容可見，DB/shared快照不變。12例完整收集，代表旅行清單RED×兩瀏覽器兩尺寸，其餘runtime待完整Green。
- 所有12個focused pickles完整bddgen/list；本筆RED依代表入口僅執行正規式旅行清單／一般旅行 的資料組合（每project 1例），其餘案例未執行、runtime待schema/完整Feature Green；不算skip或已通過。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t177-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t177-files.sha256`，索引SHA256 `8389a86a9a587b5983caaff900d82e7217334fe8477004c3c8a52c0314b20007`；命令均結束，單worker，無刻意保留服務。

### T178 — binding完成；產品前序schema RED／runtime待驗

成功/成功空Given保持同一原次真讀取屏障，導航後先正向確認指定內容結構骨架、busy與未空值，未release、不額外query或提交mutation；下一When才釋放原API bytes。12例完整收集，代表旅行清單schema RED四組，其餘runtime待完整Green。
- 所有12個focused pickles完整bddgen/list；本筆RED依代表入口僅執行正規式旅行清單／一般旅行 的資料組合（每project 1例），其餘案例未執行、runtime待schema/完整Feature Green；不算skip或已通過。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t178-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t178-files.sha256`，索引SHA256 `088247f2969851bbc81622d20517d213eeb5d52551af7f35b7ebb471d51b50b3`；命令均結束，單worker，無刻意保留服務。

### T179 — binding完成；產品前序schema RED／runtime待驗

記錄原次browser Request，只release其真實200屏障，完成後同一Request body等於先前owner權威資料；指定區域busy結束，不導航、不刷新、不重送query、無mutation。12例完整收集，代表旅行清單schema RED四組，後序runtime不宣告已通過。
- 所有12個focused pickles完整bddgen/list；本筆RED依代表入口僅執行正規式旅行清單／一般旅行 的資料組合（每project 1例），其餘案例未執行、runtime待schema/完整Feature Green；不算skip或已通過。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t179-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t179-files.sha256`，索引SHA256 `54480c8dd62b1256b6efbd04a76a151c46de94ed11409b382469d5e43fcbbac1`；命令均結束，單worker，無刻意保留服務。

### T180 — binding完成；產品前序schema RED／runtime待驗

12種內容依各畫面責任核對API/DB權威資料，含旅行日期/筆數/隔離、個人JPY2000與TWD300精確總額、逐支出日期/幣別/金額、舊表單payer/share與每人JPY1000份額、分類/成員清單、分帳付款安排與原arrangement key、還款成員選項。指定區域busy/skeleton結束，DB與shared不寫入。12例完整收集，代表RED四組，其他runtime留待完整Green。
- 所有12個focused pickles完整bddgen/list；本筆RED依代表入口僅執行正規式旅行清單／一般旅行 的資料組合（每project 1例），其餘案例未執行、runtime待schema/完整Feature Green；不算skip或已通過。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t180-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t180-files.sha256`，索引SHA256 `9592ffbf8599bb9baeaffabb9f7c536b595ce3b8d15d569c28702e9e43272c3f`；命令均結束，單worker，無刻意保留服務。

### T181 — binding完成；產品前序schema RED／runtime待驗

真成功空scope：API items=[]、owner DB trash零筆，等待骨架須先經過T178；原次200完成後才呈現空垃圾桶，無busy/spinner/skeleton。兩個active旅行與全部帳務/shared快照不變，無mutation。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t181-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t181-files.sha256`，索引SHA256 `a2b8901edc3d1a3ae7246da1b12c1971b31b8b4c00cda3f92fa2c7cbfe795d7a`；命令均結束，單worker，無刻意保留服務。

### T182 — binding完成；產品前序schema RED／runtime待驗

隔離Alice有效本地session與真私人帳務基線，先以Node權威/me200核對帳號，再於未載入網站的blank page設定原生session response屏障。只hold真/me200 bytes，不造身分、不預先渲染私人頁；清理必釋放。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t182-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t182-files.sha256`，索引SHA256 `42fef066d75ead0e2a6ff8256878daca2adca4bc662040784c81bd0c41cb9d33`；命令均結束，單worker，無刻意保留服務。

### T183 — binding完成；產品前序schema RED／runtime待驗

只開站一次觸發原/me，DOMContentLoaded後斷言真session response仍被hold，初讀恰好一次、無私人資料query、無登入命令或其他mutation。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t183-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t183-files.sha256`，索引SHA256 `07045ab9b9d4013e6d9234406992ce53fe707230edf4a3fbe00041989313b504`；命令均結束，單worker，無刻意保留服務。

### T184 — binding完成；產品前序schema RED／runtime待驗

身分等待使用可見圖形spinner、可理解accessible status且無可見loading文字與可focus節點；未渲染私人旅行/成員/帳本、未宣稱登出或要求登入。原/me仍hold，Node權威/me200與DB有效session正向核對，無額外query/登入命令/資料變更。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t184-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t184-files.sha256`，索引SHA256 `b229e7cdf857ab7d604f662c20723b7f8b48970f51b1f9ed3aa63611d0d140ce`；命令均結束，單worker，無刻意保留服務。

### T185 — binding完成；產品前序schema RED／runtime待驗

active owner真新增支出表單，精確延遲三種必要選項query之一，所有選項權威資料非空、其餘API真200完成；保持合法JPY整數500草稿及日期，未提交mutation。重用原生response屏障，不替換整頁資料。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共12個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、12/12皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t185-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t185-files.sha256`，索引SHA256 `2e1085e4e39558988142f20994a6526369ef2e5b0854cc025b8c244e658b8e2a`；命令均結束，單worker，無刻意保留服務。

### T186 — binding完成；產品前序schema RED／runtime待驗

在已開表單僅聚焦指定選項的accessible region/group一次，維持原queryhold與草稿，不保存、不重送。三選項完整收集，代表幣別RED四組，其餘runtime待Green。
- 所有3個focused pickles完整bddgen/list；本筆RED依代表入口僅執行正規式幣別 的資料組合（每project 1例），其餘案例未執行、runtime待schema/完整Feature Green；不算skip或已通過。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t186-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t186-files.sha256`，索引SHA256 `8cadce96decf87999b2128a13f37de4bf0b8b0bd2c481d5dfaca9c91b29a99d9`；命令均結束，單worker，無刻意保留服務。

### T187 — binding完成；產品前序schema RED／runtime待驗

指定選項busy+spinner-only與可理解accessible name，圖形真可見且無可見loading文字（允許正確裁切的讀屏文字）；不誤報沒有選項。保存disabled、零mutation、合法草稿保留且其他欄位可用；三個選項權威非空、DB/shared完整不變。三例完整收集，代表幣別RED四組，其他runtime待完整Green。
- 所有3個focused pickles完整bddgen/list；本筆RED依代表入口僅執行正規式幣別 的資料組合（每project 1例），其餘案例未執行、runtime待schema/完整Feature Green；不算skip或已通過。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t187-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t187-files.sha256`，索引SHA256 `3787000fa5f640184bc43a54f9e1843e2a319613c080d98b7ce8d91bd363aabd`；命令均結束，單worker，無刻意保留服務。

### T188 — binding完成；產品前序schema RED／runtime待驗

依DSL完整22操作對照建立真合法表單/確認/最新版本，控制端點與method/status逐操作定義。簡化模式false、default縮圖、inactive Amy、unused Carol/伴手禮各為獨立fixture。修改/刪除支出與付款用獨立新帳本，原rich帳本完整留存另快照；單一JPY100點心與兩筆互抵歷史實付測刪除保存付款，還款/結清則Amy欠Alice100。原生proxy僅攔目標真mutation完成回應、記錄已提交DB再hold，清理必釋放，不拿query冒充busy。22例完整收集，代表建立旅行RED四組，其他runtime待完整Green。
- 所有22個focused pickles完整bddgen/list；本筆RED依代表入口僅執行正規式建立旅行 的資料組合（每project 1例），其餘案例未執行、runtime待schema/完整Feature Green；不算skip或已通過。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t188-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t188-files.sha256`，索引SHA256 `393095e27082506342bb5bcdf2a26a6372fb9ddaf5be4818b5a843906df4e47e`；命令均結束，單worker，無刻意保留服務。

### T189 — binding完成；產品前序schema RED／runtime待驗

在既有合法表單/確認/切換控制點擊一次；記錄原bbox/accessible操作名、真正Request method/path/UUID/operationId/revisions與22操作精確payload。等待原生命令真成功後的DB快照hold，不另執行第二操作；請求數恰一。22例完整收集，代表建立旅行RED四組，其餘runtime待Green。
- 所有22個focused pickles完整bddgen/list；本筆RED依代表入口僅執行正規式建立旅行 的資料組合（每project 1例），其餘案例未執行、runtime待schema/完整Feature Green；不算skip或已通過。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t189-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t189-files.sha256`，索引SHA256 `7f5da848976805b0c60e6cd937a467d63150425ad16c7b3146f004c591be12db`；命令均結束，單worker，無刻意保留服務。

### T190 — binding完成；產品前序schema RED／runtime待驗

22種命令等待中保持原accessible操作名/焦點、busy、bbox誤差≤1px；真spinner圖形中心與按鈕中心誤差≤1px，無可見loading動詞、假百分比或成功假象。表單草稿保持；已由真upstream提交的命令DB維持同快照，沒有因busy追加效果/第二寫入。22例收集、代表建立旅行RED四組，其餘runtime待Green。
- 所有22個focused pickles完整bddgen/list；本筆RED依代表入口僅執行正規式建立旅行 的資料組合（每project 1例），其餘案例未執行、runtime待schema/完整Feature Green；不算skip或已通過。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t190-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t190-files.sha256`，索引SHA256 `1a6b172838a625661ec6ae75a7ac91dbd4267e3b5578a192ee6ca2cfd23b2125`；命令均結束，單worker，無刻意保留服務。

### T191 — binding完成；產品前序schema RED／runtime待驗

每個F079案例重新隔離Arrange22操作合法資料；原次可見提交一次並正向確認busy/圖形/尺寸/語意與真mutation回應hold。保留原IDs、已提交DB與可釋放屏障，不承接其他scenario、不把查query當作命令。22例收集，代表建立旅行schema RED四組，其餘runtime待Green。
- 所有22個focused pickles完整bddgen/list；本筆RED依代表入口僅執行正規式建立旅行／只建立一趟新旅行 的資料組合（每project 1例），其餘案例未執行、runtime待schema/完整Feature Green；不算skip或已通過。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t191-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t191-files.sha256`，索引SHA256 `736b7a9f443eb96b2ebbd137fe1784405afb80d9bf88915274a8a287d43e8571`；命令均結束，單worker，無刻意保留服務。

### T192 — binding完成；產品前序schema RED／runtime待驗

同一busy控制原生pointer雙擊與兩次Enter後，由環境釋放原命令回應；不fake submit、不移除disabled、不直接重送API。觀測全部browser mutations，原Request identity與數量恰一；原回應完整真status/body、DB屏障完成後仍只一命令。22例收集、代表建立旅行RED四組，其餘runtime待完整Green。
- 所有22個focused pickles完整bddgen/list；本筆RED依代表入口僅執行正規式建立旅行／只建立一趟新旅行 的資料組合（每project 1例），其餘案例未執行、runtime待schema/完整Feature Green；不算skip或已通過。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t192-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t192-files.sha256`，索引SHA256 `1f1360ea4294499dc0229f3c1b3d6b3dc1cbcefb0d3085698025b52215cc5190`；命令均結束，單worker，無刻意保留服務。

### T193 — binding完成；產品前序schema RED／runtime待驗

完整22種成功oracle：重用真lifecycle/media收據/版本/清理/保留斷言；新增trip/owner/reservation各一、其餘旅行完整；支出JPY100/200份額50/100與精確淨額/帳務+1、刪除保留既有兩付款且歸零；類別/member穩定ID與歷史FK/範圍外完整；模式不改來源；獨立還款40剩60無settlement，實付100唯一settlement/payment/零差額adjustments。當前UI成功/busy結束，另尺寸fresh context真API重讀可見結果與圖片像素，不以toast代替DB。22例收集，代表建立旅行RED四組，其餘runtime待完整Green。
- 所有22個focused pickles完整bddgen/list；本筆RED依代表入口僅執行正規式建立旅行／只建立一趟新旅行 的資料組合（每project 1例），其餘案例未執行、runtime待schema/完整Feature Green；不算skip或已通過。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t193-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t193-files.sha256`，索引SHA256 `e5f7a1528b411e520a0e7ca11b18c3789cbac4c9d774faf48bc642de3ec22ee1`；命令均結束，單worker，無刻意保留服務。

### T193 — binding完成；產品前序schema RED／runtime待驗

完整22種成功oracle：重用真lifecycle/media收據/版本/清理/保留斷言；新增trip/owner/reservation各一、其餘旅行完整；支出JPY100/200份額50/100與精確淨額/帳務+1、刪除保留既有兩付款且歸零；類別/member穩定ID與歷史FK/範圍外完整；模式不改來源；獨立還款40剩60無settlement，實付100唯一settlement/payment/零差額adjustments。當前UI成功/busy結束，另尺寸fresh context真API重讀可見結果與圖片像素，不以toast代替DB。22例收集，代表建立旅行RED四組，其餘runtime待完整Green。
- 同筆補強並重驗：fresh page每次導航先等精確目標API200完整完成及讀取結束，避免刪除不存在斷言在尚未載入時假陽性；原畫面category/member刪除/改名/狀態亦正向驗更新。fresh context觀測零mutation，前後範圍外快照相等。前一索引為首輪歷史版本，以本次新索引與logs為準。
- 所有22個focused pickles完整bddgen/list；本筆RED依代表入口僅執行正規式建立旅行／只建立一趟新旅行 的資料組合（每project 1例），其餘案例未執行、runtime待schema/完整Feature Green；不算skip或已通過。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t193-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t193-files.sha256`，索引SHA256 `6cd86b1add600ecf057b59032ab9d73db7feb5c24f64b7c5f0c0388f5da78a9d`；命令均結束，單worker，無刻意保留服務。

### T194 — binding完成；產品前序schema RED／runtime待驗

瀏覽器無session cookie且真/me401，Alice私人資料供隔離斷言。僅外部Google協議使用既有fixture，真BetterAuth本地start handler200/URL及callback/session不造假。原生proxy延遲本地啟動回應、記錄所有本地POST與external啟動，控制清理必release；不修改第三方UI。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t194-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t194-files.sha256`，索引SHA256 `4eb703837c4c1a93dbcd97ae5a4da4131ddeb0a2dca16685ee640d1393a5a2f2`；命令均結束，單worker，無刻意保留服務。

### T195 — binding完成；產品前序schema RED／runtime待驗

只點本地Google登入一次，記錄原bbox/name；真signin/social POST provider與callbackURL精確，200回應仍在原生屏障，未進外部頁/未建立瀏覽器session。所有browser mutation恰一、無第二Act。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t195-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t195-files.sha256`，索引SHA256 `160d54ab44ca2ca6b2fcdcff2b70b8b6fcd49b98f1bb0e76e10a4b982d26fbeb`；命令均結束，單worker，無刻意保留服務。

### T196 — binding完成；產品前序schema RED／runtime待驗

本地登入控制保留Google登入accessible name/尺寸與busy，真圖形spinner-only且讀屏可理解登入中；無可見loading動詞、假百分比、私人資料或已登入假象。me仍401無session cookie、啟動一POST外部零、業務及範圍外資料不變。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t196-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t196-files.sha256`，索引SHA256 `7ab0ffc2db6c21874b2d09aff4b39426209c2ef683455651c18e2d6a433fac89`；命令均結束，單worker，無刻意保留服務。

### T197 — binding完成；產品前序schema RED／runtime待驗

獨立Arrange真本地未登入→原次start一次→busy確認，保留真成功回應屏障供共用重複觸發When使用。共用When新增login adapter：原生雙擊/Enter後release原start200，外部fixture→真BetterAuth callback/session→真旅行頁；本地POST/外部OAuth啟動/callback各一次，不造本地session。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t197-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t197-files.sha256`，索引SHA256 `10c3ef909bfea749ad0b864612e97dc1df52e88aa06cc36c89f3899d042fb2e1`；命令均結束，單worker，無刻意保留服務。

### T198 — binding完成；產品前序schema RED／runtime待驗

本地POST/externalOAuth/callback各一次，真回站旅行UI與busy結束；瀏覽器context/me200精確Alice，真HttpOnly session cookie對應DB有效session（只查user_id/active，不輸出token）。業務/shared/他帳號不變；僅容許Alice自身OAuth profile timestamp更新。不使用第三方UI文字證明成功。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t198-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t198-files.sha256`，索引SHA256 `9bbd0fc356e3a3613139db9b0f4b972865b8f60048413406742157fbfc26a3c6`；命令均結束，單worker，無刻意保留服務。

### T199 — binding完成；產品前序schema RED／runtime待驗

獨立active帳本真25筆/50份額：20×JPY100、5×TWD200，Alice付款與Alice/Amy均分；API真20+5 cursor完整ID集合==DB25。SQL grossJPY2000/TWD1000，owner個人總額精確JPY1000/TWD500涵蓋未顯示5筆；原20只含JPY750，能辨識漏算尾頁。頁面原20與全帳總額確認後才裝精確second cursor原生回應屏障，原rich帳本/shared完整保留，無UImutation。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t199-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t199-files.sha256`，索引SHA256 `280fb772aa0a9baa0c76b73bde39f71a217d4ce6da3d778cd6eabcf6fdeb2ba0`；命令均結束，單worker，無刻意保留服務。

### T200 — binding完成；產品前序schema RED／runtime待驗

只點原生載入更多一次，保存原bbox，觀測真GET第二頁恰一與原cursor精確一致；真5筆response仍停原生屏障、未釋放，無mutation與其他Act。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t200-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t200-files.sha256`，索引SHA256 `3086243c88f49ae996c9869f96f87d81a6e0adf5353973f824ce9c342ef23e98`；命令均結束，單worker，無刻意保留服務。

### T189 — binding完成；產品前序schema RED／runtime待驗

在既有合法表單/確認/切換控制點擊一次；記錄原bbox/accessible操作名、真正Request method/path/UUID/operationId/revisions與22操作精確payload。等待原生命令真成功後的DB快照hold，不另執行第二操作；請求數恰一。22例完整收集，代表建立旅行RED四組，其餘runtime待Green。
- 量測補正後重驗：先原生scrollIntoViewIfNeeded，再記錄操作前bbox，避免手機長表單click自動捲動被錯判為busy版面位移。先前T189索引屬歷史版，以本次新索引/logs為準；T190–T200既有狀態保持，完成後回到T201。
- 所有22個focused pickles完整bddgen/list；本筆RED依代表入口僅執行正規式建立旅行 的資料組合（每project 1例），其餘案例未執行、runtime待schema/完整Feature Green；不算skip或已通過。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t189-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t189-files.sha256`，索引SHA256 `f4d2c5e47ea29e9a974438bb9337a43fd24c546b52783f0c40d5377be146d857`；命令均結束，單worker，無刻意保留服務。

### T195 — binding完成；產品前序schema RED／runtime待驗

只點本地Google登入一次，記錄原bbox/name；真signin/social POST provider與callbackURL精確，200回應仍在原生屏障，未進外部頁/未建立瀏覽器session。所有browser mutation恰一、無第二Act。
- 同類尺寸量測補正後重驗：先scrollIntoViewIfNeeded再記錄bbox，保留操作本身自動捲動與busy位移的正確邊界。舊索引歷史版，以最新logs/manifest為準，完成回T201。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t195-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t195-files.sha256`，索引SHA256 `1e480c6cff968a451e2d0f0b5a286cbfda232529cbc8283971a6c11ae248f304`；命令均結束，單worker，無刻意保留服務。

### T175 — binding完成；產品前序schema RED／runtime待驗

12種truth頁面/內容映射正式路由與精確query；隔離owner豐富非空DB，先以實際owner API與獨立精確淨額oracle核對。瀏覽器尚未導航、query cache空；原生Vite response proxy只hold指定query實際200 bytes，其餘API正常流過，清理必釋放。結清表單使用真實非空arrangement key。
- 原生開發模式複核補正：兩引擎實證StrictMode初讀有取消的第一筆GET與有效第二筆GET。新增query-attempts保留全部attempt，僅明確GET ERR_ABORTED／WebKit cancelled歸類為取消；一般wire failed絕不排除。tracked原生工具測試兩瀏覽器各通過一例，分別驗cancelled與真正failed，log t175-mechanism.log。初讀後續步驟改以同一有效query為「原次」，When後仍禁止追加查詢；mutation次數不放寬。首輪48組為歷史版，本版所有12例收集並代表RED四組，以最新manifest/logs為準。

- 所有12個focused pickles完整bddgen/list；本筆RED依代表入口僅執行正規式旅行清單／一般旅行 的資料組合（每project 1例），其餘案例未執行、runtime待schema/完整Feature Green；不算skip或已通過。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t175-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t175-files.sha256`，索引SHA256 `61a5da01bd9c2dc85afd148a8703665f817f798847bb0a0a3bf6cf27f16c7701`；命令均結束，單worker，無刻意保留服務。

### T179 — binding完成；產品前序schema RED／runtime待驗

記錄原次browser Request，只release其真實200屏障，完成後同一Request body等於先前owner權威資料；指定區域busy結束，不導航、不刷新、不重送query、無mutation。12例完整收集，代表旅行清單schema RED四組，後序runtime不宣告已通過。
- StrictMode原生證據補正後重驗：保留所有初讀attempt（最多一個已證實取消的GET）與唯一有效Request。釋放時完成所有真回應屏障，但只有原有效Request作200/資料確認；釋放後整份attempt identity/數量不變，絕不容許新query或替換Request。前版索引歷史，最新logs/manifest為準；原生機制兩引擎測試見t175-mechanism.log。
- 所有12個focused pickles完整bddgen/list；本筆RED依代表入口僅執行正規式旅行清單／一般旅行 的資料組合（每project 1例），其餘案例未執行、runtime待schema/完整Feature Green；不算skip或已通過。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t179-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t179-files.sha256`，索引SHA256 `5cda88b3e77579a5f5a4d0fa9db235633d73f409d1e965c8b46fa0c771edc06e`；命令均結束，單worker，無刻意保留服務。

### T175 — binding完成；產品前序schema RED／runtime待驗

12種truth頁面/內容映射正式路由與精確query；隔離owner豐富非空DB，先以實際owner API與獨立精確淨額oracle核對。瀏覽器尚未導航、query cache空；原生Vite response proxy只hold指定query實際200 bytes，其餘API正常流過，清理必釋放。結清表單使用真實非空arrangement key。
- 原生開發模式複核補正：兩引擎實證StrictMode初讀有取消的第一筆GET與有效第二筆GET。新增query-attempts保留全部attempt，僅明確GET ERR_ABORTED／WebKit cancelled歸類為取消；一般wire failed絕不排除。tracked原生工具測試兩瀏覽器各通過一例，分別驗cancelled與真正failed，log t175-mechanism.log。初讀後續步驟改以同一有效query為「原次」，When後仍禁止追加查詢；mutation次數不放寬。首輪48組為歷史版，本版所有12例收集並代表RED四組，以最新manifest/logs為準。

- 屏障觀測再補強：ProxyExchange增加純唯讀clientConnected()，不改原生bytes/headers/response流程；awaitInitialReadHeld要求唯一存活原生連線的真回應已被hold＋唯一有效browser Request，防止只攔到取消舊請求。兩引擎原生工具同時證明有效資料確實等待release後才渲染、真wire failure不被排除；最新t175-mechanism.log兩例通過。
- 所有12個focused pickles完整bddgen/list；本筆RED依代表入口僅執行正規式旅行清單／一般旅行 的資料組合（每project 1例），其餘案例未執行、runtime待schema/完整Feature Green；不算skip或已通過。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t175-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t175-files.sha256`，索引SHA256 `d14f307bfefd330596c66bafd61639910b2f6e383476fb28ef6a1df850110158`；命令均結束，單worker，無刻意保留服務。

### T176 — binding完成；產品前序schema RED／runtime待驗

一次導航正式頁面，DOMContentLoaded後等指定真upstream query到達屏障，斷言未release/未完成且無錯；不以load/networkidle等待held response、不提交mutation。全12例bddgen/list；代表RED只取旅行清單確認相同正式schema缺口，其他11例runtime待Green完整矩陣。
- 原生StrictMode複核後重驗：導航後正向確認唯一有效browser GET與仍存活native連線上的真回應已被hold，取消舊GET完整留存、不當成使用者重送。最新manifest/logs取代歷史版；工具證據t175-mechanism.log兩引擎各pass。
- 所有12個focused pickles完整bddgen/list；本筆RED依代表入口僅執行正規式旅行清單／一般旅行 的資料組合（每project 1例），其餘案例未執行、runtime待schema/完整Feature Green；不算skip或已通過。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t176-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t176-files.sha256`，索引SHA256 `4c1adc1502c84147302c927f421fdb5b4a0331ad9164341c5aa55752a9fecebb`；命令均結束，單worker，無刻意保留服務。

### T177 — binding完成；產品前序schema RED／runtime待驗

以指定內容的accessible region/form定位結構骨架，必須busy、唯一可讀status、至少兩個可見跨列圖形且無可focus操作；不能只有文字/空白、不能提早空值/錯誤。帳本局部query保持已完成標題與兄弟內容可見，DB/shared快照不變。12例完整收集，代表旅行清單RED×兩瀏覽器兩尺寸，其餘runtime待完整Green。
- 原生StrictMode/屏障補強後重驗：骨架前置正向確認唯一有效query的存活連線回應hold；焦點限制精確套在aria-hidden骨架與其後代的可用tab stop，避免把正常已載入或disabled控制誤認骨架可focus。T178共用此完整斷言自動承接；所有attempt仍留存。最新logs/manifest為準。
- 所有12個focused pickles完整bddgen/list；本筆RED依代表入口僅執行正規式旅行清單／一般旅行 的資料組合（每project 1例），其餘案例未執行、runtime待schema/完整Feature Green；不算skip或已通過。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t177-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t177-files.sha256`，索引SHA256 `2ca6791bde1c209457df997b9f853a3a3fec85572bcb1610d038c89a2ce5ed5f`；命令均結束，單worker，無刻意保留服務。

### T182 — binding完成；產品前序schema RED／runtime待驗

隔離Alice有效本地session與真私人帳務基線，先以Node權威/me200核對帳號，再於未載入網站的blank page設定原生session response屏障。只hold真/me200 bytes，不造身分、不預先渲染私人頁；清理必釋放。
- 原生StrictMode補正：auth初讀記錄所有真exchange與browser GET，不丟棄取消；awaitAuthReadHeld要求唯一有效Request＋唯一存活連線的真/me回應hold。取消最多一筆且必須是原生明確取消，普通wire failure不排除。原生工具兩引擎pass證據t175-mechanism.log；最新manifest/logs為準。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t182-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t182-files.sha256`，索引SHA256 `694ca4c6ecdf92e5bbcc26a985de768dd4017ca299a6c7ef9573a736cba37e16`；命令均結束，單worker，無刻意保留服務。

### T183 — binding完成；產品前序schema RED／runtime待驗

只開站一次觸發原/me，DOMContentLoaded後斷言真session response仍被hold，初讀恰好一次、無私人資料query、無登入命令或其他mutation。
- StrictMode複核後重驗：保留取消初讀紀錄，唯一有效/me GET與其仍存活native200回應已hold；所有初讀路徑只容許/me，未出現私人query或mutation。不是要求所有HTTP嘗試恰一，原生機制證據t175-mechanism.log兩引擎pass；最新logs/manifest取代歷史版。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t183-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t183-files.sha256`，索引SHA256 `023833f89ca0df0abc4fd7916432caf26b8040b764942f54e9add13a996f7bfc`；命令均結束，單worker，無刻意保留服務。

### T184 — binding完成；產品前序schema RED／runtime待驗

身分等待使用可見圖形spinner、可理解accessible status且無可見loading文字與可focus節點；未渲染私人旅行/成員/帳本、未宣稱登出或要求登入。原/me仍hold，Node權威/me200與DB有效session正向核對，無額外query/登入命令/資料變更。
- StrictMode複核後重驗：仍要求唯一有效且真native連線hold的/me，但保留明確取消初讀而不誤判多次登入；只容許/me初讀路徑、沒有privatequery/mutation。spinner/private/API/DB有效session正向斷言不變；最新logs/manifest取代歷史版。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t184-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t184-files.sha256`，索引SHA256 `8e08f805e86cb8d347415e401cff4138531a6a742a67d16984fcf32455d33277`；命令均結束，單worker，無刻意保留服務。

### T185 — binding完成；產品前序schema RED／runtime待驗

active owner真新增支出表單，精確延遲三種必要選項query之一，所有選項權威資料非空、其餘API真200完成；保持合法JPY整數500草稿及日期，未提交mutation。重用原生response屏障，不替換整頁資料。
- 原生StrictMode複核後重驗：指定選項唯一有效query與存活native200回應已hold，其餘query只將明確原生取消GET標示取消，所有未取消嘗試仍必須真200.finished；一般wire failure不被忽略。所有紀錄原樣保存，草稿/DB/零mutation條件不變。三例完整收集，本版代表幣別4RED；首輪12組為歷史版，以最新manifest/logs為準。
- 所有3個focused pickles完整bddgen/list；本筆RED依代表入口僅執行正規式幣別 的資料組合（每project 1例），其餘案例未執行、runtime待schema/完整Feature Green；不算skip或已通過。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t185-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t185-files.sha256`，索引SHA256 `6d15ff7b136f1fe21fc402014562cc8ea295372e6d4657444b54b0b3d5f8a421`；命令均結束，單worker，無刻意保留服務。

### T186 — binding完成；產品前序schema RED／runtime待驗

在已開表單僅聚焦指定選項的accessible region/group一次，維持原queryhold與草稿，不保存、不重送。三選項完整收集，代表幣別RED四組，其餘runtime待Green。
- StrictMode複核後重驗：聚焦後仍正向確認唯一有效query/存活native回應hold，而不把已取消初讀的額外exchange誤算重送；紀錄全部留存，草稿與零mutation不變，最新logs/manifest為準。
- 所有3個focused pickles完整bddgen/list；本筆RED依代表入口僅執行正規式幣別 的資料組合（每project 1例），其餘案例未執行、runtime待schema/完整Feature Green；不算skip或已通過。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t186-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t186-files.sha256`，索引SHA256 `07b247e60c71bbb7336f584b188a72cd768e0b6f08c176690fdfc991b589bbef`；命令均結束，單worker，無刻意保留服務。

### T187 — binding完成；產品前序schema RED／runtime待驗

指定選項busy+spinner-only與可理解accessible name，圖形真可見且無可見loading文字（允許正確裁切的讀屏文字）；不誤報沒有選項。保存disabled、零mutation、合法草稿保留且其他欄位可用；三個選項權威非空、DB/shared完整不變。三例完整收集，代表幣別RED四組，其他runtime待完整Green。
- 原生StrictMode複核後重驗：指定選項依然唯一有效且存活native連線hold；其餘選項成功資料核對僅排除明確已記錄取消GET，普通wire failed保持失敗。零寫入/草稿/DB與spinner/busy所有斷言不變，最新logs/manifest取代歷史版。
- 所有3個focused pickles完整bddgen/list；本筆RED依代表入口僅執行正規式幣別 的資料組合（每project 1例），其餘案例未執行、runtime待schema/完整Feature Green；不算skip或已通過。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t187-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t187-files.sha256`，索引SHA256 `dbfa8e799f4fdb281eca61cd5c79327ae4ead4c1d0fbb96b36746cc71c61f450`；命令均結束，單worker，無刻意保留服務。

### T201 — binding完成；產品前序schema RED／runtime待驗

原20筆ID/順序/逐列文字完整保留可見、兩幣全帳總額完整文字不變，不出現初讀骨架；原生hit-test確認尾端附近舊列未被全頁overlay遮住。只有.load-more範圍busy，保留操作名/尺寸、spinner-only/無假百分比；cursor GET唯一且未取消、無mutation、完整DB/舊帳本/shared不變。共用loadMore先原生scrollIntoView再量尺寸，避免點擊自動捲動影響bbox。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t201-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t201-files.sha256`，索引SHA256 `bee321078c411a73de6200d4d8c8134e18051ec19a28072fe7d73c916020da35`；命令均結束，單worker，無刻意保留服務。

### T202 — binding完成；產品前序schema RED／runtime待驗

獨立25筆fixture已顯示20筆與全帳總額，第二頁原cursor GET恰一且真5筆response hold，正向驗尾端busy/原資料保留。共用重複觸發When新增pagination adapter：原生雙擊/Enter後release原GET200，完整body==原second page，未換Request/重發cursor、無mutation；不放寬操作或登入的提交次數。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t202-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t202-files.sha256`，索引SHA256 `17bacedcc3ba755987e56e01bfc18b0a5f83ed7a5151fa3bd2afdee596f8de2b`；命令均結束，單worker，無刻意保留服務。

### T203 — binding完成；產品前序schema RED／runtime待驗

原cursor browser GET恰一、原回應200完整完成後列表順序/唯一25IDs==兩頁完整API==DB25；原20列文字/順序保留，逐列日期/幣別/金額、筆數25與全帳總額一致，load-more/busy結束。另以Node owner API重讀兩頁作權威集合，非UI重送；零mutation、原DB/歷史帳本/shared不變。完成後dispose原cursor observer以免遮住後續背景refetch。共用busy斷言追加不誤顯示0筆。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t203-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t203-files.sha256`，索引SHA256 `ab3309530ffd53b2f1124747a3b7c2d23dab3ed3702dbd1e11bcf98e6f0f02d6`；命令均結束，單worker，無刻意保留服務。

### T204 — binding完成；產品前序schema RED／runtime待驗

先完成真25筆分頁並dispose舊cursor observer，保留原cache/ID/文字/全帳總額，聚焦原支出連結後才裝背景expenses-only原生屏障。記錄真20+5回應與DB快照，可延遲/成功/真傳輸截斷造成讀取失敗，其他query不替代忙碌。原生GET截斷機制兩瀏覽器各一例pass，真200JSON完整在server端且瀏覽器讀取失敗、不透明重送/不寫入，log t204-mechanism.log；不是產品背景UI已通過。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t204-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t204-files.sha256`，索引SHA256 `7923cb17eb9c0efeaed1b82b7cce0909cd3ca741838c0844b2d067cdc80e37dd`；命令均結束，單worker，無刻意保留服務。

### T205 — binding完成；產品前序schema RED／runtime待驗

一次既有query-core visibilitychange環境事件觸發背景refetch，不清cache、不導航、不按重試。唯一原first-page真200hold；延遲保留屏障，明確失敗釋放真截斷且一個失敗GET，成功則同一infinitequery的20+5兩頁完成，其他query真200。URL不變/零mutation。原生工具另證明傳輸截斷的失敗不被誤判為StrictMode取消。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t205-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t205-files.sha256`，索引SHA256 `673f947364c598b294dc2c45055f2ee97201ac3f8537eaf8e3c764db7f36d6d4`；命令均結束，單worker，無刻意保留服務。

### T206 — binding完成；產品前序schema RED／runtime待驗

背景原first-page GET存活且hold，25筆IDs/逐列完整文字/順序、兩幣全帳總額與第一列原焦點保持；不清cache/不再出載入更多/初讀骨架/0筆。唯一局部支出region提供spinner-only與busy，頁面其他區域無busy、無假百分比/成功/錯誤。所有DB/舊rich帳本/shared與零mutation一致。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t206-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t206-files.sha256`，索引SHA256 `92d56ee94325cea4fb120426c841a9e58aa9955c88d342ebab9666c542f672e9`；命令均結束，單worker，無刻意保留服務。

### T207 — binding完成；產品前序schema RED／runtime待驗

真背景GET截斷失敗恰一、非cache清除：25原IDs/文字/總額與焦點保留，局部明示未取得更新及可用重試入口；busy/progress結束、不洩漏底層JSON/fetch錯誤、不宣告成功/空結果。DB/舊rich帳本/shared零修改，非僅驗toast。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t207-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t207-files.sha256`，索引SHA256 `00ab37bdd627c12eaef605c54cb55d7c4b0f17dea3261ad965ccba0a2c545b19`；命令均結束，單worker，無刻意保留服務。

### T208 — binding完成；產品前序schema RED／runtime待驗

先真背景讀取失敗並驗舊25筆保留/可重試，再移除傳輸故障、真query可成功，不清cache或重建ID。作為環境前置，以另一API client將原兩筆TWD200改300/100（相同IDs/總額與淨額不變、會計版號+2），重試將能辨識舊cache與最新數值；目前UI仍保留舊25筆/總額/焦點。取得最新真兩頁API並保存權威DB前態；兩個前置Node PATCH不是受測UI操作，browser mutations仍零。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t208-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t208-files.sha256`，索引SHA256 `731f54025ea7927e02983fc8dc3d04aa13a9705d66ea3dcebb2ad37d94abae7d`；命令均結束，單worker，無刻意保留服務。

### T209 — binding完成；產品前序schema RED／runtime待驗

共用重試When只點對應重試一次、URL不變、零mutation；背景僅同一infinitequery的20+5兩頁真200，初讀僅該query一個真200，完整response等於權威資料。F088前置Given排在T212，依序不提前綁定；本筆以已有完整前置的truth F086共用When做代表RED，未聲稱F088完整收集/執行，T212完成後必補正式F088收集/RED。兩條branch皆strict tsc，無undefined step或假成功。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t209-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t209-files.sha256`，索引SHA256 `9ea642a559aaef8a27732e560333dae24cce24711da25b660f3798abe6603cd6`；命令均結束，單worker，無刻意保留服務。

### T210 — binding完成；產品前序schema RED／runtime待驗

真重試一個infinitequery（兩頁200）後25唯一DOM IDs/順序/逐筆日期幣別金額==最新API==DB；兩個原ID的TWD300/100新值必須顯示，逐份額獨立有理數oracle、JPY/TWD全帳總額與淨額一致。原失敗GET1＋重試兩頁2，無多送/重複追加；局部錯誤、重試、等待均結束。最新DB前態/舊rich帳本/shared不被讀取改動，browser mutations零。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t210-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t210-files.sha256`，索引SHA256 `d1a06d59a5d960c9c7e442c66095270e70daf9f4f031c2471084a3afbf68eb5c`；命令均結束，單worker，無刻意保留服務。

### T211 — binding完成；產品前序schema RED／runtime待驗

唯一本次有效初讀真GET傳輸失敗，StrictMode取消紀錄保留且另辨識；初讀錯誤說明與可用重試、busy/skeleton/spinner結束，不誤報沒有旅行/0筆/底層fetch或JSON錯誤。Node owner真API仍200非空並與DB原態一致，無任何寫入，不用UI空值假裝資料不存在。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t211-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t211-files.sha256`，索引SHA256 `0d93c14c12b99b7496cfad2e153c4fec07fe20ed94922ec1d73ac371de4dd6da`；命令均結束，單worker，無刻意保留服務。

### T212 — binding完成；產品前序schema RED／runtime待驗

真初讀失敗後UI/重試入口先正向確認，資料API/DB仍存在；解除原native讀取故障、保留同頁/原IDs，不在Given重試或清cache。完整正式truth F088本筆可收集，使用T209共用When與T180Then，補齊T209原Test Scope的bddgen/list與代表RED；未undefined或提前綁定未選task。正式F088後序runtime仍待schema/完整Green，不冒充已執行初讀重試分支。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t212-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t212-files.sha256`，索引SHA256 `6f4aeaf6cf9d6f1dbdfbc17ee966ae43539b1b1cdf845ef3d1d7494a0a63973b`；命令均結束，單worker，無刻意保留服務。

### T209 正式 Test Scope 補驗（於 T212 完成後）

- 正式 truth F006-088 的 Given（T212）→共用重試 When（T209）→權威資料 Then（T180）已完整 bddgen/list，無 undefined/ambiguous step。T212 logs/manifest 代表本輪程式版本，Chromium/WebKit×桌機/手機共4組均為正式 trips.deleted_at schema RED；沒有宣稱後序初讀重試 runtime 已執行或通過。T209 先用 F086 驗證共用句的前置依賴已依序補齊，未提前執行 T212。

### T213 — binding完成；產品前序schema RED／runtime待驗

真同ID點心JPY100/Alice付款Alice-Amy各50，表單新draft200與完整item/date/currency/category/payer/share欄位另存，原API/DB oracle分離。重用獨立合法操作fixture保留舊rich帳本；限定owner/trip的真PG expenses AFTER拒絕，預期完整400且交易rollback，不以斷線代替確定拒絕。Given零嘗試/零UI寫入，fault可dispose供後續恢復。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t213-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t213-files.sha256`，索引SHA256 `5797ed186c606e41c8d61ff5e1a0deba0e90b04e9e3a32b017afb01703a37e79`；命令均結束，單worker，無刻意保留服務。

### T214 — binding完成；產品前序schema RED／runtime待驗

只按當前原生Save一次，真PATCH原expense ID，完整輸入item/amount/date/currency/category/payer/share與保存草稿一致。記錄真response，400須完整VALIDATION_ERROR且PG實際寫入拒絕counter=1（非斷線/前端阻擋）；成功分支仍同原ID，不另重試/不POST新支出。每次僅增加一個實際UI命令。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t214-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t214-files.sha256`，索引SHA256 `4e4d63a32a5ff53e819ba7d5b906fc4b184fae57bcc4ab5bc8a3b0446273c3d9`；命令均結束，單worker，無刻意保留服務。

### T189 — binding完成；產品前序schema RED／runtime待驗

在既有合法表單/確認/切換控制點擊一次；記錄原bbox/accessible操作名、真正Request method/path/UUID/operationId/revisions與22操作精確payload。等待原生命令真成功後的DB快照hold，不另執行第二操作；請求數恰一。22例完整收集，代表建立旅行RED四組，其餘runtime待Green。
- 量測補正後重驗：先原生scrollIntoViewIfNeeded，再記錄操作前bbox，避免手機長表單click自動捲動被錯判為busy版面位移。先前T189索引屬歷史版，以本次新索引/logs為準；T190–T200既有狀態保持，完成後回到T201。
- partial PATCH語意補正後重驗：現有ExpenseForm合法省略未變的currency/payer/share；保留真wire body，另以原生GET原DTO合併省略欄位成effective input作完整草稿/帳務斷言，明確null不被回填。增加原生最小PATCH整合工具：兩瀏覽器只送amount=200、原ID與相關欄位保留、份額各100、會計版號只+1，兩例pass見t189-mechanism.log；不更動實際請求。最新manifest/logs取代歷史版，完成後回T215（T214同類斷言另依序補正）。
- 所有22個focused pickles完整bddgen/list；本筆RED依代表入口僅執行正規式建立旅行 的資料組合（每project 1例），其餘案例未執行、runtime待schema/完整Feature Green；不算skip或已通過。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t189-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t189-files.sha256`，索引SHA256 `554f4e98afde3adb5987e97d41efc3f60d1c5259312f5872f6847e97abf6db04`；命令均結束，單worker，無刻意保留服務。

### T214 — binding完成；產品前序schema RED／runtime待驗

只按當前原生Save一次，真PATCH原expense ID，完整輸入item/amount/date/currency/category/payer/share與保存草稿一致。記錄真response，400須完整VALIDATION_ERROR且PG實際寫入拒絕counter=1（非斷線/前端阻擋）；成功分支仍同原ID，不另重試/不POST新支出。每次僅增加一個實際UI命令。
- partial PATCH補正重驗：wire body保留原樣；未送出的未變欄位依原expense DTO合併成effective input，再核對完整草稿。缺少應送出的變更仍會因有效值不符而失敗，明確null不回填；不要求重送未變currency/payer/share。真最小PATCH兩引擎整合pass見t189-mechanism.log。最新logs/manifest取代歷史版。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t214-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t214-files.sha256`，索引SHA256 `f85b7dfe70ee84d381218cf777a24bb6d1c082b0d58775c28686bbb8f123d834`；命令均結束，單worker，無刻意保留服務。

### T215 — binding完成；產品前序schema RED／runtime待驗

完整400明確拒絕後原新draft200全欄位仍在、Save/欄位可用、原因與重試入口可讀；無busy/progress/成功/重算/未知查證假象或底層SQL錯誤。API完整原expense100不變、原份額各50/淨額Alice+50Amy-50獨立oracle、全DB與歷史帳本/shared相等、唯一PATCH且無新增付款。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t215-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t215-files.sha256`，索引SHA256 `37ae7c24f4fbf9e240fa55e4f5615e833dfe6842dc1af51993f8f7e3579a38dc`；命令均結束，單worker，無刻意保留服務。

### T216 — binding完成；產品前序schema RED／runtime待驗

完成原次真400拒絕與原資料/草稿保留斷言後，確認PG拒絕counter1再dispose僅該owner/trip的測試拒絕。相同expense ID/完整新draft200仍在、Save可用，原DB100未變；Given停在可重試狀態，不執行第二個UI PATCH。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t216-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t216-files.sha256`，索引SHA256 `49a63757ba52855d6be96757474fc33563d57b16643f8a600ace3de002653941`；命令均結束，單worker，無刻意保留服務。

### T217 — binding完成；產品前序schema RED／runtime待驗

真400一次＋真200一次，兩個PATCH均同原expense ID、沒有POST第二支出；原單筆100只改200、份額ID保留各100、淨額Alice+100/Amy-100獨立oracle與UI一致、會計版號僅+1。其他欄位/付款/settlement/adjustment/image/reservation/receipt不變；UI已確認新值且busy/error結束，舊rich帳本/shared完整。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t217-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t217-files.sha256`，索引SHA256 `90c4e29c8bdfc3e3dfb2a4e5a684a118aa2d9a95091ded552bd828c01115a3f5`；命令均結束，單worker，無刻意保留服務。

### T218 — binding完成；產品前序schema RED／runtime待驗

正式最新安排Amy欠AliceJPY100（原點心200均分）與合法100/2027-03-12草稿，尚未提交；只裝原生POST settlement真201後丟回應與原UUID付款查證屏障。丟回應前須實證正式命令已提交唯一settlement/payment/兩零差額adjustments、API原ID200與淨額0/安排0、會計版號+1，原支出/歷史帳本/shared完整。阻擋原紀錄只讀查證，當前淨額查詢仍可正常回真資料；不造付款或HTTP成功、不猜UUID、不先在Given付款。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t218-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t218-files.sha256`，索引SHA256 `abb78ba3ad782aa636b0e2fce681b3d931f9ddf194f6b3a55b0f70e25283578a`；命令均結束，單worker，無刻意保留服務。

### T219 — binding完成；產品前序schema RED／runtime待驗

只按原生結清一次，唯一真POST原command/payment UUID與100/date草稿；等正式201後權威DB已提交，再確認原POST實際傳輸失敗且browser開始按原UUID查證，查證GET仍在屏障。零第二付款/不清草稿，不把Node權威讀取當成browser已確認。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t219-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t219-files.sha256`，索引SHA256 `fcd5c75962192e81b0e6d000df9056e6df097656ea959b732531dcda21a916e3`；命令均結束，單worker，無刻意保留服務。

### T220 — binding完成；產品前序schema RED／runtime待驗

真原UUID查證GET在途時可見結果尚未確認與具輔助名稱的spinner-only查證busy；不可宣告失敗/結清成功，原100/date/應付安排及form內原command/payment UUID保持、普通Save disabled、UUID不顯示給使用者。所有只讀lookup只指原兩UUID，唯一POST/唯一付款事實、權威已提交完整snapshot/舊rich/shared皆不變，無假百分比。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t220-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t220-files.sha256`，索引SHA256 `875b8ce89b724bfe416ec41b4717b68df25a3325f9fdf43af7ed55e5e05a7b70`；命令均結束，單worker，無刻意保留服務。

### T221 — binding完成；產品前序schema RED／runtime待驗

獨立完整付款prefix：正式POST已唯一提交、回應真遺失，原UUID查證GET在可釋放失敗屏障，正向確認unknown/查證spinner/原草稿與事實。保存本輪原command/payment UUID與lookup數；不先結束查證、不自動重送mutation，下一When才釋放本輪不可用結果。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t221-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t221-files.sha256`，索引SHA256 `757d8649dfd7039f3228992066404861cf3e989072c7b2ac72786a9e5aab88a4`；命令均結束，單worker，無刻意保留服務。

### T222 — binding完成；產品前序schema RED／runtime待驗

只釋放本輪原UUID不可用查證屏障，讓真GET傳輸失敗與狀態機完成；不新增使用者命令/不重送POST。等待再次查證入口enabled及pending lookup0，所有本輪lookup未取得可確認資料，原command/payment UUID物件保持，mutation仍1。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t222-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t222-files.sha256`，索引SHA256 `51f5e4bd181e46f4f460a5363befe5365ec31888fde08bf7a52b1df8f1e28144`；命令均結束，單worker，無刻意保留服務。

### T223 — binding完成；產品前序schema RED／runtime待驗

本輪不可確認結束後結果仍unknown、Again enabled、原amount/date/安排/兩UUID保留且普通Save disabled；aria-busy/progress與表單可見無限CSS/SMIL動畫均停止，不誤報失敗/已結清。原POST仍一次、查證只指原UUID、DB唯一已提交結果/舊rich/shared不變。共用lookup handler只允許真client取消GET的晚到abort清理，不忽略一般wire錯誤或mutation。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t223-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t223-files.sha256`，索引SHA256 `b45d17444bcf1b327eaa4f943f662efca5371a78d1b45d13c1a735e2e5b4c529`；命令均結束，單worker，無刻意保留服務。

### T224 — binding完成；產品前序schema RED／runtime待驗

先完成唯一真付款/回應遺失/本輪查證失敗的unknown UI與原草稿/UUID保留證據，再恢復原repayment/settlement唯讀查證透傳；Node owner原record200與已提交事實一致。Given保留unknown與Again enabled，browser lookup計數不增加、POST仍1，不先查證或重送付款。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t224-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t224-files.sha256`，索引SHA256 `4a3522e4b697b8ed785709a49c357ba9f81d4a847af3ef9eb07d3722f949bd36`；命令均結束，單worker，無刻意保留服務。

### T225 — binding完成；產品前序schema RED／runtime待驗

只點Again一次，按原settlement/payment UUID發真GET，完整200資料須與原已提交不可變record/repayment一致；不使用當前淨額猜原結果、不POST新付款。保留查證起點/原兩UUID，query/pending結束、全部UI命令數仍唯一原POST。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t225-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t225-files.sha256`，索引SHA256 `54e1b4c29aedfff03ea99f6c02e459054c4a4b1eda7aebf07b5eb092d6842fa6`；命令均結束，單worker，無刻意保留服務。

### T226 — binding完成；產品前序schema RED／runtime待驗

Again真GET原UUID的200與原不可變record/payment完全相等，UI正確實付JPY100/日期與確認狀態、unknown/busy結束；原payment/settlement各1、零差額adjustments2、精確淨額0/無安排。唯一POST仍原命令，全部查證只讀原兩UUID、整份已提交DB/歷史帳本/shared不變，沒有重建或重算新付款。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t226-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t226-files.sha256`，索引SHA256 `af0487d3d6afe6979dc16d0a1000451603ef670293124f2b5133bb7c0f368862`；命令均結束，單worker，無刻意保留服務。

### T227 — binding完成；產品前序schema RED／runtime待驗

- native offline event+context.setOffline；先從分類管理載入SPA/有效session，明證/api/trips未讀取未快取，When只點一次站內旅行連結，不對離線HTML導航。共用T176只針對無網路分流修正。
- paused status與恢復網路下一步可理解；無永遠busy/無限動畫/空清單0/成功/伺服器失敗。查詢未發出、DB及其他owner資料完全不變、無命令。產品guard後runtime仍待驗。

- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t227-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t227-files.sha256`，索引SHA256 `bd4ba6e7a9a2d22e528954c5a7eadf904e38e0e1ce3bd0e72583da2fa404c280`；命令均結束，單worker，無刻意保留服務。

### T228 — binding完成；產品前序schema RED／runtime待驗

手機390×844／桌面1440×900與原生reducedMotion=reduce；真實有圖/帳務隔離旅行，Tab可達管理旅行並驗accessible name/focus；保存原focus/快照/URL，不宣稱等同人工讀屏。全程無mutation及其他owner變動。
- Chromium/WebKit依序×DSL明列裝置（不額外倍增尺寸），共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t228-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t228-files.sha256`，索引SHA256 `84a119f6c7bccd433cadca6e7a87c10f82691a15ab75ff4989d2055edbf37c4c`；命令均結束，單worker，無刻意保留服務。

### T229 — binding完成；產品前序schema RED／runtime待驗

Tab到管理旅行、Enter開真實dropdown、ArrowDown到移至垃圾桶、Enter一次開dialog；不用click/focus注入或確認mutation。正面確認menu收合與dialog可見，DB/縮圖/帳務/他owner全數保留。
- Chromium/WebKit依序×DSL明列裝置（不額外倍增尺寸），共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t229-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t229-files.sha256`，索引SHA256 `5ecc60b0d67a77075c4bf4e4257c37ab39d11468bdc0a35b3c37cb80f069a99a`；命令均結束，單worker，無刻意保留服務。

### T230 — binding完成；產品前序schema RED／runtime待驗

dialog accessible name/description包含移至垃圾桶/日本旅行/可復原；初始焦點取消；原生Tab/Shift+Tab兩方向逐一到達每個可見控制並限在dialog；圖形不進焦點序，文字傳達後果。未確認、無mutation、完整DB/圖/其他owner保留。自動化DOM證據不冒稱人工讀屏。
- Chromium/WebKit依序×DSL明列裝置（不額外倍增尺寸），共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t230-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t230-files.sha256`，索引SHA256 `72ce1c8d69848ff7a06613a1b4b56264c079401d6276c2dca3660181b31c454c`；命令均結束，單worker，無刻意保留服務。

### T231 — binding完成；產品前序schema RED／runtime待驗

承接同一個reduced-motion/裝置/有圖帳務旅行，以Tab/Enter開日期、原生鍵盤輸入有效新日期2027-03-09～16、Tab到儲存日期Enter一次。保留原日期完整before、原控制名/焦點、真實PATCH committed後回應屏障，延遲/成功皆先held；不改query屏障。可選prepared參數共用operation屏障避免重seed/relogin或滑鼠代替鍵盤。
- Chromium/WebKit依序×DSL明列裝置（不額外倍增尺寸），共8個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、8/8皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t231-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t231-files.sha256`，索引SHA256 `c5a1acba79569a93c37b6f544d741a2ce2752d398d717e3b265506301ce61359`；命令均結束，單worker，無刻意保留服務。

### T232 — binding完成；產品前序schema RED／runtime待驗

延遲時保留靜態圖形/accessible busy與原控制名/焦點/目標日期，原生動畫停止；成功分支驗狀態可讀/API和DB新日期一致、busy結束、focus原控制或關閉dialog後日期trigger、URL不跳頂、無重複同文live播報、完整其他帳務/圖片不變。T233 When尚未實作，本筆focused只延遲2裝置；成功完整F097待T233加入When後複核，不宣稱已執行。
- Chromium/WebKit依序×DSL明列裝置（不額外倍增尺寸），共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t232-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t232-files.sha256`，索引SHA256 `5a5475fe7870c21a7e10cd63bf7a72d16654d8b85d7c14eb2f18d1bf5f3107b9`；命令均結束，單worker，無刻意保留服務。

### T233 — binding完成；產品前序schema RED／runtime待驗

完整F097四組裝置/結果：延遲只觀察原PATCH保持held，成功只釋放同一PATCH真實200並驗body/完成通知、未追加命令/未改query屏障。完整包含T232延遲/成功兩分支binding；補正DB日期用SQL date::text驗ISO，避免node-postgres Date物件時區字串誤判。8組schema RED均未到runtime，非成功驗收。
- Chromium/WebKit依序×DSL明列裝置（不額外倍增尺寸），共8個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、8/8皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t233-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t233-files.sha256`，索引SHA256 `5d68211bf3bfc2451a817e52ad0aca2ecbf57c8da9fd6bb3700b81534d60b3ed`；命令均結束，單worker，無刻意保留服務。

### T234 — binding完成；產品前序schema RED／runtime待驗

真實合法點心JPY100/2027-03-11/餐飲/Alice付款與Alice+Amy分攤草稿；透過實際query-core瀏覽器事件觸發三個選項GET，僅延遲原API200回應，不造cache/回應。幣別/分類/成員各1個live held並完整釋放，body與真API權威相符，等待前中後完整draft保留/Save可用、無UI寫入、完整DB/他owner保留。初讀選項延遲另外由T185–187覆蓋，本筆以既有草稿的真實重讀等待驗恢復。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t234-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t234-files.sha256`，索引SHA256 `d1156dbbab88e9a961ace7aca76feb515ac4d177638eab2ac34aff0f4640ec75`；命令均結束，單worker，無刻意保留服務。

### T235 — binding完成；產品前序schema RED／runtime待驗

由真實選項選JPY/餐飲/Alice付款/Alice與Amy分攤，核對原草稿與局部busy已結束後只按一次儲存。捕捉原POST/新UUID/完整正確input/categoryID，權威201完成；Given無保存，When不造第二命令。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t235-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t235-files.sha256`，索引SHA256 `44725f780e39ddaecebbd000bbf41385b4b7596fd37833842a0b55e0ecc2b31d`；命令均結束，單worker，無刻意保留服務。

### T235 — binding完成；產品前序schema RED／runtime待驗

由真實選項選JPY/餐飲/Alice付款/Alice與Amy分攤，核對原草稿與局部busy已結束後只按一次儲存。捕捉原POST/新UUID/完整正確input/categoryID，權威201完成；Given無保存，When不造第二命令。
補正201 DTO按正式Expense.category/shares驗，categoryId/shareMemberIds只在request；不要求response回傳request專屬欄位。最新驗證與manifest取代較早T235版本。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t235-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t235-files.sha256`，索引SHA256 `9e65f140ffb0cdb3f2567ddf4b5baaad3c218f3fa5abf1f8dcb0dcc2d62df7e9`；命令均結束，單worker，無刻意保留服務。

### T236 — binding完成；產品前序schema RED／runtime待驗

完整F111：原草稿一次POST201/同一UUID列點心JPY100/日期，無殘留選項busy。DB只新增1支出2shares、原始source及所有歷史付款/結清/圖片/receipt保留，accountRev+1；獨立有理數oracle各50、新JPY淨額Alice+50/Amy-50，TWD±300及其他人0，原APIcategory/shares/選項與authorities一致，其他owner不變。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t236-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t236-files.sha256`，索引SHA256 `e5de7d32703a51f71f5c165e0870e673a053fdc03c38540c0e0a6cafa889c2fa`；命令均結束，單worker，無刻意保留服務。

### T237 — binding完成；產品前序schema RED／runtime待驗

承接T227原生離線SPA/無目標cache入口，Given正面驗等待連線狀態、navigator離線、targetGET尚未送出、無mutation；Node權威API此時已能提供原清單，保留同頁URL及document觀測。Given不提前setOffline(false)、不點retry/reload，恢復留When。T227原生兩引擎機制證據支援此共用入口。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t237-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t237-files.sha256`，索引SHA256 `891c40f736574b9c6af7edf7939dc6d30fc4ab5cab9356dd2f626d4cdfec0981`；命令均結束，單worker，無刻意保留服務。

### T238 — binding完成；產品前序schema RED／runtime待驗

一次context.setOffline(false)真實恢復online；等待原paused query唯一live真API回應held，僅釋放原回應，完整200JSON==原authorities，無retry/reload/新帳號或mutation。前後僅1targetGET、同一Request，同頁URL且零document重新載入。原生兩引擎機制已由T227證明，006產品runtime待正式schema。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t238-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t238-files.sha256`，索引SHA256 `70e1df85ba07df8bccd5db8a42ef60302783f2e1248bf6e2a039eaa7994d92c6`；命令均結束，單worker，無刻意保留服務。

### T239 — binding完成；產品前序schema RED／runtime待驗

完整F112：同一原query1GET/真API非空清單與DB一致、每個trip heading恰1、無跨owner/假空/paused/busy、無reload；然後真UI開日本帳本/管理旅行/縮圖編輯，native filechooser選真PNG可預覽且保存可用，僅本地草稿未提交。全程UI mutation0/原DB圖及歷史帳務不變，復用真圖檔/objectURL觀測與cleanup。
- Chromium/WebKit依序×桌機1440×900／手機390×844，共4個執行組合（明列裝置tag在第二輪不重複）；逐組exit1，均同schema RED，無skip。
- ESLint/strict tsc/bddgen/list exit0；runner exit1、4/4皆為trips.deleted_at正式schema斷言，無skip，目標句尚未到達之runtime保留待T241/Green。logs `.cache/implement-006/t239-{format,lint,typecheck,bddgen,list,red,pressure}.log`。
- 本筆程式版本索引 `.cache/implement-006/t239-files.sha256`，索引SHA256 `7f7aa60bb55f7d8ed3957ba5dcae214bb9f03d1fd75f4258c3ff5c10eb203587`；命令均結束，單worker，無刻意保留服務。

### T240 — 全批獨立static/binding審查通過；只解鎖T241

- 固定獨立審查者 `/root/review_006` 未參與受審實作；完整讀231句binding、20新feature/各DSL與主helpers、既有expense ALIGN、native支援與最新RED帳，findings修正後同人重審 **zero open / APPROVED static-binding**。報告 `.cache/implement-006/t240-review.md`，SHA256 `19ffaa2bac35fc3269f65d3bc674a5a8e1a0dc32043a2a47d9722436e0aa50fb`。
- 修正7組：trash識別投影不要求Trip.expenseCount；5處本人有效trip無receipt改OPERATION_NOT_FOUND；stale-link未提交draft正向DOM/readonly摘要；依4layout核骨架結構；逾時原生/DB工作必待full-job completion；登出前保持Blob active以驗真session邊界；選項聚焦真正控制而不強制region tabindex。另以真uncached SPA probe修T081 native GET取消分類，保留所有attempt且不排除wirefailure。
- T057只新增可選被動觀測型別/registry與fixture傳遞：gate held且timeout已回時completion=0，release後完整job completion=1才比DB。無fixture自emit、sleep或onResponse替代；T243必須接線正式pipeline外層finally且獨立核實無detached後續寫入，task/handoff已明列。
- 全scope bddgen/list兩端exit0，0undefined/ambiguous；backend348例/27檔，frontend357例×兩project=714執行/28檔。231句唯一binding清冊 `.cache/implement-006/t240-binding-inventory.json`；逐句scope/證據/runtime帳 `.cache/implement-006/t240-runtime-ledger.json`。後者不以生成/靜態審查代替runtime。
- 修正閉包代表RED：API2、desktop16×2、mobile13×2（DSL明列裝置3例不重複），共60/60 exact `Product migration must provide trips.deleted_at`，無skip；全部006 guard後語意仍待正式schema/首Green。T168既有DELETE/原Then前半已達，新state-first仍待驗。其餘完整scope均收集，不宣稱抽樣代表完整runtime。
- 原生機制Chromium3/3、WebKit3/3 PASS：StrictMode native取消與wirefailure區別、uncached SPA option query真2attempt/1cancel/1live、結構骨架oracle（4類正例、2bars反例）。機制證據不宣稱006產品已綠。
- 最終424個受影響TS/TSX全部format/ESLint/strict tsc exit0，`t240-all-{format,lint,typecheck}.log`；15個序列生成/list/RED/native命令逐條exit與案例數見 `.cache/implement-006/t240-validation-commands.json`。430個dirty/untracked非spec來源SHA索引 `.cache/implement-006/t240-files.sha256`，manifest SHA256 `51663a5bcbe29399e7ee2afeb41b1a0b60fe42d71ee78b6dd7e9879c21a5ded4`；reviewer獨立核430/430內容零差異。
- 所有runner已退出；最新1696個歷史worker PID對應隔離DB無殘留、RAM free42%。root＋固定reviewer共2、重型1、worker1、引擎序列，無新增產品runtime/改truth/commit/push/deploy。T241正式migration後由同reviewer獨立複核runtime，再按整檔Green解鎖T242。

### T241 — 正式schema／生命週期整檔Green；獨立postmigration runtime稽核通過

- 以/bdd green逐slice由正式schema RED起：migration後已進入真Given/When/Then、缺trash404；補移入/state/active與trash清單後首例Green；restore404 RED再補復原。正式`0004_trip_management.sql`保留001–003 checksum，建立006完整基本表、constraint／reservation回填與同交易INSERT／不可變收據；不提前實作圖片HTTP、purge routine或歷史DELETE例外。
- 本Test Scope `backend/trips/旅行垃圾桶與復原.feature`完整7/7、25/25 Given/When/Then實際passed（最新182例JSON再次包含同7例）；移入/復原只改生命週期+成功receipt，全部帳務/停用成員/圖bytes/分類與他owner原態保留，清單owner+state分頁一致，180天不自動清除。
- 獨立審查R241-01以真API重現reservation trigger內23505回500，已於create交易rollback後映射409 ID_CONFLICT。新增support3/3PASS：同UUID不覆蓋trip/owner/reservation，AFTER ownerINSERT真XX000 fault三表同回滾；官方001–003非空舊庫經實際migrate升004逐欄保留原帳務／回填原createdAt／重跑冪等／非法reservation改刪23514。migrate optional directory與worker optional initialize保留原default，只作官方archive升級驗證，沒有假DDL/關trigger。
- postmigration全部backend0068檔182例，28passed／154failed、0skip與0test-timeout；662實際expected Gherkin步：474passed／154failed／34not-reached，全部對上57唯一backend binding。40組具體error與產品前序依賴逐例保留 `.cache/implement-006/t241-backend-runtime-ledger.{json,md}`；原始結果 `t241-all-backend-results.json`／log `t241-all-backend-runtime.log`。不是把剩餘scope宣稱Green，也不是繼續以missing-schema掩蓋。
- T042/T043因T041尚無真native影像handler而未進入；其餘依賴缺少ordinary active gate／purge／receipt／multipart decoder與admission／private binary等。Group31 oversized socket目前早期400/reset，實接後須再核正式413與native HTTP response/error競爭，當前不當機制驗證。T243仍須真full-job finally被動hook接線及無late-write獨立核實；同operation跨trip競爭保留後續receipt/concurrency義務。174前端句未在此重跑，需各scope首完整Green，缺schema不再是本次未執行原因。
- 最新原有backend166/166回歸PASS，`t241-old-backend-regression.log`；support3PASS `t241-support-green.log`；432個目前dirty/untracked TS/TSX format/ESLint/strict tsc exit0，`t241-all-{format,lint,typecheck}.log`／`t241-all-static-command.log`。所有命令單worker序列且退出。
- 固定獨立審查者`/root/review_006`重核原始JSON182case／662step與generated literal、40group完整154case partition、7例25步、166回歸、3support、全部439來源hash零差異後 **APPROVED / zero open**；報告`t241-runtime-review.md` SHA256 `45aa9304a4d62004a4b07231d6ac78a5f89b8f08c5e0da6ad6f78eb2db7d01d8`，只解鎖T242，不擴張產品完成範圍。
- 版本索引 `.cache/implement-006/t241-files.sha256` 439檔，SHA256 `cb145933ed7148e2dacbe2a0c8b7800944a6b693bae4fa129e32edc60bef864e`。T241例行靜態helper曾誤用t240前綴，當前結果已移到t241並參數化helper；T240 verbose format輸出標明superseded，歷史empty lint/tsc與來源inventory恢復，原正式review／manifest／RED／native證據未動。此處不混用不同版本結果。
- 最新1857個歷史worker PID對應隔離DB無殘留、RAM free45%；root+固定獨立reviewer、heavy1／worker1，無commit／push／部署或truth更動。

### T242 — 生命週期Green保護下的分頁去重

- /bdd refactor僅將active/trash列表兩處完全相同的筆數解析移到pagination.ts的tripPageLimit，呼叫端原Query schema／default50／上限100／錯誤訊息／cursor owner-state綁定／排序及結果保持。未改任何DSL、測試驗收、圖片或purge路徑。
- 格式、3檔ESLint與API strict tsc無錯誤；命令組exit0。完整原Test Scope7/7PASS，原有backend166/166PASS，schema／UUID／官方非空升級support3/3PASS；各runner完整摘要無fail/skip，logs `.cache/implement-006/t242-{format,lint,typecheck,scope-green,old-backend-regression,support-green}.log`。所有工作序列、worker1且退出；git diff check通過。
- 目前非spec來源索引 `.cache/implement-006/t242-files.sha256`，SHA256 `4395c162bbe5f5ee6cc46d865b33ea45bf1318d99f854475ffde80ea8bfef501`。T241其餘154產品RED與174frontend runtime義務完全保留；不把局部重構當其他scope已Green。下一筆T243，繼續獨立格式/容量scope green。

### T243 — 格式／容量完整32例Green；full-job觀測獨立驗證通過

- /bdd green由JPEG.jpg multipart400 RED起，實作精確UUID thumbnail POST唯一multipart例外、parts/files/fields與檔案/header限制、真sharp metadata/full decode、方向/sRGB/移除metadata/inside不放大，以及研究指定的3次有界1200-80／960-75／640-70輸出<=524288bytes。新圖/thumbnailRev+1/32byte原檔指紋收據同交易；解碼不持旅行鎖，提交再鎖及核兩版本/signal，帳務與lifeRev不改。
- 4合法格式、7合法邊界、4超界、16不合法及雙檔1共32/32、128/128 Given/And/When/Then全部實際passed；包括剛好10485760bytes、25000000pixels、16384×1與1×16384、256byte1×1。GET owner當前版本bytes=DB、舊版本formal404/private no-store/nosniff，負例完整保留原圖/versions/所有帳務/他owner。
- 中途真RED指出PDF誤422與APNG被當靜態成功200；修實際PDFsignature及PNG acTL／WebP ANIM/ANMF/VP8X結構辨識，保留decoder與chunk length權威，不能只看副檔名/MIME/pages欄位。追加multipart-only 1.1MB JSON真500 RED，將Content-Type拒絕前移到onRequest認證後、本文解析/admission前回400；DB不變且隨後真PNG可保存，最後全部矩陣已在此版本重跑。
- 正式接線optional tripManagementHooks.afterThumbnailJob於完整handler outerfinally，await native處理與DB transaction結束後才觀測/釋slot。新native support以透明Sharp output gate與真server socket-close證明：held時completion0/第二請求503；client真中止並觀察server close後仍0；release後completion1且全DB原態，沒有late write。之後真保存成功的callback以獨立DB查到已committed receipt/version，再驗私有bytes/帳務。測試不自emit、不改stream、不用sleep或response事件假冒job完成；臨時第二產品App同ownedDB於finally關閉。
- 最終同版本set-e命令組exit0：scope32PASS `t243-full-green.log`／raw `t243-scope-results.json`／逐128步摘要 `t243-runtime-summary.json`；life7PASS、原backend166PASS、support5PASS（UUID2／非空官方升級1／job1／multipart-only1），分別`t243-lifecycle-regression.log`、`t243-old-backend-regression.log`、`t243-support-green.log`。436目前TS/TSX format/ESLint/strict tsc全exit0，`t243-all-static-command.log`及對應logs；無skip，source/truth不為遷就測試而變更。
- 固定獨立reviewer `/root/review_006`重核32case／128steps與generated literal參數、完整success/rejection oracle、MIME500→400閉包、真full-job evidence、regressions及443來源hash後 **APPROVED / zero open**，只解T244。報告 `.cache/implement-006/t243-review.md` SHA256 `14190d275b1429e5150edcc8836ec64706aa649c5f4796b5093f7353565c7368`；來源索引 `t243-files.sha256` SHA256 `cc73e079add78852a38f6acf9f2f263daf179cd20d84183051b03f5aca9d60e1`。
- 仍未完成HTTP整體upload/processing deadlines與Group31 raw response/reset/T057 deadline路徑、reset／trash-privateGET／receipt GET／purge及其各自scope；不把native abort證據冒稱timeout已驗。001–004 migration保持。最新所有runner退出，1876歷史worker PID隔離DB無殘留、RAM54%，heavy1／worker1序列，無commit/push/deploy。下一筆T244。

### T244 — 共用 schema 與 owner state query 邊界重構

- /bdd refactor將完全相同的Revision/State/OperationOutcome移到http-schema.ts、owner查詢移到state-query.ts；生命週期及圖片route各自引用，public key/currentState與交易行為不變。無新增路由、修改DSL或truth。
- 同版本ESLint/格式/API typecheck通過；完整格式容量32、生命週期7、原backend166、support5全部PASS，worker1序列，logs `.cache/implement-006/t244-{lint,format,typecheck,scope-green,lifecycle-regression,old-backend-regression,support-green}.log`。來源索引445檔`t244-files.sha256` SHA256 `1fac7dd3f08cf7026f9af8646fe4aba120ca89880ded8f37a03da956ffd3d30b`。下一筆T245。

### T245部分與/tasks相依修正

首輪9例6PASS/3FAIL：reset404、trash GET404、purged Given因正式purge尚缺404。已依focused RED補reset與trash GET，各自1PASS（t245-reset-green.log／t245-trash-green.log），未勾T245。/tasks增量修正序列見tasks末段；下一筆T247，保留所有真DB及整檔驗證，不以假建態過關。

### T247 — 永久刪除整檔Green與獨立審查通過

- /bdd green由purge404 RED補正式0005（不動001–004），SECURITY INVOKER routine owner/trash FOR UPDATE、transaction-local精確owner/trip DELETE例外、調整→還款→結清→shares→expenses→members→thumbnail→trip後reservation標purged；success/exception都恢復context。原immutable UPDATE及一般DELETE/owner保護保留。route刪除與next lifeRevision receipt同交易提交，所有await。
- 成功清除後receipt GET404 RED，再補owner/trip/operation精確查證及same repeatable-read currentState；真普通/trash讀圖由實表不存在回formal404，無fakepurged Given或stub。完整Test Scope11/11、34/34 Gherkinsteps passed，包含7種一般歷史真23514拒絕，DB與API/其他資料保持。rawJSON `t247-scope-results.json`／摘要`t247-runtime-summary.json`。
- 同版本image32/life7/oldbackend166/support5全PASS，lint/API typecheck0；logs`t247-{full-green,image-regression,lifecycle-regression,old-backend-regression,support-green,lint,typecheck}.log`。獨立reviewer核446sourcehash與11/34全部actualsteps、oracle、回歸後APPROVED zeroopen，報告`t247-review.md` SHA256 `b67b66ef39f1e681712bcc78a6e9df74937a80413b148603298c0c330f8dbda6`；manifest`t247-files.sha256` SHA256 `89401786ec550bfad85338bde29b6201977865ae4c3b2f15b6236e1cf68e75cc`。
- /tasks相依修復另經獨立DAG確認292unique/無cycle，完整gates保留；T245 partial未勾，依T248後整檔重跑。fault/concurrency/transport仍由各scope承接。所有runner退出，1894歷史PIDs ownedDB無殘留，RAM55%。下一筆T248。

### T248 — 收據轉換共用，Green保護下移除過窄casts

/bdd refactor把同一receiptResult映射抽為operation-result.ts，生命周期replay、receipt GET與image routes共同引用；DB constraint已保證life receipt thumbnailPresent=null，回應值不變，移除原active/trash及kind過窄casts。無schema/DSL/業務改變。APItypecheck/lint/format0，purge11/image32/life7/old166/support5均PASS（t248對應logs），runner已退出、資源清理詳t248-resources.log。447非spec來源索引`t248-files.sha256` SHA256 `ce503fe2b1e76028cff76bd9af7f51c03551778de35ac4590e916e76a819cf5f`。下一筆T245全9例green。

### T245 — 保存／私有讀取整檔9例Green

/bdd green由原reset404、trash GET404 focused RED補DELETE命令及真垃圾桶reader，reset在trip鎖下重讀收據、驗active/兩版本、刪當前圖/thumbRev+1/false receipt同交易；兩GET共用真owner/snapshot/version查詢、狀態限定與private no-store/nosniff。原缺purge前序依/tasks修復後，使用正式purge Given。最終9/9與30/30實際Gherkinsteps PASS（t245-full-green.log／t245-scope-results.json），包含方向/GPS/ICC四角、複雜高熵/1x1不放大、清原圖及唯一當前WebP、reset兩舊圖404、trash可讀、普通trash409、換圖舊版404、purged舊連結404；全部DB/其他旅行保持。

source與剛完成T248完全相同（無追加產品變更），447source索引t245-files.sha256 SHA256 ce503fe2b1e76028cff76bd9af7f51c03551778de35ac4590e916e76a819cf5f；同版本T248的purge11/image32/life7/old166/support5與lint/API tsc均PASS。下一筆T246，無truth變更或commit。

### T246 — 中斷恢復／共用圖片命令headers重構完成

- /bdd requested step=refactor，Test Scope為backend/trips/縮圖保存與私有讀取.feature整檔。中斷前唯一非T245來源變更為image-routes.ts：DELETE改引用POST已使用的thumbnailCommandHeaders，UUID/decimal revision驗證與錯誤保持同一邊界，無新增API/資料/DSL。T245 manifest其餘446檔完全一致。
- 中斷前image回歸只到11例，不採用部分結果；以同版完整序列重跑，全部exit0：保存私有讀取9、格式容量32、生命週期7、purge11、既有backend166、support5，合計230 executions無fail/skip；ESLint/format/API typecheck與4組focused/default bddgen均0。命令/exit/耗時帳 `.cache/implement-006/t246-resume-matrix.json`，raw logs `t246-resume-*.log`。
- 固定447檔索引`t246-resume-files.sha256`，SHA256 `542d250f754bfa7955aa302e7f68833b31703349e690a3cf6ef5e5f75e5c54f2`。此版未改truth、001–005 migration或其他產品模組，git diff check0。
- exec42373與所有本次worker均退出；恢復入口舊worker40440/40705也不存在。發現前次中斷留下ledger_test_40705_0，精確對照中斷log與PID、確認pg_stat_activity連線0後DROP，已再查無該DB；證據`t246-resume-{worker-pids.json,processes.log,resources.log}`與`t246-interrupted-db-cleanup.log`。最後memory free41%，保留root＋既有reviewer，heavy1/worker1，無常駐服務。
- T246完成，下一筆T249。之前T241/243/247獨立審查保持其當時版本證據，其他完整owner/trash、分類、競爭、傳輸與前端scope仍未交付，未commit/push/deploy。

### T249 — 垃圾桶普通子資源／owner隔離整檔Green，獨立審查通過

- /bdd green Test Scope整檔85例（11普通讀取、14寫入、60角色/狀態）。旅行主入口初始1例已Green；完整普通讀取再現9FAIL/2PASS，錯誤為trash仍回200或未知子項普通404。修requireOwnedTrip先owner/id查無404再驗deletedAt409，所有既有writer在同trip FOR UPDATE內先拒絕trash；漏掉的expense/repayment單筆GET與member list改為同repeatable-read只讀快照先驗trip，未知子ID不能搶先回404。對應response schema補409，不改帳務/資料/DSL/truth。
- 初始reads9RED後11/11Green，最終全檔85/85、315/315真實Gherkinsteps PASS，無skip/flaky/unexpected。raw `t249-scope-results.json`、逐case/step `t249-runtime-summary.json`、完整`t249-full-green.log`。
- 同版9命令全部exit0：全來源TS/TSX Prettier --check、ESLint、strict tsc；private9/image32/lifecycle7/purge11/oldbackend166/support5均PASS。命令/exit/時間帳`t249-validation-matrix.json`，各`t249-*.log`，git diff check0。沒有以普通404推斷刪除成功，沒有先查子項或mock owner。
- 447來源索引`t249-files.sha256` SHA256 `1e09caec523f1d1cee7bc7133707d491aeedad4259e2a92256722494a0ade8b5`。固定獨立reviewer/root/review_006核全部447 hash、85case/315step literal DSL/完整oracle與9組最終證據，正式APPROVED zeroopen；報告`t249-review.md` SHA256 `013872385925473969bb5bad7b9c8cf36ee1bde24f2fc1efb8f90e35b681ad0b`。
- sessions29763/39603/42842/23299/68526已結束；18個本task log worker PID均不存在，全部對應worker index隔離DB無殘留（t249-worker-pids.json／t249-processes.log／t249-resources.log）。最後memory free47%，heavy1/worker1，root＋固定reviewer，無新增代理或常駐服務。
- T249回寫完成，下一筆T250單獨refactor。未commit/push/deploy；分類、競爭/傳輸及前端等其餘矩陣未交付。

### T250 — active判定集中，完整Green保護下重構

- /bdd refactor將trip GET/PATCH與requireOwnedTrip完全相同的deletedAt判定集中到assertActiveTrip；所有caller仍先owner/id查無404，才判本人trash409。錯誤狀態/code/message、交易快照/鎖序、資料、DSL與API回應保持；無其他抽象或新能力。
- 同版全部10命令exit0：全變更TS/TSX format/lint/strict tsc；原完整85case/315真Gherkinsteps再次PASS（t250-scope-results.json），private9/image32/life7/purge11/old166/support5均PASS、0skip。命令帳`t250-validation-matrix.json`及對應`t250-*.log`。
- 447來源`t250-files.sha256` SHA256 `2fa6820ee907e058c59e3d2ab76b5399017f2cc005c43f70696f3bd5ad1607e7`。git diff check0；exec59249/82798結束、7個本task worker PID不存在、對應所有index隔離DB無殘留（t250-resources.log），最後memory free55%。
- T250完成；下一筆T251，其他feature仍逐筆Green/refactor，不將本scope當整體交付。未commit/push/deploy。

## T251 — 垃圾桶分類引用 GREEN

精確整檔2例全部PASS、0 skip，真PostgreSQL/API；Given完整建態、usageCount=1與category/expense/trip前後快照及owner單筆再讀均成立，DELETE回409 CATEGORY_IN_USE且資料不變。命令：`./scripts/pnpm.sh exec bddgen -c .cache/implement-006/T251.config.ts`及同config Playwright worker=1/list,json，exit0；詳`.cache/implement-006/t251-scope-green.log`及`t251-scope-results.json`。現有usageJoin不篩trip狀態，FK RESTRICT含trash，無產品failure，故不補碼、不偽造RED；data truth NOOP與原分類契約相符。purge移除目標引用與保留共用分類已有T247/T250同版本回歸證據。447來源逐項比對T250完全相同，manifest `t251-files.sha256` SHA256 `2fa6820ee907e058c59e3d2ab76b5399017f2cc005c43f70696f3bd5ad1607e7`。A，無UI修改；沿用low-memory-16gb/root+固定reviewer/heavy1/worker1；runner session32076 exit0、1worker退出、owned DB無殘留（t251-resources.log）。下一筆T252。

## T252 — 分類引用保護下的 REFACTOR

檢視產品projection/usageJoin/readCategory與categoryFailure：已有共用計數及FK錯誤邊界，steps保持薄層、category-result共用權威再讀與snapshot，沒有值得增加變動面的重構，採無程式變更。完整同scope重跑2/2 PASS、0skip，命令同T251 config worker1/list,json、exit0，詳`.cache/implement-006/t252-scope-green.log`及`t252-scope-results.json`。447來源逐項比對T251相同，t252-files.sha256 SHA256仍2fa6820ee907e058c59e3d2ab76b5399017f2cc005c43f70696f3bd5ad1607e7；未重跑無新影響的舊回歸。session91180及1worker已退出、DB無殘留、memory free39%，詳t252-resources.log。下一筆T253。

## T253 — 旅行競爭與結果查證（驗證完成，獨立審查收尾中）

- /bdd green，action ADD，整檔24cases/88實際BDDsteps；A無UI。最初全部PASS，但獨立review R253-01發現data-model.dbml:205明列owner全域operation ID競爭重讀receipt，在跨trip並行時未處理receipt PK 23505。
- 新增真DB/API `operation-race.spec.ts`：BEFORE INSERT receipt用advisory lock屏障，確認兩個實際INSERT都blocked後放行，覆蓋trash/trash、trash/reset、trash/upload。RED3例皆200+500，詳t253-race-red.log；無改truth/feature/DSL。產品新增receipt-conflict.ts，只捕exact trip_operation_receipts_pk23505；原tx回滾後新readonly repeatable-read重讀winner，比owner/trip/fingerprint，異內容409 OPERATION_ID_CONFLICT，同內容回原result/目前state；三個正式命令入口均在transaction外catch。3probe轉PASS並證loser trip/revision/thumbnail不變、恰一winner receipt。
- 修後完整13命令全部exit0：全變更TS/TSX format/lint/strict tsc，scope24/88、private9/image32/life7/purge11/old166/support5/access85/category2/race3皆PASS、0skip。完整命令與log：`.cache/implement-006/t253-validation-matrix.json`；修後runtime raw t253-scope-results.json、逐句t253-final-runtime-summary.json；initial另存不混版本。
- 最新455檔manifest `t253-files.sha256` SHA256 `5203e6c1c2e6cc2472d3a89f78f4f746f636fbead8fcd175f8d7a6fda4a3d57f`。補正歷史447索引範圍：它漏列六個T249已改API檔（expenses/index、members/index、repayments/read、settlement/read、settlement/record、splitting/trip-scope），本輪改由git全量non-spec dirty/untracked收455，新增receipt-conflict/operation-race兩檔。舊447不可再稱涵蓋全部dirty來源；先前靜態檢查始終依git全量，故原檢查已包含六檔。
- runner57239 exit0，包含RED+各GREEN的15個loggedworker全部已退出，全部index隔離DB無殘留；t253-resources.log、worker-pids.json及processes.log，memory free45%。固定reviewer正在最終同版核對；T253尚未勾選直到結論。

T253 final：固定獨立reviewer正式APPROVED / zeroopen，R253-01 closed；455來源及git集合exact、13項矩陣及24/88逐句已獨立核對。報告t253-review.md SHA256 e6b30986f82f6b18e98dae6776b0571cbba4364776e2c4f8838ddb7805117a5c。T253已完成，下一筆T254。

## T254 — 競爭與查證綠燈下結構檢視

/bdd refactor，同完整24case/88steps及新競爭3probe再次PASS、0skip、兩命令exit0，詳t254-scope-green.log/scope-results.json與t254-race-green.log。T253已集中三命令PK競爭恢復，既有read receipt/replay/transaction邊界意圖清楚，進一步合併會擴大風險，採保守無程式變更；未增加抽象或修改truth。455檔逐項同T253（t254-files.sha256 SHA5203e6c1c2e6cc2472d3a89f78f4f746f636fbead8fcd175f8d7a6fda4a3d57f），靜態與其餘回歸沿用同版T253。sessions6061/11754 exit0、2worker及ownedDB無殘留（t254-resources.log）。下一筆T255。

## T255 — 傳輸與提交邊界（最終矩陣執行中）

- /bdd green，精確12cases，A無UI。initial run已觀察extra text413而契約要求400、接收逾時直到95s fixturewatchdog仍無產品deadline；為修復取消後續pending，runner13015 SIGINT/exit130，8pass/2fail/1interrupted/1notrun，非完整RED、亦非Green證據；3loggedworker/DB已回收。initial raw/log保留t255-initial*。
- 新增upload-budget.ts：admission後固定60s接收timer、raw.pause→只讀bytesobserver→同步啟multipart iterator，parser自身pipe/resume維持backpressure。file≤10MiB、實際總body≤10551296、完整framing=body-file≤65536；不只信Content-Length，支援chunked。metadata與全部native fallback由一次10s計時；不涵COMMIT，避免把已提交誤報為未提交。firstabort HttpError reason保408/413；先flush HTTP error，再關未complete body。任意parser/headererror的detach也按response finish關閉未complete input，避免context移除後漏清理。
- timeout先回408但保留await真正nativepromise，outerfinally含後續rollback/recovery真正完成才觸發afterThumbnailJob與釋放busy。native sharp timeout也對應408；一般abort仍UPLOAD_INCOMPLETE。request.parts局部parts2僅作第二header有界lookahead，以區分text400/file413；全域parts1保留，files1/fields0限制使有效accepted part仍最多1，沒有接受第二part或緩衝任意第二body；本機multipart固定this.raw，preParsing Transform無法攔截，故不採不生效的payload計量。
- 首次修正12scope及6budgetprobe通過後，再補detach清理與text-incomplete第7probe；最終15command矩陣t255-validation-matrix.json進行中。最終完整12/36已PASS0skip/flaky/unexpected（t255-scope-results.json與t255-runtime-summary.json），不混用首次版本結果。source457 manifest t255-files.sha256 SHA12a2f0646a08ef895cbbef3bd5f69e20547a7c3a7903b1c72781017ba9ec3bc7；獨立reviewer全檔hash核對一致，目前static零open，待最後矩陣。未勾T255。

T255最終矩陣已完成：15命令全部exit0，共363測試執行（完整backend348 + support5 + 新race3 + budget7），各scope數12/9/32/7/11/166/5/85/2/3/24/7，全部0skip。額外text-incomplete未end的rawstream已flushHTTP400；chunkedtotal及framing均HTTP413而非closed；nativehold於408後仍503直到真completion事件，release後新job200，snapshot無晚到寫入。457來源hash12a2f0…3bc7逐項重核；runner77855exit0，包含initial取消及各驗證的17loggedworkers均退出，DB0殘留，free42%。獨立reviewfinal等待中，未勾T255。

T255 final：固定獨立reviewer正式APPROVED/zeroopen。457 source及git集合exact、15矩陣、raw12/36/generated全句核對；receive實例60426ms/server60009.9、process10777ms/server10014.5證正式60s/10s。T057/fulljob與Group31 deferred本scope已關。報告t255-review.md SHA256 9c50fc251fae2c33e9440afbb66041f8c82d7fe6925f8e3fb55898018f27d1f1。T255完成，下一筆T256。

## T256 — 傳輸與提交綠燈下結構檢視

/bdd refactor，檢視timer/stream/native completion邊界，T255已集中monitorUpload、firstabort reason與slot finally，未發現應再拆分的重複；採保守無程式變更，避免擴大已證明的stream生命週期風險。同整檔12/36與7個budget probe再次全部PASS，0skip、兩命令exit0，詳t256-scope-green.log/scope-results.json及t256-budget-green.log。457來源逐項同T255（t256-files.sha256 SHA12a2f0646a08ef895cbbef3bd5f69e20547a7c3a7903b1c72781017ba9ec3bc7）；其餘回歸/靜態/獨立審查沿用同版T255。sessions61552/50427exit0，2loggedworker退出、ownedDB0、free42%，t256-resources.log。下一筆T257後端整合。

## T257 — 後端整合（最後support重跑中）

- 完整官方API bddgen exit0＋同一次Playwright API27檔348case全部PASS，新增006182/既有166、0skip/flaky/unexpected，216.1s；t257-api.log/api-results.json/api-summary.json逐case帳。沒有以個別focused綠燈相加冒充整合。
- 官方playwright.support.config.ts完整356case初跑355PASS/1FAIL（t257-support.log/support-results.json）：唯一失敗為HEAD既有no-settlement-remainder-result.spec.ts cash1仍要求100/3應付付1後完全結清，與現truth settlement-payments-and-adjustments.feature:28–35及API settlement.yaml:42 partial97/3矛盾。產品符合truth，僅修該supportspec：cash1改正向精確partial97/3、保留原來源/獨立實付1/revision+1/GET安排與payment/只讀再查；33/34/100/700 closingcase及puremath任意cash的cancellation oracle保持。focused6PASS；無skip/刪case/放寬產品驗收。固定reviewer已靜態zeroopen，待最終完整support。
- t257-db-audit.ts使用隔離DB與正式migrate/buildApp證明空庫五份migration；舊0001–0003 SHA256同HEAD；兩次正式listen/close啟動重跑migrate，_ledger_migrations內容/套用時間及原trip逐欄相同；5routine皆SECURITY INVOKER且目前testrole能EXECUTE、53約束檢視FK RESTRICT/thumbnail bytea範圍/receipt owner+op PK與不連tripFK、12非內部triggers均enabled含reservation/receipt immutable，詳t257-db-audit.json/log。0003既有資料升級及backfill/不改帳務/重複migration由完整support內trip-migration.spec.ts真DB驗證。此為與正式DDL一致的隔離測試，不是部署權限查核。
- 最新458來源t257-files.sha256 SHAbfffefb9be4e3debb3471368fa6258f8b59da16ef6b001d301d4e1ef02ffd2dd；較T256只多上述一supportspec的dirty索引，產品/BDD steps及共享helpers無變，因此完整348 API證據仍同一產品/驗收版本。全變更TS品質三項皆PASS，最後完整support矩陣runner88232仍在執行；T257未勾。

T257最終完整support356/356 PASS（63546ms）、0skip/flaky/unexpected；4項品質/fullsupport矩陣exit0。完整API348+support356合計704次全綠。458來源hashbfffef…d2dd逐項重核，8個logged本task worker/audit PID均退出、ownedDB0、memoryfree38%，詳t257-resources.log；固定reviewer final待核，尚未勾T257。

T257 final：固定獨立reviewer正式APPROVED/zeroopen，458hash/git集合exact、API27/348（182new166old）逐case+stepcounts、support133檔356例、focused6與4matrix、空庫/升級/重啟/DDL證據全核對。t257-review.md SHA256 57d4a11f445de2bbb4b916af5ca975b9969626b5a928354304105a7f925ef0b3。後端完整功能組checkpoint完成；依使用者先前明示不要停續跑授權，保存交接後繼續T258，不跳前端設計/比對關卡。


## T258 — 前端旅行管理與確認（最終驗證中，尚未勾選）

/bdd green，整檔18例；只實作管理dropdown、縮圖editor入口、移入/還原/永久刪除確認與清單更新、桌機與手機垃圾桶次級導航、成功後owner query取消/清除/重讀。完整縮圖草稿與保存是T260，結果未明是T268，不提前宣稱完成。truth/feature/DSL未改。

產品版本：HEAD `7c1c35e67574e9d0bd29125592232735cabefb48` 加未提交470檔來源，`.cache/implement-006/t258-files.sha256` SHA256 `287c607b11ac4b55ec72ab17c53034826b8848a30e3669ae2bb6c18d5b4b8f95`。來源在整輪最終runtime期間凍結，逐檔再核對無變更。最新三項全變更TS/TSX格式、lint、strict typecheck皆exit0，命令帳`t258-validation-matrix.json`；CSS格式亦通過。low-memory-16gb，root實作、固定reviewer只讀，heavy1/worker1，兩瀏覽器序列。

完整管理scope在Chromium/WebKit各1440×900與390×844，四project各18例全部PASS，合72executions/228實際BDD步，0skip/flaky/unexpected。F043兩列按DSL固定「桌機/手機」覆寫viewport，因此有68個唯一case/browser/actualviewport組合，不誤報72個唯一組合。逐句帳`t258-runtime-summary.json`，原始`t258-<project>-final-results.json`及完整命令`t258-full-matrix.json`。包含真原生Origin、原UUID/版本與exact command count、成功HTTP/權威DB與影像snapshot、history/cache安全、第二個真browser context還原後資料不變、cancel/X/Escape無write。

原生鍵盤與診斷：Safari pointer click原本未focus opener造成取消回焦失敗，明確在真正trigger上focus後再showModal，固定WebKit六cancel全PASS；dropdown外部空白pointer預設blur會蓋過還原焦點，僅空白surface preventDefault，真正可focus外部控制保留瀏覽器焦點。舊WebKit新增表單鍵盤兩例失敗的fresh-native probe證明當前平台Tab會跳過未明列tabindex的button；共用Button default tabIndex0保留caller0/-1與native disabled，原舊斷言不改，focused2及完整舊129重跑均PASS。不得推論所有純Link可用plainTab；新導航將另驗ChromiumTab/WebKitOptionTab，先fresh anchor原生key證明，再產品純Link實際Enter、owner投影與零write。該額外QA仍待執行。

C畫面依design-v7（38frame原批准，pen SHA256 `6c33bce25da872057d253a44bd0e59dec1f0e41f974873fb6db0dfe10b6c1abc`）與固定baseline commit `8fc9f94134c66ffd29918014b950894b1007aa86`；prototype不製作。原設計預覽在plan `ui/design-previews/`，產品19張PNG在`.cache/implement-006/ui/`，同stem JSON保存15組主狀態bbox/scroll/heading/focus，空白4張逐圖核對。證據manifest`t258-ui-evidence.sha256`；以下全部D/M為1440×900／390×844，fixture是日本/台南旅行及真JPY/TWD帳務，與設計示例日期/筆數/金額/照片不同的資料不當成版面缺陷。

| 畫面／預期預覽 | 設計預期 | 實際呈現與差異影響 | 處理結果／確認依據 |
| --- | --- | --- | --- |
| U01-D/M `qOVYr/uBMYs.png` | 旅行清單、手機brand與全寬新增入口 | `U01-D/M.png`；手機完整brand/單行標題/全寬CTA，真清單順序；現有卡片landscape沿用，完整照片讀取/失敗fallback綁定待T266 | 手機header已按v7補齊，不能用baseline豁免新C區；桌機228px既有shell保留 |
| U02-D/M `nh4JN/c5e28.png` | 帳本標題、管理入口與新增並列 | `U02-D/M.png`；原帳務淨額、同行者/分帳等資訊保留；示例稿省略的既有業務卡未刪除 | 新管理入口/手機兩欄符合v7，既有資訊位置引用固定baseline；數值依真DB |
| U06-D/M `ZMoXS/xsZKA.png` | anchored兩項選單、不遮罩帳本 | `U06-D/M.png`；縮圖/移入入口、hover/focus層級與原帳本均可見 | Enter/Space/Arrow/Home/End/Escape、Tab/ShiftTab及外部close QA通過，無write |
| S01-D/M `k5UPcL/vkszC.png` | trip名、保留資料/可還原、取消/移入、X | `S01-D/M.png`；D606×380/M350×400，D16px兩行描述，notice/actions符合預期層次；安全Cancel初焦點 | source與最新圖修正獨立review R258-03；取消/Escape/X不改DB；原帳本只作背景 |
| U03-D/M `WLw0N/VtNXn.png` | 垃圾桶識別清單與還原/永久刪除 | `U03-D/M.png`；只owner trash，原帳務內容不投影於trash；真縮圖/版本識別 | 真owner API/DB對照；桌機次層與手機入口，不把trash當UUID |
| S02-D/M `G7HrKo/rHv6p.png` | 不可逆警告、全部資料後果、取消/永久刪除 | `S02-D/M.png`；D606×414.17/M350×438，黃色警告/紅色動作、D完整長描述兩行、M較短同義完整後果 | D0.17px是字型計算小數，不改意圖；Cancel初焦點、全取消與成功purge真資料驗證 |
| U05-M1/M2/M3 `FTGvi/skr2f/K7sv4E.png` | 我的旅行次級sheet、清單/垃圾桶、旅行中保留目前旅行上下文 | `U05-M1-M/U05-M2-M/U05-M3-M.png`；M1/M3高182，M2高239，bottom779正接navtop779/height65，h2完整/scrollTop0 | 已收斂R258-01，safe-area共用高度，Safari真opener回焦；不增加第六個bottom item |
| S04-D/M `g1Pexm/U2nnu.png` | 成功讀取後真空白清單 | `S04-active-D/M.png`及`S04-trash-D/M.png`；有識別標題/說明/適用操作，無假資料 | 真API成功空items；未提前涵蓋後續loading/error/paused scopes |

所有新dialog標題可見、無水平溢出，整頁固定baseline/新C區差異已逐項處理；功能全綠沒有代替視覺比對。獨立reviewer已重看19張圖及最新三張修正，R258-01/02/03均可閉包；最終APPROVED待支援/建置、額外導航QA與版本/資源完整核對。

歷史失敗不混入最終Green：attempt1 Safari opener回焦失敗、attempt2外部pointer回焦失敗、attempt3舊WebKit鍵盤127pass/2fail，皆留`.cache/implement-006/t258-attempt{1,2,3}/`。initial `.headers()`缺原生Origin改`.allHeaders()`仍保exact Origin斷言；無產品注入Header。最終同470來源重新跑完整矩陣，而非累加不同runtime版本部分結果。


T258最終runtime收妥（待獨立final）：14命令完整矩陣及額外導航4命令全部exit0；target72、WK鍵盤2、Chrome視覺/鍵盤/empty16、舊web Chromium129＋WebKit129、web-support Chromium275＋WebKit275，另純導航4，合902執行全部PASS、0skip/flaky/unexpected。production build exit0，輸出資產hash`t258-build-assets.sha256`。三靜態檢查同470來源通過，未在runtime間修改產品。

額外原生導航QA四project各1 PASS，命令`t258-navigation-matrix.json`、實際協定/viewport/bbox/owner投影/noWrite為`t258-navigation-<project>.json`：Chromium純Link以Tab，WebKit以Option(Alt)+Tab；每輪先在fresh native anchor（無tabindex）證明key真能focus，再回實際app以key穿過desktop新垃圾桶次層或mobile我的旅行button/次級sheet links，用Enter進trash。沒有.focus、DOM注入、強行調OS偏好或skip。Tab按鈕協定與平台原生Link協定分開記錄，不宣稱WebKit當前設定以plainTab走所有Link。真API owner項目/外人不可見、精確DB/原圖不變與零mutation均成立。

C證據40檔（19PNG＋15metrics＋2 QA scripts＋4 configs）manifest`t258-ui-evidence.sha256` SHA256 `4d5e15e46f1b81b4e85874e1fe92d27d0090c9ab29de59dbe8297c99d3e2c4b8`。最新470來源逐項無變；程序與owned隔離DB由每次runner後audit核對，最終彙總資源另列。獨立final pending，T258維持未勾直到APPROVED。

T258最終資源：40個flat-log registered worker PID均已退出、owned全部index隔離DB空（t258-resources.log/worker-pids.json/processes.log）；master36491/QA95959exit0。memory_pressure顯示free43%，後續sysctl kern.memorystatus_vm_pressure_level=2（warning）；swap18648.75MiB較入口上升，不能宣稱全機無壓力或長期穩定，維持heavy1/worker1，不終止使用者程序或工具環境。代理→OS PID映射未知。下一task前再檢資源。

T258 runtime後資源複查：實際pressure level=2警告，雖owned runner/worker/DB均已回收，暫不開新heavy。工具與使用者既有程序不作無歸屬終止；固定reviewer僅只讀完成final，root按兩次有界重測檢查是否可解鎖T259。

T258 final：固定獨立reviewer `/root/review_006` 正式 **APPROVED / zero open**，R258-01/02/03均closed。report `.cache/implement-006/t258-review.md` SHA256 `668fe55d8f6cd84d519291cc48cfb40ff5542ba75e59b50758850ffd9862615c`；已獨立核對470來源/git集合、40畫面證據、build資產、72/228原始逐句、68uniqueactualviewport、14＋3＋4命令及902計數、原生導航/owner無write。T258已回寫[X]，258/292。批准只涵本task已驗行為/UI/來源，不代表全plan交付或資源正常。下一筆T259未開始；兩次有界重測仍pressure warning，依資源gate交接，需資源恢復後再逐筆續跑。未commit/push/deploy。


## 使用者授權的分 scope 提交（2026-11-15）

使用者明示「根據目前的 files 用適當的 scope 一一 commit」，授權在plan未全數完成時先保存目前成果。這項授權只用於local commit；T259以後仍未完成，不因此提前勾選。功能/測試原始內容與T258已審核470檔manifest逐檔相同，沒有新的產品修改，故沿用既有驗證，不重開heavy測試。沒有提交.env、工具cache或執行產物。

| Commit | Scope／內容 | 檔案數 |
| --- | --- | --- |
| `f4fee0378f` | `build(api): add multipart and native image processing dependencies` | 5 |
| `cc4a2e4154` | `feat(db): persist trip lifecycle thumbnails and purge receipts` | 4 |
| `61e398591f` | `feat(api): implement trip trash thumbnails and transactional purge` | 21 |
| `b47cf46545` | `fix(ui): preserve native dialog focus and keyboard button access` | 2 |
| `9c2de010ca` | `feat(web): add trip management menus and trash confirmations` | 12 |
| `16ec6572a1` | `test(splitting): distinguish partial payment from settlement remainder` | 1 |
| `e6d8c9830b` | `test(fixtures): add isolated trip management and browser failure probes` | 195 |
| `2c3aa412b4` | `test(api): bind trip lifecycle image and access scenarios` | 57 |
| `875ed6c136` | `test(web): bind trip management thumbnail and lifecycle journeys` | 108 |
| `042a632cea` | `test(loading): bind waiting recovery and keyboard scenarios` | 65 |

另以 `docs(plan-006): record implementation and validation through T258` 提交本表及tasks/handoff/validation共3份進度文件。完成後以git log可取得該docs commit；此表不以自我引用hash製造額外commit。全部473個變更檔案各有唯一分組。共享測試fixture存在跨前後端相依，集中在test(fixtures)以保留import閉包；其後API/frontend/loading步驟各自提交。新前端未實作scope的RED案例在相應commit body明示，並非聲稱全plan測試全綠。

驗證起點仍為原HEAD `7c1c35e67574e9d0bd29125592232735cabefb48` 加470檔source manifest SHA256 `287c607b11ac4b55ec72ab17c53034826b8848a30e3669ae2bb6c18d5b4b8f95`。現在內容已入Git，恢復時用各路徑內容核hash，不再要求git dirty集合等於舊未提交清單。`.cache`中的原始log/PNG仍為本機證據，未強制加入repository。


## T259 — 旅行管理與確認綠燈下重構（驗證中）

精確同T258完整18例，/bdd refactor，C原設計v7與固定baseline不改、prototype不做。產品基底HEAD `78c3171942`；四改動檔案manifest `.cache/implement-006/t259-files.sha256` SHA256 `7582fc98a494643c9ea03c092ab9e3e014906ad0870a2bc21baab85eddbabbb9`。只把journeys.css的管理/確認/trash/手機sheet樣式原順序抽至management.css，import緊接原journeys位置；並把生命週期hook的useRef即時UUID改useState lazyinitializer，仍每掛載保留同一操作UUID，lock/retry/body/cache順序未變。沒有擴充T260圖片保存、修改truth或斷言。

拆檔等價證據：原journeys = 新journeys＋一個跨檔空白行＋management原文；非空白規則順序未變。當前環境拆前先成功build，保留`.cache/implement-006/t259-before/fresh-build-assets`；拆後build正式CSS逐byte完全相同，SHA256 `db8268d9280f0b733ee60e64486adbde024af596de10ac76a56409d087cd5381`，詳`t259-css-equivalence.json`。故舊共享UI呈現/表單/既有fixtures未變範圍沿用T258已完成的129×2舊web與275×2support，不能宣稱T259重跑它們；管理hook影響範圍重新完整72執行＋原額外22。新圖保存t259-ui，T258原19圖在ui與t259-before均保留，沒有覆寫舊證據。

首attempt因Docker環境失敗中止：runtime setup30s逾時，3failed/1interrupted/14notrun、未進產品Given，root確認ownedrunner58510後SIGINT，exit130。4worker PID均退出；Dockerstatus running但engine_ping3s逾時、compose查詢無回應、PG3sconnecttimeout。使用者明確授權重啟Docker Desktop後，restart --timeout50 exit0，engine_ping OK，repo db/test-db health重新啟動並真PG查詢成功；tmpfs test-db與attemptworker隔離庫無殘留。沒有改斷言/timeout或產品源碼來處理此環境失敗。原矩陣/raw/log/4traces保留t259-attempt1，診斷/恢復`t259-docker-probes.json`、t259-docker-after-restart.json及restart/db log。Cua因Docker介面timeout無法取得狀態，沒有操作UI或改設定，已完成工具結果記錄；實際恢復使用有授權的官方CLI。

資源：16GiB，入口pressure1/free62%/swap2259.81MiB，Docker恢復後pressure1/swap2243.81MiB，heavy1/worker1，root實作/固定reviewer只讀。最終runner98431按每個heavy前檢pressure、每個Playwright後核worker/DB，完整命令帳t259-matrix.json。此節等待最終runtime/新圖/資源及獨立review，不預先勾T259。


T259最終矩陣：同4source版本，17命令全部exit0（3品質＋build＋focusedbddgen＋4scope＋2visual＋2WKkeyboard＋4nativeNavigation），主runner98431 exit0。完整72cases/228實際BDDsteps、68uniqueactualcase/browser/viewport（F043依DSL覆寫device）；額外Chrome8×2/WKkeyboard1×2/nativeNav1×4，共94執行全PASS，0skip/flaky/unexpected；scope原始`t259-scope-<project>.json`、逐句`t259-runtime-summary.json`、命令`t259-matrix.json`。額外導航仍先fresh無tabindex anchor證明ChromeTab/WKAltTab，再用真key/Enter走實際可見垃圾桶連結，owner投影/DB/原圖不變與零write。

C重構後刷新證據：同v7設計/固定baseline與T258差異表全部沿用，19張PNG新保存在t259-ui；18張PNG檔案完全相同。U06-M重看before/after並解PNG濾波實比：390×844中僅27像素不同，bbox[20,264,23,424]、單channel最大2/255，差異位於細邊緣，沒有布局/資訊/操作變動；不是宣稱PNG編碼完全相同。全部15組JSON viewport/scrollWidth/nav/dialog/headings/focus metrics逐值完全相同（t259-metrics-comparison.json）。新40檔圖/metrics/QA/config manifest t259-ui-evidence.sha256 SHA256 `2d3348636a4c8a8b4e317315f1fbb25afb01be5a01c19e39410d26a103629782`；像素/檔案差異t259-visual-comparison.json，未覆寫T258證據。代表U02/U06/S01 D/M與其餘U01/U03/U05/S02/S04均已刷新；此為原設計下保呈現重構，不是重新批准新設計。

資源最後：12個最終loggedworker PID及4個attemptworker均實際退出；owned全部index隔離DB空，audit t259-resources.log/worker-pids.json/processes.log，Docker修復後真query亦核attemptDB空。pressure1正常、swap2243.81MiB/free58%，本輪heavy已全退出。gitdiffcheck0；未新commit/push/deploy，產品之外只更新plan驗證/交接。固定reviewer正核最終同版資料，T259維持[ ]直到結論。

T259 final：固定獨立reviewer正式 **APPROVED / zero open**，report t259-review.md SHA256 `b15def4867e49ca6ab74e31ccc7c0e2a7371672dc39d8085153ecf292ddb1fd5`。已獨立核4source/40UI entries、72/228 raw與68unique、17命令與94計數、等價與native導航證據。T259已回寫[X]，代表U02/U06/S01 D/M及整檔畫面checkpoint完成。依既有使用者不要停的明示授權保存此checkpoint後繼續T260，review/UI/完整驗證關卡仍保留；plan未交付。


## T260 — 縮圖預覽與保存（部分Green，資源關卡交接；未完成）

/bdd green，精確整檔23個展開case，C沿v7 U04/S03/S05/S09、固定baseline與prototype不做。T259已完成、259/292，T260維持[ ]。目前產品包含File/default/keep本地draft、只在保存時POST/DELETE，原ID/兩版本與File在同頁close/reopen保留、close只撤下modal而不撤回遠端、75s寫入timeout、receipt+state各5s有界查證、unknown禁再次保存/Again只讀、owner:trip key隔離與unmount防舊completion、內存last-confirmed Blob與URL回收；沒有localStorage/ServiceWorker持久圖片。

已實際觀察並修正的slice failure（原log均保留flat t260-*.log）：缺filechooser；preview另browser context缺卡片實圖（只補當前scope必要hasThumbnail/version讀取，不宣稱T266全功能）；input的cancel冒泡被FormDialog誤當Escape（target guard）；thumbnail browser-command同步headers省Origin（awaitallHeaders保exactOrigin）；F050真PG23514經Drizzle cause包裝漏既有400分類（global handler改用既有postgresError取得原三SQLSTATE，未知碼仍500）；response-loss未分unknown；close丟失原次查證入口；partialbody helper硬限VALIDATION_ERROR而契約允/截斷指定UPLOAD_INCOMPLETE（只校exact碼，400/DB/receipt/File原URL全部保留）；重新選合法圖後仍殘前次error。committed-response-loss native header觀察改非同步並用Promise registry/cleanup await保收妥，仍捕真上游200、真DB提交後只drop response，不造回應。

目前Green：preview2、cancel/reopen9、chooser2、save/明確失敗/解除重試6、unknown兩種draft2、unknown關閉再返回4、截斷/恢復6等各slice，不能累加不同版本當最終矩陣。第一輪完整Chromium-desktop23/23 PASS（t260-first-full-chromium.json/log，0skip/flaky/unexpected）；其後仍有共享Tab焦點循環與UI微調，所以這只是preliminary。最新web strict typecheck exit0在最後modifier guard之前，最終品質需重跑。新cache視覺QA九state＋keyboard：D早期9visual/1keyboard fail，首尾Tab wrap後focused keyboard PASS、M三次完整10case均PASS；D refined10 PASS但非最終凍結來源，不當作完成證據。畫面在t260-ui，U04/S09 M358×720、CTA y633.6875對稿634；unknown M約802高、CTA皆可見，所有header/scrollTop/寬度量測記錄同stem JSON。合成圖與稿照片不同，未硬植入提案照片；C最終逐圖表/固定版本尚待。

獨立review目前未批准：最後source已加alive在invalidate await後再檢，以及確認Blob未載入的pending明確占位（不暗示default已保存）；這兩項曾由reviewer指出。額外Tab12次QA曾到BODY，FormDialog加可見enabled非負tabIndex首尾wrap，最新另排除Ctrl/Meta/Alt，最後這個modifier guard尚未跑品質或runtime。reviewer指出WK舊MyTrips sheet隱含Link可能被plainTab跳過、讓candidate最後項判斷漏接；已準備`t260-sheet-keyboard.config.ts`與`ui/T260-sheet-keyboard.spec.ts`（Chrome/WK mobile，plainTab/ShiftTab各8次/DB不變），尚未執行，需先實證再最小修，不把BODY改算通過。不建議整個DOM每Tab全手動循環，以免改radio/正tabindex/DateField與nativeLink偏好。

資源中止：在正常pressure1期間已做上述工作；最後又升pressure2 warning，兩次各5秒有界重測仍2，swap2350.06MiB/free44%，見t260-pressure-rechecks.json。23個flat-log worker PID全退出、owned隔離DB空（t260-resources.log等），ps另查無ms-playwright/Chromium/MiniBrowser/headless_shell；唯一typecheck73417已exit0，無本輪heavy。只重置本輪暫用CUA JS session，未終止使用者程序。依資源規則停止新heavy；這不是測試失敗被算Green，亦不是T260完成。

交接版本：baseHEAD78c3171942＋15個non-spec dirty/untracked source，manifest `t260-handoff-files.sha256` SHA256 `589b06da8b432890e9645f41ffacc58a3c4c50ea1bbacdbe44240265e9a714b4`（含T259原4檔及本輪增量）；working tree列表t260-handoff-git-status.txt。本snapshot是續跑點，不是已完整驗收版。尚待：資源正常→sheet plainTab probe/必要最小修→刷新所有source品質與D/M圖→本scope4×23=92→T259受影響全檔/代表畫面/鍵盤→舊web129×2/support275×2（sharedFormDialog）→API348/support356（sharedSQLSTATE handler）→所有worker/DB資源與固定reviewerfinal。全部通過才勾T260，之後T261；truth/設計未改，未新增commit/push/deploy。


## T260 warning放寬後固定版本驗證（進行中）

使用者2026-11-16授權本session warning2觀察續跑，保留heavy1/worker1/固定reviewer，critical4/OOM/受管資源不可回收仍停；不修改skill。來源base78c3171942＋16檔 `t260-final-files.sha256` SHA `9c6bd23bb347574d21c09c21327821c47ce1f74b950c88174f5348a2c83b84da`。新manifest後format/lint/root typecheck/root build全部0；本23例四project各23PASS，共92，0skip/flaky/unexpected。新視覺與鍵盤Chrome10×2+WK1×2=22，以及舊MyTrips sheet ChromeM/WKM各1，全PASS。後續受影響管理、舊web/support及API/support矩陣尚進行，尚不回寫T260。

### C類同版設計與產品畫面比對

設計design-v7/pen SHA6c33bce25da872057d253a44bd0e59dec1f0e41f974873fb6db0dfe10b6c1abc；U04-D Wd1Pq、M A0kb5；S09-D s8IowS、M tI380；共用S03-D/M ybPvI/DECWg、S05-D/M M6LRw/kMwFM。產品新18PNG及18JSON輸出`t260-ui`、manifest`t260-final-ui.sha256`；root逐圖檢視完成。固定baseline8fc9f94保留228px sidebar/真005帳務與資料，不刪已存在資訊以仿示意背景。

| 畫面/狀態 | 核准預期 | 同版實際與差異處理 |
| --- | --- | --- |
| U04 current/photo D/M | D668×715置中、32內距、604×264預覽；M358×720@(16,62)、20內距、318×190預覽；title26/23、兩個相鄰文字工具、48px CTA | D@(386,92.5)、M@(16,62)與預覽均相符。D CTA y681.05對設計684（字型行高差約3px），M633.69對634。JPG富士示意替換為真64×48合成PNG測資及真檔名，非缺圖/假成功；未選草稿無未保存badge、保存disabled。工具hover軟綠是實際滑鼠位置。 |
| S09 default D/M | 本機預設仍未保存、橄欖至沙色漸層/Mountain圖示、保存才套用；與U04相同位置 | 同尺寸/CTA、155deg #9ca982→#d5be8f漸層、48px圖示。文案在描述+badge+檔名合併表達同意圖，長度因真trip名與最大限制完整文案換行；M footer對齊634。 |
| S03 saving D/M | 仍顯最後確認縮圖，工具/保存不可重送，spinner，保留取消/關閉 | 真native WebP gate停住截圖，最後確認Blob與新draft測資色不同可辨，spinner-only有aria label，48px CTA與U04對齊；非把新draft當遠端成功。狀態board為語意對照，未複製四張卡進dialog。 |
| S03 failure photo/default D/M | 明確未保存、保留草稿可修正/重試、錯誤可讀 | 真23514拒絕400；紅色alert置limits後，預覽保留photo/default草稿；D footer707.84/M660.48因一行錯誤下移，dialog仍715/720，完全在viewport內；兩工具相鄰可用。 |
| S05 verifying D/M | 等待查證只讀、spinner不重送，不提前宣告成功 | 真提交後丟失回應/暫緩GET截圖；最後確認Blob、unknown badge/描述、amber狀態、查證與保存spinner/disabled；D780.94/M801.56高，fit-content且上下>=16，footer全可見。 |
| S05 unknown photo/default D/M | 不確定結果需再次查證原操作、不可重新保存/重選；關閉不撤回 | 真提交後讀回受阻，D781.33@(386,59.33)/M801.95@(16,21.02)，因兩行狀態與查證按鈕適配增高；M footer750.97+48在844內。保原photo File或reset意圖，最後確認圖相同、不誤顯草稿保存成功。 |

全部18圖無水平溢出，標題與CTA皆可見；新keyboard實際連按Tab12步/Escape回管理trigger、MyTrips sheet plainTab/ShiftTab16步/Escape，保DB不變。shared FormDialog首尾wrap只管無修飾Tab，descendant file cancel不誤關dialog；WK sheet真RED後只兩Link tabIndex0修補。未改設計意圖/未新prototype；獨立靜態zeroopen，final待完整回歸與同版UI複核。


### T260 受影響清單視覺修正後重新固定來源

root比對management U01新圖時發現真照片仍疊舊預設裝飾圓線。這是視覺RED，不以功能Green免除：只在`.landscape .trip-thumbnail`增position relative/z-index1，照片蓋住既有偽元素，default裝飾不變。原runner64059精確SIGINT exit130，49登記worker皆退出；殘留唯一隔離DB ledger_test_56614_0在確認worker退出後精確DROP，重audit owned0且ps無browser。原完整品質/scope92/UI22/sheet2/management94與未完成oldweb證據完整保留`t260-final-attempt2`；不將不同來源partial相加。

新來源16檔manifest SHA `5fdff503a2aa13432ec1ce48ba0cad28971294187f7e255fa1d3853d4889d887`，同base78c。唯一runner45009從頭重跑同完整矩陣，逐命令檢hash/pressure/回收，warning2使用者例外持續。品質format/lint/root typecheck/root build已重新0，新UI/全部scope/regression與final review待齊，T260仍[ ]，不預做T261。先前9c6b來源的畫面比對敘述僅為歷史，最終將以5fdf來源新圖/manifest覆核。


### T260 最終來源5fdff5新圖比對收斂

5fdff5來源完整scope92、縮圖UI/keyboard22、sheet2、管理scope72、管理visual16/WK keyboard2/native導航4全部PASS。新18PNG/18metrics manifest SHA `34ed503a844419b6780e4e747619c3239737cdfc0de50734d4fbac683b42d70c`，新管理19PNG/15metrics manifest SHA `05ff426550e2328cef3cf2fe1d192461231eea1e8971ba58f766241ef4ee7c9d`。36縮圖檔對前版33byteexact，3PNG差異(S03-failure-photo D/M、S05-unknown-default D)root與獨立reviewer重新逐圖核正常，18metrics全exact，故上表同一設計對照/CTA/狀態適配於此新來源再成立。

管理34檔對前版30byteexact，4PNG變化U01-D/M照片圓線消除、U05-M1背景對應真圖、U06-M渲染細邊；root/獨立reviewer均已view差異。對T259原版13PNG byteexact、其餘6PNG（U01D/M、U03D/M、U05M1、U06M）逐圖核對：U01真圖片替換舊JOURNEY但不帶預設圓線，U03真照片/刪除日期跨日，U05背景同源實圖，U06無資訊/位置差異。15metrics逐值exact。代表U02/U06/S01與其餘未變部分承接T259已批准design-v7，保228shell/真005帳務。新sheet兩Link鍵盤tabIndex只語意變化、不移位置；4 native導航、2 sheet 16步與DB不變通過。

獨立來源/新圖審查ZERO OPEN，但final批准仍待oldweb129×2、web-support275×2及API348/support356全矩陣。未將舊partial混計為完整回歸。


### T260 完整矩陣結束（final review待核）

新來源5fdff5固定不變，runner45009 exit0；`t260-final-matrix.json`36命令皆0，`t260-final-runtime-summary.json`逐raw確認1,722 expected、0unexpected/skip/flaky/root errors。

| 範圍 | 執行數/結果 |
| --- | --- |
| 本縮圖23例×Chromium/WebKit×1440×900/390×844 | 92 PASS |
| 縮圖新UI/鍵盤 Chrome10×2+WK1×2 | 22 PASS |
| 共用MyTrips sheet plainTab/ShiftTab/Escape ChromeM/WKM | 2 PASS |
| 前一管理整檔18×4+visual16+WKkeyboard2+native導航4 | 94 PASS |
| 原web非F006 Chromium/WebKit各129 | 258 PASS |
| 原web support Chromium/WebKit各275 | 550 PASS |
| 全API BDD348+API support356 | 704 PASS |

format、lint、root typecheck、root build及4個bddgen全部PASS；固定16源檔逐命令hash保護，完整副本`t260-final-source`。原attempt1品質空行/attempt2視覺中止均為歷史，不混計final PASS。

最後audit55登記worker全退出、owned DB空，另ps無Chromium/ms-playwright/MiniBrowser/headless_shell，snapshot `t260-final-browser-processes.txt`；工具/agent到OS PID對應未知不宣稱已回收工具所有記憶體。pressure回1 normal，swap6079.50MiB（整輪有增長、未觀察critical/OOM），測試單worker/單heavy，全輪無新常駐agent/無使用者程序關閉。本session放寬warning gate已完成整組驗證，但不永久改skill。已交同固定reviewer final核對，T260待批准後才勾；T261尚未開始。


T260正式完成：同固定reviewer APPROVED/zeroopen，report `.cache/implement-006/t260-review.md` SHA `f03a6e6f67229312034b300f8fbaa5ccbd7bdc346921a15734590d561c5a43e7`。獨立逐raw核1722次單次passed與scope逐Examples/96步×4=384BDDsteps、55PID退出/ownedDB空。已回寫T260 [X]，260/292；按使用者既有持續實作授權接T261 refactor，不提前勾。資源最後pressure1，heavy0；工具PID對應未知，不增加代理。


## T261 refactor完整驗證（獨立final待核）

baseHEAD78c＋16source manifest SHA5af2dc4657954c2d0bb4519ea0a7bc85f3bb58039be37d61268cf0d6027e1d31；對T260批准來源只有ThumbnailEditor.tsx local usePreviewUrl抽取、其餘15file exact，delta`t261-source-delta.json`及完整前後source副本可重驗。沒有業務/設計/feature/DSL/測試斷言改動。保remote-fetch→confirmedURL→FileURL順序、每次captured URL cleanup/[value,open]依賴與獨立state；關閉釋放URLs、unknown仍保File/opid/版本不變。

runner41188 exit0，`t261-final-matrix.json`28命令全部0，`t261-final-runtime-summary.json`210實際expected/passed、0skip/flaky/unexpected/errors：本scope23×4=92＋新UI22＋sheet2＋前管理scope72/visual16/WKkeyboard2/nativeNav4=94。format/lint/root typecheck/root build/兩bddgen都PASS。

新UI manifest SHAec5957ee560e07929015688e762d02d607f7db52aabf231224a4ca31058519a6，36檔33byteexact；18metrics全exact。3PNG差異：failurephotoD24pixel/max2、savingD6257pixel/max2（button渲染），unknown-default-D8005pixel/max230在description/limits/status字區，root與reviewer逐圖對T260核同文案/換行/位置/語意，未把max230誤稱微小channeldiff。新管理manifest SHA468520d9c4bcf8fa99444fc120d4455171fd33272fe59333e9a80e28bc40b9cf，34檔33byteexact、15metrics exact，唯一U01D12pixel/channelmax1細邊，root已view。所有C v7 U04/S09/S03/S05與管理代表畫面對照沿T260已批准且新圖覆核無未決差異。正式CSS對`t261-before-build.css`逐byte相同，SHAde4b676ea3a5a48e53ff19ca28c9251aeb58a0eb1978c5c46b80db4e83cf40aa。

本輪只重跑210，不把T260的oldweb258/websupport550/API704加進當前執行數；這些源檔/共享元件/樣式/API/helpers對T260全矩陣不變，獨立審查接受沿用邊界，最終plan完整回歸仍保留。22本輪登記worker全退出、ownedDB空、ps無Playwright browser；pressure1 normal/swap5919.50MiB。工具agent PID對應未知；無新代理/commit/push。T261待獨立final批准前仍[ ]、T262未開始。


T261正式完成：固定reviewer APPROVED/zeroopen，reportSHA685f18ab268a55dfaaff5504e2acd318354d63f4c643ce50db6f1387707233ea；210執行/28命令同5af2全部PASS，22PIDs退出/ownedDB空，CSSbyte等價及所有新圖比較收斂。已回寫T261 [X]，261/292；依持續實作授權接T262 green，未預勾。正常pressure1、heavy0、同一reviewer無新增代理。


## T262 /bdd green進行中：13/16 preliminary Chromium slices通過

T260/T261均正式完成，261/292；下一筆T262整檔新增旅行與選填縮圖16例×4=64最終scope未跑，T263未開始。先讀全部feature、適用DSL/contract/create UUID/state-first語意、C design-v7 U07/U08/S10/S05與D/M previews，維持16GiB/heavy1/worker1/原reviewer、warning2使用者例外。

真RED缺chooser→TripImagePicker選圖/URL清理及TripForm本地File，新增dialog適用showClose/description/class與create-trip.css。F052無圖原本PASS；F054取消/X/Escape、F055 preview無提交共5PASS。HEIC無alert→明示轉檔/移除、禁建立及submitguard；F057移除仍殘native input.files→精確清input.value；F056/057/105共3PASS。F053缺imagePOST→create完整JSON201後才發同ID thumbnail兩版本/newUUID，F053/058/059（建立失敗保File/同ID重試）共3PASS。F060無已建立結果→新增CreatedTripResult S10；TripForm捕獲明確image拒絕保存created/File，Trips隱藏原清單但不卸載flow，單trip重傳freshopid，F060/061共2PASS。13為focused slice執行數，不宣稱完整同版本scope或T262完成。

原RED/Green logs `t262-*.log`，目前剩F064圖片unknown、F106 create unknown state-first、F107權威確認後才續圖；唯一runner22871正跑F064真RED，其他測試已退出/最後audit9worker退出且ownedDB空。新的Picker/result/style檔保留未commit；目前20source preliminary manifestSHAe484c9bf0ab1e9dcbe6334ae660e3a7132da7112b0b731ac37f6809b1ef38433，後續實作仍會變，不作final批准版本。

後續需按failure完成unknown、補spinner-only/guard與適用回收、完整64四project、新U07/U08/S10/S05桌手機比對、受影響T260/管理/舊web+support回歸及獨立final；不得把partial相加成final、不改truth/DSL/上游畫面。沒有新commit/push/代理/永久skill修改。T262維持[ ]。


### T262 第一個完整Chromium scope Green，最終矩陣尚待

目前T001–T261 [X]；T262 [ ]。`t262-first-full-chromium.json/log`16/16 passed、0skip/flaky/unexpected，是第一project preliminary（之後expenseCount等小修仍須freeze全重跑）。剩餘slice真RED F064先受helper await response.finished遮蔽：ignored afterEach probe記真200提交/control done/native requestfailed CONTENT_LENGTH_MISMATCH但finished未resolve，故new-trip-flow helper改15s bounded等待真finished或同Request真requestfailed，保flow.errors/status/DB/請求順序；probe已re-bddgen移除。F107 route又直await已截斷201，Given已證nativefail真，改用同helper選真201完成或真GET lookup，不鬆creationAudit/fields/DB屏障。固定reviewer已核觀測修補合理，holder避免closure TS narrow。

產品：原PhotoAttempt(File/opid/兩version)保存、unknown=原receipt+state雙5s read/Again只GET、再讀目前Trip不回退cache；CreatedTripResult unknown中性占位，不能宣稱default/重建。create unknown先原state active，再GET原Trip exactid/name/date，初始兩版本0/0在createIntent保留，不把較新lookup版本拿來自動覆圖；15s create有界，5s查證有界。unknown鎖create/fieldset、保name/date/File，Again原UUID，不POST trips第二次。alive在await前後核對，newcreate finish只invalidate而不以舊saved/outcome寫Tripcache；ownerKey AppShell卸載隔離。spinner-only已加。F064及F106/107 Green。

definite image拒絕後另讀目前Trip5s再呈現；讀不到用『目前圖片暫不可讀』，已存在圖按真versionURL呈現，expenseCount用真投影，不能201舊default/0筆假蓋新圖/新帳務。S10明確失敗可同trip新opid重傳，unknown只查證。web typecheck65530 exit0（後有小修，final仍需重跑）。

當前唯一heavy60368跑新`t262-visual.config.ts` ChromeD（7state+keyboard）做第一輪U07/U08/S10/S05產品圖與focus RED，輸出t262-ui；需CSS/frame尺寸校準、cancel優先焦點及pending/verify畫面補證，再freeze完整64+適用T260/管理/舊web與support、獨立final。T263未開始；所有source與新Picker/Result/style/helper修改保留，無新commit/truth/.env/skill改動。最近pressure1/swap5751.50MiB，warning授權例外有效。原audit在active probe時曾報已知PID在跑，非leak；後各正常退出audit已重跑為空。


## T262 最終固定版本完整驗證進行中

第一個freeze7e748a…已有8quality/gen、64scope及69前縮圖scope執行通過，但獨立22圖審查指出R262-01：U08-D工具列應在右卻在左；M原左正確。只D `.create-image-tools.has-photo` justify-content flex-end、M覆flex-start，保48px操作區與長檔名獨立換行，D y比設計文字列低約24px作可用性適配，需在final逐項表明記，不能宣稱全exact。

原runner43456/OS19088精確SIGINT exit130，35登記worker確認退出；唯一殘DB ledger_test_22824_0確認worker退出後精確DROP，重audit owned0且ps無Playwright browser。前15完成命令與原7e source/raw/UI存`t262-final-attempt1`，不混計新版本。

最新22source manifest SHA `e17b64fc7cabd4a3fc1358da6adc0a12090c2436f2f72ac6f15127a139596cda`（base78c），t262-source-delta.json對T261僅8檔變/14exact。唯一runner31724從頭`t262-validate.py`，42命令／預期1112執行（64新scope+92前縮圖+30新UI/keyboard/date+22前縮圖UI+sheet2+管理94+oldweb258+websupport550），全部四project/兩browser序列worker1，逐命令hash/pressure/回收，raw與矩陣`t262-final-*`。API/support704剛由T260完整驗證且backend/source未改，本輪明確沿用而不加計執行數。

目前quality/gens均0、ChromeD/M各16PASS，WK續跑中。新UI22PNG/22metrics初跑30項全PASS，final會全部重拍；D650×770@(395,65)、CTA763/764.19，M358×780@(16,32)、CTA729；unknown D867.97/M812為額外狀態的有界增高/預覽縮小，title/CTA已由QA逐button驗在viewport。S10頁面D維持228baseline shell/x284寬1100，banner204.98/CTA253.48/card427.98×278；Mbanner177.56/CTA296.16/card427.16×239接近批准稿。只有新create DateField用可選中文placeholder（既有呼叫預設不變），M輸入16px避免zoom，保44px日曆入口且native calendar四端QA已PASS。

T262仍[ ]、261/292；待新同版本64/完整1112/逐圖比對與獨立final/回收再勾，T263未開始，無新commit/truth/skill修改。warning本session使用者例外持續，critical/OOM/無法回收才停。


## T262 既有焦點回歸與結果頁焦點收斂後重新固定來源

第二freeze e17 runner31724實際exit1：oldweb Chromium127PASS/2FAIL，原因初始焦點被新code移到Cancel。已讀truth `frontend/design-system/dsl.md:29` 明定旅行名稱獲焦，保其spec與原斷言；generic research『取消優先』不得蓋此specific truth。root與reviewer先前接受Cancel的解讀撤回。新create initialFocus恢復nameInput，dateEdit仍undefined，cache QA首驗Name（不再以自訂Cancel oracle為權威）。該e17仍partial，未跑oldWK/support不能沿用；歷史raw/UI/matrix存t262-final-attempt2。

R262-02實測 `t262-focus-red-*`：image-failure與image-unknown×4projects共8均真BODY/outside Result。最小Result useEffect[] mount focus h1 tabindex-1/preventScroll。green1再測：初始Result焦點全8已進H1；Chromium兩尺寸Again pending後失焦/2fail，WebKit4PASS；桌機明證BODY。只Result action改aria-disabled+busy guard及既有ref lock，保焦點不失仍禁觸發，CSS pending opacity沿既有0.6；不改全站Button或日期表單。green2四端各2全PASS（8），Again只GET/no mutation、後續不被mount-only effect搶焦點。觀察JSON/redraw全留cache，原8RED observations另存t262-focus-red-observations。

目前第三freeze22source SHA `5209c66a3d8ca60d9f631f4793f38f31f9e7787b4749190cc5cf5c682a0eed24`，base78c；source完整副本自動存`t262-source-snapshots/<manifestSHA>/`。唯一runner53727從頭46命令/預期1120（原1112矩陣+resultFocus2×4=8），仍完整oldweb258與support550，不沿用e17未完整舊回歸。品質/gens目前8均0，64scope先跑中；待新raw/UI/回收/獨立final方可勾T262，T263未開始，進度261/292。

最後pressure2warning/swap5431.50MiB；本輪使用者warning例外持續，單heavy/worker/固定reviewer，無新commit/truth/.env/永久skill更動。


### T262 design-v7逐畫面比對（5209固定來源，final新圖/矩陣待齊）

行為依truth整檔16例與既有design-system DSL Name焦點；呈現依pen SHA6c33bce25da872057d253a44bd0e59dec1f0e41f974873fb6db0dfe10b6c1abc/design-v7，U07-D Dsq2D/M kOFc3、U08-D GfuLl/M eSFbG、S10-D s825M/M F1Hwk及S05-D/M M6LRw/kMwFM。baseline8fc9f94之228px shell、既有DateField日曆入口與真005帳務保留；新頁不以示意背景取代實際資料。

| 畫面/狀態 | 核准預期 | 實際/差異與處理 |
| --- | --- | --- |
| U07 empty D/M | D650×770@(395,65)、M358×780@(16,32)；必填名稱/選填兩日期/選填圖、預設漸層、可無圖建立；CTA D763/M729 | 基準frame與CTA相符；D preview586×196、M318×160，垂直約1～2px文字行高差。名稱required+描述明示必填，保舊truth Name初焦（真焦點環是可用狀態，非錯誤/另改設計）。DateField保44px日曆操作，新增用中文placeholder避免截斷，M輸入16px而非稿較小字以避免手機focus zoom；既有呼叫預設不變。取消左/建立右相鄰，48px按鈕；M寬約153而稿150/151，差2～3px。 |
| U08 photo D/M | 保同frame；真本地圖片+未保存badge/檔名；14px primary重新選圖與中性移除相鄰；建立後才保存 | 真64×48合成PNG/神社檔名替代富士示意照片，仍保真File/hash與尚未保存；cover只顯示裁切不改原檔。R262-01已D右/M左。D為48px操作區與長檔名完整換行保獨立row，文字工具相較稿約下移24px（非全exact）；不採negative-margin與檔名互疊。CTA仍D763/764.19、M729。 |
| invalid HEIC D/M | 不當合法預覽，明示格式/轉檔/改選移除，阻止建立但保name/date | 真HEIC File留為錯誤草稿，不解碼假預覽；保存disabled及submitguard、原生input.files移除時清空。feedback frame至少770/780，適配預覽D176/M120留錯誤/操作空間；沒有提交請求。 |
| create-failure D/M | 已知未建立原因/重試，保姓名日期/File，不能誤示成功或改成圖片保存 | 真POST400拒絕、無trip/thumbnail，紅色alert與仍可使用的表單/照片/重新送出；同UUID修正新意圖成功。本地URL不因明確失敗被撤銷。 |
| U08 create-saving D/M | spinner-only、欄位及同intent鎖定、未確認建立前不送圖 | 真201 bytes由proxy暫留；原File仍預覽，aria正在建立旅行，POST trips1/thumbnail0。沒有以201headers假當已確認。 |
| U08 photo-saving D/M | 原trip建立確認後才圖、無重建、spinner-only保持CTA尺寸 | 真201完整JSON先確認，native WebP gate停住原圖上傳；aria正在保存旅行圖片，仍本機File預覽、禁重送，原trip ID/versions0/0。 |
| create-unknown與create-verifying D/M | state-first原UUID、exactTrip確認後才續圖；保表單/File、Again，未知不重建 | 新狀態D可增至867.97高、M812高，D176/M120預覽讓title/全部欄位/CTA保在viewport。Unknown/查證spinner只讀state再Trip，欄位disabled、建立disabled，停止忙碌後Again可用。S05為狀態語意板，未把三卡複製入表單。 |
| S10 image-failure D/M | 已建立旅行與圖片失敗分開，amber結果/同trip重新上傳、真已建立卡 | D main x284/width1100承接228baseline，與示意x299/1037差屬未改shell整合。D banner約204.98/145、retry253.48、card427.98/278；M banner177.56/185.59、retry296.16、card427.16/239對稿約177/186、296、427/240。加入實際API原因第二行，M精簡說明保持同資訊；圖與筆數取最新Trip，讀不到不造default或0筆。 |
| image-unknown與image-verifying D/M | 旅行已建立事實保留；圖片未知不稱失敗/default，不重建/重送，Again只查原收據/state | Result採中性圖片占位+unknown訊息、原PhotoAttempt保File/opid/versions；Again spinner-only/ARIA disabled與busy guard/ref lock保焦點並防重送。原結果與目前Trip分讀，更新時不用舊receipt填cache。 |

全22 PNG/22 metrics將由本freeze重拍輸出t262-ui；QA capture逐button驗bounds（不是只驗無水平overflow），日期ArrowDown/日曆Escape/兩欄填寫四project、Tab/ShiftTab各12/Escape回原入口均保留；R262-02另兩結果分支×四project實測。Generic Cancel初焦推論已撤銷，既有Name斷言保持；新結果opener移除後mount focus H1，Again後不重搶heading。Pending使用真server/response/GET屏障，無任意sleep/假進度。


### 5209 final新圖與既有畫面複核已收斂

新44檔（22PNG/22metrics）manifest SHA54680f690ea063f0f6bfc29a049a02faf2056d9116be9f1f81b0e7e9e7597ada，獨立reviewer逐22圖view並核每個hash/標題與visiblecontrols/viewport邊界。Name focus環符合既有specific truth；R262-01 D工具右/M左視覺CLOSED；R262-02 final四raw各2PASS，8actual觀察皆首次H1，4unknown Again後BUTTON/inside/命令不增，runtime CLOSED。以上只關閉source/UI findings，不提前final批准。

前縮圖UI36檔manifest SHA3ea942cd6ea08dcc7cd8ede8d6a22d3f6d60d6b8bc976f2db840c2d13a7532d7：對T26132byteexact，18metrics逐值exact；4PNG差異均root與reviewerview正常。量化failure-default-D16px/max2、failure-photo-M8px/max1、saving-D6257px/max2，unknown-photo-D8005px/max230在文字區；不把max230虛稱全max2，字句/換行/位置/unknown語意無變。

前管理UI34檔manifest SHA585abd373e43d2622f65447e72937d31aead2ef03406e555f563a237e75fd54d：33byteexact，15metrics逐值exact；唯一U01-D12px/max1細邊，已獨立view正常。U02日期表單無視覺/位置差異，DateField optional placeholder預設維持，現有日期/confirm/選單/導航呈現均沿v7先前批准並重新實證。所有當前PNG/JSON用5209來源重拍，未用舊圖代新版本。

oldweb Chromium兩個Name初焦回歸目前已實際PASS，整組與WK/support仍等46矩陣終點；T262維持[ ]，沒有把partial/舊source或視覺審查當全交付。


## 2026-11-17 T262完成，續跑T263

固定source a67337e2364d22611106a9664993335dd82e8d4daf171adfdc47af725c417ce7，獨立APPROVED/zeroopen，report SHA f17df3076aa5449668645f6e1c76709286f5d21503e7b67afddf3acfa6dedb34。完整必要1120個distinct案例均有有效證據：842沿用未受影響5209來源、278當前來源新PASS；不是同版本新跑1120。原Chrome320失敗已排除並由真實focused1PASS取代，新WebKit support275PASS及390雙engine各1PASS（取代舊slot不重複算）；scope64/248實際BDDsteps與全部規定瀏覽器/尺寸保留。詳ignored t262-final-coverage.json與raw。其餘21檔相同、JSbundle byteexact，compiledCSS忽略舊末尾單一LF後47297規則bytes前綴完全相同，唯一新增≤360media；既有390/1440畫面不受影響，design-v7比對與44/36/34張圖/metrics manifests可沿用。格式/build PASS；85worker退出、ownedDB[]、browser無。最近pressure1/swap5137MiB。

T262已[X]，262/292；T263開始前維持單task/heavy1/worker1/既有readonly reviewer。使用者明確允許warning2續跑，13GB非單獨停止條件；critical4/OOM/系統終止或無法回收才停。此次只放寬session執行，不改skills。沿用使用者精準回歸指示：T263只整理兩個圖片預覽消費者共用objectURL生命週期，完整本scope64＋受影響縮圖92與相應圖片預覽證據；未動的管理/舊web/support/API有效證據明記沿用，不因source hash重跑。未commit/push/truth/.env/skill變動。


## 2026-11-17 T263 /bdd refactor 驗證中

只將ThumbnailEditor原有usePreviewUrl函式body原樣抽到feature-local use-preview-url.ts，兩個原呼叫順序不變；TripImagePicker以usePreviewUrl(file,!invalid)替換同語意effect，File/invalid/移除/unmount仍各consumer管理並revoke capturedURL，沒有共享cache。其他20個既有source檔完全相同。固定23檔manifest 098d78d5d8fec7ed1858f287d08d454393b9792239de8d9c1ce8f76d527d1207；ignored t263-source/逐檔副本、t263-delta.json。

獨立靜態review零open，尚待runtime/UI/final，不預勾。format/lint/web typecheck/web production build與兩scope生成均PASS，compiledCSS與入口dist完全byte相同（t263-css-equivalence.json）。唯一heavy runner session61324，t263-validate.py順序完整本scope64、另一hookconsumer92與精確受影響新建8/縮圖12 UI；worker1，Chrome→WebKit，各scope四projects，不重全1120/後端。警告2續跑授權有效，當前swap5121MiB無增加；每個test命令後核退出/ownedDB。進度仍262/292，T263保持[ ]，T264未開始。


### T263 受影響驗證完成，待獨立final

同一098d78d5d8fec7ed1858f287d08d454393b9792239de8d9c1ce8f76d527d1207來源，18命令全部exit0；64新增旅行＋92縮圖編輯完整四projects，8建立預覽/鍵盤＋12縮圖預覽/鍵盤＝176新執行，無skip/flaky/error。raw與command帳在ignored t263-matrix.json、t263-runtime-summary.json。未重跑未受影響全1120/後端704，前證據明記來源沿用；完整plan交付回歸未取消。

C呈現沿用design-v7 U07/U08/S10/S05/U04及原固定baseline，無設計/業務/樣式變更，compiledCSS入口與重構後byte完全相同。新16PNG/16metrics在t263-ui與t263-thumbnail-ui：U08照片、S05無效/建立失敗、U04現圖/照片、S09預設、S03照片失敗、S05照片unknown D/M。各幀欄位位置/間距/按鈕/標題/可視範圍相同；14metrics原值全同，invalid D/M唯一差異是隱藏fileinput真隨機UUID檔名（原JSON保留）；16份geometry全同。10PNG byteexact；createfailureD25/M47像素最大2、failurephotoM8像素最大1屬邊緣；invalidD3188/M3005像素限定真隨機filename行；unknownphotoD8005像素為同文同位置繪製差異，非全圖max2。主代理已逐看六差異圖，無新增UI差異；繼承T262已批准的desktop工具列垂直適配/既有Name初焦、320單欄，無重批需求。像素/逐檔對照在t263-ui-comparison及兩pixel-diff.json，保留sha256。

runner61324已exit0，12登記worker均不存在、ownedDB[]、browser0，pressure1 normal/swap5121MiB；warning2期間照使用者例外繼續，沒有critical/OOM/系統kill。工具環境agent→PID映射未知，不宣稱工具記憶體全部釋放。固定reviewer核對runtime/圖/cleanup中，T263仍[ ]，264未開始。


T263已正式獨立APPROVED/zeroopen，reportSHA 4482c4c999da92de75cda266ee7ad31ecf6cb765ddf62ba5d6e7d45d2ac0e546；完整176PASS/18命令、23來源/32 UI entries/cleanup已核，回寫[X]，263/292。下一筆T264 green縮圖限制與選圖錯誤，維持同資源/精準回歸契約。


## 2026-11-17 T264 /bdd green slices進行中

只ThumbnailEditor相對T263改動，其他22source未動：F098真RED缺visible完整policy（2FAIL）→支援單張靜態JPG/.jpg/.jpeg/PNG/WebP及手機HEIC轉檔，2PASS；F099 HEIC本地應拒卻POST真RED→宣告unsupported MIME本地guard，1PASS。拒絕probe8PASS後APNG RED動畫原因不明→415文案列格式/動畫與轉檔改選，APNG/WebP2PASS；文字偽裝PNG RED422被誤分unknown→422確定拒絕＋INVALID_IMAGE損壞/尺寸/改選文案，4corrupt/zero例PASS。empty/size/count3真RED應local卻server→native FileList單張/非空/≤10MiB檢查，3PASS。前端不以MIME當真正內容驗證，合法宣告但壞內容仍由後端真解碼拒絕，helpers/contract/truth不改。

目前唯一heavy session8798檢驗3個像素/邊長拒絕文案；T264未完成、不可累加preliminary為完整GREEN。最終保持48×4=192executions（Given部分覆寫viewport，實際unique engine/案例/viewport 138組另核）與受影響Thumbnail92、D/M policy及錯誤預覽比對/獨立review；未改create/管理/oldweb/API依精準影響範圍沿用有效前證據。C依原design-v7 U04/U07/S03/原baseline，不加prototype。263/292，T264 [ ]，warning2本session可繼續、critical/OOM/不可回收停；單heavy/worker1/固定readonly reviewer。資源audit每命令後退出/DB[]。


### T264 固定來源全範圍驗證進行中

像素/寬/高3真RED證明泛稱超限不足→IMAGE_TOO_LARGE顯示10MiB、總像素2500萬、最長邊16384與縮小改選，3focusedPASS。固定23檔SHA fab7917c12923939aa9efeb3a1979ccaac78e3cfdb88d14303ab54551da998b3（t264-files.sha256/source/），相對T263只有ThumbnailEditor一檔/其餘22byteexact。獨立凍結靜態review零open，未final。品質format/lint/webTS/build/gen2已6命令全0，CSS入口實檔完全byteequal。唯一heavy21289正式16cmd/192scope+92thumbnail+20精確policy/preview/rejection/keyboard UI＝304executions；目前ChromeD48全PASS、ChromeM續跑。新UI將36PNG/metrics在t264-ui，不覆寫前證據。raw報告可讀執行Given device/設定viewport對照，會另產實際組合帳，192不是192不同尺寸行為；同tag重覆project不混稱額外覆蓋。

尚待3scopeprojects、thumbnail4projects、UI D/M、逐圖/資源回收/獨立final。263/292，T264仍[ ]，T265未開始；不因精準縮減取消完整TestScope/原交付完整回歸。


### T264 原完整304通過，R264-01本地破圖補修中

原fab7同版本16命令全0/304PASS，full192/660BDDsteps、Thumbnail92、UI20與36entries俱齊，viewport ledger由raw executedGiven/設定推導138有效組合，非獨立runtime telemetry。原UImanifest bf500cd243e03f8afff458e417846d478495ca57d15a24527a30d03f4591c7f0保留，原t264-ui/raw/source不覆寫。

root與reviewer逐看真圖確認R264-01：損壞本地File露broken icon+alt。新增真QA RED1（placeholder不存在）後修為URL-keyed本地預覽占位：failedPreviewUrl各instance，需非空source/File/非busyunknown且source===preview===failedURL；img key=source防舊error污染改選。只本地草稿有onError，confirmed/current私有圖片無handler（不偷做266）；保File/原operation與真POST/422/receipt/DB，placeholder中性不偽稱後端結果。第一focused1PASS後補嚴格非null guard，再固定cb0fca6de02f8ae377aa55e397b91e18e3ecf1574a6240ebc4c5fae7177fcad7。

獨立static新guard/key零open，唯一heavy5073 t264-preview-validate.py：品質4＋56影響BDD（5壞內容F099/F100各四projects40＋合法格式F10116）＋4新UI（壞PNG/合法photo D/M）；snapshot/manifest/raw/newt264-preview-ui分開。原有效244slots將依影響保留、60新結果取代，不重全304、不宣稱不同版單版全跑。新畫面與回收/final尚待，T264仍[ ]，263/292。記憶體正常/warning依授權繼續，swap5113MiB穩定。


### T264 R264-01補驗完成，待獨立final

cb0f固定來源10新命令全部exit0，56影響BDD（40壞輸入拒絕/改選+16合法格式）及4新UI全部PASS。t264-final-coverage.json逐raw單次PASS對照304必要slots完整＝244未受影響fab7＋60本次cb0f（wholefeature192=136+56、前Thumbnail92沿用、UI20=16+4）；非單版新跑304。原完整304與後60執行分開，preliminary/中途改動結果不混成final。新UI raw實際key保留並明列coverageSlotKey替代baseline等價流程+更強占位斷言，沒有冒稱同一檔案。

原UI36manifest保留不動；新preview-ui8entries SHA13dca89e67cd31d6a3ba453af1d6e5705747c1f792bd7212fd8baf8e512ed26c，effective t264-final-ui.json36entries/18PNG逐列來源與hash：baseline破圖/photo四幀排除，改新四幀。新CSS入口與fab7 byteequal。root逐看新四圖及原六類代表，broken icon已由中性占位取代，原File/尚未保存badge/錯誤/真422仍保留；合法照片正常。

| 畫面/設計預期 | 實際呈現 | 差異/影響與處理 |
| --- | --- | --- |
| U04-D/M 固定預覽、選圖工具、限制區與48px CTA | D dialog668×715@(386,92.5)，M358×720@(16,62)，current/photo幀與T263 frame/CTA座標完全同 | policy補.jpg/.jpeg與HEIC轉檔不改資訊位置；無幾何變化 |
| S03-D/M 本地格式、空檔、容量、多檔拒絕 | 畫面維持已保存圖、明確原因/下一步、保存disabled、可改選 | 不建立invalid草稿，不發POST；長原因自然換行 |
| S03-D/M 動畫、損壞、解碼尺寸超限 | 真後端拒絕後錯誤與尚未保存File/版本保持；無busy或成功誤示 | 保後端權威；損壞local preview中性占位不代替判斷，R264-01修正 |
| S03長錯誤與真UUID長檔名 D/M | D CTA y711.03125高48、M y706.875高48，均完整在frame底807.5/782內，scrollTop0/無橫溢出 | 長檔名兩行及原因自然換行，未推掉footer/主要操作，原字型/色彩/佈局保持 |
| U07與未變管理/帳務/導覽 | 22其餘source檔完全不變，沿用T262/T263已批准證據 | 不因本地預覽改動重跑未受影響create64/oldweb/support/API；最終plan完整交付回歸仍保留 |

設計仍design-v7原批准6c33…abc與固定baseline8fc9…，不製prototype；資料真fixture、預覽彩色矩形是真bytes非設計富士山插畫。35登記worker皆退出、ownedDB[]、browser0，5073exit0，pressure1正常/swap5081MiB；工具agent→PID回收未知維持註記。固定reviewer正在核最終case/圖/回收，T264仍[ ]，263/292、T265未開始。


T264正式獨立APPROVED/zeroopen，reportSHA a0493c783a83328de52903fd25a7d79ba89940e2bb9e35a79b6361d178172601；304有效slots來源/18有效PNG/36entries/35worker回收均核，R264-01 CLOSED。已回寫[X]，264/292；續T265 refactor，只整理已綠選圖與錯誤映射私有邊界，後續未開始。


## 2026-11-17 T265 /bdd refactor固定來源驗證中

只ThumbnailEditor抽兩個private純函式selectionError(FileList)與rejectionMessage(ApiError)，消除元件內巢狀ternary；count→空檔→大小→宣告MIME優先序、字串、fallback message、外層selected/busy/attempt/取消guard完全不變。未改任何State/previewkey/本地onError/UUID/backend/DSL/設計。獨立靜態零open。23source manifest03eaa3d092f2248fe904425106db50a66cbcaff779d5cbde69e94d21e7aba7bf，副本t265-source/；其他22檔與cb0f完全同。

format/lint/webTS/build/gen2已6cmd全0，入口CSS byteequal。唯一heavy77101，t265-validate.py正式16命令/預期192當前整檔＋92既有Thumbnail＋8代表policy/photo/損壞占位/像素錯誤UI D/M＝292新執行，worker1順序跑。此重構實際經所有選圖/拒絕，故完整本scope必要；未動create/管理/oldweb/support/API仍按影響保留，不因hash加跑。尚待完整scope/UI16entries、回收/獨立final，T265保持[ ]、264/292，T266未開始。pressure1入口/swap5081MiB，warning2例外續跑、critical/OOM/無法回收停。
