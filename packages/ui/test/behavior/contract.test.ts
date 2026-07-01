import { describe, expect, it, vi } from 'vitest';
import { createBehavior, type BehaviorSpec } from '../../src/behavior/contract';

interface CounterConfig {
  start: number;
  frozen?: boolean;
}

interface CounterState {
  count: number;
  frozen: boolean;
}

type CounterActions = {
  increment: undefined;
  set: number;
  freeze: boolean;
};

const counter: BehaviorSpec<CounterConfig, CounterState, CounterActions, 'root'> = {
  name: 'counter',
  parts: { root: {} },
  initialState: (config) => ({ count: config.start, frozen: config.frozen ?? false }),
  actions: {
    increment: (state) => ({ ...state, count: state.count + 1 }),
    set: (state, count) => ({ ...state, count }),
    freeze: (state, frozen) => ({ ...state, frozen }),
  },
  canDispatch: (state, action) => (action === 'freeze' ? true : !state.frozen),
  aria: (state, _config, ids) => ({
    root: { 'aria-valuenow': String(state.count), 'data-id': ids.root },
  }),
  keymap: (event, _state, part) =>
    part === 'root' && event.key === 'ArrowUp' ? 'increment' : null,
  effects: () => [],
};

describe('createBehavior', () => {
  it('seeds state from config through initialState', () => {
    const instance = createBehavior(counter, { start: 5 });
    expect(instance.memory.get()).toEqual({ count: 5, frozen: false });
  });

  it('dispatch applies the reducer and reports acceptance', () => {
    const instance = createBehavior(counter, { start: 0 });
    expect(instance.dispatch('increment')).toBe(true);
    expect(instance.dispatch('set', 41)).toBe(true);
    expect(instance.memory.get().count).toBe(41);
  });

  it('canDispatch gates the reducer AND the return value', () => {
    const instance = createBehavior(counter, { start: 0, frozen: true });
    expect(instance.dispatch('increment')).toBe(false);
    expect(instance.memory.get().count).toBe(0);
    expect(instance.dispatch('freeze', false)).toBe(true);
    expect(instance.dispatch('increment')).toBe(true);
    expect(instance.memory.get().count).toBe(1);
  });

  it('projections are bound to current state and config', () => {
    const instance = createBehavior(counter, { start: 2 });
    expect(instance.aria({ root: 'abc' })).toEqual({
      root: { 'aria-valuenow': '2', 'data-id': 'abc' },
    });
    expect(instance.keymap({ key: 'ArrowUp' }, 'root')).toBe('increment');
    expect(instance.keymap({ key: 'ArrowDown' }, 'root')).toBeNull();
  });

  it('state changes flow to subscribers through the one memory cell', () => {
    const instance = createBehavior(counter, { start: 0 });
    const seen: number[] = [];
    const stop = instance.memory.select(
      (s) => s.count,
      (count) => {
        seen.push(count);
      },
    );
    instance.dispatch('increment');
    instance.dispatch('increment');
    stop();
    instance.dispatch('increment');
    expect(seen).toEqual([1, 2]);
  });

  it('suppressed dispatches do not touch the memory cell', () => {
    const instance = createBehavior(counter, { start: 0, frozen: true });
    const listener = vi.fn();
    const stop = instance.memory.select((s) => s.count, listener);
    instance.dispatch('increment');
    stop();
    expect(listener).not.toHaveBeenCalled();
  });
});
