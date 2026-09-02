/**
 * Astro performance of ChartLegend, driven end to end. AstroContainer renders
 * the SSR markup (entries come straight from `config` at build/request time,
 * no client-side data-* to parse) but does NOT run the <script>, so this
 * suite calls bindChartLegend directly -- that IS the script's job -- then
 * drives the same score the React suite drives: roving-focus keyboard
 * traversal and the display-only contract.
 *
 * Filename note: this suite's `.astro.conformance.test.ts` suffix is a
 * mechanical requirement of `vitest.config.astro.ts` (its `include` and the
 * main config's matching `exclude` both key on this literal string).
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import ChartLegend from '../../../src/components/chart/chart-legend.astro';
import { bindChartLegend } from '../../../src/components/chart/chart-legend.behavior';
import type { ChartConfig } from '../../../src/components/chart/chart.behavior';
import { assertAxeClean } from '../../harness/conformance';

afterEach(() => {
  document.body.innerHTML = '';
});

const config = {
  desktop: { label: 'Desktop', token: 'chart-1' },
  mobile: { label: 'Mobile', token: 'chart-2' },
} satisfies ChartConfig;

async function mount(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(ChartLegend, {
    props: { id: 'l', config, ...props },
  });
  document.body.innerHTML = `<main>${html}</main>`;
  const root = document.body.querySelector('rafters-chart-legend') as HTMLElement;
  bindChartLegend(root); // the <script> does this per instance on the real page
  return root;
}

describe('chart-legend [astro]', () => {
  it('SSR: one entry per series, fill-chart-N swatches, role=list/listitem', async () => {
    const root = await mount();
    expect(root.getAttribute('role')).toBe('list');
    const entries = root.querySelectorAll('[data-part="entry"]');
    expect(entries).toHaveLength(2);
    for (const entry of Array.from(entries)) {
      expect(entry.getAttribute('role')).toBe('listitem');
    }
    expect(entries[0]?.querySelector('.fill-chart-1')).not.toBeNull();
    expect(entries[1]?.querySelector('.fill-chart-2')).not.toBeNull();
  });

  it('bind: entries carry data-roving-item and roving-focus moves focus on ArrowRight', async () => {
    const root = await mount();
    const entries = Array.from(root.querySelectorAll<HTMLElement>('[data-part="entry"]'));
    for (const entry of entries) {
      expect(entry.hasAttribute('data-roving-item')).toBe(true);
    }

    entries[0]?.focus();
    expect(document.activeElement).toBe(entries[0]);
    entries[0]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.activeElement).toBe(entries[1]);
  });

  it('display-only: activating an entry dispatches nothing and never throws', async () => {
    const root = await mount();
    const entry = root.querySelector<HTMLElement>('[data-part="entry"]')!;
    expect(() => entry.dispatchEvent(new MouseEvent('click', { bubbles: true }))).not.toThrow();
    expect(() =>
      entry.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
    ).not.toThrow();
  });

  it('omitted config renders an empty legend -- no throw', async () => {
    const root = await mount({ config: {} });
    expect(root.querySelectorAll('[data-part="entry"]')).toHaveLength(0);
  });

  it('is axe-clean rendered inside a landmark', async () => {
    const root = await mount();
    await assertAxeClean(root);
  });
});
