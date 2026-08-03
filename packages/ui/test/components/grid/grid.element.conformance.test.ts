/**
 * WC performance of the grid score, driven end to end against light-DOM
 * markup. Same score as the React conformance test -- proves the static
 * projection (role disposition, data-preset/data-columns) and the conditional
 * 2D roving-focus composition drive through the DOM binding.
 *
 * The two archetype cases the issue names:
 *  - role="grid" (opted in via data-grid-role) engages the 2D keyboard contract;
 *  - a presentation grid stays inert -- no role, no roving tab stop.
 */
import { cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { RaftersGrid } from '../../../src/components/grid/grid.element';

beforeAll(() => {
  if (!customElements.get('rafters-grid')) customElements.define('rafters-grid', RaftersGrid);
});

async function mountGridMode(): Promise<HTMLElement> {
  // role="grid" markup is authored (or SSR'd) pre-chunked: data-grid-role opts
  // in, the row/gridcell structure already exists, the binding projects role.
  // Config is data-* only (#2001), so every key here reaches root.dataset.
  document.body.innerHTML = `
    <rafters-grid data-part="root" data-grid data-grid-role="grid" data-columns="2" aria-label="Cells">
      <div data-part="row" role="row" class="contents">
        <div data-part="cell" role="gridcell" data-roving-item tabindex="-1">a</div>
        <div data-part="cell" role="gridcell" data-roving-item tabindex="-1">b</div>
      </div>
      <div data-part="row" role="row" class="contents">
        <div data-part="cell" role="gridcell" data-roving-item tabindex="-1">c</div>
        <div data-part="cell" role="gridcell" data-roving-item tabindex="-1">d</div>
      </div>
    </rafters-grid>`;
  await Promise.resolve(); // let the element's deferred bind run
  return document.body.querySelector('rafters-grid') as HTMLElement;
}

async function mountPresentation(): Promise<HTMLElement> {
  document.body.innerHTML = `
    <rafters-grid data-part="root" data-grid data-preset="bento" data-pattern="dashboard">
      <div data-priority="primary">Metric</div>
      <div data-priority="secondary">Chart</div>
      <div data-priority="tertiary">Feed</div>
    </rafters-grid>`;
  await Promise.resolve();
  return document.body.querySelector('rafters-grid') as HTMLElement;
}

const cells = () => Array.from(document.body.querySelectorAll<HTMLElement>('[role="gridcell"]'));

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('grid conformance [wc]', () => {
  it('role=grid: honest role projected, name and columns wired', async () => {
    const root = await mountGridMode();
    expect(root.getAttribute('role')).toBe('grid');
    expect(root.getAttribute('aria-label')).toBe('Cells');
    expect(root.getAttribute('data-columns')).toBe('2');
    expect(root.getAttribute('data-preset')).toBe('linear');
  });

  it('role=grid: the first cell is the sole tab stop', async () => {
    await mountGridMode();
    const grid = cells();
    expect(grid[0]?.getAttribute('tabindex')).toBe('0');
    expect(grid[1]?.getAttribute('tabindex')).toBe('-1');
  });

  it('role=grid: arrow keys rove in two dimensions', async () => {
    const user = userEvent.setup();
    await mountGridMode();
    const grid = cells();
    grid[0]?.focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(grid[1]);
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(grid[3]);
    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(grid[2]);
    await user.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(grid[0]);
    await user.keyboard('{End}');
    expect(document.activeElement).toBe(grid[3]);
    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(grid[0]);
  });

  it('presentation grid stays inert: no role, no roving, priority preserved', async () => {
    const root = await mountPresentation();
    expect(root.hasAttribute('role')).toBe(false);
    expect(root.getAttribute('data-preset')).toBe('bento');
    // Roving-focus never engaged: nothing claimed a 0 tab stop.
    expect(document.body.querySelector('[tabindex="0"]')).toBeNull();
    const declared = Array.from(document.body.querySelectorAll('[data-priority]'));
    expect(declared).toHaveLength(3);
    expect(declared[0]?.getAttribute('data-priority')).toBe('primary');
  });
});
