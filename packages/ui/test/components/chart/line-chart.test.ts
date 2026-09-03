import { validateMotionComposition } from '@rafters/design-tokens';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createBehavior } from '../../../src/lib/contract';
import {
  buildSeriesPath,
  computeDots,
  computeLinePoints,
  describePoint,
  lineAria,
  lineChart,
  pointAria,
  resolveAxisParts,
  type LineChartBehaviorConfig,
  type LinePoint,
} from '../../../src/components/chart/line-chart.behavior';
import {
  lineChartClasses,
  resolveDotFillClass,
  resolveLineStrokeClass,
} from '../../../src/components/chart/line-chart.classes';
import type { ChartConfig } from '../../../src/components/chart/chart.behavior';
import { hasArbitraryValue } from '../../../src/primitives/classy';
import { bandScale, linearScale } from '../../../src/primitives/graph';

const cfg = {
  desktop: { label: 'Desktop', token: 'chart-1' },
  mobile: { label: 'Mobile', token: 'chart-2' },
} satisfies ChartConfig;

const BEHAVIOR_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../src/components/chart/line-chart.behavior.ts',
);

describe('Spec 01 rule 1: behavior.ts never imports a classes module', () => {
  it('line-chart.behavior.ts has no import from any *.classes module', () => {
    const source = readFileSync(BEHAVIOR_PATH, 'utf8');
    expect(source).not.toMatch(/from\s+['"][^'"]*\.classes['"]/);
  });
});

const data = [
  { month: 'Jan', desktop: 100, mobile: 40 },
  { month: 'Feb', desktop: 120, mobile: 60 },
  { month: 'Mar', desktop: 90, mobile: 50 },
];

describe('computeLinePoints: geometry', () => {
  const width = 300;
  const height = 200;

  it('point positions match bandScale(paddingInner:1)/linearScale computed directly, for a fixture dataset', () => {
    const points = computeLinePoints(
      { data, series: ['desktop', 'mobile'] },
      { categoryKey: 'month', width, height },
    );

    const categoryScale = bandScale(['Jan', 'Feb', 'Mar'], [0, width], {
      paddingInner: 1,
      paddingOuter: 0,
    });
    const valueScale = linearScale([0, 120], [height, 0]); // Feb:desktop is the max (120), floor stays 0

    const janDesktop = points.find((p) => p.key === 'Jan:desktop');
    expect(janDesktop?.x).toBeCloseTo(categoryScale.scale('Jan'));
    expect(janDesktop?.y).toBeCloseTo(valueScale(100));

    const febMobile = points.find((p) => p.key === 'Feb:mobile');
    expect(febMobile?.x).toBeCloseTo(categoryScale.scale('Feb'));
    expect(febMobile?.y).toBeCloseTo(valueScale(60));
  });

  it('a negative value extends the domain floor below zero, matching linearScale directly', () => {
    const negData = [
      { month: 'Jan', delta: -20 },
      { month: 'Feb', delta: 10 },
    ];
    const points = computeLinePoints(
      { data: negData, series: ['delta'] },
      { categoryKey: 'month', width, height },
    );
    const valueScale = linearScale([-20, 10], [height, 0]);
    const jan = points.find((p) => p.key === 'Jan:delta');
    expect(jan?.y).toBeCloseTo(valueScale(-20));
  });

  it('every point carries its series key and index; resolveLineStrokeClass/resolveDotFillClass resolve exactly its series token', () => {
    const points = computeLinePoints(
      { data, series: ['desktop', 'mobile'] },
      { categoryKey: 'month', width, height },
    );
    expect(points.every((p) => /^stroke-chart-[1-5]$/.test(resolveLineStrokeClass(cfg, p)))).toBe(
      true,
    );
    expect(points.every((p) => /^fill-chart-[1-5]$/.test(resolveDotFillClass(cfg, p)))).toBe(true);

    const janDesktop = points.find((p) => p.key === 'Jan:desktop') as LinePoint;
    const janMobile = points.find((p) => p.key === 'Jan:mobile') as LinePoint;
    expect(janDesktop.series).toBe('desktop');
    expect(janDesktop.seriesIndex).toBe(0);
    expect(resolveLineStrokeClass(cfg, janDesktop)).toBe('stroke-chart-1');
    expect(janMobile.series).toBe('mobile');
    expect(janMobile.seriesIndex).toBe(1);
    expect(resolveLineStrokeClass(cfg, janMobile)).toBe('stroke-chart-2');
  });
});

