import { describe, expect, it, vi } from 'vitest';
import { createBehavior, type BehaviorSpec } from '../../src/lib/contract';

interface CounterConfig {
  start: number;
  frozen?: boolean;
}

interface CounterState {
  count: number;
}

type CounterActions = {
  increment: undefined;
  set: number;
};

const counter: BehaviorSpec<CounterConfig, CounterState, CounterActions, 'root'> = {
  name: 'counter',
  parts: { root: {} },
  initialState: (config) => ({ count: config.start }),
  actions: {
    increment: (state) => ({ ...state, count: state.count + 1 }),
    set: (state, count) => ({ ...state, count }),
  },
  canDispatch: (_state, _action, config) => !(config.frozen ?? false),
  aria: (state, _config, ids) => ({
    root: { 'aria-valuenow': String(state.count), 'data-id': ids.root },
  }),
  keymap: (event, _state, part) =>
    part === 'root' && event.key === 'ArrowUp' ? 'increment' : null,
  classes: () => ({ root: 'counter' }),
  effects: () => [],
};

describe('createBehavior', () => {
  it('seeds state from config through initialState', () => {
    const { memory } = createBehavior(counter, { start: 5 });
    expect(memory.get()).toEqual({ count: 5 });
  });

  it('dispatch applies the reducer and reports acceptance', () => {
    const { memory, dispatch } = createBehavior(counter, { start: 0 });
    expect(dispatch('increment')).toBe(true);
    expect(dispatch('set', 41)).toBe(true);
    expect(memory.get().count).toBe(41);
  });

  it('canDispatch gates the reducer via config', () => {
    const { memory, dispatch } = createBehavior(counter, { start: 0, frozen: true });
    expect(dispatch('increment')).toBe(false);
    expect(memory.get().count).toBe(0);
  });

  it('unfrozen config allows dispatch', () => {
    const { memory, dispatch } = createBehavior(counter, { start: 0 });
    expect(dispatch('increment')).toBe(true);
    expect(memory.get().count).toBe(1);
  });

  it('projections are pure functions on the spec', () => {
    const config = { start: 2 };
    const { memory } = createBehavior(counter, config);
    const state = memory.get();
    expect(counter.aria(state, config, { root: 'abc' })).toEqual({
      root: { 'aria-valuenow': '2', 'data-id': 'abc' },
    });
    expect(counter.keymap({ key: 'ArrowUp' }, state, 'root')).toBe('increment');
    expect(counter.keymap({ key: 'ArrowDown' }, state, 'root')).toBeNull();
    expect(counter.classes(config, state)).toEqual({ root: 'counter' });
  });

  it('state changes flow to subscribers through the one memory cell', () => {
    const { memory, dispatch } = createBehavior(counter, { start: 0 });
    const seen: number[] = [];
    const stop = memory.select(
      (s) => s.count,
      (count) => {
        seen.push(count);
      },
    );
    dispatch('increment');
    dispatch('increment');
    stop();
    dispatch('increment');
    expect(seen).toEqual([1, 2]);
  });

  it('suppressed dispatches do not touch the memory cell', () => {
    const { memory, dispatch } = createBehavior(counter, { start: 0, frozen: true });
    const listener = vi.fn();
    const stop = memory.select((s) => s.count, listener);
    dispatch('increment');
    stop();
    expect(listener).not.toHaveBeenCalled();
  });
});
