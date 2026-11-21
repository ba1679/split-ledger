import { expect, type Locator } from '@playwright/test';

/** Measure outer arcs of the actual rendered SVG, independently of chart payload fields. */
export async function renderedSectorDegrees(sector: Locator): Promise<number> {
  return sector.evaluate((el) => {
    const cx = Number(el.getAttribute('cx')),
      cy = Number(el.getAttribute('cy')),
      d = el.getAttribute('d') ?? '';
    let current = [0, 0];
    const arcs: { radius: number; angle: number }[] = [];
    for (const match of d.matchAll(/([MLAZ])([^MLAZ]*)/gi)) {
      const cmd = match[1]!.toUpperCase(),
        values = (match[2]!.match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number);
      if (cmd === 'M' || cmd === 'L') current = [values[0]!, values[1]!];
      if (cmd === 'A') {
        const end = [values[5]!, values[6]!],
          a = Math.atan2(current[1]! - cy, current[0]! - cx),
          b = Math.atan2(end[1]! - cy, end[0]! - cx);
        let angle = Math.abs(((b - a) * 180) / Math.PI) % 360;
        if (angle > 180) angle = 360 - angle;
        if (values[3] === 1) angle = 360 - angle;
        arcs.push({ radius: values[0]!, angle });
        current = end;
      }
    }
    const outer = Math.max(...arcs.map((a) => a.radius));

    return arcs
      .filter((a) => Math.abs(a.radius - outer) < 0.0001)
      .reduce((sum, a) => sum + a.angle, 0);
  });
}

export async function assertSectorAngle(sector: Locator, numerator: bigint, denominator: bigint) {
  await expect(sector).toBeVisible();
  const angle = await renderedSectorDegrees(sector);
  expect(Number.isFinite(angle)).toBe(true);
  const expected = (Number((numerator * 1_000_000_000n) / denominator) / 1_000_000_000) * 360;
  expect(Math.abs(angle - expected)).toBeLessThanOrEqual(0.1);
}