describe('computeLinePoints: category-less fallback (the #2230 sparkline shape)', () => {
  it('an empty categoryKey spreads points by row index rather than collapsing them', () => {
    const points = computeLinePoints(
      { data, series: ['desktop'] },
      { categoryKey: '', width: 300, height: 200 },
    );
    const xs = points.map((p) => p.x);
    // Three distinct x positions, evenly spread start to end -- never one
    // shared position (Bar's own degenerate case, deliberately not mirrored
    // here; see line-chart.behavior.ts's module doc point 2).
    expect(new Set(xs).size).toBe(3);
    expect(Math.min(...xs)).toBeCloseTo(0);
    expect(Math.max(...xs)).toBeCloseTo(300);
  });
});

describe('computeLinePoints: error handling', () => {
  it('empty data renders an empty plot -- no throw', () => {
    expect(
      computeLinePoints(
        { data: [], series: ['desktop'] },
        { categoryKey: 'month', width: 300, height: 200 },
      ),
    ).toEqual([]);
  });

  it('a series key absent from data rows is a Zod validation error naming the key', () => {
    expect(() =>
      computeLinePoints(
        { data: [{ month: 'Jan', desktop: 100 }], series: ['desktop', 'mobile'] },
        { categoryKey: 'month', width: 300, height: 200 },
      ),
    ).toThrow(/mobile/);
  });

  it('more than 5 series is a loud validation error naming the 5-token limit', () => {
    const manySeries = ['a', 'b', 'c', 'd', 'e', 'f'];
    const row = Object.fromEntries([['month', 'Jan'], ...manySeries.map((k) => [k, 1])]);
    expect(() =>
      computeLinePoints(
        { data: [row], series: manySeries },
        { categoryKey: 'month', width: 300, height: 200 },
      ),
    ).toThrow(/5/);
  });
});

describe('buildSeriesPath', () => {
  const points = computeLinePoints(
    { data, series: ['desktop'] },
    { categoryKey: 'month', width: 300, height: 200 },
  );

  it('smooth: false builds a straight-segment path (linePath)', () => {
    const d = buildSeriesPath(points, { smooth: false });
    expect(d).toMatch(/^M /);
    expect(d).not.toContain('C');
  });

  it('smooth: true builds a monotone-cubic path (smoothPath)', () => {
    const d = buildSeriesPath(points, { smooth: true });
    expect(d).toMatch(/^M /);
    expect(d).toContain('C');
  });
});

describe('computeDots', () => {
  it('one dot per datum, positioned at the exact scale point', () => {
    const points = computeLinePoints(
      { data, series: ['desktop', 'mobile'] },
      { categoryKey: 'month', width: 300, height: 200 },
    );
    const dots = computeDots(points);
    expect(dots).toHaveLength(points.length);
    for (const [i, dot] of dots.entries()) {
      expect(dot.x).toBe(points[i]?.x);
      expect(dot.y).toBe(points[i]?.y);
      expect(dot.key).toBe(points[i]?.key);
    }
  });
});

describe('resolveAxisParts', () => {
  it('no composed children -> every axis part false', () => {
    expect(resolveAxisParts({ children: [] })).toEqual({
      xAxis: false,
      yAxis: false,
      grid: false,
    });
  });

  it('reports exactly the composed parts, order-independent', () => {
    expect(resolveAxisParts({ children: [{ part: 'x-axis' }, { part: 'grid' }] })).toEqual({
      xAxis: true,
      yAxis: false,
      grid: true,
    });
    expect(
      resolveAxisParts({ children: [{ part: 'y-axis' }, { part: 'x-axis' }, { part: 'grid' }] }),
    ).toEqual({ xAxis: true, yAxis: true, grid: true });
  });
});

describe('issue #2226 functional test block', () => {
  it('matches the spec verbatim', () => {
    const fixture = [
      { x: 'a', v: 1 },
      { x: 'b', v: 3 },
      { x: 'c', v: 2 },
    ];
    const pts = computeLinePoints(
      { data: fixture, series: ['v'] },
      { categoryKey: 'x', width: 300, height: 200 },
    );
    expect(buildSeriesPath(pts, { smooth: false })).toMatch(/^M /);
    expect(computeDots(pts).length).toBe(3);
    expect(resolveAxisParts({ children: [] })).toEqual({
      xAxis: false,
      yAxis: false,
      grid: false,
    });
  });
});

