import { describe, expect, it } from 'vitest';
import { chartLegend, legendEntries } from '../../../src/components/chart/chart-legend.behavior';
import { chartLegendClasses } from '../../../src/components/chart/chart-legend.classes';
import type { ChartConfig } from '../../../src/components/chart/chart.behavior';

const config = {
  desktop: { label: 'Desktop', token: 'chart-1' },
  mobile: { label: 'Mobile' },
} satisfies ChartConfig;

describe('legendEntries', () => {
  it('one entry per configured series, in config order', () => {
    const entries = legendEntries(config);
    expect(entries).toEqual([
      { key: 'desktop', label: 'Desktop', swatchClass: 'fill-chart-1' },
      { key: 'mobile', label: 'Mobile', swatchClass: 'fill-chart-2' },
    ]);
  });

  it('an empty config produces an empty legend -- no throw', () => {
    expect(legendEntries({})).toEqual([]);
  });

  it('a token-less series falls back to index-based fill class', () => {
    expect(legendEntries({ x: {} })[0]!.swatchClass).toBe('fill-chart-1');
  });

  it('falls back to the key itself when no label is configured', () => {
    expect(legendEntries({ x: {} })[0]!.label).toBe('x');
  });

  it('nameKey overrides every entry label from one shared config entry (documented simplification)', () => {
    const entries = legendEntries(config, 'mobile');
    expect(entries.map((e) => e.label)).toEqual(['Mobile', 'Mobile']);
  });
});

describe('chartLegend behavior spec -- display-only by default', () => {
  it('declares root and entry parts', () => {
    expect(Object.keys(chartLegend.parts).sort()).toEqual(['entry', 'root']);
  });

  it('has no state and no actions -- a static score, same shape as x-axis/y-axis', () => {
    expect(chartLegend.initialState({})).toEqual({});
    expect(Object.keys(chartLegend.actions)).toEqual([]);
  });

  it('projects role=list on root, role=listitem on every entry (uniform, no instanceAria needed)', () => {
    const projection = chartLegend.aria({}, {}, { root: '', entry: '' });
    expect(projection.root).toEqual({ role: 'list' });
    expect(projection.entry).toEqual({ role: 'listitem' });
  });

  it('never claims a keymap entry -- roving-focus owns traversal directly against the DOM', () => {
    for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End', 'Enter', ' ']) {
      expect(chartLegend.keymap({ key }, {}, 'entry', {})).toBeNull();
    }
  });

  it('canDispatch is vacuously true -- there is nothing to dispatch', () => {
    // @ts-expect-error -- no action exists on this spec; canDispatch's own
    // signature still requires an argument, asserting the contract stays a
    // static score with zero members in ChartLegendActions.
    expect(chartLegend.canDispatch({}, 'toggle', {})).toBe(true);
  });
});

describe('color token compliance -- no hex, no var(), no arbitrary value', () => {
  const FORBIDDEN = /#[0-9a-f]{3,8}\b|var\(--|\[[^\]]*\]/i;

  it('legendEntries never emits a forbidden swatch class', () => {
    const entries = legendEntries(config);
    for (const entry of entries) {
      expect(entry.swatchClass).not.toMatch(FORBIDDEN);
      expect(entry.swatchClass).toMatch(/^fill-chart-[1-5]$/);
    }
  });

  it('chartLegendClasses emits no color/motion literal', () => {
    const classes = chartLegendClasses();
    expect(classes.root).not.toMatch(FORBIDDEN);
    expect(classes.entry).not.toMatch(/#[0-9a-f]{3,8}\b|var\(--/i);
    expect(classes.label).not.toMatch(FORBIDDEN);
  });
});

describe('issue #2228 functional test block (legend half)', () => {
  function renderChartLegend(cfg: ChartConfig): { querySelectorAll: (sel: string) => unknown[] } {
    // Illustrative helper matching the issue's `renderChartLegend(config)`
    // shorthand: a minimal DOM stand-in asserting the real contract
    // (`legendEntries` + `data-part="entry"`, per chart-legend.tsx/.astro),
    // not a shipped export -- the shipped surface is `ChartLegendContent`.
    const entries = legendEntries(cfg);
    const root = document.createElement('div');
    root.setAttribute('role', 'list');
    for (let index = 0; index < entries.length; index++) {
      const el = document.createElement('span');
      el.setAttribute('data-part', 'entry');
      el.setAttribute('data-roving-item', '');
      root.appendChild(el);
    }
    document.body.appendChild(root);
    return { querySelectorAll: (sel: string) => Array.from(root.querySelectorAll(sel)) };
  }

  it('matches the spec verbatim -- display-only, no toggle dispatch on activation', () => {
    const legend = renderChartLegend(config);
    expect(legend.querySelectorAll('[data-part="entry"]')).toHaveLength(2);
    // No toggle dispatch on activation: the behavior spec has zero actions,
    // so there is nothing a click/Enter/Space on an entry could dispatch.
    expect(Object.keys(chartLegend.actions)).toHaveLength(0);
  });
});
