import { validateMotionComposition } from '@rafters/design-tokens';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createBehavior } from '../../../src/lib/contract';
import {
  areaAria,
  areaChart,
  buildAreaChartLabel,
  buildAreaPath,
  computeAreas,
  describeArea,
  type AreaChartBehaviorConfig,
  type AreaPoint,
  type AreaSeriesGeometry,
} from '../../../src/components/chart/area-chart.behavior';
import {
  areaChartClasses,
  resolveAreaFillClass,
  resolveAreaStrokeClass,
} from '../../../src/components/chart/area-chart.classes';
import type { ChartConfig } from '../../../src/components/chart/chart.behavior';
import { hasArbitraryValue } from '../../../src/primitives/classy';
import { bandScale, linearScale } from '../../../src/primitives/graph';

const cfg = {
  desktop: { label: 'Desktop', token: 'chart-1' },
  mobile: { label: 'Mobile', token: 'chart-2' },
} satisfies ChartConfig;

const BEHAVIOR_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../src/components/chart/area-chart.behavior.ts',
);

describe('Spec 01 rule 1: behavior.ts never imports a classes module', () => {
  it('area-chart.behavior.ts has no import from any *.classes module', () => {
    const source = readFileSync(BEHAVIOR_PATH, 'utf8');
    expect(source).not.toMatch(/from\s+['"][^'"]*\.classes['"]/);
  });
});

const data = [
  { month: 'Jan', desktop: 100, mobile: 40 },
  { month: 'Feb', desktop: 120, mobile: 60 },
];

describe('computeAreas: overlaid (default)', () => {
  const width = 300;
  const height = 200;

  it('point geometry matches bandScale(paddingInner: 1)/linearScale computed directly, for a fixture dataset', () => {
    const geometry = computeAreas({ data, series: ['desktop', 'mobile'] }, cfg, {
      categoryKey: 'month',
      width,
      height,
    });

    // scalePoint == scaleBand with paddingInner locked to 1 (bandwidth
    // collapses to 0) -- categories run edge to edge, unlike BarChart's
    // inset 0.2/0.1-padded bands.
    const point = bandScale(['Jan', 'Feb'], [0, width], { paddingInner: 1, paddingOuter: 0 });
    const valueScale = linearScale([0, 120], [height, 0]); // Feb:desktop is the max (120)

    const desktop = geometry.series.find((s) => s.key === 'desktop') as AreaSeriesGeometry;
    expect(desktop.points[0]).toEqual({ x: point.scale('Jan'), y: valueScale(100) });
    expect(desktop.points[1]).toEqual({ x: point.scale('Feb'), y: valueScale(120) });
    // Overlaid: every series' baseline is the flat value-axis zero line.
    expect(desktop.baseline).toBeCloseTo(valueScale(0));

    const mobile = geometry.series.find((s) => s.key === 'mobile') as AreaSeriesGeometry;
    expect(mobile.points[0]).toEqual({ x: point.scale('Jan'), y: valueScale(40) });
    expect(mobile.baseline).toBeCloseTo(valueScale(0));
  });

  it('every series carries its own key and index, and one datum per (category, series)', () => {
    const geometry = computeAreas({ data, series: ['desktop', 'mobile'] }, cfg, {
      categoryKey: 'month',
      width,
      height,
    });
    expect(geometry.series).toHaveLength(2);
    expect(geometry.datums).toHaveLength(4); // 2 categories x 2 series

    const desktop = geometry.series.find((s) => s.key === 'desktop') as AreaSeriesGeometry;
    expect(desktop.seriesIndex).toBe(0);
    const mobile = geometry.series.find((s) => s.key === 'mobile') as AreaSeriesGeometry;
    expect(mobile.seriesIndex).toBe(1);

    const janDesktop = geometry.datums.find((d) => d.key === 'Jan:desktop');
    expect(janDesktop?.category).toBe('Jan');
    expect(janDesktop?.series).toBe('desktop');
    expect(janDesktop?.value).toBe(100);
  });

  it('every series areaPath is closed (ends in Z)', () => {
    const geometry = computeAreas({ data, series: ['desktop', 'mobile'] }, cfg, {
      categoryKey: 'month',
      width,
      height,
    });
    expect(geometry.series.every((s) => s.areaPath.endsWith('Z'))).toBe(true);
  });
});

