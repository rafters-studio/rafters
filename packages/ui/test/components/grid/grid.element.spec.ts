import { expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import '../../../src/components/grid/grid.element';
import { grid, type GridConfig } from '../../../src/components/grid/grid.behavior';
import { gridClasses } from '../../../src/components/grid/grid.classes';

async function mount(html: string): Promise<HTMLElement> {
  document.body.innerHTML = html;
  await Promise.resolve(); // the bind runs one microtask after connect (grid.md:94-96)
  const el = document.body.querySelector('rafters-grid');
  if (!(el instanceof HTMLElement)) throw new Error('rafters-grid did not mount');
  return el;
}

function expectRoot(el: HTMLElement, config: GridConfig): void {
  const aria = grid.aria({}, config, { root: el.id, row: '', cell: '' }).root ?? {};
  expect(el.getAttribute('data-part')).toBe('root');
  expect(el.className).toBe(gridClasses(config, {}).root);
  for (const name of ['role', 'aria-label', 'data-preset', 'data-columns']) {
    const value = aria[name];
    expect(el.getAttribute(name)).toBe(value === undefined ? null : String(value));
  }
  expect(el.shadowRoot).toBeNull();
}

it('binds a layout grid', async () => {
  const config: GridConfig = { preset: 'linear', columns: 3, gap: '4' };
  const el = await mount(
    `<rafters-grid data-part="root" data-grid id="g" data-gap="4" data-preset="linear" data-columns="3" class="${gridClasses(config, {}).root}">` +
      '<div>A</div><div>B</div><div>C</div></rafters-grid>',
  );
  expectRoot(el, config);
});

it('grid-role projects role=grid and roves in 2D', async () => {
  const config: GridConfig = { preset: 'linear', columns: 2, role: 'grid', ariaLabel: 'Metrics' };
  const cell = (text: string): string =>
    `<div data-part="cell" role="gridcell" data-roving-item tabindex="-1">${text}</div>`;
  const row = (a: string, b: string): string =>
    `<div data-part="row" role="row" class="contents">${cell(a)}${cell(b)}</div>`;
  const el = await mount(
    `<rafters-grid data-part="root" data-grid id="m" grid-role="grid" data-preset="linear" data-columns="2" aria-label="Metrics" class="${gridClasses(config, {}).root}">` +
      `${row('1', '2')}${row('3', '4')}</rafters-grid>`,
  );
  expectRoot(el, config);
  const cells = el.querySelectorAll<HTMLElement>('[data-roving-item]');
  cells[0]?.focus();
  await userEvent.keyboard('{ArrowRight}');
  expect(document.activeElement).toBe(cells[1]);
  await userEvent.keyboard('{ArrowDown}');
  expect(document.activeElement).toBe(cells[3]);
});

it('keeps data-priority on a golden grid', async () => {
  const el = await mount(
    `<rafters-grid data-part="root" data-grid id="gg" data-preset="golden" class="${gridClasses({ preset: 'golden' }, {}).root}">` +
      '<div>A</div><div data-priority="primary">B</div></rafters-grid>',
  );
  expectRoot(el, { preset: 'golden' });
  expect(el.hasAttribute('role')).toBe(false);
  expect(el.lastElementChild?.getAttribute('data-priority')).toBe('primary');
});

it('removing the host runs the teardown', async () => {
  const cell = (text: string): string =>
    `<div data-part="cell" role="gridcell" data-roving-item tabindex="-1">${text}</div>`;
  const el = await mount(
    '<rafters-grid data-part="root" data-grid id="t" grid-role="grid" data-preset="linear" data-columns="2" aria-label="T">' +
      `<div data-part="row" role="row" class="contents">${cell('1')}${cell('2')}</div></rafters-grid>`,
  );
  const cells = Array.from(el.querySelectorAll<HTMLElement>('[data-roving-item]'));
  el.remove();
  cells[0]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  // A live roving binding would move the tab stop to the second cell.
  expect(cells[1]?.getAttribute('tabindex')).toBe('-1');
});
