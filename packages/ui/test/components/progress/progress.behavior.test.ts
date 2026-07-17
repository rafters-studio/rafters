import { describe, expect, it } from 'vitest';
import {
  progress,
  resolveProgress,
  readProgressConfig,
  type ProgressConfig,
} from '../../../src/components/progress/progress.behavior';

const state = {};
const ids = { root: '', indicator: '' } as const;

describe('progress parts', () => {
  it('declares the progressbar root and the decorative indicator', () => {
    expect(Object.keys(progress.parts).sort()).toEqual(['indicator', 'root']);
  });
});

describe('resolveProgress', () => {
  it('determinate: clamps into [0, max] and computes the percentage', () => {
    expect(resolveProgress({ value: 66 })).toMatchObject({
      indeterminate: false,
      clamped: 66,
      max: 100,
      percent: 66,
      valueText: '66%',
    });
  });

  it('value 0 is determinate (0%), not indeterminate', () => {
    const r = resolveProgress({ value: 0 });
    expect(r.indeterminate).toBe(false);
    expect(r.percent).toBe(0);
    expect(r.valueText).toBe('0%');
  });

  it('clamps below 0 and above max', () => {
    expect(resolveProgress({ value: -10 }).clamped).toBe(0);
    expect(resolveProgress({ value: 150 }).clamped).toBe(100);
  });

  it('respects a custom max and derives the percentage from it', () => {
    const r = resolveProgress({ value: 3, max: 10 });
    expect(r.clamped).toBe(3);
    expect(r.max).toBe(10);
    expect(r.percent).toBe(30);
    expect(r.valueText).toBe('30%');
  });

  it('a non-positive or non-finite max falls back to 100', () => {
    expect(resolveProgress({ value: 50, max: 0 }).max).toBe(100);
    expect(resolveProgress({ value: 50, max: -5 }).max).toBe(100);
    expect(resolveProgress({ value: 50, max: Number.NaN }).max).toBe(100);
  });

  it('undefined or non-finite value is indeterminate', () => {
    expect(resolveProgress({}).indeterminate).toBe(true);
    expect(resolveProgress({ value: undefined }).indeterminate).toBe(true);
    expect(resolveProgress({ value: Number.NaN }).indeterminate).toBe(true);
  });

  it('indeterminate has no value label', () => {
    expect(resolveProgress({}).valueText).toBeUndefined();
  });

  it('a supplied valueText overrides the percentage default', () => {
    expect(resolveProgress({ value: 3, max: 10, valueText: '3 of 10 files' }).valueText).toBe(
      '3 of 10 files',
    );
  });

  it('rounds the label but keeps the raw percentage for the fill width', () => {
    const r = resolveProgress({ value: 1, max: 3 });
    expect(r.valueText).toBe('33%');
    expect(r.percent).toBeCloseTo(33.3333, 3);
  });
});

describe('progress aria projection', () => {
  it('determinate: progressbar with the full value contract', () => {
    const aria = progress.aria(state, { value: 66 }, ids);
    expect(aria.root).toEqual({
      role: 'progressbar',
      'aria-valuemin': '0',
      'aria-valuemax': '100',
      'aria-valuenow': '66',
      'aria-valuetext': '66%',
      'aria-busy': undefined,
    });
    expect(aria.indicator).toEqual({ 'aria-hidden': 'true' });
  });

  it('indeterminate: omits valuenow/valuetext, sets aria-busy (the ARIA signal)', () => {
    const aria = progress.aria(state, {}, ids);
    expect(aria.root?.role).toBe('progressbar');
    expect(aria.root?.['aria-valuenow']).toBeUndefined();
    expect(aria.root?.['aria-valuetext']).toBeUndefined();
    expect(aria.root?.['aria-busy']).toBe('true');
    expect(aria.root?.['aria-valuemin']).toBe('0');
    expect(aria.root?.['aria-valuemax']).toBe('100');
  });

  it('custom max is reflected in aria-valuemax and aria-valuenow', () => {
    const aria = progress.aria(state, { value: 3, max: 10 }, ids);
    expect(aria.root?.['aria-valuemax']).toBe('10');
    expect(aria.root?.['aria-valuenow']).toBe('3');
  });
});

describe('progress is a static score', () => {
  it('has no keymap and no effects', () => {
    expect(progress.keymap({ key: 'Enter' }, state, 'root', {})).toBeNull();
    expect(progress.effects(state, { value: 50 })).toEqual([]);
    expect(progress.effects(state, {})).toEqual([]);
  });

  it('has no actions and initial state is empty', () => {
    expect(Object.keys(progress.actions)).toEqual([]);
    expect(progress.initialState({})).toEqual({});
  });
});

describe('readProgressConfig', () => {
  function el(attrs: Record<string, string>): HTMLElement {
    const node = document.createElement('div');
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
  }

  it('reconstructs config from attributes (the inverse of the markup)', () => {
    const config: ProgressConfig = readProgressConfig(
      el({ value: '3', max: '10', variant: 'success', size: 'lg', 'value-text': '3 of 10' }),
    );
    expect(config).toEqual({
      value: 3,
      max: 10,
      valueText: '3 of 10',
      variant: 'success',
      size: 'lg',
    });
  });

  it('absent value reads as indeterminate; unknown variant/size fall back', () => {
    const config = readProgressConfig(el({ variant: 'bogus', size: 'huge' }));
    expect(config.value).toBeUndefined();
    expect(config.variant).toBe('default');
    expect(config.size).toBe('default');
    expect(resolveProgress(config).indeterminate).toBe(true);
  });
});
