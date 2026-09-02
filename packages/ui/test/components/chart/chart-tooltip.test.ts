import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { bandScale, type BandScale } from '../../../src/primitives/graph';
import { tooltipContentSurfaceClasses } from '../../../src/components/tooltip/tooltip.classes';
import type { ChartConfig } from '../../../src/components/chart/chart.behavior';
import {
  chartTooltip,
  describeDatum,
  hitTest,
  tooltipHeaderLabel,
  tooltipRows,
} from '../../../src/components/chart/chart-tooltip.behavior';
import { chartTooltipClasses } from '../../../src/components/chart/chart-tooltip.classes';

const here = dirname(fileURLToPath(import.meta.url));
const motionJsonlPath = join(here, '../../../docs/spec/matrix/motion.jsonl');

const config = {
  desktop: { label: 'Desktop', token: 'chart-1' },
  mobile: { label: 'Mobile', token: 'chart-2' },
} satisfies ChartConfig;

const scale: BandScale<string> = bandScale(['Jan', 'Feb', 'Mar'], [0, 300]);
const data = [
  { desktop: 100, mobile: 40 },
  { desktop: 205, mobile: 90 },
  { desktop: 150, mobile: 60 },
];

describe('hitTest', () => {
  it('resolves a normalized pointer position to the nearest datum (issue functional test)', () => {
    const datum = hitTest({ left: 0.51, top: 0.4 }, scale, data);
    expect(datum).not.toBeNull();
    expect(datum?.category).toBe('Feb');
    expect(datum?.categoryIndex).toBe(1);
    expect(datum?.values).toEqual({ desktop: 205, mobile: 90 });
  });

  it('resolves the first band', () => {
    expect(hitTest({ left: 0.1, top: 0 }, scale, data)?.category).toBe('Jan');
  });

  it('resolves the last band, clamped at the boundary', () => {
    expect(hitTest({ left: 0.999, top: 0 }, scale, data)?.category).toBe('Mar');
    expect(hitTest({ left: 1, top: 0 }, scale, data)?.category).toBe('Mar');
  });

  it('returns null for an empty domain -- no throw', () => {
    const empty = bandScale([], [0, 300]);
    expect(hitTest({ left: 0.5, top: 0 }, empty, data)).toBeNull();
  });

  it('returns null for a degenerate zero-width range -- no throw', () => {
    const degenerate = bandScale(['a', 'b'], [0, 0]);
    expect(hitTest({ left: 0.5, top: 0 }, degenerate, data)).toBeNull();
  });

  it('is pure: same inputs, same output, no DOM touched', () => {
    const first = hitTest({ left: 0.51, top: 0.4 }, scale, data);
    const second = hitTest({ left: 0.51, top: 0.4 }, scale, data);
    expect(first).toEqual(second);
  });

  it('missing data at an index falls back to an empty values object', () => {
    const datum = hitTest({ left: 0.51, top: 0.4 }, scale, []);
    expect(datum?.values).toEqual({});
  });
});

describe('tooltipRows', () => {
  it('builds one row per configured series with the issue functional test assertion', () => {
    const datum = hitTest({ left: 0.51, top: 0.4 }, scale, data);
    expect(datum).not.toBeNull();
    const rows = tooltipRows(datum!, config);
    expect(rows.find((r) => r.key === 'desktop')!.swatchClass).toBe('fill-chart-1');
    expect(rows.find((r) => r.key === 'mobile')!.swatchClass).toBe('fill-chart-2');
  });

  it('reads the value from the datum and the label from config', () => {
    const datum = hitTest({ left: 0.1, top: 0 }, scale, data)!;
    const rows = tooltipRows(datum, config);
    expect(rows).toEqual([
      { key: 'desktop', label: 'Desktop', value: 100, swatchClass: 'fill-chart-1' },
      { key: 'mobile', label: 'Mobile', value: 40, swatchClass: 'fill-chart-2' },
    ]);
  });

  it('an empty config produces no rows -- no throw', () => {
    const datum = hitTest({ left: 0.1, top: 0 }, scale, data)!;
    expect(tooltipRows(datum, {})).toEqual([]);
  });

  it('a token-less series falls back to index-based fill class, same as resolveSeriesClass', () => {
    const datum = hitTest({ left: 0.1, top: 0 }, scale, data)!;
    const rows = tooltipRows(datum, { mobile: { label: 'Mobile' } });
    expect(rows[0]!.swatchClass).toBe('fill-chart-1');
  });

  it('nameKey overrides every row label from one shared config entry (documented simplification)', () => {
    const datum = hitTest({ left: 0.1, top: 0 }, scale, data)!;
    const rows = tooltipRows(datum, config, 'mobile');
    expect(rows.map((r) => r.label)).toEqual(['Mobile', 'Mobile']);
  });
});

describe('tooltipHeaderLabel', () => {
  it('defaults to the datum category', () => {
    const datum = hitTest({ left: 0.51, top: 0.4 }, scale, data)!;
    expect(tooltipHeaderLabel(datum, config)).toBe('Feb');
  });

  it('labelKey overrides the header from a config entry', () => {
    const datum = hitTest({ left: 0.51, top: 0.4 }, scale, data)!;
    expect(tooltipHeaderLabel(datum, config, 'desktop')).toBe('Desktop');
  });
});

