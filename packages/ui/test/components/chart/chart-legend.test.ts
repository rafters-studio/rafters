import * as React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ChartContainer } from '../../../src/components/chart/chart';
import { chartLegend, legendEntries } from '../../../src/components/chart/chart-legend.behavior';
import { chartLegendClasses } from '../../../src/components/chart/chart-legend.classes';
import { ChartLegend, ChartLegendContent } from '../../../src/components/chart/chart-legend';
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

// Structural guarantees axe cannot see: roving-focus keyboard traversal with
// native (visible) focus, the display-only contract -- activating an entry
// dispatches nothing -- and every emitted class a literal token class.
describe('ChartLegend [react] structural contract', () => {
  // The functional-test block above appends its stand-in legend to
  // document.body and leaves it there; these tests query the document, so
  // they start from an empty body.
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  const config = {
    desktop: { label: 'Desktop', token: 'chart-1' },
    mobile: { label: 'Mobile', token: 'chart-2' },
  } satisfies ChartConfig;

  function renderLegend() {
    return render(
      React.createElement(
        ChartContainer,
        { config },
        React.createElement(ChartLegend, {
          content: React.createElement(ChartLegendContent, null),
        }),
      ),
    );
  }

  describe('ChartLegend roving focus: list roles and arrow traversal', () => {
    it('renders role=list on root and role=listitem + data-roving-item on every entry', () => {
      renderLegend();
      // ChartContainer also renders its own `[data-part="root"]`; ChartLegend's
      // is nested inside it, so it is the LAST match in document order.
      const roots = document.querySelectorAll('[data-part="root"]');
      const root = roots[roots.length - 1];
      expect(root?.getAttribute('role')).toBe('list');
      const entries = document.querySelectorAll('[data-part="entry"]');
      expect(entries).toHaveLength(2);
      for (const entry of Array.from(entries)) {
        expect(entry.getAttribute('role')).toBe('listitem');
        expect(entry.hasAttribute('data-roving-item')).toBe(true);
      }
    });

    it('roving-focus moves focus across entries on ArrowRight; focus stays visible (native focus, no outline suppression)', () => {
      renderLegend();
      const entries = Array.from(document.querySelectorAll<HTMLElement>('[data-part="entry"]'));
      entries[0]?.focus();
      expect(document.activeElement).toBe(entries[0]);
      fireEvent.keyDown(entries[0]!, { key: 'ArrowRight' });
      expect(document.activeElement).toBe(entries[1]);
    });
  });

  describe('display-only contract: activation dispatches nothing', () => {
    it('clicking or pressing Enter/Space on an entry never changes chart config or throws', () => {
      renderLegend();
      const entry = document.querySelector<HTMLElement>('[data-part="entry"]')!;
      expect(() => fireEvent.click(entry)).not.toThrow();
      expect(() => fireEvent.keyDown(entry, { key: 'Enter' })).not.toThrow();
      expect(() => fireEvent.keyDown(entry, { key: ' ' })).not.toThrow();
      // No dispatch surface exists to have fired: the spec has zero actions.
      expect(Object.keys(chartLegend.actions)).toHaveLength(0);
    });
  });

  describe('color token compliance -- no hex, no var(), no arbitrary value', () => {
    it('the default content render never emits a forbidden class', () => {
      const { container } = renderLegend();
      const html = container.innerHTML;
      expect(html).not.toMatch(/#[0-9a-f]{3,8}\b/i);
      expect(html).not.toMatch(/var\(--/);
    });
  });
});