describe('computeAreas: stacked -- baselines equal cumulative sums', () => {
  const width = 300;
  const height = 200;

  it('the bottom-most series keeps the flat zero baseline; the series above it carries the cumulative sum as its own baseline', () => {
    const geometry = computeAreas({ data, series: ['desktop', 'mobile'] }, cfg, {
      categoryKey: 'month',
      width,
      height,
      stacked: true,
    });

    const valueScale = linearScale([0, 180], [height, 0]); // Feb total: 120 + 60 = 180

    const desktop = geometry.series.find((s) => s.key === 'desktop') as AreaSeriesGeometry;
    // desktop is the bottom of the stack: its top edge is its own value,
    // its baseline is the flat zero line.
    expect(desktop.points[0]?.y).toBeCloseTo(valueScale(100));
    expect(desktop.points[1]?.y).toBeCloseTo(valueScale(120));
    expect(desktop.baseline).toBeCloseTo(valueScale(0));

    const mobile = geometry.series.find((s) => s.key === 'mobile') as AreaSeriesGeometry;
    // mobile stacks on desktop: its top edge is the cumulative sum
    // (desktop + mobile) per category ...
    expect(mobile.points[0]?.y).toBeCloseTo(valueScale(100 + 40)); // Jan
    expect(mobile.points[1]?.y).toBeCloseTo(valueScale(120 + 60)); // Feb
    // ... and its baseline is the cumulative sum THROUGH desktop alone --
    // the series below it's own top curve, per category, never flat.
    expect(Array.isArray(mobile.baseline)).toBe(true);
    const mobileBaseline = mobile.baseline as AreaPoint[];
    expect(mobileBaseline[0]?.y).toBeCloseTo(valueScale(100)); // Jan
    expect(mobileBaseline[1]?.y).toBeCloseTo(valueScale(120)); // Feb
  });

  it('datums carry the cumulative y position, not the raw per-series value alone', () => {
    const geometry = computeAreas({ data, series: ['desktop', 'mobile'] }, cfg, {
      categoryKey: 'month',
      width,
      height,
      stacked: true,
    });
    const valueScale = linearScale([0, 180], [height, 0]);
    const janMobile = geometry.datums.find((d) => d.key === 'Jan:mobile');
    expect(janMobile?.value).toBe(40); // the raw value stays the datum's own
    expect(janMobile?.y).toBeCloseTo(valueScale(140)); // the plotted position is cumulative
  });
});

describe('buildAreaPath', () => {
  const points = [
    { x: 0, y: 50 },
    { x: 100, y: 30 },
    { x: 200, y: 70 },
  ];

  it('returns an empty string for empty points', () => {
    expect(buildAreaPath([], 100)).toBe('');
  });

  it('a flat numeric baseline delegates to areaPath (graph.ts, #2223) and closes to it', () => {
    const path = buildAreaPath(points, 100, { smooth: false });
    expect(path).toMatch(/^M 0 50/);
    expect(path).toContain('L 200 100');
    expect(path).toContain('L 0 100');
    expect(path).toMatch(/Z$/);
  });

  it('smooth toggles the top edge builder', () => {
    const straight = buildAreaPath(points, 100, { smooth: false });
    const smooth = buildAreaPath(points, 100, { smooth: true });
    expect(straight).not.toContain('C');
    expect(smooth).toContain('C');
    expect(smooth).toMatch(/Z$/);
  });

  it('an AreaPoint[] baseline closes to the per-category baseline, top edge honoring smooth, closing edge always straight', () => {
    const baseline: AreaPoint[] = [
      { x: 0, y: 150 },
      { x: 100, y: 140 },
      { x: 200, y: 160 },
    ];
    const path = buildAreaPath(points, baseline, { smooth: true });
    expect(path).toMatch(/Z$/);
    // Top edge is smoothed (a genuine curve fit over 3 points).
    expect(path).toContain('C');
    // Closing edge connects to the LAST baseline point first (same x as the
    // top's last point), then straight-lines back to the first.
    expect(path).toContain('L 200 160');
    expect(path).toContain('L 0 150');
  });

  it('defaults to straight (non-smooth) when options are omitted', () => {
    expect(buildAreaPath(points, 100)).not.toContain('C');
  });
});

