import { expect } from '@playwright/test';
import type { InitialRead } from './initial-read.js';

export interface SkeletonShape {
  x: number;
  y: number;
  width: number;
  height: number;
}
const overlaps = (a: SkeletonShape, b: SkeletonShape) =>
  Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 8;

/** Broad visual structure, independent of product classes, exact spacing or card columns. */
export function assertSkeletonLayout(layout: InitialRead['layout'], input: SkeletonShape[]): void {
  const shapes = [
    ...new Map(
      input.map((shape) => [
        [shape.x, shape.y, shape.width, shape.height].map(Math.round).join(':'),
        shape,
      ]),
    ).values(),
  ];
  const bars = shapes.filter((shape) => shape.height <= 24 && shape.width >= 24);
  if (layout === 'cards') {
    const images = shapes.filter((shape) => shape.width >= 96 && shape.height >= 64);
    expect(
      images.some((image) =>
        bars.some((bar) => overlaps(image, bar) && bar.y >= image.y + image.height - 1),
      ),
      'Card skeleton contains an image block followed by text',
    ).toBe(true);
  } else if (layout === 'list') {
    const rows = new Set<number>();
    for (const bar of bars)
      if (
        bars.some(
          (other) =>
            other !== bar &&
            ((Math.abs(other.y - bar.y) <= 4 && Math.abs(other.x - bar.x) >= 24) ||
              (other.y > bar.y && other.y - bar.y <= 24 && overlaps(bar, other))),
        )
      )
        rows.add(Math.round(bar.y / 32));
    expect(
      bars.length,
      'List skeleton contains several row details, rather than two generic bars',
    ).toBeGreaterThanOrEqual(4);
    expect(rows.size, 'List skeleton has repeated structured rows').toBeGreaterThanOrEqual(2);
  } else if (layout === 'form') {
    const inputs = shapes.filter(
      (shape) => shape.width >= 100 && shape.height >= 28 && shape.height <= 64,
    );
    const fields = inputs.filter((input) =>
      bars.some(
        (label) =>
          label.y + label.height <= input.y + 1 &&
          input.y - (label.y + label.height) <= 40 &&
          overlaps(input, label),
      ),
    );
    expect(
      new Set(fields.map((field) => Math.round(field.y))).size,
      'Form skeleton has at least two labelled field-sized blocks',
    ).toBeGreaterThanOrEqual(2);
  } else {
    expect(layout).toBe('summary');
    expect(
      shapes.length,
      'Summary skeleton preserves heading and multiple value details',
    ).toBeGreaterThanOrEqual(3);
    expect(
      new Set(
        shapes.map((shape) => `${Math.round(shape.width / 8)}:${Math.round(shape.height / 4)}`),
      ).size,
      'Summary has a visible hierarchy of labels and values',
    ).toBeGreaterThanOrEqual(2);
  }
}
