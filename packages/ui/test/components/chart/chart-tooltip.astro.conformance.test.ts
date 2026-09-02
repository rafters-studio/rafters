/**
 * Astro performance of ChartTooltip, driven end to end. AstroContainer renders
 * the SSR markup but does NOT run the <script>, so this suite calls
 * bindChartTooltip directly -- that IS the script's job -- then drives the
 * same score the React and WC suites drive, including the rebind path a
 * property setter fires on the WC (chart-tooltip.element.ts's `rebind()`):
 * tear down, bind again, and confirm the content still updates and stays a
 * single node in the document.
 *
 * Content lookups after a bind go through `document.querySelector`, not
 * `root.querySelector`: `bindChartTooltip` portals `[data-part="content"]`
 * into `document.body` (matching the React performance's `createPortal`), so
 * once bound it is no longer a descendant of `root`.
 *
 * Filename note: this suite's `.astro.conformance.test.ts` suffix is a
 * mechanical requirement of `vitest.config.astro.ts` (its `include` and the
 * main config's matching `exclude` both key on this literal string).
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import ChartTooltip from '../../../src/components/chart/chart-tooltip.astro';
import { bandScale } from '../../../src/primitives/graph';
import type { ChartConfig } from '../../../src/components/chart/chart.behavior';
import { bindChartTooltip } from '../../../src/components/chart/chart-tooltip.behavior';
import { chartTooltipClasses } from '../../../src/components/chart/chart-tooltip.classes';

afterEach(() => {
  document.body.innerHTML = '';
});

const config = {
  desktop: { label: 'Desktop', token: 'chart-1' },
  mobile: { label: 'Mobile', token: 'chart-2' },
} satisfies ChartConfig;

const domain = ['Jan', 'Feb', 'Mar'];
const range: [number, number] = [0, 300];
const data = [
  { desktop: 100, mobile: 40 },
  { desktop: 205, mobile: 90 },
  { desktop: 150, mobile: 60 },
];

/** Same mock-rect technique as collision-detector.test.ts: happy-dom's
 *  getBoundingClientRect always returns a zero rect, so a real width is
 *  stubbed in to turn a clientX into a meaningful normalized point. */
function stubRect(el: HTMLElement, rect: Partial<DOMRect>): void {
  el.getBoundingClientRect = () =>
    ({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
      ...rect,
    }) as DOMRect;
}

function currentContent(): HTMLElement {
  return document.querySelector('[data-part="content"]') as HTMLElement;
}

async function mount(
  props: Record<string, unknown> = {},
): Promise<{ plot: HTMLElement; root: HTMLElement }> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(ChartTooltip, {
    props: { id: 't', config, domain, range, data, ...props },
  });
  document.body.innerHTML = `<div data-part="plot">${html}</div>`;
  const plot = document.body.querySelector('[data-part="plot"]') as HTMLElement;
  const root = plot.querySelector('rafters-chart-tooltip') as HTMLElement;
  stubRect(plot, { width: 300, height: 100 });
  return { plot, root };
}

describe('chart-tooltip [astro]', () => {
  it('SSR: root and content render, closed, before any bind', async () => {
    const { root } = await mount();
    expect(root.getAttribute('data-part')).toBe('root');
    const content = root.querySelector('[data-part="content"]');
    expect(content).not.toBeNull();
    expect(content?.getAttribute('data-state')).toBe('closed');
  });

  it('bind: a pointer move over the plot hit-tests the datum and renders header/rows/swatch', async () => {
    const { plot, root } = await mount();
    bindChartTooltip(root, { scale: bandScale(domain, range), data, config });

    plot.dispatchEvent(new MouseEvent('mousemove', { clientX: 153, clientY: 50, bubbles: true }));

    const content = currentContent();
    expect(content.dataset['state']).toBe('open');
    expect(content.dataset['category']).toBe('Feb');

    // Header + row/label/value classes come from chart-tooltip.classes.ts,
    // the SAME literals the React path's renderTooltipBody attaches -- this
    // is the finding this suite guards: a flat textContent string carries
    // none of these classes anywhere.
    const classes = chartTooltipClasses();
    const header = content.querySelector(`.${classes.header.split(' ').join('.')}`);
    expect(header).not.toBeNull();
    expect(header?.textContent).toBe('Feb');

    const rows = content.querySelectorAll('[data-part="row"]');
    expect(rows).toHaveLength(2);
    expect(rows[0]?.className).toBe(classes.row);
    const desktopSwatch = rows[0]?.querySelector('.fill-chart-1');
    expect(desktopSwatch).not.toBeNull();
    expect(content.querySelector('svg')).not.toBeNull();

    // Children in build order (buildTooltipContentNodes): swatch svg, then
    // label span, then value span -- indexed rather than class-selected,
    // since `text-background` and `text-background/70` are distinct class
    // tokens that a compound selector could conflate.
    const [, labelEl, valueEl] = Array.from(rows[0]?.children ?? []);
    expect(labelEl?.className).toBe(classes.label);
    expect(labelEl?.textContent).toBe('Desktop');
    expect(valueEl?.className).toBe(classes.value);
    expect(valueEl?.textContent).toBe('205');
  });

  it('rebind (property setter path): tearing down and binding again still updates content, staying one node', async () => {
    const { plot, root } = await mount();

    const firstTeardown = bindChartTooltip(root, { scale: bandScale(domain, range), data, config });
    plot.dispatchEvent(new MouseEvent('mousemove', { clientX: 153, clientY: 50, bubbles: true }));
    expect(currentContent().dataset['category']).toBe('Feb');

    // Mirrors RaftersChartTooltip.rebind() (chart-tooltip.element.ts): every
    // domain/range/data/config/nameKey setter tears down the previous bind
    // and calls bindChartTooltip again on the SAME root.
    firstTeardown();

    // The fix's actual contract, stated directly: teardown restores content
    // to a descendant of root BEFORE the next bind's own
    // `root.querySelector('[data-part="content"]')` runs. Pre-fix, this is
    // null (content stays wherever the first bind portaled it), so the
    // second bind's `render()` no-ops on every future state change.
    expect(root.querySelector('[data-part="content"]')).not.toBeNull();

    const secondTeardown = bindChartTooltip(root, {
      scale: bandScale(domain, range),
      data,
      config,
      nameKey: 'mobile',
    });

    plot.dispatchEvent(new MouseEvent('mousemove', { clientX: 9, clientY: 50, bubbles: true }));

    expect(document.querySelectorAll('[data-part="content"]')).toHaveLength(1);
    const content = currentContent();
    expect(content).not.toBeNull();
    expect(content.dataset['state']).toBe('open');
    expect(content.dataset['category']).toBe('Jan');
    expect(content.querySelectorAll('[data-part="row"]')).toHaveLength(2);

    secondTeardown();
  });
});