describe('computeAreas: color', () => {
  it('each series carries its own key and index; resolveAreaFillClass/resolveAreaStrokeClass resolve exactly its fill/stroke-chart-N from ChartConfig', () => {
    const geometry = computeAreas({ data, series: ['desktop', 'mobile'] }, cfg, {
      categoryKey: 'month',
      width: 300,
      height: 200,
    });
    expect(
      geometry.series.every((s) => /^fill-chart-[1-5]$/.test(resolveAreaFillClass(cfg, s))),
    ).toBe(true);
    expect(
      geometry.series.every((s) => /^stroke-chart-[1-5]$/.test(resolveAreaStrokeClass(cfg, s))),
    ).toBe(true);

    const desktop = geometry.series.find((s) => s.key === 'desktop') as AreaSeriesGeometry;
    expect(resolveAreaFillClass(cfg, desktop)).toBe('fill-chart-1');
    expect(resolveAreaStrokeClass(cfg, desktop)).toBe('stroke-chart-1');
    const mobile = geometry.series.find((s) => s.key === 'mobile') as AreaSeriesGeometry;
    expect(resolveAreaFillClass(cfg, mobile)).toBe('fill-chart-2');
    expect(resolveAreaStrokeClass(cfg, mobile)).toBe('stroke-chart-2');
  });
});

describe('computeAreas: error handling', () => {
  it('empty data renders an empty plot -- no throw', () => {
    expect(
      computeAreas({ data: [], series: ['desktop'] }, cfg, {
        categoryKey: 'month',
        width: 300,
        height: 200,
      }),
    ).toEqual({ series: [], datums: [] });
  });

  it('a series key absent from data rows is a Zod validation error naming the key', () => {
    expect(() =>
      computeAreas({ data: [{ month: 'Jan', desktop: 100 }], series: ['desktop', 'mobile'] }, cfg, {
        categoryKey: 'month',
        width: 300,
        height: 200,
      }),
    ).toThrow(/mobile/);
  });

  it('more than 5 series is a loud validation error naming the 5-token limit', () => {
    const manySeries = ['a', 'b', 'c', 'd', 'e', 'f'];
    const row = Object.fromEntries([['month', 'Jan'], ...manySeries.map((k) => [k, 1])]);
    expect(() =>
      computeAreas({ data: [row], series: manySeries }, cfg, {
        categoryKey: 'month',
        width: 300,
        height: 200,
      }),
    ).toThrow(/5/);
  });
});

describe('issue #2227 functional test block', () => {
  it('matches the spec fixture: stacked baselines are cumulative sums, and every path closes', () => {
    const fixtureData = [
      { x: 'a', d: 2, m: 1 },
      { x: 'b', d: 4, m: 2 },
    ];
    const geometry = computeAreas({ data: fixtureData, series: ['d', 'm'] }, cfg, {
      categoryKey: 'x',
      width: 300,
      height: 200,
      stacked: true,
    });
    const valueScale = linearScale([0, 6], [200, 0]); // 'b' total: 4 + 2 = 6

    const mSeries = geometry.series.find((s) => s.key === 'm') as AreaSeriesGeometry;
    // m stacks on d: m's top edge at 'b' is the cumulative sum through m (d + m).
    expect(mSeries.points[1]?.y).toBeCloseTo(valueScale(4 + 2));
    // m's baseline at 'b' is the cumulative sum through d alone.
    expect((mSeries.baseline as AreaPoint[])[1]?.y).toBeCloseTo(valueScale(4));

    const dSeries = geometry.series.find((s) => s.key === 'd') as AreaSeriesGeometry;
    expect(buildAreaPath(dSeries.points, dSeries.baseline, { smooth: false })).toMatch(/Z$/);
  });
});

const baseConfig: AreaChartBehaviorConfig = {
  data,
  series: ['desktop', 'mobile'],
  chartConfig: cfg,
  categoryKey: 'month',
  width: 300,
  height: 200,
};

