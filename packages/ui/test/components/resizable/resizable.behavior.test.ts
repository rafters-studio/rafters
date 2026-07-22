/**
 * Pure score tests for resizable -- no DOM. Exercises the reducer, the clamp
 * math (resizeSizes), the key-to-delta projection (keyDelta), the aria/keymap
 * projections, and the disabled gate.
 */
import { describe, expect, it } from 'vitest';
import {
  keyDelta,
  resizableBehavior,
  resizableHandleAria,
  resizeSizes,
  type ResizableConfig,
  type ResizablePanelConfig,
} from '../../../src/components/resizable/resizable.behavior';

const PANELS: ResizablePanelConfig[] = [
  { defaultSize: 50, minSize: 10, maxSize: 90 },
  { defaultSize: 50, minSize: 10, maxSize: 90 },
];

function configFor(overrides: Partial<ResizableConfig> = {}): ResizableConfig {
  return { direction: 'horizontal', panels: PANELS, disabled: false, ...overrides };
}

describe('resizable initialState', () => {
  it('seeds sizes from each panel defaultSize', () => {
    const state = resizableBehavior.initialState(configFor());
    expect(state.sizes).toEqual([50, 50]);
  });

  it('seeds an arbitrary panel count', () => {
    const panels: ResizablePanelConfig[] = [
      { defaultSize: 20, minSize: 0, maxSize: 100 },
      { defaultSize: 30, minSize: 0, maxSize: 100 },
      { defaultSize: 50, minSize: 0, maxSize: 100 },
    ];
    expect(resizableBehavior.initialState(configFor({ panels })).sizes).toEqual([20, 30, 50]);
  });
});

describe('resizeSizes', () => {
  it('moves the boundary: delta grows the leading panel, shrinks the next', () => {
    expect(resizeSizes([50, 50], 0, 10, PANELS)).toEqual([60, 40]);
  });

  it('keeps the sum constant', () => {
    const next = resizeSizes([50, 50], 0, 7.5, PANELS);
    expect((next[0] ?? 0) + (next[1] ?? 0)).toBeCloseTo(100);
  });

  it('clamps the leading panel to its min and redistributes the shortfall', () => {
    // -45 would take panel 0 to 5, below min 10: it stops at 10 and panel 1
    // only receives the honoured 40.
    expect(resizeSizes([50, 50], 0, -45, PANELS)).toEqual([10, 90]);
  });

  it('clamps the trailing panel to its min', () => {
    expect(resizeSizes([50, 50], 0, 45, PANELS)).toEqual([90, 10]);
  });

  it('caps the leading panel at its maxSize (the oracle does not redistribute the excess)', () => {
    const capped: ResizablePanelConfig[] = [
      { defaultSize: 50, minSize: 0, maxSize: 60 },
      { defaultSize: 50, minSize: 0, maxSize: 100 },
    ];
    // +30 would take panel 0 to 80; it stops at its max 60 while panel 1 still
    // gives up the full 30 -- a faithful port of the oracle's one-sided max clamp.
    expect(resizeSizes([50, 50], 0, 30, capped)).toEqual([60, 20]);
  });

  it('only touches the two panels around the handle', () => {
    const three: ResizablePanelConfig[] = [
      { defaultSize: 30, minSize: 0, maxSize: 100 },
      { defaultSize: 40, minSize: 0, maxSize: 100 },
      { defaultSize: 30, minSize: 0, maxSize: 100 },
    ];
    expect(resizeSizes([30, 40, 30], 1, 10, three)).toEqual([30, 50, 20]);
  });

  it('is a no-op for an out-of-range handle index', () => {
    expect(resizeSizes([50, 50], 5, 10, PANELS)).toEqual([50, 50]);
  });
});

