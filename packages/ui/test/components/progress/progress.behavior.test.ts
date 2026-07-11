import { describe, expect, it } from 'vitest';
import {
  progress,
  progressPercent,
  type ProgressConfig,
} from '../../../src/components/progress/progress.behavior';

const state = {};
const ids = { root: '', indicator: '' };

describe('progress parts', () => {
  it('declares root and indicator, no static roles (role is projected)', () => {
    expect(Object.keys(progress.parts).sort()).toEqual(['indicator', 'root']);
    expect(progress.parts.root).toEqual({});
    expect(progress.parts.indicator).toEqual({});
  });
});

describe('progress aria projection', () => {
  it('determinate: role, valuenow clamped, no aria-busy, data-state=determinate', () => {
    const config: ProgressConfig = { value: 40, max: 80 };
    const aria = progress.aria(state, config, ids);
    expect(aria.root?.role).toBe('progressbar');
    expect(aria.root?.['aria-valuemin']).toBe('0');
    expect(aria.root?.['aria-valuemax']).toBe('80');
    expect(aria.root?.['aria-valuenow']).toBe('40');
    expect(aria.root?.['aria-busy']).toBeUndefined();
    expect(aria.root?.['data-state']).toBe('determinate');
  });

  it('value below 0 or above max clamps into [0, max]', () => {
    const under = progress.aria(state, { value: -5, max: 10 }, ids);
    expect(under.root?.['aria-valuenow']).toBe('0');

    const over = progress.aria(state, { value: 999, max: 10 }, ids);
    expect(over.root?.['aria-valuenow']).toBe('10');
  });

  it('indeterminate: value undefined omits aria-valuenow, sets aria-busy', () => {
    const aria = progress.aria(state, {}, ids);
    expect(aria.root?.['aria-valuenow']).toBeUndefined();
    expect(aria.root?.['aria-busy']).toBe('true');
    expect(aria.root?.['data-state']).toBe('indeterminate');
  });

  it('max defaults to 100 when omitted', () => {
    const aria = progress.aria(state, { value: 50 }, ids);
    expect(aria.root?.['aria-valuemax']).toBe('100');
  });

  it('the indicator is always decorative and mirrors data-state', () => {
    const determinate = progress.aria(state, { value: 1 }, ids);
    expect(determinate.indicator?.['aria-hidden']).toBe('true');
    expect(determinate.indicator?.['data-state']).toBe('determinate');

    const indeterminate = progress.aria(state, {}, ids);
    expect(indeterminate.indicator?.['data-state']).toBe('indeterminate');
  });
});

describe('progress effects and keymap', () => {
  it('is a static score: no effects, no keymap', () => {
    expect(progress.effects(state, {})).toEqual([]);
    expect(progress.keymap({ key: 'Enter' }, state, 'root', {})).toBeNull();
  });
});

describe('progressPercent', () => {
  it('is 0 while indeterminate', () => {
    expect(progressPercent({})).toBe(0);
  });

  it('walks the 0-100 scale against max', () => {
    expect(progressPercent({ value: 25, max: 100 })).toBe(25);
    expect(progressPercent({ value: 1, max: 4 })).toBe(25);
  });

  it('clamps out-of-range values before computing the percentage', () => {
    expect(progressPercent({ value: -10, max: 10 })).toBe(0);
    expect(progressPercent({ value: 999, max: 10 })).toBe(100);
  });
});