describe('areaChart behavior spec', () => {
  it('declares root/plot/area/line/table parts, area and line as many, line optional', () => {
    expect(Object.keys(areaChart.parts).sort()).toEqual(['area', 'line', 'plot', 'root', 'table']);
    expect(areaChart.parts.area?.many).toBe(true);
    expect(areaChart.parts.line?.many).toBe(true);
    expect(areaChart.parts.line?.optional).toBe(true);
  });

  it('initialState derives series/datums via computeAreas and a null active cursor', () => {
    const state = areaChart.initialState(baseConfig);
    expect(state.series).toHaveLength(2);
    expect(state.datums).toHaveLength(4); // 2 categories x 2 series
    expect(state.activeIndex).toBeNull();
  });

  it('initialState derives value-axis ticks via ticks(), covering the data range', () => {
    const state = areaChart.initialState(baseConfig);
    expect(state.valueTicks.length).toBeGreaterThan(0);
    expect(state.valueTicks[state.valueTicks.length - 1]).toBeGreaterThanOrEqual(120);
  });

  it('canDispatch is false once datums are empty (no data)', () => {
    const emptyConfig = { ...baseConfig, data: [] };
    expect(
      areaChart.canDispatch(areaChart.initialState(emptyConfig), 'moveNext', emptyConfig),
    ).toBe(false);
  });

  it('moveNext/movePrevious/moveFirst/moveLast traverse and clamp the active-datum cursor', () => {
    const { memory, dispatch } = createBehavior(areaChart, baseConfig);
    expect(dispatch('moveNext', baseConfig)).toBe(true);
    expect(memory.get().activeIndex).toBe(0);
    dispatch('moveNext', baseConfig);
    expect(memory.get().activeIndex).toBe(1);
    dispatch('moveLast', baseConfig);
    expect(memory.get().activeIndex).toBe(3);
    dispatch('moveNext', baseConfig); // clamps at the last datum
    expect(memory.get().activeIndex).toBe(3);
    dispatch('moveFirst', baseConfig);
    expect(memory.get().activeIndex).toBe(0);
    dispatch('movePrevious', baseConfig); // clamps at the first datum
    expect(memory.get().activeIndex).toBe(0);
  });

  it('movePrevious from a null cursor lands on the first datum, same entry point as moveNext', () => {
    const { memory, dispatch } = createBehavior(areaChart, baseConfig);
    dispatch('movePrevious', baseConfig);
    expect(memory.get().activeIndex).toBe(0);
  });

  it('keymap claims arrow keys and Home/End on root and plot only, never on area/line', () => {
    const state = areaChart.initialState(baseConfig);
    expect(areaChart.keymap({ key: 'ArrowRight' }, state, 'root', baseConfig)).toBe('moveNext');
    expect(areaChart.keymap({ key: 'ArrowDown' }, state, 'plot', baseConfig)).toBe('moveNext');
    expect(areaChart.keymap({ key: 'ArrowLeft' }, state, 'root', baseConfig)).toBe('movePrevious');
    expect(areaChart.keymap({ key: 'ArrowUp' }, state, 'root', baseConfig)).toBe('movePrevious');
    expect(areaChart.keymap({ key: 'Home' }, state, 'root', baseConfig)).toBe('moveFirst');
    expect(areaChart.keymap({ key: 'End' }, state, 'root', baseConfig)).toBe('moveLast');
    expect(areaChart.keymap({ key: 'ArrowRight' }, state, 'area', baseConfig)).toBeNull();
    expect(areaChart.keymap({ key: 'ArrowRight' }, state, 'line', baseConfig)).toBeNull();
    expect(areaChart.keymap({ key: 'a' }, state, 'root', baseConfig)).toBeNull();
  });

  it('aria: root carries a descriptive label, plot is aria-hidden, area/line are omitted (many parts)', () => {
    const state = areaChart.initialState(baseConfig);
    const ids = { root: '', plot: '', area: '', line: '', table: '' };
    const projection = areaChart.aria(state, baseConfig, ids);
    expect(projection.root?.['aria-label']).toContain('desktop');
    expect(projection.root?.['aria-label']).toContain('mobile');
    expect(projection.plot).toEqual({ 'aria-hidden': 'true' });
    expect(projection.area).toBeUndefined();
    expect(projection.line).toBeUndefined();
  });

  it('areaAria flags the series that owns the active datum, and only that one', () => {
    const state = { ...areaChart.initialState(baseConfig), activeIndex: 0 }; // datums[0] = Jan:desktop
    const active = areaAria('desktop', state, baseConfig, {});
    expect(active).toEqual({
      'aria-hidden': 'true',
      'data-state': 'visible',
      'data-active': 'true',
    });
    const inactive = areaAria('mobile', state, baseConfig, {});
    expect(inactive['data-active']).toBe('false');
  });

  it('describeArea and buildAreaChartLabel produce the announcer/aria-label text', () => {
    const state = areaChart.initialState(baseConfig);
    const datum = state.datums[0];
    expect(datum && describeArea(datum)).toBe('Jan, desktop, 100');
    expect(buildAreaChartLabel(baseConfig)).toBe(
      'Area chart of desktop, mobile across 2 categories',
    );
  });
});

