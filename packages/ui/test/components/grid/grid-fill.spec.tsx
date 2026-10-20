/**
 * A Grid.Item's content fills the item (grid.md, Item content). Measured in
 * real chromium.
 *
 * The browser test page loads no compiled Tailwind sheet, so the stand-in
 * below gives the structural class names Grid and Card emit the rules
 * Tailwind compiles them to. It is keyed on the class names themselves, so an
 * item that does not carry the fill class is not stretched here either. The
 * primary placement rules mirror the `[&>[data-priority=primary]]` variants in
 * grid.classes.ts, keyed on the projected preset.
 */
import { afterEach, beforeEach, expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../src/components/card/card';
import { Grid } from '../../../src/components/grid/grid';

let style: HTMLStyleElement | null = null;

beforeEach(() => {
  style = document.createElement('style');
  style.textContent = `
    .grid { display: grid; }
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .grid-rows-2 { grid-template-rows: repeat(2, minmax(0, 1fr)); }
    [data-part="root"] { gap: 16px; width: 800px; }
    [data-preset="golden"] > [data-priority="primary"] { grid-column: span 2 / span 2; }
    [data-preset="bento"] > [data-priority="primary"] { grid-column: span 2 / span 2; grid-row: span 2 / span 2; }
  `;
  document.head.appendChild(style);
});

afterEach(() => {
  style?.remove();
  style = null;
});

function tile(title: string, lines: number) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {Array.from({ length: lines }, (_, index) => (
          <p key={index}>Line {index + 1}</p>
        ))}
      </CardContent>
    </Card>
  );
}

function heights(container: HTMLElement): Array<{ item: number; card: number }> {
  return Array.from(container.querySelectorAll<HTMLElement>('[data-priority]')).map((item) => {
    const card = item.firstElementChild;
    if (!(card instanceof HTMLElement)) throw new Error('grid item has no element child');
    return {
      item: item.getBoundingClientRect().height,
      card: card.getBoundingClientRect().height,
    };
  });
}

test('bento dashboard: each Card is as tall as its Grid.Item', async () => {
  const { container } = await render(
    <Grid preset="bento" pattern="dashboard">
      <Grid.Item priority="primary">{tile('Metric', 1)}</Grid.Item>
      <Grid.Item priority="secondary">{tile('Chart', 4)}</Grid.Item>
      <Grid.Item priority="tertiary">{tile('Feed', 1)}</Grid.Item>
    </Grid>,
  );
  const measured = heights(container);
  expect(measured).toHaveLength(3);
  for (const { item, card } of measured) {
    expect(card).toBeCloseTo(item, 0);
  }
  // The primary tile spans both rows plus the gap.
  const [primary, secondary] = measured;
  if (!primary || !secondary) throw new Error('missing tiles');
  expect(primary.card).toBeCloseTo(secondary.item * 2 + 16, 0);
});

test('golden: both Cards have the same rendered height', async () => {
  const { container } = await render(
    <Grid preset="golden">
      <Grid.Item priority="primary">{tile('Hero', 1)}</Grid.Item>
      <Grid.Item priority="secondary">{tile('Rail', 5)}</Grid.Item>
    </Grid>,
  );
  const measured = heights(container);
  expect(measured).toHaveLength(2);
  for (const { item, card } of measured) {
    expect(card).toBeCloseTo(item, 0);
  }
  const [primary, secondary] = measured;
  if (!primary || !secondary) throw new Error('missing tiles');
  expect(primary.card).toBeCloseTo(secondary.card, 0);
});
