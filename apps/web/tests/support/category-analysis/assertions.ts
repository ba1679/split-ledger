import { expect, type Page } from '@playwright/test';
import type { ExactAmount } from '@split-ledger/shared';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { analysisSnapshot } from '../../../../api/tests/support/category-analysis/fixture.js';
import { analysisCard, checkBrowserAnalysisSource, type BrowserAnalysisReply } from './page.js';

export function displayOracle(amount: ExactAmount) {
  const n = BigInt(amount.numerator),
    d = BigInt(amount.denominator) * 10n ** BigInt(amount.minorUnit),
    rounded = (n * 200n + d) / (d * 2n);
  const decimals = String(rounded % 100n)
    .padStart(2, '0')
    .replace(/0+$/, '');

  return `${rounded / 100n}${decimals ? '.' + decimals : ''}`;
}

export function groupedDisplay(text: string) {
  const [whole = '', fraction] = text.split('.');

  return (
    whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (fraction === undefined ? '' : '.' + fraction)
  );
}

export function percentOracle(amount: ExactAmount, total: ExactAmount) {
  const n = BigInt(amount.numerator) * BigInt(total.denominator),
    d = BigInt(amount.denominator) * BigInt(total.numerator);
  if (d === 0n) return '';
  if (n > 0n && n * 10000n < d) return '小於0.01%';
  const value = (n * 20000n + d) / (2n * d),
    decimals = String(value % 100n)
      .padStart(2, '0')
      .replace(/0+$/, '');

  return `${value / 100n}${decimals ? '.' + decimals : ''}%`;
}

export async function checkedBrowserReply(world: LedgerWorld) {
  const body = world.get<BrowserAnalysisReply>('analysis:uiReply'),
    source = await analysisSnapshot(world);
  checkBrowserAnalysisSource(world, body, source);
  if (world.state.has('analysis:actBefore'))
    expect(source).toEqual(world.get('analysis:actBefore'));

  return body;
}

export async function assertBrowserTotal(
  page: Page,
  world: LedgerWorld,
  kind: string,
  currency: string,
  total: string,
) {
  const b = await checkedBrowserReply(world),
    row = b.currencies.find((c) => c.currencyCode === currency)!;
  expect(row).toBeTruthy();
  const chart = row[kind === '個人' ? 'personal' : 'group'];
  expect(displayOracle(chart.total)).toBe(total);
  const card = analysisCard(page, kind);
  await expect(card.getByLabel(`${kind}總額`, { exact: true })).toHaveText(groupedDisplay(total));
  await expect(card.locator('.analysis-total-currency')).toHaveText(currency);
}

export async function assertAnalysisRoute(page: Page, world: LedgerWorld) {
  const { analysisContext } =
    await import('../../../../api/tests/support/category-analysis/fixture.js');
  const b = await checkedBrowserReply(world),
    c = analysisContext(world);
  await expect(page).toHaveURL(new RegExp(`/trips/${c.tripId}/analysis$`));
  await expect(page.getByRole('heading', { name: '花費分析', exact: true })).toBeVisible();
  const trip = (await world.db.query('SELECT name,owner_id FROM trips WHERE id=$1', [c.tripId]))
    .rows[0];
  expect(trip.owner_id).toBe(world.users.get('Alice')!.id);
  await expect(page.getByRole('link', { name: /返回.*帳本|旅行帳本/ })).toContainText(trip.name);
  await expect(page.getByRole('link', { name: /返回.*帳本|旅行帳本/ })).toHaveAttribute(
    'href',
    `/trips/${b.tripId}`,
  );
}

export async function assertMobileAnalysisEntry(page: Page, world: LedgerWorld) {
  await assertAnalysisRoute(page, world);
  const g = world.get<{
    entry: { x: number; y: number; width: number; height: number };
    navigation: { x: number; y: number; width: number; height: number };
    bottomCount: number;
  }>('analysis:ledgerGeometry');
  expect(g.entry.y).toBeGreaterThanOrEqual(g.navigation.y + g.navigation.height - 1);
  expect(Math.abs(g.entry.x - g.navigation.x)).toBeLessThanOrEqual(2);
  expect(g.entry.width).toBeGreaterThanOrEqual(g.navigation.width - 2);
  expect(g.bottomCount).toBe(5);
  expect(world.state.has('analysis:ledgerScreenshot')).toBe(true);
}