describe('motion: matrix declaration (#2227; BehaviorSpec.motion is spec-reserved but unimplemented, #1990 open)', () => {
  const MATRIX_PATH = join(
    dirname(fileURLToPath(import.meta.url)),
    '../../../docs/spec/matrix/motion.jsonl',
  );

  function motionRows(): Array<Record<string, unknown>> {
    return readFileSync(MATRIX_PATH, 'utf8')
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((line) => JSON.parse(line) as Record<string, unknown>);
  }

  it('the area-chart area enter moment is declared as a matrix row, provenance proposed', () => {
    const row = motionRows().find(
      (r) => r['component'] === 'area-chart' && r['part'] === 'area' && r['transition'] === 'enter',
    );
    expect(row, 'no (area-chart, area, enter) row in motion.jsonl').toBeDefined();
    expect(row?.['duration']).toMatchObject({
      kind: 'tier',
      tier: 'moderate',
      provenance: 'proposed',
    });
    expect(row?.['curve']).toMatchObject({ kind: 'role', role: 'enter', provenance: 'proposed' });
  });

  it('areaChartClasses selects the generated animate-area-chart-area-enter utility', () => {
    const classes = areaChartClasses({}, areaChart.initialState(baseConfig));
    expect(classes.area).toBe('data-[state=visible]:animate-area-chart-area-enter');
  });

  it('the area-enter composition (opacity only, no scale/translate/rotate) is legal under validateMotionComposition', () => {
    // A fade -- unlike bar-chart's scaleY/scaleX grow, an area has no single
    // baseline edge to grow from once stacked, so opacity is the one
    // property every area shares.
    const violations = validateMotionComposition({ opacity: true, answers: ['what-happened'] });
    expect(violations).toEqual([]);
  });
});

describe('areaChartClasses', () => {
  // Hex/var() literals only -- NOT a bare `[...]` scan, which would also flag
  // a legitimate variant like `data-[state=visible]:` (a Tailwind ARBITRARY
  // VARIANT selector, not an arbitrary VALUE). Same discipline
  // bar-chart.test.ts applies.
  const FORBIDDEN_LITERAL = /#[0-9a-f]{3,8}\b|var\(--/i;
  const classes = areaChartClasses({}, areaChart.initialState(baseConfig));

  it('consumes the generated animate-area-chart-area-enter utility off data-state', () => {
    expect(classes.area).toContain('data-[state=visible]:animate-area-chart-area-enter');
  });

  it('never carries a numeric duration or motion-reduce:animate-none', () => {
    expect(classes.area).not.toMatch(/\d+m?s\b/);
    expect(classes.area).not.toMatch(/motion-reduce:animate-none/);
  });

  it('emits no hex or var() literal in any class string', () => {
    for (const value of Object.values(classes)) {
      expect(value).not.toMatch(FORBIDDEN_LITERAL);
    }
  });

  it('emits no arbitrary-value utility (classy.ts hasArbitraryValue)', () => {
    for (const value of Object.values(classes)) {
      for (const cls of value.split(/\s+/).filter(Boolean)) {
        expect(hasArbitraryValue(cls), cls).toBe(false);
      }
    }
  });
});