describe('keyDelta', () => {
  it('horizontal: Right grows, Left shrinks the leading panel', () => {
    const config = configFor();
    expect(keyDelta('ArrowRight', false, config, [50, 50], 0)).toBe(1);
    expect(keyDelta('ArrowLeft', false, config, [50, 50], 0)).toBe(-1);
  });

  it('horizontal: vertical arrows do not resize', () => {
    const config = configFor();
    expect(keyDelta('ArrowUp', false, config, [50, 50], 0)).toBeNull();
    expect(keyDelta('ArrowDown', false, config, [50, 50], 0)).toBeNull();
  });

  it('vertical: Down grows, Up shrinks; horizontal arrows do not resize', () => {
    const config = configFor({ direction: 'vertical' });
    expect(keyDelta('ArrowDown', false, config, [50, 50], 0)).toBe(1);
    expect(keyDelta('ArrowUp', false, config, [50, 50], 0)).toBe(-1);
    expect(keyDelta('ArrowRight', false, config, [50, 50], 0)).toBeNull();
  });

  it('Shift multiplies the step to ten', () => {
    expect(keyDelta('ArrowRight', true, configFor(), [50, 50], 0)).toBe(10);
  });

  it('Home targets the leading panel min, End its max (as a delta)', () => {
    const config = configFor();
    expect(keyDelta('Home', false, config, [50, 50], 0)).toBe(-40); // 10 - 50
    expect(keyDelta('End', false, config, [50, 50], 0)).toBe(40); // 90 - 50
  });

  it('returns null for a non-resize key', () => {
    expect(keyDelta('Enter', false, configFor(), [50, 50], 0)).toBeNull();
  });
});

describe('keymap', () => {
  it('claims the horizontal-axis keys on a handle', () => {
    const config = configFor();
    const state = resizableBehavior.initialState(config);
    for (const key of ['ArrowLeft', 'ArrowRight', 'Home', 'End']) {
      expect(resizableBehavior.keymap({ key }, state, 'handle', config)).toBe('setSizes');
    }
    expect(resizableBehavior.keymap({ key: 'ArrowUp' }, state, 'handle', config)).toBeNull();
  });

  it('claims the vertical-axis keys when the group is vertical', () => {
    const config = configFor({ direction: 'vertical' });
    const state = resizableBehavior.initialState(config);
    expect(resizableBehavior.keymap({ key: 'ArrowDown' }, state, 'handle', config)).toBe(
      'setSizes',
    );
    expect(resizableBehavior.keymap({ key: 'ArrowLeft' }, state, 'handle', config)).toBeNull();
  });

  it('never claims a key off a handle', () => {
    const config = configFor();
    const state = resizableBehavior.initialState(config);
    expect(resizableBehavior.keymap({ key: 'ArrowRight' }, state, 'root', config)).toBeNull();
    expect(resizableBehavior.keymap({ key: 'ArrowRight' }, state, 'panel', config)).toBeNull();
  });
});

describe('aria projection', () => {
  it('projects orientation and no disabled flag by default', () => {
    const config = configFor();
    const state = resizableBehavior.initialState(config);
    const aria = resizableBehavior.aria(state, config, { root: 'r', panel: 'p', handle: 'h' });
    expect(aria.root).toEqual({ 'data-orientation': 'horizontal', 'data-disabled': undefined });
  });

  it('projects the disabled flag when disabled', () => {
    const config = configFor({ disabled: true });
    const state = resizableBehavior.initialState(config);
    const aria = resizableBehavior.aria(state, config, { root: 'r', panel: 'p', handle: 'h' });
    expect(aria.root?.['data-disabled']).toBe('true');
  });
});

describe('resizableHandleAria (instanceAria)', () => {
  it('reads the leading panel size as aria-valuenow, bounded by its min/max', () => {
    const config = configFor();
    const state = { sizes: [60, 40] };
    expect(resizableHandleAria('0', state, config)).toEqual({
      'aria-orientation': 'vertical',
      'aria-valuenow': '60',
      'aria-valuemin': '10',
      'aria-valuemax': '90',
      'aria-disabled': undefined,
    });
  });

  it('flips the separator orientation for a vertical group', () => {
    const config = configFor({ direction: 'vertical' });
    const state = resizableBehavior.initialState(config);
    expect(resizableHandleAria('0', state, config)['aria-orientation']).toBe('horizontal');
  });

  it('rounds a fractional size', () => {
    expect(resizableHandleAria('0', { sizes: [33.4, 66.6] }, configFor())['aria-valuenow']).toBe(
      '33',
    );
  });

  it('marks the separator disabled when the group is disabled', () => {
    const config = configFor({ disabled: true });
    expect(resizableHandleAria('0', { sizes: [50, 50] }, config)['aria-disabled']).toBe('true');
  });
});

describe('canDispatch disabled gate', () => {
  it('rejects setSizes while disabled', () => {
    const config = configFor({ disabled: true });
    const state = resizableBehavior.initialState(config);
    expect(resizableBehavior.canDispatch(state, 'setSizes', config)).toBe(false);
  });

  it('allows setSizes while enabled', () => {
    const config = configFor();
    const state = resizableBehavior.initialState(config);
    expect(resizableBehavior.canDispatch(state, 'setSizes', config)).toBe(true);
  });
});