export async function assertAnalysisLayout(page: Page, world: LedgerWorld) {
  await checkedBrowserReply(world);
  const p = analysisCard(page, '個人'),
    g = analysisCard(page, '團體');
  await expect(p).toBeVisible();
  await expect(g).toBeAttached();
  const a = await p.boundingBox(),
    b = await g.boundingBox();
  expect(a).not.toBeNull();
  expect(b).not.toBeNull();
  if (page.viewportSize()!.width > 700) {
    expect(Math.abs(a!.y - b!.y)).toBeLessThanOrEqual(3);
    expect(b!.x).toBeGreaterThanOrEqual(a!.x + a!.width);
  } else {
    expect(b!.y).toBeGreaterThanOrEqual(a!.y + a!.height);
    expect(Math.abs(a!.x - b!.x)).toBeLessThanOrEqual(2);
    await g.scrollIntoViewIfNeeded();
    await expect(g).toBeVisible();
  }
  for (const card of [p, g]) await expect(card.locator('.analysis-details')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

export async function assertAnalysisDetails(
  page: Page,
  world: LedgerWorld,
  kind: string,
  currency: string,
  rows: Record<string, string>[],
) {
  const body = await checkedBrowserReply(world),
    c = body.currencies.find((c) => c.currencyCode === currency)!;
  expect(c).toBeTruthy();
  const chart = c[kind === '個人' ? 'personal' : 'group'],
    card = analysisCard(page, kind),
    list = card.locator('.analysis-details');
  await expect(list.locator('.analysis-category-name')).toHaveCount(rows.length);
  const names = await list.locator('.analysis-category-name').allTextContents();
  expect(names.sort()).toEqual(rows.map((r) => r.分類!).sort());
  expect(names.sort()).toEqual(chart.categories.map((c) => c.category?.name ?? '未分類').sort());
  for (const expected of chart.categories) {
    const name = expected.category?.name ?? '未分類',
      row = rows.find((r) => r.分類 === name)!;
    expect(row).toBeTruthy();
    expect(row.金額).toBe(displayOracle(expected.amount));
    expect(row.占比).toBe(percentOracle(expected.amount, chart.total));
    const control = list.locator(`[data-category-id="${expected.category?.id ?? 'unclassified'}"]`);
    await expect(control).toBeVisible();
    await expect(control.locator('.analysis-category-name')).toHaveText(name);
    await expect(control.locator('.analysis-category-amount')).toHaveText(
      groupedDisplay(row.金額!),
    );
    await expect(control.locator('.analysis-category-percent')).toHaveText(row.占比!);
    expect((await control.ariaSnapshot()).replaceAll(',', '')).toContain(`${currency} ${row.金額}`);
  }
}

export async function assertAnalysisGeometry(page: Page, world: LedgerWorld) {
  const { analysisCurrency } = await import('./page.js');
  const { assertSectorAngle } = await import('./geometry.js');
  const body = await checkedBrowserReply(world),
    currency = await analysisCurrency(page).inputValue(),
    row = body.currencies.find((c) => c.currencyCode === currency)!;
  for (const [kind, key] of [
    ['個人', 'personal'],
    ['團體', 'group'],
  ] as const) {
    if (kind === '團體' && !body.hasSharedExpenses) continue;
    const chart = row[key];
    for (const c of chart.categories) {
      const sector = analysisCard(page, kind).locator(
        `.recharts-sector[data-category-id="${c.category?.id ?? 'unclassified'}"]`,
      );
      await assertSectorAngle(
        sector,
        BigInt(c.amount.numerator) * BigInt(chart.total.denominator),
        BigInt(c.amount.denominator) * BigInt(chart.total.numerator),
      );
    }
  }
}

export async function assertSharedAnalysisExplanation(page: Page, world: LedgerWorld) {
  const body = await checkedBrowserReply(world);
  expect(body.hasSharedExpenses).toBe(true);
  await expect(analysisCard(page, '團體')).toContainText(/至少.*[兩2].*人|[兩2].*人以上/);
  const s = await analysisSnapshot(world);
  expect(
    s.expenses!.some(
      (e) =>
        new Set(s.shares!.filter((sh) => sh.expense_id === e.id).map((sh) => sh.member_id)).size >=
        2,
    ),
  ).toBe(true);
}

export async function assertSelectedAnalysisCurrency(
  page: Page,
  world: LedgerWorld,
  currency: string,
  list: string,
) {
  const { analysisCurrency } = await import('./page.js');
  const body = await checkedBrowserReply(world),
    selector = analysisCurrency(page);
  await expect(selector).toHaveValue(currency);
  expect(
    await selector
      .locator('option')
      .evaluateAll((options) => options.map((o) => (o as HTMLOptionElement).value)),
  ).toEqual(list.split('、'));
  expect(body.currencies.map((c) => c.currencyCode)).toEqual(list.split('、'));
  const row = body.currencies.find((c) => c.currencyCode === currency)!;
  await assertBrowserTotal(page, world, '個人', currency, displayOracle(row.personal.total));
  if (body.hasSharedExpenses)
    await assertBrowserTotal(page, world, '團體', currency, displayOracle(row.group.total));
}

export async function assertZeroAnalysisChart(
  page: Page,
  world: LedgerWorld,
  kind: string,
  currency: string,
) {
  const body = await checkedBrowserReply(world),
    row = body.currencies.find((c) => c.currencyCode === currency)!,
    chart = row[kind === '個人' ? 'personal' : 'group'];
  expect(chart.categories).toEqual([]);
  expect(chart.total).toEqual({ numerator: '0', denominator: '1', minorUnit: row.minorUnit });
  await assertBrowserTotal(page, world, kind, currency, '0');
  const card = analysisCard(page, kind);
  await expect(card).toContainText(/這個幣別.*沒有.*支出|這個幣別.*沒有.*共同消費/);
  await expect(card.locator('.recharts-sector')).toHaveCount(0);
  await expect(card.locator('.analysis-category-percent')).toHaveCount(0);
}

export async function assertNoSharedAnalysis(page: Page, world: LedgerWorld) {
  const body = await checkedBrowserReply(world);
  expect(body.hasSharedExpenses).toBe(false);
  await expect(page.getByText('這趟旅行目前沒有共同消費。', { exact: true })).toBeVisible();
  await expect(analysisCard(page, '團體')).toHaveCount(0);
  await expect(analysisCard(page, '個人')).toBeVisible();
}

export async function assertAnalysisInfo(
  page: Page,
  world: LedgerWorld,
  category: string,
  currency: string,
  amount: string,
  percent: string,
) {
  const body = await checkedBrowserReply(world),
    kind = world.get<string>('analysis:triggerKind'),
    row = body.currencies.find((c) => c.currencyCode === currency)![
      kind === '個人' ? 'personal' : 'group'
    ],
    c = row.categories.find((c) => (c.category?.name ?? '未分類') === category)!;
  expect(c).toBeTruthy();
  expect(world.get('analysis:triggerCategory')).toBe(category);
  expect(displayOracle(c.amount)).toBe(amount);
  expect(percentOracle(c.amount, row.total)).toBe(percent);
  const hover =
    world.state.has('analysis:interaction') && world.get('analysis:interaction') === '滑鼠移入';
  const info = page.getByRole(hover ? 'tooltip' : 'dialog', { name: '分類資訊', exact: true });
  await expect(info).toBeVisible();
  await expect(info.getByText(category, { exact: true })).toBeVisible();
  await expect(info.getByText(`${currency} ${amount}`, { exact: true })).toBeVisible();
  await expect(
    info.getByText(new RegExp('(?:^|花費 *)' + percent.replaceAll('.', '[.]') + '$')),
  ).toBeVisible();
  const box = await info.boundingBox(),
    viewport = page.viewportSize()!;
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
  const nav = page.getByRole('navigation', { name: '行動導覽', exact: true });
  if (await nav.isVisible()) {
    const bottom = await nav.boundingBox();
    expect(box!.y + box!.height).toBeLessThanOrEqual(bottom!.y + 1);
    if (!hover) {
      const close = await info
        .getByRole('button', { name: '關閉分類資訊', exact: true })
        .boundingBox();
      expect(close!.width).toBeGreaterThanOrEqual(44);
      expect(close!.height).toBeGreaterThanOrEqual(44);
    }
  }
}

export async function assertPersistentAnalysisDetails(page: Page, world: LedgerWorld) {
  const { analysisCurrency, analysisUISnapshot } = await import('./page.js');
  const body = await checkedBrowserReply(world),
    currency = await analysisCurrency(page).inputValue(),
    row = body.currencies.find((c) => c.currencyCode === currency)!;
  for (const [kind, key] of [
    ['個人', 'personal'],
    ['團體', 'group'],
  ] as const) {
    if (kind === '團體' && !body.hasSharedExpenses) continue;
    const chart = row[key],
      rows = chart.categories.map((c) => ({
        分類: c.category?.name ?? '未分類',
        金額: displayOracle(c.amount),
        占比: percentOracle(c.amount, chart.total),
      }));
    await assertAnalysisDetails(page, world, kind, currency, rows);
    const tree = await analysisCard(page, kind).ariaSnapshot();
    for (const r of rows) {
      expect(tree).toContain(r.分類);
      expect(tree.replaceAll(',', '')).toContain(`${currency} ${r.金額}`);
      expect(tree).toContain(r.占比);
    }
  }
  if (await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    const before = await analysisUISnapshot(page);
    await page.evaluate(
      () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
    );
    expect(await analysisUISnapshot(page)).toEqual(before);
  }
}

export async function assertAnalysisSameColor(page: Page, world: LedgerWorld, category: string) {
  const { analysisCurrency } = await import('./page.js');
  const body = await checkedBrowserReply(world),
    currency = await analysisCurrency(page).inputValue(),
    row = body.currencies.find((c) => c.currencyCode === currency)!;
  const a = row.personal.categories.find((c) => c.category?.name === category)!,
    b = row.group.categories.find((c) => c.category?.name === category)!;
  expect(a.category!.id).toBe(b.category!.id);
  const colors = [];
  for (const kind of ['個人', '團體']) {
    const card = analysisCard(page, kind),
      selector = `[data-category-id="${a.category!.id}"]`;
    const path = card.locator(`.recharts-sector${selector}`);
    const fill = await path.evaluate((el) => getComputedStyle(el).fill);
    const indicator = await card
      .locator(`.analysis-details ${selector} .analysis-category-indicator`)
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(indicator).toBe(fill);
    colors.push(fill);
  }
  expect(colors[0]).toBe(colors[1]);
  expect(colors[0]).not.toBe('none');
}

export async function assertAnalysisInfoClosed(page: Page, world: LedgerWorld) {
  await checkedBrowserReply(world);
  await expect(page.getByRole('dialog', { name: '分類資訊', exact: true })).toBeHidden();
  const trigger = world.get<import('@playwright/test').Locator>('analysis:trigger');
  await expect(trigger).toBeFocused();
  expect(
    await trigger.evaluate((el) => {
      const s = getComputedStyle(el);

      return (
        s.outlineStyle !== 'none' &&
        parseFloat(s.outlineWidth) > 0 &&
        s.outlineColor !== 'transparent' &&
        s.outlineColor !== 'rgba(0, 0, 0, 0)'
      );
    }),
  ).toBe(true);
}

export async function assertFullAnalysisRing(page: Page, world: LedgerWorld, kind: string) {
  const { analysisCurrency } = await import('./page.js');
  const { renderedSectorDegrees } = await import('./geometry.js');
  const body = await checkedBrowserReply(world),
    currency = await analysisCurrency(page).inputValue(),
    chart = body.currencies.find((c) => c.currencyCode === currency)![
      kind === '個人' ? 'personal' : 'group'
    ];
  expect(chart.categories).toHaveLength(1);
  expect(BigInt(chart.total.numerator) > 0n).toBe(true);
  const card = analysisCard(page, kind),
    sector = card.locator('.recharts-sector');
  await expect(sector).toHaveCount(1);
  expect(Math.abs((await renderedSectorDegrees(sector)) - 360)).toBeLessThanOrEqual(0.1);
  expect(
    await sector.evaluate(
      (el) =>
        !(el as SVGGeometryElement).isPointInFill(
          new DOMPoint(Number(el.getAttribute('cx')), Number(el.getAttribute('cy'))),
        ),
    ),
  ).toBe(true);
  await expect(card.locator('.analysis-category-percent')).toHaveText('100%');
  await assertBrowserTotal(page, world, kind, currency, displayOracle(chart.total));
}

export async function assertSmallAnalysisCategory(
  page: Page,
  world: LedgerWorld,
  kind: string,
  category: string,
  amount: string,
  percent: string,
) {
  const { analysisCurrency } = await import('./page.js');
  const { assertSectorAngle } = await import('./geometry.js');
  const body = await checkedBrowserReply(world),
    currency = await analysisCurrency(page).inputValue(),
    chart = body.currencies.find((c) => c.currencyCode === currency)![
      kind === '個人' ? 'personal' : 'group'
    ],
    c = chart.categories.find((c) => (c.category?.name ?? '未分類') === category)!;
  expect(c).toBeTruthy();
  expect(BigInt(c.amount.numerator) > 0n).toBe(true);
  expect(displayOracle(c.amount)).toBe(amount);
  expect(percentOracle(c.amount, chart.total)).toBe(percent);
  const control = analysisCard(page, kind).locator(
    `.analysis-details [data-category-id="${c.category?.id ?? 'unclassified'}"]`,
  );
  await expect(control).toBeVisible();
  await expect(control.locator('.analysis-category-amount')).toHaveText(groupedDisplay(amount));
  await expect(control.locator('.analysis-category-percent')).toHaveText(percent);
  const sector = analysisCard(page, kind).locator(
      `.recharts-sector[data-category-id="${c.category?.id ?? 'unclassified'}"]`,
    ),
    n = BigInt(c.amount.numerator) * BigInt(chart.total.denominator),
    d = BigInt(c.amount.denominator) * BigInt(chart.total.numerator);
  if (await sector.count()) await assertSectorAngle(sector, n, d);
  else expect(n * 1_000_000_000_000n < d).toBe(true);
}

export async function assertLongAnalysisContent(page: Page, world: LedgerWorld) {
  const { analysisCurrency } = await import('./page.js');
  const body = await checkedBrowserReply(world),
    currency = await analysisCurrency(page).inputValue(),
    chart = body.currencies.find((c) => c.currencyCode === currency)!.personal;
  await assertAnalysisDetails(
    page,
    world,
    '個人',
    currency,
    chart.categories.map((c) => ({
      分類: c.category?.name ?? '未分類',
      金額: displayOracle(c.amount),
      占比: percentOracle(c.amount, chart.total),
    })),
  );
  const card = analysisCard(page, '個人');
  await expect(card.locator('.analysis-category-name').filter({ hasText: '其他' })).toHaveCount(0);
  const texts = card.locator('.analysis-category-name,.analysis-category-amount');
  for (const text of await texts.all()) {
    await text.scrollIntoViewIfNeeded();
    await expect(text).toBeVisible();
    expect(
      await text.evaluate((el) => {
        const boundary = el.closest('.analysis-card')!.getBoundingClientRect(),
          range = document.createRange();
        range.selectNodeContents(el);
        const style = getComputedStyle(el);

        return (
          style.textOverflow !== 'ellipsis' &&
          Array.from(range.getClientRects()).every(
            (r) => r.left >= boundary.left - 1 && r.right <= boundary.right + 1,
          ) &&
          el.scrollHeight <= el.clientHeight + 1
        );
      }),
    ).toBe(true);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

export async function assertReturnedAnalysisLedger(page: Page, world: LedgerWorld) {
  const { analysisContext } =
    await import('../../../../api/tests/support/category-analysis/fixture.js');
  const { expectedChart, largeAmount, exactEqual } =
    await import('../../../../api/tests/support/category-analysis/oracle.js');
  const { independentSplittingOracle } =
    await import('../../../../api/tests/support/splitting/expense-fixture.js');
  const c = analysisContext(world),
    source = await analysisSnapshot(world),
    headers = { Cookie: world.users.get('Alice')!.cookie };
  await expect(page).toHaveURL(new RegExp(`/trips/${c.tripId}$`));
  expect(source).toEqual(world.get('analysis:actBefore'));
  const totals = page.getByRole('region', { name: '分幣別總額', exact: true }),
    balances = page.getByRole('region', { name: '成員淨額', exact: true }),
    expenses = page.getByRole('region', { name: '支出清單', exact: true });
  await expect(totals).toBeVisible();
  await expect(balances).toBeAttached();
  await expect(expenses).toBeAttached();
  const a = await totals.boundingBox(),
    b = await balances.boundingBox(),
    d = await expenses.boundingBox();
  expect(a!.y + a!.height).toBeLessThanOrEqual(b!.y + 1);
  expect(b!.y + b!.height).toBeLessThanOrEqual(d!.y + 1);
  const response = await world.api.get(`/api/trips/${c.tripId}/totals?scope=personal`, { headers });
  expect(response.status()).toBe(200);
  const body = await response.json();
  for (const row of body.totals) {
    const expected = expectedChart(source, c.ownerMemberId!, row.currencyCode, 'personal').total;
    expect(exactEqual(row.amount, expected)).toBe(true);
    const text = (await totals
      .getByRole('group', { name: row.currencyCode, exact: true })
      .locator('.total-value')
      .textContent())!.replaceAll(',', '');
    expect(exactEqual(largeAmount(text), largeAmount(displayOracle(expected)))).toBe(true);
  }
  const settlement = await world.api.get(`/api/trips/${c.tripId}/settlement`, { headers });
  expect(settlement.status()).toBe(200);
  const view = await settlement.json();
  for (const row of view.balances) {
    const expected = independentSplittingOracle.balance(
      source as unknown as import('../../../../api/tests/support/splitting/types.js').SourceSnapshot,
      row.memberId,
      row.currencyCode,
    );
    expect(exactEqual(row.netAmount, expected)).toBe(true);
    const member = source.members!.find((m) => m.id === row.memberId)!;
    const absolute = displayOracle({
      ...expected,
      numerator: String(
        BigInt(expected.numerator) < 0n ? -BigInt(expected.numerator) : BigInt(expected.numerator),
      ),
    });
    const text = BigInt(expected.numerator) < 0n && absolute !== '0' ? '-' + absolute : absolute;
    await expect(
      balances
        .getByRole('group', { name: `${member.name} ${row.currencyCode}`, exact: true })
        .locator('strong'),
    ).toHaveText(`${row.currencyCode} ${text}`);
  }
  await expect(page.locator('.analysis-card,.analysis-details')).toHaveCount(0);
  expect(await analysisSnapshot(world)).toEqual(source);
}

export async function assertAnalysisExactShares(page: Page, world: LedgerWorld) {
  const body = await checkedBrowserReply(world),
    jpy = body.currencies.find((c) => c.currencyCode === 'JPY')!;
  expect(jpy.personal.total).toEqual({ numerator: '100', denominator: '3', minorUnit: 0 });
  const source = await analysisSnapshot(world);
  expect(source.expenses).toHaveLength(1);
  expect(source.expenses![0]).toMatchObject({
    amount_minor: '100',
    minor_unit: 0,
    currency_code: 'JPY',
  });
  expect(new Set(source.shares!.map((s) => s.member_id)).size).toBe(3);
  await assertBrowserTotal(page, world, '個人', 'JPY', '33.33');
}