const baseConfig: LineChartBehaviorConfig = {
  data,
  series: ['desktop', 'mobile'],
  chartConfig: cfg,
  categoryKey: 'month',
  width: 300,
  height: 200,
  axisParts: { xAxis: true, yAxis: false, grid: false },
};

describe('lineChart behavior spec', () => {
  it('declares root/plot/line/point/table parts, line and point as many, point optional', () => {
    expect(Object.keys(lineChart.parts).sort()).toEqual(['line', 'plot', 'point', 'root', 'table']);
    expect(lineChart.parts.line?.many).toBe(true);
    expect(lineChart.parts.point?.many).toBe(true);
    expect(lineChart.parts.point?.optional).toBe(true);
  });

  it('initialState derives points via computeLinePoints and a null active cursor', () => {
    const state = lineChart.initialState(baseConfig);
    expect(state.points).toHaveLength(6); // 3 rows x 2 series
    expect(state.activeIndex).toBeNull();
  });

  it('initialState derives value-axis ticks via ticks(), covering the data range', () => {
    const state = lineChart.initialState(baseConfig);
    expect(state.valueTicks.length).toBeGreaterThan(0);
    expect(state.valueTicks[state.valueTicks.length - 1]).toBeGreaterThanOrEqual(120);
  });

  it('canDispatch is false once points are empty (no data)', () => {
    const emptyConfig = { ...baseConfig, data: [] };
    expect(
      lineChart.canDispatch(lineChart.initialState(emptyConfig), 'moveNext', emptyConfig),
    ).toBe(false);
  });

  it('moveNext/movePrevious/moveFirst/moveLast traverse and clamp the active-datum cursor', () => {
    const { memory, dispatch } = createBehavior(lineChart, baseConfig);
    expect(dispatch('moveNext', baseConfig)).toBe(true);
    expect(memory.get().activeIndex).toBe(0);
    dispatch('moveNext', baseConfig);
    expect(memory.get().activeIndex).toBe(1);
    dispatch('moveLast', baseConfig);
    expect(memory.get().activeIndex).toBe(5);
    dispatch('moveNext', baseConfig); // clamps at the last point
    expect(memory.get().activeIndex).toBe(5);
    dispatch('moveFirst', baseConfig);
    expect(memory.get().activeIndex).toBe(0);
    dispatch('movePrevious', baseConfig); // clamps at the first point
    expect(memory.get().activeIndex).toBe(0);
  });

  it('movePrevious from a null cursor lands on the first point, same entry point as moveNext', () => {
    const { memory, dispatch } = createBehavior(lineChart, baseConfig);
    dispatch('movePrevious', baseConfig);
    expect(memory.get().activeIndex).toBe(0);
  });

  it('keymap claims arrow keys and Home/End on root and plot only, never on line or point', () => {
    const state = lineChart.initialState(baseConfig);
    expect(lineChart.keymap({ key: 'ArrowRight' }, state, 'root', baseConfig)).toBe('moveNext');
    expect(lineChart.keymap({ key: 'ArrowDown' }, state, 'plot', baseConfig)).toBe('moveNext');
    expect(lineChart.keymap({ key: 'ArrowLeft' }, state, 'root', baseConfig)).toBe('movePrevious');
    expect(lineChart.keymap({ key: 'ArrowUp' }, state, 'root', baseConfig)).toBe('movePrevious');
    expect(lineChart.keymap({ key: 'Home' }, state, 'root', baseConfig)).toBe('moveFirst');
    expect(lineChart.keymap({ key: 'End' }, state, 'root', baseConfig)).toBe('moveLast');
    expect(lineChart.keymap({ key: 'ArrowRight' }, state, 'line', baseConfig)).toBeNull();
    expect(lineChart.keymap({ key: 'ArrowRight' }, state, 'point', baseConfig)).toBeNull();
    expect(lineChart.keymap({ key: 'a' }, state, 'root', baseConfig)).toBeNull();
  });

  it('aria: root carries a descriptive label, plot is aria-hidden, line/point are omitted (many parts)', () => {
    const state = lineChart.initialState(baseConfig);
    const ids = { root: '', plot: '', line: '', point: '', table: '' };
    const projection = lineChart.aria(state, baseConfig, ids);
    expect(projection.root?.['aria-label']).toContain('desktop');
    expect(projection.root?.['aria-label']).toContain('mobile');
    expect(projection.plot).toEqual({ 'aria-hidden': 'true' });
    expect(projection.line).toBeUndefined();
    expect(projection.point).toBeUndefined();
  });

  it('root aria-label reads "Line chart" once an axis is composed', () => {
    const state = lineChart.initialState(baseConfig);
    const projection = lineChart.aria(state, baseConfig, {
      root: '',
      plot: '',
      line: '',
      point: '',
      table: '',
    });
    expect(projection.root?.['aria-label']).toMatch(/^Line chart of/);
  });

  it('root aria-label reads "Sparkline" once no axis/grid children are composed', () => {
    const sparklineConfig: LineChartBehaviorConfig = {
      ...baseConfig,
      categoryKey: '',
      axisParts: { xAxis: false, yAxis: false, grid: false },
    };
    const state = lineChart.initialState(sparklineConfig);
    const projection = lineChart.aria(state, sparklineConfig, {
      root: '',
      plot: '',
      line: '',
      point: '',
      table: '',
    });
    expect(projection.root?.['aria-label']).toMatch(/^Sparkline of/);
  });

  it('pointAria marks every point aria-hidden and visible, and flags only the active one', () => {
    const state = { ...lineChart.initialState(baseConfig), activeIndex: 0 };
    const active = pointAria(state.points[0]?.key ?? '', state, baseConfig, {});
    expect(active).toEqual({
      'aria-hidden': 'true',
      'data-state': 'visible',
      'data-active': 'true',
    });
    const inactive = pointAria(state.points[1]?.key ?? '', state, baseConfig, {});
    expect(inactive['data-active']).toBe('false');
  });

  it('lineAria marks every line aria-hidden and visible, with no active/inactive distinction', () => {
    const state = lineChart.initialState(baseConfig);
    expect(lineAria('desktop', state, baseConfig, {})).toEqual({
      'aria-hidden': 'true',
      'data-state': 'visible',
    });
  });

  it('describePoint announces category, series, and value', () => {
    const state = lineChart.initialState(baseConfig);
    const point = state.points[0] as LinePoint;
    expect(describePoint(point)).toBe(`${point.category}, ${point.series}, ${point.value}`);
  });
});

