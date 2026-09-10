/**
 * Ported conformance for Grid, Astro target. Grid is a STATIC score -- no
 * state, no actions, no keymap -- but the STRUCTURE contract (role
 * disposition, the conditional 2D roving-focus composition) is behavior, so
 * this drives both archetypes end to end. AstroContainer renders the SSR
 * markup but does NOT run the <script>, so the test calls bindGrid directly --
 * that IS the script's job. A presentation grid stays inert; an honest
 * role="grid" engages the 2D roving tab-stop engine.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, expect, test } from 'vitest';
import Grid from '../../../src/components/grid/grid.astro';
import { bindGrid } from '../../../src/components/grid/grid.behavior';

function pressKey(target: EventTarget, key: string): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

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

test('presentation grid stays inert: no role, no roving tab stop, slot content preserved', async () => {
  const root = await mount(
    { preset: 'bento', pattern: 'dashboard' },
    { default: '<div>Metric</div><div>Chart</div><div>Feed</div>' },
  );
  expect(root.hasAttribute('role')).toBe(false);
  expect(root.getAttribute('data-preset')).toBe('bento');
  // Roving-focus never engaged: nothing claimed a 0 tab stop.
  expect(document.body.querySelector('[tabindex="0"]')).toBeNull();
  expect(root.textContent).toContain('Metric');
});

test('role=grid: bindGrid projects the honest role, name and columns wired', async () => {
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

test('role=grid: the first cell is the sole tab stop', async () => {
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

test('role=grid: arrow keys rove the 2D roving engine', async () => {
  await mount({
    role: 'grid',
    columns: 2,
    ariaLabel: 'Cells',
    cells: [{ html: 'a' }, { html: 'b' }, { html: 'c' }, { html: 'd' }],
  });
  const grid = cells();
  grid[0]?.focus();
  pressKey(grid[0] as HTMLElement, 'ArrowRight');
  expect(document.activeElement).toBe(grid[1]);
  pressKey(grid[1] as HTMLElement, 'ArrowDown');
  expect(document.activeElement).toBe(grid[3]);
  pressKey(grid[3] as HTMLElement, 'ArrowLeft');
  expect(document.activeElement).toBe(grid[2]);
  pressKey(grid[2] as HTMLElement, 'ArrowUp');
  expect(document.activeElement).toBe(grid[0]);
});

// The #2001 pairing: config is data-* in the markup AND read through dataset
// in the bind. Both halves asserted here so a half-fix fails loudly.
test('config crosses the SSR/bind seam as data-* only, and rehydration still works', async () => {
  const root = await mount({
    preset: 'bento',
    pattern: 'dashboard',
    gap: '4',
    padding: '2',
    role: 'grid',
    columns: 2,
    ariaLabel: 'Cells',
    cells: [{ html: 'a' }, { html: 'b' }, { html: 'c' }, { html: 'd' }],
  });

  const expected: Record<string, string> = {
    preset: 'bento',
    pattern: 'dashboard',
    columns: '2',
    gap: '4',
    padding: '2',
    gridRole: 'grid',
  };
  for (const [key, value] of Object.entries(expected)) {
    expect(root.dataset[key], `dataset.${key}`).toBe(value);
    // The bare, pre-fix spelling must be gone: `gridRole` -> `grid-role`.
    const bare = key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
    expect(root.hasAttribute(bare), `bare attribute "${bare}" must not be rendered`).toBe(false);
  }

  // Rehydration: neither the honest role nor the roving tab stop is SSR'd --
  // both exist only because bindGrid reconstructed the config from dataset.
  expect(root.getAttribute('role')).toBe('grid');
  expect(root.getAttribute('aria-label')).toBe('Cells');
  expect(cells()[0]?.getAttribute('tabindex')).toBe('0');
});
