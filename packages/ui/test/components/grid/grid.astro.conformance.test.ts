/**
 * Astro performance of the Grid score. Grid is a STATIC score -- no state, no
 * actions, no keymap -- but the STRUCTURE contract (role disposition, the
 * conditional grid-roving effect) is behavior, so this test drives both
 * archetypes end to end. AstroContainer renders the SSR markup but does NOT
 * run the <script>, so the test calls bindGrid directly -- that IS the
 * script's job. A presentation grid stays inert; an honest role="grid"
 * engages the 2D roving tab-stop engine.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import Grid from '../../../src/components/grid/grid.astro';
import { bindGrid } from '../../../src/components/grid/grid.behavior';

afterEach(() => {
  document.body.innerHTML = '';
});

async function mount(
  props: Record<string, unknown>,
  slots: Record<string, string> = {},
): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Grid, { props: { id: 'g', ...props }, slots });
  document.body.innerHTML = html;
  const root = document.body.querySelector('[data-part="root"][data-grid]') as HTMLElement;
  bindGrid(root); // the <script> does this per instance on the real page
  return root;
}

const cells = () => Array.from(document.body.querySelectorAll<HTMLElement>('[data-roving-item]'));

describe('grid conformance [astro]', () => {
  it('presentation grid stays inert: no role, no roving tab stop, slot content preserved', async () => {
    const root = await mount(
      { preset: 'bento', pattern: 'dashboard' },
      { default: '<div>Metric</div><div>Chart</div><div>Feed</div>' },
    );
    expect(root.hasAttribute('role')).toBe(false);
    expect(root.getAttribute('data-preset')).toBe('bento');
    // The grid-roving effect never engaged: nothing claimed a 0 tab stop.
    expect(document.body.querySelector('[tabindex="0"]')).toBeNull();
    expect(root.textContent).toContain('Metric');
  });

  it('role=grid: bindGrid projects the honest role, name and columns wired', async () => {
    const root = await mount({
      role: 'grid',
      columns: 2,
      ariaLabel: 'Cells',
      cells: [{ html: 'a' }, { html: 'b' }, { html: 'c' }, { html: 'd' }],
    });
    expect(root.getAttribute('role')).toBe('grid');
    expect(root.getAttribute('aria-label')).toBe('Cells');
    expect(root.getAttribute('data-columns')).toBe('2');
  });

  it('role=grid: the first cell is the sole tab stop', async () => {
    await mount({
      role: 'grid',
      columns: 2,
      ariaLabel: 'Cells',
      cells: [{ html: 'a' }, { html: 'b' }, { html: 'c' }, { html: 'd' }],
    });
    const grid = cells();
    expect(grid[0]?.getAttribute('tabindex')).toBe('0');
    expect(grid[1]?.getAttribute('tabindex')).toBe('-1');
  });

  it('role=grid: arrow keys rove the 2D roving engine', async () => {
    const user = userEvent.setup();
    await mount({
      role: 'grid',
      columns: 2,
      ariaLabel: 'Cells',
      cells: [{ html: 'a' }, { html: 'b' }, { html: 'c' }, { html: 'd' }],
    });
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
  });
});
