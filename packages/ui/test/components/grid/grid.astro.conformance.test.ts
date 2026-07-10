/**
 * Astro render adapter + the static-tier subset of the grid conformance
 * suite (Spec 01 testing obligations; grid.astro's docblock). No
 * `role="grid"` scenarios here: that ARIA pattern is dropped for this tier
 * (row/gridcell chunking has no child-enumeration primitive in Astro's
 * slot model; the `grid-roving` keyboard contract is an effect, and
 * "Astro: no client runtime, no effects" -- Spec 03).
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import GridItem from '../../../src/components/grid/grid-item.astro';
import Grid from '../../../src/components/grid/grid.astro';
import { assertAxeClean, partElement } from '../../harness/conformance';

afterEach(() => {
  document.body.innerHTML = '';
});

async function renderItem(props: Record<string, unknown>, slot: string): Promise<string> {
  const astroContainer = await AstroContainer.create();
  return astroContainer.renderToString(GridItem, { props, slots: { default: slot } });
}

async function renderGrid(props: Record<string, unknown>, slot: string): Promise<HTMLElement> {
  const astroContainer = await AstroContainer.create();
  const html = await astroContainer.renderToString(Grid, { props, slots: { default: slot } });
  // Layout grids are content, not landmarks (grid.md: "silent furniture");
  // axe's region rule wants content contained by one, same as the React
  // conformance test's <main> wrapper.
  document.body.innerHTML = `<main>${html}</main>`;
  return document.body;
}

describe('grid conformance [astro]', () => {
  it('layout grid: silent furniture, priority projected onto items', async () => {
    const items =
      (await renderItem({ priority: 'primary' }, 'Metric')) +
      (await renderItem({ priority: 'secondary' }, 'Chart')) +
      (await renderItem({ priority: 'tertiary' }, 'Feed'));
    const body = await renderGrid({ preset: 'bento', pattern: 'dashboard' }, items);
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.hasAttribute('role')).toBe(false);
    expect(root.getAttribute('data-preset')).toBe('bento');
    const projected = root.querySelectorAll('[data-priority]');
    expect(projected).toHaveLength(3);
    expect(projected[0]?.getAttribute('data-priority')).toBe('primary');
    await assertAxeClean(body);
  });

  it('reordering the tree does not change which item is the hero', async () => {
    const items =
      (await renderItem({ priority: 'secondary' }, 'Rail')) +
      (await renderItem({ priority: 'primary' }, 'Hero'));
    const body = await renderGrid({ preset: 'golden' }, items);
    // The placement selector targets [data-priority=primary] regardless of
    // position -- the second child carries the declaration.
    const hero = body.querySelector('[data-priority="primary"]');
    expect(hero?.textContent).toBe('Hero');
  });

  it('explicit spans compose with priority on items', async () => {
    const item = await renderItem({ colSpan: 2, rowSpan: 2, priority: 'primary' }, 'Wide');
    const body = await renderGrid({ columns: 4 }, item);
    const projected = body.querySelector('[data-priority="primary"]');
    expect(projected?.className).toContain('col-span-2');
    expect(projected?.className).toContain('row-span-2');
  });
});