describe('motion: matrix declaration (#2226; BehaviorSpec.motion is spec-reserved but unimplemented, #1990 open)', () => {
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

  it('the line-chart line enter moment is declared as a matrix row, provenance proposed', () => {
    const row = motionRows().find(
      (r) => r['component'] === 'line-chart' && r['part'] === 'line' && r['transition'] === 'enter',
    );
    expect(row, 'no (line-chart, line, enter) row in motion.jsonl').toBeDefined();
    expect(row?.['duration']).toMatchObject({
      kind: 'tier',
      tier: 'moderate',
      provenance: 'proposed',
    });
    expect(row?.['curve']).toMatchObject({ kind: 'role', role: 'enter', provenance: 'proposed' });
  });

  it('lineChartClasses consumes the generated fade-in/moderate/enter assignment off data-state', () => {
    const classes = lineChartClasses(
      { smooth: false, dots: true },
      lineChart.initialState(baseConfig),
    );
    expect(classes.line).toBe('data-[state=visible]:animate-fade-in-moderate-enter');
  });

  it('the line-enter composition (opacity only) is legal under validateMotionComposition', () => {
    const violations = validateMotionComposition({
      opacity: true,
      elementSize: 'large',
      answers: ['what-happened'],
    });
    expect(violations).toEqual([]);
  });
});

describe('lineChartClasses', () => {
  const FORBIDDEN_LITERAL = /#[0-9a-f]{3,8}\b|var\(--/i;
  const classes = lineChartClasses(
    { smooth: false, dots: true },
    lineChart.initialState(baseConfig),
  );

  it('never carries a numeric duration or motion-reduce:animate-none', () => {
    expect(classes.line).not.toMatch(/\d+m?s\b/);
    expect(classes.line).not.toMatch(/motion-reduce:animate-none/);
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

  it('resolveLineStrokeClass/resolveDotFillClass never emit a hex, var(), or arbitrary value', () => {
    const points = computeLinePoints(
      { data, series: ['desktop', 'mobile'] },
      { categoryKey: 'month', width: 300, height: 200 },
    );
    for (const point of points) {
      const stroke = resolveLineStrokeClass(cfg, point);
      const fill = resolveDotFillClass(cfg, point);
      expect(stroke).not.toMatch(FORBIDDEN_LITERAL);
      expect(fill).not.toMatch(FORBIDDEN_LITERAL);
      expect(hasArbitraryValue(stroke)).toBe(false);
      expect(hasArbitraryValue(fill)).toBe(false);
    }
  });
});