describe('describeDatum (sr-announcer message)', () => {
  it('joins the category and every row with a value', () => {
    const datum = hitTest({ left: 0.1, top: 0 }, scale, data)!;
    expect(describeDatum(datum, config)).toBe('Jan, Desktop 100, Mobile 40');
  });

  it('omits a row whose value is undefined', () => {
    const solo = hitTest({ left: 0.1, top: 0 }, scale, [{ desktop: 100 }]);
    expect(describeDatum(solo!, config)).toBe('Jan, Desktop 100');
  });
});

describe('chartTooltip behavior spec', () => {
  it('declares root and content parts', () => {
    expect(Object.keys(chartTooltip.parts).sort()).toEqual(['content', 'root']);
  });

  it('initial state has no datum', () => {
    expect(chartTooltip.initialState({})).toEqual({ datum: null });
  });

  it('point resolves and stores the hit datum', () => {
    const state = chartTooltip.actions.point(
      { datum: null },
      { point: { left: 0.51, top: 0.4 }, scale, data },
    );
    expect(state.datum?.category).toBe('Feb');
  });

  it('point is a no-op for the same effective datum (effective-value-diff)', () => {
    const first = chartTooltip.actions.point(
      { datum: null },
      { point: { left: 0.51, top: 0.4 }, scale, data },
    );
    const second = chartTooltip.actions.point(first, {
      point: { left: 0.55, top: 0.4 },
      scale,
      data,
    });
    expect(second).toBe(first);
  });

  it('point resolving to no datum clears state without throwing', () => {
    const empty = bandScale([], [0, 300]);
    const state = chartTooltip.actions.point(
      { datum: { category: 'Feb', categoryIndex: 1, values: {} } },
      { point: { left: 0.5, top: 0 }, scale: empty, data },
    );
    expect(state.datum).toBeNull();
  });

  it('clear resets to no datum', () => {
    const state = chartTooltip.actions.clear(
      { datum: { category: 'Feb', categoryIndex: 1, values: {} } },
      undefined,
    );
    expect(state.datum).toBeNull();
  });

  it('clear is a no-op when already empty', () => {
    const empty = { datum: null };
    expect(chartTooltip.actions.clear(empty, undefined)).toBe(empty);
  });

  it('content is never focusable -- role tooltip only, no focus-granting attribute', () => {
    const projection = chartTooltip.aria({ datum: null }, {}, { root: '', content: '' });
    expect(projection.content).toEqual({ role: 'tooltip' });
  });

  it('never claims a keymap entry -- keyboard datum traversal belongs to the chart shell', () => {
    expect(chartTooltip.keymap({ key: 'ArrowRight' }, { datum: null }, 'content', {})).toBeNull();
    expect(chartTooltip.keymap({ key: 'Escape' }, { datum: null }, 'root', {})).toBeNull();
  });

  it('canDispatch always allows both actions (no suppression surface)', () => {
    expect(chartTooltip.canDispatch({ datum: null }, 'point', {})).toBe(true);
    expect(chartTooltip.canDispatch({ datum: null }, 'clear', {})).toBe(true);
  });
});

describe('motion: chart-tooltip/content matrix cells', () => {
  const lines = readFileSync(motionJsonlPath, 'utf-8')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as Record<string, unknown>);
  const rows = lines.filter(
    (row) => row['component'] === 'chart-tooltip' && row['part'] === 'content',
  );

  it('declares exactly the closed->open and open->closed cells', () => {
    const transitions = rows.map((row) => row['transition']).sort();
    expect(transitions).toEqual(['closed -> open', 'open -> closed']);
  });

  it('is opacity-only -- no spatial movement (docs/MOTION.md tooltip rule)', () => {
    for (const row of rows) {
      expect(row['movement']).toBe('fade');
      expect(row['properties']).toEqual(['opacity']);
      expect((row['extent'] as { kind: string }).kind).toBe('none');
    }
  });

  it("mirrors tooltip/content's tier and curve role rather than tooltip's own (fade + zoom) row", () => {
    const open = rows.find((row) => row['transition'] === 'closed -> open')!;
    const close = rows.find((row) => row['transition'] === 'open -> closed')!;
    expect((open['duration'] as { tier: string }).tier).toBe('moderate');
    expect((open['curve'] as { role: string }).role).toBe('enter');
    expect((close['duration'] as { tier: string }).tier).toBe('fast');
    expect((close['curve'] as { role: string }).role).toBe('exit');
  });
});

describe('chart-tooltip.classes.ts reuses tooltip.classes.ts, adds only chart-specific classes', () => {
  it("content is exactly tooltip's content-panel decoration", () => {
    expect(chartTooltipClasses().content).toBe(tooltipContentSurfaceClasses);
  });

  it('the reused surface consumes data-state driven opacity, no animate-* keyframe, no raw color literal', () => {
    const content = chartTooltipClasses().content;
    expect(content).toMatch(/data-\[state=open\]:opacity-100/);
    expect(content).toMatch(/duration-moderate/);
    expect(content).toMatch(/duration-fast/);
    expect(content).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(content).not.toMatch(/var\(--/);
  });
});

describe('issue #2228 functional test block (tooltip half)', () => {
  it('matches the spec verbatim', () => {
    const datum = hitTest({ left: 0.51, top: 0.4 }, scale, data);
    expect(datum!.category).toBe('Feb');
    const rows = tooltipRows(datum!, config);
    expect(rows.find((r) => r.key === 'desktop')!.swatchClass).toBe('fill-chart-1');
  });
});
